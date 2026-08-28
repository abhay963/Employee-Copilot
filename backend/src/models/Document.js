import { query } from '../db/connection.js';

export class Document {
  // Get a document by ID
  static async findById(id) {
    const result = await query(
      `
      SELECT *
      FROM documents
      WHERE id = $1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  // Get all documents owned by a specific user
  static async findByOwner(ownerId) {
    const result = await query(
      `
      SELECT *
      FROM documents
      WHERE owner_id = $1
      ORDER BY upload_date DESC
      `,
      [ownerId]
    );

    return result.rows;
  }

  // Get documents accessible to a user
  //
  // HR:
  //   Can access every document.
  //
  // Employee:
  //   Can access:
  //   1. Their own documents
  //   2. Company-wide documents
  static async findAccessibleByUser(
    userId,
    userRole
  ) {
    let queryText;
    let params;

    if (userRole === 'hr') {
      queryText = `
        SELECT *
        FROM documents
        ORDER BY upload_date DESC
      `;

      params = [];
    } else {
      queryText = `
        SELECT *
        FROM documents
        WHERE owner_id = $1
           OR visibility = 'company'
        ORDER BY upload_date DESC
      `;

      params = [userId];
    }

    const result = await query(
      queryText,
      params
    );

    return result.rows;
  }

  // Get documents by document type
  static async findByType(documentType) {
    const result = await query(
      `
      SELECT *
      FROM documents
      WHERE document_type = $1
      ORDER BY upload_date DESC
      `,
      [documentType]
    );

    return result.rows;
  }

  // Get documents by visibility
  static async findByVisibility(
    visibility
  ) {
    const result = await query(
      `
      SELECT *
      FROM documents
      WHERE visibility = $1
      ORDER BY upload_date DESC
      `,
      [visibility]
    );

    return result.rows;
  }

  // Create a new document
  static async create(data) {
    const {
      title,
      file_name,
      file_type,
      file_size,
      file_path,
      content,
      owner_id,
      visibility = 'private',
      document_type = 'general',
    } = data;

    const result = await query(
      `
      INSERT INTO documents (
        title,
        file_name,
        file_type,
        file_size,
        file_path,
        content,
        owner_id,
        visibility,
        document_type
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9
      )
      RETURNING *
      `,
      [
        title,
        file_name,
        file_type,
        file_size,
        file_path,
        content,
        owner_id,
        visibility,
        document_type,
      ]
    );

    return result.rows[0];
  }

  // Update document metadata
  static async update(id, data) {
    const {
      title,
      visibility,
      document_type,
    } = data;

    const result = await query(
      `
      UPDATE documents
      SET
        title = COALESCE($1, title),
        visibility = COALESCE($2, visibility),
        document_type = COALESCE($3, document_type),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
      `,
      [
        title,
        visibility,
        document_type,
        id,
      ]
    );

    return result.rows[0] || null;
  }

  // Delete a document
  static async delete(id) {
    const result = await query(
      `
      DELETE FROM documents
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  // Check whether a user owns a document
  //
  // HR automatically has access.
  // Employees must be the document owner.
  static async checkOwnership(
    documentId,
    userId,
    userRole
  ) {
    if (userRole === 'hr') {
      return true;
    }

    const result = await query(
      `
      SELECT owner_id
      FROM documents
      WHERE id = $1
      `,
      [documentId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return (
      result.rows[0].owner_id === userId
    );
  }
}