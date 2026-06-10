// ============================================================
//  Dedicated DB functions – one named function per operation.
//  Routes call these; nothing else touches SQL directly.
//
//  SOFT DELETE: reads ignore is_deleted=1 rows (list reads via
//  buildFilter, single/nested reads explicitly). deleteX() sets
//  is_deleted=1 instead of removing the row.
// ============================================================
import { query, nextId, buildFilter } from './db.js';
import { toUser, toUserPrivate, toPost, toComment, toTodo, toAlbum, toPhoto } from './mappers.js';

// ---------- USERS (no password ever returned) ----------
export async function getUsers(filters = {}) {
  const { where, values } = buildFilter(filters, { username: 'username', id: 'id' });
  const rows = await query(`SELECT * FROM users ${where} ORDER BY id`, values);
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
  if (d.password) await query('INSERT INTO passwords (user_id, password) VALUES (?,?)', [id, d.password]);
  const rows = await query('SELECT * FROM users WHERE id = ?', [id]);
  return toUserPrivate(rows[0]);   // the new user gets their own (private) view
}
export async function updateUser(id, d) {
  const cur = (await query('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [id]))[0];
  if (!cur) return null;
  await query('UPDATE users SET username=?, name=?, email=?, phone=?, website=? WHERE id=?',
    [d.username ?? cur.username, d.name ?? cur.name, d.email ?? cur.email,
     d.phone ?? cur.phone, d.website ?? cur.website, id]);
  return getUserById(id);
}
export async function deleteUser(id) {
  const r = await query('UPDATE users SET is_deleted = 1 WHERE id = ? AND is_deleted = 0', [id]);
  return r.affectedRows > 0;
}

// ---- account operations (advanced) ----
// Is this user an admin?
export async function isAdmin(userId) {
  const rows = await query('SELECT role FROM users WHERE id = ? AND is_deleted = 0', [userId]);
  return rows.length > 0 && rows[0].role === 'admin';
}
// Change own password: only succeeds if the current password matches.
export async function changePassword(userId, currentPassword, newPassword) {
  const rows = await query('SELECT password FROM passwords WHERE user_id = ?', [userId]);
  if (!rows.length || rows[0].password !== currentPassword) return false;
  await query('UPDATE passwords SET password = ? WHERE user_id = ?', [newPassword, userId]);
  return true;
}
// Block / unblock a user (admin action).
export async function setBlocked(id, blocked) {
  const r = await query('UPDATE users SET is_blocked = ? WHERE id = ? AND is_deleted = 0',
    [blocked ? 1 : 0, id]);
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
  if (!creds.length || creds[0].password !== password) return { status: 'invalid' };
  return { status: 'ok', user: toUserPrivate(user) };   // your own (private) view
}

// ---------- POSTS ----------
export async function getPosts(filters = {}) {
  const { where, values } = buildFilter(filters, { userId: 'user_id', id: 'id' });
  const rows = await query(`SELECT * FROM posts ${where} ORDER BY id`, values);
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
export async function updatePost(id, d) {
  const cur = (await query('SELECT * FROM posts WHERE id = ? AND is_deleted = 0', [id]))[0];
  if (!cur) return null;
  await query('UPDATE posts SET user_id=?, title=?, body=? WHERE id=?',
    [d.userId ?? cur.user_id, d.title ?? cur.title, d.body ?? cur.body, id]);
  return getPostById(id);
}
export async function deletePost(id) {
  const r = await query('UPDATE posts SET is_deleted = 1 WHERE id = ? AND is_deleted = 0', [id]);
  // Cascade: when a post is (soft) deleted, its comments go with it.
  if (r.affectedRows) await query('UPDATE comments SET is_deleted = 1 WHERE post_id = ?', [id]);
  return r.affectedRows > 0;
}
// Ownership check: true = owner, false = not owner, null = not found.
export async function ownsPost(id, userId) {
  const rows = await query('SELECT user_id FROM posts WHERE id = ? AND is_deleted = 0', [id]);
  if (!rows.length) return null;
  return rows[0].user_id === userId;
}

// ---------- COMMENTS ----------
export async function getComments(filters = {}) {
  const { where, values } = buildFilter(filters, { postId: 'post_id', userId: 'user_id', id: 'id' });
  const rows = await query(`SELECT * FROM comments ${where} ORDER BY id`, values);
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
export async function updateComment(id, d) {
  const cur = (await query('SELECT * FROM comments WHERE id = ? AND is_deleted = 0', [id]))[0];
  if (!cur) return null;
  await query('UPDATE comments SET post_id=?, user_id=?, name=?, email=?, body=? WHERE id=?',
    [d.postId ?? cur.post_id, d.userId ?? cur.user_id, d.name ?? cur.name,
     d.email ?? cur.email, d.body ?? cur.body, id]);
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

// ---------- TODOS ----------
export async function getTodos(filters = {}) {
  const { where, values } = buildFilter(filters, { userId: 'user_id', completed: 'completed', id: 'id' });
  const rows = await query(`SELECT * FROM todos ${where} ORDER BY id`, values);
  return rows.map(toTodo);
}
export async function getTodoById(id) {
  const rows = await query('SELECT * FROM todos WHERE id = ? AND is_deleted = 0', [id]);
  return rows.length ? toTodo(rows[0]) : null;
}
export async function createTodo(d) {
  const id = await nextId('todos', 'TD');
  await query('INSERT INTO todos (id, user_id, title, completed) VALUES (?,?,?,?)',
    [id, d.userId, d.title, d.completed ? 1 : 0]);
  return getTodoById(id);
}
export async function updateTodo(id, d) {
  const cur = (await query('SELECT * FROM todos WHERE id = ? AND is_deleted = 0', [id]))[0];
  if (!cur) return null;
  const completed = d.completed !== undefined ? (d.completed ? 1 : 0) : cur.completed;
  await query('UPDATE todos SET user_id=?, title=?, completed=? WHERE id=?',
    [d.userId ?? cur.user_id, d.title ?? cur.title, completed, id]);
  return getTodoById(id);
}
export async function deleteTodo(id) {
  const r = await query('UPDATE todos SET is_deleted = 1 WHERE id = ? AND is_deleted = 0', [id]);
  return r.affectedRows > 0;
}
export async function ownsTodo(id, userId) {
  const rows = await query('SELECT user_id FROM todos WHERE id = ? AND is_deleted = 0', [id]);
  if (!rows.length) return null;
  return rows[0].user_id === userId;
}

// ---------- ALBUMS ----------
export async function getAlbums(filters = {}) {
  const { where, values } = buildFilter(filters, { userId: 'user_id', id: 'id' });
  const rows = await query(`SELECT * FROM albums ${where} ORDER BY id`, values);
  return rows.map(toAlbum);
}
export async function getAlbumById(id) {
  const rows = await query('SELECT * FROM albums WHERE id = ? AND is_deleted = 0', [id]);
  return rows.length ? toAlbum(rows[0]) : null;
}
export async function getAlbumPhotos(albumId) {
  const rows = await query('SELECT * FROM photos WHERE album_id = ? AND is_deleted = 0 ORDER BY id', [albumId]);
  return rows.map(toPhoto);
}
export async function createAlbum(d) {
  const id = await nextId('albums', 'ALB');
  await query('INSERT INTO albums (id, user_id, title) VALUES (?,?,?)', [id, d.userId, d.title]);
  return getAlbumById(id);
}
export async function updateAlbum(id, d) {
  const cur = (await query('SELECT * FROM albums WHERE id = ? AND is_deleted = 0', [id]))[0];
  if (!cur) return null;
  await query('UPDATE albums SET user_id=?, title=? WHERE id=?',
    [d.userId ?? cur.user_id, d.title ?? cur.title, id]);
  return getAlbumById(id);
}
export async function deleteAlbum(id) {
  const r = await query('UPDATE albums SET is_deleted = 1 WHERE id = ? AND is_deleted = 0', [id]);
  // Cascade: deleting an album (soft) deletes its photos too.
  if (r.affectedRows) await query('UPDATE photos SET is_deleted = 1 WHERE album_id = ?', [id]);
  return r.affectedRows > 0;
}
export async function ownsAlbum(id, userId) {
  const rows = await query('SELECT user_id FROM albums WHERE id = ? AND is_deleted = 0', [id]);
  if (!rows.length) return null;
  return rows[0].user_id === userId;
}

// ---------- PHOTOS ----------
export async function getPhotos(filters = {}) {
  const { where, values } = buildFilter(filters, { albumId: 'album_id', id: 'id' });
  const rows = await query(`SELECT * FROM photos ${where} ORDER BY id`, values);
  return rows.map(toPhoto);
}
export async function getPhotoById(id) {
  const rows = await query('SELECT * FROM photos WHERE id = ? AND is_deleted = 0', [id]);
  return rows.length ? toPhoto(rows[0]) : null;
}
export async function createPhoto(d) {
  const id = await nextId('photos', 'PH');
  await query('INSERT INTO photos (id, album_id, title, url, thumbnail_url) VALUES (?,?,?,?,?)',
    [id, d.albumId, d.title, d.url ?? null, d.thumbnailUrl ?? null]);
  return getPhotoById(id);
}
export async function updatePhoto(id, d) {
  const cur = (await query('SELECT * FROM photos WHERE id = ? AND is_deleted = 0', [id]))[0];
  if (!cur) return null;
  await query('UPDATE photos SET album_id=?, title=?, url=?, thumbnail_url=? WHERE id=?',
    [d.albumId ?? cur.album_id, d.title ?? cur.title, d.url ?? cur.url,
     d.thumbnailUrl ?? cur.thumbnail_url, id]);
  return getPhotoById(id);
}
export async function deletePhoto(id) {
  const r = await query('UPDATE photos SET is_deleted = 1 WHERE id = ? AND is_deleted = 0', [id]);
  return r.affectedRows > 0;
}
// A photo belongs to whoever owns its album.
export async function ownsPhoto(id, userId) {
  const rows = await query(
    `SELECT a.user_id FROM photos p JOIN albums a ON a.id = p.album_id
     WHERE p.id = ? AND p.is_deleted = 0`, [id]);
  if (!rows.length) return null;
  return rows[0].user_id === userId;
}
