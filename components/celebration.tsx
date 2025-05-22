"use client"

import { useEffect, useState } from "react"
import confetti from "canvas-confetti"

type CelebrationType = "confetti" | "fireworks" | "stars"

interface CelebrationProps {
  type?: CelebrationType
  duration?: number
}

export function Celebration({ type, duration = 3000 }: CelebrationProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const animationEnd = Date.now() + duration

    // Determine which celebration to show
    const celebrationType = type || getRandomCelebrationType()

    let interval: NodeJS.Timeout

    switch (celebrationType) {
      case "confetti":
        // Confetti explosion from the center
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

        interval = setInterval(() => {
          const timeLeft = animationEnd - Date.now()

          if (timeLeft <= 0) {
            return clearInterval(interval)
          }

          const particleCount = 50 * (timeLeft / duration)

          // Launch confetti from the center
          confetti({
            ...defaults,
            particleCount,
            origin: { x: 0.5, y: 0.5 },
          })
        }, 250)
        break

      case "fireworks":
        // Fireworks from bottom
        interval = setInterval(() => {
          const timeLeft = animationEnd - Date.now()

          if (timeLeft <= 0) {
            return clearInterval(interval)
          }

          // Launch fireworks from bottom
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: Math.random(), y: 0.9 },
            colors: ["#ff0000", "#ffff00", "#00ff00", "#0000ff", "#ff00ff"],
            zIndex: 9999,
            shapes: ["circle"],
          })
        }, 400)
        break

      case "stars":
        // Stars falling from top
        interval = setInterval(() => {
          const timeLeft = animationEnd - Date.now()

          if (timeLeft <= 0) {
            return clearInterval(interval)
          }

          // Create star-like particles falling from top
          confetti({
            particleCount: 30,
            angle: 270,
            spread: 90,
            origin: { x: Math.random(), y: 0 },
            gravity: 0.5,
            ticks: 300,
            zIndex: 9999,
            colors: ["#FFD700", "#FFC0CB", "#ADD8E6", "#90EE90", "#FFFFFF"],
            shapes: ["star"],
            scalar: 2,
          })
        }, 300)
        break
    }

    // Clean up
    return () => {
      if (interval) clearInterval(interval)
      confetti.reset()
    }
  }, [duration, type])

  // Don't render anything on the server
  if (!mounted) return null

  // This component doesn't render any visible elements itself,
  // it just triggers the animation
  return null
}

// Helper function to get a random celebration type
function getRandomCelebrationType(): CelebrationType {
  const types: CelebrationType[] = ["confetti", "fireworks", "stars"]
  const randomIndex = Math.floor(Math.random() * types.length)
  return types[randomIndex]
}
