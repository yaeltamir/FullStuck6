// Users routes — mounted at /users.
import * as q from '../queries.js';
import { resource } from './resource.js';
import { requireAdmin } from '../middleware/auth.js';

const users = resource({
  list: q.getUsers, getById: q.getUserById, create: q.createUser,
  update: q.updateUser, remove: q.deleteUser, owns: q.ownsUserAccount,
});

// Is a username taken? (so register never downloads the whole user list)
users.get('/check-username/:username', async (req, res, next) => {
  try {
    const found = await q.getUsers({ username: req.params.username });
    res.json({ exists: found.length > 0 });
  } catch (e) { next(e); }
});

// posts are public; todos/albums are private -> only the user themselves
users.get('/:id/todos',  async (req, res, next) => { try { if (req.userId !== req.params.id) return res.status(403).json({ error: 'Forbidden' }); res.json(await q.getTodos({ userId: req.params.id })); } catch (e) { next(e); } });
users.get('/:id/posts',  async (req, res, next) => { try { res.json(await q.getPosts({ userId: req.params.id })); } catch (e) { next(e); } });
users.get('/:id/albums', async (req, res, next) => { try { if (req.userId !== req.params.id) return res.status(403).json({ error: 'Forbidden' }); res.json(await q.getAlbums({ userId: req.params.id })); } catch (e) { next(e); } });

// Change own password — only the user themselves.
users.put('/:id/password', async (req, res, next) => {
  try {
    if (req.userId !== req.params.id)
      return res.status(403).json({ error: 'You can only change your own password' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    if (newPassword.trim().length < 4)
      return res.status(400).json({ error: 'new password is too short' });
    const ok = await q.changePassword(req.params.id, currentPassword, newPassword);
    return ok ? res.json({ ok: true })
              : res.status(401).json({ error: 'Current password is incorrect' });
  } catch (e) { next(e); }
});

// Block / unblock a user — admin only (requireAdmin middleware).
users.put('/:id/block', requireAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.userId)
      return res.status(403).json({ error: 'You cannot block yourself' });
    if (await q.isAdmin(req.params.id))
      return res.status(403).json({ error: 'Cannot block an admin' });
    const ok = await q.setBlocked(req.params.id, !!req.body.isBlocked);
    return ok ? res.json({ ok: true, isBlocked: !!req.body.isBlocked })
              : res.status(404).json({});
  } catch (e) { next(e); }
});

export default users;
