import type React from "react"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { FontProvider } from "@/components/font-provider"
import { AppInitializer } from "@/components/app-initializer"

// Import Montserrat font
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Bible Reader",
  description: "A simple Bible reader application",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bible Reader",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Add SBL Hebrew font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Hebrew:wght@400;700&display=swap"
        />
        {/* Add SBL Greek font alternative */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap" />

        {/* Add Lora font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap" />

        {/* PWA Meta Tags */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Bible Reader" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Bible Reader" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Theme color meta tags for light/dark mode */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000" />

        {/* Service Worker Registration */}
        <script src="/register-sw.js" defer></script>
      </head>
      <body className={`${montserrat.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <FontProvider>
            <AppInitializer>{children}</AppInitializer>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
