import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { ConversationState } from '../models/ConversationState.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { config } from '../config/index.js';

// ============================================================
// CONSTANTS
// ============================================================

const SUMMARY_THRESHOLD = 12; // Generate summary after this many messages
const SUMMARY_UPDATE_INTERVAL = 8; // Update summary every N new messages
const RECENT_MESSAGES_COUNT = 10; // Number of recent messages to include in context
const MAX_CONTEXT_TOKENS = 8000; // Maximum tokens for context (excluding system prompt)
const MAX_MESSAGE_LENGTH = 500; // Maximum length for individual messages in context
const SUMMARY_MAX_LENGTH = 300; // Maximum words for conversation summary
const DUPLICATE_CHECK_WINDOW = 30; // Time window in seconds for duplicate message detection

// ============================================================
// LLM FOR SUMMARY GENERATION
// ============================================================

const summaryLlm = new ChatGoogleGenerativeAI({
  apiKey: config.geminiApiKey,
  model: config.geminiModel,
  temperature: 0.3,
  maxOutputTokens: 1024,
});

// ============================================================
// CONVERSATION MEMORY SERVICE
// ============================================================

class ConversationMemoryService {
  // ============================================================
  // GET CONVERSATION CONTEXT
  // ============================================================

  async getConversationContext(conversationId, userId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Verify user ownership
      if (String(conversation.user_id) !== String(userId)) {
        throw new Error('Access denied to conversation');
      }

      const conversationState = await ConversationState.findByConversationId(conversationId);
      const messages = await Message.findByConversationId(conversationId);

      // Handle missing conversation state gracefully
      if (!conversationState) {
        console.warn('[ConversationMemoryService] No conversation state found, using empty state');
      }

      // Handle empty messages gracefully
      if (!messages || messages.length === 0) {
        console.warn('[ConversationMemoryService] No messages found in conversation');
        return {
          conversation,
          conversationState: conversationState || {},
          messages: [],
          context: this.buildCompactContext(conversation, conversationState || {}, []),
          needsSummary: false,
        };
      }

      // Build compact context
      const context = await this.buildCompactContext(
        conversation,
        conversationState || {},
        messages
      );

      return {
        conversation,
        conversationState: conversationState || {},
        messages,
        context,
        needsSummary: this.shouldGenerateSummary(conversation, messages),
      };
    } catch (error) {
      console.error('[ConversationMemoryService] Error getting conversation context:', error);
      throw error;
    }
  }

  // ============================================================
  // BUILD COMPACT CONTEXT FOR LLM
  // ============================================================

  async buildCompactContext(conversation, conversationState, messages) {
    try {
      const compactContext = {
        summary: conversation.summary || 'No summary available',
        currentTopic: conversationState?.context?.currentTopic || null,
        lastIntent: conversationState?.intent || null,
        currentWorkflowStep: conversationState?.workflow_step || null,
        pendingAction: conversationState?.pending_action || null,
        recentMessages: [],
        structuredMemory: this.extractStructuredMemory(conversationState, messages),
      };

      // Add recent messages (last N messages)
      const recentMessages = messages.slice(-RECENT_MESSAGES_COUNT);
      compactContext.recentMessages = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
      }));

      // Add summary if conversation is long
      if (messages.length > SUMMARY_THRESHOLD && conversation.summary) {
        compactContext.useSummary = true;
      } else {
        compactContext.useSummary = false;
      }

      return compactContext;
    } catch (error) {
      console.error('[ConversationMemoryService] Error building compact context:', error);
      // Return minimal context to prevent conversation failure
      return {
        summary: 'No summary available',
        currentTopic: null,
        lastIntent: null,
        currentWorkflowStep: null,
        pendingAction: null,
        recentMessages: [],
        structuredMemory: {},
        useSummary: false,
      };
    }
  }

  // ============================================================
  // EXTRACT STRUCTURED MEMORY
  // ============================================================

  extractStructuredMemory(conversationState, messages) {
    // Handle undefined or null conversationState
    if (!conversationState) {
      return {
        currentTopic: null,
        lastCalendarEvent: null,
        lastLeaveRequest: null,
        lastGmailContext: null,
        referencedEntities: [],
        importantDates: [],
        pendingAction: null,
        toolState: {},
      };
    }

    const structuredMemory = {
      currentTopic: conversationState?.context?.currentTopic || null,
      lastCalendarEvent: conversationState?.context?.lastCalendarEvent || null,
      lastLeaveRequest: conversationState?.context?.lastLeaveRequest || null,
      lastGmailContext: conversationState?.context?.lastGmailContext || null,
      referencedEntities: conversationState?.context?.referencedEntities || [],
      importantDates: conversationState?.context?.importantDates || [],
      pendingAction: conversationState?.pending_action || null,
      toolState: conversationState?.context?.toolState || {},
    };

    // Extract recent entity references from messages
    if (messages && Array.isArray(messages) && messages.length > 0) {
      const recentMessages = messages.slice(-5);
      recentMessages.forEach(msg => {
        if (msg && msg.role === 'user') {
          this.extractEntitiesFromMessage(msg.content, structuredMemory);
        }
      });
    }

    return structuredMemory;
  }

  // ============================================================
  // EXTRACT ENTITIES FROM MESSAGE
  // ============================================================

  extractEntitiesFromMessage(content, structuredMemory) {
    // Handle undefined or null content
    if (!content) {
      return;
    }

    const text = String(content).toLowerCase();

    // Extract dates
    const datePatterns = [
      /\b(\d{4}-\d{2}-\d{2})\b/g, // YYYY-MM-DD
      /\b(today|tomorrow|yesterday|next week|this week|next month|this month)\b/g,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g,
    ];

    datePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (structuredMemory.importantDates && Array.isArray(structuredMemory.importantDates) && !structuredMemory.importantDates.includes(match)) {
            structuredMemory.importantDates.push(match);
          }
        });
      }
    });

    // Extract calendar event references
    if (text.includes('meeting') || text.includes('appointment') || text.includes('event')) {
      if (structuredMemory.referencedEntities && Array.isArray(structuredMemory.referencedEntities) && !structuredMemory.referencedEntities.includes('calendar')) {
        structuredMemory.referencedEntities.push('calendar');
      }
    }

    // Extract time references
    const timePattern = /\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b/gi;
    const timeMatches = content.match(timePattern);
    if (timeMatches && !structuredMemory.referencedTimes) {
      structuredMemory.referencedTimes = timeMatches;
    }

    // Extract leave references
    if (text.includes('leave') || text.includes('vacation') || text.includes('time off')) {
      if (structuredMemory.referencedEntities && Array.isArray(structuredMemory.referencedEntities) && !structuredMemory.referencedEntities.includes('leave')) {
        structuredMemory.referencedEntities.push('leave');
      }
    }

    // Extract email references
    if (text.includes('email') || text.includes('mail') || text.includes('message')) {
      if (structuredMemory.referencedEntities && Array.isArray(structuredMemory.referencedEntities) && !structuredMemory.referencedEntities.includes('email')) {
        structuredMemory.referencedEntities.push('email');
      }
    }
  }

  // ============================================================
  // SHOULD GENERATE SUMMARY
  // ============================================================

  shouldGenerateSummary(conversation, messages) {
    const messageCount = messages.length;
    
    // Generate summary if:
    // 1. No summary exists and threshold is reached
    // 2. Summary is stale (based on message count interval)
    
    if (!conversation.summary && messageCount >= SUMMARY_THRESHOLD) {
      return true;
    }

    if (conversation.summary && messageCount >= SUMMARY_THRESHOLD) {
      const messagesSinceLastUpdate = messageCount - (conversation.message_count || 0);
      if (messagesSinceLastUpdate >= SUMMARY_UPDATE_INTERVAL) {
        return true;
      }
    }

    return false;
  }

  // ============================================================
  // GENERATE CONVERSATION SUMMARY
  // ============================================================

  async generateConversationSummary(conversationId, messages) {
    try {
      if (!messages || messages.length === 0) {
        console.warn('[ConversationMemoryService] No messages to summarize');
        return null;
      }

      // Build conversation text for summarization
      const conversationText = messages
        .slice(0, -3) // Use all but the last 3 messages for summary
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n\n');

      if (!conversationText || conversationText.trim().length === 0) {
        console.warn('[ConversationMemoryService] Empty conversation text for summarization');
        return null;
      }

      const prompt = `
You are an AI assistant that summarizes conversations for an Employee Copilot system.

Summarize the following conversation, focusing on:
1. The main topics discussed
2. Key decisions made
3. Important entities mentioned (dates, people, events, etc.)
4. Current user intent
5. Any pending actions or follow-ups
6. Tool-related state (calendar events, leave requests, emails, etc.)

Keep the summary concise (under ${SUMMARY_MAX_LENGTH} words) but informative.
Include specific details like dates, times, and action items.

CONVERSATION:
${conversationText}

SUMMARY:`;

      const response = await summaryLlm.invoke(prompt);
      const summary = response.content?.trim() || '';

      if (summary && summary.length > 0) {
        // Update conversation with summary
        await Conversation.update(conversationId, {
          summary,
          summary_last_updated: new Date(),
          message_count: messages.length,
        });

        return summary;
      }

      console.warn('[ConversationMemoryService] Empty summary generated');
      return null;
    } catch (error) {
      console.error('[ConversationMemoryService] Error generating summary:', error);
      // Return null instead of throwing to allow conversation to continue
      return null;
    }
  }

  // ============================================================
  // UPDATE STRUCTURED MEMORY
  // ============================================================

  async updateStructuredMemory(conversationId, updates) {
    try {
      const conversationState = await ConversationState.findByConversationId(conversationId);
      
      if (!conversationState) {
        console.warn('[ConversationMemoryService] No conversation state found for:', conversationId, ' - skipping update');
        return null;
      }

      const currentContext = conversationState.context || {};
      const updatedContext = {
        ...currentContext,
        ...updates,
      };

      await ConversationState.update(conversationId, {
        context: updatedContext,
      });

      return updatedContext;
    } catch (error) {
      console.error('[ConversationMemoryService] Error updating structured memory:', error);
      // Don't throw - allow conversation to continue even if memory update fails
      return null;
    }
  }

  // ============================================================
  // UPDATE CONVERSATION STATE AFTER MESSAGE
  // ============================================================

  async updateConversationState(conversationId, message, toolResult, intent) {
    try {
      const updates = {};

      // Update current topic based on intent
      if (intent) {
        updates.currentTopic = intent;
      }

      // Extract and store calendar-related context
      if (intent === 'calendar_events' || intent === 'calendar_create') {
        const calendarData = this.extractCalendarContext(message, toolResult);
        updates.lastCalendarEvent = calendarData;
      }

      // Extract and store leave-related context
      if (intent === 'leave_request' || intent === 'leave_balance') {
        const leaveData = this.extractLeaveContext(message, toolResult);
        updates.lastLeaveRequest = leaveData;
      }

      // Extract and store email-related context
      if (intent === 'gmail_read' || intent === 'gmail_send') {
        const emailData = this.extractEmailContext(message, toolResult);
        updates.lastGmailContext = emailData;
      }

      // Update tool state
      if (toolResult) {
        updates.toolState = {
          ...updates.toolState,
          lastTool: intent,
          lastToolResult: toolResult.substring(0, 500), // Store truncated result
        };
      }

      if (Object.keys(updates).length > 0) {
        await this.updateStructuredMemory(conversationId, updates);
      }

      return updates;
    } catch (error) {
      console.error('[ConversationMemoryService] Error updating conversation state:', error);
      // Don't throw - allow conversation to continue even if state update fails
      return {};
    }
  }

  // ============================================================
  // EXTRACT CALENDAR CONTEXT
  // ============================================================

  extractCalendarContext(message, toolResult) {
    const calendarContext = {
      lastQuery: message,
      lastResultSummary: toolResult ? toolResult.substring(0, 200) : null,
      timestamp: new Date().toISOString(),
    };

    // Extract specific calendar entities
    const dateMatches = message.match(/\b(\d{4}-\d{2}-\d{2}|today|tomorrow|next week|this week)\b/gi);
    if (dateMatches) {
      calendarContext.referencedDates = dateMatches;
    }

    const timeMatches = message.match(/\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b/gi);
    if (timeMatches) {
      calendarContext.referencedTimes = timeMatches;
    } else {
      // Try alternative time pattern (without colon)
      const altTimeMatches = message.match(/\b(\d{1,2})(\d{2})?\s*(am|pm)?\b/gi);
      if (altTimeMatches) {
        calendarContext.referencedTimes = altTimeMatches;
      }
    }

    return calendarContext;
  }

  // ============================================================
  // EXTRACT LEAVE CONTEXT
  // ============================================================

  extractLeaveContext(message, toolResult) {
    const leaveContext = {
      lastQuery: message,
      lastResultSummary: toolResult ? toolResult.substring(0, 200) : null,
      timestamp: new Date().toISOString(),
    };

    // Extract leave-related entities
    const leaveTypeMatches = message.match(/\b(annual|sick|personal)\s+leave\b/gi);
    if (leaveTypeMatches) {
      leaveContext.referencedLeaveTypes = leaveTypeMatches;
    }

    const dateMatches = message.match(/\b(\d{4}-\d{2}-\d{2}|today|tomorrow|next week|this week|monday|tuesday|wednesday|thursday|friday)\b/gi);
    if (dateMatches) {
      leaveContext.referencedDates = dateMatches;
    }

    return leaveContext;
  }

  // ============================================================
  // EXTRACT EMAIL CONTEXT
  // ============================================================

  extractEmailContext(message, toolResult) {
    const emailContext = {
      lastQuery: message,
      lastResultSummary: toolResult ? toolResult.substring(0, 200) : null,
      timestamp: new Date().toISOString(),
    };

    // Extract email addresses
    const emailMatches = message.match(/\b[\w.-]+@[\w.-]+\.\w+\b/g);
    if (emailMatches) {
      emailContext.referencedEmails = emailMatches;
    }

    return emailContext;
  }

  // ============================================================
  // BUILD LLM CONTEXT FROM COMPACT CONTEXT
  // ============================================================

  buildLLMContext(compactContext, systemPrompt) {
    let contextParts = [];

    // Handle undefined or null compactContext
    if (!compactContext) {
      return systemPrompt;
    }

    // Add system prompt
    contextParts.push(systemPrompt);

    // Add conversation summary if available and needed
    if (compactContext.useSummary && compactContext.summary) {
      contextParts.push(`\nCONVERSATION SUMMARY:\n${compactContext.summary}`);
    }

    // Add structured memory context
    if (compactContext.structuredMemory && typeof compactContext.structuredMemory === 'object') {
      const memoryParts = [];

      if (compactContext.structuredMemory.currentTopic) {
        memoryParts.push(`Current topic: ${compactContext.structuredMemory.currentTopic}`);
      }

      if (compactContext.structuredMemory.lastCalendarEvent) {
        memoryParts.push(`Last calendar interaction: ${compactContext.structuredMemory.lastCalendarEvent.lastQuery}`);
      }

      if (compactContext.structuredMemory.lastLeaveRequest) {
        memoryParts.push(`Last leave interaction: ${compactContext.structuredMemory.lastLeaveRequest.lastQuery}`);
      }

      if (compactContext.structuredMemory.lastGmailContext) {
        memoryParts.push(`Last email interaction: ${compactContext.structuredMemory.lastGmailContext.lastQuery}`);
      }

      if (compactContext.structuredMemory.importantDates && Array.isArray(compactContext.structuredMemory.importantDates) && compactContext.structuredMemory.importantDates.length > 0) {
        memoryParts.push(`Important dates mentioned: ${compactContext.structuredMemory.importantDates.join(', ')}`);
      }

      if (compactContext.structuredMemory.pendingAction) {
        memoryParts.push(`Pending action: ${JSON.stringify(compactContext.structuredMemory.pendingAction)}`);
      }

      if (memoryParts.length > 0) {
        contextParts.push(`\nCONTEXT MEMORY:\n${memoryParts.join('\n')}`);
      }
    }

    // Add recent messages with token optimization
    if (compactContext.recentMessages && Array.isArray(compactContext.recentMessages) && compactContext.recentMessages.length > 0) {
      const recentMessagesText = compactContext.recentMessages
        .map(msg => this.optimizeMessageForTokens(msg))
        .join('\n');
      contextParts.push(`\nRECENT CONVERSATION:\n${recentMessagesText}`);
    }

    // Truncate context to fit within token limits
    return this.truncateContextToFitLimit(contextParts, MAX_CONTEXT_TOKENS);
  }

  // ============================================================
  // OPTIMIZE MESSAGE FOR TOKENS
  // ============================================================

  optimizeMessageForTokens(message) {
    // Handle undefined or null message
    if (!message) {
      return '';
    }

    let content = message.content || '';
    
    // Truncate very long messages to save tokens
    if (content.length > 500) {
      content = content.substring(0, 500) + '...';
    }
    
    const role = message.role || 'USER';
    return `${role.toUpperCase()}: ${content}`;
  }

  // ============================================================
  // ESTIMATE TOKEN COUNT
  // ============================================================

  estimateTokenCount(text) {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  // ============================================================
  // TRUNCATE CONTEXT TO FIT TOKEN LIMIT
  // ============================================================

  truncateContextToFitLimit(contextParts, maxTokens = MAX_CONTEXT_TOKENS) {
    let currentTokens = 0;
    const parts = [];
    
    for (const part of contextParts) {
      const partTokens = this.estimateTokenCount(part);
      
      if (currentTokens + partTokens > maxTokens) {
        // Skip this part if it would exceed the limit
        continue;
      }
      
      parts.push(part);
      currentTokens += partTokens;
    }
    
    return parts.join('\n');
  }

  // ============================================================
  // RESOLVE CONTEXTUAL REFERENCES
  // ============================================================

  resolveContextualReferences(userMessage, compactContext) {
    const text = userMessage.toLowerCase();
    const resolvedMessage = userMessage;
    const resolvedContext = {};

    // Handle undefined or null compactContext
    if (!compactContext) {
      return {
        resolvedMessage,
        resolvedContext,
      };
    }

    // Handle undefined or null structuredMemory
    if (!compactContext.structuredMemory) {
      return {
        resolvedMessage,
        resolvedContext,
      };
    }

    const structuredMemory = compactContext.structuredMemory;

    // Resolve temporal references like "tomorrow", "next week" based on conversation state
    if (text.includes('tomorrow') || text.includes('next') || text.includes('this')) {
      if (structuredMemory.importantDates && Array.isArray(structuredMemory.importantDates) && structuredMemory.importantDates.length > 0) {
        resolvedContext.temporalContext = structuredMemory.importantDates;
      }
    }

    // Resolve entity references like "it", "that", "him" based on conversation state
    if (text.includes('it') || text.includes('that') || text.includes('him') || text.includes('her')) {
      if (structuredMemory.referencedEntities && Array.isArray(structuredMemory.referencedEntities) && structuredMemory.referencedEntities.length > 0) {
        resolvedContext.entityContext = structuredMemory.referencedEntities;
      }
    }

    // Resolve action references like "change it", "send it", "add to it"
    if (text.includes('change') || text.includes('send') || text.includes('add') || text.includes('update')) {
      if (structuredMemory.pendingAction) {
        resolvedContext.actionContext = structuredMemory.pendingAction;
      }
    }

    return {
      resolvedMessage,
      resolvedContext,
    };
  }

  // ============================================================
  // CLEANUP OLD CONVERSATIONS
  // ============================================================

  async cleanupOldConversations(daysOld = 90) {
    try {
      // This would be implemented as a scheduled job
      // For now, it's a placeholder for future implementation
      console.log('[ConversationMemoryService] Cleanup would remove conversations older than', daysOld, 'days');
    } catch (error) {
      console.error('[ConversationMemoryService] Error in cleanup:', error);
    }
  }
}

export default new ConversationMemoryService();