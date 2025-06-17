import '@testing-library/jest-dom'; 
import { vi } from 'vitest'

// Mock the supabase client completely
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: null },
      error: null
    }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { 
        subscription: { 
          unsubscribe: vi.fn() 
        } 
      }
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null
    }),
    signOut: vi.fn().mockResolvedValue({
      error: null
    }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({
      data: {},
      error: null
    })
  },
  functions: {
    invoke: vi.fn().mockResolvedValue({
      data: { suggestions: [] },
      error: null
    })
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })
    }),
    insert: vi.fn().mockResolvedValue({
      data: [],
      error: null
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    })
  })
}

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Export the mock for tests to use
export { mockSupabaseClient } 
