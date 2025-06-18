import { create } from "zustand"
import { DraftsService } from "../services/draftsService"
import { SentMessagesService } from "../services/sentMessagesService"
import type { Draft as SupabaseDraft, SentMessage as SupabaseSentMessage } from "../lib/supabase"
import { spellChecker, type SpellCheckError } from "../services/spellChecker"
import { grammarChecker } from "../services/grammarChecker"
import { clarityChecker, type ClarityCheckResult } from "../services/clarityChecker"

// Local interfaces that match our UI needs
interface Draft {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  isLocal?: boolean // New flag to track local-only drafts
}

interface SentMessage {
  id: string
  title: string
  content: string
  recipient: string
  ccRecipients?: string
  bccRecipients?: string
  sentAt: Date
  status: "delivered" | "pending" | "failed"
}

export interface Suggestion {
  id: string
  type: "grammar" | "spelling" | "clarity"
  original: string
  suggestion: string
  explanation: string
  source: "local" | "window" | "sentence" | "paragraph" | "document"
  priority: number
  position: { start: number; end: number }
  confidence: number
}

interface UndoState {
  draftId: string
  previousContent: string
  appliedSuggestion: Suggestion
  previousSuggestions: Suggestion[]
  timestamp: number
}

// Helper functions to convert between Supabase and local types
const convertSupabaseDraft = (supabaseDraft: SupabaseDraft): Draft => ({
  id: supabaseDraft.id,
  title: supabaseDraft.title,
  content: supabaseDraft.content,
  createdAt: new Date(supabaseDraft.created_at),
  updatedAt: new Date(supabaseDraft.updated_at),
})

const convertSupabaseSentMessage = (supabaseSent: SupabaseSentMessage): SentMessage => ({
  id: supabaseSent.id,
  title: supabaseSent.title,
  content: supabaseSent.content,
  recipient: supabaseSent.recipient_email || "Unknown",
  ccRecipients: supabaseSent.cc_recipients,
  bccRecipients: supabaseSent.bcc_recipients,
  sentAt: new Date(supabaseSent.sent_at),
  status: "delivered", // Default status for sent messages
})

interface AppState {
  // Loading states
  isLoadingDrafts: boolean
  isLoadingSentMessages: boolean

  // Grammar check functionality
  grammarSuggestions: Suggestion[]
  isCheckingGrammar: boolean
  hoveredSuggestionId: string | null
  checkGrammar: (text: string) => void
  checkClarityAndTone: (text: string, mode?: 'clarity' | 'tone') => Promise<void>
  clearGrammarSuggestions: () => void
  applySuggestion: (suggestionId: string) => void
  setHoveredSuggestion: (suggestionId: string | null) => void
  
  // Suggestion validation
  validateSuggestion: (suggestion: Suggestion, currentText: string) => boolean
  cleanupInvalidSuggestions: () => void
  invalidateSuggestionsOnEdit: (oldText: string, newText: string) => void

  // Undo functionality
  undoStack: UndoState[]
  canUndo: () => boolean
  undoLastSuggestion: () => void

  // Cursor positioning after applying suggestions
  cursorPosition: number | null
  setCursorPosition: (position: number | null) => void

  // Local spell check functionality
  checkSpelling: (text: string) => Promise<void>
  addSpellingSuggestions: (errors: SpellCheckError[]) => void

  // Clarity check functionality
  checkClarity: (text: string) => Promise<void>
  addClaritySuggestions: (results: ClarityCheckResult[]) => void

  // Drafts functionality
  drafts: Draft[]
  activeDraftId: string | null
  setActiveDraft: (id: string) => void
  getDraftById: (id: string) => Draft | undefined
  saveDraft: (title: string, content: string, id?: string) => Promise<string>
  updateDraft: (id: string, title: string, content: string) => Promise<void>
  createNewDraft: () => string // Changed to sync since it's now local-only
  createLocalDraft: () => string // New method for creating local drafts
  persistDraft: (id: string) => Promise<string> // New method to persist local drafts
  deleteDraft: (id: string) => Promise<void>
  isDraftEmpty: (id: string) => boolean
  loadDrafts: () => Promise<void>
  sendDraft: (id: string, recipientEmail?: string, ccRecipients?: string, bccRecipients?: string) => Promise<void>

  // Sent messages functionality
  sentMessages: SentMessage[]
  activeSentId: string | null
  setActiveSent: (id: string) => void
  getSentById: (id: string) => SentMessage | undefined
  loadSentMessages: () => Promise<void>
  deleteSentMessage: (id: string) => Promise<void>

  // Clear all user data (for logout)
  clearUserData: () => void
}

export const useStore = create<AppState>((set, get) => ({
  // Loading states
  isLoadingDrafts: false,
  isLoadingSentMessages: false,

  // Grammar check state
  grammarSuggestions: [],
  isCheckingGrammar: false,
  hoveredSuggestionId: null,

  // Undo state
  undoStack: [],

  // Cursor positioning
  cursorPosition: null,

  checkGrammar: (text: string) => {
    console.log("📝 Store: checkGrammar called (local). Text length:", text.length)
    
    // Local grammar check - instant and no API calls
    if (!grammarChecker.isReady()) {
      console.warn('⚠️ Grammar checker not ready yet')
      return
    }

    console.log("📝 Store: calling grammarChecker.checkText...")
    const grammarResults = grammarChecker.checkText(text)
    console.log("📝 Store: grammarChecker returned", grammarResults.length, "results:", grammarResults)
    
    const grammarSuggestions: Suggestion[] = grammarResults.map((result, index) => ({
      id: `grammar_${Date.now()}_${index}`,
      type: result.type,
      original: result.original,
      suggestion: result.suggestion,
      explanation: result.explanation,
      source: "local" as const, // Local grammar checking
      priority: result.type === 'grammar' ? 2 : 3, // Grammar higher priority than clarity
      position: result.position,
      confidence: 0.8 // Default confidence for local grammar suggestions
    }))
    
    console.log("📝 Store: created", grammarSuggestions.length, "grammar suggestions:", grammarSuggestions)
    
    // Replace grammar/clarity suggestions but keep spelling suggestions
    set((state) => {
      const newSuggestions = [
        ...state.grammarSuggestions.filter(s => s.source === "local" && s.type === "spelling"), // Keep spelling suggestions
        ...grammarSuggestions // Replace grammar/clarity suggestions with new ones
      ]
      console.log("📝 Store: setting grammarSuggestions to", newSuggestions.length, "total suggestions")
      return {
        grammarSuggestions: newSuggestions
      }
    })
  },

  clearGrammarSuggestions: () => set({ grammarSuggestions: [] }),

  setHoveredSuggestion: (suggestionId: string | null) => set({ hoveredSuggestionId: suggestionId }),

  // Future method for clarity/tone checking that WILL show loading bar
  checkClarityAndTone: async (text: string, mode: 'clarity' | 'tone' = 'clarity') => {
    console.log(`Store: checkClarityAndTone called with mode: ${mode}. Text length:`, text.length)
    set({ isCheckingGrammar: true }) // Show loading bar for longer operations
    
    try {
      // This will be implemented later for paragraph/document-level analysis
      // For now, just a placeholder that shows how loading state should work
      console.log(`Store: Would invoke clarity/tone check for ${mode}...`)
      
      // Simulate longer processing time for clarity/tone analysis
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`Store: Failed to check ${mode}:`, error)
    } finally {
      console.log(`Store: Finished ${mode} check.`)
      set({ isCheckingGrammar: false })
    }
  },

  // Local spell check implementation
  checkSpelling: async (text: string) => {
    if (!spellChecker.isReady()) {
      console.warn('⚠️ Spell checker not ready yet')
      return
    }

    const errors = await spellChecker.checkText(text)
    get().addSpellingSuggestions(errors)
  },

  addSpellingSuggestions: (errors: SpellCheckError[]) => {
    const spellingSuggestions: Suggestion[] = errors.map((error, index) => {
      const hasRealSuggestions = error.suggestions.length > 0 && !error.suggestions.includes('(no suggestions)')
      
      return {
        id: `spell_${Date.now()}_${index}`,
        type: "spelling" as const,
        original: error.word,
        suggestion: hasRealSuggestions ? error.suggestions[0] : error.word, // Keep original word if no suggestions
        explanation: hasRealSuggestions 
          ? `Misspelled word: "${error.word}"${error.suggestions.length > 1 ? ` (${error.suggestions.length} suggestions)` : ''}`
          : `Potential misspelling: "${error.word}"`,
        source: "local" as const,
        priority: hasRealSuggestions ? 1 : 0.5, // Lower priority for words without suggestions
        position: error.position,
        confidence: hasRealSuggestions ? 0.9 : 0.3 // Lower confidence if no suggestions
      }
    })

    // Remove old spelling suggestions and add new ones
    set((state) => {
      const nonSpellingSuggestions = state.grammarSuggestions.filter(s => s.type !== "spelling")
      const newSuggestions = [
        ...nonSpellingSuggestions,
        ...spellingSuggestions
      ]
      return {
        grammarSuggestions: newSuggestions
      }
    })
  },

  // Track text changes and invalidate suggestions affected by edits
  // This is more aggressive than validateSuggestion - it removes suggestions when ANY character in their range is modified
  invalidateSuggestionsOnEdit: (oldText: string, newText: string) => {
    const { grammarSuggestions } = get()
    
    if (grammarSuggestions.length === 0) return
    
    // Find the first difference between old and new text
    let changeStart = 0
    let changeEnd = Math.max(oldText.length, newText.length)
    
    // Find where the texts start to differ
    while (changeStart < Math.min(oldText.length, newText.length) && 
           oldText[changeStart] === newText[changeStart]) {
      changeStart++
    }
    
    // Find where the texts end their differences (working backwards)
    let oldEnd = oldText.length - 1
    let newEnd = newText.length - 1
    
    while (oldEnd >= changeStart && newEnd >= changeStart && 
           oldText[oldEnd] === newText[newEnd]) {
      oldEnd--
      newEnd--
    }
    
    changeEnd = oldEnd + 1 // Convert to exclusive end index
    
    console.log(`📝 Text change detected: indices ${changeStart}-${changeEnd} (old length: ${oldText.length}, new length: ${newText.length})`)
    
    // Remove any suggestions whose range overlaps with the changed area
    const validSuggestions = grammarSuggestions.filter(suggestion => {
      const { start, end } = suggestion.position
      
      // If suggestion range overlaps with changed area, invalidate it
      const overlaps = !(end <= changeStart || start >= changeEnd)
      
      if (overlaps) {
        console.log(`❌ Invalidating ${suggestion.type} suggestion "${suggestion.original}" (range ${start}-${end}) due to text change at ${changeStart}-${changeEnd}`)
        return false
      }
      
      return true
    })
    
    // Update suggestions if any were removed
    if (validSuggestions.length !== grammarSuggestions.length) {
      const removedCount = grammarSuggestions.length - validSuggestions.length
      console.log(`🧹 Removed ${removedCount} suggestions due to text edits`)
      
      set({ grammarSuggestions: validSuggestions })
    }
  },

  // Validate that a suggestion still applies to the current text (used for applying suggestions)
  validateSuggestion: (suggestion: Suggestion, currentText: string): boolean => {
    const { start, end } = suggestion.position
    
    // Check if position is still valid
    if (start < 0 || end > currentText.length || start >= end) {
      return false
    }
    
    // Check if the original text still exists at the expected position
    const textAtPosition = currentText.slice(start, end)
    return textAtPosition === suggestion.original
  },

  // Clean up invalid suggestions (fallback method - the main cleanup is now invalidateSuggestionsOnEdit)
  cleanupInvalidSuggestions: () => {
    const { grammarSuggestions, activeDraftId, getDraftById } = get()
    
    if (!activeDraftId) return
    
    const activeDraft = getDraftById(activeDraftId)
    if (!activeDraft) return
    
    const validSuggestions = grammarSuggestions.filter(suggestion => 
      get().validateSuggestion(suggestion, activeDraft.content)
    )
    
    // Only update if we found invalid suggestions
    if (validSuggestions.length !== grammarSuggestions.length) {
      const removedCount = grammarSuggestions.length - validSuggestions.length
      console.log(`🧹 Fallback cleanup removed ${removedCount} invalid suggestions`)
      
      set({ grammarSuggestions: validSuggestions })
    }
  },

  applySuggestion: (suggestionId: string) => {
    const { grammarSuggestions, activeDraftId, getDraftById, updateDraft, checkSpelling, validateSuggestion } = get()
    const suggestionToApply = grammarSuggestions.find((s) => s.id === suggestionId)

    if (!suggestionToApply || !activeDraftId) {
      console.error("Could not apply suggestion: suggestion or active draft not found.")
      return
    }

    const activeDraft = getDraftById(activeDraftId)
    if (!activeDraft) {
      console.error("Could not apply suggestion: active draft data not found.")
      return
    }

    // Validate that the suggestion still applies to the current text
    if (!validateSuggestion(suggestionToApply, activeDraft.content)) {
      console.warn("Cannot apply suggestion: original text has been modified or deleted")
      // Remove the invalid suggestion
      set((state) => ({
        grammarSuggestions: state.grammarSuggestions.filter(s => s.id !== suggestionId)
      }))
      return
    }

    // Use position-based replacement instead of string replacement to handle duplicates correctly
    const { start, end } = suggestionToApply.position
    const originalText = activeDraft.content
    const newContent = originalText.slice(0, start) + suggestionToApply.suggestion + originalText.slice(end)

    // Calculate the length difference to update remaining suggestion positions
    const lengthDiff = suggestionToApply.suggestion.length - (end - start)

    // Update positions of remaining suggestions that come after this one
    const updatedSuggestions = grammarSuggestions
      .filter((s) => s.id !== suggestionId) // Remove the applied suggestion
      .map((suggestion) => {
        // If suggestion starts after the applied change, shift its position
        if (suggestion.position.start >= end) {
          return {
            ...suggestion,
            position: {
              start: suggestion.position.start + lengthDiff,
              end: suggestion.position.end + lengthDiff
            }
          }
        }
        // If suggestion overlaps with applied change, remove it (conflicting suggestion)
        else if (suggestion.position.end > start && suggestion.position.start < end) {
          return null // Mark for removal
        }
        // Otherwise, keep suggestion unchanged
        return suggestion
      })
      .filter((s): s is Suggestion => s !== null) // Remove null entries

    // Update the draft content
    updateDraft(activeDraftId, activeDraft.title, newContent)

    // Update suggestions list and trigger re-check for spelling
    set((_state) => ({
      grammarSuggestions: updatedSuggestions
    }))

    // Store undo state before applying the change
    const undoState: UndoState = {
      draftId: activeDraftId,
      previousContent: originalText,
      appliedSuggestion: suggestionToApply,
      previousSuggestions: grammarSuggestions,
      timestamp: Date.now()
    }

    // Add to undo stack (keep only last 10 operations)
    set((_state) => ({
      undoStack: [undoState, ..._state.undoStack].slice(0, 10)
    }))

    // Set cursor position to the end of the replaced text
    const newCursorPosition = start + suggestionToApply.suggestion.length
    console.log(`📍 Setting cursor position: start=${start}, suggestionLength=${suggestionToApply.suggestion.length}, newPosition=${newCursorPosition}`)
    console.log(`📍 Original text: "${suggestionToApply.original}" -> New text: "${suggestionToApply.suggestion}"`)
    set({ cursorPosition: newCursorPosition })

    // Re-trigger spell check on the updated content (since it's <5ms, no performance concern)
    checkSpelling(newContent).catch(error => {
      console.error("Failed to re-check spelling after applying suggestion:", error)
    })
  },

  canUndo: () => {
    const { undoStack, activeDraftId } = get()
    return undoStack.length > 0 && undoStack[0].draftId === activeDraftId
  },

  undoLastSuggestion: () => {
    const { undoStack, activeDraftId, updateDraft, checkSpelling, getDraftById } = get()
    
    if (!activeDraftId || undoStack.length === 0) {
      console.warn("Cannot undo: no active draft or empty undo stack")
      return
    }

    const lastUndo = undoStack[0]
    
    if (lastUndo.draftId !== activeDraftId) {
      console.warn("Cannot undo: undo state is for a different draft")
      return
    }

    // Restore the previous content (keep current title)
    const currentDraft = getDraftById(activeDraftId)
    const currentTitle = currentDraft?.title || "Untitled document"
    updateDraft(activeDraftId, currentTitle, lastUndo.previousContent)

    // Restore the previous suggestions
    set((state) => ({
      grammarSuggestions: lastUndo.previousSuggestions,
      undoStack: state.undoStack.slice(1) // Remove the used undo state
    }))

    // Re-trigger spell check on the restored content
    checkSpelling(lastUndo.previousContent).catch(error => {
      console.error("Failed to re-check spelling after undo:", error)
    })

    console.log("✅ Undid suggestion application")
  },

  // Clarity check implementation
  checkClarity: async (text: string) => {
    if (!clarityChecker.isReady()) {
      console.warn('⚠️ Clarity checker not ready yet')
      return
    }

    // Only check meaningful text (more than 20 characters for clarity analysis)
    if (text.trim().length < 20) {
      // Clear clarity suggestions if text is too short
      set((state) => ({
        grammarSuggestions: state.grammarSuggestions.filter(s => s.type !== "clarity")
      }))
      return
    }

    try {
      console.log('🔍 Store: Starting clarity check for text length:', text.length)
      set({ isCheckingGrammar: true }) // Show loading state
      
      // Clear previous clarity suggestions before starting new check
      set((state) => ({
        grammarSuggestions: state.grammarSuggestions.filter(s => s.type !== "clarity")
      }))
      
      const result = await clarityChecker.checkText(text)
      
      if (Array.isArray(result)) {
        get().addClaritySuggestions(result)
      } else {
        // Handle error case
        console.error('Clarity check failed:', result.message)
      }
    } catch (error) {
      console.error('Clarity check error:', error)
    } finally {
      set({ isCheckingGrammar: false }) // Hide loading state
    }
  },

  addClaritySuggestions: (results: ClarityCheckResult[]) => {
    const claritySuggestions: Suggestion[] = results.map((result, index) => ({
      id: `clarity_${Date.now()}_${index}`,
      type: "clarity" as const,
      original: result.original,
      suggestion: result.suggestion,
      explanation: result.explanation,
      source: "local" as const, // OpenAI via local API
      priority: 3, // Lower priority than spelling and grammar
      position: result.position,
      confidence: result.confidence
    }))

    // Add new clarity suggestions (previous ones already cleared in checkClarity)
    set((state) => ({
      grammarSuggestions: [...state.grammarSuggestions, ...claritySuggestions]
    }))

    console.log('✅ Store: Added', claritySuggestions.length, 'clarity suggestions')
  },

  setCursorPosition: (position: number | null) => set({ cursorPosition: position }),

  // Drafts state
  drafts: [],
  activeDraftId: null,

  setActiveDraft: (id: string) => set((state) => ({ 
    activeDraftId: id,
    activeSentId: null, // Clear sent message when switching to draft
    // Clear clarity suggestions when switching drafts (spelling suggestions can remain)
    grammarSuggestions: state.grammarSuggestions.filter(s => s.type !== "clarity"),
    hoveredSuggestionId: null // Clear hover state
  })),

  getDraftById: (id: string) => {
    const state = get()
    return state.drafts.find((draft) => draft.id === id)
  },

  isDraftEmpty: (id: string) => {
    const state = get()
    const draft = state.drafts.find((d) => d.id === id)
    if (!draft) return true
    return (draft.title === "Untitled document" || draft.title.trim() === "") && draft.content.trim() === ""
  },

  loadDrafts: async () => {
    set({ isLoadingDrafts: true })
    try {
      console.log("🔍 Store: Starting to load drafts...")
      const supabaseDrafts = await DraftsService.getDrafts()
      const drafts = supabaseDrafts.map(convertSupabaseDraft)
      console.log("✅ Store: Loaded", drafts.length, "drafts successfully")
      set({ drafts, isLoadingDrafts: false })
    } catch (error) {
      console.error("❌ Store: Failed to load drafts:", error)
      set({ drafts: [], isLoadingDrafts: false })
    }
  },

  createNewDraft: () => {
    // Create a local draft without database persistence
    const newId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newDraft: Draft = {
      id: newId,
      title: "Untitled document",
      content: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      isLocal: true
    }

    set((state) => ({
      drafts: [newDraft, ...state.drafts],
      activeDraftId: newDraft.id,
    }))

    return newDraft.id
  },

  createLocalDraft: () => {
    // Alias for createNewDraft for backwards compatibility
    return get().createNewDraft()
  },

  persistDraft: async (id: string) => {
    const state = get()
    const localDraft = state.drafts.find(draft => draft.id === id && draft.isLocal)
    
    if (!localDraft) {
      throw new Error("Draft not found or already persisted")
    }

    try {
      // Create the draft in the database
      const supabaseDraft = await DraftsService.createDraft(localDraft.title, localDraft.content)
      const persistedDraft = convertSupabaseDraft(supabaseDraft)

      // Replace the local draft with the persisted one
      set((state) => ({
        drafts: state.drafts.map(draft => 
          draft.id === id ? persistedDraft : draft
        ),
        activeDraftId: state.activeDraftId === id ? persistedDraft.id : state.activeDraftId
      }))

      return persistedDraft.id
    } catch (error) {
      console.error("Failed to persist draft:", error)
      throw error
    }
  },

  saveDraft: async (title: string, content: string, id?: string) => {
    try {
      if (id) {
        const state = get()
        const draft = state.drafts.find(d => d.id === id)
        
        if (draft?.isLocal) {
          // For local drafts, just update locally first
          const updatedDraft: Draft = {
            ...draft,
            title,
            content,
            updatedAt: new Date()
          }
          
          set((state) => ({
            drafts: state.drafts.map((d) => (d.id === id ? updatedDraft : d)),
          }))

          // If there's actual content, persist to database
          if (title.trim() !== "Untitled document" && title.trim() !== "" || content.trim() !== "") {
            return await get().persistDraft(id)
          }
          
          return id
        } else {
          // Update existing persisted draft
          const supabaseDraft = await DraftsService.updateDraft(id, title, content)
          const updatedDraft = convertSupabaseDraft(supabaseDraft)

          set((state) => ({
            drafts: state.drafts.map((draft) => (draft.id === id ? updatedDraft : draft)),
          }))

          return id
        }
      } else {
        // Create new draft - should rarely happen now since we use createNewDraft first
        const supabaseDraft = await DraftsService.createDraft(title, content)
        const newDraft = convertSupabaseDraft(supabaseDraft)

        set((state) => ({
          drafts: [newDraft, ...state.drafts],
          activeDraftId: newDraft.id,
        }))

        return newDraft.id
      }
    } catch (error) {
      console.error("Failed to save draft:", error)
      throw error
    }
  },

  updateDraft: async (id: string, title: string, content: string) => {
    const state = get()
    const draft = state.drafts.find(d => d.id === id)
    
    if (draft?.isLocal) {
      // For local drafts, just update locally
      const updatedDraft: Draft = {
        ...draft,
        title,
        content,
        updatedAt: new Date()
      }
      
      set((state) => ({
        drafts: state.drafts.map((d) => (d.id === id ? updatedDraft : d)),
      }))
      
      // Auto-persist if there's meaningful content
      if ((title.trim() !== "Untitled document" && title.trim() !== "") || content.trim() !== "") {
        try {
          await get().persistDraft(id)
        } catch (error) {
          console.error("Failed to auto-persist draft:", error)
          // Continue without throwing - local changes are still saved
        }
      }
    } else {
      // Update persisted draft
      try {
        const supabaseDraft = await DraftsService.updateDraft(id, title, content)
        const updatedDraft = convertSupabaseDraft(supabaseDraft)

        set((state) => ({
          drafts: state.drafts.map((draft) => (draft.id === id ? updatedDraft : draft)),
        }))
      } catch (error) {
        console.error("Failed to update draft:", error)
        throw error
      }
    }
  },

  deleteDraft: async (id: string) => {
    const state = get()
    const draft = state.drafts.find(d => d.id === id)
    
    if (draft?.isLocal) {
      // For local drafts, just remove from state
      set((state) => ({
        drafts: state.drafts.filter((draft) => draft.id !== id),
        activeDraftId: state.activeDraftId === id ? null : state.activeDraftId,
      }))
    } else {
      // Delete persisted draft
      try {
        await DraftsService.deleteDraft(id)

        set((state) => ({
          drafts: state.drafts.filter((draft) => draft.id !== id),
          activeDraftId: state.activeDraftId === id ? null : state.activeDraftId,
        }))
      } catch (error) {
        console.error("Failed to delete draft:", error)
        throw error
      }
    }
  },

  sendDraft: async (id: string, recipientEmail?: string, ccRecipients?: string, bccRecipients?: string) => {
    try {
      const { sentMessage, draftDeleted } = await SentMessagesService.sendDraft(id, recipientEmail, ccRecipients, bccRecipients)
      const newSentMessage = convertSupabaseSentMessage(sentMessage)

      set((state) => ({
        sentMessages: [newSentMessage, ...state.sentMessages],
        drafts: draftDeleted ? state.drafts.filter((d) => d.id !== id) : state.drafts,
        activeDraftId: state.activeDraftId === id ? null : state.activeDraftId,
      }))
    } catch (error) {
      console.error("Failed to send draft:", error)
      throw error
    }
  },

  // Sent messages state
  sentMessages: [],
  activeSentId: null,

  setActiveSent: (id: string) => set({ 
    activeSentId: id,
    grammarSuggestions: [], // Clear suggestions when viewing sent messages (read-only)
    hoveredSuggestionId: null // Clear hover state too
  }),

  getSentById: (id: string) => {
    const state = get()
    return state.sentMessages.find((msg) => msg.id === id)
  },

  loadSentMessages: async () => {
    set({ isLoadingSentMessages: true })
    try {
      const supabaseSentMessages = await SentMessagesService.getSentMessages()
      const sentMessages = supabaseSentMessages.map(convertSupabaseSentMessage)
      set({ sentMessages, isLoadingSentMessages: false })
    } catch (error) {
      console.error("Failed to load sent messages:", error)
      set({ sentMessages: [], isLoadingSentMessages: false })
    }
  },

  deleteSentMessage: async (id: string) => {
    try {
      await SentMessagesService.deleteSentMessage(id)
      set((state) => ({
        sentMessages: state.sentMessages.filter((msg) => msg.id !== id),
        activeSentId: state.activeSentId === id ? null : state.activeSentId,
      }))
    } catch (error) {
      console.error("Failed to delete sent message:", error)
      throw error
    }
  },

  clearUserData: () => {
    set({
      drafts: [],
      sentMessages: [],
      activeDraftId: null,
      activeSentId: null,
      isLoadingDrafts: false,
      isLoadingSentMessages: false,
      grammarSuggestions: [],
      isCheckingGrammar: false,
    })
  },
}))
