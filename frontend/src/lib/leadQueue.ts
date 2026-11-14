import type { CreateLeadPayload } from './api';

/**
 * Persist a lead when the API is unreachable so we can retry after recovery.
 * One pending payload at a time (latest wins) — enough for a single form session.
 */

export const PENDING_LEAD_KEY = 'agro_pending_lead_v1';

interface PendingLeadRecord {
  payload: CreateLeadPayload;
  savedAt: string;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function enqueuePendingLead(payload: CreateLeadPayload): void {
  if (!canUseStorage()) return;
  const record: PendingLeadRecord = { payload, savedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(PENDING_LEAD_KEY, JSON.stringify(record));
  } catch {
    // Quota / private mode — ignore; the user still sees the error toast.
  }
}

export function readPendingLead(): CreateLeadPayload | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(PENDING_LEAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingLeadRecord;
    if (!parsed?.payload || typeof parsed.payload !== 'object') return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

export function clearPendingLead(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(PENDING_LEAD_KEY);
  } catch {
    // ignore
  }
}
