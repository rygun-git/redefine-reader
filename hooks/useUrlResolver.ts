"use client"

import { useState, useEffect } from "react"

export function useUrlResolver(versionId: string | null, outlineId: string | null) {
  const [versionUrl, setVersionUrl] = useState<string | null>(null)
  const [outlineUrl, setOutlineUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const resolveUrls = async () => {
      if (!versionId && !outlineId) {
        setLoading(false)
        return
      }

      try {
        // Initialize variables to store URLs
        let newVersionUrl: string | null = null
        let newOutlineUrl: string | null = null

        // Resolve version URL if versionId is provided
        if (versionId) {
          newVersionUrl = `https://llvbible.com/bibles/${versionId}.txt`
          setVersionUrl(newVersionUrl)
        }

        // Resolve outline URL if outlineId is provided
        if (outlineId) {
          newOutlineUrl = `https://llvbible.com/outlines/${outlineId}.json`
          setOutlineUrl(newOutlineUrl)
        }

        console.log("URL resolution complete:", { versionUrl: newVersionUrl, outlineUrl: newOutlineUrl })
        setLoading(false)
      } catch (err) {
        console.error("Error resolving URLs:", err)
        setError(`Failed to resolve URLs: ${err instanceof Error ? err.message : "Unknown error"}`)
        setLoading(false)
      }
    }

    setLoading(true)
    setError(null)
    resolveUrls()
  }, [versionId, outlineId])

  return { versionUrl, outlineUrl, loading, error }
}
