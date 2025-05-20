"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Download, Edit, FileEdit, Trash2, Upload } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface BibleVersion {
  id: number
  title: string
  language: string
  description: string | null
  content?: string
  created_at: string
}

export default function ManageBiblesPage() {
  const [bibleVersions, setBibleVersions] = useState<BibleVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)
  const [downloadLoading, setDownloadLoading] = useState<number | null>(null)

  useEffect(() => {
    fetchBibleVersions()
  }, [])

  const fetchBibleVersions = async () => {
    try {
      const { data, error } = await supabase
        .from("bible_versions")
        .select("id, title, language, description, created_at")
        .order("created_at", { ascending: false })

      if (error) throw error

      setBibleVersions(data || [])
    } catch (err) {
      console.error("Error fetching Bible versions:", err)
      setError("Failed to load Bible versions")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVersion = async (id: number) => {
    if (!confirm("Are you sure you want to delete this Bible version? This action cannot be undone.")) return

    setDeleteLoading(id)
    try {
      const { error } = await supabase.from("bible_versions").delete().eq("id", id)

      if (error) throw error

      // Refresh the list
      fetchBibleVersions()
    } catch (err) {
      console.error("Error deleting Bible version:", err)
      setError("Failed to delete Bible version")
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleDownloadVersion = async (id: number) => {
    setDownloadLoading(id)
    try {
      // Fetch the full content
      const { data, error } = await supabase.from("bible_versions").select("title, content").eq("id", id).single()

      if (error) throw error
      if (!data || !data.content) throw new Error("No content found")

      // Create a blob and download link
      const blob = new Blob([data.content], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${data.title.replace(/\s+/g, "_")}.txt`
      document.body.appendChild(a)
      a.click()

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
    } catch (err) {
      console.error("Error downloading Bible version:", err)
      setError("Failed to download Bible version")
    } finally {
      setDownloadLoading(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Bible Versions</h1>
        <div className="flex gap-2">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
            </Button>
          </Link>
          <Link href="/admin/upload-bible">
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" /> Upload New Version
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bible Versions</CardTitle>
          <CardDescription>Manage your uploaded Bible versions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : bibleVersions.length === 0 ? (
            <div className="text-center py-8 border rounded-md">
              <p className="text-muted-foreground">No Bible versions found. Upload one to get started.</p>
              <Link href="/admin/upload-bible" className="mt-4 inline-block">
                <Button>
                  <Upload className="h-4 w-4 mr-2" /> Upload Bible Version
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bibleVersions.map((version) => (
                <Card key={version.id} className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="font-medium">{version.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {version.language} • Added on {new Date(version.created_at).toLocaleDateString()}
                      </p>
                      {version.description && <p className="text-sm mt-1">{version.description}</p>}
                    </div>
                    <div className="flex gap-2 self-end sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadVersion(version.id)}
                        disabled={downloadLoading === version.id}
                      >
                        {downloadLoading === version.id ? (
                          <span className="animate-pulse">Downloading...</span>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" /> Download
                          </>
                        )}
                      </Button>
                      <Link href={`/admin/edit-bible/${version.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" /> Edit Details
                        </Button>
                      </Link>
                      <Link href={`/admin/edit-bible/${version.id}/editor`}>
                        <Button variant="outline" size="sm">
                          <FileEdit className="h-4 w-4 mr-1" /> Edit Content
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeleteVersion(version.id)}
                        disabled={deleteLoading === version.id}
                      >
                        {deleteLoading === version.id ? (
                          <span className="animate-pulse">Deleting...</span>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
