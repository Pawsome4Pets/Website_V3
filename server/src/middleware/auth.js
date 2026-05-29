import { verifyToken } from '../lib/jwt.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = verifyToken(token);
    req.auth = payload; // { sub, kind: 'user'|'admin', email, roleId }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.kind !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
