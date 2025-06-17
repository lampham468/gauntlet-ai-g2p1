// @ts-ignore - write-good doesn't have TypeScript definitions
import writeGood from 'write-good'

export interface GrammarCheckResult {
  type: 'grammar' | 'clarity'
  original: string
  suggestion: string
  explanation: string
  position: { start: number; end: number }
}

interface WriteGoodSuggestion {
  index: number
  offset: number
  reason: string
}

class GrammarCheckerService {
  private isInitialized = true // write-good doesn't need async initialization

  /**
   * Check grammar for an entire text and return suggestions with positions
   * This is optimized for real-time checking as user types
   * Target: < 100ms response time
   */
  checkText(text: string): GrammarCheckResult[] {
    if (!this.isInitialized) {
      return []
    }

    try {
      // Use write-good to find grammar issues
      console.log('🔍 Grammar checker: analyzing text:', text.substring(0, 50) + '...')
      const suggestions = writeGood(text)
      console.log('🔍 Grammar checker: write-good found', suggestions.length, 'issues:', suggestions)
      
      const results = suggestions
        .map((suggestion: WriteGoodSuggestion, index: number) => ({
          type: this.getIssueType(suggestion.reason),
          original: text.substring(suggestion.index, suggestion.index + suggestion.offset),
          suggestion: this.getSuggestionText(suggestion.reason, text.substring(suggestion.index, suggestion.index + suggestion.offset)),
          explanation: suggestion.reason,
          position: {
            start: suggestion.index,
            end: suggestion.index + suggestion.offset
          }
        }))
        .filter((result: GrammarCheckResult) => result.type === 'grammar') // Only return grammar issues, disable clarity for now
      
      console.log('🔍 Grammar checker: returning', results.length, 'grammar suggestions:', results)
      return results
    } catch (error) {
      console.error('Grammar checker error:', error)
      return []
    }
  }

  /**
   * Determine if this is a grammar or clarity issue
   */
  private getIssueType(reason: string): 'grammar' | 'clarity' {
    // write-good focuses on clarity and style issues
    const grammarKeywords = ['passive', 'tense', 'agreement', 'verb']
    const isGrammar = grammarKeywords.some(keyword => 
      reason.toLowerCase().includes(keyword)
    )
    return isGrammar ? 'grammar' : 'clarity'
  }

  /**
   * Generate a suggestion based on the issue type
   */
  private getSuggestionText(reason: string, original: string): string {
    // For write-good, we provide general suggestions since it doesn't give specific replacements
    if (reason.includes('passive voice')) {
      return `Make this active voice`
    }
    if (reason.includes('wordy')) {
      return `Consider a shorter alternative`
    }
    if (reason.includes('adverb')) {
      return `Consider removing or replacing this adverb`
    }
    if (reason.includes('cliché')) {
      return `Consider a more original expression`
    }
    if (reason.includes('hedge')) {
      return `Be more direct and confident`
    }
    if (reason.includes('weasel')) {
      return `Be more specific`
    }
    
    return `Consider revising this phrase`
  }

  /**
   * Check if the service is ready for use
   */
  isReady(): boolean {
    return this.isInitialized
  }
}

// Export a singleton instance
export const grammarChecker = new GrammarCheckerService()

export default grammarChecker 
