// POSTS — DB functions.
import { query, nextId, buildFilter, withTransaction, pageClause } from '../db.js';
import { toPost, toComment } from '../mappers.js';

export async function getPosts(filters = {}) {
  const { where, values } = buildFilter(filters, { userId: 'user_id', id: 'id' });
  const rows = await query(
    `SELECT p.*, u.name AS owner_name
     FROM posts p JOIN users u ON p.user_id = u.id
     ${where.replace('is_deleted', 'p.is_deleted')}
     ORDER BY p.id ${pageClause(filters, 10)}`,
    values);
  return rows.map(toPost);
}

export async function getPostById(id) {
  const rows = await query('SELECT * FROM posts WHERE id = ? AND is_deleted = 0', [id]);
  return rows.length ? toPost(rows[0]) : null;
}

export async function getPostComments(postId) {
  const rows = await query('SELECT * FROM comments WHERE post_id = ? AND is_deleted = 0 ORDER BY id', [postId]);
  return rows.map(toComment);
}

export async function createPost(d) {
  const id = await nextId('posts', 'POST');
  await query('INSERT INTO posts (id, user_id, title, body) VALUES (?,?,?,?)',
    [id, d.userId, d.title, d.body]);
  return getPostById(id);
}

// Partial update — only the changed fields.
export async function updatePost(id, d) {
  const exists = await getPostById(id);
  if (!exists) return null;
  const fields = [], values = [];
  if (d.title !== undefined) { fields.push('title = ?'); values.push(d.title); }
  if (d.body !== undefined)  { fields.push('body = ?');  values.push(d.body); }
  if (!fields.length) return getPostById(id);
  values.push(id);
  await query(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, values);
  return getPostById(id);
}

export async function deletePost(id) {
  // One transaction: soft-delete the post's comments first, then the post.
  return withTransaction(async (conn) => {
    const [post] = await conn.execute('UPDATE posts SET is_deleted = 1 WHERE id = ? AND is_deleted = 0', [id]);
    if (post.affectedRows) await conn.execute('UPDATE comments SET is_deleted = 1 WHERE post_id = ?', [id]);
    return post.affectedRows > 0;
  });
}

// Ownership check: true = owner, false = not owner, null = not found.
export async function ownsPost(id, userId) {
  const rows = await query('SELECT user_id FROM posts WHERE id = ? AND is_deleted = 0', [id]);
  if (!rows.length) return null;
  return rows[0].user_id === userId;
}
