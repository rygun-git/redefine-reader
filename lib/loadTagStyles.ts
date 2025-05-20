// lib/loadTagStyles.ts
import { defaultTagStyles, type TagStyle } from "./defaultTagStyles"

// Re-export the TagStyle interface
export type { TagStyle }

export function loadTagStyles(): TagStyle[] {
  if (typeof window === "undefined") return defaultTagStyles

  const saved = localStorage.getItem("bibleReaderTagStyles")
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    } catch (e) {
      console.warn("Error loading tag styles from localStorage:", e)
    }
  }
  return defaultTagStyles
}
