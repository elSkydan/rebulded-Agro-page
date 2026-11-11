/**
 * Admin token store.
 *
 * Persisted in sessionStorage: survives reloads, dies with the tab (never
 * localStorage). Storage can be unavailable (private mode, blocked site data),
 * so an in-memory copy is kept and nothing here throws.
 *
 * Exposes a subscribe/snapshot pair for React's useSyncExternalStore.
 */

export const TOKEN_STORAGE_KEY = 'agro.adminToken';

let memoryToken: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return memoryToken;
  }
}

export function saveToken(token: string): void {
  memoryToken = token;
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* in-memory only */
  }
  notify();
}

export function clearToken(): void {
  memoryToken = null;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
  notify();
}

export function subscribeToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
