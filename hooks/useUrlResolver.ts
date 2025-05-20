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
        // First try local files
        if (versionId) {
          const localVersionUrl = `/bibles/${versionId}.txt`
          setVersionUrl(localVersionUrl)
        }

        if (outlineId) {
          const localOutlineUrl = `/outlines/${outlineId}.json`
          setOutlineUrl(localOutlineUrl)
        }

        // Then check with the API as a fallback
        const params = new URLSearchParams()
        if (versionId) params.append("version", versionId)
        if (outlineId) params.append("outline", outlineId)

        const response = await fetch(`/api/resolve-urls?${params.toString()}`)

        if (!response.ok) {
          throw new Error(`Failed to resolve URLs: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        if (data.versionUrl) setVersionUrl(data.versionUrl)
        if (data.outlineUrl) setOutlineUrl(data.outlineUrl)

        console.log("URL resolution complete:", { versionUrl: data.versionUrl, outlineUrl: data.outlineUrl })
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
