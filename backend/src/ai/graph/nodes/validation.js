// ============================================================
// INPUT VALIDATION NODE
// ============================================================

const MAX_MESSAGE_LENGTH = 10000;

/**
 * Validate the incoming user request before it enters
 * the rest of the Employee Copilot graph.
 */
export async function validateInputNode(state) {
  try {
    const messages = Array.isArray(state?.messages)
      ? state.messages
      : [];

    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
      return {
        error: 'No user message was provided.',
        toolResult: 'Please provide a message.',
      };
    }

    const content =
      typeof lastMessage.content === 'string'
        ? lastMessage.content.trim()
        : '';

    if (!content) {
      return {
        error: 'User message is empty.',
        toolResult: 'Please provide a valid message.',
      };
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return {
        error: `User message exceeds the maximum length of ${MAX_MESSAGE_LENGTH} characters.`,
        toolResult: 'Your message is too long. Please shorten it and try again.',
      };
    }

    // Keep the normalized message in the graph state.
    const updatedMessages = [
      ...messages.slice(0, -1),
      {
        ...lastMessage,
        content,
      },
    ];

    return {
      messages: updatedMessages,
      error: null,
    };
  } catch (error) {
    console.error('[ValidationNode] Error:', error);

    return {
      error: error.message,
      toolResult: 'I could not validate your request. Please try again.',
    };
  }
}

export default {
  validateInputNode,
};