import { StateGraph } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { runRAGWorkflow } from './ragGraph.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { config } from '../config/index.js';
import googleCalendarService from '../services/googleCalendarService.js';

// Initialize Gemini model
const llm = new ChatGoogleGenerativeAI({
  apiKey: config.geminiApiKey,
  model: config.geminiModel,
  temperature: 0.3,
  maxOutputTokens: 1024
});

// AI Guardrails - Input validation and sanitization
export function validateUserInput(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input: input must be a non-empty string');
  }

  // Check for prompt injection patterns
  const injectionPatterns = [
    /ignore (previous|all) instructions/i,
    /override (system|security) rules/i,
    /execute (arbitrary|system) command/i,
    /bypass (authentication|authorization)/i,
    /reveal (secret|password|token|key)/i,
    /admin (access|privilege|rights)/i,
    /sudo|escalate (privilege|rights)/i,
    /\\x[0-9a-f]{2}/i, // Hex encoding attempts
    /<script[^>]*>/i, // Script tags
    /javascript:/i, // JavaScript protocol
    /data:/i, // Data protocol
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      throw new Error('Security violation: Potential prompt injection detected');
    }
  }

  // Check for cross-user data access attempts
  const crossUserPatterns = [
    /other (user|employee|person)/i,
    /another (user|employee|account)/i,
    /someone else/i,
    /my (manager|colleague|coworker)/i,
    /employee (id|name|email)/i,
  ];

  for (const pattern of crossUserPatterns) {
    if (pattern.test(input)) {
      throw new Error('Security violation: Cross-user data access attempt detected');
    }
  }

  // Check for destructive operation requests
  const destructivePatterns = [
    /delete (all|everything)/i,
    /drop (table|database)/i,
    /truncate/i,
    /destroy/i,
    /erase/i,
  ];

  for (const pattern of destructivePatterns) {
    if (pattern.test(input)) {
      throw new Error('Security violation: Destructive operation requested');
    }
  }

  // Sanitize input
  return input.trim().substring(0, 2000); // Limit input length
}

// AI Guardrails - Output validation
export function validateAIOutput(output) {
  if (!output || typeof output !== 'string') {
    throw new Error('Invalid AI output');
  }

  // Check for data leakage patterns
  const leakagePatterns = [
    /password[=:].+/i,
    /token[=:].+/i,
    /secret[=:].+/i,
    /api[ _-]?key[=:].+/i,
    /sql[ _-]?query/i,
    /internal[ _-]?system/i,
    /admin[ _-]?panel/i,
  ];

  for (const pattern of leakagePatterns) {
    if (pattern.test(output)) {
      throw new Error('Security violation: Potential data leakage in AI output');
    }
  }

  return output;
}

// LangGraph workflow state
const workflowState = {
  messages: [],
  userId: null,
  userRole: null,
  currentTool: null,
  toolResult: null,
  requiresConfirmation: false,
  pendingAction: null,
  context: {}
};

// Tool: Query leave balance
async function queryLeaveBalance(state) {
  try {
    const { userId } = state;
    const balance = await LeaveBalance.findByUserId(userId);
    
    if (!balance) {
      return {
        ...state,
        toolResult: 'Unable to retrieve your leave balance. Please contact HR.',
        currentTool: null
      };
    }

    const result = `Your current leave balance:\n` +
      `- Annual Leave: ${balance.annual_leave} days\n` +
      `- Sick Leave: ${balance.sick_leave} days\n` +
      `- Personal Leave: ${balance.personal_leave} days`;

    return {
      ...state,
      toolResult: result,
      currentTool: null,
      context: { ...state.context, leaveBalance: balance }
    };
  } catch (error) {
    console.error('Error querying leave balance:', error);
    return {
      ...state,
      toolResult: 'Error retrieving leave balance. Please try again later.',
      currentTool: null
    };
  }
}

// Tool: Check leave policy using RAG
async function checkLeavePolicy(state) {
  try {
    const { messages, userId, userRole } = state;
    const lastMessage = messages[messages.length - 1];
    
    const ragResult = await runRAGWorkflow(
      `What is the leave policy for: ${lastMessage.content}`,
      userId,
      userRole
    );

    return {
      ...state,
      toolResult: ragResult.answer,
      currentTool: null,
      context: { ...state.context, policyInfo: ragResult }
    };
  } catch (error) {
    console.error('Error checking leave policy:', error);
    return {
      ...state,
      toolResult: 'Error retrieving leave policy information. Please try again later.',
      currentTool: null
    };
  }
}

// Tool: Validate leave request
async function validateLeaveRequest(state) {
  try {
    const { context } = state;
    const { pendingAction } = state;

    if (!pendingAction || pendingAction.type !== 'leave_request') {
      return {
        ...state,
        toolResult: 'No pending leave request to validate.',
        currentTool: null
      };
    }

    const { leave_type, start_date, end_date, number_of_days } = pendingAction;

    // Check leave balance availability
    const hasBalance = await LeaveBalance.checkAvailability(
      state.userId,
      leave_type,
      number_of_days
    );

    if (!hasBalance) {
      return {
        ...state,
        toolResult: `Insufficient ${leave_type} leave balance. Please check your current balance or choose different dates.`,
        currentTool: null,
        requiresConfirmation: false
      };
    }

    // Check for overlapping leave requests
    const overlapping = await LeaveRequest.checkOverlappingLeave(
      state.userId,
      start_date,
      end_date
    );

    if (overlapping.length > 0) {
      return {
        ...state,
        toolResult: 'You have overlapping leave requests during this period. Please choose different dates.',
        currentTool: null,
        requiresConfirmation: false
      };
    }

    // Check calendar conflicts (if Google Calendar is connected)
    let calendarConflicts = null;
    try {
      const conflictCheck = await googleCalendarService.checkConflicts(
        state.userId,
        start_date,
        end_date
      );
      if (conflictCheck.hasConflicts) {
        calendarConflicts = conflictCheck.conflicts;
        const conflictDetails = conflictCheck.conflicts
          .map(c => `- ${new Date(c.start).toLocaleString()} to ${new Date(c.end).toLocaleString()}`)
          .join('\n');
        
        return {
          ...state,
          toolResult: `You have calendar conflicts during the requested leave period:\n${conflictDetails}\n\nPlease consider rescheduling or contact your manager.`,
          currentTool: null,
          requiresConfirmation: false,
          context: { ...state.context, calendarConflicts }
        };
      }
    } catch (calendarError) {
      // Don't fail validation if calendar check fails
      console.warn('Calendar conflict check failed:', calendarError.message);
    }

    return {
      ...state,
      toolResult: 'Leave request validation passed. Ready to submit.',
      currentTool: null,
      requiresConfirmation: true
    };
  } catch (error) {
    console.error('Error validating leave request:', error);
    return {
      ...state,
      toolResult: 'Error validating leave request. Please try again later.',
      currentTool: null,
      requiresConfirmation: false
    };
  }
}

// Tool: Submit leave request
async function submitLeaveRequest(state) {
  try {
    const { userId, context, pendingAction } = state;

    if (!pendingAction || pendingAction.type !== 'leave_request') {
      return {
        ...state,
        toolResult: 'No pending leave request to submit.',
        currentTool: null
      };
    }

    const { leave_type, start_date, end_date, number_of_days, reason } = pendingAction;

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      user_id: userId,
      leave_type,
      start_date,
      end_date,
      number_of_days,
      reason
    });

    return {
      ...state,
      toolResult: `Leave request submitted successfully!\n\nRequest ID: ${leaveRequest.id}\nType: ${leave_type}\nDates: ${start_date} to ${end_date}\nDays: ${number_of_days}\nStatus: Pending HR approval`,
      currentTool: null,
      requiresConfirmation: false,
      pendingAction: null
    };
  } catch (error) {
    console.error('Error submitting leave request:', error);
    return {
      ...state,
      toolResult: 'Error submitting leave request. Please try again later.',
      currentTool: null,
      requiresConfirmation: false
    };
  }
}

// Tool: General RAG query
async function generalRAGQuery(state) {
  try {
    const { messages, userId, userRole } = state;
    const lastMessage = messages[messages.length - 1];
    
    const ragResult = await runRAGWorkflow(
      lastMessage.content,
      userId,
      userRole
    );

    return {
      ...state,
      toolResult: ragResult.answer,
      currentTool: null,
      context: { ...state.context, ragResult }
    };
  } catch (error) {
    console.error('Error in general RAG query:', error);
    return {
      ...state,
      toolResult: 'I apologize, but I encountered an error processing your question. Please try again.',
      currentTool: null
    };
  }
}

// Intent classification using LLM
async function classifyIntent(userMessage) {
  try {
    const prompt = `Classify the user's intent into one of these categories:
- "leave_balance": User wants to check their leave balance
- "leave_policy": User wants to know about leave policies
- "leave_request": User wants to request leave
- "general": General question or other request

User message: "${userMessage}"

Respond with only the category name.`;

    const response = await llm.invoke(prompt);
    const intent = response.content.toLowerCase().trim();
    
    const validIntents = ['leave_balance', 'leave_policy', 'leave_request', 'general'];
    return validIntents.includes(intent) ? intent : 'general';
  } catch (error) {
    console.error('Error classifying intent:', error);
    return 'general';
  }
}

// Extract leave request details
async function extractLeaveDetails(userMessage) {
  try {
    const prompt = `Extract leave request details from the user's message. If any information is missing, return null for that field.

User message: "${userMessage}"

Respond in JSON format with these fields:
{
  "leave_type": "annual" or "sick" or "personal" or null,
  "start_date": "YYYY-MM-DD" or null,
  "end_date": "YYYY-MM-DD" or null,
  "reason": "leave reason" or null
}`;

    const response = await llm.invoke(prompt);
    const content = response.content;
    
    // Try to parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting leave details:', error);
    return null;
  }
}

// Main LangGraph workflow
export async function runLangGraphWorkflow(userMessage, userId, userRole) {
  try {
    // Validate user input with guardrails
    const sanitizedInput = validateUserInput(userMessage);

    // Initialize workflow state
    let state = {
      messages: [{ role: 'user', content: sanitizedInput }],
      userId,
      userRole,
      currentTool: null,
      toolResult: null,
      requiresConfirmation: false,
      pendingAction: null,
      context: {}
    };

    // Classify user intent
    const intent = await classifyIntent(sanitizedInput);

    // Route to appropriate tool based on intent
    switch (intent) {
      case 'leave_balance':
        state = await queryLeaveBalance(state);
        break;

      case 'leave_policy':
        state = await checkLeavePolicy(state);
        break;

      case 'leave_request':
        // Extract leave details
        const leaveDetails = await extractLeaveDetails(sanitizedInput);
        
        if (!leaveDetails || !leaveDetails.leave_type || !leaveDetails.start_date || !leaveDetails.end_date) {
          state.toolResult = 'To request leave, please provide:\n- Type of leave (annual, sick, or personal)\n- Start date (YYYY-MM-DD)\n- End date (YYYY-MM-DD)\n- Reason (optional)\n\nExample: "I want to request annual leave from 2024-03-01 to 2024-03-05 for vacation"';
          state.currentTool = null;
        } else {
          // Calculate number of days
          const numberOfDays = await LeaveRequest.calculateDays(
            leaveDetails.start_date,
            leaveDetails.end_date
          );

          state.pendingAction = {
            type: 'leave_request',
            ...leaveDetails,
            number_of_days: numberOfDays
          };

          // Validate the request
          state = await validateLeaveRequest(state);

          if (state.requiresConfirmation) {
            state.toolResult += `\n\nPlease confirm: Do you want to submit this leave request?\n- Type: ${leaveDetails.leave_type}\n- Dates: ${leaveDetails.start_date} to ${leaveDetails.end_date}\n- Days: ${numberOfDays}\n- Reason: ${leaveDetails.reason || 'Not specified'}\n\nReply "yes" to confirm or "no" to cancel.`;
          }
        }
        break;

      case 'general':
      default:
        state = await generalRAGQuery(state);
        break;
    }

    // Handle confirmation responses
    if (state.requiresConfirmation && state.pendingAction) {
      const lowerInput = sanitizedInput.toLowerCase();
      if (lowerInput === 'yes' || lowerInput === 'confirm' || lowerInput === 'submit') {
        state = await submitLeaveRequest(state);
      } else if (lowerInput === 'no' || lowerInput === 'cancel') {
        state.toolResult = 'Leave request cancelled.';
        state.requiresConfirmation = false;
        state.pendingAction = null;
      }
    }

    // Validate AI output with guardrails
    const validatedOutput = validateAIOutput(state.toolResult);

    return {
      response: validatedOutput,
      sources: state.context.ragResult?.sources || [],
      requiresConfirmation: state.requiresConfirmation,
      pendingAction: state.pendingAction,
      error: null
    };
  } catch (error) {
    console.error('Error in LangGraph workflow:', error);

    // Return safe error message
    return {
      response: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
      sources: [],
      requiresConfirmation: false,
      pendingAction: null,
      error: error.message
    };
  }
}