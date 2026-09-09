// ============================================================
// WEB SEARCH GRAPH NODE
// ============================================================

import tavilyTool from "../../tools/tavilyTool.js";
import geminiLLM from "../../llm/gemini.js";


// ============================================================
// OUTPUT VALIDATION
// ============================================================

function validateAIOutput(output) {
  if (
    typeof output !== "string" ||
    !output.trim()
  ) {
    return "I was unable to generate a response. Please try again.";
  }

  let cleaned = output.trim();

  if (cleaned.length > 12000) {
    cleaned = cleaned.substring(0, 12000);
  }

  return cleaned;
}


// ============================================================
// WEB SEARCH NODE
// ============================================================

export async function webSearchNode(state) {
  try {
    // ----------------------------------------------------------
    // Check Tavily configuration
    // ----------------------------------------------------------

    if (!tavilyTool?.isConfigured) {
      return {
        toolResult:
          "Web search is not configured yet. Please configure TAVILY_API_KEY in the backend environment.",
      };
    }

    // ----------------------------------------------------------
    // Get latest user message
    // ----------------------------------------------------------

    const lastMessage =
      state.messages?.[state.messages.length - 1];

    const message = lastMessage?.content;

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return {
        toolResult:
          "I could not determine what you want me to search for.",
      };
    }

    // ----------------------------------------------------------
    // Search the web
    // ----------------------------------------------------------

    const result =
      await tavilyTool.search(
        message,
        {
          maxResults: 5,
          searchDepth: "basic",
          includeAnswer: true,
        }
      );

    // ----------------------------------------------------------
    // Handle search failure
    // ----------------------------------------------------------

    if (!result?.success) {
      return {
        toolResult:
          `I couldn't complete the web search: ${
            result?.error ||
            "Unknown search error"
          }`,
      };
    }

    const results =
      Array.isArray(result.results)
        ? result.results
        : [];

    // ----------------------------------------------------------
    // No results
    // ----------------------------------------------------------

    if (results.length === 0) {
      return {
        toolResult:
          "I searched the web but could not find relevant results.",

        context: {
          webSearchResults: [],
        },
      };
    }

    // ----------------------------------------------------------
    // Build search context
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // Ask Gemini to synthesize the results
    // ----------------------------------------------------------

    const prompt = `
You are an Employee Copilot.

Answer the user's question using the web search results.

USER QUESTION:
${message}

WEB RESULTS:
${searchContext}

${
  result.answer
    ? `SEARCH SUMMARY:
${result.answer}
`
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
      await geminiLLM.invoke(prompt);

    const answer =
      validateAIOutput(
        String(response.content || "")
      );

    // ----------------------------------------------------------
    // Return graph state
    // ----------------------------------------------------------

    return {
      toolResult: answer,

      response: answer,

      context: {
        webSearchResults: results,
        webSearchAnswer:
          result.answer || null,
      },

      currentTool: null,
    };
  } catch (error) {
    console.error(
      "[WebSearchNode]",
      error
    );

    return {
      toolResult:
        "I encountered an error while searching the web. Please try again.",

      currentTool: null,

      error: error.message,
    };
  }
}


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  webSearchNode,
};