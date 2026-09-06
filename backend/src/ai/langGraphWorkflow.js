// ============================================================
// employeeCopilotGraph.js
// ============================================================
//
// Employee Copilot using REAL LangGraph orchestration.
//
// Hinglish:
// Pehle hamare paas ek bada switch(intent) tha.
// Ab har responsibility ko ek separate LangGraph node bana diya.
//
// Flow:
//
// START
//   ↓
// validateInput
//   ↓
// classifyIntent
//   ↓
// routeByIntent
//   ├── leaveBalance
//   ├── leavePolicy
//   ├── prepareLeave
//   ├── calendarQuery
//   ├── prepareCalendar
//   ├── gmailRead
//   ├── prepareEmail
//   ├── webSearch
//   └── generalRAG
//   ↓
// generateResponse
//   ↓
// END
//
// ============================================================

import {
  StateGraph,
  Annotation,
  START,
  END,
  MemorySaver,
  interrupt,
  Command,
} from "@langchain/langgraph";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { config } from "../config/index.js";

import { runRAGWorkflow } from "./ragGraph.js";

import { LeaveBalance } from "../models/LeaveBalance.js";
import { LeaveRequest } from "../models/LeaveRequest.js";

import googleCalendarService from "../services/googleCalendarService.js";
import gmailService from "../services/gmailService.js";
import conversationMemoryService from "../services/conversationMemoryService.js";

import tavilyTool from "./tools/tavilyTool.js";


// ============================================================
// LLM
// ============================================================

const llm = new ChatGoogleGenerativeAI({
  apiKey: config.geminiApiKey,
  model: config.geminiModel,
  temperature: 0.2,
  maxOutputTokens: 2048,
});


// ============================================================
// INTENTS
// ============================================================

const VALID_INTENTS = [
  "leave_balance",
  "leave_policy",
  "leave_request",

  "calendar_events",
  "calendar_create",

  "gmail_read",
  "gmail_send",

  "web_search",

  "general",
];


// ============================================================
// ACTION TYPES
// ============================================================

const ACTION_TYPES = [
  "leave_request",
  "calendar_create",
  "gmail_send",
];


// ============================================================
// STATE
// ============================================================
//
// Hinglish:
//
// Ye sabse important part hai.
//
// Annotation.Root() = poore graph ka State.
//
// Har node:
//
// state read karega
//       ↓
// kuch kaam karega
//       ↓
// state ka update return karega
//
// ============================================================

const EmployeeState = Annotation.Root({

  // ----------------------------------------------------------
  // User information
  // ----------------------------------------------------------

  userId: Annotation(),

  userRole: Annotation(),

  conversationId: Annotation(),


  // ----------------------------------------------------------
  // User message
  // ----------------------------------------------------------

  messages: Annotation({
    reducer: (current, update) => {

      // Agar new messages aaye hain to append karo.
      return [...current, ...update];
    },

    default: () => [],
  }),


  // ----------------------------------------------------------
  // Intent
  // ----------------------------------------------------------

  intent: Annotation(),


  // ----------------------------------------------------------
  // Tool information
  // ----------------------------------------------------------

  currentTool: Annotation(),

  toolResult: Annotation(),


  // ----------------------------------------------------------
  // Action / confirmation
  // ----------------------------------------------------------

  pendingAction: Annotation(),

  requiresConfirmation: Annotation({
    default: () => false,
  }),

  approvalDecision: Annotation({
    default: () => null,
  }),


  // ----------------------------------------------------------
  // Calendar conflicts
  // ----------------------------------------------------------

  hasConflicts: Annotation({
    default: () => false,
  }),


  // ----------------------------------------------------------
  // Missing field
  // ----------------------------------------------------------

  missingField: Annotation(),


  // ----------------------------------------------------------
  // General context
  // ----------------------------------------------------------

  context: Annotation({
    default: () => ({}),
  }),


  // ----------------------------------------------------------
  // Compact conversation context
  // ----------------------------------------------------------

  compactContext: Annotation(),


  // ----------------------------------------------------------
  // Final response
  // ----------------------------------------------------------

  response: Annotation(),

  sources: Annotation({
    default: () => [],
  }),


  // ----------------------------------------------------------
  // Error
  // ----------------------------------------------------------

  error: Annotation(),
});


// ============================================================
// INPUT VALIDATION
// ============================================================

function validateUserInput(input) {

  if (
    typeof input !== "string" ||
    !input.trim()
  ) {
    throw new Error(
      "Please enter a valid message."
    );
  }

  const trimmed = input.trim();


  if (trimmed.length > 4000) {

    throw new Error(
      "Your message is too long. Please keep it under 4000 characters."
    );
  }


  // ----------------------------------------------------------
  // Basic prompt injection protection
  // ----------------------------------------------------------

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

    /bypass authentication/i,

    /bypass authorization/i,

    /<script[\s\S]*?>/i,

    /javascript\s*:/i,
  ];


  for (const pattern of injectionPatterns) {

    if (pattern.test(trimmed)) {

      throw new Error(
        "I can’t help with bypassing security controls or exposing private system information."
      );
    }
  }


  return trimmed;
}


// ============================================================
// OUTPUT VALIDATION
// ============================================================

function validateAIOutput(output) {

  if (
    typeof output !== "string" ||
    !output.trim()
  ) {

    return (
      "I was unable to generate a response. Please try again."
    );
  }


  let cleaned = output.trim();


  if (cleaned.length > 12000) {

    cleaned = cleaned.substring(
      0,
      12000
    );
  }


  // ----------------------------------------------------------
  // Secret leakage protection
  // ----------------------------------------------------------

  const leakagePatterns = [

    /(?:api[_ -]?key|secret|password|access[_ -]?token)\s*[:=]\s*\S+/i,

    /process\.env\.[A-Z0-9_]+/i,

    /BEGIN\s+(?:RSA|OPENSSH|PRIVATE)\s+KEY/i,
  ];


  for (const pattern of leakagePatterns) {

    if (pattern.test(cleaned)) {

      return (
        "I can’t provide private system credentials or internal secrets."
      );
    }
  }


  return cleaned;
}


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

      return JSON.parse(
        match[0]
      );

    } catch {

      return null;
    }
  }
}


// ============================================================
// DATE HELPERS
// ============================================================

function pad(value) {

  return String(value)
    .padStart(2, "0");
}


function formatDateLocal(date) {

  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}`
  );
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
// RELATIVE DATE
// ============================================================

function parseRelativeDate(message) {

  const text = String(message || "")
    .toLowerCase();

  const today = new Date();


  if (text.includes("today")) {

    return formatDateLocal(
      today
    );
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
    const [name, targetDay]
    of Object.entries(weekdays)
  ) {

    if (
      text.includes(
        `next ${name}`
      )
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


  return formatDateLocal(
    today
  );
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


  return (
    `${pad(hours)}:${pad(minutes)}`
  );
}


// ============================================================
// NODE 1
// VALIDATE INPUT
// ============================================================

async function validateInputNode(state) {

  const lastMessage =
    state.messages[
      state.messages.length - 1
    ];


  const sanitized =
    validateUserInput(
      lastMessage.content
    );


  return {

    messages: [
      {
        role: "user",
        content: sanitized,
      },
    ],
  };
}


// ============================================================
// NODE 2
// CLASSIFY INTENT
// ============================================================

async function classifyIntentNode(state) {

  const message =
    state.messages[
      state.messages.length - 1
    ].content;


  const intent =
    await classifyIntent(
      message
    );


  console.log(
    "[LangGraph] Intent:",
    intent
  );


  return {
    intent,
  };
}


// ============================================================
// INTENT CLASSIFIER
// ============================================================

async function classifyIntent(
  userMessage
) {

  const text =
    String(userMessage || "")
      .trim()
      .toLowerCase();


  // ----------------------------------------------------------
  // Leave balance
  // ----------------------------------------------------------

  if (
    /\b(leave balance|leaves balance|how many leaves|how much leave|remaining leave|leave remaining)\b/i
      .test(text)
  ) {

    return "leave_balance";
  }


  // ----------------------------------------------------------
  // Leave policy
  // ----------------------------------------------------------

  if (
    /\b(leave policy|leave rules|leave entitlement|leave procedure|leave guidelines)\b/i
      .test(text)
  ) {

    return "leave_policy";
  }


  // ----------------------------------------------------------
  // Leave request
  // ----------------------------------------------------------

  if (
    /\b(give me leave|grant me leave|i need leave|i want leave|take leave|request leave|apply for leave|apply leave|get leave|need to take leave|want to take leave|can i get leave|please give me leave)\b/i
      .test(text)
  ) {

    return "leave_request";
  }


  // ----------------------------------------------------------
  // Calendar query
  // ----------------------------------------------------------

  if (
    /\b(meeting|calendar|schedule|appointment|event)\b/i.test(text) &&
    (
      /\b(today|tomorrow|this week|next week|this month|upcoming|next \d+ days|am i free|am i available|do i have|show|what|list|check)\b/i
        .test(text)
    )
  ) {

    return "calendar_events";
  }


  // ----------------------------------------------------------
  // Calendar create
  // ----------------------------------------------------------

  if (
    /\b(schedule|create|add|set up|book|arrange)\b/i
      .test(text) &&

    /\b(meeting|appointment|event|call|discussion)\b/i
      .test(text) &&

    !/\b(do i have|am i free|am i available|show|what|list|check)\b/i
      .test(text)
  ) {

    return "calendar_create";
  }


  // ----------------------------------------------------------
  // Gmail
  // ----------------------------------------------------------

  if (
    /\b(email|gmail|mail|inbox)\b/i
      .test(text)
  ) {

    if (
      /\b(send|write|compose|draft)\b/i
        .test(text)
    ) {

      return "gmail_send";
    }


    return "gmail_read";
  }


  // ----------------------------------------------------------
  // Explicit web search
  // ----------------------------------------------------------

  if (
    /\b(latest|current|today|recent|internet|web search|online)\b/i
      .test(text)
  ) {

    return "web_search";
  }


  // ----------------------------------------------------------
  // LLM fallback
  // ----------------------------------------------------------

  const prompt = `
Classify this Employee Copilot request into exactly one category.

Categories:

leave_balance
leave_policy
leave_request
calendar_events
calendar_create
gmail_read
gmail_send
web_search
general

Return ONLY the category.

User:
${userMessage}
`;


  try {

    const response =
      await llm.invoke(
        prompt
      );


    const intent =
      String(
        response.content || ""
      )
        .trim()
        .toLowerCase()
        .replace(
          /[`"' ]/g,
          ""
        );


    if (
      VALID_INTENTS.includes(
        intent
      )
    ) {

      return intent;
    }

  } catch (error) {

    console.error(
      "[Intent]",
      error
    );
  }


  return "general";
}


// ============================================================
// ROUTER
// ============================================================
//
// Hinglish:
//
// Ye LangGraph ka important part hai.
//
// classifyIntent node ne intent nikala.
//
// Ab router decide karega:
//
// "Kis node pe jaana hai?"
//
// ============================================================

function routeByIntent(state) {

  return state.intent;
}


// ============================================================
// NODE 3
// LEAVE BALANCE
// ============================================================

async function leaveBalanceNode(state) {

  try {

    const balance =
      await LeaveBalance.findByUserId(
        state.userId
      );


    if (!balance) {

      return {
        toolResult:
          "I could not retrieve your leave balance. Please contact HR.",

        currentTool: null,
      };
    }


    const toolResult =
      `Here is your current leave balance:\n\n` +

      `• Annual Leave: ${balance.annual_leave} days\n` +

      `• Sick Leave: ${balance.sick_leave} days\n` +

      `• Personal Leave: ${balance.personal_leave} days`;


    return {

      toolResult,

      currentTool: null,

      context: {
        leaveBalance: balance,
      },
    };

  } catch (error) {

    console.error(
      "[LeaveBalance]",
      error
    );


    return {

      toolResult:
        "I could not retrieve your leave balance right now. Please try again.",

      currentTool: null,
    };
  }
}


// ============================================================
// NODE 4
// LEAVE POLICY / RAG
// ============================================================

async function leavePolicyNode(state) {

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

      toolResult:
        ragResult.answer,

      currentTool: null,

      context: {
        ragResult,
      },

      sources:
        ragResult.sources || [],
    };

  } catch (error) {

    console.error(
      "[LeavePolicy]",
      error
    );


    return {

      toolResult:
        "I could not retrieve the leave policy right now. Please try again.",

      currentTool: null,
    };
  }
}


// ============================================================
// NODE 5
// EXTRACT LEAVE DETAILS
// ============================================================

async function extractLeaveDetails(
  userMessage
) {

  const prompt = `
You extract structured leave information.

Return ONLY valid JSON.

{
  "leave_type": "annual" | "sick" | "personal" | null,
  "start_date": "YYYY-MM-DD" | null,
  "end_date": "YYYY-MM-DD" | null,
  "reason": "string" | null
}

Rules:

- Convert today/tomorrow/next weekday into actual dates.
- Never invent missing dates.
- If only one date is provided, use it for both start_date and end_date.
- Do not invent information.

User:
${userMessage}
`;


  try {

    const response =
      await llm.invoke(
        prompt
      );


    return extractJSON(
      response.content
    );

  } catch (error) {

    console.error(
      "[LeaveExtraction]",
      error
    );

    return null;
  }
}


// ============================================================
// NODE 6
// PREPARE LEAVE
// ============================================================

async function prepareLeaveNode(state) {

  const message =
    state.messages[
      state.messages.length - 1
    ].content;


  const details =
    await extractLeaveDetails(
      message
    );


  if (
    !details ||
    !details.leave_type ||
    !details.start_date ||
    !details.end_date
  ) {

    return {

      toolResult:
        `To request leave, I need:\n\n` +

        `• Leave type: annual, sick, or personal\n` +

        `• Start date\n` +

        `• End date\n` +

        `• Reason (optional)\n\n` +

        `Example: "Apply annual leave from 2026-09-10 to 2026-09-12 for vacation."`,

      requiresConfirmation: false,

      pendingAction: null,
    };
  }


  const numberOfDays =
    Number(
      await LeaveRequest.calculateDays(
        details.start_date,
        details.end_date
      )
    );


  const pendingAction = {

    type: "leave_request",

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
      details.reason || null,

    number_of_days:
      numberOfDays,
  };


  return {

    pendingAction,

    currentTool:
      "leave_request",

    context: {
      leaveDetails:
        details,
    },
  };
}


// ============================================================
// NODE 7
// VALIDATE LEAVE
// ============================================================

async function validateLeaveNode(state) {

  const action =
    state.pendingAction;


  if (!action) {

    return {

      toolResult:
        "There is no pending leave request.",

      requiresConfirmation: false,
    };
  }


  const {
    leave_type,
    start_date,
    end_date,
    number_of_days,
  } = action;


  // ----------------------------------------------------------
  // Check balance
  // ----------------------------------------------------------

  const hasBalance =
    await LeaveBalance.checkAvailability(
      state.userId,
      leave_type,
      number_of_days
    );


  if (!hasBalance) {

    return {

      toolResult:
        `You don't have enough ${leave_type} leave balance for ${number_of_days} day(s).`,

      requiresConfirmation:
        false,

      pendingAction:
        null,
    };
  }


  // ----------------------------------------------------------
  // Check overlapping leave
  // ----------------------------------------------------------

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

      toolResult:
        "You already have a leave request overlapping these dates.",

      requiresConfirmation:
        false,

      pendingAction:
        null,
    };
  }


  // ----------------------------------------------------------
  // Calendar conflict
  // ----------------------------------------------------------

  let calendarConflicts = [];


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

      calendarConflicts =
        conflictCheck.conflicts || [];
    }

  } catch (error) {

    // Calendar unavailable hone par
    // leave request block nahi karenge.

    console.warn(
      "[Leave] Calendar conflict check failed:",
      error.message
    );
  }


  return {

    requiresConfirmation:
      true,

    hasConflicts:
      calendarConflicts.length > 0,

    context: {
      calendarConflicts,
    },

    toolResult:
      `Please review your leave request:\n\n` +

      `**Leave type:** ${leave_type}\n` +

      `**Dates:** ${start_date} → ${end_date}\n` +

      `**Days:** ${number_of_days}\n` +

      `**Reason:** ${action.reason || "Not specified"}\n\n` +

      `${
        calendarConflicts.length > 0
          ? "⚠️ There are calendar conflicts during this period.\n\n"
          : "✅ No calendar conflicts detected.\n\n"
      }` +

      `Would you like me to submit this leave request?`,
  };
}


// ============================================================
// NODE 8
// HUMAN APPROVAL
// ============================================================
//
// IMPORTANT:
//
// Ye actual LangGraph Human-in-the-loop hai.
//
// Graph yahan pause ho jayega.
//
// Frontend ko approval UI dikha sakte ho.
//
// User approve karega:
//
// Command({ resume: true })
//
// User reject karega:
//
// Command({ resume: false })
//
// ============================================================

async function leaveApprovalNode(state) {

  const approval = interrupt({

    type: "leave_confirmation",

    message:
      "Please confirm this leave request.",

    action:
      state.pendingAction,

    conflicts:
      state.context?.calendarConflicts || [],
  });


  if (!approval) {

    return {

      toolResult:
        "Leave request cancelled.",

      pendingAction:
        null,

      requiresConfirmation:
        false,

      approvalDecision: false,
    };
  }


  return {
    requiresConfirmation:
      false,

    approvalDecision: true,
  };
}


// ============================================================
// NODE 9
// SUBMIT LEAVE
// ============================================================

async function submitLeaveNode(state) {

  const action =
    state.pendingAction;


  // ----------------------------------------------------------
  // Check if user approved the action
  // ----------------------------------------------------------

  if (state.approvalDecision !== true) {

    return {

      toolResult:
        "Leave request cancelled.",

      pendingAction:
        null,

      requiresConfirmation:
        false,
    };
  }


  if (
    !action ||
    action.type !==
      "leave_request"
  ) {

    return {

      toolResult:
        "There is no pending leave request to submit.",

      pendingAction:
        null,

      requiresConfirmation:
        false,
    };
  }


  const {
    leave_type,
    start_date,
    end_date,
    number_of_days,
    reason,
  } = action;


  // ----------------------------------------------------------
  // IMPORTANT:
  // Approval ke baad bhi revalidate.
  //
  // Example:
  //
  // User ne approval diya.
  // Approval ke beech mein kisi aur request ne
  // leave balance change kar diya.
  //
  // Isliye mutation se pehle dobara check.
  // ----------------------------------------------------------

  const hasBalance =
    await LeaveBalance.checkAvailability(
      state.userId,
      leave_type,
      number_of_days
    );


  if (!hasBalance) {

    return {

      toolResult:
        `Your ${leave_type} leave balance is no longer sufficient. The request was not submitted.`,

      pendingAction:
        null,

      requiresConfirmation:
        false,
    };
  }


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

      toolResult:
        "The request now overlaps with another leave request, so it was not submitted.",

      pendingAction:
        null,

      requiresConfirmation:
        false,
    };
  }


  // ----------------------------------------------------------
  // DB mutation
  // ----------------------------------------------------------

  const leaveRequest =
    await LeaveRequest.create({

      user_id:
        state.userId,

      leave_type,

      start_date,

      end_date,

      number_of_days,

      reason,
    });


  return {

    toolResult:
      `Leave request submitted successfully.\n\n` +

      `Request ID: ${leaveRequest.id}\n` +

      `Type: ${leave_type}\n` +

      `Dates: ${start_date} to ${end_date}\n` +

      `Days: ${number_of_days}\n` +

      `Reason: ${reason || "Not specified"}\n` +

      `Status: Pending HR approval`,

    pendingAction:
      null,

    requiresConfirmation:
      false,

    context: {
      submittedLeaveRequest:
        leaveRequest,
    },
  };
}


// ============================================================
// CALENDAR DATE RANGE
// ============================================================

function getCalendarDateRange(
  userMessage
) {

  const message =
    String(userMessage || "")
      .toLowerCase();

  const today =
    new Date();


  // ----------------------------------------------------------
  // Specific ISO date
  // ----------------------------------------------------------

  const isoMatch =
    message.match(
      /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/
    );


  if (isoMatch) {

    const date =
      new Date(
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

  if (
    message.includes("today")
  ) {

    return {

      startDate:
        getStartOfDay(today),

      endDate:
        getEndOfDay(today),

      label:
        "today",
    };
  }


  // ----------------------------------------------------------
  // Tomorrow
  // ----------------------------------------------------------

  if (
    message.includes("tomorrow")
  ) {

    const tomorrow =
      addDays(today, 1);


    return {

      startDate:
        getStartOfDay(tomorrow),

      endDate:
        getEndOfDay(tomorrow),

      label:
        "tomorrow",
    };
  }


  // ----------------------------------------------------------
  // Next week
  // ----------------------------------------------------------

  if (
    message.includes("next week")
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

      label:
        "next week",
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

      label:
        "this week",
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

      label:
        "this month",
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
      addDays(
        today,
        30
      );


    return {

      startDate:
        new Date(),

      endDate:
        getEndOfDay(end),

      label:
        "upcoming",
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
      Number(
        nextDaysMatch[1]
      );


    if (
      days > 0 &&
      days <= 365
    ) {

      const end =
        addDays(
          today,
          days
        );


      return {

        startDate:
          new Date(),

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

    label:
      "today",
  };
}


// ============================================================
// CALENDAR FORMATTER
// ============================================================

function formatCalendarEvent(
  event
) {

  const title =
    event.summary ||
    "Untitled event";


  if (event.start?.date) {

    return {

      title,

      allDay: true,

      start:
        event.start.date,

      end:
        event.end?.date || null,

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


function formatEventTime(
  event
) {

  if (event.allDay) {

    return "All day";
  }


  if (!event.start) {

    return "Time unavailable";
  }


  const start =
    new Date(event.start);


  const end =
    event.end
      ? new Date(event.end)
      : null;


  const formatter =
    new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
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
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    );


  return (
    `${startText} - ` +
    `${endFormatter.format(end)}`
  );
}


// ============================================================
// NODE 10
// CALENDAR QUERY
// ============================================================

async function calendarQueryNode(state) {

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
// NO CALENDAR EVENTS
// ============================================================

function getNoCalendarEventsMessage(
  label
) {

  switch (label) {

    case "today":
      return (
        "You don't have any meetings or calendar events today."
      );

    case "tomorrow":
      return (
        "You don't have any meetings or calendar events tomorrow."
      );

    case "this week":
      return (
        "You don't have any meetings or calendar events this week."
      );

    case "next week":
      return (
        "You don't have any meetings or calendar events next week."
      );

    case "this month":
      return (
        "You don't have any meetings or calendar events this month."
      );

    case "upcoming":
      return (
        "You don't have any upcoming calendar events in the next 30 days."
      );

    default:

      return (
        "I couldn't find any upcoming calendar events."
      );
  }
}


// ============================================================
// CALENDAR EVENT EXTRACTION
// ============================================================

async function extractCalendarEventDetails(
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
      await llm.invoke(
        prompt
      );


    return extractJSON(
      response.content
    );

  } catch (error) {

    console.error(
      "[CalendarExtraction]",
      error
    );

    return null;
  }
}


// ============================================================
// NODE 11
// PREPARE CALENDAR
// ============================================================

async function prepareCalendarNode(state) {

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


  // Missing date ko deterministic parser se resolve karo.

  if (!details.date) {

    details.date =
      parseRelativeDate(
        message
      );
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

    type:
      "calendar_create",

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
// NODE 12
// VALIDATE CALENDAR
// ============================================================

async function validateCalendarNode(state) {

  const action =
    state.pendingAction;


  if (!action) {

    return {

      toolResult:
        "There is no pending calendar event.",

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

      toolResult:
        "What would you like to call the meeting?",

      missingField:
        "meeting title",

      requiresConfirmation:
        false,
    };
  }


  if (!date) {

    return {

      toolResult:
        "What date should I schedule the meeting for?",

      missingField:
        "date",

      requiresConfirmation:
        false,
    };
  }


  if (!start_time) {

    return {

      toolResult:
        "What time should I schedule the meeting?",

      missingField:
        "time",

      requiresConfirmation:
        false,
    };
  }


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

    requiresConfirmation:
      true,

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
// NODE 13
// CALENDAR APPROVAL
// ============================================================

async function calendarApprovalNode(
  state
) {

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

      pendingAction:
        null,

      requiresConfirmation:
        false,

      approvalDecision: false,
    };
  }


  return {
    requiresConfirmation:
      false,

    approvalDecision: true,
  };
}


// ============================================================
// NODE 14
// CREATE CALENDAR EVENT
// ============================================================

async function createCalendarNode(
  state
) {

  const action =
    state.pendingAction;


  // ----------------------------------------------------------
  // Check if user approved the action
  // ----------------------------------------------------------

  if (state.approvalDecision !== true) {

    return {

      toolResult:
        "Calendar event creation cancelled.",

      pendingAction:
        null,

      requiresConfirmation:
        false,
    };
  }


  if (
    !action ||
    action.type !==
      "calendar_create"
  ) {

    return {

      toolResult:
        "There is no pending calendar event to create.",

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
  } = action;


  if (
    !title ||
    !date ||
    !start_time ||
    !end_time
  ) {

    return {

      toolResult:
        "The calendar event information is incomplete.",

      pendingAction:
        null,
    };
  }


  const timezone =
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone ||
    "Asia/Kolkata";


  const eventData = {

    summary:
      title,

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

      pendingAction:
        null,

      requiresConfirmation:
        false,

      context: {

        createdEvent:
          event,
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

      pendingAction:
        null,

      requiresConfirmation:
        false,
    };
  }
}


// ============================================================
// GMAIL HEADER
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


// ============================================================
// NODE 15
// GMAIL READ
// ============================================================

async function gmailReadNode(state) {

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

        toolResult:
          "Your Gmail is not connected. Please connect Gmail from the settings page first.",
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


    // ----------------------------------------------------------
    // Unread
    // ----------------------------------------------------------

    if (
      lower.includes("unread")
    ) {

      filtered =
        filtered.filter(
          email =>
            !email.labelIds ||
            email.labelIds.includes(
              "UNREAD"
            )
        );
    }


    // ----------------------------------------------------------
    // From
    // ----------------------------------------------------------

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
            ""
          );


      filtered =
        filtered.filter(
          email => {

            const from =
              getHeader(
                email,
                "From"
              );


            return (
              from
                ?.toLowerCase()
                .includes(
                  person.toLowerCase()
                )
            );
          }
        );
    }


    // ----------------------------------------------------------
    // Topic
    // ----------------------------------------------------------

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
            ""
          );


      filtered =
        filtered.filter(
          email => {

            const subject =
              getHeader(
                email,
                "Subject"
              );


            return (
              subject
                ?.toLowerCase()
                .includes(
                  topic.toLowerCase()
                )
            );
          }
        );
    }


    if (
      filtered.length === 0
    ) {

      return {

        toolResult:
          "I could not find any matching emails in your recent Gmail.",

        context: {

          gmailResults: [],
        },
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
                "From"
              ) ||
              "Unknown sender";


            const subject =
              getHeader(
                email,
                "Subject"
              ) ||
              "No subject";


            const date =
              getHeader(
                email,
                "Date"
              ) ||
              "Unknown date";


            return (
              `${index + 1}. **${subject}**\n` +
              `   From: ${from}\n` +
              `   Date: ${date}`
            );
          }
        );


    return {

      toolResult:

        `I found ${filtered.length} matching email${
          filtered.length === 1
            ? ""
            : "s"
        }:\n\n` +

        lines.join("\n\n"),

      context: {

        gmailResults:
          filtered.slice(0, 10),
      },
    };

  } catch (error) {

    console.error(
      "[GmailRead]",
      error
    );


    return {

      toolResult:
        "I could not access your Gmail right now. Please try again.",
    };
  }
}


// ============================================================
// EMAIL EXTRACTION
// ============================================================

async function extractEmailDetails(
  userMessage
) {

  const prompt = `
Extract email information.

Return ONLY valid JSON.

{
  "to": "email@example.com" | null,
  "subject": "subject" | null,
  "body": "body" | null
}

Rules:

- Do not invent email address.
- Missing recipient = null.
- Preserve intended email content.
- No markdown outside JSON.

User:
${userMessage}
`;


  try {

    const response =
      await llm.invoke(
        prompt
      );


    return extractJSON(
      response.content
    );

  } catch (error) {

    console.error(
      "[EmailExtraction]",
      error
    );

    return null;
  }
}


// ============================================================
// NODE 16
// PREPARE EMAIL
// ============================================================

async function prepareEmailNode(
  state
) {

  try {

    const connected =
      await gmailService.isConnected(
        state.userId
      );


    if (!connected) {

      return {

        toolResult:
          "Your Gmail is not connected. Please connect Gmail from the settings page first.",
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

        toolResult:
          "I can prepare the email, but I need the recipient email address first.",
      };
    }


    const subject =
      details.subject?.trim() ||
      "No subject";


    const body =
      details.body?.trim() ||
      "";


    if (!body) {

      return {

        toolResult:
          "I have the recipient and subject, but I still need the email body.",
      };
    }


    const pendingAction = {

      type:
        "gmail_send",

      actionId:
        `gmail_send_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      to:
        details.to.trim(),

      subject,

      body,
    };


    return {

      pendingAction,

      requiresConfirmation:
        true,

      currentTool:
        "gmail_send",

      context: {

        emailDraft: {

          to:
            pendingAction.to,

          subject:
            pendingAction.subject,

          body:
            pendingAction.body,
        },
      },

      toolResult:

        `I've prepared this email:\n\n` +

        `**To:** ${pendingAction.to}\n` +

        `**Subject:** ${pendingAction.subject}\n\n` +

        `**Message:**\n${pendingAction.body}\n\n` +

        `Please confirm if you'd like me to send it.`,
    };

  } catch (error) {

    console.error(
      "[GmailPrepare]",
      error
    );


    return {

      toolResult:
        "I could not prepare the email right now. Please try again.",
    };
  }
}


// ============================================================
// NODE 17
// EMAIL APPROVAL
// ============================================================

async function emailApprovalNode(
  state
) {

  const approval =
    interrupt({

      type:
        "gmail_confirmation",

      message:
        "Please confirm sending this email.",

      action:
        state.pendingAction,
    });


  if (!approval) {

    return {

      toolResult:
        "Email sending cancelled.",

      pendingAction:
        null,

      requiresConfirmation:
        false,

      approvalDecision: false,
    };
  }


  return {

    requiresConfirmation:
      false,

    approvalDecision: true,
  };
}


// ============================================================
// NODE 18
// SEND EMAIL
// ============================================================

async function sendEmailNode(
  state
) {

  const action =
    state.pendingAction;


  // ----------------------------------------------------------
  // Check if user approved the action
  // ----------------------------------------------------------

  if (state.approvalDecision !== true) {

    return {

      toolResult:
        "Email sending cancelled.",

      pendingAction:
        null,

      requiresConfirmation:
        false,
    };
  }


  if (
    !action ||
    action.type !==
      "gmail_send"
  ) {

    return {

      toolResult:
        "There is no pending email to send.",

      pendingAction:
        null,
    };
  }


  const {
    to,
    subject,
    body,
  } = action;


  if (!to || !body) {

    return {

      toolResult:
        "The email information is incomplete, so I did not send it.",

      pendingAction:
        null,
    };
  }


  try {

    await gmailService.sendEmail(
      state.userId,
      to,
      subject,
      body,
      false
    );


    return {

      toolResult:
        `Email sent successfully to ${to}.`,

      pendingAction:
        null,

      requiresConfirmation:
        false,

      context: {

        sentEmail: {

          to,

          subject,
        },
      },
    };

  } catch (error) {

    console.error(
      "[GmailSend]",
      error
    );


    return {

      toolResult:
        `I couldn't send the email. ${error.message || "Please try again."}`,

      pendingAction:
        null,

      requiresConfirmation:
        false,
    };
  }
}


// ============================================================
// NODE 19
// WEB SEARCH
// ============================================================

async function webSearchNode(
  state
) {

  try {

    if (
      !tavilyTool?.isConfigured
    ) {

      return {

        toolResult:
          "Web search is not configured yet. Please configure TAVILY_API_KEY in the backend environment.",
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

          searchDepth:
            "basic",

          includeAnswer:
            true,
        }
      );


    if (
      !result?.success
    ) {

      return {

        toolResult:
          `I couldn't complete the web search: ${
            result?.error ||
            "Unknown search error"
          }`,
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

        toolResult:
          "I searched the web but could not find relevant results.",

        context: {

          webSearchResults: [],
        },
      };
    }


    const searchContext =
      results
        .map(
          (item, index) =>
            `[Source ${index + 1}]
Title: ${item.title || "Untitled"}
URL: ${item.url || "Unavailable"}
Content: ${item.content || ""}`
        )
        .join("\n\n");


    const prompt = `
You are an Employee Copilot.

Answer the user's question using the web search results.

USER QUESTION:
${message}

WEB RESULTS:
${searchContext}

${
  result.answer
    ? `SEARCH SUMMARY:\n${result.answer}\n`
    : ""
}

Rules:

- Use provided search results.
- Do not invent facts.
- Clearly distinguish web information from company information.
- If sources disagree, mention it.
- Keep answer concise.
- Do not expose internal implementation details.

Answer:
`;


    const response =
      await llm.invoke(
        prompt
      );


    const answer =
      validateAIOutput(
        String(
          response.content || ""
        )
      );


    return {

      toolResult:
        answer,

      context: {

        webSearchResults:
          results,

        webSearchAnswer:
          result.answer || null,
      },
    };

  } catch (error) {

    console.error(
      "[Tavily]",
      error
    );


    return {

      toolResult:
        "I encountered an error while searching the web. Please try again.",
    };
  }
}


// ============================================================
// NODE 20
// GENERAL RAG
// ============================================================

async function generalRAGNode(
  state
) {

  try {

    const message =
      state.messages[
        state.messages.length - 1
      ].content;


    const basePrompt =
      `
You are an Employee Copilot.

Answer the user's question using the company knowledge base.

Do not invent company policies.
`;


    const enhancedPrompt =
      state.compactContext

        ? conversationMemoryService.buildLLMContext(
            state.compactContext,
            basePrompt
          )

        : basePrompt;


    const ragResult =
      await runRAGWorkflow(
        message,
        state.userId,
        state.userRole,
        enhancedPrompt
      );


    return {

      toolResult:
        ragResult.answer,

      context: {

        ragResult,
      },

      sources:
        ragResult.sources || [],
    };

  } catch (error) {

    console.error(
      "[RAG]",
      error
    );


    return {

      toolResult:
        "I could not retrieve the company knowledge right now. Please try again.",
    };
  }
}


// ============================================================
// RESPONSE NODE
// ============================================================
//
// Har branch ka result yahan aayega.
//
// Isliye frontend ko ek consistent structure milega.
// ============================================================

async function responseNode(state) {

  const response =
    validateAIOutput(
      state.toolResult ||
      "I could not generate a response."
    );


  return {

    response,

    sources:
      state.sources ||
      state.context?.ragResult?.sources ||
      [],

    error:
      null,
  };
}


// ============================================================
// GRAPH
// ============================================================
//
// AB actual LangGraph yahan ban raha hai.
//
// ============================================================

const workflow =
  new StateGraph(
    EmployeeState
  )

    // --------------------------------------------------------
    // Core nodes
    // --------------------------------------------------------

    .addNode(
      "validateInput",
      validateInputNode
    )

    .addNode(
      "classifyIntent",
      classifyIntentNode
    )


    // --------------------------------------------------------
    // Leave
    // --------------------------------------------------------

    .addNode(
      "leaveBalance",
      leaveBalanceNode
    )

    .addNode(
      "leavePolicy",
      leavePolicyNode
    )

    .addNode(
      "prepareLeave",
      prepareLeaveNode
    )

    .addNode(
      "validateLeave",
      validateLeaveNode
    )

    .addNode(
      "leaveApproval",
      leaveApprovalNode
    )

    .addNode(
      "submitLeave",
      submitLeaveNode
    )


    // --------------------------------------------------------
    // Calendar
    // --------------------------------------------------------

    .addNode(
      "calendarQuery",
      calendarQueryNode
    )

    .addNode(
      "prepareCalendar",
      prepareCalendarNode
    )

    .addNode(
      "validateCalendar",
      validateCalendarNode
    )

    .addNode(
      "calendarApproval",
      calendarApprovalNode
    )

    .addNode(
      "createCalendar",
      createCalendarNode
    )


    // --------------------------------------------------------
    // Gmail
    // --------------------------------------------------------

    .addNode(
      "gmailRead",
      gmailReadNode
    )

    .addNode(
      "prepareEmail",
      prepareEmailNode
    )

    .addNode(
      "emailApproval",
      emailApprovalNode
    )

    .addNode(
      "sendEmail",
      sendEmailNode
    )


    // --------------------------------------------------------
    // Other
    // --------------------------------------------------------

    .addNode(
      "webSearch",
      webSearchNode
    )

    .addNode(
      "generalRAG",
      generalRAGNode
    )


    // --------------------------------------------------------
    // Final response
    // --------------------------------------------------------

    .addNode(
      "generateResponse",
      responseNode
    );


// ============================================================
// EDGES
// ============================================================


// START
//
// User request graph mein enter karega.

workflow.addEdge(
  START,
  "validateInput"
);


// validate → classify

workflow.addEdge(
  "validateInput",
  "classifyIntent"
);


// ============================================================
// INTENT ROUTING
// ============================================================
//
// Ye tumhare old switch(intent) ko replace karta hai.
//
// ============================================================

workflow.addConditionalEdges(

  "classifyIntent",

  routeByIntent,

  {

    leave_balance:
      "leaveBalance",

    leave_policy:
      "leavePolicy",

    leave_request:
      "prepareLeave",

    calendar_events:
      "calendarQuery",

    calendar_create:
      "prepareCalendar",

    gmail_read:
      "gmailRead",

    gmail_send:
      "prepareEmail",

    web_search:
      "webSearch",

    general:
      "generalRAG",
  }
);


// ============================================================
// SIMPLE NODES → RESPONSE
// ============================================================

workflow.addEdge(
  "leaveBalance",
  "generateResponse"
);

workflow.addEdge(
  "leavePolicy",
  "generateResponse"
);

workflow.addEdge(
  "calendarQuery",
  "generateResponse"
);

workflow.addEdge(
  "gmailRead",
  "generateResponse"
);

workflow.addEdge(
  "webSearch",
  "generateResponse"
);

workflow.addEdge(
  "generalRAG",
  "generateResponse"
);


// ============================================================
// LEAVE FLOW
// ============================================================

workflow.addEdge(
  "prepareLeave",
  "validateLeave"
);


workflow.addConditionalEdges(

  "validateLeave",

  state => {

    if (
      state.requiresConfirmation
    ) {

      return "approval";
    }


    return "done";
  },

  {

    approval:
      "leaveApproval",

    done:
      "generateResponse",
  }
);


workflow.addConditionalEdges(

  "leaveApproval",

  state => {

    // interrupt resume ke baad
    // agar approvalDecision true hai to submit.

    if (state.approvalDecision === true) {
      return "submit";
    }

    return "cancel";
  },

  {

    submit:
      "submitLeave",

    cancel:
      "generateResponse",
  }
);


workflow.addEdge(
  "submitLeave",
  "generateResponse"
);


// ============================================================
// CALENDAR FLOW
// ============================================================

workflow.addEdge(
  "prepareCalendar",
  "validateCalendar"
);


workflow.addConditionalEdges(

  "validateCalendar",

  state => {

    if (
      state.requiresConfirmation
    ) {

      return "approval";
    }


    return "done";
  },

  {

    approval:
      "calendarApproval",

    done:
      "generateResponse",
  }
);


workflow.addConditionalEdges(

  "calendarApproval",

  state => {

    if (state.approvalDecision === true) {
      return "create";
    }

    return "cancel";
  },

  {

    create:
      "createCalendar",

    cancel:
      "generateResponse",
  }
);


workflow.addEdge(
  "createCalendar",
  "generateResponse"
);


// ============================================================
// EMAIL FLOW
// ============================================================

workflow.addConditionalEdges(

  "prepareEmail",

  state => {

    if (
      state.requiresConfirmation
    ) {

      return "approval";
    }


    return "done";
  },

  {

    approval:
      "emailApproval",

    done:
      "generateResponse",
  }
);


workflow.addConditionalEdges(

  "emailApproval",

  state => {

    if (state.approvalDecision === true) {
      return "send";
    }

    return "cancel";
  },

  {

    send:
      "sendEmail",

    cancel:
      "generateResponse",
  }
);


workflow.addEdge(
  "sendEmail",
  "generateResponse"
);


// ============================================================
// END
// ============================================================

workflow.addEdge(
  "generateResponse",
  END
);


// ============================================================
// CHECKPOINTER
// ============================================================
//
// Hinglish:
//
// Human-in-the-loop ke liye graph ko state yaad rakhni hogi.
//
// MemorySaver development ke liye theek hai.
//
// Production mein persistent checkpointer use karna better hai.
// ============================================================

const checkpointer =
  new MemorySaver();


// ============================================================
// COMPILE
// ============================================================

export const employeeCopilotGraph =
  workflow.compile({
    checkpointer,
  });


// ============================================================
// MAIN FUNCTION
// ============================================================
//
// FastAPI/Express controller isi function ko call karega.
//
// ============================================================

export async function runEmployeeCopilot({

  userMessage,

  userId,

  userRole,

  conversationId,

  compactContext = null,

}) {

  const threadId =
    conversationId ||
    `user_${userId}`;


  const config = {

    configurable: {

      thread_id:
        threadId,
    },
  };


  try {

    const result =
      await employeeCopilotGraph.invoke(

        {

          messages: [

            {

              role: "user",

              content:
                userMessage,
            },
          ],

          userId,

          userRole,

          conversationId,

          compactContext,

        },

        config
      );


    return {

      response:
        result.response,

      sources:
        result.sources || [],

      requiresConfirmation:
        result.requiresConfirmation ||
        false,

      pendingAction:
        result.pendingAction ||
        null,

      context:
        result.context ||
        null,

      error:
        result.error ||
        null,
    };

  } catch (error) {

    console.error(
      "[EmployeeCopilotGraph]",
      error
    );


    return {

      response:
        "I encountered an error while processing your request. Please try again.",

      sources: [],

      requiresConfirmation:
        false,

      pendingAction:
        null,

      error:
        error.message,
    };
  }
}


// ============================================================
// CONFIRM / RESUME
// ============================================================
//
// Frontend se user "Yes" kare:
//
// Command({ resume: true })
//
// User "No" kare:
//
// Command({ resume: false })
//
// ============================================================

export async function resumeEmployeeCopilot({

  conversationId,

  approved,

}) {

  const config = {

    configurable: {

      thread_id:
        conversationId,
    },
  };


  try {

    const result =
      await employeeCopilotGraph.invoke(

        new Command({
          resume:
            approved,
        }),

        config
      );


    return {

      response:
        result.response,

      sources:
        result.sources || [],

      requiresConfirmation:
        result.requiresConfirmation ||
        false,

      pendingAction:
        result.pendingAction ||
        null,

      error:
        result.error ||
        null,
    };

  } catch (error) {

    console.error(
      "[EmployeeCopilotResume]",
      error
    );


    return {

      response:
        "I could not resume the workflow.",

      sources: [],

      requiresConfirmation:
        false,

      pendingAction:
        null,

      error:
        error.message,
    };
  }
}