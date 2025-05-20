import { NextResponse } from "next/server"

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
      const localVersionUrl = `https://llvbible.com/bibles/${versionId}.txt`
      versionUrl = localVersionUrl

    if (outlineId) {
      const localOutlineUrl = `https://llvbible.com/outlines/${outlineId}.json`
      outlineUrl = localOutlineUrl

  Console.Log("BibleUrl",versionUrl)
  Console.Log("OutlineUrl:",outlineUrl)

    return NextResponse.json({ versionUrl, outlineUrl })
  } catch (error) {
    console.error("Error resolving URLs:", error)
    return NextResponse.json({ error: "Failed to resolve ya URLs" }, { status: 500 })
  }
}
