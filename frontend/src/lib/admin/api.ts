import type { City, LeadStats, LeadStatus, LeadsPage, Worker, WorkerInput } from './types';

/**
 * Typed client for the admin endpoints of the Express API.
 * Same-origin `/api/*` — proxied to the backend by next.config.ts rewrites.
 */

export type AdminApiErrorCode = 'UNAUTHORIZED' | 'BAD_GATEWAY' | 'NETWORK_ERROR' | (string & {});

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: AdminApiErrorCode,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface AssignLeadResult {
  lead_id: number;
  status: 'assigned';
  worker_id: number;
  worker_name: string;
}

export interface AdminApi {
  listWorkers(): Promise<Worker[]>;
  createWorker(input: WorkerInput): Promise<Worker>;
  updateWorker(id: number, patch: Partial<WorkerInput>): Promise<Worker>;
  deleteWorker(id: number): Promise<void>;
  listCities(): Promise<City[]>;
  listLeads(query: LeadsQuery): Promise<LeadsPage>;
  cancelLead(id: number): Promise<void>;
  assignLead(id: number, workerId: number): Promise<AssignLeadResult>;
  getStats(): Promise<LeadStats>;
}

export interface LeadsQuery {
  status?: LeadStatus;
  limit: number;
  offset: number;
}

function leadsUrl({ status, limit, offset }: LeadsQuery): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return `/api/leads?${params}`;
}

export function createAdminApi(
  token: string,
  // Resolved lazily so tests (and polyfills) can replace global fetch.
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
): AdminApi {
  async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let res: Response;
    try {
      res = await fetchImpl(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
      });
    } catch {
      throw new AdminApiError("Немає зв'язку з сервером", 0, 'NETWORK_ERROR');
    }

    if (res.status === 204) return undefined as T;

    const data: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401) throw new AdminApiError('Невірний токен', 401, 'UNAUTHORIZED');
      // 502–504 from Render/Cloudflare, or a non-JSON 5xx from the Next proxy when the
      // backend is unreachable — both mean "API is down", not "API rejected the request".
      const gatewayDown = res.status === 502 || res.status === 503 || res.status === 504;
      if (gatewayDown || (res.status >= 500 && data === null)) {
        throw new AdminApiError('Сервер тимчасово недоступний, спробуйте за хвилину', res.status, 'BAD_GATEWAY');
      }
      const payload = (data ?? {}) as { error?: unknown; code?: unknown };
      throw new AdminApiError(
        typeof payload.error === 'string' ? payload.error : `Помилка сервера (${res.status})`,
        res.status,
        typeof payload.code === 'string' ? payload.code : undefined,
      );
    }

    return data as T;
  }

  return {
    listWorkers: () => request<Worker[]>('GET', '/api/workers'),
    createWorker: (input) => request<Worker>('POST', '/api/workers', input),
    updateWorker: (id, patch) => request<Worker>('PATCH', `/api/workers/${id}`, patch),
    deleteWorker: (id) => request<void>('DELETE', `/api/workers/${id}`),
    listCities: () => request<City[]>('GET', '/api/cities'),
    listLeads: (query) => request<LeadsPage>('GET', leadsUrl(query)),
    cancelLead: async (id) => {
      await request<unknown>('PATCH', `/api/leads/${id}/cancel`);
    },
    assignLead: (id, workerId) =>
      request<AssignLeadResult>('POST', `/api/leads/${id}/assign`, { worker_id: workerId }),
    getStats: async () => {
      const raw = await request<Partial<LeadStats>>('GET', '/api/leads/debug/stats');
      const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
      return {
        total_leads: n(raw.total_leads),
        active_workers: n(raw.active_workers),
        pending_leads: n(raw.pending_leads),
        unassigned_leads: n(raw.unassigned_leads),
        today_leads: n(raw.today_leads),
      };
    },
  };
}
