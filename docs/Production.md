# Production.md — Deployment Guide (Step-by-Step)

---

## 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+
- Git
- A registered Telegram Bot (BotFather token)
- A public domain or public IP (for Telegram webhook)

---

## 2. Local Development Setup

### Step 1: Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/agroagriggator_v2.git
cd agroagriggator_v2
npm install
```

### Step 2: Create PostgreSQL Database
```bash
# macOS/Linux
createdb lead_distribution

# Windows (psql in PATH)
psql -U postgres -c "CREATE DATABASE lead_distribution;"
```

### Step 3: Run Schema
```bash
psql lead_distribution < db/schema.sql
# Optional: seed test data
psql lead_distribution < db/seed.sql
```

### Step 4: Configure .env
```bash
cp .env.example .env
# Edit .env with your values
```

Required `.env` values:
```env
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/lead_distribution
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...  # From BotFather
ADMIN_CHAT_ID=YOUR_TELEGRAM_USER_ID
ADMIN_TOKEN=generate-a-strong-32-char-secret-here
PORT=3000
TIMEOUT_MINUTES=3
ACCEPTED_TTL_MINUTES=30
SPAM_WINDOW_MINUTES=10
ACTIVE_LEAD_LIMIT=3
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=60000
```

### Step 5: Start Dev Server
```bash
npm run dev   # Uses node --watch (auto-restart on file change)
```

### Step 6: Register Telegram Webhook (for local dev use ngrok)
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000

# Copy the HTTPS URL, e.g.: https://abc123.ngrok.io

# Register webhook:
curl -X POST "https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook" \
  -d "url=https://abc123.ngrok.io/api/telegram/webhook"

# Verify:
curl "https://api.telegram.org/bot{YOUR_TOKEN}/getWebhookInfo"
```

---

## 3. Environment Variables Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | YES | `postgres://user:pass@host:5432/db` | Full connection string |
| `TELEGRAM_BOT_TOKEN` | YES | `123:ABC...` | From BotFather |
| `ADMIN_CHAT_ID` | YES | `123456789` | Your Telegram user ID |
| `ADMIN_TOKEN` | YES | `abc123xyz...` | Bearer auth — use 32+ random chars |
| `PORT` | No | `3000` | Default: 3000 |
| `TIMEOUT_MINUTES` | No | `3` | Assignment timeout |
| `ACCEPTED_TTL_MINUTES` | No | `30` | Accepted lead expiry |
| `SPAM_WINDOW_MINUTES` | No | `10` | Duplicate phone window |
| `ACTIVE_LEAD_LIMIT` | No | `3` | Max active leads per worker |
| `RATE_LIMIT_MAX` | No | `5` | Requests per window |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window (ms) |

**Generating a secure ADMIN_TOKEN:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Backend Deployment

### Option A: Railway (Recommended — Simplest)

1. Create account: https://railway.app
2. New Project → Deploy from GitHub repo
3. Add environment variables in Railway dashboard (Settings → Variables)
4. Railway auto-detects Node.js and runs `npm start`
5. Set custom domain in Railway Settings → Domains

**Railway PostgreSQL:**
- Add Plugin → PostgreSQL
- Railway auto-sets `DATABASE_URL` as environment variable
- Copy schema: use Railway's DB console to run `schema.sql`

**Register Telegram webhook after deploy:**
```bash
curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
  -d "url=https://YOUR-RAILWAY-DOMAIN.railway.app/api/telegram/webhook"
```

---

### Option B: Render.com

1. Create account: https://render.com
2. New → Web Service → Connect GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables in Render dashboard
6. Add PostgreSQL: New → PostgreSQL → Link to web service

---

### Option C: VPS (Ubuntu 22.04)

**Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Install PostgreSQL:**
```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb lead_distribution
sudo -u postgres psql lead_distribution < /path/to/db/schema.sql
```

**Clone and configure:**
```bash
git clone https://github.com/YOUR/repo.git /opt/agroservice
cd /opt/agroservice
npm install --production
cp .env.example .env
nano .env  # fill in values
```

**Run with PM2 (process manager):**
```bash
npm install -g pm2
pm2 start server.js --name agroservice
pm2 startup   # enable auto-start on reboot
pm2 save
```

**Nginx reverse proxy:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 5. Database Deployment

### Option A: Supabase (Recommended for Production)
1. Create project: https://supabase.com
2. SQL Editor → paste contents of `db/schema.sql` → Run
3. Copy connection string (Settings → Database → Connection string)
4. Set as `DATABASE_URL` in backend environment

**Connection string format:**
```
postgres://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
```

### Option B: Neon.tech (Serverless PostgreSQL)
1. Create project: https://neon.tech
2. Copy connection string
3. Run schema in Neon SQL console
4. Set `DATABASE_URL`

### Option C: Railway PostgreSQL (Same platform as backend)
- Easiest — Railway links DB automatically

---

## 6. Frontend Deployment

The frontend is static HTML + JS served by Express from the root directory.  
**No separate deployment needed** — Express serves `index.html` and static files.

**If you want to deploy frontend separately (Vercel):**
1. Move `index.html`, `main.js`, `style.css` to a `/client` directory
2. Update API calls in `main.js` to use full backend URL
3. Connect `/client` folder to Vercel
4. Set CORS_ORIGIN in backend .env to your Vercel domain

---

## 7. Telegram Bot Deployment Specifics

### Webhook vs Polling
- **Webhook (recommended for production):** Telegram pushes updates to your HTTPS URL
- **Polling (for local dev only):** Bot continuously polls Telegram API

### Webhook Setup (Production)
```bash
# Your server MUST have a public HTTPS URL

# Register webhook (one-time setup):
curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "secret_token": "optional-security-token-32chars"
  }'

# Verify webhook is set:
curl "https://api.telegram.org/bot{TOKEN}/getWebhookInfo"

# Delete webhook (if switching to polling):
curl "https://api.telegram.org/bot{TOKEN}/deleteWebhook"
```

### Important Telegram Requirements
- Webhook URL must be **HTTPS** (not HTTP)
- Self-signed SSL is supported (pass certificate in setWebhook call)
- Must respond within **60 seconds** or Telegram retries
- Always return **HTTP 200** even for errors

### Multiple Environments
- **Dev bot:** Create a separate bot in BotFather for development
- **Prod bot:** Use the production bot only with the production webhook
- Never point two server instances at the same bot token simultaneously

---

## 8. Production Checklist

- [ ] All placeholder values in `.env` replaced with real values
- [ ] `ADMIN_TOKEN` is a strong random secret (32+ chars)
- [ ] Database password is strong and not `SkydG1488!`
- [ ] HTTPS enabled on all endpoints
- [ ] Telegram webhook registered and verified
- [ ] `db/schema.sql` applied to production DB
- [ ] `.env` file NOT committed to git (verify `.gitignore`)
- [ ] Health check `GET /health` returns 200
- [ ] PM2 or equivalent process manager running
- [ ] Log rotation configured
- [ ] Database backup scheduled (daily minimum)
- [ ] CORS_ORIGIN set to production domain (not wildcard)

---

## 9. Monitoring (Basic)

```bash
# Check PM2 status
pm2 status
pm2 logs agroservice

# Check health endpoint
curl https://your-domain.com/health

# Check Telegram webhook status
curl "https://api.telegram.org/bot{TOKEN}/getWebhookInfo"

# PostgreSQL active connections
psql lead_distribution -c "SELECT count(*) FROM pg_stat_activity;"
```
