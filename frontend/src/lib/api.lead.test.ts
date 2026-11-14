import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createLead } from './api';
import { clearPendingLead, readPendingLead } from './leadQueue';

afterEach(() => {
  clearPendingLead();
  vi.unstubAllGlobals();
});

const payload = {
  name: 'Олена',
  phone: '+380671112233',
  service_type: 'ogorod' as const,
  area: 6,
  city_id: 1,
  out_of_city: false,
};

describe('createLead resilience', () => {
  it('queues the payload on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(createLead(payload)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(readPendingLead()).toEqual(payload);
  });

  it('queues the payload on 502 and keeps a BAD_GATEWAY error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })),
    );
    const err = await createLead(payload).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 502, code: 'BAD_GATEWAY' });
    expect(readPendingLead()).toEqual(payload);
  });

  it('does not queue on skipQueue when flushing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(createLead(payload, { skipQueue: true })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
    expect(readPendingLead()).toBeNull();
  });
});
