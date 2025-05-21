"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Settings, BookmarkIcon, Info } from "lucide-react"
import { getAllBookmarks, type Bookmark } from "@/lib/bookmarks"
import { getDisplaySettings } from "@/lib/indexedDB"

export default function HomePage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [defaultVersionId, setDefaultVersionId] = useState<string | null>(null)
  const [defaultOutlineId, setDefaultOutlineId] = useState<string | null>(null)
  const router = useRouter()

  // Load bookmarks and default settings
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Load bookmarks
        const loadedBookmarks = await getAllBookmarks()

        // Log the bookmarks to see what's in them
        console.log("Loaded bookmarks:", loadedBookmarks)

        setBookmarks(loadedBookmarks.sort((a, b) => b.createdAt - a.createdAt))

        // Load default version and outline
        const settings = await getDisplaySettings()
        if (settings) {
          setDefaultVersionId(settings.defaultVersionId || null)
          setDefaultOutlineId(settings.defaultOutlineId || null)
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Navigate to a bookmarked chapter
  const navigateToBookmark = (bookmark: Bookmark) => {
    const versionId = bookmark.versionId || defaultVersionId || "1" // Use bookmark's version if available
    const outlineId = bookmark.outlineId || defaultOutlineId || "1" // Use bookmark's outline if available

    router.push(
      `/read/view?version=${versionId}&outline=${outlineId}&book=${bookmark.book}&chapter=${bookmark.chapter}`,
    )
  }

  // Helper function to safely get sections from a bookmark
  const getSections = (bookmark: Bookmark) => {
    // Log the bookmark and its sections for debugging
    console.log(`Bookmark ${bookmark.title} sections:`, bookmark.sections)

    try {
      // If sections is undefined or null, return empty array
      if (!bookmark.sections) return []

      // If sections is already an array of strings, return it
      if (Array.isArray(bookmark.sections)) {
        return bookmark.sections
      }

      // If sections is a string (JSON), try to parse it
      if (typeof bookmark.sections === "string") {
        const parsed = JSON.parse(bookmark.sections)

        // If parsed result is an array, return it
        if (Array.isArray(parsed)) {
          return parsed
        }

        // If parsed result is an object with a title property (old format), extract titles
        if (parsed && Array.isArray(parsed) && parsed.length > 0 && parsed[0].title) {
          return parsed.map((section) => section.title)
        }
      }

      // If sections is an object but not an array, return empty array
      return []
    } catch (error) {
      console.error("Error parsing sections:", error)
      return []
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Redefine - Bible Reader</h1>
        <p className="text-sm text-gray-500 mt-1">&copy;2025 version 0232</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link href="/read" className="block">
          <Card className="h-full transition-all hover:shadow-md">
            <CardHeader>
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 mb-2">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Read Bible</CardTitle>
              <CardDescription>Open and read Bible versions from your library</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground">
                Access your Bible versions, select chapters, and start reading with your preferred settings.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">Open Reader</Button>
            </CardFooter>
          </Card>
        </Link>



      {/* Bookmarks Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Bookmarks</h2>
          <Link href="/bookmarks">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading bookmarks...</p>
        ) : bookmarks.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8">
                <BookmarkIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                <p className="text-muted-foreground">No bookmarks yet</p>
                <p className="text-sm text-muted-foreground mt-2">Add bookmarks while reading to see them here</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarks.slice(0, 6).map((bookmark) => {
              // Get sections directly from the bookmark
              const sectionsList = getSections(bookmark)

              return (
                <Card
                  key={bookmark.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigateToBookmark(bookmark)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{bookmark.title}</CardTitle>
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-100">
                        <BookmarkIcon className="h-4 w-4 text-amber-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="bg-gray-50 p-3 rounded-md mt-2 border border-gray-100">
                      {sectionsList && sectionsList.length > 0 ? (
                        <div className="text-gray-700 text-sm whitespace-pre-line">{sectionsList.join("\n")}</div>
                      ) : (
                        <div className="flex items-center justify-center py-2">
                          <Info className="h-4 w-4 text-amber-500 mr-2" />
                          <p className="text-gray-500 text-sm">No sections in this bookmark</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
