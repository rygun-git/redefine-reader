"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Upload, AlertCircle, CheckCircle } from "lucide-react"
import { exportSettings, importSettings } from "@/lib/indexedDB"

export function SettingsExportImport() {
  const [exportStatus, setExportStatus] = useState<{ message: string; type: "success" | "error" | null }>({
    message: "",
    type: null,
  })
  const [importStatus, setImportStatus] = useState<{ message: string; type: "success" | "error" | null }>({
    message: "",
    type: null,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    try {
      setExportStatus({ message: "Exporting settings...", type: null })
      const jsonData = await exportSettings()

      // Create a blob and download link
      const blob = new Blob([jsonData], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      // Create a temporary link and trigger download
      const link = document.createElement("a")
      link.href = url
      link.download = `bible-reader-settings-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()

      // Clean up
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportStatus({ message: "Settings exported successfully!", type: "success" })
    } catch (error) {
      console.error("Export error:", error)
      setExportStatus({
        message: `Failed to export settings: ${(error as Error).message}`,
        type: "error",
      })
    }
  }

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImportStatus({ message: "Importing settings...", type: null })

      // Read the file
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const jsonData = e.target?.result as string
          const result = await importSettings(jsonData)

          setImportStatus({
            message: result.message,
            type: result.success ? "success" : "error",
          })

          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        } catch (error) {
          console.error("Import processing error:", error)
          setImportStatus({
            message: `Failed to process settings: ${(error as Error).message}`,
            type: "error",
          })
        }
      }

      reader.onerror = () => {
        setImportStatus({
          message: "Failed to read the file",
          type: "error",
        })
      }

      reader.readAsText(file)
    } catch (error) {
      console.error("Import error:", error)
      setImportStatus({
        message: `Failed to import settings: ${(error as Error).message}`,
        type: "error",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings Backup & Restore</CardTitle>
        <CardDescription>
          Export your settings as a JSON file or import settings from a previously exported file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {exportStatus.message && (
          <Alert variant={exportStatus.type === "error" ? "destructive" : "default"}>
            <div className="flex items-center gap-2">
              {exportStatus.type === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : exportStatus.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : null}
              <AlertDescription>{exportStatus.message}</AlertDescription>
            </div>
          </Alert>
        )}

        {importStatus.message && (
          <Alert variant={importStatus.type === "error" ? "destructive" : "default"}>
            <div className="flex items-center gap-2">
              {importStatus.type === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : importStatus.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : null}
              <AlertDescription>{importStatus.message}</AlertDescription>
            </div>
          </Alert>
        )}

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleExport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Settings
        </Button>
        <Button onClick={handleImportClick} variant="outline" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import Settings
        </Button>
      </CardFooter>
    </Card>
  )
}
