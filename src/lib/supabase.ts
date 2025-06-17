import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Use custom storage key for better session management
    storageKey: 'supabase-auth-token'
  }
})

// Database types (based on your Supabase tables)
export interface Draft {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface SentMessage {
  id: string
  user_id: string
  title: string
  content: string
  recipient_email?: string
  cc_recipients?: string
  bcc_recipients?: string
  sent_at: string
}

export type Database = {
  public: {
    Tables: {
      drafts: {
        Row: Draft
        Insert: Omit<Draft, 'id' | 'created_at' | 'updated_at' | 'user_id'>
        Update: Partial<Omit<Draft, 'id' | 'created_at' | 'user_id'>>
      }
      sent_messages: {
        Row: SentMessage
        Insert: Omit<SentMessage, 'id' | 'sent_at' | 'user_id'>
        Update: Partial<Omit<SentMessage, 'id' | 'sent_at' | 'user_id'>>
      }
    }
  }
} 
