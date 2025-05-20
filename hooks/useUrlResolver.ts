"use client"

import { useState, useEffect } from "react"
import type { ResolvedUrls } from "@/lib/resolveUrls"

export function useUrlResolver(versionId?: string | null, outlineId?: string | null) {
  const [urls, setUrls] = useState<ResolvedUrls>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUrls = async () => {
      if (!versionId && !outlineId) return

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (versionId) params.append("version", versionId)
        if (outlineId) params.append("outline", outlineId)

        console.log("Fetching URLs with params:", { versionId, outlineId })
        const response = await fetch(`/api/resolve-urls?${params.toString()}`)
        const data = await response.json()

        console.log("URL resolution response:", data)

        if (!response.ok) {
          throw new Error(data.error || "Failed to resolve URLs")
        }

        setUrls({
          versionUrl: data.versionUrl,
          outlineUrl: data.outlineUrl,
        })
      } catch (err) {
        console.error("URL resolution error in hook:", err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    fetchUrls()
  }, [versionId, outlineId])

  return { ...urls, loading, error }
}
