"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, BookmarkIcon, Info, Clock } from "lucide-react"
import { getAllBookmarks, type Bookmark } from "@/lib/bookmarks"
import { getDisplaySettings, getAllReadingPlans } from "@/lib/indexedDB"
// Add the import for history
import { getMostRecentHistoryItem, type HistoryItem } from "@/lib/history"
// Import the ReadingPlan type from reading-plan
import type { ReadingPlan } from "@/lib/reading-plan"
import { calculatePlanProgress } from "@/lib/reading-plan"
import { VersionSelectionModal } from "@/components/version-selection-modal"
import Image from "next/image"

export default function HomePage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [recentHistory, setRecentHistory] = useState<HistoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [defaultVersionId, setDefaultVersionId] = useState<string | null>(null)
  const [defaultOutlineId, setDefaultOutlineId] = useState<string | null>(null)
  // Add reading plans state to the existing useState declarations
  const [readingPlans, setReadingPlans] = useState<ReadingPlan[]>([])
  const router = useRouter()

  // Version selection state
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<{ book: string; chapter: number } | null>(null)

  // Load bookmarks and default settings
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Load bookmarks
        const loadedBookmarks = await getAllBookmarks()
        setBookmarks(loadedBookmarks.sort((a, b) => b.createdAt - a.createdAt))

        // Load reading plans
        try {
          const plans = await getAllReadingPlans()
          // Only show active (non-archived) plans
          setReadingPlans(plans.filter((plan) => !plan.archived).sort((a, b) => b.createdAt - a.createdAt))
        } catch (error) {
          console.error("Error loading reading plans:", error)
          // Continue even if reading plans fail to load
        }

        // Load history with error handling
        try {
          const historyItem = await getMostRecentHistoryItem()
          setRecentHistory(historyItem)
        } catch (error) {
          console.error("Error loading history:", error)
          // Continue even if history fails to load
        }

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
    const versionId = bookmark.versionId || defaultVersionId || null
    const outlineId = bookmark.outlineId || defaultOutlineId || null

    if (versionId && outlineId) {
      // Navigate directly to the chapter
      router.push(
        `/read/view?version=${versionId}&outline=${outlineId}&book=${bookmark.book}&chapter=${bookmark.chapter}`,
      )
    } else {
      // Store the pending navigation and show version selection modal
      setPendingNavigation({ book: bookmark.book, chapter: bookmark.chapter })
      setShowVersionModal(true)
    }
  }

  // Navigate to a chapter from a reading plan
  const navigateToChapter = (book: string, chapter: number) => {
    if (defaultVersionId && defaultOutlineId) {
      // Navigate directly to the chapter
      router.push(
        `/read/view?version=${defaultVersionId}&outline=${defaultOutlineId}&book=${encodeURIComponent(book)}&chapter=${chapter}`,
      )
    } else {
      // Store the pending navigation and show version selection modal
      setPendingNavigation({ book, chapter })
      setShowVersionModal(true)
    }
  }

  // Handle version selection from modal
  const handleVersionSelected = (versionId: string, outlineId: string) => {
    // Close the modal
    setShowVersionModal(false)

    // Update default IDs
    setDefaultVersionId(versionId)
    setDefaultOutlineId(outlineId)

    // Navigate to the chapter if we have pending navigation
    if (pendingNavigation) {
      router.push(
        `/read/view?version=${versionId}&outline=${outlineId}&book=${encodeURIComponent(pendingNavigation.book)}&chapter=${pendingNavigation.chapter}`,
      )
      setPendingNavigation(null)
    }
  }

  // Helper function to safely get sections from a bookmark
  const getSections = (bookmark: Bookmark) => {
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
        <div className="flex justify-center mb-4">
          <Image src="/Redefine.png" alt="Redefine Bible Reader" width={75} height={60} priority />
        </div>
        <p className="text-sm text-gray-500 mt-1">&copy;2025 version 0234</p>
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
      </div>

      {/* History Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Recent Reading</h2>
          <Link href="/history">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading history...</p>
        ) : recentHistory ? (
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              if (defaultVersionId && defaultOutlineId) {
                router.push(
                  `/read/view?version=${defaultVersionId}&outline=${defaultOutlineId}&book=${recentHistory.book}&chapter=${recentHistory.chapter}`,
                )
              } else {
                setPendingNavigation({ book: recentHistory.book, chapter: recentHistory.chapter })
                setShowVersionModal(true)
              }
            }}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-medium">
                    {recentHistory.book} {recentHistory.chapter}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(recentHistory.timestamp).toLocaleDateString()}{" "}
                    {new Date(recentHistory.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                <p className="text-muted-foreground">No reading history yet</p>
                <p className="text-sm text-muted-foreground mt-2">Your recent readings will appear here</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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

      {/* Reading Plans Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Reading Plans</h2>
          <Link href="/reading-plan">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading reading plans...</p>
        ) : readingPlans.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                <p className="text-muted-foreground">No reading plans yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create a reading plan to track your Bible study progress
                </p>
                <Link href="/reading-plan" className="mt-4">
                  <Button variant="outline">Create Reading Plan</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readingPlans.slice(0, 6).map((plan) => {
              // Calculate progress percentage
              const progress = calculatePlanProgress(plan)
              const hasChapters = plan.chapters.length > 0

              return (
                <div key={plan.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100">
                          <BookOpen className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                      {plan.description && <CardDescription className="mt-1">{plan.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="pt-0">
                      {hasChapters && (
                        <div className="mt-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{Math.round(progress.percentComplete)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-green-600 h-2.5 rounded-full"
                              style={{ width: `${progress.percentComplete}%` }}
                            ></div>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {progress.completedChapters} of {progress.totalChapters} chapters completed
                          </div>
                        </div>
                      )}

                      {!hasChapters && <div className="mt-4 text-sm text-muted-foreground">No chapters added yet</div>}

                      {hasChapters && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {plan.chapters.slice(0, 4).map((chapter) => (
                            <Button
                              key={`${chapter.book}-${chapter.chapter}`}
                              variant="outline"
                              size="sm"
                              className={chapter.completed ? "bg-green-50" : ""}
                              onClick={(e) => {
                                e.stopPropagation()
                                navigateToChapter(chapter.book, chapter.chapter)
                              }}
                            >
                              {chapter.book} {chapter.chapter}
                            </Button>
                          ))}
                          {plan.chapters.length > 4 && (
                            <Link href={`/reading-plan?id=${plan.id}`} className="col-span-2 text-center">
                              <Button variant="link" size="sm">
                                View all {plan.chapters.length} chapters
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Version Selection Modal */}
      <VersionSelectionModal
        open={showVersionModal}
        onOpenChange={setShowVersionModal}
        onVersionSelected={handleVersionSelected}
      />
    </div>
  )
}
