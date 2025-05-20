"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Footnote {
  id: string
  verseNumber: number
  content: string
}

export default function FootnotesPage() {
  const router = useRouter()
  const params = useParams()
  const { book, chapter } = params

  const [footnotes, setFootnotes] = useState<Footnote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)

        // Get the current URL parameters
        const searchParams = new URLSearchParams(window.location.search)
        const versionId = searchParams.get("version")
        const outlineId = searchParams.get("outline")

        if (!versionId || !outlineId) {
          setError("Missing version or outline ID")
          return
        }

        // Fetch Bible content
        const { data: versionData, error: versionError } = await supabase
          .from("bible_versions")
          .select("content")
          .eq("id", versionId)
          .single()

        if (versionError) throw versionError

        // Fetch outline
        const { data: outlineData, error: outlineError } = await supabase
          .from("bible_outlines")
          .select("*")
          .eq("id", outlineId)
          .single()

        if (outlineError) throw outlineError

        // Process content to extract footnotes
        if (versionData.content && outlineData) {
          const content = versionData.content
          const outline = outlineData

          // Find the chapter in the outline
          const chapterData = outline.chapters.find(
            (c: any) =>
              (c.book === book || (c.name && c.name.startsWith(book + " - "))) && c.number.toString() === chapter,
          )

          if (!chapterData) {
            setError("Chapter not found in outline")
            return
          }

          // Extract content for this chapter
          const lines = content.split("\n")
          const startLine = chapterData.startLine || 1
          const endLine = chapterData.endLine || lines.length

          const chapterLines = lines.slice(startLine - 1, endLine)
          const extractedFootnotes: Footnote[] = []

          // Process each line to find footnotes
          chapterLines.forEach((line, lineIndex) => {
            const footnoteMatches = line.match(/<FN>(.*?)<\/FN>/g)
            if (footnoteMatches) {
              // Try to find verse number
              const verseMatch = line.match(/<V>(\d+)<\/V>/)
              const verseNumber = verseMatch ? Number.parseInt(verseMatch[1], 10) : lineIndex + 1

              footnoteMatches.forEach((match, fnIndex) => {
                const content = match.replace(/<FN>(.*?)<\/FN>/, "$1")
                const id = `fn-${chapter}-${verseNumber}-${fnIndex}`

                extractedFootnotes.push({
                  id,
                  verseNumber,
                  content,
                })
              })
            }
          })

          setFootnotes(extractedFootnotes)
        }
      } catch (err) {
        console.error("Error fetching footnotes:", err)
        setError("Failed to load footnotes")
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [book, chapter])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {book} {chapter} Footnotes
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Footnotes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading footnotes...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : footnotes.length === 0 ? (
            <p>No footnotes found for this chapter.</p>
          ) : (
            <div className="space-y-4">
              {footnotes.map((footnote) => (
                <div key={footnote.id} id={footnote.id} className="pb-2 border-b last:border-0">
                  <div className="flex items-start">
                    <span className="font-bold mr-2">Verse {footnote.verseNumber}:</span>
                    <div dangerouslySetInnerHTML={{ __html: footnote.content }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
