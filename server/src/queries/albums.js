// ALBUMS — DB functions.
import { query, nextId, buildFilter, withTransaction, pageClause } from '../db.js';
import { toAlbum, toPhoto } from '../mappers.js';

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
