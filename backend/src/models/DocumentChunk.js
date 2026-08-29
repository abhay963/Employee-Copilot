import { query, getClient } from '../db/connection.js';

// ============================================================
// CONSTANTS
// ============================================================

const EMBEDDING_DIMENSION = 1536;

// We retrieve candidates first instead of filtering them out
// inside SQL. This makes RAG much more reliable and easier
// to debug.
//
// Final relevance filtering can be performed by the RAG layer.
const DEFAULT_CANDIDATE_LIMIT = 10;

// ============================================================
// EMBEDDING FORMATTER
// ============================================================

const formatEmbeddingForPgVector = (embedding) => {
  if (
    !Array.isArray(embedding) ||
    embedding.length !== EMBEDDING_DIMENSION
  ) {
    throw new Error(
      `Invalid embedding dimension. Expected ${EMBEDDING_DIMENSION}, received ${
        embedding?.length ?? 0
      }`
    );
  }

  const values = embedding.map(Number);

  const invalid = values.some(
    (value) => !Number.isFinite(value)
  );

  if (invalid) {
    throw new Error(
      'Embedding contains invalid numeric values'
    );
  }

  return `[${values.join(',')}]`;
};

// ============================================================
// DOCUMENT CHUNK MODEL
// ============================================================

export class DocumentChunk {

  // ==========================================================
  // FIND BY ID
  // ==========================================================

  static async findById(id) {
    const result = await query(
      `
      SELECT *
      FROM document_chunks
      WHERE id = $1
      `,
      [id]
    );

    return result.rows[0];
  }

  // ==========================================================
  // FIND BY DOCUMENT ID
  // ==========================================================

  static async findByDocumentId(documentId) {
    const result = await query(
      `
      SELECT *
      FROM document_chunks
      WHERE document_id = $1
      ORDER BY chunk_index ASC
      `,
      [documentId]
    );

    return result.rows;
  }

  // ==========================================================
  // CREATE ONE CHUNK
  // ==========================================================

  static async create(data) {
    const {
      document_id,
      chunk_index,
      content,
      embedding,
      metadata,
    } = data;

    const embeddingVector =
      formatEmbeddingForPgVector(embedding);

    const result = await query(
      `
      INSERT INTO document_chunks (
        document_id,
        chunk_index,
        content,
        embedding,
        metadata
      )
      VALUES (
        $1,
        $2,
        $3,
        $4::vector,
        $5
      )
      RETURNING *
      `,
      [
        document_id,
        chunk_index,
        content,
        embeddingVector,
        JSON.stringify(metadata || {}),
      ]
    );

    return result.rows[0];
  }

  // ==========================================================
  // CREATE MANY CHUNKS
  // ==========================================================

  static async createMany(chunks) {
    if (
      !Array.isArray(chunks) ||
      chunks.length === 0
    ) {
      return [];
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      const results = [];

      for (const chunk of chunks) {
        const embeddingVector =
          formatEmbeddingForPgVector(
            chunk.embedding
          );

        const result = await client.query(
          `
          INSERT INTO document_chunks (
            document_id,
            chunk_index,
            content,
            embedding,
            metadata
          )
          VALUES (
            $1,
            $2,
            $3,
            $4::vector,
            $5
          )
          RETURNING *
          `,
          [
            chunk.document_id,
            chunk.chunk_index,
            chunk.content,
            embeddingVector,
            JSON.stringify(
              chunk.metadata || {}
            ),
          ]
        );

        results.push(result.rows[0]);
      }

      await client.query('COMMIT');

      console.log(
        `[DocumentChunk] Created ${results.length} chunks`
      );

      return results;
    } catch (error) {
      await client.query('ROLLBACK');

      console.error(
        '[DocumentChunk] createMany failed:',
        error
      );

      throw error;
    } finally {
      client.release();
    }
  }

  // ==========================================================
  // DELETE DOCUMENT CHUNKS
  // ==========================================================

  static async deleteByDocumentId(documentId) {
    const result = await query(
      `
      DELETE FROM document_chunks
      WHERE document_id = $1
      RETURNING *
      `,
      [documentId]
    );

    return result.rows;
  }

  // ==========================================================
  // SIMILARITY SEARCH
  // ==========================================================

  static async similaritySearch(
    embedding,
    userId,
    userRole,
    limit = DEFAULT_CANDIDATE_LIMIT
  ) {
    const embeddingVector =
      formatEmbeddingForPgVector(embedding);

    const safeLimit = Math.min(
      Math.max(
        Number(limit) || DEFAULT_CANDIDATE_LIMIT,
        1
      ),
      50
    );

    let queryText;
    let params;

    // ========================================================
    // HR
    // ========================================================

    if (
      String(userRole).toLowerCase() === 'hr'
    ) {
      queryText = `
        SELECT
          dc.*,

          d.title AS document_title,

          d.file_name,

          d.owner_id,

          d.visibility,

          d.document_type,

          (
            1 - (
              dc.embedding
              <=> $1::vector
            )
          ) AS similarity

        FROM document_chunks dc

        JOIN documents d
          ON dc.document_id = d.id

        WHERE dc.embedding IS NOT NULL

        ORDER BY
          dc.embedding
          <=> $1::vector

        LIMIT $2
      `;

      params = [
        embeddingVector,
        safeLimit,
      ];
    }

    // ========================================================
    // EMPLOYEE
    // ========================================================

    else {
      queryText = `
        SELECT
          dc.*,

          d.title AS document_title,

          d.file_name,

          d.owner_id,

          d.visibility,

          d.document_type,

          (
            1 - (
              dc.embedding
              <=> $2::vector
            )
          ) AS similarity

        FROM document_chunks dc

        JOIN documents d
          ON dc.document_id = d.id

        WHERE dc.embedding IS NOT NULL

          AND (
            d.owner_id = $1
            OR d.visibility = 'company'
          )

        ORDER BY
          dc.embedding
          <=> $2::vector

        LIMIT $3
      `;

      params = [
        userId,
        embeddingVector,
        safeLimit,
      ];
    }

    const result = await query(
      queryText,
      params
    );

    // ========================================================
    // DEBUG INFORMATION
    // ========================================================

    console.log(
      `[RAG] similaritySearch | role=${userRole} | candidates=${result.rows.length}`
    );

    if (result.rows.length > 0) {
      console.log(
        '[RAG] Candidate similarities:',
        result.rows.map((row) => ({
          document: row.document_title,
          visibility: row.visibility,
          documentType: row.document_type,
          similarity: Number(
            row.similarity
          ),
        }))
      );
    }

    return result.rows;
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default DocumentChunk;