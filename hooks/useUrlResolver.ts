"use client"

import { useState, useEffect } from "react"
import { resolveUrls } from "@/lib/resolveUrls"

export function useUrlResolver(versionId: string | null, outlineId: string | null) {
  const [urls, setUrls] = useState<{
    versionUrl: string | null
    outlineUrl: string | null
  }>({
    versionUrl: null,
    outlineUrl: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchUrls() {
      try {
        setLoading(true)
        const resolvedUrls = await resolveUrls(versionId, outlineId)
        setUrls(resolvedUrls)
        setError(null)
      } catch (err) {
        console.error("Error resolving URLs:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    if (versionId || outlineId) {
      fetchUrls()
    }
  }, [versionId, outlineId])

  return { ...urls, loading, error }
}
