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

  static async checkDuplicate(conversation_id, role, content, timeWindowSeconds = 30) {
    // Check for exact content match within time window to prevent rapid duplicate submissions
    // Default 30-second window matches conversationMemoryService.DUPLICATE_CHECK_WINDOW
    const result = await query(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
       AND role = $2 
       AND content = $3 
       AND created_at > NOW() - INTERVAL '1 second' * $4
       ORDER BY created_at DESC 
       LIMIT 1`,
      [conversation_id, role, content, timeWindowSeconds]
    );
    return result.rows[0];
  }

  static async createWithDuplicateCheck(data) {
    const { conversation_id, role, content, sources } = data;
    
    // Check for duplicate before insertion
    const duplicate = await this.checkDuplicate(conversation_id, role, content, 30);
    if (duplicate) {
      console.warn('[Message] Duplicate message detected, returning existing message');
      return duplicate;
    }
    
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
