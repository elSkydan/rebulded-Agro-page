import { describe, expect, it, vi } from 'vitest';
import { AdminApiError, createAdminApi } from './api';

function jsonResponse(status: number, body: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createAdminApi', () => {
  it('sends the bearer token and JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { id: 1 }));
    const api = createAdminApi('secret', fetchMock);

    await api.createWorker({
      name: 'Іван',
      city_id: 1,
      telegram_chat_id: '123',
      phone: null,
      equipment_type: 'motoblock',
      priority: 0,
      is_active: true,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/workers');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer secret',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init.body)).toMatchObject({ name: 'Іван', telegram_chat_id: '123' });
  });

  it('PATCHes /api/workers/:id with only the given fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: 5 }));
    await createAdminApi('t', fetchMock).updateWorker(5, { is_active: false });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/workers/5');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ is_active: false });
  });

  it('DELETE resolves on 204 without parsing a body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await expect(createAdminApi('t', fetchMock).deleteWorker(3)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/workers/3');
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('lists workers and cities', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, [{ id: 1 }]))
      .mockResolvedValueOnce(jsonResponse(200, [{ id: 2, name: 'Харків' }]));
    const api = createAdminApi('t', fetchMock);
    expect(await api.listWorkers()).toEqual([{ id: 1 }]);
    expect(await api.listCities()).toEqual([{ id: 2, name: 'Харків' }]);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['/api/workers', '/api/cities']);
  });

  it('lists leads with paging and an optional status filter', async () => {
    const page = { total: 0, limit: 50, offset: 0, data: [] };
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(200, page));
    const api = createAdminApi('t', fetchMock);

    expect(await api.listLeads({ limit: 50, offset: 0 })).toEqual(page);
    await api.listLeads({ status: 'unassigned', limit: 50, offset: 100 });

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/api/leads?limit=50&offset=0',
      '/api/leads?status=unassigned&limit=50&offset=100',
    ]);
  });

  it('cancels a lead and reads the summary', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { lead_id: 5, status: 'canceled' }))
      .mockResolvedValueOnce(jsonResponse(200, { total_leads: 1 }));
    const api = createAdminApi('t', fetchMock);

    await api.cancelLead(5);
    const stats = await api.getStats();

    expect(fetchMock.mock.calls[0][0]).toBe('/api/leads/5/cancel');
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/leads/debug/stats');
    // Missing keys become 0 so the summary never shows "—" for a loaded payload.
    expect(stats).toEqual({
      total_leads: 1,
      active_workers: 0,
      pending_leads: 0,
      unassigned_leads: 0,
      today_leads: 0,
    });
  });

  it('assigns a lead with worker_id in the body', async () => {
    const payload = { lead_id: 41, status: 'assigned' as const, worker_id: 2, worker_name: 'Іван' };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, payload));
    const result = await createAdminApi('t', fetchMock).assignLead(41, 2);

    expect(result).toEqual(payload);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/leads/41/assign');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ worker_id: 2 });
  });

  it('maps 401 to UNAUTHORIZED', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, { error: 'Unauthorized', code: 'INVALID_TOKEN' }));
    const err = await createAdminApi('bad', fetchMock).listWorkers().catch((e) => e);
    expect(err).toBeInstanceOf(AdminApiError);
    expect(err).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  });

  it('keeps server message and code for 409', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(409, { error: 'Worker with this telegram_chat_id already exists', code: 'DUPLICATE' }));
    const err = await createAdminApi('t', fetchMock).updateWorker(1, { name: 'x' }).catch((e) => e);
    expect(err).toMatchObject({ status: 409, code: 'DUPLICATE' });
    expect(err.message).toMatch(/already exists/);
  });

  it.each([502, 503, 504])('maps %i to BAD_GATEWAY', async (status) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('<html>', { status }));
    const err = await createAdminApi('t', fetchMock).listWorkers().catch((e) => e);
    expect(err).toMatchObject({ status, code: 'BAD_GATEWAY' });
  });

  it('maps a non-JSON 500 (Next proxy cannot reach the backend) to BAD_GATEWAY', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('Internal Server Error', { status: 500 }));
    const err = await createAdminApi('t', fetchMock).listWorkers().catch((e) => e);
    expect(err).toMatchObject({ status: 500, code: 'BAD_GATEWAY' });
    expect(err.message).toBe('Сервер тимчасово недоступний, спробуйте за хвилину');
  });

  it('keeps a JSON 500 from the API as a server error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, { error: 'Database error' }));
    const err = await createAdminApi('t', fetchMock).listWorkers().catch((e) => e);
    expect(err).toMatchObject({ status: 500, message: 'Database error' });
    expect(err.code).toBeUndefined();
  });

  it('maps fetch failures to NETWORK_ERROR', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await createAdminApi('t', fetchMock).listWorkers().catch((e) => e);
    expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
