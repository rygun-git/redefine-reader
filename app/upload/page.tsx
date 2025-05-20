"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Home } from "lucide-react"

// Initialize Supabase client
const supabaseClient = createClient(
  "https://rzynttoonxzglpyawbgz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6eW50dG9vbnh6Z2xweWF3Ymd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMjk4ODYsImV4cCI6MjA2MTgwNTg4Nn0.Hfw3LODJUp7epk0QOWux9PZ134QB3jeh_VhDH7aUMh8",
)

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [bibleTitle, setBibleTitle] = useState("")
  const [language, setLanguage] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !bibleTitle || !language) {
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Read the file content
      const fileContent = await file.text()

      // Store the Bible metadata and content in the database
      const { data, error: dbError } = await supabaseClient
        .from("bible_versions")
        .insert([
          {
            title: bibleTitle,
            language,
            description,
            content: fileContent,
          },
        ])
        .select()

      if (dbError) throw dbError

      setSuccess(true)
      setTimeout(() => {
        router.push("/read")
      }, 2000)
    } catch (err) {
      console.error("Error uploading Bible:", err)
      setError("Failed to upload Bible. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Upload Bible Version</h1>
        <Link href="/">
          <Button variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link href="/upload/bible-outline">
            <Button variant="outline">Create Bible Outline</Button>
          </Link>
        </div>
        <div>
          <Link href="/read">
            <Button variant="ghost">Go to Reader</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Bible Version</CardTitle>
          <CardDescription>Upload a new Bible version to your library</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Bible Title</Label>
              <Input
                id="title"
                value={bibleTitle}
                onChange={(e) => setBibleTitle(e.target.value)}
                placeholder="e.g., LLV Version"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g., English"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this Bible version"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Bible Text File</Label>
              <Input id="file" type="file" accept=".txt" onChange={handleFileChange} required />
              <p className="text-sm text-muted-foreground">Upload a text file with one verse per line</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>Bible version uploaded successfully!</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} disabled={loading || !file || !bibleTitle || !language} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Bible Version"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
