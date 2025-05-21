"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, BookOpen, Plus, Trash2, Archive, ArchiveRestore, Home } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useRouter, useSearchParams } from "next/navigation"
import {
  type ReadingPlan,
  createReadingPlan,
  addChapterToPlan,
  addChaptersToPlan,
  addBookToPlan,
  markChapterCompleted,
  calculatePlanProgress,
  togglePlanArchived,
} from "@/lib/reading-plan"
import {
  getAllReadingPlans,
  storeReadingPlan,
  deleteReadingPlan,
  getReadingPlan,
  getDisplaySettings,
} from "@/lib/indexedDB"
import { VersionSelectionModal } from "@/components/version-selection-modal"

export default function ReadingPlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get("id")

  const [activeTab, setActiveTab] = useState("summary")
  const [readingPlans, setReadingPlans] = useState<ReadingPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<ReadingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Version selection state
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<{ book: string; chapter: number } | null>(null)
  const [defaultVersionId, setDefaultVersionId] = useState<string | null>(null)
  const [defaultOutlineId, setDefaultOutlineId] = useState<string | null>(null)

  // New plan state
  const [showNewPlanDialog, setShowNewPlanDialog] = useState(false)
  const [newPlanName, setNewPlanName] = useState("")
  const [newPlanDescription, setNewPlanDescription] = useState("")

  // Add chapter state
  const [showAddChapterDialog, setShowAddChapterDialog] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState("")
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const [addMode, setAddMode] = useState<"single" | "multiple" | "book">("single")
  const [chaptersToAdd, setChaptersToAdd] = useState(1)

  // Available books and chapters
  const [availableBooks, setAvailableBooks] = useState<string[]>([
    "Genesis",
    "Exodus",
    "Leviticus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "Judges",
    "Ruth",
    "1 Samuel",
    "2 Samuel",
    "1 Kings",
    "2 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
    "Job",
    "Psalms",
    "Proverbs",
    "Ecclesiastes",
    "Song of Solomon",
    "Isaiah",
    "Jeremiah",
    "Lamentations",
    "Ezekiel",
    "Daniel",
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
    "Matthew",
    "Mark",
    "Luke",
    "John",
    "Acts",
    "Romans",
    "1 Corinthians",
    "2 Corinthians",
    "Galatians",
    "Ephesians",
    "Philippians",
    "Colossians",
    "1 Thessalonians",
    "2 Thessalonians",
    "1 Timothy",
    "2 Timothy",
    "Titus",
    "Philemon",
    "Hebrews",
    "James",
    "1 Peter",
    "2 Peter",
    "1 John",
    "2 John",
    "3 John",
    "Jude",
    "Revelation",
  ])

  const [availableChapters, setAvailableChapters] = useState<number[]>([])

  // Book chapter counts (approximate)
  const bookChapterCounts: Record<string, number> = {
    Genesis: 50,
    Exodus: 40,
    Leviticus: 27,
    Numbers: 36,
    Deuteronomy: 34,
    Joshua: 24,
    Judges: 21,
    Ruth: 4,
    "1 Samuel": 31,
    "2 Samuel": 24,
    "1 Kings": 22,
    "2 Kings": 25,
    "1 Chronicles": 29,
    "2 Chronicles": 36,
    Ezra: 10,
    Nehemiah: 13,
    Esther: 10,
    Job: 42,
    Psalms: 150,
    Proverbs: 31,
    Ecclesiastes: 12,
    "Song of Solomon": 8,
    Isaiah: 66,
    Jeremiah: 52,
    Lamentations: 5,
    Ezekiel: 48,
    Daniel: 12,
    Hosea: 14,
    Joel: 3,
    Amos: 9,
    Obadiah: 1,
    Jonah: 4,
    Micah: 7,
    Nahum: 3,
    Habakkuk: 3,
    Zephaniah: 3,
    Haggai: 2,
    Zechariah: 14,
    Malachi: 4,
    Matthew: 28,
    Mark: 16,
    Luke: 24,
    John: 21,
    Acts: 28,
    Romans: 16,
    "1 Corinthians": 16,
    "2 Corinthians": 13,
    Galatians: 6,
    Ephesians: 6,
    Philippians: 4,
    Colossians: 4,
    "1 Thessalonians": 5,
    "2 Thessalonians": 3,
    "1 Timothy": 6,
    "2 Timothy": 4,
    Titus: 3,
    Philemon: 1,
    Hebrews: 13,
    James: 5,
    "1 Peter": 5,
    "2 Peter": 3,
    "1 John": 5,
    "2 John": 1,
    "3 John": 1,
    Jude: 1,
    Revelation: 22,
  }

  // Bible structure for summary view
  const bibleStructure = [
    { section: "Law", books: ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"] },
    {
      section: "History",
      books: [
        "Joshua",
        "Judges",
        "Ruth",
        "1 Samuel",
        "2 Samuel",
        "1 Kings",
        "2 Kings",
        "1 Chronicles",
        "2 Chronicles",
        "Ezra",
        "Nehemiah",
        "Esther",
      ],
    },
    { section: "Poetry", books: ["Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon"] },
    { section: "Major Prophets", books: ["Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel"] },
    {
      section: "Minor Prophets",
      books: [
        "Hosea",
        "Joel",
        "Amos",
        "Obadiah",
        "Jonah",
        "Micah",
        "Nahum",
        "Habakkuk",
        "Zephaniah",
        "Haggai",
        "Zechariah",
        "Malachi",
      ],
    },
    { section: "Gospels & Acts", books: ["Matthew", "Mark", "Luke", "John", "Acts"] },
    {
      section: "Paul's Letters",
      books: [
        "Romans",
        "1 Corinthians",
        "2 Corinthians",
        "Galatians",
        "Ephesians",
        "Philippians",
        "Colossians",
        "1 Thessalonians",
        "2 Thessalonians",
        "1 Timothy",
        "2 Timothy",
        "Titus",
        "Philemon",
      ],
    },
    {
      section: "General Letters",
      books: ["Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude"],
    },
    { section: "Apocalyptic", books: ["Revelation"] },
  ]

  // Load reading plans and default settings
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        // Load default settings
        const settings = await getDisplaySettings()
        if (settings) {
          setDefaultVersionId(settings.defaultVersionId || null)
          setDefaultOutlineId(settings.defaultOutlineId || null)
        }

        // Load reading plans
        const plans = await getAllReadingPlans()
        setReadingPlans(plans)

        // If a plan ID is provided in the URL, load that specific plan
        if (planId) {
          const plan = await getReadingPlan(planId)
          if (plan) {
            setSelectedPlan(plan)
          }
        }

        setError(null)
      } catch (err) {
        console.error("Error loading data:", err)
        setError("Failed to load reading plans. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [planId])

  // Update available chapters when book changes
  useEffect(() => {
    if (selectedBook) {
      const chapterCount = bookChapterCounts[selectedBook] || 1
      const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1)
      setAvailableChapters(chapters)

      // Reset selected chapter
      setSelectedChapter(null)
    } else {
      setAvailableChapters([])
      setSelectedChapter(null)
    }
  }, [selectedBook])

  // Create a new reading plan
  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) {
      setError("Please enter a plan name")
      return
    }

    try {
      const newPlan = createReadingPlan(newPlanName.trim(), newPlanDescription.trim() || undefined)
      await storeReadingPlan(newPlan)

      // Update local state
      setReadingPlans([...readingPlans, newPlan])

      // Reset form
      setNewPlanName("")
      setNewPlanDescription("")
      setShowNewPlanDialog(false)

      // Switch to the new plan
      setSelectedPlanId(newPlan.id)
      setActiveTab("my-plans")
    } catch (err) {
      console.error("Error creating reading plan:", err)
      setError("Failed to create reading plan. Please try again.")
    }
  }

  // Add chapter(s) to plan
  const handleAddChapter = async () => {
    if (!selectedPlanId || !selectedBook) {
      setError("Please select a plan and book")
      return
    }

    try {
      // Find the plan
      const planIndex = readingPlans.findIndex((p) => p.id === selectedPlanId)
      if (planIndex === -1) {
        setError("Selected plan not found")
        return
      }

      let updatedPlan: ReadingPlan

      if (addMode === "single") {
        if (!selectedChapter) {
          setError("Please select a chapter")
          return
        }

        // Add single chapter
        updatedPlan = addChapterToPlan(readingPlans[planIndex], selectedBook, selectedChapter)
      } else if (addMode === "multiple") {
        if (!selectedChapter) {
          setError("Please select a starting chapter")
          return
        }

        // Add multiple chapters
        updatedPlan = addChaptersToPlan(readingPlans[planIndex], selectedBook, selectedChapter, chaptersToAdd)
      } else {
        // Add entire book
        const chapterCount = bookChapterCounts[selectedBook] || 1
        updatedPlan = addBookToPlan(readingPlans[planIndex], selectedBook, chapterCount)
      }

      // Save updated plan
      await storeReadingPlan(updatedPlan)

      // Update local state
      const updatedPlans = [...readingPlans]
      updatedPlans[planIndex] = updatedPlan
      setReadingPlans(updatedPlans)

      // If we have a selected plan and it's the one we're updating, update it too
      if (selectedPlan && selectedPlan.id === updatedPlan.id) {
        setSelectedPlan(updatedPlan)
      }

      // Reset form
      setSelectedBook("")
      setSelectedChapter(null)
      setChaptersToAdd(1)
      setAddMode("single")
      setShowAddChapterDialog(false)
    } catch (err) {
      console.error("Error adding chapter to plan:", err)
      setError("Failed to add chapter to plan. Please try again.")
    }
  }

  // Toggle chapter completion
  const handleToggleChapterCompletion = async (planId: string, chapterIndex: number, completed: boolean) => {
    try {
      // Find the plan
      const planIndex = readingPlans.findIndex((p) => p.id === planId)
      if (planIndex === -1) {
        setError("Selected plan not found")
        return
      }

      // Update chapter completion
      const updatedPlan = markChapterCompleted(readingPlans[planIndex], chapterIndex, completed)

      // Save updated plan
      await storeReadingPlan(updatedPlan)

      // Update local state
      const updatedPlans = [...readingPlans]
      updatedPlans[planIndex] = updatedPlan
      setReadingPlans(updatedPlans)

      // If we have a selected plan and it's the one we're updating, update it too
      if (selectedPlan && selectedPlan.id === updatedPlan.id) {
        setSelectedPlan(updatedPlan)
      }
    } catch (err) {
      console.error("Error updating chapter completion:", err)
      setError("Failed to update chapter completion. Please try again.")
    }
  }

  // Archive or unarchive a plan
  const handleToggleArchive = async (planId: string, archived: boolean) => {
    try {
      // Find the plan
      const planIndex = readingPlans.findIndex((p) => p.id === planId)
      if (planIndex === -1) {
        setError("Selected plan not found")
        return
      }

      // Update plan archived status
      const updatedPlan = togglePlanArchived(readingPlans[planIndex], archived)

      // Save updated plan
      await storeReadingPlan(updatedPlan)

      // Update local state
      const updatedPlans = [...readingPlans]
      updatedPlans[planIndex] = updatedPlan
      setReadingPlans(updatedPlans)

      // If we have a selected plan and it's the one we're updating, update it too
      if (selectedPlan && selectedPlan.id === updatedPlan.id) {
        setSelectedPlan(updatedPlan)
      }
    } catch (err) {
      console.error("Error updating plan archive status:", err)
      setError("Failed to update plan archive status. Please try again.")
    }
  }

  // Delete a reading plan
  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this reading plan?")) {
      return
    }

    try {
      await deleteReadingPlan(planId)

      // Update local state
      setReadingPlans(readingPlans.filter((p) => p.id !== planId))

      // If we have a selected plan and it's the one we're deleting, clear it
      if (selectedPlan && selectedPlan.id === planId) {
        setSelectedPlan(null)
      }
    } catch (err) {
      console.error("Error deleting reading plan:", err)
      setError("Failed to delete reading plan. Please try again.")
    }
  }

  // Navigate to read a specific chapter
  const handleReadChapter = (book: string, chapter: number) => {
    // Check if we have default version and outline
    if (defaultVersionId && defaultOutlineId) {
      // Navigate directly to the chapter
      router.push(
        `/read/view?version=${defaultVersionId}&outline=${defaultOutlineId}&book=${encodeURIComponent(book)}&chapter=${chapter}`,
      )
    } else {
      // Store the pending navigation and show version selection modal
      setPendingNavigation({ book, chapter })
      setShowVersionModal(true)
    }
  }

  // Handle version selection from modal
  const handleVersionSelected = (versionId: string, outlineId: string) => {
    // Close the modal
    setShowVersionModal(false)

    // Update default IDs
    setDefaultVersionId(versionId)
    setDefaultOutlineId(outlineId)

    // Navigate to the chapter if we have pending navigation
    if (pendingNavigation) {
      router.push(
        `/read/view?version=${versionId}&outline=${outlineId}&book=${encodeURIComponent(pendingNavigation.book)}&chapter=${pendingNavigation.chapter}`,
      )
      setPendingNavigation(null)
    }
  }

  // Get active plans (not archived)
  const activePlans = readingPlans.filter((plan) => !plan.archived)

  // Get archived plans
  const archivedPlans = readingPlans.filter((plan) => plan.archived)

  // Render reading plan card
  const renderPlanCard = (plan: ReadingPlan) => {
    const progress = calculatePlanProgress(plan)

    return (
      <Card key={plan.id} className="mb-4">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{plan.name}</CardTitle>
              {plan.description && <CardDescription>{plan.description}</CardDescription>}
            </div>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggleArchive(plan.id, !plan.archived)}
                title={plan.archived ? "Unarchive Plan" : "Archive Plan"}
              >
                {plan.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDeletePlan(plan.id)} title="Delete Plan">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {plan.chapters.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between mb-1 text-sm">
                <span>
                  Progress: {progress.completedChapters} of {progress.totalChapters} chapters
                </span>
                <span>{Math.round(progress.percentComplete)}%</span>
              </div>
              <Progress value={progress.percentComplete} className="h-2" />
            </div>
          )}

          <div className="space-y-4">
            {plan.chapters.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>No chapters added to this plan yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSelectedPlanId(plan.id)
                    setShowAddChapterDialog(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chapter
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {plan.chapters.map((chapter, chapterIndex) => (
                    <div key={`${chapter.book}-${chapter.chapter}`} className="border rounded-md p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Checkbox
                            checked={chapter.completed}
                            onCheckedChange={(checked) =>
                              handleToggleChapterCompletion(plan.id, chapterIndex, checked === true)
                            }
                            className="mr-2"
                          />
                          <span className={chapter.completed ? "line-through text-muted-foreground" : ""}>
                            {chapter.book} {chapter.chapter}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReadChapter(chapter.book, chapter.chapter)}
                          >
                            <BookOpen className="h-4 w-4 mr-1" />
                            Read
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPlanId(plan.id)
                      setShowAddChapterDialog(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Chapter
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render Bible summary view
  const renderBibleSummary = () => {
    // Combine all chapters from all active plans
    const allChapters = activePlans.flatMap((plan) => plan.chapters)

    // Calculate total Bible chapters
    const totalBibleChapters = Object.values(bookChapterCounts).reduce((sum, count) => sum + count, 0)

    // Count unique completed chapters across all plans
    const uniqueCompletedChapters = new Set()
    allChapters.forEach((chapter) => {
      if (chapter.completed) {
        uniqueCompletedChapters.add(`${chapter.book}-${chapter.chapter}`)
      }
    })

    const completedBibleChapters = uniqueCompletedChapters.size
    const bibleProgressPercent = (completedBibleChapters / totalBibleChapters) * 100

    return (
      <div className="space-y-8">
        <div className="mb-6 p-4  rounded-lg">
          <h3 className="font-medium mb-2">Overall Bible Progress</h3>
          <div className="mb-4">
            <div className="flex justify-between mb-1 text-sm">
              <span>
                Completed: {completedBibleChapters} of {totalBibleChapters} chapters
              </span>
              <span>{Math.round(bibleProgressPercent)}%</span>
            </div>
            <Progress value={bibleProgressPercent} className="h-2" />
          </div>

          <h3 className="font-medium mb-2">Legend</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-600 mr-2"></div>
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-blue-100 border border-blue-300 mr-2"></div>
              <span className="text-sm">In Plan (Not Completed)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-gray-100 mr-2"></div>
              <span className="text-sm">Not in Plan</span>
            </div>
          </div>
        </div>

        {bibleStructure.map((section) => (
          <div key={section.section} className="space-y-4">
            <h3 className="text-lg font-semibold">{section.section}</h3>
            <div className="space-y-6">
              {section.books.map((book) => {
                const chapterCount = bookChapterCounts[book] || 1
                const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1)

                return (
                  <div key={book} className="space-y-2">
                    <h4 className="text-md font-medium">{book}</h4>
                    <div className="flex flex-wrap gap-1">
                      {chapters.map((chapter) => {
                        const isCompleted = allChapters.some(
                          (c) => c.book === book && c.chapter === chapter && c.completed,
                        )
                        const isInPlan = allChapters.some((c) => c.book === book && c.chapter === chapter)

                        return (
                          <div
                            key={`${book}-${chapter}`}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer ${
                              isCompleted
                                ? "bg-green-600 text-white"
                                : isInPlan
                                  ? "bg-blue-100 border border-blue-300"
                                  : "bg-gray-100 text-gray-500"
                            }`}
                            onClick={() => handleReadChapter(book, chapter)}
                            title={`${book} ${chapter}${isCompleted ? " (Completed)" : isInPlan ? " (In Plan)" : ""}`}
                          >
                            {chapter}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reading Plans</h1>
        <Button variant="ghost" size="icon" onClick={() => router.push("/")} title="Home">
          <Home className="h-5 w-5" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
         <TabsTrigger value="summary">Bible Summary</TabsTrigger>
          <TabsTrigger value="my-plans">Active Plans</TabsTrigger>
          <TabsTrigger value="archived">Archived Plans</TabsTrigger>  
          <TabsTrigger value="create-plan">Create Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="my-plans">
          {loading ? (
            <div className="text-center py-8">Loading reading plans...</div>
          ) : selectedPlan ? (
            // Show selected plan details
            <div>
              <Button variant="outline" size="sm" className="mb-4" onClick={() => setSelectedPlan(null)}>
                Back to All Plans
              </Button>
              {renderPlanCard(selectedPlan)}
            </div>
          ) : activePlans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">You don't have any active reading plans.</p>
              <Button onClick={() => setActiveTab("create-plan")}>Create Your First Plan</Button>
            </div>
          ) : (
            <div>{activePlans.map(renderPlanCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="archived">
          {loading ? (
            <div className="text-center py-8">Loading archived plans...</div>
          ) : archivedPlans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You don't have any archived reading plans.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Archive completed plans to keep your active plans list organized.
              </p>
            </div>
          ) : (
            <div>{archivedPlans.map(renderPlanCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="summary">
          {loading ? (
            <div className="text-center py-8">Loading Bible summary...</div>
          ) : (
            <div>
              
              {renderBibleSummary()}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create-plan">
          <Card>
            <CardHeader>
              <CardTitle>Create a New Reading Plan</CardTitle>
              <CardDescription>
                Create a personalized reading plan to track your Bible reading progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Plan Name</Label>
                  <Input
                    id="plan-name"
                    placeholder="e.g., New Testament in 90 Days"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-description">Description (Optional)</Label>
                  <Input
                    id="plan-description"
                    placeholder="Brief description of your reading plan"
                    value={newPlanDescription}
                    onChange={(e) => setNewPlanDescription(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreatePlan}>Create Plan</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Chapter Dialog */}
      <Dialog open={showAddChapterDialog} onOpenChange={setShowAddChapterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Reading Plan</DialogTitle>
            <DialogDescription>Select what you want to add to your reading plan.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Add Mode</Label>
              <RadioGroup
                value={addMode}
                onValueChange={(value) => setAddMode(value as "single" | "multiple" | "book")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single">Single Chapter</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple" id="multiple" />
                  <Label htmlFor="multiple">Multiple Chapters</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="book" id="book" />
                  <Label htmlFor="book">Entire Book</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="select-book">Book</Label>
              <Select value={selectedBook} onValueChange={setSelectedBook}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a book" />
                </SelectTrigger>
                <SelectContent>
                  {availableBooks.map((book) => (
                    <SelectItem key={book} value={book}>
                      {book}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {addMode !== "book" && (
              <div className="space-y-2">
                <Label htmlFor="select-chapter">{addMode === "multiple" ? "Starting Chapter" : "Chapter"}</Label>
                <Select
                  value={selectedChapter?.toString() || ""}
                  onValueChange={(value) => setSelectedChapter(Number.parseInt(value))}
                  disabled={!selectedBook}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select a ${addMode === "multiple" ? "starting " : ""}chapter`} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChapters.map((chapter) => (
                      <SelectItem key={chapter} value={chapter.toString()}>
                        {chapter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {addMode === "multiple" && (
              <div className="space-y-2">
                <Label htmlFor="chapters-to-add">Number of Chapters</Label>
                <Input
                  id="chapters-to-add"
                  type="number"
                  min="1"
                  max={selectedBook && selectedChapter ? bookChapterCounts[selectedBook] - selectedChapter + 1 : 1}
                  value={chaptersToAdd}
                  onChange={(e) => setChaptersToAdd(Number.parseInt(e.target.value) || 1)}
                />
                {selectedBook && selectedChapter && (
                  <p className="text-xs text-muted-foreground">
                    This will add chapters {selectedChapter} to{" "}
                    {Math.min(selectedChapter + chaptersToAdd - 1, bookChapterCounts[selectedBook])} of {selectedBook}
                  </p>
                )}
              </div>
            )}

            {addMode === "book" && selectedBook && (
              <p className="text-sm">
                This will add all {bookChapterCounts[selectedBook]} chapters of {selectedBook} to your plan.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddChapterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddChapter}>Add to Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Selection Modal */}
      <VersionSelectionModal
        open={showVersionModal}
        onOpenChange={setShowVersionModal}
        onVersionSelected={handleVersionSelected}
      />
    </div>
  )
}
