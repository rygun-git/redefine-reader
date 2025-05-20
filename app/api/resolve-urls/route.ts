import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const versionId = searchParams.get("version")
  const outlineId = searchParams.get("outline")

  if (!versionId && !outlineId) {
    return NextResponse.json({ error: "Missing version or outline parameter" }, { status: 400 })
  }

  try {
    const supabase = createClient()
    let versionUrl: string | null = null
    let outlineUrl: string | null = null

    // Check if we should use local files first
    if (versionId) {
      const localVersionUrl = `/bibles/${versionId}.txt`
      versionUrl = localVersionUrl

      // Fallback to database if needed
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          const { data: versionData, error: versionError } = await supabase
            .from("bible_versions")
            .select("url")
            .eq("id", versionId)
            .single()

          if (versionError) {
            console.error("Error fetching version URL:", versionError)
          } else if (versionData?.url) {
            console.log(`[SERVER] Resolved versionId ${versionId} to URL: ${versionData.url}`)
            versionUrl = versionData.url
          }
        } catch (error) {
          console.error("Error accessing Supabase for version:", error)
        }
      }
    }

    if (outlineId) {
      const localOutlineUrl = `/outlines/${outlineId}.json`
      outlineUrl = localOutlineUrl

      // Fallback to database if needed
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          const { data: outlineData, error: outlineError } = await supabase
            .from("bible_outlines")
            .select("url")
            .eq("id", outlineId)
            .single()

          if (outlineError) {
            console.error("Error fetching outline URL:", outlineError)
          } else if (outlineData?.url) {
            console.log(`[SERVER] Resolved outlineId ${outlineId} to URL: ${outlineData.url}`)
            outlineUrl = outlineData.url
          }
        } catch (error) {
          console.error("Error accessing Supabase for outline:", error)
        }
      }
    }

    return NextResponse.json({ versionUrl, outlineUrl })
  } catch (error) {
    console.error("Error resolving URLs:", error)
    return NextResponse.json({ error: "Failed to resolve URLs" }, { status: 500 })
  }
}
