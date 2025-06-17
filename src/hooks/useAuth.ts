import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

// Session timeout configuration
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000 // 24 hours
const ACTIVITY_CHECK_INTERVAL_MS = 60 * 1000 // Check every minute

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const lastActivityTimeRef = useRef<number>(Date.now())
  const timeoutIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Update last activity time
  const updateActivity = useCallback(() => {
    lastActivityTimeRef.current = Date.now()
  }, [])

  // Check for user activity and handle session timeout
  const checkSessionTimeout = useCallback(async () => {
    if (!session) return

    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityTimeRef.current

    // If session has expired, log out
    if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
      console.log('Session expired due to inactivity. Logging out...')
      await authHelpers.signOut()
      return
    }
  }, [session])

  // Set up activity listeners
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      updateActivity()
    }

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [updateActivity])

  // Set up session timeout checker
  useEffect(() => {
    if (session) {
      // Start the timeout checker
      timeoutIntervalRef.current = setInterval(checkSessionTimeout, ACTIVITY_CHECK_INTERVAL_MS)
      updateActivity() // Reset activity timer when session starts

      return () => {
        if (timeoutIntervalRef.current) {
          clearInterval(timeoutIntervalRef.current)
          timeoutIntervalRef.current = null
        }
      }
    } else {
      // Clear timeout checker when no session
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current)
        timeoutIntervalRef.current = null
      }
    }
  }, [session, checkSessionTimeout, updateActivity])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Reset session timeout state on auth changes
        if (session) {
          updateActivity()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [updateActivity])

  return { 
    user, 
    session, 
    loading
  }
}

// Auth helper functions
export const authHelpers = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  }
} 
