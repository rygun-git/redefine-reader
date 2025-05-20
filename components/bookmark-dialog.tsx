"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type Bookmark, getAllBookmarks, addBookmark, deleteBookmark, updateBookmark } from "@/lib/bookmarks"
import { Pencil, Trash2, BookmarkPlus, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"

interface BookmarkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBook?: string
  currentChapter?: number
  onNavigate?: (book: string, chapter: number) => void
}

export function BookmarkDialog({ open, onOpenChange, currentBook, currentChapter, onNavigate }: BookmarkDialogProps) {
  const router = useRouter()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [bookmarkTitle, setBookmarkTitle] = useState("")
  const [bookmarkNotes, setBookmarkNotes] = useState("")
  const [mode, setMode] = useState<"list" | "add" | "edit">("list")

  // Load bookmarks
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        setLoading(true)
        const loadedBookmarks = await getAllBookmarks()
        setBookmarks(loadedBookmarks.sort((a, b) => b.createdAt - a.createdAt))
      } catch (error) {
        console.error("Error loading bookmarks:", error)
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      loadBookmarks()
    }
  }, [open])

  // Handle adding a bookmark
  const handleAddBookmark = async () => {
    if (!currentBook || !currentChapter) return

    try {
      const newBookmark: Bookmark = {
        title: bookmarkTitle || `${currentBook} ${currentChapter}`,
        book: currentBook,
        chapter: currentChapter,
        notes: bookmarkNotes,
        createdAt: Date.now(),
      }

      const id = await addBookmark(newBookmark)

      // Refresh bookmarks list
      const updatedBookmarks = await getAllBookmarks()
      setBookmarks(updatedBookmarks.sort((a, b) => b.createdAt - a.createdAt))

      // Reset form and go back to list
      setBookmarkTitle("")
      setBookmarkNotes("")
      setMode("list")
    } catch (error) {
      console.error("Error adding bookmark:", error)
      alert("Failed to add bookmark. Please try again.")
    }
  }

  // Handle updating a bookmark
  const handleUpdateBookmark = async () => {
    if (!editingBookmark) return

    try {
      const updatedBookmark: Bookmark = {
        ...editingBookmark,
        title: bookmarkTitle,
        notes: bookmarkNotes,
      }

      await updateBookmark(updatedBookmark)

      // Refresh bookmarks list
      const updatedBookmarks = await getAllBookmarks()
      setBookmarks(updatedBookmarks.sort((a, b) => b.createdAt - a.createdAt))

      // Reset form and go back to list
      setEditingBookmark(null)
      setBookmarkTitle("")
      setBookmarkNotes("")
      setMode("list")
    } catch (error) {
      console.error("Error updating bookmark:", error)
      alert("Failed to update bookmark. Please try again.")
    }
  }

  // Handle deleting a bookmark
  const handleDeleteBookmark = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this bookmark?")) return

    try {
      await deleteBookmark(id)

      // Refresh bookmarks list
      const updatedBookmarks = await getAllBookmarks()
      setBookmarks(updatedBookmarks.sort((a, b) => b.createdAt - a.createdAt))
    } catch (error) {
      console.error("Error deleting bookmark:", error)
      alert("Failed to delete bookmark. Please try again.")
    }
  }

  // Handle navigating to a bookmark
  const handleNavigateToBookmark = (book: string, chapter: number) => {
    if (onNavigate) {
      onNavigate(book, chapter)
      onOpenChange(false)
    } else {
      router.push(`/read/view?book=${book}&chapter=${chapter}`)
      onOpenChange(false)
    }
  }

  // Start editing a bookmark
  const startEditingBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark)
    setBookmarkTitle(bookmark.title)
    setBookmarkNotes(bookmark.notes || "")
    setMode("edit")
  }

  // Start adding a new bookmark
  const startAddingBookmark = () => {
    setBookmarkTitle(currentBook && currentChapter ? `${currentBook} ${currentChapter}` : "")
    setBookmarkNotes("")
    setMode("add")
  }

  // Cancel editing/adding
  const cancelEdit = () => {
    setEditingBookmark(null)
    setBookmarkTitle("")
    setBookmarkNotes("")
    setMode("list")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "list" ? "Bookmarks" : mode === "add" ? "Add Bookmark" : "Edit Bookmark"}</DialogTitle>
          <DialogDescription>
            {mode === "list"
              ? "View, edit, or navigate to your saved bookmarks."
              : mode === "add"
                ? "Add a new bookmark for the current chapter."
                : "Edit bookmark details."}
          </DialogDescription>
        </DialogHeader>

        {mode === "list" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-muted-foreground">
                {bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""}
              </span>
              {currentBook && currentChapter && (
                <Button variant="outline" size="sm" onClick={startAddingBookmark}>
                  <BookmarkPlus className="h-4 w-4 mr-2" />
                  Add Current
                </Button>
              )}
            </div>

            {loading ? (
              <div className="py-4 text-center">Loading bookmarks...</div>
            ) : bookmarks.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                No bookmarks yet. Add one by clicking the button above.
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-start justify-between p-3 border-b last:border-0 hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{bookmark.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {bookmark.book} {bookmark.chapter}
                      </p>
                      {bookmark.notes && <p className="text-sm mt-1 line-clamp-2">{bookmark.notes}</p>}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleNavigateToBookmark(bookmark.book, bookmark.chapter)}
                        title="Go to bookmark"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditingBookmark(bookmark)}
                        title="Edit bookmark"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => bookmark.id && handleDeleteBookmark(bookmark.id)}
                        title="Delete bookmark"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {(mode === "add" || mode === "edit") && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={bookmarkTitle}
                onChange={(e) => setBookmarkTitle(e.target.value)}
                placeholder="Enter bookmark title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={bookmarkNotes}
                onChange={(e) => setBookmarkNotes(e.target.value)}
                placeholder="Add notes about this bookmark"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          {mode !== "list" ? (
            <>
              <Button variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button onClick={mode === "add" ? handleAddBookmark : handleUpdateBookmark}>
                {mode === "add" ? "Add Bookmark" : "Update Bookmark"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
