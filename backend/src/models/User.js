import bcrypt from 'bcryptjs';
import { query } from '../db/connection.js';

export class User {
  static async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async findByEmployeeId(employeeId) {
    const normalizedEmployeeId = employeeId ? employeeId.trim().toUpperCase() : null;
    const result = await query('SELECT * FROM users WHERE employee_id = $1', [normalizedEmployeeId]);
    return result.rows[0];
  }

  static async findAll() {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows;
  }

  static async getAll() {
    return this.findAll();
  }

  static async findByRole(role) {
    const result = await query('SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC', [role]);
    return result.rows;
  }

  static async searchUsers(searchTerm) {
    const result = await query(
      `SELECT * FROM users 
       WHERE name ILIKE $1 OR email ILIKE $1 OR employee_id ILIKE $1 
       ORDER BY created_at DESC`,
      [`%${searchTerm}%`]
    );
    return result.rows;
  }

  static async create(data) {
    const { name, email, password, role, department, employee_id } = data;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Normalize employee ID if provided
    const normalizedEmployeeId = employee_id ? employee_id.trim().toUpperCase() : null;

    // Check for duplicate employee ID if provided
    if (normalizedEmployeeId) {
      const existingEmployeeId = await this.findByEmployeeId(normalizedEmployeeId);
      if (existingEmployeeId) {
        throw new Error('Employee ID already exists');
      }
    }

    const result = await query(
      'INSERT INTO users (name, email, password_hash, role, department, employee_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, email, password_hash, role, department, normalizedEmployeeId]
    );
    return result.rows[0];
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    if (!hashedPassword) return false;
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(userId, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    
    const result = await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [password_hash, userId]
    );
    return result.rows[0];
  }

  static async updateRole(userId, newRole) {
    const result = await query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newRole, userId]
    );
    return result.rows[0];
  }

  static async updateEmployeeId(userId, employeeId) {
    const normalizedEmployeeId = employeeId ? employeeId.trim().toUpperCase() : null;
    const result = await query(
      'UPDATE users SET employee_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [normalizedEmployeeId, userId]
    );
    return result.rows[0];
  }

  static async blockUser(userId) {
    const result = await query(
      'UPDATE users SET is_blocked = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [userId]
    );
    return result.rows[0];
  }

  static async unblockUser(userId) {
    const result = await query(
      'UPDATE users SET is_blocked = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [userId]
    );
    return result.rows[0];
  }

  static async delete(userId) {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [userId]);
    return result.rows[0];
  }

  static async getUserStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'employee') as employees,
        COUNT(*) FILTER (WHERE role = 'hr') as hr_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) FILTER (WHERE is_blocked = TRUE) as blocked_users
      FROM users
    `);
    return result.rows[0];
  }
}
