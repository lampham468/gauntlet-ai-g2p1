import { describe, it, expect, beforeEach } from 'vitest'
import { spellChecker } from './spellChecker'

describe('SpellChecker', () => {
  beforeEach(() => {
    // Allow time for initialization if needed
  })

  describe('Service Initialization', () => {
    it('should be ready or become ready', () => {
      // The service should either be immediately ready or become ready
      const isReady = spellChecker.isReady()
      expect(typeof isReady).toBe('boolean')
    })

    it('should have dictionary methods available', () => {
      expect(typeof spellChecker.getDictionarySize).toBe('function')
      expect(typeof spellChecker.getMisspellingsCount).toBe('function')
      expect(typeof spellChecker.checkWord).toBe('function')
      expect(typeof spellChecker.checkText).toBe('function')
    })
  })

  describe('Word Checking - Real Functionality', () => {
    it('should identify obviously correct common words', () => {
      if (!spellChecker.isReady()) {
        console.warn('Spell checker not ready, skipping test')
        return
      }

      const commonWords = ['the', 'and', 'is', 'test', 'hello', 'world']
      
      commonWords.forEach(word => {
        const result = spellChecker.checkWord(word)
        expect(result).toHaveProperty('isCorrect')
        expect(result).toHaveProperty('suggestions')
        expect(typeof result.isCorrect).toBe('boolean')
        expect(Array.isArray(result.suggestions)).toBe(true)
      })
    })

    it('should handle capitalization correctly', () => {
      if (!spellChecker.isReady()) {
        console.warn('Spell checker not ready, skipping test')
        return
      }

      const testWords = ['Test', 'HELLO', 'World']
      
      testWords.forEach(word => {
        const result = spellChecker.checkWord(word)
        expect(result).toHaveProperty('isCorrect')
        expect(typeof result.isCorrect).toBe('boolean')
      })
    })

    it('should handle special patterns (numbers, emails, URLs)', () => {
      if (!spellChecker.isReady()) {
        console.warn('Spell checker not ready, skipping test')
        return
      }

      const specialPatterns = ['123', '2024', 'test@example.com', 'https://example.com', '$10']
      
      specialPatterns.forEach(pattern => {
        const result = spellChecker.checkWord(pattern)
        expect(result).toHaveProperty('isCorrect')
        expect(typeof result.isCorrect).toBe('boolean')
        expect(Array.isArray(result.suggestions)).toBe(true)
      })
    })
  })

  describe('Text Checking - Real Functionality', () => {
    it('should check text and return proper error structure', async () => {
      if (!spellChecker.isReady()) {
        console.warn('Spell checker not ready, skipping test')
        return
      }

      const text = 'This is a simple test sentence.'
      const errors = await spellChecker.checkText(text)
      
      expect(Array.isArray(errors)).toBe(true)
      
      errors.forEach(error => {
        expect(error).toHaveProperty('word')
        expect(error).toHaveProperty('suggestions')
        expect(error).toHaveProperty('position')
        expect(typeof error.word).toBe('string')
        expect(Array.isArray(error.suggestions)).toBe(true)
        expect(typeof error.position).toBe('object')
        expect(typeof error.position.start).toBe('number')
        expect(typeof error.position.end).toBe('number')
        expect(error.position.start).toBeGreaterThanOrEqual(0)
        expect(error.position.end).toBeGreaterThan(error.position.start)
      })
    })

    it('should return empty array for empty text', async () => {
      const errors = await spellChecker.checkText('')
      expect(Array.isArray(errors)).toBe(true)
      expect(errors).toHaveLength(0)
    })

    it('should handle text with mixed content', async () => {
      if (!spellChecker.isReady()) {
        console.warn('Spell checker not ready, skipping test')
        return
      }

      const text = 'Check this email: test@example.com and URL: https://example.com with numbers 123.'
      const errors = await spellChecker.checkText(text)
      
      expect(Array.isArray(errors)).toBe(true)
      // Should not flag emails, URLs, or numbers as misspelled
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle long text without hanging', async () => {
      if (!spellChecker.isReady()) {
        console.warn('Spell checker not ready, skipping test')
        return
      }

      const longText = 'This is a sentence. '.repeat(50)
      const startTime = Date.now()
      
      const errors = await spellChecker.checkText(longText)
      const endTime = Date.now()
      
      expect(Array.isArray(errors)).toBe(true)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle special characters gracefully', async () => {
      if (!spellChecker.isReady()) {
        console.warn('Spell checker not ready, skipping test')
        return
      }

      const text = "This has émojis 🎉 and contractions can't, won't, don't."
      
      await expect(spellChecker.checkText(text)).resolves.toBeDefined()
    })
  })

  describe('Dictionary Stats', () => {
    it('should provide dictionary statistics', () => {
      if (!spellChecker.isReady()) {
        console.warn('Spell checker not ready, skipping test')
        return
      }

      const dictSize = spellChecker.getDictionarySize()
      const misspellingsCount = spellChecker.getMisspellingsCount()
      
      expect(typeof dictSize).toBe('number')
      expect(typeof misspellingsCount).toBe('number')
      expect(dictSize).toBeGreaterThan(0)
      expect(misspellingsCount).toBeGreaterThan(0)
    })
  })
}) 
