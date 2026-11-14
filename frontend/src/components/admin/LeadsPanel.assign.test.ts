import { describe, expect, it } from 'vitest';
import { AdminApiError } from '@/lib/admin/api';
import { assignLeadErrorMessage, workersForAssignPicker } from './LeadsPanel';
import { makeLead, makeWorker } from './fakeBackend';

describe('assignLeadErrorMessage', () => {
  it('maps ALREADY_ASSIGNED to Ukrainian', () => {
    expect(
      assignLeadErrorMessage(
        new AdminApiError('Lead is already assigned to this worker', 400, 'ALREADY_ASSIGNED'),
        'fallback',
      ),
    ).toBe('Ця заявка вже призначена цьому виконавцю');
  });
});

describe('workersForAssignPicker', () => {
  it('excludes the current assignee on assigned leads', () => {
    const workers = [
      makeWorker({ id: 1, name: 'Іван', city_id: 1, is_active: true }),
      makeWorker({ id: 2, name: 'Петро', city_id: 1, is_active: true }),
    ];
    const lead = makeLead({ status: 'assigned', worker_id: 1, worker_name: 'Іван', city_id: 1 });
    expect(workersForAssignPicker(workers, lead).map((w) => w.id)).toEqual([2]);
  });

  it('keeps all workers when the lead is unassigned', () => {
    const workers = [
      makeWorker({ id: 1, name: 'Іван', city_id: 1, is_active: true }),
      makeWorker({ id: 2, name: 'Петро', city_id: 1, is_active: true }),
    ];
    const lead = makeLead({ status: 'unassigned', worker_id: 1, worker_name: 'Іван', city_id: 1 });
    expect(workersForAssignPicker(workers, lead).map((w) => w.id)).toEqual([1, 2]);
  });
});
