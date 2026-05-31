import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { param, validationResult } from 'express-validator';

import { prisma } from '../lib/prisma.js';
import { logActivity } from '../lib/activity.js';
import { decodeField } from '../lib/json.js';

const router = Router();

// Tight cap on submissions to stop spammers without hurting real users.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions, please wait a moment.' },
});

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input', details: errors.array() });
  next();
};

// ── Public site config (settings the public site needs to render nav/CTAs) ──
router.get('/site-config', async (_req, res, next) => {
  try {
    const keys = ['nav.newClientFormSlug', 'public.formsNav'];
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const newClientSlug = (map['nav.newClientFormSlug'] || '').trim();

    let navSlugs = [];
    try {
      const raw = map['public.formsNav'];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) navSlugs = parsed.filter((s) => typeof s === 'string');
      }
    } catch { /* ignore malformed */ }

    const slugsToFetch = [...new Set([newClientSlug, ...navSlugs].filter(Boolean))];
    const forms = slugsToFetch.length
      ? await prisma.form.findMany({
          where: { slug: { in: slugsToFetch }, isPublished: true },
          select: { slug: true, title: true, description: true },
        })
      : [];
    const bySlug = Object.fromEntries(forms.map((f) => [f.slug, f]));

    res.json({
      newClientFormSlug: bySlug[newClientSlug] ? newClientSlug : null,
      navForms: navSlugs.map((s) => bySlug[s]).filter(Boolean),
    });
  } catch (err) { next(err); }
});

// ── Public form schema ───────────────────────────────────────────────────────
router.get('/forms/:slug',
  param('slug').isString().trim().isLength({ min: 1, max: 200 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const form = await prisma.form.findUnique({
        where: { slug: req.params.slug },
        include: {
          fields: { orderBy: { position: 'asc' }, include: { conditions: true } },
        },
      });
      if (!form || !form.isPublished) return res.status(404).json({ error: 'Form not found' });
      // Strip internal fields before returning
      res.json({
        form: {
          id: form.id,
          slug: form.slug,
          title: form.title,
          description: form.description,
          successMessage: form.successMessage,
          createsAccount: form.createsAccount,
          fields: form.fields.map(decodeField).map((f) => ({
            id: f.id,
            fieldKey: f.fieldKey,
            label: f.label,
            type: f.type,
            placeholder: f.placeholder,
            helpText: f.helpText,
            isRequired: f.isRequired,
            options: f.options,
            validation: f.validation,
            conditions: f.conditions.map((c) => ({
              dependsOnKey: c.dependsOnKey,
              operator: c.operator,
              value: c.value,
              action: c.action,
            })),
          })),
        },
      });
    } catch (err) { next(err); }
  },
);

// ── Submit form ──────────────────────────────────────────────────────────────
router.post('/forms/:slug/submit',
  submitLimiter,
  param('slug').isString().trim().isLength({ min: 1, max: 200 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const form = await prisma.form.findUnique({
        where: { slug: req.params.slug },
        include: { fields: { orderBy: { position: 'asc' } } },
      });
      if (!form || !form.isPublished) return res.status(404).json({ error: 'Form not found' });

      const answers = req.body?.answers || {};
      const fileRefs = req.body?.files || {}; // { fieldKey: uploadId }

      // Required-field validation. We don't fully evaluate conditional logic
      // server-side yet; missing required fields are still rejected.
      const isMissing = (f) => {
        const v = answers[f.fieldKey];
        if (f.type === 'repeater') return !Array.isArray(v) || v.length === 0;
        return v === undefined || v === null || v === '' && !fileRefs[f.fieldKey];
      };
      const missing = form.fields.filter((f) => f.isRequired && isMissing(f)).map((f) => f.label);
      if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

      // Link the submission to a user when the form provides an email.
      // Always link to an existing user with that email so the admin views
      // can attribute submissions correctly. Auto-create a real account only
      // when the form is flagged for it.
      let userId = null;
      let createdUser = null;
      let tempPassword = null;
      const email = pickEmail(form, answers);
      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          userId = existing.id;
        } else if (form.createsAccount) {
          tempPassword = crypto.randomBytes(9).toString('base64url');
          const role = await prisma.role.findUnique({ where: { name: 'user' } });
          const passwordHash = await bcrypt.hash(tempPassword, Number(process.env.BCRYPT_ROUNDS || 12));
          createdUser = await prisma.user.create({
            data: {
              email,
              passwordHash,
              name: pickName(form, answers),
              surname: pickSurname(form, answers),
              phone: pickPhone(form, answers),
              roleId: role?.id ?? null,
            },
            select: { id: true, email: true, name: true },
          });
          userId = createdUser.id;
        }
      }

      const submission = await prisma.formSubmission.create({
        data: {
          formId: form.id,
          userId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']?.slice(0, 500) || null,
          answers: {
            create: form.fields
              .filter((f) => answers[f.fieldKey] !== undefined)
              .map((f) => ({
                fieldId: f.id,
                value: stringifyValue(answers[f.fieldKey]),
              })),
          },
        },
      });

      // Link uploaded files to this submission
      const uploadIds = Object.values(fileRefs).filter(Boolean).map(Number);
      if (uploadIds.length) {
        await prisma.fileUpload.updateMany({
          where: { id: { in: uploadIds }, submissionId: null },
          data: { submissionId: submission.id },
        });
      }

      await logActivity({
        userId,
        action: 'submission.create',
        entityType: 'submission',
        entityId: submission.id,
        ipAddress: req.ip,
        metadata: { formId: form.id, formSlug: form.slug },
      });

      res.status(201).json({
        ok: true,
        submissionId: submission.id,
        successMessage: form.successMessage,
        account: createdUser ? { email: createdUser.email, tempPassword } : null,
      });
    } catch (err) { next(err); }
  },
);

function pickEmail(form, answers) {
  // Find a field labelled/keyed email first, then any email-type field.
  const emailField = form.fields.find((f) => /email/i.test(f.fieldKey) || f.type === 'email') ||
                     form.fields.find((f) => /email/i.test(f.label));
  const v = emailField ? answers[emailField.fieldKey] : null;
  return typeof v === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? v.toLowerCase() : null;
}

function pickName(form, answers) {
  // Prefer an explicit first-name field; fall back to a "full name" field.
  const first = form.fields.find((x) => /first|given/i.test(x.fieldKey + x.label));
  if (first && answers[first.fieldKey]) return String(answers[first.fieldKey]).slice(0, 120);
  const full = form.fields.find((x) => /^(full[ _-]?)?name$/i.test(x.fieldKey) || /^(full[ _-]?)?name$/i.test(x.label));
  return full && answers[full.fieldKey] ? String(answers[full.fieldKey]).slice(0, 120) : null;
}

function pickSurname(form, answers) {
  const last = form.fields.find((x) => /last|surname|family/i.test(x.fieldKey + x.label));
  const v = last ? answers[last.fieldKey] : null;
  return v ? String(v).slice(0, 120) : null;
}

function pickPhone(form, answers) {
  const f = form.fields.find((x) => /phone|mobile|tel/i.test(x.fieldKey + x.label) || x.type === 'tel');
  return f && answers[f.fieldKey] ? String(answers[f.fieldKey]).slice(0, 40) : null;
}

function stringifyValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.slice(0, 10_000);
  return JSON.stringify(v).slice(0, 10_000);
}

export default router;
