import { createClient } from "@supabase/supabase-js"

// Use environment variables if available, otherwise fall back to hardcoded values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rzynttoonxzglpyawbgz.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6eW50dG9vbnh6Z2xweWF3Ymd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMjk4ODYsImV4cCI6MjA2MTgwNTg4Nn0.Hfw3LODJUp7epk0QOWux9PZ134QB3jeh_VhDH7aUMh8" 
  


// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface BibleVersion {
  id: number
  title: string
  language: string
  description: string | null
  content: string
  info?: string
  default_font?: string
  created_at: string
}

export interface BibleOutline {
  id: number
  title: string
  chapters: {
    number: number
    name: string
    book?: string
    sections?: {
      startVerse: number
      endVerse: number
      title: string
    }[]
  }[]
  ignoreCMTag?: boolean
  new_format_data?: string
  created_at: string
}

export interface FontDefinition {
  id: string
  name: string
  cssName: string
  language: string
  isDefault: boolean
  description?: string
}
