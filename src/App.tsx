import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import AuthForm from "./components/AuthForm"
import RichTextEditor from "./components/RichTextEditor"
import SidebarDraftList from "./components/SidebarDraftList"
import SidebarSentList from "./components/SidebarSentList"
import GrammarSidebar from "./components/GrammarSidebar"
import AppLayout from "./components/AppLayout"
import OfflineBanner from "./components/OfflineBanner"
import { useStore } from "./store/useStore"
import { useAuth, authHelpers } from "./hooks/useAuth"
import { supabase } from "./lib/supabase"
import { EmailInput } from './components/EmailInput'

function App() {
  const { user: authUser, loading: authLoading } = useAuth()
  const user = authUser ? { email: authUser.email || '' } : null
  
  const [isLoading, setIsLoading] = useState(false)
  const [editorContent, setEditorContent] = useState("")
  const [editorTitle, setEditorTitle] = useState("Untitled document")
  const [sidebarTab, setSidebarTab] = useState<"drafts" | "sent">("drafts")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  
  // Update state to handle arrays of emails for chips
  const [toRecipients, setToRecipients] = useState<string[]>([])
  const [ccRecipients, setCcRecipients] = useState<string[]>([])
  const [bccRecipients, setBccRecipients] = useState<string[]>([])

  // Track the raw input value of each EmailInput component
  const [toInputValue, setToInputValue] = useState('')
  const [ccInputValue, setCcInputValue] = useState('')
  const [bccInputValue, setBccInputValue] = useState('')

  const [emailSubject, setEmailSubject] = useState("")
  const [showCcField, setShowCcField] = useState(false)
  const [showBccField, setShowBccField] = useState(false)
  const [emailError, setEmailError] = useState("")
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dataLoadedForUserRef = useRef<string | null>(null)

  const {
    activeDraftId,
    activeSentId,
    setActiveDraft,
    setActiveSent,
    getDraftById,
    getSentById,
    saveDraft,
    updateDraft,
    createNewDraft,
    deleteDraft,
    sendDraft,
    loadDrafts,
    loadSentMessages,
    deleteSentMessage,
    clearUserData,
  } = useStore()

  const activeDraft = activeDraftId ? getDraftById(activeDraftId) : null

  useEffect(() => {
    if (activeDraft) {
      setEditorContent(activeDraft.content)
      setEditorTitle(activeDraft.title)
    } else {
      // Clear editor if no draft is active
      setEditorContent("")
      setEditorTitle("Untitled document")
    }
  }, [activeDraft])

  // Comprehensive email validation function
  const validateEmail = useCallback((email: string): { isValid: boolean; error?: string } => {
    const trimmedEmail = email.trim()
    
    // Check if email is empty
    if (!trimmedEmail) {
      return { isValid: false, error: 'Email address is required' }
    }
    
    // Check length constraints (RFC 5321 limits)
    if (trimmedEmail.length > 254) {
      return { isValid: false, error: 'Email address is too long (maximum 254 characters)' }
    }
    
    // Basic format validation with improved regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, error: 'Please enter a valid email address format' }
    }
    
    // Split into local and domain parts
    const [localPart, ...domainParts] = trimmedEmail.split('@')
    const domainPart = domainParts.join('@') // Handle edge case of multiple @ signs
    
    // Validate local part (before @)
    if (!localPart || localPart.length > 64) {
      return { isValid: false, error: 'Email local part is invalid or too long (maximum 64 characters)' }
    }
    
    // Check for consecutive dots in local part
    if (localPart.includes('..')) {
      return { isValid: false, error: 'Email address cannot contain consecutive dots' }
    }
    
    // Check if local part starts or ends with a dot
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return { isValid: false, error: 'Email address cannot start or end with a dot' }
    }
    
    // Validate domain part (after @)
    if (!domainPart || domainPart.length > 253) {
      return { isValid: false, error: 'Email domain is invalid or too long' }
    }
    
    // Check for valid domain format
    const domainLabels = domainPart.split('.')
    if (domainLabels.length < 2) {
      return { isValid: false, error: 'Email domain must contain at least one dot' }
    }
    
    // Validate each domain label
    for (const label of domainLabels) {
      if (!label || label.length > 63) {
        return { isValid: false, error: 'Email domain label is invalid or too long' }
      }
      
      // Domain labels cannot start or end with hyphens
      if (label.startsWith('-') || label.endsWith('-')) {
        return { isValid: false, error: 'Email domain labels cannot start or end with hyphens' }
      }
      
      // Domain labels should contain only valid characters
      if (!/^[a-zA-Z0-9-]+$/.test(label)) {
        return { isValid: false, error: 'Email domain contains invalid characters' }
      }
    }
    
    // Check for common typos in popular domains
    const commonDomainTypos: Record<string, string> = {
      'gmai.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com',
      'hotmial.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com'
    }
    
    const suggestedDomain = commonDomainTypos[domainPart.toLowerCase()]
    if (suggestedDomain) {
      return { isValid: false, error: `Did you mean ${localPart}@${suggestedDomain}?` }
    }
    
    return { isValid: true }
  }, [])

  // Validate a list of comma-separated emails
  const validateEmailList = useCallback((emailList: string, fieldName: string): { isValid: boolean; error?: string } => {
    if (!emailList.trim()) {
      return { isValid: true } // Empty list is valid
    }
    
    const emails = emailList.split(',').map(email => email.trim()).filter(email => email.length > 0)
    
    if (emails.length === 0) {
      return { isValid: true }
    }
    
    // Check for duplicates
    const uniqueEmails = new Set(emails.map(email => email.toLowerCase()))
    if (uniqueEmails.size !== emails.length) {
      return { isValid: false, error: `Duplicate email addresses found in ${fieldName} field` }
    }
    
    // Validate each email
    for (const email of emails) {
      const validation = validateEmail(email)
      if (!validation.isValid) {
        return { isValid: false, error: `Invalid ${fieldName} email "${email}": ${validation.error}` }
      }
    }
    
    return { isValid: true }
  }, [validateEmail])

  const isEmailFormValid = useMemo(() => {
    // A recipient is required
    if (toRecipients.length === 0) {
      return false
    }

    // Check for any text in the input fields that hasn't been converted to a chip
    if (toInputValue.trim() || (showCcField && ccInputValue.trim()) || (showBccField && bccInputValue.trim())) {
      return false
    }
    
    // Validate all emails in each list (this is a redundant check if they are added correctly, but good for safety)
    for (const email of toRecipients) {
      if (!validateEmail(email).isValid) return false
    }
    for (const email of ccRecipients) {
      if (!validateEmail(email).isValid) return false
    }
    for (const email of bccRecipients) {
      if (!validateEmail(email).isValid) return false
    }
    
    // Check for duplicate emails across all fields
    const allEmails = [
      ...toRecipients,
      ...ccRecipients,
      ...bccRecipients
    ].map(email => email.toLowerCase())
    
    const uniqueAllEmails = new Set(allEmails)
    return uniqueAllEmails.size === allEmails.length
  }, [toRecipients, ccRecipients, bccRecipients, validateEmail, toInputValue, ccInputValue, bccInputValue, showCcField, showBccField])

  // Handle what happens when deselecting a draft
  const handleDraftDeselection = useCallback(async (deleteIfEmpty: boolean = true) => {
    if (activeDraftId) {
      const currentDraft = getDraftById(activeDraftId)
      if (currentDraft) {
        // Check if draft is empty (no meaningful content)
        const isEmpty = (editorTitle === "Untitled document" || editorTitle.trim() === "") && 
                       editorContent.trim() === ""
        
        if (isEmpty && deleteIfEmpty) {
          // Delete empty drafts only when explicitly switching to another item
          console.log('Deleting empty draft:', activeDraftId)
          await deleteDraft(activeDraftId)
        } else if (hasUnsavedChanges) {
          // Auto-save drafts with changes
          console.log('Auto-saving draft with changes:', activeDraftId)
          await updateDraft(activeDraftId, editorTitle, editorContent)
          setHasUnsavedChanges(false)
        }
      }
    }
  }, [activeDraftId, getDraftById, editorTitle, editorContent, hasUnsavedChanges, deleteDraft, updateDraft])

  const handleNewDraft = useCallback(async () => {
    try {
      // Check if current draft is already blank and unedited
      if (activeDraftId) {
        const currentDraft = getDraftById(activeDraftId)
        if (currentDraft) {
          const isBlankAndUnedited = (editorTitle === "Untitled document" || editorTitle.trim() === "") && 
                                   editorContent.trim() === "" && 
                                   !hasUnsavedChanges
          
          if (isBlankAndUnedited) {
            console.log('Current draft is already blank and unedited, not creating new draft')
            return // Do nothing
          }
        }
      }

      // Only auto-save if there are unsaved changes, don't delete empty drafts
      if (activeDraftId && hasUnsavedChanges) {
        await handleDraftDeselection(false) // Don't delete empty drafts when creating new
      }
      
      const newId = await createNewDraft()
      setEditorTitle("Untitled document")
      setEditorContent("")
      setActiveDraft(newId)
      setActiveSent("")
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error creating draft:', error)
    }
  }, [activeDraftId, hasUnsavedChanges, getDraftById, editorTitle, editorContent, handleDraftDeselection, createNewDraft, setActiveDraft, setActiveSent])

  // Load data when user logs in - TESTING ONE AT A TIME
  useEffect(() => {
    if (user && !authLoading && user.email !== dataLoadedForUserRef.current) {
      console.log('User logged in, loading data for:', user.email)
      dataLoadedForUserRef.current = user.email
      
      const loadData = async () => {
        try {
          console.log('Step 1: Loading drafts only...')
          await loadDrafts()
          console.log('Step 1: Drafts loaded successfully')
          
          console.log('Step 2: Loading sent messages only...')
          await loadSentMessages()
          console.log('Step 2: Sent messages loaded successfully')
          
          console.log('All data loaded successfully')
          
          // After data is loaded, create a new draft if no active draft
          if (!activeDraftId) {
            console.log('No active draft, creating new draft for fresh login...')
            handleNewDraft()
          }
        } catch (error) {
          console.error('Error loading user data:', error)
          // Don't block the UI, just log the error
          // Still create a new draft even if data loading fails
          if (!activeDraftId) {
            console.log('Creating new draft despite data loading error...')
            handleNewDraft()
          }
        }
      }
      loadData()
    }
  }, [user, authLoading, activeDraftId, handleNewDraft, loadDrafts, loadSentMessages])

  const handleLogout = async () => {
    try {
      const { error } = await authHelpers.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
      // Reset local state
      setEditorContent("")
      setEditorTitle("Untitled document")
      setSidebarTab("drafts")
      setHasUnsavedChanges(false)
      setActiveDraft("")
      setActiveSent("")
      // Clear user data from store
      clearUserData()
      // Reset data loaded tracker
      dataLoadedForUserRef.current = null
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Handle tab switching - keep current selection active
  const handleTabSwitch = async (tab: "drafts" | "sent") => {
    // Don't automatically deselect - just switch the tab view
    // The user will keep their current draft/sent message selected
    setSidebarTab(tab)
  }

  const handleDraftSelect = async (id: string) => {
    // Handle auto-save or deletion of current draft before switching
    await handleDraftDeselection(true) // Delete empty drafts when explicitly selecting another
    
    const draft = getDraftById(id)
    if (draft) {
      setEditorTitle(draft.title)
      setEditorContent(draft.content)
      setActiveDraft(id)
      setActiveSent("")
      setHasUnsavedChanges(false)
    }
  }

  const handleSentSelect = async (id: string) => {
    // Handle auto-save or deletion of current draft before switching
    await handleDraftDeselection(true) // Delete empty drafts when explicitly selecting a sent message
    
    const sent = getSentById(id)
    if (sent) {
      setEditorTitle(sent.title)
      setEditorContent(sent.content)
      setActiveSent(id)
      setActiveDraft("")
      setHasUnsavedChanges(false)
    }
  }

  const handleDeleteDraft = async (id: string) => {
    try {
      await deleteDraft(id)
      if (activeDraftId === id) {
        setEditorTitle("Untitled document")
        setEditorContent("")
        setActiveDraft("")
        setHasUnsavedChanges(false)
      }
    } catch (error) {
      console.error('Error deleting draft:', error)
    }
  }

  const autoSave = useCallback(async () => {
    if (activeDraftId && hasUnsavedChanges) {
      try {
        await updateDraft(activeDraftId, editorTitle, editorContent)
        setHasUnsavedChanges(false)
      } catch (error) {
        console.error('Error auto-saving draft:', error)
      }
    }
  }, [activeDraftId, hasUnsavedChanges, editorTitle, editorContent, updateDraft])

  useEffect(() => {
    if (hasUnsavedChanges && activeDraftId) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave()
      }, 2000)
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [autoSave, hasUnsavedChanges, activeDraftId])

  const handleContentChange = (content: string) => {
    setEditorContent(content)
    setHasUnsavedChanges(true)
  }

  const handleTitleChange = (title: string) => {
    setEditorTitle(title)
    setHasUnsavedChanges(true)
  }

  const handleSend = async (recipientEmail?: string, ccRecipients?: string, bccRecipients?: string, subject?: string) => {
    if (activeDraftId) {
      try {
        setIsLoading(true)
        // Create a copy of the draft with the custom subject if provided
        const draft = getDraftById(activeDraftId)
        if (draft && subject && subject !== draft.title) {
          // Update the draft with the email subject before sending
          await updateDraft(activeDraftId, subject, draft.content)
        }
        
        await sendDraft(activeDraftId, recipientEmail, ccRecipients, bccRecipients)
        setEditorTitle("Untitled document")
        setEditorContent("")
        setActiveDraft("")
        setHasUnsavedChanges(false)
        setShowEmailDialog(false)
        
        // Reset email form state
        setToRecipients([])
        setCcRecipients([])
        setBccRecipients([])
        setEmailSubject("")
      } catch (error) {
        console.error('Error sending draft:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleSendEmail = () => {
    if (!activeDraftId || !editorContent.trim()) {
      console.log('No content to send')
      return
    }
    // Populate subject with current title when opening dialog
    setEmailSubject(editorTitle === "Untitled document" ? "" : editorTitle)
    // Reset CC/BCC visibility and content
    setShowCcField(false)
    setShowBccField(false)
    setToRecipients([])
    setCcRecipients([])
    setBccRecipients([])
    setEmailError("")
    setShowEmailDialog(true)
  }

  const handleEmailSubmit = async () => {
    // Email validation is now handled by disabling the button.
    // We only need to check for the subject here.
    if (!emailSubject.trim()) {
      console.log('Please enter an email subject')
      setEmailError('Please enter an email subject')
      return
    }

    // Clear any previous errors (like the subject error)
    setEmailError("")

    // Pass all email fields (subject, cc, bcc) to the send function
    await handleSend(
      toRecipients.join(','), 
      ccRecipients.join(',') || undefined, 
      bccRecipients.join(',') || undefined,
      emailSubject.trim()
    )
  }

  const handleSave = async () => {
    try {
      const draftId = await saveDraft(editorTitle, editorContent, activeDraftId || undefined)
      if (!activeDraftId) {
        setActiveDraft(draftId)
      }
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error saving draft:', error)
    }
  }

  const handleAuthSuccess = () => {
    // Auth success is handled by the useAuth hook
    console.log('Authentication successful')
  }

  // TEMPORARY: Test data loading manually
  const testDataLoading = async () => {
    console.log('=== TESTING DATA LOADING ===')
    
    try {
      console.log('1. Testing authentication...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Auth error:', authError)
        return
      }
      console.log('✅ User authenticated:', user.email)

      console.log('2. Testing drafts loading...')
      const { data: draftsData, error: draftsError } = await supabase
        .from('drafts')
        .select('*')
        .limit(1)
      
      if (draftsError) {
        console.error('❌ Drafts error:', draftsError)
      } else {
        console.log('✅ Drafts query successful, found:', draftsData?.length || 0, 'items')
      }

      console.log('3. Testing sent messages loading...')
      const { data: sentData, error: sentError } = await supabase
        .from('sent_messages')
        .select('*')
        .limit(1)
      
      if (sentError) {
        console.error('❌ Sent messages error:', sentError)
      } else {
        console.log('✅ Sent messages query successful, found:', sentData?.length || 0, 'items')
      }

    } catch (error) {
      console.error('❌ Test failed:', error)
    }
  }

  // Add test button in development
  if (typeof window !== 'undefined') {
    (window as any).testDataLoading = testDataLoading
  }

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">WordWise</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your intelligent writing companion
            </p>
          </div>
          <AuthForm onSuccess={handleAuthSuccess} />
        </div>
        <OfflineBanner />
      </div>
    )
  }

  // Show text editor if user is logged in
  return (
    <>
      <AppLayout
        user={user}
        onLogout={handleLogout}
        sidebar={
          <>
            {/* Drafts/Sent tabs */}
            <div className="p-6 pb-4">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => handleTabSwitch("drafts")}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors duration-200 ${
                    sidebarTab === "drafts"
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Drafts
                </button>
                <button
                  onClick={() => handleTabSwitch("sent")}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors duration-200 ${
                    sidebarTab === "sent"
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Sent
                </button>
              </div>
            </div>

            {/* Sidebar content */}
            <div className="flex-1 overflow-y-auto">
              {sidebarTab === "drafts" ? (
                <SidebarDraftList
                  onDraftSelect={handleDraftSelect}
                  onNewDraft={handleNewDraft}
                  onDraftDelete={handleDeleteDraft}
                />
              ) : (
                <SidebarSentList
                  onSentSelect={handleSentSelect}
                />
              )}
            </div>
          </>
        }
        editor={
          <RichTextEditor
            text={editorContent}
            title={editorTitle}
            onChange={handleContentChange}
            onTitleChange={handleTitleChange}
            onSave={handleSave}
            onSendEmail={handleSendEmail}
            readOnly={!!activeSentId}
            metaInfo={activeSentId ? (() => {
              const sentMessage = getSentById(activeSentId)
              if (sentMessage) {
                return {
                  type: 'email' as const,
                  subject: sentMessage.title,
                  recipients: sentMessage.recipient,
                  ccRecipients: sentMessage.ccRecipients,
                  bccRecipients: sentMessage.bccRecipients,
                  sentAt: sentMessage.sentAt,
                  status: sentMessage.status
                }
              }
              return null
            })() : null}
          />
        }
        rightSidebar={<GrammarSidebar content={editorContent} />}
      />

      {/* Email Dialog Modal */}
      {showEmailDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Send Via Email
              </h3>
            </div>

            {/* Email Form */}
            <div className="p-6 space-y-4">
              {/* Subject Field */}
              <div>
                <label htmlFor="email-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  id="email-subject"
                  type="text"
                  value={emailSubject}
                  onChange={(e) => {
                    setEmailSubject(e.target.value)
                    if (emailError) setEmailError("")
                  }}
                  placeholder="Enter email subject..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* Recipient Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="email-recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    To <span className="text-red-500">*</span>
                  </label>
                  {/* CC and BCC buttons */}
                  <div className="flex items-center space-x-2">
                    {!showCcField && (
                      <button
                        type="button"
                        onClick={() => setShowCcField(true)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                      >
                        CC
                      </button>
                    )}
                    {!showBccField && (
                      <button
                        type="button"
                        onClick={() => setShowBccField(true)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                      >
                        BCC
                      </button>
                    )}
                  </div>
                </div>
                <EmailInput
                  emails={toRecipients}
                  onChange={setToRecipients}
                  validateEmail={validateEmail}
                  onInputValueChange={setToInputValue}
                  placeholder="Enter recipient email(s)..."
                />
              </div>

              {/* CC Field - Only show when activated */}
              {showCcField && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="cc-emails" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      CC
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCcField(false)
                        setCcRecipients([])
                      }}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                    >
                      Remove
                    </button>
                  </div>
                  <EmailInput
                    emails={ccRecipients}
                    onChange={setCcRecipients}
                    validateEmail={validateEmail}
                    onInputValueChange={setCcInputValue}
                    placeholder="Enter CC emails..."
                  />
                </div>
              )}

              {/* BCC Field - Only show when activated */}
              {showBccField && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="bcc-emails" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      BCC
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBccField(false)
                        setBccRecipients([])
                      }}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                    >
                      Remove
                    </button>
                  </div>
                  <EmailInput
                    emails={bccRecipients}
                    onChange={setBccRecipients}
                    validateEmail={validateEmail}
                    onInputValueChange={setBccInputValue}
                    placeholder="Enter BCC emails..."
                  />
                </div>
              )}

              {/* Body Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Body
                </label>
                <div className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm min-h-[80px] max-h-[120px] overflow-y-auto">
                  {editorContent || "No content"}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  To edit the body content, use the main editor above
                </p>
              </div>

              {/* Error Message */}
              {emailError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-700 dark:text-red-300">{emailError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="text-red-500">*</span> Required fields
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowEmailDialog(false)
                    setToRecipients([])
                    setCcRecipients([])
                    setBccRecipients([])
                    setEmailSubject("")
                    setShowCcField(false)
                    setShowBccField(false)
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmailSubmit}
                  disabled={isLoading || !emailSubject.trim() || !isEmailFormValid}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    'Send Email'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App 
