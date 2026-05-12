# Database.md — PostgreSQL Schema & Data Analysis

> **Basis:** BUSINESS_LOGIC.md + README.md + .env + main.js (frontend pricing constants)  
> **Status:** Schema is DESIGNED but NOT YET CREATED. No migration files exist.

---

## 1. Database Configuration

```
Host:     localhost
Port:     5432
Database: lead_distribution
User:     postgres
Password: SkydG1488!  ⚠️ CHANGE BEFORE PRODUCTION
```

Connection via `pg` Pool (`db/pool.js` — not yet created):
```javascript
// Expected implementation:
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

---

## 2. Full Schema

### Table: `cities`
```sql
CREATE TABLE cities (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    delivery_type   VARCHAR(50),      -- 'in_city' | 'out_of_city' | 'both'
    delivery_price  INTEGER DEFAULT 0, -- surcharge in UAH (usually 800 or 0)
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `workers`
```sql
CREATE TABLE workers (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    phone            VARCHAR(20),
    telegram_chat_id BIGINT UNIQUE,       -- Telegram user ID (NOT message ID)
    city_id          INTEGER REFERENCES cities(id),
    priority         INTEGER DEFAULT 5,   -- Higher = assigned first
    is_active        BOOLEAN DEFAULT TRUE,
    last_assigned_at TIMESTAMPTZ,         -- For round-robin ordering
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `leads`
```sql
CREATE TABLE leads (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(100),
    phone_normalized VARCHAR(20) NOT NULL,  -- +380XXXXXXXXX format
    city_id          INTEGER REFERENCES cities(id),
    service_type     VARCHAR(20) NOT NULL,  -- 'ogorod'|'celina'|'mowing'|'tree'|'washing'
    area             DECIMAL(6,1),          -- сотки, 0.5 precision
    out_of_city      BOOLEAN DEFAULT FALSE,
    comment          TEXT,
    total_price      INTEGER,               -- Calculated by pricingService
    status           VARCHAR(30) NOT NULL DEFAULT 'new',
    worker_id        INTEGER REFERENCES workers(id), -- Current assigned worker
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

Lead status values: `new` | `assigned` | `accepted` | `rejected` | `completed` | `unassigned` | `failed_contact` | `canceled` | `timeout`

### Table: `lead_assignments`
```sql
CREATE TABLE lead_assignments (
    id          SERIAL PRIMARY KEY,
    lead_id     INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    worker_id   INTEGER REFERENCES workers(id),
    status      VARCHAR(20) DEFAULT 'sent', -- 'sent'|'accepted'|'rejected'|'timeout'
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```
Purpose: Tracks all assignment attempts per lead — used to exclude already-tried workers on reassignment.

---

## 3. ER Diagram (Text)

```
┌─────────────┐       ┌─────────────────────────────────────────────────┐
│   cities    │       │                    leads                        │
│─────────────│       │─────────────────────────────────────────────────│
│ id (PK)     │◄──┐   │ id (PK)                                         │
│ name        │   │   │ name                                            │
│ delivery_   │   │   │ phone_normalized                                │
│   type      │   ├───│ city_id (FK → cities.id)                       │
│ delivery_   │   │   │ service_type                                    │
│   price     │   │   │ area                                            │
│ is_active   │   │   │ out_of_city                                     │
│ created_at  │   │   │ comment                                         │
└─────────────┘   │   │ total_price                                     │
                  │   │ status                                          │
                  │   │ worker_id (FK → workers.id)                     │
                  │   │ created_at                                      │
                  │   │ updated_at                                      │
                  │   └─────────────────────────────────────────────────┘
                  │                        │ 1
                  │                        │
                  │                        │ N
                  │   ┌─────────────────────────────────────────────────┐
                  │   │              lead_assignments                   │
                  │   │─────────────────────────────────────────────────│
                  │   │ id (PK)                                         │
                  │   │ lead_id (FK → leads.id)                        │
                  │   │ worker_id (FK → workers.id)                    │
                  │   │ status                                          │
                  │   │ created_at                                      │
                  │   └─────────────────────────────────────────────────┘
                  │                        │ N
                  │                        │
                  │                        │ 1
                  │   ┌─────────────────────────────────────────────────┐
                  └───│                  workers                        │
                      │─────────────────────────────────────────────────│
                      │ id (PK)                                         │
                      │ name                                            │
                      │ phone                                           │
                      │ telegram_chat_id (UNIQUE)                       │
                      │ city_id (FK → cities.id)                       │
                      │ priority                                        │
                      │ is_active                                       │
                      │ last_assigned_at                                │
                      │ created_at                                      │
                      └─────────────────────────────────────────────────┘
```

**Relationships:**
- `cities` 1:N `workers` (a city has many workers)
- `cities` 1:N `leads` (a city has many leads)
- `workers` 1:N `leads` (current_worker relationship)
- `leads` 1:N `lead_assignments` (history of all assignment attempts)
- `workers` 1:N `lead_assignments` (worker can be tried for many leads)

---

## 4. Recommended Indexes

```sql
-- Speed up lead assignment query (most critical query)
CREATE INDEX idx_workers_city_active ON workers (city_id, is_active, priority DESC, last_assigned_at ASC);

-- Speed up timeout cron queries
CREATE INDEX idx_leads_status_updated ON leads (status, updated_at);

-- Speed up spam check (phone + created_at)
CREATE INDEX idx_leads_phone_created ON leads (phone_normalized, created_at DESC);

-- Speed up assignment history lookup
CREATE INDEX idx_lead_assignments_lead ON lead_assignments (lead_id);
CREATE INDEX idx_lead_assignments_worker ON lead_assignments (worker_id);
```

---

## 5. Constraints

```sql
-- Lead status must be valid
ALTER TABLE leads ADD CONSTRAINT chk_lead_status
    CHECK (status IN ('new','assigned','accepted','rejected','completed',
                      'unassigned','failed_contact','canceled','timeout'));

-- Service type must be valid
ALTER TABLE leads ADD CONSTRAINT chk_service_type
    CHECK (service_type IN ('ogorod','celina','mowing','tree','washing'));

-- Area must be positive
ALTER TABLE leads ADD CONSTRAINT chk_area_positive
    CHECK (area IS NULL OR area > 0);

-- Priority must be 1-10
ALTER TABLE workers ADD CONSTRAINT chk_priority
    CHECK (priority BETWEEN 1 AND 10);
```

---

## 6. Data Consistency Issues

| Issue | Risk | Severity |
|-------|------|----------|
| `leads.worker_id` can diverge from latest `lead_assignments` entry | Medium — if reassignment fails mid-transaction | MEDIUM |
| No `ON DELETE RESTRICT` on workers — deleting a worker leaves orphan leads | Lead shows no worker name | LOW |
| `updated_at` not auto-updated by trigger | Must be manually set in every UPDATE query | MEDIUM |
| No audit log table | Cannot trace who changed what or when | LOW (MVP) |
| Phone normalization inconsistency | If frontend and backend normalize differently | HIGH |

**Recommended trigger:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 7. Scaling Limitations

| Limitation | Trigger Point | Solution |
|-----------|--------------|----------|
| Single PostgreSQL instance | ~10,000 concurrent leads | Read replicas |
| `FOR UPDATE` locking on assignment | High concurrency (>100/sec) | BullMQ queue |
| No partitioning on `leads` | Table growth >1M rows | Partition by `created_at` (monthly) |
| `lead_assignments` grows unbounded | Huge tables after months | Archive/purge policy |

---

## 8. Database UI Guide (Creating & Viewing Data)

### Option A: DBeaver (Recommended for Development)
1. Download DBeaver Community Edition: https://dbeaver.io
2. New Connection → PostgreSQL
3. Host: `localhost`, Port: `5432`, DB: `lead_distribution`
4. User: `postgres`, Password: from `.env`
5. Test Connection → Connect
6. Expand: Databases → lead_distribution → Schemas → public → Tables
7. Right-click table → View Data to see all rows

### Option B: psql (Command Line)
```bash
psql postgres://postgres:PASSWORD@localhost:5432/lead_distribution

# List tables
\dt

# View all leads
SELECT * FROM leads ORDER BY created_at DESC LIMIT 20;

# View active workers
SELECT * FROM workers WHERE is_active = true;

# View lead with city and worker name
SELECT l.id, l.phone_normalized, l.status, l.service_type,
       c.name as city, w.name as worker
FROM leads l
LEFT JOIN cities c ON l.city_id = c.id
LEFT JOIN workers w ON l.worker_id = w.id
ORDER BY l.created_at DESC LIMIT 20;

# Assignment history for a lead
SELECT la.*, w.name FROM lead_assignments la
JOIN workers w ON la.worker_id = w.id
WHERE la.lead_id = 42;
```

### Option C: Supabase Studio (Production Recommended)
1. Create project at https://supabase.com
2. Go to Table Editor to view/edit data visually
3. Or use SQL Editor for raw queries
4. Data → Import from existing PostgreSQL via connection string

### Option D: TablePlus (macOS/Windows)
- Clean GUI for PostgreSQL
- URL: `postgres://postgres:PASSWORD@localhost:5432/lead_distribution`

### Creating Test Data (SQL)
```sql
-- Add a city
INSERT INTO cities (name, delivery_type, delivery_price) 
VALUES ('Київ', 'both', 800);

-- Add a worker
INSERT INTO workers (name, phone, telegram_chat_id, city_id, priority, is_active)
VALUES ('Іван Петрович', '+380671234567', 123456789, 1, 10, true);

-- View dashboard summary
SELECT 
    COUNT(*) FILTER (WHERE status = 'new') as new_leads,
    COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'unassigned') as unassigned
FROM leads;
```
