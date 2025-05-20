"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Plus, Trash2, Save } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface BookGroup {
  name: string
  books: string[]
}

interface TagDefinition {
  id?: number
  name: string
  open_tag: string
  close_tag: string
  description: string
  css_class: string
  ignored: boolean
}

const BOOK_GROUPS: BookGroup[] = [
  {
    name: "Torah/Pentateuch",
    books: ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"],
  },
  {
    name: "Historical Books",
    books: [
      "Joshua",
      "Judges",
      "Ruth",
      "1 Samuel",
      "2 Samuel",
      "1 Kings",
      "2 Kings",
      "1 Chronicles",
      "2 Chronicles",
      "Ezra",
      "Nehemiah",
      "Esther",
    ],
  },
  {
    name: "Wisdom Literature",
    books: ["Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon"],
  },
  {
    name: "Major Prophets",
    books: ["Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel"],
  },
  {
    name: "Minor Prophets",
    books: [
      "Hosea",
      "Joel",
      "Amos",
      "Obadiah",
      "Jonah",
      "Micah",
      "Nahum",
      "Habakkuk",
      "Zephaniah",
      "Haggai",
      "Zechariah",
      "Malachi",
    ],
  },
  {
    name: "Gospels",
    books: ["Matthew", "Mark", "Luke", "John"],
  },
  {
    name: "Acts",
    books: ["Acts"],
  },
  {
    name: "Pauline Epistles",
    books: [
      "Romans",
      "1 Corinthians",
      "2 Corinthians",
      "Galatians",
      "Ephesians",
      "Philippians",
      "Colossians",
      "1 Thessalonians",
      "2 Thessalonians",
      "1 Timothy",
      "2 Timothy",
      "Titus",
      "Philemon",
    ],
  },
  {
    name: "General Epistles",
    books: ["Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude"],
  },
  {
    name: "Apocalyptic",
    books: ["Revelation"],
  },
]

export function TagEditor() {
  const [activeTab, setActiveTab] = useState("editor")
  const [text, setText] = useState("In the beginning God created the skies and the earth.")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd, setSelectionEnd] = useState(0)
  const [tagStyles, setTagStyles] = useState<TagDefinition[]>([])
  const [newTag, setNewTag] = useState<TagDefinition>({
    name: "",
    open_tag: "",
    close_tag: "",
    description: "",
    css_class: "",
    ignored: false,
  })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load tags from database on component mount
  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase.from("bible_tags").select("*").order("name", { ascending: true })

      if (error) throw error

      if (data) {
        // Convert database field names to camelCase for component use
        const formattedTags = data.map((tag) => ({
          id: tag.id,
          name: tag.name,
          open_tag: tag.open_tag,
          close_tag: tag.close_tag || "",
          description: tag.description || "",
          css_class: tag.css_class || "",
          ignored: tag.ignored || false,
        }))
        setTagStyles(formattedTags)
      }
    } catch (err) {
      console.error("Error fetching tags:", err)
      setError("Failed to load tag styles")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveStyles = async () => {
    setSaving(true)
    try {
      // For each tag, upsert to the database
      for (const tag of tagStyles) {
        if (tag.id) {
          // Update existing tag
          const { error } = await supabase
            .from("bible_tags")
            .update({
              name: tag.name,
              open_tag: tag.open_tag,
              close_tag: tag.close_tag,
              description: tag.description,
              css_class: tag.css_class,
              ignored: tag.ignored,
              updated_at: new Date().toISOString(),
            })
            .eq("id", tag.id)

          if (error) throw error
        } else {
          // Insert new tag
          const { error } = await supabase.from("bible_tags").insert({
            name: tag.name,
            open_tag: tag.open_tag,
            close_tag: tag.close_tag,
            description: tag.description,
            css_class: tag.css_class,
            ignored: tag.ignored,
          })

          if (error) throw error
        }
      }

      // Also save to localStorage for backward compatibility
      localStorage.setItem("bibleReaderTagStyles", JSON.stringify(tagStyles))

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      console.error("Error saving tags:", e)
      setError("Failed to save tag styles")
      setTimeout(() => setError(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleAddTag = async () => {
    if (!newTag.name || !newTag.open_tag) {
      setError("Tag name and opening tag are required")
      setTimeout(() => setError(null), 3000)
      return
    }

    try {
      // Insert new tag into database
      const { data, error } = await supabase
        .from("bible_tags")
        .insert({
          name: newTag.name,
          open_tag: newTag.open_tag,
          close_tag: newTag.close_tag,
          description: newTag.description,
          css_class: newTag.css_class,
          ignored: newTag.ignored,
        })
        .select()

      if (error) throw error

      if (data && data[0]) {
        // Add the new tag with its ID to the state
        setTagStyles([
          ...tagStyles,
          {
            id: data[0].id,
            name: data[0].name,
            open_tag: data[0].open_tag,
            close_tag: data[0].close_tag || "",
            description: data[0].description || "",
            css_class: data[0].css_class || "",
            ignored: data[0].ignored || false,
          },
        ])
      }

      // Reset form
      setNewTag({
        name: "",
        open_tag: "",
        close_tag: "",
        description: "",
        css_class: "",
        ignored: false,
      })
    } catch (err) {
      console.error("Error adding tag:", err)
      setError("Failed to add new tag")
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleRemoveTag = async (index: number) => {
    const tagToRemove = tagStyles[index]

    try {
      if (tagToRemove.id) {
        // Delete from database if it exists there
        const { error } = await supabase.from("bible_tags").delete().eq("id", tagToRemove.id)

        if (error) throw error
      }

      // Remove from state
      setTagStyles(tagStyles.filter((_, i) => i !== index))
    } catch (err) {
      console.error("Error removing tag:", err)
      setError("Failed to remove tag")
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleUpdateTag = (index: number, field: keyof TagDefinition, value: any) => {
    const updatedStyles = [...tagStyles]
    updatedStyles[index] = {
      ...updatedStyles[index],
      [field]: value,
    }
    setTagStyles(updatedStyles)
  }

  const handleNewTagChange = (field: keyof TagDefinition, value: any) => {
    setNewTag({
      ...newTag,
      [field]: value,
    })
  }

  const handleTextSelect = (e: React.MouseEvent<HTMLTextAreaElement> | React.TouchEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement
    setSelectionStart(target.selectionStart)
    setSelectionEnd(target.selectionEnd)
  }

  const applyTag = () => {
    if (!selectedTag) return

    const tag = tagStyles.find((t) => t.name === selectedTag)
    if (!tag) return

    const before = text.substring(0, selectionStart)
    const selected = text.substring(selectionStart, selectionEnd)
    const after = text.substring(selectionEnd)

    setText(`${before}${tag.open_tag}${selected}${tag.close_tag}${after}`)
  }

  const getBookGroup = (bookName: string): string => {
    for (const group of BOOK_GROUPS) {
      if (group.books.includes(bookName)) {
        return group.name
      }
    }
    return "Other"
  }

  const renderPreview = () => {
    let previewText = text

    // Process each tag type
    tagStyles.forEach((tag) => {
      if (tag.ignored) return

      // Create a regex to find all instances of this tag
      const regex = new RegExp(`${escapeRegExp(tag.open_tag)}(.*?)${escapeRegExp(tag.close_tag)}`, "g")

      // Special case for tags without closing tags
      if (tag.close_tag === "") {
        previewText = previewText.replace(
          new RegExp(escapeRegExp(tag.open_tag), "g"),
          `<span class="${tag.css_class}">${tag.open_tag}</span>`,
        )
      } else {
        // Replace with styled spans
        previewText = previewText.replace(regex, `<span class="${tag.css_class}">$1</span>`)
      }
    })

    // Process book groups
    BOOK_GROUPS.forEach((group) => {
      group.books.forEach((book) => {
        const bookRegex = new RegExp(`\\b${book}\\b`, "g")
        previewText = previewText.replace(bookRegex, `<span title="${group.name}">${book}</span>`)
      })
    })

    return previewText
  }

  // Helper function to escape special regex characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }

  if (loading) {
    return <div className="text-center py-4">Loading tag definitions...</div>
  }

  return (
    <div className="space-y-4">
      {success && (
        <Alert className="mb-4">
          <AlertDescription>Tag styles saved successfully!</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="editor">Text Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="tags">Manage Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text-content">Bible Text</Label>
            <Textarea
              id="text-content"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onMouseUp={handleTextSelect}
              onTouchEnd={handleTextSelect}
              rows={6}
              className="font-mono"
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="tag-select">Apply Tag</Label>
              <Select value={selectedTag || ""} onValueChange={setSelectedTag}>
                <SelectTrigger id="tag-select">
                  <SelectValue placeholder="Select a tag" />
                </SelectTrigger>
                <SelectContent>
                  {tagStyles.map((tag) => (
                    <SelectItem key={tag.name} value={tag.name}>
                      {tag.name} ({tag.open_tag}...{tag.close_tag})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={applyTag} disabled={!selectedTag || selectionStart === selectionEnd}>
              Apply Tag
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Select text and choose a tag to apply formatting.</p>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How your text will appear with formatting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: renderPreview() }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="space-y-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add New Tag Style</CardTitle>
              <CardDescription>Define a new tag and how it should be styled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tag-name">Tag Name</Label>
                  <Input
                    id="tag-name"
                    value={newTag.name}
                    onChange={(e) => handleNewTagChange("name", e.target.value)}
                    placeholder="e.g., Footnote"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tag-description">Description</Label>
                  <Input
                    id="tag-description"
                    value={newTag.description}
                    onChange={(e) => handleNewTagChange("description", e.target.value)}
                    placeholder="e.g., Reference footnote"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tag-open">Opening Tag</Label>
                  <Input
                    id="tag-open"
                    value={newTag.open_tag}
                    onChange={(e) => handleNewTagChange("open_tag", e.target.value)}
                    placeholder="e.g., <RF>"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tag-close">Closing Tag</Label>
                  <Input
                    id="tag-close"
                    value={newTag.close_tag}
                    onChange={(e) => handleNewTagChange("close_tag", e.target.value)}
                    placeholder="e.g., <Rf>"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for self-closing tags</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tag-css">CSS Class</Label>
                  <Input
                    id="tag-css"
                    value={newTag.css_class}
                    onChange={(e) => handleNewTagChange("css_class", e.target.value)}
                    placeholder="e.g., text-blue-500 italic"
                  />
                  <p className="text-xs text-muted-foreground">Tailwind classes to apply to this tag</p>
                </div>

                <div className="md:col-span-2 flex items-center space-x-2">
                  <Checkbox
                    id="tag-ignored"
                    checked={newTag.ignored}
                    onCheckedChange={(checked) => handleNewTagChange("ignored", checked)}
                  />
                  <Label htmlFor="tag-ignored">Ignore this tag (don't process it)</Label>
                </div>

                <div className="md:col-span-2">
                  <Button onClick={handleAddTag} disabled={!newTag.name || !newTag.open_tag}>
                    <Plus className="h-4 w-4 mr-2" /> Add Tag
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Tag Styles</CardTitle>
              <CardDescription>Edit your tag styles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {tagStyles.map((tag, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-4 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`tag-name-${index}`}>Tag Name</Label>
                            <Input
                              id={`tag-name-${index}`}
                              value={tag.name}
                              onChange={(e) => handleUpdateTag(index, "name", e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`tag-description-${index}`}>Description</Label>
                            <Input
                              id={`tag-description-${index}`}
                              value={tag.description}
                              onChange={(e) => handleUpdateTag(index, "description", e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`tag-open-${index}`}>Opening Tag</Label>
                            <Input
                              id={`tag-open-${index}`}
                              value={tag.open_tag}
                              onChange={(e) => handleUpdateTag(index, "open_tag", e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`tag-close-${index}`}>Closing Tag</Label>
                            <Input
                              id={`tag-close-${index}`}
                              value={tag.close_tag}
                              onChange={(e) => handleUpdateTag(index, "close_tag", e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`tag-css-${index}`}>CSS Class</Label>
                            <Input
                              id={`tag-css-${index}`}
                              value={tag.css_class}
                              onChange={(e) => handleUpdateTag(index, "css_class", e.target.value)}
                            />
                          </div>

                          <div className="md:col-span-2 flex items-center space-x-2">
                            <Checkbox
                              id={`tag-ignored-${index}`}
                              checked={tag.ignored}
                              onCheckedChange={(checked) => handleUpdateTag(index, "ignored", checked)}
                            />
                            <Label htmlFor={`tag-ignored-${index}`}>Ignore this tag (don't process it)</Label>
                          </div>
                        </div>

                        <div className="border p-3 rounded-md">
                          <h4 className="text-sm font-medium mb-2">Example</h4>
                          <div className={tag.css_class}>This is how text with the {tag.name} tag will appear</div>
                        </div>
                      </div>

                      <div className="flex md:flex-col justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleRemoveTag(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveStyles} disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save All Tag Styles"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
