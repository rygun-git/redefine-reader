"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  initDB,
  getAllBookmarks,
  getAllReadingPlans,
  getDisplaySettings,
  getLastRead,
  getTagStyles,
} from "@/lib/indexedDB"

export default function DebugPage() {
  const [indexedDBData, setIndexedDBData] = useState<Record<string, any>>({})
  const [localStorageData, setLocalStorageData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        // Load IndexedDB data
        const bookmarks = await getAllBookmarks()
        const readingPlans = await getAllReadingPlans()
        const displaySettings = await getDisplaySettings()
        const lastRead = await getLastRead()
        const tagStyles = await getTagStyles()

        setIndexedDBData({
          bookmarks,
          readingPlans,
          displaySettings,
          lastRead,
          tagStyles,
        })

        // Load localStorage data
        const storageData: Record<string, any> = {}
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key) {
            try {
              // Try to parse JSON data
              const value = localStorage.getItem(key)
              if (value) {
                try {
                  storageData[key] = JSON.parse(value)
                } catch {
                  // If not JSON, store as string
                  storageData[key] = value
                }
              }
            } catch (e) {
              storageData[key] = `[Error reading value: ${e}]`
            }
          }
        }
        setLocalStorageData(storageData)
      } catch (err) {
        setError(`Error loading data: ${err instanceof Error ? err.message : String(err)}`)
        console.error("Error loading debug data:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const refreshData = () => {
    window.location.reload()
  }

  const clearAllData = async () => {
    if (confirm("Are you sure you want to clear ALL local data? This cannot be undone!")) {
      try {
        // Clear IndexedDB
        const db = await initDB()
        if (db) {
          const stores = Array.from(db.objectStoreNames)
          const promises = stores.map((storeName) => {
            return new Promise<void>((resolve, reject) => {
              try {
                const transaction = db.transaction(storeName, "readwrite")
                const store = transaction.objectStore(storeName)
                const request = store.clear()

                request.onsuccess = () => resolve()
                request.onerror = (e) => reject(e)
              } catch (e) {
                reject(e)
              }
            })
          })

          await Promise.all(promises)
        }

        // Clear localStorage
        localStorage.clear()

        alert("All local data has been cleared. The page will now reload.")
        window.location.reload()
      } catch (e) {
        alert(`Error clearing data: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  const formatValue = (value: any): string => {
    if (value === null) return "null"
    if (value === undefined) return "undefined"
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  const renderDataSection = (title: string, data: Record<string, any>) => {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{Object.keys(data).length} items found</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {Object.keys(data).length > 0 ? (
              Object.keys(data).map((key) => (
                <AccordionItem key={key} value={key}>
                  <AccordionTrigger className="font-mono text-sm">
                    {key} {Array.isArray(data[key]) ? `(${data[key].length} items)` : ""}
                  </AccordionTrigger>
                  <AccordionContent>
                    {Array.isArray(data[key]) && data[key].length > 0 ? (
                      <Accordion type="multiple" className="w-full pl-4">
                        {data[key].map((item: any, index: number) => (
                          <AccordionItem key={index} value={`${key}-${index}`}>
                            <AccordionTrigger className="font-mono text-sm">
                              Item {index} {item.id ? `(ID: ${item.id})` : ""}
                            </AccordionTrigger>
                            <AccordionContent>
                              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto text-xs">
                                {formatValue(item)}
                              </pre>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto text-xs">
                        {formatValue(data[key])}
                      </pre>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))
            ) : (
              <p className="text-muted-foreground italic">No data found</p>
            )}
          </Accordion>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-2xl font-bold">Database Debug Page</h1>
        <p className="text-muted-foreground">
          This page shows all data stored in IndexedDB and localStorage. This is for debugging purposes only.
        </p>
        <div className="flex space-x-2 mt-4">
          <Button onClick={refreshData}>Refresh Data</Button>
          <Button variant="destructive" onClick={clearAllData}>
            Clear All Data
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <p>Loading data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      ) : (
        <Tabs defaultValue="indexeddb">
          <TabsList className="mb-4">
            <TabsTrigger value="indexeddb">IndexedDB</TabsTrigger>
            <TabsTrigger value="localstorage">localStorage</TabsTrigger>
          </TabsList>

          <TabsContent value="indexeddb">{renderDataSection("IndexedDB Data", indexedDBData)}</TabsContent>

          <TabsContent value="localstorage">{renderDataSection("localStorage Data", localStorageData)}</TabsContent>
        </Tabs>
      )}
    </div>
  )
}
