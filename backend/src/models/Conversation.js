import { query } from '../db/connection.js';

export class Conversation {
  static async findById(id) {
    const result = await query('SELECT * FROM conversations WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await query(
      'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return result.rows;
  }

  static async create(data) {
    const { user_id, title } = data;
    const result = await query(
      'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *',
      [user_id, title]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { title, summary, summary_last_updated, message_count } = data;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = COALESCE($${paramIndex++}, title)`);
      values.push(title);
    }

    if (summary !== undefined) {
      updates.push(`summary = $${paramIndex++}`);
      values.push(summary);
    }

    if (summary_last_updated !== undefined) {
      updates.push(`summary_last_updated = $${paramIndex++}`);
      values.push(summary_last_updated);
    }

    if (message_count !== undefined) {
      updates.push(`message_count = $${paramIndex++}`);
      values.push(message_count);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE conversations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM conversations WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async updateTimestamp(id) {
    const result = await query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}
