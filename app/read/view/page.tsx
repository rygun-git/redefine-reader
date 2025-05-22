"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { BibleReader } from "@/components/bible-reader"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Home, Info, ChevronDown, Settings } from "lucide-react"
import Link from "next/link"
import { useUrlResolver } from "@/hooks/useUrlResolver"
import { useTheme } from "next-themes"
import { addHistoryItem } from "@/lib/history"
import { defaultBibleVersions, defaultBibleOutlines } from "@/lib/available-content"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { storeLastRead, getDisplaySettings } from "@/lib/indexedDB"

export default function ReadViewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  // Get URL parameters
  const versionParam = searchParams.get("version")
  const outlineParam = searchParams.get("outline")
  const bookParam = searchParams.get("book")
  const chapterParam = searchParams.get("chapter")

  // Create state to track the displayed chapter
  const [displayedChapter, setDisplayedChapter] = useState(chapterParam)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [displaySettings, setDisplaySettings] = useState<any>(null)

  // Use the URL resolver hook
  const { versionUrl, outlineUrl, loading: urlLoading, error: urlError } = useUrlResolver(versionParam, outlineParam)

  // State for the info dialog
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(versionParam || "")
  const [selectedOutline, setSelectedOutline] = useState(outlineParam || "")

  // State to track version/outline changes
  const [changingVersion, setChangingVersion] = useState(false)

  // Load display settings to get default version and outline
  useEffect(() => {
    const loadDisplaySettings = async () => {
      try {
        const settings = await getDisplaySettings()
        if (settings) {
          setDisplaySettings(settings)
          console.log("Loaded display settings:", settings)
        }
      } catch (error) {
        console.error("Error loading display settings:", error)
      }
    }

    loadDisplaySettings()
  }, [])

  // Listen for URL changes
  useEffect(() => {
    // Update displayed chapter when URL changes
    setDisplayedChapter(chapterParam)

    // Also listen for history changes (back/forward navigation)
    const handlePopState = () => {
      const newParams = new URLSearchParams(window.location.search)
      const newChapter = newParams.get("chapter")
      setDisplayedChapter(newChapter)
    }

    window.addEventListener("popstate", handlePopState)

    // Create a MutationObserver to watch for changes to the URL
    const observer = new MutationObserver((mutations) => {
      const newParams = new URLSearchParams(window.location.search)
      const newChapter = newParams.get("chapter")
      if (newChapter !== displayedChapter) {
        setDisplayedChapter(newChapter)
      }
    })

    // Observe the document title as a proxy for URL changes
    observer.observe(document, { subtree: true, childList: true })

    return () => {
      window.removeEventListener("popstate", handlePopState)
      observer.disconnect()
    }
  }, [chapterParam, displayedChapter])

  // Create an interval to check for URL changes
  useEffect(() => {
    const interval = setInterval(() => {
      const newParams = new URLSearchParams(window.location.search)
      const newChapter = newParams.get("chapter")
      if (newChapter !== displayedChapter) {
        setDisplayedChapter(newChapter)
      }
    }, 5000) // Check every 500ms

    return () => clearInterval(interval)
  }, [displayedChapter])

  // Record history when viewing a chapter
  useEffect(() => {
    const recordHistory = async () => {
      if (bookParam && chapterParam && versionParam) {
        try {
          await addHistoryItem({
            book: bookParam,
            chapter: chapterParam,
            timestamp: Date.now(),
            versionId: versionParam,
            versionTitle: searchParams.get("versionTitle") || undefined,
            outlineId: outlineParam || undefined,
          })
        } catch (error) {
          console.error("Failed to record history:", error)
          // Non-critical error, don't need to show to user
        }
      }
    }

    if (!loading && !error && !urlLoading && !urlError) {
      recordHistory()
    }
  }, [bookParam, chapterParam, versionParam, outlineParam, searchParams, loading, error, urlLoading, urlError])

  useEffect(() => {
    // Check if we have all required parameters
    if (!versionParam && !outlineParam && displaySettings) {
      // Try to use defaults from display settings
      const defaultVersion = displaySettings.defaultVersionId
      const defaultOutline = displaySettings.defaultOutlineId

      if (defaultVersion && defaultOutline) {
        console.log("Using default version and outline from settings:", { defaultVersion, defaultOutline })
        router.push(`/read?version=${defaultVersion}&outline=${defaultOutline}`)
        return
      }
    }

    if (!versionParam || !outlineParam) {
      console.warn("Missing version or outline parameter", { versionParam, outlineParam })
      router.push("/read")
      return
    }

    if (!bookParam) {
      console.warn("Missing book parameter", { versionParam, outlineParam })
      router.push(`/select/book?version=${versionParam}&outline=${outlineParam}`)
      return
    }

    if (!chapterParam) {
      console.warn("Missing chapter parameter", { versionParam, outlineParam, bookParam })
      router.push(`/select/chapter?version=${versionParam}&outline=${outlineParam}&book=${bookParam}`)
      return
    }

    // Validate chapter
    const chapter = Number(chapterParam)
    if (isNaN(chapter) || chapter < 1) {
      console.error("Invalid chapter parameter", { chapterParam })
      setError(`Invalid chapter: ${chapterParam}`)
      setLoading(false)
      return
    }

    // Wait for URL resolution to complete
    if (!urlLoading) {
      console.log("URL resolution complete:", { versionUrl, outlineUrl, urlError })
      setLoading(false)
    }
  }, [
    versionParam,
    outlineParam,
    bookParam,
    chapterParam,
    router,
    urlLoading,
    urlError,
    versionUrl,
    outlineUrl,
    displaySettings,
  ])

  // Update selected version and outline when URL params change
  useEffect(() => {
    if (versionParam) setSelectedVersion(versionParam)
    if (outlineParam) setSelectedOutline(outlineParam)
  }, [versionParam, outlineParam])

  // Function to handle version and outline changes
  const handleChangeVersionAndOutline = async () => {
    if (selectedVersion && selectedOutline) {
      // Set loading state
      setChangingVersion(true)

      // Get the version and outline titles
      const versionItem = defaultBibleVersions.find((v) => v.id.toString() === selectedVersion)
      const outlineItem = defaultBibleOutlines.find((o) => o.id.toString() === selectedOutline)

      const versionTitle = versionItem ? versionItem.title : `Version ${selectedVersion}`
      const outlineTitle = outlineItem ? outlineItem.title : `Outline ${selectedOutline}`

      // Store the selection in LocalDB for persistence
      try {
        await storeLastRead({
          timestamp: Date.now(),
          versionId: selectedVersion,
          versionTitle: versionTitle,
          outlineId: selectedOutline,
          outlineTitle: outlineTitle,
          book: bookParam || "",
          chapter: chapterParam || "",
        })

        // Also update display settings to save these as defaults
        if (displaySettings) {
          const updatedSettings = {
            ...displaySettings,
            defaultVersionId: selectedVersion,
            defaultOutlineId: selectedOutline,
          }

          // Import the storeDisplaySettings function
          const { storeDisplaySettings } = await import("@/lib/indexedDB")
          await storeDisplaySettings(updatedSettings)

          console.log("Updated display settings with new version and outline defaults")
        }

        console.log("Saved version and outline selection to LocalDB")
      } catch (error) {
        console.error("Failed to save selection to LocalDB:", error)
        // Continue anyway as this is not critical
      }

      // Navigate to the same book and chapter but with new version and outline
      router.push(
        `/read/view?version=${selectedVersion}&outline=${selectedOutline}&book=${bookParam}&chapter=${chapterParam}`,
      )
      setInfoDialogOpen(false)
    }
  }

  // Reset loading state when URLs are resolved
  useEffect(() => {
    if (!urlLoading && versionUrl && outlineUrl) {
      setChangingVersion(false)
    }
  }, [urlLoading, versionUrl, outlineUrl])

  if (loading || urlLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Bible Reader</h1>
          <Link href="/read">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
            </Button>
          </Link>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </div>
    )
  }

  if (error || urlError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Error</h1>
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
            </Button>
          </Link>
        </div>
        <div className="space-y-4">
          <div className="text-destructive">{error || urlError}</div>
          <div className="text-sm text-muted-foreground">
            <p>Debug information:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Version ID: {versionParam || "Not provided"}</li>
              <li>Outline ID: {outlineParam || "Not provided"}</li>
              <li>Book: {bookParam || "Not provided"}</li>
              <li>Chapter: {chapterParam || "Not provided"}</li>
            </ul>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Fallback URLs in case the resolver fails
  const fallbackVersionUrl = "/bibles/0.txt"
  const fallbackOutlineUrl = "/outlines/0.json"

  // Get the current chapter from URL or state
  const currentChapter = new URLSearchParams(window.location.search).get("chapter") || displayedChapter

  const numericOutlineParam = Number(outlineParam)
  const numericVersionParam = Number(versionParam)

  const outlineItem = defaultBibleOutlines.find((item) => item.id == outlineParam)
  const outlineTitle = outlineItem ? outlineItem.title : null // Get title or null if no match

  const versionItem = defaultBibleVersions.find((item) => item.id == versionParam)
  const versionTitle = versionItem ? versionItem.title : null // Get title or null if no match

  console.log(outlineTitle)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href={`/select/chapter?version=${versionParam}&outline=${outlineParam}&book=${bookParam}`}>
            <Button variant="ghost" size="sm" className="mr-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {bookParam} {currentChapter}
            </h1>
            <p className="text-sm flex items-center gap-3">
              <button
                onClick={() => setInfoDialogOpen(true)}
                className={`inline-flex items-center ${
                  changingVersion
                    ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                } px-3 py-1 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors`}
                aria-label="Change version and outline"
                disabled={changingVersion}
              >
                {changingVersion ? (
                  <>
                    Loading...
                    <div className="ml-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </>
                ) : (
                  <>
                    {versionTitle || versionParam}{/* • {outlineTitle || outlineParam}*/}
                    <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </button>
              <Link
                href={`/about/version?version=${versionParam}&outline=${outlineParam}&book=${bookParam}&chapter=${chapterParam}`}
                className="inline-flex items-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                {/*About*/}
                <Info className="h-3.5 w-3.5 ml-1" />
              </Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings/display">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/read">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {changingVersion ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-4/5" />
        </div>
      ) : (
        <BibleReader
          versionUrl={versionUrl || fallbackVersionUrl}
          outlineUrl={outlineUrl || fallbackOutlineUrl}
          book={bookParam}
          chapter={Number(chapterParam)}
          displaySettings={displaySettings}
        />
      )}
      {/* Version and Outline Info Dialog */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bible Version & Outline</DialogTitle>
            <DialogDescription>Change the Bible version or outline structure for your reading.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="version">Bible Version</Label>
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger id="version">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {defaultBibleVersions.map((version) => (
                    <SelectItem key={version.id} value={version.id.toString()}>
                      {version.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="outline">Outline Structure</Label>
              <Select value={selectedOutline} onValueChange={setSelectedOutline}>
                <SelectTrigger id="outline">
                  <SelectValue placeholder="Select outline" />
                </SelectTrigger>
                <SelectContent>
                  {defaultBibleOutlines.map((outline) => (
                    <SelectItem key={outline.id} value={outline.id.toString()}>
                      {outline.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInfoDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeVersionAndOutline}>Apply Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
