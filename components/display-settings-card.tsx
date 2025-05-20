"use client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export function DisplaySettingsCard() {
  const router = useRouter()

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Display Settings</CardTitle>
        <CardDescription>Customize your reading experience</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Adjust font size, colors, spacing, and more to make reading comfortable for your eyes.
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={() => router.push("/settings/display")} className="w-full">
          <Settings className="h-4 w-4 mr-2" />
          Edit Settings
        </Button>
      </CardFooter>
    </Card>
  )
}
