"use server"

import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function saveFile(directory: string, filename: string, content: string) {
  // Security check - only allow writing to specific directories
  const allowedDirectories = ["bibles", "outlines"]
  const baseDir = directory.startsWith("/") ? directory.substring(1) : directory

  if (!allowedDirectories.includes(baseDir)) {
    throw new Error("Invalid directory")
  }

  // Create the full path
  const publicDir = path.join(process.cwd(), "public")
  const fullDir = path.join(publicDir, baseDir)
  const fullPath = path.join(fullDir, filename)

  // Create directory if it doesn't exist
  await mkdir(fullDir, { recursive: true })

  // Write the file
  await writeFile(fullPath, content)

  return `/${baseDir}/${filename}`
}
