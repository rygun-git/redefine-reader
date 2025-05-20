"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Home, BookOpen, Settings } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { SettingsExportImport } from "@/components/settings-export-import"

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
    book?: string
    sections?: {
      startVerse: number
      endVerse: number
      title: string
    }[]
  }[]
}

export default function SettingsPage() {
  const router = useRouter()
  const [bibleVersions, setBibleVersions] = useState<BibleVersion[]>([])
  const [bibleOutlines, setBibleOutlines] = useState<BibleOutline[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string>("")
  const [selectedOutlineId, setSelectedOutlineId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch available Bible versions
    const fetchBibleVersions = async () => {
      try {
        const { data, error } = await supabase
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
        const { data, error } = await supabase
          .from("bible_outlines")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) throw error

        if (data && data.length > 0) {
          // Process outlines to extract book information
          const processedOutlines = data.map((outline) => {
            // Extract book names from chapter names or book field
            const books = new Set<string>()
            outline.chapters?.forEach((chapter) => {
              if (chapter.book) {
                books.add(chapter.book)
              } else if (chapter.name && chapter.name.includes(" - ")) {
                const bookName = chapter.name.split(" - ")[0]
                books.add(bookName)
              }
            })

            return {
              ...outline,
              books: Array.from(books),
            }
          })

          setBibleOutlines(processedOutlines)

          if (data.length > 0) {
            setSelectedOutlineId(data[0].id.toString())
          }
        }
      } catch (err) {
        console.error("Error fetching Bible outlines:", err)
        // Not setting error here as outlines are optional
      }
    }

    fetchBibleVersions()
    fetchBibleOutlines()
  }, [])

  const handleStartReading = () => {
    if (selectedVersionId && selectedOutlineId) {
      router.push(`/read/view?version=${selectedVersionId}&outline=${selectedOutlineId}`)
    } else if (selectedVersionId) {
      router.push(`/read/view?version=${selectedVersionId}`)
    } else {
      setError("Please select a Bible version to continue")
    }
  }

  // Count books in the selected outline
  const getBookCount = (outlineId: string) => {
    const outline = bibleOutlines.find((o) => o.id.toString() === outlineId)
    if (!outline) return 0

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reader Settings</h1>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" /> Home
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" /> Admin
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Bible Version and Outline</CardTitle>
          <CardDescription>Choose your preferred Bible version and outline before reading</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bible Version</label>
                <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
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
                {selectedVersionId && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {bibleVersions.find((v) => v.id.toString() === selectedVersionId)?.description ||
                      "No description available"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bible Outline</label>
                <Select value={selectedOutlineId} onValueChange={setSelectedOutlineId}>
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
                {selectedOutlineId && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {getBookCount(selectedOutlineId)} books available
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartReading} disabled={loading || !selectedVersionId} className="w-full">
            <BookOpen className="h-4 w-4 mr-2" />
            Start Reading
          </Button>
        </CardFooter>
      </Card>
      <div className="mt-6">
        <SettingsExportImport />
      </div>
    </div>
  )
}
