'use strict';

/**
 * Verify TELEGRAM_BOT_TOKEN with Telegram getMe (no DB).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.TELEGRAM_BOT_TOKEN;

(async () => {
  if (!token || token.includes('your-token')) {
    console.error('[telegram] Set TELEGRAM_BOT_TOKEN in .env');
    process.exit(1);
  }

  const url = `https://api.telegram.org/bot${token}/getMe`;
  const res = await fetch(url);
  const body = await res.json();

  if (!body.ok) {
    console.error('[telegram] getMe failed:', body.description || body);
    process.exit(1);
  }

  console.log('[telegram] Bot OK:', body.result.username, `(id ${body.result.id})`);
})().catch((e) => {
  console.error('[telegram]', e.message);
  process.exit(1);
});
