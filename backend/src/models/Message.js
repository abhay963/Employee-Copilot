import { query } from '../db/connection.js';

export class Message {
  static async findById(id) {
    const result = await query('SELECT * FROM messages WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByConversationId(conversationId) {
    const result = await query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );
    return result.rows;
  }

  static async create(data) {
    const { conversation_id, role, content, sources } = data;
    const result = await query(
      `INSERT INTO messages (conversation_id, role, content, sources)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [conversation_id, role, content, JSON.stringify(sources || [])]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM messages WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async deleteByConversationId(conversationId) {
    const result = await query(
      'DELETE FROM messages WHERE conversation_id = $1 RETURNING *',
      [conversationId]
    );
    return result.rows;
  }
}
