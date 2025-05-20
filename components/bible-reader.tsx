"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, AlertTriangle, BookmarkPlus, BookOpen } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useFontLoader } from "@/lib/fonts"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getDisplaySettings, storeDisplaySettings, isIndexedDBAvailable } from "@/lib/indexedDB"
import { useSearchParams, useRouter } from "next/navigation"
import { BookmarkDialog } from "@/components/bookmark-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Constants for pagination and safety limits
const CHAPTERS_PER_PAGE = 100
const MAX_VERSES_PER_CHAPTER = 500 // Safety limit for verses per chapter

interface BibleReaderProps {
  versionId: number | string | null
  outlineId: number | string | null
  content?: string
  chapter?: number
  book?: string
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

interface TagStyle {
  name: string
  open_tag: string
  close_tag: string
  description: string
  css_class: string
  ignored: boolean
}

interface Footnote {
  id: string
  verseNumber: number
  content: string
  number: number
}

export function BibleReader({
  versionId,
  outlineId,
  content: initialContent,
  bibleOutline,
  displaySettings: propDisplaySettings,
}: BibleReaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialChapter = searchParams.get("chapter") ? Number(searchParams.get("chapter")) : 1
  const initialBook = searchParams.get("book")

  const [content, setContent] = useState<string>(initialContent || "")
  const [outline, setOutline] = useState<any>(bibleOutline || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentChapter, setCurrentChapter] = useState(initialChapter || 1)
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
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fontFamily, setFontFamily] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [tagStyles, setTagStyles] = useState<TagStyle[]>([])
  const [showFootnotes, setShowFootnotes] = useState(true)
  const [contentWarning, setContentWarning] = useState<string | null>(null)
  const [indexedDBAvailable, setIndexedDBAvailable] = useState<boolean>(false)
  const [footnotes, setFootnotes] = useState<Footnote[]>([])
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false)
  const [showFootnotesDialog, setShowFootnotesDialog] = useState(false)
  const [currentFootnote, setCurrentFootnote] = useState<Footnote | null>(null)

  // Keep track of content processing status
  const contentProcessed = useRef(false)
  const savedContent = useRef(initialContent || "")
  const currentBookRef = useRef<string | undefined>(initialBook)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = useMemo(() => Math.ceil(chapters.length / CHAPTERS_PER_PAGE), [chapters.length])

  const paginatedChapters = useMemo(() => {
    const start = currentPage * CHAPTERS_PER_PAGE
    const end = start + CHAPTERS_PER_PAGE
    return chapters.slice(start, end)
  }, [chapters, currentPage])

  // Load font
  const { loadFont } = useFontLoader()

  // Check if IndexedDB is available
  useEffect(() => {
    const checkIndexedDB = async () => {
      const available = await isIndexedDBAvailable()
      setIndexedDBAvailable(available)
    }
    checkIndexedDB()
  }, [])

  // Load saved settings from IndexedDB on component mount
  useEffect(() => {
    const loadDisplaySettings = async () => {
      if (!indexedDBAvailable) {
        // Fallback to localStorage if IndexedDB is not available
        const savedSettings = localStorage.getItem("bibleReaderDisplaySettings")
        if (savedSettings) {
          try {
            const parsedSettings = JSON.parse(savedSettings)
            setDisplaySettings((prev) => ({
              ...prev,
              ...parsedSettings,
              // Ensure we have defaults for any new settings
              fontWeight: parsedSettings.fontWeight || 400,
              showDebugInfo: parsedSettings.showDebugInfo || false,
              sectionTitleColor: parsedSettings.sectionTitleColor || "#3b82f6",
              paragraphSpacing: parsedSettings.paragraphSpacing || 16,
              showFootnotes: parsedSettings.showFootnotes !== undefined ? parsedSettings.showFootnotes : true,
              showFootnoteSection:
                parsedSettings.showFootnoteSection !== undefined ? parsedSettings.showFootnoteSection : true,
            }))
            setShowFootnotes(parsedSettings.showFootnotes !== undefined ? parsedSettings.showFootnotes : true)
          } catch (e) {
            console.error("Error parsing saved display settings:", e)
          }
        }
        return
      }

      try {
        const settings = await getDisplaySettings()
        if (settings) {
          setDisplaySettings((prev) => ({
            ...prev,
            ...settings,
            // Ensure we have defaults for any new settings
            fontWeight: settings.fontWeight || 400,
            showDebugInfo: settings.showDebugInfo || false,
            sectionTitleColor: settings.sectionTitleColor || "#3b82f6",
            paragraphSpacing: settings.paragraphSpacing || 16,
            showFootnotes: settings.showFootnotes !== undefined ? settings.showFootnotes : true,
            showFootnoteSection: settings.showFootnoteSection !== undefined ? settings.showFootnoteSection : true,
          }))
          setShowFootnotes(settings.showFootnotes !== undefined ? settings.showFootnotes : true)
        }
      } catch (error) {
        console.error("Error loading display settings from IndexedDB:", error)
      }
    }

    loadDisplaySettings()
  }, [indexedDBAvailable])

  // Save settings to IndexedDB whenever they change
  useEffect(() => {
    const saveDisplaySettings = async () => {
      if (indexedDBAvailable) {
        try {
          await storeDisplaySettings(displaySettings)
        } catch (error) {
          console.error("Error saving display settings to IndexedDB:", error)
          // Fallback to localStorage
          localStorage.setItem("bibleReaderDisplaySettings", JSON.stringify(displaySettings))
        }
      } else {
        // Fallback to localStorage
        localStorage.setItem("bibleReaderDisplaySettings", JSON.stringify(displaySettings))
      }
    }

    saveDisplaySettings()
  }, [displaySettings, indexedDBAvailable])

  // Use display settings from props if provided
  useEffect(() => {
    if (propDisplaySettings) {
      setDisplaySettings((prevSettings) => ({
        ...prevSettings,
        fontSize: propDisplaySettings.fontSize !== undefined ? propDisplaySettings.fontSize : prevSettings.fontSize,
        fontFamily:
          propDisplaySettings.fontFamily !== undefined ? propDisplaySettings.fontFamily : prevSettings.fontFamily,
        fontWeight:
          propDisplaySettings.fontWeight !== undefined ? propDisplaySettings.fontWeight : prevSettings.fontWeight,
        showVerseNumbers: true, // Always show verse numbers
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
      }))

      if (propDisplaySettings.showFootnotes !== undefined) {
        setShowFootnotes(propDisplaySettings.showFootnotes)
      }
    }
  }, [propDisplaySettings])

  // Load tag styles from database
  useEffect(() => {
    const fetchTagStyles = async () => {
      try {
        const { data, error } = await supabase.from("bible_tags").select("*").order("name", { ascending: true })

        if (error) throw error

        if (data && data.length > 0) {
          // Convert database field names to match component expectations
          const formattedTags = data.map((tag) => ({
            name: tag.name,
            open_tag: tag.open_tag,
            close_tag: tag.close_tag || "",
            description: tag.description || "",
            css_class: tag.css_class || "",
            ignored: tag.ignored || false,
          }))
          setTagStyles(formattedTags)
          console.log("Loaded tag styles:", formattedTags)
        } else {
          // Fallback to localStorage if no database tags
          const savedTagStyles = localStorage.getItem("bibleReaderTagStyles")
          if (savedTagStyles) {
            try {
              const parsedStyles = JSON.parse(savedTagStyles)
              setTagStyles(parsedStyles)
              console.log("Loaded tag styles from localStorage:", parsedStyles)
            } catch (e) {
              console.error("Error parsing saved tag styles:", e)
            }
          }
        }
      } catch (err) {
        console.error("Error fetching tag styles:", err)

        // Fallback to localStorage if database fetch fails
        const savedTagStyles = localStorage.getItem("bibleReaderTagStyles")
        if (savedTagStyles) {
          try {
            const parsedStyles = JSON.parse(savedTagStyles)
            setTagStyles(parsedStyles)
          } catch (e) {
            console.error("Error parsing saved tag styles:", e)
          }
        }
      }
    }

    fetchTagStyles()
  }, [])

  // Main data fetching effect
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (contentProcessed.current) {
          // Skip if we've already processed this content
          return
        }

        setLoading(true)
        setError(null)
        setContentWarning(null)

        // If we have content and outline already, use those
        if (initialContent && bibleOutline) {
          savedContent.current = initialContent
          setContent(initialContent)
          setOutline(bibleOutline)
          processContent(initialContent, bibleOutline, initialBook, initialChapter)
          setLoading(false)
          contentProcessed.current = true
          return
        }

        // Validate versionId and outlineId
        const validVersionId =
          versionId !== null && versionId !== undefined && versionId !== "undefined"
            ? Number.parseInt(String(versionId), 10)
            : null

        const validOutlineId =
          outlineId !== null && outlineId !== undefined && outlineId !== "undefined"
            ? Number.parseInt(String(outlineId), 10)
            : null

        // Check if we have valid IDs
        if (!validVersionId) {
          throw new Error("Invalid or missing Bible version ID")
        }

        if (!validOutlineId) {
          throw new Error("Invalid or missing Bible outline ID")
        }

        // Fetch Bible version
        const { data: versionData, error: versionError } = await supabase
          .from("bible_versions")
          .select("content, default_font")
          .eq("id", validVersionId)
          .single()

        if (versionError) throw versionError

        // Fetch outline
        const { data: outlineData, error: outlineError } = await supabase
          .from("bible_outlines")
          .select("*")
          .eq("id", validOutlineId)
          .single()

        if (outlineError) throw outlineError

        // Set content and outline
        if (versionData.content) {
          savedContent.current = versionData.content
          setContent(versionData.content)
        }
        setOutline(outlineData)

        // Load font if available
        if (versionData.default_font) {
          const fontLoaded = await loadFont(versionData.default_font)
          if (fontLoaded) {
            setFontFamily(fontLoaded.cssName)
          }
        }

        // Process content based on outline
        if (versionData.content && outlineData) {
          processContent(versionData.content, outlineData, initialBook, initialChapter)
          contentProcessed.current = true
        }
      } catch (err) {
        console.error("Error fetching Bible data:", err)
        setError(err instanceof Error ? err.message : "Failed to load Bible content")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [versionId, outlineId, initialContent, bibleOutline, initialBook, initialChapter, loadFont])

  // Ensure content is processed when book or chapter changes
  useEffect(() => {
    // Update the ref to track changes
    currentBookRef.current = initialBook

    // If we have content and outline but chapters haven't been processed yet
    if (savedContent.current && outline && (!chapters.length || initialBook !== currentBookRef.current)) {
      processContent(savedContent.current, outline, initialBook, currentChapter)
    }
  }, [initialBook, currentChapter, outline, chapters.length])

  const processContent = (
    content: string,
    outline: any,
    bookName: string | undefined,
    chapterNum: number | undefined,
  ) => {
    try {
      if (!content || !outline) return

      // Parse the content into verses
      const lines = content.split("\n")
      const verses: { text: string; lineNumber: number; verseNumber: number }[] = []

      // Extract verse numbers from <V> tags and store them with the lines
      let currentVerseNumber = 1
      lines.forEach((line, index) => {
        if (line.trim()) {
          // Extract verse number if present
          const verseMatch = line.match(/<V>(\d+)<\/V>/)
          const verseNumber = verseMatch ? Number.parseInt(verseMatch[1], 10) : currentVerseNumber++

          verses.push({
            text: line,
            lineNumber: index + 1,
            verseNumber: verseNumber,
          })
        }
      })

      // Create chapters based on outline structure
      const processedChapters: Chapter[] = []
      const outlineChapters = outline.chapters || []
      const allFootnotes: Footnote[] = []

      // Debug information
      const debugData = {
        totalVerses: verses.length,
        outlineChapters: outlineChapters.length,
        chapterStructure: [],
        ignoreCMTag: outline.ignoreCMTag,
      }

      // Filter chapters for the current book
      const chaptersForCurrentBook = outlineChapters.filter(
        (c: any) => c.book === bookName || (c.name && c.name.startsWith(bookName + " - ")),
      )

      // Group verses into chapters based on outline
      chaptersForCurrentBook.forEach((chapter: any) => {
        const chapterNumber = chapter.number
        const chapterName = chapter.name || `Chapter ${chapterNumber}`
        const startLine = chapter.startLine || 1
        const endLine = chapter.endLine || verses.length

        // Get verses for this chapter
        const chapterVerses = verses.filter((verse) => verse.lineNumber >= startLine && verse.lineNumber <= endLine)

        // Check if chapter has too many verses
        if (chapterVerses.length > MAX_VERSES_PER_CHAPTER) {
          setContentWarning(
            `Chapter ${chapterNumber} has ${chapterVerses.length} verses, which exceeds the recommended limit of ${MAX_VERSES_PER_CHAPTER}. This may cause performance issues.`,
          )
        }

        // Process sections if available
        const sections: Section[] = []
        if (chapter.sections && chapter.sections.length > 0) {
          chapter.sections.forEach((section: any) => {
            const sectionStartLine = section.startLine || 1
            const sectionEndLine = section.endLine || verses.length

            const sectionVerses = chapterVerses.filter(
              (verse) =>
                verse.lineNumber >= sectionStartLine && (sectionEndLine ? verse.lineNumber <= sectionEndLine : true),
            )

            // Mark verses with their section title
            sectionVerses.forEach((verse) => {
              if (verse.lineNumber === sectionStartLine) {
                verse.sectionTitle = section.title
              }
            })

            sections.push({
              title: section.title,
              startLine: sectionStartLine,
              endLine: sectionEndLine,
              verses: sectionVerses.map((verse, index) => {
                // Extract footnotes
                const footnoteMatches = verse.text.match(/<FN>(.*?)<\/FN>/g)
                const verseFootnotes = []

                if (footnoteMatches) {
                  footnoteMatches.forEach((match, fnIndex) => {
                    const content = match.replace(/<FN>(.*?)<\/FN>/, "$1")
                    const id = `fn-${chapterNumber}-${verse.verseNumber}-${fnIndex}`
                    verseFootnotes.push({ id, content })

                    // Add to global footnotes list
                    allFootnotes.push({
                      id,
                      verseNumber: verse.verseNumber,
                      content,
                    })
                  })
                }

                return {
                  verseNumber: index + 1, // Start from 1 for each section
                  lineNumber: verse.lineNumber,
                  text: verse.text,
                  tags: [],
                  sectionTitle: verse.lineNumber === sectionStartLine ? section.title : undefined,
                  footnotes: verseFootnotes.length > 0 ? verseFootnotes : undefined,
                }
              }),
            })
          })
        }

        // Reset verse numbers to start from 1 for each chapter
        const parsedVerses: ParsedVerse[] = chapterVerses.map((verse, index) => {
          // Check if this verse is the start of a section
          const sectionTitle = chapter.sections?.find((s: any) => s.startLine === verse.lineNumber)?.title

          // Extract footnotes
          const footnoteMatches = verse.text.match(/<FN>(.*?)<\/FN>/g)
          const verseFootnotes = []

          if (footnoteMatches) {
            footnoteMatches.forEach((match, fnIndex) => {
              const content = match.replace(/<FN>(.*?)<\/FN>/, "$1")
              const id = `fn-${chapterNumber}-${verse.verseNumber}-${fnIndex}`
              verseFootnotes.push({ id, content })

              // Add to global footnotes list
              allFootnotes.push({
                id,
                verseNumber: verse.verseNumber,
                content,
              })
            })
          }

          return {
            verseNumber: index + 1, // Start from 1 for each chapter
            lineNumber: verse.lineNumber,
            text: verse.text,
            tags: [], // We'll process tags later if needed
            sectionTitle: sectionTitle,
            footnotes: verseFootnotes.length > 0 ? verseFootnotes : undefined,
          }
        })

        // Add chapter to processed chapters
        processedChapters.push({
          chapterNumber,
          name: chapterName,
          verses: parsedVerses,
          sections: sections.length > 0 ? sections : undefined,
        })

        // Add to debug info
        debugData.chapterStructure.push({
          number: chapterNumber,
          name: chapterName,
          verseCount: chapterVerses.length,
          startLine,
          endLine,
          sections: sections.length,
        })
      })

      setChapters(processedChapters)
      setDebugInfo(debugData)
      setFootnotes(allFootnotes)
    } catch (err) {
      console.error("Error processing content:", err)
      setError("Failed to process Bible content")
    }
  }

  const handleChapterChange = (newChapter: number) => {
    if (newChapter >= 1 && newChapter <= chapters.length) {
      setCurrentChapter(newChapter)

      // Update page if necessary
      const targetPage = Math.floor((newChapter - 1) / CHAPTERS_PER_PAGE)
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage)
      }

      // Scroll to top
      if (contentRef.current) {
        contentRef.current.scrollTop = 0
      }

      // Update URL with new chapter
      if (initialBook) {
        const url = new URL(window.location.href)
        url.searchParams.set("chapter", newChapter.toString())
        window.history.replaceState({}, "", url.toString())
      }
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage)
      // Set current chapter to first chapter on the new page
      setCurrentChapter(newPage * CHAPTERS_PER_PAGE + 1)
    }
  }

  // Process underscored phrases
  const processUnderscoredPhrases = (text: string): string => {
    if (displaySettings.underscoredPhraseStyle === "keep") {
      return text // Keep as is
    }

    // Regular expression to match words with underscores
    const regex = /\b(\w+(?:_\w+)+)\b/g

    if (displaySettings.underscoredPhraseStyle === "remove") {
      // Replace underscores with spaces
      return text.replace(regex, (match) => match.replace(/_/g, " "))
    } else if (displaySettings.underscoredPhraseStyle === "bold") {
      // Replace with bold text without underscores
      return text.replace(regex, (match) => `<strong class="font-medium">${match.replace(/_/g, " ")}</strong>`)
    }

    return text
  }

  // Detect if the current chapter is an information category page
  const isInformationPage = (chapterName: string): boolean => {
    return (
      chapterName.toLowerCase().includes("information") ||
      chapterName.toLowerCase().includes("about") ||
      chapterName.toLowerCase().includes("intro")
    )
  }

  // Process information page content
  const processInformationPageContent = (verses: ParsedVerse[]): string => {
    let htmlContent = ""
    const infoFields: Record<string, string> = {}

    // Extract information fields from verses
    verses.forEach((verse) => {
      const text = verse.text

      // Look for specific fields
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

    // Generate HTML content
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
      // Fallback if no specific fields found
      htmlContent = "<p>No information fields found in this page.</p>"
    }

    return htmlContent
  }

  // Process HTML-like tags in the text
  const processHtmlTags = (text: string): string => {
    let processedText = text

    // Skip processing if no tag styles are loaded
    if (!tagStyles || tagStyles.length === 0) {
      return processedText
    }

    // Process <RF> and <Rf> tags for footnotes
    const rfRegex = /<RF>(.*?)<Rf>(.*?)<\/Rf><\/RF>/g
    processedText = processedText.replace(rfRegex, (match, reference, footnoteContent) => {
      const footnoteId = `fn-${currentChapter}-${Math.random().toString(36).substring(2, 9)}`

      // Add to footnotes array
      const newFootnote = {
        id: footnoteId,
        verseNumber: Number.parseInt(reference) || 0,
        content: footnoteContent,
      }

      // Add to footnotes if not already there
      if (!footnotes.some((fn) => fn.content === footnoteContent)) {
        setFootnotes((prev) => [...prev, newFootnote])
      }

      return `<sup><a href="#${footnoteId}" class="text-blue-500 font-medium">[${reference}]</a></sup>`
    })

    // Handle incomplete RF format
    const rfIncompleteRegex = /<RF>(.*?)<Rf>(.*?)(?=<RF>|$)/g
    processedText = processedText.replace(rfIncompleteRegex, (match, reference, footnoteContent) => {
      const footnoteId = `fn-${currentChapter}-${Math.random().toString(36).substring(2, 9)}`

      // Add to footnotes array
      const newFootnote = {
        id: footnoteId,
        verseNumber: Number.parseInt(reference) || 0,
        content: footnoteContent,
      }

      // Add to footnotes if not already there
      if (!footnotes.some((fn) => fn.content === footnoteContent)) {
        setFootnotes((prev) => [...prev, newFootnote])
      }

      return `<sup><a href="#${footnoteId}" class="text-blue-500 font-medium">[*]</a></sup>`
    })

    // Process each tag style
    tagStyles.forEach((tag) => {
      if (tag.ignored) return

      // Create a regex to match this tag
      const openTag = tag.open_tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const closeTag = tag.close_tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

      // Skip if no close tag
      if (!closeTag) return

      const regex = new RegExp(`${openTag}(.*?)${closeTag}`, "g")

      // Replace with HTML with appropriate CSS class
      processedText = processedText.replace(regex, (match, content) => {
        if (tag.css_class) {
          return `<span class="${tag.css_class}">${content}</span>`
        }

        // Default styling based on common tags
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

  // Process footnotes when chapter changes
  useEffect(() => {
    const currentChapterData = chapters.find((c) => c.chapterNumber === currentChapter)
    if (currentChapterData) {
      // Process all verses to extract footnotes
      const newFootnotes: Footnote[] = []
      let chapterFootnoteCounter = 1 // Start counter at 1 for each chapter

      // First pass: collect all footnotes from the chapter
      currentChapterData.verses.forEach((verse) => {
        const text = verse.text

        // Extract RF footnotes - correct format with lowercase f in closing tag
        const rfMatches = text.match(/<RF>(.*?)<Rf>/g)
        if (rfMatches) {
          rfMatches.forEach((match, index) => {
            const content = match.replace(/<RF>(.*?)<Rf>/, "$1")
            const footnoteId = `fn-rf-${currentChapter}-${verse.verseNumber}-${index}`

            newFootnotes.push({
              id: footnoteId,
              verseNumber: verse.verseNumber,
              content: content,
              number: chapterFootnoteCounter++,
            })
          })
        }

        // Extract FN footnotes
        const fnMatches = text.match(/<FN>(.*?)<\/FN>/g)
        if (fnMatches) {
          fnMatches.forEach((match, index) => {
            const content = match.replace(/<FN>(.*?)<\/FN>/, "$1")
            const footnoteId = `fn-${currentChapter}-${verse.verseNumber}-${index}`

            newFootnotes.push({
              id: footnoteId,
              verseNumber: verse.verseNumber,
              content: content,
              number: chapterFootnoteCounter++,
            })
          })
        }
      })

      // Set all footnotes at once
      setFootnotes(newFootnotes)
    }
  }, [currentChapter, chapters])

  const renderVerse = (verse: ParsedVerse) => {
    // Process tags in the verse text
    let processedText = verse.text

    // Replace <CM> tags (chapter markers) - we ignore these as per requirements
    processedText = processedText.replace(/<CM>.*?<\/CM>/g, "")

    // Replace <V> tags (verse numbers) with styled verse numbers
    processedText = processedText.replace(/<V>(\d+)<\/V>/, (_, num) => {
      return `<span class="verse-number font-bold text-sm mr-2">${verse.verseNumber}</span>`
    })

    // If no verse number tag was found, add one at the beginning
    if (!processedText.includes('class="verse-number"')) {
      processedText = `<span class="verse-number font-bold text-sm mr-2">${verse.verseNumber}</span> ${processedText}`
    }

    // Add line number after verse number (in blue, non-bold)
    const currentChapterData = chapters.find((c) => c.chapterNumber === currentChapter)
    if (displaySettings.showLineNumbers && currentChapterData && !isInformationPage(currentChapterData.name)) {
      processedText = processedText.replace(
        /<span class="verse-number.*?<\/span>/,
        (match) => `${match}<span class="text-blue-500 text-xs font-normal mr-2">[${verse.lineNumber}]</span>`,
      )
    }

    // Handle <CI><PI1> tags for new line with indentation
    processedText = processedText.replace(/<CI>.*?<PI1>/g, () => {
      return '<br/><span class="ml-6 inline-block">'
    })
    processedText = processedText.replace(/<\/PI1>.*?<\/CI>/g, "</span>")

    // Process footnotes if enabled
    if (displaySettings.showFootnotes && verse.footnotes && verse.footnotes.length > 0) {
      // Replace <FN> tags with footnote links
      verse.footnotes.forEach((footnote, index) => {
        // Find the global footnote number
        const globalFootnote = footnotes.find((fn) => fn.id === footnote.id)
        const footnoteNumber = globalFootnote?.number || index + 1

        const footnoteMarker = `<sup><a href="javascript:void(0)" class="footnote-link text-blue-500 font-medium" data-footnote-id="${footnote.id}">[${footnoteNumber}]</a></sup>`
        processedText = processedText.replace(/<FN>.*?<\/FN>/, footnoteMarker)
      })
    } else {
      // Remove footnote tags if not showing footnotes
      processedText = processedText.replace(/<FN>.*?<\/FN>/g, "")
    }

    // Process <RF> and <Rf> tags for footnotes
    if (displaySettings.showFootnotes) {
      // Pattern: <RF>content<Rf> (correct format with lowercase f in closing tag)
      const rfRegex = /<RF>(.*?)<Rf>/g

      // Find all matches first to get their positions
      const matches = Array.from(processedText.matchAll(rfRegex))

      // Process matches in reverse order to avoid position shifts
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i]
        if (match.index !== undefined) {
          const footnoteContent = match[1]

          // Find the footnote in our global list to get its number
          const footnote = footnotes.find(
            (fn) => fn.verseNumber === verse.verseNumber && fn.content === footnoteContent,
          )

          const footnoteNumber = footnote?.number || i + 1
          const footnoteId = footnote?.id || `fn-rf-${currentChapter}-${verse.verseNumber}-${i}`

          // Replace the match with a footnote link
          const before = processedText.substring(0, match.index)
          const after = processedText.substring(match.index + match[0].length)
          processedText =
            before +
            `<sup><a href="javascript:void(0)" class="footnote-link text-blue-500 font-medium" data-footnote-id="${footnoteId}">[${footnoteNumber}]</a></sup>` +
            after
        }
      }
    } else {
      // Remove RF tags completely if not showing footnotes
      processedText = processedText.replace(/<RF>.*?<Rf>/g, "")
    }

    // Process HTML-like tags (bold, italic, etc.)
    processedText = processHtmlTags(processedText)

    // Process underscored phrases
    processedText = processUnderscoredPhrases(processedText)

    // Apply common HTML tags directly
    // Bold
    processedText = processedText.replace(/<b>(.*?)<\/b>/gi, "<strong>$1</strong>")
    // Italic
    processedText = processedText.replace(/<i>(.*?)<\/i>/gi, "<em>$1</em>")
    // Underline
    processedText = processedText.replace(/<u>(.*?)<\/u>/gi, "<u>$1</u>")

    return (
      <div
        key={verse.lineNumber}
        className="verse mb-2"
        style={{ marginBottom: `${displaySettings.paragraphSpacing}px` }}
      >
        {/* Only show section title if it exists and this is the first verse with this section title */}
        {verse.sectionTitle && (
          <h4 className="font-semibold text-lg mb-2" style={{ color: displaySettings.sectionTitleColor || "#3b82f6" }}>
            {verse.sectionTitle}
          </h4>
        )}
        <span dangerouslySetInnerHTML={{ __html: processedText }} />
      </div>
    )
  }

  // Add event listener for footnote clicks
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
            // Show only this footnote in the dialog
            setCurrentFootnote(footnote)
            setShowFootnotesDialog(true)
          }
        }
      }
    }

    // Add event listener to the content container
    const contentContainer = contentRef.current
    if (contentContainer) {
      contentContainer.addEventListener("click", handleFootnoteClick)
    }

    return () => {
      // Clean up event listener
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

  // If we have content but no chapters, it might be because the book doesn't match
  // Try to process the content again with the current book
  if (savedContent.current && !chapters.length && outline && !contentProcessed.current) {
    // Use setTimeout to avoid rendering during state update
    setTimeout(() => {
      processContent(savedContent.current, outline, initialBook, currentChapter)
    }, 0)
  }

  const handleNavigateToBookmark = (book: string, chapter: number) => {
    // Update the URL to navigate to the selected bookmark
    const url = new URL(window.location.href)
    url.searchParams.set("book", book)
    url.searchParams.set("chapter", chapter.toString())
    router.push(url.toString())

    // Close the bookmark dialog
    setShowBookmarkDialog(false)
  }

  const currentChapterData = chapters.find((c) => c.chapterNumber === currentChapter)

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
              className="h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={currentChapter}
              onChange={(e) => handleChapterChange(Number(e.target.value))}
            >
              {chapters.map((chapter) => (
                <option key={chapter.chapterNumber} value={chapter.chapterNumber}>
                  {chapter.name.includes(" - ")
                    ? chapter.name.split(" - ")[1] // Extract just the chapter part after the dash
                    : `Chapter ${chapter.chapterNumber}`}
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
                setCurrentFootnote(null) // Reset to show all footnotes
                setShowFootnotesDialog(true)
              }}
              title="View All Footnotes"
            >
              <BookOpen className="h-4 w-4" />
            </Button>

            <Dialog open={showFootnotesDialog} onOpenChange={setShowFootnotesDialog}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {currentFootnote
                      ? `Footnote for ${initialBook} ${currentChapter}:${currentFootnote.verseNumber}`
                      : `Footnotes for ${initialBook} ${currentChapter}`}
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

      <Card className="border-none p-8 sm:p-4 sm:mx-0 w-screen sm:w-full rounded-none sm:rounded-md relative left-1/2 right-1/2 -translate-x-1/2 sm:left-0 sm:right-0 sm:translate-x-0">
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
                // Information category page rendering
                <div
                  dangerouslySetInnerHTML={{
                    __html: processInformationPageContent(currentChapterData.verses),
                  }}
                />
              ) : (
                // Regular Bible content rendering
                <>
                  {/* If we have sections, render them */}
                  {currentChapterData.sections && currentChapterData.sections.length > 0 ? (
                    currentChapterData.sections.map((section, index) => (
                      <div key={`section-${index}`} className="mb-6">
                        <div className="space-y-1">{section.verses.map((verse) => renderVerse(verse))}</div>
                      </div>
                    ))
                  ) : (
                    // Otherwise just render the verses
                    <div className="space-y-1">{currentChapterData.verses.map((verse) => renderVerse(verse))}</div>
                  )}
                </>
              )}
            </>
          ) : chapters.length > 0 ? (
            <div className="text-center py-8">Please select a chapter to read</div>
          ) : savedContent.current ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Processing content, please wait...</p>
            </div>
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

      {/* Debug information - only show if enabled in settings */}
      {debugInfo && displaySettings.showDebugInfo && (
        <Card className="p-4 mt-4 bg-muted/50">
          <h3 className="text-sm font-semibold mb-2">Debug Information</h3>
          <div className="text-xs space-y-1">
            <p>Total verses: {debugInfo.totalVerses}</p>
            <p>Outline chapters: {debugInfo.outlineChapters}</p>
            <p>Processed chapters: {chapters.length}</p>
            <p>Current chapter: {currentChapter}</p>
            <p>Ignore CM tags: {debugInfo.ignoreCMTag ? "Yes" : "No"}</p>
            <p>Content processed: {contentProcessed.current ? "Yes" : "No"}</p>
            <p>Content available: {savedContent.current ? "Yes" : "No"}</p>
            <p>Tag styles loaded: {tagStyles.length}</p>
            <p>Footnotes: {footnotes.length}</p>
            <p>
              Pagination: Page {currentPage + 1} of {totalPages} ({CHAPTERS_PER_PAGE} chapters per page)
            </p>
            {currentChapterData && (
              <>
                <p>Current chapter verses: {currentChapterData.verses.length}</p>
                <p>Current chapter sections: {currentChapterData.sections?.length || 0}</p>
                <p>Storage: Using {indexedDBAvailable ? "IndexedDB" : "localStorage"}</p>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Bookmark Dialog */}
      <BookmarkDialog
        open={showBookmarkDialog}
        onOpenChange={setShowBookmarkDialog}
        currentBook={initialBook || undefined}
        currentChapter={currentChapter}
        onNavigate={handleNavigateToBookmark}
        defaultVersionId={displaySettings.defaultVersionId}
        defaultOutlineId={displaySettings.defaultOutlineId}
      />
    </div>
  )
}
