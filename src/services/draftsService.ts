import { supabase } from '../lib/supabase'
import type { Draft } from '../lib/supabase'

export class DraftsService {
  static async createDraft(title: string = 'Untitled document', content: string = ''): Promise<Draft> {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('drafts')
      .insert([{ 
        title, 
        content,
        user_id: user.id  // Add user_id automatically
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating draft:', error)
      throw new Error(`Failed to create draft: ${error.message}`)
    }
    
    return data
  }

  static async updateDraft(id: string, title: string, content: string): Promise<Draft> {
    const { data, error } = await supabase
      .from('drafts')
      .update({ 
        title, 
        content, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating draft:', error)
      throw new Error(`Failed to update draft: ${error.message}`)
    }
    
    return data
  }

  static async deleteDraft(id: string): Promise<void> {
    const { error } = await supabase
      .from('drafts')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting draft:', error)
      throw new Error(`Failed to delete draft: ${error.message}`)
    }
  }

  static async getDrafts(): Promise<Draft[]> {
    console.log('🔍 DraftsService: Starting getDrafts()')
    
    try {
      console.log('🔍 DraftsService: About to execute Supabase query...')
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .order('updated_at', { ascending: false })
      
      console.log('🔍 DraftsService: Supabase query completed')
      console.log('🔍 DraftsService: Data:', data)
      console.log('🔍 DraftsService: Error:', error)
      
      if (error) {
        console.error('❌ DraftsService: Error fetching drafts:', error)
        throw new Error(`Failed to fetch drafts: ${error.message}`)
      }
      
      console.log('✅ DraftsService: Returning data:', data || [])
      return data || []
    } catch (err) {
      console.error('❌ DraftsService: Exception in getDrafts():', err)
      throw err
    }
  }

  static async getDraftById(id: string): Promise<Draft | null> {
    const { data, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      console.error('Error fetching draft:', error)
      throw new Error(`Failed to fetch draft: ${error.message}`)
    }
    
    return data
  }

  static async isDraftEmpty(id: string): Promise<boolean> {
    const draft = await this.getDraftById(id)
    return !draft || (!draft.title.trim() || draft.title === 'Untitled document') && !draft.content.trim()
  }

  // Real-time subscriptions
  static subscribeToDrafts(callback: (payload: any) => void) {
    return supabase
      .channel('drafts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'drafts'
      }, callback)
      .subscribe()
  }
} 
