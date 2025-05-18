"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { BibleReader } from "@/components/bible-reader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChevronLeft, ChevronRight, BookOpen, Home } from "lucide-react"
import Link from "next/link"

// Initialize Supabase client
const supabaseClient = createClient(
  "https://rzynttoonxzglpyawbgz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6eW50dG9vbnh6Z2xweWF3Ymd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMjk4ODYsImV4cCI6MjA2MTgwNTg4Nn0.Hfw3LODJUp7epk0QOWux9PZ134QB3jeh_VhDH7aUMh8",
)

interface BibleVersion {
  id: number
  title: string
  language: string
  description: string | null
  created_at: string
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
}

export default function ReadPage() {
  const [bibleVersions, setBibleVersions] = useState<BibleVersion[]>([])
  const [bibleOutlines, setBibleOutlines] = useState<BibleOutline[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string>("")
  const [selectedOutlineId, setSelectedOutlineId] = useState<string>("")
  const [bibleContent, setBibleContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentChapter, setCurrentChapter] = useState(1)

  useEffect(() => {
    // Fetch available Bible versions
    const fetchBibleVersions = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("bible_versions")
          .select("id, title, language, description, created_at")
          .order("created_at", { ascending: false })

        if (error) throw error

        if (data && data.length > 0) {
          setBibleVersions(data)
          setSelectedVersionId(data[0].id.toString())
        } else {
          setError("No Bible versions found. Please upload one first.")
        }
      } catch (err) {
        console.error("Error fetching Bible versions:", err)
        setError("Failed to load Bible versions")
      } finally {
        setLoading(false)
      }
    }

    // Fetch available Bible outlines
    const fetchBibleOutlines = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("bible_outlines")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) throw error

        if (data && data.length > 0) {
          setBibleOutlines(data)
          setSelectedOutlineId(data[0].id.toString())
        }
      } catch (err) {
        console.error("Error fetching Bible outlines:", err)
        // Not setting error here as outlines are optional
      }
    }

    fetchBibleVersions()
    fetchBibleOutlines()
  }, [])

  useEffect(() => {
    // Fetch selected Bible content
    const fetchBibleContent = async () => {
      if (!selectedVersionId) return

      setLoading(true)
      try {
        const { data, error } = await supabaseClient
          .from("bible_versions")
          .select("content")
          .eq("id", selectedVersionId)
          .single()

        if (error) throw error

        if (data && data.content) {
          setBibleContent(data.content)
        }
      } catch (err) {
        console.error("Error fetching Bible content:", err)
        setError("Failed to load Bible content")
      } finally {
        setLoading(false)
      }
    }

    fetchBibleContent()
  }, [selectedVersionId])

  const handlePreviousChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter(currentChapter - 1)
    }
  }

  const handleNextChapter = () => {
    // This is a simplified approach - in a real app you'd check the max chapters
    setCurrentChapter(currentChapter + 1)
  }

  const handleChapterChange = (chapter: number) => {
    setCurrentChapter(chapter)
  }

  // Get the selected outline
  const selectedOutline = bibleOutlines.find((outline) => outline.id.toString() === selectedOutlineId)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bible Reader</h1>
        <Link href="/">
          <Button variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Bible Version</label>
            <Select
              value={selectedVersionId}
              onValueChange={setSelectedVersionId}
              disabled={loading || bibleVersions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Bible version" />
              </SelectTrigger>
              <SelectContent>
                {bibleVersions.map((version) => (
                  <SelectItem key={version.id} value={version.id.toString()}>
                    {version.title} ({version.language})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bible Outline</label>
            <Select
              value={selectedOutlineId}
              onValueChange={setSelectedOutlineId}
              disabled={bibleOutlines.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Bible outline" />
              </SelectTrigger>
              <SelectContent>
                {bibleOutlines.map((outline) => (
                  <SelectItem key={outline.id} value={outline.id.toString()}>
                    {outline.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <Button variant="outline" size="icon" onClick={handlePreviousChapter} disabled={currentChapter <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 px-2">
            <BookOpen className="h-4 w-4" />
            <span>Chapter {currentChapter}</span>
          </div>

          <Button variant="outline" size="icon" onClick={handleNextChapter}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : bibleContent ? (
            <BibleReader
              content={bibleContent}
              chapter={currentChapter}
              onChapterChange={handleChapterChange}
              bibleOutline={selectedOutline}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Select a Bible version to start reading</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
