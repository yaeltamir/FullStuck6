// Albums routes — mounted at /albums (private). Includes nested photos.
import * as q from '../queries.js';
import { resource } from './resource.js';

const albums = resource({
  list: q.getAlbums, getById: q.getAlbumById, create: q.createAlbum,
  update: q.updateAlbum, remove: q.deleteAlbum, owns: q.ownsAlbum, isPrivate: true,
});

// GET /albums/:id/photos — only the album's owner
albums.get('/:id/photos', async (req, res, next) => {
  try {
    const ok = await q.ownsAlbum(req.params.id, req.userId);
    if (ok === null) return res.status(404).json({});
    if (!ok) return res.status(403).json({ error: 'Forbidden' });
    res.json(await q.getAlbumPhotos(req.params.id));
  } catch (e) { next(e); }
});

export default albums;
