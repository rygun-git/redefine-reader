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
import { Switch } from "@/components/ui/switch"
import {
  AlertCircle,
  BookOpen,
  Plus,
  Trash2,
  Archive,
  ArchiveRestore,
  Home,
  Eye,
  EyeOff,
  ChevronLeft,
  BookMarked,
  ListTodo,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
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
import { cn } from "@/lib/utils"
import { supabase, type BibleOutline } from "@/lib/supabase"

interface BibleCategory {
  section: string
  books: {
    name: string
    id: string
    chapters: number
  }[]
}

export default function ReadingPlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get("id")

  // Top level tab state
  const [topLevelTab, setTopLevelTab] = useState<"summary" | "plans">("summary")

  // Plans sub-tab state
  const [plansSubTab, setPlansSubTab] = useState<"active" | "archived" | "create">("active")

  // View states
  const [compactView, setCompactView] = useState(false)
  const [concertinaView, setConcertinaView] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const [readingPlans, setReadingPlans] = useState<ReadingPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<ReadingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Bible structure from outline
  const [bibleCategories, setBibleCategories] = useState<BibleCategory[]>([])
  const [loadingOutline, setLoadingOutline] = useState(false)
  const [outlineError, setOutlineError] = useState<string | null>(null)
  const [outlineId, setOutlineId] = useState<string | null>(null)

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

  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({})
  const [hiddenCompletedChapters, setHiddenCompletedChapters] = useState<Record<string, boolean>>({})

  // Available books and chapters
  const [availableBooks, setAvailableBooks] = useState<string[]>([])
  const [availableChapters, setAvailableChapters] = useState<number[]>([])
  const [bookChapterCounts, setBookChapterCounts] = useState<Record<string, number>>({})

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

          // Set outline ID for fetching Bible structure
          if (settings.defaultOutlineId) {
            setOutlineId(settings.defaultOutlineId)
          }
        }

        // If no outline ID is set yet, default to "11"
        if (!outlineId && !settings?.defaultOutlineId) {
          setOutlineId("11")
          setDefaultOutlineId("11")
        }

        // Load reading plans
        const plans = await getAllReadingPlans()
        setReadingPlans(plans)

        // Initialize hiddenCompletedChapters with default values (hide completed)
        const initialHiddenState: Record<string, boolean> = {}
        plans.forEach((plan) => {
          initialHiddenState[plan.id] = true
        })
        setHiddenCompletedChapters(initialHiddenState)

        // If a plan ID is provided in the URL, load that specific plan
        if (planId) {
          const plan = await getReadingPlan(planId)
          if (plan) {
            setSelectedPlan(plan)
            setTopLevelTab("plans")
            setPlansSubTab("active")
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
  }, [planId, outlineId])

  // Load Bible structure from outline
  useEffect(() => {
    async function fetchOutline() {
      if (!outlineId) return

      try {
        setLoadingOutline(true)
        setOutlineError(null)

        // Fetch outline from Supabase
        const { data, error } = await supabase.from("bible_outlines").select("*").eq("id", outlineId).single()

        if (error) throw error

        if (!data) {
          throw new Error("Outline not found")
        }

        const outline = data as BibleOutline

        // Process outline data to extract categories and books
        const categories: BibleCategory[] = []
        const bookChaptersMap: Record<string, number> = {}
        const allBooks: string[] = []

        // Check if outline has new_format_data (JSON string)
        if (outline.new_format_data) {
          try {
            const outlineData = JSON.parse(outline.new_format_data)

            if (outlineData.categories && Array.isArray(outlineData.categories)) {
              // Process categories
              outlineData.categories.forEach((category: any) => {
                if (category.name && category.books && Array.isArray(category.books)) {
                  const processedBooks = category.books
                    .map((book: any) => {
                      const bookName = book.name || book.book_id || ""
                      const chapterCount = book.chapters?.length || 0

                      // Store chapter count for this book
                      bookChaptersMap[bookName] = chapterCount
                      allBooks.push(bookName)

                      return {
                        name: bookName,
                        id: book.book_id || bookName,
                        chapters: chapterCount,
                      }
                    })
                    .filter((book: any) => book.name && book.chapters > 0)

                  if (processedBooks.length > 0) {
                    categories.push({
                      section: category.name,
                      books: processedBooks,
                    })
                  }
                }
              })
            }
          } catch (parseError) {
            console.error("Error parsing outline data:", parseError)
            throw new Error("Invalid outline format")
          }
        } else if (outline.chapters && Array.isArray(outline.chapters)) {
          // Process legacy format
          // Group chapters by book
          const bookMap: Record<string, number> = {}

          outline.chapters.forEach((chapter: any) => {
            const bookName = chapter.book || ""
            if (bookName) {
              if (!bookMap[bookName]) {
                bookMap[bookName] = 0
                allBooks.push(bookName)
              }
              bookMap[bookName]++
            }
          })

          // Create a single category with all books
          const books = Object.entries(bookMap).map(([name, count]) => {
            bookChaptersMap[name] = count
            return {
              name,
              id: name,
              chapters: count,
            }
          })

          if (books.length > 0) {
            categories.push({
              section: "All Books",
              books,
            })
          }
        }

        // Initialize expanded categories state (all closed by default)
        const initialExpandedState: Record<string, boolean> = {}
        categories.forEach((category) => {
          initialExpandedState[category.section] = false
        })
        setExpandedCategories(initialExpandedState)

        // Update state with processed data
        setBibleCategories(categories)
        setBookChapterCounts(bookChaptersMap)
        setAvailableBooks(allBooks)
      } catch (err) {
        console.error("Error fetching outline:", err)
        setOutlineError(err instanceof Error ? err.message : "Failed to load Bible outline")
      } finally {
        setLoadingOutline(false)
      }
    }

    fetchOutline()
  }, [outlineId])

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
  }, [selectedBook, bookChapterCounts])

  // Toggle category expansion (accordion style)
  const toggleCategory = (section: string) => {
    setExpandedCategories((prev) => {
      // If the category is already expanded, just close it
      if (prev[section]) {
        return {
          ...prev,
          [section]: false,
        }
      }

      // Otherwise, close all categories and open only this one
      const newState: Record<string, boolean> = {}
      Object.keys(prev).forEach((key) => {
        newState[key] = false
      })
      newState[section] = true
      return newState
    })
  }

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
      setTopLevelTab("plans")
      setPlansSubTab("active")
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
    setOutlineId(outlineId)

    // Navigate to the chapter if we have pending navigation
    if (pendingNavigation) {
      router.push(
        `/read/view?version=${versionId}&outline=${outlineId}&book=${encodeURIComponent(pendingNavigation.book)}&chapter=${pendingNavigation.chapter}`,
      )
      setPendingNavigation(null)
    }
  }

  // Toggle expanded state for a plan
  const toggleExpanded = (planId: string) => {
    setExpandedPlans((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }))
  }

  // Toggle showing/hiding completed chapters
  const toggleHideCompleted = (planId: string) => {
    setHiddenCompletedChapters((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }))
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
                onClick={() => toggleHideCompleted(plan.id)}
                title={hiddenCompletedChapters[plan.id] ? "Show Completed Chapters" : "Hide Completed Chapters"}
              >
                {hiddenCompletedChapters[plan.id] ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
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
                  {plan.chapters
                    .filter((chapter) => !hiddenCompletedChapters[plan.id] || !chapter.completed)
                    .slice(0, expandedPlans[plan.id] ? undefined : 4)
                    .map((chapter, chapterIndex) => {
                      // Find the original index in the unfiltered array
                      const originalIndex = plan.chapters.findIndex(
                        (ch) => ch.book === chapter.book && ch.chapter === chapter.chapter,
                      )
                      return (
                        <div key={`${chapter.book}-${chapter.chapter}`} className="border rounded-md p-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <Checkbox
                                checked={chapter.completed}
                                onCheckedChange={(checked) =>
                                  handleToggleChapterCompletion(plan.id, originalIndex, checked === true)
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
                      )
                    })}
                </div>

                {plan.chapters.filter((chapter) => !hiddenCompletedChapters[plan.id] || !chapter.completed).length >
                  4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(plan.id)}
                    className="w-full text-center"
                  >
                    {expandedPlans[plan.id]
                      ? "Show Less"
                      : `Show More (${plan.chapters.filter((chapter) => !hiddenCompletedChapters[plan.id] || !chapter.completed).length - 4} more)`}
                  </Button>
                )}

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
    const bibleProgressPercent = totalBibleChapters > 0 ? (completedBibleChapters / totalBibleChapters) * 100 : 0

    // Render a category with its books and chapters
    const renderCategory = (category: BibleCategory) => {
      return (
        <div key={category.section} className="space-y-4">
          {concertinaView ? (
            // Concertina view
            <div className="border rounded-md">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => toggleCategory(category.section)}
              >
                <h3 className="text-lg font-semibold">{category.section}</h3>
                {expandedCategories[category.section] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
              {expandedCategories[category.section] && (
                <div className="p-3 pt-0 border-t">
                  <div className="space-y-6">
                    {category.books.map((book) => {
                      const chapterCount = book.chapters
                      const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1)

                      return (
                        <div key={book.name} className="space-y-2">
                          {compactView ? (
                            <div className="flex items-start">
                              <h4 className="text-md font-medium w-32 flex-shrink-0">{book.name}</h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {chapters.map((chapter) => {
                                  const isCompleted = allChapters.some(
                                    (c) => c.book === book.name && c.chapter === chapter && c.completed,
                                  )
                                  const isInPlan = allChapters.some(
                                    (c) => c.book === book.name && c.chapter === chapter,
                                  )

                                  return (
                                    <div
                                      key={`${book.name}-${chapter}`}
                                      className={cn(
                                        "w-2 h-2 rounded-full cursor-pointer",
                                        isCompleted ? "bg-green-600" : isInPlan ? "bg-blue-100" : "bg-gray-100",
                                      )}
                                      onClick={() => handleReadChapter(book.name, chapter)}
                                      title={`${book.name} ${chapter}${isCompleted ? " (Completed)" : isInPlan ? " (In Plan)" : ""}`}
                                    ></div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="text-md font-medium">{book.name}</h4>
                              <div className="flex flex-wrap gap-1">
                                {chapters.map((chapter) => {
                                  const isCompleted = allChapters.some(
                                    (c) => c.book === book.name && c.chapter === chapter && c.completed,
                                  )
                                  const isInPlan = allChapters.some(
                                    (c) => c.book === book.name && c.chapter === chapter,
                                  )

                                  return (
                                    <div
                                      key={`${book.name}-${chapter}`}
                                      className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer",
                                        isCompleted
                                          ? "bg-green-600 text-white"
                                          : isInPlan
                                            ? "bg-blue-100"
                                            : "bg-gray-100 text-gray-500",
                                      )}
                                      onClick={() => handleReadChapter(book.name, chapter)}
                                      title={`${book.name} ${chapter}${isCompleted ? " (Completed)" : isInPlan ? " (In Plan)" : ""}`}
                                    >
                                      {chapter}
                                    </div>
                                  )
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Standard view
            <>
              <h3 className="text-lg font-semibold">{category.section}</h3>
              <div className="space-y-6">
                {category.books.map((book) => {
                  const chapterCount = book.chapters
                  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1)

                  return (
                    <div key={book.name} className="space-y-2">
                      {compactView ? (
                        <div className="flex items-start">
                          <h4 className="text-md font-medium w-32 flex-shrink-0">{book.name}</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {chapters.map((chapter) => {
                              const isCompleted = allChapters.some(
                                (c) => c.book === book.name && c.chapter === chapter && c.completed,
                              )
                              const isInPlan = allChapters.some((c) => c.book === book.name && c.chapter === chapter)

                              return (
                                <div
                                  key={`${book.name}-${chapter}`}
                                  className={cn(
                                    "w-2 h-2 rounded-full cursor-pointer",
                                    isCompleted ? "bg-green-600" : isInPlan ? "bg-blue-100" : "bg-gray-100",
                                  )}
                                  onClick={() => handleReadChapter(book.name, chapter)}
                                  title={`${book.name} ${chapter}${isCompleted ? " (Completed)" : isInPlan ? " (In Plan)" : ""}`}
                                ></div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 className="text-md font-medium">{book.name}</h4>
                          <div className="flex flex-wrap gap-1">
                            {chapters.map((chapter) => {
                              const isCompleted = allChapters.some(
                                (c) => c.book === book.name && c.chapter === chapter && c.completed,
                              )
                              const isInPlan = allChapters.some((c) => c.book === book.name && c.chapter === chapter)

                              return (
                                <div
                                  key={`${book.name}-${chapter}`}
                                  className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer",
                                    isCompleted
                                      ? "bg-green-600 text-white"
                                      : isInPlan
                                        ? "bg-blue-100"
                                        : "bg-gray-100 text-gray-500",
                                  )}
                                  onClick={() => handleReadChapter(book.name, chapter)}
                                  title={`${book.name} ${chapter}${isCompleted ? " (Completed)" : isInPlan ? " (In Plan)" : ""}`}
                                >
                                  {chapter}
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-8">
        <div className="mb-6 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Overall Bible Progress</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Compact</span>
                <Switch checked={compactView} onCheckedChange={setCompactView} aria-label="Toggle compact view" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Concertina</span>
                <Switch
                  checked={concertinaView}
                  onCheckedChange={setConcertinaView}
                  aria-label="Toggle concertina view"
                />
              </div>
            </div>
          </div>
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
              <div className={cn("rounded-full bg-green-600 mr-2", compactView ? "w-2 h-2" : "w-4 h-4")}></div>
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center">
              <div className={cn("rounded-full bg-blue-100 mr-2", compactView ? "w-2 h-2" : "w-4 h-4")}></div>
              <span className="text-sm">Planned</span>
            </div>
            <div className="flex items-center">
              <div className={cn("rounded-full bg-gray-100 mr-2", compactView ? "w-2 h-2" : "w-4 h-4")}></div>
              <span className="text-sm">Unplanned</span>
            </div>
          </div>
        </div>

        {loadingOutline ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading Bible structure...</span>
          </div>
        ) : outlineError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading Bible structure</AlertTitle>
            <AlertDescription>{outlineError}</AlertDescription>
          </Alert>
        ) : bibleCategories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No Bible structure available.</p>
            {!outlineId && (
              <Button
                onClick={() => {
                  setOutlineId("11")
                  // Also update the default outline ID for consistency
                  setDefaultOutlineId("11")
                }}
              >
                Load Bible Structure
              </Button>
            )}
          </div>
        ) : (
          bibleCategories.map(renderCategory)
        )}
      </div>
    )
  }

  // Render active plans view
  const renderActivePlans = () => {
    if (loading) {
      return <div className="text-center py-8">Loading reading plans...</div>
    }

    if (selectedPlan) {
      return (
        <div>
          <Button variant="outline" size="sm" className="mb-4" onClick={() => setSelectedPlan(null)}>
            Back to All Plans
          </Button>
          {renderPlanCard(selectedPlan)}
        </div>
      )
    }

    if (activePlans.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">You don't have any active reading plans.</p>
          <Button onClick={() => setPlansSubTab("create")}>Create Your First Plan</Button>
        </div>
      )
    }

    return <div>{activePlans.map(renderPlanCard)}</div>
  }

  // Render archived plans view
  const renderArchivedPlans = () => {
    if (loading) {
      return <div className="text-center py-8">Loading archived plans...</div>
    }

    if (archivedPlans.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">You don't have any archived reading plans.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Archive completed plans to keep your active plans list organized.
          </p>
        </div>
      )
    }

    return <div>{archivedPlans.map(renderPlanCard)}</div>
  }

  // Render create plan form
  const renderCreatePlanForm = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create a New Reading Plan</CardTitle>
          <CardDescription>Create a personalized reading plan to track your Bible reading progress.</CardDescription>
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
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} title="Go Back" className="mr-1">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Reading Plans</h1>
        </div>
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

      {/* Top level tabs */}
      <div className="mb-6">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setTopLevelTab("summary")}
              className={cn(
                "flex items-center px-4 py-2 border-b-2 font-medium text-sm",
                topLevelTab === "summary"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted",
              )}
            >
              <BookMarked className="mr-2 h-4 w-4" />
              Summary
            </button>
            <button
              onClick={() => setTopLevelTab("plans")}
              className={cn(
                "flex items-center px-4 py-2 border-b-2 font-medium text-sm",
                topLevelTab === "plans"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted",
              )}
            >
              <ListTodo className="mr-2 h-4 w-4" />
              Plans
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      {topLevelTab === "summary" ? (
        // Summary content
        <div>{loading ? <div className="text-center py-8">Loading Bible summary...</div> : renderBibleSummary()}</div>
      ) : (
        // Plans content with sub-tabs
        <div>
          <Tabs
            value={plansSubTab}
            onValueChange={(value) => setPlansSubTab(value as "active" | "archived" | "create")}
          >
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="active">
                Active
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="archived">
                Archived
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="create">
                Create Plan
              </TabsTrigger>
            </TabsList>

            {/* Sub-tab content */}
            <TabsContent value="active" className="mt-4">
              {renderActivePlans()}
            </TabsContent>
            <TabsContent value="archived" className="mt-4">
              {renderArchivedPlans()}
            </TabsContent>
            <TabsContent value="create" className="mt-4">
              {renderCreatePlanForm()}
            </TabsContent>
          </Tabs>
        </div>
      )}

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
