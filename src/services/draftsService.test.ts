import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DraftsService } from './draftsService'

// Mock the entire supabase module
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        }),
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-draft', title: 'Untitled document', content: '' },
            error: null
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'updated-draft', title: 'Updated', content: 'Updated content' },
              error: null
            })
          })
        })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    })
  }
}))

describe('DraftsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Service Methods', () => {
    it('should have static getDrafts method', () => {
      expect(typeof DraftsService.getDrafts).toBe('function')
    })

    it('should have static createDraft method', () => {
      expect(typeof DraftsService.createDraft).toBe('function')
    })

    it('should have static updateDraft method', () => {
      expect(typeof DraftsService.updateDraft).toBe('function')
    })

    it('should have static deleteDraft method', () => {
      expect(typeof DraftsService.deleteDraft).toBe('function')
    })

    it('should have static getDraftById method', () => {
      expect(typeof DraftsService.getDraftById).toBe('function')
    })

    it('should have static isDraftEmpty method', () => {
      expect(typeof DraftsService.isDraftEmpty).toBe('function')
    })
  })

  describe('Basic functionality', () => {
    it('should be able to call getDrafts without throwing', async () => {
      await expect(DraftsService.getDrafts()).resolves.toBeDefined()
    })

    it('should be able to call createDraft without throwing', async () => {
      await expect(DraftsService.createDraft()).resolves.toBeDefined()
    })

    it('should be able to call updateDraft without throwing', async () => {
      await expect(DraftsService.updateDraft('test-id', 'title', 'content')).resolves.toBeDefined()
    })

    it('should be able to call deleteDraft without throwing', async () => {
      await expect(DraftsService.deleteDraft('test-id')).resolves.not.toThrow()
    })

    it('should be able to call getDraftById without throwing', async () => {
      await expect(DraftsService.getDraftById('test-id')).resolves.toBeDefined()
    })

    it('should be able to call isDraftEmpty without throwing', async () => {
      // Mock getDraftById to return a test draft
      vi.spyOn(DraftsService, 'getDraftById').mockResolvedValue({
        id: 'test-id',
        title: 'Test',
        content: 'Test content',
        user_id: 'test-user',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      })

      await expect(DraftsService.isDraftEmpty('test-id')).resolves.toBeDefined()
    })
  })
}) 
