import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from './useStore'
import { DraftsService } from '../services/draftsService'
// import { SentMessagesService } from '../services/sentMessagesService'

// Mock dependencies
vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))
vi.mock('../services/draftsService')
vi.mock('../services/sentMessagesService')

describe('useStore', () => {
  beforeEach(() => {
    // Reset the store and mocks before each test
    useStore.getState().clearUserData()
    vi.clearAllMocks()
  })

  it('should have the correct initial state', () => {
    const initialState = useStore.getState()
    expect(initialState.drafts).toEqual([])
    expect(initialState.sentMessages).toEqual([])
    expect(initialState.activeDraftId).toBeNull()
    expect(initialState.activeSentId).toBeNull()
    expect(initialState.isLoadingDrafts).toBe(false)
    expect(initialState.isLoadingSentMessages).toBe(false)
    expect(initialState.grammarSuggestions).toEqual([])
    expect(initialState.isCheckingGrammar).toBe(false)
  })

  it('clearUserData should reset all user-related state', () => {
    // Modify some state
    useStore.setState({
      drafts: [{ id: '1', title: 'Test', content: 'Test', createdAt: new Date(), updatedAt: new Date() }],
      activeDraftId: '1',
    })

    useStore.getState().clearUserData()
    const state = useStore.getState()
    expect(state.drafts).toEqual([])
    expect(state.activeDraftId).toBeNull()
  })

  describe('Grammar Checking', () => {
    it('should test applySuggestion behavior with real state manipulation', () => {
      // Test the actual applySuggestion logic without mocking the core functionality
      const draft = { id: 'd1', title: 'Test', content: 'This is bad text.', createdAt: new Date(), updatedAt: new Date(), isLocal: true }
      const suggestion = { 
        id: 's1', 
        type: 'grammar' as const, 
        original: 'bad text', 
        suggestion: 'good text', 
        explanation: 'Use positive language',
        position: { start: 8, end: 16 },
        source: 'local' as const,
        priority: 2,
        confidence: 0.8
      }
      
      // Set up the state with real draft and suggestion
      useStore.setState({
        drafts: [draft],
        activeDraftId: 'd1',
        grammarSuggestions: [suggestion]
      })

      // Test the actual applySuggestion logic
      useStore.getState().applySuggestion('s1')
      
      const state = useStore.getState()
      
      // Verify the suggestion was removed after application (this should work regardless)
      expect(state.grammarSuggestions).toHaveLength(0)
      
      // For local drafts, the content should be updated immediately
      const updatedDraft = state.drafts.find(d => d.id === 'd1')
      expect(updatedDraft?.content).toBe('This is good text.')
    })

    it('should test clearGrammarSuggestions functionality', () => {
      // Set up state with suggestions
      const mockSuggestions = [{
        id: 'test_suggestion',
        type: 'grammar' as const,
        original: 'bad',
        suggestion: 'good',
        explanation: 'Use positive language',
        position: { start: 5, end: 8 },
        source: 'local' as const,
        priority: 2,
        confidence: 0.8
      }]
      
      useStore.setState({ grammarSuggestions: mockSuggestions })
      expect(useStore.getState().grammarSuggestions).toHaveLength(1)

      // Test the clear functionality
      useStore.getState().clearGrammarSuggestions()
      expect(useStore.getState().grammarSuggestions).toHaveLength(0)
    })

    it('should handle applySuggestion with non-existent suggestion ID', () => {
      const draft = { id: 'd1', title: 'Test', content: 'Original content.', createdAt: new Date(), updatedAt: new Date() }
      
      useStore.setState({
        drafts: [draft],
        activeDraftId: 'd1',
        grammarSuggestions: []
      })

      // Try to apply a non-existent suggestion
      useStore.getState().applySuggestion('non-existent-id')
      
      const state = useStore.getState()
      const updatedDraft = state.drafts.find(d => d.id === 'd1')
      
      // Content should remain unchanged
      expect(updatedDraft?.content).toBe('Original content.')
    })
  })

  describe('Drafts CRUD', () => {
    it('loadDrafts should fetch drafts and update state', async () => {
      const mockDrafts = [{ id: '1', user_id: 'u1', title: 'Draft 1', content: '...', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]
      vi.mocked(DraftsService.getDrafts).mockResolvedValue(mockDrafts)
      
      await useStore.getState().loadDrafts()

      const state = useStore.getState()
      expect(state.isLoadingDrafts).toBe(false)
      expect(state.drafts).toHaveLength(1)
      expect(state.drafts[0].title).toBe('Draft 1')
    })

    it('createNewDraft should add a new draft to the state', () => {
      const newDraftId = useStore.getState().createNewDraft()

      const state = useStore.getState()
      expect(state.drafts).toHaveLength(1)
      expect(state.drafts[0].id).toBe(newDraftId)
      expect(state.activeDraftId).toBe(newDraftId)
      expect(state.drafts[0].title).toBe('Untitled document')
      expect(state.drafts[0].content).toBe('')
    })

    it('deleteDraft should remove a draft from the state', async () => {
      useStore.setState({ drafts: [{ id: '1', title: 'test', content: 'test', createdAt: new Date(), updatedAt: new Date() }], activeDraftId: '1' })
      vi.mocked(DraftsService.deleteDraft).mockResolvedValue(undefined)

      await useStore.getState().deleteDraft('1')

      const state = useStore.getState()
      expect(state.drafts).toHaveLength(0)
      expect(state.activeDraftId).toBeNull()
    })
  })
}) 
