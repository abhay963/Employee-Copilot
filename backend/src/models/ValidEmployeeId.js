import { query } from '../db/connection.js';

export class ValidEmployeeId {
  static async findAll() {
    const result = await query('SELECT * FROM valid_employee_ids ORDER BY created_at DESC');
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM valid_employee_ids WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByEmployeeId(employeeId) {
    const result = await query('SELECT * FROM valid_employee_ids WHERE employee_id = $1', [employeeId]);
    return result.rows[0];
  }

  static async create(data) {
    const { employee_id, created_by } = data;
    
    // Normalize employee ID: trim and uppercase
    const normalizedEmployeeId = employee_id.trim().toUpperCase();

    const result = await query(
      'INSERT INTO valid_employee_ids (employee_id, created_by) VALUES ($1, $2) RETURNING *',
      [normalizedEmployeeId, created_by]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM valid_employee_ids WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async count() {
    const result = await query('SELECT COUNT(*) as count FROM valid_employee_ids');
    return parseInt(result.rows[0].count);
  }
}