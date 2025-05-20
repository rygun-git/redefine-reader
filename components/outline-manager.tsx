"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Plus, Trash2, ExternalLink, FileJson } from "lucide-react"
import Link from "next/link"

// Default outline template - now using the chapters format for database compatibility
const defaultOutline = {
  title: "Genesis Outline (Default Template)",
  chapters: [
    {
      number: 1,
      name: "Genesis - Genesis 1 - Creation",
      book: "Genesis",
      sections: [
        { startVerse: 1, endVerse: 5, title: "First Day: Light" },
        { startVerse: 6, endVerse: 8, title: "Second Day: Sky" },
        { startVerse: 9, endVerse: 13, title: "Third Day: Land and Vegetation" },
        { startVerse: 14, endVerse: 19, title: "Fourth Day: Sun, Moon, and Stars" },
        { startVerse: 20, endVerse: 23, title: "Fifth Day: Sea Creatures and Birds" },
        { startVerse: 24, endVerse: 31, title: "Sixth Day: Land Animals and Humans" },
      ],
    },
    {
      number: 2,
      name: "Genesis - Genesis 2 - Garden of Eden",
      book: "Genesis",
      sections: [
        { startVerse: 1, endVerse: 3, title: "Seventh Day: God Rests" },
        { startVerse: 4, endVerse: 14, title: "Creation of Man and the Garden" },
        { startVerse: 15, endVerse: 17, title: "The Command" },
        { startVerse: 18, endVerse: 25, title: "Creation of Woman" },
      ],
    },
    {
      number: 3,
      name: "Genesis - Genesis 3 - The Fall",
      book: "Genesis",
      sections: [
        { startVerse: 1, endVerse: 7, title: "The Temptation" },
        { startVerse: 8, endVerse: 13, title: "God Confronts Adam and Eve" },
        { startVerse: 14, endVerse: 19, title: "The Curse" },
        { startVerse: 20, endVerse: 24, title: "Expulsion from Eden" },
      ],
    },
    {
      number: 1,
      name: "Exodus - Exodus 1 - Israelites Oppressed",
      book: "Exodus",
      sections: [
        { startVerse: 1, endVerse: 7, title: "Israel Multiplies in Egypt" },
        { startVerse: 8, endVerse: 14, title: "New King Oppresses Israel" },
        { startVerse: 15, endVerse: 22, title: "Pharaoh Orders Male Children Killed" },
      ],
    },
    {
      number: 2,
      name: "Exodus - Exodus 2 - Birth of Moses",
      book: "Exodus",
      sections: [
        { startVerse: 1, endVerse: 10, title: "Birth and Adoption of Moses" },
        { startVerse: 11, endVerse: 15, title: "Moses Flees to Midian" },
        { startVerse: 16, endVerse: 25, title: "Moses in Midian" },
      ],
    },
  ],
}

interface BibleOutline {
  id: number
  title: string
  chapters: {
    number: number
    name: string
    book?: string
    sections?: {
      startVerse: number
      endVerse: number
      title: string
    }[]
  }[]
  ignoreCMTag?: boolean
  new_format_data?: string
  file_url?: string | null
  created_at: string
}

export function OutlineManager() {
  const [outlines, setOutlines] = useState<BibleOutline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)
  const [urlFetchLoading, setUrlFetchLoading] = useState<number | null>(null)

  useEffect(() => {
    fetchOutlines()
  }, [])

  const fetchOutlines = async () => {
    try {
      const { data, error } = await supabase
        .from("bible_outlines")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setOutlines(data || [])
    } catch (err) {
      console.error("Error fetching Bible outlines:", err)
      setError("Failed to load Bible outlines")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(defaultOutline, null, 2))
    const downloadAnchorNode = document.createElement("a")
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "bible-outline-template.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const handleDeleteOutline = async (id: number) => {
    if (!confirm("Are you sure you want to delete this outline?")) return

    setDeleteLoading(id)
    try {
      const { error } = await supabase.from("bible_outlines").delete().eq("id", id)

      if (error) throw error

      // Refresh the list
      fetchOutlines()
    } catch (err) {
      console.error("Error deleting outline:", err)
      setError("Failed to delete outline")
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleFetchFromUrl = async (outline: BibleOutline) => {
    if (!outline.file_url) return

    setUrlFetchLoading(outline.id)
    try {
      const response = await fetch(outline.file_url)

      if (!response.ok) {
        throw new Error(`Failed to fetch from URL: ${response.statusText}`)
      }

      const data = await response.json()

      // Download the fetched JSON
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2))
      const downloadAnchorNode = document.createElement("a")
      downloadAnchorNode.setAttribute("href", dataStr)
      downloadAnchorNode.setAttribute("download", `${outline.title.replace(/\s+/g, "-").toLowerCase()}.json`)
      document.body.appendChild(downloadAnchorNode)
      downloadAnchorNode.click()
      downloadAnchorNode.remove()
    } catch (err) {
      console.error("Error fetching from URL:", err)
      setError(`Failed to fetch from URL: ${err.message || "Unknown error"}`)
    } finally {
      setUrlFetchLoading(null)
    }
  }

  // Count books in an outline
  const getBookCount = (outline: BibleOutline) => {
    // Extract unique book names
    const bookNames = new Set<string>()
    outline.chapters?.forEach((chapter) => {
      if (chapter.book) {
        bookNames.add(chapter.book)
      } else if (chapter.name && chapter.name.includes(" - ")) {
        const bookName = chapter.name.split(" - ")[0]
        bookNames.add(bookName)
      }
    })

    return bookNames.size
  }

  // Format URL for display
  const formatUrl = (url: string) => {
    if (!url) return ""

    // Truncate long URLs for display
    if (url.length > 40) {
      return url.substring(0, 37) + "..."
    }
    return url
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex gap-2">
          <Button onClick={handleDownloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Link href="/upload/bible-outline">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Outline
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : outlines.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <p className="text-muted-foreground">No Bible outlines found. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {outlines.map((outline) => (
            <Card key={outline.id} className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center">
                    <h3 className="font-medium">{outline.title}</h3>
                    {outline.file_url && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                        URL Reference
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getBookCount(outline)} books, {outline.chapters?.length || 0} chapters
                  </p>
                  {outline.file_url && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                      <FileJson className="h-3 w-3 mr-1" />
                      <span className="truncate max-w-[250px]">{formatUrl(outline.file_url)}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                  {outline.file_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600"
                      onClick={() => handleFetchFromUrl(outline)}
                      disabled={urlFetchLoading === outline.id}
                    >
                      {urlFetchLoading === outline.id ? (
                        <span className="animate-pulse">Fetching...</span>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-1" /> Fetch JSON
                        </>
                      )}
                    </Button>
                  )}
                  <Link href={`/admin/edit-outline/${outline.id}`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteOutline(outline.id)}
                    disabled={deleteLoading === outline.id}
                  >
                    {deleteLoading === outline.id ? (
                      <span className="animate-pulse">Deleting...</span>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
