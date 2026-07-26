'use strict';

/**
 * scripts/migrate.js
 *
 * Applies the full schema to the target database.
 * Safe to run multiple times — all statements are idempotent.
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

migrate().catch((err) => {
  console.error('[migrate] FAILED:', err.message);
  process.exit(1);
});
