'use strict';

/**
 * Map PostgreSQL errors from admin writes (workers) to safe HTTP responses.
 * Never exposes driver messages — callers log the original error themselves.
 *
 * @param {Error & { code?: string }} err
 * @returns {{ status: number, body: { error: string, code?: string } }}
 */
function mapDbError(err) {
  switch (err && err.code) {
    case '23505': // unique_violation — workers.telegram_chat_id
      return { status: 409, body: { error: 'Worker with this telegram_chat_id already exists', code: 'DUPLICATE' } };
    case '23503': // foreign_key_violation — workers.city_id
      return { status: 400, body: { error: 'City not found', code: 'CITY_NOT_FOUND' } };
    case '23514': // check_violation (priority >= 0)
    case '22P02': // invalid_text_representation (enum / integer)
    case '22003': // numeric_value_out_of_range
      return { status: 400, body: { error: 'Invalid value', code: 'INVALID_INPUT' } };
    case '22001': // string_data_right_truncation
      return { status: 400, body: { error: 'Value too long', code: 'INVALID_INPUT' } };
    default:
      return { status: 500, body: { error: 'Database error' } };
  }
}

module.exports = { mapDbError };
