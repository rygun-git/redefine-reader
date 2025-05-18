"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"

interface BibleReaderProps {
  content: string
  chapter: number
  onChapterChange?: (chapter: number) => void
  bibleOutline?: BibleOutline
}

interface ParsedVerse {
  verseNumber: number
  text: string
  tags: {
    type: string
    content: string
    position: [number, number]
  }[]
}

interface Chapter {
  chapterNumber: number
  verses: ParsedVerse[]
}

interface BibleOutline {
  id: number
  title: string
  chapters: {
    number: number
    name: string
    sections?: {
      startVerse: number
      endVerse: number
      title: string
    }[]
  }[]
}

export function BibleReader({ content, chapter, onChapterChange, bibleOutline }: BibleReaderProps) {
  const [parsedBible, setParsedBible] = useState<Chapter[]>([])
  const [activeTab, setActiveTab] = useState<string>("read")
  const [fontSize, setFontSize] = useState<number>(16)
  const [selectedFont, setSelectedFont] = useState<string>("serif")
  const [showFootnotes, setShowFootnotes] = useState<boolean>(true)
  const [showFootnoteSection, setShowFootnoteSection] = useState<boolean>(true)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (content) {
      const chapters = parseContent(content)
      setParsedBible(chapters)
    }
  }, [content])

  // Parse the Bible content into chapters and verses with tags
  const parseContent = (content: string): Chapter[] => {
    const lines = content.split("\n")
    const chapters: Chapter[] = []
    let currentChapter = 1
    let currentVerses: ParsedVerse[] = []

    // This is a simplified parser - in a real app, you'd need more robust parsing
    lines.forEach((line, index) => {
      if (line.trim() === "") return

      // Check for chapter marker <CM>
      if (line.includes("<CM>")) {
        if (currentVerses.length > 0) {
          chapters.push({
            chapterNumber: currentChapter,
            verses: [...currentVerses],
          })
          currentChapter++
          currentVerses = []
        }

        // Process the verse before the chapter marker
        const verseLine = line.replace("<CM>", "").trim()
        if (verseLine) {
          const parsedVerse = parseVerse(verseLine, currentVerses.length + 1)
          currentVerses.push(parsedVerse)
        }
      } else {
        // Regular verse
        const parsedVerse = parseVerse(line, currentVerses.length + 1)
        currentVerses.push(parsedVerse)
      }
    })

    // Add the last chapter
    if (currentVerses.length > 0) {
      chapters.push({
        chapterNumber: currentChapter,
        verses: [...currentVerses],
      })
    }

    return chapters
  }

  // Parse a single verse line with its tags
  const parseVerse = (line: string, verseNumber: number): ParsedVerse => {
    const tags: { type: string; content: string; position: [number, number] }[] = []

    // Find all tags in the verse
    let processedLine = line

    // Process <RF>...</Rf> tags (footnotes)
    const rfRegex = /<RF>(.*?)<Rf>/g
    let rfMatch
    while ((rfMatch = rfRegex.exec(line)) !== null) {
      tags.push({
        type: "footnote",
        content: rfMatch[1],
        position: [rfMatch.index, rfMatch.index + rfMatch[0].length],
      })

      // Replace the tag with a marker for rendering
      processedLine = processedLine.replace(rfMatch[0], "")
    }

    // Process <FI>...</Fi> tags (formatting)
    const fiRegex = /<FI>(.*?)<Fi>/g
    let fiMatch
    while ((fiMatch = fiRegex.exec(line)) !== null) {
      tags.push({
        type: "emphasis",
        content: fiMatch[1],
        position: [fiMatch.index, fiMatch.index + fiMatch[0].length],
      })

      // Replace the tag with the content for rendering
      processedLine = processedLine.replace(fiMatch[0], fiMatch[1])
    }

    // Process <i>...</i> tags (italic)
    const iRegex = /<i>(.*?)<\/i>/g
    let iMatch
    while ((iMatch = iRegex.exec(line)) !== null) {
      tags.push({
        type: "italic",
        content: iMatch[1],
        position: [iMatch.index, iMatch.index + iMatch[0].length],
      })

      // Replace the tag with the content for rendering
      processedLine = processedLine.replace(iMatch[0], iMatch[1])
    }

    return {
      verseNumber,
      text: processedLine,
      tags,
    }
  }

  // Render a verse with its tags
  const renderVerse = (verse: ParsedVerse) => {
    let renderedText = verse.text

    // Apply formatting for each tag type
    if (showFootnotes) {
      verse.tags.forEach((tag) => {
        if (tag.type === "footnote") {
          // Add a footnote marker
          const footnoteIndex = verse.tags.findIndex((t) => t === tag) + 1
          renderedText += ` <sup class="text-xs cursor-pointer text-primary" title="${tag.content}">[${footnoteIndex}]</sup>`
        }
      })
    }

    // Find section title if available
    const sectionTitle = bibleOutline?.chapters
      .find((c) => c.number === chapter)
      ?.sections?.find((s) => verse.verseNumber >= s.startVerse && verse.verseNumber <= s.endVerse)?.title

    return (
      <div key={verse.verseNumber} className="mb-4">
        {sectionTitle && verse.verseNumber === sectionTitle.startVerse && (
          <h3 className="font-semibold text-lg mb-2 text-primary">{sectionTitle}</h3>
        )}
        <span className="font-bold text-sm mr-2">{verse.verseNumber}</span>
        <span
          style={{ fontSize: `${fontSize}px`, fontFamily: selectedFont }}
          dangerouslySetInnerHTML={{ __html: renderedText }}
        />
      </div>
    )
  }

  // Find the current chapter to display
  const currentChapter =
    parsedBible.find((c) => c.chapterNumber === chapter) || (parsedBible.length > 0 ? parsedBible[0] : null)

  // Handle chapter change
  const handleChapterChange = (newChapter: string) => {
    const chapterNum = Number.parseInt(newChapter, 10)
    if (onChapterChange) {
      onChapterChange(chapterNum)
    }
  }

  // Toggle theme
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="read">Read</TabsTrigger>
          <TabsTrigger value="settings">Display Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="read" className="pt-4">
          {currentChapter ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-xl font-bold">
                  {bibleOutline?.chapters.find((c) => c.number === chapter)?.name ||
                    `Chapter ${currentChapter.chapterNumber}`}
                </h2>

                <div className="flex items-center gap-2">
                  <Select value={chapter.toString()} onValueChange={handleChapterChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {parsedBible.map((c) => (
                        <SelectItem key={c.chapterNumber} value={c.chapterNumber.toString()}>
                          {bibleOutline?.chapters.find((oc) => oc.number === c.chapterNumber)?.name ||
                            `Chapter ${c.chapterNumber}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">{currentChapter.verses.map((verse) => renderVerse(verse))}</div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No content available for this chapter</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6 py-4">
            <h3 className="text-lg font-medium">Display Settings</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="font-size">Text Size: {fontSize}px</Label>
                </div>
                <Slider
                  id="font-size"
                  min={12}
                  max={32}
                  step={1}
                  value={[fontSize]}
                  onValueChange={(value) => setFontSize(value[0])}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-family">Font Family</Label>
                <Select value={selectedFont} onValueChange={setSelectedFont}>
                  <SelectTrigger id="font-family">
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serif">Serif</SelectItem>
                    <SelectItem value="sans-serif">Sans-serif</SelectItem>
                    <SelectItem value="monospace">Monospace</SelectItem>
                    <SelectItem value="Georgia, serif">Georgia</SelectItem>
                    <SelectItem value="'Times New Roman', Times, serif">Times New Roman</SelectItem>
                    <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                    <SelectItem value="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif">Segoe UI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="show-footnotes" checked={showFootnotes} onCheckedChange={setShowFootnotes} />
                <Label htmlFor="show-footnotes">Show footnote markers in text</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-footnote-section"
                  checked={showFootnoteSection}
                  onCheckedChange={setShowFootnoteSection}
                />
                <Label htmlFor="show-footnote-section">Show footnotes section</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="dark-mode" checked={theme === "dark"} onCheckedChange={toggleTheme} />
                <Label htmlFor="dark-mode">Dark Mode</Label>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Tag Styling</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Footnotes</label>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-primary mr-2"></div>
                      <span className="text-sm">Superscript numbers</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Emphasis</label>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-amber-500 mr-2"></div>
                      <span className="text-sm">Bold text</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Italic</label>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                      <span className="text-sm">Italic text</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {currentChapter && showFootnoteSection && (
        <div className="mt-6 pt-4 border-t">
          <h3 className="font-medium mb-2">Footnotes</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            {currentChapter.verses.flatMap((verse) =>
              verse.tags
                .filter((tag) => tag.type === "footnote")
                .map((tag, index) => (
                  <div key={`${verse.verseNumber}-${index}`} className="flex">
                    <span className="font-bold mr-2">
                      {verse.verseNumber}:{index + 1}
                    </span>
                    <span>{tag.content}</span>
                  </div>
                )),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
