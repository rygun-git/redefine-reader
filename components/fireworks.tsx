"use client"

import { useEffect, useState } from "react"
import confetti from "canvas-confetti"

export function Fireworks() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Create multiple firework bursts
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

    // Use interval to create multiple bursts
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      // Stop when we're out of time
      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      // Calculate remaining ticks based on time left
      const particleCount = 50 * (timeLeft / duration)

      // Launch confetti from both sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: Math.random(), y: Math.random() * 0.5 },
      })

      confetti({
        ...defaults,
        particleCount,
        origin: { x: Math.random(), y: Math.random() * 0.5 },
      })
    }, 250)

    // Clean up
    return () => {
      clearInterval(interval)
      confetti.reset()
    }
  }, [])

  // Don't render anything on the server
  if (!mounted) return null

  // This component doesn't render any visible elements itself,
  // it just triggers the confetti animation
  return null
}
