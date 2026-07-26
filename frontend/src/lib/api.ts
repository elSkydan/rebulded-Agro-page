import type { ServiceType } from './pricing';

/**
 * API client for the Express backend.
 * Requests go to the same origin (`/api/*`) and are proxied to the
 * backend by the rewrite configured in next.config.ts — no CORS needed.
 */

export interface CreateLeadPayload {
  name: string;
  phone: string;
  service_type: ServiceType;
  area: number;
  city_id: number;
  out_of_city: boolean;
  comment?: string;
}

export interface CreateLeadResponse {
  lead_id: number;
  total_price: number;
  status: string;
  assigned: boolean;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function createLead(
  payload: CreateLeadPayload,
): Promise<CreateLeadResponse> {
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      data?.error ?? `Request failed with status ${res.status}`,
      res.status,
      data?.code,
    );
  }

  return data as CreateLeadResponse;
}
