import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { body, param, validationResult } from 'express-validator';

import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { logActivity } from '../lib/activity.js';
import { isConfigured as mailerConfigured, sendMail } from '../lib/mailer.js';
import { requireAuth } from '../middleware/auth.js';

const MAX_DOGS_PER_USER = 5;

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again shortly.' },
});

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input', details: errors.array() });
  }
  next();
};

const rounds = () => Number(process.env.BCRYPT_ROUNDS || 12);

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post(
  '/register',
  authLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8, max: 128 }),
  body('name').optional().isString().trim().isLength({ max: 120 }),
  body('phone').optional().isString().trim().isLength({ max: 40 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const { email, password, name, phone } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

      const defaultRole = await prisma.role.findUnique({ where: { name: 'user' } });
      const passwordHash = await bcrypt.hash(password, rounds());

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: name || null,
          phone: phone || null,
          roleId: defaultRole?.id ?? null,
        },
        select: { id: true, email: true, name: true, phone: true, roleId: true, createdAt: true },
      });

      const token = signToken({ sub: user.id, kind: 'user', email: user.email, roleId: user.roleId });

      await logActivity({
        userId: user.id,
        action: 'auth.register',
        entityType: 'user',
        entityId: user.id,
        ipAddress: req.ip,
      });

      res.status(201).json({ token, user: { ...user, kind: 'user' } });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1, max: 128 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Try admin first, then regular user. Same generic error to avoid leaking which exists.
      const admin = await prisma.adminUser.findUnique({ where: { email } });
      if (admin && admin.isActive) {
        const ok = await bcrypt.compare(password, admin.passwordHash);
        if (ok) {
          await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
          const token = signToken({ sub: admin.id, kind: 'admin', email: admin.email, roleId: admin.roleId });
          await logActivity({ adminId: admin.id, action: 'auth.login', ipAddress: req.ip });
          return res.json({
            token,
            user: { id: admin.id, email: admin.email, name: admin.name, roleId: admin.roleId, kind: 'admin' },
          });
        }
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (user && user.isActive) {
        if (user.isBanned) {
          return res.status(403).json({ error: 'This account has been banned. Contact support.' });
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (ok) {
          const token = signToken({ sub: user.id, kind: 'user', email: user.email, roleId: user.roleId });
          await logActivity({ userId: user.id, action: 'auth.login', ipAddress: req.ip });
          return res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, surname: user.surname, roleId: user.roleId, kind: 'user' },
          });
        }
      }

      return res.status(401).json({ error: 'Invalid email or password.' });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { sub, kind } = req.auth;
    if (kind === 'admin') {
      const admin = await prisma.adminUser.findUnique({
        where: { id: sub },
        select: { id: true, email: true, name: true, roleId: true, lastLoginAt: true, role: { select: { name: true } } },
      });
      if (!admin) return res.status(404).json({ error: 'Account not found' });
      return res.json({ user: { ...admin, kind: 'admin' } });
    }
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: {
        id: true, email: true, name: true, surname: true, phone: true,
        isBanned: true, roleId: true, role: { select: { name: true } },
        dogs: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, breed: true, birthDate: true, sex: true, isSterilized: true, notes: true, createdAt: true },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'Account not found' });
    res.json({ user: { ...user, kind: 'user' } });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
// JWTs are stateless; client just drops the token. Logged for activity trail.
router.post('/logout', requireAuth, async (req, res) => {
  await logActivity({
    userId: req.auth.kind === 'user' ? req.auth.sub : undefined,
    adminId: req.auth.kind === 'admin' ? req.auth.sub : undefined,
    action: 'auth.logout',
    ipAddress: req.ip,
  });
  res.json({ ok: true });
});

// ── User profile (self-service) ───────────────────────────────────────────────
function requireUserKind(req, res, next) {
  if (req.auth.kind !== 'user') return res.status(403).json({ error: 'User account required.' });
  next();
}

// PATCH /api/auth/me — update own name / surname / phone
router.patch('/me',
  requireAuth, requireUserKind,
  body('name').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('surname').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('phone').optional({ nullable: true }).isString().trim().isLength({ max: 40 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const data = {};
      if ('name' in req.body) data.name = req.body.name || null;
      if ('surname' in req.body) data.surname = req.body.surname || null;
      if ('phone' in req.body) data.phone = req.body.phone || null;

      const user = await prisma.user.update({
        where: { id: req.auth.sub },
        data,
        select: { id: true, email: true, name: true, surname: true, phone: true },
      });
      await logActivity({ userId: user.id, action: 'user.profile.update', entityType: 'user', entityId: user.id, ipAddress: req.ip });
      res.json({ user });
    } catch (err) { next(err); }
  },
);

// ── User dogs (self-service) ──────────────────────────────────────────────────
const DOG_SELECT = {
  id: true, name: true, breed: true, birthDate: true,
  sex: true, isSterilized: true, notes: true, createdAt: true,
};

// Coerce values from API → DB. 'male'|'female'|null for sex, true|false|null for sterilized.
function pickDogFields(body) {
  const out = {};
  if ('name' in body) out.name = (body.name || '').trim();
  if ('breed' in body) out.breed = body.breed || null;
  if ('birthDate' in body) out.birthDate = body.birthDate ? new Date(body.birthDate) : null;
  if ('sex' in body) {
    const v = body.sex == null ? null : String(body.sex).toLowerCase();
    out.sex = (v === 'male' || v === 'female') ? v : null;
  }
  if ('isSterilized' in body) {
    out.isSterilized = body.isSterilized === true || body.isSterilized === false ? body.isSterilized : null;
  }
  if ('notes' in body) out.notes = body.notes || null;
  return out;
}

// GET /api/auth/me/dogs — list own active dogs
router.get('/me/dogs', requireAuth, requireUserKind, async (req, res, next) => {
  try {
    const dogs = await prisma.dog.findMany({
      where: { userId: req.auth.sub, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: DOG_SELECT,
    });
    res.json({ dogs, maxAllowed: MAX_DOGS_PER_USER });
  } catch (err) { next(err); }
});

// POST /api/auth/me/dogs — add a dog (max MAX_DOGS_PER_USER active)
router.post('/me/dogs',
  requireAuth, requireUserKind,
  body('name').isString().trim().isLength({ min: 1, max: 80 }),
  body('breed').optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
  body('birthDate').optional({ nullable: true }).isISO8601(),
  body('sex').optional({ nullable: true }).isIn(['male', 'female']),
  body('isSterilized').optional({ nullable: true }).isBoolean(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const activeCount = await prisma.dog.count({ where: { userId: req.auth.sub, isActive: true } });
      if (activeCount >= MAX_DOGS_PER_USER) {
        return res.status(400).json({ error: `You can have at most ${MAX_DOGS_PER_USER} dogs on file. Remove one before adding another.` });
      }
      const data = pickDogFields(req.body);
      data.userId = req.auth.sub;
      const dog = await prisma.dog.create({ data, select: DOG_SELECT });
      await logActivity({ userId: req.auth.sub, action: 'dog.create', entityType: 'dog', entityId: dog.id, ipAddress: req.ip });
      res.status(201).json({ dog });
    } catch (err) { next(err); }
  },
);

// PATCH /api/auth/me/dogs/:id — update a dog
router.patch('/me/dogs/:id',
  requireAuth, requireUserKind,
  param('id').isInt(),
  body('name').optional().isString().trim().isLength({ min: 1, max: 80 }),
  body('breed').optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
  body('birthDate').optional({ nullable: true }).isISO8601(),
  body('sex').optional({ nullable: true }).isIn(['male', 'female']),
  body('isSterilized').optional({ nullable: true }).isBoolean(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await prisma.dog.findFirst({ where: { id, userId: req.auth.sub, isActive: true } });
      if (!existing) return res.status(404).json({ error: 'Dog not found.' });

      const data = pickDogFields(req.body);
      const dog = await prisma.dog.update({ where: { id }, data, select: DOG_SELECT });
      await logActivity({ userId: req.auth.sub, action: 'dog.update', entityType: 'dog', entityId: dog.id, ipAddress: req.ip });
      res.json({ dog });
    } catch (err) { next(err); }
  },
);

// DELETE /api/auth/me/dogs/:id — soft delete; reason required
router.delete('/me/dogs/:id',
  requireAuth, requireUserKind,
  param('id').isInt(),
  body('removalReason').isString().trim().isLength({ min: 3, max: 500 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await prisma.dog.findFirst({ where: { id, userId: req.auth.sub, isActive: true } });
      if (!existing) return res.status(404).json({ error: 'Dog not found.' });

      await prisma.dog.update({
        where: { id },
        data: {
          isActive: false,
          removedAt: new Date(),
          removalReason: req.body.removalReason.trim(),
        },
      });
      await logActivity({
        userId: req.auth.sub,
        action: 'dog.remove',
        entityType: 'dog',
        entityId: id,
        metadata: { removalReason: req.body.removalReason.trim() },
        ipAddress: req.ip,
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  },
);

// ── Password reset ───────────────────────────────────────────────────────────
// Two-step flow:
//   1. POST /api/auth/forgot-password { email } → generate token, store hash,
//      return success regardless of whether the email exists (avoid leaking).
//      In dev (NODE_ENV !== 'production') the raw token is logged so you can
//      paste it into the reset page without setting up SMTP.
//   2. POST /api/auth/reset-password  { token, password } → verify and update.

const TOKEN_TTL_MIN = 60;

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

router.post('/forgot-password',
  authLimiter,
  body('email').isEmail().normalizeEmail(),
  handleValidation,
  async (req, res, next) => {
    try {
      const { email } = req.body;

      // Look in both tables; admins may also reset.
      const admin = await prisma.adminUser.findUnique({ where: { email } });
      const user  = admin ? null : await prisma.user.findUnique({ where: { email } });
      const subject = admin || user;

      // Always respond OK to avoid enumerating accounts.
      if (!subject) {
        return res.json({ ok: true });
      }

      const userKind = admin ? 'admin' : 'user';
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60_000);

      await prisma.passwordResetToken.create({
        data: { userKind, subjectId: subject.id, tokenHash, expiresAt },
      });

      const resetUrl = `${process.env.RESET_URL_BASE || ''}/reset-password?token=${rawToken}`;

      // Send the reset email when SMTP is configured. Otherwise fall back to
      // logging the link so dev/local setups still work.
      let emailSent = false;
      let mailError = null;
      if (mailerConfigured()) {
        const niceName = subject.name || 'there';
        try {
          const info = await sendMail({
            to: email,
            subject: 'Reset your Pawsome 4 Pets password',
            text:
`Hi ${niceName},

Someone (hopefully you) asked to reset the password for your Pawsome 4 Pets account.

Open this link to choose a new password — it expires in ${TOKEN_TTL_MIN} minutes:
${resetUrl}

If you didn't request this, you can safely ignore this email.

— Pawsome 4 Pets`,
            html:
`<p>Hi ${niceName},</p>
<p>Someone (hopefully you) asked to reset the password for your Pawsome 4 Pets account.</p>
<p><a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background:#e26d5c;color:#fff;border-radius:999px;text-decoration:none;font-weight:600">Choose a new password</a></p>
<p>This link expires in ${TOKEN_TTL_MIN} minutes. If you didn't request this, you can safely ignore the email.</p>
<p style="color:#888;font-size:12px">If the button doesn't work, copy this URL into your browser:<br><span style="font-family:monospace">${resetUrl}</span></p>`,
          });
          emailSent = true;
          console.log('[forgot-password] sent', { to: email, messageId: info?.messageId, response: info?.response });
        } catch (mailErr) {
          mailError = mailErr.message || String(mailErr);
          console.error('[forgot-password] sendMail failed:', mailError, mailErr.stack);
        }
      } else if (process.env.NODE_ENV !== 'production') {
        console.log(`[forgot-password] ${userKind} ${email} → ${resetUrl}`);
      } else {
        console.warn('[forgot-password] mailer not configured', {
          host: !!process.env.SMTP_HOST,
          user: !!process.env.SMTP_USER,
          pass: !!process.env.SMTP_PASS,
        });
      }

      await logActivity({
        userId: userKind === 'user' ? subject.id : undefined,
        adminId: userKind === 'admin' ? subject.id : undefined,
        action: 'auth.forgotPassword',
        metadata: {
          emailSent,
          mailerConfigured: mailerConfigured(),
          ...(mailError ? { mailError } : {}),
          envHost: process.env.SMTP_HOST ? process.env.SMTP_HOST : '<missing>',
          envUser: process.env.SMTP_USER ? process.env.SMTP_USER : '<missing>',
        },
        ipAddress: req.ip,
      });

      // Dev convenience: return the raw URL only when no real email was sent
      // (i.e. SMTP is unconfigured) AND we're not in production.
      const devResetUrl = (!emailSent && process.env.NODE_ENV !== 'production') ? resetUrl : undefined;
      res.json({ ok: true, devResetUrl });
    } catch (err) { next(err); }
  },
);

router.post('/reset-password',
  authLimiter,
  body('token').isString().isLength({ min: 32, max: 128 }),
  body('password').isString().isLength({ min: 8, max: 128 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const tokenHash = hashToken(req.body.token);
      const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!record || record.usedAt || record.expiresAt < new Date()) {
        return res.status(400).json({ error: 'This reset link has expired. Request a new one.' });
      }

      const passwordHash = await bcrypt.hash(req.body.password, rounds());
      if (record.userKind === 'admin') {
        await prisma.adminUser.update({ where: { id: record.subjectId }, data: { passwordHash } });
      } else {
        await prisma.user.update({ where: { id: record.subjectId }, data: { passwordHash } });
      }
      await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

      await logActivity({
        userId: record.userKind === 'user' ? record.subjectId : undefined,
        adminId: record.userKind === 'admin' ? record.subjectId : undefined,
        action: 'auth.resetPassword',
        ipAddress: req.ip,
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  },
);

export default router;
