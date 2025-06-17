import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from './useStore'
import { supabase } from '../lib/supabase'
import { DraftsService } from '../services/draftsService'
import { SentMessagesService } from '../services/sentMessagesService'

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
    it('checkGrammar should fetch suggestions and update state', async () => {
      const mockSuggestions = [{ type: 'grammar' as const, original: 'bad', suggestion: 'good', explanation: '...' }]
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { suggestions: mockSuggestions }, error: null })

      await useStore.getState().checkGrammar('some bad text')

      const state = useStore.getState()
      expect(state.isCheckingGrammar).toBe(false)
      expect(state.grammarSuggestions).toHaveLength(1)
      expect(state.grammarSuggestions[0].original).toBe('bad')
    })

    it('applySuggestion should update the active draft content', () => {
      const draft = { id: 'd1', title: 'Test', content: 'This is bad text.', createdAt: new Date(), updatedAt: new Date() }
      const suggestion = { id: 's1', type: 'grammar' as const, original: 'bad text', suggestion: 'good text', explanation: '...' }
      useStore.setState({
        drafts: [draft],
        activeDraftId: 'd1',
        grammarSuggestions: [suggestion],
        updateDraft: vi.fn(async (id, title, content) => {
          useStore.setState(state => ({
            drafts: state.drafts.map(d => d.id === id ? { ...d, title, content } : d)
          }))
        })
      })

      useStore.getState().applySuggestion('s1')
      const updatedDraft = useStore.getState().drafts.find(d => d.id === 'd1')
      expect(updatedDraft?.content).toBe('This is good text.')
      expect(useStore.getState().grammarSuggestions).toHaveLength(0)
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

    it('createNewDraft should add a new draft to the state', async () => {
      const newDraft = { id: '2', user_id: 'u1', title: 'Untitled document', content: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      vi.mocked(DraftsService.createDraft).mockResolvedValue(newDraft)

      const newDraftId = await useStore.getState().createNewDraft()

      const state = useStore.getState()
      expect(state.drafts).toHaveLength(1)
      expect(state.drafts[0].id).toBe('2')
      expect(state.activeDraftId).toBe('2')
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
