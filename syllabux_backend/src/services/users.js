import pool from '../config/db.js';
import crypto from 'crypto';

const PUBLIC_COLUMNS =
  'user_id, first_name, last_name, email, role, created_at, updated_at';

export async function get(id) {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM Users WHERE user_id = ?`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getByEmail(email) {
  const [rows] = await pool.query(
    'SELECT * FROM Users WHERE email = ?',
    [email]
  );
  return rows[0] ?? null;
}

export async function create({
  first_name,
  last_name,
  email,
  password_hash,
  role,
}) {
  const [result] = await pool.query(
    `INSERT INTO Users (first_name, last_name, email, password_hash, role)
     VALUES (?, ?, ?, ?, ?)`,
    [first_name, last_name, email, password_hash, role]
  );
  return get(result.insertId);
}

export async function update(id, { first_name, last_name, email, role }) {
  const [result] = await pool.query(
    `UPDATE Users
     SET first_name = ?, last_name = ?, email = ?, role = ?
     WHERE user_id = ?`,
    [first_name, last_name, email, role, id]
  );
  if (result.affectedRows === 0) return null;
  return get(id);
}

export async function remove(id) {
  const [result] = await pool.query(
    'DELETE FROM Users WHERE user_id = ?',
    [id]
  );
  return result.affectedRows > 0;
}