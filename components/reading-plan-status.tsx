"use client"

import { useState, useEffect } from "react"
import { Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ReadingPlan } from "@/lib/reading-plan"
import { getAllReadingPlans, storeReadingPlan } from "@/lib/indexedDB"
import { markChapterCompleted } from "@/lib/reading-plan"
import { Celebration } from "@/components/celebration"

interface ReadingPlanStatusProps {
  book: string
  chapter: number
}

export function ReadingPlanStatus({ book, chapter }: ReadingPlanStatusProps) {
  // Add padding at the bottom of the page to prevent content from being hidden behind the footer
  useEffect(() => {
    // Add padding to the bottom of the page
    document.body.style.paddingBottom = "60px"

    // Clean up when component unmounts
    return () => {
      document.body.style.paddingBottom = ""
    }
  }, [])

  const [readingPlans, setReadingPlans] = useState<ReadingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  // Load reading plans
  useEffect(() => {
    async function loadReadingPlans() {
      try {
        setLoading(true)
        const plans = await getAllReadingPlans()
        setReadingPlans(plans)
        setError(null)
      } catch (err) {
        console.error("Error loading reading plans:", err)
        setError("Failed to load reading plans")
      } finally {
        setLoading(false)
      }
    }

    loadReadingPlans()
  }, [])

  // Find chapters in reading plans that match the current book and chapter
  const matchingChapters = readingPlans.flatMap((plan) =>
    plan.chapters
      .map((chapter, index) => ({ plan, chapter, chapterIndex: index }))
      .filter((item) => item.chapter.book === book && item.chapter.chapter === chapter),
  )

  // Toggle chapter completion
  const handleToggleCompletion = async (planId: string, chapterIndex: number, completed: boolean) => {
    try {
      // Find the plan
      const planIndex = readingPlans.findIndex((p) => p.id === planId)
      if (planIndex === -1) return

      // Update chapter completion
      const updatedPlan = markChapterCompleted(readingPlans[planIndex], chapterIndex, completed)

      // Save updated plan
      await storeReadingPlan(updatedPlan)

      // Update local state
      const updatedPlans = [...readingPlans]
      updatedPlans[planIndex] = updatedPlan
      setReadingPlans(updatedPlans)

      // Show celebration if marking as complete
      if (completed) {
        setShowCelebration(true)
        setTimeout(() => {
          setShowCelebration(false)
        }, 3000) // Show celebration for 3 seconds
      }
    } catch (err) {
      console.error("Error updating chapter completion:", err)
      setError("Failed to update reading plan")
    }
  }

  if (loading) {
    return null // Don't show anything while loading
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 flex items-center">
        <AlertCircle className="h-4 w-4 mr-1" />
        {error}
      </div>
    )
  }

  if (matchingChapters.length === 0) {
    return null // No reading plans for this chapter
  }

  return (
    <>
      {showCelebration && <Celebration />}
      <div className="fixed bottom-5 left-0 right-0 bg-background border-t border-border p-2 flex flex-wrap gap-2 justify-center z-10">
        {matchingChapters.map(({ plan, chapter, chapterIndex }) => (
          <TooltipProvider key={`${plan.id}-${chapterIndex}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={chapter.completed ? "border-green-600" : ""}
                  onClick={() => handleToggleCompletion(plan.id, chapterIndex, !chapter.completed)}
                >
                  <span
                    className={`inline-flex items-center justify-center rounded-full w-5 h-5 mr-1.5 ${
                      chapter.completed ? "bg-green-600" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <Check
                      className={`h-3 w-3 ${chapter.completed ? "text-white" : "text-gray-500 dark:text-gray-400"}`}
                    />
                  </span>
                  {plan.name}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {chapter.completed
                    ? `Completed in "${plan.name}" reading plan`
                    : `Mark as completed in "${plan.name}" reading plan`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </>
  )
}
