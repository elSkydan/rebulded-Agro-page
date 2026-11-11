'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { minAreaForService, type ServiceType } from '@/lib/pricing';
import { Calculator } from './Calculator';
import { LeadForm } from './LeadForm';

const SERVICE_TYPES: ReadonlySet<string> = new Set([
  'ogorod',
  'celina',
  'mowing',
  'tree',
  'washing',
]);

function parseServiceParam(raw: string | null): ServiceType | null {
  if (!raw || !SERVICE_TYPES.has(raw)) return null;
  return raw as ServiceType;
}

/**
 * Owns the state shared between the calculator and the lead form.
 * Service/area/out-of-city stay in one place so both panels always match
 * what gets submitted with the lead.
 */
export function PricingSection() {
  const searchParams = useSearchParams();
  const initial = parseServiceParam(searchParams.get('service')) ?? 'ogorod';

  const [service, setService] = useState<ServiceType>(initial);
  const [areaInput, setAreaInput] = useState<string>(String(minAreaForService(initial)));
  const [outOfCity, setOutOfCity] = useState(false);

  useEffect(() => {
    const fromQuery = parseServiceParam(searchParams.get('service'));
    if (!fromQuery) return;
    setService(fromQuery);
    setAreaInput(String(minAreaForService(fromQuery)));
  }, [searchParams]);

  const handleServiceChange = useCallback((next: ServiceType) => {
    setService(next);
    // Switching the service resets area to its minimum for that service.
    setAreaInput(String(minAreaForService(next)));
  }, []);

  return (
    <section id="pricing" className="py-10 sm:py-12 lg:py-14 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-8">
          <span className="inline-block bg-gray-100 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-3">
            Ціни та заявка
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Розрахуйте вартість і залиште заявку
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Оберіть послугу, вкажіть площу — і одразу залишайте заявку.
            <br className="hidden sm:block" />
            Передзвонимо протягом 15 хвилин.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start">
          <div className="min-w-0">
            <Calculator
              service={service}
              areaInput={areaInput}
              outOfCity={outOfCity}
              onServiceChange={handleServiceChange}
              onAreaChange={setAreaInput}
              onOutOfCityChange={setOutOfCity}
            />
          </div>
          <div className="min-w-0">
            <LeadForm
              service={service}
              onServiceChange={handleServiceChange}
              areaInput={areaInput}
              outOfCity={outOfCity}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
