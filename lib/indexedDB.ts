// Add these imports at the top of the file
import type { ReadingPlan } from "./reading-plan"

// IndexedDB utility functions for Bible Reader

// Database configuration
const DB_NAME = "BibleReaderDB"
const DB_VERSION = 4 // Incremented from 3 to 4 to trigger database upgrade
const BIBLE_STORE = "bibleContent"
const SETTINGS_STORE = "settings"
const LAST_READ_STORE = "lastRead"
const BOOKMARKS_STORE = "bookmarks"
const TAG_STYLES_STORE = "tagStyles" // Added store for tag styles
const HISTORY_STORE = "history" // Added store for history
// Add this constant with the other store constants
const READING_PLANS_STORE = "readingPlans"

// Check if IndexedDB is available and working
export async function isIndexedDBAvailable(): Promise<boolean> {
  // First check if the API exists
  if (!window.indexedDB) {
    console.log("IndexedDB is not available in this browser")
    return false
  }

  // Then try to open a test database to verify it's working
  try {
    const testRequest = window.indexedDB.open("__idb_test__")

    return new Promise((resolve) => {
      testRequest.onerror = () => {
        console.log("IndexedDB permission denied or private browsing mode")
        resolve(false)
      }

      testRequest.onsuccess = () => {
        const db = testRequest.result
        db.close()
        // Clean up the test database
        try {
          window.indexedDB.deleteDatabase("__idb_test__")
        } catch (e) {
          // Ignore cleanup errors
        }
        resolve(true)
      }
    })
  } catch (e) {
    console.error("Error testing IndexedDB availability:", e)
    return false
  }
}

// Initialize the database with error handling
export async function initDB(): Promise<IDBDatabase | null> {
  // First check if IndexedDB is available
  const available = await isIndexedDBAvailable()
  if (!available) {
    console.log("IndexedDB is not available, using localStorage fallback")
    return null
  }

  return new Promise((resolve) => {
    try {
      console.log(`Opening IndexedDB: ${DB_NAME}, version ${DB_VERSION}`)
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = (event) => {
        console.error("IndexedDB error:", event)
        console.error("Error details:", (event.target as IDBOpenDBRequest).error)
        resolve(null) // Return null to indicate failure
      }

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        console.log("IndexedDB opened successfully")

        // Log the object stores that exist in the database
        console.log("Object stores in database:", Array.from(db.objectStoreNames))

        resolve(db)
      }

      request.onupgradeneeded = (event) => {
        console.log(`Upgrading IndexedDB from version ${event.oldVersion} to ${event.newVersion}`)
        const db = (event.target as IDBOpenDBRequest).result

        // Create Bible content store with version ID as key
        if (!db.objectStoreNames.contains(BIBLE_STORE)) {
          console.log(`Creating object store: ${BIBLE_STORE}`)
          db.createObjectStore(BIBLE_STORE, { keyPath: "id" })
        }

        // Create settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          console.log(`Creating object store: ${SETTINGS_STORE}`)
          db.createObjectStore(SETTINGS_STORE, { keyPath: "id" })
        }

        // Create last read store
        if (!db.objectStoreNames.contains(LAST_READ_STORE)) {
          console.log(`Creating object store: ${LAST_READ_STORE}`)
          db.createObjectStore(LAST_READ_STORE, { keyPath: "id" })
        }

        // Create bookmarks store with auto-incrementing ID
        if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
          console.log(`Creating object store: ${BOOKMARKS_STORE}`)
          const bookmarksStore = db.createObjectStore(BOOKMARKS_STORE, {
            keyPath: "id",
            autoIncrement: true,
          })
          // Create an index for faster searches
          bookmarksStore.createIndex("createdAt", "createdAt", { unique: false })
        }

        // Create tag styles store
        if (!db.objectStoreNames.contains(TAG_STYLES_STORE)) {
          console.log(`Creating object store: ${TAG_STYLES_STORE}`)
          db.createObjectStore(TAG_STYLES_STORE, { keyPath: "id" })
        }

        // Create history store with auto-incrementing ID
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          console.log(`Creating object store: ${HISTORY_STORE}`)
          const historyStore = db.createObjectStore(HISTORY_STORE, {
            keyPath: "id",
            autoIncrement: true,
          })
          // Create an index for faster searches
          historyStore.createIndex("timestamp", "timestamp", { unique: false })
        }

        // Create reading plans store
        if (!db.objectStoreNames.contains(READING_PLANS_STORE)) {
          console.log(`Creating object store: ${READING_PLANS_STORE}`)
          db.createObjectStore(READING_PLANS_STORE, { keyPath: "id" })
        }
      }
    } catch (error) {
      console.error("Critical error initializing IndexedDB:", error)
      resolve(null) // Return null to indicate failure
    }
  })
}

// Store Bible content
export async function storeBibleContent(versionId: string | number, content: string): Promise<void> {
  console.log(`STORAGE: Storing Bible content for version ${versionId} (${content.length} characters)`)
  try {
    const db = await initDB()
    if (!db) {
      console.log("STORAGE: IndexedDB not available, trying localStorage")
      // Fallback to localStorage for small content
      try {
        const contentSize = new Blob([content]).size
        if (contentSize < 2 * 1024 * 1024) {
          // 2MB limit
          console.log(`STORAGE: Storing in localStorage (${(contentSize / (1024 * 1024)).toFixed(2)}MB)`)
          const cacheData = {
            content,
            timestamp: Date.now(),
          }
          localStorage.setItem(`bibleContent_${versionId}`, JSON.stringify(cacheData))
          console.log("STORAGE: Content stored in localStorage successfully")
        } else {
          console.warn(`Content too large for localStorage (${(contentSize / (1024 * 1024)).toFixed(2)}MB)`)
          console.log("STORAGE: WARNING - Content too large for localStorage")
        }
      } catch (e) {
        console.error("localStorage fallback failed:", e)
        console.log("STORAGE: ERROR - localStorage fallback failed", e)
      }
      return
    }

    return new Promise((resolve, reject) => {
      try {
        console.log("STORAGE: Storing content in IndexedDB")

        // Check if the object store exists
        if (!db.objectStoreNames.contains(BIBLE_STORE)) {
          console.error(`Object store ${BIBLE_STORE} does not exist`)
          reject(`Object store ${BIBLE_STORE} does not exist`)
          return
        }

        const transaction = db.transaction([BIBLE_STORE], "readwrite")
        const store = transaction.objectStore(BIBLE_STORE)

        const data = {
          id: versionId.toString(),
          content,
          timestamp: Date.now(),
        }

        const request = store.put(data)

        request.onsuccess = () => {
          console.log("STORAGE: Content stored in IndexedDB successfully")
          resolve()
        }

        request.onerror = (event) => {
          console.error("Error storing Bible content:", event)
          console.error("Error details:", (event.target as IDBRequest).error)
          console.log("STORAGE: ERROR - Failed to store content in IndexedDB")
          reject("Failed to store Bible content")
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)
        console.log("STORAGE: ERROR - IndexedDB transaction failed", error)
        reject(error)
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)
    console.log("STORAGE: ERROR - IndexedDB operation failed", error)
    // Fallback to localStorage
    try {
      const contentSize = new Blob([content]).size
      if (contentSize < 2 * 1024 * 1024) {
        // 2MB limit
        console.log(`STORAGE: Storing in localStorage (fallback) (${(contentSize / (1024 * 1024)).toFixed(2)}MB)`)
        const cacheData = {
          content,
          timestamp: Date.now(),
        }
        localStorage.setItem(`bibleContent_${versionId}`, JSON.stringify(cacheData))
        console.log("STORAGE: Content stored in localStorage successfully (fallback)")
      } else {
        console.log("STORAGE: WARNING - Content too large for localStorage (fallback)")
      }
    } catch (e) {
      console.error("localStorage fallback failed:", e)
      console.log("STORAGE: ERROR - localStorage fallback failed (final attempt)", e)
    }
  }
}

// Get Bible content
export async function getBibleContent(
  versionId: string | number,
): Promise<{ content: string; timestamp: number } | null> {
  console.log(`STORAGE: Getting Bible content for version ${versionId}`)
  try {
    const db = await initDB()
    if (!db) {
      console.log("STORAGE: IndexedDB not available, trying localStorage")
      // Fallback to localStorage
      try {
        const cachedBibleStr = localStorage.getItem(`bibleContent_${versionId}`)
        if (cachedBibleStr) {
          console.log("STORAGE: Found content in localStorage")
          return JSON.parse(cachedBibleStr)
        } else {
          console.log("STORAGE: No content found in localStorage")
        }
      } catch (e) {
        console.error("localStorage fallback failed:", e)
        console.log("STORAGE: ERROR - localStorage fallback failed", e)
      }
      return null
    }

    return new Promise((resolve) => {
      try {
        console.log("STORAGE: Querying IndexedDB for content")

        // Check if the object store exists
        if (!db.objectStoreNames.contains(BIBLE_STORE)) {
          console.error(`Object store ${BIBLE_STORE} does not exist`)
          resolve(null)
          return
        }

        const transaction = db.transaction([BIBLE_STORE], "readonly")
        const store = transaction.objectStore(BIBLE_STORE)

        const request = store.get(versionId.toString())

        request.onsuccess = () => {
          const result = request.result
          if (result) {
            console.log(`STORAGE: Found content in IndexedDB (${result.content.length} characters)`)
            resolve(result)
          } else {
            console.log("STORAGE: No content found in IndexedDB")
            resolve(null)
          }
        }

        request.onerror = (event) => {
          console.error("Error retrieving Bible content:", event)
          console.error("Error details:", (event.target as IDBRequest).error)
          console.log("STORAGE: ERROR - Failed to retrieve content from IndexedDB")
          resolve(null) // Resolve with null instead of rejecting
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)
        console.log("STORAGE: ERROR - IndexedDB transaction failed", error)
        resolve(null)
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)
    console.log("STORAGE: ERROR - IndexedDB operation failed", error)

    // Fallback to localStorage
    try {
      const cachedBibleStr = localStorage.getItem(`bibleContent_${versionId}`)
      if (cachedBibleStr) {
        console.log("STORAGE: Found content in localStorage (fallback)")
        return JSON.parse(cachedBibleStr)
      } else {
        console.log("STORAGE: No content found in localStorage (fallback)")
      }
    } catch (e) {
      console.error("localStorage fallback failed:", e)
      console.log("STORAGE: ERROR - localStorage fallback failed (final attempt)", e)
    }

    return null
  }
}

// Store display settings
export async function storeDisplaySettings(settings: any): Promise<void> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      localStorage.setItem("bibleReaderDisplaySettings", JSON.stringify(settings))
      return
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          console.error(`Object store ${SETTINGS_STORE} does not exist`)
          // Fallback to localStorage
          localStorage.setItem("bibleReaderDisplaySettings", JSON.stringify(settings))
          resolve()
          return
        }

        const transaction = db.transaction([SETTINGS_STORE], "readwrite")
        const store = transaction.objectStore(SETTINGS_STORE)

        const data = {
          id: "displaySettings",
          ...settings,
          timestamp: Date.now(),
        }

        const request = store.put(data)

        request.onsuccess = () => {
          resolve()
        }

        request.onerror = (event) => {
          console.error("Error storing display settings:", event)
          console.error("Error details:", (event.target as IDBRequest).error)
          // Fallback to localStorage
          localStorage.setItem("bibleReaderDisplaySettings", JSON.stringify(settings))
          resolve()
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)
        // Fallback to localStorage
        localStorage.setItem("bibleReaderDisplaySettings", JSON.stringify(settings))
        resolve()
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)
    // Fallback to localStorage
    localStorage.setItem("bibleReaderDisplaySettings", JSON.stringify(settings))
  }
}

// Get display settings
export async function getDisplaySettings(): Promise<any | null> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      const savedSettings = localStorage.getItem("bibleReaderDisplaySettings")
      return savedSettings ? JSON.parse(savedSettings) : null
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          console.error(`Object store ${SETTINGS_STORE} does not exist`)
          // Fallback to localStorage
          const savedSettings = localStorage.getItem("bibleReaderDisplaySettings")
          resolve(savedSettings ? JSON.parse(savedSettings) : null)
          return
        }

        const transaction = db.transaction([SETTINGS_STORE], "readonly")
        const store = transaction.objectStore(SETTINGS_STORE)

        const request = store.get("displaySettings")

        request.onsuccess = () => {
          const result = request.result
          if (result) {
            const { id, timestamp, ...settings } = result
            resolve(settings)
          } else {
            resolve(null)
          }
        }

        request.onerror = (event) => {
          console.error("Error retrieving display settings:", event)
          console.error("Error details:", (event.target as IDBRequest).error)

          // Fallback to localStorage
          const savedSettings = localStorage.getItem("bibleReaderDisplaySettings")
          resolve(savedSettings ? JSON.parse(savedSettings) : null)
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)

        // Fallback to localStorage
        const savedSettings = localStorage.getItem("bibleReaderDisplaySettings")
        resolve(savedSettings ? JSON.parse(savedSettings) : null)
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)

    // Fallback to localStorage
    const savedSettings = localStorage.getItem("bibleReaderDisplaySettings")
    return savedSettings ? JSON.parse(savedSettings) : null
  }
}

// Store last read information
export async function storeLastRead(data: any): Promise<void> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      localStorage.setItem("lastOpenedBible", JSON.stringify(data))
      return
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(LAST_READ_STORE)) {
          console.error(`Object store ${LAST_READ_STORE} does not exist`)
          // Fallback to localStorage
          localStorage.setItem("lastOpenedBible", JSON.stringify(data))
          resolve()
          return
        }

        const transaction = db.transaction([LAST_READ_STORE], "readwrite")
        const store = transaction.objectStore(LAST_READ_STORE)

        const storeData = {
          id: "lastRead",
          ...data,
          timestamp: Date.now(),
        }

        const request = store.put(storeData)

        request.onsuccess = () => {
          resolve()
        }

        request.onerror = (event) => {
          console.error("Error storing last read info:", event)
          console.error("Error details:", (event.target as IDBRequest).error)

          // Fallback to localStorage
          localStorage.setItem("lastOpenedBible", JSON.stringify(data))
          resolve()
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)

        // Fallback to localStorage
        localStorage.setItem("lastOpenedBible", JSON.stringify(data))
        resolve()
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)

    // Fallback to localStorage
    localStorage.setItem("lastOpenedBible", JSON.stringify(data))
  }
}

// Get last read information
export async function getLastRead(): Promise<any | null> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      const lastOpenedBible = localStorage.getItem("lastOpenedBible")
      return lastOpenedBible ? JSON.parse(lastOpenedBible) : null
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(LAST_READ_STORE)) {
          console.error(`Object store ${LAST_READ_STORE} does not exist`)
          // Fallback to localStorage
          const lastOpenedBible = localStorage.getItem("lastOpenedBible")
          resolve(lastOpenedBible ? JSON.parse(lastOpenedBible) : null)
          return
        }

        const transaction = db.transaction([LAST_READ_STORE], "readonly")
        const store = transaction.objectStore(LAST_READ_STORE)

        const request = store.get("lastRead")

        request.onsuccess = () => {
          const result = request.result
          if (result) {
            const { id, timestamp, ...data } = result
            resolve(data)
          } else {
            resolve(null)
          }
        }

        request.onerror = (event) => {
          console.error("Error retrieving last read info:", event)
          console.error("Error details:", (event.target as IDBRequest).error)

          // Fallback to localStorage
          const lastOpenedBible = localStorage.getItem("lastOpenedBible")
          resolve(lastOpenedBible ? JSON.parse(lastOpenedBible) : null)
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)

        // Fallback to localStorage
        const lastOpenedBible = localStorage.getItem("lastOpenedBible")
        resolve(lastOpenedBible ? JSON.parse(lastOpenedBible) : null)
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)

    // Fallback to localStorage
    const lastOpenedBible = localStorage.getItem("lastOpenedBible")
    return lastOpenedBible ? JSON.parse(lastOpenedBible) : null
  }
}

// Bookmark type definition
export interface Bookmark {
  id?: number
  title: string
  book: string
  chapter: number
  createdAt: number
  notes: string
  // Optional fields for compatibility with existing bookmarks
  versionId?: string | number
  versionTitle?: string
  outlineId?: string | number
  outlineTitle?: string
  // Added field for sections
  sections?: Array<{ title: string; startLine?: number }>
}

// Add a bookmark
export async function addBookmark(bookmark: Bookmark): Promise<number | null> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      const bookmarks = getBookmarksFromLocalStorage()
      const newId = Date.now()
      const newBookmark = { ...bookmark, id: newId }
      bookmarks.push(newBookmark)
      saveBookmarksToLocalStorage(bookmarks)
      return newId
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
          console.error(`Object store ${BOOKMARKS_STORE} does not exist`)
          // Fallback to localStorage
          const bookmarks = getBookmarksFromLocalStorage()
          const newId = Date.now()
          const newBookmark = { ...bookmark, id: newId }
          bookmarks.push(newBookmark)
          saveBookmarksToLocalStorage(bookmarks)
          resolve(newId)
          return
        }

        const transaction = db.transaction([BOOKMARKS_STORE], "readwrite")
        const store = transaction.objectStore(BOOKMARKS_STORE)

        const request = store.add(bookmark)

        request.onsuccess = () => {
          resolve(request.result as number)
        }

        request.onerror = (event) => {
          console.error("Error adding bookmark:", event)
          console.error("Error details:", (event.target as IDBRequest).error)

          // Fallback to localStorage
          const bookmarks = getBookmarksFromLocalStorage()
          const newId = Date.now()
          const newBookmark = { ...bookmark, id: newId }
          bookmarks.push(newBookmark)
          saveBookmarksToLocalStorage(bookmarks)
          resolve(newId)
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)

        // Fallback to localStorage
        const bookmarks = getBookmarksFromLocalStorage()
        const newId = Date.now()
        const newBookmark = { ...bookmark, id: newId }
        bookmarks.push(newBookmark)
        saveBookmarksToLocalStorage(bookmarks)
        resolve(newId)
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)

    // Fallback to localStorage
    const bookmarks = getBookmarksFromLocalStorage()
    const newId = Date.now()
    const newBookmark = { ...bookmark, id: newId }
    bookmarks.push(newBookmark)
    saveBookmarksToLocalStorage(bookmarks)
    return newId
  }
}

// Get all bookmarks
export async function getAllBookmarks(): Promise<Bookmark[]> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      return getBookmarksFromLocalStorage()
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
          console.error(`Object store ${BOOKMARKS_STORE} does not exist`)
          // Fallback to localStorage
          resolve(getBookmarksFromLocalStorage())
          return
        }

        const transaction = db.transaction([BOOKMARKS_STORE], "readonly")
        const store = transaction.objectStore(BOOKMARKS_STORE)

        const request = store.getAll()

        request.onsuccess = () => {
          resolve(request.result || [])
        }

        request.onerror = (event) => {
          console.error("Error retrieving bookmarks:", event)
          console.error("Error details:", (event.target as IDBRequest).error)

          // Fallback to localStorage
          resolve(getBookmarksFromLocalStorage())
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)

        // Fallback to localStorage
        resolve(getBookmarksFromLocalStorage())
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)

    // Fallback to localStorage
    return getBookmarksFromLocalStorage()
  }
}

// Delete a bookmark
export async function deleteBookmark(id: number): Promise<boolean> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      const bookmarks = getBookmarksFromLocalStorage()
      const updatedBookmarks = bookmarks.filter((b) => b.id !== id)
      saveBookmarksToLocalStorage(updatedBookmarks)
      return true
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
          console.error(`Object store ${BOOKMARKS_STORE} does not exist`)
          // Fallback to localStorage
          const bookmarks = getBookmarksFromLocalStorage()
          const updatedBookmarks = bookmarks.filter((b) => b.id !== id)
          saveBookmarksToLocalStorage(updatedBookmarks)
          resolve(true)
          return
        }

        const transaction = db.transaction([BOOKMARKS_STORE], "readwrite")
        const store = transaction.objectStore(BOOKMARKS_STORE)

        const request = store.delete(id)

        request.onsuccess = () => {
          resolve(true)
        }

        request.onerror = (event) => {
          console.error("Error deleting bookmark:", event)
          console.error("Error details:", (event.target as IDBRequest).error)

          // Fallback to localStorage
          const bookmarks = getBookmarksFromLocalStorage()
          const updatedBookmarks = bookmarks.filter((b) => b.id !== id)
          saveBookmarksToLocalStorage(updatedBookmarks)
          resolve(true)
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)

        // Fallback to localStorage
        const bookmarks = getBookmarksFromLocalStorage()
        const updatedBookmarks = bookmarks.filter((b) => b.id !== id)
        saveBookmarksToLocalStorage(updatedBookmarks)
        resolve(true)
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)

    // Fallback to localStorage
    const bookmarks = getBookmarksFromLocalStorage()
    const updatedBookmarks = bookmarks.filter((b) => b.id !== id)
    saveBookmarksToLocalStorage(updatedBookmarks)
    return true
  }
}

// Helper function to get bookmarks from localStorage
function getBookmarksFromLocalStorage(): Bookmark[] {
  try {
    const bookmarksStr = localStorage.getItem("bibleReaderBookmarks")
    return bookmarksStr ? JSON.parse(bookmarksStr) : []
  } catch (e) {
    console.error("Error reading bookmarks from localStorage:", e)
    return []
  }
}

// Helper function to save bookmarks to localStorage
function saveBookmarksToLocalStorage(bookmarks: Bookmark[]): void {
  try {
    localStorage.setItem("bibleReaderBookmarks", JSON.stringify(bookmarks))
  } catch (e) {
    console.error("Error saving bookmarks to localStorage:", e)
  }
}

// Clear old Bible content (older than specified days)
export async function clearOldBibleContent(daysToKeep = 30): Promise<void> {
  try {
    const db = await initDB()
    if (!db) return

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(BIBLE_STORE)) {
          console.error(`Object store ${BIBLE_STORE} does not exist`)
          resolve()
          return
        }

        const transaction = db.transaction([BIBLE_STORE], "readwrite")
        const store = transaction.objectStore(BIBLE_STORE)

        const request = store.openCursor()
        const now = Date.now()
        const cutoffTime = now - daysToKeep * 24 * 60 * 60 * 1000

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            if (cursor.value.timestamp < cutoffTime) {
              cursor.delete()
            }
            cursor.continue()
          }
        }

        request.onerror = (event) => {
          console.error("Error clearing old Bible content:", event)
          console.error("Error details:", (event.target as IDBRequest).error)
          resolve()
        }

        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
      } catch (error) {
        console.error("Transaction error:", error)
        resolve()
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)
  }
}

// Clear all Bible content from localStorage to recover from quota issues
export function clearLocalStorageBibleContent(): void {
  try {
    // Get all keys from localStorage
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (
        key &&
        (key.startsWith("bibleContent_") || key === "bibleReaderDisplaySettings" || key === "lastOpenedBible")
      ) {
        keysToRemove.push(key)
      }
    }

    // Remove all Bible content keys
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key)
        console.log(`Removed ${key} from localStorage`)
      } catch (e) {
        console.error(`Failed to remove ${key}:`, e)
      }
    })

    console.log(`Cleared ${keysToRemove.length} Bible content items from localStorage`)
  } catch (error) {
    console.error("Error clearing localStorage Bible content:", error)
  }
}

// Store tag styles
export async function storeTagStyles(styles: any): Promise<void> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      localStorage.setItem("bibleReaderTagStyles", JSON.stringify(styles))
      return
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(TAG_STYLES_STORE)) {
          console.error(`Object store ${TAG_STYLES_STORE} does not exist`)
          // Fallback to localStorage
          localStorage.setItem("bibleReaderTagStyles", JSON.stringify(styles))
          resolve()
          return
        }

        const transaction = db.transaction([TAG_STYLES_STORE], "readwrite")
        const store = transaction.objectStore(TAG_STYLES_STORE)

        const data = {
          id: "tagStyles",
          styles,
          timestamp: Date.now(),
        }

        const request = store.put(data)

        request.onsuccess = () => {
          resolve()
        }

        request.onerror = (event) => {
          console.error("Error storing tag styles:", event)
          console.error("Error details:", (event.target as IDBRequest).error)
          // Fallback to localStorage
          localStorage.setItem("bibleReaderTagStyles", JSON.stringify(styles))
          resolve()
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)
        // Fallback to localStorage
        localStorage.setItem("bibleReaderTagStyles", JSON.stringify(styles))
        resolve()
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)
    // Fallback to localStorage
    localStorage.setItem("bibleReaderTagStyles", JSON.stringify(styles))
  }
}

// Get tag styles
export async function getTagStyles(): Promise<any | null> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      const savedStyles = localStorage.getItem("bibleReaderTagStyles")
      return savedStyles ? JSON.parse(savedStyles) : null
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(TAG_STYLES_STORE)) {
          console.error(`Object store ${TAG_STYLES_STORE} does not exist`)
          // Fallback to localStorage
          const savedStyles = localStorage.getItem("bibleReaderTagStyles")
          resolve(savedStyles ? JSON.parse(savedStyles) : null)
          return
        }

        const transaction = db.transaction([TAG_STYLES_STORE], "readonly")
        const store = transaction.objectStore(TAG_STYLES_STORE)

        const request = store.get("tagStyles")

        request.onsuccess = () => {
          const result = request.result
          if (result) {
            resolve(result.styles)
          } else {
            resolve(null)
          }
        }

        request.onerror = (event) => {
          console.error("Error retrieving tag styles:", event)
          console.error("Error details:", (event.target as IDBRequest).error)

          // Fallback to localStorage
          const savedStyles = localStorage.getItem("bibleReaderTagStyles")
          resolve(savedStyles ? JSON.parse(savedStyles) : null)
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)

        // Fallback to localStorage
        const savedStyles = localStorage.getItem("bibleReaderTagStyles")
        resolve(savedStyles ? JSON.parse(savedStyles) : null)
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)

    // Fallback to localStorage
    const savedStyles = localStorage.getItem("bibleReaderTagStyles")
    return savedStyles ? JSON.parse(savedStyles) : null
  }
}

// Reset the database (for troubleshooting)
export async function resetDatabase(): Promise<void> {
  try {
    return new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME)

      request.onsuccess = () => {
        console.log(`Database ${DB_NAME} deleted successfully`)
        resolve()
      }

      request.onerror = (event) => {
        console.error("Error deleting database:", event)
        resolve()
      }
    })
  } catch (error) {
    console.error("Error resetting database:", error)
  }
}

// Export all settings data as a JSON file
export async function exportSettings(): Promise<string> {
  try {
    // Collect all settings data
    const displaySettings = await getDisplaySettings()
    const lastRead = await getLastRead()
    const bookmarks = await getAllBookmarks()
    const tagStyles = await getTagStyles()

    // Create a settings object with all data
    const settingsData = {
      version: DB_VERSION,
      exportDate: new Date().toISOString(),
      displaySettings,
      lastRead,
      bookmarks,
      tagStyles,
    }

    // Convert to JSON string
    return JSON.stringify(settingsData, null, 2)
  } catch (error) {
    console.error("Error exporting settings:", error)
    throw new Error("Failed to export settings")
  }
}

// Import settings from a JSON file
export async function importSettings(jsonData: string): Promise<{ success: boolean; message: string }> {
  try {
    // Parse the JSON data
    const settingsData = JSON.parse(jsonData)

    // Validate the data structure
    if (!settingsData || typeof settingsData !== "object") {
      return { success: false, message: "Invalid settings data format" }
    }

    // Import display settings
    if (settingsData.displaySettings) {
      await storeDisplaySettings(settingsData.displaySettings)
    }

    // Import last read data
    if (settingsData.lastRead) {
      await storeLastRead(settingsData.lastRead)
    }

    // Import tag styles
    if (settingsData.tagStyles) {
      await storeTagStyles(settingsData.tagStyles)
    }

    // Import bookmarks
    if (settingsData.bookmarks && Array.isArray(settingsData.bookmarks)) {
      // First, get existing bookmarks to avoid duplicates
      const existingBookmarks = await getAllBookmarks()
      const existingBookmarkIds = new Set(existingBookmarks.map((b) => b.id))

      // Import each bookmark that doesn't already exist
      let importedCount = 0
      for (const bookmark of settingsData.bookmarks) {
        if (!bookmark.id || !existingBookmarkIds.has(bookmark.id)) {
          await addBookmark(bookmark)
          importedCount++
        }
      }

      return {
        success: true,
        message: `Settings imported successfully. ${importedCount} new bookmarks added.`,
      }
    }

    return { success: true, message: "Settings imported successfully" }
  } catch (error) {
    console.error("Error importing settings:", error)
    return {
      success: false,
      message: "Failed to import settings: " + (error as Error).message,
    }
  }
}

// Store a reading plan
export async function storeReadingPlan(plan: ReadingPlan): Promise<void> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      const plans = getReadingPlansFromLocalStorage()
      const existingPlanIndex = plans.findIndex((p) => p.id === plan.id)

      if (existingPlanIndex >= 0) {
        plans[existingPlanIndex] = plan
      } else {
        plans.push(plan)
      }

      saveReadingPlansToLocalStorage(plans)
      return
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(READING_PLANS_STORE)) {
          console.error(`Object store ${READING_PLANS_STORE} does not exist`)
          // Fallback to localStorage
          const plans = getReadingPlansFromLocalStorage()
          const existingPlanIndex = plans.findIndex((p) => p.id === plan.id)

          if (existingPlanIndex >= 0) {
            plans[existingPlanIndex] = plan
          } else {
            plans.push(plan)
          }

          saveReadingPlansToLocalStorage(plans)
          resolve()
          return
        }

        const transaction = db.transaction([READING_PLANS_STORE], "readwrite")
        const store = transaction.objectStore(READING_PLANS_STORE)

        const request = store.put(plan)

        request.onsuccess = () => {
          resolve()
        }

        request.onerror = (event) => {
          console.error("Error storing reading plan:", event)
          console.error("Error details:", (event.target as IDBRequest).error)

          // Fallback to localStorage
          const plans = getReadingPlansFromLocalStorage()
          const existingPlanIndex = plans.findIndex((p) => p.id === plan.id)

          if (existingPlanIndex >= 0) {
            plans[existingPlanIndex] = plan
          } else {
            plans.push(plan)
          }

          saveReadingPlansToLocalStorage(plans)
          resolve()
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)

        // Fallback to localStorage
        const plans = getReadingPlansFromLocalStorage()
        const existingPlanIndex = plans.findIndex((p) => p.id === plan.id)

        if (existingPlanIndex >= 0) {
          plans[existingPlanIndex] = plan
        } else {
          plans.push(plan)
        }

        saveReadingPlansToLocalStorage(plans)
        resolve()
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)

    // Fallback to localStorage
    const plans = getReadingPlansFromLocalStorage()
    const existingPlanIndex = plans.findIndex((p) => p.id === plan.id)

    if (existingPlanIndex >= 0) {
      plans[existingPlanIndex] = plan
    } else {
      plans.push(plan)
    }

    saveReadingPlansToLocalStorage(plans)
  }
}

// Get a reading plan by ID
export async function getReadingPlan(id: string): Promise<ReadingPlan | null> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      const plans = getReadingPlansFromLocalStorage()
      return plans.find((p) => p.id === id) || null
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(READING_PLANS_STORE)) {
          console.error(`Object store ${READING_PLANS_STORE} does not exist`)
          // Fallback to localStorage
          const plans = getReadingPlansFromLocalStorage()
          resolve(plans.find((p) => p.id === id) || null)
          return
        }

        const transaction = db.transaction([READING_PLANS_STORE], "readonly")
        const store = transaction.objectStore(READING_PLANS_STORE)

        const request = store.get(id)

        request.onsuccess = () => {
          resolve(request.result || null)
        }

        request.onerror = (event) => {
          console.error("Error retrieving reading plan:", event)
          console.error("Error details:", (event.target as IDBRequest).error)

          // Fallback to localStorage
          const plans = getReadingPlansFromLocalStorage()
          resolve(plans.find((p) => p.id === id) || null)
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)

        // Fallback to localStorage
        const plans = getReadingPlansFromLocalStorage()
        resolve(plans.find((p) => p.id === id) || null)
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)

    // Fallback to localStorage
    const plans = getReadingPlansFromLocalStorage()
    return plans.find((p) => p.id === id) || null
  }
}

// Get all reading plans
export async function getAllReadingPlans(): Promise<ReadingPlan[]> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      return getReadingPlansFromLocalStorage()
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(READING_PLANS_STORE)) {
          console.error(`Object store ${READING_PLANS_STORE} does not exist`)
          // Fallback to localStorage
          resolve(getReadingPlansFromLocalStorage())
          return
        }

        const transaction = db.transaction([READING_PLANS_STORE], "readonly")
        const store = transaction.objectStore(READING_PLANS_STORE)

        const request = store.getAll()

        request.onsuccess = () => {
          resolve(request.result || [])
        }

        request.onerror = (event) => {
          console.error("Error retrieving reading plans:", event)
          console.error("Error details:", (event.target as IDBRequest).error)

          // Fallback to localStorage
          resolve(getReadingPlansFromLocalStorage())
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)

        // Fallback to localStorage
        resolve(getReadingPlansFromLocalStorage())
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)

    // Fallback to localStorage
    return getReadingPlansFromLocalStorage()
  }
}

// Delete a reading plan
export async function deleteReadingPlan(id: string): Promise<boolean> {
  try {
    const db = await initDB()
    if (!db) {
      // Fallback to localStorage
      const plans = getReadingPlansFromLocalStorage()
      const updatedPlans = plans.filter((p) => p.id !== id)
      saveReadingPlansToLocalStorage(updatedPlans)
      return true
    }

    return new Promise((resolve) => {
      try {
        // Check if the object store exists
        if (!db.objectStoreNames.contains(READING_PLANS_STORE)) {
          console.error(`Object store ${READING_PLANS_STORE} does not exist`)
          // Fallback to localStorage
          const plans = getReadingPlansFromLocalStorage()
          const updatedPlans = plans.filter((p) => p.id !== id)
          saveReadingPlansToLocalStorage(updatedPlans)
          resolve(true)
          return
        }

        const transaction = db.transaction([READING_PLANS_STORE], "readwrite")
        const store = transaction.objectStore(READING_PLANS_STORE)

        const request = store.delete(id)

        request.onsuccess = () => {
          resolve(true)
        }

        request.onerror = (event) => {
          console.error("Error deleting reading plan:", event)
          console.error("Error details:", (event.target as IDBRequest).error)

          // Fallback to localStorage
          const plans = getReadingPlansFromLocalStorage()
          const updatedPlans = plans.filter((p) => p.id !== id)
          saveReadingPlansToLocalStorage(updatedPlans)
          resolve(true)
        }

        transaction.oncomplete = () => {
          db.close()
        }
      } catch (error) {
        console.error("Transaction error:", error)

        // Fallback to localStorage
        const plans = getReadingPlansFromLocalStorage()
        const updatedPlans = plans.filter((p) => p.id !== id)
        saveReadingPlansToLocalStorage(updatedPlans)
        resolve(true)
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)

    // Fallback to localStorage
    const plans = getReadingPlansFromLocalStorage()
    const updatedPlans = plans.filter((p) => p.id !== id)
    saveReadingPlansToLocalStorage(updatedPlans)
    return true
  }
}

// Helper function to get reading plans from localStorage
function getReadingPlansFromLocalStorage(): ReadingPlan[] {
  try {
    const plansStr = localStorage.getItem("bibleReaderReadingPlans")
    return plansStr ? JSON.parse(plansStr) : []
  } catch (e) {
    console.error("Error reading reading plans from localStorage:", e)
    return []
  }
}

// Helper function to save reading plans to localStorage
function saveReadingPlansToLocalStorage(plans: ReadingPlan[]): void {
  try {
    localStorage.setItem("bibleReaderReadingPlans", JSON.stringify(plans))
  } catch (e) {
    console.error("Error saving reading plans to localStorage:", e)
  }
}
