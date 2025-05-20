import { type NextRequest, NextResponse } from "next/server"
import { resolveUrls } from "@/lib/resolveUrls"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const versionId = searchParams.get("version")
  const outlineId = searchParams.get("outline")

  try {
    const result = await resolveUrls(versionId, outlineId)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in resolve-urls API route:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve URLs" },
      { status: 500 },
    )
  }
}
