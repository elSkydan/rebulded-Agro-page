/** Formatting for the admin UI. Times are always shown in Kyiv, whatever the browser zone. */

// 'Europe/Kiev' rather than 'Europe/Kyiv': the old name is accepted by every ICU build.
const TIME_ZONE = 'Europe/Kiev';

function kyivParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

/** "11.11 14:05", or "31.12.2025 12:00" outside the current (Kyiv) year. */
export function formatKyivDateTime(iso: string, now: Date = new Date()): string {
  const p = kyivParts(new Date(iso));
  const sameYear = p.year === kyivParts(now).year;
  return `${p.day}.${p.month}${sameYear ? '' : `.${p.year}`} ${p.hour}:${p.minute}`;
}

/** "1 800 грн" — whole hryvnias, non-breaking space between thousands. */
export function formatMoney(value: string | number): string {
  const rounded = Math.round(Number(value));
  return `${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} грн`;
}

/** "6 сот." / "6,5 сот." */
export function formatArea(value: string | number): string {
  return `${String(Number(value)).replace('.', ',')} сот.`;
}
