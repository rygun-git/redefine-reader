"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Home, Grid, List } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface BibleOutline {
  id: number
  title: string
  chapters: {
    number: number
    name: string
    book?: string
    category?: string
    book_order?: number
  }[]
}

// Define book categories
const bookCategories = {
  Pentateuch: ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"],
  "Historical Books": [
    "Joshua",
    "Judges",
    "Ruth",
    "1 Samuel",
    "2 Samuel",
    "1 Kings",
    "2 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
  ],
  "Wisdom Literature": ["Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon"],
  "Major Prophets": ["Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel"],
  "Minor Prophets": [
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
  ],
  Gospels: ["Matthew", "Mark", "Luke", "John"],
  History: ["Acts"],
  "Pauline Epistles": [
    "Romans",
    "1 Corinthians",
    "2 Corinthians",
    "Galatians",
    "Ephesians",
    "Philippians",
    "Colossians",
    "1 Thessalonians",
    "2 Thessalonians",
    "1 Timothy",
    "2 Timothy",
    "Titus",
    "Philemon",
  ],
  "General Epistles": ["Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude"],
  Apocalyptic: ["Revelation"],
  Other: [], // For any books that don't fit into the above categories
}

// Define canonical book order (fallback if book_order is not available)
const canonicalBookOrder: Record<string, number> = {
  // Old Testament
  Genesis: 1,
  Exodus: 2,
  Leviticus: 3,
  Numbers: 4,
  Deuteronomy: 5,
  Joshua: 6,
  Judges: 7,
  Ruth: 8,
  "1 Samuel": 9,
  "2 Samuel": 10,
  "1 Kings": 11,
  "2 Kings": 12,
  "1 Chronicles": 13,
  "2 Chronicles": 14,
  Ezra: 15,
  Nehemiah: 16,
  Esther: 17,
  Job: 18,
  Psalms: 19,
  Proverbs: 20,
  Ecclesiastes: 21,
  "Song of Solomon": 22,
  Isaiah: 23,
  Jeremiah: 24,
  Lamentations: 25,
  Ezekiel: 26,
  Daniel: 27,
  Hosea: 28,
  Joel: 29,
  Amos: 30,
  Obadiah: 31,
  Jonah: 32,
  Micah: 33,
  Nahum: 34,
  Habakkuk: 35,
  Zephaniah: 36,
  Haggai: 37,
  Zechariah: 38,
  Malachi: 39,
  // New Testament
  Matthew: 40,
  Mark: 41,
  Luke: 42,
  John: 43,
  Acts: 44,
  Romans: 45,
  "1 Corinthians": 46,
  "2 Corinthians": 47,
  Galatians: 48,
  Ephesians: 49,
  Philippians: 50,
  Colossians: 51,
  "1 Thessalonians": 52,
  "2 Thessalonians": 53,
  "1 Timothy": 54,
  "2 Timothy": 55,
  Titus: 56,
  Philemon: 57,
  Hebrews: 58,
  James: 59,
  "1 Peter": 60,
  "2 Peter": 61,
  "1 John": 62,
  "2 John": 63,
  "3 John": 64,
  Jude: 65,
  Revelation: 66,
}

// Function to get the category for a book
function getBookCategory(bookName: string): string {
  for (const [category, books] of Object.entries(bookCategories)) {
    if (books.includes(bookName)) {
      return category
    }
  }
  return "Other"
}

export default function BookSelectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const versionParam = searchParams.get("version")
  const outlineParam = searchParams.get("outline")

  const [bibleOutlines, setBibleOutlines] = useState<BibleOutline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [booksByCategory, setBooksByCategory] = useState<
    Record<string, { book: string; chapterCount: number; order: number }[]>
  >({})
  const [isListView, setIsListView] = useState(false)

  useEffect(() => {
    const fetchBibleOutlines = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("bible_outlines")
          .select("id, title, chapters")
          .eq("id", outlineParam)
          .single()

        if (error) throw error

        if (data) {
          setBibleOutlines([data])

          // Process books by category
          const bookCategoryMap: Record<string, { book: string; chapterCount: number; order: number }[]> = {}

          // Extract unique books and count chapters
          const bookInfo: Record<string, { count: number; order: number }> = {}

          // First pass: collect book information and determine if book_order exists
          let hasBookOrder = false

          data.chapters.forEach((chapter) => {
            const bookName = chapter.book || chapter.name?.split(" - ")[0] || "Unknown"

            if (!bookInfo[bookName]) {
              bookInfo[bookName] = {
                count: 0,
                order: chapter.book_order !== undefined ? chapter.book_order : canonicalBookOrder[bookName] || 999,
              }

              if (chapter.book_order !== undefined) {
                hasBookOrder = true
              }
            }

            bookInfo[bookName].count++
          })

          // Group books by category
          Object.entries(bookInfo).forEach(([book, info]) => {
            const category = getBookCategory(book)
            if (!bookCategoryMap[category]) {
              bookCategoryMap[category] = []
            }

            bookCategoryMap[category].push({
              book,
              chapterCount: info.count,
              order: info.order,
            })
          })

          // Sort books within each category by order
          Object.keys(bookCategoryMap).forEach((category) => {
            bookCategoryMap[category].sort((a, b) => a.order - b.order)
          })

          // Sort categories
          const sortedBooksByCategory: Record<string, { book: string; chapterCount: number; order: number }[]> = {}

          // Define the order of categories
          const categoryOrder = [
            "Pentateuch",
            "Historical Books",
            "Wisdom Literature",
            "Major Prophets",
            "Minor Prophets",
            "Gospels",
            "History",
            "Pauline Epistles",
            "General Epistles",
            "Apocalyptic",
            "Other",
          ]

          // Sort categories according to the defined order
          categoryOrder.forEach((category) => {
            if (bookCategoryMap[category] && bookCategoryMap[category].length > 0) {
              sortedBooksByCategory[category] = bookCategoryMap[category]
            }
          })

          setBooksByCategory(sortedBooksByCategory)
        } else {
          setError("No Bible outlines found.")
        }
      } catch (err) {
        console.error("Error fetching Bible outlines:", err)
        setError("Failed to load Bible outlines")
      } finally {
        setLoading(false)
      }
    }

    fetchBibleOutlines()
  }, [outlineParam])

  const handleBookSelect = (bookName: string) => {
    router.push(`/select/chapter?version=${versionParam}&outline=${outlineParam}&book=${bookName}`)
  }

  // Flatten books for list view
  const allBooks = Object.entries(booksByCategory)
    .flatMap(([category, books]) =>
      books.map((book) => ({
        ...book,
        category,
      })),
    )
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
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isListView ? (
        // List View
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
        // Grid/Category View
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
