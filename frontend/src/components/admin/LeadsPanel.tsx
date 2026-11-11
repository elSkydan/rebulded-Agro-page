'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquareText, Phone, RefreshCw } from 'lucide-react';
import { AdminApiError, createAdminApi } from '@/lib/admin/api';
import { formatArea, formatKyivDateTime, formatMoney } from '@/lib/admin/format';
import {
  CANCELABLE_LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  type Lead,
  type LeadStats,
  type LeadStatus,
} from '@/lib/admin/types';

interface Props {
  token: string;
  onUnauthorized: () => void;
}

export const LEADS_PAGE_SIZE = 50;

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' };

const STATUS_BADGE: Record<LeadStatus, string> = {
  unassigned: 'bg-red-100 text-red-800',
  new: 'bg-amber-100 text-amber-800',
  assigned: 'bg-amber-100 text-amber-800',
  timeout: 'bg-amber-100 text-amber-800',
  accepted: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-gray-100 text-gray-600',
  canceled: 'bg-gray-100 text-gray-600',
  failed_contact: 'bg-gray-100 text-gray-600',
};

export function LeadsPanel({ token, onUnauthorized }: Props) {
  const api = useMemo(() => createAdminApi(token), [token]);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  /** Guards against an older (slower) response overwriting a newer filter's results. */
  const requestSeq = useRef(0);

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

  const fetchStats = useCallback(async () => {
    try {
      setStats(await api.getStats());
    } catch (err) {
      // The summary is secondary: surface auth problems, otherwise keep the list usable.
      handleError(err, '');
    }
  }, [api, handleError]);

  const fetchFirstPage = useCallback(
    async (status: LeadStatus | '') => {
      const seq = ++requestSeq.current;
      try {
        const page = await api.listLeads({ status: status || undefined, limit: LEADS_PAGE_SIZE, offset: 0 });
        if (seq !== requestSeq.current) return;
        setLeads(page.data);
        setTotal(page.total);
        setLoad({ status: 'ready' });
      } catch (err) {
        if (seq !== requestSeq.current) return;
        const message = handleError(err, 'Не вдалося завантажити заявки');
        if (message) setLoad({ status: 'error', message });
      }
    },
    [api, handleError],
  );

  useEffect(() => {
    // Initial fetch; state is only set after the requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchFirstPage('');
    void fetchStats();
  }, [fetchFirstPage, fetchStats]);

  function changeFilter(next: LeadStatus | '') {
    setStatusFilter(next);
    setConfirmId(null);
    setLoad({ status: 'loading' });
    void fetchFirstPage(next);
  }

  function refresh() {
    setBanner(null);
    setConfirmId(null);
    setLoad({ status: 'loading' });
    void fetchFirstPage(statusFilter);
    void fetchStats();
  }

  async function loadMore() {
    const seq = requestSeq.current;
    setLoadingMore(true);
    try {
      const page = await api.listLeads({
        status: statusFilter || undefined,
        limit: LEADS_PAGE_SIZE,
        offset: leads.length,
      });
      if (seq !== requestSeq.current) return;
      setLeads((list) => {
        const seen = new Set(list.map((l) => l.id));
        return [...list, ...page.data.filter((l) => !seen.has(l.id))];
      });
      setTotal(page.total);
    } catch (err) {
      const message = handleError(err, 'Не вдалося завантажити заявки');
      if (message) setBanner(message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function cancelLead(id: number) {
    setBanner(null);
    setCancelingId(id);
    try {
      await api.cancelLead(id);
      setLeads((list) => list.map((l) => (l.id === id ? { ...l, status: 'canceled' } : l)));
      setConfirmId(null);
      void fetchStats();
    } catch (err) {
      const message = handleError(err, 'Не вдалося скасувати заявку');
      if (message) setBanner(message);
      setConfirmId(null);
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <section>
      <StatsBar stats={stats} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">
          Заявки{load.status === 'ready' ? ` (${total})` : ''}
        </h1>
        <div className="flex items-center gap-2">
          <label htmlFor="lead-status-filter" className="text-sm font-medium text-gray-600">
            Статус
          </label>
          <select
            id="lead-status-filter"
            value={statusFilter}
            onChange={(e) => changeFilter(e.target.value as LeadStatus | '')}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">Усі</option>
            {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={refresh}
            aria-label="Оновити"
            title="Оновити"
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {banner && (
        <p role="alert" className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {banner}
        </p>
      )}

      {load.status === 'loading' && <p className="text-gray-500">Завантаження…</p>}

      {load.status === 'error' && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center justify-between gap-4">
          <span>{load.message}</span>
          <button type="button" onClick={refresh} className="font-semibold hover:underline">
            Спробувати ще раз
          </button>
        </div>
      )}

      {load.status === 'ready' &&
        (leads.length === 0 ? (
          <p className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">
            Заявок немає
          </p>
        ) : (
          <>
            <ul className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
              {leads.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  confirming={confirmId === lead.id}
                  canceling={cancelingId === lead.id}
                  onAskCancel={() => setConfirmId(lead.id)}
                  onConfirmCancel={() => cancelLead(lead.id)}
                  onDeclineCancel={() => setConfirmId(null)}
                />
              ))}
            </ul>
            {leads.length < total && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-5 py-2.5 rounded-xl font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                >
                  {loadingMore ? 'Завантаження…' : 'Показати ще'}
                </button>
              </div>
            )}
          </>
        ))}
    </section>
  );
}

function StatsBar({ stats }: { stats: LeadStats | null }) {
  const tiles: { label: string; value: number | undefined; alert?: boolean }[] = [
    { label: 'Сьогодні', value: stats?.today_leads },
    { label: 'Очікують', value: stats?.pending_leads },
    { label: 'Без виконавця', value: stats?.unassigned_leads, alert: (stats?.unassigned_leads ?? 0) > 0 },
    { label: 'Активні виконавці', value: stats?.active_workers },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {tiles.map((t) => (
        <div
          key={t.label}
          role="group"
          aria-label={t.label}
          className={`rounded-2xl border p-4 ${t.alert ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
        >
          <p className={`text-xs font-medium ${t.alert ? 'text-red-700' : 'text-gray-500'}`}>{t.label}</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${t.alert ? 'text-red-700' : 'text-gray-900'}`}>
            {t.value ?? '—'}
          </p>
        </div>
      ))}
    </div>
  );
}

interface LeadRowProps {
  lead: Lead;
  confirming: boolean;
  canceling: boolean;
  onAskCancel: () => void;
  onConfirmCancel: () => void;
  onDeclineCancel: () => void;
}

function LeadRow({ lead, confirming, canceling, onAskCancel, onConfirmCancel, onDeclineCancel }: LeadRowProps) {
  const cancelable = CANCELABLE_LEAD_STATUSES.has(lead.status);
  return (
    <li aria-label={`Заявка #${lead.id}`} className="px-5 py-4 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
        <span className="font-semibold text-gray-900">#{lead.id}</span>
        <span className="text-gray-500 tabular-nums">{formatKyivDateTime(lead.created_at)}</span>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[lead.status]}`}>
          {LEAD_STATUS_LABELS[lead.status]}
        </span>
      </div>

      <div className="grid gap-x-6 gap-y-1 md:grid-cols-2">
        <p className="flex flex-wrap items-center gap-x-2">
          <span className="font-medium text-gray-900">{lead.name || 'Без імені'}</span>
          <a
            href={`tel:${lead.phone_normalized}`}
            className="inline-flex items-center gap-1 text-primary font-medium hover:underline tabular-nums"
          >
            <Phone className="w-3.5 h-3.5" aria-hidden="true" />
            {lead.phone_normalized}
          </a>
        </p>
        <p className="text-gray-700">
          {SERVICE_TYPE_LABELS[lead.service_type] ?? lead.service_type} · {formatArea(lead.area)} ·{' '}
          <span className="font-semibold text-gray-900">{formatMoney(lead.total_price)}</span>
        </p>
        <p className="text-gray-700">
          {lead.city_name ?? '—'}
          {lead.out_of_city ? ' · за містом' : ''}
        </p>
        <p className="text-gray-700">Виконавець: {lead.worker_name ?? '—'}</p>
      </div>

      {lead.comment && (
        <p className="mt-2 flex gap-1.5 text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <MessageSquareText className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
          <span className="break-words">{lead.comment}</span>
        </p>
      )}

      {cancelable && (
        <div className="mt-3">
          {confirming ? (
            <div className="inline-flex flex-wrap items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-800">
              <span>Скасувати заявку #{lead.id}?</span>
              <button
                type="button"
                onClick={onConfirmCancel}
                disabled={canceling}
                className="px-3 py-1 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
              >
                Так
              </button>
              <button
                type="button"
                onClick={onDeclineCancel}
                disabled={canceling}
                className="px-3 py-1 rounded-lg font-semibold hover:bg-red-100"
              >
                Ні
              </button>
            </div>
          ) : (
            <button type="button" onClick={onAskCancel} className="text-sm font-medium text-red-600 hover:underline">
              Скасувати
            </button>
          )}
        </div>
      )}
    </li>
  );
}
