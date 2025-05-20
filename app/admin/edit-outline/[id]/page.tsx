"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, Plus, Trash, Save, ExternalLink } from "lucide-react"
import Link from "next/link"

interface Chapter {
  number: number
  name: string
  book?: string
  startLine?: number
  endLine?: number
  sections?: {
    startLine: number
    title: string
  }[]
}

interface BibleOutline {
  id: number
  title: string
  description: string
  chapters: Chapter[]
  ignoreCMTag?: boolean
  categories?: string[]
  new_format_data?: string
  file_url?: string | null
}

export default function EditOutlinePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [outline, setOutline] = useState<BibleOutline | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("general")
  const [availableBooks, setAvailableBooks] = useState<string[]>([])
  const [selectedBook, setSelectedBook] = useState<string>("")
  const [categories, setCategories] = useState<string[]>([])
  const [description, setDescription] = useState<string>("")
  const [newCategory, setNewCategory] = useState<string>("")
  const [urlValidating, setUrlValidating] = useState(false)
  const [urlValid, setUrlValid] = useState(false)
  const [urlPreview, setUrlPreview] = useState<any>(null)

  useEffect(() => {
    const fetchOutline = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.from("bible_outlines").select("*").eq("id", params.id).single()

        if (error) throw error

        if (data) {
          // Ensure chapters have the correct structure
          const processedData = {
            ...data,
            chapters:
              data.chapters?.map((chapter: any) => ({
                ...chapter,
                // Convert old startVerse/endVerse to startLine/endLine if needed
                startLine: chapter.startLine || chapter.startVerse,
                endLine: chapter.endLine || chapter.endVerse,
                // Convert old sections format if needed
                sections: chapter.sections?.map((section: any) => ({
                  ...section,
                  startLine: section.startLine || section.startVerse,
                })),
              })) || [],
          }

          // Extract metadata from new_format_data if available
          let extractedCategories: string[] = []
          let extractedDescription = ""

          if (data.new_format_data) {
            try {
              const parsedData = JSON.parse(data.new_format_data)
              if (parsedData.categories && Array.isArray(parsedData.categories)) {
                extractedCategories = parsedData.categories
              }
              if (parsedData.description) {
                extractedDescription = parsedData.description
              }
            } catch (e) {
              console.error("Error parsing new_format_data:", e)
            }
          }

          processedData.categories = extractedCategories
          processedData.description = extractedDescription

          setOutline(processedData)
          setCategories(extractedCategories)
          setDescription(extractedDescription)

          // Set URL validity if file_url exists
          if (processedData.file_url) {
            setUrlValid(true)
          }

          // Extract unique book names
          const books = new Set<string>()
          processedData.chapters?.forEach((chapter: any) => {
            if (chapter.book) {
              books.add(chapter.book)
            } else if (chapter.name && chapter.name.includes(" - ")) {
              const bookName = chapter.name.split(" - ")[0]
              books.add(bookName)
            }
          })
          setAvailableBooks(Array.from(books))
          if (books.size > 0) {
            setSelectedBook(Array.from(books)[0])
          }
        }
      } catch (err) {
        console.error("Error fetching outline:", err)
        setError("Failed to load outline")
      } finally {
        setLoading(false)
      }
    }

    fetchOutline()
  }, [params.id])

  const handleSave = async () => {
    if (!outline) return

    setSaving(true)
    try {
      // Store description and categories in new_format_data
      const newFormatData = {
        description: description,
        categories: categories,
      }

      const { error } = await supabase
        .from("bible_outlines")
        .update({
          title: outline.title,
          chapters: outline.chapters,
          ignoreCMTag: outline.ignoreCMTag,
          new_format_data: JSON.stringify(newFormatData),
          file_url: outline.file_url,
        })
        .eq("id", outline.id)

      if (error) throw error

      // Navigate back to manage outlines
      router.push("/admin/manage-outlines")
    } catch (err) {
      console.error("Error saving outline:", err)
      setError("Failed to save outline: " + (err.message || "Unknown error"))
    } finally {
      setSaving(false)
    }
  }

  const handleAddChapter = () => {
    if (!outline) return

    const newChapter: Chapter = {
      number: outline.chapters.length + 1,
      name: `New Chapter ${outline.chapters.length + 1}`,
      book: selectedBook,
      startLine: 1,
      endLine: 100,
      sections: [],
    }

    setOutline({
      ...outline,
      chapters: [...outline.chapters, newChapter],
    })
  }

  const handleUpdateChapter = (index: number, field: keyof Chapter, value: any) => {
    if (!outline) return

    const updatedChapters = [...outline.chapters]
    updatedChapters[index] = {
      ...updatedChapters[index],
      [field]: value,
    }

    setOutline({
      ...outline,
      chapters: updatedChapters,
    })
  }

  const handleRemoveChapter = (index: number) => {
    if (!outline) return

    const updatedChapters = [...outline.chapters]
    updatedChapters.splice(index, 1)

    // Renumber chapters
    updatedChapters.forEach((chapter, idx) => {
      chapter.number = idx + 1
    })

    setOutline({
      ...outline,
      chapters: updatedChapters,
    })
  }

  const handleAddSection = (chapterIndex: number) => {
    if (!outline) return

    const updatedChapters = [...outline.chapters]
    const chapter = updatedChapters[chapterIndex]

    if (!chapter.sections) {
      chapter.sections = []
    }

    chapter.sections.push({
      startLine: 1,
      title: `New Section ${chapter.sections.length + 1}`,
    })

    setOutline({
      ...outline,
      chapters: updatedChapters,
    })
  }

  const handleUpdateSection = (chapterIndex: number, sectionIndex: number, field: string, value: any) => {
    if (!outline) return

    const updatedChapters = [...outline.chapters]
    const chapter = updatedChapters[chapterIndex]

    if (!chapter.sections) return

    chapter.sections[sectionIndex] = {
      ...chapter.sections[sectionIndex],
      [field]: value,
    }

    setOutline({
      ...outline,
      chapters: updatedChapters,
    })
  }

  const handleRemoveSection = (chapterIndex: number, sectionIndex: number) => {
    if (!outline) return

    const updatedChapters = [...outline.chapters]
    const chapter = updatedChapters[chapterIndex]

    if (!chapter.sections) return

    chapter.sections.splice(sectionIndex, 1)

    setOutline({
      ...outline,
      chapters: updatedChapters,
    })
  }

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()]
      setCategories(updatedCategories)

      if (outline) {
        setOutline({
          ...outline,
          categories: updatedCategories,
        })
      }

      setNewCategory("")
    }
  }

  const handleRemoveCategory = (category: string) => {
    const updatedCategories = categories.filter((c) => c !== category)
    setCategories(updatedCategories)

    if (outline) {
      setOutline({
        ...outline,
        categories: updatedCategories,
      })
    }
  }

  const validateUrl = async () => {
    if (!outline || !outline.file_url) {
      setError("Please enter a URL")
      return
    }

    setUrlValidating(true)
    setUrlValid(false)
    setUrlPreview(null)
    setError(null)

    try {
      // Check if URL ends with .json
      if (!outline.file_url.toLowerCase().endsWith(".json")) {
        throw new Error("URL must point to a JSON file (.json)")
      }

      // Fetch the content from the URL
      const response = await fetch(outline.file_url)

      if (!response.ok) {
        throw new Error(`Failed to fetch from URL: ${response.statusText}`)
      }

      const data = await response.json()

      // Validate the JSON structure
      if (!data || typeof data !== "object") {
        throw new Error("Invalid JSON format")
      }

      // Set preview data for the original structure
      setUrlPreview(data)

      // Check if this is the nested format (categories -> books -> chapters)
      const isNestedFormat = data.categories && Array.isArray(data.categories)

      let processedChapters: Chapter[] = []

      if (isNestedFormat) {
        console.log("Detected nested format with categories and books")

        // Extract chapters from the nested structure
        data.categories.forEach((category: any) => {
          if (category.books && Array.isArray(category.books)) {
            category.books.forEach((book: any) => {
              if (book.chapters && Array.isArray(book.chapters)) {
                // Convert chapters to the expected format
                const bookChapters = book.chapters.map((chapter: any) => {
                  // Convert sections if they exist
                  const sections =
                    chapter.sections && Array.isArray(chapter.sections)
                      ? chapter.sections.map((section: any) => ({
                          title: section.title || `Section at line ${section.start_line}`,
                          startLine: Number.parseInt(section.start_line, 10) || 1,
                        }))
                      : []

                  return {
                    number: chapter.chapter || 0,
                    name: `${book.name} ${chapter.chapter}`,
                    book: book.name,
                    startLine: Number.parseInt(chapter.start_line, 10) || 1,
                    endLine: Number.parseInt(chapter.end_line, 10) || 1000,
                    sections: sections,
                  }
                })

                processedChapters = [...processedChapters, ...bookChapters]
              }
            })
          }
        })

        // Validate that we extracted some chapters
        if (processedChapters.length === 0) {
          throw new Error("No valid chapters found in the nested structure")
        }
      } else {
        // Handle the original flat format
        // Validate required fields for outline usage
        if (!data.title) {
          throw new Error("Missing required field: title")
        }

        // Validate chapters array
        if (!data.chapters || !Array.isArray(data.chapters) || data.chapters.length === 0) {
          throw new Error("Missing or invalid chapters array")
        }

        // Validate chapter structure
        for (let i = 0; i < data.chapters.length; i++) {
          const chapter = data.chapters[i]
          if (!chapter.number && chapter.number !== 0) {
            throw new Error(`Chapter at index ${i} is missing required field: number`)
          }
          if (!chapter.name) {
            throw new Error(`Chapter at index ${i} is missing required field: name`)
          }

          // Validate sections if present
          if (chapter.sections) {
            if (!Array.isArray(chapter.sections)) {
              throw new Error(`Chapter ${chapter.number}: sections must be an array`)
            }

            for (let j = 0; j < chapter.sections.length; j++) {
              const section = chapter.sections[j]
              if (!section.title) {
                throw new Error(`Chapter ${chapter.number}, section at index ${j} is missing required field: title`)
              }
              if (section.startLine === undefined || section.startLine === null) {
                throw new Error(`Chapter ${chapter.number}, section at index ${j} is missing required field: startLine`)
              }
            }
          }
        }

        // Use the original chapters
        processedChapters = data.chapters.map((chapter: any) => ({
          number: chapter.number,
          name: chapter.name,
          book: chapter.book,
          startLine: chapter.startLine || 1,
          endLine: chapter.endLine,
          sections: chapter.sections || [],
        }))
      }

      setUrlValid(true)

      // Ask if user wants to update the outline with the processed chapters
      if (processedChapters.length > 0) {
        if (confirm(`Do you want to update the outline with ${processedChapters.length} chapters from the URL?`)) {
          // Update the outline with the processed chapters
          setOutline((prev) => ({
            ...prev!,
            chapters: processedChapters,
            title: data.title || prev!.title,
          }))

          // Extract unique book names
          const books = new Set<string>()
          processedChapters.forEach((chapter) => {
            if (chapter.book) {
              books.add(chapter.book)
            } else if (chapter.name && chapter.name.includes(" - ")) {
              const bookName = chapter.name.split(" - ")[0]
              books.add(bookName)
            }
          })

          setAvailableBooks(Array.from(books))
          if (books.size > 0) {
            setSelectedBook(Array.from(books)[0])
          }

          // Update categories if present in the data
          if (data.categories) {
            let extractedCategories: string[] = []

            if (isNestedFormat) {
              // Extract category names from the nested structure
              extractedCategories = data.categories.map((cat: any) => cat.name || cat.id).filter(Boolean)
            } else if (Array.isArray(data.categories)) {
              extractedCategories = data.categories
            }

            if (extractedCategories.length > 0) {
              setCategories(extractedCategories)
            }
          }

          // Update description if present
          if (data.description) {
            setDescription(data.description)
          }
        }
      }
    } catch (err) {
      console.error("Error validating URL:", err)
      setError(`URL validation failed: ${err.message || "Unknown error"}`)
      setUrlValid(false)
    } finally {
      setUrlValidating(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/20 p-4 rounded-md">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (!outline) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/20 p-4 rounded-md">
          <p className="text-destructive">Outline not found</p>
        </div>
      </div>
    )
  }

  // Filter chapters for the selected book
  const chaptersForSelectedBook = outline.chapters.filter(
    (chapter) => chapter.book === selectedBook || (chapter.name && chapter.name.startsWith(selectedBook + " - ")),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href="/admin/manage-outlines" className="mr-2">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Edit Bible Outline</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <div className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Outline
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="chapters">Chapters</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="url">URL Reference</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Basic information about the Bible outline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={outline.title}
                  onChange={(e) => setOutline({ ...outline, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    setOutline({ ...outline, description: e.target.value })
                  }}
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Description will be stored in the metadata and is not directly searchable.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ignoreCMTag"
                  checked={outline.ignoreCMTag}
                  onCheckedChange={(checked) => setOutline({ ...outline, ignoreCMTag: !!checked })}
                />
                <Label htmlFor="ignoreCMTag">Ignore Chapter Markers (CM tags) in content</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chapters">
          <Card>
            <CardHeader>
              <CardTitle>Chapters</CardTitle>
              <CardDescription>Manage chapters and sections in the outline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="book-select">Select Book</Label>
                <div className="flex gap-2 mt-1">
                  <select
                    id="book-select"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedBook}
                    onChange={(e) => setSelectedBook(e.target.value)}
                  >
                    {availableBooks.map((book) => (
                      <option key={book} value={book}>
                        {book}
                      </option>
                    ))}
                  </select>
                  <Button onClick={handleAddChapter}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Chapter
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {chaptersForSelectedBook.map((chapter, chapterIndex) => {
                  const originalIndex = outline.chapters.findIndex((c) => c === chapter)
                  return (
                    <Card key={`chapter-${chapterIndex}`} className="border border-border">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Chapter {chapter.number}</CardTitle>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveChapter(originalIndex)}>
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-0">
                        <div className="space-y-2">
                          <Label htmlFor={`chapter-${chapterIndex}-name`}>Name</Label>
                          <Input
                            id={`chapter-${chapterIndex}-name`}
                            value={chapter.name}
                            onChange={(e) => handleUpdateChapter(originalIndex, "name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`chapter-${chapterIndex}-book`}>Book</Label>
                          <Input
                            id={`chapter-${chapterIndex}-book`}
                            value={chapter.book || ""}
                            onChange={(e) => handleUpdateChapter(originalIndex, "book", e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`chapter-${chapterIndex}-startLine`}>Start Line</Label>
                            <Input
                              id={`chapter-${chapterIndex}-startLine`}
                              type="number"
                              value={chapter.startLine || ""}
                              onChange={(e) =>
                                handleUpdateChapter(originalIndex, "startLine", Number.parseInt(e.target.value))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`chapter-${chapterIndex}-endLine`}>End Line</Label>
                            <Input
                              id={`chapter-${chapterIndex}-endLine`}
                              type="number"
                              value={chapter.endLine || ""}
                              onChange={(e) =>
                                handleUpdateChapter(originalIndex, "endLine", Number.parseInt(e.target.value))
                              }
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">Sections</h4>
                            <Button variant="outline" size="sm" onClick={() => handleAddSection(originalIndex)}>
                              <Plus className="h-3 w-3 mr-1" />
                              Add Section
                            </Button>
                          </div>

                          <div className="space-y-4">
                            {chapter.sections?.map((section, sectionIndex) => (
                              <div
                                key={`section-${chapterIndex}-${sectionIndex}`}
                                className="border rounded-md p-3 space-y-2"
                              >
                                <div className="flex justify-between items-center">
                                  <h5 className="text-sm font-medium">Section {sectionIndex + 1}</h5>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveSection(originalIndex, sectionIndex)}
                                  >
                                    <Trash className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`section-${chapterIndex}-${sectionIndex}-title`}>Title</Label>
                                  <Input
                                    id={`section-${chapterIndex}-${sectionIndex}-title`}
                                    value={section.title}
                                    onChange={(e) =>
                                      handleUpdateSection(originalIndex, sectionIndex, "title", e.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`section-${chapterIndex}-${sectionIndex}-startLine`}>
                                    Start Line
                                  </Label>
                                  <Input
                                    id={`section-${chapterIndex}-${sectionIndex}-startLine`}
                                    type="number"
                                    value={section.startLine}
                                    onChange={(e) =>
                                      handleUpdateSection(
                                        originalIndex,
                                        sectionIndex,
                                        "startLine",
                                        Number.parseInt(e.target.value),
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Manage categories for this outline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="New category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddCategory()
                      }
                    }}
                  />
                  <Button onClick={handleAddCategory}>Add</Button>
                </div>

                <div className="space-y-2">
                  {categories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                      <span>{category}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveCategory(category)}>
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="url">
          <Card>
            <CardHeader>
              <CardTitle>URL Reference</CardTitle>
              <CardDescription>Link to an external JSON file containing the outline structure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-url">JSON File URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="file-url"
                    type="url"
                    placeholder="https://example.com/bible-outline.json"
                    value={outline.file_url || ""}
                    onChange={(e) => setOutline({ ...outline, file_url: e.target.value })}
                    className={urlValid ? "border-green-500" : ""}
                  />
                  <Button onClick={validateUrl} disabled={urlValidating || !outline.file_url} variant="secondary">
                    {urlValidating ? (
                      <>
                        <div className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        Validating...
                      </>
                    ) : (
                      "Validate URL & Data"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter a URL to a JSON file containing the outline structure. The file will be fetched when needed.
                </p>

                {urlValid && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center text-green-700 mb-2">
                      <div className="h-4 w-4 rounded-full bg-green-500 mr-2"></div>
                      <span className="font-medium">URL and data structure validated successfully</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Supports both flat and nested (categories → books → chapters) formats
                    </p>
                    {urlPreview && (
                      <div className="text-sm">
                        <p>
                          <strong>Title:</strong> {urlPreview.title || "Not specified"}
                        </p>
                        {urlPreview.chapters && (
                          <p>
                            <strong>Chapters:</strong> {urlPreview.chapters.length}
                          </p>
                        )}
                        <Button
                          variant="link"
                          className="p-0 h-auto text-green-700"
                          onClick={() => window.open(outline.file_url || "", "_blank")}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View JSON file
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-destructive/20 rounded-md">
                    <p className="text-destructive">{error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
