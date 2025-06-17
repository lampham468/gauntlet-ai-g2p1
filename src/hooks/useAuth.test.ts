import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useAuth, authHelpers } from './useAuth'
import { supabase } from '../lib/supabase'

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('useAuth', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    
    // Default mock implementations
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })
    
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any)

    // Ensure signOut is properly mocked
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Basic Authentication', () => {
    it('should initialize with no user and loading state', async () => {
      const { result } = renderHook(() => useAuth())

      // Initial state
      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBe(null)
      expect(result.current.session).toBe(null)

      // Advance timers to allow Promise to resolve
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.user).toBe(null)
      expect(result.current.session).toBe(null)
      expect(result.current.loading).toBe(false)
    })

    it('should handle successful session retrieval', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer',
      } as any

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      })

      const { result } = renderHook(() => useAuth())

      // Advance timers to allow Promise to resolve
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.session).toEqual(mockSession)
      expect(result.current.user).toEqual(mockSession.user)
      expect(result.current.loading).toBe(false)
    })

    it('should handle auth state changes', async () => {
      let authCallback: (event: string, session: any) => void = () => {}

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
        authCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any
      })

      const { result } = renderHook(() => useAuth())

      // Wait for initial load
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.loading).toBe(false)

      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer',
      } as any

      // Simulate auth state change
      act(() => {
        authCallback('SIGNED_IN', mockSession)
      })

      expect(result.current.user).toEqual(mockSession.user)
      expect(result.current.session).toEqual(mockSession)
    })
  })

  describe('Session Timeout - Automatic Logout', () => {
    it('should automatically log out after session timeout', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer',
      } as any

      let authCallback: (event: string, session: any) => void = () => {}
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
        authCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any
      })

      const { result } = renderHook(() => useAuth())

      // Wait for initial load
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // Simulate sign in
      act(() => {
        authCallback('SIGNED_IN', mockSession)
      })

      expect(result.current.user).toEqual(mockSession.user)

      // Fast forward past the session timeout (24 hours + 1 minute)
      act(() => {
        vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 60 * 1000)
      })

      expect(vi.mocked(supabase.auth.signOut)).toHaveBeenCalled()
    })

    it('should track user activity to prevent premature logout', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer',
      } as any

      let authCallback: (event: string, session: any) => void = () => {}
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
        authCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any
      })

      const { result } = renderHook(() => useAuth())

      // Wait for initial load
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // Simulate sign in
      act(() => {
        authCallback('SIGNED_IN', mockSession)
      })

      expect(result.current.user).toEqual(mockSession.user)

      // Simulate user activity after 12 hours
      act(() => {
        vi.advanceTimersByTime(12 * 60 * 60 * 1000) // 12 hours
        
        // Simulate mouse activity
        const mouseEvent = new Event('mousedown')
        document.dispatchEvent(mouseEvent)
        
        // Fast forward another 12 hours (should not log out due to activity)
        vi.advanceTimersByTime(12 * 60 * 60 * 1000) // 12 hours
      })

      expect(vi.mocked(supabase.auth.signOut)).not.toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should clean up intervals and event listeners on unmount', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer',
      } as any

      let authCallback: (event: string, session: any) => void = () => {}
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
        authCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any
      })

      const { unmount } = renderHook(() => useAuth())

      // Wait for initial load
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // Simulate sign in to create an interval
      act(() => {
        authCallback('SIGNED_IN', mockSession)
      })

      // Spy on clearInterval to verify cleanup
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      
      unmount()

      // Verify cleanup was called (intervals are cleared on unmount)
      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('authHelpers', () => {
    it('should handle sign up', async () => {
      const mockResponse = { data: { user: null, session: null }, error: null } as any
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce(mockResponse)

      const _result = await authHelpers.signUp('test@example.com', 'password')
      
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      })
      expect(_result).toEqual(mockResponse)
    })

    it('should handle sign in', async () => {
      const mockResponse = { data: { user: null, session: null }, error: null } as any
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce(mockResponse)

      const _result = await authHelpers.signIn('test@example.com', 'password')
      
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      })
      expect(_result).toEqual(mockResponse)
    })

    it('should handle sign out', async () => {
      const mockResponse = { error: null }
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce(mockResponse)

      const _result = await authHelpers.signOut()
      
      expect(supabase.auth.signOut).toHaveBeenCalled()
      expect(_result).toEqual(mockResponse)
    })

    it('should handle password reset', async () => {
      const mockResponse = { data: {}, error: null }
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce(mockResponse)

      const _result = await authHelpers.resetPassword('test@example.com')
      
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com')
      expect(_result).toEqual(mockResponse)
    })
  })
}) 
