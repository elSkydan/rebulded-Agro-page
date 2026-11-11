'use client';

import { useState, useSyncExternalStore } from 'react';
import { LogOut } from 'lucide-react';
import { clearToken, readToken, saveToken, subscribeToken } from '@/lib/admin/token-store';
import { LeadsPanel } from './LeadsPanel';
import { LoginForm } from './LoginForm';
import { WorkersPanel } from './WorkersPanel';

/** `undefined` during SSR / before hydration — render nothing auth-dependent yet. */
const serverSnapshot = () => undefined;

type Tab = 'leads' | 'workers';

const TABS: { id: Tab; label: string }[] = [
  { id: 'leads', label: 'Заявки' },
  { id: 'workers', label: 'Виконавці' },
];

export function AdminApp() {
  const token = useSyncExternalStore(subscribeToken, readToken, serverSnapshot);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('leads');

  function handleLogin(newToken: string) {
    setNotice(null);
    saveToken(newToken);
  }

  function handleLogout() {
    setNotice(null);
    clearToken();
  }

  function handleUnauthorized() {
    setNotice('Сесія недійсна, увійдіть знову');
    clearToken();
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-14 py-2 flex items-center justify-between gap-3">
          <p className="font-bold text-gray-900 text-sm sm:text-base truncate">
            Agro Aggregator <span className="text-gray-400 font-medium">· Адмінка</span>
          </p>
          {token && (
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 min-h-11 px-3 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Вийти
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {token === undefined ? null : token ? (
          <>
            <div role="tablist" aria-label="Розділи" className="flex gap-1 mb-6 border-b border-gray-200">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`admin-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`admin-panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`-mb-px min-h-11 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`admin-panel-${tab}`} aria-labelledby={`admin-tab-${tab}`}>
              {tab === 'leads' ? (
                <LeadsPanel token={token} onUnauthorized={handleUnauthorized} />
              ) : (
                <WorkersPanel token={token} onUnauthorized={handleUnauthorized} />
              )}
            </div>
          </>
        ) : (
          <LoginForm notice={notice} onLogin={handleLogin} />
        )}
      </main>
    </div>
  );
}
