// ============================================================
//  Dedicated DB functions – one named function per operation.
//  Routes call these; nothing else touches SQL directly.
//
//  SOFT DELETE: reads ignore is_deleted=1 rows (list reads via
//  buildFilter, single/nested reads explicitly). deleteX() sets
//  is_deleted=1 instead of removing the row.
// ============================================================
import bcrypt from 'bcryptjs';
import { query, nextId, buildFilter, withTransaction, pageClause } from './db.js';
import { toUser, toUserPrivate, toPost, toComment, toTodo, toAlbum, toPhoto } from './mappers.js';

// ---------- USERS (no password ever returned) ----------
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
// export async function updateUser(id, d) {
//   const cur = (await query('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [id]))[0];
//   if (!cur) return null;
//   await query('UPDATE users SET username=?, name=?, email=?, phone=?, website=? WHERE id=?',
//     [d.username ?? cur.username, d.name ?? cur.name, d.email ?? cur.email,
//      d.phone ?? cur.phone, d.website ?? cur.website, id]);
//   return getUserById(id);
// }
export async function updateUser(id, d) {

  const exists = await getUserById(id);

  if (!exists) return null;

  const fields = [];
  const values = [];

  if (d.username !== undefined) {
    fields.push('username = ?');
    values.push(d.username);
  }

  if (d.name !== undefined) {
    fields.push('name = ?');
    values.push(d.name);
  }

  if (d.email !== undefined) {
    fields.push('email = ?');
    values.push(d.email);
  }

  if (d.phone !== undefined) {
    fields.push('phone = ?');
    values.push(d.phone);
  }

  if (d.website !== undefined) {
    fields.push('website = ?');
    values.push(d.website);
  }

  if (!fields.length) {
    return getUserById(id);
  }

  values.push(id);

  await query(
    `
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = ?
    `,
    values
  );

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

// ---------- POSTS ----------
export async function getPosts(filters = {}) {
  const { where, values } = buildFilter(filters, { userId: 'user_id', id: 'id' });
  const rows = await query(
  `
  SELECT
    p.*,
    u.name AS owner_name
  FROM posts p
  JOIN users u
    ON p.user_id = u.id
  ${where.replace("is_deleted", "p.is_deleted")}
  ORDER BY p.id
  ${pageClause(filters, 10)}
  `,
  values
  );
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
// export async function updatePost(id, d) {
//   const cur = (await query('SELECT * FROM posts WHERE id = ? AND is_deleted = 0', [id]))[0];
//   if (!cur) return null;
//   await query('UPDATE posts SET user_id=?, title=?, body=? WHERE id=?',
//     [d.userId ?? cur.user_id, d.title ?? cur.title, d.body ?? cur.body, id]);
//   return getPostById(id);
// }
export async function updatePost(id, d) {

  const fields = [];
  const values = [];

  if (d.title !== undefined) {
    fields.push('title = ?');
    values.push(d.title);
  }

  if (d.body !== undefined) {
    fields.push('body = ?');
    values.push(d.body);
  }

  if (!fields.length) {
    return getPostById(id);
  }

  values.push(id);

  await query(
    `
    UPDATE posts
    SET ${fields.join(', ')}
    WHERE id = ?
    `,
    values
  );

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

// ---------- COMMENTS ----------
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
// export async function updateComment(id, d) {
//   const cur = (await query('SELECT * FROM comments WHERE id = ? AND is_deleted = 0', [id]))[0];
//   if (!cur) return null;
//   await query('UPDATE comments SET post_id=?, user_id=?, name=?, email=?, body=? WHERE id=?',
//     [d.postId ?? cur.post_id, d.userId ?? cur.user_id, d.name ?? cur.name,
//      d.email ?? cur.email, d.body ?? cur.body, id]);
//   return getCommentById(id);
// }
export async function updateComment(id, d) {

  const exists = await getCommentById(id);

  if (!exists) return null;

  const fields = [];
  const values = [];

  if (d.postId !== undefined) {
    fields.push('post_id = ?');
    values.push(d.postId);
  }

  if (d.userId !== undefined) {
    fields.push('user_id = ?');
    values.push(d.userId);
  }

  if (d.name !== undefined) {
    fields.push('name = ?');
    values.push(d.name);
  }

  if (d.email !== undefined) {
    fields.push('email = ?');
    values.push(d.email);
  }

  if (d.body !== undefined) {
    fields.push('body = ?');
    values.push(d.body);
  }

  if (!fields.length) {
    return getCommentById(id);
  }

  values.push(id);

  await query(
    `
    UPDATE comments
    SET ${fields.join(', ')}
    WHERE id = ?
    `,
    values
  );

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
  const rows = await query(`SELECT * FROM todos ${where} ORDER BY id` + pageClause(filters), values);
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
// export async function updateTodo(id, d) {
//   const cur = (await query('SELECT * FROM todos WHERE id = ? AND is_deleted = 0', [id]))[0];
//   if (!cur) return null;
//   const completed = d.completed !== undefined ? (d.completed ? 1 : 0) : cur.completed;
//   await query('UPDATE todos SET user_id=?, title=?, completed=? WHERE id=?',
//     [d.userId ?? cur.user_id, d.title ?? cur.title, completed, id]);
//   return getTodoById(id);
// }
export async function updateTodo(id, d) {

  const exists = await getTodoById(id);

  if (!exists) return null;

  const fields = [];
  const values = [];

  if (d.userId !== undefined) {
    fields.push('user_id = ?');
    values.push(d.userId);
  }

  if (d.title !== undefined) {
    fields.push('title = ?');
    values.push(d.title);
  }

  if (d.completed !== undefined) {
    fields.push('completed = ?');
    values.push(d.completed ? 1 : 0);
  }

  if (!fields.length) {
    return getTodoById(id);
  }

  values.push(id);

  await query(
    `
    UPDATE todos
    SET ${fields.join(', ')}
    WHERE id = ?
    `,
    values
  );

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
  const rows = await query(`SELECT * FROM albums ${where} ORDER BY id` + pageClause(filters), values);
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
  const exists = await getAlbumById(id);
  if (!exists) return null;
  const fields = [], values = [];
  if (d.title !== undefined) { fields.push('title = ?'); values.push(d.title); }
  if (!fields.length) return getAlbumById(id);
  values.push(id);
  await query(`UPDATE albums SET ${fields.join(', ')} WHERE id = ?`, values);
  return getAlbumById(id);
}
export async function deleteAlbum(id) {
  // One transaction: soft-delete the album's photos first, then the album.
  return withTransaction(async (conn) => {
    const [album] = await conn.execute('UPDATE albums SET is_deleted = 1 WHERE id = ? AND is_deleted = 0', [id]);
    if (album.affectedRows) await conn.execute('UPDATE photos SET is_deleted = 1 WHERE album_id = ?', [id]);
    return album.affectedRows > 0;
  });
}
export async function ownsAlbum(id, userId) {
  const rows = await query('SELECT user_id FROM albums WHERE id = ? AND is_deleted = 0', [id]);
  if (!rows.length) return null;
  return rows[0].user_id === userId;
}

// ---------- PHOTOS ----------
export async function getPhotos(filters = {}) {
  const clauses = ['p.is_deleted = 0'];
  const values = [];
  if (filters.albumId) { clauses.push('p.album_id = ?'); values.push(filters.albumId); }
  if (filters.id)      { clauses.push('p.id = ?');       values.push(filters.id); }
  if (filters.userId)  { clauses.push('a.user_id = ?');  values.push(filters.userId); }   // only my photos
  const rows = await query(
    `SELECT p.* FROM photos p JOIN albums a ON a.id = p.album_id
     WHERE ${clauses.join(' AND ')} ORDER BY p.id` + pageClause(filters, 8), values);
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
  const exists = await getPhotoById(id);
  if (!exists) return null;
  const fields = [], values = [];
  if (d.title !== undefined)        { fields.push('title = ?');         values.push(d.title); }
  if (d.url !== undefined)          { fields.push('url = ?');           values.push(d.url); }
  if (d.thumbnailUrl !== undefined) { fields.push('thumbnail_url = ?'); values.push(d.thumbnailUrl); }
  if (!fields.length) return getPhotoById(id);
  values.push(id);
  await query(`UPDATE photos SET ${fields.join(', ')} WHERE id = ?`, values);
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
