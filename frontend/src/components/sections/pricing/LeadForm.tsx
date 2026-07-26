'use client';

import { useState, type FormEvent } from 'react';
import { Check, CheckCircle, ChevronDown, Send } from 'lucide-react';
import { createLead } from '@/lib/api';
import { siteConfig } from '@/lib/config';
import { SERVICE_OPTIONS } from '@/lib/content';
import {
  MAX_AREA_DISPLAY,
  minAreaForService,
  roundArea,
  type ServiceType,
} from '@/lib/pricing';

const PERKS = [
  'Безкоштовна консультація',
  'Виїзд зазвичай того ж дня',
  'Оплата після виконання роботи',
];

/** Formats raw digits into "+38 (0XX) XXX-XX-XX" as the user types. */
function formatPhone(raw: string): string {
  let val = raw.replace(/\D/g, '');
  if (val.startsWith('0')) val = '38' + val;
  if (val.length > 12) val = val.slice(0, 12);

  let formatted = '';
  if (val.length > 0) formatted = '+' + val.slice(0, 2);
  if (val.length > 2) formatted += ' (' + val.slice(2, 5);
  if (val.length > 5) formatted += ') ' + val.slice(5, 8);
  if (val.length > 8) formatted += '-' + val.slice(8, 10);
  if (val.length > 10) formatted += '-' + val.slice(10, 12);

  return formatted || raw;
}

function isValidPhone(val: string): boolean {
  return val.replace(/\D/g, '').length >= 10;
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
  const [phoneError, setPhoneError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<FormStatus>('idle');

  /** Effective area valid for the selected service (backend expects 0.5–50). */
  function effectiveArea(): number {
    const minA = minAreaForService(service);
    const rounded = roundArea(areaInput);
    if (!Number.isFinite(rounded)) return minA;
    return Math.min(Math.max(rounded, minA), MAX_AREA_DISPLAY);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isValidPhone(phone)) {
      setPhoneError(true);
      return;
    }

    setStatus('submitting');
    setSubmitError(null);

    try {
      await createLead({
        name: name.trim(),
        phone: phone.trim(),
        service_type: service,
        area: effectiveArea(),
        city_id: siteConfig.defaultCityId,
        out_of_city: outOfCity,
        comment: comment.trim() || undefined,
      });
      setStatus('success');
    } catch (err) {
      setStatus('idle');
      setSubmitError(
        err instanceof Error && err.message
          ? 'Не вдалося надіслати заявку. Спробуйте ще раз або зателефонуйте нам.'
          : 'Сталася помилка. Спробуйте пізніше.',
      );
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div className="bg-primary-dark px-6 py-4 flex items-center gap-3">
        <Send className="w-5 h-5 text-white" aria-hidden="true" />
        <div>
          <h3 className="text-white font-semibold">Залишити заявку</h3>
          <p className="text-white/70 text-xs">Передзвонимо протягом 15 хвилин</p>
        </div>
      </div>
      <div className="bg-white p-6">
        {status === 'success' ? (
          /* Success state */
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Заявку прийнято!</h3>
            <p className="text-gray-500 text-sm">Передзвонимо вам протягом 15 хвилин</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div className="mb-4">
              <label htmlFor="form-name" className="block text-sm font-medium text-gray-700 mb-2">
                Ваше ім&apos;я
              </label>
              <input
                type="text"
                id="form-name"
                placeholder="Наприклад, Іван"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label htmlFor="form-phone" className="block text-sm font-medium text-gray-700 mb-2">
                Номер телефону <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="form-phone"
                placeholder="+38 (___) ___ - __- __"
                value={phone}
                onChange={(e) => {
                  setPhone(formatPhone(e.target.value));
                  setPhoneError(false);
                }}
                required
                autoComplete="tel"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              {phoneError && (
                <p className="text-red-500 text-xs mt-1">Введіть коректний номер телефону</p>
              )}
            </div>

            {/* Service */}
            <div className="mb-4">
              <label htmlFor="form-service" className="block text-sm font-medium text-gray-700 mb-2">
                Яка послуга потрібна?
              </label>
              <div className="relative">
                <select
                  id="form-service"
                  value={service}
                  onChange={(e) => onServiceChange(e.target.value as ServiceType)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
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

            {/* Comment */}
            <div className="mb-5">
              <label htmlFor="form-comment" className="block text-sm font-medium text-gray-700 mb-2">
                Коментар <span className="text-gray-400 font-normal">(необов&apos;язково)</span>
              </label>
              <textarea
                id="form-comment"
                rows={3}
                placeholder="Площа ділянки, адреса, зручний час виїзду..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
              />
            </div>

            {/* Perks */}
            <div className="flex flex-col gap-2 mb-5">
              {PERKS.map((perk) => (
                <div key={perk} className="flex items-center gap-2 text-gray-600 text-xs">
                  <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" aria-hidden="true" />
                  </div>
                  {perk}
                </div>
              ))}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
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
              <p className="text-red-500 text-xs mt-3 text-center" role="alert">
                {submitError}
              </p>
            )}

            <p className="text-center text-gray-400 text-xs mt-3">
              Або зателефонуйте прямо зараз:{' '}
              <a href={`tel:${siteConfig.phoneAlt}`} className="text-primary font-medium hover:underline">
                {siteConfig.phoneAltDisplay}
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
