# API.md — Full API Documentation

> **Basis:** server.js (route imports, middleware setup) + BUSINESS_LOGIC.md + main.js (frontend calls)  
> **Status:** server.js defines routes but route handlers are NOT YET IMPLEMENTED.  
> **Base URL:** `http://localhost:3000` (dev) | `https://your-domain.com` (prod)

---

## Authentication

Admin endpoints require Bearer token:
```
Authorization: Bearer {ADMIN_TOKEN}
```
`ADMIN_TOKEN` is set in `.env`. Returns `401 Unauthorized` if missing or invalid.

Public endpoints (lead submission, city list, Telegram webhook) require no auth.

---

## Rate Limiting

- Applied to: `POST /api/leads`
- Window: 60,000ms (1 minute)
- Max requests: 5 per IP
- Response on exceed: `429 Too Many Requests`

---

## Endpoints

---

### `GET /health`

**Description:** Server health check. Verifies process is alive (DB check not implemented).

**Auth:** None

**Request:** No body

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-03T12:00:00.000Z"
}
```

**Errors:** None expected

---

### `GET /api/cities/public`

**Description:** Returns list of active cities for the lead submission form dropdown.

**Auth:** None

**Request:** No body

**Response 200:**
```json
[
  { "id": 1, "name": "Київ" },
  { "id": 2, "name": "Харків" },
  { "id": 3, "name": "Одеса" }
]
```

**Errors:**
| Code | Reason |
|------|--------|
| 500 | DB connection failure |

---

### `POST /api/leads`

**Description:** Submit a new service request (lead) from a client.

**Auth:** None (rate limited: 5/min/IP)

**Request Body:**
```json
{
  "name": "Іван Іванов",           // optional, string
  "phone": "+38(067) 902-03-26",   // REQUIRED, min 10 digits
  "city_id": 1,                    // REQUIRED, integer (from /api/cities/public)
  "service_type": "ogorod",        // REQUIRED, enum: ogorod|celina|mowing|tree|washing
  "area": 5.5,                     // optional (required for area-based services), float
  "out_of_city": false,            // optional, boolean, default false
  "comment": "Будь ласка, зранку" // optional, string
}
```

**Validation rules:**
- `phone`: strip non-digits → must be ≥10 digits → normalized to `+380XXXXXXXXX`
- `city_id`: must exist in `cities` table
- `service_type`: must be one of the 5 valid values
- `area`: required for ogorod/celina/mowing; must be > 0

**Anti-spam logic:**
- Same phone within 10 minutes:
  - If existing lead is `new` or `assigned` → UPDATE existing (not INSERT)
  - If existing lead is in terminal state → INSERT new lead

**Response 201:**
```json
{
  "lead_id": 42,
  "status": "assigned",
  "estimated_price": 1650,
  "message": "Ваш запит прийнято! Майстер зв'яжеться з вами найближчим часом."
}
```

**Errors:**
| Code | Body | Reason |
|------|------|--------|
| 400 | `{"error": "phone is required"}` | Missing phone |
| 400 | `{"error": "invalid service_type"}` | Unknown service |
| 400 | `{"error": "city_id is required"}` | Missing city |
| 400 | `{"error": "area must be positive"}` | Invalid area |
| 429 | `{"error": "Too many requests"}` | Rate limit hit |
| 500 | `{"error": "Internal server error"}` | DB or Telegram failure |

---

### `GET /api/leads` (Admin)

**Description:** List all leads with filtering and pagination.

**Auth:** Bearer token required

**Query Parameters:**
```
?status=assigned        // filter by status
?city_id=1             // filter by city
?page=1                // pagination (default: 1)
?limit=50              // items per page (default: 50, max: 200)
?from=2026-01-01       // date range start (ISO 8601)
?to=2026-05-03         // date range end
```

**Response 200:**
```json
{
  "total": 142,
  "page": 1,
  "limit": 50,
  "data": [
    {
      "id": 42,
      "name": "Іван Іванов",
      "phone_normalized": "+380679020326",
      "city": "Київ",
      "service_type": "ogorod",
      "area": 5.5,
      "out_of_city": false,
      "total_price": 1650,
      "status": "assigned",
      "worker": "Петро Коваль",
      "created_at": "2026-05-03T10:30:00Z",
      "updated_at": "2026-05-03T10:30:05Z"
    }
  ]
}
```

**Errors:**
| Code | Reason |
|------|--------|
| 401 | Missing/invalid auth token |
| 500 | DB error |

---

### `GET /api/leads/:id` (Admin)

**Description:** Get a single lead with full assignment history.

**Auth:** Bearer token required

**Response 200:**
```json
{
  "id": 42,
  "name": "Іван Іванов",
  "phone_normalized": "+380679020326",
  "city": { "id": 1, "name": "Київ" },
  "service_type": "ogorod",
  "area": 5.5,
  "out_of_city": false,
  "comment": "Будь ласка, зранку",
  "total_price": 1650,
  "status": "accepted",
  "worker": { "id": 3, "name": "Петро Коваль" },
  "created_at": "2026-05-03T10:30:00Z",
  "updated_at": "2026-05-03T10:33:00Z",
  "assignment_history": [
    { "worker": "Микола Сидоренко", "status": "rejected", "at": "2026-05-03T10:30:05Z" },
    { "worker": "Петро Коваль", "status": "accepted", "at": "2026-05-03T10:33:00Z" }
  ]
}
```

**Errors:**
| Code | Reason |
|------|--------|
| 401 | Not authenticated |
| 404 | Lead not found |
| 500 | DB error |

---

### `PATCH /api/leads/:id/status` (Admin)

**Description:** Manually change a lead's status (admin override).

**Auth:** Bearer token required

**Request Body:**
```json
{
  "status": "canceled"   // target status
}
```

**Allowed manual transitions:**
- Any status → `canceled`
- `unassigned` → `assigned` (manual reassignment triggers reassignment flow)

**Response 200:**
```json
{
  "id": 42,
  "status": "canceled",
  "updated_at": "2026-05-03T11:00:00Z"
}
```

**Errors:**
| Code | Reason |
|------|--------|
| 400 | Invalid status transition |
| 401 | Not authenticated |
| 404 | Lead not found |

---

### `GET /api/workers` (Admin)

**Description:** List all workers.

**Auth:** Bearer token required

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "Петро Коваль",
    "phone": "+380671234567",
    "telegram_chat_id": 123456789,
    "city": { "id": 1, "name": "Київ" },
    "priority": 10,
    "is_active": true,
    "last_assigned_at": "2026-05-03T09:00:00Z",
    "created_at": "2026-04-01T00:00:00Z"
  }
]
```

---

### `POST /api/workers` (Admin)

**Description:** Create a new worker.

**Auth:** Bearer token required

**Request Body:**
```json
{
  "name": "Іван Мельник",          // REQUIRED
  "phone": "+380671234567",         // optional
  "telegram_chat_id": 987654321,    // optional (required for Telegram notifications)
  "city_id": 1,                     // REQUIRED
  "priority": 7                     // optional, 1-10, default 5
}
```

**Response 201:**
```json
{
  "id": 5,
  "name": "Іван Мельник",
  "city_id": 1,
  "priority": 7,
  "is_active": true,
  "created_at": "2026-05-03T12:00:00Z"
}
```

**Errors:**
| Code | Reason |
|------|--------|
| 400 | Missing name or city_id |
| 400 | priority out of 1-10 range |
| 401 | Not authenticated |
| 409 | telegram_chat_id already registered |

---

### `PATCH /api/workers/:id` (Admin)

**Description:** Update worker settings (deactivate, change priority, update Telegram ID).

**Auth:** Bearer token required

**Request Body (all optional):**
```json
{
  "name": "Updated Name",
  "phone": "+380679999999",
  "telegram_chat_id": 111222333,
  "city_id": 2,
  "priority": 5,
  "is_active": false
}
```

**Response 200:**
```json
{
  "id": 1,
  "name": "Updated Name",
  "is_active": false,
  "updated": true
}
```

---

### `GET /api/cities` (Admin)

**Description:** List all cities (including inactive ones for admin).

**Auth:** Bearer token required

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "Київ",
    "delivery_type": "both",
    "delivery_price": 800,
    "is_active": true,
    "worker_count": 3
  }
]
```

---

### `POST /api/cities` (Admin)

**Description:** Add a new city.

**Auth:** Bearer token required

**Request Body:**
```json
{
  "name": "Львів",               // REQUIRED
  "delivery_type": "both",       // optional: 'in_city'|'out_of_city'|'both'
  "delivery_price": 800          // optional, integer UAH
}
```

**Response 201:**
```json
{ "id": 4, "name": "Львів", "delivery_type": "both", "delivery_price": 800 }
```

---

### `POST /api/telegram/webhook`

**Description:** Receives updates from Telegram Bot API. Called by Telegram servers only.

**Auth:** None (validated via chat_id ownership check internally)  
**Note:** Should be secured with `X-Telegram-Bot-Api-Secret-Token` header (not yet implemented).

**Request Body (from Telegram):**
```json
{
  "update_id": 100000001,
  "callback_query": {
    "id": "ABC123",
    "from": { "id": 123456789, "first_name": "Petro" },
    "data": "{\"l\":42,\"w\":7,\"a\":\"accept\"}",
    "message": { ... }
  }
}
```

**Response 200:**
```json
{ "ok": true }
```
(Telegram requires 200 within 60 seconds or retries the update)

**Internal processing:**
1. Parse `callback_query.data` as JSON
2. Validate `from.id` matches `workers.telegram_chat_id` for worker_id
3. Call `assignmentService.updateStatus(lead_id, worker_id, action)`
4. Call Telegram API: `answerCallbackQuery`

---

## Error Response Format (Standard)

```json
{
  "error": "Human-readable error message",
  "field": "phone",              // optional — field that caused error
  "code": "VALIDATION_ERROR"    // optional — machine-readable error code
}
```

---

## cURL Examples

### Submit a lead:
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Тест Тестович",
    "phone": "0679020326",
    "city_id": 1,
    "service_type": "ogorod",
    "area": 5
  }'
```

### Create a worker (admin):
```bash
curl -X POST http://localhost:3000/api/workers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{
    "name": "Іван Мельник",
    "telegram_chat_id": 123456789,
    "city_id": 1,
    "priority": 8
  }'
```

### List unassigned leads (admin):
```bash
curl http://localhost:3000/api/leads?status=unassigned \
  -H "Authorization: Bearer your-admin-token"
```
