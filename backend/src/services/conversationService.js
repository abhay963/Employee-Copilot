import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import {
  runEmployeeCopilot,
  resumeEmployeeCopilot,
} from '../ai/graph/employeeGraph.js';

import conversationStateService from './conversationStateService.js';
import conversationMemoryService from './conversationMemoryService.js';
import leaveWorkflowService from './leaveWorkflowService.js';

class ConversationService {
  // ============================================================
  // CREATE CONVERSATION
  // ============================================================

  async createConversation(userId, title = null) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const conversation = await Conversation.create({
        user_id: userId,
        title: title || 'New Conversation',
      });

      return conversation;
    } catch (error) {
      console.error(
        '[ConversationService] Error creating conversation:',
        error
      );

      throw new Error('Failed to create conversation');
    }
  }

  // ============================================================
  // GET CONVERSATION WITH MESSAGES
  // ============================================================

  async getConversationWithMessages(conversationId, userId) {
    try {
      const conversation =
        await Conversation.findById(conversationId);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (
        String(conversation.user_id) !==
        String(userId)
      ) {
        throw new Error('Access denied');
      }

      const messages =
        await Message.findByConversationId(
          conversationId
        );

      return {
        ...conversation,
        messages,
      };
    } catch (error) {
      console.error(
        '[ConversationService] Error getting conversation:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // GET USER CONVERSATIONS
  // ============================================================

  async getUserConversations(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return await Conversation.findByUserId(userId);
    } catch (error) {
      console.error(
        '[ConversationService] Error getting conversations:',
        error
      );

      throw new Error('Failed to get conversations');
    }
  }

  // ============================================================
  // VALIDATE CONVERSATION OWNERSHIP
  // ============================================================

  async validateConversation(conversationId, userId) {
    const conversation =
      await Conversation.findById(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (
      String(conversation.user_id) !==
      String(userId)
    ) {
      throw new Error('Conversation access denied');
    }

    return conversation;
  }

  // ============================================================
  // PUBLIC VALIDATE METHOD
  // ============================================================

  async validateConversationForController(
    conversationId,
    userId
  ) {
    return await this.validateConversation(
      conversationId,
      userId
    );
  }

  // ============================================================
  // CREATE CONVERSATION TITLE
  // ============================================================

  async updateTitleIfFirstMessage(
    conversationId,
    question
  ) {
    const messages =
      await Message.findByConversationId(
        conversationId
      );

    if (messages.length !== 1) {
      return;
    }

    const cleanQuestion =
      String(question || '').trim();

    if (!cleanQuestion) {
      return;
    }

    const title =
      cleanQuestion.length > 50
        ? `${cleanQuestion.substring(0, 50)}...`
        : cleanQuestion;

    await Conversation.update(
      conversationId,
      { title }
    );
  }

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  async sendMessage(
    conversationId,
    userId,
    userRole,
    question
  ) {
    try {
      // --------------------------------------------------------
      // Validate input
      // --------------------------------------------------------

      if (
        !question ||
        !String(question).trim()
      ) {
        throw new Error('Question is required');
      }

      const cleanQuestion =
        String(question).trim();

      // --------------------------------------------------------
      // Verify conversation ownership
      // --------------------------------------------------------

      await this.validateConversation(
        conversationId,
        userId
      );

      // --------------------------------------------------------
      // Initialize conversation state
      // --------------------------------------------------------

      const conversationState =
        await conversationStateService.getOrCreateState(
          conversationId,
          userId
        );

      // --------------------------------------------------------
      // Get conversation context
      // --------------------------------------------------------

      const conversationContext =
        await conversationMemoryService.getConversationContext(
          conversationId,
          userId
        );

      // --------------------------------------------------------
      // Resolve contextual references
      // --------------------------------------------------------

      const {
        resolvedMessage,
        resolvedContext,
      } =
        conversationMemoryService.resolveContextualReferences(
          cleanQuestion,
          conversationContext.context
        );

      // --------------------------------------------------------
      // Save user message
      // --------------------------------------------------------

      const userMessage =
        await Message.createWithDuplicateCheck({
          conversation_id: conversationId,
          role: 'user',
          content: cleanQuestion,
          sources: [],
        });

      // --------------------------------------------------------
      // Update title
      // --------------------------------------------------------

      await this.updateTitleIfFirstMessage(
        conversationId,
        cleanQuestion
      );

      // --------------------------------------------------------
      // RUN LANGGRAPH
      // --------------------------------------------------------
      //
      // IMPORTANT:
      //
      // runEmployeeCopilot() expects an object.
      //
      // --------------------------------------------------------

      const result =
        await runEmployeeCopilot({
          userMessage:
            resolvedMessage || cleanQuestion,

          userId,

          userRole,

          conversationId,

          compactContext:
            conversationContext.context,

          // ------------------------------------------------------
          // IMPORTANT: Pass existing pendingAction from database
          // ------------------------------------------------------
          pendingAction: conversationState?.pending_action || null,
        });

      const {
        response = '',
        sources = [],
        error = null,
        requiresConfirmation = false,
        pendingAction = null,
        actionMetadata = null,
        intent = null,
      } = result || {};

      // --------------------------------------------------------
      // IMPORTANT: Persist pendingAction to database
      // --------------------------------------------------------
      //
      // This ensures that follow-up messages can continue
      // the workflow instead of losing context.
      //
      // --------------------------------------------------------

      if (pendingAction) {
        await conversationStateService.setPendingAction(
          conversationId,
          pendingAction,
          pendingAction.actionId
        );

        console.log(
          '[ConversationService] Persisted pending action:',
          pendingAction.actionId
        );
      } else if (intent && !requiresConfirmation) {
        // ------------------------------------------------------
        // Clear pending action if workflow completed
        // ------------------------------------------------------

        await conversationStateService.clearPendingAction(
          conversationId
        );

        console.log(
          '[ConversationService] Cleared pending action after completion'
        );
      }

      // --------------------------------------------------------
      // Save assistant response
      // --------------------------------------------------------

      const assistantMessage =
        await Message.createWithDuplicateCheck({
          conversation_id: conversationId,

          role: 'assistant',

          content:
            response ||
            'I was unable to generate a response.',

          sources:
            Array.isArray(sources)
              ? sources
              : [],
        });

      // --------------------------------------------------------
      // Update conversation memory
      // --------------------------------------------------------

      await conversationMemoryService.updateConversationState(
        conversationId,
        cleanQuestion,
        response,
        intent
      );

      // --------------------------------------------------------
      // Generate summary if required
      // --------------------------------------------------------

      if (conversationContext.needsSummary) {
        const allMessages =
          await Message.findByConversationId(
            conversationId
          );

        await conversationMemoryService.generateConversationSummary(
          conversationId,
          allMessages
        );
      }

      // --------------------------------------------------------
      // Update message count
      // --------------------------------------------------------

      const messageCount =
        conversationContext.messages.length + 2;

      await Conversation.update(
        conversationId,
        {
          message_count: messageCount,
        }
      );

      // --------------------------------------------------------
      // Return result
      // --------------------------------------------------------

      return {
        userMessage,

        assistantMessage,

        conversation:
          await Conversation.findById(
            conversationId
          ),

        requiresConfirmation,

        pendingAction,

        actionMetadata,

        error,
      };
    } catch (error) {
      console.error(
        '[ConversationService] Error sending message:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // STREAMING MESSAGE
  // ============================================================

  async sendMessageStream(
    conversationId,
    userId,
    userRole,
    question,
    res
  ) {
    try {
      // --------------------------------------------------------
      // Validate input
      // --------------------------------------------------------

      if (
        !question ||
        !String(question).trim()
      ) {
        throw new Error('Question is required');
      }

      const cleanQuestion =
        String(question).trim();

      // --------------------------------------------------------
      // Validate conversation
      // --------------------------------------------------------

      await this.validateConversation(
        conversationId,
        userId
      );

      // --------------------------------------------------------
      // Initialize state
      // --------------------------------------------------------

      const conversationState =
        await conversationStateService.getOrCreateState(
          conversationId,
          userId
        );

      // --------------------------------------------------------
      // Get conversation context
      // --------------------------------------------------------

      const conversationContext =
        await conversationMemoryService.getConversationContext(
          conversationId,
          userId
        );

      // --------------------------------------------------------
      // Resolve contextual references
      // --------------------------------------------------------

      const {
        resolvedMessage,
      } =
        conversationMemoryService.resolveContextualReferences(
          cleanQuestion,
          conversationContext.context
        );

      // --------------------------------------------------------
      // Save user message
      // --------------------------------------------------------

      const userMessage =
        await Message.createWithDuplicateCheck({
          conversation_id: conversationId,
          role: 'user',
          content: cleanQuestion,
          sources: [],
        });

      // --------------------------------------------------------
      // Send user message
      // --------------------------------------------------------

      this.writeSSE(res, {
        type: 'user_message',
        message: userMessage,
      });

      // --------------------------------------------------------
      // Update title
      // --------------------------------------------------------

      await this.updateTitleIfFirstMessage(
        conversationId,
        cleanQuestion
      );

      // --------------------------------------------------------
      // Processing status
      // --------------------------------------------------------

      this.writeSSE(res, {
        type: 'status',
        status: 'processing',
        message: 'Processing your request...',
      });

      // --------------------------------------------------------
      // RUN LANGGRAPH
      // --------------------------------------------------------

      const result =
        await runEmployeeCopilot({
          userMessage:
            resolvedMessage || cleanQuestion,

          userId,

          userRole,

          conversationId,

          compactContext:
            conversationContext.context,

          // ------------------------------------------------------
          // IMPORTANT: Pass existing pendingAction from database
          // ------------------------------------------------------
          pendingAction: conversationState?.pending_action || null,
        });

      const {
        response = '',
        sources = [],
        error = null,
        requiresConfirmation = false,
        pendingAction = null,
        actionMetadata = null,
        intent = null,
      } = result || {};

      // --------------------------------------------------------
      // IMPORTANT: Persist pendingAction to database
      // --------------------------------------------------------

      if (pendingAction) {
        await conversationStateService.setPendingAction(
          conversationId,
          pendingAction,
          pendingAction.actionId
        );

        console.log(
          '[ConversationService] Persisted pending action (stream):',
          pendingAction.actionId
        );
      } else if (intent && !requiresConfirmation) {
        await conversationStateService.clearPendingAction(
          conversationId
        );

        console.log(
          '[ConversationService] Cleared pending action after completion (stream)'
        );
      }

      // --------------------------------------------------------
      // Save assistant message
      // --------------------------------------------------------

      const assistantMessage =
        await Message.createWithDuplicateCheck({
          conversation_id: conversationId,

          role: 'assistant',

          content:
            response ||
            'I was unable to generate a response.',

          sources:
            Array.isArray(sources)
              ? sources
              : [],
        });

      // --------------------------------------------------------
      // Update conversation memory
      // --------------------------------------------------------

      await conversationMemoryService.updateConversationState(
        conversationId,
        cleanQuestion,
        response,
        intent
      );

      // --------------------------------------------------------
      // Generate summary
      // --------------------------------------------------------

      if (conversationContext.needsSummary) {
        const allMessages =
          await Message.findByConversationId(
            conversationId
          );

        await conversationMemoryService.generateConversationSummary(
          conversationId,
          allMessages
        );
      }

      // --------------------------------------------------------
      // Update message count
      // --------------------------------------------------------

      const messageCount =
        conversationContext.messages.length + 2;

      await Conversation.update(
        conversationId,
        {
          message_count: messageCount,
        }
      );

      // --------------------------------------------------------
      // Send complete assistant response
      // --------------------------------------------------------

      this.writeSSE(res, {
        type: 'assistant_complete',

        message: assistantMessage,

        sources:
          Array.isArray(sources)
            ? sources
            : [],

        requiresConfirmation,

        pendingAction,

        actionMetadata,

        error,

        conversation:
          await Conversation.findById(
            conversationId
          ),
      });

      // --------------------------------------------------------
      // Update timestamp
      // --------------------------------------------------------

      await Conversation.updateTimestamp(
        conversationId
      );

      // --------------------------------------------------------
      // Done
      // --------------------------------------------------------

      this.writeSSE(res, {
        type: 'done',
      });

      res.end();
    } catch (error) {
      console.error(
        '[ConversationService] Error sending stream:',
        error
      );

      try {
        this.writeSSE(res, {
          type: 'error',
          error: error.message,
        });

        res.end();
      } catch (writeError) {
        console.error(
          '[ConversationService] Failed to send stream error:',
          writeError
        );
      }
    }
  }

  // ============================================================
  // SSE HELPER
  // ============================================================

  writeSSE(res, payload) {
    if (!res || res.writableEnded) {
      return;
    }

    res.write(
      `data: ${JSON.stringify(payload)}\n\n`
    );
  }

  // ============================================================
  // EXECUTE PENDING ACTION
  // ============================================================

  async executePendingAction(
    conversationId,
    userId,
    userRole,
    actionId,
    actionData = {}
  ) {
    try {
      // --------------------------------------------------------
      // Validate action ID
      // --------------------------------------------------------

      if (
        !actionId ||
        typeof actionId !== 'string'
      ) {
        throw new Error(
          'A valid action ID is required'
        );
      }

      // --------------------------------------------------------
      // Verify conversation
      // --------------------------------------------------------

      await this.validateConversation(
        conversationId,
        userId
      );

      // --------------------------------------------------------
      // Leave request
      // --------------------------------------------------------

      if (
        actionId.startsWith(
          'leave_request_'
        )
      ) {
        const result =
          await leaveWorkflowService.confirmAndSubmitLeaveRequest(
            conversationId,
            userId,
            actionId
          );

        if (!result.success) {
          throw new Error(
            result.message ||
            'Leave request submission failed'
          );
        }

        return {
          success: true,

          assistantMessage:
            await Message.createWithDuplicateCheck({
              conversation_id:
                conversationId,

              role: 'assistant',

              content:
                result.message,

              sources: [],
            }),

          conversation:
            await Conversation.findById(
              conversationId
            ),

          requiresConfirmation: false,

          pendingAction: null,

          actionMetadata: null,
        };
      }

      // --------------------------------------------------------
      // Resume LangGraph
      // --------------------------------------------------------
      //
      // Human-in-the-loop:
      //
      // The graph already has resumeEmployeeCopilot().
      //
      // Instead of importing action handlers manually,
      // resume the paused graph using the same conversationId
      // as thread_id.
      //
      // --------------------------------------------------------

      let approved = true;

      if (
        actionData &&
        typeof actionData.approved === 'boolean'
      ) {
        approved = actionData.approved;
      }

      const result =
        await resumeEmployeeCopilot({
          conversationId,
          approved,
        });

      const toolResult =
        result?.response ||
        'Action completed successfully.';

      // --------------------------------------------------------
      // Save execution result
      // --------------------------------------------------------

      const assistantMessage =
        await Message.createWithDuplicateCheck({
          conversation_id:
            conversationId,

          role: 'assistant',

          content: toolResult,

          sources:
            Array.isArray(result?.sources)
              ? result.sources
              : [],
        });

      // --------------------------------------------------------
      // Update timestamp
      // --------------------------------------------------------

      await Conversation.updateTimestamp(
        conversationId
      );

      return {
        success: true,

        assistantMessage,

        conversation:
          await Conversation.findById(
            conversationId
          ),

        requiresConfirmation:
          result?.requiresConfirmation ||
          false,

        pendingAction:
          result?.pendingAction ||
          null,

        actionMetadata: null,

        error:
          result?.error ||
          null,
      };
    } catch (error) {
      console.error(
        '[ConversationService] Error executing pending action:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // DELETE CONVERSATION
  // ============================================================

  async deleteConversation(
    conversationId,
    userId
  ) {
    try {
      await this.validateConversation(
        conversationId,
        userId
      );

      await Message.deleteByConversationId(
        conversationId
      );

      await Conversation.delete(
        conversationId
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        '[ConversationService] Error deleting conversation:',
        error
      );

      throw error;
    }
  }

  // ============================================================
  // UPDATE CONVERSATION TITLE
  // ============================================================

  async updateConversationTitle(
    conversationId,
    userId,
    title
  ) {
    try {
      await this.validateConversation(
        conversationId,
        userId
      );

      const cleanTitle =
        String(title || '').trim();

      if (!cleanTitle) {
        throw new Error(
          'Conversation title is required'
        );
      }

      if (cleanTitle.length > 100) {
        throw new Error(
          'Conversation title cannot exceed 100 characters'
        );
      }

      return await Conversation.update(
        conversationId,
        {
          title: cleanTitle,
        }
      );
    } catch (error) {
      console.error(
        '[ConversationService] Error updating title:',
        error
      );

      throw error;
    }
  }
}

export default new ConversationService();