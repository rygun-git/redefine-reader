"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Clock, Search, Trash2, ArrowLeft } from "lucide-react"
import { getAllHistoryItems, deleteHistoryItem, clearAllHistory, type HistoryItem } from "@/lib/history"
import { getDisplaySettings } from "@/lib/indexedDB"

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [defaultVersionId, setDefaultVersionId] = useState<string | null>(null)
  const [defaultOutlineId, setDefaultOutlineId] = useState<string | null>(null)
  const router = useRouter()

  // Load history items
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Load history
        try {
          const items = await getAllHistoryItems()
          setHistory(items)
          setFilteredHistory(items)
        } catch (error) {
          console.error("Error loading history:", error)
          // Continue with empty history if loading fails
          setHistory([])
          setFilteredHistory([])
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

  // Filter history items when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHistory(history)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = history.filter(
      (item) => item.book.toLowerCase().includes(query) || item.chapter.toString().includes(query),
    )
    setFilteredHistory(filtered)
  }, [searchQuery, history])

  // Handle deleting a history item
  const handleDelete = async (id: number) => {
    try {
      await deleteHistoryItem(id)
      setHistory((prev) => prev.filter((item) => item.id !== id))
    } catch (error) {
      console.error("Error deleting history item:", error)
    }
  }

  // Handle clearing all history
  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear all reading history?")) {
      try {
        await clearAllHistory()
        setHistory([])
      } catch (error) {
        console.error("Error clearing history:", error)
      }
    }
  }

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp

    // Less than a minute
    if (diff < 60 * 1000) {
      return "Just now"
    }

    // Less than an hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000))
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
    }

    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`
    }

    // Less than a week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000))
      return `${days} day${days !== 1 ? "s" : ""} ago`
    }

    // Format as date
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Reading History</h1>
        </div>
        {history.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search history..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* History List */}
      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading history...</p>
      ) : filteredHistory.length === 0 ? (
        <Card className="p-8 text-center">
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
              <p className="text-muted-foreground">
                {searchQuery ? "No matching history items found" : "No reading history yet"}
              </p>
              {searchQuery && (
                <Button variant="link" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div
                    className="flex-grow cursor-pointer"
                    onClick={() => {
                      const versionId = item.versionId || defaultVersionId || "1"
                      const outlineId = item.outlineId || defaultOutlineId || "1"
                      router.push(
                        `/read/view?version=${versionId}&outline=${outlineId}&book=${item.book}&chapter=${item.chapter}`,
                      )
                    }}
                  >
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <h3 className="font-medium">
                        {item.book} {item.chapter}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{formatRelativeTime(item.timestamp)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (item.id) handleDelete(item.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
