'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';
import {
  isCalculatorService,
  minAreaForService,
  parseAreaInput,
  parseServiceParam,
  type ServiceType,
} from '@/lib/pricing';
import { Calculator } from './Calculator';
import { LeadForm } from './LeadForm';

function toCalculatorService(type: ServiceType): ServiceType {
  return isCalculatorService(type) ? type : 'ogorod';
}

/**
 * Owns the state shared between the calculator and the lead form.
 * Service/area/out-of-city stay in one place so both panels always match
 * what gets submitted with the lead.
 *
 * Page chrome (H1 / intro) lives in the server `pricing/page.tsx` so crawlers
 * see it in the initial HTML.
 */
export function PricingSection() {
  const searchParams = useSearchParams();
  const initial = toCalculatorService(parseServiceParam(searchParams.get('service')) ?? 'ogorod');

  const [service, setService] = useState<ServiceType>(initial);
  const [areaInput, setAreaInput] = useState<string>(String(minAreaForService(initial)));
  const [outOfCity, setOutOfCity] = useState(false);
  const skipFirstAnalytics = useRef(true);

  useEffect(() => {
    const fromQuery = parseServiceParam(searchParams.get('service'));
    if (!fromQuery) return;
    const next = toCalculatorService(fromQuery);
    setService(next);
    setAreaInput(String(minAreaForService(next)));
  }, [searchParams]);

  useEffect(() => {
    if (skipFirstAnalytics.current) {
      skipFirstAnalytics.current = false;
      return;
    }
    const timer = setTimeout(() => {
      trackEvent('calculator_change', {
        service,
        area: parseAreaInput(areaInput) || 0,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [service, areaInput]);

  const handleServiceChange = useCallback((next: ServiceType) => {
    setService(next);
    // Switching the service resets area to its minimum for that service.
    setAreaInput(String(minAreaForService(next)));
  }, []);

  return (
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
  );
}
