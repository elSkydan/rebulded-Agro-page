'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Check, CheckCircle, ChevronDown, Send } from 'lucide-react';
import { ApiError, createLead, fetchPublicCities, type PublicCity } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { siteConfig } from '@/lib/config';
import { SERVICE_OPTIONS, isActiveRegion } from '@/lib/content';
import { clearPendingLead, readPendingLead } from '@/lib/leadQueue';
import { formatPhone, isValidPhone } from '@/lib/phone';
import {
  AREA_HIDDEN_SERVICES,
  MAX_AREA_DISPLAY,
  calcClientPreview,
  formatArea,
  minAreaForService,
  parseAreaInput,
  roundArea,
  serviceLabel,
  type ServiceType,
} from '@/lib/pricing';

const PERKS = [
  'Безкоштовна консультація',
  'Виїзд зазвичай того ж дня',
  'Оплата після виконання роботи',
];

const REGION_NOTICE =
  'Зараз працюємо в Харкові та області. Ви з іншого міста? Залиште заявку — повідомимо, щойно запрацюємо у вашому регіоні.';

function pickDefaultCityId(cities: PublicCity[]): number {
  const active = cities.find((c) => isActiveRegion(c.name));
  if (active) return active.id;
  const configured = cities.find((c) => c.id === siteConfig.defaultCityId);
  if (configured) return configured.id;
  return cities[0]?.id ?? siteConfig.defaultCityId;
}

interface LeadFormProps {
  service: ServiceType;
  onServiceChange: (service: ServiceType) => void;
  /** Raw area from the calculator — used to build the API payload */
  areaInput: string;
  outOfCity: boolean;
}

type FormStatus = 'idle' | 'submitting' | 'success';

export function LeadForm({ service, onServiceChange, areaInput, outOfCity }: LeadFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [cities, setCities] = useState<PublicCity[]>([]);
  const [cityId, setCityId] = useState<number>(siteConfig.defaultCityId);
  const [phoneError, setPhoneError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [pendingNotice, setPendingNotice] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    fetchPublicCities()
      .then((list) => {
        if (cancelled) return;
        setCities(list);
        setCityId(pickDefaultCityId(list));
      })
      .catch(() => {
        if (cancelled) return;
        setCities([]);
        setCityId(siteConfig.defaultCityId);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Flush a lead saved during an earlier outage (auto-retry once on mount).
  useEffect(() => {
    const pending = readPendingLead();
    if (!pending) return;

    let cancelled = false;
    setPendingNotice(true);

    void (async () => {
      try {
        await createLead(pending, { skipQueue: true });
        if (cancelled) return;
        clearPendingLead();
        setPendingNotice(false);
        setStatus('success');
        trackEvent('generate_lead', {
          service: pending.service_type,
          area: pending.area,
          value: 0,
          queued_retry: true,
        });
      } catch {
        if (!cancelled) setPendingNotice(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status === 'success') {
      successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [status]);

  /** Effective area valid for the selected service (backend expects 0.5–50). */
  function effectiveArea(): number {
    const minA = minAreaForService(service);
    if (AREA_HIDDEN_SERVICES.has(service)) return minA;
    const rounded = roundArea(parseAreaInput(areaInput));
    if (!Number.isFinite(rounded)) return minA;
    return Math.min(Math.max(rounded, minA), MAX_AREA_DISPLAY);
  }

  const preview = calcClientPreview(service, areaInput, outOfCity);
  const showAreaInSummary = !AREA_HIDDEN_SERVICES.has(service);
  const estimateSummary = preview.ok
    ? [
        serviceLabel(service),
        showAreaInSummary ? `${formatArea(preview.area)} сот.` : null,
        outOfCity ? 'за містом' : null,
        `${preview.total} грн`,
      ]
        .filter(Boolean)
        .join(', ')
        .replace(/, ([^,]+)$/, ' — $1')
    : null;

  const selectedCity =
    cities.find((c) => c.id === cityId) ??
    cities.find((c) => isActiveRegion(c.name)) ??
    null;
  const singleCityMode = cities.length <= 1;
  const cityDisplayName = selectedCity?.name ?? 'Харків';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isValidPhone(phone)) {
      setPhoneError(true);
      phoneRef.current?.focus();
      phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setStatus('submitting');
    setSubmitError(null);

    const area = effectiveArea();
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      service_type: service,
      area,
      city_id: cityId,
      out_of_city: outOfCity,
      comment: comment.trim() || undefined,
    };

    try {
      await createLead(payload);
      clearPendingLead();
      setPendingNotice(false);
      trackEvent('generate_lead', {
        service,
        area,
        value: preview.ok ? preview.total : 0,
      });
      setStatus('success');
    } catch (err) {
      setStatus('idle');
      if (err instanceof ApiError && (err.code === 'NETWORK_ERROR' || err.code === 'BAD_GATEWAY')) {
        setPendingNotice(true);
      }
      if (err instanceof ApiError && err.message) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Не вдалося надіслати заявку. Спробуйте ще раз або зателефонуйте нам.');
      }
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function retryPending() {
    const pending = readPendingLead();
    if (!pending) {
      setPendingNotice(false);
      return;
    }
    setStatus('submitting');
    setSubmitError(null);
    try {
      await createLead(pending, { skipQueue: true });
      clearPendingLead();
      setPendingNotice(false);
      setStatus('success');
      trackEvent('generate_lead', {
        service: pending.service_type,
        area: pending.area,
        value: 0,
        queued_retry: true,
      });
    } catch (err) {
      setStatus('idle');
      setPendingNotice(true);
      setSubmitError(
        err instanceof ApiError && err.message
          ? err.message
          : 'Сервіс ще недоступний. Заявку збережено — спробуйте знову за хвилину.',
      );
    }
  }

  return (
    <div ref={formTopRef} className="min-w-0 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div className="bg-primary-dark px-4 sm:px-5 py-3 flex items-center gap-3">
        <Send className="w-5 h-5 text-white shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-white font-semibold text-sm sm:text-base">Залишити заявку</h2>
          <p className="text-white/70 text-xs">Передзвонимо протягом 15 хвилин</p>
        </div>
      </div>
      <div className="bg-white p-4 sm:p-5">
        {status === 'success' ? (
          <div ref={successRef} className="text-center py-6">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-primary" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Заявку прийнято!</h3>
            <p className="text-gray-500 text-sm">Передзвонимо вам протягом 15 хвилин</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {estimateSummary && (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                <p className="text-xs font-medium text-primary mb-0.5">До заявки додано</p>
                <p className="text-sm text-gray-800">{estimateSummary}</p>
              </div>
            )}

            {pendingNotice && (
              <div
                role="status"
                className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
              >
                <p className="font-medium mb-1">Заявку збережено на цьому пристрої</p>
                <p className="text-xs mb-2">Сервіс був недоступний. Можна надіслати повторно зараз.</p>
                <button
                  type="button"
                  onClick={() => void retryPending()}
                  disabled={status === 'submitting'}
                  className="text-xs font-semibold underline hover:no-underline disabled:opacity-60"
                >
                  Надіслати збережену заявку
                </button>
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="form-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Ваше ім&apos;я
              </label>
              <input
                type="text"
                id="form-name"
                placeholder="Наприклад, Іван"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="w-full max-w-full border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="form-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Номер телефону <span className="text-red-500">*</span>
              </label>
              <input
                ref={phoneRef}
                type="tel"
                id="form-phone"
                placeholder="+38 (0__) ___-__-__"
                value={phone}
                onChange={(e) => {
                  setPhone(formatPhone(e.target.value));
                  setPhoneError(false);
                }}
                required
                autoComplete="tel"
                aria-invalid={phoneError || undefined}
                aria-describedby={phoneError ? 'form-phone-error' : undefined}
                className={`w-full max-w-full border rounded-xl px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                  phoneError ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {phoneError && (
                <p id="form-phone-error" className="text-red-500 text-xs mt-1" role="alert">
                  Введіть коректний номер телефону (+380…)
                </p>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="form-city" className="block text-sm font-medium text-gray-700 mb-1.5">
                Місто / регіон <span className="text-red-500">*</span>
              </label>
              {singleCityMode ? (
                <div
                  id="form-city"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-4 py-2.5 text-sm text-gray-800"
                >
                  {cityDisplayName}
                </div>
              ) : (
                <div className="relative select-wrap">
                  <select
                    id="form-city"
                    value={cityId}
                    onChange={(e) => setCityId(Number(e.target.value))}
                    className="w-full max-w-full min-w-0 appearance-none bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                  >
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                    <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  </div>
                </div>
              )}
              <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">{REGION_NOTICE}</p>
            </div>

            <div className="mb-3">
              <label htmlFor="form-service" className="block text-sm font-medium text-gray-700 mb-1.5">
                Яка послуга потрібна?
              </label>
              <div className="relative select-wrap">
                <select
                  id="form-service"
                  value={service}
                  onChange={(e) => onServiceChange(e.target.value as ServiceType)}
                  className="w-full max-w-full min-w-0 appearance-none bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                >
                  {SERVICE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                  <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="form-comment" className="block text-sm font-medium text-gray-700 mb-1.5">
                Коментар <span className="text-gray-400 font-normal">(необов&apos;язково)</span>
              </label>
              <textarea
                id="form-comment"
                rows={2}
                placeholder="Адреса, зручний час…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                className="w-full max-w-full border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
              />
            </div>

            <div className="hidden sm:flex flex-col gap-1.5 mb-3">
              {PERKS.map((perk) => (
                <div key={perk} className="flex items-center gap-2 text-gray-600 text-xs">
                  <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" aria-hidden="true" />
                  </div>
                  {perk}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Відправляємо...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Надіслати заявку
                </>
              )}
            </button>

            {submitError && (
              <p className="text-red-500 text-xs mt-2.5 text-center" role="alert">
                {submitError}
              </p>
            )}

            <p className="text-center text-gray-400 text-xs mt-2.5">
              Або зателефонуйте:{' '}
              <a href={`tel:${siteConfig.phone}`} className="text-primary font-medium hover:underline">
                {siteConfig.phoneDisplay}
              </a>
            </p>
            <p className="text-center text-gray-400 text-xs mt-1.5">
              Надсилаючи заявку, ви погоджуєтесь з{' '}
              <Link href="/privacy" className="text-primary font-medium hover:underline">
                політикою конфіденційності
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
