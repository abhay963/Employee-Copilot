// ============================================================
// RAG GRAPH NODE
// ============================================================

import { runRAGWorkflow } from "../../rag/ragService.js";


// ============================================================
// RAG NODE
// ============================================================

export async function ragNode(state) {
  try {
    // ----------------------------------------------------------
    // Get latest user message
    // ----------------------------------------------------------

    const lastMessage =
      state.messages[
        state.messages.length - 1
      ];

    const question =
      lastMessage?.content;

    if (
      typeof question !== "string" ||
      !question.trim()
    ) {
      return {
        toolResult:
          "I could not determine your question.",
      };
    }

    // ----------------------------------------------------------
    // Run RAG workflow
    // ----------------------------------------------------------

    const result =
      await runRAGWorkflow(
        question,
        state.userId,
        state.userRole
      );

    // ----------------------------------------------------------
    // Return result to graph state
    // ----------------------------------------------------------

    return {
      toolResult:
        result.answer || "",

      response:
        result.answer || "",

      sources:
        result.sources || [],

      context: {
        ragResult: result,
      },

      currentTool: null,
    };
  } catch (error) {
    console.error(
      "[RAGNode]",
      error
    );

    return {
      toolResult:
        "I could not retrieve the requested information right now. Please try again.",

      response:
        "I could not retrieve the requested information right now. Please try again.",

      sources: [],

      currentTool: null,

      error:
        error.message,
    };
  }
}


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  ragNode,
};