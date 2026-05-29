// Vercel serverless function entry.
//
// Vercel invokes the default export with (req, res) for every request that
// matches /api/* (see vercel.json rewrites). We simply hand the request to
// the Express app — middleware, routers, error handlers, all unchanged.
//
// The Express app is built once per cold start and reused across warm
// invocations, so the Prisma client cached on globalThis stays alive too.

import app from '../server/src/app.js';

export default app;

// Vercel reads this config object to pick the Node runtime. We pin Node 20
// because Prisma 5.x requires Node 18.18+ and Vercel's "nodejs20.x" runtime
// matches what `npm install` on the build server uses.
export const config = {
  runtime: 'nodejs20.x',
  // Body parsing is handled by Express; don't let Vercel parse it first.
  api: { bodyParser: false },
};
