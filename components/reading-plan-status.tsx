"use client"

import { useState, useEffect } from "react"
import { Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ReadingPlan } from "@/lib/reading-plan"
import { getAllReadingPlans, storeReadingPlan } from "@/lib/indexedDB"
import { markChapterCompleted } from "@/lib/reading-plan"

interface ReadingPlanStatusProps {
  book: string
  chapter: number
}

export function ReadingPlanStatus({ book, chapter }: ReadingPlanStatusProps) {
  const [readingPlans, setReadingPlans] = useState<ReadingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    <div className="flex flex-wrap gap-2 mt-2">
      {matchingChapters.map(({ plan, chapter, chapterIndex }) => (
        <TooltipProvider key={`${plan.id}-${chapterIndex}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={chapter.completed ? "default" : "outline"}
                size="sm"
                className={chapter.completed ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => handleToggleCompletion(plan.id, chapterIndex, !chapter.completed)}
              >
                {chapter.completed ? <Check className="h-4 w-4 mr-1" /> : null}
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
  )
}
