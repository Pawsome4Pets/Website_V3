// File uploads.
//
// Storage strategy:
//   • Vercel (production)  — BLOB_READ_WRITE_TOKEN is set, files go to Vercel Blob.
//                            DB stores the blob URL in `storagePath`.
//                            GET /uploads/:id redirects to that URL.
//   • Local dev            — falls back to disk storage in ./uploads.
//                            DB stores the filename in `storagePath`.
//                            GET /uploads/:id streams the file from disk.
//
// This lets the same code run on Vercel (read-only/ephemeral FS) and on a
// developer machine without changes to the frontend.

import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';

import { prisma } from '../lib/prisma.js';

const router = Router();

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// 10 MB cap, allowlist of common file types.
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
]);

// ── Local-disk strategy (dev fallback) ───────────────────────────────────────
const UPLOAD_DIR = path.resolve('uploads');
if (!useBlob) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, '');
    const safe = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${safe}${ext}`);
  },
});

const upload = multer({
  storage: useBlob ? multer.memoryStorage() : diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(new Error('File type not allowed'));
    cb(null, true);
  },
});

// Lazy-import @vercel/blob only when needed, so local dev without the package
// installed still works in dev mode.
async function putToBlob(buffer, originalName, mimeType) {
  const { put } = await import('@vercel/blob');
  const ext = path.extname(originalName).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, '');
  const safe = crypto.randomBytes(16).toString('hex');
  const key = `submissions/${Date.now()}-${safe}${ext}`;
  const result = await put(key, buffer, {
    access: 'public',
    contentType: mimeType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return result.url;
}

router.post('/', uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let storagePath;
    if (useBlob) {
      storagePath = await putToBlob(req.file.buffer, req.file.originalname, req.file.mimetype);
    } else {
      storagePath = req.file.filename;
    }

    const record = await prisma.fileUpload.create({
      data: {
        fieldKey: req.body.fieldKey || null,
        originalName: req.file.originalname.slice(0, 250),
        storagePath,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
    });

    res.status(201).json({
      id: record.id,
      originalName: record.originalName,
      sizeBytes: record.sizeBytes,
      mimeType: record.mimeType,
    });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const record = await prisma.fileUpload.findUnique({ where: { id: Number(req.params.id) } });
    if (!record) return res.status(404).json({ error: 'File not found' });

    // Blob storage: storagePath is a full https URL — redirect the client.
    if (/^https?:\/\//i.test(record.storagePath)) {
      return res.redirect(302, record.storagePath);
    }

    // Disk storage: stream the file. Guard against path traversal.
    const filePath = path.join(UPLOAD_DIR, record.storagePath);
    if (!filePath.startsWith(UPLOAD_DIR)) return res.status(400).json({ error: 'Invalid path' });
    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(record.originalName)}"`);
    res.sendFile(filePath);
  } catch (err) { next(err); }
});

export default router;
