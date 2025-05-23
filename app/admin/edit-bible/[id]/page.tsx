"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { Loader2, Save, ArrowLeft, LinkIcon, Check, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getFontsForLanguage } from "@/lib/fonts"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface EditBibleProps {
  params: {
    id: string
  }
}

export default function EditBiblePage({ params }: EditBibleProps) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()

  const [bible, setBible] = useState({
    title: "",
    language: "english",
    description: "",
    default_font: "",
    file_url: "",
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availableFonts, setAvailableFonts] = useState<{ id: string; name: string; cssName: string }[]>([])
  const [previewText, setPreviewText] = useState("Sample text for font preview")
  const [selectedFontCss, setSelectedFontCss] = useState("")
  const [validatingUrl, setValidatingUrl] = useState(false)
  const [urlValidated, setUrlValidated] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  // Fetch Bible details
  useEffect(() => {
    const fetchBible = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("bible_versions")
          .select("title, language, description, default_font, file_url")
          .eq("id", id)
          .single()

        if (error) throw error

        if (data) {
          setBible({
            title: data.title || "",
            language: data.language || "english",
            description: data.description || "",
            default_font: data.default_font || "",
            file_url: data.file_url || "",
          })

          // If there's a file URL, mark it as validated
          if (data.file_url) {
            setUrlValidated(true)
          }

          // Load fonts for this language
          loadFontsForLanguage(data.language || "english")

          // Set preview text based on language
          setPreviewTextForLanguage(data.language || "english")
        }
      } catch (err) {
        console.error("Error fetching Bible:", err)
        toast({
          title: "Error",
          description: "Failed to load Bible details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBible()
  }, [id, toast])

  // Load fonts when language changes
  const loadFontsForLanguage = async (language: string) => {
    try {
      // First try to get fonts from the database
      const { data, error } = await supabase
        .from("fonts")
        .select("id, name, css_name")
        .eq("language", language)
        .order("name", { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        // Convert snake_case to camelCase
        const fonts = data.map((font) => ({
          id: font.id.toString(),
          name: font.name,
          cssName: font.css_name,
        }))
        setAvailableFonts(fonts)

        // Set selected font CSS if we have a default font
        if (bible.default_font) {
          const selectedFont = fonts.find((font) => font.id === bible.default_font)
          if (selectedFont) {
            setSelectedFontCss(selectedFont.cssName)
          }
        }
      } else {
        // Fallback to predefined fonts
        const defaultFonts = getFontsForLanguage(language)
        setAvailableFonts(
          defaultFonts.map((font) => ({
            id: font.id,
            name: font.name,
            cssName: font.cssName,
          })),
        )
      }
    } catch (err) {
      console.error("Error loading fonts:", err)
      // Fallback to predefined fonts
      const defaultFonts = getFontsForLanguage(language)
      setAvailableFonts(
        defaultFonts.map((font) => ({
          id: font.id,
          name: font.name,
          cssName: font.cssName,
        })),
      )
    }
  }

  // Set preview text based on language
  const setPreviewTextForLanguage = (language: string) => {
    switch (language.toLowerCase()) {
      case "hebrew":
        setPreviewText("בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ")
        break
      case "greek":
        setPreviewText("Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν")
        break
      case "english":
      default:
        setPreviewText("In the beginning God created the heaven and the earth.")
        break
    }
  }

  // Handle language change
  const handleLanguageChange = (value: string) => {
    setBible({ ...bible, language: value, default_font: "" })
    loadFontsForLanguage(value)
    setPreviewTextForLanguage(value)
    setSelectedFontCss("")
  }

  // Handle font change
  const handleFontChange = (value: string) => {
    setBible({ ...bible, default_font: value })

    // Update the preview with the selected font
    const selectedFont = availableFonts.find((font) => font.id === value)
    if (selectedFont) {
      setSelectedFontCss(selectedFont.cssName)
    }
  }

  // Validate file URL
  const validateFileUrl = async () => {
    if (!bible.file_url.trim()) {
      setUrlError("Please enter a valid URL")
      return
    }

    if (!bible.file_url.endsWith(".txt")) {
      setUrlError("The URL must point to a .txt file")
      return
    }

    setValidatingUrl(true)
    setUrlError(null)

    try {
      const response = await fetch(bible.file_url)

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
      }

      const content = await response.text()

      if (!content || content.trim().length === 0) {
        throw new Error("The file is empty")
      }

      setUrlValidated(true)
      toast({
        title: "URL Validated",
        description: "The file URL is valid and accessible.",
      })
    } catch (err) {
      console.error("Error validating URL:", err)
      setUrlError(`Error validating URL: ${err instanceof Error ? err.message : String(err)}`)
      setUrlValidated(false)
    } finally {
      setValidatingUrl(false)
    }
  }

  // Save Bible changes
  const saveBible = async () => {
    try {
      setSaving(true)

      // Validate URL if provided and not already validated
      if (bible.file_url && !urlValidated) {
        await validateFileUrl()
        if (!urlValidated) {
          setSaving(false)
          return
        }
      }

      const { error } = await supabase
        .from("bible_versions")
        .update({
          title: bible.title,
          language: bible.language,
          description: bible.description,
          default_font: bible.default_font || null,
          file_url: bible.file_url || null,
        })
        .eq("id", id)

      if (error) throw error

      toast({
        title: "Bible updated",
        description: "Bible details have been updated successfully",
      })

      router.push("/admin/manage-bibles")
    } catch (err) {
      console.error("Error updating Bible:", err)
      toast({
        title: "Error",
        description: "Failed to update Bible details",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading Bible details...</span>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Button variant="outline" onClick={() => router.push("/admin/manage-bibles")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Bible Management
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Bible</CardTitle>
          <CardDescription>Update the details for this Bible version</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={bible.title} onChange={(e) => setBible({ ...bible, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={bible.language} onValueChange={handleLanguageChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hebrew">Hebrew</SelectItem>
                    <SelectItem value="greek">Greek</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={bible.description}
                onChange={(e) => setBible({ ...bible, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-url">Bible File URL</Label>
              <div className="flex gap-2">
                <Input
                  id="file-url"
                  type="url"
                  value={bible.file_url}
                  onChange={(e) => {
                    setBible({ ...bible, file_url: e.target.value })
                    setUrlValidated(false)
                  }}
                  placeholder="https://example.com/bible.txt"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={validateFileUrl}
                  disabled={validatingUrl || !bible.file_url.trim()}
                >
                  {validatingUrl ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validating
                    </>
                  ) : (
                    <>
                      <LinkIcon className="mr-2 h-4 w-4" /> Validate
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Provide a direct URL to a .txt file containing the Bible text. The file should have one verse per line.
              </p>

              {urlValidated && (
                <Alert className="mt-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">URL validated successfully!</AlertDescription>
                </Alert>
              )}

              {urlError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{urlError}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-font">Default Font</Label>
              <Select value={bible.default_font} onValueChange={handleFontChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a default font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No default font</SelectItem>
                  {availableFonts.map((font) => (
                    <SelectItem key={font.id} value={font.id}>
                      {font.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedFontCss && (
              <div className="p-4 border rounded-md">
                <h4 className="text-sm font-medium mb-2">Font Preview</h4>
                <p
                  style={{ fontFamily: selectedFontCss }}
                  className="text-lg"
                  dir={bible.language === "hebrew" ? "rtl" : "ltr"}
                >
                  {previewText}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={saveBible} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
