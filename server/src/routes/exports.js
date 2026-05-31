import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { body, validationResult } from 'express-validator';

import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logActivity } from '../lib/activity.js';
import { decodeField } from '../lib/json.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function humanizeKey(key) {
  return key
    .replace(/_Id$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Renders one field onto `doc`. Handles sections, subheadings, repeaters, and
// plain scalar fields. Paragraphs (T&C text blocks) are skipped — they're
// display-only content, not submitted data.
function renderField(doc, field, rawValue) {
  const { type, label } = field;

  if (type === 'paragraph') return; // display-only, not data

  if (type === 'section') {
    doc.moveDown(0.6);
    doc.fontSize(13).fillColor('#111').font('Helvetica-Bold').text(label || '');
    doc.font('Helvetica');
    doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2)
      .strokeColor('#cccccc').lineWidth(0.5).stroke();
    doc.moveDown(0.4);
    return;
  }

  if (type === 'subheading') {
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#444').font('Helvetica-Bold').text(label || '');
    doc.font('Helvetica');
    doc.moveDown(0.2);
    return;
  }

  if (type === 'repeater') {
    doc.fontSize(10).fillColor('#444').font('Helvetica-Bold').text(label || '');
    doc.font('Helvetica');
    if (!rawValue) { doc.fontSize(10).fillColor('#999').text('—'); doc.moveDown(0.5); return; }

    let items;
    try { items = JSON.parse(rawValue); } catch {
      doc.fontSize(10).fillColor('#000').text(String(rawValue));
      doc.moveDown(0.5);
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      doc.fontSize(10).fillColor('#999').text('—'); doc.moveDown(0.5); return;
    }

    items.forEach((item, i) => {
      if (items.length > 1) {
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor('#888').font('Helvetica-Bold')
          .text(`${label} ${i + 1}`, { underline: false });
        doc.font('Helvetica');
      }
      for (const [key, val] of Object.entries(item)) {
        if (/_Id$/.test(key) || val === null || val === undefined || val === '') continue;
        const subLabel = humanizeKey(key);
        doc.fontSize(8).fillColor('#999').text(subLabel);
        doc.fontSize(10).fillColor('#111').text(String(val));
        doc.moveDown(0.15);
      }
      doc.moveDown(0.35);
    });
    return;
  }

  // Scalar field (text, radio, checkbox, date, tel, email, file, etc.)
  doc.fontSize(9).fillColor('#666').text(label || '');

  // File-reference values (stored as JSON or plain URL) render as the
  // filename + a hyperlink instead of the raw `{"id":..,"originalName":..}`
  // string.
  const fileMeta = pdfParseFileValue(rawValue);
  if (fileMeta) {
    const linkColor = '#c14a3b';
    doc.fontSize(10).fillColor(linkColor)
      .text(fileMeta.originalName || 'View file', {
        link: fileMeta.url || (fileMeta.id != null ? `${process.env.RESET_URL_BASE || ''}/api/uploads/${fileMeta.id}` : null),
        underline: true,
      });
    doc.fillColor('#111');
    doc.moveDown(0.45);
    return;
  }

  const display = rawValue
    ? (rawValue === 'true' || rawValue === 'I Agree' ? 'I Agree' : String(rawValue))
    : '—';
  doc.fontSize(10).fillColor('#111').text(display);
  doc.moveDown(0.45);
}

// Mirror of the frontend parseFileAnswer + extractFileFromText.
function pdfParseFileValue(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      if (first && typeof first === 'object' && (first.id != null || first.url || first.storagePath)) {
        return {
          id: first.id,
          url: first.url || (/^https?:\/\//i.test(first.storagePath || '') ? first.storagePath : null),
          originalName: first.originalName || 'file',
        };
      }
    } catch { /* fall through to regex */ }
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return { url: trimmed, originalName: trimmed.split('/').pop() || trimmed };
  }
  const idMatch = trimmed.match(/"id"\s*:\s*(\d+)/);
  const nameMatch = trimmed.match(/"originalName"\s*:\s*"([^"]+)"/);
  if (idMatch) {
    return { id: Number(idMatch[1]), originalName: nameMatch ? nameMatch[1] : 'file' };
  }
  return null;
}

function writePdfSubmission(doc, submission, isFirst) {
  if (!isFirst) doc.addPage();

  const fields = submission.form.fields.map(decodeField);
  const answerMap = new Map(submission.answers.map((a) => [a.fieldId, a.value]));

  doc.fontSize(17).fillColor('#111').font('Helvetica-Bold').text(submission.form.title);
  doc.font('Helvetica');
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#555')
    .text(`Submission #${submission.id}  •  ${new Date(submission.createdAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}`);
  if (submission.user) {
    const name = [submission.user.name, submission.user.surname].filter(Boolean).join(' ');
    doc.text(`Client: ${name || '—'}  <${submission.user.email}>`);
  }
  doc.moveDown(0.8);
  doc.fillColor('#000');

  for (const field of fields) {
    renderField(doc, field, answerMap.get(field.id) ?? null);
  }
}

// ─── CSV: all submissions of a form ──────────────────────────────────────────
router.get('/forms/:id/submissions.csv', async (req, res, next) => {
  try {
    const formId = Number(req.params.id);
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: { fields: { orderBy: { position: 'asc' } } },
    });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
      include: { answers: true, user: { select: { email: true } } },
    });

    const cols = [
      'submission_id', 'submitted_at', 'status', 'user_email',
      ...form.fields.map((f) => f.fieldKey),
    ];
    const rows = submissions.map((s) => {
      const answerMap = new Map(s.answers.map((a) => [a.fieldId, a.value]));
      return [
        s.id,
        s.createdAt.toISOString(),
        s.status,
        s.user?.email ?? '',
        ...form.fields.map((f) => answerMap.get(f.id) ?? ''),
      ];
    });

    const csv = [cols, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    await logActivity({ adminId: req.auth.sub, action: 'submission.export.csv', entityType: 'form', entityId: formId, ipAddress: req.ip });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${form.slug}-submissions.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
});

// ─── PDF: all submissions of a form bundled ───────────────────────────────────
router.get('/forms/:id/submissions.pdf', async (req, res, next) => {
  try {
    const formId = Number(req.params.id);
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: { fields: { orderBy: { position: 'asc' } } },
    });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
      include: {
        form: { include: { fields: { orderBy: { position: 'asc' } } } },
        answers: true,
        user: { select: { email: true, name: true, surname: true } },
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${form.slug}-submissions.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    doc.pipe(res);

    // Cover page
    doc.fontSize(24).fillColor('#222').font('Helvetica-Bold').text(form.title);
    doc.font('Helvetica');
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#666')
      .text(`${submissions.length} submission${submissions.length === 1 ? '' : 's'}`)
      .text(`Exported ${new Date().toISOString()}`);
    if (form.description) doc.moveDown(1).fontSize(11).fillColor('#444').text(form.description);

    submissions.forEach((s) => writePdfSubmission(doc, s, false));

    doc.end();
    await logActivity({ adminId: req.auth.sub, action: 'submission.export.pdf.bundle', entityType: 'form', entityId: formId, metadata: { count: submissions.length }, ipAddress: req.ip });
  } catch (err) { next(err); }
});

// ─── PDF: single submission ───────────────────────────────────────────────────
router.get('/submissions/:id.pdf', async (req, res, next) => {
  try {
    const submission = await prisma.formSubmission.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        form: { include: { fields: { orderBy: { position: 'asc' } } } },
        answers: true,
        user: { select: { email: true, name: true, surname: true } },
      },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="submission-${submission.id}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);
    writePdfSubmission(doc, submission, true);
    doc.end();

    await logActivity({ adminId: req.auth.sub, action: 'submission.export.pdf', entityType: 'submission', entityId: submission.id, ipAddress: req.ip });
  } catch (err) { next(err); }
});

// ─── PDF: selected submission IDs bundled (multi-select export) ───────────────
// POST body: { ids: [1, 2, 3] }
router.post('/submissions/bundle.pdf',
  body('ids').isArray({ min: 1, max: 500 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'ids must be a non-empty array (max 500)' });
    try {
      const ids = req.body.ids.map(Number).filter(Boolean);

      const submissions = await prisma.formSubmission.findMany({
        where: { id: { in: ids } },
        orderBy: [{ formId: 'asc' }, { id: 'asc' }],
        include: {
          form: { include: { fields: { orderBy: { position: 'asc' } } } },
          answers: true,
          user: { select: { email: true, name: true, surname: true } },
        },
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="selected-submissions.pdf"');

      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      doc.pipe(res);

      submissions.forEach((s, i) => writePdfSubmission(doc, s, i === 0));

      doc.end();
      await logActivity({
        adminId: req.auth.sub,
        action: 'submission.export.pdf.selected',
        metadata: { ids, count: submissions.length },
        ipAddress: req.ip,
      });
    } catch (err) { next(err); }
  },
);

function csvCell(v) {
  const s = String(v ?? '');
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default router;
