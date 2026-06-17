// USERS — DB functions (no password is ever returned to the client).
import bcrypt from 'bcryptjs';
import { query, nextId, pageClause } from '../db.js';
import { toUser, toUserPrivate } from '../mappers.js';

// Supports exact lookups (username/id), free-text search, and pagination.
// limit/offset let the admin load users a page at a time — never "all million".
export async function getUsers(filters = {}) {
  const clauses = ['is_deleted = 0'];
  const values = [];
  if (filters.username) { clauses.push('username = ?'); values.push(filters.username); }
  if (filters.id)       { clauses.push('id = ?');       values.push(filters.id); }
  if (filters.search) {                                       // match username OR name
    clauses.push('(username LIKE ? OR name LIKE ?)');
    values.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  const sql = `SELECT * FROM users WHERE ${clauses.join(' AND ')} ORDER BY id` + pageClause(filters);
  const rows = await query(sql, values);
  return rows.map(toUser);
}

export async function getUserById(id) {
  const rows = await query('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [id]);
  return rows.length ? toUser(rows[0]) : null;
}

export async function createUser(d) {
  const id = await nextId('users', 'USR');
  await query(
    'INSERT INTO users (id, username, name, email, phone, website) VALUES (?,?,?,?,?,?)',
    [id, d.username, d.name, d.email, d.phone ?? null, d.website ?? null]);
  if (d.password) {
    const hash = await bcrypt.hash(d.password, 10);   // never store a plain password
    await query('INSERT INTO passwords (user_id, password) VALUES (?,?)', [id, hash]);
  }
  const rows = await query('SELECT * FROM users WHERE id = ?', [id]);
  return toUserPrivate(rows[0]);   // the new user gets their own (private) view
}

// Partial update: only the fields that were actually sent are changed.
export async function updateUser(id, d) {
  const exists = await getUserById(id);
  if (!exists) return null;
  const fields = [], values = [];
  if (d.username !== undefined) { fields.push('username = ?'); values.push(d.username); }
  if (d.name !== undefined)     { fields.push('name = ?');     values.push(d.name); }
  if (d.email !== undefined)    { fields.push('email = ?');    values.push(d.email); }
  if (d.phone !== undefined)    { fields.push('phone = ?');    values.push(d.phone); }
  if (d.website !== undefined)  { fields.push('website = ?');  values.push(d.website); }
  if (!fields.length) return getUserById(id);
  values.push(id);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  return getUserById(id);
}

export async function deleteUser(id) {
  const r = await query('UPDATE users SET is_deleted = 1 WHERE id = ? AND is_deleted = 0', [id]);
  return r.affectedRows > 0;
}

// ---- account operations ----
// Is this user an admin?
export async function isAdmin(userId) {
  const rows = await query('SELECT role FROM users WHERE id = ? AND is_deleted = 0', [userId]);
  return rows.length > 0 && rows[0].role === 'admin';
}

// For the auth middleware: re-read the user on EVERY request. Returns {id, role}
// only if the user exists, is not deleted and is NOT blocked — so a stolen/old
// token for a blocked or deleted user is worthless, and role is always fresh.
export async function getAuthUser(id) {
  const rows = await query(
    'SELECT id, role FROM users WHERE id = ? AND is_deleted = 0 AND is_blocked = 0', [id]);
  return rows.length ? rows[0] : null;
}

// Change own password: only succeeds if the current password matches.
export async function changePassword(userId, currentPassword, newPassword) {
  const rows = await query('SELECT password FROM passwords WHERE user_id = ?', [userId]);
  if (!rows.length) return false;
  const ok = await bcrypt.compare(currentPassword, rows[0].password);   // compare against the hash
  if (!ok) return false;
  const hash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE passwords SET password = ? WHERE user_id = ?', [hash, userId]);
  return true;
}

// Block / unblock a user (admin action).
export async function setBlocked(id, blocked) {
  // Unblocking also resets the failed-password counter so the user gets a fresh start.
  const sql = blocked
    ? 'UPDATE users SET is_blocked = 1 WHERE id = ? AND is_deleted = 0'
    : 'UPDATE users SET is_blocked = 0, failed_attempts = 0 WHERE id = ? AND is_deleted = 0';
  const r = await query(sql, [id]);
  return r.affectedRows > 0;
}

// Set a user's role ('user' or 'admin') — admin action.
export async function setRole(id, role) {
  const r = await query('UPDATE users SET role = ? WHERE id = ? AND is_deleted = 0', [role, id]);
  return r.affectedRows > 0;
}

// You may only edit/delete your OWN account (profile).
export async function ownsUserAccount(id, actorId) {
  const rows = await query('SELECT id FROM users WHERE id = ? AND is_deleted = 0', [id]);
  if (!rows.length) return null;
  return id === actorId;
}

// Server-side login: checks the password table + the blocked flag.
// Returns { status: 'ok' | 'invalid' | 'blocked', user? } – never the password.
export async function verifyLogin(username, password) {
  const users = await query('SELECT * FROM users WHERE username = ? AND is_deleted = 0', [username]);
  if (!users.length) return { status: 'invalid' };
  const user = users[0];
  if (user.is_blocked) return { status: 'blocked' };
  const creds = await query('SELECT password FROM passwords WHERE user_id = ?', [user.id]);
  const ok = creds.length && await bcrypt.compare(password, creds[0].password);   // hash compare
  if (!ok) {
    const attempts = user.failed_attempts + 1;
    if (attempts >= 5) {                                  // 5 wrong tries -> lock the account
      await query('UPDATE users SET failed_attempts = ?, is_blocked = 1 WHERE id = ?', [attempts, user.id]);
      return { status: 'blocked' };
    }
    await query('UPDATE users SET failed_attempts = ? WHERE id = ?', [attempts, user.id]);
    return { status: 'invalid', attemptsLeft: 5 - attempts };
  }
  if (user.failed_attempts > 0)                            // success -> reset the counter
    await query('UPDATE users SET failed_attempts = 0 WHERE id = ?', [user.id]);
  return { status: 'ok', user: toUserPrivate(user) };   // your own (private) view
}
