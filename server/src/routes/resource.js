// Generic REST router for a resource: GET / , GET /:id , POST / , PUT /:id , DELETE /:id
//   owns      -> PUT/DELETE allowed only for the item's owner (otherwise 403)
//   isPrivate -> GET returns ONLY the owner's items; creating requires a token
import { Router } from 'express';
import { isValidEmail } from '../validators.js';

export function resource({ list, getById, create, update, remove, owns, isPrivate }) {
  const r = Router();

  // Ownership guard for PUT/DELETE. Returns true if the request may proceed.
  async function allowed(req, res) {
    if (!owns) return true;
    const result = await owns(req.params.id, req.userId);
    if (result === null) { res.status(404).json({}); return false; }
    if (!result) { res.status(403).json({ error: 'You can only modify your own items' }); return false; }
    return true;
  }

  r.get('/', async (req, res, next) => {
    try {
      const filters = { ...req.query };
      if (isPrivate) {                       // private lists return ONLY the owner's items
        if (!req.userId) return res.status(401).json({ error: 'Login required' });
        filters.userId = req.userId;         // ignore any userId from the client
      }
      res.json(await list(filters));
    } catch (e) { next(e); }
  });

  r.get('/:id', async (req, res, next) => {
    try {
      if (isPrivate && owns) {               // a single private item only for its owner
        const ok = await owns(req.params.id, req.userId);
        if (ok === null) return res.status(404).json({});
        if (!ok) return res.status(403).json({ error: 'Forbidden' });
      }
      const x = await getById(req.params.id); x ? res.json(x) : res.status(404).json({});
    } catch (e) { next(e); }
  });

  r.post('/', async (req, res, next) => {
    try {
      // creating an owned/private item requires a valid token (clean 401, not a 500)
      if ((isPrivate || owns) && !req.userId)
        return res.status(401).json({ error: 'Login required' });

      if (req.baseUrl === '/todos') {
        const { title } = req.body;
        if (typeof title !== 'string' || !title.trim())
          return res.status(400).json({ error: 'title is required' });
      }
      if (req.baseUrl === '/posts') {
        const { title, body } = req.body;
        if (typeof title !== 'string' || !title.trim())
          return res.status(400).json({ error: 'title is required' });
        if (typeof body !== 'string' || !body.trim())
          return res.status(400).json({ error: 'body is required' });
      }
      if (req.baseUrl === '/comments') {
        const { body } = req.body;
        if (typeof body !== 'string' || !body.trim())
          return res.status(400).json({ error: 'body is required' });
      }
      // the creator is the authenticated user — never trust a userId from the body
      res.status(201).json(await create({ ...req.body, userId: req.userId ?? req.body.userId }));
    } catch (e) { next(e); }
  });

  // PUT/DELETE return only a status — the change was made, no need to echo the object.
  r.put('/:id', async (req, res, next) => {
    try {
      if (!(await allowed(req, res))) return;
      if (req.baseUrl === '/users') {
        const { name, email, phone } = req.body;
        if (email !== undefined && !isValidEmail(email)) return res.status(400).json({ error: 'invalid email' });
        if (name !== undefined && name.length > 50)      return res.status(400).json({ error: 'name too long' });
        if (email !== undefined && email.length > 100)   return res.status(400).json({ error: 'email too long' });
        if (phone !== undefined && phone.length > 20)    return res.status(400).json({ error: 'phone too long' });
      }
      if (req.baseUrl === '/todos') {
        const { title } = req.body;
        if (title !== undefined && !title.trim()) return res.status(400).json({ error: 'title is required' });
      }
      if (req.baseUrl === '/posts') {
        const { title, body } = req.body;
        if (title !== undefined && !title.trim()) return res.status(400).json({ error: 'title is required' });
        if (body !== undefined && !body.trim())   return res.status(400).json({ error: 'body is required' });
      }
      if (req.baseUrl === '/comments') {
        const { body } = req.body;
        if (body !== undefined && !body.trim()) return res.status(400).json({ error: 'body is required' });
      }
      const x = await update(req.params.id, req.body);
      x ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
    } catch (e) { next(e); }
  });

  r.delete('/:id', async (req, res, next) => {
    try {
      if (!(await allowed(req, res))) return;
      const ok = await remove(req.params.id);
      ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
    } catch (e) { next(e); }
  });

  return r;
}
