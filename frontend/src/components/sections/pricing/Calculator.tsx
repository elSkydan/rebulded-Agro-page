'use client';

import { useEffect, useRef, useState } from 'react';
import { Calculator as CalculatorIcon, ChevronDown, TriangleAlert } from 'lucide-react';
import {
  AREA_OPTIONAL_SERVICES,
  MAX_AREA_DISPLAY,
  OUT_OF_CITY_RADIUS_KM,
  OUT_OF_CITY_SURCHARGE_UAH,
  SERVICE_UI_NOTE,
  calcClientPreview,
  formatArea,
  formatFormula,
  minAreaForService,
  type ServiceType,
} from '@/lib/pricing';
import { SERVICE_OPTIONS } from '@/lib/content';

const CALC_DEBOUNCE_MS = 300;

interface CalculatorProps {
  service: ServiceType;
  areaInput: string;
  outOfCity: boolean;
  onServiceChange: (service: ServiceType) => void;
  onAreaChange: (value: string) => void;
  onOutOfCityChange: (value: boolean) => void;
}

export function Calculator({
  service,
  areaInput,
  outOfCity,
  onServiceChange,
  onAreaChange,
  onOutOfCityChange,
}: CalculatorProps) {
  // Debounced snapshot of the inputs — mirrors the 300ms debounce of the
  // legacy implementation so the price doesn't jump on every keystroke.
  const [applied, setApplied] = useState({ service, areaInput, outOfCity });
  const [pulse, setPulse] = useState(false);
  const lastTotalRef = useRef<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setApplied({ service, areaInput, outOfCity });
      // Clamp the visible input when the value is out of bounds for the service
      const p = calcClientPreview(service, areaInput, outOfCity);
      if (p.ok && (p.wasClampedMin || p.wasClampedMax)) {
        onAreaChange(String(p.area));
      }
    }, CALC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [service, areaInput, outOfCity, onAreaChange]);

  const preview = calcClientPreview(applied.service, applied.areaInput, applied.outOfCity);
  const minA = minAreaForService(applied.service);
  const areaDimmed = AREA_OPTIONAL_SERVICES.has(service);
  const priceText = preview.ok ? `${preview.total} грн` : '— грн';

  // Pulse animation when the total changes
  useEffect(() => {
    if (priceText !== lastTotalRef.current) {
      lastTotalRef.current = priceText;
      setPulse(false);
      const raf = requestAnimationFrame(() => setPulse(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [priceText]);

  return (
    <div className="min-w-0 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div className="bg-primary px-4 sm:px-5 py-3 flex items-center gap-3">
        <CalculatorIcon className="w-5 h-5 text-white shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-white font-semibold text-sm sm:text-base">Калькулятор вартості</h2>
          <p className="text-white/70 text-xs">Оберіть послугу і площу</p>
        </div>
      </div>
      <div className="bg-white p-4 sm:p-5">
        {/* Service select */}
        <div className="mb-3 sm:mb-4">
          <label htmlFor="calc-service" className="block text-sm font-medium text-gray-700 mb-1.5">
            Послуга
          </label>
          <div className="relative select-wrap">
            <select
              id="calc-service"
              value={service}
              onChange={(e) => onServiceChange(e.target.value as ServiceType)}
              className="w-full max-w-full min-w-0 appearance-none bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 pr-10 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
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
          <p className="text-xs text-gray-500 mt-1.5 min-h-[1.25rem]" aria-live="polite">
            {SERVICE_UI_NOTE[service]}
          </p>
        </div>

        {/* Area (sotkas) */}
        <div
          className="mb-3 sm:mb-4"
          style={{
            opacity: areaDimmed ? 0.45 : 1,
            pointerEvents: areaDimmed ? 'none' : 'auto',
          }}
        >
          <label htmlFor="calc-area-input" className="block text-sm font-medium text-gray-700 mb-1.5">
            Площа (соток)
          </label>
          <input
            id="calc-area-input"
            type="number"
            min={minAreaForService(service)}
            max={MAX_AREA_DISPLAY}
            step={0.5}
            inputMode="decimal"
            value={areaInput}
            onChange={(e) => onAreaChange(e.target.value)}
            className="w-full max-w-full border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <p className="text-xs text-gray-500 mt-1">
            Мін. {formatArea(minA)} · макс. {MAX_AREA_DISPLAY} сот. · крок 0,5
            {preview.ok ? (
              <>
                {' '}
                · для розрахунку:{' '}
                <span className="text-primary font-semibold">{formatArea(preview.area)}</span>
              </>
            ) : null}
          </p>
        </div>

        {/* Outskirts & grass */}
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <input
              id="outskirts-cb"
              type="checkbox"
              checked={outOfCity}
              onChange={(e) => onOutOfCityChange(e.target.checked)}
              className="w-4 h-4 accent-primary mt-0.5 cursor-pointer shrink-0"
            />
            <div className="min-w-0">
              <label htmlFor="outskirts-cb" className="text-sm font-semibold text-gray-800 cursor-pointer">
                За містом{' '}
                <span className="text-primary font-medium">
                  (+{OUT_OF_CITY_SURCHARGE_UAH} грн, до {OUT_OF_CITY_RADIUS_KM} км)
                </span>
              </label>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <input
              id="grass-present-cb"
              type="checkbox"
              className="w-4 h-4 accent-primary mt-0.5 cursor-pointer shrink-0"
            />
            <div className="min-w-0">
              <label htmlFor="grass-present-cb" className="text-sm font-semibold text-gray-800 cursor-pointer">
                Висока трава / поросль
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Лише для менеджера — на ціну не впливає
              </p>
            </div>
          </div>
        </div>

        {/* Price formula display */}
        <div className="text-xs sm:text-sm text-gray-500 mb-2 break-words">
          {formatFormula(applied.service, preview.ok ? preview.area : NaN, applied.outOfCity, preview)}
        </div>

        {/* Price result */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-600 text-sm font-medium shrink-0">Орієнтовно:</span>
            <span
              className={`calc-price-display text-primary font-extrabold text-2xl sm:text-3xl tabular-nums ${pulse ? 'calc-price-display--pulse' : ''}`}
            >
              {priceText}
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-3 flex items-start gap-2 text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
          <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs">Орієнтовна вартість. Точна ціна — після огляду ділянки.</p>
        </div>
      </div>
    </div>
  );
}
