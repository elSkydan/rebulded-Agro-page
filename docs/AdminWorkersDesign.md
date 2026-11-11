# Admin: Workers — Design

> Status: approved for implementation (MVP, phase 1 of [AdminPanel.md](AdminPanel.md))
> Scope: manage workers (виконавці) from the browser. Leads/cities UI is out of scope.

## 1. Goals / non-goals

**Goals**
- An operator can add, edit, deactivate/activate and delete workers without curl/Swagger.
- Zero new infrastructure: lives in the existing Next.js app at `/admin`, talks to the
  existing Express API through the existing `/api/*` rewrite (same origin, no CORS).
- Safe by default: failures are explicit, destructive actions need a second step.

**Non-goals (later phases)**
- Per-user accounts / roles / audit log (needs backend sessions — phase 4).
- Leads table, cities CRUD, dashboard.

## 2. Architecture

```
Browser /admin (client component)
  │  Authorization: Bearer <ADMIN_TOKEN>   (token kept in sessionStorage)
  ▼
Next.js rewrite /api/:path*  ──►  Express  /api/workers, /api/cities  (auth middleware)
                                            │
                                            ▼
                                        PostgreSQL
```

Frontend modules (`frontend/src`):

| Module | Responsibility | Pure? |
|---|---|---|
| `lib/admin/types.ts` | `Worker`, `City`, `WorkerInput`, `EquipmentType` | — |
| `lib/admin/validation.ts` | form state → validated API payload or field errors | yes |
| `lib/admin/api.ts` | typed client: `listWorkers/createWorker/updateWorker/deleteWorker/listCities`, maps HTTP → `AdminApiError` | fetch only |
| `lib/admin/token-store.ts` | sessionStorage get/set/clear, never throws | — |
| `components/admin/AdminApp.tsx` | state machine: `login` ⇄ `workers`; logs out on any 401 | — |
| `components/admin/LoginForm.tsx` | token input, verifies by calling `listWorkers` | — |
| `components/admin/WorkersPanel.tsx` | table/cards, toggle active, open dialog | — |
| `components/admin/WorkerDialog.tsx` | create/edit form + two-step delete | — |
| `app/admin/page.tsx` | server page: `noindex,nofollow` metadata, renders `<AdminApp/>` | — |

Why a client component and not Server Actions: the token must never be baked into the
frontend server environment (frontend service on Render has no `ADMIN_TOKEN`, and should
not); the browser holding the token and calling the API directly keeps the trust boundary
exactly where it already is — the Express `auth` middleware.

## 3. Security decisions

| Risk | Decision |
|---|---|
| Token theft via persistent storage | `sessionStorage` (dies with the tab), not `localStorage`. Input is `type=password`, `autocomplete=off`. |
| Indexing of `/admin` | `robots: noindex,nofollow` metadata + `Disallow: /admin` in `robots.ts`; not in sitemap; no links from the public site. |
| **`ADMIN_TOKEN` defaults to `'change-me'`** in `config/config.js` — if the env var is ever missing, the admin API is open with a public password | Default becomes `''` → `auth` already rejects empty token (fail closed). `validateEnv` warns when `ADMIN_TOKEN` is missing, a placeholder, or shorter than 32 chars (warning, not exit — must not take prod down on deploy). |
| Leaking DB internals | Backend maps PG errors to safe messages (see §4); UI shows `error` text only. |
| XSS | React escaping only; no `dangerouslySetInnerHTML` in admin. |
| Accidental data loss | Primary action is **Deactivate** (`is_active=false`). Delete is inside the edit dialog, requires a second confirm, and the copy says it erases the worker's assignment history (`lead_assignments` cascade, `leads.worker_id` → NULL). |

## 4. Backend changes (small, contract-compatible)

1. `GET /api/workers` returns the full row the UI needs:
   `id, name, phone, telegram_chat_id, city_id, city_name, equipment_type, priority, is_active, last_assigned_at, created_at`.
   Note: `telegram_chat_id` is `BIGINT` → `pg` returns it as **string**; the UI treats it as string.
2. New `server/utils/dbErrors.js` → `mapDbError(err)` used by `POST`/`PATCH` workers:

   | PG code | HTTP | `code` | message |
   |---|---|---|---|
   | `23505` unique (telegram_chat_id) | 409 | `DUPLICATE` | Worker with this telegram_chat_id already exists |
   | `23503` FK (city_id) | 400 | `CITY_NOT_FOUND` | City not found |
   | `23514` check (priority ≥ 0) | 400 | `INVALID_INPUT` | Invalid value |
   | `22P02` bad enum / int | 400 | `INVALID_INPUT` | Invalid value |
   | `22001` too long | 400 | `INVALID_INPUT` | Value too long |
   | other | 500 | — | Database error |
3. Fail-closed admin token (see §3).

## 5. UI

Language: Ukrainian (same as the site). Visual language: site palette (`primary #3e7b31`),
white cards on `gray-50`, rounded-xl, Tailwind only.

```
┌──────────────────────────────────────────────────────────────┐
│ Agro Aggregator · Адмінка                          [Вийти]  │
├──────────────────────────────────────────────────────────────┤
│ Виконавці (5)                             [+ Додати]        │
│ ┌──────────┬────────┬──────────────┬───────────┬────┬──────┐ │
│ │ Ім'я     │ Місто  │ Телефон      │ Telegram  │Пр. │Статус│ │
│ ├──────────┼────────┼──────────────┼───────────┼────┼──────┤ │
│ │ Іван     │ Харків │ +38067…      │ 19765605  │ 5  │[●Акт]│✎│
│ │ Петро ⚙Т │ Харків │ —            │ 22334455  │ 0  │[○Неа]│✎│
│ └──────────┴────────┴──────────────┴───────────┴────┴──────┘ │
└──────────────────────────────────────────────────────────────┘
  < md: rows render as stacked cards with the same actions.
```

Login (no token in session):

```
        ┌────────────────────────────┐
        │ Вхід в адмінку              │
        │ Адмін-токен [••••••••••]    │
        │ [Увійти]                    │
        │ ⚠ Невірний токен            │
        └────────────────────────────┘
```

Dialog (create / edit), `role="dialog" aria-modal`, Esc / Скасувати closes:

| Field | Control | Rule |
|---|---|---|
| Ім'я* | text | trimmed, 1–100 |
| Місто* | select from `GET /api/cities` | required |
| Telegram chat ID* | text, inputmode numeric | integer, may be negative (groups); hint: «дізнатися через @userinfobot» |
| Телефон | tel | optional, ≤ 20 |
| Техніка | select Мотоблок / Трактор | default Мотоблок |
| Пріоритет | number | integer ≥ 0, default 0 («більше — раніше в черзі») |
| Активний | checkbox | default on |

Edit mode only: «Видалити виконавця» → inline confirm «Видалити назавжди? Історія
призначень буде втрачена. Краще деактивувати.» [Так, видалити] [Ні].

States: loading skeleton text «Завантаження…», empty state «Ще немає виконавців»,
error banner with «Спробувати ще раз», 409 shown on the Telegram field.

Behaviour rules:
- Any 401 → clear token, back to login with «Сесія недійсна, увійдіть знову».
- Status toggle is optimistic-free: button disabled while PATCH in flight, row updated from the response.
- After create/edit the row is replaced/inserted from the API response (no refetch).

## 6. Test plan (written before the code)

Frontend — Vitest + React Testing Library (per `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`):

- `validation.test.ts` — required fields; name trim/length; telegram id integer incl. negative, rejects `12a`, `1.5`; priority ≥ 0 integer; empty phone → `null`; builds typed payload.
- `api.test.ts` — sends `Bearer` header + JSON; 401 → `AdminApiError{code:'UNAUTHORIZED'}`; 409 keeps server message/code; 502/503/504 → `BAD_GATEWAY`; network failure → `NETWORK_ERROR`; `DELETE` 204 resolves without parsing a body.
- `AdminApp.test.tsx` (fetch mocked at the boundary):
  - no token → login form; wrong token → error, stays on login; right token → table with workers and city names, token saved to session.
  - stored token → goes straight to table.
  - 401 while loading → back to login with message, token cleared.
  - add worker → POST payload correct → row appears, dialog closes.
  - 409 on create → message under Telegram field, dialog stays open.
  - toggle active → `PATCH {is_active:false}` → row shows «Неактивний».
  - edit → PATCH only changed form → row updated.
  - delete needs two clicks → `DELETE` → row removed.
  - logout clears token.

Backend — `node:test` (existing runner):

- `test/dbErrors.test.js` — mapping table in §4.
- `test/workersRoute.test.js` — real Express router on an ephemeral port with `db/pool` and config stubbed via `require.cache`: GET selects the full column list; POST duplicate → 409; POST bad city → 400; no token → 401.
- `test/adminToken.test.js` — config default is empty; `validateEnv` warns on missing / placeholder / short token.

## 7. Rollout

1. Merge → Render deploys backend and frontend.
2. Check `ADMIN_TOKEN` is set on `lead-distribution-api` (Render → Environment) and is ≥ 32 random chars; rotate if it was ever shared in chat.
3. Open `https://agro-aggregator.com.ua/admin`, log in, add a test worker, deactivate, delete.

---

## 8. Phase 1b — Leads tab + summary

Goal: the operator sees what came in, what is stuck without a worker, and can cancel junk/duplicates.
The admin opens on **Заявки** (most used); **Виконавці** is the second tab.

### Backend changes

| Endpoint | Change | Why |
|---|---|---|
| `GET /api/leads` | add `city_name`, `out_of_city`, `comment`, `phone_raw` to the list; `status` must be a valid `lead_status_enum` value → else `400 INVALID_STATUS` | list is useless without city/comment; a bad status used to reach PG and return 500 |
| `GET /api/leads/debug/stats` | add `unassigned_leads` (status `unassigned`) and `today_leads` (since 00:00 Europe/Kyiv); existing fields unchanged | "stuck" leads are the KPI that matters |
| `PATCH /api/leads/:id/cancel` | single conditional `UPDATE … WHERE status = ANY(cancelable) RETURNING` instead of read-then-write | race: a worker could accept between the read and the write and the cancel would overwrite `accepted` |

Telegram side needs no change: a worker pressing a button on a canceled lead already gets
"This lead was canceled." (`INVALID_TRANSITION`).

### UI

```
[ Заявки ] [ Виконавці ]                                         [↻]
┌ Сьогодні 4 ┐┌ Очікують 2 ┐┌ Без виконавця 1 (red if >0) ┐┌ Активні виконавці 3 ┐
Заявки (37)                                  Статус: [Усі ▾]
#41 · 11.11 14:05 · Нова
  Олена · +380671112233 (tel:)       Огород / вспашка · 6 сот. · 1 800 грн
  Харків (за містом)                 Виконавець: —
  «Комментар клієнта…»                                     [Скасувати]
…
                         [Показати ще]
```

- Cancel only for `new | assigned | timeout | unassigned` (mirrors backend); inline confirm «Скасувати заявку #41?» [Так] [Ні].
- After cancel: row badge → «Скасована», summary refetched.
- Status `unassigned` always clears `worker_id`; list/API hide worker for `unassigned|new|canceled` so the row never shows «Без виконавця» + a name.
- Summary tiles show `0` (not «—») once stats have loaded; «Без виконавця» = `COUNT(status = unassigned)`.
- Page size 50, «Показати ще» appends (offset), hidden when all loaded.
- Dates in Europe/Kyiv regardless of the browser zone; money formatted `1 800 грн`.

### Tests (before code)

- Backend `test/leadsRoute.test.js`: invalid status → 400 without touching DB; list selects city/comment;
  stats returns new fields; cancel is one atomic UPDATE; 404 for missing; 400 `INVALID_TRANSITION` when already accepted.
- Frontend: `format.test.ts` (Kyiv time, money, area); `api.test.ts` (query string, cancel, stats);
  `AdminApp.test.tsx` (default tab, summary, filter → request, cancel flow + stats refresh, no cancel for accepted,
  load more, tel link, switching to workers).

---

## 9. Phase 1c — Manual lead assign («Призначення»)

Goal: the operator can pick a concrete worker for a stuck / new / mistargeted lead
without waiting for auto-distribution. Uses the same assignment pipeline (DB + Telegram).

### Backend

`POST /api/leads/:id/assign` `{ "worker_id": number }` — admin auth.

| HTTP | When | `code` |
|---|---|---|
| 200 | assigned | — |
| 400 | body missing/invalid `worker_id`; lead status not assignable; worker inactive; already that worker | `INVALID_INPUT` / `INVALID_TRANSITION` / `INVALID_WORKER` / `ALREADY_ASSIGNED` |
| 404 | lead or worker missing | — |
| 409 | conditional UPDATE lost a race (accepted/canceled in parallel) | `CONFLICT` |

Assignable lead statuses (must be able to reach `assigned` via the state machine):
`new | unassigned | timeout | assigned | rejected`.

Not assignable: `accepted | completed | canceled | failed_contact`.

Service `assignLeadToWorker(leadId, workerId)` (in `assignmentService`):

1. `BEGIN` → `SELECT lead … FOR UPDATE OF l` (join city for Telegram payload).
2. Validate status ∈ assignable; load worker; require `is_active`.
3. Close previous send: `UPDATE lead_assignments SET status='timeout' WHERE lead_id AND status='sent'`
   (clears the pending timeout clock for the previous worker).
4. Upsert assignment for the target worker as `sent`
   (`ON CONFLICT (lead_id, worker_id) DO UPDATE` — allows re-trying a previously tried worker).
5. Conditional `UPDATE leads SET status='assigned', worker_id, last_sent_worker_id, updated_at=NOW()
   WHERE id AND status = ANY(assignable) RETURNING …` → 0 rows → `409 CONFLICT`.
6. `UPDATE workers.last_assigned_at`, `COMMIT`.
7. After commit: `sendLeadToWorker` (same as `assignLead`; Telegram failure does not roll back).

Response body for the UI row patch:
`{ lead_id, status: 'assigned', worker_id, worker_name }`.

### UI

On each assignable row: **Призначити** → inline panel:

```
Призначити заявку #41
Виконавець: [ Іван (Харків) · Мотоблок ▾ ]   ← active same-city first, then other active; inactive disabled
[Призначити] [Скасувати]
```

- Worker list from `GET /api/workers` (loaded once when the panel first opens assign).
- Sort: active + same `city_id` → active other cities → inactive (disabled).
- After success: row shows «Призначена» + worker name; summary refetch.
- No button for non-assignable statuses; cancel + assign can coexist (e.g. `new`/`assigned`/`timeout`).
- Touch targets ≥ 44px for confirm / deny / assign actions (mobile).

### Tests (before code)

- Backend `test/leadsRoute.test.js`: POST assign happy path calls service; 400 bad body / inactive;
  404 missing; service error `statusCode` mapped; auth required.
- Backend `test/assignmentService.test.js` (or dedicated): marks previous `sent` → `timeout`;
  upserts assignment; conditional lead UPDATE; rejects bad status / inactive worker.
- Frontend: `api.test.ts` POSTs `{worker_id}`; `AdminApp.leads.test.tsx` — assign flow updates row + stats;
  no «Призначити» on `accepted`; worker select prefers city mates.
