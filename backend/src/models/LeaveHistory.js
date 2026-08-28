import { query } from '../db/connection.js';

export class LeaveHistory {
  static async create(data) {
    const {
      user_id,
      leave_request_id,
      action,
      previous_status,
      new_status,
      performed_by,
      notes
    } = data;

    const result = await query(
      `INSERT INTO leave_history (user_id, leave_request_id, action, previous_status, new_status, performed_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, leave_request_id, action, previous_status, new_status, performed_by, notes]
    );
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await query(
      `SELECT lh.*, lr.leave_type, lr.start_date, lr.end_date
       FROM leave_history lh
       JOIN leave_requests lr ON lh.leave_request_id = lr.id
       WHERE lh.user_id = $1
       ORDER BY lh.timestamp DESC`,
      [userId]
    );
    return result.rows;
  }

  static async findByLeaveRequestId(leaveRequestId) {
    const result = await query(
      `SELECT lh.*, u.name as performer_name
       FROM leave_history lh
       LEFT JOIN users u ON lh.performed_by = u.id
       WHERE lh.leave_request_id = $1
       ORDER BY lh.timestamp ASC`,
      [leaveRequestId]
    );
    return result.rows;
  }
}