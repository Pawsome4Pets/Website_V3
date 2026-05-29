// Minimal MySQL connection sanity-check. Reads DATABASE_URL from env (loaded
// by `dotenv -e .env.production --` in the npm script) and runs SELECT 1.
//
// Run with:  npm run prod:dbtest
//
// Doesn't touch the Prisma client, so dev (SQLite) keeps working afterwards.

import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('FAIL: DATABASE_URL is not set. Did the dotenv flag load .env.production?');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch (err) {
  console.error(`FAIL: DATABASE_URL is not a valid URL — ${err.message}`);
  process.exit(1);
}

const config = {
  host: parsed.hostname,
  port: parsed.port ? Number(parsed.port) : 3306,
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ''),
  connectTimeout: 10_000,
};

console.log(
  `Connecting to mysql://${config.user}@${config.host}:${config.port}/${config.database} …`,
);

try {
  const conn = await mysql.createConnection(config);
  const [rows] = await conn.execute('SELECT 1 AS ok');
  console.log('OK', rows);
  // Bonus: count existing tables so we know if the DB is empty / already migrated.
  const [tables] = await conn.execute(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
    [config.database],
  );
  if (tables.length === 0) {
    console.log('DB is empty — ready for `npm run prod:migrate`.');
  } else {
    console.log(`DB has ${tables.length} table(s):`, tables.map((t) => t.TABLE_NAME || t.table_name).join(', '));
  }
  await conn.end();
  process.exit(0);
} catch (err) {
  console.error('FAIL', err.code || err.errno || '', '-', err.message);
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('  → Wrong username/password OR the user lacks privileges on this DB.');
    console.error('  → In cPanel, double-check "Add User To Database" was saved with ALL PRIVILEGES.');
  } else if (err.code === 'ER_HOST_NOT_ALLOWED') {
    console.error('  → Your current IP is not in cPanel → Remote Database Access.');
  } else if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
    console.error('  → Hostname did not resolve. Try a different host value.');
  } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
    console.error('  → Could not reach the server. Network blocked, wrong port, or remote MySQL disabled.');
  }
  process.exit(1);
}
