"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Home, BookOpen, Link2 } from "lucide-react"
import Link from "next/link"
import { DisplaySettingsCard } from "@/components/display-settings-card"
import { defaultBibleVersions, defaultBibleOutlines } from "@/lib/available-content"
import { getLastRead, storeLastRead } from "@/lib/indexedDB"

interface BibleVersion {
  id: number
  title: string
  language: string
  description: string | null
  file_url?: string | null
}

interface BibleOutline {
  id: number
  title: string
  file_url?: string | null
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

  const fetchData = async () => {
    setLoading(true)

    setBibleVersions(defaultBibleVersions)
    setBibleOutlines(defaultBibleOutlines)

    try {
      // Check if the reader has been opened before by getting lastRead data
      const lastReadData = await getLastRead()
      console.log("Last read data:", lastReadData)

      // Set default selected values
      const defaultVersionId = defaultBibleVersions[0].id.toString()
      const defaultOutlineId = defaultBibleOutlines[0].id.toString()

      if (versionParam) {
        // If URL has version parameter, use that
        setSelectedVersionId(versionParam)
      } else if (lastReadData && lastReadData.versionId) {
        // If reader has been opened before, use the last read version
        setSelectedVersionId(lastReadData.versionId.toString())
      } else {
        // Otherwise use default
        setSelectedVersionId(defaultVersionId)
      }

      if (outlineParam) {
        // If URL has outline parameter, use that
        setSelectedOutlineId(outlineParam)
      } else if (lastReadData && lastReadData.outlineId) {
        // If reader has been opened before, use the last read outline
        setSelectedOutlineId(lastReadData.outlineId.toString())
      } else {
        // Otherwise use default
        setSelectedOutlineId(defaultOutlineId)
      }
    } catch (error) {
      console.error("Error loading last read data:", error)
      // Fall back to defaults if there's an error
      setSelectedVersionId(defaultBibleVersions[0].id.toString())
      setSelectedOutlineId(defaultBibleOutlines[0].id.toString())
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleStartReading = async () => {
    if (selectedVersionId && selectedOutlineId) {
      const selectedVersion = bibleVersions.find((v) => v.id.toString() === selectedVersionId)
      const selectedOutline = bibleOutlines.find((o) => o.id.toString() === selectedOutlineId)

      // Save the selected version and outline to LocalDB
      try {
        await storeLastRead({
          versionId: selectedVersionId,
          outlineId: selectedOutlineId,
          versionTitle: selectedVersion?.title,
          outlineTitle: selectedOutline?.title,
          // We don't have book and chapter yet, so we don't set them
        })
        console.log("Saved selections to LocalDB")
      } catch (error) {
        console.error("Error saving selections to LocalDB:", error)
        // Continue even if saving fails
      }

      let url = `/select/book?version=${selectedVersionId}&outline=${selectedOutlineId}`

      if (selectedVersion?.file_url) {
        url += `&versionUrl=${encodeURIComponent(selectedVersion.file_url)}`
      }

      if (selectedOutline?.file_url) {
        url += `&outlineUrl=${encodeURIComponent(selectedOutline.file_url)}`
      }

      router.push(url)
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
                        <div className="flex items-center">
                          {version.title} ({version.language})
                          {version.file_url && (
                            <span className="ml-2 text-blue-600 inline-flex items-center">
                              <Link2 className="h-3 w-3 mr-1" /> URL
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                        <div className="flex items-center">
                          {outline.title}
                          {outline.file_url && (
                            <span className="ml-2 text-blue-600 inline-flex items-center">
                              <Link2 className="h-3 w-3 mr-1" /> URL
                            </span>
                          )}
                        </div>
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
            disabled={loading || !selectedVersionId}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-primary-foreground h-10 px-4 py-2 w-full bg-green-600 hover:bg-green-700"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Start Reading
          </Button>
        </CardFooter>
      </Card>

      <DisplaySettingsCard />
    </div>
  )
}
