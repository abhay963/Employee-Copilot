import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { runLangGraphWorkflow } from '../ai/langGraphWorkflow.js';

class ConversationService {
  // Create a new conversation
  async createConversation(userId, title = null) {
    try {
      const conversation = await Conversation.create({
        user_id: userId,
        title: title || 'New Conversation'
      });
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  // Get conversation by ID with messages
  async getConversationWithMessages(conversationId, userId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check ownership
      if (conversation.user_id !== userId) {
        throw new Error('Access denied');
      }

      const messages = await Message.findByConversationId(conversationId);
      
      return {
        ...conversation,
        messages
      };
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  // Get all conversations for a user
  async getUserConversations(userId) {
    try {
      const conversations = await Conversation.findByUserId(userId);
      return conversations;
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw new Error('Failed to get conversations');
    }
  }

  // Send a message and get AI response
  async sendMessage(conversationId, userId, userRole, question) {
    try {
      // Verify conversation ownership
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new Error('Conversation not found or access denied');
      }

      // Save user message
      const userMessage = await Message.create({
        conversation_id: conversationId,
        role: 'user',
        content: question,
        sources: []
      });

      // Check if this is the first message to set title
      const existingMessages = await Message.findByConversationId(conversationId);
      if (existingMessages.length === 1) {
        const title = question.substring(0, 50) + (question.length > 50 ? '...' : '');
        await Conversation.update(conversationId, { title });
      }

      // Run LangGraph workflow to get answer
      const { response, sources, error, requiresConfirmation, pendingAction } = await runLangGraphWorkflow(question, userId, userRole);

      // Save assistant message
      const assistantMessage = await Message.create({
        conversation_id: conversationId,
        role: 'assistant',
        content: response,
        sources: sources
      });

      // Update conversation timestamp
      await Conversation.updateTimestamp(conversationId);

      return {
        userMessage,
        assistantMessage,
        conversation: await Conversation.findById(conversationId),
        requiresConfirmation,
        pendingAction
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Execute pending action after user approval
  async executePendingAction(conversationId, userId, userRole, actionId, actionData) {
    try {
      // Verify conversation ownership
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new Error('Conversation not found or access denied');
      }

      // Get the last user message to understand the context
      const messages = await Message.findByConversationId(conversationId);
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      
      const originalMessage = lastUserMessage?.content || actionData?.originalMessage || '';

      // Temporarily set the pending action in state for execution
      const tempState = {
        pendingAction: {
          ...actionData,
          actionId: actionId
        }
      };

      // Import the necessary functions to execute the action
      const { createCalendarEvent, submitLeaveRequest } = await import('../ai/langGraphWorkflow.js');
      
      let result;
      if (actionId.startsWith('calendar_create_')) {
        result = await createCalendarEvent({
          userId,
          pendingAction: actionData,
          context: {}
        });
      } else if (actionId.startsWith('leave_request_')) {
        result = await submitLeaveRequest({
          userId,
          pendingAction: actionData,
          context: {}
        });
      } else {
        throw new Error('Unknown action type');
      }

      // Save assistant message with the execution result
      const assistantMessage = await Message.create({
        conversation_id: conversationId,
        role: 'assistant',
        content: result.toolResult,
        sources: []
      });

      // Update conversation timestamp
      await Conversation.updateTimestamp(conversationId);

      return {
        assistantMessage,
        conversation: await Conversation.findById(conversationId),
        requiresConfirmation: false,
        pendingAction: null
      };
    } catch (error) {
      console.error('Error executing pending action:', error);
      throw error;
    }
  }

  // Delete a conversation
  async deleteConversation(conversationId, userId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check ownership
      if (conversation.user_id !== userId) {
        throw new Error('Access denied');
      }

      // Delete messages first (cascade should handle this, but being explicit)
      await Message.deleteByConversationId(conversationId);
      
      // Delete conversation
      await Conversation.delete(conversationId);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // Update conversation title
  async updateConversationTitle(conversationId, userId, title) {
    try {
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check ownership
      if (conversation.user_id !== userId) {
        throw new Error('Access denied');
      }

      const updated = await Conversation.update(conversationId, { title });
      return updated;
    } catch (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    }
  }
}

export default new ConversationService();
