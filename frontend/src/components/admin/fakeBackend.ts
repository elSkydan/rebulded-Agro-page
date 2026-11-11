/**
 * Test helper: in-memory stand-in for the Express admin API, mounted at the
 * fetch boundary with vi.stubGlobal. Not a test file itself.
 */
import { vi } from 'vitest';
import type { City, Lead, LeadStats, Worker } from '@/lib/admin/types';

export const TOKEN = 'good-token';

export const cities: City[] = [
  { id: 1, name: 'Харків' },
  { id: 2, name: 'Мерефа' },
];

export function makeWorker(overrides: Partial<Worker> = {}): Worker {
  return {
    id: 1,
    name: 'Іван',
    phone: '+380671234567',
    telegram_chat_id: '197656058',
    city_id: 1,
    city_name: 'Харків',
    equipment_type: 'motoblock',
    priority: 5,
    is_active: true,
    last_assigned_at: null,
    created_at: '2026-11-01T10:00:00Z',
    ...overrides,
  };
}

export function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 41,
    name: 'Олена',
    phone_normalized: '+380671112233',
    phone_raw: '067 111 22 33',
    service_type: 'ogorod',
    area: '6.0',
    total_price: '1800.00',
    city_id: 1,
    city_name: 'Харків',
    out_of_city: false,
    status: 'new',
    comment: null,
    created_at: '2026-11-11T12:05:00Z',
    updated_at: '2026-11-11T12:05:00Z',
    worker_id: null,
    worker_name: null,
    ...overrides,
  };
}

export const defaultStats: LeadStats = {
  total_leads: 37,
  active_workers: 3,
  pending_leads: 2,
  unassigned_leads: 1,
  today_leads: 4,
};

export interface Call {
  method: string;
  url: string;
  body?: Record<string, unknown>;
}

interface Options {
  workers?: Worker[];
  leads?: Lead[];
  stats?: LeadStats;
  /** Non-GET requests answer with this instead of succeeding. */
  failWith?: { status: number; body: object };
}

const CANCELABLE = new Set(['new', 'assigned', 'timeout', 'unassigned']);
const ASSIGNABLE = new Set(['new', 'unassigned', 'timeout', 'assigned', 'rejected']);

export function fakeBackend(opts: Options = {}) {
  let workers = [...(opts.workers ?? [])];
  const leads = [...(opts.leads ?? [])];
  const stats = { ...(opts.stats ?? defaultStats) };
  let nextId = 100;
  const calls: Call[] = [];

  const json = (status: number, body: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, body });

    const auth = new Headers(init.headers).get('Authorization');
    if (auth !== `Bearer ${TOKEN}`) return json(401, { error: 'Unauthorized', code: 'INVALID_TOKEN' });
    if (opts.failWith && method !== 'GET') return json(opts.failWith.status, opts.failWith.body);

    const { pathname, searchParams } = new URL(url, 'http://localhost');

    if (pathname === '/api/cities' && method === 'GET') return json(200, cities);

    if (pathname === '/api/leads/stats' || pathname === '/api/leads/debug/stats') return json(200, stats);
    if (pathname === '/api/leads' && method === 'GET') {
      const status = searchParams.get('status');
      const limit = Number(searchParams.get('limit') ?? 50);
      const offset = Number(searchParams.get('offset') ?? 0);
      const filtered = status ? leads.filter((l) => l.status === status) : leads;
      return json(200, { total: filtered.length, limit, offset, data: filtered.slice(offset, offset + limit) });
    }
    const cancel = pathname.match(/^\/api\/leads\/(\d+)\/cancel$/);
    if (cancel && method === 'PATCH') {
      const lead = leads.find((l) => l.id === Number(cancel[1]));
      if (!lead) return json(404, { error: 'Lead not found' });
      if (!CANCELABLE.has(lead.status)) return json(400, { error: 'Cannot cancel', code: 'INVALID_TRANSITION' });
      lead.status = 'canceled';
      stats.pending_leads = Math.max(0, stats.pending_leads - 1);
      return json(200, { lead_id: lead.id, status: 'canceled' });
    }
    const assign = pathname.match(/^\/api\/leads\/(\d+)\/assign$/);
    if (assign && method === 'POST') {
      const lead = leads.find((l) => l.id === Number(assign[1]));
      if (!lead) return json(404, { error: 'Lead not found' });
      if (!ASSIGNABLE.has(lead.status)) return json(400, { error: 'Cannot assign', code: 'INVALID_TRANSITION' });
      const worker = workers.find((w) => w.id === Number(body?.worker_id));
      if (!worker) return json(404, { error: 'Worker not found' });
      if (!worker.is_active) return json(400, { error: 'Worker is inactive', code: 'INVALID_WORKER' });
      const wasUnassigned = lead.status === 'unassigned';
      lead.status = 'assigned';
      lead.worker_id = worker.id;
      lead.worker_name = worker.name;
      if (wasUnassigned) stats.unassigned_leads = Math.max(0, stats.unassigned_leads - 1);
      return json(200, {
        lead_id: lead.id,
        status: 'assigned',
        worker_id: worker.id,
        worker_name: worker.name,
      });
    }

    if (pathname === '/api/workers' && method === 'GET') return json(200, workers);
    if (pathname === '/api/workers' && method === 'POST') {
      const w = makeWorker({
        ...body,
        id: nextId++,
        city_name: cities.find((c) => c.id === body.city_id)?.name ?? null,
      });
      workers.push(w);
      return json(201, w);
    }
    const m = pathname.match(/^\/api\/workers\/(\d+)$/);
    if (m) {
      const id = Number(m[1]);
      const existing = workers.find((w) => w.id === id);
      if (!existing) return json(404, { error: 'Worker not found' });
      if (method === 'PATCH') {
        const updated = {
          ...existing,
          ...body,
          city_name: cities.find((c) => c.id === (body.city_id ?? existing.city_id))?.name ?? null,
        };
        workers = workers.map((w) => (w.id === id ? updated : w));
        return json(200, updated);
      }
      if (method === 'DELETE') {
        workers = workers.filter((w) => w.id !== id);
        return new Response(null, { status: 204 });
      }
    }
    return json(404, { error: 'not found' });
  });

  vi.stubGlobal('fetch', fetchMock);
  return {
    calls,
    fetchMock,
    mutating: () => calls.filter((c) => c.method !== 'GET'),
    gets: (prefix: string) => calls.filter((c) => c.method === 'GET' && c.url.startsWith(prefix)),
  };
}
