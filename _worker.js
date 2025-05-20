export default {
  async fetch(request, env) {
    // Forward the request to the Next.js server
    const url = new URL(request.url)
    const nextUrl = new URL(url.pathname + url.search, "https://example.com")

    return env.ASSETS.fetch(nextUrl.pathname + nextUrl.search, request)
  },
}
