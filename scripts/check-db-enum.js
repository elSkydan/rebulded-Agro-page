'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../db/pool');

(async () => {
  const { rows } = await pool.query(`
    SELECT e.enumlabel AS v
    FROM   pg_enum e
    JOIN   pg_type t ON t.oid = e.enumtypid
    WHERE  t.typname = 'service_type_enum'
    ORDER  BY e.enumsortorder
  `);
  console.log('service_type_enum in DB:', rows.map((r) => r.v).join(', '));
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
