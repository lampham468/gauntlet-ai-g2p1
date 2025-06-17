import { create } from "zustand"
import { DraftsService } from "../services/draftsService"
import { SentMessagesService } from "../services/sentMessagesService"
import type { Draft as SupabaseDraft, SentMessage as SupabaseSentMessage } from "../lib/supabase"
import { supabase } from "../lib/supabase"

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
  checkGrammar: (text: string) => Promise<void>
  clearGrammarSuggestions: () => void
  applySuggestion: (suggestionId: string) => void

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

  checkGrammar: async (text: string) => {
    console.log("Store: checkGrammar called. Text length:", text.length)
    set({ isCheckingGrammar: true, grammarSuggestions: [] })
    try {
      console.log("Store: Invoking Supabase function 'check-grammar'...")
      const { data, error } = await supabase.functions.invoke("check-grammar", {
        body: { text },
      })
      console.log("Store: Supabase function response:", { data, error })

      if (error) {
        throw error
      }

      if (data.suggestions) {
        const suggestionsWithIds = (data.suggestions as Omit<Suggestion, "id">[]).map((suggestion, index) => ({
          ...suggestion,
          id: `${Date.now()}-${index}`,
        }))
        set({ grammarSuggestions: suggestionsWithIds })
      }
    } catch (error) {
      console.error("Store: Failed to check grammar:", error)
      // We could set an error state here if we wanted to display it in the UI
    } finally {
      console.log("Store: Finished grammar check.")
      set({ isCheckingGrammar: false })
    }
  },

  clearGrammarSuggestions: () => set({ grammarSuggestions: [] }),

  applySuggestion: (suggestionId: string) => {
    const { grammarSuggestions, activeDraftId, getDraftById, updateDraft } = get()
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

    // Replace only the first occurrence to avoid unintended changes
    const newContent = activeDraft.content.replace(suggestionToApply.original, suggestionToApply.suggestion)

    // Persist the change to the backend and update the draft in the store
    updateDraft(activeDraftId, activeDraft.title, newContent)

    // Remove the applied suggestion from the list
    set((state) => ({
      grammarSuggestions: state.grammarSuggestions.filter((s) => s.id !== suggestionId),
    }))
  },

  // Drafts state
  drafts: [],
  activeDraftId: null,

  setActiveDraft: (id: string) => set({ activeDraftId: id }),

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

  setActiveSent: (id: string) => set({ activeSentId: id }),

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
