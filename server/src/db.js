// MySQL connection pool + small helpers shared by all query functions.
// Settings can be overridden with env vars so the same code can run as
// root (dev) or as the least-privilege app_user (see restrict_access.sql).
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '214654121',
  // password: '214654121',
  database: process.env.DB_NAME     || 'fullstack6',
  waitForConnections: true,
  connectionLimit: 10,
});

// Run a parameterised query and return the rows.
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Generate the next string id for a table, keeping the existing
// format (e.g. POST001 -> POST002). Only ids with the given prefix
// are considered, so stray ids never break the sequence.
export async function nextId(table, prefix, width = 3) {
  const rows = await query(`SELECT id FROM ${table} WHERE id LIKE ?`, [`${prefix}%`]);
  let max = 0;
  for (const r of rows) {
    const n = parseInt(String(r.id).slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return prefix + String(max + 1).padStart(width, '0');
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
