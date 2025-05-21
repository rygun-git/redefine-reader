"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { defaultBibleVersions, defaultBibleOutlines } from "@/lib/available-content"

export default function VersionInfoPage() {
  const searchParams = useSearchParams()
  const versionParam = searchParams.get("version")
  const outlineParam = searchParams.get("outline")
  const bookParam = searchParams.get("book")
  const chapterParam = searchParams.get("chapter")
  const [activeTab, setActiveTab] = useState("version")

  // Find version and outline details
  const versionDetails = defaultBibleVersions.find((v) => v.id.toString() === versionParam)
  const outlineDetails = defaultBibleOutlines.find((o) => o.id.toString() === outlineParam)

  // Return URL to go back to the reader
  const returnUrl = `/read/view?version=${versionParam}&outline=${outlineParam}${
    bookParam ? `&book=${bookParam}` : ""
  }${chapterParam ? `&chapter=${chapterParam}` : ""}`

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link href={returnUrl}>
          <Button variant="ghost" size="sm" className="mr-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Reader
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">About</h1>
      </div>

      <Tabs defaultValue="version" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="version">Bible Version</TabsTrigger>
          <TabsTrigger value="outline">Outline Structure</TabsTrigger>
        </TabsList>
        <TabsContent value="version" className="mt-6">
          {versionDetails ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{versionDetails.title}</h2>
              <div className="grid gap-2">
                <div>
                  <span className="font-medium">ID:</span> {versionDetails.id}
                </div>
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="mt-1 text-muted-foreground">
                    {versionDetails.description ||
                      "This Bible translation aims to provide an accurate and readable rendering of the original texts."}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Language:</span> {versionDetails.language || "English"}
                </div>
                {versionDetails.copyright && (
                  <div>
                    <span className="font-medium">Copyright:</span>
                    <p className="mt-1 text-sm text-muted-foreground">{versionDetails.copyright}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">No information available for this Bible version.</div>
          )}
        </TabsContent>
        <TabsContent value="outline" className="mt-6">
          {outlineDetails ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{outlineDetails.title}</h2>
              <div className="grid gap-2">
                <div>
                  <span className="font-medium">ID:</span> {outlineDetails.id}
                </div>
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="mt-1 text-muted-foreground">
                    {outlineDetails.description ||
                      "This outline structure organizes the Bible into books, chapters, and verses according to traditional divisions."}
                  </p>
                </div>
                {outlineDetails.source && (
                  <div>
                    <span className="font-medium">Source:</span> {outlineDetails.source}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">No information available for this outline structure.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
