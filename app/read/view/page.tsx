"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { BibleReader } from "@/components/bible-reader"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Home } from "lucide-react"
import Link from "next/link"

export default function ReadViewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const versionParam = searchParams.get("version")
  const outlineParam = searchParams.get("outline")
  const bookParam = searchParams.get("book")
  const chapterParam = searchParams.get("chapter")

  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState("")
  const [outline, setOutline] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check if we have all required parameters
    if (!versionParam || !outlineParam) {
      router.push("/read")
      return
    }

    if (!bookParam) {
      router.push(`/select/book?version=${versionParam}&outline=${outlineParam}`)
      return
    }

    if (!chapterParam) {
      router.push(`/select/chapter?version=${versionParam}&outline=${outlineParam}&book=${bookParam}`)
      return
    }

    // If we have all parameters, fetch the data
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch Bible version content
        const { data: versionData, error: versionError } = await supabase
          .from("bible_versions")
          .select("content")
          .eq("id", versionParam)
          .single()

        if (versionError) throw versionError

        // Fetch outline
        const { data: outlineData, error: outlineError } = await supabase
          .from("bible_outlines")
          .select("*")
          .eq("id", outlineParam)
          .single()

        if (outlineError) throw outlineError

        setContent(versionData.content)
        setOutline(outlineData)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err.message || "Failed to load content")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [versionParam, outlineParam, bookParam, chapterParam, router])

  if (loading) {
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

  if (error) {
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
        <div className="text-destructive">{error}</div>
      </div>
    )
  }

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

      {content && outline && (
        <BibleReader versionId={versionParam} outlineId={outlineParam} content={content} bibleOutline={outline} />
      )}
    </div>
  )
}
