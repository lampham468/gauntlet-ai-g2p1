"use client"
import { useStore } from "../store/useStore"
import type React from "react"

import { FileText, Clock, Search, Plus, Trash2, TrashIcon } from "lucide-react"
import { useState } from "react"

// Local interface to match the store's Draft interface - currently not used but kept for type safety
interface _Draft {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  isLocal?: boolean
}

interface SidebarDraftListProps {
  onDraftSelect?: (draftId: string) => void | Promise<void>
  onNewDraft?: () => void | Promise<void>
  onDraftDelete?: (draftId: string) => void | Promise<void>
  className?: string
}

export function SidebarDraftList({ onDraftSelect, onNewDraft, onDraftDelete, className = "" }: SidebarDraftListProps) {
  const { drafts, activeDraftId, setActiveDraft, isLoadingDrafts } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleDraftClick = async (draftId: string) => {
    // Reset delete confirmation when selecting a different draft
    if (deleteConfirmId && deleteConfirmId !== draftId) {
      setDeleteConfirmId(null)
    }

    setActiveDraft(draftId)
    await onDraftSelect?.(draftId)
  }

  const handleNewDraft = async () => {
    // Reset delete confirmation when creating new draft
    setDeleteConfirmId(null)
    await onNewDraft?.()
  }

  const handleDeleteClick = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation() // Prevent draft selection when clicking delete

    if (deleteConfirmId === draftId) {
      // Second click - execute deletion
      onDraftDelete?.(draftId)
      setDeleteConfirmId(null)
    } else {
      // First click - select the draft and show confirmation state
      if (activeDraftId !== draftId) {
        handleDraftClick(draftId)
      }
      setDeleteConfirmId(draftId)
    }
  }

  const handleMouseLeave = (draftId: string) => {
    setHoveredDraftId(null)
    // Reset delete confirmation when mouse leaves the draft item
    if (deleteConfirmId === draftId) {
      setDeleteConfirmId(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const filteredDrafts = drafts.filter(
    (draft) =>
      draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.content.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className={`sidebar-draft-list px-6 ${className}`}>
      <div className="mb-4">
        {/* Header with title and new draft button */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Drafts</h3>
          <button
            onClick={handleNewDraft}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            title="Create new draft"
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search drafts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        <div className="space-y-2">
          {isLoadingDrafts && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Loading drafts...</p>
            </div>
          )}
          {!isLoadingDrafts && filteredDrafts.map((draft) => {
            const isDeleteConfirm = deleteConfirmId === draft.id
            const showDeleteButton = hoveredDraftId === draft.id || activeDraftId === draft.id || isDeleteConfirm

            return (
              <div
                key={draft.id}
                onClick={() => handleDraftClick(draft.id)}
                onMouseEnter={() => setHoveredDraftId(draft.id)}
                onMouseLeave={() => handleMouseLeave(draft.id)}
                className={`group relative p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                  activeDraftId === draft.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                } ${isDeleteConfirm ? "ring-2 ring-red-200 dark:ring-red-800 bg-red-50/50 dark:bg-red-900/10" : ""}`}
              >
                <div className="flex items-start space-x-3">
                  <FileText
                    className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      activeDraftId === draft.id
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4
                        className={`font-medium truncate ${
                          activeDraftId === draft.id
                            ? "text-blue-900 dark:text-blue-100"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {draft.title}
                      </h4>
                      {draft.isLocal && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                          Local
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {draft.content.substring(0, 80)}...
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>Updated {formatDate(draft.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Delete button - two-click operation with selection */}
                  <button
                    onClick={(e) => handleDeleteClick(e, draft.id)}
                    className={`absolute top-2 right-2 p-1.5 rounded-md transition-all duration-200 ${
                      isDeleteConfirm
                        ? "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 scale-110"
                        : "text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    } ${showDeleteButton ? "opacity-100 visible" : "opacity-0 invisible group-hover:opacity-100 group-hover:visible"}`}
                    title={
                      isDeleteConfirm
                        ? "Click again to delete permanently"
                        : activeDraftId === draft.id
                          ? "Delete this draft"
                          : "Select and delete this draft"
                    }
                  >
                    {isDeleteConfirm ? <TrashIcon className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  </button>

                  {/* Delete confirmation indicator */}
                  {isDeleteConfirm && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </div>

                {/* Delete confirmation message */}
                {isDeleteConfirm && (
                  <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                      Click the trash icon again to delete permanently
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!isLoadingDrafts && filteredDrafts.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No drafts found</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Try adjusting your search terms</p>
        </div>
      )}

      {!isLoadingDrafts && filteredDrafts.length === 0 && !searchQuery && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No drafts yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Start writing to create your first draft</p>
        </div>
      )}
    </div>
  )
}

export default SidebarDraftList
