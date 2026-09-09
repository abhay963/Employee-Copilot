// ============================================================
// RESPONSE NODE
// ============================================================

function validateAIOutput(output) {
  if (typeof output !== "string" || !output.trim()) {
    return "I could not generate a response.";
  }

  let cleaned = output.trim();

  // Prevent excessively large responses.
  if (cleaned.length > 12000) {
    cleaned = cleaned.substring(0, 12000);
  }

  return cleaned;
}

// ============================================================
// LANGGRAPH RESPONSE NODE
// ============================================================

export async function responseNode(state) {
  try {
    const response = validateAIOutput(
      state?.toolResult || "I could not generate a response."
    );

    return {
      response,

      sources:
        state?.sources ||
        state?.context?.ragResult?.sources ||
        [],

      error: null,
    };
  } catch (error) {
    console.error("[ResponseNode] Error:", error);

    return {
      response: "I could not generate a response.",
      sources: [],
      error: error.message,
    };
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  responseNode,
};