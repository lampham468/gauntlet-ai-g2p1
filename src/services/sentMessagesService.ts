import { supabase } from '../lib/supabase'
import type { SentMessage } from '../lib/supabase'

export class SentMessagesService {
  static async sendMessage(
    title: string, 
    content: string, 
    recipientEmail?: string,
    ccRecipients?: string,
    bccRecipients?: string
  ): Promise<SentMessage> {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('sent_messages')
      .insert([{ 
        title, 
        content, 
        recipient_email: recipientEmail,
        cc_recipients: ccRecipients,
        bcc_recipients: bccRecipients,
        user_id: user.id  // Add user_id automatically
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Error sending message:', error)
      throw new Error(`Failed to send message: ${error.message}`)
    }
    
    return data
  }

  static async getSentMessages(): Promise<SentMessage[]> {
    const { data, error } = await supabase
      .from('sent_messages')
      .select('*')
      .order('sent_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching sent messages:', error)
      throw new Error(`Failed to fetch sent messages: ${error.message}`)
    }
    
    return data || []
  }

  static async getSentMessageById(id: string): Promise<SentMessage | null> {
    const { data, error } = await supabase
      .from('sent_messages')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      console.error('Error fetching sent message:', error)
      throw new Error(`Failed to fetch sent message: ${error.message}`)
    }
    
    return data
  }

  static async deleteSentMessage(id: string): Promise<void> {
    const { error } = await supabase
      .from('sent_messages')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting sent message:', error)
      throw new Error(`Failed to delete sent message: ${error.message}`)
    }
  }

  // Real-time subscriptions
  static subscribeToSentMessages(callback: (payload: any) => void) {
    return supabase
      .channel('sent-messages-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sent_messages'
      }, callback)
      .subscribe()
  }

  // Convert draft to sent message
  static async sendDraft(
    draftId: string, 
    recipientEmail?: string, 
    ccRecipients?: string, 
    bccRecipients?: string
  ): Promise<{ sentMessage: SentMessage, draftDeleted: boolean }> {
    try {
      // First, get the draft
      const { data: draft, error: draftError } = await supabase
        .from('drafts')
        .select('*')
        .eq('id', draftId)
        .single()
      
      if (draftError || !draft) {
        throw new Error(`Draft not found: ${draftError?.message}`)
      }

      // Send the message
      const sentMessage = await this.sendMessage(draft.title, draft.content, recipientEmail, ccRecipients, bccRecipients)

      // Delete the draft
      const { error: deleteError } = await supabase
        .from('drafts')
        .delete()
        .eq('id', draftId)
      
      return {
        sentMessage,
        draftDeleted: !deleteError
      }
    } catch (error) {
      console.error('Error sending draft:', error)
      throw error
    }
  }
} 
