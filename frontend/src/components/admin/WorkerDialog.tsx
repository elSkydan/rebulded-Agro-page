'use client';

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { AdminApiError, type AdminApi } from '@/lib/admin/api';
import { EQUIPMENT_LABELS, type City, type EquipmentType, type Worker } from '@/lib/admin/types';
import {
  diffWorkerInput,
  emptyWorkerForm,
  validateWorkerForm,
  workerToForm,
  type WorkerFieldErrors,
  type WorkerFormValues,
} from '@/lib/admin/validation';

interface Props {
  /** `null` → create mode. */
  worker: Worker | null;
  cities: City[];
  api: AdminApi;
  onClose: () => void;
  onSaved: (worker: Worker) => void;
  onDeleted: (id: number) => void;
  onUnauthorized: () => void;
}

const SERVER_FIELD_ERRORS: Record<string, { field: keyof WorkerFormValues; message: string }> = {
  DUPLICATE: { field: 'telegram_chat_id', message: 'Виконавець з таким Telegram ID вже існує' },
  CITY_NOT_FOUND: { field: 'city_id', message: 'Місто не знайдено' },
};

const inputClass =
  'w-full rounded-xl border border-gray-300 px-3 py-2.5 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none aria-[invalid=true]:border-red-400';

export function WorkerDialog({ worker, cities, api, onClose, onSaved, onDeleted, onUnauthorized }: Props) {
  const titleId = useId();
  const isEdit = worker !== null;
  const [values, setValues] = useState<WorkerFormValues>(() => (worker ? workerToForm(worker) : emptyWorkerForm));
  const [errors, setErrors] = useState<WorkerFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  function set<K extends keyof WorkerFormValues>(key: K, value: WorkerFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function fail(err: unknown, fallback: string) {
    if (err instanceof AdminApiError) {
      if (err.code === 'UNAUTHORIZED') return onUnauthorized();
      const mapped = err.code ? SERVER_FIELD_ERRORS[err.code] : undefined;
      if (mapped) return setErrors((e) => ({ ...e, [mapped.field]: mapped.message }));
      return setFormError(err.message);
    }
    setFormError(fallback);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const result = validateWorkerForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    let request: () => Promise<Worker>;
    if (worker) {
      const original = validateWorkerForm(workerToForm(worker));
      const patch = original.ok ? diffWorkerInput(original.payload, result.payload) : result.payload;
      if (Object.keys(patch).length === 0) return onClose();
      request = () => api.updateWorker(worker.id, patch);
    } else {
      request = () => api.createWorker(result.payload);
    }

    setBusy(true);
    try {
      onSaved(await request());
    } catch (err) {
      fail(err, 'Не вдалося зберегти');
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!worker) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.deleteWorker(worker.id);
      onDeleted(worker.id);
    } catch (err) {
      fail(err, 'Не вдалося видалити');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-gray-900/40" onClick={() => !busy && onClose()} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl"
      >
        <form onSubmit={handleSubmit} noValidate className="p-6">
          <div className="flex items-start justify-between mb-5">
            <h2 id={titleId} className="text-lg font-bold text-gray-900">
              {isEdit ? 'Редагувати виконавця' : 'Новий виконавець'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Закрити"
              className="p-1.5 -m-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ім'я" required error={errors.name} className="sm:col-span-2">
              {(id, invalid) => (
                <input
                  id={id}
                  autoFocus
                  aria-required
                  maxLength={100}
                  value={values.name}
                  onChange={(e) => set('name', e.target.value)}
                  aria-invalid={invalid}
                  className={inputClass}
                />
              )}
            </Field>

            <Field label="Місто" required error={errors.city_id}>
              {(id, invalid) => (
                <select
                  id={id}
                  aria-required
                  value={values.city_id}
                  onChange={(e) => set('city_id', e.target.value)}
                  aria-invalid={invalid}
                  className={inputClass}
                >
                  <option value="">Оберіть місто</option>
                  {cities.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Техніка" error={errors.equipment_type}>
              {(id) => (
                <select
                  id={id}
                  value={values.equipment_type}
                  onChange={(e) => set('equipment_type', e.target.value as EquipmentType)}
                  className={inputClass}
                >
                  {(Object.keys(EQUIPMENT_LABELS) as EquipmentType[]).map((key) => (
                    <option key={key} value={key}>
                      {EQUIPMENT_LABELS[key]}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field
              label="Telegram chat ID"
              required
              error={errors.telegram_chat_id}
              hint="Дізнатися можна через @userinfobot"
            >
              {(id, invalid, describedBy) => (
                <input
                  id={id}
                  inputMode="numeric"
                  aria-required
                  autoComplete="off"
                  value={values.telegram_chat_id}
                  onChange={(e) => set('telegram_chat_id', e.target.value)}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  className={inputClass}
                />
              )}
            </Field>

            <Field label="Телефон" error={errors.phone}>
              {(id, invalid) => (
                <input
                  id={id}
                  type="tel"
                  maxLength={20}
                  placeholder="+380…"
                  value={values.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  aria-invalid={invalid}
                  className={inputClass}
                />
              )}
            </Field>

            <Field label="Пріоритет" error={errors.priority} hint="Більше — раніше в черзі">
              {(id, invalid, describedBy) => (
                <input
                  id={id}
                  type="number"
                  min={0}
                  step={1}
                  value={values.priority}
                  onChange={(e) => set('priority', e.target.value)}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  className={inputClass}
                />
              )}
            </Field>

            <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              Активний
            </label>
          </div>

          {formError && (
            <p role="alert" className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
              {formError}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl font-semibold text-gray-700 hover:bg-gray-100"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60"
            >
              Зберегти
            </button>
          </div>

          {isEdit && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              {confirmDelete ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
                  <p>Видалити назавжди? Історія призначень буде втрачена. Краще деактивувати.</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                    >
                      Так, видалити
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg font-semibold text-red-800 hover:bg-red-100"
                    >
                      Ні
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  Видалити виконавця
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: (id: string, invalid: boolean, describedBy: string | undefined) => ReactNode;
}

function Field({ label, required, error, hint, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={className}>
      {/* Asterisk via CSS so the accessible name stays exactly `label`; inputs carry aria-required. */}
      <label
        htmlFor={id}
        className={`block text-sm font-medium text-gray-700 mb-1.5 ${required ? "after:content-['_*'] after:text-red-500" : ''}`}
      >
        {label}
      </label>
      {children(id, Boolean(error), hint ? hintId : undefined)}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-1 text-xs text-gray-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
