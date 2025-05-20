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

interface Book {
  name: string
  chapters: Chapter[]
}

export default function UploadBibleOutlinePage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [books, setBooks] = useState<Book[]>([
    { name: "Genesis", chapters: [{ number: 1, name: "Chapter 1", sections: [] }] },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [jsonFile, setJsonFile] = useState<File | null>(null)

  const addBook = () => {
    setBooks([...books, { name: "New Book", chapters: [{ number: 1, name: "Chapter 1", sections: [] }] }])
  }

  const removeBook = (index: number) => {
    setBooks(books.filter((_, i) => i !== index))
  }

  const updateBook = (index: number, field: keyof Book, value: any) => {
    const updatedBooks = [...books]
    updatedBooks[index] = { ...updatedBooks[index], [field]: value }
    setBooks(updatedBooks)
  }

  const addChapter = (bookIndex: number) => {
    const updatedBooks = [...books]
    const book = updatedBooks[bookIndex]
    const nextNumber = book.chapters.length > 0 ? Math.max(...book.chapters.map((c) => c.number)) + 1 : 1

    updatedBooks[bookIndex] = {
      ...book,
      chapters: [...book.chapters, { number: nextNumber, name: `Chapter ${nextNumber}`, sections: [] }],
    }

    setBooks(updatedBooks)
  }

  const removeChapter = (bookIndex: number, chapterIndex: number) => {
    const updatedBooks = [...books]
    updatedBooks[bookIndex].chapters = updatedBooks[bookIndex].chapters.filter((_, i) => i !== chapterIndex)
    setBooks(updatedBooks)
  }

  const updateChapter = (bookIndex: number, chapterIndex: number, field: keyof Chapter, value: any) => {
    const updatedBooks = [...books]
    updatedBooks[bookIndex].chapters[chapterIndex] = {
      ...updatedBooks[bookIndex].chapters[chapterIndex],
      [field]: value,
    }
    setBooks(updatedBooks)
  }

  const addSection = (bookIndex: number, chapterIndex: number) => {
    const updatedBooks = [...books]
    const chapter = updatedBooks[bookIndex].chapters[chapterIndex]

    updatedBooks[bookIndex].chapters[chapterIndex] = {
      ...chapter,
      sections: [...chapter.sections, { startVerse: 1, endVerse: 10, title: "New Section" }],
    }

    setBooks(updatedBooks)
  }

  const removeSection = (bookIndex: number, chapterIndex: number, sectionIndex: number) => {
    const updatedBooks = [...books]
    updatedBooks[bookIndex].chapters[chapterIndex].sections = updatedBooks[bookIndex].chapters[
      chapterIndex
    ].sections.filter((_, i) => i !== sectionIndex)
    setBooks(updatedBooks)
  }

  const updateSection = (bookIndex: number, chapterIndex: number, sectionIndex: number, field: string, value: any) => {
    const updatedBooks = [...books]
    updatedBooks[bookIndex].chapters[chapterIndex].sections[sectionIndex] = {
      ...updatedBooks[bookIndex].chapters[chapterIndex].sections[sectionIndex],
      [field]: field === "startVerse" || field === "endVerse" ? Number.parseInt(value, 10) : value,
    }
    setBooks(updatedBooks)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setJsonFile(file)

      try {
        const content = await file.text()
        const data = JSON.parse(content)

        if (data.title) {
          setTitle(data.title)

          // Handle both old and new format
          if (Array.isArray(data.books)) {
            setBooks(data.books)
          } else if (Array.isArray(data.chapters)) {
            // Convert old format to new format
            setBooks([{ name: "Genesis", chapters: data.chapters }])
          } else {
            setError("Invalid JSON format. Please use the template format.")
          }
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
      // Convert the books structure to match the database schema
      // We'll store the book information in the chapter name
      const chapters = books.flatMap((book) =>
        book.chapters.map((chapter) => ({
          ...chapter,
          name: `${book.name} - ${chapter.name}`,
          book: book.name, // Add book name as metadata
        })),
      )

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
        router.push("/settings")
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
          <CardDescription>Create a new Bible outline with books, chapters and sections</CardDescription>
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
                <h3 className="text-lg font-medium">Books</h3>
                <Button type="button" variant="outline" size="sm" onClick={addBook}>
                  <Plus className="h-4 w-4 mr-1" /> Add Book
                </Button>
              </div>

              {books.map((book, bookIndex) => (
                <Card key={bookIndex} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">{book.name}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBook(bookIndex)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <Label htmlFor={`book-name-${bookIndex}`}>Book Name</Label>
                    <Input
                      id={`book-name-${bookIndex}`}
                      value={book.name}
                      onChange={(e) => updateBook(bookIndex, "name", e.target.value)}
                      placeholder="e.g., Genesis"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium">Chapters</h5>
                      <Button type="button" variant="outline" size="sm" onClick={() => addChapter(bookIndex)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Chapter
                      </Button>
                    </div>

                    {book.chapters.map((chapter, chapterIndex) => (
                      <Card key={chapterIndex} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h6 className="font-medium">Chapter {chapter.number}</h6>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeChapter(bookIndex, chapterIndex)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label htmlFor={`chapter-number-${bookIndex}-${chapterIndex}`}>Chapter Number</Label>
                            <Input
                              id={`chapter-number-${bookIndex}-${chapterIndex}`}
                              type="number"
                              value={chapter.number}
                              onChange={(e) =>
                                updateChapter(bookIndex, chapterIndex, "number", Number.parseInt(e.target.value, 10))
                              }
                              min="1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`chapter-name-${bookIndex}-${chapterIndex}`}>Chapter Name</Label>
                            <Input
                              id={`chapter-name-${bookIndex}-${chapterIndex}`}
                              value={chapter.name}
                              onChange={(e) => updateChapter(bookIndex, chapterIndex, "name", e.target.value)}
                              placeholder="e.g., Genesis 1"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium">Sections</h5>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addSection(bookIndex, chapterIndex)}
                            >
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
                                  onClick={() => removeSection(bookIndex, chapterIndex, sectionIndex)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <Label
                                    htmlFor={`section-start-${bookIndex}-${chapterIndex}-${sectionIndex}`}
                                    className="text-xs"
                                  >
                                    Start Verse
                                  </Label>
                                  <Input
                                    id={`section-start-${bookIndex}-${chapterIndex}-${sectionIndex}`}
                                    type="number"
                                    value={section.startVerse}
                                    onChange={(e) =>
                                      updateSection(bookIndex, chapterIndex, sectionIndex, "startVerse", e.target.value)
                                    }
                                    min="1"
                                    className="h-8"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label
                                    htmlFor={`section-end-${bookIndex}-${chapterIndex}-${sectionIndex}`}
                                    className="text-xs"
                                  >
                                    End Verse
                                  </Label>
                                  <Input
                                    id={`section-end-${bookIndex}-${chapterIndex}-${sectionIndex}`}
                                    type="number"
                                    value={section.endVerse}
                                    onChange={(e) =>
                                      updateSection(bookIndex, chapterIndex, sectionIndex, "endVerse", e.target.value)
                                    }
                                    min={section.startVerse}
                                    className="h-8"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label
                                    htmlFor={`section-title-${bookIndex}-${chapterIndex}-${sectionIndex}`}
                                    className="text-xs"
                                  >
                                    Section Title
                                  </Label>
                                  <Input
                                    id={`section-title-${bookIndex}-${chapterIndex}-${sectionIndex}`}
                                    value={section.title}
                                    onChange={(e) =>
                                      updateSection(bookIndex, chapterIndex, sectionIndex, "title", e.target.value)
                                    }
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
