import { describe, expect, it } from 'vitest';
import { emptyWorkerForm, validateWorkerForm, workerToForm, type WorkerFormValues } from './validation';
import type { Worker } from './types';

const valid: WorkerFormValues = {
  ...emptyWorkerForm,
  name: '  Іван Петренко ',
  city_id: '1',
  telegram_chat_id: '197656058',
  phone: '+380671234567',
};

function errorsOf(values: Partial<WorkerFormValues>) {
  const r = validateWorkerForm({ ...valid, ...values });
  if (r.ok) throw new Error('expected validation to fail');
  return r.errors;
}

describe('validateWorkerForm', () => {
  it('builds a typed payload from valid input', () => {
    const r = validateWorkerForm(valid);
    expect(r).toEqual({
      ok: true,
      payload: {
        name: 'Іван Петренко',
        city_id: 1,
        telegram_chat_id: '197656058',
        phone: '+380671234567',
        equipment_type: 'motoblock',
        priority: 0,
        is_active: true,
      },
    });
  });

  it('defaults: empty form is active motoblock with priority 0', () => {
    expect(emptyWorkerForm).toMatchObject({ equipment_type: 'motoblock', priority: '0', is_active: true });
  });

  it('requires name, city and telegram id', () => {
    const r = validateWorkerForm(emptyWorkerForm);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(['city_id', 'name', 'telegram_chat_id']);
  });

  it('rejects whitespace-only and over-long names', () => {
    expect(errorsOf({ name: '   ' }).name).toBeTruthy();
    expect(errorsOf({ name: 'x'.repeat(101) }).name).toBeTruthy();
  });

  it('accepts negative telegram ids (groups) and trims them', () => {
    const r = validateWorkerForm({ ...valid, telegram_chat_id: ' -1001234567890 ' });
    expect(r.ok && r.payload.telegram_chat_id).toBe('-1001234567890');
  });

  it.each(['12a', '1.5', '1e5', '-', '0'])('rejects telegram id %s', (id) => {
    expect(errorsOf({ telegram_chat_id: id }).telegram_chat_id).toBeTruthy();
  });

  it('turns empty phone into null and limits length', () => {
    const r = validateWorkerForm({ ...valid, phone: '  ' });
    expect(r.ok && r.payload.phone).toBeNull();
    expect(errorsOf({ phone: '1'.repeat(21) }).phone).toBeTruthy();
  });

  it.each(['-1', '1.5', 'abc', ''])('rejects priority %s', (p) => {
    expect(errorsOf({ priority: p }).priority).toBeTruthy();
  });
});

describe('workerToForm', () => {
  it('round-trips an API worker into editable form values', () => {
    const w: Worker = {
      id: 7,
      name: 'Петро',
      phone: null,
      telegram_chat_id: '22334455',
      city_id: 3,
      city_name: 'Харків',
      equipment_type: 'tractor',
      priority: 5,
      is_active: false,
      last_assigned_at: null,
      created_at: '2026-11-01T10:00:00Z',
    };
    expect(workerToForm(w)).toEqual({
      name: 'Петро',
      city_id: '3',
      telegram_chat_id: '22334455',
      phone: '',
      equipment_type: 'tractor',
      priority: '5',
      is_active: false,
    });
  });
});
