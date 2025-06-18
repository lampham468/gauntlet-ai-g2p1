import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { clarityChecker, type ClarityCheckResult, type ClarityCheckError } from './clarityChecker'

// Mock fetch for API calls
global.fetch = vi.fn()

describe('ClarityChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Service Initialization', () => {
    it('should be ready immediately', () => {
      expect(clarityChecker.isReady()).toBe(true)
    })

    it('should be initialized', () => {
      expect(clarityChecker.isReady()).toBe(true)
    })
  })

  describe('Text Analysis - Success Cases', () => {
    beforeEach(() => {
      // Mock successful API response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          suggestions: [
            {
              type: "clarity",
              original: "very important",
              suggestion: "important",
              explanation: "Remove redundant qualifier"
            }
          ]
        })
      } as Response)
    })

    it('should return analysis results for valid text', async () => {
      const text = 'This is very important information.'
      const result = await clarityChecker.checkText(text)
      
      expect(Array.isArray(result)).toBe(true)
      
      if (Array.isArray(result) && result.length > 0) {
        const suggestion = result[0] as ClarityCheckResult
        expect(suggestion).toHaveProperty('original')
        expect(suggestion).toHaveProperty('suggestion')
        expect(suggestion).toHaveProperty('explanation')
        expect(suggestion).toHaveProperty('position')
        expect(suggestion).toHaveProperty('confidence')
        expect(suggestion.position).toHaveProperty('start')
        expect(suggestion.position).toHaveProperty('end')
      }
    })

    it('should handle short text by returning empty array', async () => {
      const text = 'Hi'
      const result = await clarityChecker.checkText(text)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })

    it('should handle empty text', async () => {
      const text = ''
      const result = await clarityChecker.checkText(text)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })

    it('should validate result structure', async () => {
      const text = 'This is a really very important and significant matter.'
      const result = await clarityChecker.checkText(text)
      
      if (Array.isArray(result) && result.length > 0) {
        result.forEach((suggestion: ClarityCheckResult) => {
          expect(typeof suggestion.original).toBe('string')
          expect(typeof suggestion.suggestion).toBe('string')
          expect(typeof suggestion.explanation).toBe('string')
          expect(typeof suggestion.position).toBe('object')
          expect(typeof suggestion.confidence).toBe('number')
          expect(suggestion.position.start).toBeGreaterThanOrEqual(0)
          expect(suggestion.position.end).toBeGreaterThan(suggestion.position.start)
          expect(suggestion.confidence).toBeGreaterThanOrEqual(0)
          expect(suggestion.confidence).toBeLessThanOrEqual(1)
        })
      }
    })
  })

  describe('API Error Handling', () => {
    it('should handle API network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
      
      const text = 'This is a test sentence with clarity issues.'
      const result = await clarityChecker.checkText(text)
      
      expect('message' in result).toBe(true)
      expect(result).toHaveProperty('message')
      expect(typeof (result as ClarityCheckError).message).toBe('string')
    })

    it('should handle API response errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)
      
      const text = 'This is a test sentence.'
      const result = await clarityChecker.checkText(text)
      
      expect('message' in result).toBe(true)
      expect(result).toHaveProperty('message')
      expect((result as ClarityCheckError).message).toContain('Internal Server Error')
    })

    it('should handle malformed API response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      } as Response)
      
      const text = 'This is a test sentence.'
      const result = await clarityChecker.checkText(text)
      
      // Service should handle missing suggestions gracefully and return empty array
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })

    it('should handle invalid JSON in API response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as Response)
      
      const text = 'This is a test sentence.'
      const result = await clarityChecker.checkText(text)
      
      expect('message' in result).toBe(true)
      expect(result).toHaveProperty('message')
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      // Mock successful API response for these tests
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          suggestions: []
        })
      } as Response)
    })

    it('should handle very long text', async () => {
      const longText = 'This is a sentence. '.repeat(1000)
      
      const startTime = Date.now()
      const result = await clarityChecker.checkText(longText)
      const endTime = Date.now()
      
      expect(Array.isArray(result) || 'message' in result).toBe(true)
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000)
    })

    it('should handle text with special characters', async () => {
      const text = 'This has émojis 🎉 and spëcial characters ñoño!'
      
      await expect(clarityChecker.checkText(text)).resolves.toBeDefined()
    })

    it('should handle text with mixed languages', async () => {
      const text = 'This is English. Esto es español. C\'est français.'
      
      await expect(clarityChecker.checkText(text)).resolves.toBeDefined()
    })

    it('should handle text with code snippets', async () => {
      const text = 'The function console.log("hello") is very commonly used.'
      
      await expect(clarityChecker.checkText(text)).resolves.toBeDefined()
    })
  })

  describe('API Request Construction', () => {
    beforeEach(() => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          suggestions: []
        })
      } as Response)
    })

    it('should make API request with correct parameters', async () => {
      const text = 'This is a test sentence for clarity checking.'
      
      await clarityChecker.checkText(text)
      
      expect(fetch).toHaveBeenCalledOnce()
      
      const [url, options] = vi.mocked(fetch).mock.calls[0]
      expect(url).toContain('supabase.co')
      expect(options?.method).toBe('POST')
      expect(options?.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Authorization': expect.stringContaining('Bearer')
      })
      
      const body = JSON.parse(options?.body as string)
      expect(body).toHaveProperty('text')
      expect(body.text).toContain(text)
    })

    it('should include proper system prompt', async () => {
      const text = 'Test sentence.'
      
      await clarityChecker.checkText(text)
      
      const [, options] = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(options?.body as string)
      
      expect(body.text).toContain('clarity')
      expect(body.text).toContain('Test sentence')
    })
  })

  describe('Result Processing', () => {
    it('should parse valid API response correctly', async () => {
      const mockSuggestions = [
        {
          type: "clarity",
          original: "very important",
          suggestion: "important", 
          explanation: "Remove redundant qualifier"
        },
        {
          type: "clarity",
          original: "in order to",
          suggestion: "to",
          explanation: "Simplify phrase"
        }
      ]

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          suggestions: mockSuggestions
        })
      } as Response)
      
      const text = 'This very important thing in order to succeed.'
      const result = await clarityChecker.checkText(text)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      
      const suggestions = result as ClarityCheckResult[]
      expect(suggestions[0].original).toBe('very important')
      expect(suggestions[0].suggestion).toBe('important')
      expect(suggestions[1].original).toBe('in order to')
      expect(suggestions[1].suggestion).toBe('to')
    })

    it('should handle empty suggestions array', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          suggestions: []
        })
      } as Response)
      
      const text = 'This is clear and concise.'
      const result = await clarityChecker.checkText(text)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })

    it('should handle malformed suggestion objects', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          suggestions: [
            { incomplete: 'suggestion' },
            {
              type: "clarity",
              original: "valid suggestion",
              suggestion: "suggestion",
              explanation: "This is valid"
            }
          ]
        })
      } as Response)
      
      const text = 'Valid suggestion with some issues.'
      const result = await clarityChecker.checkText(text)
      
      // Should filter out invalid suggestions
      if (Array.isArray(result)) {
        expect(result.length).toBeLessThanOrEqual(1)
        result.forEach(suggestion => {
          expect(suggestion).toHaveProperty('original')
          expect(suggestion).toHaveProperty('suggestion')
          expect(suggestion).toHaveProperty('explanation')
          expect(suggestion).toHaveProperty('position')
          expect(suggestion).toHaveProperty('confidence')
        })
      }
    })
  })

  describe('Rate Limiting and Performance', () => {
    it('should handle rate limiting gracefully', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      } as Response)
      
      const text = 'This is a test sentence.'
      const result = await clarityChecker.checkText(text)
      
      expect('message' in result).toBe(true)
      expect((result as ClarityCheckError).message).toContain('Too Many Requests')
    })

    it('should complete within reasonable time', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ suggestions: [] })
          } as Response), 100)
        )
      )
      
      const text = 'This is a reasonably long sentence that needs clarity checking.'
      const startTime = Date.now()
      
      await clarityChecker.checkText(text)
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(5000) // Should complete in < 5s
    })
  })
}) 
