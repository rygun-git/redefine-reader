"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, AlertTriangle, BookmarkPlus, BookOpen, Moon, Sun } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSearchParams, useRouter } from "next/navigation"
import { BookmarkDialog } from "@/components/bookmark-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { type TagStyle, loadTagStyles } from "@/lib/loadTagStyles"

// Function to fetch Bible content from URL, limited to book's line range
const fetchBibleContentFromUrl = async (url: string, bookName: string | undefined, outline: any): Promise<string> => {
  try {
    if (!url || typeof url !== "string") {
      throw new Error(`Invalid URL provided for Bible content: ${url || "undefined"}`)
    }

    // Handle local file URLs
    if (url.startsWith("/")) {
      console.log("Fetching local Bible content:", url)
      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch local Bible content: ${response.status} ${response.statusText}`)
        }
        const text = await response.text()
        if (!text.trim()) {
          throw new Error("Empty content received from local URL")
        }
        console.log("Local Bible content fetched:", { length: text.length })
        return text
      } catch (localError) {
        console.error("Error fetching local Bible content:", localError)
        throw localError
      }
    }

    if (!bookName || !outline || !outline.chapters || !Array.isArray(outline.chapters)) {
      console.warn("Missing bookName or valid outline, fetching full content", { bookName, hasOutline: !!outline })
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/plain, text/html",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch Bible content: ${response.status} ${response.statusText}`)
      }

      const text = await response.text()
      if (!text.trim()) {
        throw new Error("Empty content received from URL")
      }

      console.log("Bible content fetched (full):", { length: text.length })
      return text
    }

    console.log("Attempting to fetch Bible content for book:", { url, bookName })

    const lineRanges = outline.chapters
      .filter((chapter: any) => chapter.startLine && chapter.endLine)
      .map((chapter: any) => ({
        start: Number(chapter.startLine),
        end: Number(chapter.endLine),
      }))

    if (lineRanges.length === 0) {
      throw new Error(`No valid line ranges found for book: ${bookName}`)
    }

    const minLine = Math.min(...lineRanges.map((range: any) => range.start))
    const maxLine = Math.max(...lineRanges.map((range: any) => range.end))

    if (minLine < 1 || maxLine < minLine) {
      throw new Error(`Invalid line range for book ${bookName}: ${minLine}-${maxLine}`)
    }

    console.log("Calculated line range:", { bookName, minLine, maxLine })

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/plain, text/html",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Bible content: ${response.status} ${response.statusText}`)
    }

    const fullText = await response.text()
    if (!fullText.trim()) {
      throw new Error("Empty content received from URL")
    }

    const lines = fullText.split("\n")
    if (minLine > lines.length) {
      throw new Error(`Start line ${minLine} exceeds content length ${lines.length} for book ${bookName}`)
    }

    const slicedLines = lines.slice(minLine - 1, maxLine)
    const slicedContent = slicedLines.join("\n")

    console.log("Bible content sliced successfully:", {
      bookName,
      lineRange: `${minLine}-${maxLine}`,
      totalLines: lines.length,
      slicedLines: slicedLines.length,
      contentLength: slicedContent.length,
    })

    return slicedContent
  } catch (error) {
    console.error("Error fetching Bible content from URL:", error, { url, bookName })
    throw error instanceof Error ? error : new Error("Unknown error fetching Bible content")
  }
}

// Function to fetch Bible outline from URL, filtering by book
const fetchBibleOutlineFromUrl = async (url: string, bookName: string | undefined): Promise<any> => {
  try {
    if (!url || typeof url !== "string") {
      throw new Error(`Invalid URL provided for Bible outline: ${url || "undefined"}`)
    }

    // Handle local file URLs
    if (url.startsWith("/")) {
      console.log("Fetching local Bible outline:", url)
      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch local Bible outline: ${response.status} ${response.statusText}`)
        }
        const data = await response.json()
        console.log("Local Bible outline fetched:", { title: data.title })

        // Process the outline data
        const transformedOutline = {
          id: data.id || 0,
          title: data.title || "Untitled Outline",
          ignoreCMTag: data.ignoreCMTag || false,
          chapters: [],
        }

        if (!bookName) {
          console.warn("No bookName provided, returning empty chapters")
          return transformedOutline
        }

        if (data.categories && Array.isArray(data.categories)) {
          data.categories.forEach((category: any) => {
            if (category.books && Array.isArray(category.books)) {
              category.books.forEach((book: any) => {
                if (
                  book.name?.toLowerCase() === bookName.toLowerCase() ||
                  book.book_id?.toLowerCase() === bookName.toLowerCase()
                ) {
                  if (book.chapters && Array.isArray(book.chapters)) {
                    const bookChapters = book.chapters.map((chapter: any) => ({
                      number: chapter.chapter || 0,
                      name: `${book.name || book.book_id || "Unknown"} - Chapter ${chapter.chapter || "Unknown"}`,
                      book: book.name || book.book_id || "Unknown",
                      startLine: Number(chapter.start_line) || 0,
                      endLine: Number(chapter.end_line) || 0,
                      sections: chapter.sections
                        ? chapter.sections.map((section: any) => ({
                            startLine: Number(section.start_line) || 0,
                            title: section.title || "Untitled Section",
                          }))
                        : [],
                    }))
                    transformedOutline.chapters.push(...bookChapters)
                  }
                }
              })
            }
          })
        } else if (data.chapters && Array.isArray(data.chapters)) {
          transformedOutline.chapters = data.chapters
            .filter(
              (chapter: any) =>
                chapter.book?.toLowerCase() === bookName.toLowerCase() ||
                chapter.name?.toLowerCase().startsWith(bookName.toLowerCase() + " - "),
            )
            .map((chapter: any) => ({
              number: chapter.number || chapter.chapter || 0,
              name: chapter.name || `Chapter ${chapter.number || chapter.chapter || "Unknown"}`,
              book: chapter.book || "Unknown",
              startLine: Number(chapter.startLine || chapter.start_line) || 0,
              endLine: Number(chapter.endLine || chapter.end_line) || 0,
              sections: chapter.sections
                ? chapter.sections.map((section: any) => ({
                    startLine: Number(section.startLine || section.start_line) || 0,
                    title: section.title || "Untitled Section",
                  }))
                : [],
            }))
        }

        if (transformedOutline.chapters.length === 0) {
          console.warn("No chapters found for book:", bookName)
          throw new Error(`No chapters found for book: ${bookName}`)
        }

        return transformedOutline
      } catch (localError) {
        console.error("Error fetching local Bible outline:", localError)
        throw localError
      }
    }

    console.log("Attempting to fetch Bible outline from:", url, { bookName })
    let response
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        // If the URL has www, try without it
        if (url.includes("www.")) {
          console.log("Trying alternative URL without www...")
          const altUrl = url.replace("www.", "")
          response = await fetch(altUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          })
        }

        // If still not ok, try with http instead of https
        if (!response.ok && url.startsWith("https://")) {
          console.log("Trying alternative URL with http...")
          const altUrl = url.replace("https://", "http://")
          response = await fetch(altUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          })
        }

        // If still not ok, throw error
        if (!response.ok) {
          throw new Error(`Failed to fetch Bible outline: ${response.status} ${response.statusText}`)
        }
      }
    } catch (fetchError) {
      console.error("Fetch error:", fetchError)
      throw new Error(`Failed to fetch Bible outline: ${fetchError.message}`)
    }

    let data
    try {
      data = await response.json()
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError)
      throw new Error("Invalid JSON format: Unable to parse response")
    }

    if (!data) {
      throw new Error("Invalid outline format: Empty response")
    }

    console.log("Raw outline data:", {
      title: data.title,
      hasCategories: !!data.categories,
      categoryCount: data.categories?.length,
    })

    const transformedOutline = {
      id: data.id || 0,
      title: data.title || "Untitled Outline",
      ignoreCMTag: data.ignoreCMTag || false,
      chapters: [],
    }

    if (!bookName) {
      console.warn("No bookName provided, returning empty chapters")
      return transformedOutline
    }

    if (data.categories && Array.isArray(data.categories)) {
      data.categories.forEach((category: any) => {
        if (category.books && Array.isArray(category.books)) {
          category.books.forEach((book: any) => {
            if (
              book.name?.toLowerCase() === bookName.toLowerCase() ||
              book.book_id?.toLowerCase() === bookName.toLowerCase()
            ) {
              if (book.chapters && Array.isArray(book.chapters)) {
                const bookChapters = book.chapters.map((chapter: any) => ({
                  number: chapter.chapter || 0,
                  name: `${book.name || book.book_id || "Unknown"} - Chapter ${chapter.chapter || "Unknown"}`,
                  book: book.name || book.book_id || "Unknown",
                  startLine: Number(chapter.start_line) || 0,
                  endLine: Number(chapter.end_line) || 0,
                  sections: chapter.sections
                    ? chapter.sections.map((section: any) => ({
                        startLine: Number(section.start_line) || 0,
                        title: section.title || "Untitled Section",
                      }))
                    : [],
                }))
                transformedOutline.chapters.push(...bookChapters)
              }
            }
          })
        }
      })
    } else if (data.chapters && Array.isArray(data.chapters)) {
      transformedOutline.chapters = data.chapters
        .filter(
          (chapter: any) =>
            chapter.book?.toLowerCase() === bookName.toLowerCase() ||
            chapter.name?.toLowerCase().startsWith(bookName.toLowerCase() + " - "),
        )
        .map((chapter: any) => ({
          number: chapter.number || chapter.chapter || 0,
          name: chapter.name || `Chapter ${chapter.number || chapter.chapter || "Unknown"}`,
          book: chapter.book || "Unknown",
          startLine: Number(chapter.startLine || chapter.start_line) || 0,
          endLine: Number(chapter.endLine || chapter.end_line) || 0,
          sections: chapter.sections
            ? chapter.sections.map((section: any) => ({
                startLine: Number(section.startLine || section.start_line) || 0,
                title: section.title || "Untitled Section",
              }))
            : [],
        }))
    } else {
      throw new Error("Invalid outline format: No chapters or categories found")
    }

    if (transformedOutline.chapters.length === 0) {
      console.warn("No chapters found for book:", bookName)
      throw new Error(`No chapters found for book: ${bookName}`)
    }

    console.log("Transformed outline:", {
      title: transformedOutline.title,
      chapterCount: transformedOutline.chapters.length,
      firstChapter: transformedOutline.chapters[0],
    })

    return transformedOutline
  } catch (error) {
    console.error("Error fetching Bible outline from URL:", error, { url, bookName })
    throw error instanceof Error ? error : new Error("Unknown error fetching Bible outline")
  }
}

// Constants for pagination and safety limits
const CHAPTERS_PER_PAGE = 100
const MAX_VERSES_PER_CHAPTER = 200

interface BibleReaderProps {
  content?: string
  chapter?: number
  book?: string
  versionUrl?: string
  outlineUrl?: string
  outlineId?: number | string | null
  bibleOutline?: {
    id: number
    title: string
    chapters: {
      number: number
      name: string
      book?: string
      startLine?: number
      endLine?: number
      sections?: {
        startLine: number
        title: string
      }[]
    }[]
    ignoreCMTag?: boolean
  }
  displaySettings?: {
    fontSize: number
    fontFamily: string
    fontWeight: number
    showFootnotes: boolean
    showFootnoteSection: boolean
    darkMode: boolean
    showLineNumbers: boolean
    showDebugInfo: boolean
    underscoredPhraseStyle: "keep" | "remove" | "bold"
    sectionTitleColor: string
    defaultVersionId?: string
    defaultOutlineId?: string
  }
  preloadedOutlines?: any
}

interface ParsedVerse {
  verseNumber: number
  lineNumber: number
  text: string
  tags: {
    type: string
    content: string
    position: [number, number]
  }[]
  sectionTitle?: string
  footnotes?: {
    id: string
    content: string
  }[]
}

interface Section {
  title: string
  startLine: number
  endLine?: number
  verses: ParsedVerse[]
}

interface Chapter {
  chapterNumber: number
  name: string
  verses: ParsedVerse[]
  sections?: Section[]
}

interface DisplaySettings {
  fontSize: number
  lineHeight: number
  fontWeight: number
  showVerseNumbers: boolean
  showLineNumbers: boolean
  showDebugInfo: boolean
  underscoredPhraseStyle: "keep" | "remove" | "bold"
  fontFamily?: string
  showFootnotes?: boolean
  showFootnoteSection?: boolean
  darkMode?: boolean
  sectionTitleColor?: string
  paragraphSpacing?: number
  defaultVersionId?: string
  defaultOutlineId?: string
}

interface Footnote {
  id: string
  verseNumber: number
  content: string
  number: number
}

export function BibleReader({
  content: initialContent,
  versionUrl: propVersionUrl,
  outlineUrl: propOutlineUrl,
  outlineId,
  bibleOutline,
  displaySettings: propDisplaySettings,
  preloadedOutlines,
  book: propBook,
  chapter: propChapter,
}: BibleReaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlParams = useMemo(() => {
    const book = searchParams.get("book") || propBook || undefined
    const chapter = searchParams.get("chapter") ? Number(searchParams.get("chapter")) : propChapter || 1
    const versionUrl = searchParams.get("versionUrl") || propVersionUrl || undefined
    const outlineUrl = searchParams.get("outlineUrl") || propOutlineUrl || undefined

    const isValidChapter = !isNaN(chapter) && chapter > 0
    const isValidVersionUrl = versionUrl ? typeof versionUrl === "string" && versionUrl.startsWith("http") : false
    const isValidOutlineUrl = outlineUrl ? typeof outlineUrl === "string" && outlineUrl.startsWith("http") : false

    console.log("URL Parameters:", {
      book,
      chapter,
      versionUrl,
      outlineUrl,
      isValidChapter,
      isValidVersionUrl,
      isValidOutlineUrl,
    })

    if (!isValidChapter) {
      console.warn("Invalid chapter parameter:", searchParams.get("chapter"))
    }
    if (versionUrl && !isValidVersionUrl) {
      console.warn("Invalid versionUrl:", versionUrl)
    }
    if (outlineUrl && !isValidOutlineUrl) {
      console.warn("Invalid outlineUrl:", outlineUrl)
    }

    return {
      book,
      chapter: isValidChapter ? chapter : 1,
      versionUrl,
      outlineUrl,
    }
  }, [searchParams, propVersionUrl, propOutlineUrl, propBook, propChapter])

  const [content, setContent] = useState<string>(initialContent || "")
  const [outline, setOutline] = useState<any>(bibleOutline || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentChapter, setCurrentChapter] = useState(urlParams.chapter)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    fontSize: 22,
    lineHeight: 1.5,
    fontWeight: 400,
    showVerseNumbers: true,
    showLineNumbers: false,
    showDebugInfo: false,
    underscoredPhraseStyle: "keep",
    sectionTitleColor: "#3b82f6",
    paragraphSpacing: 16,
    showFootnotes: true,
    showFootnoteSection: true,
    darkMode: false,
  })
  const contentRef = useRef<HTMLDivElement>(null)
  const [fontFamily, setFontFamily] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [tagStyles, setTagStyles] = useState<TagStyle[]>([])
  const [showFootnotes, setShowFootnotes] = useState(true)
  const [contentWarning, setContentWarning] = useState<string | null>(null)
  const [footnotes, setFootnotes] = useState<Footnote[]>([])
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false)
  const [showFootnotesDialog, setShowFootnotesDialog] = useState(false)
  const [currentFootnote, setCurrentFootnote] = useState<Footnote | null>(null)
  const [currentPage, setCurrentPage] = useState(0)

  // Track processing state
  const contentProcessed = useRef(false)
  const savedContent = useRef<{ book: string | undefined; content: string }>({ book: undefined, content: "" })
  const isProcessing = useRef(false)
  const lastProcessedBook = useRef<string | undefined>(undefined)

  // Load display settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("bibleReaderDisplaySettings")
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        setDisplaySettings((prev) => ({
          ...prev,
          ...parsedSettings,
          fontWeight: parsedSettings.fontWeight || 400,
          showDebugInfo: parsedSettings.showDebugInfo || false,
          sectionTitleColor: parsedSettings.sectionTitleColor || "#3b82f6",
          paragraphSpacing: parsedSettings.paragraphSpacing || 16,
          showFootnotes: parsedSettings.showFootnotes !== undefined ? parsedSettings.showFootnotes : true,
          showFootnoteSection:
            parsedSettings.showFootnoteSection !== undefined ? parsedSettings.showFootnoteSection : true,
          darkMode: parsedSettings.darkMode !== undefined ? parsedSettings.darkMode : false,
        }))
        setShowFootnotes(parsedSettings.showFootnotes !== undefined ? parsedSettings.showFootnotes : true)

        // Apply theme from localStorage
        const theme = parsedSettings.darkMode ? "dark" : "light"
        document.documentElement.classList.toggle("dark", parsedSettings.darkMode)
      } catch (e) {
        console.error("Error parsing saved display settings:", e)
      }
    }
  }, [])

  // Save display settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("bibleReaderDisplaySettings", JSON.stringify(displaySettings))
    } catch (error) {
      console.error("Error saving display settings to localStorage:", error)
    }
  }, [displaySettings])

  // Apply prop display settings
  useEffect(() => {
    if (propDisplaySettings) {
      setDisplaySettings((prevSettings) => ({
        ...prevSettings,
        fontSize: propDisplaySettings.fontSize !== undefined ? propDisplaySettings.fontSize : prevSettings.fontSize,
        fontFamily:
          propDisplaySettings.fontFamily !== undefined ? propDisplaySettings.fontFamily : prevSettings.fontFamily,
        fontWeight:
          propDisplaySettings.fontWeight !== undefined ? propDisplaySettings.fontWeight : prevSettings.fontWeight,
        showVerseNumbers: true,
        showLineNumbers:
          propDisplaySettings.showLineNumbers !== undefined
            ? propDisplaySettings.showLineNumbers
            : prevSettings.showLineNumbers,
        showDebugInfo:
          propDisplaySettings.showDebugInfo !== undefined
            ? propDisplaySettings.showDebugInfo
            : prevSettings.showDebugInfo,
        underscoredPhraseStyle: propDisplaySettings.underscoredPhraseStyle || prevSettings.underscoredPhraseStyle,
        sectionTitleColor: propDisplaySettings.sectionTitleColor || prevSettings.sectionTitleColor || "#3b82f6",
        showFootnotes:
          propDisplaySettings.showFootnotes !== undefined
            ? propDisplaySettings.showFootnotes
            : prevSettings.showFootnotes,
        showFootnoteSection:
          propDisplaySettings.showFootnoteSection !== undefined
            ? propDisplaySettings.showFootnoteSection
            : prevSettings.showFootnoteSection,
        darkMode: propDisplaySettings.darkMode !== undefined ? propDisplaySettings.darkMode : prevSettings.darkMode,
      }))

      if (propDisplaySettings.showFootnotes !== undefined) {
        setShowFootnotes(propDisplaySettings.showFootnotes)
      }
    }
  }, [propDisplaySettings])

  // Load tag styles
  useEffect(() => {
    try {
      const styles = loadTagStyles()
      setTagStyles(styles)
      console.log("Loaded tag styles:", styles)
    } catch (err) {
      console.error("Error loading tag styles:", err)
      setError("Failed to load tag styles. Some formatting may not display correctly.")
    }
  }, [])

  // Update current chapter
  useEffect(() => {
    setCurrentChapter(urlParams.chapter)
  }, [urlParams.chapter])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (contentProcessed.current && savedContent.current.book === urlParams.book && savedContent.current.content) {
        console.log("Skipping fetch: Content already processed for book", { book: urlParams.book })
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      setContentWarning(null)

      let contentData = initialContent
      let outlineData = bibleOutline

      console.log("Fetching data with:", {
        versionUrl: urlParams.versionUrl,
        outlineUrl: urlParams.outlineUrl,
        outlineId,
        book: urlParams.book,
      })

      if (contentData) {
        console.log("Initial content sample:", contentData.slice(0, 500))
      }
      if (outlineData) {
        console.log("Initial outline sample:", {
          title: outlineData.title,
          chapterCount: outlineData.chapters?.length,
          firstChapter: outlineData.chapters?.[0],
        })
      }

      // Fetch outline from URL or use preloaded outline
      if (urlParams.outlineUrl) {
        try {
          outlineData = await fetchBibleOutlineFromUrl(urlParams.outlineUrl, urlParams.book)
          setOutline(outlineData)
          console.log("Outline sample after fetch:", {
            title: outlineData.title,
            chapterCount: outlineData.chapters?.length,
            firstChapter: outlineData.chapters?.[0],
          })
        } catch (urlError) {
          console.error("Error fetching Bible outline from URL:", urlError)
          setError(
            `Failed to load Bible outline from URL: ${urlError instanceof Error ? urlError.message : "Unknown error"}`,
          )
          setLoading(false)
          return
        }
      } else if (!outlineData && outlineId && outlineId !== "undefined" && outlineId !== null) {
        const validOutlineId = Number.parseInt(String(outlineId), 10)
        if (preloadedOutlines && preloadedOutlines[validOutlineId]) {
          outlineData = preloadedOutlines[validOutlineId]
          if (urlParams.book && outlineData.chapters) {
            outlineData = {
              ...outlineData,
              chapters: outlineData.chapters.filter(
                (chapter: any) =>
                  chapter.book?.toLowerCase() === urlParams.book.toLowerCase() ||
                  chapter.name?.toLowerCase().startsWith(urlParams.book.toLowerCase() + " - "),
              ),
            }
          }
          console.log("Using preloaded outline:", outlineData.title)
          setOutline(outlineData)
        } else {
          setError("Outline ID provided but no outline URL or preloaded outline available")
          setLoading(false)
          return
        }
      } else {
        setError("No outline URL or preloaded outline provided")
        setLoading(false)
        return
      }

      // Fetch content from URL
      if (urlParams.versionUrl) {
        try {
          contentData = await fetchBibleContentFromUrl(urlParams.versionUrl, urlParams.book, outlineData)
          savedContent.current = { book: urlParams.book, content: contentData }
          setContent(contentData)
          console.log("Content sample after fetch:", contentData.slice(0, 500))
        } catch (urlError) {
          console.error("Error fetching Bible content from URL:", urlError)
          setError(
            `Failed to load Bible content from URL: ${urlError instanceof Error ? urlError.message : "Unknown error"}`,
          )
          setLoading(false)
          return
        }
      } else {
        setError("No version URL provided")
        setLoading(false)
        return
      }

      if (contentData && outlineData) {
        console.log("Processing content with outline:", {
          contentLength: contentData.length,
          outlineTitle: outlineData.title,
        })
        processContent(contentData, outlineData, urlParams.book, urlParams.chapter, "fetchData")
        contentProcessed.current = true
      } else {
        setError("Missing content or outline data")
        console.error("Missing data:", { contentAvailable: !!contentData, outlineAvailable: !!outlineData })
      }
    }

    fetchData().finally(() => setLoading(false))
  }, [
    initialContent,
    bibleOutline,
    urlParams.book,
    urlParams.versionUrl,
    urlParams.outlineUrl,
    outlineId,
    preloadedOutlines,
  ])

  // Process content for the specified book
  const processContent = (
    content: string,
    outline: any,
    bookName: string | undefined,
    chapterNum: number | undefined,
    source: string,
  ) => {
    if (isProcessing.current) {
      console.log("Skipping processContent: Already processing", { source, bookName })
      return
    }

    isProcessing.current = true
    try {
      const startTime = performance.now()
      console.log(`Starting content processing (${source}):`, { contentLength: content.length, bookName, chapterNum })

      if (!content || !outline) {
        console.error("Cannot process content: Missing data", {
          contentAvailable: !!content,
          outlineAvailable: !!outline,
        })
        setError("Missing content or outline data")
        return
      }

      if (!outline.chapters || !Array.isArray(outline.chapters)) {
        console.error("Invalid outline: Missing or invalid chapters array")
        setError("Invalid outline format: Missing chapters")
        return
      }

      const minLine =
        Math.min(
          ...outline.chapters
            .filter((chapter: any) => chapter.startLine)
            .map((chapter: any) => Number(chapter.startLine)),
        ) || 1

      const lines = content.split("\n")
      const verses: { text: string; lineNumber: number; verseNumber: number }[] = []

      console.log("Parsing verses from content...")
      lines.forEach((line, index) => {
        if (line.trim()) {
          verses.push({
            text: line,
            lineNumber: index + 1,
            verseNumber: 0, // This will be set properly for each chapter later
          })
        }
      })

      console.log("Verses parsed:", { totalVerses: verses.length })

      const processedChapters: Chapter[] = []
      const allFootnotes: Footnote[] = []
      const outlineChapters = outline.chapters

      const debugData = {
        totalVerses: verses.length,
        outlineChapters: outlineChapters.length,
        chapterStructure: [],
        ignoreCMTag: outline.ignoreCMTag,
        bookName,
        chapterNum,
      }

      if (bookName && outlineChapters.length === 0) {
        console.warn("No chapters found for book:", bookName)
        setError(`No chapters found for book: ${bookName}`)
        setChapters([])
        setDebugInfo(debugData)
        return
      }

      outlineChapters.forEach((chapter: any, index: number) => {
        console.log(`Processing chapter ${index + 1}/${outlineChapters.length}:`, chapter.name)
        const chapterNumber = chapter.number || index + 1
        const chapterName = chapter.name || `Chapter ${chapterNumber}`
        const startLine = (Number(chapter.startLine) || 1) - minLine + 1
        const endLine = (Number(chapter.endLine) || verses.length) - minLine + 1

        // Reset verse number for each chapter
        let chapterVerseNumber = 1

        if (startLine > endLine || startLine < 1 || endLine > verses.length) {
          console.warn("Invalid chapter bounds:", { chapterNumber, startLine, endLine, totalVerses: verses.length })
          return
        }

        const chapterVerses = verses
          .filter((verse) => verse.lineNumber >= startLine && verse.lineNumber <= endLine)
          .map((verse) => {
            // If verse has explicit number, use it, otherwise use incremented counter
            const verseMatch = verse.text.match(/<V>(\d+)<\/V>/)
            const verseNumber = verseMatch ? Number.parseInt(verseMatch[1], 10) : chapterVerseNumber++

            return {
              ...verse,
              verseNumber,
            }
          })

        console.log(`Chapter ${chapterNumber} verses:`, chapterVerses.length)

        if (chapterVerses.length > MAX_VERSES_PER_CHAPTER) {
          setContentWarning(
            `Chapter ${chapterNumber} has ${chapterVerses.length} verses, exceeding limit of ${MAX_VERSES_PER_CHAPTER}.`,
          )
        }

        const sections: Section[] = []
        if (chapter.sections && Array.isArray(chapter.sections)) {
          chapter.sections.forEach((section: any, sectionIndex: number) => {
            const sectionStartLine = (Number(section.startLine) || startLine) - minLine + 1
            const sectionEndLine = section.endLine ? Number(section.endLine) - minLine + 1 : endLine

            if (sectionStartLine > sectionEndLine || sectionStartLine < startLine || sectionEndLine > endLine) {
              console.warn("Invalid section bounds:", { sectionIndex, sectionStartLine, sectionEndLine })
              return
            }

            const sectionVerses = chapterVerses.filter(
              (verse) => verse.lineNumber >= sectionStartLine && verse.lineNumber <= sectionEndLine,
            )

            sections.push({
              title: section.title || `Section ${sectionIndex + 1}`,
              startLine: sectionStartLine,
              endLine: sectionEndLine,
              verses: sectionVerses.map((verse) => ({
                verseNumber: verse.verseNumber,
                lineNumber: verse.lineNumber,
                text: verse.text,
                tags: [],
                sectionTitle: verse.lineNumber === sectionStartLine ? section.title : undefined,
                footnotes: [],
              })),
            })
          })
        }

        const parsedVerses: ParsedVerse[] = chapterVerses.map((verse) => {
          const sectionTitle = sections.find((s) => s.startLine === verse.lineNumber)?.title

          const footnoteMatches = verse.text.match(/<FN>(.*?)<\/FN>/g)
          const verseFootnotes: { id: string; content: string }[] = []

          if (footnoteMatches) {
            footnoteMatches.forEach((match, fnIndex) => {
              const content = match.replace(/<FN>(.*?)<\/FN>/, "$1")
              const id = `fn-${chapterNumber}-${verse.verseNumber}-${fnIndex}`
              verseFootnotes.push({ id, content })
              allFootnotes.push({
                id,
                verseNumber: verse.verseNumber,
                content,
                number: allFootnotes.length + 1,
              })
            })
          }

          return {
            verseNumber: verse.verseNumber,
            lineNumber: verse.lineNumber,
            text: verse.text,
            tags: [],
            sectionTitle,
            footnotes: verseFootnotes.length > 0 ? verseFootnotes : undefined,
          }
        })

        processedChapters.push({
          chapterNumber,
          name: chapterName,
          verses: parsedVerses,
          sections: sections.length > 0 ? sections : undefined,
        })

        debugData.chapterStructure.push({
          number: chapterNumber,
          name: chapterName,
          verseCount: chapterVerses.length,
          startLine,
          endLine,
          sections: sections.length,
        })
      })

      console.log("Content processing completed:", { processedChapters: processedChapters.length })
      console.log("Processing time:", performance.now() - startTime, "ms")
      setChapters(processedChapters)
      setFootnotes(allFootnotes)
      setDebugInfo(debugData)
      lastProcessedBook.current = bookName
    } catch (err) {
      console.error("Error processing content:", err)
      setError("Failed to process Bible content: " + (err instanceof Error ? err.message : "Unknown error"))
      setChapters([])
    } finally {
      isProcessing.current = false
    }
  }

  // Reprocess content only when book changes
  useEffect(() => {
    if (
      savedContent.current.content &&
      outline &&
      urlParams.book &&
      urlParams.book !== lastProcessedBook.current &&
      !isProcessing.current
    ) {
      console.log("Reprocessing content due to book change:", { book: urlParams.book })
      contentProcessed.current = false
      processContent(savedContent.current.content, outline, urlParams.book, urlParams.chapter, "bookChange")
    }
  }, [urlParams.book, outline])

  const handleChapterChange = (newChapter: number) => {
    if (newChapter >= 1 && newChapter <= chapters.length) {
      setCurrentChapter(newChapter)

      const targetPage = Math.floor((newChapter - 1) / CHAPTERS_PER_PAGE)
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage)
      }

      if (contentRef.current) {
        contentRef.current.scrollTop = 0
      }

      if (urlParams.book) {
        const url = new URL(window.location.href)
        url.searchParams.set("chapter", newChapter.toString())
        window.history.replaceState({}, "", url.toString())
      }
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage)
      setCurrentChapter(newPage * CHAPTERS_PER_PAGE + 1)
    }
  }

  const processUnderscoredPhrases = (text: string): string => {
    if (displaySettings.underscoredPhraseStyle === "keep") {
      return text
    }

    const regex = /\b(\w+(?:_\w+)+)\b/g
    if (displaySettings.underscoredPhraseStyle === "remove") {
      return text.replace(regex, (match) => match.replace(/_/g, " "))
    } else if (displaySettings.underscoredPhraseStyle === "bold") {
      return text.replace(regex, (match) => `<strong class="font-medium">${match.replace(/_/g, " ")}</strong>`)
    }

    return text
  }

  const isInformationPage = (chapterName: string): boolean => {
    return (
      chapterName.toLowerCase().includes("information") ||
      chapterName.toLowerCase().includes("about") ||
      chapterName.toLowerCase().includes("intro")
    )
  }

  const processInformationPageContent = (verses: ParsedVerse[]): string => {
    let htmlContent = ""
    const infoFields: Record<string, string> = {}

    verses.forEach((verse) => {
      const text = verse.text
      const fieldMatches = [
        { field: "description", regex: /description=(.*?)(?:$|;|\n)/i },
        { field: "short.title", regex: /short\.title=(.*?)(?:$|;|\n)/i },
        { field: "version.date", regex: /version\.date=(.*?)(?:$|;|\n)/i },
        { field: "creator", regex: /creator=(.*?)(?:$|;|\n)/i },
        { field: "about", regex: /about=(.*?)(?:$|;|\n)/i },
      ]

      fieldMatches.forEach(({ field, regex }) => {
        const match = text.match(regex)
        if (match && match[1]) {
          infoFields[field] = match[1].trim()
        }
      })
    })

    if (Object.keys(infoFields).length > 0) {
      htmlContent += '<div class="space-y-4">'
      if (infoFields["short.title"]) {
        htmlContent += `<h2 class="text-2xl font-bold">${infoFields["short.title"]}</h2>`
      }
      if (infoFields["description"]) {
        htmlContent += `<p class="text-lg">${infoFields["description"]}</p>`
      }
      if (infoFields["about"]) {
        htmlContent += `<div class="mt-4">${infoFields["about"]}</div>`
      }
      if (infoFields["creator"]) {
        htmlContent += `<p class="mt-4"><strong>Creator:</strong> ${infoFields["creator"]}</p>`
      }
      if (infoFields["version.date"]) {
        htmlContent += `<p><strong>Version Date:</strong> ${infoFields["version.date"]}</p>`
      }
      htmlContent += "</div>"
    } else {
      htmlContent = "<p>No information fields found in this page.</p>"
    }

    return htmlContent
  }

  const toggleDarkMode = () => {
    const newDarkMode = !displaySettings.darkMode
    setDisplaySettings((prev) => ({
      ...prev,
      darkMode: newDarkMode,
    }))

    // Update theme
    const theme = newDarkMode ? "dark" : "light"
    document.documentElement.classList.toggle("dark", newDarkMode)

    // Save to localStorage
    try {
      const savedSettings = localStorage.getItem("bibleReaderDisplaySettings")
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        localStorage.setItem(
          "bibleReaderDisplaySettings",
          JSON.stringify({
            ...parsedSettings,
            darkMode: newDarkMode,
          }),
        )
      }
    } catch (error) {
      console.error("Error saving dark mode setting:", error)
    }
  }

  const processHtmlTags = (text: string): string => {
    let processedText = text
    if (!tagStyles || tagStyles.length === 0) {
      return processedText
    }

    const rfRegex = /<RF>(.*?)<Rf>(.*?)<\/Rf><\/RF>/g
    processedText = processedText.replace(rfRegex, (match, reference, footnoteContent) => {
      const footnoteId = `fn-${currentChapter}-${Math.random().toString(36).substring(2, 9)}`
      const newFootnote = {
        id: footnoteId,
        verseNumber: Number.parseInt(reference) || 0,
        content: footnoteContent,
      }

      if (!footnotes.some((fn) => fn.content === footnoteContent)) {
        setFootnotes((prev) => [...prev, newFootnote])
      }

      return `<sup><a href="#${footnoteId}" class="text-blue-500 font-medium">[${reference}]</a></sup>`
    })

    const rfIncompleteRegex = /<RF>(.*?)<Rf>(.*?)(?=<RF>|$)/g
    processedText = processedText.replace(rfIncompleteRegex, (match, reference, footnoteContent) => {
      const footnoteId = `fn-${currentChapter}-${Math.random().toString(36).substring(2, 9)}`
      const newFootnote = {
        id: footnoteId,
        verseNumber: Number.parseInt(reference) || 0,
        content: footnoteContent,
      }

      if (!footnotes.some((fn) => fn.content === footnoteContent)) {
        setFootnotes((prev) => [...prev, newFootnote])
      }

      return `<sup><a href="#${footnoteId}" class="text-blue-500 font-medium">[*]</a></sup>`
    })

    tagStyles.forEach((tag) => {
      if (tag.ignored) return
      const openTag = tag.open_tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const closeTag = tag.close_tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      if (!closeTag) return

      const regex = new RegExp(`${openTag}(.*?)${closeTag}`, "g")
      processedText = processedText.replace(regex, (match, content) => {
        if (tag.css_class) {
          return `<span class="${tag.css_class}">${content}</span>`
        }

        switch (tag.name.toLowerCase()) {
          case "b":
          case "bold":
            return `<strong>${content}</strong>`
          case "i":
          case "italic":
            return `<em>${content}</em>`
          case "u":
          case "underline":
            return `<u>${content}</u>`
          default:
            return `<span>${content}</span>`
        }
      })
    })

    return processedText
  }

  useEffect(() => {
    const currentChapterData = chapters.find((c) => c.chapterNumber === currentChapter)
    if (currentChapterData) {
      const newFootnotes: Footnote[] = []
      let chapterFootnoteCounter = 1

      currentChapterData.verses.forEach((verse) => {
        const text = verse.text
        const rfMatches = text.match(/<RF>(.*?)<Rf>/g)
        if (rfMatches) {
          rfMatches.forEach((match, index) => {
            const content = match.replace(/<RF>(.*?)<Rf>/, "$1")
            const footnoteId = `fn-rf-${currentChapter}-${verse.verseNumber}-${index}`
            newFootnotes.push({
              id: footnoteId,
              verseNumber: verse.verseNumber,
              content,
              number: chapterFootnoteCounter++,
            })
          })
        }

        const fnMatches = text.match(/<FN>(.*?)<\/FN>/g)
        if (fnMatches) {
          fnMatches.forEach((match, index) => {
            const content = match.replace(/<FN>(.*?)<\/FN>/, "$1")
            const footnoteId = `fn-${currentChapter}-${verse.verseNumber}-${index}`
            newFootnotes.push({
              id: footnoteId,
              verseNumber: verse.verseNumber,
              content,
              number: chapterFootnoteCounter++,
            })
          })
        }
      })

      setFootnotes(newFootnotes)
    }
  }, [currentChapter, chapters])

  const renderVerse = (verse: ParsedVerse) => {
    let processedText = verse.text
    processedText = processedText.replace(/<CM>.*?<\/CM>/g, "")
    processedText = processedText.replace(/<V>(\d+)<\/V>/, (_, num) => {
      return `<span class="verse-number font-bold text-sm mr-2">${verse.verseNumber}</span>`
    })

    if (!processedText.includes('class="verse-number"')) {
      processedText = `<span class="verse-number font-bold text-sm mr-2">${verse.verseNumber}</span> ${processedText}`
    }

    const currentChapterData = chapters.find((c) => c.chapterNumber === currentChapter)
    if (displaySettings.showLineNumbers && currentChapterData && !isInformationPage(currentChapterData.name)) {
      processedText = processedText.replace(
        /<span class="verse-number.*?<\/span>/,
        (match) => `${match}<span class="text-blue-500 text-xs font-normal mr-2">[${verse.lineNumber}]</span>`,
      )
    }

    processedText = processedText.replace(/<CI>.*?<PI1>/g, () => {
      return '<br/><span class="ml-6 inline-block">'
    })
    processedText = processedText.replace(/<\/PI1>.*?<\/CI>/g, "</span>")

    if (displaySettings.showFootnotes && verse.footnotes && verse.footnotes.length > 0) {
      verse.footnotes.forEach((footnote, index) => {
        const globalFootnote = footnotes.find((fn) => fn.id === footnote.id)
        const footnoteNumber = globalFootnote?.number || index + 1
        const footnoteMarker = `<sup><a href="javascript:void(0)" class="footnote-link text-blue-500 font-medium" data-footnote-id="${footnote.id}">[${footnoteNumber}]</a></sup>`
        processedText = processedText.replace(/<FN>.*?<\/FN>/, footnoteMarker)
      })
    } else {
      processedText = processedText.replace(/<FN>.*?<\/FN>/g, "")
    }

    if (displaySettings.showFootnotes) {
      const rfRegex = /<RF>(.*?)<Rf>/g
      const matches = Array.from(processedText.matchAll(rfRegex))
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i]
        if (match.index !== undefined) {
          const footnoteContent = match[1]
          const footnote = footnotes.find(
            (fn) => fn.verseNumber === verse.verseNumber && fn.content === footnoteContent,
          )
          const footnoteNumber = footnote?.number || i + 1
          const footnoteId = footnote?.id || `fn-rf-${currentChapter}-${verse.verseNumber}-${i}`
          const before = processedText.substring(0, match.index)
          const after = processedText.substring(match.index + match[0].length)
          processedText =
            before +
            `<sup><a href="javascript:void(0)" class="footnote-link text-blue-500 font-medium" data-footnote-id="${footnoteId}">[${footnoteNumber}]</a></sup>` +
            after
        }
      }
    } else {
      processedText = processedText.replace(/<RF>.*?<Rf>/g, "")
    }

    processedText = processHtmlTags(processedText)
    processedText = processUnderscoredPhrases(processedText)
    processedText = processedText.replace(/<b>(.*?)<\/b>/gi, "<strong>$1</strong>")
    processedText = processedText.replace(/<i>(.*?)<\/i>/gi, "<em>$1</em>")
    processedText = processedText.replace(/<u>(.*?)<\/u>/gi, "<u>$1</u>")

    return (
      <div
        key={verse.lineNumber}
        className="verse mb-2"
        style={{ marginBottom: `${displaySettings.paragraphSpacing}px` }}
      >
        {verse.sectionTitle && (
          <h4 className="font-semibold text-lg mb-2" style={{ color: displaySettings.sectionTitleColor || "#3b82f6" }}>
            {verse.sectionTitle}
          </h4>
        )}
        <span dangerouslySetInnerHTML={{ __html: processedText }} />
      </div>
    )
  }

  useEffect(() => {
    const handleFootnoteClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.classList.contains("footnote-link") || target.closest(".footnote-link")) {
        event.preventDefault()
        const link = target.classList.contains("footnote-link") ? target : target.closest(".footnote-link")
        const footnoteId = link?.getAttribute("data-footnote-id")

        if (footnoteId) {
          const footnote = footnotes.find((fn) => fn.id === footnoteId)
          if (footnote) {
            setCurrentFootnote(footnote)
            setShowFootnotesDialog(true)
          }
        }
      }
    }

    const contentContainer = contentRef.current
    if (contentContainer) {
      contentContainer.addEventListener("click", handleFootnoteClick)
    }

    return () => {
      if (contentContainer) {
        contentContainer.removeEventListener("click", handleFootnoteClick)
      }
    }
  }, [footnotes])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
      </div>
    )
  }

  if (error) {
    return <div className="text-destructive">{error}</div>
  }

  const handleNavigateToBookmark = (book: string, chapter: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set("book", book)
    url.searchParams.set("chapter", chapter.toString())
    router.push(url.toString())
    setShowBookmarkDialog(false)
  }

  const currentChapterData = chapters.find((c) => c.chapterNumber === currentChapter)
  const totalPages = Math.ceil(chapters.length / CHAPTERS_PER_PAGE)

  return (
    <div className="space-y-4">
      {chapters.length > 0 && (
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChapterChange(currentChapter - 1)}
              disabled={currentChapter <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <select
              className="h-9 w-[80px] text-center rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={currentChapter}
              onChange={(e) => handleChapterChange(Number(e.target.value))}
            >
              {chapters.map((chapter) => (
                <option key={chapter.chapterNumber} value={chapter.chapterNumber}>
                  {chapter.name.includes(" - ")
                    ? chapter.name.split(" - ")[1].replace(/Chapter\s+/i, "")
                    : chapter.chapterNumber}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChapterChange(currentChapter + 1)}
              disabled={currentChapter >= chapters.length}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowBookmarkDialog(true)} title="Bookmarks">
              <BookmarkPlus className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentFootnote(null)
                setShowFootnotesDialog(true)
              }}
              title="View All Footnotes"
            >
              <BookOpen className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleDarkMode}
              title={displaySettings.darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {displaySettings.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Dialog open={showFootnotesDialog} onOpenChange={setShowFootnotesDialog}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {currentFootnote
                      ? `Footnote for ${urlParams.book} ${currentChapter}:${currentFootnote.verseNumber}`
                      : `Footnotes for ${urlParams.book} ${currentChapter}`}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {footnotes.length > 0 ? (
                    (currentFootnote ? [currentFootnote] : footnotes).map((footnote) => (
                      <div key={footnote.id} id={footnote.id} className="pb-2 border-b last:border-0">
                        <div className="flex items-start">
                          <span className="font-bold mr-2">
                            Verse {footnote.verseNumber}
                            {footnote.number ? ` [${footnote.number}]` : ""}:
                          </span>
                          <div dangerouslySetInnerHTML={{ __html: footnote.content }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No footnotes available for this chapter.</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {totalPages > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {contentWarning && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>{contentWarning}</AlertDescription>
        </Alert>
      )}

      <Card
        className="border-none p-2 sm:p-4 sm:mx-0 w-full max-w-full rounded-none sm:rounded-md mx-auto"
        style={{ marginTop: "4px", paddingRight: "5px" }}
      >
        <div
          ref={contentRef}
          className="bible-content overflow-y-auto max-h-[70vh]"
          style={{
            fontSize: `${displaySettings.fontSize}px`,
            lineHeight: displaySettings.lineHeight,
            fontFamily: fontFamily || "inherit",
            fontWeight: displaySettings.fontWeight,
          }}
        >
          {currentChapterData ? (
            <>
              {isInformationPage(currentChapterData.name) ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: processInformationPageContent(currentChapterData.verses),
                  }}
                />
              ) : (
                <>
                  {currentChapterData.sections && currentChapterData.sections.length > 0 ? (
                    currentChapterData.sections.map((section, index) => (
                      <div key={`section-${index}`} className="mb-6">
                        <div className="space-y-1">{section.verses.map((verse) => renderVerse(verse))}</div>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-1">{currentChapterData.verses.map((verse) => renderVerse(verse))}</div>
                  )}
                </>
              )}
            </>
          ) : chapters.length > 0 ? (
            <div className="text-center py-8">Please select a chapter to read</div>
          ) : (
            <div className="text-center py-8">
              {error ? (
                <p className="text-destructive">{error}</p>
              ) : (
                <p className="text-muted-foreground">No content available for the selected Bible and outline</p>
              )}
            </div>
          )}
        </div>
      </Card>

      {debugInfo && displaySettings.showDebugInfo && (
        <Card className="p-4 mt-4 bg-muted/50">
          <h3 className="text-sm font-semibold mb-2">Debug Information</h3>
          <div className="text-xs space-y-1">
            <p>Total verses: {debugInfo.totalVerses}</p>
            <p>Outline chapters: {debugInfo.outlineChapters}</p>
            <p>Processed chapters: {chapters.length}</p>
            <p>Current chapter: {currentChapter}</p>
            <p>Book: {debugInfo.bookName || "None"}</p>
            <p>Ignore CM tags: {debugInfo.ignoreCMTag ? "Yes" : "No"}</p>
            <p>Content processed: {contentProcessed.current ? "Yes" : "No"}</p>
            <p>Content available: {savedContent.current.content ? "Yes" : "No"}</p>
            <p>Tag styles loaded: {tagStyles.length}</p>
            <p>Footnotes: {footnotes.length}</p>
            <p>
              Pagination: Page {currentPage + 1} of {totalPages} ({CHAPTERS_PER_PAGE} chapters per page)
            </p>
            {currentChapterData && (
              <>
                <p>Current chapter verses: {currentChapterData.verses.length}</p>
                <p>Current chapter sections: {currentChapterData.sections?.length || 0}</p>
              </>
            )}
          </div>
        </Card>
      )}

      <BookmarkDialog
        open={showBookmarkDialog}
        onOpenChange={setShowBookmarkDialog}
        currentBook={urlParams.book || undefined}
        currentChapter={currentChapter}
        onNavigate={handleNavigateToBookmark}
        defaultVersionId={displaySettings.defaultVersionId}
        defaultOutlineId={displaySettings.defaultOutlineId}
      />
    </div>
  )
}
