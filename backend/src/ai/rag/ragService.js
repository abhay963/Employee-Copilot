import geminiLLM from '../llm/gemini.js';

import {
  retrieveDocuments,
} from './retriever.js';

import {
  buildContextString,
} from './context.js';

import {
  buildRAGPrompt,
  INSUFFICIENT_CONTEXT_MARKER,
  INSUFFICIENT_CONTEXT_MESSAGE,
} from './prompts.js';

// ============================================================
// CONSTANTS
// ============================================================

const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 2000;

const INVALID_QUESTION_MESSAGE =
  'Please provide a valid question.';

const GENERIC_ERROR_MESSAGE =
  'I was unable to search the company knowledge base right now. Please try again.';

// ============================================================
// TEXT HELPERS
// ============================================================

function normalizeText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value).trim();
}

// ============================================================
// EXTRACT RESPONSE TEXT
// ============================================================

function extractResponseText(content) {
  if (
    content === null ||
    content === undefined
  ) {
    return '';
  }

  // Gemini/LangChain can return a plain string.
  if (typeof content === 'string') {
    return content;
  }

  // Some providers return an array of content blocks.
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (
          item &&
          typeof item.text === 'string'
        ) {
          return item.text;
        }

        return '';
      })
      .join('');
  }

  // Object containing a text property.
  if (
    typeof content === 'object' &&
    typeof content.text === 'string'
  ) {
    return content.text;
  }

  return String(content);
}

// ============================================================
// CLEAN ANSWER
// ============================================================

function cleanAnswer(answer) {
  return normalizeText(answer)
    .replace(
      /^ANSWER:\s*/i,
      ''
    )
    .replace(
      new RegExp(
        INSUFFICIENT_CONTEXT_MARKER,
        'gi'
      ),
      ''
    )
    .trim();
}

// ============================================================
// CHECK INSUFFICIENT CONTEXT
// ============================================================

function isInsufficientContextAnswer(
  answer
) {
  return (
    !answer ||
    answer
      .toLowerCase()
      .includes(
        INSUFFICIENT_CONTEXT_MARKER.toLowerCase()
      )
  );
}

// ============================================================
// VALIDATE QUESTION
// ============================================================

function validateQuestion(question) {
  if (
    !question ||
    typeof question !== 'string'
  ) {
    return {
      valid: false,
      error: 'Invalid question',
      message:
        INVALID_QUESTION_MESSAGE,
    };
  }

  const normalizedQuestion =
    question.trim();

  if (
    normalizedQuestion.length <
    MIN_QUESTION_LENGTH
  ) {
    return {
      valid: false,
      error: 'Question is too short',
      message:
        INVALID_QUESTION_MESSAGE,
    };
  }

  if (
    normalizedQuestion.length >
    MAX_QUESTION_LENGTH
  ) {
    return {
      valid: false,
      error: 'Question is too long',
      message:
        'Please keep your question below 2000 characters.',
    };
  }

  return {
    valid: true,
    question:
      normalizedQuestion,
  };
}

// ============================================================
// GENERATE ANSWER
// ============================================================

export async function generateAnswer(
  question,
  context,
  sources = [],
  enhancedSystemPrompt = null
) {
  try {
    // --------------------------------------------------------
    // No context
    // --------------------------------------------------------

    if (
      !Array.isArray(context) ||
      context.length === 0
    ) {
      return {
        answer:
          INSUFFICIENT_CONTEXT_MESSAGE,

        sources: [],

        hasAnswer: false,

        contextUsed: 0,
      };
    }

    // --------------------------------------------------------
    // Build context
    // --------------------------------------------------------

    const contextString =
      buildContextString(
        context
      );

    if (!contextString) {
      return {
        answer:
          INSUFFICIENT_CONTEXT_MESSAGE,

        sources: [],

        hasAnswer: false,

        contextUsed: 0,
      };
    }

    // --------------------------------------------------------
    // Build prompt
    // --------------------------------------------------------

    const prompt =
      buildRAGPrompt(
        question,
        contextString,
        enhancedSystemPrompt
      );

    console.log(
      `[RAG] Generating answer using ${context.length} chunks`
    );

    // --------------------------------------------------------
    // Call Gemini
    // --------------------------------------------------------

    const response =
      await geminiLLM.invoke(
        prompt
      );

    const rawAnswer =
      extractResponseText(
        response?.content
      );

    const answer =
      cleanAnswer(
        rawAnswer
      );

    // --------------------------------------------------------
    // Check insufficient context
    // --------------------------------------------------------

    const insufficientContext =
      isInsufficientContextAnswer(
        rawAnswer
      );

    if (insufficientContext) {
      return {
        answer:
          INSUFFICIENT_CONTEXT_MESSAGE,

        sources: [],

        hasAnswer: false,

        contextUsed:
          context.length,
      };
    }

    // --------------------------------------------------------
    // Return answer
    // --------------------------------------------------------

    return {
      answer,

      sources,

      hasAnswer: true,

      contextUsed:
        context.length,
    };
  } catch (error) {
    console.error(
      '[RAG] Answer generation failed:',
      error
    );

    throw new Error(
      `Failed to generate knowledge-base answer: ${error.message}`
    );
  }
}

// ============================================================
// STREAM RAG ANSWER
// ============================================================

export async function* streamRAGAnswer(
  question,
  context,
  sources = [],
  enhancedSystemPrompt = null
) {
  // ----------------------------------------------------------
  // No context
  // ----------------------------------------------------------

  if (
    !Array.isArray(context) ||
    context.length === 0
  ) {
    yield {
      type: 'complete',

      answer:
        INSUFFICIENT_CONTEXT_MESSAGE,

      sources: [],

      hasAnswer: false,

      contextUsed: 0,
    };

    return;
  }

  // ----------------------------------------------------------
  // Build context
  // ----------------------------------------------------------

  const contextString =
    buildContextString(
      context
    );

  if (!contextString) {
    yield {
      type: 'complete',

      answer:
        INSUFFICIENT_CONTEXT_MESSAGE,

      sources: [],

      hasAnswer: false,

      contextUsed: 0,
    };

    return;
  }

  // ----------------------------------------------------------
  // Build prompt
  // ----------------------------------------------------------

  const prompt =
    buildRAGPrompt(
      question,
      contextString,
      enhancedSystemPrompt
    );

  let fullAnswer = '';

  try {
    // --------------------------------------------------------
    // Start Gemini stream
    // --------------------------------------------------------

    const stream =
      await geminiLLM.stream(
        prompt
      );

    // --------------------------------------------------------
    // Stream tokens
    // --------------------------------------------------------

    for await (
      const chunk of stream
    ) {
      const text =
        extractResponseText(
          chunk?.content
        );

      if (!text) {
        continue;
      }

      fullAnswer += text;

      /*
       * Do not immediately expose the internal
       * insufficient-context marker.
       *
       * The marker can be split across multiple
       * streaming chunks, so we validate the
       * complete response after streaming finishes.
       */

      if (
        text.includes(
          INSUFFICIENT_CONTEXT_MARKER
        )
      ) {
        continue;
      }

      yield {
        type: 'token',
        content: text,
      };
    }

    // --------------------------------------------------------
    // Validate complete answer
    // --------------------------------------------------------

    const hasInsufficientMarker =
      fullAnswer
        .toLowerCase()
        .includes(
          INSUFFICIENT_CONTEXT_MARKER.toLowerCase()
        );

    const cleanedAnswer =
      cleanAnswer(
        fullAnswer
      );

    // --------------------------------------------------------
    // Insufficient context
    // --------------------------------------------------------

    if (
      hasInsufficientMarker ||
      !cleanedAnswer
    ) {
      yield {
        type: 'complete',

        answer:
          INSUFFICIENT_CONTEXT_MESSAGE,

        sources: [],

        hasAnswer: false,

        contextUsed:
          context.length,
      };

      return;
    }

    // --------------------------------------------------------
    // Successful completion
    // --------------------------------------------------------

    yield {
      type: 'complete',

      answer:
        cleanedAnswer,

      sources,

      hasAnswer: true,

      contextUsed:
        context.length,
    };
  } catch (error) {
    console.error(
      '[RAG] Streaming failed:',
      error
    );

    throw new Error(
      `Failed to stream knowledge-base answer: ${error.message}`
    );
  }
}

// ============================================================
// MAIN RAG WORKFLOW
// ============================================================

export async function runRAGWorkflow(
  question,
  userId,
  userRole,
  enhancedSystemPrompt = null
) {
  const startTime =
    Date.now();

  // ----------------------------------------------------------
  // STEP 1: Validate question
  // ----------------------------------------------------------

  const validation =
    validateQuestion(
      question
    );

  if (!validation.valid) {
    return {
      answer:
        validation.message,

      sources: [],

      error:
        validation.error,

      metadata: {
        duration:
          Date.now() -
          startTime,

        error: true,

        hasAnswer: false,
      },
    };
  }

  const normalizedQuestion =
    validation.question;

  try {
    console.log('');
    console.log(
      '========================================'
    );

    console.log(
      '[RAG] Workflow started'
    );

    console.log(
      `[RAG] User: ${userId}`
    );

    console.log(
      `[RAG] Role: ${userRole}`
    );

    console.log(
      `[RAG] Question: ${normalizedQuestion}`
    );

    console.log(
      '========================================'
    );

    // ========================================================
    // STEP 2: RETRIEVE
    // ========================================================

    const {
      context,
      sources,
      retrievalInfo,
    } =
      await retrieveDocuments(
        normalizedQuestion,
        userId,
        userRole
      );

    console.log(
      `[RAG] ${retrievalInfo.message}`
    );

    // ========================================================
    // STEP 3: NO RELEVANT CONTEXT
    // ========================================================

    if (
      context.length === 0
    ) {
      const duration =
        Date.now() -
        startTime;

      console.log(
        `[RAG] No relevant context found | ${duration}ms`
      );

      return {
        answer:
          INSUFFICIENT_CONTEXT_MESSAGE,

        sources: [],

        error: null,

        metadata: {
          duration,

          retrievalInfo,

          contextUsed: 0,

          hasAnswer: false,

          reason:
            'insufficient_context',
        },
      };
    }

    // ========================================================
    // STEP 4: GENERATE ANSWER
    // ========================================================

    const {
      answer,
      hasAnswer,
      contextUsed,
    } =
      await generateAnswer(
        normalizedQuestion,
        context,
        sources,
        enhancedSystemPrompt
      );

    const duration =
      Date.now() -
      startTime;

    console.log(
      `[RAG] Workflow completed in ${duration}ms`
    );

    console.log(
      `[RAG] Answer generated: ${
        hasAnswer
          ? 'YES'
          : 'NO'
      }`
    );

    // ========================================================
    // RETURN RESULT
    // ========================================================

    return {
      answer,

      sources:
        hasAnswer
          ? sources
          : [],

      error: null,

      metadata: {
        duration,

        retrievalInfo,

        contextUsed,

        hasAnswer,

        reason:
          hasAnswer
            ? 'answer_found'
            : 'insufficient_context',
      },
    };
  } catch (error) {
    const duration =
      Date.now() -
      startTime;

    console.error(
      `[RAG] Workflow failed after ${duration}ms`
    );

    console.error(error);

    return {
      answer:
        GENERIC_ERROR_MESSAGE,

      sources: [],

      error:
        error.message,

      metadata: {
        duration,

        error: true,

        hasAnswer: false,

        reason:
          'rag_system_error',
      },
    };
  }
}

// ============================================================
// STREAMING RAG WORKFLOW
// ============================================================

export async function* streamRAGWorkflow(
  question,
  userId,
  userRole,
  enhancedSystemPrompt = null
) {
  const startTime =
    Date.now();

  // ----------------------------------------------------------
  // STEP 1: Validate question
  // ----------------------------------------------------------

  const validation =
    validateQuestion(
      question
    );

  if (!validation.valid) {
    yield {
      type: 'error',

      error:
        validation.error,

      answer:
        validation.message,

      metadata: {
        duration:
          Date.now() -
          startTime,

        error: true,

        hasAnswer: false,
      },
    };

    return;
  }

  const normalizedQuestion =
    validation.question;

  try {
    // ========================================================
    // STEP 2: Retrieval status
    // ========================================================

    yield {
      type: 'status',

      status: 'searching',

      message:
        'Searching company knowledge...',
    };

    // ========================================================
    // STEP 3: Retrieve documents
    // ========================================================

    const {
      context,
      sources,
      retrievalInfo,
    } =
      await retrieveDocuments(
        normalizedQuestion,
        userId,
        userRole
      );

    // ========================================================
    // STEP 4: No context
    // ========================================================

    if (
      context.length === 0
    ) {
      yield {
        type: 'complete',

        answer:
          INSUFFICIENT_CONTEXT_MESSAGE,

        sources: [],

        hasAnswer: false,

        contextUsed: 0,

        metadata: {
          duration:
            Date.now() -
            startTime,

          retrievalInfo,

          reason:
            'insufficient_context',
        },
      };

      return;
    }

    // ========================================================
    // STEP 5: Generation status
    // ========================================================

    yield {
      type: 'status',

      status: 'generating',

      message:
        'Preparing an answer...',
    };

    // ========================================================
    // STEP 6: Stream answer
    // ========================================================

    for await (
      const event of streamRAGAnswer(
        normalizedQuestion,
        context,
        sources,
        enhancedSystemPrompt
      )
    ) {
      // ------------------------------------------------------
      // Token event
      // ------------------------------------------------------

      if (
        event.type === 'token'
      ) {
        yield event;

        continue;
      }

      // ------------------------------------------------------
      // Complete event
      // ------------------------------------------------------

      if (
        event.type === 'complete'
      ) {
        yield {
          ...event,

          metadata: {
            duration:
              Date.now() -
              startTime,

            retrievalInfo,

            contextUsed:
              event.contextUsed ??
              context.length,

            hasAnswer:
              event.hasAnswer === true,

            reason:
              event.hasAnswer
                ? 'answer_found'
                : 'insufficient_context',
          },
        };
      }
    }
  } catch (error) {
    console.error(
      '[RAG] Streaming workflow failed:',
      error
    );

    yield {
      type: 'error',

      error:
        error.message,

      answer:
        GENERIC_ERROR_MESSAGE,

      metadata: {
        duration:
          Date.now() -
          startTime,

        error: true,

        hasAnswer: false,

        reason:
          'rag_system_error',
      },
    };
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  runRAGWorkflow,
  streamRAGWorkflow,
  retrieveDocuments,
  generateAnswer,
  streamRAGAnswer,
};