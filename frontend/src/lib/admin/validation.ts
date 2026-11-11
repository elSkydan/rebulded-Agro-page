import type { EquipmentType, Worker, WorkerInput } from './types';

/** Raw, string-typed form state — exactly what the inputs hold. */
export interface WorkerFormValues {
  name: string;
  city_id: string;
  telegram_chat_id: string;
  phone: string;
  equipment_type: EquipmentType;
  priority: string;
  is_active: boolean;
}

export type WorkerFieldErrors = Partial<Record<keyof WorkerFormValues, string>>;

export type ValidationResult =
  | { ok: true; payload: WorkerInput }
  | { ok: false; errors: WorkerFieldErrors };

export const emptyWorkerForm: WorkerFormValues = {
  name: '',
  city_id: '',
  telegram_chat_id: '',
  phone: '',
  equipment_type: 'motoblock',
  priority: '0',
  is_active: true,
};

const NAME_MAX = 100;
const PHONE_MAX = 20;
/** Telegram chat ids are non-zero integers; groups/channels are negative. */
const TELEGRAM_ID = /^-?[1-9]\d{0,19}$/;
const NON_NEGATIVE_INT = /^\d+$/;

export function validateWorkerForm(values: WorkerFormValues): ValidationResult {
  const errors: WorkerFieldErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Вкажіть ім'я";
  else if (name.length > NAME_MAX) errors.name = `Не більше ${NAME_MAX} символів`;

  const cityId = Number(values.city_id);
  if (!values.city_id || !Number.isInteger(cityId) || cityId <= 0) errors.city_id = 'Оберіть місто';

  const telegramId = values.telegram_chat_id.trim();
  if (!telegramId) errors.telegram_chat_id = 'Вкажіть Telegram chat ID';
  else if (!TELEGRAM_ID.test(telegramId)) errors.telegram_chat_id = 'Лише ціле число, наприклад 197656058';

  const phone = values.phone.trim();
  if (phone.length > PHONE_MAX) errors.phone = `Не більше ${PHONE_MAX} символів`;

  const priority = values.priority.trim();
  if (!NON_NEGATIVE_INT.test(priority)) errors.priority = 'Ціле число від 0';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    payload: {
      name,
      city_id: cityId,
      telegram_chat_id: telegramId,
      phone: phone || null,
      equipment_type: values.equipment_type,
      priority: Number(priority),
      is_active: values.is_active,
    },
  };
}

export function workerToForm(worker: Worker): WorkerFormValues {
  return {
    name: worker.name,
    city_id: String(worker.city_id),
    telegram_chat_id: String(worker.telegram_chat_id),
    phone: worker.phone ?? '',
    equipment_type: worker.equipment_type,
    priority: String(worker.priority),
    is_active: worker.is_active,
  };
}

/** Fields of `next` that differ from `original` — PATCH sends only these. */
export function diffWorkerInput(original: WorkerInput, next: WorkerInput): Partial<WorkerInput> {
  const changed: Partial<WorkerInput> = {};
  for (const key of Object.keys(next) as (keyof WorkerInput)[]) {
    if (next[key] !== original[key]) {
      (changed as Record<string, unknown>)[key] = next[key];
    }
  }
  return changed;
}
