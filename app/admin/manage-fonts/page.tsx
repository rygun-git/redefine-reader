"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { allFonts, fontLanguages, type FontDefinition } from "@/lib/fonts"

export default function ManageFontsPage() {
  const [fonts, setFonts] = useState<FontDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("english")
  const [editingFont, setEditingFont] = useState<FontDefinition | null>(null)
  const [previewText, setPreviewText] = useState({
    english: "The quick brown fox jumps over the lazy dog",
    hebrew: "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ",
    greek: "Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος",
    other: "Sample text for preview",
  })

  useEffect(() => {
    fetchFonts()
  }, [])

  const fetchFonts = async () => {
    try {
      const { data, error } = await supabase.from("fonts").select("*").order("language", { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        // Convert snake_case database columns to camelCase for our UI
        const formattedFonts = data.map((font) => ({
          id: font.id,
          name: font.name,
          cssName: font.css_name, // Map from css_name to cssName
          language: font.language,
          isDefault: font.is_default, // Map from is_default to isDefault
          description: font.description,
        }))
        setFonts(formattedFonts)
      } else {
        // If no fonts in database, use the default ones
        setFonts(allFonts)
        // Save default fonts to database
        await saveFontsToDatabase(allFonts)
      }
    } catch (err) {
      console.error("Error fetching fonts:", err)
      setError("Failed to load fonts")
      // Fallback to default fonts
      setFonts(allFonts)
    } finally {
      setLoading(false)
    }
  }

  const saveFontsToDatabase = async (fontsToSave: FontDefinition[]) => {
    try {
      // First delete all existing fonts - without using neq which was causing the error
      const { error: deleteError } = await supabase.from("fonts").delete().gt("id", 0)

      if (deleteError) throw deleteError

      // Prepare fonts for insertion by converting camelCase to snake_case for the database
      const preparedFonts = fontsToSave.map((font) => ({
        // Remove the id property so Supabase will auto-generate numeric IDs
        name: font.name,
        css_name: font.cssName, // Convert cssName to css_name for the database
        language: font.language,
        is_default: font.isDefault, // Convert isDefault to is_default for the database
        description: font.description,
      }))

      // Then insert all fonts
      const { error: insertError } = await supabase.from("fonts").insert(preparedFonts)

      if (insertError) throw insertError

      // Fetch the newly inserted fonts to get their database IDs
      const { data: updatedFonts, error: fetchError } = await supabase
        .from("fonts")
        .select("*")
        .order("language", { ascending: true })

      if (fetchError) throw fetchError

      if (updatedFonts) {
        // Convert snake_case database columns to camelCase for our UI
        const formattedFonts = updatedFonts.map((font) => ({
          id: font.id,
          name: font.name,
          cssName: font.css_name, // Map from css_name to cssName
          language: font.language,
          isDefault: font.is_default, // Map from is_default to isDefault
          description: font.description,
        }))
        setFonts(formattedFonts)
      }

      return true
    } catch (err) {
      console.error("Error saving fonts to database:", err)
      return false
    }
  }

  const handleSaveFonts = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Ensure only one default font per language
      const validatedFonts = validateDefaultFonts(fonts)

      const result = await saveFontsToDatabase(validatedFonts)

      if (result) {
        setSuccess("Fonts saved successfully")
        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error("Failed to save fonts")
      }
    } catch (err) {
      console.error("Error saving fonts:", err)
      setError("Failed to save fonts")
    } finally {
      setSaving(false)
    }
  }

  const validateDefaultFonts = (fontsToValidate: FontDefinition[]): FontDefinition[] => {
    // Group fonts by language
    const fontsByLanguage: Record<string, FontDefinition[]> = {}

    fontsToValidate.forEach((font) => {
      if (!fontsByLanguage[font.language]) {
        fontsByLanguage[font.language] = []
      }
      fontsByLanguage[font.language].push(font)
    })

    // Ensure each language has exactly one default font
    const validatedFonts: FontDefinition[] = []

    Object.entries(fontsByLanguage).forEach(([language, languageFonts]) => {
      const defaultFonts = languageFonts.filter((f) => f.isDefault)

      if (defaultFonts.length === 0 && languageFonts.length > 0) {
        // If no default font, set the first one as default
        languageFonts[0].isDefault = true
      } else if (defaultFonts.length > 1) {
        // If multiple default fonts, keep only the first one as default
        defaultFonts.forEach((font, index) => {
          if (index > 0) font.isDefault = false
        })
      }

      validatedFonts.push(...languageFonts)
    })

    return validatedFonts
  }

  const handleAddFont = () => {
    // Use a string ID for new fonts in the UI
    // When saving to database, we'll let Supabase generate numeric IDs
    const newFont: FontDefinition = {
      id: `temp-${Date.now()}`,
      name: "New Font",
      cssName: "sans-serif",
      language: activeTab,
      isDefault: false,
      description: "",
    }

    setFonts([...fonts, newFont])
    setEditingFont(newFont)
  }

  const handleDeleteFont = (fontId: string | number) => {
    if (!confirm("Are you sure you want to delete this font?")) return

    const updatedFonts = fonts.filter((f) => f.id !== fontId)
    setFonts(updatedFonts)

    if (editingFont?.id === fontId) {
      setEditingFont(null)
    }
  }

  const handleEditFont = (font: FontDefinition) => {
    setEditingFont({ ...font })
  }

  const handleUpdateFont = (field: keyof FontDefinition, value: any) => {
    if (!editingFont) return

    setEditingFont({
      ...editingFont,
      [field]: value,
    })
  }

  const handleSaveEditingFont = () => {
    if (!editingFont) return

    const updatedFonts = fonts.map((f) => (f.id === editingFont.id ? editingFont : f))

    setFonts(updatedFonts)
    setEditingFont(null)
  }

  const handleSetDefaultFont = (fontId: string | number) => {
    const language = fonts.find((f) => f.id === fontId)?.language || ""

    const updatedFonts = fonts.map((font) => ({
      ...font,
      isDefault: font.id === fontId ? true : font.language === language ? false : font.isDefault,
    }))

    setFonts(updatedFonts)
  }

  const fontsForCurrentLanguage = fonts.filter((font) => font.language === activeTab)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Font Manager</h1>
        <div className="flex gap-2">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
            </Button>
          </Link>
          <Button size="sm" onClick={handleSaveFonts} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Save All Fonts
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Available Fonts</CardTitle>
              <CardDescription>Manage fonts for different languages</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  {fontLanguages.map((lang) => (
                    <TabsTrigger key={lang.id} value={lang.id}>
                      {lang.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {fontLanguages.map((lang) => (
                  <TabsContent key={lang.id} value={lang.id} className="space-y-4">
                    {loading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : fontsForCurrentLanguage.length === 0 ? (
                      <div className="text-center py-8 border rounded-md">
                        <p className="text-muted-foreground">No fonts found for {lang.name}</p>
                        <Button onClick={handleAddFont} className="mt-4">
                          <Plus className="h-4 w-4 mr-2" /> Add Font
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-end mb-4">
                          <Button onClick={handleAddFont} size="sm">
                            <Plus className="h-4 w-4 mr-2" /> Add Font
                          </Button>
                        </div>
                        <div className="space-y-4">
                          {fontsForCurrentLanguage.map((font) => (
                            <Card key={font.id} className="overflow-hidden">
                              <div className="p-4 border-b bg-muted/30">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h3 className="font-medium">{font.name}</h3>
                                    <p className="text-sm text-muted-foreground">{font.cssName}</p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        id={`default-${font.id}`}
                                        checked={font.isDefault}
                                        onCheckedChange={() => handleSetDefaultFont(font.id)}
                                      />
                                      <Label htmlFor={`default-${font.id}`}>Default</Label>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleEditFont(font)}>
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() => handleDeleteFont(font.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4" style={{ fontFamily: font.cssName }}>
                                <p className="text-lg">{previewText[lang.id as keyof typeof previewText]}</p>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div>
          {editingFont ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Font</CardTitle>
                <CardDescription>Modify font properties</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="font-name">Font Name</Label>
                  <Input
                    id="font-name"
                    value={editingFont.name}
                    onChange={(e) => handleUpdateFont("name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font-css">CSS Font Family</Label>
                  <Input
                    id="font-css"
                    value={editingFont.cssName}
                    onChange={(e) => handleUpdateFont("cssName", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">CSS font-family value (e.g., "Arial, sans-serif")</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font-language">Language</Label>
                  <Select value={editingFont.language} onValueChange={(value) => handleUpdateFont("language", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {fontLanguages.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font-description">Description</Label>
                  <Textarea
                    id="font-description"
                    value={editingFont.description || ""}
                    onChange={(e) => handleUpdateFont("description", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="font-default"
                    checked={editingFont.isDefault}
                    onCheckedChange={(checked) => handleUpdateFont("isDefault", checked)}
                  />
                  <Label htmlFor="font-default">
                    Set as default for {fontLanguages.find((l) => l.id === editingFont.language)?.name}
                  </Label>
                </div>

                <div className="pt-4 space-y-2">
                  <Label>Preview</Label>
                  <div className="p-4 border rounded-md" style={{ fontFamily: editingFont.cssName }}>
                    <p className="text-lg">{previewText[editingFont.language as keyof typeof previewText]}</p>
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveEditingFont} className="w-full">
                    Save Font
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Font Information</CardTitle>
                <CardDescription>Select a font to edit or add a new one</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Click on a font to edit its properties or add a new font</p>
                  <Button onClick={handleAddFont}>
                    <Plus className="h-4 w-4 mr-2" /> Add New Font
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
