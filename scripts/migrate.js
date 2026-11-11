'use strict';

/**
 * scripts/migrate.js
 *
 * Applies db/schema.sql to the target database (tables, enums,
 * indexes, column catch-up). Safe to run multiple times — all
 * statements are idempotent.
 *
 * Usage:
 *   node scripts/migrate.js
 *   npm run db:migrate
 *
 * Render: referenced via preDeployCommand in render.yaml.
 */

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { Client } = require('pg');

const SSL =
  process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false;

async function migrate() {
  if (!process.env.DATABASE_URL && !process.env.PGHOST) {
    console.error('[migrate] ERROR: Neither DATABASE_URL nor PGHOST is set.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: SSL,
  });

  await client.connect();
  console.log('[migrate] Connected to database.');

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  await client.query(sql);
  console.log('[migrate] schema.sql applied successfully.');

  await client.end();
  console.log('[migrate] Done.');
}

function redactDatabaseTarget() {
  const url = process.env.DATABASE_URL;
  if (!url) return '(DATABASE_URL not set)';
  try {
    const parsed = new URL(url);
    // Show host only — never log user/password.
    return `${parsed.protocol}//***@${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
  } catch {
    return '(DATABASE_URL present but unparseable)';
  }
}

migrate().catch((err) => {
  console.error('[migrate] FAILED:', err.message);
  console.error('[migrate] Target:', redactDatabaseTarget());

  const msg = String(err && err.message ? err.message : err);
  if (err.code === 'ENOTFOUND' || /ENOTFOUND/i.test(msg)) {
    console.error(
      '[migrate] HINT: Postgres hostname does not resolve (DNS ENOTFOUND). ' +
        'On Render this usually means the database was deleted/suspended, or ' +
        'DATABASE_URL still points at an old internal host like dpg-xxxxx-a. ' +
        'Fix: Dashboard → PostgreSQL → copy Internal Database URL → set it as ' +
        'DATABASE_URL on the web service (or re-link fromDatabase in render.yaml) → Clear build cache & redeploy.',
    );
  }

  process.exit(1);
});
