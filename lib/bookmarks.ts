// Import the IndexedDB utilities to ensure consistent database handling
import {
  getAllBookmarks as getBookmarksFromDB,
  addBookmark as addBookmarkToDB,
  deleteBookmark as deleteBookmarkFromDB,
  type Bookmark,
} from "./indexedDB";

// Re-export the Bookmark interface
export type { Bookmark };

// Initialize the database with bookmarks store
export async function initBookmarksDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("BibleReaderDB", 1);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      reject("Could not open IndexedDB");
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("bookmarks")) {
        db.close();
        const upgradeRequest = indexedDB.open("BibleReaderDB", db.version + 1);

        upgradeRequest.onupgradeneeded = (event) => {
          const upgradedDb = (event.target as IDBOpenDBRequest).result;
          if (!upgradedDb.objectStoreNames.contains("bookmarks")) {
            const store = upgradedDb.createObjectStore("bookmarks", {
              keyPath: "id",
              autoIncrement: true,
            });
            store.createIndex("book", "book", { unique: false });
          }
        };

        upgradeRequest.onsuccess = (event) => {
          resolve((event.target as IDBOpenDBRequest).result);
        };

        upgradeRequest.onerror = (event) => {
          console.error("Error upgrading database:", event);
          reject("Failed to upgrade database");
        };
      } else {
        resolve(db);
      }
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("bookmarks")) {
        const store = db.createObjectStore("bookmarks", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("book", "book", { unique: false });
      }
    };
  });
}

// Add a bookmark with improved error handling
export async function addBookmark(bookmark: Bookmark): Promise<number> {
  try {
    console.log('Adding bookmark to DB:', bookmark);
    const result = await addBookmarkToDB(bookmark);
    return result || Date.now();
  } catch (error) {
    console.error("Error adding bookmark:", error);
    const bookmarks = getBookmarksFromLocalStorage();
    const newId = Date.now();

    const newBookmark = {
      ...bookmark,
      id: newId
    };

    console.log('Adding bookmark to localStorage:', newBookmark);
    bookmarks.push(newBookmark);
    saveBookmarksToLocalStorage(bookmarks);
    return newId;
  }
}

// Get all bookmarks with improved error handling
export async function getAllBookmarks(): Promise<Bookmark[]> {
  try {
    return await getBookmarksFromDB();
  } catch (error) {
    console.error("Error getting bookmarks:", error);
    return getBookmarksFromLocalStorage();
  }
}

// Delete a bookmark with improved error handling
export async function deleteBookmark(id: number): Promise<void> {
  try {
    await deleteBookmarkFromDB(id);
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    const bookmarks = getBookmarksFromLocalStorage();
    const updatedBookmarks = bookmarks.filter((b) => b.id !== id);
    saveBookmarksToLocalStorage(updatedBookmarks);
  }
}

// Update a bookmark with improved error handling
export async function updateBookmark(bookmark: Bookmark): Promise<void> {
  try {
    if (bookmark.id) {
      await deleteBookmarkFromDB(bookmark.id);
      await addBookmarkToDB(bookmark);
    }
  } catch (error) {
    console.error("Error updating bookmark:", error);
    const bookmarks = getBookmarksFromLocalStorage();
    const index = bookmarks.findIndex((b) => b.id === bookmark.id);
    if (index !== -1) {
      bookmarks[index] = bookmark;
      saveBookmarksToLocalStorage(bookmarks);
    }
  }
}

// Get a bookmark by ID with improved error handling
export async function getBookmark(id: number): Promise<Bookmark | null> {
  try {
    const bookmarks = await getAllBookmarks();
    return bookmarks.find((b) => b.id === id) || null;
  } catch (error) {
    console.error("Error getting bookmark:", error);
    const bookmarks = getBookmarksFromLocalStorage();
    return bookmarks.find((b) => b.id === id) || null;
  }
}

// Get bookmarks for a specific book
export async function getBookmarksByBook(book: string): Promise<Bookmark[]> {
  try {
    const db = await initBookmarksDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["bookmarks"], "readonly");
      const store = transaction.objectStore("bookmarks");
      const index = store.index("book");

      const request = index.getAll(book);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.error("Error getting bookmarks by book:", event);
        reject("Failed to get bookmarks by book");
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error("IndexedDB error:", error);
    return [];
  }
}

// Helper function to get bookmarks from localStorage
function getBookmarksFromLocalStorage(): Bookmark[] {
  try {
    const bookmarksStr = localStorage.getItem("bibleReaderBookmarks");
    return bookmarksStr ? JSON.parse(bookmarksStr) : [];
  } catch (e) {
    console.error("Error reading bookmarks from localStorage:", e);
    return [];
  }
}

// Helper function to save bookmarks to localStorage
function saveBookmarksToLocalStorage(bookmarks: Bookmark[]): void {
  try {
    localStorage.setItem("bibleReaderBookmarks", JSON.stringify(bookmarks));
  } catch (e) {
    console.error("Error saving bookmarks to localStorage:", e);
  }
}
