'use strict';

/**
 * pricingService.js
 * Server is the ONLY source of truth for pricing.
 * The client pricing.ts may mirror this for UX preview only.
 */

const MIN_AREA_GLOBAL = 0.5;
const MAX_AREA        = 50;
const MIN_ORDER       = 1500;

/** Fixed surcharge when lead is outside city (UAH). */
const OUT_OF_CITY_SURCHARGE_UAH = 800;
/** Out-of-city surcharge applies within this radius (km). */
const OUT_OF_CITY_RADIUS_KM = 150;

const SERVICE_MIN_AREA = {
  ogorod: 5,
  celina: 3,
  mowing: 10,
  tree: 1,
  washing: 1,
  drilling: 1,
};

/** Огород: 300 UAH per 0.5 sot. step (per full sotka), min 5 sot. */
const OGOROD_RATE_PER_SOTKA = 300;

const CELINA_RATE_PER_SOTKA = 600;
const CELINA_MIN            = 1800;

const MOWING_RATE_PER_SOTKA = 200;
const MOWING_MIN            = 200;

const TREE_MIN     = 500;
const WASHING_MIN  = 250;
const DRILLING_MIN = 100;

/**
 * Round area UP to the nearest 0.5 sotka.
 */
function roundArea(raw) {
  return Math.ceil(raw * 2) / 2;
}

function minAreaForService(serviceType) {
  const m = SERVICE_MIN_AREA[serviceType];
  return m !== undefined ? m : MIN_AREA_GLOBAL;
}

/**
 * Rounded sotkas, clamped to service minimum and capped at MAX_AREA.
 * Values below min become min; above max become MAX_AREA; invalid raw yields NaN.
 */
function effectiveAreaForService(serviceType, rawArea) {
  const r = roundArea(rawArea);
  if (!Number.isFinite(r)) return NaN;
  const capped = Math.min(r, MAX_AREA);
  return Math.max(capped, minAreaForService(serviceType));
}

function baseServicePrice(serviceType, area) {
  if (serviceType === 'ogorod') {
    return area * OGOROD_RATE_PER_SOTKA;
  }
  if (serviceType === 'celina') {
    return Math.max(area * CELINA_RATE_PER_SOTKA, CELINA_MIN);
  }
  if (serviceType === 'mowing') {
    return Math.max(area * MOWING_RATE_PER_SOTKA, MOWING_MIN);
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

/** Lowest legal total (UAH, after MIN_ORDER) for this service at min area + optional виїзд. */
function minimumBillForService(serviceType, outOfCity) {
  const a = minAreaForService(serviceType);
  const base = baseServicePrice(serviceType, a);
  if (base == null) return NaN;

  let price = base;
  if (outOfCity) price += OUT_OF_CITY_SURCHARGE_UAH;
  return Math.round(Math.max(price, MIN_ORDER));
}

/**
 * Calculate total price for a lead.
 *
 * @param {'ogorod'|'celina'|'mowing'|'tree'|'washing'|'drilling'} serviceType
 * @param {number} rawArea           - sotki, before rounding
 * @param {boolean} outOfCity
 * @param {*} [_city]                  Unused; API compatibility (out-of-city fee is fixed).
 * @returns {number}                 - integer UAH (Math.round applied)
 * @throws {Error}
 */
function calcPrice(serviceType, rawArea, outOfCity, _city) {
  const area = effectiveAreaForService(serviceType, rawArea);

  if (!Number.isFinite(area)) {
    throw Object.assign(
      new Error(`Area must be a valid number of sotki for "${serviceType}". Got: ${rawArea}`),
      { code: 'INVALID_AREA', statusCode: 422 }
    );
  }

  const base = baseServicePrice(serviceType, area);
  if (base == null) {
    throw Object.assign(
      new Error(`Unknown serviceType: "${serviceType}".`),
      { code: 'INVALID_SERVICE_TYPE', statusCode: 422 }
    );
  }

  let price = base;
  if (outOfCity) {
    price += OUT_OF_CITY_SURCHARGE_UAH;
  }

  const candidate = Math.round(Math.max(price, MIN_ORDER));
  const floorMin = minimumBillForService(serviceType, outOfCity);
  return Math.max(candidate, floorMin);
}

module.exports = {
  calcPrice,
  roundArea,
  minAreaForService,
  effectiveAreaForService,
  minimumBillForService,
  MAX_AREA,
  MIN_ORDER,
  OUT_OF_CITY_SURCHARGE_UAH,
  OUT_OF_CITY_RADIUS_KM,
};
