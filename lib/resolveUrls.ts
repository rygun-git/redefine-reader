export interface ResolvedUrls {
  versionUrl?: string
  outlineUrl?: string
  error?: string
}

interface BibleVersion {
  id: number
  title: string
  language: string
  description: string
  file_url: string
}

interface BibleOutline {
  id: number
  title: string
  file_url: string
}

const HARDCODED_VERSIONS: BibleVersion[] = [
  {
    id: 2,
    title: "LLV 352",
    language: "English",
    description: "Lawful Literal Version, Accountable Brothers' Standard Version of 2019-2025",
    file_url: "https://llvbible.com/bibles/2.txt",
  },
  {
    id: 1,
    title: "ESV",
    language: "English",
    description: "English Standard Version",
    file_url: "",
  },
]

const HARDCODED_OUTLINES: BibleOutline[] = [
  {
    id: 11,
    title: "LLV, AD2025/V1",
    file_url: "https://llvbible.com/outlines/11.json",
  },
  {
    id: 1,
    title: "Langton, AD1227",
    file_url: "",
  },
]

/**
 * Resolves version and outline IDs to their corresponding URLs using hardcoded data
 */
export async function resolveUrls(versionId?: string | null, outlineId?: string | null): Promise<ResolvedUrls> {
  const result: ResolvedUrls = {}

  try {
    // Fetch version URL if versionId is provided
    if (versionId) {
      const version = HARDCODED_VERSIONS.find((v) => v.id.toString() === versionId)
      if (!version) throw new Error(`Version not found for ID: ${versionId}`)
      if (!version.file_url) throw new Error(`Version URL not found for ID: ${versionId}`)

      result.versionUrl = version.file_url
      console.log(`Resolved versionId ${versionId} to URL: ${result.versionUrl}`)
    }

    // Fetch outline URL if outlineId is provided
    if (outlineId) {
      const outline = HARDCODED_OUTLINES.find((o) => o.id.toString() === outlineId)
      if (!outline) throw new Error(`Outline not found for ID: ${outlineId}`)
      if (!outline.file_url) throw new Error(`Outline URL not found for ID: ${outlineId}`)

      result.outlineUrl = outline.file_url
      console.log(`Resolved outlineId ${outlineId} to URL: ${result.outlineUrl}`)
    }

    return result
  } catch (error) {
    console.error("URL resolution error:", error, { versionId, outlineId })
    return {
      error: error instanceof Error ? error.message : "Failed to resolve URLs",
    }
  }
}
