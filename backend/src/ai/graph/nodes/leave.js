// ============================================================
// LEAVE GRAPH NODES
// ============================================================

import { z } from "zod";
import { interrupt } from "@langchain/langgraph";

import geminiLLM from "../../llm/gemini.js";

import { LeaveBalance } from "../../../models/LeaveBalance.js";
import { LeaveRequest } from "../../../models/LeaveRequest.js";


// ============================================================
// SCHEMAS
// ============================================================

const LeaveDetailsSchema = z.object({
  leaveType: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});


// ============================================================
// HELPERS
// ============================================================

function extractJSON(content) {
  if (!content) {
    throw new Error("Empty AI response");
  }

  let text = String(content).trim();

  text = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Could not extract JSON from AI response");
    }

    return JSON.parse(match[0]);
  }
}

function getLatestMessage(state) {
  return state.messages?.[
    state.messages.length - 1
  ];
}

function getMessageContent(state) {
  const message = getLatestMessage(state);

  return typeof message?.content === "string"
    ? message.content.trim()
    : "";
}


// ============================================================
// LEAVE BALANCE
// ============================================================

export async function leaveBalanceNode(state) {
  try {
    const userId = state.userId;

    if (!userId) {
      return {
        toolResult:
          "I could not determine your employee account.",
      };
    }

    const balance =
      await LeaveBalance.findByUserId(userId);

    if (!balance) {
      return {
        toolResult:
          "I could not find your leave balance.",
      };
    }

    return {
      toolResult: balance,
      context: {
        leaveBalance: balance,
      },
      currentTool: null,
    };
  } catch (error) {
    console.error(
      "[LeaveBalanceNode]",
      error
    );

    return {
      toolResult:
        "I could not retrieve your leave balance right now.",
      error: error.message,
    };
  }
}


// ============================================================
// LEAVE POLICY
// ============================================================

export async function leavePolicyNode(state) {
  try {
    const question =
      getMessageContent(state);

    if (!question) {
      return {
        toolResult:
          "Please provide your leave policy question.",
      };
    }

    return {
      intent: "leave_policy",
      currentTool: "rag",
      toolResult: null,
    };
  } catch (error) {
    console.error(
      "[LeavePolicyNode]",
      error
    );

    return {
      toolResult:
        "I could not process your leave policy question.",
      error: error.message,
    };
  }
}


// ============================================================
// EXTRACT LEAVE DETAILS
// ============================================================

export async function extractLeaveDetails(state) {
  try {
    const message =
      getMessageContent(state);

    if (!message) {
      return {
        missingField: "leave details",
      };
    }

    const prompt = `
You are extracting leave-request details
for an employee management system.

Extract the following fields from the user's request:

{
  "leaveType": string | null,
  "startDate": string | null,
  "endDate": string | null,
  "reason": string | null
}

Rules:
- Do not invent missing information.
- Return null when a field is missing.
- Return ONLY valid JSON.

USER REQUEST:
${message}
`;

    const response =
      await geminiLLM.invoke(prompt);

    const parsed =
      extractJSON(response.content);

    const details =
      LeaveDetailsSchema.parse(parsed);

    return {
      context: {
        leaveDetails: details,
      },
      missingField: null,
    };
  } catch (error) {
    console.error(
      "[ExtractLeaveDetails]",
      error
    );

    return {
      context: {
        leaveDetails: null,
      },
      missingField: "leave details",
      error: error.message,
    };
  }
}


// ============================================================
// PREPARE LEAVE
// ============================================================

export async function prepareLeaveNode(state) {
  try {
    const details =
      state.context?.leaveDetails;

    if (!details) {
      return {
        missingField: "leave details",
      };
    }

    const {
      leaveType,
      startDate,
      endDate,
      reason,
    } = details;

    if (!leaveType) {
      return {
        missingField: "leave type",
      };
    }

    if (!startDate) {
      return {
        missingField: "start date",
      };
    }

    if (!endDate) {
      return {
        missingField: "end date",
      };
    }

    const actionId =
      `leave_request_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    const pendingAction = {
      type: "leave_request",
      actionId,
      leaveType,
      startDate,
      endDate,
      reason: reason || null,
    };

    return {
      pendingAction,
      requiresConfirmation: true,
      approvalDecision: null,
      currentTool: "leave_request",

      context: {
        ...state.context,
        leaveRequest: pendingAction,
      },
    };
  } catch (error) {
    console.error(
      "[PrepareLeaveNode]",
      error
    );

    return {
      toolResult:
        "I could not prepare your leave request.",
      error: error.message,
    };
  }
}


// ============================================================
// VALIDATE LEAVE
// ============================================================

export async function validateLeaveNode(state) {
  try {
    const action =
      state.pendingAction;

    if (
      !action ||
      action.type !== "leave_request"
    ) {
      return {
        toolResult:
          "No valid leave request is available.",
      };
    }

    if (!action.leaveType) {
      return {
        missingField: "leave type",
      };
    }

    if (!action.startDate) {
      return {
        missingField: "start date",
      };
    }

    if (!action.endDate) {
      return {
        missingField: "end date",
      };
    }

    const start =
      new Date(action.startDate);

    const end =
      new Date(action.endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return {
        toolResult:
          "The leave dates are not valid. Please provide valid dates.",
        pendingAction: null,
        requiresConfirmation: false,
      };
    }

    if (end < start) {
      return {
        toolResult:
          "The leave end date cannot be before the start date.",
        pendingAction: null,
        requiresConfirmation: false,
      };
    }

    // ----------------------------------------------------------
    // Check leave balance when available
    // ----------------------------------------------------------

    try {
      const balance =
        await LeaveBalance.findByUserId(
          state.userId
        );

      if (balance) {
        return {
          context: {
            ...state.context,
            leaveBalance: balance,
          },
        };
      }
    } catch (balanceError) {
      console.warn(
        "[ValidateLeaveNode] Could not check balance:",
        balanceError.message
      );
    }

    return {
      missingField: null,
    };
  } catch (error) {
    console.error(
      "[ValidateLeaveNode]",
      error
    );

    return {
      toolResult:
        "I could not validate the leave request.",
      error: error.message,
    };
  }
}


// ============================================================
// LEAVE APPROVAL
// ============================================================

export async function leaveApprovalNode(state) {
  try {
    const action =
      state.pendingAction;

    if (
      !action ||
      action.type !== "leave_request"
    ) {
      return {
        requiresConfirmation: false,
        approvalDecision: false,
      };
    }

    const decision = interrupt({
      type: "leave_confirmation",

      message:
        "Please confirm submitting this leave request.",

      action,
    });

    if (!decision) {
      return {
        approvalDecision: false,
        requiresConfirmation: false,

        toolResult:
          "Your leave request was cancelled.",
      };
    }

    return {
      approvalDecision: true,
      requiresConfirmation: false,
    };
  } catch (error) {
    console.error(
      "[LeaveApprovalNode]",
      error
    );

    return {
      approvalDecision: false,
      requiresConfirmation: false,
      error: error.message,
    };
  }
}


// ============================================================
// SUBMIT LEAVE
// ============================================================

export async function submitLeaveNode(state) {
  try {
    if (
      state.approvalDecision !== true
    ) {
      return {
        toolResult:
          "The leave request was not submitted.",
      };
    }

    const action =
      state.pendingAction;

    if (
      !action ||
      action.type !== "leave_request"
    ) {
      return {
        toolResult:
          "No valid leave request is available.",
      };
    }

    const leaveRequest =
      await LeaveRequest.create({
        userId: state.userId,
        leaveType: action.leaveType,
        startDate: action.startDate,
        endDate: action.endDate,
        reason: action.reason,
      });

    return {
      toolResult:
        "Your leave request has been submitted successfully.",

      response:
        "Your leave request has been submitted successfully.",

      context: {
        ...state.context,
        leaveRequest,
      },

      pendingAction: null,
      approvalDecision: null,
      requiresConfirmation: false,
      currentTool: null,
    };
  } catch (error) {
    console.error(
      "[SubmitLeaveNode]",
      error
    );

    return {
      toolResult:
        "I could not submit your leave request. Please try again.",

      pendingAction: null,
      approvalDecision: null,
      requiresConfirmation: false,

      error: error.message,
    };
  }
}


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  leaveBalanceNode,
  leavePolicyNode,
  extractLeaveDetails,
  prepareLeaveNode,
  validateLeaveNode,
  leaveApprovalNode,
  submitLeaveNode,
};