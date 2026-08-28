import { query } from '../db/connection.js';
import { differenceInBusinessDays, parseISO, format } from 'date-fns';

export class LeaveRequest {
  static async findById(id) {
    const result = await query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await query(
      'SELECT * FROM leave_requests WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  static async findByStatus(status) {
    const result = await query(
      'SELECT * FROM leave_requests WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    return result.rows;
  }

  static async findAll() {
    const result = await query('SELECT * FROM leave_requests ORDER BY created_at DESC');
    return result.rows;
  }

  static async create(data) {
    const {
      user_id,
      leave_type,
      start_date,
      end_date,
      number_of_days,
      reason
    } = data;

    const result = await query(
      `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, number_of_days, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, leave_type, start_date, end_date, number_of_days, reason]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { status, reviewed_by, review_comment } = data;

    const result = await query(
      `UPDATE leave_requests 
       SET status = COALESCE($1, status),
           reviewed_by = COALESCE($2, reviewed_by),
           reviewed_at = CASE WHEN $1 IS NOT NULL THEN CURRENT_TIMESTAMP ELSE reviewed_at END,
           review_comment = COALESCE($3, review_comment),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, reviewed_by, review_comment, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM leave_requests WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async calculateDays(startDate, endDate) {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      
      // Calculate business days (excluding weekends)
      const businessDays = differenceInBusinessDays(end, start) + 1;
      
      return Math.max(1, businessDays); // Ensure at least 1 day
    } catch (error) {
      console.error('Error calculating days:', error);
      return 1; // Default to 1 day if calculation fails
    }
  }

  static async checkOverlappingLeave(userId, startDate, endDate) {
    const result = await query(
      `SELECT * FROM leave_requests 
       WHERE user_id = $1 
       AND status IN ('pending', 'approved')
       AND (
         (start_date <= $2 AND end_date >= $2) OR
         (start_date <= $3 AND end_date >= $3) OR
         (start_date >= $2 AND end_date <= $3)
       )`,
      [userId, startDate, endDate]
    );
    return result.rows;
  }

  static async getPendingRequests() {
    const result = await query(
      `SELECT lr.*, u.name as user_name, u.email as user_email, u.department
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       WHERE lr.status = 'pending'
       ORDER BY lr.created_at DESC`
    );
    return result.rows;
  }

  static async getWithUserDetails(id) {
    const result = await query(
      `SELECT lr.*, u.name as user_name, u.email as user_email, u.department,
              r.name as reviewer_name, r.email as reviewer_email
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       LEFT JOIN users r ON lr.reviewed_by = r.id
       WHERE lr.id = $1`,
      [id]
    );
    return result.rows[0];
  }
}