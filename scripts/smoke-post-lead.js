'use strict';

/**
 * POST /api/leads smoke test (needs API running: npm start).
 * Usage: node scripts/smoke-post-lead.js [baseUrl]
 * Env: SMOKE_BASE=http://127.0.0.1:3000
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = require('../db/pool');

const base =
  process.argv[2] ||
  process.env.SMOKE_BASE ||
  'http://127.0.0.1:3000';

(async () => {
  const { rows } = await pool.query(
    `SELECT id FROM cities ORDER BY id ASC LIMIT 1`
  );
  if (!rows.length) {
    console.error('[smoke] No rows in cities — seed the DB first.');
    process.exit(1);
  }
  const city_id = rows[0].id;

  const body = {
    name: 'Smoke Test',
    phone: '0671234567',
    service_type: 'mowing',
    area: 10,
    city_id,
    out_of_city: false,
  };

  let res;
  try {
    res = await fetch(`${base.replace(/\/$/, '')}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('[smoke] Request failed:', e.message);
    console.error(
      '        Start the server (npm start) or set SMOKE_BASE to your API URL.'
    );
    await pool.end();
    process.exit(1);
  }

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  console.log('[smoke] POST /api/leads →', res.status);
  console.log(JSON.stringify(json, null, 2));

  await pool.end();

  if (!res.ok && res.status !== 201) {
    process.exit(1);
  }
})().catch(async (e) => {
  console.error('[smoke]', e);
  try {
    await pool.end();
  } catch (_) {}
  process.exit(1);
});
