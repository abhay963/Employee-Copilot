import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { DocumentChunk } from '../models/DocumentChunk.js';
import embeddingService from './embeddingService.js';
import { config } from '../config/index.js';

// ============================================================
// GEMINI MODEL
// ============================================================

const llm = new ChatGoogleGenerativeAI({
  apiKey: config.geminiApiKey,
  model: config.geminiModel,
  temperature: 0.2,
  maxOutputTokens: 2048,
});

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 10;
const MAX_CONTEXT_CHARS = 30000;
const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 2000;

const INSUFFICIENT_CONTEXT_MARKER =
  '__RAG_INSUFFICIENT_CONTEXT__';

const INSUFFICIENT_CONTEXT_MESSAGE =
  "I couldn't find enough information about that in the company's available documents.";

const INVALID_QUESTION_MESSAGE =
  'Please provide a valid question.';

const GENERIC_ERROR_MESSAGE =
  'I was unable to search the company knowledge base right now. Please try again.';

// ============================================================
// HELPERS
// ============================================================

function getTopK() {
  const configuredTopK = Number(config.topK);

  if (
    !Number.isFinite(configuredTopK) ||
    configuredTopK <= 0
  ) {
    return DEFAULT_TOP_K;
  }

  return Math.min(
    Math.max(Math.floor(configuredTopK), 1),
    MAX_TOP_K
  );
}

function normalizeText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value).trim();
}

function getChunkSimilarity(chunk) {
  if (!chunk) {
    return null;
  }

  const metadata = chunk.metadata || {};

  const candidates = [
    metadata.similarity,
    metadata.score,
    chunk.similarity,
    chunk.score,
  ];

  for (const value of candidates) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function getDocumentTitle(chunk) {
  return (
    normalizeText(chunk?.document_title) ||
    normalizeText(chunk?.documentTitle) ||
    'Unknown Document'
  );
}

function getFileName(chunk) {
  return (
    normalizeText(chunk?.file_name) ||
    normalizeText(chunk?.fileName) ||
    'Unknown File'
  );
}

function getChunkIndex(chunk) {
  if (
    chunk?.chunk_index !== undefined &&
    chunk?.chunk_index !== null
  ) {
    return chunk.chunk_index;
  }

  if (
    chunk?.chunkIndex !== undefined &&
    chunk?.chunkIndex !== null
  ) {
    return chunk.chunkIndex;
  }

  return null;
}

function getChunkContent(chunk) {
  return normalizeText(chunk?.content);
}

function getChunkKey(chunk) {
  return [
    getFileName(chunk),
    getChunkIndex(chunk),
    getChunkContent(chunk).substring(0, 100),
  ].join('|');
}

function deduplicateChunks(chunks) {
  const seen = new Set();
  const result = [];

  for (const chunk of chunks) {
    const key = getChunkKey(chunk);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(chunk);
  }

  return result;
}

function extractResponseText(content) {
  if (
    content === null ||
    content === undefined
  ) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

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

  if (
    typeof content === 'object' &&
    typeof content.text === 'string'
  ) {
    return content.text;
  }

  return String(content);
}

function cleanAnswer(answer) {
  return normalizeText(answer)
    .replace(/^ANSWER:\s*/i, '')
    .replace(
      new RegExp(INSUFFICIENT_CONTEXT_MARKER, 'gi'),
      ''
    )
    .trim();
}

function isInsufficientContextAnswer(answer) {
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
// RETRIEVE DOCUMENTS
// ============================================================

export async function retrieveDocuments(
  question,
  userId,
  userRole
) {
  const normalizedQuestion =
    normalizeText(question);

  if (!normalizedQuestion) {
    throw new Error(
      'A valid question is required'
    );
  }

  console.log(
    `[RAG] Searching knowledge base | user=${userId} | role=${userRole}`
  );

  console.log(
    `[RAG] Question: ${normalizedQuestion}`
  );

  // ----------------------------------------------------------
  // Step 1: Generate query embedding
  // ----------------------------------------------------------

  const queryEmbedding =
    await embeddingService.embedQuery(
      normalizedQuestion
    );

  if (
    !Array.isArray(queryEmbedding) ||
    queryEmbedding.length === 0
  ) {
    throw new Error(
      'Failed to generate query embedding'
    );
  }

  console.log(
    `[RAG] Query embedding generated | dimensions=${queryEmbedding.length}`
  );

  // ----------------------------------------------------------
  // Step 2: Retrieve candidates
  // ----------------------------------------------------------

  const configuredTopK = getTopK();

  const candidateCount = Math.max(
    configuredTopK * 2,
    10
  );

  const retrievedChunks =
    await DocumentChunk.similaritySearch(
      queryEmbedding,
      userId,
      userRole,
      candidateCount
    );

  if (!Array.isArray(retrievedChunks)) {
    throw new Error(
      'Vector database returned an invalid retrieval result'
    );
  }

  console.log(
    `[RAG] Retrieved ${retrievedChunks.length} candidate chunks`
  );

  // ----------------------------------------------------------
  // Step 3: Remove invalid/empty chunks
  // ----------------------------------------------------------

  const validChunks =
    retrievedChunks.filter((chunk) => {
      return (
        chunk &&
        getChunkContent(chunk).length > 0
      );
    });

  // ----------------------------------------------------------
  // Step 4: Deduplicate
  // ----------------------------------------------------------

  const uniqueChunks =
    deduplicateChunks(validChunks);

  // ----------------------------------------------------------
  // Step 5: Select final top-K
  // ----------------------------------------------------------

  const finalChunks =
    uniqueChunks.slice(
      0,
      configuredTopK
    );

  console.log(
    `[RAG] Using ${finalChunks.length} chunks after filtering`
  );

  // ----------------------------------------------------------
  // No documents found
  // ----------------------------------------------------------

  if (finalChunks.length === 0) {
    return {
      context: [],
      sources: [],

      retrievalInfo: {
        totalChunks:
          retrievedChunks.length,

        validChunks:
          validChunks.length,

        uniqueChunks:
          uniqueChunks.length,

        usedChunks: 0,

        hasContext: false,

        message:
          'No relevant company documents were found for this question.',
      },
    };
  }

  // ----------------------------------------------------------
  // Step 6: Format context
  // ----------------------------------------------------------

  const context =
    finalChunks.map((chunk, index) => ({
      content:
        getChunkContent(chunk),

      documentTitle:
        getDocumentTitle(chunk),

      fileName:
        getFileName(chunk),

      chunkIndex:
        getChunkIndex(chunk),

      metadata:
        chunk.metadata || {},

      relevanceRank:
        index + 1,

      similarity:
        getChunkSimilarity(chunk),
    }));

  // ----------------------------------------------------------
  // Step 7: Format sources
  // ----------------------------------------------------------

  const sources =
    finalChunks.map((chunk, index) => ({
      documentTitle:
        getDocumentTitle(chunk),

      fileName:
        getFileName(chunk),

      chunkIndex:
        getChunkIndex(chunk),

      relevanceRank:
        index + 1,

      relevance:
        getChunkSimilarity(chunk),
    }));

  return {
    context,
    sources,

    retrievalInfo: {
      totalChunks:
        retrievedChunks.length,

      validChunks:
        validChunks.length,

      uniqueChunks:
        uniqueChunks.length,

      usedChunks:
        context.length,

      hasContext:
        context.length > 0,

      message:
        `Retrieved ${retrievedChunks.length} candidates and selected ${context.length} relevant chunks.`,
    },
  };
}

// ============================================================
// BUILD RAG CONTEXT
// ============================================================

function buildContextString(context) {
  if (
    !Array.isArray(context) ||
    context.length === 0
  ) {
    return '';
  }

  let result = '';

  for (
    let index = 0;
    index < context.length;
    index++
  ) {
    const item = context[index];

    if (!item?.content) {
      continue;
    }

    const section = [
      `[Document ${index + 1}]`,
      `Title: ${item.documentTitle || 'Unknown Document'}`,
      `File: ${item.fileName || 'Unknown File'}`,
      `Chunk: ${item.chunkIndex ?? 'N/A'}`,
      '',
      item.content,
    ].join('\n');

    const candidate = result
      ? `${result}\n\n--------------------\n\n${section}`
      : section;

    if (
      candidate.length >
      MAX_CONTEXT_CHARS
    ) {
      break;
    }

    result = candidate;
  }

  return result.trim();
}

// ============================================================
// BUILD RAG PROMPT
// ============================================================

function buildRAGPrompt(
  question,
  context,
  enhancedSystemPrompt = null
) {
  const basePrompt = `
You are the Employee Copilot's company knowledge assistant.

Your task is to answer the employee's question using ONLY the
company documents provided below.

IMPORTANT RULES:

1. Use ONLY the provided company document context.
2. Do not use your general training knowledge to fill missing information.
3. Do not invent company policies, rules, dates, benefits, procedures,
   employee information, or other company-specific facts.
4. If the answer is clearly present in the context, answer directly.
5. If multiple documents contain relevant information, combine them
   into one coherent answer.
6. When useful, mention the document that supports the answer.
7. If the provided context does not contain enough information to
   answer the question, output exactly:

${INSUFFICIENT_CONTEXT_MARKER}

8. Do not mention embeddings, vector databases, similarity search,
   retrieval pipelines, LangChain, LangGraph, or internal implementation.
9. Be professional, concise, and helpful.
10. Never pretend that information exists in company documents when
    it does not.
11. Do not answer a different question than the employee asked.
12. If only part of the question is supported by the documents,
    answer only the supported part and clearly state that the
    remaining information is not available.

COMPANY DOCUMENT CONTEXT:
${context}

EMPLOYEE QUESTION:
${question}

ANSWER:
`.trim();

  // Add enhanced system prompt if provided
  if (enhancedSystemPrompt) {
    return `${enhancedSystemPrompt}\n\n${basePrompt}`;
  }

  return basePrompt;
}

// ============================================================
// GENERATE ANSWER
// ============================================================

export async function generateAnswer(
  question,
  context,
  sources = []
) {
  try {
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

    const contextString =
      buildContextString(context);

    if (!contextString) {
      return {
        answer:
          INSUFFICIENT_CONTEXT_MESSAGE,

        sources: [],

        hasAnswer: false,

        contextUsed: 0,
      };
    }

    const prompt =
      buildRAGPrompt(
        question,
        contextString,
        enhancedSystemPrompt
      );

    console.log(
      `[RAG] Generating answer using ${context.length} chunks`
    );

    const response =
      await llm.invoke(prompt);

    const rawAnswer =
      extractResponseText(
        response?.content
      );

    const answer =
      cleanAnswer(rawAnswer);

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
  sources = []
) {
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

  const contextString =
    buildContextString(context);

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

  const prompt =
    buildRAGPrompt(
      question,
      contextString,
      enhancedSystemPrompt
    );

  let fullAnswer = '';

  try {
    const stream =
      await llm.stream(prompt);

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
       * Do not immediately yield the marker.
       *
       * Streaming providers can split the marker across
       * multiple chunks. We therefore keep the accumulated
       * answer and validate it after the stream completes.
       *
       * Also avoid exposing the internal marker if it appears
       * in a single chunk.
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

    const hasInsufficientMarker =
      fullAnswer
        .toLowerCase()
        .includes(
          INSUFFICIENT_CONTEXT_MARKER.toLowerCase()
        );

    const cleanedAnswer =
      cleanAnswer(fullAnswer);

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
// MAIN RAG WORKFLOW
// ============================================================

export async function runRAGWorkflow(
  question,
  userId,
  userRole,
  enhancedSystemPrompt = null
) {
  const startTime = Date.now();

  const validation =
    validateQuestion(question);

  if (!validation.valid) {
    return {
      answer:
        validation.message,

      sources: [],

      error:
        validation.error,

      metadata: {
        duration:
          Date.now() - startTime,

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

    // --------------------------------------------------------
    // Step 1: Retrieve
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // Step 2: No relevant context
    // --------------------------------------------------------

    if (
      context.length === 0
    ) {
      const duration =
        Date.now() - startTime;

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

    // --------------------------------------------------------
    // Step 3: Generate answer
    // --------------------------------------------------------

    const {
      answer,
      hasAnswer,
      contextUsed,
    } =
      await generateAnswer(
        normalizedQuestion,
        context,
        sources
      );

    const duration =
      Date.now() - startTime;

    console.log(
      `[RAG] Workflow completed in ${duration}ms`
    );

    console.log(
      `[RAG] Answer generated: ${
        hasAnswer ? 'YES' : 'NO'
      }`
    );

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
      Date.now() - startTime;

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
  userRole
) {
  const startTime = Date.now();

  const validation =
    validateQuestion(question);

  if (!validation.valid) {
    yield {
      type: 'error',

      error:
        validation.error,

      answer:
        validation.message,

      metadata: {
        duration:
          Date.now() - startTime,

        error: true,

        hasAnswer: false,
      },
    };

    return;
  }

  const normalizedQuestion =
    validation.question;

  try {
    // --------------------------------------------------------
    // Retrieval status
    // --------------------------------------------------------

    yield {
      type: 'status',

      status: 'searching',

      message:
        'Searching company knowledge...',
    };

    // --------------------------------------------------------
    // Retrieve documents
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // No context
    // --------------------------------------------------------

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
            Date.now() - startTime,

          retrievalInfo,

          reason:
            'insufficient_context',
        },
      };

      return;
    }

    // --------------------------------------------------------
    // Generation status
    // --------------------------------------------------------

    yield {
      type: 'status',

      status: 'generating',

      message:
        'Preparing an answer...',
    };

    // --------------------------------------------------------
    // Stream answer
    // --------------------------------------------------------

    for await (
      const event of streamRAGAnswer(
        normalizedQuestion,
        context,
        sources
      )
    ) {
      if (
        event.type === 'token'
      ) {
        yield event;

        continue;
      }

      if (
        event.type === 'complete'
      ) {
        yield {
          ...event,

          metadata: {
            duration:
              Date.now() - startTime,

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
          Date.now() - startTime,

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