"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useUrlResolver } from "@/hooks/useUrlResolver"

export default function ResolveUrlsPage() {
  const [versionId, setVersionId] = useState("")
  const [outlineId, setOutlineId] = useState("")
  const [resolving, setResolving] = useState(false)
  const [versionUrl, setVersionUrl] = useState<string | null>(null)
  const [outlineUrl, setOutlineUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (resolving) {
      const resolveUrls = async () => {
        setLoading(true)
        setError(null)
        try {
          const {
            versionUrl: vUrl,
            outlineUrl: oUrl,
            loading: l,
            error: e,
          } = await useUrlResolver(versionId || null, outlineId || null)
          setVersionUrl(vUrl)
          setOutlineUrl(oUrl)
          setError(e)
        } catch (err: any) {
          setError(err.message || "An unexpected error occurred.")
        } finally {
          setLoading(false)
        }
      }

      resolveUrls()
    } else {
      setVersionUrl(null)
      setOutlineUrl(null)
      setLoading(false)
      setError(null)
    }
  }, [resolving, versionId, outlineId])

  const handleResolve = () => {
    setResolving(true)
  }

  const handleReset = () => {
    setVersionId("")
    setOutlineId("")
    setResolving(false)
  }

  const generateReadUrl = () => {
    if (!versionId && !outlineId) return ""

    let url = "/read?"
    if (versionId) url += `version=${versionId}`
    if (versionId && outlineId) url += "&"
    if (outlineId) url += `outline=${outlineId}`

    return url
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>URL Resolver</CardTitle>
          <CardDescription>Enter version and/or outline IDs to resolve their URLs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="version-id">Version ID</Label>
            <Input
              id="version-id"
              value={versionId}
              onChange={(e) => setVersionId(e.target.value)}
              placeholder="Enter version ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outline-id">Outline ID</Label>
            <Input
              id="outline-id"
              value={outlineId}
              onChange={(e) => setOutlineId(e.target.value)}
              placeholder="Enter outline ID"
            />
          </div>

          {resolving && (
            <div className="rounded-md bg-gray-50 p-4 mt-4">
              <h3 className="text-sm font-medium">Results:</h3>

              {loading && <p className="text-sm text-gray-500">Loading...</p>}

              {error && <p className="text-sm text-red-500 mt-2">Error: {error}</p>}

              {!loading && !error && (
                <div className="space-y-2 mt-2">
                  {versionUrl && (
                    <div>
                      <p className="text-xs font-medium">Version URL:</p>
                      <p className="text-xs break-all bg-gray-100 p-2 rounded">{versionUrl}</p>
                    </div>
                  )}

                  {outlineUrl && (
                    <div>
                      <p className="text-xs font-medium">Outline URL:</p>
                      <p className="text-xs break-all bg-gray-100 p-2 rounded">{outlineUrl}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium">Read URL:</p>
                    <p className="text-xs break-all bg-gray-100 p-2 rounded">{generateReadUrl()}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleResolve} disabled={(!versionId && !outlineId) || loading}>
            Resolve
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
