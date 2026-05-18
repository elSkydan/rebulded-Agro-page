'use strict';

/**
 * Map PostgreSQL errors from lead writes to HTTP responses (avoid silent "Database error").
 */

function respondLeadDbError(res, err, logPrefix) {
  console.error(`${logPrefix} [${err.code}]`, err.message);

  if (
    err.code === '22P02' &&
    String(err.message).includes('service_type_enum')
  ) {
    return res.status(503).json({
      error:
        'Database is missing service types used by the form. Run db/migrate_service_types.sql on the server database.',
      code: 'SCHEMA_ENUM_MISMATCH',
    });
  }

  if (err.code === '23514') {
    return res.status(422).json({
      error: 'Submitted values do not satisfy database rules.',
      code: 'DB_CHECK_VIOLATION',
    });
  }

  return res.status(500).json({ error: 'Database error' });
}

module.exports = { respondLeadDbError };
