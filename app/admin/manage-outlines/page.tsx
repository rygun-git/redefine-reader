"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Edit, Trash2, Upload, Download, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface BibleOutline {
  id: number
  title: string
  chapters: {
    number: number
    name: string
    book?: string
    sections?: {
      startVerse: number
      endVerse: number
      title: string
    }[]
  }[]
  created_at: string
}

export default function ManageOutlinesPage() {
  const [outlines, setOutlines] = useState<BibleOutline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)

  useEffect(() => {
    fetchOutlines()
  }, [])

  const fetchOutlines = async () => {
    try {
      const { data, error } = await supabase
        .from("bible_outlines")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setOutlines(data || [])
    } catch (err) {
      console.error("Error fetching Bible outlines:", err)
      setError("Failed to load Bible outlines")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOutline = async (id: number) => {
    if (!confirm("Are you sure you want to delete this outline? This action cannot be undone.")) return

    setDeleteLoading(id)
    try {
      const { error } = await supabase.from("bible_outlines").delete().eq("id", id)

      if (error) throw error

      // Refresh the list
      fetchOutlines()
    } catch (err) {
      console.error("Error deleting outline:", err)
      setError("Failed to delete outline")
    } finally {
      setDeleteLoading(null)
    }
  }

  // Count books in an outline
  const getBookCount = (outline: BibleOutline) => {
    // Extract unique book names
    const bookNames = new Set<string>()
    outline.chapters?.forEach((chapter) => {
      if (chapter.book) {
        bookNames.add(chapter.book)
      } else if (chapter.name && chapter.name.includes(" - ")) {
        const bookName = chapter.name.split(" - ")[0]
        bookNames.add(bookName)
      }
    })

    return bookNames.size
  }

  const downloadTemplate = () => {
    const template = {
      title: "Bible Outline Template",
      categories: [
        {
          id: "pentateuch",
          name: "Pentateuch",
          books: [
            {
              name: "Genesis",
              book_id: "genesis",
              chapters: [
                {
                  chapter: 1,
                  sections: [
                    {
                      title: "Creation of the World",
                      start_line: 1,
                      end_line: 31,
                    },
                    {
                      title: "Creation of Light",
                      start_line: 1,
                      end_line: 5,
                    },
                  ],
                },
                {
                  chapter: 2,
                  sections: [
                    {
                      title: "Creation of Man",
                      start_line: 1,
                      end_line: 25,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "historical",
          name: "Historical Books",
          books: [
            {
              name: "Joshua",
              book_id: "joshua",
              chapters: [
                {
                  chapter: 1,
                  sections: [
                    {
                      title: "God's Commission to Joshua",
                      start_line: 1,
                      end_line: 18,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "bible-outline-template.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Bible Outlines</h1>
        <div className="flex gap-2">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" /> Download Template
          </Button>
          <Link href="/admin/create-outline">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" /> Create New Outline
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
          <CardTitle>Bible Outlines</CardTitle>
          <CardDescription>Manage your Bible outlines</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : outlines.length === 0 ? (
            <div className="text-center py-8 border rounded-md">
              <p className="text-muted-foreground">No Bible outlines found. Create one to get started.</p>
              <Link href="/admin/create-outline" className="mt-4 inline-block">
                <Button>
                  <Upload className="h-4 w-4 mr-2" /> Create New Outline
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {outlines.map((outline) => (
                <Card key={outline.id} className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="font-medium">{outline.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getBookCount(outline)} books, {outline.chapters?.length || 0} chapters • Added on{" "}
                        {new Date(outline.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 self-end sm:self-auto">
                      <Link href={`/admin/edit-outline/${outline.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeleteOutline(outline.id)}
                        disabled={deleteLoading === outline.id}
                      >
                        {deleteLoading === outline.id ? (
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
