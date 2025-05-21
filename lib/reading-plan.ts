// Types and utilities for reading plans

export interface ReadingPlanChapter {
  book: string
  chapter: number
  completed: boolean
  lastRead?: number // timestamp
}

export interface ReadingPlan {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  chapters: ReadingPlanChapter[]
  currentIndex: number // Current chapter index
  archived?: boolean // New property for archived plans
}

// Helper function to create a new reading plan
export function createReadingPlan(name: string, description?: string): ReadingPlan {
  return {
    id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chapters: [],
    currentIndex: 0,
    archived: false,
  }
}

// Helper function to add a chapter to a reading plan
export function addChapterToPlan(plan: ReadingPlan, book: string, chapter: number): ReadingPlan {
  // Check if chapter already exists in the plan
  const chapterExists = plan.chapters.some((c) => c.book === book && c.chapter === chapter)

  if (chapterExists) {
    return plan // Don't add duplicate chapters
  }

  const updatedPlan = {
    ...plan,
    updatedAt: Date.now(),
    chapters: [
      ...plan.chapters,
      {
        book,
        chapter,
        completed: false,
      },
    ],
  }

  return updatedPlan
}

// Helper function to add multiple chapters to a plan
export function addChaptersToPlan(plan: ReadingPlan, book: string, startChapter: number, count: number): ReadingPlan {
  let updatedPlan = { ...plan }

  for (let i = 0; i < count; i++) {
    const chapterNum = startChapter + i
    // Check if chapter already exists in the plan
    const chapterExists = updatedPlan.chapters.some((c) => c.book === book && c.chapter === chapterNum)

    if (!chapterExists) {
      updatedPlan = {
        ...updatedPlan,
        chapters: [
          ...updatedPlan.chapters,
          {
            book,
            chapter: chapterNum,
            completed: false,
          },
        ],
      }
    }
  }

  return {
    ...updatedPlan,
    updatedAt: Date.now(),
  }
}

// Helper function to add an entire book to a plan
export function addBookToPlan(plan: ReadingPlan, book: string, chapterCount: number): ReadingPlan {
  return addChaptersToPlan(plan, book, 1, chapterCount)
}

// Helper function to mark a chapter as completed
export function markChapterCompleted(plan: ReadingPlan, chapterIndex: number, completed: boolean): ReadingPlan {
  const updatedChapters = [...plan.chapters]
  updatedChapters[chapterIndex] = {
    ...updatedChapters[chapterIndex],
    completed,
    lastRead: completed ? Date.now() : updatedChapters[chapterIndex].lastRead,
  }

  return {
    ...plan,
    updatedAt: Date.now(),
    chapters: updatedChapters,
  }
}

// Helper function to archive or unarchive a plan
export function togglePlanArchived(plan: ReadingPlan, archived: boolean): ReadingPlan {
  return {
    ...plan,
    archived,
    updatedAt: Date.now(),
  }
}

// Helper function to get the next chapter to read
export function getNextChapterToRead(plan: ReadingPlan): number | null {
  for (let i = 0; i < plan.chapters.length; i++) {
    if (!plan.chapters[i].completed) {
      return i
    }
  }
  return null // All chapters are completed
}

// Helper function to calculate reading plan progress
export function calculatePlanProgress(plan: ReadingPlan): {
  completedChapters: number
  totalChapters: number
  percentComplete: number
} {
  const totalChapters = plan.chapters.length
  const completedChapters = plan.chapters.filter((chapter) => chapter.completed).length
  const percentComplete = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0

  return {
    completedChapters,
    totalChapters,
    percentComplete,
  }
}

// Helper function to get all unique books in a plan
export function getUniqueBooksInPlan(plan: ReadingPlan): string[] {
  const books = new Set<string>()
  plan.chapters.forEach((chapter) => books.add(chapter.book))
  return Array.from(books).sort()
}

// Helper function to get chapters for a specific book in a plan
export function getChaptersForBookInPlan(plan: ReadingPlan, book: string): ReadingPlanChapter[] {
  return plan.chapters.filter((chapter) => chapter.book === book).sort((a, b) => a.chapter - b.chapter)
}
