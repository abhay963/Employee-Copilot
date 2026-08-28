import { query, getClient } from '../db/connection.js';

const EMBEDDING_DIMENSION = 1536;

const formatEmbeddingForPgVector = (
  embedding
) => {
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

  return `[${values.join(',')}]`;
};

export class DocumentChunk {
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

  static async findByDocumentId(
    documentId
  ) {
    const result = await query(
      `
      SELECT *
      FROM document_chunks
      WHERE document_id = $1
      ORDER BY chunk_index
      `,
      [documentId]
    );

    return result.rows;
  }

  static async create(data) {
    const {
      document_id,
      chunk_index,
      content,
      embedding,
      metadata,
    } = data;

    const embeddingVector =
      formatEmbeddingForPgVector(
        embedding
      );

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
        JSON.stringify(
          metadata || {}
        ),
      ]
    );

    return result.rows[0];
  }

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

        const result =
          await client.query(
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

        results.push(
          result.rows[0]
        );
      }

      await client.query('COMMIT');

      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteByDocumentId(
    documentId
  ) {
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

  static async similaritySearch(
    embedding,
    userId,
    userRole,
    limit = 5
  ) {
    const embeddingVector =
      formatEmbeddingForPgVector(
        embedding
      );

    let queryText;
    let params;

    if (userRole === 'hr') {
      queryText = `
        SELECT
          dc.*,
          d.title AS document_title,
          d.file_name,
          d.owner_id,
          d.visibility
        FROM document_chunks dc
        JOIN documents d
          ON dc.document_id = d.id
        WHERE dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> $1::vector
        LIMIT $2
      `;

      params = [
        embeddingVector,
        limit,
      ];
    } else {
      queryText = `
        SELECT
          dc.*,
          d.title AS document_title,
          d.file_name,
          d.owner_id,
          d.visibility
        FROM document_chunks dc
        JOIN documents d
          ON dc.document_id = d.id
        WHERE dc.embedding IS NOT NULL
          AND (
            d.owner_id = $1
            OR d.visibility = 'company'
          )
        ORDER BY dc.embedding <=> $2::vector
        LIMIT $3
      `;

      params = [
        userId,
        embeddingVector,
        limit,
      ];
    }

    const result = await query(
      queryText,
      params
    );

    return result.rows;
  }
}