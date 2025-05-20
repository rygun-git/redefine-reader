import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: Request) {
  try {
    const { directory, filename, content } = await request.json()

    // Validate inputs
    if (!directory || !filename || !content) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Security check - only allow writing to specific directories
    const allowedDirectories = ["bibles", "outlines"]
    const baseDir = directory.startsWith("/") ? directory.substring(1) : directory

    if (!allowedDirectories.includes(baseDir)) {
      return NextResponse.json({ error: "Invalid directory" }, { status: 403 })
    }

    // Create the full path
    const publicDir = path.join(process.cwd(), "public")
    const fullDir = path.join(publicDir, baseDir)
    const fullPath = path.join(fullDir, filename)

    // Create directory if it doesn't exist
    await mkdir(fullDir, { recursive: true })

    // Write the file
    await writeFile(fullPath, content)

    return NextResponse.json({ success: true, path: `/${baseDir}/${filename}` })
  } catch (error) {
    console.error("Error saving file:", error)
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 })
  }
}
