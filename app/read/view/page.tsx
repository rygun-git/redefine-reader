"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { BibleReader } from "@/components/bible-reader"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Home } from "lucide-react"
import Link from "next/link"
import { useUrlResolver } from "@/hooks/useUrlResolver"

export default function ReadViewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const versionParam = searchParams.get("version")
  const outlineParam = searchParams.get("outline")
  const bookParam = searchParams.get("book")
  const chapterParam = searchParams.get("chapter")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use the URL resolver hook
  const { versionUrl, outlineUrl, loading: urlLoading, error: urlError } = useUrlResolver(versionParam, outlineParam)

  useEffect(() => {
    // Check if we have all required parameters
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
  }, [versionParam, outlineParam, bookParam, chapterParam, router, urlLoading, urlError, versionUrl, outlineUrl])

  if (loading || urlLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Bible Reader</h1>
          <Link href="/read">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" /> Back to Home
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
          <Link href="/read">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" /> Back to Home
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
  const fallbackVersionUrl = "/bibles/2.txt"
  const fallbackOutlineUrl = "/outlines/11.json"

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href={`/select/chapter?version=${versionParam}&outline=${outlineParam}&book=${bookParam}`}>
            <Button variant="ghost" size="sm" className="mr-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{bookParam}</h1>
        </div>
        <Link href="/read">
          <Button variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </div>

      {/* Use resolved URLs if available, otherwise fall back to hardcoded URLs */}
      <BibleReader
        versionUrl={versionUrl || fallbackVersionUrl}
        outlineUrl={outlineUrl || fallbackOutlineUrl}
        book={bookParam}
        chapter={Number(chapterParam)}
      />
    </div>
  )
}
