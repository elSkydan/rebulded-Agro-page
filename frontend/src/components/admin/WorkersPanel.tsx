'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { AdminApiError, createAdminApi } from '@/lib/admin/api';
import { EQUIPMENT_LABELS, type City, type Worker } from '@/lib/admin/types';
import { WorkerDialog } from './WorkerDialog';

interface Props {
  token: string;
  onUnauthorized: () => void;
}

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' };

type DialogState = { mode: 'create' } | { mode: 'edit'; worker: Worker } | null;

/** Shared by the header and every row so columns line up; minmax(0,…) stops content from widening tracks. */
const GRID =
  'md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_3.5rem_12.5rem_2.25rem] md:items-center md:gap-4';

export function WorkersPanel({ token, onUnauthorized }: Props) {
  const api = useMemo(() => createAdminApi(token), [token]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [dialog, setDialog] = useState<DialogState>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(new Set());
  const [banner, setBanner] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof AdminApiError && err.code === 'UNAUTHORIZED') {
        onUnauthorized();
        return null;
      }
      return err instanceof AdminApiError ? err.message : fallback;
    },
    [onUnauthorized],
  );

  const fetchAll = useCallback(async () => {
    try {
      const [w, c] = await Promise.all([api.listWorkers(), api.listCities()]);
      setWorkers(w);
      setCities(c);
      setLoad({ status: 'ready' });
    } catch (err) {
      const message = handleError(err, 'Не вдалося завантажити дані');
      if (message) setLoad({ status: 'error', message });
    }
  }, [api, handleError]);

  useEffect(() => {
    // Data fetch on mount; state is set asynchronously after the requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAll();
  }, [fetchAll]);

  function retry() {
    setLoad({ status: 'loading' });
    void fetchAll();
  }

  function upsert(saved: Worker) {
    setWorkers((list) =>
      list.some((w) => w.id === saved.id) ? list.map((w) => (w.id === saved.id ? saved : w)) : [...list, saved],
    );
  }

  /** PATCH/POST responses don't join the city — fill it from the loaded list. */
  function withCityName(w: Worker): Worker {
    return { ...w, city_name: cities.find((c) => c.id === w.city_id)?.name ?? w.city_name ?? null };
  }

  async function toggleActive(worker: Worker) {
    setBanner(null);
    setPendingIds((s) => new Set(s).add(worker.id));
    try {
      upsert(withCityName(await api.updateWorker(worker.id, { is_active: !worker.is_active })));
    } catch (err) {
      const message = handleError(err, 'Не вдалося змінити статус');
      if (message) setBanner(message);
    } finally {
      setPendingIds((s) => {
        const next = new Set(s);
        next.delete(worker.id);
        return next;
      });
    }
  }

  if (load.status === 'loading') {
    return <p className="text-gray-500">Завантаження…</p>;
  }

  if (load.status === 'error') {
    return (
      <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center justify-between gap-4">
        <span>{load.message}</span>
        <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 font-semibold hover:underline">
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Спробувати ще раз
        </button>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Виконавці ({workers.length})</h1>
        <button
          type="button"
          onClick={() => setDialog({ mode: 'create' })}
          aria-label="Додати виконавця"
          className="shrink-0 inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-semibold min-h-11 px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span className="sm:hidden">Додати</span>
          <span className="hidden sm:inline">Додати виконавця</span>
        </button>
      </div>

      {banner && (
        <p role="alert" className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {banner}
        </p>
      )}

      {workers.length === 0 ? (
        <p className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">
          Ще немає виконавців
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className={`hidden ${GRID} px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500`} aria-hidden="true">
            <span>Ім&apos;я</span>
            <span>Місто</span>
            <span>Телефон</span>
            <span>Telegram ID</span>
            <span>Техніка</span>
            <span>Пріор.</span>
            <span>Статус</span>
            <span />
          </div>
          <ul className="divide-y divide-gray-100">
            {workers.map((w) => (
              <li
                key={w.id}
                aria-label={w.name}
                className={`${GRID} relative px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm`}
              >
                <span className="col-span-2 md:col-span-1 pr-10 md:pr-0 font-semibold text-gray-900 text-base md:text-sm truncate">
                  {w.name}
                </span>
                <span className="text-gray-700">{w.city_name ?? '—'}</span>
                <span className="text-gray-700 tabular-nums truncate">{w.phone ?? '—'}</span>
                <span className="text-gray-500 tabular-nums truncate">
                  <MobileLabel>TG </MobileLabel>
                  <span>{w.telegram_chat_id}</span>
                </span>
                <span className="text-gray-700">{EQUIPMENT_LABELS[w.equipment_type]}</span>
                <span className="text-gray-700 tabular-nums" title="Пріоритет">
                  <MobileLabel>Пріоритет </MobileLabel>
                  <span>{w.priority}</span>
                </span>
                <span className="col-span-2 md:col-span-1 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 md:pt-0">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      w.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {w.is_active ? 'Активний' : 'Неактивний'}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleActive(w)}
                    disabled={pendingIds.has(w.id)}
                    className="min-h-11 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {w.is_active ? 'Деактивувати' : 'Активувати'}
                  </button>
                </span>
                <span className="absolute top-3 right-3 md:static flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDialog({ mode: 'edit', worker: w })}
                    aria-label="Редагувати"
                    title="Редагувати"
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dialog && (
        <WorkerDialog
          key={dialog.mode === 'edit' ? dialog.worker.id : 'new'}
          worker={dialog.mode === 'edit' ? dialog.worker : null}
          cities={cities}
          api={api}
          onClose={() => setDialog(null)}
          onSaved={(saved) => {
            upsert(withCityName(saved));
            setDialog(null);
          }}
          onDeleted={(id) => {
            setWorkers((list) => list.filter((w) => w.id !== id));
            setDialog(null);
          }}
          onUnauthorized={onUnauthorized}
        />
      )}
    </section>
  );
}

/** Inline caption shown only in the stacked (mobile) card layout. */
function MobileLabel({ children }: { children: string }) {
  return <span className="md:hidden text-gray-400">{children}</span>;
}
