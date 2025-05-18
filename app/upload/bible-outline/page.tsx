"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Trash2, Home } from "lucide-react"

// Initialize Supabase client
const supabaseClient = createClient(
  "https://rzynttoonxzglpyawbgz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6eW50dG9vbnh6Z2xweWF3Ymd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMjk4ODYsImV4cCI6MjA2MTgwNTg4Nn0.Hfw3LODJUp7epk0QOWux9PZ134QB3jeh_VhDH7aUMh8",
)

interface Chapter {
  number: number
  name: string
  sections: {
    startVerse: number
    endVerse: number
    title: string
  }[]
}

export default function UploadBibleOutlinePage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [chapters, setChapters] = useState<Chapter[]>([{ number: 1, name: "Chapter 1", sections: [] }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [jsonFile, setJsonFile] = useState<File | null>(null)

  const addChapter = () => {
    const nextNumber = chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) + 1 : 1
    setChapters([...chapters, { number: nextNumber, name: `Chapter ${nextNumber}`, sections: [] }])
  }

  const removeChapter = (index: number) => {
    setChapters(chapters.filter((_, i) => i !== index))
  }

  const updateChapter = (index: number, field: keyof Chapter, value: any) => {
    const updatedChapters = [...chapters]
    updatedChapters[index] = { ...updatedChapters[index], [field]: value }
    setChapters(updatedChapters)
  }

  const addSection = (chapterIndex: number) => {
    const updatedChapters = [...chapters]
    const chapter = updatedChapters[chapterIndex]

    updatedChapters[chapterIndex] = {
      ...chapter,
      sections: [...chapter.sections, { startVerse: 1, endVerse: 10, title: "New Section" }],
    }

    setChapters(updatedChapters)
  }

  const removeSection = (chapterIndex: number, sectionIndex: number) => {
    const updatedChapters = [...chapters]
    updatedChapters[chapterIndex].sections = updatedChapters[chapterIndex].sections.filter((_, i) => i !== sectionIndex)
    setChapters(updatedChapters)
  }

  const updateSection = (chapterIndex: number, sectionIndex: number, field: string, value: any) => {
    const updatedChapters = [...chapters]
    updatedChapters[chapterIndex].sections[sectionIndex] = {
      ...updatedChapters[chapterIndex].sections[sectionIndex],
      [field]: field === "startVerse" || field === "endVerse" ? Number.parseInt(value, 10) : value,
    }
    setChapters(updatedChapters)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setJsonFile(file)

      try {
        const content = await file.text()
        const data = JSON.parse(content)

        if (data.title && Array.isArray(data.chapters)) {
          setTitle(data.title)
          setChapters(data.chapters)
        } else {
          setError("Invalid JSON format. Please use the template format.")
        }
      } catch (err) {
        console.error("Error parsing JSON file:", err)
        setError("Failed to parse JSON file. Please check the format.")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title) {
      setError("Please provide a title for the Bible outline")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Store the Bible outline in the database
      const { data, error: dbError } = await supabaseClient
        .from("bible_outlines")
        .insert([
          {
            title,
            chapters,
          },
        ])
        .select()

      if (dbError) throw dbError

      setSuccess(true)
      setTimeout(() => {
        router.push("/read")
      }, 2000)
    } catch (err) {
      console.error("Error uploading Bible outline:", err)
      setError("Failed to upload Bible outline. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create Bible Outline</h1>
        <Link href="/">
          <Button variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Import Outline</CardTitle>
          <CardDescription>Upload a JSON outline file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="json-file">JSON Outline File</Label>
              <Input id="json-file" type="file" accept=".json" onChange={handleFileChange} />
              <p className="text-sm text-muted-foreground">Upload a JSON file with the outline structure</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New Bible Outline</CardTitle>
          <CardDescription>Create a new Bible outline with chapters and sections</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Outline Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., King James Version Outline"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Chapters</h3>
                <Button type="button" variant="outline" size="sm" onClick={addChapter}>
                  <Plus className="h-4 w-4 mr-1" /> Add Chapter
                </Button>
              </div>

              {chapters.map((chapter, chapterIndex) => (
                <Card key={chapterIndex} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Chapter {chapter.number}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChapter(chapterIndex)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor={`chapter-number-${chapterIndex}`}>Chapter Number</Label>
                      <Input
                        id={`chapter-number-${chapterIndex}`}
                        type="number"
                        value={chapter.number}
                        onChange={(e) => updateChapter(chapterIndex, "number", Number.parseInt(e.target.value, 10))}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`chapter-name-${chapterIndex}`}>Chapter Name</Label>
                      <Input
                        id={`chapter-name-${chapterIndex}`}
                        value={chapter.name}
                        onChange={(e) => updateChapter(chapterIndex, "name", e.target.value)}
                        placeholder="e.g., Genesis 1"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium">Sections</h5>
                      <Button type="button" variant="outline" size="sm" onClick={() => addSection(chapterIndex)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Section
                      </Button>
                    </div>

                    {chapter.sections.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="pl-4 border-l-2 border-muted space-y-2">
                        <div className="flex items-center justify-between">
                          <h6 className="text-sm font-medium">Section {sectionIndex + 1}</h6>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSection(chapterIndex, sectionIndex)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor={`section-start-${chapterIndex}-${sectionIndex}`} className="text-xs">
                              Start Verse
                            </Label>
                            <Input
                              id={`section-start-${chapterIndex}-${sectionIndex}`}
                              type="number"
                              value={section.startVerse}
                              onChange={(e) => updateSection(chapterIndex, sectionIndex, "startVerse", e.target.value)}
                              min="1"
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`section-end-${chapterIndex}-${sectionIndex}`} className="text-xs">
                              End Verse
                            </Label>
                            <Input
                              id={`section-end-${chapterIndex}-${sectionIndex}`}
                              type="number"
                              value={section.endVerse}
                              onChange={(e) => updateSection(chapterIndex, sectionIndex, "endVerse", e.target.value)}
                              min={section.startVerse}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`section-title-${chapterIndex}-${sectionIndex}`} className="text-xs">
                              Section Title
                            </Label>
                            <Input
                              id={`section-title-${chapterIndex}-${sectionIndex}`}
                              value={section.title}
                              onChange={(e) => updateSection(chapterIndex, sectionIndex, "title", e.target.value)}
                              placeholder="e.g., Creation of Light"
                              className="h-8"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>Bible outline created successfully!</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} disabled={loading || !title} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Bible Outline"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
