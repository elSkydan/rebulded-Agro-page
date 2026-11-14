import { afterEach, describe, expect, it } from 'vitest';
import {
  PENDING_LEAD_KEY,
  clearPendingLead,
  enqueuePendingLead,
  readPendingLead,
} from './leadQueue';
import type { CreateLeadPayload } from './api';

const sample: CreateLeadPayload = {
  name: 'Олена',
  phone: '+380671112233',
  service_type: 'ogorod',
  area: 6,
  city_id: 1,
  out_of_city: false,
};

afterEach(() => {
  clearPendingLead();
});

describe('leadQueue', () => {
  it('stores and reads a pending lead', () => {
    enqueuePendingLead(sample);
    expect(readPendingLead()).toEqual(sample);
    expect(localStorage.getItem(PENDING_LEAD_KEY)).toBeTruthy();
  });

  it('clears the pending lead', () => {
    enqueuePendingLead(sample);
    clearPendingLead();
    expect(readPendingLead()).toBeNull();
  });

  it('keeps the latest payload when enqueued twice', () => {
    enqueuePendingLead(sample);
    enqueuePendingLead({ ...sample, name: 'Іван' });
    expect(readPendingLead()?.name).toBe('Іван');
  });
});
