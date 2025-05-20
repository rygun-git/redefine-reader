"use client"

import type React from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Home, ChevronLeft, ListFilter, ChevronRight, Bookmark, BookmarkCheck, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { getAllBookmarks, addBookmark, deleteBookmark } from "@/lib/bookmarks"
import { useUrlResolver } from "@/hooks/useUrlResolver"

interface Section {
  startLine: number
  title: string
  endLine?: number
}

interface Chapter {
  number: number
  name: string
  book?: string
  startLine?: number
  endLine?: number
  sections?: Section[]
}

interface BibleOutline {
  id: number
  title: string
  chapters: Chapter[]
  file_url?: string | null
}

const outlineCache: Record<string, BibleOutline> = {}

export default function ChapterSelectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const versionParam = searchParams.get("version")
  const outlineParam = searchParams.get("outline")
  const bookParam = searchParams.get("book")

  // Use the resolver hook instead of directly getting URL params
  const { versionUrl, outlineUrl, loading: urlLoading, error: urlError } = useUrlResolver(versionParam, outlineParam)

  const [bibleOutline, setBibleOutline] = useState<BibleOutline | null>(null)
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([])
  const [bookmarkedChapters, setBookmarkedChapters] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSections, setShowSections] = useState(true)

  const loadOutline = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!outlineUrl || !bookParam) {
        throw new Error("Missing outline URL or book param")
      }

      // Use cache if available
      if (outlineCache[outlineUrl]) {
        const cached = outlineCache[outlineUrl]
        setBibleOutline(cached)
        const filtered = cached.chapters.filter(
          (chapter) => chapter.book === bookParam || chapter.name?.startsWith(bookParam + " - "),
        )
        setFilteredChapters(filtered)
        return
      }

      const res = await fetch(outlineUrl)
      if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`)

      const data = await res.json()

      if (!Array.isArray(data.categories)) {
        throw new Error("Invalid outline format")
      }

      let chapters: Chapter[] = []
      data.categories.forEach((category: any) => {
        category.books.forEach((book: any) => {
          const chapterList = book.chapters.map((chapter: any, i: number) => ({
            number: chapter.chapter || i + 1,
            name: chapter.name || `${book.name} ${chapter.chapter}`,
            book: book.name,
            startLine: Number.parseInt(chapter.start_line) || undefined,
            endLine: Number.parseInt(chapter.end_line) || undefined,
            sections: chapter.sections?.map((section: any) => ({
              title: section.title,
              startLine: section.start_line,
              endLine: section.end_line || undefined,
            })),
          }))
          chapters = chapters.concat(chapterList)
        })
      })

      const outline: BibleOutline = {
        id: Number(outlineParam) || 0,
        title: data.title || "Outline",
        chapters,
        file_url: outlineUrl,
      }

      outlineCache[outlineUrl] = outline
      setBibleOutline(outline)

      const filtered = chapters.filter(
        (chapter) => chapter.book === bookParam || chapter.name?.startsWith(bookParam + " - "),
      )
      setFilteredChapters(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleChapterSelect = (chapterNumber: number) => {
    const url = `/read/view?version=${versionParam}&outline=${outlineParam}&book=${bookParam}&chapter=${chapterNumber}`
    router.push(url)
  }

  const loadBookmarks = async () => {
    try {
      const bookmarks = await getAllBookmarks()
      setBookmarkedChapters(new Set(bookmarks.map((b) => `${b.book}-${b.chapter}`)))
    } catch (err) {
      console.error("Bookmark error:", err)
    }
  }

  const toggleBookmark = async (e: React.MouseEvent, chapter: Chapter) => {
    e.stopPropagation()
    const key = `${bookParam}-${chapter.number}`
    const isBookmarked = bookmarkedChapters.has(key)

    try {
      if (isBookmarked) {
        const all = await getAllBookmarks()
        const target = all.find((b) => b.book === bookParam && b.chapter === chapter.number)
        if (target?.id) {
          await deleteBookmark(target.id)
          const updated = new Set(bookmarkedChapters)
          updated.delete(key)
          setBookmarkedChapters(updated)
        }
      } else {
        const sectionTitles = chapter.sections?.map((s) => s.title) || []
        const newBookmark = {
          title: `${bookParam} ${chapter.number}`,
          book: bookParam || "",
          chapter: chapter.number,
          notes: "",
          createdAt: Date.now(),
          metadata: "test",
          sections: JSON.stringify(sectionTitles),
        }
        await addBookmark(newBookmark)
        const updated = new Set(bookmarkedChapters)
        updated.add(key)
        setBookmarkedChapters(updated)
      }
    } catch (err) {
      console.error("Toggle bookmark error:", err)
    }
  }

  const getFirstSectionTitle = (chapter: Chapter): string | null => {
    if (!chapter.sections?.length) return null
    return chapter.sections.reduce((prev, curr) => (prev.startLine < curr.startLine ? prev : curr)).title
  }

  useEffect(() => {
    if (!urlLoading && !urlError) {
      loadOutline()
    }
  }, [outlineUrl, bookParam, urlLoading, urlError])

  useEffect(() => {
    loadBookmarks()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href={`/select/book?version=${versionParam}&outline=${outlineParam}`}>
            <Button variant="ghost" size="sm" className="mr-2">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{bookParam}</h1>
        </div>
        <Link href="/read">
          <Button variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" /> Home
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-end space-x-2 mb-4">
        <Label htmlFor="show-sections" className="text-sm">
          <ListFilter className="h-4 w-4 inline mr-1" /> Show Sections
        </Label>
        <Switch id="show-sections" checked={showSections} onCheckedChange={setShowSections} />
      </div>

      {urlLoading && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {urlError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>Failed to resolve URLs: {urlError}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="flex flex-col space-y-2">
            <div>{error}</div>
            <Button variant="outline" size="sm" onClick={loadOutline} className="self-start">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{bookParam}</CardTitle>
            <CardDescription>Select a chapter to read</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {filteredChapters.map((chapter) => {
                const firstSectionTitle = getFirstSectionTitle(chapter)
                return (
                  <Card key={chapter.number} className="overflow-hidden">
                    <div
                      onClick={() => handleChapterSelect(chapter.number)}
                      className="w-full h-auto py-3 px-4 flex items-center justify-between bg-white hover:bg-gray-50 cursor-pointer border-b rounded-b-none transition-colors"
                    >
                      <div className="flex flex-col items-start">
                        <div className="font-bold text-lg text-gray-800">Chapter {chapter.number}</div>
                        {!showSections && firstSectionTitle && (
                          <div className="text-left text-xs text-gray-500 mt-1 truncate w-full">
                            {firstSectionTitle}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center">
                        {bookmarkedChapters.has(`${bookParam}-${chapter.number}`) ? (
                          <BookmarkCheck
                            className="h-5 w-5 text-primary mr-4 hover:text-primary/80"
                            onClick={(e) => toggleBookmark(e, chapter)}
                          />
                        ) : (
                          <Bookmark
                            className="h-5 w-5 text-gray-400 mr-4 hover:text-primary"
                            onClick={(e) => toggleBookmark(e, chapter)}
                          />
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    {showSections && chapter.sections && chapter.sections.length > 0 && (
                      <div
                        className="bg-gray-50 p-3 rounded-b-md cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleChapterSelect(chapter.number)}
                      >
                        <ul className="space-y-1">
                          {chapter.sections
                            .sort((a, b) => a.startLine - b.startLine)
                            .map((section, index) => (
                              <li key={index} className="text-sm pl-2 border-l-2 border-primary/20">
                                {section.title}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
