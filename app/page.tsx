import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { OutlineManager } from "@/components/outline-manager"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Bible Reader</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Read Bible</CardTitle>
            <CardDescription>Open and read Bible versions from your library</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-24 h-24 flex items-center justify-center bg-muted rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-book-open"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/read" className="w-full">
              <Button className="w-full">Open Reader</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload Bible</CardTitle>
            <CardDescription>Upload new Bible versions to your library</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-24 h-24 flex items-center justify-center bg-muted rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-upload"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/upload" className="w-full">
              <Button className="w-full">Upload New Version</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Bible Outlines</CardTitle>
            <CardDescription>Manage your Bible outlines and download the default template</CardDescription>
          </CardHeader>
          <CardContent>
            <OutlineManager />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
