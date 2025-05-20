"use client"

import type React from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Home, ChevronLeft, ListFilter, ChevronRight, Bookmark, BookmarkCheck } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { getAllBookmarks, addBookmark, deleteBookmark } from "@/lib/bookmarks"

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
}

export default function ChapterSelectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const versionParam = searchParams.get("version")
  const outlineParam = searchParams.get("outline")
  const bookParam = searchParams.get("book")

  const [bibleOutline, setBibleOutline] = useState<BibleOutline | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([])
  const [showSections, setShowSections] = useState(true)
  const [bookmarkedChapters, setBookmarkedChapters] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchBibleOutline = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("bible_outlines")
          .select("id, title, chapters")
          .eq("id", outlineParam)
          .single()

        if (error) throw error

        if (data) {
          setBibleOutline(data)

          // Filter chapters for the selected book
          const chapters = data.chapters.filter(
            (chapter) => chapter.book === bookParam || chapter.name?.startsWith(bookParam + " - "),
          )

          setFilteredChapters(chapters)
        } else {
          setError("Bible outline not found.")
        }
      } catch (err) {
        console.error("Error fetching Bible outline:", err)
        setError("Failed to load Bible outline")
      } finally {
        setLoading(false)
      }
    }

    fetchBibleOutline()
  }, [outlineParam, bookParam])

  const handleChapterSelect = (chapterNumber: number) => {
    router.push(`/read/view?version=${versionParam}&outline=${outlineParam}&book=${bookParam}&chapter=${chapterNumber}`)
  }

  const loadBookmarks = async () => {
    try {
      const bookmarks = await getAllBookmarks()
      const bookmarkedSet = new Set(bookmarks.map((bookmark) => `${bookmark.book}-${bookmark.chapter}`))
      setBookmarkedChapters(bookmarkedSet)
    } catch (error) {
      console.error("Error loading bookmarks:", error)
    }
  }

  const toggleBookmark = async (e: React.MouseEvent, chapter: Chapter) => {
    e.stopPropagation() // Prevent navigation when clicking the bookmark icon

    const bookmarkKey = `${bookParam}-${chapter.number}`
    const isBookmarked = bookmarkedChapters.has(bookmarkKey)


  
    try {
      if (isBookmarked) {
        // Find the bookmark ID to delete
        const bookmarks = await getAllBookmarks()
        const bookmarkToDelete = bookmarks.find((b) => b.book === bookParam && b.chapter === chapter.number)

        if (bookmarkToDelete?.id) {
          await deleteBookmark(bookmarkToDelete.id)

          // Update state
          const updatedBookmarks = new Set(bookmarkedChapters)
          updatedBookmarks.delete(bookmarkKey)
          setBookmarkedChapters(updatedBookmarks)
        }
      } else {
        // Add new bookmark with sections from the chapter

        console.log(chapter);

function getSectionTitles(chapter) {
  if (!chapter?.sections || chapter.sections.length === 0) {
    return JSON.stringify([]);
  }

  const titles = chapter.sections
    .map(section => ({
      title: section.title || 'Untitled',
      startLine: section.startLine || 0
    }))
    .sort((a, b) => a.startLine - b.startLine)
    .map(section => section.title);

  return JSON.stringify(titles);
}

    console.log(getSectionTitles(chapter));



        const newBookmark = {
          title: `${bookParam} ${chapter.number}`,
          book: bookParam || "",
          chapter: chapter.number,
          notes: "",
          createdAt: Date.now(),
          metadata: 'test',
          // Include the sections from the chapter as a single text string of titles
  sections: getSectionTitles(chapter)
        }

        await addBookmark(newBookmark)

        // Update state
        const updatedBookmarks = new Set(bookmarkedChapters)
        updatedBookmarks.add(bookmarkKey)
        setBookmarkedChapters(updatedBookmarks)
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error)
    }
  }

  useEffect(() => {
    loadBookmarks()
  }, [])

  // Function to get the first section title for a chapter
  const getFirstSectionTitle = (chapter: Chapter): string | null => {
    if (!chapter.sections || chapter.sections.length === 0) return null

    // Find the section with the lowest startLine
    const firstSection = chapter.sections.reduce((prev, current) =>
      prev.startLine < current.startLine ? prev : current,
    )

    return firstSection.title
  }

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
        <Switch
          id="show-sections"
          checked={showSections}
          onCheckedChange={setShowSections}
          aria-label="Toggle section visibility"
        />
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
                            aria-label="Remove bookmark"
                          />
                        ) : (
                          <Bookmark
                            className="h-5 w-5 text-gray-400 mr-4 hover:text-primary"
                            onClick={(e) => toggleBookmark(e, chapter)}
                            aria-label="Add bookmark"
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
