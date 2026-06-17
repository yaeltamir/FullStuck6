// PHOTOS — DB functions.
import { query, nextId, pageClause } from '../db.js';
import { toPhoto } from '../mappers.js';

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
