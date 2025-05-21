const fs = require("fs")
const path = require("path")

// This script runs after build to restore public files from the temp directory
const PUBLIC_DIR = path.join(__dirname, "public")
const TEMP_DIR = path.join(__dirname, ".public-backup")
const DIST_DIR = path.join(__dirname, "dist")
const DIST_PUBLIC_DIR = path.join(DIST_DIR, "public")

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

// Restore public directory
console.log("Restoring public directory...")
copyDir(TEMP_DIR, PUBLIC_DIR)

// Also copy to dist/public if it exists
if (fs.existsSync(DIST_DIR)) {
  console.log("Copying public files to dist directory...")
  copyDir(TEMP_DIR, DIST_PUBLIC_DIR)
}

console.log("Public directory restored successfully!")
