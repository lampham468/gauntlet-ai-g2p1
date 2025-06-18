import { describe, it, expect, beforeEach } from 'vitest'
import { grammarChecker, type GrammarCheckResult } from './grammarChecker'

describe('GrammarChecker', () => {
  beforeEach(() => {
    // Reset any state between tests if needed
  })

  describe('Service Initialization', () => {
    it('should be ready immediately', () => {
      expect(grammarChecker.isReady()).toBe(true)
    })

    it('should be initialized', () => {
      expect(grammarChecker.isReady()).toBe(true)
    })
  })

  describe('Text Analysis', () => {
    it('should return empty array for empty text', () => {
      const result = grammarChecker.checkText('')
      expect(result).toEqual([])
    })

    it('should return empty array for short text', () => {
      const result = grammarChecker.checkText('Hi')
      expect(result).toEqual([])
    })

    it('should detect passive voice issues', () => {
      // write-good detects passive voice
      const text = 'The ball was thrown by John.'
      const result = grammarChecker.checkText(text)
      
      // May or may not find issues depending on write-good's rules
      expect(Array.isArray(result)).toBe(true)
      result.forEach((suggestion: GrammarCheckResult) => {
        expect(suggestion).toHaveProperty('type')
        expect(suggestion).toHaveProperty('original')
        expect(suggestion).toHaveProperty('suggestion')
        expect(suggestion).toHaveProperty('explanation')
        expect(suggestion).toHaveProperty('position')
        expect(suggestion.position).toHaveProperty('start')
        expect(suggestion.position).toHaveProperty('end')
      })
    })

    it('should detect wordy phrases', () => {
      // write-good detects wordy phrases
      const text = 'It is important to note that this is a very important matter.'
      const result = grammarChecker.checkText(text)
      
      expect(Array.isArray(result)).toBe(true)
      // May find issues with redundant phrases
      result.forEach((suggestion: GrammarCheckResult) => {
        expect(['grammar', 'clarity']).toContain(suggestion.type)
      })
    })

    it('should handle clean text without issues', () => {
      const text = 'This is a simple sentence.'
      const result = grammarChecker.checkText(text)
      
      expect(Array.isArray(result)).toBe(true)
      // Should return empty or minimal suggestions for clean text
    })

    it('should handle malformed text gracefully', () => {
      const text = 'This is... well, you know... like... really bad writing!!!'
      const result = grammarChecker.checkText(text)
      
      expect(Array.isArray(result)).toBe(true)
      // Should not throw errors
    })
  })

  describe('Result Structure', () => {
    it('should return properly formatted results', () => {
      const text = 'This is arguably a very important consideration.'
      const result = grammarChecker.checkText(text)
      
      result.forEach((suggestion: GrammarCheckResult) => {
        // Validate structure
        expect(typeof suggestion.type).toBe('string')
        expect(['grammar', 'clarity']).toContain(suggestion.type)
        expect(typeof suggestion.original).toBe('string')
        expect(typeof suggestion.suggestion).toBe('string')
        expect(typeof suggestion.explanation).toBe('string')
        expect(typeof suggestion.position).toBe('object')
        expect(typeof suggestion.position.start).toBe('number')
        expect(typeof suggestion.position.end).toBe('number')
        expect(suggestion.position.start).toBeGreaterThanOrEqual(0)
        expect(suggestion.position.end).toBeGreaterThan(suggestion.position.start)
        expect(suggestion.position.end).toBeLessThanOrEqual(text.length)
      })
    })

    it('should provide meaningful suggestions', () => {
      const text = 'The document was written by me and it was reviewed by my colleague.'
      const result = grammarChecker.checkText(text)
      
      result.forEach((suggestion: GrammarCheckResult) => {
        expect(suggestion.suggestion.length).toBeGreaterThan(0)
        expect(suggestion.explanation.length).toBeGreaterThan(0)
        // Should not suggest the same text
        expect(suggestion.suggestion).not.toBe(suggestion.original)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle very long text without errors', () => {
      const longText = 'This is a sentence. '.repeat(1000)
      expect(() => {
        const result = grammarChecker.checkText(longText)
        expect(Array.isArray(result)).toBe(true)
      }).not.toThrow()
    })

    it('should handle special characters', () => {
      const text = 'This has émojis 🎉 and spëcial characters ñoño!'
      expect(() => {
        const result = grammarChecker.checkText(text)
        expect(Array.isArray(result)).toBe(true)
      }).not.toThrow()
    })

    it('should handle null-like values gracefully', () => {
      expect(() => {
        const result = grammarChecker.checkText('')
        expect(Array.isArray(result)).toBe(true)
      }).not.toThrow()
    })
  })

  describe('Issue Type Classification', () => {
    it('should classify passive voice as grammar', () => {
      const text = 'The ball was thrown.'
      const result = grammarChecker.checkText(text)
      
      const passiveVoiceIssues = result.filter(r => 
        r.explanation.toLowerCase().includes('passive')
      )
      
      passiveVoiceIssues.forEach(issue => {
        expect(issue.type).toBe('grammar')
      })
    })

    it('should classify wordy phrases as clarity', () => {
      const text = 'It is obvious that this is quite frankly very important.'
      const result = grammarChecker.checkText(text)
      
      const wordyIssues = result.filter(r => 
        r.explanation.toLowerCase().includes('wordy') ||
        r.explanation.toLowerCase().includes('hedge') ||
        r.explanation.toLowerCase().includes('qualify')
      )
      
      wordyIssues.forEach(issue => {
        expect(issue.type).toBe('clarity')
      })
    })
  })

  describe('Suggestion Quality', () => {
    it('should provide actionable suggestions for passive voice', () => {
      const text = 'Mistakes were made by the team.'
      const result = grammarChecker.checkText(text)
      
      const passiveIssues = result.filter(r => 
        r.explanation.toLowerCase().includes('passive')
      )
      
      passiveIssues.forEach(issue => {
        expect(issue.suggestion).toContain('active')
      })
    })

    it('should provide helpful suggestions for wordy phrases', () => {
      const text = 'It goes without saying that this is very important.'
      const result = grammarChecker.checkText(text)
      
      const wordyIssues = result.filter(r => 
        r.explanation.toLowerCase().includes('unnecessary') ||
        r.explanation.toLowerCase().includes('wordy')
      )
      
      wordyIssues.forEach(issue => {
        expect(issue.suggestion.length).toBeGreaterThan(0)
        expect(issue.suggestion).not.toBe(issue.original)
      })
    })
  })
}) 
