"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Search, History } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"

interface BibleVersion {
  id: number
  title: string
  language: string
  description: string | null
  content: string
  created_at: string
}

interface VerseHistory {
  id: number
  bible_version_id: number
  book: string
  chapter: number
  verse: number
  content: string
  edited_at: string
}

interface ParsedVerse {
  lineNumber: number
  book: string
  chapter: number
  verse: number
  text: string
}

export default function BibleEditorPage() {
  const params = useParams()
  const router = useRouter()
  const bibleId = params.id as string

  const [bibleVersion, setBibleVersion] = useState<BibleVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  // Editor state
  const [lines, setLines] = useState<string[]>([])
  const [currentLineNumber, setCurrentLineNumber] = useState<number>(1)
  const [editedLine, setEditedLine] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Navigation state
  const [availableBooks, setAvailableBooks] = useState<string[]>([])
  const [selectedBook, setSelectedBook] = useState<string>("")
  const [availableChapters, setAvailableChapters] = useState<number[]>([])
  const [selectedChapter, setSelectedChapter] = useState<string>("")
  const [availableVerses, setAvailableVerses] = useState<number[]>([])
  const [selectedVerse, setSelectedVerse] = useState<string>("")

  // Verse history
  const [verseHistory, setVerseHistory] = useState<VerseHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Parsed Bible data
  const [parsedBible, setParsedBible] = useState<{
    [book: string]: {
      [chapter: number]: {
        [verse: number]: ParsedVerse
      }
    }
  }>({})

  const editorRef = useRef<HTMLTextAreaElement>(null)

  // Fetch Bible version data
  useEffect(() => {
    const fetchBibleVersion = async () => {
      try {
        const { data, error } = await supabase.from("bible_versions").select("*").eq("id", bibleId).single()

        if (error) throw error

        if (data) {
          setBibleVersion(data)
          const contentLines = data.content.split("\n")
          setLines(contentLines)

          // Set initial edited line
          if (contentLines.length > 0) {
            setEditedLine(contentLines[0])
          }

          // Parse Bible structure
          parseBibleContent(data.content)
        }
      } catch (err) {
        console.error("Error fetching Bible version:", err)
        setError("Failed to load Bible version")
      } finally {
        setLoading(false)
      }
    }

    fetchBibleVersion()
  }, [bibleId])

  // Parse Bible content to extract structure
  const parseBibleContent = (content: string) => {
    const lines = content.split("\n")
    const parsedData: {
      [book: string]: {
        [chapter: number]: {
          [verse: number]: ParsedVerse
        }
      }
    } = {}

    let currentBook = ""
    let currentChapter = 1
    let currentVerse = 1
    let lineNumber = 0

    const books = new Set<string>()

    lines.forEach((line, index) => {
      lineNumber = index + 1

      if (line.trim() === "") return

      // Check for chapter marker <CM>
      if (line.includes("<CM>")) {
        currentChapter++
        currentVerse = 1
      }

      // Try to extract book/chapter information from the line
      // This is a simplified approach - in a real app, you'd need more robust parsing
      const bookMatch = line.match(/^([1-3]?\s?[A-Za-z]+)\s+(\d+):(\d+)/)
      if (bookMatch) {
        currentBook = bookMatch[1]
        currentChapter = Number.parseInt(bookMatch[2], 10)
        currentVerse = Number.parseInt(bookMatch[3], 10)
        books.add(currentBook)
      } else {
        // If no explicit book/chapter/verse, increment verse number
        currentVerse++
      }

      // Initialize book if needed
      if (!parsedData[currentBook]) {
        parsedData[currentBook] = {}
      }

      // Initialize chapter if needed
      if (!parsedData[currentBook][currentChapter]) {
        parsedData[currentBook][currentChapter] = {}
      }

      // Store verse data
      parsedData[currentBook][currentChapter][currentVerse] = {
        lineNumber,
        book: currentBook,
        chapter: currentChapter,
        verse: currentVerse,
        text: line,
      }
    })

    setParsedBible(parsedData)
    setAvailableBooks(Array.from(books).sort())
  }

  // Update available chapters when book changes
  useEffect(() => {
    if (selectedBook && parsedBible[selectedBook]) {
      const chapters = Object.keys(parsedBible[selectedBook])
        .map(Number)
        .sort((a, b) => a - b)
      setAvailableChapters(chapters)
      setSelectedChapter("")
      setSelectedVerse("")
    } else {
      setAvailableChapters([])
    }
  }, [selectedBook, parsedBible])

  // Update available verses when chapter changes
  useEffect(() => {
    if (selectedBook && selectedChapter && parsedBible[selectedBook]?.[Number(selectedChapter)]) {
      const verses = Object.keys(parsedBible[selectedBook][Number(selectedChapter)])
        .map(Number)
        .sort((a, b) => a - b)
      setAvailableVerses(verses)
      setSelectedVerse("")
    } else {
      setAvailableVerses([])
    }
  }, [selectedBook, selectedChapter, parsedBible])

  // Navigate to verse when all selections are made
  useEffect(() => {
    if (selectedBook && selectedChapter && selectedVerse) {
      const verse = parsedBible[selectedBook]?.[Number(selectedChapter)]?.[Number(selectedVerse)]
      if (verse) {
        navigateToLine(verse.lineNumber)
        fetchVerseHistory(selectedBook, Number(selectedChapter), Number(selectedVerse))
      }
    }
  }, [selectedBook, selectedChapter, selectedVerse])

  // Fetch verse history
  const fetchVerseHistory = async (book: string, chapter: number, verse: number) => {
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from("verse_history")
        .select("*")
        .eq("bible_version_id", bibleId)
        .eq("book", book)
        .eq("chapter", chapter)
        .eq("verse", verse)
        .order("edited_at", { ascending: false })

      if (error) throw error

      setVerseHistory(data || [])
    } catch (err) {
      console.error("Error fetching verse history:", err)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Navigate to a specific line
  const navigateToLine = (lineNumber: number) => {
    if (lineNumber < 1 || lineNumber > lines.length) {
      setError(`Line number must be between 1 and ${lines.length}`)
      return
    }

    setCurrentLineNumber(lineNumber)
    setEditedLine(lines[lineNumber - 1])

    // Focus the editor
    if (editorRef.current) {
      editorRef.current.focus()
    }

    // Clear any previous errors
    setError(null)
  }

  // Handle line number input change
  const handleLineNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const lineNum = Number.parseInt(e.target.value, 10)
    if (!isNaN(lineNum)) {
      navigateToLine(lineNum)
    }
  }

  // Handle edited line change
  const handleEditedLineChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedLine(e.target.value)
  }

  // Save changes to the current line
  const saveChanges = async () => {
    if (!bibleVersion) return

    setSaving(true)

    try {
      // Create a copy of the lines array
      const updatedLines = [...lines]

      // Get the current line content before updating
      const oldContent = updatedLines[currentLineNumber - 1]

      // Update the line
      updatedLines[currentLineNumber - 1] = editedLine

      // Join the lines back into content
      const updatedContent = updatedLines.join("\n")

      // Update the Bible version in the database
      const { error } = await supabase.from("bible_versions").update({ content: updatedContent }).eq("id", bibleId)

      if (error) throw error

      // Update local state
      setLines(updatedLines)
      setBibleVersion({
        ...bibleVersion,
        content: updatedContent,
      })

      // Save to verse history if we can identify the verse
      // Find the verse information for the current line
      let verseInfo: ParsedVerse | null = null

      for (const book in parsedBible) {
        for (const chapter in parsedBible[book]) {
          for (const verse in parsedBible[book][Number(chapter)]) {
            if (parsedBible[book][Number(chapter)][Number(verse)].lineNumber === currentLineNumber) {
              verseInfo = parsedBible[book][Number(chapter)][Number(verse)]
              break
            }
          }
        }
      }

      if (verseInfo) {
        // Save the old content to verse history
        const { error: historyError } = await supabase.from("verse_history").insert([
          {
            bible_version_id: bibleId,
            book: verseInfo.book,
            chapter: verseInfo.chapter,
            verse: verseInfo.verse,
            content: oldContent,
            edited_at: new Date().toISOString(),
          },
        ])

        if (historyError) {
          console.error("Error saving verse history:", historyError)
        } else {
          // Refresh verse history
          fetchVerseHistory(verseInfo.book, verseInfo.chapter, verseInfo.verse)
        }
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Error saving changes:", err)
      setError("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  // Search for text in the Bible
  const searchBible = () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search query")
      return
    }

    const query = searchQuery.toLowerCase()

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(query)) {
        navigateToLine(i + 1)
        return
      }
    }

    setError(`No results found for "${searchQuery}"`)
  }

  // Restore a previous version of the verse
  const restoreVersion = (historyItem: VerseHistory) => {
    setEditedLine(historyItem.content)
  }

  // Get current verse information
  const getCurrentVerseInfo = (): { book: string; chapter: number; verse: number } | null => {
    for (const book in parsedBible) {
      for (const chapter in parsedBible[book]) {
        for (const verse in parsedBible[book][Number(chapter)]) {
          if (parsedBible[book][Number(chapter)][Number(verse)].lineNumber === currentLineNumber) {
            return {
              book,
              chapter: Number(chapter),
              verse: Number(verse),
            }
          }
        }
      }
    }
    return null
  }

  // Format the verse reference
  const formatVerseReference = (book: string, chapter: number, verse: number) => {
    return `${book} ${chapter}:${verse}`
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Bible Editor</h1>
          <Link href={`/admin/edit-bible/${bibleId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Bible Details
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  const currentVerseInfo = getCurrentVerseInfo()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bible Editor</h1>
        <Link href={`/admin/edit-bible/${bibleId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Bible Details
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4">
          <AlertDescription>Changes saved successfully!</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {bibleVersion?.title}
            {currentVerseInfo && (
              <span className="ml-2 text-sm text-muted-foreground">
                Editing {formatVerseReference(currentVerseInfo.book, currentVerseInfo.chapter, currentVerseInfo.verse)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="line" className="mb-6">
            <TabsList>
              <TabsTrigger value="line">Go to Line</TabsTrigger>
              <TabsTrigger value="reference">Go to Reference</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
            </TabsList>

            <TabsContent value="line" className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="line-number">Line Number</Label>
                  <Input
                    id="line-number"
                    type="number"
                    min={1}
                    max={lines.length}
                    value={currentLineNumber}
                    onChange={handleLineNumberChange}
                  />
                </div>
                <Button onClick={() => navigateToLine(currentLineNumber)}>Go to Line</Button>
              </div>
              <div className="text-sm text-muted-foreground">Total lines: {lines.length}</div>
            </TabsContent>

            <TabsContent value="reference" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="book-select">Book</Label>
                  <Select value={selectedBook} onValueChange={setSelectedBook}>
                    <SelectTrigger id="book-select">
                      <SelectValue placeholder="Select book" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBooks.map((book) => (
                        <SelectItem key={book} value={book}>
                          {book}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chapter-select">Chapter</Label>
                  <Select
                    value={selectedChapter}
                    onValueChange={setSelectedChapter}
                    disabled={!selectedBook || availableChapters.length === 0}
                  >
                    <SelectTrigger id="chapter-select">
                      <SelectValue placeholder="Select chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableChapters.map((chapter) => (
                        <SelectItem key={chapter} value={chapter.toString()}>
                          {chapter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verse-select">Verse</Label>
                  <Select
                    value={selectedVerse}
                    onValueChange={setSelectedVerse}
                    disabled={!selectedBook || !selectedChapter || availableVerses.length === 0}
                  >
                    <SelectTrigger id="verse-select">
                      <SelectValue placeholder="Select verse" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVerses.map((verse) => (
                        <SelectItem key={verse} value={verse.toString()}>
                          {verse}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="search-query">Search Text</Label>
                  <Input
                    id="search-query"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter text to search"
                  />
                </div>
                <Button onClick={searchBible}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Editor</h3>
                <Button onClick={saveChanges} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>

              <Textarea
                ref={editorRef}
                value={editedLine}
                onChange={handleEditedLineChange}
                className="min-h-[400px] font-mono"
              />

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  Line {currentLineNumber} of {lines.length}
                </span>
                {currentVerseInfo && (
                  <span>
                    {formatVerseReference(currentVerseInfo.book, currentVerseInfo.chapter, currentVerseInfo.verse)}
                  </span>
                )}
              </div>
            </div>

            {/* Preview and History */}
            <div className="space-y-6">
              {/* Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Preview</h3>
                <Card className="p-4 min-h-[200px]">
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: renderPreview(editedLine) }} />
                </Card>
              </div>

              {/* Version History */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <h3 className="text-lg font-medium">Version History</h3>
                  {loadingHistory && <span className="ml-2 text-sm text-muted-foreground">(Loading...)</span>}
                </div>

                {verseHistory.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {verseHistory.map((item) => (
                      <Card key={item.id} className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">{new Date(item.edited_at).toLocaleString()}</p>
                            <p className="text-sm truncate">{item.content}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => restoreVersion(item)}>
                            <History className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {loadingHistory ? "Loading history..." : "No edit history available for this verse"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to render preview with tags
function renderPreview(text: string): string {
  // Process tags for preview
  const processedText = text
    .replace(/<RF>(.*?)<Rf>/g, '<sup class="text-primary text-xs">[footnote]</sup>')
    .replace(/<FI>(.*?)<Fi>/g, "<strong>$1</strong>")
    .replace(/<i>(.*?)<\/i>/g, "<em>$1</em>")
    .replace(/<b>(.*?)<\/b>/g, "<strong>$1</strong>")
    .replace(/<CM>/g, '<hr class="my-2">')
    .replace(/<CI>(.*?)<Ci>/g, "<cite>$1</cite>")
    .replace(/<HEB>(.*?)<heb>/g, '<span dir="rtl" class="font-serif">$1</span>')
    .replace(/<br>/g, "<br/>")
    .replace(/<p>(.*?)<\/p>/g, "<p>$1</p>")

  return processedText
}
