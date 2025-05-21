"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { SplashScreen } from "./splash-screen"

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Show splash screen for 1 second
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {isLoading && <SplashScreen />}
      <div className={isLoading ? "hidden" : "block"}>{children}</div>
    </>
  )
}
