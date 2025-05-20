"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, Save, Check, Moon, Sun } from "lucide-react"
import { getDisplaySettings, storeDisplaySettings, isIndexedDBAvailable } from "@/lib/indexedDB"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { useTheme } from "next-themes"
import { supabase } from "@/lib/supabase"

interface DisplaySettings {
  fontSize: number
  fontFamily: string
  fontWeight: number
  lineHeight: number
  paragraphSpacing: number
  showFootnotes: boolean
  showFootnoteSection: boolean
  showLineNumbers: boolean
  showDebugInfo: boolean
  underscoredPhraseStyle: "keep" | "remove" | "bold"
  sectionTitleColor: string
  darkMode: boolean
  defaultVersionId: string
  defaultOutlineId: string
}

export default function DisplaySettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [indexedDBAvailable, setIndexedDBAvailable] = useState<boolean>(false)
  const [originalSettings, setOriginalSettings] = useState<DisplaySettings | null>(null)
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    fontSize: 18,
    fontFamily: "inherit",
    fontWeight: 400,
    lineHeight: 1.5,
    paragraphSpacing: 16,
    showFootnotes: true,
    showFootnoteSection: true,
    showLineNumbers: false,
    showDebugInfo: false,
    underscoredPhraseStyle: "keep",
    sectionTitleColor: "#3b82f6", // Default to blue
    darkMode: false,
    defaultVersionId: "2",
    defaultOutlineId: "11",
  })
  const [previewText, setPreviewText] = useState<string>(
    "In the beginning God created the heaven and the earth. And the earth was without form, and void; and darkness was upon the face of the deep.",
  )
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [bibleVersions, setBibleVersions] = useState<any[]>([])
  const [bibleOutlines, setBibleOutlines] = useState<any[]>([])

  // Fetch Bible versions and outlines
  useEffect(() => {
    const fetchBiblesAndOutlines = async () => {
      try {
        const { data: versions, error: versionError } = await supabase
          .from("bible_versions")
          .select("id, title")
          .order("title")
        if (versionError) throw versionError
        setBibleVersions(versions || [])

        const { data: outlines, error: outlineError } = await supabase
          .from("bible_outlines")
          .select("id, title")
          .order("title")
        if (outlineError) throw outlineError
        setBibleOutlines(outlines || [])
      } catch (error) {
        console.error("Error fetching Bible versions and outlines:", error)
      }
    }

    fetchBiblesAndOutlines()
  }, [])

  // Check if IndexedDB is available
  useEffect(() => {
    const checkIndexedDB = async () => {
      const available = await isIndexedDBAvailable()
      setIndexedDBAvailable(available)
    }
    checkIndexedDB()
  }, [])

  // Load saved settings
  useEffect(() => {
    const loadDisplaySettings = async () => {
      try {
        const settings = await getDisplaySettings()
        if (settings) {
          const updatedSettings = {
            ...displaySettings,
            ...settings,
            // Ensure we have defaults for any new settings
            paragraphSpacing: settings.paragraphSpacing || 16,
            sectionTitleColor: settings.sectionTitleColor || "#3b82f6",
            darkMode: settings.darkMode || false,
            defaultVersionId: settings.defaultVersionId || "1",
            defaultOutlineId: settings.defaultOutlineId || "1",
          }
          setDisplaySettings(updatedSettings)
          // Store a deep copy of the original settings
          setOriginalSettings(JSON.parse(JSON.stringify(updatedSettings)))

          // Set theme based on settings
          if (updatedSettings.darkMode) {
            setTheme("dark")
          } else {
            setTheme("light")
          }
        } else {
          // If no settings found, set the current defaults as original
          setOriginalSettings(JSON.parse(JSON.stringify(displaySettings)))
        }
        setIsLoaded(true)
      } catch (error) {
        console.error("Error loading display settings:", error)
        setOriginalSettings(JSON.parse(JSON.stringify(displaySettings)))
        setIsLoaded(true)
      }
    }

    loadDisplaySettings()
  }, [])

  // Check for changes
  useEffect(() => {
    if (originalSettings && isLoaded) {
      // Deep comparison of objects
      const settingsChanged = JSON.stringify(displaySettings) !== JSON.stringify(originalSettings)
      setHasChanges(settingsChanged)

      // Debug output to console
      if (settingsChanged) {
        console.log("Settings changed:", {
          current: displaySettings,
          original: originalSettings,
        })
      }
    }
  }, [displaySettings, originalSettings, isLoaded])

  // Update a single setting
  const updateDisplaySetting = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
    setDisplaySettings((prev) => {
      const newSettings = {
        ...prev,
        [key]: value,
      }
      return newSettings
    })

    // Special handling for dark mode
    if (key === "darkMode") {
      setTheme(value ? "dark" : "light")
    }
  }

  // Save all settings
  const saveAllSettings = async () => {
    setIsSaving(true)
    try {
      await storeDisplaySettings(displaySettings)
      // Store a deep copy of the current settings as the new original
      setOriginalSettings(JSON.parse(JSON.stringify(displaySettings)))
      setHasChanges(false)
      toast({
        title: "Settings saved",
        description: "Your display settings have been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving display settings:", error)
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Display Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Preview Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md p-4">
              <h3 className="font-semibold text-lg mb-2" style={{ color: displaySettings.sectionTitleColor }}>
                Section Title Preview
              </h3>
              <div
                style={{
                  fontSize: `${displaySettings.fontSize}px`,
                  fontFamily: displaySettings.fontFamily,
                  fontWeight: displaySettings.fontWeight,
                  lineHeight: displaySettings.lineHeight,
                }}
              >
                <p className="mb-2">
                  <span className="verse-number font-bold text-sm mr-2">1</span>
                  {previewText}
                </p>
                <p style={{ marginTop: `${displaySettings.paragraphSpacing}px` }}>
                  <span className="verse-number font-bold text-sm mr-2">2</span>
                  And the Spirit of God moved upon the face of the waters.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Bible and Outline Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Default Bible and Outline</CardTitle>
            <CardDescription>Set your preferred Bible version and outline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="default-bible">Default Bible Version</Label>
              <Select
                value={displaySettings.defaultVersionId}
                onValueChange={(value) => updateDisplaySetting("defaultVersionId", value)}
              >
                <SelectTrigger id="default-bible">
                  <SelectValue placeholder="Select Bible Version" />
                </SelectTrigger>
                <SelectContent>
                  {bibleVersions.map((version) => (
                    <SelectItem key={version.id} value={version.id.toString()}>
                      {version.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-outline">Default Outline</Label>
              <Select
                value={displaySettings.defaultOutlineId}
                onValueChange={(value) => updateDisplaySetting("defaultOutlineId", value)}
              >
                <SelectTrigger id="default-outline">
                  <SelectValue placeholder="Select Outline" />
                </SelectTrigger>
                <SelectContent>
                  {bibleOutlines.map((outline) => (
                    <SelectItem key={outline.id} value={outline.id.toString()}>
                      {outline.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Font Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Font Settings</CardTitle>
            <CardDescription>Customize how text appears</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="font-size">Text Size: {displaySettings.fontSize}px</Label>
              </div>
              <Slider
                id="font-size"
                min={12}
                max={32}
                step={1}
                value={[displaySettings.fontSize]}
                onValueChange={(value) => updateDisplaySetting("fontSize", value[0])}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="line-height">Line Height: {displaySettings.lineHeight}</Label>
              <Slider
                id="line-height"
                min={1}
                max={2.5}
                step={0.1}
                value={[displaySettings.lineHeight]}
                onValueChange={(value) => updateDisplaySetting("lineHeight", value[0])}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paragraph-spacing">Paragraph Spacing: {displaySettings.paragraphSpacing}px</Label>
              <Slider
                id="paragraph-spacing"
                min={0}
                max={48}
                step={2}
                value={[displaySettings.paragraphSpacing]}
                onValueChange={(value) => updateDisplaySetting("paragraphSpacing", value[0])}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-family">Font Family</Label>
              <Select
                value={displaySettings.fontFamily}
                onValueChange={(value) => updateDisplaySetting("fontFamily", value)}
              >
                <SelectTrigger id="font-family">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Montserrat (Default)</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                  <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                  <SelectItem value="monospace">Monospace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-weight">Font Weight</Label>
              <Select
                value={displaySettings.fontWeight.toString()}
                onValueChange={(value) => updateDisplaySetting("fontWeight", Number.parseInt(value, 10))}
              >
                <SelectTrigger id="font-weight">
                  <SelectValue placeholder="Select font weight" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">Light (300)</SelectItem>
                  <SelectItem value="400">Regular (400)</SelectItem>
                  <SelectItem value="500">Medium (500)</SelectItem>
                  <SelectItem value="600">Semi-Bold (600)</SelectItem>
                  <SelectItem value="700">Bold (700)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-title-color">Section Title Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="section-title-color"
                  type="color"
                  value={displaySettings.sectionTitleColor}
                  onChange={(e) => updateDisplaySetting("sectionTitleColor", e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={displaySettings.sectionTitleColor}
                  onChange={(e) => updateDisplaySetting("sectionTitleColor", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Text Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Text Display</CardTitle>
            <CardDescription>Configure how text elements are displayed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Underscored Phrase Display</Label>
              <Select
                value={displaySettings.underscoredPhraseStyle}
                onValueChange={(value) =>
                  updateDisplaySetting("underscoredPhraseStyle", value as "keep" | "remove" | "bold")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Keep underscores (their_gathering)</SelectItem>
                  <SelectItem value="remove">Remove underscores (their gathering)</SelectItem>
                  <SelectItem value="bold">Bold without underscores (their gathering)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-footnotes"
                checked={displaySettings.showFootnotes}
                onCheckedChange={(value) => updateDisplaySetting("showFootnotes", value)}
              />
              <Label htmlFor="show-footnotes">Show footnote markers in text</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-footnote-section"
                checked={displaySettings.showFootnoteSection}
                onCheckedChange={(value) => updateDisplaySetting("showFootnoteSection", value)}
              />
              <Label htmlFor="show-footnote-section">Show footnotes section</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-line-numbers"
                checked={displaySettings.showLineNumbers}
                onCheckedChange={(value) => updateDisplaySetting("showLineNumbers", value)}
              />
              <Label htmlFor="show-line-numbers">Show Line Numbers</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-debug-info"
                checked={displaySettings.showDebugInfo}
                onCheckedChange={(value) => updateDisplaySetting("showDebugInfo", value)}
              />
              <Label htmlFor="show-debug-info">Show Debug Information</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="dark-mode"
                checked={displaySettings.darkMode}
                onCheckedChange={(value) => updateDisplaySetting("darkMode", value)}
              />
              <Label htmlFor="dark-mode" className="flex items-center">
                {displaySettings.darkMode ? (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark Mode
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Light Mode
                  </>
                )}
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-end">
        <Button
          onClick={saveAllSettings}
          disabled={isSaving || !hasChanges}
          className="w-full sm:w-auto"
          variant={hasChanges ? "default" : "outline"}
        >
          {isSaving ? (
            <>Saving...</>
          ) : hasChanges ? (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
