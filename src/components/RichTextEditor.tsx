"use client"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Save } from "lucide-react"
import CopyButton from "./CopyButton"
import { SendButton } from "./SendButton"
import { useStore } from "../store/useStore"

interface RichTextEditorProps {
  text?: string
  title?: string
  onChange?: (text: string) => void
  onTitleChange?: (title: string) => void
  onSave?: (title: string, content: string) => void
  onSendEmail?: () => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  metaInfo?: {
    type: 'email' | 'linkedin' | 'draft'
    subject?: string
    recipients?: string
    ccRecipients?: string
    bccRecipients?: string
    sentAt?: Date
    status?: string
  } | null
  className?: string
}

export function RichTextEditor({
  text = "",
  title = "Untitled document",
  onChange,
  onTitleChange,
  onSave,
  onSendEmail,
  placeholder = "Start writing...",
  disabled = false,
  readOnly = false,
  metaInfo,
  className = "",
}: RichTextEditorProps) {
  const [content, setContent] = useState(text)
  const [documentTitle, setDocumentTitle] = useState(title)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  const [lastClarityCheckContent, setLastClarityCheckContent] = useState<string>("")
  const [previousContent, setPreviousContent] = useState<string>(text) // Track previous content for change detection
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const checkGrammar = useStore((state) => state.checkGrammar)
  const checkSpelling = useStore((state) => state.checkSpelling)
  const checkClarity = useStore((state) => state.checkClarity)
  const cleanupInvalidSuggestions = useStore((state) => state.cleanupInvalidSuggestions)
  const invalidateSuggestionsOnEdit = useStore((state) => state.invalidateSuggestionsOnEdit)
  const hoveredSuggestionId = useStore((state) => state.hoveredSuggestionId)
  const grammarSuggestions = useStore((state) => state.grammarSuggestions)
  const canUndo = useStore((state) => state.canUndo)
  const undoLastSuggestion = useStore((state) => state.undoLastSuggestion)
  const cursorPosition = useStore((state) => state.cursorPosition)
  const setCursorPosition = useStore((state) => state.setCursorPosition)

  // Check if we should show the highlight overlay
  const shouldShowHighlight = useCallback(() => {
    return hoveredSuggestionId && grammarSuggestions.some(s => s.id === hoveredSuggestionId)
  }, [hoveredSuggestionId, grammarSuggestions])

  // Immediate spell checking on every keystroke (< 50ms target)
  // Also invalidate suggestions when text is edited
  useEffect(() => {
    if (content.trim().length > 0 && !readOnly) {
      // Invalidate suggestions based on text changes (more aggressive than cleanup)
      if (previousContent !== content) {
        invalidateSuggestionsOnEdit(previousContent, content)
        setPreviousContent(content)
      }
      
      checkSpelling(content).catch(error => {
        console.error('Spell check failed:', error)
      })
    }
  }, [content, checkSpelling, invalidateSuggestionsOnEdit, previousContent, readOnly])

  // Debounced clarity checking (triggers after 400ms of no typing - optimal for UX)
  // Only triggers on initial load or after user edits, not continuously
  useEffect(() => {
    if (content.trim().length > 20 && !readOnly) {
      // Skip if content hasn't changed since last check (avoid redundant API calls)
      if (content === lastClarityCheckContent) {
        return
      }

      // On initial load, check immediately (but still debounced to avoid rapid successive loads)
      const delay = hasInitialLoad ? 400 : 100

      const clarityTimer = setTimeout(() => {
        console.log('🔍 RichTextEditor: triggering clarity check for:', content.substring(0, 30) + '...')
        setLastClarityCheckContent(content)
        checkClarity(content).catch(error => {
          console.error('Clarity check failed:', error)
        })
      }, delay)

      return () => clearTimeout(clarityTimer)
    }
  }, [content, checkClarity, readOnly, hasInitialLoad, lastClarityCheckContent])

  // DISABLED: Grammar checking for now - focusing on spell checking only
  // useEffect(() => {
  //   if (content.trim().length > 5 && !readOnly) {
  //     console.log('🔍 RichTextEditor: triggering grammar check for:', content.substring(0, 30) + '...')
  //     checkGrammar(content)
  //   }
  // }, [content, checkGrammar, readOnly])

  // Update local state when props change
  useEffect(() => {
    setContent(text)
    setPreviousContent(text) // Update previous content when props change
    setHasUnsavedChanges(false)
    // Mark as initial load when content is set from props (e.g., loading a draft/sent message)
    if (text.trim().length > 0) {
      setHasInitialLoad(true)
      setLastClarityCheckContent("") // Reset to trigger clarity check on load
    }
  }, [text])

  useEffect(() => {
    setDocumentTitle(title)
    setHasUnsavedChanges(false)
  }, [title])

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    const highlight = highlightRef.current
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto"

      // Calculate the new height based on content
      const scrollHeight = textarea.scrollHeight
      const maxHeight = window.innerHeight * 0.7 // Max 70% of viewport height

      if (scrollHeight <= maxHeight) {
        // If content fits, expand to fit content
        textarea.style.height = `${scrollHeight}px`
        textarea.style.overflowY = "hidden"
      } else {
        // If content exceeds max height, set max height and enable scrolling
        textarea.style.height = `${maxHeight}px`
        textarea.style.overflowY = "auto"
      }

      // Sync highlight overlay dimensions (only when it's visible)
      if (highlight && shouldShowHighlight()) {
        highlight.style.height = textarea.style.height
        highlight.style.overflowY = textarea.style.overflowY
      }
    }
  }, [shouldShowHighlight])

  // Generate highlighted text for the overlay
  const getHighlightedText = useCallback(() => {
    if (!shouldShowHighlight() || !content) {
      return content
    }

    const hoveredSuggestion = grammarSuggestions.find(s => s.id === hoveredSuggestionId)
    if (!hoveredSuggestion) {
      return content
    }

    const { start, end } = hoveredSuggestion.position
    const before = content.substring(0, start)
    const highlighted = content.substring(start, end)
    const after = content.substring(end)

    return (
      <>
        {before}
        <span className="bg-blue-200/30 dark:bg-blue-400/20">
          {highlighted}
        </span>
        {after}
      </>
    )
  }, [content, hoveredSuggestionId, grammarSuggestions, shouldShowHighlight])

  const handleTextChange = useCallback((newText: string) => {
    setContent(newText)
    setHasUnsavedChanges(true)
    setHasInitialLoad(true) // Mark that user has started editing
    onChange?.(newText)
    adjustTextareaHeight()
  }, [onChange, adjustTextareaHeight])

  // Removed: Space bar handler - now using keystroke-based grammar checking

  const handleTitleChange = useCallback((newTitle: string) => {
    setDocumentTitle(newTitle)
    setHasUnsavedChanges(true)
    onTitleChange?.(newTitle)
  }, [onTitleChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Ctrl+Z (Windows/Linux) or Cmd+Z (Mac) for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      if (canUndo()) {
        e.preventDefault() // Prevent browser's default undo
        undoLastSuggestion()
        console.log("🔄 Triggered undo via keyboard shortcut")
      }
    }
  }, [canUndo, undoLastSuggestion])

  const handleSave = useCallback(() => {
    onSave?.(documentTitle, content)
    setHasUnsavedChanges(false)
  }, [onSave, documentTitle, content])

  // Memoize expensive calculations
  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0
  }, [content])

  // Adjust height on mount and when content changes
  useEffect(() => {
    adjustTextareaHeight()
  }, [content])

  // Handle cursor positioning after applying suggestions
  useEffect(() => {
    if (cursorPosition !== null && textareaRef.current) {
      const textarea = textareaRef.current
      
      // Small delay to ensure content is updated first
      setTimeout(() => {
        // Focus the textarea and set cursor position
        textarea.focus()
        textarea.setSelectionRange(cursorPosition, cursorPosition)
        
        console.log(`📍 Cursor positioned at ${cursorPosition} in text of length ${textarea.value.length}`)
        console.log(`📍 Text around cursor: "${textarea.value.substring(Math.max(0, cursorPosition - 10), cursorPosition + 10)}"`)
      }, 10)
      
      // Clear the cursor position from store
      setCursorPosition(null)
    }
  }, [cursorPosition, setCursorPosition])

  // Adjust height on window resize (throttled for performance)
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(adjustTextareaHeight, 100)
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [adjustTextareaHeight])

  return (
    <div className={`rich-text-editor p-8 h-full flex flex-col ${className}`}>
      {/* Document Title - Sleek bevel container */}
      <div className="mb-6 flex-shrink-0">
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 focus-within:shadow-lg focus-within:border-blue-300 dark:focus-within:border-blue-600 ${
          readOnly ? 'bg-gray-50 dark:bg-gray-700/50' : ''
        }`}>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={disabled || readOnly}
            className={`w-full px-6 py-4 text-xl font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none rounded-xl placeholder-gray-400 dark:placeholder-gray-500 ${
              readOnly ? 'text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''
            }`}
            placeholder="Document title..."
          />
        </div>
      </div>

      {/* Editor content area - Sleek bevel container with flexible height */}
      <div className={`${readOnly ? '' : 'flex-1'} flex flex-col min-h-0`}>
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 focus-within:shadow-lg focus-within:border-blue-300 dark:focus-within:border-blue-600 flex flex-col min-h-[300px] ${
          readOnly ? 'bg-gray-50 dark:bg-gray-700/50' : ''
        }`}>
          {/* Text editor with highlight overlay */}
          <div className="relative flex-1 flex flex-col">
            {/* Highlight overlay - only visible when highlighting */}
            {shouldShowHighlight() && (
              <div
                ref={highlightRef}
                className="absolute inset-0 px-6 py-6 text-base leading-relaxed text-transparent pointer-events-none rounded-t-xl min-h-[200px] whitespace-pre-wrap break-words overflow-hidden z-10"
                style={{ 
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  wordSpacing: 'inherit',
                  letterSpacing: 'inherit'
                }}
              >
                {getHighlightedText()}
              </div>
            )}
            
            {/* Auto-expanding TextBox */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || readOnly}
              spellCheck={true}
              className={`relative w-full px-6 py-6 text-base leading-relaxed text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-transparent border-none outline-none resize-none rounded-t-xl min-h-[200px] ${
                readOnly ? 'text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''
              }`}
              style={{ height: "auto" }}
            />
          </div>

          {/* Fixed bottom toolbar */}
          <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 rounded-b-xl flex-shrink-0 mt-auto">
            {/* Status bar - left side */}
            <div className="text-xs text-gray-500 dark:text-gray-400 flex space-x-4">
              <span>{content.length} characters</span>
              <span>{wordCount} words</span>
              {hasUnsavedChanges && !readOnly && <span className="text-orange-500 dark:text-orange-400">• Unsaved changes</span>}
              {readOnly && <span className="text-blue-500 dark:text-blue-400">• Read only</span>}
            </div>

            {/* Action buttons - right side */}
            <div className="flex items-center space-x-3">
              {!readOnly ? (
                <>
                  <button
                    onClick={handleSave}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 ${
                      hasUnsavedChanges
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    } shadow-sm`}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </button>
                  <CopyButton
                    textToCopy={content}
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
                  />
                  <SendButton
                    onSendEmail={onSendEmail}
                    disabled={!content.trim() || disabled}
                    className="shadow-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-600"
                  />
                </>
              ) : (
                <CopyButton
                  textToCopy={content}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meta Information Section - Only show for sent messages */}
      {metaInfo && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Message Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metaInfo.type === 'email' && (
                <>
                  {metaInfo.subject && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject
                      </label>
                      <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                        {metaInfo.subject}
                      </div>
                    </div>
                  )}
                  
                  {metaInfo.recipients && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Recipients
                      </label>
                      <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                        {metaInfo.recipients}
                      </div>
                    </div>
                  )}
                  
                  {metaInfo.ccRecipients && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CC
                      </label>
                      <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                        {metaInfo.ccRecipients}
                      </div>
                    </div>
                  )}
                  
                  {metaInfo.bccRecipients && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        BCC
                      </label>
                      <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                        {metaInfo.bccRecipients}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {metaInfo.sentAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sent At
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                    {new Intl.DateTimeFormat("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    }).format(metaInfo.sentAt)}
                  </div>
                </div>
              )}
              
              {metaInfo.status && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <div className={`text-sm font-medium rounded-lg px-3 py-2 inline-flex items-center ${
                    metaInfo.status === 'delivered' 
                      ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                      : metaInfo.status === 'pending'
                      ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                      : metaInfo.status === 'failed'
                      ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                      : 'text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-700'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      metaInfo.status === 'delivered' 
                        ? 'bg-green-500'
                        : metaInfo.status === 'pending'
                        ? 'bg-yellow-500'
                        : metaInfo.status === 'failed'
                        ? 'bg-red-500'
                        : 'bg-gray-500'
                    }`}></div>
                    {metaInfo.status.charAt(0).toUpperCase() + metaInfo.status.slice(1)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spacer to push content up in read-only mode */}
      {readOnly && <div className="flex-1" />}
    </div>
  )
}

export default RichTextEditor
