"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"

interface TagStyle {
  name: string
  openTag: string
  closeTag: string
  description: string
  cssClass: string
  ignored: boolean
}

export default function TagStylingPage() {
  const [tagStyles, setTagStyles] = useState<TagStyle[]>([
    {
      name: "Footnote",
      openTag: "<RF>",
      closeTag: "<Rf>",
      description: "Reference footnote",
      cssClass: "text-primary text-sm",
      ignored: false,
    },
    {
      name: "Emphasis",
      openTag: "<FI>",
      closeTag: "<Fi>",
      description: "Emphasized text",
      cssClass: "font-bold",
      ignored: false,
    },
    {
      name: "Italic",
      openTag: "<i>",
      closeTag: "</i>",
      description: "Italic text",
      cssClass: "italic",
      ignored: false,
    },
    {
      name: "Chapter Marker",
      openTag: "<CM>",
      closeTag: "",
      description: "Marks the end of a chapter",
      cssClass: "border-t pt-4 mt-4 block",
      ignored: false,
    },
    {
      name: "Citation",
      openTag: "<CI>",
      closeTag: "<Ci>",
      description: "Citation text",
      cssClass: "italic text-muted-foreground",
      ignored: false,
    },
    {
      name: "Footnote Origin",
      openTag: "<FO>",
      closeTag: "<Fo>",
      description: "Footnote origin",
      cssClass: "text-primary",
      ignored: false,
    },
    {
      name: "Footnote Reference",
      openTag: "<FR>",
      closeTag: "<Fr>",
      description: "Footnote reference",
      cssClass: "text-primary font-medium",
      ignored: false,
    },
    {
      name: "Hebrew Text",
      openTag: "<HEB>",
      closeTag: "<heb>",
      description: "Hebrew text",
      cssClass: "font-serif text-right",
      ignored: false,
    },
    {
      name: "Paragraph Indent 1",
      openTag: "<PI1>",
      closeTag: "",
      description: "Paragraph indent level 1",
      cssClass: "pl-4",
      ignored: false,
    },
    {
      name: "Bold",
      openTag: "<b>",
      closeTag: "</b>",
      description: "Bold text",
      cssClass: "font-bold",
      ignored: false,
    },
    {
      name: "Line Break",
      openTag: "<br>",
      closeTag: "",
      description: "Line break",
      cssClass: "block my-2",
      ignored: false,
    },
    {
      name: "Font",
      openTag: "<font",
      closeTag: "</font>",
      description: "Font styling",
      cssClass: "",
      ignored: false,
    },
    {
      name: "Paragraph",
      openTag: "<p>",
      closeTag: "</p>",
      description: "Paragraph",
      cssClass: "block my-4",
      ignored: false,
    },
  ])

  const [newTag, setNewTag] = useState<TagStyle>({
    name: "",
    openTag: "",
    closeTag: "",
    description: "",
    cssClass: "",
    ignored: false,
  })

  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load saved tag styles from localStorage on component mount
  useEffect(() => {
    const savedStyles = localStorage.getItem("bibleReaderTagStyles")
    if (savedStyles) {
      try {
        const parsedStyles = JSON.parse(savedStyles)
        setTagStyles(parsedStyles)
      } catch (e) {
        console.error("Error parsing saved tag styles:", e)
      }
    }
  }, [])

  const handleSaveStyles = () => {
    try {
      localStorage.setItem("bibleReaderTagStyles", JSON.stringify(tagStyles))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError("Failed to save tag styles")
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleAddTag = () => {
    if (!newTag.name || !newTag.openTag) {
      setError("Tag name and opening tag are required")
      setTimeout(() => setError(null), 3000)
      return
    }

    setTagStyles([...tagStyles, newTag])
    setNewTag({
      name: "",
      openTag: "",
      closeTag: "",
      description: "",
      cssClass: "",
      ignored: false,
    })
  }

  const handleRemoveTag = (index: number) => {
    setTagStyles(tagStyles.filter((_, i) => i !== index))
  }

  const handleUpdateTag = (index: number, field: keyof TagStyle, value: any) => {
    const updatedStyles = [...tagStyles]
    updatedStyles[index] = {
      ...updatedStyles[index],
      [field]: value,
    }
    setTagStyles(updatedStyles)
  }

  const handleNewTagChange = (field: keyof TagStyle, value: any) => {
    setNewTag({
      ...newTag,
      [field]: value,
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tag Styling Editor</h1>
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Settings
          </Button>
        </Link>
      </div>

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
                value={newTag.openTag}
                onChange={(e) => handleNewTagChange("openTag", e.target.value)}
                placeholder="e.g., <RF>"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tag-close">Closing Tag</Label>
              <Input
                id="tag-close"
                value={newTag.closeTag}
                onChange={(e) => handleNewTagChange("closeTag", e.target.value)}
                placeholder="e.g., <Rf>"
              />
              <p className="text-xs text-muted-foreground">Leave empty for self-closing tags</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tag-css">CSS Class</Label>
              <Input
                id="tag-css"
                value={newTag.cssClass}
                onChange={(e) => handleNewTagChange("cssClass", e.target.value)}
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
              <Button onClick={handleAddTag} disabled={!newTag.name || !newTag.openTag}>
                <Plus className="h-4 w-4 mr-2" /> Add Tag
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Tag Styles</CardTitle>
          <CardDescription>Edit and preview your tag styles</CardDescription>
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
                          value={tag.openTag}
                          onChange={(e) => handleUpdateTag(index, "openTag", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`tag-close-${index}`}>Closing Tag</Label>
                        <Input
                          id={`tag-close-${index}`}
                          value={tag.closeTag}
                          onChange={(e) => handleUpdateTag(index, "closeTag", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`tag-css-${index}`}>CSS Class</Label>
                        <Input
                          id={`tag-css-${index}`}
                          value={tag.cssClass}
                          onChange={(e) => handleUpdateTag(index, "cssClass", e.target.value)}
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
                      <h4 className="text-sm font-medium mb-2">Preview</h4>
                      <div className={tag.cssClass}>This is how text with the {tag.name} tag will appear</div>
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
          <Button onClick={handleSaveStyles} className="w-full">
            <Save className="h-4 w-4 mr-2" /> Save All Tag Styles
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
