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

  static async findAll() {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows;
  }

  static async findByRole(role) {
    const result = await query('SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC', [role]);
    return result.rows;
  }

  static async create(data) {
    const { name, email, password, role, department } = data;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (name, email, password_hash, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, password_hash, role, department]
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
}
