import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

import { runRAGWorkflow } from './ragGraph.js';

import { LeaveBalance } from '../models/LeaveBalance.js';
import { LeaveRequest } from '../models/LeaveRequest.js';

import { config } from '../config/index.js';

import googleCalendarService from '../services/googleCalendarService.js';
import gmailService from '../services/gmailService.js';
import conversationStateService, { WORKFLOW_STEPS, CALENDAR_STATUS } from '../services/conversationStateService.js';
import leaveWorkflowService from '../services/leaveWorkflowService.js';
import loggingService from '../services/loggingService.js';

import tavilyTool from './tools/tavilyTool.js';

// Re-export for use in this file
const { IDLE, COLLECTING_DETAILS, VALIDATING, CALENDAR_CHECK, READY_FOR_CONFIRMATION, CONFIRMED, SUBMITTED, CANCELLED } = WORKFLOW_STEPS;

// ============================================================
// GEMINI
// ============================================================

const llm = new ChatGoogleGenerativeAI({
  apiKey: config.geminiApiKey,
  model: config.geminiModel,
  temperature: 0.2,
  maxOutputTokens: 2048,
});

// ============================================================
// CONSTANTS
// ============================================================

const VALID_INTENTS = [
  'leave_balance',
  'leave_policy',
  'leave_request',
  'calendar_events',
  'calendar_create',
  'gmail_read',
  'gmail_send',
  'web_search',
  'general',
];

const ACTION_TYPES = [
  'leave_request',
  'calendar_create',
  'gmail_send',
];

// ============================================================
// INPUT GUARDRAILS
// ============================================================

export function validateUserInput(input) {
  if (
    typeof input !== 'string' ||
    !input.trim()
  ) {
    throw new Error(
      'Please enter a valid message.'
    );
  }

  const trimmed = input.trim();

  if (trimmed.length > 4000) {
    throw new Error(
      'Your message is too long. Please keep it under 4000 characters.'
    );
  }

  // Prompt injection patterns.
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /ignore\s+(all\s+)?system\s+instructions/i,
    /forget\s+(your\s+)?instructions/i,
    /override\s+(the\s+)?system/i,
    /reveal\s+(your\s+)?system\s+prompt/i,
    /show\s+(me\s+)?your\s+system\s+prompt/i,
    /reveal\s+(the\s+)?api\s*key/i,
    /reveal\s+(the\s+)?password/i,
    /reveal\s+(the\s+)?secret/i,
    /bypass\s+authentication/i,
    /bypass\s+authorization/i,
    /execute\s+arbitrary\s+command/i,
    /<script[\s\S]*?>/i,
    /javascript\s*:/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(trimmed)) {
      throw new Error(
        'I can’t help with bypassing security controls or exposing private system information.'
      );
    }
  }

  return trimmed;
}

// ============================================================
// OUTPUT GUARDRAILS
// ============================================================

export function validateAIOutput(output) {
  if (
    typeof output !== 'string' ||
    !output.trim()
  ) {
    return 'I was unable to generate a response. Please try again.';
  }

  let cleaned = output.trim();

  if (cleaned.length > 12000) {
    cleaned = cleaned.substring(0, 12000);
  }

  const leakagePatterns = [
    /(?:api[_ -]?key|secret|password|access[_ -]?token)\s*[:=]\s*\S+/i,
    /process\.env\.[A-Z0-9_]+/i,
    /BEGIN\s+(?:RSA|OPENSSH|PRIVATE)\s+KEY/i,
  ];

  for (const pattern of leakagePatterns) {
    if (pattern.test(cleaned)) {
      return 'I can’t provide private system credentials or internal secrets.';
    }
  }

  return cleaned;
}

// ============================================================
// SAFE JSON EXTRACTION
// ============================================================

function extractJSON(content) {
  if (!content) {
    return null;
  }

  const text = String(content)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(
      /\{[\s\S]*\}/
    );

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

// ============================================================
// DATE HELPERS
// ============================================================

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDateLocal(date) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
}

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

function addDays(date, days) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + days
  );

  return result;
}

// ============================================================
// VAGUE CONFIRMATION DETECTOR
// ============================================================

function isVagueConfirmation(message) {
  const text = String(message || '').trim().toLowerCase();
  
  const confirmations = [
    'yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'alright', 
    'do it', 'submit', 'confirm', 'go ahead', 'proceed', 'continue'
  ];
  
  const cancellations = [
    'no', 'nope', 'cancel', 'stop', 'never mind', 'forget it', 'dont'
  ];
  
  for (const confirmation of confirmations) {
    if (text === confirmation || text.startsWith(confirmation + ' ') || text.endsWith(' ' + confirmation)) {
      return 'confirm';
    }
  }
  
  for (const cancellation of cancellations) {
    if (text === cancellation || text.startsWith(cancellation + ' ') || text.endsWith(' ' + cancellation)) {
      return 'cancel';
    }
  }
  
  return null;
}

// ============================================================
// RELATIVE DATE PARSER
// ============================================================

function parseRelativeDate(message) {
  const text = String(message || '')
    .toLowerCase();

  const today = new Date();

  if (text.includes('today')) {
    return formatDateLocal(today);
  }

  if (text.includes('tomorrow')) {
    return formatDateLocal(
      addDays(today, 1)
    );
  }

  const weekdays = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  for (const [name, targetDay] of Object.entries(
    weekdays
  )) {
    if (
      text.includes(`next ${name}`)
    ) {
      const currentDay =
        today.getDay();

      let diff =
        targetDay - currentDay;

      if (diff <= 0) {
        diff += 7;
      }

      return formatDateLocal(
        addDays(today, diff)
      );
    }
  }

  return formatDateLocal(today);
}

// ============================================================
// CALENDAR RANGE
// ============================================================

function getCalendarDateRange(
  userMessage
) {
  const message =
    String(userMessage || '')
      .toLowerCase();

  const today = new Date();

  // ----------------------------
  // Specific date
  // ----------------------------

  const isoMatch =
    message.match(
      /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/
    );

  if (isoMatch) {
    const date = new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    );

    return {
      startDate:
        getStartOfDay(date),
      endDate:
        getEndOfDay(date),
      label:
        formatDateLocal(date),
    };
  }

  // ----------------------------
  // Today
  // ----------------------------

  if (
    message.includes('today')
  ) {
    return {
      startDate:
        getStartOfDay(today),
      endDate:
        getEndOfDay(today),
      label: 'today',
    };
  }

  // ----------------------------
  // Tomorrow
  // ----------------------------

  if (
    message.includes('tomorrow')
  ) {
    const tomorrow =
      addDays(today, 1);

    return {
      startDate:
        getStartOfDay(tomorrow),
      endDate:
        getEndOfDay(tomorrow),
      label: 'tomorrow',
    };
  }

  // ----------------------------
  // Next week
  // IMPORTANT:
  // Must come BEFORE generic "week".
  // ----------------------------

  if (
    message.includes('next week')
  ) {
    const day =
      today.getDay();

    const daysUntilNextMonday =
      day === 0
        ? 1
        : 8 - day;

    const start =
      addDays(
        today,
        daysUntilNextMonday
      );

    const end =
      addDays(start, 6);

    return {
      startDate:
        getStartOfDay(start),
      endDate:
        getEndOfDay(end),
      label: 'next week',
    };
  }

  // ----------------------------
  // This week
  // ----------------------------

  if (
    message.includes('this week') ||
    message === 'week' ||
    message.includes('this weeks')
  ) {
    const currentDay =
      today.getDay();

    const daysFromMonday =
      currentDay === 0
        ? 6
        : currentDay - 1;

    const start =
      addDays(
        today,
        -daysFromMonday
      );

    const end =
      addDays(start, 6);

    return {
      startDate:
        getStartOfDay(start),
      endDate:
        getEndOfDay(end),
      label: 'this week',
    };
  }

  // ----------------------------
  // This month
  // ----------------------------

  if (
    message.includes('this month')
  ) {
    const start =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

    const end =
      new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      );

    return {
      startDate:
        getStartOfDay(start),
      endDate:
        getEndOfDay(end),
      label: 'this month',
    };
  }

  // ----------------------------
  // Upcoming
  // ----------------------------

  if (
    message.includes('upcoming') ||
    message.includes('future') ||
    message.includes('next meetings')
  ) {
    const end =
      addDays(today, 30);

    return {
      startDate:
        new Date(),
      endDate:
        getEndOfDay(end),
      label: 'upcoming',
    };
  }

  // ----------------------------
  // Next N days
  // ----------------------------

  const nextDaysMatch =
    message.match(/next\s+(\d+)\s+days?/i);

  if (nextDaysMatch) {
    const days =
      Number(nextDaysMatch[1]);

    if (days > 0 && days <= 365) {
      const end =
        addDays(today, days);

      return {
        startDate:
          new Date(),
        endDate:
          getEndOfDay(end),
        label: `next ${days} days`,
      };
    }
  }

  // ----------------------------
  // Specific time check
  // ----------------------------

  const timeMatch =
    message.match(/(?:am\s+I|am\s+i)\s+(?:free|available)\s+(?:on|at)\s+(.+?)(?:\s+(?:at|@)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)?$/i);

  if (timeMatch) {
    const datePart =
      timeMatch[1].trim();

    const timePart =
      timeMatch[2]?.trim() || null;

    // Parse the date
    let targetDate;

    if (datePart.toLowerCase() === 'today') {
      targetDate = today;
    } else if (datePart.toLowerCase() === 'tomorrow') {
      targetDate = addDays(today, 1);
    } else {
      // Try to parse as a specific date
      const dateObj =
        new Date(datePart);

      if (!Number.isNaN(dateObj.getTime())) {
        targetDate = dateObj;
      } else {
        // Default to today if date parsing fails
        targetDate = today;
      }
    }

    if (timePart) {
      // If specific time is mentioned, check availability at that time
      const parsedTime =
        parseTime(timePart);

      if (parsedTime) {
        const [hours, minutes] =
          parsedTime.split(':').map(Number);

        const startCheck =
          new Date(targetDate);

        startCheck.setHours(hours, minutes, 0, 0);

        const endCheck =
          new Date(startCheck);

        endCheck.setHours(hours + 1, minutes, 0, 0);

        return {
          startDate: startCheck,
          endDate: endCheck,
          label: `availability check at ${parsedTime}`,
        };
      }
    }

    // Check availability for the entire day
    return {
      startDate:
        getStartOfDay(targetDate),
      endDate:
        getEndOfDay(targetDate),
      label: 'availability check',
    };
  }

  // ----------------------------
  // Default
  // ----------------------------

  return {
    startDate:
      getStartOfDay(today),
    endDate:
      getEndOfDay(today),
    label: 'today',
  };
}

// ============================================================
// TIME PARSER
// ============================================================

function parseTime(value) {
  if (!value) {
    return null;
  }

  const text =
    String(value)
      .trim()
      .toLowerCase();

  const match =
    text.match(
      /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/
    );

  if (!match) {
    return null;
  }

  let hours =
    Number(match[1]);

  const minutes =
    Number(match[2] || 0);

  const meridiem =
    match[3];

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  if (meridiem === 'pm' && hours < 12) {
    hours += 12;
  }

  if (meridiem === 'am' && hours === 12) {
    hours = 0;
  }

  return `${pad(hours)}:${pad(minutes)}`;
}

// ============================================================
// CALENDAR EVENT FORMATTER
// ============================================================

function formatCalendarEvent(event) {
  const title =
    event.summary ||
    'Untitled event';

  if (event.start?.date) {
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

  const start =
    event.start?.dateTime
      ? new Date(
          event.start.dateTime
        )
      : null;

  const end =
    event.end?.dateTime
      ? new Date(
          event.end.dateTime
        )
      : null;

  return {
    title,
    allDay: false,
    start:
      start
        ? start.toISOString()
        : null,
    end:
      end
        ? end.toISOString()
        : null,
    location:
      event.location || null,
    description:
      event.description || null,
    htmlLink:
      event.htmlLink || null,
  };
}

function formatEventTime(event) {
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

  const formatter =
    new Intl.DateTimeFormat(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }
    );

  const startText =
    formatter.format(start);

  if (!end) {
    return startText;
  }

  const endFormatter =
    new Intl.DateTimeFormat(
      'en-IN',
      {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }
    );

  return `${startText} - ${endFormatter.format(
    end
  )}`;
}

// ============================================================
// LEAVE BALANCE
// ============================================================

async function queryLeaveBalance(
  state
) {
  try {
    const balance =
      await LeaveBalance.findByUserId(
        state.userId
      );

    if (!balance) {
      return {
        ...state,
        toolResult:
          'I could not retrieve your leave balance. Please contact HR.',
      };
    }

    return {
      ...state,

      toolResult:
        `Here is your current leave balance:\n\n` +
        `• Annual Leave: ${balance.annual_leave} days\n` +
        `• Sick Leave: ${balance.sick_leave} days\n` +
        `• Personal Leave: ${balance.personal_leave} days`,

      context: {
        ...state.context,
        leaveBalance: balance,
      },

      currentTool: null,
    };
  } catch (error) {
    console.error(
      '[LeaveBalance]',
      error
    );

    return {
      ...state,
      toolResult:
        'I could not retrieve your leave balance right now. Please try again.',
      currentTool: null,
    };
  }
}

// ============================================================
// LEAVE POLICY → RAG
// ============================================================

async function checkLeavePolicy(
  state
) {
  try {
    const message =
      state.messages[
        state.messages.length - 1
      ].content;

    const ragResult =
      await runRAGWorkflow(
        message,
        state.userId,
        state.userRole
      );

    return {
      ...state,

      toolResult:
        ragResult.answer,

      context: {
        ...state.context,

        ragResult,

        policyInfo:
          ragResult,
      },

      currentTool: null,
    };
  } catch (error) {
    console.error(
      '[LeavePolicy]',
      error
    );

    return {
      ...state,

      toolResult:
        'I could not retrieve the leave policy right now. Please try again.',

      currentTool: null,
    };
  }
}

// ============================================================
// CALENDAR EVENTS
// ============================================================

async function queryCalendarEvents(
  state
) {
  try {
    const message =
      state.messages[
        state.messages.length - 1
      ].content;

    const {
      startDate,
      endDate,
      label,
    } =
      getCalendarDateRange(
        message
      );

    console.log(
      '[Calendar]',
      {
        label,
        startDate,
        endDate,
      }
    );

    const events =
      await googleCalendarService.getEvents(
        state.userId,
        startDate,
        endDate
      );

    const activeEvents =
      Array.isArray(events)
        ? events.filter(
            event =>
              event.status !==
              'cancelled'
          )
        : [];

    const formattedEvents =
      activeEvents.map(
        formatCalendarEvent
      );

    if (
      formattedEvents.length === 0
    ) {
      return {
        ...state,

        toolResult:
          getNoCalendarEventsMessage(
            label
          ),

        context: {
          ...state.context,

          calendarEvents: [],

          calendarRange: {
            startDate,
            endDate,
            label,
          },
        },

        currentTool: null,
      };
    }

    // Special handling for availability check
    if (label === 'availability check' || label.startsWith('availability check at')) {
      const eventCount = formattedEvents.length;

      if (eventCount === 0) {
        return {
          ...state,

          toolResult:
            'Yes, you are free during that time! No calendar events found.',

          context: {
            ...state.context,

            calendarEvents: [],

            calendarRange: {
              startDate,
              endDate,
              label,
            },
          },

          currentTool: null,
        };
      } else {
        const lines =
          formattedEvents.map(
            (event, index) => {
              let line =
                `${index + 1}. **${event.title}**\n` +
                `   ${formatEventTime(
                  event
                )}`;

              if (event.location) {
                line +=
                  `\n   Location: ${event.location}`;
              }

              return line;
            }
          );

        return {
          ...state,

          toolResult:
            `No, you are not free. You have ${eventCount} calendar event${
              eventCount === 1
                ? ''
                : 's'
            } during that time:\n\n` +
            lines.join('\n\n'),

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

          currentTool: null,
        };
      }
    }

    const lines =
      formattedEvents.map(
        (event, index) => {
          let line =
            `${index + 1}. **${event.title}**\n` +
            `   ${formatEventTime(
              event
            )}`;

          if (event.location) {
            line +=
              `\n   Location: ${event.location}`;
          }

          return line;
        }
      );

    return {
      ...state,

      toolResult:
        `You have ${formattedEvents.length} calendar event${
          formattedEvents.length === 1
            ? ''
            : 's'
        } ${label}:\n\n` +
        lines.join('\n\n'),

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

      currentTool: null,
    };
  } catch (error) {
    console.error(
      '[Calendar]',
      error
    );

    if (
      error.code ===
        'GOOGLE_CALENDAR_NOT_CONNECTED' ||
      error.message ===
        'GOOGLE_CALENDAR_NOT_CONNECTED'
    ) {
      return {
        ...state,

        toolResult:
          'Your Google Calendar is not connected. Please connect it from the Calendar page first.',

        currentTool: null,
      };
    }

    if (
      error.code ===
        'GOOGLE_CALENDAR_RECONNECT_REQUIRED' ||
      error.message ===
        'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
    ) {
      return {
        ...state,

        toolResult:
          'Your Google Calendar connection needs to be renewed. Please reconnect it from the Calendar page.',

        currentTool: null,
      };
    }

    return {
      ...state,

      toolResult:
        'I could not access your Google Calendar right now. Please try again.',

      currentTool: null,
    };
  }
}

function getNoCalendarEventsMessage(
  label
) {
  switch (label) {
    case 'today':
      return "You don't have any meetings or calendar events today.";

    case 'tomorrow':
      return "You don't have any meetings or calendar events tomorrow.";

    case 'this week':
      return "You don't have any meetings or calendar events this week.";

    case 'next week':
      return "You don't have any meetings or calendar events next week.";

    case 'this month':
      return "You don't have any meetings or calendar events this month.";

    case 'upcoming':
      return "You don't have any upcoming calendar events in the next 30 days.";

    case 'availability check':
      return "You have no calendar events during the specified time - you appear to be free.";

    default:
      if (label.startsWith('next ') && label.includes(' days')) {
        return `You don't have any calendar events in the ${label}.`;
      }
      return "I couldn't find any upcoming calendar events.";
  }
}

// ============================================================
// LEAVE DETAILS
// ============================================================

async function extractLeaveDetails(
  userMessage
) {
  try {
    const prompt = `
You are extracting structured leave information.

Return ONLY valid JSON.

{
  "leave_type": "annual" | "sick" | "personal" | null,
  "start_date": "YYYY-MM-DD" | null,
  "end_date": "YYYY-MM-DD" | null,
  "reason": "string" | null
}

Rules:
- Convert today/tomorrow/next Monday etc. into actual dates.
- Never invent a missing date.
- If only one date is provided, use it for start_date and end_date.
- Do not add information not present in the user's request.

User:
${userMessage}
`;

    const response =
      await llm.invoke(prompt);

    return extractJSON(
      response.content
    );
  } catch (error) {
    console.error(
      '[LeaveExtraction]',
      error
    );

    return null;
  }
}

// ============================================================
// CALCULATE LEAVE DAYS
// ============================================================

async function calculateLeaveDays(
  startDate,
  endDate
) {
  const days =
    await LeaveRequest.calculateDays(
      startDate,
      endDate
    );

  return Number(days);
}

// ============================================================
// VALIDATE LEAVE REQUEST
// ============================================================

async function validateLeaveRequest(
  state
) {
  try {
    const action =
      state.pendingAction;

    if (
      !action ||
      action.type !==
        'leave_request'
    ) {
      return {
        ...state,

        toolResult:
          'There is no pending leave request to validate.',

        requiresConfirmation:
          false,
      };
    }

    const {
      leave_type,
      start_date,
      end_date,
      number_of_days,
    } = action;

    if (
      !leave_type ||
      !start_date ||
      !end_date
    ) {
      return {
        ...state,

        toolResult:
          'I need the leave type and complete start/end dates before I can submit the request.',

        requiresConfirmation:
          false,
      };
    }

    if (
      number_of_days <= 0
    ) {
      return {
        ...state,

        toolResult:
          'The requested leave duration is invalid.',

        requiresConfirmation:
          false,
      };
    }

    // --------------------------------------------------------
    // Balance
    // --------------------------------------------------------

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
          `You don't have enough ${leave_type} leave balance for ${number_of_days} day(s).`,

        requiresConfirmation:
          false,

        pendingAction:
          null,
      };
    }

    // --------------------------------------------------------
    // Existing leave
    // --------------------------------------------------------

    const overlapping =
      await LeaveRequest.checkOverlappingLeave(
        state.userId,
        start_date,
        end_date
      );

    if (
      overlapping?.length > 0
    ) {
      return {
        ...state,

        toolResult:
          'You already have a leave request overlapping these dates.',

        requiresConfirmation:
          false,

        pendingAction:
          null,
      };
    }

    // --------------------------------------------------------
    // Calendar conflict
    // --------------------------------------------------------

    try {
      const conflictCheck =
        await googleCalendarService.checkConflicts(
          state.userId,
          start_date,
          end_date
        );

      if (
        conflictCheck?.hasConflicts
      ) {
        return {
          ...state,

          toolResult:
            'There are calendar events during this leave period. Please review the conflicts before submitting the leave request.',

          requiresConfirmation:
            false,

          context: {
            ...state.context,

            calendarConflicts:
              conflictCheck.conflicts,
          },
        };
      }
    } catch (error) {
      console.warn(
        '[Leave] Calendar conflict check failed:',
        error.message
      );

      // Calendar conflict checking should not
      // prevent leave submission if Calendar itself
      // is unavailable.
    }

    return {
      ...state,

      toolResult:
        'Your leave request has passed validation and is ready for confirmation.',

      requiresConfirmation:
        true,
    };
  } catch (error) {
    console.error(
      '[LeaveValidation]',
      error
    );

    return {
      ...state,

      toolResult:
        'I could not validate the leave request right now.',

      requiresConfirmation:
        false,
    };
  }
}

// ============================================================
// SUBMIT LEAVE
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
          'There is no pending leave request to submit.',

        requiresConfirmation:
          false,

        pendingAction:
          null,
      };
    }

    const {
      leave_type,
      start_date,
      end_date,
      number_of_days,
      reason,
    } = pendingAction;

    // --------------------------------------------------------
    // Revalidate balance immediately before mutation.
    // --------------------------------------------------------

    const hasBalance =
      await LeaveBalance.checkAvailability(
        userId,
        leave_type,
        number_of_days
      );

    if (!hasBalance) {
      return {
        ...state,

        toolResult:
          `Your ${leave_type} leave balance is no longer sufficient. The request was not submitted.`,

        requiresConfirmation:
          false,

        pendingAction:
          null,
      };
    }

    // --------------------------------------------------------
    // Revalidate overlap.
    // --------------------------------------------------------

    const overlapping =
      await LeaveRequest.checkOverlappingLeave(
        userId,
        start_date,
        end_date
      );

    if (
      overlapping?.length > 0
    ) {
      return {
        ...state,

        toolResult:
          'The request now overlaps with another leave request, so it was not submitted.',

        requiresConfirmation:
          false,

        pendingAction:
          null,
      };
    }

    // --------------------------------------------------------
    // Database mutation
    // --------------------------------------------------------

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
        `Leave request submitted successfully.\n\n` +
        `Request ID: ${leaveRequest.id}\n` +
        `Type: ${leave_type}\n` +
        `Dates: ${start_date} to ${end_date}\n` +
        `Days: ${number_of_days}\n` +
        `Reason: ${reason || 'Not specified'}\n` +
        `Status: Pending HR approval`,

      requiresConfirmation:
        false,

      pendingAction:
        null,

      context: {
        ...state.context,

        submittedLeaveRequest:
          leaveRequest,
      },
    };
  } catch (error) {
    console.error(
      '[LeaveSubmit]',
      error
    );

    return {
      ...state,

      toolResult:
        'I could not submit your leave request. Please try again.',

      requiresConfirmation:
        false,

      pendingAction:
        null,
    };
  }
}

// ============================================================
// GMAIL READ
// ============================================================

function getHeader(
  email,
  headerName
) {
  return (
    email?.payload?.headers?.find(
      header =>
        String(header.name)
          .toLowerCase() ===
        headerName.toLowerCase()
    )?.value || null
  );
}

async function gmailReadQuery(
  state
) {
  try {
    const message =
      state.messages[
        state.messages.length - 1
      ].content;

    const connected =
      await gmailService.isConnected(
        state.userId
      );

    if (!connected) {
      return {
        ...state,

        toolResult:
          'Your Gmail is not connected. Please connect Gmail from the settings page first.',

        currentTool: null,
      };
    }

    const lower =
      message.toLowerCase();

    const emails =
      await gmailService.getRecentEmails(
        state.userId,
        20
      );

    let filtered =
      Array.isArray(emails)
        ? emails
        : [];

    // --------------------------------------------------------
    // Unread
    // --------------------------------------------------------

    if (
      lower.includes('unread')
    ) {
      filtered =
        filtered.filter(email =>
          !email.labelIds ||
          email.labelIds.includes(
            'UNREAD'
          )
        );
    }

    // --------------------------------------------------------
    // From
    // --------------------------------------------------------

    const fromMatch =
      message.match(
        /\bfrom\s+(.+?)(?:\s+(?:about|subject|regarding)\b|$)/i
      );

    if (fromMatch) {
      const person =
        fromMatch[1]
          .trim()
          .replace(
            /^["']|["']$/g,
            ''
          );

      filtered =
        filtered.filter(email => {
          const from =
            getHeader(
              email,
              'From'
            );

          return from
            ?.toLowerCase()
            .includes(
              person.toLowerCase()
            );
        });
    }

    // --------------------------------------------------------
    // Topic
    // --------------------------------------------------------

    const aboutMatch =
      message.match(
        /\b(?:about|subject|regarding)\s+(.+)$/i
      );

    if (aboutMatch) {
      const topic =
        aboutMatch[1]
          .trim()
          .replace(
            /^["']|["']$/g,
            ''
          );

      filtered =
        filtered.filter(email => {
          const subject =
            getHeader(
              email,
              'Subject'
            );

          return subject
            ?.toLowerCase()
            .includes(
              topic.toLowerCase()
            );
        });
    }

    if (
      filtered.length === 0
    ) {
      return {
        ...state,

        toolResult:
          'I could not find any matching emails in your recent Gmail.',

        context: {
          ...state.context,

          gmailResults: [],
        },

        currentTool: null,
      };
    }

    const lines =
      filtered
        .slice(0, 10)
        .map(
          (email, index) => {
            const from =
              getHeader(
                email,
                'From'
              ) ||
              'Unknown sender';

            const subject =
              getHeader(
                email,
                'Subject'
              ) ||
              'No subject';

            const date =
              getHeader(
                email,
                'Date'
              ) ||
              'Unknown date';

            return (
              `${index + 1}. **${subject}**\n` +
              `   From: ${from}\n` +
              `   Date: ${date}`
            );
          }
        );

    return {
      ...state,

      toolResult:
        `I found ${filtered.length} matching email${
          filtered.length === 1
            ? ''
            : 's'
        }:\n\n` +
        lines.join('\n\n'),

      context: {
        ...state.context,

        gmailResults:
          filtered.slice(0, 10),
      },

      currentTool: null,
    };
  } catch (error) {
    console.error(
      '[GmailRead]',
      error
    );

    return {
      ...state,

      toolResult:
        'I could not access your Gmail right now. Please try again.',

      currentTool: null,
    };
  }
}

// ============================================================
// EMAIL DETAILS
// ============================================================

async function extractEmailDetails(
  userMessage
) {
  try {
    const prompt = `
Extract email information from the user request.

Return ONLY valid JSON.

{
  "to": "email@example.com" | null,
  "subject": "subject" | null,
  "body": "body" | null
}

Rules:
- Do not invent an email address.
- If recipient is missing, return null.
- Preserve the user's intended email content.
- Do not include markdown outside the JSON.

User:
${userMessage}
`;

    const response =
      await llm.invoke(prompt);

    return extractJSON(
      response.content
    );
  } catch (error) {
    console.error(
      '[EmailExtraction]',
      error
    );

    return null;
  }
}

// ============================================================
// GMAIL SEND PREPARATION
// ============================================================

async function gmailSendQuery(
  state
) {
  try {
    const connected =
      await gmailService.isConnected(
        state.userId
      );

    if (!connected) {
      return {
        ...state,

        toolResult:
          'Your Gmail is not connected. Please connect Gmail from the settings page first.',

        requiresConfirmation:
          false,

        currentTool: null,
      };
    }

    const message =
      state.messages[
        state.messages.length - 1
      ].content;

    const details =
      await extractEmailDetails(
        message
      );

    if (
      !details ||
      !details.to
    ) {
      return {
        ...state,

        toolResult:
          'I can prepare the email, but I need the recipient email address first.',

        currentTool: null,

        requiresConfirmation:
          false,
      };
    }

    const subject =
      details.subject?.trim() ||
      'No subject';

    const body =
      details.body?.trim() ||
      '';

    if (!body) {
      return {
        ...state,

        toolResult:
          'I have the recipient and subject, but I still need the email body.',

        currentTool: null,

        requiresConfirmation:
          false,
      };
    }

    const actionId =
      `gmail_send_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    const pendingAction = {
      type: 'gmail_send',

      actionId,

      to: details.to.trim(),

      subject,

      body,
    };

    return {
      ...state,

      pendingAction,

      requiresConfirmation:
        true,

      toolResult:
        `I've prepared this email:\n\n` +
        `**To:** ${pendingAction.to}\n` +
        `**Subject:** ${pendingAction.subject}\n\n` +
        `**Message:**\n${pendingAction.body}\n\n` +
        `Please confirm if you'd like me to send it.`,

      context: {
        ...state.context,

        emailDraft: {
          to: pendingAction.to,
          subject:
            pendingAction.subject,
          body:
            pendingAction.body,
        },
      },

      currentTool: null,
    };
  } catch (error) {
    console.error(
      '[GmailSendPrepare]',
      error
    );

    return {
      ...state,

      toolResult:
        'I could not prepare the email right now. Please try again.',

      requiresConfirmation:
        false,

      currentTool: null,
    };
  }
}

// ============================================================
// SEND GMAIL
// ============================================================

export async function sendGmail(
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
        'gmail_send'
    ) {
      return {
        ...state,

        toolResult:
          'There is no pending email to send.',

        requiresConfirmation:
          false,

        pendingAction:
          null,
      };
    }

    const {
      to,
      subject,
      body,
    } = pendingAction;

    if (
      !to ||
      !body
    ) {
      return {
        ...state,

        toolResult:
          'The email information is incomplete, so I did not send it.',

        requiresConfirmation:
          false,

        pendingAction:
          null,
      };
    }

    await gmailService.sendEmail(
      userId,
      to,
      subject,
      body,
      false
    );

    return {
      ...state,

      toolResult:
        `Email sent successfully to ${to}.`,

      requiresConfirmation:
        false,

      pendingAction:
        null,

      context: {
        ...state.context,

        sentEmail: {
          to,
          subject,
        },
      },
    };
  } catch (error) {
    console.error(
      '[GmailSend]',
      error
    );

    return {
      ...state,

      toolResult:
        `I couldn't send the email. ${error.message || 'Please try again.'}`,

      requiresConfirmation:
        false,

      pendingAction:
        null,
    };
  }
}

// ============================================================
// TAVILY WEB SEARCH
// ============================================================

async function webSearchQuery(
  state
) {
  try {
    if (
      !tavilyTool?.isConfigured
    ) {
      return {
        ...state,

        toolResult:
          'Web search is not configured yet. Please configure TAVILY_API_KEY in the backend environment.',

        currentTool: null,
      };
    }

    const message =
      state.messages[
        state.messages.length - 1
      ].content;

    const result =
      await tavilyTool.search(
        message,
        {
          maxResults: 5,
          searchDepth: 'basic',
          includeAnswer: true,
        }
      );

    if (
      !result?.success
    ) {
      return {
        ...state,

        toolResult:
          `I couldn't complete the web search: ${
            result?.error ||
            'Unknown search error'
          }`,

        currentTool: null,
      };
    }

    const results =
      Array.isArray(
        result.results
      )
        ? result.results
        : [];

    if (
      results.length === 0
    ) {
      return {
        ...state,

        toolResult:
          'I searched the web but could not find relevant results.',

        currentTool: null,

        context: {
          ...state.context,

          webSearchResults: [],
        },
      };
    }

    const context =
      results
        .map(
          (item, index) =>
            `[Source ${index + 1}]
Title: ${item.title || 'Untitled'}
URL: ${item.url || 'Unavailable'}
Content: ${item.content || ''}`
        )
        .join('\n\n');

    const prompt = `
You are an Employee Copilot.

Answer the user's question using the web search results below.

USER QUESTION:
${message}

WEB RESULTS:
${context}

${result.answer
  ? `SEARCH SUMMARY:\n${result.answer}\n`
  : ''}

RULES:
- Use the provided search results.
- Do not invent facts.
- Clearly distinguish current web information from company information.
- If sources disagree, mention the disagreement.
- Keep the response concise and useful.
- Do not expose internal implementation details.

Answer:
`;

    const response =
      await llm.invoke(prompt);

    const answer =
      validateAIOutput(
        String(
          response.content || ''
        )
      );

    return {
      ...state,

      toolResult:
        answer,

      currentTool: null,

      context: {
        ...state.context,

        webSearchResults:
          results,

        webSearchAnswer:
          result.answer || null,
      },
    };
  } catch (error) {
    console.error(
      '[Tavily]',
      error
    );

    return {
      ...state,

      toolResult:
        'I encountered an error while searching the web. Please try again.',

      currentTool: null,
    };
  }
}

// ============================================================
// GENERAL RAG
// ============================================================

async function generalRAGQuery(
  state
) {
  try {
    const message =
      state.messages[
        state.messages.length - 1
      ].content;

    const ragResult =
      await runRAGWorkflow(
        message,
        state.userId,
        state.userRole
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
      '[RAG]',
      error
    );

    return {
      ...state,

      toolResult:
        'I could not retrieve the company knowledge right now. Please try again.',

      currentTool: null,
    };
  }
}

// ============================================================
// CALENDAR EVENT DETAILS
// ============================================================

async function extractCalendarEventDetails(
  userMessage
) {
  try {
    const prompt = `
Extract calendar event creation information.

Return ONLY valid JSON:

{
  "title": "meeting title" | null,
  "date": "YYYY-MM-DD" | null,
  "start_time": "HH:MM" | null,
  "end_time": "HH:MM" | null,
  "duration_minutes": number | null,
  "description": "description" | null,
  "attendees": ["email@example.com"] | [],
  "location": "location" | null
}

Rules:
- Convert today/tomorrow/next weekday into actual dates.
- Use 24-hour time.
- Do not invent missing information.
- If no end time is provided, duration_minutes can be 60.
- Do not invent attendees.

User:
${userMessage}
`;

    const response =
      await llm.invoke(prompt);

    return extractJSON(
      response.content
    );
  } catch (error) {
    console.error(
      '[CalendarExtraction]',
      error
    );

    return null;
  }
}

// ============================================================
// VALIDATE CALENDAR EVENT
// ============================================================

async function validateCalendarEvent(
  state
) {
  try {
    const action =
      state.pendingAction;

    if (
      !action ||
      action.type !==
        'calendar_create'
    ) {
      return {
        ...state,

        toolResult:
          'There is no pending calendar event to validate.',

        requiresConfirmation:
          false,
      };
    }

    const {
      title,
      date,
      start_time,
      end_time,
      duration_minutes,
    } = action;

    if (!title) {
      return {
        ...state,

        toolResult:
          'What would you like to call the meeting?',

        requiresConfirmation:
          false,

        missingField:
          'meeting title',
      };
    }

    if (!date) {
      return {
        ...state,

        toolResult:
          'What date should I schedule the meeting for?',

        requiresConfirmation:
          false,

        missingField:
          'date',
      };
    }

    if (!start_time) {
      return {
        ...state,

        toolResult:
          'What time should I schedule the meeting?',

        requiresConfirmation:
          false,

        missingField:
          'time',
      };
    }

    let finalEndTime =
      end_time;

    if (
      !finalEndTime
    ) {
      const start =
        new Date(
          `${date}T${start_time}:00`
        );

      const duration =
        Number(
          duration_minutes || 60
        );

      finalEndTime =
        new Date(
          start.getTime() +
            duration * 60000
        )
          .toTimeString()
          .slice(0, 5);
    }

    state.pendingAction.end_time =
      finalEndTime;

    // --------------------------------------------------------
    // Check conflicts
    // --------------------------------------------------------

    let hasConflicts =
      false;

    let conflicts = [];

    try {
      const conflictCheck =
        await googleCalendarService.checkConflicts(
          state.userId,
          date,
          date
        );

      if (
        conflictCheck?.hasConflicts
      ) {
        hasConflicts =
          true;

        conflicts =
          conflictCheck.conflicts ||
          [];
      }
    } catch (error) {
      console.warn(
        '[Calendar] Conflict check failed:',
        error.message
      );
    }

    return {
      ...state,

      requiresConfirmation:
        true,

      hasConflicts,

      context: {
        ...state.context,

        calendarConflicts:
          conflicts,
      },

      toolResult:
        hasConflicts
          ? 'The meeting is ready, but there is a calendar conflict during this period.'
          : 'The meeting is ready to be scheduled.',
    };
  } catch (error) {
    console.error(
      '[CalendarValidation]',
      error
    );

    return {
      ...state,

      toolResult:
        'I could not validate the calendar event.',

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
          'There is no pending calendar event to create.',

        requiresConfirmation:
          false,

        pendingAction:
          null,
      };
    }

    const {
      title,
      date,
      start_time,
      end_time,
      description,
      location,
      attendees,
    } = pendingAction;

    if (
      !title ||
      !date ||
      !start_time ||
      !end_time
    ) {
      return {
        ...state,

        toolResult:
          'The calendar event information is incomplete.',

        requiresConfirmation:
          false,

        pendingAction:
          null,
      };
    }

    const timezone =
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone ||
      'Asia/Kolkata';

    const eventData = {
      summary: title,

      start: {
        dateTime:
          `${date}T${start_time}:00`,

        timeZone:
          timezone,
      },

      end: {
        dateTime:
          `${date}T${end_time}:00`,

        timeZone:
          timezone,
      },
    };

    if (description) {
      eventData.description =
        description;
    }

    if (location) {
      eventData.location =
        location;
    }

    if (
      Array.isArray(attendees) &&
      attendees.length > 0
    ) {
      eventData.attendees =
        attendees
          .filter(
            email =>
              typeof email ===
                'string' &&
              email.includes('@')
          )
          .map(
            email => ({
              email,
            })
          );
    }

    const event =
      await googleCalendarService.createEvent(
        userId,
        eventData
      );

    return {
      ...state,

      toolResult:
        `Meeting scheduled successfully.\n\n` +
        `**${title}**\n` +
        `Date: ${date}\n` +
        `Time: ${start_time} - ${end_time}`,

      requiresConfirmation:
        false,

      pendingAction:
        null,

      context: {
        ...state.context,

        createdEvent:
          event,
      },
    };
  } catch (error) {
    console.error(
      '[CalendarCreate]',
      error
    );

    if (
      error.code ===
        'GOOGLE_CALENDAR_NOT_CONNECTED' ||
      error.message ===
        'GOOGLE_CALENDAR_NOT_CONNECTED'
    ) {
      return {
        ...state,

        toolResult:
          'Your Google Calendar is not connected. Please connect it first.',

        requiresConfirmation:
          false,

        pendingAction:
          null,
      };
    }

    return {
      ...state,

      toolResult:
        'I could not create the calendar event. Please try again.',

      requiresConfirmation:
        false,

      pendingAction:
        null,
    };
  }
}

// ============================================================
// INTENT CLASSIFICATION
// ============================================================

async function classifyIntent(userMessage) {
  try {
    const text = String(userMessage || '')
      .trim()
      .toLowerCase();

    // ----------------------------------------------------------
    // DETERMINISTIC LEAVE ROUTING
    // ----------------------------------------------------------

    // Leave balance
    if (
      /\b(leave balance|leaves balance|how many leaves|how much leave|remaining leave|leave remaining)\b/i.test(
        text
      )
    ) {
      return 'leave_balance';
    }

    // Leave policy
    if (
      /\b(leave policy|leave rules|leave entitlement|leave procedure|leave guidelines)\b/i.test(
        text
      )
    ) {
      return 'leave_policy';
    }

    // Leave request
    if (
      /\b(give me leave|grant me leave|i need leave|i want leave|take leave|request leave|apply for leave|apply leave|get leave|need to take leave|want to take leave|can i get leave|please give me leave)\b/i.test(
        text
      )
    ) {
      return 'leave_request';
    }

    // Calendar events - deterministic patterns
    if (
      /\b(meeting|calendar|schedule|appointment|event)\b/i.test(text) &&
      (/\b(today|tomorrow|this week|next week|this month|upcoming|next \d+ days|am i free|am i available|do i have|show|what|list|check)\b/i.test(text) ||
       /\b(in the next \d+ days|in the next week|in the next month)\b/i.test(text))
    ) {
      return 'calendar_events';
    }

    // Availability check patterns (these should take precedence)
    if (
      /\b(am i free|am i available|do i have any meetings|do i have any events|check my|show my|what meetings|what events|list my|my schedule|my calendar)\b/i.test(text) &&
      /\b(today|tomorrow|this week|next week|this month|upcoming|next \d+ days|on|at|@)\b/i.test(text)
    ) {
      return 'calendar_events';
    }

    // Calendar create - deterministic patterns (must be more specific)
    if (
      /\b(schedule|create|add|set up|book|arrange)\b/i.test(text) &&
      /\b(meeting|appointment|event|call|discussion)\b/i.test(text) &&
      !/\b(do i have|am i free|am i available|show|what|list|check)\b/i.test(text)
    ) {
      return 'calendar_create';
    }

    // ----------------------------------------------------------
    // GEMINI FALLBACK
    // ----------------------------------------------------------

    const prompt = `
Classify the user request into exactly ONE category.

Categories:

leave_balance
- User wants their own leave balance.

leave_policy
- User asks about company leave policy.

leave_request
- User wants to apply, request, take, get, or be given leave.
- Informal phrases such as:
  "give me leave"
  "I need leave"
  "I want leave"
  "I need to take leave"
  "please give me leave"
  must be classified as leave_request.

calendar_events
- User wants to check their own Google Calendar.
- Availability checks: "Am I free on Friday at 3 PM?"
- Meeting queries: "Do I have any meetings in the next 7 days?"
- Schedule checks: "What meetings do I have tomorrow?"
- Calendar reviews: "Show my calendar for this week"

calendar_create
- User wants to create/schedule a calendar event.
- Meeting scheduling: "Schedule a team meeting tomorrow at 2 PM for 1 hour"
- Event creation: "Add a meeting on September 10 at 11 AM"
- Booking appointments: "Book a client call next Tuesday"

gmail_read
- User wants to read/search their own Gmail.

gmail_send
- User wants to send/draft/reply to an email.

web_search
- User explicitly asks for latest/current/external internet information.

general
- Company knowledge, casual questions, coding/help, or anything else.

Important:
- "What is our leave policy?" = leave_policy
- "How many leaves do I have?" = leave_balance
- "Apply leave from Monday to Wednesday" = leave_request
- "Give me leave" = leave_request
- "I need leave tomorrow" = leave_request
- "I want to take leave" = leave_request
- "Please give me leave" = leave_request
- "Do I have a meeting today?" = calendar_events
- "Am I free on Friday at 3 PM?" = calendar_events
- "What meetings do I have tomorrow?" = calendar_events
- "Do I have any meetings in the next 7 days?" = calendar_events
- "Schedule a meeting tomorrow at 3 PM" = calendar_create
- "Add a meeting on September 10 at 11 AM" = calendar_create
- "Show my emails" = gmail_read
- "Send an email to Rahul" = gmail_send
- "What's the latest React version?" = web_search

Return ONLY the category.

User:
${userMessage}
`;

    const response = await llm.invoke(prompt);

    const intent = String(response.content || '')
      .trim()
      .toLowerCase()
      .replace(/[`"' ]/g, '');

    if (VALID_INTENTS.includes(intent)) {
      return intent;
    }

    return 'general';
  } catch (error) {
    console.error('[Intent]', error);
    return 'general';
  }
}

// ============================================================
// BUILD ACTION METADATA
// ============================================================

function buildActionMetadata(
  pendingAction,
  context = {}
) {
  if (!pendingAction) {
    return null;
  }

  return {
    actionId:
      pendingAction.actionId,

    actionType:
      pendingAction.type,

    actionData:
      pendingAction,

    title:
      pendingAction.title ||
      pendingAction.leave_type ||
      'Confirm action',

    date:
      pendingAction.date ||
      pendingAction.start_date ||
      null,

    time:
      pendingAction.start_time ||
      null,

    hasConflicts:
      context.hasConflicts || false,

    conflictDetails:
      context.calendarConflicts || null,

    calendarStatus:
      context.calendarStatus || null,
  };
}

// ============================================================
// MAIN WORKFLOW
// ============================================================

export async function runLangGraphWorkflow(
  userMessage,
  userId,
  userRole,
  conversationId = null,
  actionId = null,
  isConfirmed = false,
  actionData = null
) {
  let intent = 'general'; // Initialize with default value for error handling

  try {
    // --------------------------------------------------------
    // Validate input
    // --------------------------------------------------------

    const sanitizedInput =
      validateUserInput(
        userMessage
      );

    // --------------------------------------------------------
    // CHECK FOR PENDING ACTIONS FIRST (Intent Routing Guardrail)
    // --------------------------------------------------------
    
    if (conversationId) {
      const hasPendingAction = await conversationStateService.hasPendingAction(conversationId);
      
      if (hasPendingAction && !isConfirmed) {
        // Handle vague responses against pending workflow
        const vagueResponse = isVagueConfirmation(sanitizedInput);
        
        if (vagueResponse) {
          const pendingActionState = await conversationStateService.getPendingAction(conversationId);
          
          if (pendingActionState) {
            console.log('[LangGraph] Resolving vague response against pending action:', pendingActionState.actionId);
            
            // Verify the action is still in valid state before executing
            const stateByActionId = await conversationStateService.getStateByActionId(pendingActionState.actionId);
            
            if (!stateByActionId || String(stateByActionId.user_id) !== String(userId)) {
              console.log('[LangGraph] Invalid or expired pending action, clearing state');
              await conversationStateService.clearPendingAction(conversationId);
              
              return {
                response: 'The pending action has expired or is no longer valid. Please submit your request again.',
                sources: [],
                requiresConfirmation: false,
                pendingAction: null,
                actionMetadata: null,
                error: null
              };
            }
            
            // Execute the pending action based on vague response
            if (vagueResponse === 'confirm') {
              const result = await leaveWorkflowService.confirmAndSubmitLeaveRequest(
                conversationId,
                userId,
                pendingActionState.actionId
              );
              
              return {
                response: result.message,
                sources: [],
                requiresConfirmation: false,
                pendingAction: null,
                actionMetadata: null,
                error: result.success ? null : result.error
              };
            } else if (vagueResponse === 'cancel') {
              const result = await leaveWorkflowService.cancelLeaveRequest(
                conversationId,
                userId,
                pendingActionState.actionId
              );
              
              return {
                response: result.message,
                sources: [],
                requiresConfirmation: false,
                pendingAction: null,
                actionMetadata: null,
                error: result.success ? null : result.error
              };
            }
          }
        } else {
          // User sent an unrelated question while pending action exists
          const pendingActionState = await conversationStateService.getPendingAction(conversationId);
          
          if (pendingActionState) {
            console.log('[LangGraph] Unrelated question with pending action, preserving workflow');
            
            // Verify the action is still valid
            const stateByActionId = await conversationStateService.getStateByActionId(pendingActionState.actionId);
            
            if (!stateByActionId || String(stateByActionId.user_id) !== String(userId)) {
              console.log('[LangGraph] Invalid or expired pending action, clearing state');
              await conversationStateService.clearPendingAction(conversationId);
              
              // Fall through to normal intent processing
            } else {
              return {
                response: `You still have a leave request waiting for confirmation:\n\n` +
                         `**Leave type:** ${pendingActionState.actionData.leave_type}\n` +
                         `**Dates:** ${pendingActionState.actionData.start_date} → ${pendingActionState.actionData.end_date}\n` +
                         `**Days:** ${pendingActionState.actionData.number_of_days}\n\n` +
                         `Would you like to continue with this request or cancel it?`,
                sources: [],
                requiresConfirmation: true,
                pendingAction: pendingActionState.actionData,
                actionMetadata: {
                  actionId: pendingActionState.actionId,
                  actionType: pendingActionState.actionData.type,
                  title: pendingActionState.actionData.leave_type,
                  date: pendingActionState.actionData.start_date,
                  hasConflicts: false
                },
                error: null
              };
            }
          }
        }
      }
    }

    // --------------------------------------------------------
    // Initial state
    // --------------------------------------------------------

    let state = {
      messages: [
        {
          role: 'user',
          content:
            sanitizedInput,
        },
      ],

      userId,

      userRole,

      currentTool: null,

      toolResult: null,

      requiresConfirmation:
        false,

      pendingAction:
        actionData || null,

      context: {},

      hasConflicts:
        false,
    };

    // ========================================================
    // CONFIRMATION FLOW
    // ========================================================
    //
    // This is the critical fix.
    //
    // "yes" should NEVER be classified as a new
    // general/RAG request.
    //
    // Instead:
    //
    // UI
    // ↓
    // actionId + actionData
    // ↓
    // direct execution
    //
    // ========================================================

    if (
      isConfirmed &&
      actionId
    ) {
      console.log(
        '[Action] Executing confirmed action:',
        actionId
      );

      if (
        !actionData
      ) {
        return {
          response:
            'The confirmation data has expired. Please submit the action again.',

          sources: [],

          requiresConfirmation:
            false,

          pendingAction:
            null,

          actionMetadata:
            null,

          error:
            'MISSING_ACTION_DATA',
        };
      }

      const actionType =
        actionData.type;

      if (
        !ACTION_TYPES.includes(
          actionType
        )
      ) {
        return {
          response:
            'I could not recognize the requested action.',

          sources: [],

          requiresConfirmation:
            false,

          pendingAction:
            null,

          actionMetadata:
            null,

          error:
            'INVALID_ACTION_TYPE',
        };
      }

      // Prevent action type spoofing.
      if (
        actionType ===
          'leave_request' &&
        !actionId.startsWith(
          'leave_request_'
        )
      ) {
        throw new Error(
          'Invalid leave action ID.'
        );
      }

      if (
        actionType ===
          'calendar_create' &&
        !actionId.startsWith(
          'calendar_create_'
        )
      ) {
        throw new Error(
          'Invalid calendar action ID.'
        );
      }

      if (
        actionType ===
          'gmail_send' &&
        !actionId.startsWith(
          'gmail_send_'
        )
      ) {
        throw new Error(
          'Invalid Gmail action ID.'
        );
      }

      state.pendingAction = {
        ...actionData,
        actionId,
      };

      // ------------------------------------------------------
      // Execute mutation
      // ------------------------------------------------------

      if (
        actionType ===
        'leave_request'
      ) {
        state =
          await submitLeaveRequest(
            state
          );
      }

      else if (
        actionType ===
        'calendar_create'
      ) {
        state =
          await createCalendarEvent(
            state
          );
      }

      else if (
        actionType ===
        'gmail_send'
      ) {
        state =
          await sendGmail(
            state
          );
      }

      const response =
        validateAIOutput(
          state.toolResult
        );

      return {
        response,

        sources:
          state.context
            ?.ragResult
            ?.sources || [],

        requiresConfirmation:
          false,

        pendingAction:
          null,

        actionMetadata:
          null,

        error:
          null,
      };
    }

    // ========================================================
    // NORMAL REQUEST
    // ========================================================

    intent =
      await classifyIntent(
        sanitizedInput
      );

    loggingService.logAIRequest(userId, conversationId, intent, sanitizedInput);

    console.log(
      '[Copilot] Intent:',
      intent
    );

    switch (intent) {

      // ======================================================
      // LEAVE BALANCE
      // ======================================================

      case 'leave_balance':
        state =
          await queryLeaveBalance(
            state
          );
        break;

      // ======================================================
      // LEAVE POLICY
      // ======================================================

      case 'leave_policy':
        state =
          await checkLeavePolicy(
            state
          );
        break;

      // ======================================================
      // LEAVE REQUEST
      // ======================================================

      case 'leave_request': {
        // Check if there's an incomplete request to continue
        if (conversationId) {
          const existingState = await conversationStateService.findByConversationId(conversationId);
          
          if (existingState && existingState.workflow_step === COLLECTING_DETAILS) {
            // Continue the incomplete request
            const details = await extractLeaveDetails(sanitizedInput);
            const workflowResult = await leaveWorkflowService.continueIncompleteRequest(
              conversationId,
              userId,
              details
            );

            if (workflowResult.success) {
              state.requiresConfirmation = true;
              state.pendingAction = workflowResult.pendingAction;
              state.toolResult = workflowResult.message;
              state.hasConflicts = workflowResult.calendarConflicts ? true : false;
              state.context = {
                ...state.context,
                calendarStatus: workflowResult.calendarStatus,
                calendarConflicts: workflowResult.calendarConflicts
              };
            } else {
              state.requiresConfirmation = false;
              state.pendingAction = null;
              state.toolResult = workflowResult.message;
            }
            break;
          }
        }

        const details =
          await extractLeaveDetails(
            sanitizedInput
          );

        if (
          !details ||
          !details.leave_type ||
          !details.start_date ||
          !details.end_date
        ) {
          state.toolResult =
            `To request leave, I need:\n\n` +
            `• Leave type: annual, sick, or personal\n` +
            `• Start date\n` +
            `• End date\n` +
            `• Reason (optional)\n\n` +
            `Example: "Apply annual leave from 2026-09-01 to 2026-09-03 for vacation."`;

          break;
        }

        // Use the new leave workflow service
        if (conversationId) {
          const workflowResult = await leaveWorkflowService.initializeLeaveWorkflow(
            conversationId,
            userId,
            details
          );

          if (workflowResult.success) {
            state.requiresConfirmation = true;
            state.pendingAction = workflowResult.pendingAction;
            state.toolResult = workflowResult.message;
            state.hasConflicts = workflowResult.calendarConflicts ? true : false;
            state.context = {
              ...state.context,
              calendarStatus: workflowResult.calendarStatus,
              calendarConflicts: workflowResult.calendarConflicts
            };
          } else {
            state.requiresConfirmation = false;
            state.pendingAction = null;
            state.toolResult = workflowResult.message;
          }
        } else {
          // Fallback to old logic if no conversationId
          const numberOfDays =
            await calculateLeaveDays(
              details.start_date,
              details.end_date
            );

          const pendingAction = {
            type:
              'leave_request',

            actionId:
              `leave_request_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`,

            leave_type:
              details.leave_type,

            start_date:
              details.start_date,

            end_date:
              details.end_date,

            reason:
              details.reason ||
              null,

            number_of_days:
              numberOfDays,
          };

          state.pendingAction =
            pendingAction;

          state =
            await validateLeaveRequest(
              state
            );

          if (
            state.requiresConfirmation
          ) {
            state.toolResult =
              `Please review your leave request:\n\n` +
              `**Leave type:** ${pendingAction.leave_type}\n` +
              `**Dates:** ${pendingAction.start_date} → ${pendingAction.end_date}\n` +
              `**Days:** ${pendingAction.number_of_days}\n` +
              `**Reason:** ${
                pendingAction.reason ||
                'Not specified'
              }\n\n` +
              `Would you like me to submit this leave request?`;
          }
        }

        break;
      }

      // ======================================================
      // CALENDAR EVENTS
      // ======================================================

      case 'calendar_events':
        state =
          await queryCalendarEvents(
            state
          );
        break;

      // ======================================================
      // CALENDAR CREATE
      // ======================================================

      case 'calendar_create': {
        let details =
          await extractCalendarEventDetails(
            sanitizedInput
          );

        if (!details) {
          details = {};
        }

        if (
          !details.date
        ) {
          details.date =
            parseRelativeDate(
              sanitizedInput
            );
        }

        if (
          details.start_time
        ) {
          details.start_time =
            parseTime(
              details.start_time
            );
        }

        if (
          details.end_time
        ) {
          details.end_time =
            parseTime(
              details.end_time
            );
        }

        const pendingAction = {
          type:
            'calendar_create',

          actionId:
            `calendar_create_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,

          title:
            details.title ||
            null,

          date:
            details.date ||
            null,

          start_time:
            details.start_time ||
            null,

          end_time:
            details.end_time ||
            null,

          duration_minutes:
            details.duration_minutes ||
            60,

          description:
            details.description ||
            null,

          attendees:
            Array.isArray(
              details.attendees
            )
              ? details.attendees
              : [],

          location:
            details.location ||
            null,
        };

        state.pendingAction =
          pendingAction;

        state =
          await validateCalendarEvent(
            state
          );

        if (
          state.requiresConfirmation
        ) {
          const conflictText =
            state.hasConflicts
              ? '\n\n⚠️ There is a calendar conflict during this time.'
              : '\n\n✅ No calendar conflict detected.';

          state.toolResult =
            `Please review this meeting:\n\n` +
            `**Title:** ${pendingAction.title}\n` +
            `**Date:** ${pendingAction.date}\n` +
            `**Time:** ${pendingAction.start_time} - ${pendingAction.end_time}` +
            `${
              pendingAction.location
                ? `\n**Location:** ${pendingAction.location}`
                : ''
            }` +
            `${
              pendingAction.description
                ? `\n**Description:** ${pendingAction.description}`
                : ''
            }` +
            conflictText +
            `\n\nWould you like me to schedule it?`;

          state.context = {
            ...state.context,
            calendarStatus: state.hasConflicts ? 'CONNECTED' : 'CONNECTED',
            calendarConflicts: state.context?.calendarConflicts || null
          };
        }

        break;
      }

      // ======================================================
      // GMAIL READ
      // ======================================================

      case 'gmail_read':
        state =
          await gmailReadQuery(
            state
          );
        break;

      // ======================================================
      // GMAIL SEND
      // ======================================================

      case 'gmail_send':
        state =
          await gmailSendQuery(
            state
          );
        break;

      // ======================================================
      // TAVILY
      // ======================================================

      case 'web_search':
        state =
          await webSearchQuery(
            state
          );
        break;

      // ======================================================
      // GENERAL → RAG
      // ======================================================

      case 'general':
      default:
        state =
          await generalRAGQuery(
            state
          );
        break;
    }

    // ========================================================
    // OUTPUT
    // ========================================================

    const response =
      validateAIOutput(
        state.toolResult ||
          'I could not generate a response.'
      );

    const result = {
      response,

      sources:
        state.context
          ?.ragResult
          ?.sources || [],

      requiresConfirmation:
        Boolean(
          state.requiresConfirmation
        ),

      pendingAction:
        state.requiresConfirmation
          ? state.pendingAction
          : null,

      actionMetadata:
        state.requiresConfirmation
          ? buildActionMetadata(
              state.pendingAction,
              state.context
            )
          : null,

      error:
        null,
    };

    loggingService.logAIResponse(userId, conversationId, intent, response, {
      requiresConfirmation: result.requiresConfirmation,
      hasPendingAction: !!result.pendingAction
    });

    return result;
  } catch (error) {
    loggingService.logAIError(userId, conversationId, error, { intent });
    console.error(
      '[LangGraphWorkflow]',
      error
    );

    return {
      response:
        'I encountered an error while processing your request. Please try again.',

      sources: [],

      requiresConfirmation:
        false,

      pendingAction:
        null,

      actionMetadata:
        null,

      error:
        error.message,
    };
  }
}

// ============================================================
// STREAMING WORKFLOW
// ============================================================
//
// This exposes Gemini token streaming for the next
// ConversationService/SSE integration.
//
// IMPORTANT:
// Tool execution itself remains non-streaming.
// The final Gemini generation can stream token-by-token.
//
// ============================================================

export async function streamAIResponse(
  prompt,
  onToken
) {
  if (
    typeof onToken !== 'function'
  ) {
    throw new Error(
      'onToken callback is required.'
    );
  }

  const stream =
    await llm.stream(prompt);

  let completeResponse = '';

  for await (
    const chunk of stream
  ) {
    let text = '';

    if (
      typeof chunk?.content ===
      'string'
    ) {
      text =
        chunk.content;
    } else if (
      Array.isArray(
        chunk?.content
      )
    ) {
      text =
        chunk.content
          .map(
            item =>
              typeof item ===
              'string'
                ? item
                : item?.text ||
                  ''
          )
          .join('');
    }

    if (!text) {
      continue;
    }

    completeResponse += text;

    await onToken(
      text
    );
  }

  return completeResponse;
}

// ============================================================
// EXPORTS FOR TESTING / SERVICES
// ============================================================

export {
  classifyIntent,
  queryCalendarEvents,
  gmailReadQuery,
  gmailSendQuery,
  webSearchQuery,
  generalRAGQuery,
  validateLeaveRequest,
  validateCalendarEvent,
  extractLeaveDetails,
  extractCalendarEventDetails,
  extractEmailDetails,
  parseRelativeDate,
  parseTime,
};