"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

// Initialize Supabase client
const supabaseClient = createClient(
  "https://rzynttoonxzglpyawbgz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6eW50dG9vbnh6Z2xweWF3Ymd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMjk4ODYsImV4cCI6MjA2MTgwNTg4Nn0.Hfw3LODJUp7epk0QOWux9PZ134QB3jeh_VhDH7aUMh8",
)

// Default outline template
const defaultOutline = {
  title: "Genesis Outline (Default Template)",
  chapters: [
    {
      number: 1,
      name: "Genesis 1 - Creation",
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
      name: "Genesis 2 - Garden of Eden",
      sections: [
        { startVerse: 1, endVerse: 3, title: "Seventh Day: God Rests" },
        { startVerse: 4, endVerse: 14, title: "Creation of Man and the Garden" },
        { startVerse: 15, endVerse: 17, title: "The Command" },
        { startVerse: 18, endVerse: 25, title: "Creation of Woman" },
      ],
    },
    {
      number: 3,
      name: "Genesis 3 - The Fall",
      sections: [
        { startVerse: 1, endVerse: 7, title: "The Temptation" },
        { startVerse: 8, endVerse: 13, title: "God Confronts Adam and Eve" },
        { startVerse: 14, endVerse: 19, title: "The Curse" },
        { startVerse: 20, endVerse: 24, title: "Expulsion from Eden" },
      ],
    },
    {
      number: 4,
      name: "Genesis 4 - Cain and Abel",
      sections: [
        { startVerse: 1, endVerse: 8, title: "Cain Murders Abel" },
        { startVerse: 9, endVerse: 16, title: "Cain's Punishment" },
        { startVerse: 17, endVerse: 24, title: "Cain's Descendants" },
        { startVerse: 25, endVerse: 26, title: "Seth and Enosh" },
      ],
    },
    {
      number: 5,
      name: "Genesis 5 - Adam's Descendants",
      sections: [
        { startVerse: 1, endVerse: 5, title: "Adam" },
        { startVerse: 6, endVerse: 20, title: "Seth to Jared" },
        { startVerse: 21, endVerse: 24, title: "Enoch" },
        { startVerse: 25, endVerse: 32, title: "Methuselah to Noah" },
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
    sections?: {
      startVerse: number
      endVerse: number
      title: string
    }[]
  }[]
  created_at: string
}

export function OutlineManager() {
  const [outlines, setOutlines] = useState<BibleOutline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)

  useEffect(() => {
    fetchOutlines()
  }, [])

  const fetchOutlines = async () => {
    try {
      const { data, error } = await supabaseClient
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
      const { error } = await supabaseClient.from("bible_outlines").delete().eq("id", id)

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
                  <h3 className="font-medium">{outline.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {outline.chapters.length} chapters, created on {new Date(outline.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
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
