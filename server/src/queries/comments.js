// COMMENTS — DB functions.
import { query, nextId, buildFilter, pageClause } from '../db.js';
import { toComment } from '../mappers.js';

export async function getComments(filters = {}) {
  const { where, values } = buildFilter(filters, { postId: 'post_id', userId: 'user_id', id: 'id' });
  const rows = await query(`SELECT * FROM comments ${where} ORDER BY id` + pageClause(filters, 10), values);
  return rows.map(toComment);
}

export async function getCommentById(id) {
  const rows = await query('SELECT * FROM comments WHERE id = ? AND is_deleted = 0', [id]);
  return rows.length ? toComment(rows[0]) : null;
}

export async function createComment(d) {
  const id = await nextId('comments', 'COM');
  await query('INSERT INTO comments (id, post_id, user_id, name, email, body) VALUES (?,?,?,?,?,?)',
    [id, d.postId, d.userId, d.name ?? null, d.email ?? null, d.body]);
  return getCommentById(id);
}

// Partial update — only the changed fields.
export async function updateComment(id, d) {
  const exists = await getCommentById(id);
  if (!exists) return null;
  const fields = [], values = [];
  if (d.postId !== undefined) { fields.push('post_id = ?'); values.push(d.postId); }
  if (d.userId !== undefined) { fields.push('user_id = ?'); values.push(d.userId); }
  if (d.name !== undefined)   { fields.push('name = ?');    values.push(d.name); }
  if (d.email !== undefined)  { fields.push('email = ?');   values.push(d.email); }
  if (d.body !== undefined)   { fields.push('body = ?');    values.push(d.body); }
  if (!fields.length) return getCommentById(id);
  values.push(id);
  await query(`UPDATE comments SET ${fields.join(', ')} WHERE id = ?`, values);
  return getCommentById(id);
}

export async function deleteComment(id) {
  const r = await query('UPDATE comments SET is_deleted = 1 WHERE id = ? AND is_deleted = 0', [id]);
  return r.affectedRows > 0;
}

// Ownership check: true = owner, false = not owner, null = not found.
export async function ownsComment(id, userId) {
  const rows = await query('SELECT user_id FROM comments WHERE id = ? AND is_deleted = 0', [id]);
  if (!rows.length) return null;
  return rows[0].user_id === userId;
}
