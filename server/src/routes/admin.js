import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';

import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logActivity } from '../lib/activity.js';
import { slugify } from '../lib/slug.js';
import { encodeJson, decodeField } from '../lib/json.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input', details: errors.array() });
  next();
};

// ── Dashboard stats ───────────────────────────────────────────────────────────
router.get('/stats', async (_req, res, next) => {
  try {
    const [users, admins, forms, submissions, since] = await Promise.all([
      prisma.user.count(),
      prisma.adminUser.count(),
      prisma.form.count(),
      prisma.formSubmission.count(),
      prisma.formSubmission.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const recentSubmissions = await prisma.formSubmission.findMany({
      take: 10,
      orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
      include: { form: { select: { title: true, slug: true } } },
    });

    res.json({
      counts: { users, admins, forms, submissions, submissionsLast7d: since },
      recentSubmissions,
    });
  } catch (err) { next(err); }
});

// ── Users ────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Math.max(Number(req.query.offset) || 0, 0);
    const [users, total, adminEmails] = await Promise.all([
      prisma.user.findMany({
        take, skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, phone: true, isActive: true,
          createdAt: true, role: { select: { name: true } },
        },
      }),
      prisma.user.count(),
      prisma.adminUser.findMany({ select: { email: true } }),
    ]);
    const adminSet = new Set(adminEmails.map((a) => a.email));
    res.json({
      users: users.map((u) => ({ ...u, isAdmin: adminSet.has(u.email) })),
      total,
    });
  } catch (err) { next(err); }
});

router.patch('/users/:id',
  param('id').isInt(),
  body('isActive').optional().isBoolean(),
  body('roleId').optional({ nullable: true }).isInt(),
  body('name').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('surname').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('phone').optional({ nullable: true }).isString().trim().isLength({ max: 40 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const allowed = ['isActive', 'roleId', 'name', 'surname', 'phone'];
      const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
      const user = await prisma.user.update({
        where: { id: Number(req.params.id) },
        data,
        select: { id: true, email: true, name: true, surname: true, phone: true, isActive: true, isBanned: true, roleId: true },
      });
      await logActivity({ adminId: req.auth.sub, action: 'user.update', entityType: 'user', entityId: user.id, ipAddress: req.ip });
      res.json({ user });
    } catch (err) { next(err); }
  },
);

// GET /admin/users/:id — full profile with dogs (active + removed)
router.get('/users/:id',
  param('id').isInt(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true, email: true, name: true, surname: true, phone: true,
          isActive: true, isBanned: true, banReason: true, createdAt: true,
          role: { select: { id: true, name: true } },
          dogs: {
            orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
            select: {
              id: true, name: true, breed: true, birthDate: true,
              sex: true, isSterilized: true, notes: true,
              isActive: true, removedAt: true, removalReason: true, createdAt: true,
            },
          },
        },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      const admin = await prisma.adminUser.findUnique({ where: { email: user.email }, select: { id: true } });
      res.json({ user: { ...user, isAdmin: !!admin } });
    } catch (err) { next(err); }
  },
);

// POST /admin/users/:id/ban — ban an account with reason
router.post('/users/:id/ban',
  param('id').isInt(),
  body('reason').isString().trim().isLength({ min: 3, max: 500 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const user = await prisma.user.update({
        where: { id: Number(req.params.id) },
        data: { isBanned: true, banReason: req.body.reason.trim(), isActive: false },
        select: { id: true, email: true, isBanned: true, banReason: true },
      });
      await logActivity({
        adminId: req.auth.sub, action: 'user.ban', entityType: 'user', entityId: user.id,
        metadata: { reason: req.body.reason.trim() }, ipAddress: req.ip,
      });
      res.json({ user });
    } catch (err) { next(err); }
  },
);

// POST /admin/users/:id/unban
router.post('/users/:id/unban',
  param('id').isInt(),
  handleValidation,
  async (req, res, next) => {
    try {
      const user = await prisma.user.update({
        where: { id: Number(req.params.id) },
        data: { isBanned: false, banReason: null, isActive: true },
        select: { id: true, email: true, isBanned: true },
      });
      await logActivity({ adminId: req.auth.sub, action: 'user.unban', entityType: 'user', entityId: user.id, ipAddress: req.ip });
      res.json({ user });
    } catch (err) { next(err); }
  },
);

// ── Admin: dog management (proxy of user's dogs) ─────────────────────────────
function pickAdminDogFields(body) {
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

// POST /admin/users/:id/dogs — admin adds a dog to a user (still capped at 5)
router.post('/users/:id/dogs',
  param('id').isInt(),
  body('name').isString().trim().isLength({ min: 1, max: 80 }),
  body('breed').optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
  body('birthDate').optional({ nullable: true }).isISO8601(),
  body('sex').optional({ nullable: true }).isIn(['male', 'female']),
  body('isSterilized').optional({ nullable: true }).isBoolean(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const userId = Number(req.params.id);
      const activeCount = await prisma.dog.count({ where: { userId, isActive: true } });
      if (activeCount >= 5) {
        return res.status(400).json({ error: 'This user already has 5 active dogs.' });
      }
      const data = pickAdminDogFields(req.body);
      data.userId = userId;
      const dog = await prisma.dog.create({ data });
      await logActivity({ adminId: req.auth.sub, action: 'dog.create.admin', entityType: 'dog', entityId: dog.id, ipAddress: req.ip });
      res.status(201).json({ dog });
    } catch (err) { next(err); }
  },
);

// PATCH /admin/dogs/:id — edit any dog
router.patch('/dogs/:id',
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
      const data = pickAdminDogFields(req.body);
      const dog = await prisma.dog.update({ where: { id }, data });
      await logActivity({ adminId: req.auth.sub, action: 'dog.update.admin', entityType: 'dog', entityId: dog.id, ipAddress: req.ip });
      res.json({ dog });
    } catch (err) { next(err); }
  },
);

// DELETE /admin/dogs/:id — soft-delete with reason
router.delete('/dogs/:id',
  param('id').isInt(),
  body('removalReason').isString().trim().isLength({ min: 3, max: 500 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const dog = await prisma.dog.update({
        where: { id },
        data: { isActive: false, removedAt: new Date(), removalReason: req.body.removalReason.trim() },
      });
      await logActivity({
        adminId: req.auth.sub, action: 'dog.remove.admin', entityType: 'dog', entityId: dog.id,
        metadata: { removalReason: req.body.removalReason.trim() }, ipAddress: req.ip,
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  },
);

// Promote a public user to admin — copies email+passwordHash into admin_users
// with the 'admin' role. Idempotent: if an admin with that email already exists,
// returns it unchanged.
router.post('/users/:id/promote',
  param('id').isInt(),
  handleValidation,
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(req.params.id) },
        select: { id: true, email: true, name: true, passwordHash: true },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const existing = await prisma.adminUser.findUnique({ where: { email: user.email } });
      if (existing) {
        return res.json({ admin: { id: existing.id, email: existing.email, name: existing.name }, alreadyAdmin: true });
      }

      const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
      const admin = await prisma.adminUser.create({
        data: {
          email: user.email,
          passwordHash: user.passwordHash,
          name: user.name,
          roleId: adminRole?.id ?? null,
        },
        select: { id: true, email: true, name: true },
      });
      await logActivity({
        adminId: req.auth.sub,
        action: 'user.promote',
        entityType: 'user',
        entityId: user.id,
        metadata: { newAdminId: admin.id, email: admin.email },
        ipAddress: req.ip,
      });
      res.status(201).json({ admin, alreadyAdmin: false });
    } catch (err) { next(err); }
  },
);

// ── Activity log ─────────────────────────────────────────────────────────────
router.get('/activity', async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const logs = await prisma.activityLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        admin: { select: { id: true, email: true, name: true } },
      },
    });
    res.json({ logs });
  } catch (err) { next(err); }
});

// DELETE /admin/activity — clear the whole activity log.
// Writes one final entry so the act of clearing isn't itself invisible.
router.delete('/activity', async (req, res, next) => {
  try {
    const { count } = await prisma.activityLog.deleteMany({});
    await logActivity({
      adminId: req.auth.sub,
      action: 'activity.clear',
      metadata: { cleared: count },
      ipAddress: req.ip,
    });
    res.json({ ok: true, cleared: count });
  } catch (err) { next(err); }
});

// ── Settings ─────────────────────────────────────────────────────────────────
router.get('/settings', async (_req, res, next) => {
  try {
    const all = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
    res.json({ settings: all });
  } catch (err) { next(err); }
});

router.put('/settings/:key',
  param('key').isString().isLength({ min: 1, max: 120 }),
  body('value').isString().isLength({ max: 10_000 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const setting = await prisma.setting.upsert({
        where: { key: req.params.key },
        update: { value: req.body.value },
        create: { key: req.params.key, value: req.body.value },
      });
      await logActivity({ adminId: req.auth.sub, action: 'settings.update', entityType: 'setting', metadata: { key: setting.key }, ipAddress: req.ip });
      res.json({ setting });
    } catch (err) { next(err); }
  },
);

// ── Roles & permissions (read-only for now) ──────────────────────────────────
router.get('/roles', async (_req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { id: 'asc' },
    });
    res.json({
      roles: roles.map((r) => ({
        id: r.id, name: r.name, description: r.description,
        permissions: r.permissions.map((rp) => rp.permission.key),
      })),
    });
  } catch (err) { next(err); }
});

// ── Forms CRUD ───────────────────────────────────────────────────────────────
router.get('/forms', async (_req, res, next) => {
  try {
    const forms = await prisma.form.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { fields: true, submissions: true } } },
    });
    res.json({ forms });
  } catch (err) { next(err); }
});

router.post('/forms',
  body('title').isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('slug').optional().isString().trim().isLength({ max: 200 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const baseSlug = slugify(req.body.slug || req.body.title);
      const slug = await uniqueSlug(baseSlug);
      const form = await prisma.form.create({
        data: {
          title: req.body.title,
          description: req.body.description ?? null,
          slug,
          createdById: req.auth.kind === 'admin' ? req.auth.sub : null,
        },
        include: { fields: true },
      });
      await logActivity({ adminId: req.auth.sub, action: 'form.create', entityType: 'form', entityId: form.id, ipAddress: req.ip });
      res.status(201).json({ form });
    } catch (err) { next(err); }
  },
);

router.get('/forms/:id',
  param('id').isInt(),
  handleValidation,
  async (req, res, next) => {
    try {
      const form = await prisma.form.findUnique({
        where: { id: Number(req.params.id) },
        include: {
          fields: {
            orderBy: { position: 'asc' },
            include: { conditions: true },
          },
          _count: { select: { submissions: true } },
        },
      });
      if (!form) return res.status(404).json({ error: 'Form not found' });
      form.fields = form.fields.map(decodeField);
      res.json({ form });
    } catch (err) { next(err); }
  },
);

router.put('/forms/:id',
  param('id').isInt(),
  body('title').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('successMessage').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('isPublished').optional().isBoolean(),
  body('createsAccount').optional().isBoolean(),
  body('slug').optional().isString().trim().isLength({ min: 1, max: 200 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const data = { ...req.body };
      if (data.slug) {
        data.slug = await uniqueSlug(slugify(data.slug), id);
      }
      const form = await prisma.form.update({ where: { id }, data });
      await logActivity({ adminId: req.auth.sub, action: 'form.update', entityType: 'form', entityId: form.id, ipAddress: req.ip });
      res.json({ form });
    } catch (err) { next(err); }
  },
);

router.delete('/forms/:id',
  param('id').isInt(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await prisma.form.delete({ where: { id } });
      await logActivity({ adminId: req.auth.sub, action: 'form.delete', entityType: 'form', entityId: id, ipAddress: req.ip });
      res.json({ ok: true });
    } catch (err) { next(err); }
  },
);

// ── Form fields (bulk save) ──────────────────────────────────────────────────
// Accepts the full ordered list of fields and reconciles. Simpler than per-field CRUD.
router.put('/forms/:id/fields',
  param('id').isInt(),
  body('fields').isArray(),
  handleValidation,
  async (req, res, next) => {
    try {
      const formId = Number(req.params.id);
      const incoming = req.body.fields;

      // Bulk-replace strategy.
      //
      // The old per-field update/create loop made 1 query PER field. For a
      // 172-field form running on Vercel-iad1 ↔ Afrihost-SA (≈250 ms RTT)
      // that's ~43 s — well past the 30 s function limit.
      //
      // New strategy:
      //   1. Wipe existing fields (conditions cascade-delete via FK).
      //   2. createMany() all new fields in ONE round trip.
      //   3. findMany() to get the new IDs back in position order.
      //   4. createMany() all conditions in ONE round trip.
      //
      // Total: 4–5 round trips regardless of how many fields the form has.
      // Trade-off: editing a single field still rewrites the whole list — fine
      // for our admin flow which always saves the whole form anyway.

      await prisma.formField.deleteMany({ where: { formId } });

      if (incoming.length) {
        const fieldsData = incoming.map((f, i) => ({
          formId,
          fieldKey: f.fieldKey || `field_${Date.now()}_${i}`,
          label: f.label || 'Untitled',
          type: f.type || 'text',
          placeholder: f.placeholder ?? null,
          helpText: f.helpText ?? null,
          isRequired: !!f.isRequired,
          position: i,
          options: encodeJson(f.options),
          validation: encodeJson(f.validation),
        }));
        await prisma.formField.createMany({ data: fieldsData });

        const inserted = await prisma.formField.findMany({
          where: { formId },
          orderBy: { position: 'asc' },
          select: { id: true, position: true },
        });

        const conditionsData = [];
        for (let i = 0; i < incoming.length; i++) {
          const f = incoming[i];
          const dbField = inserted[i];
          if (!dbField || !Array.isArray(f.conditions) || !f.conditions.length) continue;
          for (const c of f.conditions) {
            conditionsData.push({
              fieldId: dbField.id,
              dependsOnKey: c.dependsOnKey,
              operator: c.operator,
              value: String(c.value ?? ''),
              action: c.action,
            });
          }
        }
        if (conditionsData.length) {
          await prisma.fieldCondition.createMany({ data: conditionsData });
        }
      }

      const form = await prisma.form.findUnique({
        where: { id: formId },
        include: {
          fields: { orderBy: { position: 'asc' }, include: { conditions: true } },
        },
      });
      form.fields = form.fields.map(decodeField);
      await logActivity({ adminId: req.auth.sub, action: 'form.fields.update', entityType: 'form', entityId: formId, ipAddress: req.ip });
      res.json({ form });
    } catch (err) { next(err); }
  },
);

// ── Submissions ──────────────────────────────────────────────────────────────
// Mark all currently-submitted submissions as reviewed (dashboard "Clear" action)
router.post('/submissions/mark-all-reviewed', async (req, res, next) => {
  try {
    const result = await prisma.formSubmission.updateMany({
      where: { status: 'submitted' },
      data: { status: 'reviewed' },
    });
    await logActivity({ adminId: req.auth.sub, action: 'submission.bulk.mark_reviewed', metadata: { count: result.count }, ipAddress: req.ip });
    res.json({ ok: true, count: result.count });
  } catch (err) { next(err); }
});

router.get('/submissions',
  query('formId').optional().isInt(),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('offset').optional().isInt({ min: 0 }),
  query('q').optional().isString().isLength({ max: 200 }),
  query('status').optional().isString().isIn(['submitted', 'reviewed', 'archived']),
  handleValidation,
  async (req, res, next) => {
    try {
      const q = String(req.query.q || '').trim();
      const where = {
        ...(req.query.formId ? { formId: Number(req.query.formId) } : {}),
        ...(req.query.status ? { status: req.query.status } : {}),
        // Free-text search across submission answers (owner name, dog name,
        // email, phone, anything stored in a SubmissionAnswer.value). Also
        // matches the user's email/name if the submission was linked to one,
        // and the literal submission id so admins can paste an id from PDF
        // exports. MySQL LIKE %term% on an indexed answer.value column scales
        // fine for the volumes we expect (low thousands).
        ...(q
          ? {
              OR: [
                ...(/^\d+$/.test(q) ? [{ id: Number(q) }] : []),
                { answers: { some: { value: { contains: q } } } },
                { user: { email: { contains: q } } },
                { user: { name: { contains: q } } },
              ],
            }
          : {}),
      };
      const take = Math.min(Number(req.query.limit) || 50, 200);
      const skip = Math.max(Number(req.query.offset) || 0, 0);
      const [submissions, total] = await Promise.all([
        prisma.formSubmission.findMany({
          where, take, skip,
          orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
          include: {
            form: { select: { id: true, title: true, slug: true } },
            user: { select: { id: true, email: true, name: true } },
          },
        }),
        prisma.formSubmission.count({ where }),
      ]);
      res.json({ submissions, total });
    } catch (err) { next(err); }
  },
);

router.get('/submissions/:id',
  param('id').isInt(),
  handleValidation,
  async (req, res, next) => {
    try {
      const submission = await prisma.formSubmission.findUnique({
        where: { id: Number(req.params.id) },
        include: {
          form: { include: { fields: { orderBy: { position: 'asc' } } } },
          user: { select: { id: true, email: true, name: true } },
          answers: { include: { field: { select: { id: true, fieldKey: true, label: true, type: true } } } },
          fileUploads: true,
        },
      });
      if (!submission) return res.status(404).json({ error: 'Submission not found' });
      submission.form.fields = submission.form.fields.map(decodeField);
      res.json({ submission });
    } catch (err) { next(err); }
  },
);

router.patch('/submissions/:id',
  param('id').isInt(),
  body('status').optional().isIn(['submitted', 'reviewed', 'archived']),
  handleValidation,
  async (req, res, next) => {
    try {
      const submission = await prisma.formSubmission.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      await logActivity({ adminId: req.auth.sub, action: 'submission.update', entityType: 'submission', entityId: submission.id, ipAddress: req.ip });
      res.json({ submission });
    } catch (err) { next(err); }
  },
);

router.delete('/submissions/:id',
  param('id').isInt(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await prisma.formSubmission.delete({ where: { id } });
      await logActivity({ adminId: req.auth.sub, action: 'submission.delete', entityType: 'submission', entityId: id, ipAddress: req.ip });
      res.json({ ok: true });
    } catch (err) { next(err); }
  },
);

// ── Bulk submission import (used by /admin/import for legacy Excel data) ────
// Body: { rows: [ { [fieldKey]: value, ... }, ... ] }
// Resolves each fieldKey to a field on the form, creates one FormSubmission
// per row plus the SubmissionAnswer rows, and returns counts.
//
// IMPORTANT: each row runs in its OWN small transaction (one
// formSubmission.create + one submissionAnswer.createMany). Wrapping the
// whole chunk in a single transaction blows past Prisma's default 5s
// timeout against Afrihost MySQL (~250ms per query × 25-50 rows × 2
// queries each = 12-25s). Per-row TX keeps each one well under 1s.
// A failure on any single row is isolated to that row.
router.post('/forms/:id/submissions/bulk',
  param('id').isInt(),
  body('rows').isArray({ min: 1, max: 5000 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const formId = Number(req.params.id);
      const form = await prisma.form.findUnique({
        where: { id: formId },
        include: { fields: { select: { id: true, fieldKey: true } } },
      });
      if (!form) {
        console.warn(`[bulk import] form ${formId} not found`);
        return res.status(404).json({ error: `Form ${formId} not found` });
      }

      const fieldByKey = new Map(form.fields.map((f) => [f.fieldKey, f.id]));
      const rows = req.body.rows;

      let created = 0;
      let skipped = 0;
      let answersCreated = 0;
      const rowErrors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || typeof row !== 'object') { skipped++; continue; }
        const entries = Object.entries(row)
          .filter(([k, v]) => fieldByKey.has(k) && v !== undefined && v !== null && String(v).trim() !== '');
        if (entries.length === 0) { skipped++; continue; }

        try {
          await prisma.$transaction(
            async (tx) => {
              const submission = await tx.formSubmission.create({
                data: {
                  formId,
                  status: 'submitted',
                  ipAddress: (req.ip || '').slice(0, 100),
                  userAgent: 'bulk-import',
                },
              });
              const answers = entries.map(([k, v]) => ({
                submissionId: submission.id,
                fieldId: fieldByKey.get(k),
                value: String(v).slice(0, 65_000),
              }));
              await tx.submissionAnswer.createMany({ data: answers });
            },
            // Generous per-row timeout — Afrihost latency from Vercel fra1
            // is sometimes spiky, and createMany with ~25 answer rows can
            // take a few seconds on a bad ping. Default 5s is too tight.
            { timeout: 15_000, maxWait: 5_000 },
          );
          created += 1;
          answersCreated += entries.length;
        } catch (rowErr) {
          skipped += 1;
          if (rowErrors.length < 5) rowErrors.push(rowErr.message || String(rowErr));
          console.error(`[bulk import] row ${i} failed:`, rowErr.message);
        }
      }

      await logActivity({
        adminId: req.auth.sub,
        action: 'submission.bulkImport',
        entityType: 'form',
        entityId: formId,
        metadata: { received: rows.length, created, skipped, answersCreated, rowErrors },
        ipAddress: req.ip,
      });

      res.json({
        ok: true,
        received: rows.length,
        created,
        skipped,
        answersCreated,
        ...(rowErrors.length ? { rowErrors } : {}),
      });
    } catch (err) {
      console.error('[bulk import] fatal:', err);
      next(err);
    }
  },
);

async function uniqueSlug(base, excludeId = null) {
  let candidate = base || `form-${Date.now()}`;
  let n = 1;
  while (true) {
    const found = await prisma.form.findUnique({ where: { slug: candidate } });
    if (!found || found.id === excludeId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export default router;
