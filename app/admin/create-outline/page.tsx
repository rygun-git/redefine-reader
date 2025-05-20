"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, Plus, Trash, Save, LinkIcon, FileText, ExternalLink } from "lucide-react"
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
  title: string
  description: string
  chapters: Chapter[]
  ignoreCMTag?: boolean
  categories?: string[]
  new_format_data?: any
  file_url?: string | null
}

export default function CreateOutlinePage() {
  const router = useRouter()
  const [outline, setOutline] = useState<BibleOutline>({
    title: "",
    description: "",
    chapters: [],
    ignoreCMTag: true,
    categories: [],
    file_url: null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("general")
  const [selectedBook, setSelectedBook] = useState<string>("")
  const [newCategory, setNewCategory] = useState<string>("")
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [inputMethod, setInputMethod] = useState<"file" | "url">("file")
  const [urlValidating, setUrlValidating] = useState(false)
  const [urlValid, setUrlValid] = useState(false)
  const [urlPreview, setUrlPreview] = useState<any>(null)

  const handleSave = async () => {
    if (!outline.title) {
      setError("Title is required")
      return
    }

    // If using URL method, validate URL first
    if (inputMethod === "url" && outline.file_url) {
      if (!urlValid) {
        setError("Please validate the URL first")
        return
      }
    } else if (inputMethod === "file" && outline.chapters.length === 0 && !jsonFile) {
      setError("Please upload a JSON file or add chapters manually")
      return
    }

    setSaving(true)
    try {
      // Store description and categories in new_format_data
      const newFormatData = {
        description: outline.description,
        categories: outline.categories || [],
      }

      // Create the outline object with only the fields that exist in the database
      const outlineToSave = {
        title: outline.title,
        chapters: outline.chapters,
        ignoreCMTag: outline.ignoreCMTag,
        new_format_data: JSON.stringify(newFormatData),
        file_url: outline.file_url,
      }

      const { data, error } = await supabase.from("bible_outlines").insert([outlineToSave]).select()

      if (error) throw error

      // Navigate to edit page for the new outline
      if (data && data.length > 0) {
        router.push(`/admin/edit-outline/${data[0].id}`)
      } else {
        router.push("/admin/manage-outlines")
      }
    } catch (err) {
      console.error("Error creating outline:", err)
      setError("Failed to create outline: " + (err.message || "Unknown error"))
    } finally {
      setSaving(false)
    }
  }

  const handleAddChapter = () => {
    if (!selectedBook) {
      setError("Please enter a book name first")
      return
    }

    const newChapter: Chapter = {
      number: outline.chapters.length + 1,
      name: `${selectedBook} - Chapter ${outline.chapters.length + 1}`,
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
    if (newCategory.trim() && !outline.categories?.includes(newCategory.trim())) {
      setOutline({
        ...outline,
        categories: [...(outline.categories || []), newCategory.trim()],
      })
      setNewCategory("")
    }
  }

  const handleRemoveCategory = (category: string) => {
    setOutline({
      ...outline,
      categories: outline.categories?.filter((c) => c !== category) || [],
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setJsonFile(file)

      try {
        const content = await file.text()
        const data = JSON.parse(content)

        if (data.title) {
          // First, set the basic outline data
          setOutline({
            ...outline,
            title: data.title,
            description: data.description || "",
            categories: data.categories || [],
          })

          let processedChapters: Chapter[] = []
          let firstBookName: string | null = null

          // If the uploaded file has chapters, use them directly
          if (data.chapters && Array.isArray(data.chapters)) {
            processedChapters = data.chapters.map((chapter: any) => ({
              number: chapter.number,
              name: chapter.name,
              book: chapter.book,
              startLine: chapter.startLine || 1,
              endLine: chapter.endLine, // Use the endLine from the file
              sections: chapter.sections || [],
            }))

            // Get the first book name if available
            if (processedChapters.length > 0 && processedChapters[0].book) {
              firstBookName = processedChapters[0].book
            }
          }
          // If there are books in the new format, convert them to chapters
          else if (data.categories && Array.isArray(data.categories)) {
            data.categories.forEach((category: any) => {
              if (category.books && Array.isArray(category.books)) {
                category.books.forEach((book: any) => {
                  // Set the first book name if not already set
                  if (firstBookName === null) {
                    firstBookName = book.name
                  }

                  if (book.chapters && Array.isArray(book.chapters)) {
                    book.chapters.forEach((chapter: any) => {
                      // Calculate the end line based on the last section's end_line
                      const lastSection =
                        chapter.sections && chapter.sections.length > 0
                          ? chapter.sections[chapter.sections.length - 1]
                          : null

                      const endLine = lastSection?.end_line || chapter.end_line

                      processedChapters.push({
                        number: chapter.chapter,
                        name: `${book.name} - Chapter ${chapter.chapter}`,
                        book: book.name,
                        startLine: chapter.sections?.[0]?.start_line || chapter.start_line || 1,
                        endLine: endLine, // Use the calculated end line
                        sections:
                          chapter.sections?.map((section: any) => ({
                            title: section.title,
                            startLine: section.start_line,
                          })) || [],
                      })
                    })
                  }
                })
              }
            })
          }

          // Update the outline with the processed chapters
          if (processedChapters.length > 0) {
            setOutline((prev) => ({
              ...prev,
              chapters: processedChapters,
            }))
          }

          // Set the selected book if we found one
          if (firstBookName) {
            setSelectedBook(firstBookName)
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

  const validateUrl = async () => {
    if (!outline.file_url) {
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

      // Set preview data
      setUrlPreview(data)
      setUrlValid(true)

      // If the JSON has a title, update the outline title
      if (data.title && !outline.title) {
        setOutline((prev) => ({
          ...prev,
          title: data.title,
          description: data.description || prev.description,
        }))
      }

      // Process chapters if available
      if (data.chapters && Array.isArray(data.chapters) && data.chapters.length > 0) {
        // Process chapters similar to file upload
        const processedChapters: Chapter[] = data.chapters.map((chapter: any) => ({
          number: chapter.number,
          name: chapter.name,
          book: chapter.book,
          startLine: chapter.startLine || 1,
          endLine: chapter.endLine,
          sections: chapter.sections || [],
        }))

        // Update the outline with the processed chapters
        setOutline((prev) => ({
          ...prev,
          chapters: processedChapters,
        }))

        // Set the selected book if available
        if (processedChapters.length > 0 && processedChapters[0].book) {
          setSelectedBook(processedChapters[0].book)
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
          <h1 className="text-2xl font-bold">Create Bible Outline</h1>
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

      {error && (
        <div className="bg-destructive/20 p-4 rounded-md mb-4">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Import Outline</CardTitle>
          <CardDescription>Upload a JSON outline file or provide a URL</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as "file" | "url")}>
            <TabsList className="mb-4">
              <TabsTrigger value="file" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center">
                <LinkIcon className="h-4 w-4 mr-2" />
                URL Reference
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="json-file">JSON Outline File</Label>
                  <Input id="json-file" type="file" accept=".json" onChange={handleFileChange} />
                  <p className="text-sm text-muted-foreground">Upload a JSON file with the outline structure</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="url">
              <div className="space-y-4">
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
                        "Validate URL"
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter a URL to a JSON file containing the outline structure
                  </p>

                  {urlValid && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center text-green-700 mb-2">
                        <div className="h-4 w-4 rounded-full bg-green-500 mr-2"></div>
                        <span className="font-medium">URL validated successfully</span>
                      </div>
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
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="chapters">Chapters</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
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
                  value={outline.description}
                  onChange={(e) => setOutline({ ...outline, description: e.target.value })}
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
                <Label htmlFor="book-name">Book Name</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="book-name"
                    placeholder="e.g. Genesis"
                    value={selectedBook}
                    onChange={(e) => setSelectedBook(e.target.value)}
                  />
                  <Button onClick={handleAddChapter} disabled={!selectedBook}>
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
                  {outline.categories?.map((category, index) => (
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
      </Tabs>
    </div>
  )
}
