/**
 * Client-side URL resolver function
 */
export async function resolveUrls(
  versionId: string | null,
  outlineId: string | null,
): Promise<{
  versionUrl: string | null
  outlineUrl: string | null
}> {
  if (!versionId && !outlineId) {
    throw new Error("Missing version or outline parameter")
  }

  let versionUrl: string | null = null
  let outlineUrl: string | null = null

  // Resolve version URL
  if (versionId) {
    versionUrl = `https://llvbible.com/bibles/${versionId}.txt`
  }

  // Resolve outline URL
  if (outlineId) {
    outlineUrl = `https://llvbible.com/outlines/${outlineId}.json`
  }

  console.log("BibleUrl", versionUrl)
  console.log("OutlineUrl:", outlineUrl)

  return { versionUrl, outlineUrl }
}
