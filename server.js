'use strict';

require('dotenv').config();

// Fail-fast: validate all required env vars before any service initialises.
// Application exits with code 1 if token/chat_id are missing or placeholders.
const { validateEnv } = require('./config/validateEnv');
validateEnv();

const express       = require('express');
const swaggerUi     = require('swagger-ui-express');
const swaggerSpec   = require('./server/swagger');
const app           = express();
const pool          = require('./db/pool');

const leadsRoute    = require('./server/routes/leads');
const workersRoute  = require('./server/routes/workers');
const citiesRoute   = require('./server/routes/cities');
const telegramRoute = require('./server/routes/telegram');
const { startTimeoutCron } = require('./server/services/timeoutService');

const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

// CORS_ORIGIN may be:
//   '*'                                       — allow any origin
//   'http://example.com'                      — single origin
//   'http://example.com,http://localhost:3000' — comma-separated list
const _rawCors     = process.env.CORS_ORIGIN || 'http://localhost:5173';
const CORS_ORIGINS = _rawCors === '*'
  ? '*'
  : _rawCors.split(',').map(o => o.trim()).filter(Boolean);

app.use((req, res, next) => {
  const origin  = req.headers.origin;
  const allowed =
    CORS_ORIGINS === '*' ||
    (Array.isArray(CORS_ORIGINS) && !!origin && CORS_ORIGINS.includes(origin));

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// ---------------------------------------------------------------------------
// Swagger UI
// ---------------------------------------------------------------------------

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Agro Aggregator API Docs',
  swaggerOptions: { persistAuthorization: true },
}));

// Raw OpenAPI spec (for external tooling, Postman import, etc.)
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api/leads',    leadsRoute);
app.use('/api/workers',  workersRoute);
app.use('/api/cities',   citiesRoute);
app.use('/api/telegram', telegramRoute);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

// ---------------------------------------------------------------------------
// Error handlers
// ---------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, _next) => {
  console.error('[unhandled]', err);
  res.status(err.statusCode ?? 500).json({
    error: err.message ?? 'Internal server error',
  });
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('[db] Connected');
  } catch (err) {
    console.error('[db] Connection failed:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
  });

  startTimeoutCron();
}

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

start();
