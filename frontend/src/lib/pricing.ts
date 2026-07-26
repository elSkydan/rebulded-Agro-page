/**
 * Client-side price preview.
 * Mirrors server/services/pricingService.js — the server remains the
 * source of truth; this module only powers the instant calculator UI.
 */

export type ServiceType = 'ogorod' | 'celina' | 'mowing' | 'tree' | 'washing';

export const OUT_OF_CITY_SURCHARGE_UAH = 800;
export const MAX_AREA_DISPLAY = 50;

const OGOROD_RATE_PER_SOTKA = 300;
const CELINA_RATE_PER_SOTKA = 600;
const CELINA_MIN = 1800;

const MOWING_RATE_PER_SOTKA = 200;
const MOWING_MIN = 200;
const TREE_MIN = 500;
const WASHING_MIN = 250;

const MIN_ORDER = 1000;

/** Services where the area input is dimmed (price does not depend on it). */
export const AREA_OPTIONAL_SERVICES: ReadonlySet<ServiceType> = new Set([
  'tree',
  'washing',
]);

/** Short UI hints shown under the service select. */
export const SERVICE_UI_NOTE: Record<ServiceType, string> = {
  ogorod: '',
  celina: '',
  mowing: 'Покос виконується фрезами.',
  tree: 'Точна ціна за домовленістю.',
  washing: '',
};

export interface PricePreview {
  ok: boolean;
  area: number;
  rounded?: number;
  wasClampedMin?: boolean;
  wasClampedMax?: boolean;
  total?: number;
  minA?: number;
  reason?: 'bounds' | 'unknown';
}

/** Round up to the nearest 0.5 sotka. */
export function roundArea(raw: number | string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return NaN;
  return Math.ceil(n * 2) / 2;
}

export function minAreaForService(serviceType: ServiceType): number {
  switch (serviceType) {
    case 'ogorod':
      return 5;
    case 'celina':
      return 3;
    case 'mowing':
      return 10;
    case 'tree':
    case 'washing':
      return 1;
    default:
      return 1;
  }
}

/** Minimum possible bill (as computed on the server) for a service. */
function minimumBillForService(serviceType: ServiceType, outOfCity: boolean): number {
  const a = minAreaForService(serviceType);
  let price: number;
  if (serviceType === 'ogorod') {
    price = a * OGOROD_RATE_PER_SOTKA;
  } else if (serviceType === 'celina') {
    price = Math.max(a * CELINA_RATE_PER_SOTKA, CELINA_MIN);
  } else if (serviceType === 'mowing') {
    price = Math.max(a * MOWING_RATE_PER_SOTKA, MOWING_MIN);
  } else if (serviceType === 'tree') {
    price = TREE_MIN;
  } else {
    price = WASHING_MIN;
  }
  if (outOfCity) price += OUT_OF_CITY_SURCHARGE_UAH;
  return Math.round(Math.max(price, MIN_ORDER));
}

export function calcClientPreview(
  serviceType: ServiceType,
  rawArea: number | string,
  outOfCity: boolean,
): PricePreview {
  const rounded = roundArea(rawArea);
  const minA = minAreaForService(serviceType);

  if (!Number.isFinite(rounded)) {
    return { ok: false, area: NaN, reason: 'bounds' };
  }

  const effectiveArea = Math.min(Math.max(rounded, minA), MAX_AREA_DISPLAY);
  const wasClampedMin = rounded < minA;
  const wasClampedMax = rounded > MAX_AREA_DISPLAY;

  let price: number;
  if (serviceType === 'ogorod') {
    price = effectiveArea * OGOROD_RATE_PER_SOTKA;
  } else if (serviceType === 'celina') {
    price = Math.max(effectiveArea * CELINA_RATE_PER_SOTKA, CELINA_MIN);
  } else if (serviceType === 'mowing') {
    price = Math.max(effectiveArea * MOWING_RATE_PER_SOTKA, MOWING_MIN);
  } else if (serviceType === 'tree') {
    price = TREE_MIN;
  } else if (serviceType === 'washing') {
    price = WASHING_MIN;
  } else {
    return { ok: false, area: effectiveArea, reason: 'unknown' };
  }

  if (outOfCity) price += OUT_OF_CITY_SURCHARGE_UAH;

  let total = Math.round(Math.max(price, MIN_ORDER));
  total = Math.max(total, minimumBillForService(serviceType, outOfCity));

  return {
    ok: true,
    area: effectiveArea,
    rounded,
    wasClampedMin,
    wasClampedMax,
    total,
    minA,
  };
}

/** Human-readable formula line shown above the price. */
export function formatFormula(
  serviceType: ServiceType,
  areaEffective: number,
  outOfCity: boolean,
  preview: PricePreview,
): string {
  if (!preview.ok) {
    return preview.reason === 'bounds'
      ? 'Вкажіть числову площу (округлення до 0,5 сот.)'
      : 'Вкажіть коректну площу';
  }

  let clampNote = '';
  if (preview.wasClampedMin) {
    clampNote += ` — застосовано мінімум ${String(preview.minA).replace('.', ',')} сот.`;
  }
  if (preview.wasClampedMax) {
    clampNote += ` — застосовано максимум ${String(MAX_AREA_DISPLAY).replace('.', ',')} сот.`;
  }

  let line: string;
  if (serviceType === 'ogorod') {
    line = `Огород: ${areaEffective} × ${OGOROD_RATE_PER_SOTKA} грн/сот.${clampNote}`;
  } else if (serviceType === 'celina') {
    line = `Цілина: ${areaEffective} × ${CELINA_RATE_PER_SOTKA} грн (мін. ${CELINA_MIN} грн)${clampNote}`;
  } else if (serviceType === 'mowing') {
    line = `Покос (фрезами): ${areaEffective} × ${MOWING_RATE_PER_SOTKA} грн${clampNote}`;
  } else if (serviceType === 'tree') {
    line = `Демонтаж: орієнтир від ${TREE_MIN} грн — точна ціна за домовленістю`;
  } else if (serviceType === 'washing') {
    line = `Мийка техніки: від ${WASHING_MIN} грн (орієнтир за площею)`;
  } else {
    line = '';
  }

  if (outOfCity) {
    line += ` + ${OUT_OF_CITY_SURCHARGE_UAH} грн (виїзд за місто)`;
  }
  return line;
}

/** Format a number with a decimal comma for the UI. */
export function formatArea(n: number): string {
  return String(n).replace('.', ',');
}
