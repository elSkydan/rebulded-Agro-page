'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render PostgreSQL requires SSL; rejectUnauthorized: false because Render
  // uses a self-signed CA on internal connections.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[pg pool] Unexpected client error:', err.message);
});

module.exports = pool;
