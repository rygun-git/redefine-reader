"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Home, BookOpen, Database } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getBibleContent, isIndexedDBAvailable, getDisplaySettings } from "@/lib/indexedDB"
import { DisplaySettingsCard } from "@/components/display-settings-card"

interface BibleVersion {
  id: number
  title: string
  language: string
  description: string | null
  created_at: string
  cached?: boolean
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

export default function ReadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const versionParam = searchParams.get("version")
  const outlineParam = searchParams.get("outline")

  const [bibleVersions, setBibleVersions] = useState<BibleVersion[]>([])
  const [bibleOutlines, setBibleOutlines] = useState<BibleOutline[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string>(versionParam || "")
  const [selectedOutlineId, setSelectedOutlineId] = useState<string>(outlineParam || "")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [indexedDBAvailable, setIndexedDBAvailable] = useState<boolean>(false)
  const [checkingCache, setCheckingCache] = useState<boolean>(false)

  useEffect(() => {
    // Check if IndexedDB is available
    const checkIndexedDB = async () => {
      const available = await isIndexedDBAvailable()
      setIndexedDBAvailable(available)
    }

    checkIndexedDB()
  }, [])

  useEffect(() => {
    // Fetch available Bible versions (metadata only, not content)
    const fetchBibleVersions = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("bible_versions")
          .select("id, title, language, description, created_at") // Only select metadata, not content
          .order("created_at", { ascending: false })

        if (error) throw error

        if (data && data.length > 0) {
          setBibleVersions(data)

          // Get user's default version from settings
          const settings = await getDisplaySettings()
          const defaultVersionId = settings?.defaultVersionId

          // Set the selected version based on priority:
          // 1. URL parameter if present
          // 2. User's default version if set
          // 3. First version in the list as fallback
          if (versionParam) {
            setSelectedVersionId(versionParam)
          } else if (defaultVersionId) {
            // Check if the default version exists in the available versions
            const versionExists = data.some((v) => v.id.toString() === defaultVersionId.toString())
            if (versionExists) {
              setSelectedVersionId(defaultVersionId.toString())
            } else {
              setSelectedVersionId(data[0].id.toString())
            }
          } else {
            setSelectedVersionId(data[0].id.toString())
          }

          // Check which versions are cached if IndexedDB is available
          if (indexedDBAvailable) {
            setCheckingCache(true)
            const versionsWithCacheStatus = await Promise.all(
              data.map(async (version) => {
                try {
                  const cachedContent = await getBibleContent(version.id)
                  return { ...version, cached: !!cachedContent }
                } catch (e) {
                  console.error(`Error checking cache for version ${version.id}:`, e)
                  return { ...version, cached: false }
                }
              }),
            )
            setBibleVersions(versionsWithCacheStatus)
            setCheckingCache(false)
          }
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

    // Fetch available Bible outlines (minimal data)
    const fetchBibleOutlines = async () => {
      try {
        const { data, error } = await supabase
          .from("bible_outlines")
          .select("id, title, created_at") // Only select minimal data
          .order("created_at", { ascending: false })

        if (error) throw error

        if (data && data.length > 0) {
          setBibleOutlines(data)
          if (!outlineParam && data.length > 0) {
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
  }, [versionParam, outlineParam, indexedDBAvailable])

  const handleStartReading = () => {
    if (selectedVersionId && selectedOutlineId) {
      router.push(`/select/book?version=${selectedVersionId}&outline=${selectedOutlineId}`)
    } else {
      setError("Please select a Bible version and outline to continue")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bible Reader</h1>
        <Link href="/">
          <Button variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" /> Home
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Versions</CardTitle>
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
                        {version.cached && indexedDBAvailable && (
                          <span className="ml-2 text-green-600 inline-flex items-center">
                            <Database className="h-3 w-3 mr-1" /> Cached
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVersionId && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {bibleVersions.find((v) => v.id.toString() === selectedVersionId)?.description ||
                      "No description available"}
                    {bibleVersions.find((v) => v.id.toString() === selectedVersionId)?.cached && (
                      <span className="ml-2 text-green-600 inline-flex items-center">
                        <Database className="h-3 w-3 mr-1" /> Available offline
                      </span>
                    )}
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
          <Button
            onClick={handleStartReading}
            disabled={loading || !selectedVersionId || checkingCache}
            className="w-full"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            {checkingCache ? "Checking cached versions..." : "Start Reading"}
          </Button>
        </CardFooter>
      </Card>

      {/* Display Settings Card */}
      <DisplaySettingsCard />
    </div>
  )
}
