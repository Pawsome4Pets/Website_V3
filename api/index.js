// Vercel serverless function entry.
//
// Vercel invokes the default export with (req, res) for every request that
// matches /api/* (see vercel.json rewrites). We simply hand the request to
// the Express app — middleware, routers, error handlers, all unchanged.
//
// The Express app is built once per cold start and reused across warm
// invocations, so the Prisma client cached on globalThis stays alive too.
//
// Node version is set in Vercel project settings → Node.js Version (we want
// 20.x or newer because Prisma 5 requires Node 18.18+). It cannot be pinned
// from this file with raw /api functions.

import app from '../server/src/app.js';

export default app;
