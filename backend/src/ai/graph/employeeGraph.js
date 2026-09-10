// ============================================================
// EMPLOYEE COPILOT GRAPH
// ============================================================
// Main LangGraph orchestration.
//
// This file is responsible for:
//
// 1. Defining graph state
// 2. Registering nodes
// 3. Connecting nodes
// 4. Routing intents
// 5. Compiling the graph
// 6. Running the graph
// 7. Resuming interrupted workflows
//
// IMPORTANT:
//
// Gmail / Calendar / Leave business logic is NOT implemented here.
//
// Ye file sirf orchestration karta hai.
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

export const EmployeeState =
  Annotation.Root({

    // --------------------------------------------------------
    // User information
    // --------------------------------------------------------

    userId: Annotation(),

    userRole: Annotation(),

    conversationId: Annotation(),


    // --------------------------------------------------------
    // Messages
    // --------------------------------------------------------

    messages: Annotation({

      reducer: (current, update) => {

        return [
          ...current,
          ...update,
        ];

      },

      default: () => [],

    }),


    // --------------------------------------------------------
    // Intent
    // --------------------------------------------------------

    intent: Annotation(),


    // --------------------------------------------------------
    // Tool information
    // --------------------------------------------------------

    currentTool: Annotation(),

    toolResult: Annotation(),


    // --------------------------------------------------------
    // Action / confirmation
    // --------------------------------------------------------

    pendingAction: Annotation(),

    requiresConfirmation:
      Annotation({
        default: () => false,
      }),

    approvalDecision:
      Annotation({
        default: () => null,
      }),


    // --------------------------------------------------------
    // Calendar conflicts
    // --------------------------------------------------------

    hasConflicts:
      Annotation({
        default: () => false,
      }),


    // --------------------------------------------------------
    // Missing information
    // --------------------------------------------------------

    missingField: Annotation(),


    // --------------------------------------------------------
    // General context
    // --------------------------------------------------------

    context:
      Annotation({
        default: () => ({}),
      }),


    // --------------------------------------------------------
    // Conversation context
    // --------------------------------------------------------

    compactContext:
      Annotation(),


    // --------------------------------------------------------
    // Final response
    // --------------------------------------------------------

    response:
      Annotation(),

    sources:
      Annotation({
        default: () => [],
      }),


    // --------------------------------------------------------
    // Error
    // --------------------------------------------------------

    error:
      Annotation(),

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
//
// IMPORTANT:
//
// Gmail send flow:
//
// prepareEmail
//      ↓
// emailApproval
//      ↓
// interrupt()
//      ↓
// PAUSE
//      ↓
// user confirms
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
//
// MemorySaver graph execution ko thread ke basis par
// checkpoint karta hai.
//
// Isliye same conversationId/threadId ke saath graph ko
// resume kiya ja sakta hai.
//
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
// HELPER:
// CHECK WHETHER GRAPH WAS INTERRUPTED
// ============================================================
//
// LangGraph interrupted execution ko result ke andar
// `__interrupt__` ke form mein expose kar sakta hai.
//
// Isliye sirf catch(error) par depend nahi karna chahiye.
//
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


  // Usually latest/first interrupt is the active one.
  const interruptItem =
    interrupts[0];


  // LangGraph interrupt payload generally
  // `.value` ke andar hota hai.

  return (
    interruptItem?.value ||
    interruptItem ||
    null
  );
}


// ============================================================
// RUN EMPLOYEE COPILOT
// ============================================================
//
// Normal request:
//
// User
//   ↓
// Graph
//   ↓
// Result
//
// Approval request:
//
// User
//   ↓
// Graph
//   ↓
// prepareEmail
//   ↓
// emailApproval
//   ↓
// interrupt()
//   ↓
// __interrupt__
//   ↓
// Return confirmation data
//
// ============================================================

export async function runEmployeeCopilot({

  userMessage,

  userId,

  userRole,

  conversationId,

  compactContext = null,

}) {

  // ==========================================================
  // THREAD ID
  // ==========================================================

  const threadId =
    conversationId ||
    `user_${userId}`;


  // ==========================================================
  // LANGGRAPH CONFIG
  // ==========================================================

  const config = {

    configurable: {

      thread_id:
        threadId,

    },

  };


  try {

    // ========================================================
    // RUN GRAPH
    // ========================================================

    console.log(
      "[EmployeeCopilotGraph] Starting graph:",
      {
        threadId,
        userId,
      }
    );


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
    // CHECK FOR LANGGRAPH INTERRUPT
    // ========================================================
    //
    // IMPORTANT:
    //
    // interrupt() is an expected workflow pause.
    //
    // It is NOT an application failure.
    //
    // ========================================================

    const interruptData =
      getInterruptData(result);


    if (interruptData) {

      console.log(
        "[EmployeeCopilotGraph] Graph interrupted for approval:",
        {
          threadId,

          type:
            interruptData?.type,

          action:
            interruptData?.action,

        }
      );


      // ------------------------------------------------------
      // Get pending action
      // ------------------------------------------------------

      const pendingAction =
        result.pendingAction ||
        interruptData?.action ||
        null;


      // ------------------------------------------------------
      // Return successful confirmation state
      // ------------------------------------------------------

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
    // NORMAL COMPLETED GRAPH
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

    // ========================================================
    // REAL ERROR
    // ========================================================
    //
    // IMPORTANT:
    //
    // We DON'T blindly convert everything into
    // "I was unable to generate a response."
    //
    // Actual errors are logged with stack trace.
    //
    // ========================================================

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
// RESUME / CONFIRM WORKFLOW
// ============================================================
//
// User confirmation:
//
// approved = true
//
//      ↓
//
// Command({
//   resume: true
// })
//
//      ↓
//
// Same thread
//
//      ↓
//
// emailApprovalNode resumes
//
//      ↓
//
// approvalDecision = true
//
//      ↓
//
// sendEmail
//
// ============================================================

export async function resumeEmployeeCopilot({

  conversationId,

  approved,

}) {

  // ==========================================================
  // VALIDATE THREAD
  // ==========================================================

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


  // ==========================================================
  // THREAD CONFIG
  // ==========================================================

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
    // RESUME SAME GRAPH THREAD
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
    // CHECK IF ANOTHER INTERRUPT OCCURRED
    // ========================================================

    const interruptData =
      getInterruptData(result);


    if (interruptData) {

      console.log(
        "[EmployeeCopilotResume] Workflow interrupted again:",
        {
          conversationId,
          type:
            interruptData?.type,
        }
      );


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

    // ========================================================
    // REAL RESUME ERROR
    // ========================================================

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
// DEFAULT EXPORT
// ============================================================

export default employeeCopilotGraph;