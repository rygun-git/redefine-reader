"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { getDisplaySettings, storeDisplaySettings } from "@/lib/indexedDB"
import { defaultBibleVersions, defaultBibleOutlines } from "@/lib/available-content"

interface VersionSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVersionSelected: (versionId: string, outlineId: string) => void
}

export function VersionSelectionModal({ open, onOpenChange, onVersionSelected }: VersionSelectionModalProps) {
  const [loading, setLoading] = useState(true)
  const [selectedVersionId, setSelectedVersionId] = useState<string>("")
  const [selectedOutlineId, setSelectedOutlineId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  // Load available versions and outlines
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load default settings
        const settings = await getDisplaySettings()

        // Set default selections from settings if available
        if (settings && defaultBibleVersions.length && defaultBibleOutlines.length) {
          setSelectedVersionId(settings.defaultVersionId || defaultBibleVersions[0]?.id.toString() || "1")
          setSelectedOutlineId(settings.defaultOutlineId || defaultBibleOutlines[0]?.id.toString() || "1")
        } else if (defaultBibleVersions.length && defaultBibleOutlines.length) {
          // Default to first item if no settings
          setSelectedVersionId(defaultBibleVersions[0]?.id.toString() || "1")
          setSelectedOutlineId(defaultBibleOutlines[0]?.id.toString() || "1")
        } else {
          throw new Error("No Bible versions or outlines found. Please check your configuration.")
        }
      } catch (err) {
        console.error("Error loading settings:", err)
        setError(err instanceof Error ? err.message : "Failed to load settings. Please try again.")

        // Set fallback defaults if available
        if (defaultBibleVersions.length && defaultBibleOutlines.length) {
          setSelectedVersionId(defaultBibleVersions[0]?.id.toString() || "1")
          setSelectedOutlineId(defaultBibleOutlines[0]?.id.toString() || "1")
        } else {
          setSelectedVersionId("1")
          setSelectedOutlineId("1")
        }
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      loadSettings()
    }
  }, [open])

  const handleConfirm = async () => {
    try {
      // Save selected version and outline as defaults
      const settings = (await getDisplaySettings()) || {}
      await storeDisplaySettings({
        ...settings,
        defaultVersionId: selectedVersionId,
        defaultOutlineId: selectedOutlineId,
      })

      // Call the callback with selected values
      onVersionSelected(selectedVersionId, selectedOutlineId)
    } catch (err) {
      console.error("Error saving version selection:", err)
      setError("Failed to save selection. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Bible Version</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-destructive">{error}</div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="version-select">Bible Version</Label>
              <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                <SelectTrigger id="version-select">
                  <SelectValue placeholder="Select a Bible version" />
                </SelectTrigger>
                <SelectContent>
                  {defaultBibleVersions.map((version) => (
                    <SelectItem key={version.id} value={version.id.toString()}>
                      {version.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outline-select">Bible Outline</Label>
              <Select value={selectedOutlineId} onValueChange={setSelectedOutlineId}>
                <SelectTrigger id="outline-select">
                  <SelectValue placeholder="Select a Bible outline" />
                </SelectTrigger>
                <SelectContent>
                  {defaultBibleOutlines.map((outline) => (
                    <SelectItem key={outline.id} value={outline.id.toString()}>
                      {outline.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !selectedVersionId || !selectedOutlineId}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
