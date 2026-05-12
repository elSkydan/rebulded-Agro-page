# Scaling.md — Scaling Strategy

---

## 1. Current Architecture Scaling Limits

| Component | Current Limit | Bottleneck |
|-----------|--------------|------------|
| Single Node.js process | ~500 req/sec (Express) | CPU-bound tasks block event loop |
| PostgreSQL single instance | ~10,000 concurrent connections (with pool) | Write contention at high lead volume |
| Telegram 30 msg/sec global | ~1800 notifications/min | Notifications queued during spikes |
| node-cron (single process) | Fine for <10k leads | Becomes slow if no index on status+updated_at |
| In-process assignment | Race conditions at >100 concurrent submissions | FOR UPDATE serializes — creates queue |

**MVP safe zone:** Up to ~100 leads/hour, ~10 active workers, 1-3 cities  
**Scaling needed at:** >500 leads/hour OR >5 cities OR >50 workers

---

## 2. Scaling by Cities

### Current Architecture
- `city_id` foreign key on `leads` and `workers`
- Workers are city-scoped
- No geographic sharding

### Phase 1: Multi-City (Same DB, Same Server)
No changes needed. Add cities via admin API. Works for 1-20 cities.

### Phase 2: City-Based Data Partitioning
```sql
-- Partition leads table by city_id or region
CREATE TABLE leads_kyiv PARTITION OF leads FOR VALUES IN (1);
CREATE TABLE leads_kharkiv PARTITION OF leads FOR VALUES IN (2);
```
**When:** Table exceeds 1M rows or query times degrade.

### Phase 3: Regional Databases
- One PostgreSQL instance per region (Kyiv, Kharkiv, Odesa)
- Application routes requests based on city_id → DB connection pool
- Tradeoff: cross-region lead queries require federation layer

### Routing Strategy
```javascript
// City → DB pool mapping
const cityPoolMap = {
  1: kievPool,     // Kyiv
  2: kharkivPool,  // Kharkiv
  3: odesaPool,    // Odesa
};
```

### Multi-Region Considerations
- Telegram webhook must be region-aware (one webhook URL, routes internally)
- Admin panel aggregates across regions
- Use read replicas per region for reporting

---

## 3. Scaling by Workers

### Current Limits
- `ACTIVE_LEAD_LIMIT=3` per worker — configurable
- Workers receive leads one at a time (sequential notification)
- No worker grouping or specialization by service type

### Load Distribution Improvements (Without Rewriting)

1. **Adjust priority dynamically:** Higher-performing workers get higher priority
2. **Service-type specialization:** Add `service_types` column to workers (array of accepted types)
3. **Time-based availability:** Add `available_hours` to workers (e.g., 7:00-20:00)

### Queue System for Notifications

**Problem:** At high lead volume, notifications are sent synchronously during request handling.  
**Solution:** BullMQ queue for Telegram sends.

```
Architecture with BullMQ:

POST /api/leads
    └── DB INSERT lead
    └── assignmentService.assignLead() → DB updates
    └── telegramQueue.add({worker, lead})  ← non-blocking
    └── Return 201 immediately

[Background worker process]
    └── telegramQueue.process()
        └── telegramService.sendLeadNotification()
        └── Retry on failure (exponential backoff)
```

**When to add:** >50 concurrent lead submissions/minute OR Telegram rate limit errors appear.

### Telegram Scaling Limits

| Scenario | Limit | Solution |
|----------|-------|----------|
| Many workers in same city | 1 msg/sec per chat | Queue per chat_id |
| Global notification burst | 30 msg/sec | BullMQ with rate limiting |
| Many cities | One bot handles all | One bot per region (advanced) |

---

## 4. Infrastructure Scaling Path

### Stage 1: MVP (Current)
```
Browser → Express (single process)
              ├── PostgreSQL (local or Supabase)
              └── Telegram API (direct HTTP calls)
```
Cost: ~$0-20/month (Railway/Render free tier)

### Stage 2: Production-Ready
```
Browser → Nginx → Express (PM2 cluster, N workers)
                      ├── PostgreSQL (Supabase or dedicated)
                      └── Telegram API

Admin → Express (same process, auth-protected routes)
```
Changes needed:
- PM2 cluster mode: `pm2 start server.js -i max`
- Shared session store (Redis) for rate limiter state across processes
- `express-rate-limit` needs Redis store for accuracy across cluster

Cost: ~$20-50/month

### Stage 3: High Volume
```
Browser → CDN (Cloudflare) → Load Balancer
                                  ├── Express Instance 1
                                  ├── Express Instance 2
                                  └── Express Instance 3
                                          │
                                  ┌───────┴────────┐
                                  │                │
                             PostgreSQL        Redis
                           (Primary + Replica) (Queue + Cache)
                                          │
                                    BullMQ Workers (Telegram sends)
```
Changes needed:
- Redis (session, rate limiting, job queue)
- BullMQ for async Telegram notifications
- PostgreSQL read replica for reporting queries
- Separate admin API service

Cost: ~$100-300/month

### Stage 4: Multi-Region
```
Cloudflare (global DNS + CDN)
    ├── EU Region (Kyiv, Lviv, Odesa)
    │       ├── Express cluster
    │       └── PostgreSQL regional instance
    │
    └── East Region (Kharkiv, Dnipro, Zaporizhzhia)
            ├── Express cluster
            └── PostgreSQL regional instance
```

---

## 5. Redis Integration Plan

**When to add Redis:**
- Rate limiting across multiple Express processes
- Caching city/worker lists (avoid DB hits on every request)
- BullMQ job queue for Telegram sends
- Distributed locking (replace FOR UPDATE for assignment)

**What to cache:**
```
cities:all          → TTL: 1 hour (changes rarely)
workers:city:{id}   → TTL: 5 minutes (changes occasionally)
lead:{id}           → TTL: 10 minutes (changes frequently)
```

---

## 6. When to Split Services

| Trigger | Action |
|---------|--------|
| Telegram errors block lead API | Extract telegramService to separate process + queue |
| Timeout cron takes >30 seconds | Extract timeoutService to separate cron process |
| Admin API slows main API | Separate admin Express app on different port |
| DB connections exhausted | Add PgBouncer connection pooler |
| Lead volume >10k/day | Add PostgreSQL read replica for reporting |
