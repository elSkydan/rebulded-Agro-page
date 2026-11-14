import type { ServiceType } from './pricing';
import { enqueuePendingLead } from './leadQueue';

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

export interface PublicCity {
  id: number;
  name: string;
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

async function readJsonSafe(res: Response): Promise<Record<string, unknown> | null> {
  return res.json().catch(() => null);
}

function gatewayUnavailable(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

function rememberForRetry(payload: CreateLeadPayload): void {
  enqueuePendingLead(payload);
}

export async function createLead(
  payload: CreateLeadPayload,
  options: { skipQueue?: boolean } = {},
): Promise<CreateLeadResponse> {
  let res: Response;
  try {
    res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    if (!options.skipQueue) rememberForRetry(payload);
    throw new ApiError(
      "Немає зв'язку з сервером. Заявку збережено на цьому пристрої — надішлемо, щойно сервіс оживає.",
      0,
      'NETWORK_ERROR',
    );
  }

  const data = await readJsonSafe(res);

  if (!res.ok) {
    if (gatewayUnavailable(res.status)) {
      if (!options.skipQueue) rememberForRetry(payload);
      throw new ApiError(
        'Сервіс заявок тимчасово недоступний. Заявку збережено на цьому пристрої — спробуємо ще раз автоматично.',
        res.status,
        'BAD_GATEWAY',
      );
    }
    throw new ApiError(
      typeof data?.error === 'string' ? data.error : `Request failed with status ${res.status}`,
      res.status,
      typeof data?.code === 'string' ? data.code : undefined,
    );
  }

  return data as unknown as CreateLeadResponse;
}

/** Public cities for the lead-form region select. */
export async function fetchPublicCities(): Promise<PublicCity[]> {
  let res: Response;
  try {
    res = await fetch('/api/cities/public', { method: 'GET' });
  } catch {
    throw new ApiError("Немає зв'язку з сервером.", 0, 'NETWORK_ERROR');
  }

  const data = await readJsonSafe(res);

  if (!res.ok) {
    if (gatewayUnavailable(res.status)) {
      throw new ApiError('Сервіс міст тимчасово недоступний.', res.status, 'BAD_GATEWAY');
    }
    throw new ApiError('Не вдалося завантажити список міст.', res.status);
  }

  if (!Array.isArray(data)) {
    throw new ApiError('Некоректна відповідь списку міст.', res.status);
  }

  return data as unknown as PublicCity[];
}
