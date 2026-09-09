import { z } from "zod";
import { interrupt } from "@langchain/langgraph";

import geminiLLM from "../../llm/gemini.js";
import googleCalendarService from "../../../services/googleCalendarService.js";

// ============================================================
// ZOD SCHEMA
// ============================================================

const CalendarDetailsSchema = z.object({
  title: z.string().nullable(),

  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Date must be YYYY-MM-DD"
    )
    .nullable(),

  start_time: z
    .string()
    .nullable(),

  end_time: z
    .string()
    .nullable(),

  duration_minutes: z
    .number()
    .nullable(),

  description: z.string().nullable(),

  attendees: z
    .array(z.string())
    .nullable(),

  location: z.string().nullable(),
});


// ============================================================
// JSON EXTRACTION
// ============================================================

function extractJSON(content) {
  if (!content) {
    return null;
  }

  const text = String(content)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
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
  return String(value).padStart(2, "0");
}


function formatDateLocal(date) {
  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}`
  );
}


function addDays(date, days) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + days
  );

  return result;
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


// ============================================================
// RELATIVE DATE PARSER
// ============================================================

function parseRelativeDate(message) {
  const text = String(message || "")
    .toLowerCase();

  const today = new Date();

  if (text.includes("today")) {
    return formatDateLocal(today);
  }

  if (text.includes("tomorrow")) {
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

  for (
    const [name, targetDay] of Object.entries(
      weekdays
    )
  ) {
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
// TIME PARSER
// ============================================================

function parseTime(value) {
  if (!value) {
    return null;
  }

  const text = String(value)
    .trim()
    .toLowerCase();

  const match = text.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/
  );

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);

  const minutes =
    Number(match[2] || 0);

  const meridiem = match[3];

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  if (
    meridiem === "pm" &&
    hours < 12
  ) {
    hours += 12;
  }

  if (
    meridiem === "am" &&
    hours === 12
  ) {
    hours = 0;
  }

  return `${pad(hours)}:${pad(minutes)}`;
}


// ============================================================
// CALENDAR DATE RANGE
// ============================================================

function getCalendarDateRange(userMessage) {
  const message =
    String(userMessage || "")
      .toLowerCase();

  const today = new Date();

  // ----------------------------------------------------------
  // Specific ISO date
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Today
  // ----------------------------------------------------------

  if (message.includes("today")) {
    return {
      startDate:
        getStartOfDay(today),

      endDate:
        getEndOfDay(today),

      label: "today",
    };
  }

  // ----------------------------------------------------------
  // Tomorrow
  // ----------------------------------------------------------

  if (message.includes("tomorrow")) {
    const tomorrow =
      addDays(today, 1);

    return {
      startDate:
        getStartOfDay(tomorrow),

      endDate:
        getEndOfDay(tomorrow),

      label: "tomorrow",
    };
  }

  // ----------------------------------------------------------
  // Next week
  // ----------------------------------------------------------

  if (message.includes("next week")) {
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

      label: "next week",
    };
  }

  // ----------------------------------------------------------
  // This week
  // ----------------------------------------------------------

  if (
    message.includes("this week") ||
    message === "week"
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

      label: "this week",
    };
  }

  // ----------------------------------------------------------
  // This month
  // ----------------------------------------------------------

  if (
    message.includes("this month")
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

      label: "this month",
    };
  }

  // ----------------------------------------------------------
  // Upcoming
  // ----------------------------------------------------------

  if (
    message.includes("upcoming") ||
    message.includes("future")
  ) {
    const end =
      addDays(today, 30);

    return {
      startDate: new Date(),

      endDate:
        getEndOfDay(end),

      label: "upcoming",
    };
  }

  // ----------------------------------------------------------
  // Next N days
  // ----------------------------------------------------------

  const nextDaysMatch =
    message.match(
      /next\s+(\d+)\s+days?/i
    );

  if (nextDaysMatch) {
    const days =
      Number(nextDaysMatch[1]);

    if (
      days > 0 &&
      days <= 365
    ) {
      const end =
        addDays(today, days);

      return {
        startDate: new Date(),

        endDate:
          getEndOfDay(end),

        label:
          `next ${days} days`,
      };
    }
  }

  // ----------------------------------------------------------
  // Default
  // ----------------------------------------------------------

  return {
    startDate:
      getStartOfDay(today),

    endDate:
      getEndOfDay(today),

    label: "today",
  };
}


// ============================================================
// CALENDAR EVENT FORMATTER
// ============================================================

function formatCalendarEvent(event) {
  const title =
    event.summary ||
    "Untitled event";

  const start =
    event.start || {};

  const end =
    event.end || {};

  const allDay =
    Boolean(start.date);

  return {
    id:
      event.id || null,

    title,

    start:
      start.dateTime ||
      start.date ||
      null,

    end:
      end.dateTime ||
      end.date ||
      null,

    allDay,

    location:
      event.location || null,

    description:
      event.description || null,

    attendees:
      Array.isArray(event.attendees)
        ? event.attendees
        : [],

    htmlLink:
      event.htmlLink || null,
  };
}


// ============================================================
// FORMAT EVENT TIME
// ============================================================

function formatEventTime(event) {
  if (event.allDay) {
    return "All day";
  }

  if (!event.start) {
    return "Time unavailable";
  }

  const start =
    new Date(event.start);

  if (Number.isNaN(start.getTime())) {
    return "Time unavailable";
  }

  const startTime =
    start.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );

  if (!event.end) {
    return startTime;
  }

  const end =
    new Date(event.end);

  if (Number.isNaN(end.getTime())) {
    return startTime;
  }

  const endTime =
    end.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );

  return `${startTime} - ${endTime}`;
}


// ============================================================
// NO EVENTS MESSAGE
// ============================================================

function getNoCalendarEventsMessage(label) {
  switch (label) {
    case "today":
      return "You don't have any meetings or calendar events today.";

    case "tomorrow":
      return "You don't have any meetings or calendar events tomorrow.";

    case "this week":
      return "You don't have any meetings or calendar events this week.";

    case "next week":
      return "You don't have any meetings or calendar events next week.";

    case "this month":
      return "You don't have any meetings or calendar events this month.";

    case "upcoming":
      return "You don't have any upcoming calendar events in the next 30 days.";

    default:
      return "I couldn't find any upcoming calendar events.";
  }
}


// ============================================================
// CALENDAR QUERY NODE
// ============================================================

export async function calendarQueryNode(state) {
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
              "cancelled"
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
        toolResult:
          getNoCalendarEventsMessage(
            label
          ),

        context: {
          calendarEvents: [],

          calendarRange: {
            startDate,
            endDate,
            label,
          },
        },
      };
    }

    const lines =
      formattedEvents.map(
        (event, index) => {
          let line =
            `${index + 1}. **${event.title}**\n` +
            `   ${formatEventTime(event)}`;

          if (event.location) {
            line +=
              `\n   Location: ${event.location}`;
          }

          return line;
        }
      );

    return {
      toolResult:
        `You have ${formattedEvents.length} calendar event${
          formattedEvents.length === 1
            ? ""
            : "s"
        } ${label}:\n\n` +
        lines.join("\n\n"),

      context: {
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
      "[Calendar]",
      error
    );

    if (
      error.code ===
        "GOOGLE_CALENDAR_NOT_CONNECTED" ||
      error.message ===
        "GOOGLE_CALENDAR_NOT_CONNECTED"
    ) {
      return {
        toolResult:
          "Your Google Calendar is not connected. Please connect it from the Calendar page first.",
      };
    }

    return {
      toolResult:
        "I could not access your Google Calendar right now. Please try again.",
    };
  }
}


// ============================================================
// EXTRACT CALENDAR EVENT DETAILS
// ============================================================

export async function extractCalendarEventDetails(
  userMessage
) {
  const prompt = `
Extract calendar event information.

Return ONLY valid JSON.

{
  "title": "meeting title" | null,
  "date": "YYYY-MM-DD" | null,
  "start_time": "HH:MM" | null,
  "end_time": "HH:MM" | null,
  "duration_minutes": number | null,
  "description": "description" | null,
  "attendees": ["email@example.com"],
  "location": "location" | null
}

Rules:

- Convert today/tomorrow/next weekday.
- Use 24-hour time.
- Never invent missing information.
- If end_time is missing, duration_minutes can be 60.
- Never invent attendees.

User:
${userMessage}
`;

  try {
    const response =
      await geminiLLM.invoke(prompt);

    const parsed =
      extractJSON(response?.content);

    if (!parsed) {
      return null;
    }

    const result =
      CalendarDetailsSchema.safeParse(
        parsed
      );

    if (!result.success) {
      console.warn(
        "[CalendarExtraction] Invalid output:",
        result.error.flatten()
      );

      return null;
    }

    return result.data;
  } catch (error) {
    console.error(
      "[CalendarExtraction]",
      error
    );

    return null;
  }
}


// ============================================================
// PREPARE CALENDAR
// ============================================================

export async function prepareCalendarNode(state) {
  const message =
    state.messages[
      state.messages.length - 1
    ].content;

  let details =
    await extractCalendarEventDetails(
      message
    );

  if (!details) {
    details = {};
  }

  // ----------------------------------------------------------
  // Resolve missing relative date deterministically
  // ----------------------------------------------------------

  if (!details.date) {
    details.date =
      parseRelativeDate(message);
  }

  if (details.start_time) {
    details.start_time =
      parseTime(
        details.start_time
      );
  }

  if (details.end_time) {
    details.end_time =
      parseTime(
        details.end_time
      );
  }

  const pendingAction = {
    type: "calendar_create",

    actionId:
      `calendar_create_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    title:
      details.title || null,

    date:
      details.date || null,

    start_time:
      details.start_time || null,

    end_time:
      details.end_time || null,

    duration_minutes:
      details.duration_minutes || 60,

    description:
      details.description || null,

    attendees:
      Array.isArray(details.attendees)
        ? details.attendees
        : [],

    location:
      details.location || null,
  };

  return {
    pendingAction,

    currentTool:
      "calendar_create",
  };
}


// ============================================================
// VALIDATE CALENDAR
// ============================================================

export async function validateCalendarNode(state) {
  const action =
    state.pendingAction;

  if (!action) {
    return {
      toolResult:
        "There is no pending calendar event.",

      requiresConfirmation: false,
    };
  }

  const {
    title,
    date,
    start_time,
    end_time,
    duration_minutes,
  } = action;

  // ----------------------------------------------------------
  // Required title
  // ----------------------------------------------------------

  if (!title) {
    return {
      toolResult:
        "What would you like to call the meeting?",

      missingField:
        "meeting title",

      requiresConfirmation: false,
    };
  }

  // ----------------------------------------------------------
  // Required date
  // ----------------------------------------------------------

  if (!date) {
    return {
      toolResult:
        "What date should I schedule the meeting for?",

      missingField: "date",

      requiresConfirmation: false,
    };
  }

  // ----------------------------------------------------------
  // Required start time
  // ----------------------------------------------------------

  if (!start_time) {
    return {
      toolResult:
        "What time should I schedule the meeting?",

      missingField: "time",

      requiresConfirmation: false,
    };
  }

  // ----------------------------------------------------------
  // Calculate end time if necessary
  // ----------------------------------------------------------

  let finalEndTime =
    end_time;

  if (!finalEndTime) {
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

  const updatedAction = {
    ...action,

    end_time:
      finalEndTime,
  };

  // ----------------------------------------------------------
  // Calendar conflicts
  // ----------------------------------------------------------

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
      conflicts =
        conflictCheck.conflicts || [];
    }
  } catch (error) {
    console.warn(
      "[Calendar] Conflict check failed:",
      error.message
    );
  }

  return {
    pendingAction:
      updatedAction,

    requiresConfirmation: true,

    hasConflicts:
      conflicts.length > 0,

    context: {
      calendarConflicts:
        conflicts,
    },

    toolResult:
      `Please review this meeting:\n\n` +
      `**Title:** ${title}\n` +
      `**Date:** ${date}\n` +
      `**Time:** ${start_time} - ${finalEndTime}\n` +
      `${
        action.location
          ? `**Location:** ${action.location}\n`
          : ""
      }` +
      `${
        action.description
          ? `**Description:** ${action.description}\n`
          : ""
      }` +
      `${
        conflicts.length > 0
          ? "\n⚠️ There is a calendar conflict."
          : "\n✅ No calendar conflict detected."
      }` +
      `\n\nWould you like me to schedule it?`,
  };
}


// ============================================================
// HUMAN APPROVAL
// ============================================================

export async function calendarApprovalNode(state) {
  const approval =
    interrupt({
      type:
        "calendar_confirmation",

      message:
        "Please confirm this meeting.",

      action:
        state.pendingAction,

      conflicts:
        state.context?.calendarConflicts ||
        [],
    });

  if (!approval) {
    return {
      toolResult:
        "Calendar event creation cancelled.",

      pendingAction: null,

      requiresConfirmation: false,

      approvalDecision: false,
    };
  }

  return {
    requiresConfirmation: false,

    approvalDecision: true,
  };
}


// ============================================================
// CREATE CALENDAR EVENT
// ============================================================

export async function createCalendarNode(state) {
  const action =
    state.pendingAction;

  // ----------------------------------------------------------
  // Check approval
  // ----------------------------------------------------------

  if (
    state.approvalDecision !== true
  ) {
    return {
      toolResult:
        "Calendar event creation cancelled.",

      pendingAction: null,

      requiresConfirmation: false,
    };
  }

  // ----------------------------------------------------------
  // Check pending action
  // ----------------------------------------------------------

  if (
    !action ||
    action.type !==
      "calendar_create"
  ) {
    return {
      toolResult:
        "There is no pending calendar event to create.",

      pendingAction: null,
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
  } = action;

  // ----------------------------------------------------------
  // Required fields
  // ----------------------------------------------------------

  if (
    !title ||
    !date ||
    !start_time ||
    !end_time
  ) {
    return {
      toolResult:
        "The calendar event information is incomplete.",

      pendingAction: null,
    };
  }

  // ----------------------------------------------------------
  // Timezone
  // ----------------------------------------------------------

  const timezone =
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone ||
    "Asia/Kolkata";

  // ----------------------------------------------------------
  // Google Calendar event
  // ----------------------------------------------------------

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
              "string" &&
            email.includes("@")
        )
        .map(
          email => ({
            email,
          })
        );
  }

  // ----------------------------------------------------------
  // Create event
  // ----------------------------------------------------------

  try {
    const event =
      await googleCalendarService.createEvent(
        state.userId,
        eventData
      );

    return {
      toolResult:
        `Meeting scheduled successfully.\n\n` +
        `**${title}**\n` +
        `Date: ${date}\n` +
        `Time: ${start_time} - ${end_time}`,

      pendingAction: null,

      requiresConfirmation: false,

      context: {
        createdEvent: event,
      },
    };
  } catch (error) {
    console.error(
      "[CalendarCreate]",
      error
    );

    return {
      toolResult:
        "I could not create the calendar event. Please try again.",

      pendingAction: null,

      requiresConfirmation: false,
    };
  }
}


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  calendarQueryNode,
  extractCalendarEventDetails,
  prepareCalendarNode,
  validateCalendarNode,
  calendarApprovalNode,
  createCalendarNode,
};