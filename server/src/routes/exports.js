import { Router } from 'express';
import PDFDocument from 'pdfkit';

import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logActivity } from '../lib/activity.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// CSV: one row per submission, columns = form fields (in display order)
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

// PDF: all submissions of one form, bundled in a single document.
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
      include: { answers: true, user: { select: { email: true, name: true, surname: true } } },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${form.slug}-submissions.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    doc.pipe(res);

    // Cover page
    doc.fontSize(24).fillColor('#222').text(form.title);
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#666')
      .text(`${submissions.length} submission${submissions.length === 1 ? '' : 's'}`)
      .text(`Exported ${new Date().toISOString()}`);
    if (form.description) {
      doc.moveDown(1).fontSize(11).fillColor('#444').text(form.description);
    }

    submissions.forEach((s, idx) => {
      doc.addPage();
      doc.fontSize(16).fillColor('#000').text(`Submission #${s.id}`);
      doc.fontSize(10).fillColor('#666')
        .text(`Submitted ${s.createdAt.toISOString()} — status: ${s.status}`);
      if (s.user) {
        const fullName = [s.user.name, s.user.surname].filter(Boolean).join(' ');
        doc.text(`From: ${fullName || '—'} <${s.user.email}>`);
      }
      doc.moveDown(0.8);
      doc.fillColor('#000');

      const answerMap = new Map(s.answers.map((a) => [a.fieldId, a.value]));
      for (const field of form.fields) {
        if (['section', 'paragraph', 'subheading'].includes(field.type)) continue;
        doc.fontSize(10).fillColor('#666').text(field.label);
        doc.fontSize(12).fillColor('#000').text(answerMap.get(field.id) || '—');
        doc.moveDown(0.5);
      }

      doc.fontSize(8).fillColor('#aaa').text(`Page ${idx + 2} of ${submissions.length + 1}`, 50, doc.page.height - 70, {
        align: 'center',
        width: doc.page.width - 100,
      });
    });

    doc.end();
    await logActivity({ adminId: req.auth.sub, action: 'submission.export.pdf.bundle', entityType: 'form', entityId: formId, metadata: { count: submissions.length }, ipAddress: req.ip });
  } catch (err) { next(err); }
});

// PDF: one submission per document
router.get('/submissions/:id.pdf', async (req, res, next) => {
  try {
    const submission = await prisma.formSubmission.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        form: { include: { fields: { orderBy: { position: 'asc' } } } },
        answers: true,
        user: { select: { email: true, name: true } },
      },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="submission-${submission.id}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);
    doc.fontSize(20).text(submission.form.title, { underline: false });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666')
      .text(`Submission #${submission.id} • ${submission.createdAt.toISOString()}`);
    if (submission.user) doc.text(`User: ${submission.user.name || ''} <${submission.user.email}>`);
    doc.fillColor('#000');
    doc.moveDown(1);

    const answerMap = new Map(submission.answers.map((a) => [a.fieldId, a.value]));
    for (const field of submission.form.fields) {
      doc.fontSize(11).fillColor('#444').text(field.label, { continued: false });
      doc.fontSize(12).fillColor('#000').text(answerMap.get(field.id) || '—');
      doc.moveDown(0.7);
    }

    doc.end();
    await logActivity({ adminId: req.auth.sub, action: 'submission.export.pdf', entityType: 'submission', entityId: submission.id, ipAddress: req.ip });
  } catch (err) { next(err); }
});

function csvCell(v) {
  const s = String(v ?? '');
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default router;
