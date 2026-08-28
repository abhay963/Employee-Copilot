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
    const { title } = data;
    const result = await query(
      'UPDATE conversations SET title = COALESCE($1, title), updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [title, id]
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
