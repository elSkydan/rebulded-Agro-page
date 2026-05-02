/**
 * main.js — АгроМайстер Landing Page
 *
 * BACKEND INTEGRATION MAP:
 * ┌────────────────────────────────────────────────────────────┐
 * │ GET  /api/cities                                           │
 * │   Headers: Authorization: Bearer <CITIES_TOKEN>           │
 * │   Response: [{id, name, delivery_price, ...}]             │
 * │                                                            │
 * │ POST /api/leads                                            │
 * │   Body (JSON):                                             │
 * │     name         string  (optional, max 100)              │
 * │     phone        string  raw digits, e.g. "0671234567"    │
 * │     city_id      number  integer                          │
 * │     service_type string  "ogorod" | "celina"              │
 * │     area         number  0.5–50 sotki                     │
 * │     out_of_city  boolean                                   │
 * │   Response 201: { lead_id, status, assigned_worker }      │
 * │   Response 400/422: { error, fields? }                    │
 * │                                                            │
 * │ PRICING (mirrors pricingService.js exactly):               │
 * │   Ogorod ≤3: 1700                                         │
 * │   Ogorod >3: area*300 (min 1700)                          │
 * │   Celina:    area*600 (min 1800)                           │
 * │   outOfCity: + city.delivery_price (from selected city)   │
 * │   Minimum:   1000                                          │
 * │   Rounding:  Math.ceil(area*2)/2 then Math.round(price)   │
 * └────────────────────────────────────────────────────────────┘
 *
 * IMPORTANT NOTES:
 * 1. GET /api/cities requires Authorization: Bearer token.
 *    Set CITIES_TOKEN below, or make the route public in cities.js
 *    by removing requireAdminAuth from the GET / route.
 *
 * 2. CORS: backend defaults to http://localhost:5173.
 *    Set CORS_ORIGIN=* in .env or serve this from localhost:5173.
 *    Run: npx serve . --listen 5173
 *
 * 3. Phone: backend normalizePhone() accepts:
 *    - +380XXXXXXXXX (12 digits)
 *    - 0XXXXXXXXX    (10 digits, Ukrainian local)
 *    - 80XXXXXXXXX   (11 digits)
 *    We send: prefix stripped + digits (e.g. "0671234567")
 *    Backend normalizes to +380XXXXXXXXX.
 */

'use strict';

/* ══════════════════════════════════════════
   CONFIG — edit these before deploy
══════════════════════════════════════════ */
const API_BASE_URL = 'http://localhost:3000';

/**
 * CITIES_TOKEN: your ADMIN_TOKEN from .env
 * Needed because GET /api/cities requires admin auth.
 *
 * To avoid exposing token in frontend, either:
 *   A) Remove requireAdminAuth from GET /api/cities in cities.js
 *   B) Set this token here (only for internal/trusted clients)
 */
const CITIES_TOKEN = ''; // e.g. 'change-me-to-a-strong-random-string'

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
/** @type {Array<{id: number, name: string, delivery_price: number}>} */
let citiesData = [];

/** Selected city delivery_price for UI price preview */
let selectedDeliveryPrice = 0;

/** Debounce timer handle */
let calcDebounce = null;

/* ══════════════════════════════════════════
   BOOT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  fetchCities();
  setupCalcListeners();
  setupReveal();
  setupStickyCTA();

  // Hero CTA button → scroll to calculator
  document.getElementById('hero-cta').addEventListener('click', scrollToCalc);
  document.getElementById('sticky-btn').addEventListener('click', scrollToCalc);

  // Submit button
  document.getElementById('submit-btn').addEventListener('click', handleSubmit);

  // Update delivery price preview when city changes
  document.getElementById('city_id').addEventListener('change', onCityChange);
});

/* ══════════════════════════════════════════
   fetchCities()
   GET /api/cities
   Requires Authorization: Bearer token
══════════════════════════════════════════ */
async function fetchCities() {
  const sel       = document.getElementById('city_id');
  const statusEl  = document.getElementById('city-status');

  sel.disabled = true;
  sel.innerHTML = '<option value="">Завантаження міст...</option>';
  statusEl.textContent = 'Завантаження...';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (CITIES_TOKEN) headers['Authorization'] = `Bearer ${CITIES_TOKEN}`;

    const res = await fetch(`${API_BASE_URL}/api/cities`, { headers });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    citiesData = await res.json();

    sel.innerHTML = '<option value="">Оберіть місто</option>';
    citiesData.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });

    sel.disabled = false;
    statusEl.textContent = 'Міста завантажено';

  } catch (err) {
    console.error('[fetchCities]', err.message);
    sel.innerHTML = '<option value="">Не вдалось завантажити міста</option>';
    sel.disabled = false;
    statusEl.textContent = 'Помилка завантаження міст';
  }
}

/* ══════════════════════════════════════════
   calculatePrice()
   Mirrors pricingService.js EXACTLY.
   Called from UI — server always recalculates.
══════════════════════════════════════════ */

/**
 * @param {number} rawArea
 * @param {'ogorod'|'celina'} serviceType
 * @param {boolean} outOfCity
 * @param {number} deliveryPrice  city.delivery_price
 * @returns {number|null} rounded integer UAH, or null if invalid
 */
function calculatePrice(rawArea, serviceType, outOfCity, deliveryPrice) {
  // Mirror: Math.ceil(rawArea * 2) / 2
  const area = Math.ceil(rawArea * 2) / 2;

  if (!Number.isFinite(area) || area < 0.5 || area > 50) return null;

  let price;

  if (serviceType === 'ogorod') {
    price = area <= 3 ? 1700 : area * 300;
    price = Math.max(price, 1700);
  } else if (serviceType === 'celina') {
    price = area * 600;
    price = Math.max(price, 1800);
  } else {
    return null;
  }

  if (outOfCity) {
    price += Number(deliveryPrice) || 0;
  }

  // Mirror: Math.round(Math.max(price, 1000))
  return Math.round(Math.max(price, 1000));
}

function updatePriceDisplay() {
  const rawArea     = parseFloat(document.getElementById('area').value);
  const serviceType = document.getElementById('service_type').value;
  const outOfCity   = document.getElementById('out_of_city').checked;
  const priceEl     = document.getElementById('price-val');
  const hintEl      = document.getElementById('area-hint');

  // Validate area input
  if (!document.getElementById('area').value || isNaN(rawArea)) {
    priceEl.textContent = '—';
    hintEl.textContent  = '';
    return;
  }

  if (rawArea < 0.5) {
    priceEl.textContent = '—';
    hintEl.textContent  = 'мін. 0.5';
    return;
  }

  if (rawArea > 50) {
    priceEl.textContent = '—';
    hintEl.textContent  = 'макс. 50 соток';
    return;
  }

  hintEl.textContent = '';

  const price = calculatePrice(rawArea, serviceType, outOfCity, selectedDeliveryPrice);

  if (price === null) {
    priceEl.textContent = '—';
    return;
  }

  // Pop animation
  priceEl.classList.remove('pop');
  // Force reflow to restart animation
  void priceEl.offsetWidth;
  priceEl.classList.add('pop');
  setTimeout(() => priceEl.classList.remove('pop'), 300);

  priceEl.textContent = price.toLocaleString('uk-UA');
}

function setupCalcListeners() {
  const debounced = () => {
    clearTimeout(calcDebounce);
    calcDebounce = setTimeout(updatePriceDisplay, 300);
  };

  document.getElementById('area').addEventListener('input', debounced);
  document.getElementById('service_type').addEventListener('change', updatePriceDisplay);
  document.getElementById('out_of_city').addEventListener('change', updatePriceDisplay);
}

function onCityChange() {
  const cityId = parseInt(document.getElementById('city_id').value, 10);
  const city   = citiesData.find(c => c.id === cityId);
  selectedDeliveryPrice = city ? Number(city.delivery_price) || 0 : 0;
  updatePriceDisplay(); // recalc with real delivery price
}

/* ══════════════════════════════════════════
   validatePhone()
   Must match backend normalizePhone() exactly.

   Backend accepts:
     +380XXXXXXXXX → 12 digits starting 380
     0XXXXXXXXX    → 10 digits starting 0
     80XXXXXXXXX   → 11 digits starting 80

   We send the raw phone string; backend normalizes.
   We validate length here to catch obvious errors.
══════════════════════════════════════════ */

/**
 * @param {string} prefix  e.g. "+380"
 * @param {string} raw     user input
 * @returns {{ phone: string, error: string|null }}
 */
function validatePhone(prefix, raw) {
  const digits = raw.replace(/\D/g, '');

  // Expected digit count AFTER country code (what user types in the input)
  const expectedAfterCode = {
    '+380': 9,
    '+48':  9,
    '+49': 10,
    '+7':  10,
  };

  const expected = expectedAfterCode[prefix];
  if (!expected) {
    return { phone: null, error: 'Невідомий код країни' };
  }

  if (digits.length === 0) {
    return { phone: null, error: 'Введіть номер телефону' };
  }

  if (digits.length !== expected) {
    return {
      phone: null,
      error: `Введіть рівно ${expected} цифр для ${prefix} (введено: ${digits.length})`,
    };
  }

  // Build the full phone string that backend normalizePhone() can parse
  // For +380: send "0XXXXXXXXX" (10 digits) — backend: 0XXXXXXXXX → +38XXXXXXXXX
  // For others: send full string like "+48XXXXXXXXX"
  let phone;
  if (prefix === '+380') {
    // If user typed 9 digits starting with non-0, prefix with 0
    // so backend gets a valid Ukrainian local number
    phone = digits.startsWith('0') ? digits : '0' + digits;
    // Validate: must be 10 digits total (0 + 9 digits)
    if (phone.length !== 10) {
      return { phone: null, error: 'Невірний формат українського номера' };
    }
  } else {
    // For non-UA numbers, send full E.164 string
    phone = prefix + digits;
  }

  return { phone, error: null };
}

/* ══════════════════════════════════════════
   handleSubmit()
   POST /api/leads
══════════════════════════════════════════ */
async function handleSubmit() {
  const btn   = document.getElementById('submit-btn');
  const errEl = document.getElementById('form-err');

  // Clear errors
  errEl.classList.remove('on');
  errEl.textContent = '';

  // Collect all values
  const cityId      = document.getElementById('city_id').value;
  const name        = document.getElementById('cust-name').value.trim();
  const prefix      = document.getElementById('phone_prefix').value;
  const rawPhone    = document.getElementById('phone').value.trim();

  // Calculator values — also go in POST body
  const serviceType = document.getElementById('service_type').value;
  const rawArea     = parseFloat(document.getElementById('area').value);
  const outOfCity   = document.getElementById('out_of_city').checked;

  /* ── CLIENT-SIDE VALIDATION ── */
  const errors = [];

  if (!cityId) errors.push('Оберіть місто');

  if (!name) {
    errors.push("Вкажіть ваше ім'я");
  } else if (name.length > 100) {
    errors.push("Ім'я не може бути довшим за 100 символів");
  }

  const { phone, error: phoneError } = validatePhone(prefix, rawPhone);
  if (phoneError) errors.push(phoneError);

  if (!document.getElementById('area').value || isNaN(rawArea)) {
    errors.push('Вкажіть площу ділянки');
  } else if (rawArea < 0.5) {
    errors.push('Мінімальна площа — 0.5 сотки');
  } else if (rawArea > 50) {
    errors.push('Максимальна площа — 50 соток');
  }

  if (!serviceType) errors.push('Оберіть тип послуги');

  if (errors.length) {
    showError(errors[0]);
    return;
  }

  /* ── SUBMIT ── */
  btn.disabled    = true;
  btn.textContent = 'Відправляємо...';

  const payload = {
    name,
    phone,                           // normalized by validatePhone()
    city_id:      parseInt(cityId, 10),
    service_type: serviceType,       // from calculator
    area:         rawArea,           // from calculator (server re-rounds)
    out_of_city:  outOfCity,         // from calculator
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/leads`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      // Handle structured validation errors from backend
      if (data?.fields && Array.isArray(data.fields)) {
        const firstField = data.fields[0];
        showError(firstField?.message || data.error || `Помилка (${res.status})`);
      } else {
        showError(data?.error || `Помилка сервера (${res.status})`);
      }
      return;
    }

    // ── SUCCESS ──
    const leadId = data.lead_id ?? data.id ?? '—';
    onSuccess(leadId, data);

  } catch (err) {
    console.error('[handleSubmit] network error:', err);
    showError("Помилка мережі. Перевірте з'єднання і спробуйте ще раз.");
  } finally {
    // Always re-enable button
    btn.disabled    = false;
    btn.textContent = 'Відправити заявку →';
  }
}

/**
 * Called on successful 201 response.
 * Fades out form, shows success banner.
 */
function onSuccess(leadId, data) {
  const titleEl  = document.getElementById('success-ttl');
  const banner   = document.getElementById('success-banner');
  const fields   = document.getElementById('form-fields');
  const header   = document.getElementById('form-header');

  // Build success message
  const workerName = data.assigned_worker?.name;
  titleEl.textContent = `✅ Заявка №${leadId} створена! Ми вже підбираємо виконавця.`;

  // Fade out form elements
  [fields, header].forEach(el => {
    el.style.transition = 'opacity .3s ease';
    el.style.opacity    = '0';
  });

  setTimeout(() => {
    [fields, header].forEach(el => { el.style.display = 'none'; });
    banner.classList.add('on');
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 320);
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function showError(msg) {
  const el = document.getElementById('form-err');
  el.textContent = msg;
  el.classList.add('on');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function scrollToCalc() {
  document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
}

/* ══════════════════════════════════════════
   setupReveal()
   IntersectionObserver — fade-in on scroll.
   Does NOT jank scroll (transform only, no layout).
══════════════════════════════════════════ */
function setupReveal() {
  const elements = document.querySelectorAll('.reveal');

  // If browser doesn't support IntersectionObserver, just show everything
  if (!window.IntersectionObserver) {
    elements.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // animate once
        }
      });
    },
    {
      threshold:  0.1,
      rootMargin: '0px 0px -32px 0px',
    }
  );

  elements.forEach(el => observer.observe(el));
}

/* ══════════════════════════════════════════
   setupStickyCTA()
   Hide sticky button when calculator is visible.
   Uses IntersectionObserver — no scroll listener.
══════════════════════════════════════════ */
function setupStickyCTA() {
  const sticky = document.getElementById('sticky-cta');
  const calc   = document.getElementById('calculator');

  if (!window.IntersectionObserver) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        sticky.classList.toggle('gone', entry.isIntersecting);
        sticky.setAttribute('aria-hidden', entry.isIntersecting ? 'true' : 'false');
      });
    },
    { threshold: 0.08 }
  );

  observer.observe(calc);
}

/* ══════════════════════════════════════════
   SELF-TEST (runs in console on load)
   Verifies calculatePrice() matches backend
══════════════════════════════════════════ */
(function selfTest() {
  const PASS = '✅';
  const FAIL = '❌';
  let allOk = true;

  function assert(label, actual, expected) {
    const ok = actual === expected;
    if (!ok) {
      console.error(`${FAIL} PRICING TEST FAILED: ${label}`);
      console.error(`   expected: ${expected}, got: ${actual}`);
      allOk = false;
    }
    return ok;
  }

  // Test cases from pricingService.js spec
  // calculatePrice(rawArea, serviceType, outOfCity, deliveryPrice)
  assert('ogorod 2 sotki (flat)',  calculatePrice(2, 'ogorod', false, 0), 1700);
  assert('ogorod 3 sotki (flat)',  calculatePrice(3, 'ogorod', false, 0), 1700);
  assert('ogorod 4 sotki',         calculatePrice(4, 'ogorod', false, 0), 1200); // 4*300=1200 → max(1200,1700)=1700
  // wait: 4 > 3 → 4*300=1200, max(1200,1700)=1700
  assert('ogorod 4 sotki (min)',   calculatePrice(4, 'ogorod', false, 0), 1700);
  assert('ogorod 6 sotki',         calculatePrice(6, 'ogorod', false, 0), 1800); // 6*300=1800
  assert('ogorod 10 sotki',        calculatePrice(10, 'ogorod', false, 0), 3000); // 10*300=3000
  assert('celina 1 sotka (min)',   calculatePrice(1, 'celina', false, 0), 1800); // 1*600=600 → max(600,1800)=1800
  assert('celina 3 sotki',         calculatePrice(3, 'celina', false, 0), 1800); // 3*600=1800
  assert('celina 5 sotki',         calculatePrice(5, 'celina', false, 0), 3000); // 5*600=3000
  assert('area rounding 2.3→2.5',  calculatePrice(2.3, 'ogorod', false, 0), 1700); // ceil(2.3*2)/2=2.5, ≤3→1700
  assert('area rounding 3.1→3.5',  calculatePrice(3.1, 'ogorod', false, 0), 1050); // ceil(3.1*2)/2=3.5, 3.5*300=1050 → max(1050,1700)=1700
  assert('area rounding 3.1→3.5 (min)', calculatePrice(3.1, 'ogorod', false, 0), 1700);
  assert('out_of_city +200',       calculatePrice(2, 'ogorod', true, 200), 1900); // 1700+200=1900
  assert('absolute min 1000',      calculatePrice(0.5, 'celina', false, 0), 1800); // 0.5*600=300→max(300,1800)=1800
  // 0.4 rounds UP to 0.5 (Math.ceil(0.4*2)/2 = 0.5) → valid, matches backend
  assert('0.4 rounds to 0.5',      calculatePrice(0.4, 'ogorod', false, 0), 1700);
  assert('area 0 → null',          calculatePrice(0, 'ogorod', false, 0), null);
  assert('area >50 → null',        calculatePrice(51, 'ogorod', false, 0), null);

  if (allOk) {
    console.log(`${PASS} All pricing tests passed — frontend mirrors pricingService.js correctly`);
  }
})();
