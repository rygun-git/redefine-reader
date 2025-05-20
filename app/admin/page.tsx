"use client"
import Link from "next/link"
import { CardFooter } from "@/components/ui/card"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Settings, Upload, List, Edit, Type, Tag, Palette, ChevronLeft } from "lucide-react"

// Pastel color palette
const iconColors = {
  upload: "#FFD6E0", // Pastel pink
  list: "#C1E1C5", // Pastel green
  type: "#C7CEEA", // Pastel lavender
  fileText: "#FFECA9", // Pastel yellow
  edit: "#B5EAD7", // Pastel mint
  settings: "#FFDAC1", // Pastel peach
  tag: "#F0DBFF", // Pastel purple
  palette: "#FFD6BA", // Pastel orange
}

export default function AdminPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Bible Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/admin/upload-bible">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <Upload className="h-8 w-8 mb-2" style={{ color: iconColors.upload }} />
                  <CardTitle>Upload Bible</CardTitle>
                  <CardDescription>Add a new Bible version to the library</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Upload a new Bible version in the supported format. The system will parse and store it for readers.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    style={{ backgroundColor: iconColors.upload, color: "#000", borderColor: iconColors.upload }}
                  >
                    Upload Bible
                  </Button>
                </CardFooter>
              </Card>
            </Link>

            <Link href="/admin/manage-bibles">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <List className="h-8 w-8 mb-2" style={{ color: iconColors.list }} />
                  <CardTitle>Manage Bibles</CardTitle>
                  <CardDescription>View and edit existing Bible versions</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View all uploaded Bible versions, edit their metadata, or delete versions that are no longer needed.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    style={{ backgroundColor: iconColors.list, color: "#000", borderColor: iconColors.list }}
                  >
                    Manage Bibles
                  </Button>
                </CardFooter>
              </Card>
            </Link>

            <Link href="/admin/manage-fonts">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <Type className="h-8 w-8 mb-2" style={{ color: iconColors.type }} />
                  <CardTitle>Font Manager</CardTitle>
                  <CardDescription>Manage fonts for different languages</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Add, edit, and manage fonts for different languages. Set default fonts for each language.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    style={{ backgroundColor: iconColors.type, color: "#000", borderColor: iconColors.type }}
                  >
                    Manage Fonts
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Outline Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/admin/create-outline">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <FileText className="h-8 w-8 mb-2" style={{ color: iconColors.fileText }} />
                  <CardTitle>Create Outline</CardTitle>
                  <CardDescription>Create a new Bible outline</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create a new outline with chapters, sections, and verse references to help readers navigate the
                    Bible.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    style={{ backgroundColor: iconColors.fileText, color: "#000", borderColor: iconColors.fileText }}
                  >
                    Create Outline
                  </Button>
                </CardFooter>
              </Card>
            </Link>

            <Link href="/admin/manage-outlines">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <List className="h-8 w-8 mb-2" style={{ color: iconColors.list }} />
                  <CardTitle>Manage Outlines</CardTitle>
                  <CardDescription>View and edit existing Bible outlines</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View all created outlines, edit their structure, or delete outlines that are no longer needed.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    style={{ backgroundColor: iconColors.list, color: "#000", borderColor: iconColors.list }}
                  >
                    Manage Outlines
                  </Button>
                </CardFooter>
              </Card>
            </Link>

            <Link href="/admin/edit-outline">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <Edit className="h-8 w-8 mb-2" style={{ color: iconColors.edit }} />
                  <CardTitle>Edit Outline</CardTitle>
                  <CardDescription>Edit an existing Bible outline</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Make changes to an existing outline, update sections, or adjust verse references.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    style={{ backgroundColor: iconColors.edit, color: "#000", borderColor: iconColors.edit }}
                  >
                    Edit Outline
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Reader Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/settings">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <Settings className="h-8 w-8 mb-2" style={{ color: iconColors.settings }} />
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Configure general application settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Adjust general settings for the Bible reader application, including default behaviors and
                    preferences.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    style={{ backgroundColor: iconColors.settings, color: "#000", borderColor: iconColors.settings }}
                  >
                    General Settings
                  </Button>
                </CardFooter>
              </Card>
            </Link>

            <Link href="/settings/display">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <Palette className="h-8 w-8 mb-2" style={{ color: iconColors.palette }} />
                  <CardTitle>Display Settings</CardTitle>
                  <CardDescription>Customize the reading experience</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Adjust font size, colors, spacing, and more to make reading comfortable for your eyes.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    style={{ backgroundColor: iconColors.palette, color: "#000", borderColor: iconColors.palette }}
                  >
                    Display Settings
                  </Button>
                </CardFooter>
              </Card>
            </Link>

            <Link href="/settings/tag-styling">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <Tag className="h-8 w-8 mb-2" style={{ color: iconColors.tag }} />
                  <CardTitle>Tag Management</CardTitle>
                  <CardDescription>Manage Bible text tags and styling</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Define and customize how different tags in the Bible text are displayed, including footnotes,
                    emphasis, and more.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    style={{ backgroundColor: iconColors.tag, color: "#000", borderColor: iconColors.tag }}
                  >
                    Manage Tags
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
