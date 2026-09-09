import { Annotation } from '@langchain/langgraph';

// ============================================================
// EMPLOYEE GRAPH STATE
// ============================================================
//
// This is the shared state of the entire Employee Copilot graph.
//
// Every node follows:
//
//     state
//       ↓
//   perform work
//       ↓
//   return state updates
//
// LangGraph merges those updates into the shared state.
// ============================================================

export const EmployeeState =
  Annotation.Root({

    // ==========================================================
    // USER INFORMATION
    // ==========================================================

    userId: Annotation(),

    userRole: Annotation(),

    conversationId: Annotation(),

    // ==========================================================
    // USER MESSAGES
    // ==========================================================
    //
    // Messages are appended rather than replaced.
    //
    // Example:
    //
    // current = [message1, message2]
    // update  = [message3]
    //
    // result:
    //
    // [message1, message2, message3]
    //
    // ==========================================================

    messages: Annotation({
      reducer: (
        current,
        update
      ) => {
        return [
          ...current,
          ...update,
        ];
      },

      default: () => [],
    }),

    // ==========================================================
    // INTENT
    // ==========================================================

    intent: Annotation(),

    // ==========================================================
    // TOOL INFORMATION
    // ==========================================================

    currentTool: Annotation(),

    toolResult: Annotation(),

    // ==========================================================
    // ACTION / CONFIRMATION
    // ==========================================================

    pendingAction: Annotation(),

    requiresConfirmation:
      Annotation({
        default: () => false,
      }),

    approvalDecision:
      Annotation({
        default: () => null,
      }),

    // ==========================================================
    // CALENDAR CONFLICTS
    // ==========================================================

    hasConflicts:
      Annotation({
        default: () => false,
      }),

    // ==========================================================
    // MISSING FIELD
    // ==========================================================

    missingField: Annotation(),

    // ==========================================================
    // GENERAL CONTEXT
    // ==========================================================

    context: Annotation({
      default: () => ({}),
    }),

    // ==========================================================
    // COMPACT CONVERSATION CONTEXT
    // ==========================================================

    compactContext:
      Annotation(),

    // ==========================================================
    // FINAL RESPONSE
    // ==========================================================

    response: Annotation(),

    sources: Annotation({
      default: () => [],
    }),

    // ==========================================================
    // ERROR
    // ==========================================================

    error: Annotation(),
  });


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default EmployeeState;