import { query } from '../db/connection.js';

export class LeaveBalance {
  static async findByUserId(userId) {
    const result = await query('SELECT * FROM leave_balances WHERE user_id = $1', [userId]);
    return result.rows[0];
  }

  static async create(userId, balances = {}) {
    const {
      annual_leave = 20,
      sick_leave = 10,
      personal_leave = 5
    } = balances;

    const result = await query(
      `INSERT INTO leave_balances (user_id, annual_leave, sick_leave, personal_leave)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         annual_leave = EXCLUDED.annual_leave,
         sick_leave = EXCLUDED.sick_leave,
         personal_leave = EXCLUDED.personal_leave,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, annual_leave, sick_leave, personal_leave]
    );
    return result.rows[0];
  }

  static async update(userId, balances) {
    const { annual_leave, sick_leave, personal_leave } = balances;
    
    const result = await query(
      `UPDATE leave_balances 
       SET annual_leave = COALESCE($1, annual_leave),
           sick_leave = COALESCE($2, sick_leave),
           personal_leave = COALESCE($3, personal_leave),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $4
       RETURNING *`,
      [annual_leave, sick_leave, personal_leave, userId]
    );
    return result.rows[0];
  }

  static async deductLeave(userId, leaveType, days) {
    const balance = await this.findByUserId(userId);
    if (!balance) {
      throw new Error('Leave balance not found for user');
    }

    const columnMap = {
      'annual': 'annual_leave',
      'sick': 'sick_leave',
      'personal': 'personal_leave'
    };

    const column = columnMap[leaveType];
    if (!column) {
      throw new Error('Invalid leave type');
    }

    const currentBalance = balance[column];
    if (currentBalance < days) {
      throw new Error(`Insufficient ${leaveType} leave balance`);
    }

    const result = await query(
      `UPDATE leave_balances 
       SET ${column} = ${column} - $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING *`,
      [days, userId]
    );
    return result.rows[0];
  }

  static async addLeave(userId, leaveType, days) {
    const columnMap = {
      'annual': 'annual_leave',
      'sick': 'sick_leave',
      'personal': 'personal_leave'
    };

    const column = columnMap[leaveType];
    if (!column) {
      throw new Error('Invalid leave type');
    }

    const result = await query(
      `UPDATE leave_balances 
       SET ${column} = ${column} + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING *`,
      [days, userId]
    );
    return result.rows[0];
  }

  static async checkAvailability(userId, leaveType, days) {
    const balance = await this.findByUserId(userId);
    if (!balance) {
      return false;
    }

    const columnMap = {
      'annual': 'annual_leave',
      'sick': 'sick_leave',
      'personal': 'personal_leave'
    };

    const column = columnMap[leaveType];
    if (!column) {
      return false;
    }

    return balance[column] >= days;
  }
}