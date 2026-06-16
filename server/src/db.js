// MySQL connection pool + small helpers shared by all query functions.
// Settings can be overridden with env vars so the same code can run as
// root (dev) or as the least-privilege app_user (see restrict_access.sql).
import 'dotenv/config';                 // load DB settings from .env
import { randomBytes } from 'crypto';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD ?? '',   // set DB_PASSWORD in your env if root has a password
  database: process.env.DB_NAME     || 'fullstack6',
  waitForConnections: true,
  connectionLimit: 10,
});

// Run a parameterised query and return the rows.
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Run several statements inside ONE transaction (all-or-nothing).
// Used for cascade deletes (e.g. delete a post's comments AND the post together).
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// Generate a NON-sequential id (a generator, not a counter). Sequential ids
// like USR001/USR002 can be guessed and enumerated; a random suffix can't.
// Keeps the resource prefix (USR, POST, …) + random hex, and verifies it's
// unique before returning it.
export async function nextId(table, prefix) {
  for (let i = 0; i < 5; i++) {
    const id = prefix + randomBytes(5).toString('hex');   // e.g. USR3f9a2b7c1d
    const rows = await query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
    if (!rows.length) return id;
  }
  throw new Error('Failed to generate a unique id');
}

// Build a WHERE clause from the query-string filters jsonplaceholder
// supports (e.g. /todos?userId=USR001&completed=true). `allowed` maps
// the API field name -> the DB column name.
// Soft delete: every list is automatically limited to is_deleted = 0,
// so "deleted" rows never appear in any read.
export function buildFilter(queryParams, allowed) {
  const clauses = ['is_deleted = 0'];
  const values = [];
  for (const [apiField, column] of Object.entries(allowed)) {
    if (queryParams[apiField] !== undefined) {
      let v = queryParams[apiField];
      if (v === 'true') v = 1;
      else if (v === 'false') v = 0;
      clauses.push(`${column} = ?`);
      values.push(v);
    }
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, values };
}
