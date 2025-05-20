import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next()

  // Add the CORS headers
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

  return response
}

// Configure the middleware to run on all routes
export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
}
