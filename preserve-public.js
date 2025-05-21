const fs = require("fs")
const path = require("path")

// This script runs before build to copy public files to a temp directory
const PUBLIC_DIR = path.join(__dirname, "public")
const TEMP_DIR = path.join(__dirname, ".public-backup")

// Create backup directory if it doesn't exist
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

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

// Backup public directory
console.log("Backing up public directory...")
copyDir(PUBLIC_DIR, TEMP_DIR)
console.log("Public directory backed up successfully!")
