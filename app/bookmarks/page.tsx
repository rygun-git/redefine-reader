"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { BookmarkIcon, ChevronLeft, Search, Trash2, Pencil, AlertTriangle } from "lucide-react"
import { getAllBookmarks, deleteBookmark, updateBookmark, type Bookmark } from "@/lib/bookmarks"
import { getDisplaySettings } from "@/lib/indexedDB"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [defaultVersionId, setDefaultVersionId] = useState<string | null>(null)
  const [defaultOutlineId, setDefaultOutlineId] = useState<string | null>(null)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const router = useRouter()

  // Load bookmarks and default settings
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load bookmarks with error handling
        try {
          const loadedBookmarks = await getAllBookmarks()
          const sortedBookmarks = loadedBookmarks.sort((a, b) => b.createdAt - a.createdAt)
          setBookmarks(sortedBookmarks)
          setFilteredBookmarks(sortedBookmarks)
        } catch (bookmarkError) {
          console.error("Error loading bookmarks:", bookmarkError)
          setError("Failed to load bookmarks. Using available data.")

          // Try to use any bookmarks we might have in localStorage as fallback
          try {
            const bookmarksStr = localStorage.getItem("bibleReaderBookmarks")
            if (bookmarksStr) {
              const localBookmarks = JSON.parse(bookmarksStr)
              const sortedBookmarks = localBookmarks.sort((a, b) => b.createdAt - a.createdAt)
              setBookmarks(sortedBookmarks)
              setFilteredBookmarks(sortedBookmarks)
            }
          } catch (localStorageError) {
            console.error("Error loading from localStorage:", localStorageError)
          }
        }

        // Load default version and outline with error handling
        try {
          const settings = await getDisplaySettings()
          if (settings) {
            setDefaultVersionId(settings.defaultVersionId || null)
            setDefaultOutlineId(settings.defaultOutlineId || null)
          }
        } catch (settingsError) {
          console.error("Error loading settings:", settingsError)
          // Continue without settings - we'll use fallbacks when navigating
        }
      } catch (error) {
        console.error("Error in loadData:", error)
        setError("An error occurred while loading data.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filter bookmarks when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBookmarks(bookmarks)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = bookmarks.filter(
      (bookmark) =>
        bookmark.title.toLowerCase().includes(query) ||
        bookmark.book.toLowerCase().includes(query) ||
        (bookmark.notes && bookmark.notes.toLowerCase().includes(query)),
    )
    setFilteredBookmarks(filtered)
  }, [searchQuery, bookmarks])

  // Navigate to a bookmarked chapter
  const navigateToBookmark = (bookmark: Bookmark) => {
    const versionId = defaultVersionId || "1" // Fallback to version 1 if no default
    const outlineId = defaultOutlineId || "1" // Fallback to outline 1 if no default

    router.push(
      `/read/view?versionId=${versionId}&outlineId=${outlineId}&book=${bookmark.book}&chapter=${bookmark.chapter}`,
    )
  }

  // Handle deleting a bookmark
  const handleDeleteBookmark = async (id: number | undefined) => {
    if (!id) return
    if (!window.confirm("Are you sure you want to delete this bookmark?")) return

    try {
      await deleteBookmark(id)

      // Update local state directly instead of refetching
      const updatedBookmarks = bookmarks.filter((b) => b.id !== id)
      setBookmarks(updatedBookmarks)
      setFilteredBookmarks(
        updatedBookmarks.filter(
          (b) =>
            !searchQuery.trim() ||
            b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.book.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase())),
        ),
      )
    } catch (error) {
      console.error("Error deleting bookmark:", error)
      alert("Failed to delete bookmark. Please try again.")
    }
  }

  // Start editing a bookmark
  const startEditing = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark)
    setEditTitle(bookmark.title)
    setEditNotes(bookmark.notes || "")
  }

  // Save edited bookmark
  const saveBookmark = async () => {
    if (!editingBookmark) return

    try {
      const updatedBookmark: Bookmark = {
        ...editingBookmark,
        title: editTitle,
        notes: editNotes,
      }

      await updateBookmark(updatedBookmark)

      // Update local state directly instead of refetching
      const updatedBookmarks = bookmarks.map((b) => (b.id === updatedBookmark.id ? updatedBookmark : b))
      setBookmarks(updatedBookmarks)
      setFilteredBookmarks(
        updatedBookmarks.filter(
          (b) =>
            !searchQuery.trim() ||
            b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.book.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase())),
        ),
      )

      // Reset editing state
      setEditingBookmark(null)
      setEditTitle("")
      setEditNotes("")
    } catch (error) {
      console.error("Error updating bookmark:", error)
      alert("Failed to update bookmark. Please try again.")
    }
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingBookmark(null)
    setEditTitle("")
    setEditNotes("")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mr-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Bookmarks</h1>
      </div>

      {error && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bookmarks..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading bookmarks...</p>
      ) : filteredBookmarks.length === 0 ? (
        <Card className="p-8 text-center">
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <BookmarkIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
              <p className="text-muted-foreground">
                {searchQuery ? "No bookmarks match your search" : "No bookmarks yet"}
              </p>
              {searchQuery && (
                <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2">
                  Clear search
                </Button>
              )}
              {!searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">Add bookmarks while reading to see them here</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookmarks.map((bookmark) => (
            <Card
              key={bookmark.id || `temp-${bookmark.book}-${bookmark.chapter}`}
              className={`transition-shadow ${editingBookmark?.id === bookmark.id ? "ring-2 ring-primary" : "hover:shadow-md"}`}
            >
              {editingBookmark?.id === bookmark.id ? (
                // Editing mode
                <>
                  <CardHeader className="pb-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Bookmark title"
                      className="font-medium"
                    />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium mb-2">
                      {bookmark.book} {bookmark.chapter}
                    </p>
                    <Input
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="text-sm"
                    />
                  </CardContent>
                  <div className="flex justify-end p-4 pt-0 space-x-2">
                    <Button variant="outline" size="sm" onClick={cancelEditing}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveBookmark}>
                      Save
                    </Button>
                  </div>
                </>
              ) : (
                // View mode
                <>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{bookmark.title}</CardTitle>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(bookmark)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteBookmark(bookmark.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">
                      {bookmark.book} {bookmark.chapter}
                    </p>
                    {bookmark.notes && <p className="text-sm text-muted-foreground mt-1">{bookmark.notes}</p>}
                    <Button
                      variant="ghost"
                      className="w-full mt-4 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      onClick={() => navigateToBookmark(bookmark)}
                    >
                      Open
                    </Button>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
