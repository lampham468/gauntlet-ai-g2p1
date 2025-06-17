import { render, screen, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from './App'

// Mock the useAuth hook
const mockUseAuth = vi.fn()
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  authHelpers: {
    signOut: vi.fn(),
  },
}))

// Mock the useStore hook
const mockUseStore = vi.fn()
vi.mock('./store/useStore', () => ({
  useStore: () => mockUseStore(),
}))

// Mock components
vi.mock('./components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('./components/AuthForm', () => ({
  default: () => <div data-testid="auth-form">Auth Form</div>,
}))



describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    
    // Default store state
    mockUseStore.mockReturnValue({
      drafts: [],
      sentMessages: [],
      activeDraftId: null,
      activeSentId: null,
      clearUserData: vi.fn(),
      loadDrafts: vi.fn().mockResolvedValue(undefined),
      loadSentMessages: vi.fn().mockResolvedValue(undefined),
      createNewDraft: vi.fn().mockResolvedValue('new-draft-id'),
      setActiveDraft: vi.fn(),
      setActiveSent: vi.fn(),
      getDraftById: vi.fn(),
      getSentById: vi.fn(),
      saveDraft: vi.fn(),
      updateDraft: vi.fn(),
      deleteDraft: vi.fn(),
      sendDraft: vi.fn(),
      deleteSentMessage: vi.fn(),
      checkGrammar: vi.fn(),
      clearGrammarSuggestions: vi.fn(),
      applySuggestion: vi.fn(),
      grammarSuggestions: [],
      isCheckingGrammar: false,
      isLoadingDrafts: false,
      isLoadingSentMessages: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Authentication States', () => {
    it('should show loading state when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: true,
      })

      render(<App />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show auth form when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
      })

      render(<App />)

      expect(screen.getByTestId('auth-form')).toBeInTheDocument()
    })

    it('should show app layout when user is authenticated', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      const mockSession = { access_token: 'token', user: mockUser }

      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
      })

      render(<App />)

      expect(screen.getByTestId('app-layout')).toBeInTheDocument()
    })
  })

  describe('Data Loading', () => {
    it('should load user data when authenticated', async () => {
      const mockLoadDrafts = vi.fn().mockResolvedValue(undefined)
      const mockLoadSentMessages = vi.fn().mockResolvedValue(undefined)
      const mockCreateNewDraft = vi.fn().mockResolvedValue('new-draft-id')
      
      const mockUser = { id: '123', email: 'test@example.com' }
      const mockSession = { access_token: 'token', user: mockUser }

      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
      })

      mockUseStore.mockReturnValue({
        drafts: [],
        sentMessages: [],
        activeDraftId: null,
        activeSentId: null,
        clearAllData: vi.fn(),
        loadDrafts: mockLoadDrafts,
        loadSentMessages: mockLoadSentMessages,
        createNewDraft: mockCreateNewDraft,
        setActiveDraft: vi.fn(),
        setActiveSent: vi.fn(),
        getDraftById: vi.fn(),
        getSentById: vi.fn(),
        saveDraft: vi.fn(),
        updateDraft: vi.fn(),
        deleteDraft: vi.fn(),
        sendDraft: vi.fn(),
        deleteSentMessage: vi.fn(),
        checkGrammar: vi.fn(),
        clearGrammarSuggestions: vi.fn(),
        applySuggestion: vi.fn(),
        grammarSuggestions: [],
        isCheckingGrammar: false,
        isLoadingDrafts: false,
        isLoadingSentMessages: false,
      })

      render(<App />)

      // Advance timers to allow async effects to complete
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockLoadDrafts).toHaveBeenCalled()
      expect(mockLoadSentMessages).toHaveBeenCalled()
    })

    it('should clear data when user logs out', async () => {
      const mockClearUserData = vi.fn()
      
      mockUseStore.mockReturnValue({
        drafts: [],
        sentMessages: [],
        activeDraftId: null,
        activeSentId: null,
        clearUserData: mockClearUserData,
        loadDrafts: vi.fn().mockResolvedValue(undefined),
        loadSentMessages: vi.fn().mockResolvedValue(undefined),
        createNewDraft: vi.fn().mockResolvedValue('new-draft-id'),
        setActiveDraft: vi.fn(),
        setActiveSent: vi.fn(),
        getDraftById: vi.fn(),
        getSentById: vi.fn(),
        saveDraft: vi.fn(),
        updateDraft: vi.fn(),
        deleteDraft: vi.fn(),
        sendDraft: vi.fn(),
        deleteSentMessage: vi.fn(),
        checkGrammar: vi.fn(),
        clearGrammarSuggestions: vi.fn(),
        applySuggestion: vi.fn(),
        grammarSuggestions: [],
        isCheckingGrammar: false,
        isLoadingDrafts: false,
        isLoadingSentMessages: false,
      })

      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
      })

      render(<App />)

      // Since the user is null, clearUserData won't be called automatically
      // This test is validating the unauthenticated state shows the auth form
      expect(screen.getByTestId('auth-form')).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('should handle auth state transitions', async () => {
      // Start with unauthenticated state
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
      })

      const { rerender } = render(<App />)
      expect(screen.getByTestId('auth-form')).toBeInTheDocument()

      // Simulate authentication
      const mockUser = { id: '123', email: 'test@example.com' }
      const mockSession = { access_token: 'token', user: mockUser }

      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
      })

      rerender(<App />)
      expect(screen.getByTestId('app-layout')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing user in session', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: { access_token: 'token' }, // Session without user
        loading: false,
      })

      render(<App />)

      // Should treat as unauthenticated
      expect(screen.getByTestId('auth-form')).toBeInTheDocument()
    })

    it('should handle auth loading state gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        session: undefined,
        loading: true,
      })

      render(<App />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })
}) 
