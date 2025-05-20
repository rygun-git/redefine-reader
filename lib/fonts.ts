// Font definitions and utilities

export type FontLanguage = "english" | "hebrew" | "greek" | "other"

export interface FontDefinition {
  id: string | number
  name: string
  cssName: string
  language: string
  isDefault: boolean
  description?: string
}

// Language definitions
export const fontLanguages = [
  { id: "english", name: "English" },
  { id: "hebrew", name: "Hebrew" },
  { id: "greek", name: "Greek" },
  { id: "other", name: "Other" },
]

// Default fonts
export const allFonts: FontDefinition[] = [
  // English fonts
  {
    id: "montserrat",
    name: "Montserrat",
    cssName: "var(--font-montserrat), system-ui, sans-serif",
    language: "english",
    isDefault: true,
    description: "Modern sans-serif font (default)",
  },
  {
    id: "times-new-roman",
    name: "Times New Roman",
    cssName: "'Times New Roman', serif",
    language: "english",
    isDefault: false,
    description: "Classic serif font commonly used in Bible publications",
  },
  {
    id: "georgia",
    name: "Georgia",
    cssName: "Georgia, serif",
    language: "english",
    isDefault: false,
    description: "Elegant serif font with good readability",
  },

  // Hebrew fonts
  {
    id: "sbl-hebrew",
    name: "SBL Hebrew",
    cssName: "'Noto Serif Hebrew', 'Noto Sans Hebrew', serif",
    language: "hebrew",
    isDefault: true,
    description: "SBL Hebrew font for Biblical Hebrew text",
  },
  {
    id: "david",
    name: "David",
    cssName: "'David CLM', 'David', 'Times New Roman', serif",
    language: "hebrew",
    isDefault: false,
    description: "Traditional Hebrew font",
  },

  // Greek fonts
  {
    id: "sbl-greek",
    name: "SBL Greek",
    cssName: "'Noto Serif', serif",
    language: "greek",
    isDefault: true,
    description: "SBL Greek font for Biblical Greek text",
  },
  {
    id: "gentium",
    name: "Gentium",
    cssName: "'Gentium', 'Gentium Plus', serif",
    language: "greek",
    isDefault: false,
    description: "Elegant font with good support for Greek characters",
  },

  // Other languages
  {
    id: "system-sans",
    name: "System Sans",
    cssName: "system-ui, sans-serif",
    language: "other",
    isDefault: true,
    description: "Default system sans-serif font",
  },
  {
    id: "system-serif",
    name: "System Serif",
    cssName: "serif",
    language: "other",
    isDefault: false,
    description: "Default system serif font",
  },
]

// Get fonts for a specific language
export function getFontsForLanguage(language: string): FontDefinition[] {
  return allFonts.filter((font) => font.language === language)
}

// Get the default font for a language
export function getDefaultFontForLanguage(language: string): FontDefinition {
  const fonts = getFontsForLanguage(language)
  const defaultFont = fonts.find((font) => font.isDefault)

  if (defaultFont) {
    return defaultFont
  }

  // If no default font found for this language, return Montserrat
  return {
    id: "montserrat",
    name: "Montserrat",
    cssName: "var(--font-montserrat), system-ui, sans-serif",
    language: "english",
    isDefault: true,
    description: "Modern sans-serif font (default)",
  }
}

// Get a font by ID
export function getFontById(id: string | number): FontDefinition | undefined {
  return allFonts.find((font) => font.id === id)
}

export const useFontLoader = () => {
  const loadFont = async (fontId: string | number) => {
    const font = getFontById(fontId)
    if (!font) {
      console.error(`Font with ID ${fontId} not found`)
      return null
    }
    return font
  }

  return { loadFont }
}
