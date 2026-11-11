/** Contract with the Express admin API (`/api/workers`, `/api/cities`). */

export type EquipmentType = 'motoblock' | 'tractor';

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  motoblock: 'Мотоблок',
  tractor: 'Трактор',
};

export interface Worker {
  id: number;
  name: string;
  phone: string | null;
  /** BIGINT — node-postgres serialises it as a string. */
  telegram_chat_id: string;
  city_id: number;
  city_name: string | null;
  equipment_type: EquipmentType;
  priority: number;
  is_active: boolean;
  last_assigned_at: string | null;
  created_at: string;
}

export interface City {
  id: number;
  name: string;
}

/** Body for POST /api/workers; PATCH accepts any subset. */
export interface WorkerInput {
  name: string;
  city_id: number;
  /** Sent as a decimal string to avoid float precision issues; the API coerces it. */
  telegram_chat_id: string;
  phone: string | null;
  equipment_type: EquipmentType;
  priority: number;
  is_active: boolean;
}

// ── Leads ────────────────────────────────────────────────────────────────────

export type LeadStatus =
  | 'new'
  | 'assigned'
  | 'accepted'
  | 'rejected'
  | 'timeout'
  | 'completed'
  | 'canceled'
  | 'unassigned'
  | 'failed_contact';

/** Order = order in the status filter. */
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  unassigned: 'Без виконавця',
  new: 'Нова',
  assigned: 'Призначена',
  accepted: 'Прийнята',
  timeout: 'Таймаут',
  rejected: 'Відхилена',
  completed: 'Виконана',
  canceled: 'Скасована',
  failed_contact: "Не зв'язались",
};

/** Mirrors CANCELABLE_STATUSES in server/routes/leads.js. */
export const CANCELABLE_LEAD_STATUSES: ReadonlySet<LeadStatus> = new Set(['new', 'assigned', 'timeout']);

export type LeadServiceType = 'ogorod' | 'celina' | 'mowing' | 'tree' | 'washing';

export const SERVICE_TYPE_LABELS: Record<LeadServiceType, string> = {
  ogorod: 'Огород / вспашка',
  celina: 'Цілина',
  mowing: 'Покос трави',
  tree: 'Демонтаж дерева',
  washing: 'Мийка техніки',
};

export interface Lead {
  id: number;
  name: string | null;
  phone_normalized: string;
  phone_raw: string;
  service_type: LeadServiceType;
  /** NUMERIC — serialised as a string by node-postgres. */
  area: string;
  /** NUMERIC — serialised as a string by node-postgres. */
  total_price: string;
  city_id: number;
  city_name: string | null;
  out_of_city: boolean;
  status: LeadStatus;
  comment: string | null;
  created_at: string;
  updated_at: string;
  worker_id: number | null;
  worker_name: string | null;
}

export interface LeadsPage {
  total: number;
  limit: number;
  offset: number;
  data: Lead[];
}

export interface LeadStats {
  total_leads: number;
  active_workers: number;
  pending_leads: number;
  unassigned_leads: number;
  today_leads: number;
}
