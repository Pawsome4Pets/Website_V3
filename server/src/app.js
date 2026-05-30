// Express application factory.
//
// Exported as default so it can be:
//   • imported by `api/index.js` and exposed as a Vercel serverless function, or
//   • imported by `src/index.js` and bound to a TCP port for local development.
//
// The app does NOT call `.listen()` here — that is the caller's responsibility.

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import publicRouter from './routes/public.js';
import uploadsRouter from './routes/uploads.js';
import exportsRouter from './routes/exports.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

// CORS — allowed origins come from CLIENT_ORIGIN (comma-separated). When the
// API is hosted on Vercel and the frontend is on the same project there is no
// cross-origin call at all, but we keep this layer in case the API is later
// pointed at by a different domain.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Same-origin / curl / server-to-server requests don't send Origin.
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes('*')) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Allow any *.vercel.app preview if VERCEL is set (handy until the
      // user attaches a custom domain).
      if (process.env.VERCEL && /\.vercel\.app$/.test(new URL(origin).hostname)) {
        return cb(null, true);
      }
      return cb(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  }),
);

// 4mb keeps us just below Vercel's 4.5mb serverless body cap. The bulk-
// submissions import is the only path that pushes anywhere near this; the
// frontend also chunks rows so a single call stays under ~1mb in practice.
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) app.use(morgan('dev'));

app.use(
  '/api/',
  rateLimit({
    windowMs: 60 * 1000,
    max: 240,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString(), env: process.env.NODE_ENV || 'development' }),
);

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api', publicRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
