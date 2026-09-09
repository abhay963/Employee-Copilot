import { query } from '../db/connection.js';

export class DailyBrief {
  static async create(userId, briefData, sources) {
    const result = await query(
      `INSERT INTO daily_briefs (user_id, brief_data, sources)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, JSON.stringify(briefData), sources]
    );
    return result.rows[0];
  }

  static async findLatestByUserId(userId) {
    const result = await query(
      `SELECT * FROM daily_briefs
       WHERE user_id = $1
       ORDER BY generated_at DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM daily_briefs WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async update(id, briefData, sources) {
    const result = await query(
      `UPDATE daily_briefs
       SET brief_data = $2, sources = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, JSON.stringify(briefData), sources]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query(
      'DELETE FROM daily_briefs WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async deleteByUserId(userId) {
    const result = await query(
      'DELETE FROM daily_briefs WHERE user_id = $1 RETURNING *',
      [userId]
    );
    return result.rows;
  }
}

export default DailyBrief;