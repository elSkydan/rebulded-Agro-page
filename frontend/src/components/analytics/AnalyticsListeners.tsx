'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

/**
 * Captures clicks on any tel: link (server- or client-rendered) as click_tel.
 * Mount once from the root layout.
 */
export function AnalyticsListeners() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a[href^="tel:"]');
      if (!link) return;
      trackEvent('click_tel', {
        link_url: link.getAttribute('href') ?? 'tel:',
      });
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
