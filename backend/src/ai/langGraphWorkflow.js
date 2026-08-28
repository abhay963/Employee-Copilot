import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

import { runRAGWorkflow } from './ragGraph.js';

import { LeaveBalance } from '../models/LeaveBalance.js';
import { LeaveRequest } from '../models/LeaveRequest.js';

import { config } from '../config/index.js';

import googleCalendarService from '../services/googleCalendarService.js';

// ============================================================
// GEMINI MODEL
// ============================================================

const llm = new ChatGoogleGenerativeAI({
  apiKey: config.geminiApiKey,
  model: config.geminiModel,
  temperature: 0.3,
  maxOutputTokens: 1024,
});

// ============================================================
// AI GUARDRAILS - INPUT VALIDATION
// ============================================================

export function validateUserInput(input) {
  if (!input || typeof input !== 'string') {
    throw new Error(
      'Invalid input: input must be a non-empty string'
    );
  }

  const injectionPatterns = [
    /ignore (previous|all) instructions/i,
    /override (system|security) rules/i,
    /execute (arbitrary|system) command/i,
    /bypass (authentication|authorization)/i,
    /reveal (secret|password|token|key)/i,
    /admin (access|privilege|rights)/i,
    /sudo|escalate (privilege|rights)/i,
    /\\x[0-9a-f]{2}/i,
    /<script[^>]*>/i,
    /javascript:/i,
    /data:/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      throw new Error(
        'Security violation: Potential prompt injection detected'
      );
    }
  }

  const crossUserPatterns = [
    /other (user|employee|person)/i,
    /another (user|employee|account)/i,
    /someone else/i,
    /my (manager|colleague|coworker)/i,
    /employee (id|name|email)/i,
  ];

  for (const pattern of crossUserPatterns) {
    if (pattern.test(input)) {
      throw new Error(
        'Security violation: Cross-user data access attempt detected'
      );
    }
  }

  const destructivePatterns = [
    /delete (all|everything)/i,
    /drop (table|database)/i,
    /truncate/i,
    /destroy/i,
    /erase/i,
  ];

  for (const pattern of destructivePatterns) {
    if (pattern.test(input)) {
      throw new Error(
        'Security violation: Destructive operation requested'
      );
    }
  }

  return input.trim().substring(0, 2000);
}

// ============================================================
// AI GUARDRAILS - OUTPUT VALIDATION
// ============================================================

export function validateAIOutput(output) {
  if (!output || typeof output !== 'string') {
    throw new Error('Invalid AI output');
  }

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
      throw new Error(
        'Security violation: Potential data leakage in AI output'
      );
    }
  }

  return output;
}

// ============================================================
// LEAVE BALANCE TOOL
// ============================================================

async function queryLeaveBalance(state) {
  try {
    const { userId } = state;

    const balance =
      await LeaveBalance.findByUserId(userId);

    if (!balance) {
      return {
        ...state,
        toolResult:
          'Unable to retrieve your leave balance. Please contact HR.',
        currentTool: null,
      };
    }

    const result =
      `Your current leave balance:\n` +
      `- Annual Leave: ${balance.annual_leave} days\n` +
      `- Sick Leave: ${balance.sick_leave} days\n` +
      `- Personal Leave: ${balance.personal_leave} days`;

    return {
      ...state,
      toolResult: result,
      currentTool: null,
      context: {
        ...state.context,
        leaveBalance: balance,
      },
    };
  } catch (error) {
    console.error(
      'Error querying leave balance:',
      error
    );

    return {
      ...state,
      toolResult:
        'Error retrieving leave balance. Please try again later.',
      currentTool: null,
    };
  }
}

// ============================================================
// LEAVE POLICY TOOL
// ============================================================

async function checkLeavePolicy(state) {
  try {
    const {
      messages,
      userId,
      userRole,
    } = state;

    const lastMessage =
      messages[messages.length - 1];

    const ragResult =
      await runRAGWorkflow(
        `What is the leave policy for: ${lastMessage.content}`,
        userId,
        userRole
      );

    return {
      ...state,
      toolResult: ragResult.answer,
      currentTool: null,
      context: {
        ...state.context,
        policyInfo: ragResult,
      },
    };
  } catch (error) {
    console.error(
      'Error checking leave policy:',
      error
    );

    return {
      ...state,
      toolResult:
        'Error retrieving leave policy information. Please try again later.',
      currentTool: null,
    };
  }
}

// ============================================================
// CALENDAR DATE RANGE
// ============================================================

function getStartOfDay(date) {
  const result = new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function getEndOfDay(date) {
  const result = new Date(date);

  result.setHours(
    23,
    59,
    59,
    999
  );

  return result;
}

function getCalendarDateRange(userMessage) {
  const message =
    userMessage.toLowerCase();

  const today =
    new Date();

  // ----------------------------------------------------------
  // TODAY
  // ----------------------------------------------------------

  if (
    message.includes('today') ||
    message.includes('meeting today') ||
    message.includes('schedule today') ||
    message.includes('calendar today')
  ) {
    return {
      startDate: getStartOfDay(today),
      endDate: getEndOfDay(today),
      label: 'today',
    };
  }

  // ----------------------------------------------------------
  // TOMORROW
  // ----------------------------------------------------------

  if (
    message.includes('tomorrow')
  ) {
    const tomorrow =
      new Date(today);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    return {
      startDate:
        getStartOfDay(tomorrow),

      endDate:
        getEndOfDay(tomorrow),

      label: 'tomorrow',
    };
  }

  // ----------------------------------------------------------
  // THIS WEEK
  // ----------------------------------------------------------

  if (
    message.includes('this week') ||
    message.includes('week')
  ) {
    const start =
      getStartOfDay(today);

    const day =
      start.getDay();

    const diff =
      day === 0 ? 0 : day;

    start.setDate(
      start.getDate() - diff
    );

    const end =
      new Date(start);

    end.setDate(
      start.getDate() + 6
    );

    return {
      startDate:
        getStartOfDay(start),

      endDate:
        getEndOfDay(end),

      label: 'this week',
    };
  }

  // ----------------------------------------------------------
  // NEXT WEEK
  // ----------------------------------------------------------

  if (
    message.includes('next week')
  ) {
    const start =
      getStartOfDay(today);

    const day =
      start.getDay();

    const daysUntilNextSunday =
      day === 0 ? 7 : 7 - day;

    start.setDate(
      start.getDate() +
        daysUntilNextSunday
    );

    const end =
      new Date(start);

    end.setDate(
      start.getDate() + 6
    );

    return {
      startDate:
        getStartOfDay(start),

      endDate:
        getEndOfDay(end),

      label: 'next week',
    };
  }

  // ----------------------------------------------------------
  // UPCOMING
  // ----------------------------------------------------------

  if (
    message.includes('upcoming') ||
    message.includes('next meetings') ||
    message.includes('upcoming meetings') ||
    message.includes('future meetings')
  ) {
    const end =
      new Date(today);

    end.setDate(
      end.getDate() + 7
    );

    return {
      startDate:
        new Date(),

      endDate:
        getEndOfDay(end),

      label: 'upcoming',
    };
  }

  // ----------------------------------------------------------
  // DEFAULT = TODAY
  // ----------------------------------------------------------

  return {
    startDate:
      getStartOfDay(today),

    endDate:
      getEndOfDay(today),

    label: 'today',
  };
}

// ============================================================
// FORMAT CALENDAR EVENT
// ============================================================

function formatCalendarEvent(event) {
  const title =
    event.summary ||
    'Untitled event';

  // Google Calendar can have dateTime
  // or date for all-day events.

  if (
    event.start?.date
  ) {
    return {
      title,
      allDay: true,
      start: event.start.date,
      end: event.end?.date || null,
      location:
        event.location || null,
      description:
        event.description || null,
      htmlLink:
        event.htmlLink || null,
    };
  }

  const startDateTime =
    event.start?.dateTime
      ? new Date(
          event.start.dateTime
        )
      : null;

  const endDateTime =
    event.end?.dateTime
      ? new Date(
          event.end.dateTime
        )
      : null;

  return {
    title,

    allDay: false,

    start:
      startDateTime
        ? startDateTime.toISOString()
        : null,

    end:
      endDateTime
        ? endDateTime.toISOString()
        : null,

    location:
      event.location || null,

    description:
      event.description || null,

    htmlLink:
      event.htmlLink || null,
  };
}

// ============================================================
// FORMAT TIME
// ============================================================

function formatEventTime(
  event
) {
  if (event.allDay) {
    return 'All day';
  }

  if (!event.start) {
    return 'Time unavailable';
  }

  const start =
    new Date(event.start);

  const end =
    event.end
      ? new Date(event.end)
      : null;

  const timeFormatter =
    new Intl.DateTimeFormat(
      'en-IN',
      {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }
    );

  const dateFormatter =
    new Intl.DateTimeFormat(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
      }
    );

  const startTime =
    timeFormatter.format(start);

  if (!end) {
    return `${dateFormatter.format(start)} at ${startTime}`;
  }

  const endTime =
    timeFormatter.format(end);

  const sameDay =
    start.toDateString() ===
    end.toDateString();

  if (sameDay) {
    return `${dateFormatter.format(start)}, ${startTime} - ${endTime}`;
  }

  return `${dateFormatter.format(start)}, ${startTime} - ${dateFormatter.format(end)}, ${endTime}`;
}

// ============================================================
// CALENDAR EVENTS TOOL
// ============================================================

async function queryCalendarEvents(
  state
) {
  try {
    const {
      messages,
      userId,
    } = state;

    const lastMessage =
      messages[messages.length - 1];

    const userMessage =
      lastMessage.content;

    // Determine date range.
    const {
      startDate,
      endDate,
      label,
    } =
      getCalendarDateRange(
        userMessage
      );

    console.log(
      `Calendar query: ${label}`,
      startDate,
      endDate
    );

    // Get events from Google Calendar.
    const events =
      await googleCalendarService.getEvents(
        userId,
        startDate,
        endDate
      );

    // Ignore cancelled events.
    const activeEvents =
      events.filter(
        (event) =>
          event.status !== 'cancelled'
      );

    const formattedEvents =
      activeEvents.map(
        formatCalendarEvent
      );

    // --------------------------------------------------------
    // NO EVENTS
    // --------------------------------------------------------

    if (
      formattedEvents.length === 0
    ) {
      let message;

      if (label === 'today') {
        message =
          "You don't have any meetings or calendar events today.";
      } else if (
        label === 'tomorrow'
      ) {
        message =
          "You don't have any meetings or calendar events tomorrow.";
      } else if (
        label === 'this week'
      ) {
        message =
          "You don't have any meetings or calendar events this week.";
      } else if (
        label === 'next week'
      ) {
        message =
          "You don't have any meetings or calendar events next week.";
      } else {
        message =
          "You don't have any upcoming meetings or calendar events.";
      }

      return {
        ...state,

        toolResult:
          message,

        currentTool: null,

        context: {
          ...state.context,

          calendarEvents: [],
          calendarRange: {
            startDate,
            endDate,
            label,
          },
        },
      };
    }

    // --------------------------------------------------------
    // EVENTS FOUND
    // --------------------------------------------------------

    const eventLines =
      formattedEvents.map(
        (event, index) => {
          let line =
            `${index + 1}. ${event.title}\n` +
            `   ${formatEventTime(event)}`;

          if (
            event.location
          ) {
            line +=
              `\n   Location: ${event.location}`;
          }

          return line;
        }
      );

    let heading;

    if (
      label === 'today'
    ) {
      heading =
        `Yes. You have ${formattedEvents.length} calendar event${
          formattedEvents.length === 1
            ? ''
            : 's'
        } today:`;
    } else if (
      label === 'tomorrow'
    ) {
      heading =
        `You have ${formattedEvents.length} calendar event${
          formattedEvents.length === 1
            ? ''
            : 's'
        } tomorrow:`;
    } else if (
      label === 'this week'
    ) {
      heading =
        `You have ${formattedEvents.length} calendar event${
          formattedEvents.length === 1
            ? ''
            : 's'
        } this week:`;
    } else if (
      label === 'next week'
    ) {
      heading =
        `You have ${formattedEvents.length} calendar event${
          formattedEvents.length === 1
            ? ''
            : 's'
        } next week:`;
    } else {
      heading =
        `You have ${formattedEvents.length} upcoming calendar event${
          formattedEvents.length === 1
            ? ''
            : 's'
        }:`;
    }

    const result =
      `${heading}\n\n` +
      eventLines.join('\n\n');

    return {
      ...state,

      toolResult:
        result,

      currentTool: null,

      context: {
        ...state.context,

        calendarEvents:
          formattedEvents,

        calendarRange: {
          startDate,
          endDate,
          label,
        },
      },
    };
  } catch (error) {
    console.error(
      'Error querying Google Calendar:',
      error
    );

    if (
      error.code ===
      'GOOGLE_NOT_CONNECTED' ||
      error.message ===
      'GOOGLE_NOT_CONNECTED'
    ) {
      return {
        ...state,

        toolResult:
          'Your Google Calendar is not connected. Please connect Google Calendar from the Calendar page first.',

        currentTool: null,
      };
    }

    if (
      error.code ===
      'GOOGLE_RECONNECT_REQUIRED' ||
      error.message ===
      'GOOGLE_RECONNECT_REQUIRED'
    ) {
      return {
        ...state,

        toolResult:
          'Your Google Calendar connection needs to be renewed. Please reconnect Google Calendar from the Calendar page.',

        currentTool: null,
      };
    }

    return {
      ...state,

      toolResult:
        'I could not access your Google Calendar right now. Please try again in a moment.',

      currentTool: null,
    };
  }
}

// ============================================================
// CHECK LEAVE REQUEST
// ============================================================

async function validateLeaveRequest(
  state
) {
  try {
    const {
      pendingAction,
    } = state;

    if (
      !pendingAction ||
      pendingAction.type !==
        'leave_request'
    ) {
      return {
        ...state,

        toolResult:
          'No pending leave request to validate.',

        currentTool: null,
      };
    }

    const {
      leave_type,
      start_date,
      end_date,
      number_of_days,
    } =
      pendingAction;

    // Check leave balance.
    const hasBalance =
      await LeaveBalance.checkAvailability(
        state.userId,
        leave_type,
        number_of_days
      );

    if (!hasBalance) {
      return {
        ...state,

        toolResult:
          `Insufficient ${leave_type} leave balance. Please check your current balance or choose different dates.`,

        currentTool: null,

        requiresConfirmation:
          false,
      };
    }

    // Check overlapping leave.
    const overlapping =
      await LeaveRequest.checkOverlappingLeave(
        state.userId,
        start_date,
        end_date
      );

    if (
      overlapping.length > 0
    ) {
      return {
        ...state,

        toolResult:
          'You have overlapping leave requests during this period. Please choose different dates.',

        currentTool: null,

        requiresConfirmation:
          false,
      };
    }

    // Check Google Calendar conflicts.
    let calendarConflicts =
      null;

    try {
      const conflictCheck =
        await googleCalendarService.checkConflicts(
          state.userId,
          start_date,
          end_date
        );

      if (
        conflictCheck.hasConflicts
      ) {
        calendarConflicts =
          conflictCheck.conflicts;

        const conflictDetails =
          conflictCheck.conflicts
            .map(
              (c) =>
                `- ${new Date(
                  c.start
                ).toLocaleString()} to ${new Date(
                  c.end
                ).toLocaleString()}`
            )
            .join('\n');

        return {
          ...state,

          toolResult:
            `You have calendar conflicts during the requested leave period:\n${conflictDetails}\n\nPlease consider rescheduling or contact your manager.`,

          currentTool: null,

          requiresConfirmation:
            false,

          context: {
            ...state.context,

            calendarConflicts,
          },
        };
      }
    } catch (
      calendarError
    ) {
      console.warn(
        'Calendar conflict check failed:',
        calendarError.message
      );
    }

    return {
      ...state,

      toolResult:
        'Leave request validation passed. Ready to submit.',

      currentTool: null,

      requiresConfirmation:
        true,
    };
  } catch (error) {
    console.error(
      'Error validating leave request:',
      error
    );

    return {
      ...state,

      toolResult:
        'Error validating leave request. Please try again later.',

      currentTool: null,

      requiresConfirmation:
        false,
    };
  }
}

// ============================================================
// SUBMIT LEAVE REQUEST
// ============================================================

export async function submitLeaveRequest(
  state
) {
  try {
    const {
      userId,
      pendingAction,
    } = state;

    if (
      !pendingAction ||
      pendingAction.type !==
        'leave_request'
    ) {
      return {
        ...state,

        toolResult:
          'No pending leave request to submit.',

        currentTool: null,
      };
    }

    const {
      leave_type,
      start_date,
      end_date,
      number_of_days,
      reason,
    } =
      pendingAction;

    const leaveRequest =
      await LeaveRequest.create({
        user_id: userId,
        leave_type,
        start_date,
        end_date,
        number_of_days,
        reason,
      });

    return {
      ...state,

      toolResult:
        `Leave request submitted successfully!\n\n` +
        `Request ID: ${leaveRequest.id}\n` +
        `Type: ${leave_type}\n` +
        `Dates: ${start_date} to ${end_date}\n` +
        `Days: ${number_of_days}\n` +
        `Status: Pending HR approval`,

      currentTool: null,

      requiresConfirmation:
        false,

      pendingAction: null,
    };
  } catch (error) {
    console.error(
      'Error submitting leave request:',
      error
    );

    return {
      ...state,

      toolResult:
        'Error submitting leave request. Please try again later.',

      currentTool: null,

      requiresConfirmation:
        false,
    };
  }
}

// ============================================================
// GENERAL RAG QUERY
// ============================================================

async function generalRAGQuery(
  state
) {
  try {
    const {
      messages,
      userId,
      userRole,
    } = state;

    const lastMessage =
      messages[messages.length - 1];

    const ragResult =
      await runRAGWorkflow(
        lastMessage.content,
        userId,
        userRole
      );

    return {
      ...state,

      toolResult:
        ragResult.answer,

      currentTool: null,

      context: {
        ...state.context,

        ragResult,
      },
    };
  } catch (error) {
    console.error(
      'Error in general RAG query:',
      error
    );

    return {
      ...state,

      toolResult:
        'I apologize, but I encountered an error processing your question. Please try again.',

      currentTool: null,
    };
  }
}

// ============================================================
// CLASSIFY USER INTENT
// ============================================================

async function classifyIntent(
  userMessage
) {
  try {
    const prompt = `
Classify the user's intent into exactly ONE of these categories:

1. "leave_balance"
   User wants to check their own leave balance.

2. "leave_policy"
   User wants information about company leave policies.

3. "leave_request"
   User wants to request or apply for leave.

4. "calendar_events"
   User wants to check their Google Calendar, meetings, appointments,
   schedule, events, availability, or upcoming meetings.

5. "calendar_create"
   User wants to CREATE, SCHEDULE, BOOK, or ADD a meeting/event to their calendar.
   This includes phrases like "schedule", "book", "create meeting", "add to calendar", etc.

6. "general"
   Any other question that does not belong to the categories above.

Examples:

"How many leaves do I have?"
=> leave_balance

"What is the annual leave policy?"
=> leave_policy

"I want to take annual leave next Monday"
=> leave_request

"Am I having any meeting?"
=> calendar_events

"Do I have a meeting today?"
=> calendar_events

"What meetings do I have tomorrow?"
=> calendar_events

"What's on my calendar?"
=> calendar_events

"Show my upcoming meetings"
=> calendar_events

"Do I have anything scheduled this week?"
=> calendar_events

"Schedule a meeting tomorrow at 3 PM"
=> calendar_create

"Book a meeting with Rahul next week"
=> calendar_create

"Create a meeting called sprint planning on Monday"
=> calendar_create

"Add a meeting to my calendar"
=> calendar_create

"How do I apply for reimbursement?"
=> general

User message:
"${userMessage}"

Respond with ONLY the category name.
`;

    const response =
      await llm.invoke(
        prompt
      );

    const intent =
      String(
        response.content
      )
        .toLowerCase()
        .trim();

    const validIntents = [
      'leave_balance',
      'leave_policy',
      'leave_request',
      'calendar_events',
      'calendar_create',
      'general',
    ];

    return validIntents.includes(
      intent
    )
      ? intent
      : 'general';
  } catch (error) {
    console.error(
      'Error classifying intent:',
      error
    );

    return 'general';
  }
}

// ============================================================
// EXTRACT LEAVE DETAILS
// ============================================================

async function extractLeaveDetails(
  userMessage
) {
  try {
    const prompt = `
Extract leave request details from the user's message.

If information is missing, return null for that field.

Respond ONLY with valid JSON:

{
  "leave_type": "annual" or "sick" or "personal" or null,
  "start_date": "YYYY-MM-DD" or null,
  "end_date": "YYYY-MM-DD" or null,
  "reason": "leave reason" or null
}

User message:
"${userMessage}"
`;

    const response =
      await llm.invoke(
        prompt
      );

    const content =
      String(
        response.content
      );

    const jsonMatch =
      content.match(
        /\{[\s\S]*\}/
      );

    if (jsonMatch) {
      return JSON.parse(
        jsonMatch[0]
      );
    }

    return null;
  } catch (error) {
    console.error(
      'Error extracting leave details:',
      error
    );

    return null;
  }
}

// ============================================================
// EXTRACT CALENDAR EVENT DETAILS
// ============================================================

async function extractCalendarEventDetails(
  userMessage
) {
  try {
    const prompt = `
Extract calendar event creation details from the user's message.

If information is missing, return null for that field.
For date/time, extract specific times if mentioned (e.g., "3 PM", "2:30 PM").
For dates, convert relative dates like "tomorrow", "next Monday" to actual dates.

Respond ONLY with valid JSON:

{
  "title": "meeting title or subject" or null,
  "date": "YYYY-MM-DD" or null,
  "start_time": "HH:MM" in 24-hour format or null,
  "end_time": "HH:MM" in 24-hour format or null,
  "duration_minutes": estimated duration in minutes or null,
  "description": "meeting description or null,
  "attendees": ["email@example.com"] or null,
  "location": "location or null
}

User message:
"${userMessage}"
`;

    const response =
      await llm.invoke(
        prompt
      );

    const content =
      String(
        response.content
      );

    const jsonMatch =
      content.match(
        /\{[\s\S]*\}/
      );

    if (jsonMatch) {
      return JSON.parse(
        jsonMatch[0]
      );
    }

    return null;
  } catch (error) {
    console.error(
      'Error extracting calendar event details:',
      error
    );

    return null;
  }
}

// ============================================================
// PARSE RELATIVE DATE
// ============================================================

function parseRelativeDate(
  userMessage
) {
  const message =
    userMessage.toLowerCase();
  const today = new Date();

  if (message.includes('today')) {
    return today.toISOString().split('T')[0];
  }

  if (message.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  if (message.includes('next monday')) {
    const nextMonday = new Date(today);
    const day = nextMonday.getDay();
    const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  }

  if (message.includes('next tuesday')) {
    const nextTuesday = new Date(today);
    const day = nextTuesday.getDay();
    const daysUntilTuesday = day === 0 ? 2 : (9 - day) % 7;
    nextTuesday.setDate(nextTuesday.getDate() + daysUntilTuesday);
    return nextTuesday.toISOString().split('T')[0];
  }

  if (message.includes('next wednesday')) {
    const nextWednesday = new Date(today);
    const day = nextWednesday.getDay();
    const daysUntilWednesday = day === 0 ? 3 : (10 - day) % 7;
    nextWednesday.setDate(nextWednesday.getDate() + daysUntilWednesday);
    return nextWednesday.toISOString().split('T')[0];
  }

  if (message.includes('next thursday')) {
    const nextThursday = new Date(today);
    const day = nextThursday.getDay();
    const daysUntilThursday = day === 0 ? 4 : (11 - day) % 7;
    nextThursday.setDate(nextThursday.getDate() + daysUntilThursday);
    return nextThursday.toISOString().split('T')[0];
  }

  if (message.includes('next friday')) {
    const nextFriday = new Date(today);
    const day = nextFriday.getDay();
    const daysUntilFriday = day === 0 ? 5 : (12 - day) % 7;
    nextFriday.setDate(nextFriday.getDate() + daysUntilFriday);
    return nextFriday.toISOString().split('T')[0];
  }

  // Default to today if no relative date found
  return today.toISOString().split('T')[0];
}

// ============================================================
// PARSE TIME
// ============================================================

function parseTime(
  timeString
) {
  if (!timeString) return null;

  const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const meridiem = timeMatch[3]?.toLowerCase();

    if (meridiem === 'pm' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Try parsing formats like "3 PM", "3:30 PM"
  const simpleMatch = timeString.match(/(\d{1,2})\s*(am|pm)/i);
  if (simpleMatch) {
    let hours = parseInt(simpleMatch[1]);
    const meridiem = simpleMatch[2].toLowerCase();

    if (meridiem === 'pm' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:00`;
  }

  return null;
}

// ============================================================
// VALIDATE CALENDAR EVENT
// ============================================================

async function validateCalendarEvent(
  state
) {
  try {
    const {
      pendingAction,
    } = state;

    if (
      !pendingAction ||
      pendingAction.type !==
        'calendar_create'
    ) {
      return {
        ...state,

        toolResult:
          'No pending calendar event to validate.',

        currentTool: null,
      };
    }

    const {
      title,
      date,
      start_time,
      end_time,
      duration_minutes,
    } =
      pendingAction;

    // Check required fields
    if (!title) {
      return {
        ...state,

        toolResult:
          'I need a title for the meeting. What would you like to call this meeting?',

        currentTool: null,

        requiresConfirmation:
          false,

        missingField: 'title',
      };
    }

    if (!date) {
      return {
        ...state,

        toolResult:
          'I need to know when you want to schedule this meeting. What date would work for you?',

        currentTool: null,

        requiresConfirmation:
          false,

        missingField: 'date',
      };
    }

    if (!start_time) {
      return {
        ...state,

        toolResult:
          'I need to know what time you want to schedule this meeting. What time works for you?',

        currentTool: null,

        requiresConfirmation:
          false,

        missingField: 'time',
      };
    }

    // Calculate end time if not provided
    let finalEndTime = end_time;
    if (!finalEndTime && duration_minutes) {
      const startDateTime = new Date(`${date}T${start_time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + duration_minutes * 60000);
      finalEndTime = endDateTime.toTimeString().slice(0, 5);
    } else if (!finalEndTime && !duration_minutes) {
      // Default to 1 hour
      const startDateTime = new Date(`${date}T${start_time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60000);
      finalEndTime = endDateTime.toTimeString().slice(0, 5);
    }

    // Check for calendar conflicts
    let calendarConflicts = null;

    try {
      const conflictCheck =
        await googleCalendarService.checkConflicts(
          state.userId,
          date,
          date
        );

      if (
        conflictCheck.hasConflicts
      ) {
        calendarConflicts =
          conflictCheck.conflicts;

        const conflictDetails =
          conflictCheck.conflicts
            .map(
              (c) =>
                `- ${new Date(
                  c.start
                ).toLocaleString()} to ${new Date(
                  c.end
                ).toLocaleString()}`
            )
            .join('\n');

        return {
          ...state,

          toolResult:
            `You have calendar conflicts during the requested time:\n${conflictDetails}\n\nWould you like to schedule this meeting anyway, or would you prefer a different time?`,

          currentTool: null,

          requiresConfirmation:
            true,

          hasConflicts: true,

          context: {
            ...state.context,

            calendarConflicts,
          },
        };
      }
    } catch (
      calendarError
    ) {
      console.warn(
        'Calendar conflict check failed:',
        calendarError.message
      );
    }

    // Update pending action with calculated end time
    state.pendingAction.end_time = finalEndTime;

    return {
      ...state,

      toolResult:
        'Calendar event validation passed. Ready to schedule.',

      currentTool: null,

      requiresConfirmation:
        true,

      hasConflicts: false,
    };
  } catch (error) {
    console.error(
      'Error validating calendar event:',
      error
    );

    return {
      ...state,

      toolResult:
        'Error validating calendar event. Please try again later.',

      currentTool: null,

      requiresConfirmation:
        false,
    };
  }
}

// ============================================================
// CREATE CALENDAR EVENT
// ============================================================

export async function createCalendarEvent(
  state
) {
  try {
    const {
      userId,
      pendingAction,
    } = state;

    if (
      !pendingAction ||
      pendingAction.type !==
        'calendar_create'
    ) {
      return {
        ...state,

        toolResult:
          'No pending calendar event to create.',

        currentTool: null,
      };
    }

    const {
      title,
      date,
      start_time,
      end_time,
      description,
      location,
    } =
      pendingAction;

    // Construct Google Calendar event object
    const eventData = {
      summary: title,
      start: {
        dateTime: `${date}T${start_time}:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: `${date}T${end_time}:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    if (description) {
      eventData.description = description;
    }

    if (location) {
      eventData.location = location;
    }

    // Create the event
    const event =
      await googleCalendarService.createEvent(
        userId,
        eventData
      );

    return {
      ...state,

      toolResult:
        `Done — I scheduled "${title}" for ${new Date(date).toLocaleDateString()} from ${start_time} to ${end_time}.`,

      currentTool: null,

      requiresConfirmation:
        false,

      pendingAction: null,

      context: {
        ...state.context,

        createdEvent: event,
      },
    };
  } catch (error) {
    console.error(
      'Error creating calendar event:',
      error
    );

    if (
      error.code ===
      'GOOGLE_NOT_CONNECTED' ||
      error.message ===
      'GOOGLE_NOT_CONNECTED'
    ) {
      return {
        ...state,

        toolResult:
          'Your Google Calendar is not connected. Please connect Google Calendar from the Calendar page first.',

        currentTool: null,

        requiresConfirmation:
        false,
      };
    }

    return {
      ...state,

      toolResult:
        'Error creating calendar event. Please try again later.',

      currentTool: null,

      requiresConfirmation:
        false,
    };
  }
}

// ============================================================
// MAIN WORKFLOW
// ============================================================

export async function runLangGraphWorkflow(
  userMessage,
  userId,
  userRole,
  actionId = null,
  isConfirmed = false
) {
  try {
    // --------------------------------------------------------
    // 1. VALIDATE USER INPUT
    // --------------------------------------------------------

    const sanitizedInput =
      validateUserInput(
        userMessage
      );

    // --------------------------------------------------------
    // 2. INITIALIZE STATE
    // --------------------------------------------------------

    let state = {
      messages: [
        {
          role: 'user',
          content: sanitizedInput,
        },
      ],

      userId,

      userRole,

      currentTool: null,

      toolResult: null,

      requiresConfirmation:
        false,

      pendingAction: null,

      context: {},
    };

    // --------------------------------------------------------
    // 3. HANDLE CONFIRMED ACTION EXECUTION
    // --------------------------------------------------------

    if (isConfirmed && actionId) {
      // Directly execute the confirmed action
      if (actionId.startsWith('calendar_create_')) {
        state = await createCalendarEvent(state);
      } else if (actionId.startsWith('leave_request_')) {
        state = await submitLeaveRequest(state);
      } else {
        state.toolResult = 'I apologize, but I could not recognize the action to execute.';
      }

      const validatedOutput = validateAIOutput(state.toolResult);

      return {
        response: validatedOutput,
        sources: state.context?.ragResult?.sources || [],
        requiresConfirmation: false,
        pendingAction: null,
        error: null,
      };
    }

    // --------------------------------------------------------
    // 4. CLASSIFY INTENT
    // --------------------------------------------------------

    const intent =
      await classifyIntent(
        sanitizedInput
      );

    console.log(
      'Copilot intent:',
      intent
    );

    // --------------------------------------------------------
    // 5. ROUTE TO TOOL
    // --------------------------------------------------------

    switch (intent) {
      // ------------------------------------------------------
      // LEAVE BALANCE
      // ------------------------------------------------------

      case 'leave_balance':
        state =
          await queryLeaveBalance(
            state
          );
        break;

      // ------------------------------------------------------
      // LEAVE POLICY
      // ------------------------------------------------------

      case 'leave_policy':
        state =
          await checkLeavePolicy(
            state
          );
        break;

      // ------------------------------------------------------
      // CALENDAR EVENTS (READ-ONLY)
      // ------------------------------------------------------

      case 'calendar_events':
        state =
          await queryCalendarEvents(
            state
          );
        break;

      // ------------------------------------------------------
      // CALENDAR CREATE (ACTION WITH CONFIRMATION)
      // ------------------------------------------------------

      case 'calendar_create': {
        const eventDetails =
          await extractCalendarEventDetails(
            sanitizedInput
          );

        // Parse relative dates if needed
        if (
          eventDetails &&
          !eventDetails.date
        ) {
          eventDetails.date =
            parseRelativeDate(
              sanitizedInput
            );
        }

        // Parse times if needed
        if (
          eventDetails &&
          eventDetails.start_time
        ) {
          eventDetails.start_time =
            parseTime(
              eventDetails.start_time
            );
        }

        if (
          eventDetails &&
          eventDetails.end_time
        ) {
          eventDetails.end_time =
            parseTime(
              eventDetails.end_time
            );
        }

        if (
          !eventDetails ||
          !eventDetails.title
        ) {
          state.toolResult =
            'I can help you schedule a meeting. Please provide:\n' +
            '- Meeting title\n' +
            '- Date (e.g., "tomorrow", "next Monday")\n' +
            '- Time (e.g., "3 PM", "2:30 PM")\n\n' +
            'Example: "Schedule a meeting called Sprint Planning tomorrow at 3 PM"';

          state.currentTool =
            null;
        } else {
          state.pendingAction = {
            type: 'calendar_create',
            actionId: `calendar_create_${Date.now()}`,
            ...eventDetails,
          };

          state =
            await validateCalendarEvent(
              state
            );

          if (
            state.requiresConfirmation
          ) {
            const {
              title,
              date,
              start_time,
              end_time,
              location,
              description,
            } =
              state.pendingAction;

            const formattedDate =
              new Date(
                date
              ).toLocaleDateString(
                'en-US',
                {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                }
              );

            let confirmationText =
              `I'm ready to schedule this meeting:\n\n` +
              `**Title:** ${title}\n` +
              `**Date:** ${formattedDate}\n` +
              `**Time:** ${start_time} - ${end_time}\n`;

            if (location) {
              confirmationText +=
                `**Location:** ${location}\n`;
            }

            if (description) {
              confirmationText +=
                `**Description:** ${description}\n`;
            }

            if (
              state.hasConflicts
            ) {
              confirmationText +=
                `\n⚠️ **Note:** You have calendar conflicts during this time.`;
            } else {
              confirmationText +=
                `\n✅ No conflicts detected.`;
            }

            confirmationText +=
              `\n\nWould you like me to schedule this meeting?`;

            state.toolResult =
              confirmationText;
          } else if (
            state.missingField
          ) {
            // Missing field already handled in validation
            state.toolResult +=
              `\n\nPlease provide the ${state.missingField} and I'll help you schedule the meeting.`;
          }
        }

        break;
      }

      // ------------------------------------------------------
      // LEAVE REQUEST
      // ------------------------------------------------------

      case 'leave_request': {
        const leaveDetails =
          await extractLeaveDetails(
            sanitizedInput
          );

        if (
          !leaveDetails ||
          !leaveDetails.leave_type ||
          !leaveDetails.start_date ||
          !leaveDetails.end_date
        ) {
          state.toolResult =
            `To request leave, please provide:

- Type of leave (annual, sick, or personal)
- Start date (YYYY-MM-DD)
- End date (YYYY-MM-DD)
- Reason (optional)

Example:
"I want to request annual leave from 2026-09-01 to 2026-09-05 for vacation"`;

          state.currentTool =
            null;
        } else {
          const numberOfDays =
            await LeaveRequest.calculateDays(
              leaveDetails.start_date,
              leaveDetails.end_date
            );

          state.pendingAction = {
            type: 'leave_request',
            actionId: `leave_request_${Date.now()}`,
            ...leaveDetails,

            number_of_days:
              numberOfDays,
          };

          state =
            await validateLeaveRequest(
              state
            );

          if (
            state.requiresConfirmation
          ) {
            state.toolResult +=
              `\n\nPlease confirm: Do you want to submit this leave request?\n` +
              `- Type: ${leaveDetails.leave_type}\n` +
              `- Dates: ${leaveDetails.start_date} to ${leaveDetails.end_date}\n` +
              `- Days: ${numberOfDays}\n` +
              `- Reason: ${
                leaveDetails.reason ||
                'Not specified'
              }\n\n` +
              `Reply "yes" to confirm or "no" to cancel.`;
          }
        }

        break;
      }

      // ------------------------------------------------------
      // GENERAL
      // ------------------------------------------------------

      case 'general':
      default:
        state =
          await generalRAGQuery(
            state
          );
        break;
    }

    // --------------------------------------------------------
    // 6. VALIDATE OUTPUT
    // --------------------------------------------------------

    const validatedOutput =
      validateAIOutput(
        state.toolResult
      );

    // --------------------------------------------------------
    // 7. RETURN RESULT WITH STRUCTURED METADATA
    // --------------------------------------------------------

    return {
      response:
        validatedOutput,

      sources:
        state.context
          ?.ragResult
          ?.sources || [],

      requiresConfirmation:
        state.requiresConfirmation,

      pendingAction:
        state.pendingAction,

      actionMetadata: state.requiresConfirmation ? {
        actionId: state.pendingAction?.actionId,
        actionType: state.pendingAction?.type,
        title: state.pendingAction?.title || state.pendingAction?.leave_type,
        date: state.pendingAction?.date || state.pendingAction?.start_date,
        time: state.pendingAction?.start_time,
        hasConflicts: state.hasConflicts || false,
        conflictDetails: state.context?.calendarConflicts || null,
      } : null,

      error: null,
    };
  } catch (error) {
    console.error(
      'Error in LangGraph workflow:',
      error
    );

    return {
      response:
        'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',

      sources: [],

      requiresConfirmation:
        false,

      pendingAction: null,

      actionMetadata: null,

      error:
        error.message,
    };
  }
}