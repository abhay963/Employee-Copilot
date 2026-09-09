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

    const currentDate = new Date().toISOString().split('T')[0];

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

          d.version,
          d.effective_from,
          d.effective_until,
          d.status,

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

          AND (
            d.status = 'active'
            OR d.status IS NULL
          )

          AND (
            d.effective_from IS NULL
            OR d.effective_from <= $2
          )

          AND (
            d.effective_until IS NULL
            OR d.effective_until >= $2
          )

        ORDER BY
          dc.embedding
          <=> $1::vector

        LIMIT $3
      `;

      params = [
        embeddingVector,
        currentDate,
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

          d.version,
          d.effective_from,
          d.effective_until,
          d.status,

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

          AND (
            d.status = 'active'
            OR d.status IS NULL
          )

          AND (
            d.effective_from IS NULL
            OR d.effective_from <= $3
          )

          AND (
            d.effective_until IS NULL
            OR d.effective_until >= $3
          )

        ORDER BY
          dc.embedding
          <=> $2::vector

        LIMIT $4
      `;

      params = [
        userId,
        embeddingVector,
        currentDate,
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
      `[RAG] similaritySearch | role=${userRole} | currentDate=${currentDate} | candidates=${result.rows.length}`
    );

    if (result.rows.length > 0) {
      console.log(
        '[RAG] Candidate similarities:',
        result.rows.map((row) => ({
          document: row.document_title,
          visibility: row.visibility,
          documentType: row.document_type,
          status: row.status,
          effectiveFrom: row.effective_from,
          effectiveUntil: row.effective_until,
          similarity: Number(
            row.similarity
          ),
        }))
      );
    }

    // ========================================================
    // POST-PROCESSING: Prioritize newest active policies
    // ========================================================
    //
    // If multiple chunks from the same document type exist,
    // prioritize the one with the latest effective_from date.
    //
    // This ensures that when a new policy version is uploaded,
    // it takes precedence over older versions.
    //
    // ========================================================

    const documentTypeGroups = new Map();

    for (const chunk of result.rows) {
      const docType = chunk.document_type || 'general';

      if (!documentTypeGroups.has(docType)) {
        documentTypeGroups.set(docType, []);
      }

      documentTypeGroups.get(docType).push(chunk);
    }

    // For each document type, keep only the newest active version
    const prioritizedChunks = [];

    for (const [docType, chunks] of documentTypeGroups) {
      // If only one chunk of this type, keep it
      if (chunks.length === 1) {
        prioritizedChunks.push(chunks[0]);
        continue;
      }

      // Sort by effective_from (newest first), then by created_at
      chunks.sort((a, b) => {
        const aEffective = a.effective_from ? new Date(a.effective_from).getTime() : 0;
        const bEffective = b.effective_from ? new Date(b.effective_from).getTime() : 0;

        if (aEffective !== bEffective) {
          return bEffective - aEffective; // Newest first
        }

        // If same effective date, use similarity as tiebreaker
        const aSimilarity = Number(a.similarity) || 0;
        const bSimilarity = Number(b.similarity) || 0;

        return bSimilarity - aSimilarity;
      });

      // Keep the newest active version
      prioritizedChunks.push(chunks[0]);
    }

    // Re-sort by similarity for final results
    prioritizedChunks.sort((a, b) => {
      const aSimilarity = Number(a.similarity) || 0;
      const bSimilarity = Number(b.similarity) || 0;

      return bSimilarity - aSimilarity;
    });

    console.log(
      `[RAG] After versioning prioritization: ${prioritizedChunks.length} chunks`
    );

    return prioritizedChunks.slice(0, safeLimit);
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default DocumentChunk;