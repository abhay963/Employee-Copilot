import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { runLangGraphWorkflow } from '../ai/langGraphWorkflow.js';
import conversationStateService from './conversationStateService.js';
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

      throw new Error(
        'Failed to create conversation'
      );
    }
  }

  // ============================================================
  // GET CONVERSATION WITH MESSAGES
  // ============================================================

  async getConversationWithMessages(
    conversationId,
    userId
  ) {
    try {
      const conversation =
        await Conversation.findById(
          conversationId
        );

      if (!conversation) {
        throw new Error(
          'Conversation not found'
        );
      }

      if (
        String(conversation.user_id) !==
        String(userId)
      ) {
        throw new Error(
          'Access denied'
        );
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
        throw new Error(
          'User ID is required'
        );
      }

      return await Conversation.findByUserId(
        userId
      );
    } catch (error) {
      console.error(
        '[ConversationService] Error getting conversations:',
        error
      );

      throw new Error(
        'Failed to get conversations'
      );
    }
  }

  // ============================================================
  // VALIDATE CONVERSATION OWNERSHIP
  // ============================================================

  async validateConversation(
    conversationId,
    userId
  ) {
    const conversation =
      await Conversation.findById(
        conversationId
      );

    if (!conversation) {
      throw new Error(
        'Conversation not found'
      );
    }

    if (
      String(conversation.user_id) !==
      String(userId)
    ) {
      throw new Error(
        'Conversation access denied'
      );
    }

    return conversation;
  }

  // ============================================================
  // PUBLIC VALIDATE METHOD (for controller use)
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

      if (!question || !String(question).trim()) {
        throw new Error(
          'Question is required'
        );
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

      await conversationStateService.getOrCreateState(conversationId, userId);

      // --------------------------------------------------------
      // Save user message
      // --------------------------------------------------------

      const userMessage =
        await Message.create({
          conversation_id:
            conversationId,

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
      // Run AI workflow with conversationId for state management
      // --------------------------------------------------------

      const result =
        await runLangGraphWorkflow(
          cleanQuestion,
          userId,
          userRole,
          conversationId
        );

      const {
        response = '',
        sources = [],
        error = null,
        requiresConfirmation = false,
        pendingAction = null,
        actionMetadata = null,
      } = result || {};

      // --------------------------------------------------------
      // Save assistant response
      // --------------------------------------------------------

      const assistantMessage =
        await Message.create({
          conversation_id:
            conversationId,

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
      // Update timestamp
      // --------------------------------------------------------

      await Conversation.updateTimestamp(
        conversationId
      );

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
  //
  // IMPORTANT:
  //
  // This method keeps the existing API contract.
  //
  // It DOES NOT fake character streaming anymore.
  //
  // Real token streaming must happen inside the LangGraph
  // workflow and be forwarded here.
  //
  // The workflow integration is the next major file we will
  // replace.
  //
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
        throw new Error(
          'Question is required'
        );
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
      // Initialize conversation state
      // --------------------------------------------------------

      await conversationStateService.getOrCreateState(conversationId, userId);

      // --------------------------------------------------------
      // Save user message
      // --------------------------------------------------------

      const userMessage =
        await Message.create({
          conversation_id:
            conversationId,

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
      // Update conversation title
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
        message:
          'Processing your request...',
      });

      // --------------------------------------------------------
      // IMPORTANT
      //
      // The current runLangGraphWorkflow()
      // returns the COMPLETE response.
      //
      // Therefore we cannot honestly call this
      // "real token streaming" yet.
      //
      // The old implementation used:
      //
      //   response.slice(...)
      //
      // which was fake streaming.
      //
      // We intentionally removed that behavior.
      //
      // The LangGraph workflow will be updated next
      // to expose an async stream.
      // --------------------------------------------------------

      const result =
        await runLangGraphWorkflow(
          cleanQuestion,
          userId,
          userRole,
          conversationId
        );

      const {
        response = '',
        sources = [],
        error = null,
        requiresConfirmation = false,
        pendingAction = null,
        actionMetadata = null,
      } = result || {};

      // --------------------------------------------------------
      // Save complete assistant message
      // --------------------------------------------------------

      const assistantMessage =
        await Message.create({
          conversation_id:
            conversationId,

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
      // Send response as one complete event
      //
      // This is temporary until LangGraph streaming is added.
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
  //
  // IMPORTANT:
  //
  // actionData from frontend is treated only as a fallback
  // for compatibility.
  //
  // The next architecture change should move pending actions
  // to persistent server-side storage and execute by actionId.
  //
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
      // Use new workflow services for leave requests
      // --------------------------------------------------------

      let result;

      if (
        actionId.startsWith(
          'leave_request_'
        )
      ) {
        result =
          await leaveWorkflowService.confirmAndSubmitLeaveRequest(
            conversationId,
            userId,
            actionId
          );

        if (!result.success) {
          throw new Error(result.message || 'Leave request submission failed');
        }

        return {
          success: true,

          assistantMessage:
            await Message.create({
              conversation_id:
                conversationId,

              role: 'assistant',

              content: result.message,

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
      // Import action handlers for other types
      // --------------------------------------------------------

      const {
        createCalendarEvent,
        sendGmail,
      } = await import(
        '../ai/langGraphWorkflow.js'
      );

      // --------------------------------------------------------
      // Determine action type
      // --------------------------------------------------------

      if (
        actionId.startsWith(
          'calendar_create_'
        )
      ) {
        result =
          await createCalendarEvent({
            userId,

            pendingAction: {
              ...actionData,
              actionId,
            },

            context: {
              userRole,
            },
          });
      } else if (
        actionId.startsWith(
          'gmail_send_'
        )
      ) {
        result =
          await sendGmail({
            userId,

            pendingAction: {
              ...actionData,
              actionId,
            },

            context: {
              userRole,
            },
          });
      } else {
        throw new Error(
          `Unknown action type: ${actionId}`
        );
      }

      // --------------------------------------------------------
      // Normalize tool result
      // --------------------------------------------------------

      const toolResult =
        result?.toolResult ||
        result?.response ||
        result?.message ||
        'Action completed successfully.';

      // --------------------------------------------------------
      // Save execution result
      // --------------------------------------------------------

      const assistantMessage =
        await Message.create({
          conversation_id:
            conversationId,

          role: 'assistant',

          content: toolResult,

          sources: [],
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

        requiresConfirmation: false,

        pendingAction: null,

        actionMetadata: null,
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

      // Delete messages first.
      await Message.deleteByConversationId(
        conversationId
      );

      // Delete conversation.
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