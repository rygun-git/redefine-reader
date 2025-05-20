"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"

export default function UploadFilePage() {
  const [fileType, setFileType] = useState<"bible" | "outline">("bible")
  const [fileId, setFileId] = useState("")
  const [fileContent, setFileContent] = useState("")
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fileId || !fileContent) {
      setStatus("error")
      setMessage("Please provide both file ID and content")
      return
    }

    try {
      // Create the directory structure if it doesn't exist
      const directory = fileType === "bible" ? "/bibles" : "/outlines"
      const extension = fileType === "bible" ? "txt" : "json"

      // For demonstration purposes, we'll just show what would be saved
      // In a real app, you'd use a server action to write to the file system
      setStatus("success")
      setMessage(`File would be saved to: ${directory}/${fileId}.${extension}`)

      // In a real implementation, you would use a server action like this:
      // await saveFile(directory, `${fileId}.${extension}`, fileContent)

      console.log(`File would be saved to: ${directory}/${fileId}.${extension}`)
      console.log("Content sample:", fileContent.substring(0, 100) + "...")
    } catch (error) {
      setStatus("error")
      setMessage(`Error saving file: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Upload Bible Files</CardTitle>
          <CardDescription>
            Upload Bible text files or outline JSON files to be stored in the public directory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFileUpload}>
            <div className="space-y-4">
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant={fileType === "bible" ? "default" : "outline"}
                  onClick={() => setFileType("bible")}
                  className="flex-1"
                >
                  Bible Text
                </Button>
                <Button
                  type="button"
                  variant={fileType === "outline" ? "default" : "outline"}
                  onClick={() => setFileType("outline")}
                  className="flex-1"
                >
                  Outline JSON
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileId">File ID</Label>
                <Input
                  id="fileId"
                  placeholder="Enter numeric ID (e.g., 2, 11)"
                  value={fileId}
                  onChange={(e) => setFileId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileContent">File Content</Label>
                <Textarea
                  id="fileContent"
                  placeholder={
                    fileType === "bible" ? "Paste Bible text content here" : "Paste JSON outline content here"
                  }
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              {status !== "idle" && (
                <Alert variant={status === "success" ? "default" : "destructive"}>
                  {status === "success" ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mr-2" />
                  )}
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button onClick={handleFileUpload} className="w-full">
            Upload File
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
