# AdminPanel.md — Admin Panel Architecture & Plan

> **Basis:** BUSINESS_LOGIC.md, PROJECT_STRUCTURE.md, existing API design  
> **Status:** Admin panel is NOT YET IMPLEMENTED. This document defines the architecture and plan only.

---

## 1. Current State of Database Access

### How DB is Currently Accessed
- **Direct psql:** Command-line access for development
- **No admin UI exists**
- **No admin.html exists** (mentioned in PROJECT_STRUCTURE.md as "not yet created")
- API endpoints with Bearer auth are planned but not implemented

### Current Admin Capabilities (After Backend Implementation)
- `GET /api/leads` — List leads (with filters)
- `PATCH /api/leads/:id/status` — Manual status override
- `GET /api/workers`, `POST /api/workers`, `PATCH /api/workers/:id`
- `GET /api/cities`, `POST /api/cities`

---

## 2. Safe Way to Connect Existing DB (Now)

### Development — DBeaver
1. Install DBeaver Community: https://dbeaver.io
2. Connection: `postgres://postgres:PASSWORD@localhost:5432/lead_distribution`
3. Read-only mode recommended for safety: Connection → SQL Editor → Read-only connection

### Production — Supabase Studio (Recommended)
1. Create Supabase project
2. Point connection string to Supabase PostgreSQL
3. Use built-in Table Editor and SQL Editor
4. Role-based access control built-in

### Alternative — Retool (No-code Admin)
1. Connect Retool to PostgreSQL
2. Build tables/forms using drag-and-drop
3. No custom code needed
4. Good for non-technical operators

---

## 3. Minimal Admin Panel MVP — Feature Set

### Required Features

#### 3.1 Lead Management
| Feature | Priority | Description |
|---------|----------|-------------|
| View all leads (table) | CRITICAL | Sortable, filterable by status/city/date |
| View lead detail | CRITICAL | Full info + assignment history |
| Filter by status | CRITICAL | new/assigned/accepted/completed/unassigned |
| Filter by city | HIGH | Dropdown from cities list |
| Filter by date range | HIGH | From/to date pickers |
| Manual status override | HIGH | Cancel, force-complete, reopen |
| Manual reassign | MEDIUM | Select worker from dropdown |
| Export to CSV | LOW | Date-range export of leads |

#### 3.2 Worker Management
| Feature | Priority | Description |
|---------|----------|-------------|
| View all workers | CRITICAL | Table with active/inactive status |
| Add worker | CRITICAL | Name, phone, Telegram ID, city, priority |
| Edit worker | CRITICAL | Update any field |
| Deactivate/activate | CRITICAL | Toggle is_active |
| View worker's active leads | MEDIUM | Leads currently assigned to worker |
| Worker performance stats | LOW | Acceptance rate, avg response time |

#### 3.3 City Management
| Feature | Priority | Description |
|---------|----------|-------------|
| View all cities | HIGH | List with worker count |
| Add city | HIGH | Name, delivery type, surcharge |
| Edit city | MEDIUM | Update delivery settings |
| Toggle city active | MEDIUM | Enable/disable city for lead intake |

#### 3.4 Dashboard
| Widget | Priority |
|--------|----------|
| Today's lead count | CRITICAL |
| Leads by status (pie/bar) | HIGH |
| Unassigned leads alert | CRITICAL |
| Active workers count | HIGH |
| Avg assignment response time | MEDIUM |

---

## 4. Admin Panel Architecture

### Option A: Separate HTML Page (Simplest — Recommended for MVP)

```
/client/admin.html          — Admin SPA (vanilla JS)
/client/admin.js            — API calls to /api/leads, /api/workers, etc.
/client/admin.css           — Admin styles

Backend:                    — Existing API endpoints (with auth)
```

**Stack:** Vanilla JS + Tailwind CSS (same as existing frontend)  
**Auth:** Bearer token stored in localStorage (dev) → HttpOnly cookie (prod)  
**Deployment:** Same Express server serves admin.html at `/admin`  

**Flow:**
1. Admin navigates to `https://your-domain.com/admin`
2. Login form → POST credentials → receive token → store in localStorage
3. All API calls include `Authorization: Bearer {token}`

### Option B: Separate React/Vue Admin (Medium complexity)

```
/admin-frontend/            — Separate React SPA
  src/
    pages/
      Leads.jsx
      Workers.jsx
      Cities.jsx
      Dashboard.jsx
    components/
      LeadTable.jsx
      WorkerForm.jsx
    api/
      apiClient.js
```

**Deploy separately on Vercel.**  
**Pros:** Better UX, component reuse, React ecosystem  
**Cons:** More setup, separate deployment, more dependencies

### Option C: Third-party Admin Tool (Zero development)

- **Retool:** Connect to PostgreSQL directly, build tables in 1 hour
- **Appsmith:** Open-source Retool alternative
- **Supabase Studio:** If DB is on Supabase — free, built-in admin UI

**Recommended for MVP:** Option C (Supabase) or Option A (simple HTML page)

---

## 5. Roles & Security Model

### Roles

| Role | Access |
|------|--------|
| Admin | Full access: read/write all resources, manage workers, override leads |
| Operator | Read-only for leads and workers; can cancel leads; cannot manage workers |

### Current Auth Model (Planned)
- Single `ADMIN_TOKEN` in `.env` — **no role differentiation**
- All admin endpoints check the same token
- No user accounts, no login session management

### Recommended Security Improvements (Without Rewriting)
1. Add `OPERATOR_TOKEN` to `.env` for read-only access
2. Admin endpoints check `ADMIN_TOKEN`; read-only endpoints check either token
3. For production: replace with proper session-based auth (JWT + refresh tokens)

### Security Checklist for Admin Panel
- [ ] HTTPS only (admin over HTTP is dangerous)
- [ ] Token never logged in server logs
- [ ] Admin HTML not served to public without auth check
- [ ] Rate limit admin login attempts
- [ ] CSRF protection if using cookies
- [ ] Input sanitization on all admin forms (prevent XSS)
- [ ] Admin actions logged with timestamp

---

## 6. API Usage by Admin Panel

All admin panel operations use existing planned API:

```javascript
// List leads
GET /api/leads?status=unassigned&page=1

// Cancel a lead
PATCH /api/leads/42/status { "status": "canceled" }

// Add a worker
POST /api/workers { "name": "...", "city_id": 1, "priority": 8 }

// Deactivate a worker
PATCH /api/workers/3 { "is_active": false }

// All with header:
Authorization: Bearer {ADMIN_TOKEN}
```

---

## 7. Implementation Phases

### Phase 1 — API Layer (prerequisite)
- Implement all planned API endpoints
- Add Bearer token middleware
- Test with cURL

### Phase 2 — Minimal Admin HTML Page
- `admin.html` with login form
- Lead table with status filter
- Worker list with add/edit form
- Basic dashboard counts

### Phase 3 — Enhanced Admin
- Assignment history view
- Manual reassign UI
- City management
- CSV export

### Phase 4 — Role-based Auth
- Two roles: admin / operator
- JWT-based login session
- Audit log table

---

## 8. Recommended Tech Stack for Admin Panel

| Component | Recommendation | Reason |
|-----------|---------------|--------|
| Frontend | Vanilla JS (Phase 1), React (Phase 2+) | Consistent with existing stack |
| CSS | Tailwind CSS | Already used in main frontend |
| Table | AG Grid Community (free) or simple HTML table | Sorting, filtering built-in |
| Charts | Chart.js | Lightweight, no dependencies |
| Auth | localStorage token (Phase 1), HttpOnly JWT (Phase 2) | Progressive enhancement |
| Hosting | Same Express server (Phase 1), Vercel (Phase 2) | Simplest path first |
