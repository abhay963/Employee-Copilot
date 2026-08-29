import { GoogleGenAI } from '@google/genai';
import { config } from '../config/index.js';

// ============================================================
// CONSTANTS
// ============================================================

const EMBEDDING_DIMENSION = 1536;
const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001';

// ============================================================
// EMBEDDING SERVICE
// ============================================================

class EmbeddingService {
  constructor() {
    if (!config.geminiApiKey) {
      throw new Error(
        'GEMINI_API_KEY is required for embedding service'
      );
    }

    this.ai = new GoogleGenAI({
      apiKey: config.geminiApiKey,
    });

    this.model =
      config.embeddingModel ||
      DEFAULT_EMBEDDING_MODEL;

    console.log(
      `[Embedding] Initialized | model=${this.model} | dimensions=${EMBEDDING_DIMENSION}`
    );
  }

  // ==========================================================
  // VALIDATE TEXT
  // ==========================================================

  validateText(text) {
    if (
      typeof text !== 'string' ||
      !text.trim()
    ) {
      throw new Error(
        'Embedding text must be a non-empty string'
      );
    }

    return text.trim();
  }

  // ==========================================================
  // NORMALIZE EMBEDDING
  // ==========================================================

  normalizeEmbedding(embedding) {
    if (
      !Array.isArray(embedding) ||
      embedding.length === 0
    ) {
      throw new Error(
        'Embedding is empty or invalid'
      );
    }

    const values = embedding.map(Number);

    const containsInvalidValue =
      values.some(
        (value) =>
          !Number.isFinite(value)
      );

    if (containsInvalidValue) {
      throw new Error(
        'Embedding contains invalid numeric values'
      );
    }

    if (
      values.length !==
      EMBEDDING_DIMENSION
    ) {
      throw new Error(
        `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, received ${values.length}`
      );
    }

    // --------------------------------------------------------
    // L2 normalization
    // --------------------------------------------------------

    const magnitude = Math.sqrt(
      values.reduce(
        (sum, value) =>
          sum + value * value,
        0
      )
    );

    if (
      !Number.isFinite(magnitude) ||
      magnitude === 0
    ) {
      throw new Error(
        'Embedding has zero or invalid magnitude'
      );
    }

    return values.map(
      (value) =>
        value / magnitude
    );
  }

  // ==========================================================
  // EMBED SINGLE TEXT
  // ==========================================================

  async embedSingle(
    text,
    taskType
  ) {
    const normalizedText =
      this.validateText(text);

    try {
      const result =
        await this.ai.models.embedContent({
          model: this.model,

          contents: normalizedText,

          config: {
            outputDimensionality:
              EMBEDDING_DIMENSION,

            taskType,
          },
        });

      const embedding =
        result?.embeddings?.[0]?.values;

      if (
        !Array.isArray(embedding) ||
        embedding.length === 0
      ) {
        throw new Error(
          'Google Gemini returned an empty embedding'
        );
      }

      return this.normalizeEmbedding(
        embedding
      );
    } catch (error) {
      console.error(
        '[Embedding] Failed:',
        error
      );

      throw new Error(
        `Failed to generate embedding: ${error.message}`
      );
    }
  }

  // ==========================================================
  // EMBED DOCUMENTS
  // ==========================================================

  async embedDocuments(texts) {
    if (
      !Array.isArray(texts) ||
      texts.length === 0
    ) {
      throw new Error(
        'No texts provided for document embedding'
      );
    }

    const embeddings = [];

    try {
      for (
        let i = 0;
        i < texts.length;
        i++
      ) {
        const text =
          this.validateText(texts[i]);

        console.log(
          `[Embedding] Document chunk ${i + 1}/${texts.length}`
        );

        const embedding =
          await this.embedSingle(
            text,
            'RETRIEVAL_DOCUMENT'
          );

        embeddings.push(
          embedding
        );
      }

      if (
        embeddings.length !==
        texts.length
      ) {
        throw new Error(
          `Embedding count mismatch: expected ${texts.length}, received ${embeddings.length}`
        );
      }

      console.log(
        `[Embedding] Generated ${embeddings.length} document embeddings`
      );

      return embeddings;
    } catch (error) {
      console.error(
        '[Embedding] Document embedding failed:',
        error
      );

      throw new Error(
        `Failed to generate document embeddings: ${error.message}`
      );
    }
  }

  // ==========================================================
  // EMBED QUERY
  // ==========================================================

  async embedQuery(text) {
    try {
      const embedding =
        await this.embedSingle(
          text,
          'RETRIEVAL_QUERY'
        );

      if (
        embedding.length !==
        EMBEDDING_DIMENSION
      ) {
        throw new Error(
          `Query embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, received ${embedding.length}`
        );
      }

      return embedding;
    } catch (error) {
      console.error(
        '[Embedding] Query embedding failed:',
        error
      );

      throw new Error(
        `Failed to generate query embedding: ${error.message}`
      );
    }
  }

  // ==========================================================
  // GET DIMENSION
  // ==========================================================

  getDimension() {
    return EMBEDDING_DIMENSION;
  }

  // ==========================================================
  // GET MODEL
  // ==========================================================

  getModel() {
    return this.model;
  }
}

// ============================================================
// SINGLETON
// ============================================================

export default new EmbeddingService();