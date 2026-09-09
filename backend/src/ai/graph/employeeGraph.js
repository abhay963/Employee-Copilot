// ============================================================
// EMPLOYEE COPILOT GRAPH
// ============================================================
// Main LangGraph orchestration.
//
// This file should ONLY be responsible for:
//
// 1. Defining graph state
// 2. Registering nodes
// 3. Connecting nodes
// 4. Routing intents
// 5. Compiling the graph
// 6. Exposing run/resume functions
// ============================================================

import {
  StateGraph,
  Annotation,
  START,
  END,
  MemorySaver,
  Command,
} from "@langchain/langgraph";


// ============================================================
// CORE NODES
// ============================================================

import {
  validateInputNode,
} from "./nodes/validation.js";

import {
  classifyIntentNode,
  routeByIntent,
} from "./nodes/intent.js";

import {
  INTENT_ROUTES,
} from "./router.js";

import {
  responseNode,
} from "./nodes/response.js";


// ============================================================
// LEAVE NODES
// ============================================================

import {
  leaveBalanceNode,
  leavePolicyNode,
  extractLeaveDetails,
  prepareLeaveNode,
  validateLeaveNode,
  leaveApprovalNode,
  submitLeaveNode,
} from "./nodes/leave.js";


// ============================================================
// CALENDAR NODES
// ============================================================

import {
  calendarQueryNode,
  extractCalendarEventDetails,
  prepareCalendarNode,
  validateCalendarNode,
  calendarApprovalNode,
  createCalendarNode,
} from "./nodes/calendar.js";


// ============================================================
// EMAIL NODES
// ============================================================

import {
  gmailReadNode,
  extractEmailDetails,
  prepareEmailNode,
  emailApprovalNode,
  sendEmailNode,
} from "./nodes/email.js";


// ============================================================
// OTHER NODES
// ============================================================

import {
  webSearchNode,
} from "./nodes/webSearch.js";

import {
  ragNode,
} from "./nodes/rag.js";


// ============================================================
// GRAPH STATE
// ============================================================

export const EmployeeState = Annotation.Root({

  // ----------------------------------------------------------
  // User information
  // ----------------------------------------------------------

  userId: Annotation(),

  userRole: Annotation(),

  conversationId: Annotation(),


  // ----------------------------------------------------------
  // Messages
  // ----------------------------------------------------------

  messages: Annotation({
    reducer: (current, update) => {
      return [
        ...current,
        ...update,
      ];
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
  // Missing information
  // ----------------------------------------------------------

  missingField: Annotation(),


  // ----------------------------------------------------------
  // General context
  // ----------------------------------------------------------

  context: Annotation({
    default: () => ({}),
  }),


  // ----------------------------------------------------------
  // Conversation context
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
// CREATE WORKFLOW
// ============================================================

const workflow =
  new StateGraph(EmployeeState);


// ============================================================
// CORE NODES
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
// LEAVE NODES
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
// CALENDAR NODES
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
// EMAIL NODES
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
// OTHER NODES
// ============================================================

workflow.addNode(
  "webSearch",
  webSearchNode
);

workflow.addNode(
  "generalRAG",
  ragNode
);


// ============================================================
// FINAL RESPONSE
// ============================================================

workflow.addNode(
  "generateResponse",
  responseNode
);


// ============================================================
// START → VALIDATE
// ============================================================

workflow.addEdge(
  START,
  "validateInput"
);


// ============================================================
// VALIDATE → CLASSIFY
// ============================================================

workflow.addEdge(
  "validateInput",
  "classifyIntent"
);


// ============================================================
// INTENT ROUTING
// ============================================================

workflow.addConditionalEdges(
  "classifyIntent",

  routeByIntent,

  {
    leave_balance:
      INTENT_ROUTES.leave_balance,

    leave_policy:
      INTENT_ROUTES.leave_policy,

    leave_request:
      INTENT_ROUTES.leave_request,

    calendar_events:
      INTENT_ROUTES.calendar_events,

    calendar_create:
      INTENT_ROUTES.calendar_create,

    gmail_read:
      INTENT_ROUTES.gmail_read,

    gmail_send:
      INTENT_ROUTES.gmail_send,

    web_search:
      INTENT_ROUTES.web_search,

    general:
      INTENT_ROUTES.general,
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
//
// extractLeaveDetails
//        ↓
// prepareLeave
//        ↓
// validateLeave
//        ↓
// approval?
//   ┌────┴────┐
//   ↓         ↓
// approval   response
//   ↓
// approved?
//   ┌────┴────┐
//   ↓         ↓
// submit    response
//   ↓
// response
// ============================================================

workflow.addEdge(
  "extractLeaveDetails",
  "prepareLeave"
);

workflow.addEdge(
  "prepareLeave",
  "validateLeave"
);


workflow.addConditionalEdges(
  "validateLeave",

  (state) => {
    if (state.requiresConfirmation) {
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


workflow.addEdge(
  "submitLeave",
  "generateResponse"
);


// ============================================================
// CALENDAR FLOW
// ============================================================

workflow.addEdge(
  "extractCalendarEventDetails",
  "prepareCalendar"
);

workflow.addEdge(
  "prepareCalendar",
  "validateCalendar"
);


workflow.addConditionalEdges(
  "validateCalendar",

  (state) => {
    if (state.requiresConfirmation) {
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


workflow.addEdge(
  "createCalendar",
  "generateResponse"
);


// ============================================================
// EMAIL FLOW
// ============================================================

workflow.addEdge(
  "extractEmailDetails",
  "prepareEmail"
);


workflow.addConditionalEdges(
  "prepareEmail",

  (state) => {
    if (state.requiresConfirmation) {
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


workflow.addEdge(
  "sendEmail",
  "generateResponse"
);


// ============================================================
// FINAL RESPONSE → END
// ============================================================

workflow.addEdge(
  "generateResponse",
  END
);


// ============================================================
// CHECKPOINTER
// ============================================================

const checkpointer =
  new MemorySaver();


// ============================================================
// COMPILE GRAPH
// ============================================================

export const employeeCopilotGraph =
  workflow.compile({
    checkpointer,
  });


// ============================================================
// RUN EMPLOYEE COPILOT
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
      thread_id: threadId,
    },
  };

  try {
    const result =
      await employeeCopilotGraph.invoke(
        {
          messages: [
            {
              role: "user",
              content: userMessage,
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

      requiresConfirmation: false,

      pendingAction: null,

      error: error.message,
    };
  }
}


// ============================================================
// RESUME / CONFIRM WORKFLOW
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
          resume: approved,
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

      context:
        result.context ||
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

      requiresConfirmation: false,

      pendingAction: null,

      error: error.message,
    };
  }
}


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default employeeCopilotGraph;
