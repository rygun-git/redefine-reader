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
import {
  getDisplaySettings,
  storeDisplaySettings,
  isIndexedDBAvailable,
  getLastRead,
  storeLastRead,
} from "@/lib/indexedDB"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { useTheme } from "next-themes"
import { allFonts, fontLanguages, type FontDefinition } from "@/lib/fonts"

// Update the DisplaySettings interface to include inlineVerses
interface DisplaySettings {
  fontSize: number
  fontFamily: string
  appFontFamily: string
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
  forceNewParagraph: boolean
  equalIndentation: boolean
  verseNumberColor: string
  verseNumberSize: number
  inlineVerses: boolean
  defaultVersionId?: string
  defaultOutlineId?: string
}

export default function DisplaySettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [indexedDBAvailable, setIndexedDBAvailable] = useState<boolean>(false)
  const [originalSettings, setOriginalSettings] = useState<DisplaySettings | null>(null)
  // Update the default state to include inlineVerses
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    fontSize: 22,
    fontFamily: "var(--font-montserrat), system-ui, sans-serif",
    appFontFamily: "var(--font-montserrat), system-ui, sans-serif",
    fontWeight: 400,
    lineHeight: 1.5,
    paragraphSpacing: 16,
    showFootnotes: true,
    showFootnoteSection: true,
    showLineNumbers: false,
    showDebugInfo: false,
    underscoredPhraseStyle: "remove",
    sectionTitleColor: "#3b82f6",
    darkMode: false,
    forceNewParagraph: false,
    equalIndentation: false,
    verseNumberColor: "#888888",
    verseNumberSize: 12,
    inlineVerses: false,
  })
  const [previewText, setPreviewText] = useState<string>(
    "In the beginning God created the heaven and the earth. And the earth was without form, and void; and darkness was upon the face of the deep.",
  )
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [fonts, setFonts] = useState<FontDefinition[]>(allFonts)
  const [lastReadData, setLastReadData] = useState<any>(null)
  const [themeInitialized, setThemeInitialized] = useState(false)

  // Load fonts directly from lib/fonts.ts
  useEffect(() => {
    // Log the loaded fonts to console for verification
    console.log(
      `Loaded ${allFonts.length} fonts from lib/fonts.ts:`,
      allFonts.map((font) => `${font.name} (${font.language})`),
    )

    // Set fonts directly from allFonts
    setFonts(allFonts)
  }, [])

  // Check if IndexedDB is available
  useEffect(() => {
    const checkIndexedDB = async () => {
      const available = await isIndexedDBAvailable()
      setIndexedDBAvailable(available)
    }
    checkIndexedDB()
  }, [])

  // Load last read data to preserve version and outline
  useEffect(() => {
    const loadLastReadData = async () => {
      try {
        const data = await getLastRead()
        if (data) {
          console.log("Loaded last read data:", data)
          setLastReadData(data)
        }
      } catch (error) {
        console.error("Error loading last read data:", error)
      }
    }

    loadLastReadData()
  }, [])

  // Load saved settings
  useEffect(() => {
    // Update the loadDisplaySettings function to include inlineVerses
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
            darkMode: settings.darkMode !== undefined ? settings.darkMode : false,
            forceNewParagraph: settings.forceNewParagraph !== undefined ? settings.forceNewParagraph : false,
            equalIndentation: settings.equalIndentation !== undefined ? settings.equalIndentation : false,
            verseNumberColor: settings.verseNumberColor || "#888888",
            verseNumberSize: settings.verseNumberSize || 12,
            inlineVerses: settings.inlineVerses !== undefined ? settings.inlineVerses : false,
            appFontFamily: settings.appFontFamily || "var(--font-montserrat), system-ui, sans-serif",
            fontFamily: settings.fontFamily || "var(--font-montserrat), system-ui, sans-serif",
            // Preserve version and outline settings
            defaultVersionId: settings.defaultVersionId,
            defaultOutlineId: settings.defaultOutlineId,
          }
          setDisplaySettings(updatedSettings)
          // Store a deep copy of the original settings
          setOriginalSettings(JSON.parse(JSON.stringify(updatedSettings)))

          // Set theme based on settings, but only if not already initialized
          if (!themeInitialized) {
            const currentTheme = theme || (typeof window !== "undefined" ? localStorage.getItem("theme") : null)
            const newTheme = updatedSettings.darkMode ? "dark" : "light"

            // Only set theme if it's different from current
            if (currentTheme !== newTheme) {
              console.log(`Setting theme to ${newTheme} (was ${currentTheme})`)
              setTheme(newTheme)
            }
            setThemeInitialized(true)
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
  }, [theme, setTheme, themeInitialized])

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
      // Preserve version and outline IDs from last read data if they exist
      const settingsToSave = { ...displaySettings }

      if (lastReadData) {
        // Only set these if they're not already set in displaySettings
        if (!settingsToSave.defaultVersionId && lastReadData.versionId) {
          settingsToSave.defaultVersionId = lastReadData.versionId
        }
        if (!settingsToSave.defaultOutlineId && lastReadData.outlineId) {
          settingsToSave.defaultOutlineId = lastReadData.outlineId
        }
      }

      await storeDisplaySettings(settingsToSave)

      // Also update last read data to ensure version/outline are preserved
      if (lastReadData) {
        await storeLastRead({
          ...lastReadData,
          timestamp: Date.now(),
        })
      }

      // Store a deep copy of the current settings as the new original
      setOriginalSettings(JSON.parse(JSON.stringify(settingsToSave)))
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

  // Group fonts by language
  const fontsByLanguage = fonts.reduce(
    (acc, font) => {
      if (!acc[font.language]) {
        acc[font.language] = []
      }
      acc[font.language].push(font)
      return acc
    },
    {} as Record<string, FontDefinition[]>,
  )

  // Get language name from language ID
  const getLanguageName = (languageId: string): string => {
    const language = fontLanguages.find((lang) => lang.id === languageId)
    return language ? language.name : languageId.charAt(0).toUpperCase() + languageId.slice(1)
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
                  <span
                    className="verse-number font-bold mr-2"
                    style={{
                      color: displaySettings.verseNumberColor,
                      fontSize: `${displaySettings.verseNumberSize}px`,
                    }}
                  >
                    1
                  </span>
                  {previewText}
                </p>
                <p style={{ marginTop: `${displaySettings.paragraphSpacing}px` }}>
                  <span
                    className="verse-number font-bold mr-2"
                    style={{
                      color: displaySettings.verseNumberColor,
                      fontSize: `${displaySettings.verseNumberSize}px`,
                    }}
                  >
                    2
                  </span>
                  And the Spirit of God moved upon the face of the waters.
                </p>
              </div>
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
              <Label htmlFor="font-family">Reader Font</Label>
              <Select
                value={displaySettings.fontFamily}
                onValueChange={(value) => updateDisplaySetting("fontFamily", value)}
              >
                <SelectTrigger id="font-family">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(fontsByLanguage).map(([language, languageFonts]) => (
                    <div key={language} className="py-2">
                      <div className="px-2 text-sm font-semibold text-muted-foreground mb-1">
                        {getLanguageName(language)}
                      </div>
                      {languageFonts.map((font) => (
                        <div key={font.id.toString()} className="font-preview">
                          <SelectItem
                            key={font.id.toString()}
                            value={font.cssName}
                            style={{ fontFamily: font.cssName }}
                          >
                            <div>
                              <div className="font-medium">{font.name}</div>
                              <div className="text-xs text-muted-foreground mt-1" style={{ fontFamily: font.cssName }}>
                                The quick brown fox jumps over the lazy dog
                              </div>
                            </div>
                          </SelectItem>
                        </div>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Font used for Bible text and reading content</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="app-font-family">App Font</Label>
              <Select
                value={displaySettings.appFontFamily}
                onValueChange={(value) => updateDisplaySetting("appFontFamily", value)}
              >
                <SelectTrigger id="app-font-family">
                  <SelectValue placeholder="Select app font" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(fontsByLanguage).map(([language, languageFonts]) => (
                    <div key={language} className="py-2">
                      <div className="px-2 text-sm font-semibold text-muted-foreground mb-1">
                        {getLanguageName(language)}
                      </div>
                      {languageFonts.map((font) => (
                        <div key={font.id.toString()} className="font-preview">
                          <SelectItem
                            key={font.id.toString()}
                            value={font.cssName}
                            style={{ fontFamily: font.cssName }}
                          >
                            <div>
                              <div className="font-medium">{font.name}</div>
                              <div className="text-xs text-muted-foreground mt-1" style={{ fontFamily: font.cssName }}>
                                The quick brown fox jumps over the lazy dog
                              </div>
                            </div>
                          </SelectItem>
                        </div>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Font used for UI elements and navigation</p>
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
                id="force-new-paragraph"
                checked={displaySettings.forceNewParagraph}
                onCheckedChange={(value) => updateDisplaySetting("forceNewParagraph", value)}
              />
              <Label htmlFor="force-new-paragraph">Force New Paragraph After Full Stop</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="equal-indentation"
                checked={displaySettings.equalIndentation}
                onCheckedChange={(value) => updateDisplaySetting("equalIndentation", value)}
              />
              <Label htmlFor="equal-indentation">Equal Indentation</Label>
            </div>

            {/* Add the inline verses switch to the Text Display section
            Find the section with the other switches and add this one after the equal indentation switch */}
            <div className="flex items-center space-x-2">
              <Switch
                id="inline-verses"
                checked={displaySettings.inlineVerses}
                onCheckedChange={(value) => updateDisplaySetting("inlineVerses", value)}
              />
              <Label htmlFor="inline-verses">Inline Verses (Continuous Text)</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verse-number-color">Verse Number Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="verse-number-color"
                  type="color"
                  value={displaySettings.verseNumberColor}
                  onChange={(e) => updateDisplaySetting("verseNumberColor", e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={displaySettings.verseNumberColor}
                  onChange={(e) => updateDisplaySetting("verseNumberColor", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verse-number-size">Verse Number Size: {displaySettings.verseNumberSize}px</Label>
              <Slider
                id="verse-number-size"
                min={8}
                max={16}
                step={1}
                value={[displaySettings.verseNumberSize]}
                onValueChange={(value) => updateDisplaySetting("verseNumberSize", value[0])}
              />
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
