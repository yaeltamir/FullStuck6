// Authentication middleware (JWT). The token proves WHO the user is; the server
// re-reads permissions (role / blocked / existence) from the DB on every request.
import jwt from 'jsonwebtoken';
import * as q from '../queries.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Create a signed token that carries ONLY the user id (sub) — no role, no name.
export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '2h' });
}

// Verify the JWT signature, then RE-READ the user from the DB (existence +
// not blocked + role). Sets req.userId / req.userRole. Never trusts the client.
export async function authMiddleware(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  req.userId = null;
  req.userRole = null;
  if (token) {
    try {
      const { sub } = jwt.verify(token, JWT_SECRET);
      const user = await q.getAuthUser(sub);   // fresh from DB
      if (user) { req.userId = user.id; req.userRole = user.role; }
    } catch { /* invalid/expired token -> stays unauthenticated */ }
  }
  next();
}

// Guard for admin-only routes (role came fresh from the DB above).
export function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}
