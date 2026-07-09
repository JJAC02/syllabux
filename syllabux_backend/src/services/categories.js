import pool from '../config/db.js';

export async function list() {
  const [rows] = await pool.execute(
    'SELECT category_id, name, description FROM Categories ORDER BY name',
  );
  return rows;
}