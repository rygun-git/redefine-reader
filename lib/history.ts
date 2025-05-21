// History management for Bible Reader

// Define the history item interface
export interface HistoryItem {
  id?: number
  book: string
  chapter: number
  timestamp: number
  versionId?: string | number
  outlineId?: string | number
}

// Check if the history store exists in the database
async function historyStoreExists(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("BibleReaderDB")

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const exists = db.objectStoreNames.contains("history")
        db.close()
        resolve(exists)
      }

      request.onerror = () => {
        console.error("Error checking if history store exists")
        resolve(false)
      }
    } catch (error) {
      console.error("Error checking if history store exists:", error)
      resolve(false)
    }
  })
}

// Create the history store if it doesn't exist
async function ensureHistoryStore(): Promise<boolean> {
  const exists = await historyStoreExists()

  if (exists) {
    return true
  }

  // If the store doesn't exist, we need to upgrade the database
  return new Promise((resolve) => {
    try {
      // Get the current version
      const request = indexedDB.open("BibleReaderDB")

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const currentVersion = db.version
        db.close()

        // Upgrade to a new version
        const upgradeRequest = indexedDB.open("BibleReaderDB", currentVersion + 1)

        upgradeRequest.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result

          // Create the history store
          if (!db.objectStoreNames.contains("history")) {
            const historyStore = db.createObjectStore("history", {
              keyPath: "id",
              autoIncrement: true,
            })
            historyStore.createIndex("timestamp", "timestamp", { unique: false })
            console.log("Created history store")
          }
        }

        upgradeRequest.onsuccess = () => {
          upgradeRequest.result.close()
          resolve(true)
        }

        upgradeRequest.onerror = () => {
          console.error("Error upgrading database to add history store")
          resolve(false)
        }
      }

      request.onerror = () => {
        console.error("Error opening database to check version")
        resolve(false)
      }
    } catch (error) {
      console.error("Error ensuring history store exists:", error)
      resolve(false)
    }
  })
}

// Get all history items
export async function getAllHistoryItems(): Promise<HistoryItem[]> {
  // First, make sure the history store exists
  const storeExists = await historyStoreExists()

  if (!storeExists) {
    console.log("History store doesn't exist, using localStorage fallback")
    return getHistoryItemsFromLocalStorage()
  }

  try {
    return new Promise((resolve) => {
      const request = indexedDB.open("BibleReaderDB")

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        try {
          const transaction = db.transaction(["history"], "readonly")
          const store = transaction.objectStore("history")
          const request = store.getAll()

          request.onsuccess = () => {
            const items = request.result || []
            // Sort by timestamp (newest first)
            items.sort((a, b) => b.timestamp - a.timestamp)
            db.close()
            resolve(items)
          }

          request.onerror = () => {
            console.error("Error getting history items")
            db.close()
            resolve(getHistoryItemsFromLocalStorage())
          }
        } catch (error) {
          console.error("Transaction error:", error)
          db.close()
          resolve(getHistoryItemsFromLocalStorage())
        }
      }

      request.onerror = () => {
        console.error("Error opening database")
        resolve(getHistoryItemsFromLocalStorage())
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)
    return getHistoryItemsFromLocalStorage()
  }
}

// Get the most recent history item
export async function getMostRecentHistoryItem(): Promise<HistoryItem | null> {
  try {
    const items = await getAllHistoryItems()
    return items.length > 0 ? items[0] : null
  } catch (error) {
    console.error("Error getting most recent history item:", error)
    return null
  }
}

// Add a history item
export async function addHistoryItem(item: HistoryItem): Promise<number | null> {
  // First, make sure the history store exists
  const storeExists = await ensureHistoryStore()

  if (!storeExists) {
    console.log("Could not create history store, using localStorage fallback")
    return addHistoryItemToLocalStorage(item)
  }

  try {
    // Check if we already have an entry for this book and chapter
    const existingItems = await getHistoryItemsByBookAndChapter(item.book, item.chapter)

    if (existingItems.length > 0) {
      // Update the timestamp of the existing item
      const existingItem = existingItems[0]
      existingItem.timestamp = Date.now()
      await updateHistoryItem(existingItem)
      return existingItem.id || null
    }

    return new Promise((resolve) => {
      const request = indexedDB.open("BibleReaderDB")

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        try {
          const transaction = db.transaction(["history"], "readwrite")
          const store = transaction.objectStore("history")

          // Add timestamp if not provided
          if (!item.timestamp) {
            item.timestamp = Date.now()
          }

          const request = store.add(item)

          request.onsuccess = () => {
            const id = request.result as number

            // Prune old history items
            pruneHistoryItems(db).catch(console.error)

            db.close()
            resolve(id)
          }

          request.onerror = () => {
            console.error("Error adding history item")
            db.close()
            resolve(addHistoryItemToLocalStorage(item))
          }
        } catch (error) {
          console.error("Transaction error:", error)
          db.close()
          resolve(addHistoryItemToLocalStorage(item))
        }
      }

      request.onerror = () => {
        console.error("Error opening database")
        resolve(addHistoryItemToLocalStorage(item))
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)
    return addHistoryItemToLocalStorage(item)
  }
}

// Update a history item
async function updateHistoryItem(item: HistoryItem): Promise<void> {
  if (!item.id) return

  // First, make sure the history store exists
  const storeExists = await historyStoreExists()

  if (!storeExists) {
    console.log("History store doesn't exist, using localStorage fallback")
    updateHistoryItemInLocalStorage(item)
    return
  }

  try {
    return new Promise((resolve) => {
      const request = indexedDB.open("BibleReaderDB")

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        try {
          const transaction = db.transaction(["history"], "readwrite")
          const store = transaction.objectStore("history")

          const request = store.put(item)

          request.onsuccess = () => {
            db.close()
            resolve()
          }

          request.onerror = () => {
            console.error("Error updating history item")
            db.close()
            updateHistoryItemInLocalStorage(item)
            resolve()
          }
        } catch (error) {
          console.error("Transaction error:", error)
          db.close()
          updateHistoryItemInLocalStorage(item)
          resolve()
        }
      }

      request.onerror = () => {
        console.error("Error opening database")
        updateHistoryItemInLocalStorage(item)
        resolve()
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)
    updateHistoryItemInLocalStorage(item)
  }
}

// Get history items by book and chapter
async function getHistoryItemsByBookAndChapter(book: string, chapter: number): Promise<HistoryItem[]> {
  try {
    const allItems = await getAllHistoryItems()
    return allItems.filter((item) => item.book === book && item.chapter === chapter)
  } catch (error) {
    console.error("Error getting history items by book and chapter:", error)
    return []
  }
}

// Delete a history item
export async function deleteHistoryItem(id: number): Promise<boolean> {
  // First, make sure the history store exists
  const storeExists = await historyStoreExists()

  if (!storeExists) {
    console.log("History store doesn't exist, using localStorage fallback")
    return deleteHistoryItemFromLocalStorage(id)
  }

  try {
    return new Promise((resolve) => {
      const request = indexedDB.open("BibleReaderDB")

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        try {
          const transaction = db.transaction(["history"], "readwrite")
          const store = transaction.objectStore("history")

          const request = store.delete(id)

          request.onsuccess = () => {
            db.close()
            resolve(true)
          }

          request.onerror = () => {
            console.error("Error deleting history item")
            db.close()
            resolve(deleteHistoryItemFromLocalStorage(id))
          }
        } catch (error) {
          console.error("Transaction error:", error)
          db.close()
          resolve(deleteHistoryItemFromLocalStorage(id))
        }
      }

      request.onerror = () => {
        console.error("Error opening database")
        resolve(deleteHistoryItemFromLocalStorage(id))
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)
    return deleteHistoryItemFromLocalStorage(id)
  }
}

// Clear all history
export async function clearAllHistory(): Promise<boolean> {
  // First, make sure the history store exists
  const storeExists = await historyStoreExists()

  if (!storeExists) {
    console.log("History store doesn't exist, using localStorage fallback")
    clearHistoryFromLocalStorage()
    return true
  }

  try {
    return new Promise((resolve) => {
      const request = indexedDB.open("BibleReaderDB")

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        try {
          const transaction = db.transaction(["history"], "readwrite")
          const store = transaction.objectStore("history")

          const request = store.clear()

          request.onsuccess = () => {
            db.close()
            resolve(true)
          }

          request.onerror = () => {
            console.error("Error clearing history")
            db.close()
            clearHistoryFromLocalStorage()
            resolve(true)
          }
        } catch (error) {
          console.error("Transaction error:", error)
          db.close()
          clearHistoryFromLocalStorage()
          resolve(true)
        }
      }

      request.onerror = () => {
        console.error("Error opening database")
        clearHistoryFromLocalStorage()
        resolve(true)
      }
    })
  } catch (error) {
    console.error("IndexedDB error:", error)
    clearHistoryFromLocalStorage()
    return true
  }
}

// Prune history items to keep only the most recent 25
async function pruneHistoryItems(db: IDBDatabase): Promise<void> {
  try {
    const transaction = db.transaction(["history"], "readwrite")
    const store = transaction.objectStore("history")

    // Get all items
    const request = store.getAll()

    request.onsuccess = () => {
      const items = request.result || []

      if (items.length <= 25) {
        return
      }

      // Sort by timestamp (newest first)
      items.sort((a, b) => b.timestamp - a.timestamp)

      // Delete the oldest items
      const itemsToDelete = items.slice(25)

      for (const item of itemsToDelete) {
        if (item.id) {
          store.delete(item.id)
        }
      }
    }
  } catch (error) {
    console.error("Error pruning history items:", error)
  }
}

// Helper function to get history items from localStorage
function getHistoryItemsFromLocalStorage(): HistoryItem[] {
  try {
    const historyStr = localStorage.getItem("bibleReaderHistory")
    return historyStr ? JSON.parse(historyStr) : []
  } catch (e) {
    console.error("Error reading history from localStorage:", e)
    return []
  }
}

// Helper function to save history items to localStorage
function saveHistoryItemsToLocalStorage(items: HistoryItem[]): void {
  try {
    localStorage.setItem("bibleReaderHistory", JSON.stringify(items))
  } catch (e) {
    console.error("Error saving history to localStorage:", e)
  }
}

// Helper function to add a history item to localStorage
function addHistoryItemToLocalStorage(item: HistoryItem): number {
  try {
    const historyItems = getHistoryItemsFromLocalStorage()

    // Check for existing item
    const existingIndex = historyItems.findIndex((h) => h.book === item.book && h.chapter === item.chapter)

    if (existingIndex !== -1) {
      // Update existing item
      historyItems[existingIndex].timestamp = Date.now()
      saveHistoryItemsToLocalStorage(historyItems)
      return historyItems[existingIndex].id || Date.now()
    }

    // Add new item
    const newId = Date.now()
    const newItem = { ...item, id: newId, timestamp: Date.now() }
    historyItems.unshift(newItem)

    // Keep only the most recent 25 items
    if (historyItems.length > 25) {
      historyItems.splice(25)
    }

    saveHistoryItemsToLocalStorage(historyItems)
    return newId
  } catch (e) {
    console.error("Error adding history item to localStorage:", e)
    return Date.now()
  }
}

// Helper function to update a history item in localStorage
function updateHistoryItemInLocalStorage(item: HistoryItem): void {
  try {
    const historyItems = getHistoryItemsFromLocalStorage()
    const index = historyItems.findIndex((h) => h.id === item.id)

    if (index !== -1) {
      historyItems[index] = item
      saveHistoryItemsToLocalStorage(historyItems)
    }
  } catch (e) {
    console.error("Error updating history item in localStorage:", e)
  }
}

// Helper function to delete a history item from localStorage
function deleteHistoryItemFromLocalStorage(id: number): boolean {
  try {
    const historyItems = getHistoryItemsFromLocalStorage()
    const updatedItems = historyItems.filter((item) => item.id !== id)
    saveHistoryItemsToLocalStorage(updatedItems)
    return true
  } catch (e) {
    console.error("Error deleting history item from localStorage:", e)
    return false
  }
}

// Helper function to clear all history from localStorage
function clearHistoryFromLocalStorage(): void {
  try {
    localStorage.removeItem("bibleReaderHistory")
  } catch (e) {
    console.error("Error clearing history from localStorage:", e)
  }
}
