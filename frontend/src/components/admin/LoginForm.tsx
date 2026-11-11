'use client';

import { useId, useState, type FormEvent } from 'react';
import { AdminApiError, createAdminApi } from '@/lib/admin/api';

interface Props {
  notice: string | null;
  onLogin: (token: string) => void;
}

export function LoginForm({ notice, onLogin }: Props) {
  const inputId = useId();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = token.trim();
    if (!value) {
      setError('Вкажіть токен');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Verify against the API before persisting anything.
      await createAdminApi(value).listWorkers();
      onLogin(value);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Не вдалося увійти');
      setBusy(false);
    }
  }

  const message = error ?? notice;

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-sm mx-auto mt-12 bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
    >
      <h1 className="text-xl font-bold text-gray-900 mb-5">Вхід в адмінку</h1>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
        Адмін-токен
      </label>
      <input
        id={inputId}
        type="password"
        autoComplete="off"
        spellCheck={false}
        autoFocus
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
      />
      {message && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
      >
        {busy ? 'Перевіряємо…' : 'Увійти'}
      </button>
    </form>
  );
}
