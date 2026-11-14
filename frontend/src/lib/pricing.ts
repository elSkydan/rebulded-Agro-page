/**
 * Client-side price preview.
 * Mirrors server/services/pricingService.js — the server remains the
 * source of truth; this module only powers the instant calculator UI.
 */

import { AREA_HIDDEN_SERVICES, type ServiceType } from './services-catalog';

export type { ServiceType } from './services-catalog';
export {
  AREA_HIDDEN_SERVICES,
  SERVICE_OPTIONS,
  SERVICE_UI_NOTE,
  isCalculatorService,
  parseServiceParam,
  serviceLabel,
} from './services-catalog';

/** @deprecated Use AREA_HIDDEN_SERVICES — area field is hidden, not dimmed. */
export const AREA_OPTIONAL_SERVICES = AREA_HIDDEN_SERVICES;

export const OUT_OF_CITY_SURCHARGE_UAH = 800;
/** Out-of-city surcharge applies within this radius (km). */
export const OUT_OF_CITY_RADIUS_KM = 150;
export const MAX_AREA_DISPLAY = 50;
export const MIN_ORDER_UAH = 1500;

const OGOROD_RATE_PER_SOTKA = 300;
const CELINA_RATE_PER_SOTKA = 600;
const CELINA_MIN = 1800;

const MOWING_RATE_PER_SOTKA = 200;
const MOWING_MIN = 200;
const TREE_MIN = 500;
const WASHING_MIN = 250;
const DRILLING_MIN = 100;

const MIN_ORDER = MIN_ORDER_UAH;

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

export interface PriceBreakdownLine {
  label: string;
  /** UAH added to the sum; 0 for informational "included" lines. */
  amount: number;
  informational?: boolean;
}

export interface PriceBreakdown {
  lines: PriceBreakdownLine[];
  total: number;
}

/** Parse area from UI — accepts decimal comma (uk-UA) and dot. */
export function parseAreaInput(raw: number | string): number {
  if (typeof raw === 'number') return raw;
  const normalized = String(raw).trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return NaN;
  return Number(normalized);
}

/** Round up to the nearest 0.5 sotka. */
export function roundArea(raw: number | string): number {
  const n = parseAreaInput(raw);
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
    case 'drilling':
      return 1;
    default:
      return 1;
  }
}

/** Raw service price before out-of-city surcharge and MIN_ORDER floor. */
function baseServicePrice(serviceType: ServiceType, effectiveArea: number): number | null {
  if (serviceType === 'ogorod') {
    return effectiveArea * OGOROD_RATE_PER_SOTKA;
  }
  if (serviceType === 'celina') {
    return Math.max(effectiveArea * CELINA_RATE_PER_SOTKA, CELINA_MIN);
  }
  if (serviceType === 'mowing') {
    return Math.max(effectiveArea * MOWING_RATE_PER_SOTKA, MOWING_MIN);
  }
  if (serviceType === 'tree') {
    return TREE_MIN;
  }
  if (serviceType === 'washing') {
    return WASHING_MIN;
  }
  if (serviceType === 'drilling') {
    return DRILLING_MIN;
  }
  return null;
}

function serviceLineLabel(
  serviceType: ServiceType,
  areaEffective: number,
  clampNote: string,
): string {
  if (serviceType === 'ogorod') {
    return `Огород: ${formatArea(areaEffective)} × ${OGOROD_RATE_PER_SOTKA} грн/сот.${clampNote}`;
  }
  if (serviceType === 'celina') {
    return `Цілина: ${formatArea(areaEffective)} × ${CELINA_RATE_PER_SOTKA} грн (мін. ${CELINA_MIN} грн)${clampNote}`;
  }
  if (serviceType === 'mowing') {
    return `Покос (фрезами): ${formatArea(areaEffective)} × ${MOWING_RATE_PER_SOTKA} грн${clampNote}`;
  }
  if (serviceType === 'tree') {
    return `Демонтаж: орієнтир від ${TREE_MIN} грн`;
  }
  if (serviceType === 'washing') {
    return `Мийка техніки: від ${WASHING_MIN} грн`;
  }
  if (serviceType === 'drilling') {
    return `Буріння: від ${DRILLING_MIN} грн/лунку`;
  }
  return '';
}

/** Minimum possible bill (as computed on the server) for a service. */
function minimumBillForService(serviceType: ServiceType, outOfCity: boolean): number {
  const a = minAreaForService(serviceType);
  const base = baseServicePrice(serviceType, a);
  if (base == null) return NaN;
  let price = base;
  if (outOfCity) price += OUT_OF_CITY_SURCHARGE_UAH;
  return Math.round(Math.max(price, MIN_ORDER));
}

export function calcClientPreview(
  serviceType: ServiceType,
  rawArea: number | string,
  outOfCity: boolean,
): PricePreview {
  const areaIndependent = AREA_HIDDEN_SERVICES.has(serviceType);
  const rounded = areaIndependent ? minAreaForService(serviceType) : roundArea(rawArea);
  const minA = minAreaForService(serviceType);

  if (!Number.isFinite(rounded)) {
    return { ok: false, area: NaN, reason: 'bounds' };
  }

  const effectiveArea = Math.min(Math.max(rounded, minA), MAX_AREA_DISPLAY);
  const wasClampedMin = !areaIndependent && roundArea(rawArea) < minA;
  const wasClampedMax = !areaIndependent && roundArea(rawArea) > MAX_AREA_DISPLAY;

  const base = baseServicePrice(serviceType, effectiveArea);
  if (base == null) {
    return { ok: false, area: effectiveArea, reason: 'unknown' };
  }

  let price = base;
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

/**
 * Line-item breakdown that sums to «Орієнтовно».
 * Call-out / min-order gap is shown as «Виїзд»; when already covered — «включено».
 */
export function buildPriceBreakdown(
  serviceType: ServiceType,
  areaEffective: number,
  outOfCity: boolean,
  preview: PricePreview,
): PriceBreakdown | null {
  if (!preview.ok || preview.total == null) return null;

  let clampNote = '';
  if (preview.wasClampedMin) {
    clampNote += ` — застосовано мінімум ${formatArea(preview.minA ?? 0)} сот.`;
  }
  if (preview.wasClampedMax) {
    clampNote += ` — застосовано максимум ${formatArea(MAX_AREA_DISPLAY)} сот.`;
  }

  const base = baseServicePrice(serviceType, areaEffective);
  if (base == null) return null;

  const lines: PriceBreakdownLine[] = [
    {
      label: serviceLineLabel(serviceType, areaEffective, clampNote),
      amount: Math.round(base),
    },
  ];

  let running = Math.round(base);

  if (outOfCity) {
    lines.push({
      label: `За містом (до ${OUT_OF_CITY_RADIUS_KM} км)`,
      amount: OUT_OF_CITY_SURCHARGE_UAH,
    });
    running += OUT_OF_CITY_SURCHARGE_UAH;
  }

  const gap = preview.total - running;
  if (gap > 0) {
    lines.push({
      label: 'Виїзд',
      amount: gap,
    });
  } else {
    lines.push({
      label: 'Виїзд по місту включено',
      amount: 0,
      informational: true,
    });
  }

  return { lines, total: preview.total };
}

/** @deprecated Prefer buildPriceBreakdown for multi-line UI. */
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
  const breakdown = buildPriceBreakdown(serviceType, areaEffective, outOfCity, preview);
  if (!breakdown) return '';
  return breakdown.lines
    .map((l) => (l.informational ? l.label : `${l.label} — ${l.amount} грн`))
    .join('; ');
}

/** Format a number with a decimal comma for the UI. */
export function formatArea(n: number): string {
  return String(n).replace('.', ',');
}
