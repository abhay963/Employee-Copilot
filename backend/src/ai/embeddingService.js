import { GoogleGenAI } from '@google/genai';
import { config } from '../config/index.js';

const EMBEDDING_DIMENSION = 1536;

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

    this.model = config.embeddingModel || 'gemini-embedding-001';

    console.log(
      `Embedding service initialized with ${this.model} (${EMBEDDING_DIMENSION} dimensions)`
    );
  }

  normalizeEmbedding(embedding) {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Embedding is empty or invalid');
    }

    const values = embedding.map(Number);

    if (
      !values.every(
        (value) =>
          Number.isFinite(value)
      )
    ) {
      throw new Error(
        'Embedding contains invalid numeric values'
      );
    }

    /*
     * gemini-embedding-001 returns 3072 dimensions by default.
     *
     * We explicitly request 1536 dimensions.
     *
     * Google recommends manual normalization when using
     * reduced dimensions with gemini-embedding-001.
     */
    const magnitude = Math.sqrt(
      values.reduce(
        (sum, value) => sum + value * value,
        0
      )
    );

    if (magnitude === 0) {
      throw new Error(
        'Embedding has zero magnitude'
      );
    }

    return values.map(
      (value) => value / magnitude
    );
  }

  async embedSingle(text, taskType) {
    if (
      typeof text !== 'string' ||
      !text.trim()
    ) {
      throw new Error(
        'Text must be a non-empty string'
      );
    }

    const result =
      await this.ai.models.embedContent({
        model: this.model,
        contents: text,
        config: {
          outputDimensionality: EMBEDDING_DIMENSION,
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

    if (
      embedding.length !==
      EMBEDDING_DIMENSION
    ) {
      throw new Error(
        `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, received ${embedding.length}`
      );
    }

    return this.normalizeEmbedding(
      embedding
    );
  }

  async embedDocuments(texts) {
    try {
      if (
        !Array.isArray(texts) ||
        texts.length === 0
      ) {
        throw new Error(
          'No texts provided for embedding'
        );
      }

      const embeddings = [];

      for (let i = 0; i < texts.length; i++) {
        console.log(
          `Embedding document chunk ${i + 1}/${texts.length}...`
        );

        const embedding =
          await this.embedSingle(
            texts[i],
            'RETRIEVAL_DOCUMENT'
          );

        embeddings.push(embedding);
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
        `Generated ${embeddings.length} embeddings`
      );

      console.log(
        `Embedding dimension: ${embeddings[0].length}`
      );

      return embeddings;
    } catch (error) {
      console.error(
        'Error embedding documents:',
        error
      );

      throw new Error(
        `Failed to generate embeddings: ${error.message}`
      );
    }
  }

  async embedQuery(text) {
    try {
      if (
        typeof text !== 'string' ||
        !text.trim()
      ) {
        throw new Error(
          'Query text must be a non-empty string'
        );
      }

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
        'Error embedding query:',
        error
      );

      throw new Error(
        `Failed to generate query embedding: ${error.message}`
      );
    }
  }
}

export default new EmbeddingService();