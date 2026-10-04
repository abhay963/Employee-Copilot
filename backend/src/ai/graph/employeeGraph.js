// ============================================================
// EMPLOYEE COPILOT - MAIN LANGGRAPH
// ============================================================
//
// This is the central LangGraph orchestration file.
//
// Responsibilities:
//
// 1. Define EmployeeState
// 2. Classify user intent
// 3. Route intent
// 4. Register nodes
// 5. Connect nodes
// 6. Handle conditional workflows
// 7. Compile graph
// 8. Checkpoint graph execution
// 9. Run graph
// 10. Resume interrupted workflows
//
// Business logic remains inside ./nodes/*.js
//
// ============================================================


import {
  StateGraph,
  Annotation,
  START,
  END,
  MemorySaver,
  Command,
} from "@langchain/langgraph";

import { z } from "zod";

import  geminiLLM  from "../llm/gemini.js";


// ============================================================
// NODE IMPORTS
// ============================================================


// ------------------------------------------------------------
// VALIDATION
// ------------------------------------------------------------

import {
  validateInputNode,
} from "./nodes/validation.js";


// ------------------------------------------------------------
// LEAVE
// ------------------------------------------------------------

import {
  leaveBalanceNode,
  leavePolicyNode,
  extractLeaveDetails,
  prepareLeaveNode,
  validateLeaveNode,
  leaveApprovalNode,
  submitLeaveNode,
} from "./nodes/leave.js";


// ------------------------------------------------------------
// CALENDAR
// ------------------------------------------------------------

import {
  calendarQueryNode,
  extractCalendarEventDetails,
  prepareCalendarNode,
  validateCalendarNode,
  calendarApprovalNode,
  createCalendarNode,
} from "./nodes/calendar.js";


// ------------------------------------------------------------
// EMAIL / GMAIL
// ------------------------------------------------------------

import {
  gmailReadNode,
  extractEmailDetails,
  prepareEmailNode,
  emailApprovalNode,
  sendEmailNode,
} from "./nodes/email.js";


// ------------------------------------------------------------
// WEB SEARCH
// ------------------------------------------------------------

import {
  webSearchNode,
} from "./nodes/webSearch.js";


// ------------------------------------------------------------
// RAG
// ------------------------------------------------------------

import {
  ragNode,
} from "./nodes/rag.js";


// ------------------------------------------------------------
// RESPONSE
// ------------------------------------------------------------

import {
  responseNode,
} from "./nodes/response.js";


// ============================================================
// 1. EMPLOYEE STATE
// ============================================================
//
// This is the SINGLE shared state for the complete graph.
//
// Every node receives this state and can return partial updates.
//
// ============================================================

export const EmployeeState = Annotation.Root({

  // ----------------------------------------------------------
  // USER INFORMATION
  // ----------------------------------------------------------

  userId: Annotation(),

  userRole: Annotation(),

  conversationId: Annotation(),


  // ----------------------------------------------------------
  // CONVERSATION MESSAGES
  // ----------------------------------------------------------

  messages: Annotation({

    reducer: (current, update) => [
      ...current,
      ...update,
    ],

    default: () => [],

  }),


  // ----------------------------------------------------------
  // INTENT
  // ----------------------------------------------------------

  intent: Annotation(),


  // ----------------------------------------------------------
  // TOOL INFORMATION
  // ----------------------------------------------------------

  currentTool: Annotation(),

  toolResult: Annotation(),


  // ----------------------------------------------------------
  // ACTION / APPROVAL
  // ----------------------------------------------------------

  pendingAction: Annotation(),

  requiresConfirmation: Annotation({
    default: () => false,
  }),

  approvalDecision: Annotation({
    default: () => null,
  }),


  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  hasConflicts: Annotation({
    default: () => false,
  }),

  missingField: Annotation(),


  // ----------------------------------------------------------
  // CONTEXT
  // ----------------------------------------------------------

  context: Annotation({
    default: () => ({}),
  }),

  compactContext: Annotation(),


  // ----------------------------------------------------------
  // FINAL RESPONSE
  // ----------------------------------------------------------

  response: Annotation(),

  sources: Annotation({
    default: () => [],
  }),


  // ----------------------------------------------------------
  // ERROR
  // ----------------------------------------------------------

  error: Annotation(),

});


// ============================================================
// 2. INTENT DEFINITIONS
// ============================================================
//
// These are the ONLY supported intents.
//
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
// 3. INTENT VALIDATION SCHEMA
// ============================================================

const IntentSchema = z.enum(VALID_INTENTS);


// ============================================================
// 4. INTENT CLASSIFIER
// ============================================================
//
// First we use deterministic rules for common requests.
//
// If no rule matches, Gemini performs classification.
//
// ============================================================

async function classifyIntent(userMessage) {

  // ----------------------------------------------------------
  // EMPTY MESSAGE
  // ----------------------------------------------------------

  if (!userMessage) {

    return "general";

  }


  const message =
    userMessage
      .toLowerCase()
      .trim();


  // ==========================================================
  // LEAVE BALANCE
  // ==========================================================

  if (

    message.includes("leave balance") ||

    message.includes("remaining leave") ||

    message.includes("how many leaves") ||

    message.includes("leaves left")

  ) {

    return "leave_balance";

  }


  // ==========================================================
  // LEAVE POLICY
  // ==========================================================

  if (

    message.includes("leave policy") ||

    message.includes("leave rules") ||

    message.includes("leave policies")

  ) {

    return "leave_policy";

  }


  // ==========================================================
  // LEAVE REQUEST
  // ==========================================================

  if (

    message.includes("apply leave") ||

    message.includes("request leave") ||

    message.includes("take leave") ||

    message.includes("book leave")

  ) {

    return "leave_request";

  }


  // ==========================================================
  // CALENDAR QUERY
  // ==========================================================

  if (

    message.includes("calendar") &&

    (

      message.includes("event") ||

      message.includes("meeting") ||

      message.includes("today") ||

      message.includes("tomorrow") ||

      message.includes("schedule")

    )

  ) {

    // --------------------------------------------------------
    // If the user wants to CREATE something, handle it later.
    // --------------------------------------------------------

    if (

      message.includes("create") ||

      message.includes("schedule") ||

      message.includes("book") ||

      message.includes("arrange") ||

      message.includes("add")

    ) {

      return "calendar_create";

    }


    return "calendar_events";

  }


  // ==========================================================
  // CALENDAR CREATE
  // ==========================================================

  if (

    (

      message.includes("schedule") ||

      message.includes("create") ||

      message.includes("add") ||

      message.includes("book") ||

      message.includes("arrange")

    ) &&

    (

      message.includes("meeting") ||

      message.includes("event") ||

      message.includes("calendar")

    )

  ) {

    return "calendar_create";

  }


  // ==========================================================
  // GMAIL SEND
  // ==========================================================

  if (

    (

      message.includes("email") ||

      message.includes("gmail") ||

      message.includes("mail") ||

      message.includes("inbox")

    ) &&

    (

      message.includes("send") ||

      message.includes("write") ||

      message.includes("compose") ||

      message.includes("draft")

    )

  ) {

    return "gmail_send";

  }


  // ==========================================================
  // GMAIL READ
  // ==========================================================

  if (

    message.includes("email") ||

    message.includes("gmail") ||

    message.includes("mail") ||

    message.includes("inbox")

  ) {

    return "gmail_read";

  }


  // ==========================================================
  // WEB SEARCH
  // ==========================================================

  if (

    message.includes("latest") ||

    message.includes("current") ||

    message.includes("recent") ||

    message.includes("internet") ||

    message.includes("web search") ||

    message.includes("online")

  ) {

    return "web_search";

  }


  // ==========================================================
  // GEMINI FALLBACK
  // ==========================================================

  try {

    const prompt = `

You are an intent classifier for an Employee AI Copilot.

Classify the user's message into exactly ONE of these categories:

${VALID_INTENTS.join(", ")}

Rules:

leave_balance:
Questions about remaining or available leave.

leave_policy:
Questions about company leave policies.

leave_request:
Requests to apply, request, or take leave.

calendar_events:
Questions about existing calendar events or meetings.

calendar_create:
Requests to create or schedule calendar events.

gmail_read:
Requests to read, search, or check emails.

gmail_send:
Requests to send, write, compose, or draft emails.

web_search:
Requests requiring current internet or web information.

general:
Anything that does not fit the above categories.

Return ONLY the category name.

User message:
${userMessage}
`;


    const result =
      await geminiLLM.invoke(prompt);


    const rawResponse =

      typeof result?.content === "string"

        ? result.content

        : String(
            result?.content ?? ""
          );


    const cleanedResponse =

      rawResponse
        .trim()
        .toLowerCase()
        .replace(/```/g, "")
        .trim();


    const parsed =
      IntentSchema.safeParse(
        cleanedResponse
      );


    if (parsed.success) {

      return parsed.data;

    }


    return "general";

  } catch (error) {

    console.error(
      "[IntentClassifier] Error:",
      error
    );

    return "general";

  }

}


// ============================================================
// 5. INTENT CLASSIFICATION NODE
// ============================================================

async function classifyIntentNode(state) {

  const messages =
    state.messages || [];


  // ----------------------------------------------------------
  // NO MESSAGE
  // ----------------------------------------------------------

  if (messages.length === 0) {

    return {
      intent: "general",
    };

  }


  // ----------------------------------------------------------
  // LAST MESSAGE
  // ----------------------------------------------------------

  const lastMessage =
    messages[messages.length - 1];


  let userMessage;


  if (
    typeof lastMessage === "string"
  ) {

    userMessage =
      lastMessage;

  } else {

    userMessage =
      lastMessage?.content || "";

  }


  // ----------------------------------------------------------
  // CLASSIFY
  // ----------------------------------------------------------

  const intent =
    await classifyIntent(
      userMessage
    );


  console.log(
    `[Intent] ${userMessage} -> ${intent}`
  );


  return {
    intent,
  };

}


// ============================================================
// 6. INTENT ROUTES
// ============================================================
//
// Intent → Graph Node
//
// ============================================================

const INTENT_ROUTES = {

  leave_balance:
    "leaveBalance",

  leave_policy:
    "leavePolicy",

  leave_request:
    "extractLeaveDetails",

  calendar_events:
    "calendarQuery",

  calendar_create:
    "extractCalendarEventDetails",

  gmail_read:
    "gmailRead",

  gmail_send:
    "extractEmailDetails",

  web_search:
    "webSearch",

  general:
    "generalRAG",

};


// ============================================================
// 7. ROUTER
// ============================================================
//
// This function returns the intent key.
//
// The conditional edge below maps that key to the
// corresponding graph node.
//
// ============================================================

function routeByIntent(state) {

  const intent =
    state.intent;


  if (

    !intent ||

    !INTENT_ROUTES[intent]

  ) {

    return "general";

  }


  return intent;

}


// ============================================================
// 8. CREATE GRAPH
// ============================================================

const workflow =
  new StateGraph(EmployeeState);


// ============================================================
// 9. REGISTER CORE NODES
// ============================================================

workflow.addNode(
  "validateInput",
  validateInputNode
);


workflow.addNode(
  "classifyIntent",
  classifyIntentNode
);


// ============================================================
// 10. REGISTER LEAVE NODES
// ============================================================

workflow.addNode(
  "leaveBalance",
  leaveBalanceNode
);


workflow.addNode(
  "leavePolicy",
  leavePolicyNode
);


workflow.addNode(
  "extractLeaveDetails",
  extractLeaveDetails
);


workflow.addNode(
  "prepareLeave",
  prepareLeaveNode
);


workflow.addNode(
  "validateLeave",
  validateLeaveNode
);


workflow.addNode(
  "leaveApproval",
  leaveApprovalNode
);


workflow.addNode(
  "submitLeave",
  submitLeaveNode
);


// ============================================================
// 11. REGISTER CALENDAR NODES
// ============================================================

workflow.addNode(
  "calendarQuery",
  calendarQueryNode
);


workflow.addNode(
  "extractCalendarEventDetails",
  extractCalendarEventDetails
);


workflow.addNode(
  "prepareCalendar",
  prepareCalendarNode
);


workflow.addNode(
  "validateCalendar",
  validateCalendarNode
);


workflow.addNode(
  "calendarApproval",
  calendarApprovalNode
);


workflow.addNode(
  "createCalendar",
  createCalendarNode
);


// ============================================================
// 12. REGISTER EMAIL NODES
// ============================================================

workflow.addNode(
  "gmailRead",
  gmailReadNode
);


workflow.addNode(
  "extractEmailDetails",
  extractEmailDetails
);


workflow.addNode(
  "prepareEmail",
  prepareEmailNode
);


workflow.addNode(
  "emailApproval",
  emailApprovalNode
);


workflow.addNode(
  "sendEmail",
  sendEmailNode
);


// ============================================================
// 13. REGISTER OTHER NODES
// ============================================================

workflow.addNode(
  "webSearch",
  webSearchNode
);


workflow.addNode(
  "generalRAG",
  ragNode
);


workflow.addNode(
  "generateResponse",
  responseNode
);


// ============================================================
// 14. START → VALIDATION
// ============================================================

workflow.addEdge(
  START,
  "validateInput"
);


// ============================================================
// 15. VALIDATION → CLASSIFICATION
// ============================================================

workflow.addEdge(
  "validateInput",
  "classifyIntent"
);


// ============================================================
// 16. INTENT → ROUTING
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
      "extractLeaveDetails",

    calendar_events:
      "calendarQuery",

    calendar_create:
      "extractCalendarEventDetails",

    gmail_read:
      "gmailRead",

    gmail_send:
      "extractEmailDetails",

    web_search:
      "webSearch",

    general:
      "generalRAG",

  }

);


// ============================================================
// 17. SIMPLE FLOWS
// ============================================================
//
// These nodes perform an operation and then generate
// the final natural-language response.
//
// ============================================================


// ------------------------------------------------------------
// Leave balance
// ------------------------------------------------------------

workflow.addEdge(
  "leaveBalance",
  "generateResponse"
);


// ------------------------------------------------------------
// Leave policy
// ------------------------------------------------------------

workflow.addEdge(
  "leavePolicy",
  "generateResponse"
);


// ------------------------------------------------------------
// Calendar query
// ------------------------------------------------------------

workflow.addEdge(
  "calendarQuery",
  "generateResponse"
);


// ------------------------------------------------------------
// Gmail read
// ------------------------------------------------------------

workflow.addEdge(
  "gmailRead",
  "generateResponse"
);


// ------------------------------------------------------------
// Web search
// ------------------------------------------------------------

workflow.addEdge(
  "webSearch",
  "generateResponse"
);


// ------------------------------------------------------------
// RAG
// ------------------------------------------------------------

workflow.addEdge(
  "generalRAG",
  "generateResponse"
);


// ============================================================
// 18. LEAVE REQUEST FLOW
// ============================================================
//
// User:
// "I want leave tomorrow"
//
//      ↓
// extractLeaveDetails
//      ↓
// prepareLeave
//      ↓
// validateLeave
//      ↓
//      ├── approval → leaveApproval
//      │                    ↓
//      │              approved/rejected
//      │
//      └── done → generateResponse
//
// ============================================================

workflow.addEdge(
  "extractLeaveDetails",
  "prepareLeave"
);


workflow.addEdge(
  "prepareLeave",
  "validateLeave"
);


// ------------------------------------------------------------
// Leave validation routing
// ------------------------------------------------------------

workflow.addConditionalEdges(

  "validateLeave",

  (state) => {

    if (
      state.missingField
    ) {

      return "missing";

    }


    if (
      state.hasConflicts
    ) {

      return "conflict";

    }


    if (
      state.requiresConfirmation
    ) {

      return "approval";

    }


    return "submit";

  },

  {

    missing:
      "generateResponse",

    conflict:
      "generateResponse",

    approval:
      "leaveApproval",

    submit:
      "submitLeave",

  }

);


// ------------------------------------------------------------
// Leave approval result
// ------------------------------------------------------------

workflow.addConditionalEdges(

  "leaveApproval",

  (state) => {

    if (
      state.approvalDecision === true
    ) {

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


// ------------------------------------------------------------
// Submit leave
// ------------------------------------------------------------

workflow.addEdge(
  "submitLeave",
  "generateResponse"
);


// ============================================================
// 19. CALENDAR CREATE FLOW
// ============================================================
//
// User:
// "Schedule a meeting with Rahul tomorrow at 5 PM"
//
//      ↓
// extractCalendarEventDetails
//      ↓
// prepareCalendar
//      ↓
// validateCalendar
//      ↓
//      ├── approval → calendarApproval
//      │                    ↓
//      │              approved/rejected
//      │
//      └── done → generateResponse
//
// ============================================================

workflow.addEdge(
  "extractCalendarEventDetails",
  "prepareCalendar"
);


workflow.addEdge(
  "prepareCalendar",
  "validateCalendar"
);


// ------------------------------------------------------------
// Calendar validation routing
// ------------------------------------------------------------

workflow.addConditionalEdges(

  "validateCalendar",

  (state) => {

    if (
      state.missingField
    ) {

      return "missing";

    }


    if (
      state.hasConflicts
    ) {

      return "conflict";

    }


    if (
      state.requiresConfirmation
    ) {

      return "approval";

    }


    return "create";

  },

  {

    missing:
      "generateResponse",

    conflict:
      "generateResponse",

    approval:
      "calendarApproval",

    create:
      "createCalendar",

  }

);


// ------------------------------------------------------------
// Calendar approval
// ------------------------------------------------------------

workflow.addConditionalEdges(

  "calendarApproval",

  (state) => {

    if (
      state.approvalDecision === true
    ) {

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


// ------------------------------------------------------------
// Create event
// ------------------------------------------------------------

workflow.addEdge(
  "createCalendar",
  "generateResponse"
);


// ============================================================
// 20. GMAIL SEND FLOW
// ============================================================
//
// User:
// "Send an email to Rahul"
//
//      ↓
// extractEmailDetails
//      ↓
// prepareEmail
//      ↓
// emailApproval
//      ↓
// interrupt()
//      ↓
// WAIT
//      ↓
// resume
//      ↓
// sendEmail
//
// ============================================================

workflow.addEdge(
  "extractEmailDetails",
  "prepareEmail"
);


// ------------------------------------------------------------
// Email preparation
// ------------------------------------------------------------

workflow.addConditionalEdges(

  "prepareEmail",

  (state) => {

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


// ------------------------------------------------------------
// Email approval
// ------------------------------------------------------------

workflow.addConditionalEdges(

  "emailApproval",

  (state) => {

    if (
      state.approvalDecision === true
    ) {

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


// ------------------------------------------------------------
// Send email
// ------------------------------------------------------------

workflow.addEdge(
  "sendEmail",
  "generateResponse"
);


// ============================================================
// 21. FINAL RESPONSE
// ============================================================

workflow.addEdge(
  "generateResponse",
  END
);


// ============================================================
// 22. CHECKPOINTER
// ============================================================
//
// MemorySaver stores graph checkpoints using thread_id.
//
// Same thread_id allows interrupted workflows to resume.
//
// ============================================================

const checkpointer =
  new MemorySaver();


// ============================================================
// 23. COMPILE GRAPH
// ============================================================

export const employeeCopilotGraph =
  workflow.compile({
    checkpointer,
  });


// ============================================================
// 24. INTERRUPT HELPER
// ============================================================

function getInterruptData(result) {

  if (
    !result ||
    !result.__interrupt__
  ) {

    return null;

  }


  const interrupts =
    result.__interrupt__;


  if (
    !Array.isArray(interrupts) ||
    interrupts.length === 0
  ) {

    return null;

  }


  const interruptItem =
    interrupts[0];


  return (
    interruptItem?.value ||
    interruptItem ||
    null
  );

}


// ============================================================
// 25. RUN EMPLOYEE COPILOT
// ============================================================

export async function runEmployeeCopilot({

  userMessage,

  userId,

  userRole,

  conversationId,

  compactContext = null,

}) {

  // ----------------------------------------------------------
  // THREAD ID
  // ----------------------------------------------------------

  const threadId =
    conversationId ||
    `user_${userId}`;


  // ----------------------------------------------------------
  // LANGGRAPH CONFIG
  // ----------------------------------------------------------

  const config = {

    configurable: {

      thread_id:
        threadId,

    },

  };


  try {

    console.log(
      "[EmployeeCopilotGraph] Starting graph:",
      {
        threadId,
        userId,
      }
    );


    // ========================================================
    // INVOKE GRAPH
    // ========================================================

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


    // ========================================================
    // CHECK INTERRUPT
    // ========================================================

    const interruptData =
      getInterruptData(result);


    if (interruptData) {

      console.log(
        "[EmployeeCopilotGraph] Waiting for approval:",
        {
          threadId,
          type:
            interruptData?.type,
        }
      );


      const pendingAction =
        result.pendingAction ||
        interruptData?.action ||
        null;


      return {

        response:
          interruptData?.message ||
          result.toolResult ||
          result.response ||
          "Please confirm this action.",

        sources:
          result.sources || [],

        requiresConfirmation:
          true,

        pendingAction,

        context:
          result.context || null,

        error:
          null,

      };

    }


    // ========================================================
    // NORMAL COMPLETION
    // ========================================================

    console.log(
      "[EmployeeCopilotGraph] Graph completed:",
      {
        threadId,
      }
    );


    return {

      response:
        result.response ||
        result.toolResult ||
        "",

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
      "[EmployeeCopilotGraph] Graph execution failed:",
      {
        threadId,

        message:
          error?.message,

        name:
          error?.name,

        stack:
          error?.stack,
      }
    );


    return {

      response:
        "I encountered an error while processing your request. Please try again.",

      sources: [],

      requiresConfirmation:
        false,

      pendingAction:
        null,

      context:
        null,

      error:
        error?.message ||
        "Unknown graph error",

    };

  }

}


// ============================================================
// 26. RESUME / CONFIRM WORKFLOW
// ============================================================
//
// When the graph reaches interrupt():
//
// Graph
//   ↓
// interrupt()
//   ↓
// checkpoint saved
//   ↓
// frontend asks user
//   ↓
// resumeEmployeeCopilot()
//   ↓
// Command({ resume: true/false })
//   ↓
// same thread resumes
//
// ============================================================

export async function resumeEmployeeCopilot({

  conversationId,

  approved,

}) {

  // ----------------------------------------------------------
  // VALIDATE CONVERSATION
  // ----------------------------------------------------------

  if (!conversationId) {

    return {

      response:
        "Conversation ID is required to resume the workflow.",

      sources: [],

      requiresConfirmation:
        false,

      pendingAction:
        null,

      error:
        "Missing conversationId",

    };

  }


  // ----------------------------------------------------------
  // SAME THREAD CONFIG
  // ----------------------------------------------------------

  const config = {

    configurable: {

      thread_id:
        conversationId,

    },

  };


  try {

    console.log(
      "[EmployeeCopilotResume] Resuming workflow:",
      {
        conversationId,
        approved,
      }
    );


    // ========================================================
    // RESUME GRAPH
    // ========================================================

    const result =
      await employeeCopilotGraph.invoke(

        new Command({

          resume:
            Boolean(approved),

        }),

        config

      );


    // ========================================================
    // CHECK FOR ANOTHER INTERRUPT
    // ========================================================

    const interruptData =
      getInterruptData(result);


    if (interruptData) {

      return {

        response:
          interruptData?.message ||
          result.toolResult ||
          "Additional confirmation is required.",

        sources:
          result.sources || [],

        requiresConfirmation:
          true,

        pendingAction:
          result.pendingAction ||
          interruptData?.action ||
          null,

        context:
          result.context ||
          null,

        error:
          null,

      };

    }


    // ========================================================
    // WORKFLOW COMPLETED
    // ========================================================

    console.log(
      "[EmployeeCopilotResume] Workflow completed:",
      {
        conversationId,
      }
    );


    return {

      response:
        result.response ||
        result.toolResult ||
        "",

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
      "[EmployeeCopilotResume] Resume failed:",
      {
        conversationId,

        message:
          error?.message,

        name:
          error?.name,

        stack:
          error?.stack,
      }
    );


    return {

      response:
        "I could not resume the workflow. Please try again.",

      sources: [],

      requiresConfirmation:
        false,

      pendingAction:
        null,

      error:
        error?.message ||
        "Unknown resume error",

    };

  }

}


// ============================================================
// 27. EXPORTS
// ============================================================

export {

  VALID_INTENTS,

  IntentSchema,

  classifyIntent,

  routeByIntent,

  INTENT_ROUTES,

};


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default employeeCopilotGraph;