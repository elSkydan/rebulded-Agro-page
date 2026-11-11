import { describe, expect, it } from 'vitest';
import { formatArea, formatKyivDateTime, formatMoney } from './format';
import { leadWorkerLabel } from './types';

describe('formatKyivDateTime', () => {
  it('renders in Europe/Kyiv regardless of the runtime zone', () => {
    expect(formatKyivDateTime('2026-11-11T12:05:00Z')).toBe('11.11 14:05'); // EET, UTC+2
    expect(formatKyivDateTime('2026-07-01T21:30:00Z')).toBe('02.07 00:30'); // EEST, UTC+3
  });

  it('shows the year when it is not the current one', () => {
    const now = new Date('2026-11-11T12:00:00Z');
    expect(formatKyivDateTime('2025-12-31T10:00:00Z', now)).toBe('31.12.2025 12:00');
  });
});

describe('formatMoney', () => {
  it('rounds and groups thousands', () => {
    expect(formatMoney('1800.00')).toBe('1 800 грн');
    expect(formatMoney(12345.6)).toBe('12 346 грн');
    expect(formatMoney('950')).toBe('950 грн');
  });
});

describe('formatArea', () => {
  it('drops a trailing .0 and uses a decimal comma', () => {
    expect(formatArea('6.0')).toBe('6 сот.');
    expect(formatArea('6.5')).toBe('6,5 сот.');
  });
});

describe('leadWorkerLabel', () => {
  it('hides stale workers on unassigned / new / canceled', () => {
    expect(leadWorkerLabel({ status: 'unassigned', worker_name: 'Skydan' })).toBe('—');
    expect(leadWorkerLabel({ status: 'new', worker_name: 'Skydan' })).toBe('—');
    expect(leadWorkerLabel({ status: 'canceled', worker_name: 'Skydan' })).toBe('—');
  });

  it('shows the current worker on assigned / accepted', () => {
    expect(leadWorkerLabel({ status: 'assigned', worker_name: 'Іван' })).toBe('Іван');
    expect(leadWorkerLabel({ status: 'accepted', worker_name: null })).toBe('—');
  });
});
