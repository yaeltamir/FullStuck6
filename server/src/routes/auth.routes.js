// Auth routes — mounted at /auth (so /auth/login, /auth/register).
import { Router } from 'express';
import * as q from '../queries.js';
import { signToken } from '../middleware/auth.js';
import { isValidEmail, isValidUsername } from '../validators.js';

const router = Router();

// POST /auth/login — verify credentials server-side, return a signed JWT + profile.
router.post('/login', async (req, res, next) => {
  try {
    const username = req.body.username?.trim();
    const password = req.body.password?.trim();

    if (!username || !password) return res.status(400).json({ error: 'username and password are required' });
    if (username.includes(' '))  return res.status(400).json({ error: 'username cannot contain spaces' });
    if (username.length < 3)     return res.status(400).json({ error: 'username is too short' });
    if (password.length < 4)     return res.status(400).json({ error: 'password is too short' });

    const r = await q.verifyLogin(username, password);
    if (r.status === 'blocked') return res.status(403).json({ error: 'This account is blocked' });
    // IDENTICAL message for "wrong password" and "no such user" -> no user enumeration
    if (r.status !== 'ok')      return res.status(401).json({ error: 'Invalid username or password' });

    res.json({ token: signToken(r.user.id), user: r.user });
  } catch (e) { next(e); }
});

// POST /auth/register — the server checks for a duplicate username (no client download).
router.post('/register', async (req, res, next) => {
  try {
    const username = req.body.username?.trim();
    const password = req.body.password?.trim();
    const name = req.body.name?.trim();
    const email = req.body.email?.trim();
    const phone = req.body.phone?.trim();

    if (!username || !password || !name || !email)
      return res.status(400).json({ error: 'username, password, name and email are required' });
    if (!isValidUsername(username)) return res.status(400).json({ error: 'invalid username' });
    if (!isValidEmail(email))       return res.status(400).json({ error: 'invalid email' });
    if (password.length < 4)        return res.status(400).json({ error: 'password must be at least 4 characters' });
    if (name.length > 50)           return res.status(400).json({ error: 'name too long' });
    if (phone && phone.length > 20) return res.status(400).json({ error: 'phone too long' });

    const existing = await q.getUsers({ username });
    if (existing.length) return res.status(409).json({ error: 'Username already exists' });

    const user = await q.createUser({ ...req.body, username, password, name, email, phone });
    res.status(201).json({ token: signToken(user.id), user });
  } catch (e) { next(e); }
});

export default router;
