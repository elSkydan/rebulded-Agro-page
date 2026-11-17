'use strict';

/**
 * telegramTexts — every Telegram text a worker or the admin sees, in Ukrainian.
 *
 * Pure functions, no I/O. Service names and units follow the public site
 * (frontend/src/lib/services-catalog.ts, frontend/src/lib/pricing.ts).
 *
 * Contact privacy (#59): the client's name and phone appear only in the
 * accepted-lead text and in admin texts — never in the offer a worker can
 * still reject or let time out.
 */

/** Same labels as SERVICE_CATALOG[].label on the site. */
const SERVICE_LABELS = {
  ogorod:   'Город / оранка',
  celina:   'Цілина',
  mowing:   'Покіс трави',
  drilling: 'Буріння лунок',
  washing:  'Мийка техніки',
  tree:     'Демонтаж дерев',
};

/** Services priced per job, not per area — the site hides the area field for them. */
const FIXED_PRICE_SERVICES = new Set(['drilling', 'washing', 'tree']);

/** Escape user-supplied text for Telegram parse_mode=HTML. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 1 сотка, 2 сотки, 5 соток, 2,5 сотки. */
function formatArea(area) {
  const n = Number(area);
  if (!Number.isFinite(n)) return `${escapeHtml(area)} сот.`;
  const shown = String(n).replace('.', ',');
  if (!Number.isInteger(n)) return `${shown} сотки`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${shown} сотка`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${shown} сотки`;
  return `${shown} соток`;
}

const OFFER_FOOTER    = '⏰ Дайте відповідь протягом 3 хвилин.';
const CONTACTS_HIDDEN = '🔒 Ім’я та телефон клієнта з’являться після «Прийняти».';
const ACCEPTED_FOOTER = '✅ <b>Ви прийняли заявку. Зателефонуйте клієнту зараз!</b>';

/**
 * Lead text in one of three modes:
 *   'offer'    — sent to a worker with Accept/Reject buttons; no client contacts.
 *   'accepted' — the winner's message after Accept; with name and phone.
 *   'admin'    — admin fallback copy; with name and phone, no call to action.
 *
 * @param {number}      leadId
 * @param {object|null} lead  — { name, phone_normalized, service_type, area,
 *                                total_price, city_name, city_id, out_of_city, comment }
 * @param {'offer'|'accepted'|'admin'} [mode='offer']
 * @returns {string} Telegram HTML
 */
function buildLeadText(leadId, lead, mode = 'offer') {
  const showContacts = mode === 'accepted' || mode === 'admin';

  if (!lead) {
    if (mode === 'accepted') {
      return `✅ <b>Заявка #${leadId} ваша.</b>\n\n` +
        'Не вдалося завантажити контакти клієнта — зверніться до адміністратора.';
    }
    return `📋 <b>Нова заявка #${leadId}</b>` + (mode === 'offer' ? `\n\n${OFFER_FOOTER}` : '');
  }

  const serviceLabel = SERVICE_LABELS[lead.service_type] ?? escapeHtml(lead.service_type);

  const lines = [`📋 <b>Нова заявка #${leadId}</b>`, ``];

  if (showContacts) {
    lines.push(
      `👤 <b>Клієнт:</b> ${escapeHtml(lead.name)}`,
      `📞 <b>Телефон:</b> ${escapeHtml(lead.phone_normalized)}`,
    );
  }

  lines.push(`🛠 <b>Послуга:</b> ${serviceLabel}`);
  if (!FIXED_PRICE_SERVICES.has(lead.service_type)) {
    lines.push(`📐 <b>Площа:</b> ${formatArea(lead.area)}`);
  }
  lines.push(`🌆 <b>Місто:</b> ${escapeHtml(lead.city_name ?? lead.city_id)}`);

  if (lead.out_of_city) lines.push(`🚗 <b>За містом:</b> так`);
  if (lead.comment)     lines.push(`💬 <b>Коментар:</b> ${escapeHtml(lead.comment)}`);

  lines.push(``, `💰 <b>Ціна:</b> ${escapeHtml(lead.total_price)} грн`);

  if (mode === 'offer')    lines.push(``, CONTACTS_HIDDEN, OFFER_FOOTER);
  if (mode === 'accepted') lines.push(``, ACCEPTED_FOOTER);

  return lines.join('\n');
}

const BUTTONS = {
  accept: 'Прийняти ✅',
  reject: 'Відмовитись ❌',
};

/** Texts the worker's message is replaced with, and callback toasts. */
const WORKER = {
  takenByOther:   (leadId) => `Заявку #${leadId} прийняв інший виконавець.`,
  alreadyTaken:   (leadId) => `Заявку #${leadId} вже прийнято.`,
  declined:       (leadId) => `Заявка #${leadId} — ви відмовились.`,
  toastAccepted:  'Заявку прийнято! 🎉',
  toastTaken:     'Заявку вже прийняв інший виконавець.',
  toastConfirmed: 'Вже підтверджено ✅',
  toastDeclined:  'Ви відмовились від заявки.',
  invalidButton:  'Некоректні дані кнопки.',
  unknownAction:  'Невідома дія.',
};

/**
 * Map a business-logic error to a short Telegram toast (≤ 200 chars).
 * Never exposes internals.
 *
 * @param {Error} err
 * @returns {string}
 */
function getCallbackErrorMessage(err) {
  switch (err.code) {
    case 'WORKER_IDENTITY_MISMATCH':
      return 'Ваш Telegram не прив’язаний до цього профілю виконавця. Зверніться до адміністратора.';

    case 'LEAD_NOT_YOURS':
      return 'Ця заявка вже не призначена вам.';

    case 'INVALID_TRANSITION': {
      const s = err.leadStatus ?? '';
      if (s === 'accepted')   return 'Цю заявку вже прийнято.';
      if (s === 'timeout')    return 'Час на відповідь вийшов — заявку передано далі.';
      if (s === 'canceled')   return 'Заявку скасовано.';
      if (s === 'unassigned') return 'Ця заявка вже недоступна.';
      return 'Ця заявка вже недоступна (статус змінився).';
    }

    default:
      if (err.statusCode === 403) return 'Дія недоступна. Зверніться до адміністратора.';
      if (err.statusCode === 404) return 'Цієї заявки більше не існує.';
      if (err.statusCode === 409) return 'Конфлікт дій — можливо, заявку вже оброблено.';
      return 'Не вдалося обробити відповідь. Спробуйте ще раз або зверніться до адміністратора.';
  }
}

/** Admin notices. */
const ADMIN_PREFIX = '⚠️ Адмін';

const ADMIN = {
  prefix: ADMIN_PREFIX,
  leadAlert: (leadId, reason) => `${ADMIN_PREFIX} — заявка #${leadId}: ${reason}`,
  workerNoTelegram: (workerId, leadId) =>
    `⚠️ <b>Виконавець #${workerId} не має прив’язаного Telegram.</b>\n` +
    `Заявку #${leadId} не доставлено.`,
  workerBlockedBot: (workerId, chatId, leadId) =>
    `⚠️ <b>Виконавець #${workerId}</b> (chat_id: <code>${escapeHtml(chatId)}</code>) ` +
    `заблокував бота.\nЗаявку #${leadId} не доставлено.`,
  reasons: {
    acceptedBy:       (workerId) => `прийняв виконавець #${workerId}`,
    noWorkers:        'немає вільних виконавців',
    allRejected:      'усі виконавці відмовились — заявка без виконавця',
    unassignedAfter:  (reason) => {
      const why = { timeout: 'час на відповідь вийшов', rejected: 'відмова виконавця' }[reason] ?? reason;
      return `заявка без виконавця (${why})`;
    },
    timedOut:         'час вийшов — жоден виконавець не відповів',
    noContact:        'прийнята, але контакту з клієнтом немає — статус failed_contact',
  },
};

module.exports = {
  SERVICE_LABELS,
  BUTTONS,
  WORKER,
  ADMIN,
  escapeHtml,
  formatArea,
  buildLeadText,
  getCallbackErrorMessage,
};
