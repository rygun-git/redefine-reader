"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Home, Grid, List, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useUrlResolver } from "@/hooks/useUrlResolver"

interface BibleOutline {
  id: number
  title: string
  chapters: {
    number: number
    name: string
    book?: string
    category?: string
    book_order?: number
    category_order?: number
    sections?: { title: string; start_line: number }[]
  }[]
  file_url?: string | null
  categoryOrder?: Record<string, number>
}

// ✅ In-memory cache (keyed by outlineUrl)
const outlineCache: Record<string, BibleOutline> = {}

export default function BookSelectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const versionParam = searchParams.get("version")
  const outlineParam = searchParams.get("outline")

  // Use the resolver hook instead of directly getting URL params
  const { versionUrl, outlineUrl, loading: urlLoading, error: urlError } = useUrlResolver(versionParam, outlineParam)

  const [bibleOutlines, setBibleOutlines] = useState<BibleOutline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [booksByCategory, setBooksByCategory] = useState<
    Record<string, { book: string; chapterCount: number; order: number }[]>
  >({})
  const [isListView, setIsListView] = useState(false)
  const [fetchingFromUrl, setFetchingFromUrl] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [outlineUrlParam, setOutlineUrlParam] = useState<string | null>(null)

  useEffect(() => {
    const fetchBibleOutlines = async () => {
      if (urlLoading || urlError || !outlineUrl) return

      try {
        setLoading(true)
        setError(null)
        setDebugInfo(null)
        setFetchingFromUrl(true)

        // ✅ Use cached version if available
        if (outlineCache[outlineUrl]) {
          const cachedOutline = outlineCache[outlineUrl]
          setBibleOutlines([cachedOutline])
          processOutlineData(cachedOutline)
          return
        }

        const response = await fetch(outlineUrl)
        if (!response.ok) throw new Error(`Failed to fetch outline from URL: ${response.statusText}`)
        const outlineData = await response.json()

        setDebugInfo(`Received data structure: ${JSON.stringify(Object.keys(outlineData))}`)

        let chapters: BibleOutline["chapters"] = []
        const outlineUrlParamValue = outlineUrl
        setOutlineUrlParam(outlineUrlParamValue)
        const outline: BibleOutline = {
          id: Number(outlineParam) || 0,
          title: outlineData.title || "Outline from URL",
          chapters: [],
          file_url: outlineUrlParamValue,
        }
        if (outlineData.categories && Array.isArray(outlineData.categories)) {
          // Track the order of categories as they appear in the file
          const categoryOrder: Record<string, number> = {}

          outlineData.categories.forEach(
            (category: { name: string; books: { name: string; chapters: any[] }[] }, categoryIndex: number) => {
              // Store the original index of each category
              categoryOrder[category.name] = categoryIndex

              category.books.forEach((book, bookIndex) => {
                const bookChapters = book.chapters.map((chapter, chapterIndex) => ({
                  number: chapter.chapter || chapterIndex + 1,
                  name: chapter.name || `${book.name} - ${book.name} ${chapter.chapter}`,
                  book: book.name,
                  category: category.name,
                  book_order: bookIndex + 1,
                  category_order: categoryIndex, // Add the category order
                  sections: chapter.sections,
                }))
                chapters = chapters.concat(bookChapters)
              })
            },
          )

          // Store the category order in the outline object for later use
          outline.categoryOrder = categoryOrder
        } else {
          throw new Error("Invalid outline format: 'categories' array not found")
        }

        if (chapters.length === 0) throw new Error("No chapters found in the outline")

        outline.chapters = chapters
        // const outline: BibleOutline = {
        //   id: Number(outlineParam) || 0,
        //   title: outlineData.title || "Outline from URL",
        //   chapters,
        //   file_url: outlineUrlParam
        // }

        // ✅ Cache the outline for reuse
        outlineCache[outlineUrl] = outline

        setBibleOutlines([outline])
        processOutlineData(outline)
      } catch (err) {
        console.error("Error fetching Bible outline:", err)
        setError(`Failed to load outline: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setFetchingFromUrl(false)
        setLoading(false)
      }
    }

    fetchBibleOutlines()
  }, [outlineUrl, outlineParam, urlLoading, urlError])

  const processOutlineData = (data: BibleOutline) => {
    const bookCategoryMap: Record<string, { book: string; chapterCount: number; order: number }[]> = {}
    const bookInfo: Record<string, { count: number; order: number; category: string }> = {}
    const categoryOrderMap: Record<string, number> = {}

    // Extract category order from the data if available
    const fileBasedCategoryOrder = data.categoryOrder || {}

    data.chapters.forEach((chapter, index) => {
      const bookName = chapter.book || chapter.name?.split(" - ")[0] || "Unknown"
      const category = chapter.category || "Uncategorized"
      const order = chapter.book_order !== undefined ? chapter.book_order : index + 1

      // Use the category_order from the chapter if available
      if (chapter.category_order !== undefined) {
        categoryOrderMap[category] = chapter.category_order
      } else if (fileBasedCategoryOrder[category] !== undefined) {
        categoryOrderMap[category] = fileBasedCategoryOrder[category]
      }

      if (!bookInfo[bookName]) {
        bookInfo[bookName] = { count: 0, order, category }
        if (categoryOrderMap[category] === undefined) categoryOrderMap[category] = 999 // Default high value for unknown categories
      }
      bookInfo[bookName].count++
    })

    Object.entries(bookInfo).forEach(([book, info]) => {
      const category = info.category
      if (!bookCategoryMap[category]) bookCategoryMap[category] = []
      bookCategoryMap[category].push({ book, chapterCount: info.count, order: info.order })
    })

    Object.keys(bookCategoryMap).forEach((category) => {
      bookCategoryMap[category].sort((a, b) => a.order - b.order)
    })

    const sortedBooksByCategory: typeof bookCategoryMap = {}

    // Sort categories strictly by their order in the file
    const sortedCategories = Object.keys(bookCategoryMap).sort((a, b) => {
      const orderA = categoryOrderMap[a] !== undefined ? categoryOrderMap[a] : 999
      const orderB = categoryOrderMap[b] !== undefined ? categoryOrderMap[b] : 999
      return orderA - orderB
    })

    sortedCategories.forEach((category) => {
      sortedBooksByCategory[category] = bookCategoryMap[category]
    })

    setBooksByCategory(sortedBooksByCategory)
  }

  const handleBookSelect = (bookName: string) => {
    router.push(`/select/chapter?version=${versionParam}&outline=${outlineParam}&book=${bookName}`)
  }

  const handleRetry = () => {
    if (outlineUrlParam) {
      // ❌ Clear the cache to force refetch
      delete outlineCache[outlineUrlParam]
    }
    setLoading(true)
    setError(null)
    setDebugInfo(null)
    setFetchingFromUrl(true)

    // Reuse the fetch function from useEffect
    const event = new Event("popstate")
    window.dispatchEvent(event)
  }

  const allBooks = Object.entries(booksByCategory)
    .flatMap(([category, books]) => books.map((book) => ({ ...book, category })))
    .sort((a, b) => a.order - b.order)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Select Book</h1>
        <Link href="/read">
          <Button variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" /> Back to Reader
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-end space-x-2 mb-6">
        <Grid className={`h-4 w-4 ${!isListView ? "text-primary" : "text-muted-foreground"}`} />
        <Switch id="view-mode" checked={isListView} onCheckedChange={setIsListView} />
        <Label htmlFor="view-mode" className="cursor-pointer">
          <List className={`h-4 w-4 ${isListView ? "text-primary" : "text-muted-foreground"}`} />
        </Label>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="flex flex-col space-y-2">
            <div>{error}</div>
            {debugInfo && (
              <div className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto">
                <code>{debugInfo}</code>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleRetry} className="self-start">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading || fetchingFromUrl ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isListView ? (
        <div className="space-y-4">
          {allBooks.map(({ book, chapterCount, category }) => (
            <Card
              key={book}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleBookSelect(book)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{book}</h3>
                    <p className="text-muted-foreground">{category}</p>
                  </div>
                  <span className="text-sm bg-primary/10 px-3 py-1 rounded-full">
                    {chapterCount} {chapterCount === 1 ? "Chapter" : "Chapters"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        Object.entries(booksByCategory).map(([category, books]) => (
          <Card key={category} className="mb-6">
            <CardHeader>
              <CardTitle>{category}</CardTitle>
              <CardDescription>Select a book from this category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {books.map(({ book, chapterCount }) => (
                  <Button key={book} onClick={() => handleBookSelect(book)} className="justify-start" variant="outline">
                    <span className="truncate">{book}</span>
                    <span className="ml-auto text-xs bg-primary/10 px-2 py-1 rounded-full">
                      {chapterCount} {chapterCount === 1 ? "Chapter" : "Chapters"}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
