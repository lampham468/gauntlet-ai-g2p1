"use client"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Save, SpellCheck } from "lucide-react"
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const checkGrammar = useStore((state) => state.checkGrammar)

  // Debounce for grammar check
  useEffect(() => {
    const handler = setTimeout(() => {
      if (content.trim().length > 10) { // Only check if there's enough content
        checkGrammar(content)
      }
    }, 1500) // 1.5-second delay

    return () => {
      clearTimeout(handler)
    }
  }, [content, checkGrammar])

  // Update local state when props change
  useEffect(() => {
    setContent(text)
    setHasUnsavedChanges(false)
  }, [text])

  useEffect(() => {
    setDocumentTitle(title)
    setHasUnsavedChanges(false)
  }, [title])

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
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
    }
  }, [])

  const handleTextChange = useCallback((newText: string) => {
    setContent(newText)
    setHasUnsavedChanges(true)
    onChange?.(newText)
    adjustTextareaHeight()
  }, [onChange, adjustTextareaHeight])

  const handleTitleChange = useCallback((newTitle: string) => {
    setDocumentTitle(newTitle)
    setHasUnsavedChanges(true)
    onTitleChange?.(newTitle)
  }, [onTitleChange])

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
          {/* Auto-expanding TextBox */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || readOnly}
            spellCheck={true}
            className={`w-full px-6 py-6 text-base leading-relaxed text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-transparent border-none outline-none resize-none rounded-t-xl min-h-[200px] ${
              readOnly ? 'text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''
            }`}
            style={{ height: "auto" }}
          />

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
