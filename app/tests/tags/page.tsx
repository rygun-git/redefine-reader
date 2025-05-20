// app/tag-styles-test/page.tsx
"use client"

import { useEffect, useState } from "react"
import { TagStyle, loadTagStyles } from "@/lib/loadTagStyles"

export default function TagStylesTestPage() {
  const [tagStyles, setTagStyles] = useState<TagStyle[]>([])

  useEffect(() => {
    // Load from localStorage or default list
    setTagStyles(loadTagStyles())
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Tag Styles Test</h1>
      {tagStyles.length === 0 ? (
        <p>No tag styles found.</p>
      ) : (
        <ul className="space-y-3">
          {tagStyles.map((tag) => (
            <li key={tag.name} className="p-3 border rounded">
              <div className="flex justify-between items-center">
                <div>
                  <strong>{tag.name}</strong> 
                  <span className="ml-2 text-sm text-muted-foreground">({tag.openTag}{tag.closeTag && ` … ${tag.closeTag}`})</span>
                </div>
                <span className="text-xs italic">{tag.description}</span>
              </div>
              <div className={`mt-2 p-2 border-t ${tag.cssClass}`}>
                This is how “{tag.name}” text will appear.
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
