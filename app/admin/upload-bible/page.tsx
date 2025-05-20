"use client"

import { useState, useRef, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Upload } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function UploadBiblePage() {
  const [title, setTitle] = useState("")
  const [language, setLanguage] = useState("english")
  const [description, setDescription] = useState("")
  const [defaultFont, setDefaultFont] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState("")
  const [uploadMethod, setUploadMethod] = useState<"file" | "url">("file")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [infoContent, setInfoContent] = useState<string | null>(null)
  const [availableFonts, setAvailableFonts] = useState<any[]>([])
  const [validatingUrl, setValidatingUrl] = useState(false)
  const [urlValidated, setUrlValidated] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load fonts when language changes
  const loadFontsForLanguage = async (lang: string) => {
    try {
      const { data, error } = await supabase
        .from("fonts")
        .select("*")
        .eq("language", lang)
        .order("name", { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        setAvailableFonts(data)
        // Set default font if available
        const defaultFont = data.find((font) => font.is_default)
        if (defaultFont) {
          setDefaultFont(defaultFont.id.toString())
        } else if (data.length > 0) {
          setDefaultFont(data[0].id.toString())
        }
      } else {
        setAvailableFonts([])
        setDefaultFont("")
      }
    } catch (err) {
      console.error("Error loading fonts:", err)
      setAvailableFonts([])
    }
  }

  // Handle language change
  const handleLanguageChange = (value: string) => {
    setLanguage(value)
    loadFontsForLanguage(value)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)

      // Read file content for preview
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        setFileContent(content)

        // Extract info content (everything past line 311103)
        const lines = content.split("\n")
        if (lines.length > 311103) {
          const info = lines.slice(311103).join("\n")
          setInfoContent(info)
        } else {
          setInfoContent(null)
        }
      }
      reader.readAsText(selectedFile)
    }
  }

  const validateFileUrl = async () => {
    if (!fileUrl.trim()) {
      setError("Please enter a valid URL")
      return false
    }

    if (!fileUrl.endsWith(".txt")) {
      setError("The URL must point to a .txt file")
      return false
    }

    setValidatingUrl(true)
    setError(null)

    try {
      const response = await fetch(fileUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
      }

      const content = await response.text()

      if (!content || content.trim().length === 0) {
        throw new Error("The file is empty")
      }

      // Preview the content
      setFileContent(content)

      // Extract info content (everything past line 311103)
      const lines = content.split("\n")
      if (lines.length > 311103) {
        const info = lines.slice(311103).join("\n")
        setInfoContent(info)
      } else {
        setInfoContent(null)
      }

      setUrlValidated(true)
      return true
    } catch (err) {
      console.error("Error validating URL:", err)
      setError(`Error validating URL: ${err instanceof Error ? err.message : String(err)}`)
      setUrlValidated(false)
      return false
    } finally {
      setValidatingUrl(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!title || !language) {
      setError("Please fill in all required fields")
      return
    }

    if (uploadMethod === "file" && !file) {
      setError("Please select a file to upload")
      return
    }

    if (uploadMethod === "url") {
      if (!fileUrl.trim()) {
        setError("Please enter a valid URL")
        return
      }

      // Validate URL if not already validated
      if (!urlValidated) {
        const isValid = await validateFileUrl()
        if (!isValid) return
      }
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      let mainContent = ""
      let info = null

      if (uploadMethod === "file" && file) {
        // Read file content
        const reader = new FileReader()
        const content = await new Promise<string>((resolve, reject) => {
          reader.onload = (event) => resolve(event.target?.result as string)
          reader.onerror = reject
          reader.readAsText(file)
        })

        // Split content into main content and info
        const lines = content.split("\n")

        if (lines.length > 311103) {
          mainContent = lines.slice(0, 311103).join("\n")
          info = lines.slice(311103).join("\n")
        } else {
          mainContent = content
        }
      }

      // Insert into database
      const { data, error } = await supabase
        .from("bible_versions")
        .insert([
          {
            title,
            language,
            description: description || null,
            content: uploadMethod === "file" ? mainContent : null,
            file_url: uploadMethod === "url" ? fileUrl : null,
            info: info || null,
            default_font: defaultFont || null,
          },
        ])
        .select()

      if (error) {
        throw error
      }

      setSuccess(`Bible "${title}" uploaded successfully!`)

      // Reset form
      setTitle("")
      setLanguage("english")
      setDescription("")
      setDefaultFont("")
      setFile(null)
      setFileUrl("")
      setFileContent(null)
      setInfoContent(null)
      setUrlValidated(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err: any) {
      console.error("Error uploading Bible:", err)
      setError(err.message || "Failed to upload Bible")
    } finally {
      setUploading(false)
    }
  }

  // Load fonts when component mounts
  useState(() => {
    loadFontsForLanguage(language)
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Upload Bible</h1>
        <Link href="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload a New Bible Version</CardTitle>
          <CardDescription>
            Upload a Bible version by providing a text file or a direct URL to a text file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., King James Version"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
              <Select value={language} onValueChange={handleLanguageChange} required>
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

            <div className="space-y-2">
              <Label htmlFor="default-font">Default Font</Label>
              <Select value={defaultFont} onValueChange={setDefaultFont}>
                <SelectTrigger>
                  <SelectValue placeholder="Select default font" />
                </SelectTrigger>
                <SelectContent>
                  {availableFonts.length === 0 ? (
                    <SelectItem value="none">No fonts available</SelectItem>
                  ) : (
                    availableFonts.map((font) => (
                      <SelectItem key={font.id} value={font.id.toString()}>
                        {font.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select a default font for this Bible version. You can manage fonts in the Font Manager.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of this Bible version"
                rows={3}
              />
            </div>

            <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as "file" | "url")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">Upload File</TabsTrigger>
                <TabsTrigger value="url">Provide URL</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Bible File *</Label>
                  <Input
                    id="file"
                    ref={fileInputRef}
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    required={uploadMethod === "file"}
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload a text file with one verse per line. Everything past line 311103 will be stored as version
                    info.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-url">Bible File URL *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="file-url"
                      type="url"
                      value={fileUrl}
                      onChange={(e) => {
                        setFileUrl(e.target.value)
                        setUrlValidated(false)
                      }}
                      placeholder="https://example.com/bible.txt"
                      required={uploadMethod === "url"}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={validateFileUrl}
                      disabled={validatingUrl || !fileUrl.trim()}
                    >
                      {validatingUrl ? "Validating..." : "Validate"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Provide a direct URL to a .txt file containing the Bible text. The file should have one verse per
                    line.
                  </p>
                  {urlValidated && (
                    <Alert className="mt-2">
                      <AlertDescription className="text-green-600">URL validated successfully!</AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {fileContent && (
              <div className="space-y-2 border p-4 rounded-md">
                <Label>File Preview (first 10 lines)</Label>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {fileContent.split("\n").slice(0, 10).join("\n")}
                </pre>
              </div>
            )}

            {infoContent && (
              <div className="space-y-2 border p-4 rounded-md">
                <Label>Info Content Preview (first 10 lines)</Label>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {infoContent.split("\n").slice(0, 10).join("\n")}
                </pre>
                <p className="text-sm text-muted-foreground">
                  This content (lines after 311103) will be stored in the info field and accessible via the info button
                  in the reader.
                </p>
              </div>
            )}

            {error && <p className="text-destructive">{error}</p>}
            {success && <p className="text-green-600">{success}</p>}

            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? "Uploading..." : "Upload Bible"}
              {!uploading && <Upload className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
