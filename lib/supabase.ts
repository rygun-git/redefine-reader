import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
export const supabase = createClient(
  "https://rzynttoonxzglpyawbgz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6eW50dG9vbnh6Z2xweWF3Ymd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMjk4ODYsImV4cCI6MjA2MTgwNTg4Nn0.Hfw3LODJUp7epk0QOWux9PZ134QB3jeh_VhDH7aUMh8",
)

export interface BibleVersion {
  id: number
  title: string
  language: string
  description: string | null
  content: string
  created_at: string
}

// Database schema for reference:
//
// CREATE TABLE bible_versions (
//   id SERIAL PRIMARY KEY,
//   title TEXT NOT NULL,
//   language TEXT NOT NULL,
//   description TEXT,
//   content TEXT NOT NULL,
//   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
// );
