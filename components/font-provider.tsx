"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { getDisplaySettings } from "@/lib/indexedDB"

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [fontSettings, setFontSettings] = useState({
    fontFamily: "var(--font-montserrat), system-ui, sans-serif",
    appFontFamily: "var(--font-montserrat), system-ui, sans-serif",
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const loadFontSettings = async () => {
      try {
        const settings = await getDisplaySettings()
        if (settings && (settings.fontFamily || settings.appFontFamily)) {
          setFontSettings({
            fontFamily: settings.fontFamily || "var(--font-montserrat), system-ui, sans-serif",
            appFontFamily: settings.appFontFamily || "var(--font-montserrat), system-ui, sans-serif",
          })
          console.log("Loaded font settings:", {
            fontFamily: settings.fontFamily,
            appFontFamily: settings.appFontFamily,
          })
        }
      } catch (error) {
        console.error("Error loading font settings:", error)
      } finally {
        setLoaded(true)
      }
    }

    loadFontSettings()
  }, [])

  // Apply the font settings to the document
  useEffect(() => {
    if (loaded) {
      // Apply app font to the body
      document.body.style.fontFamily = fontSettings.appFontFamily

      // Create or update the CSS variables
      document.documentElement.style.setProperty("--reader-font", fontSettings.fontFamily)
      document.documentElement.style.setProperty("--app-font", fontSettings.appFontFamily)

      console.log("Applied font settings:", {
        appFont: fontSettings.appFontFamily,
        readerFont: fontSettings.fontFamily,
      })
    }
  }, [fontSettings, loaded])

  return <>{children}</>
}
