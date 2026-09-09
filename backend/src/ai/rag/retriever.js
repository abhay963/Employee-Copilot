import { DocumentChunk } from '../../models/DocumentChunk.js';
import embeddingService from '../embeddings/embeddingService.js';
import { config } from '../../config/index.js';

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 10;

// ============================================================
// GET TOP-K
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

// ============================================================
// NORMALIZE TEXT
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
// GET CHUNK SIMILARITY
// ============================================================

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

// ============================================================
// GET DOCUMENT TITLE
// ============================================================

function getDocumentTitle(chunk) {
  return (
    normalizeText(
      chunk?.document_title
    ) ||
    normalizeText(
      chunk?.documentTitle
    ) ||
    'Unknown Document'
  );
}

// ============================================================
// GET FILE NAME
// ============================================================

function getFileName(chunk) {
  return (
    normalizeText(
      chunk?.file_name
    ) ||
    normalizeText(
      chunk?.fileName
    ) ||
    'Unknown File'
  );
}

// ============================================================
// GET CHUNK INDEX
// ============================================================

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

// ============================================================
// GET CHUNK CONTENT
// ============================================================

function getChunkContent(chunk) {
  return normalizeText(
    chunk?.content
  );
}

// ============================================================
// CREATE UNIQUE CHUNK KEY
// ============================================================

function getChunkKey(chunk) {
  return [
    getFileName(chunk),
    getChunkIndex(chunk),
    getChunkContent(chunk).substring(
      0,
      100
    ),
  ].join('|');
}

// ============================================================
// DEDUPLICATE CHUNKS
// ============================================================

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

  // ==========================================================
  // STEP 1: GENERATE QUERY EMBEDDING
  // ==========================================================

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

  // ==========================================================
  // STEP 2: RETRIEVE CANDIDATES
  // ==========================================================

  const configuredTopK =
    getTopK();

  // Retrieve more candidates than we finally need.
  // This gives us room for filtering and deduplication.
  const candidateCount =
    Math.max(
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

  if (
    !Array.isArray(retrievedChunks)
  ) {
    throw new Error(
      'Vector database returned an invalid retrieval result'
    );
  }

  console.log(
    `[RAG] Retrieved ${retrievedChunks.length} candidate chunks`
  );

  // ==========================================================
  // STEP 3: REMOVE INVALID / EMPTY CHUNKS
  // ==========================================================

  const validChunks =
    retrievedChunks.filter(
      (chunk) => {
        return (
          chunk &&
          getChunkContent(chunk).length > 0
        );
      }
    );

  // ==========================================================
  // STEP 4: DEDUPLICATE
  // ==========================================================

  const uniqueChunks =
    deduplicateChunks(
      validChunks
    );

  // ==========================================================
  // STEP 5: SELECT FINAL TOP-K
  // ==========================================================

  const finalChunks =
    uniqueChunks.slice(
      0,
      configuredTopK
    );

  console.log(
    `[RAG] Using ${finalChunks.length} chunks after filtering`
  );

  // ==========================================================
  // STEP 6: NO DOCUMENTS FOUND
  // ==========================================================

  if (
    finalChunks.length === 0
  ) {
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

  // ==========================================================
  // STEP 7: FORMAT CONTEXT
  // ==========================================================

  const context =
    finalChunks.map(
      (chunk, index) => ({
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
      })
    );

  // ==========================================================
  // STEP 8: FORMAT SOURCES
  // ==========================================================

  const sources =
    finalChunks.map(
      (chunk, index) => ({
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
      })
    );

  // ==========================================================
  // RETURN RETRIEVAL RESULT
  // ==========================================================

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
// DEFAULT EXPORT
// ============================================================

export default {
  retrieveDocuments,
};