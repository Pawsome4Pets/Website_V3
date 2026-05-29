// Local-dev entry point. Imports the configured Express app from app.js and
// binds it to a TCP port. Vercel does NOT use this file — it imports the app
// directly from api/index.js at the project root.

import app from './app.js';

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, () => {
  console.log(`▶ Pawsome 4 Pets API listening on http://localhost:${PORT}`);
});
