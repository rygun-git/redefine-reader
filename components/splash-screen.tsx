"use client"
import Image from "next/image"

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-gray-950">
      <div className="relative h-32 w-32 mb-8">
        <Image src="/Redefine.png" alt="Redefine Bible Reader" fill priority className="object-contain" />
      </div>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#1FDDB3] border-t-transparent"></div>
    </div>
  )
}
