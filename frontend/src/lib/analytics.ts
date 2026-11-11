'use client';

import { sendGAEvent } from '@next/third-parties/google';

type EventParams = Record<string, string | number | boolean | undefined>;

/** Fire a GA4 custom event. No-ops when GA is not configured. */
export function trackEvent(name: string, params: EventParams = {}) {
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return;

  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) cleaned[key] = value;
  }

  try {
    sendGAEvent('event', name, cleaned);
  } catch {
    // Analytics must never break UX.
  }
}
