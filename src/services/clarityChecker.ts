export interface ClarityCheckResult {
  type: 'clarity'
  original: string
  suggestion: string
  explanation: string
  position: { start: number; end: number }
  confidence: number
}

export interface ClarityCheckError {
  message: string
  code: string
}

interface OpenAISuggestion {
  type: string
  original: string
  suggestion: string
  explanation: string
  start?: number
  end?: number
}

class ClarityCheckerService {
  private isInitialized = true
  private baseUrl: string
  private anonKey: string

  constructor() {
    // Use the same environment variables as the main Supabase client
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
    this.anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!this.baseUrl || !this.anonKey) {
      console.error('Missing Supabase environment variables for clarity checker')
      this.isInitialized = false
    }
  }

  /**
   * Check text clarity using OpenAI's nano model
   * Target: < 500ms response time for paragraph-level analysis
   */
  async checkText(text: string): Promise<ClarityCheckResult[] | ClarityCheckError> {
    if (!this.isInitialized) {
      return { message: 'Clarity checker not initialized - missing Supabase environment variables', code: 'NOT_INITIALIZED' }
    }

    if (!text.trim()) {
      return []
    }

    // Only check texts with meaningful content (more than 10 characters)
    if (text.trim().length < 10) {
      return []
    }

    try {
      console.log('🔍 Clarity checker: analyzing text:', text.substring(0, 50) + '...')
      
      const response = await fetch(`${this.baseUrl}/check-grammar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.anonKey}`
        },
        body: JSON.stringify({ 
          text: `Analyze this text for clarity and conciseness improvements. Focus on complete sentences and meaningful phrases that can be made clearer or more direct: ${text}`
        })
      })

      if (!response.ok) {
        console.error('Clarity checker API error:', response.status, response.statusText)
        return { message: `API error: ${response.statusText}`, code: 'API_ERROR' }
      }

      const data = await response.json()
      
      if (data.error) {
        console.error('Clarity checker error:', data.error)
        return { message: data.error, code: 'SERVICE_ERROR' }
      }

      const suggestions = data.suggestions || []
      console.log('🔍 Clarity checker: received', suggestions.length, 'suggestions:', suggestions)

      // Convert OpenAI suggestions to our format with position detection
      const results = await this.processSuggestions(text, suggestions)
      
      console.log('🔍 Clarity checker: returning', results.length, 'clarity suggestions')
      return results
    } catch (error) {
      console.error('Clarity checker error:', error)
      return { message: (error as Error).message, code: 'NETWORK_ERROR' }
    }
  }

  /**
   * Process OpenAI suggestions and add position information
   */
  private async processSuggestions(text: string, suggestions: OpenAISuggestion[]): Promise<ClarityCheckResult[]> {
    const results: ClarityCheckResult[] = []

    for (const suggestion of suggestions) {
      // Skip non-clarity suggestions
      if (suggestion.type !== 'clarity') continue

      // Find the position of the original text in the full text
      const position = this.findTextPosition(text, suggestion.original)
      
      if (position) {
        results.push({
          type: 'clarity',
          original: suggestion.original,
          suggestion: suggestion.suggestion,
          explanation: suggestion.explanation,
          position,
          confidence: 0.8 // OpenAI suggestions are generally high confidence
        })
      }
    }

    return results
  }

  /**
   * Find the position of a text snippet within the full text
   */
  private findTextPosition(fullText: string, snippet: string): { start: number; end: number } | null {
    const index = fullText.indexOf(snippet)
    if (index === -1) {
      // Try case-insensitive search
      const lowerFullText = fullText.toLowerCase()
      const lowerSnippet = snippet.toLowerCase()
      const lowerIndex = lowerFullText.indexOf(lowerSnippet)
      
      if (lowerIndex === -1) {
        console.warn('Could not find snippet in text:', snippet)
        return null
      }
      
      return {
        start: lowerIndex,
        end: lowerIndex + snippet.length
      }
    }
    
    return {
      start: index,
      end: index + snippet.length
    }
  }



  /**
   * Check if the service is ready for use
   */
  isReady(): boolean {
    return this.isInitialized
  }
}

// Export a singleton instance
export const clarityChecker = new ClarityCheckerService()

export default clarityChecker 
