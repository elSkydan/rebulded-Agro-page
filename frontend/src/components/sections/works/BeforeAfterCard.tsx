'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { Expand } from 'lucide-react';
import type { BeforeAfterItem } from '@/lib/content';
import { BeforeAfterLightbox } from './BeforeAfterLightbox';

interface BeforeAfterCardProps {
  item: BeforeAfterItem;
}

export function BeforeAfterCard({ item }: BeforeAfterCardProps) {
  const [showAfter, setShowAfter] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const wasOpen = useRef(false);

  // Return focus to the open trigger after the lightbox closes.
  useEffect(() => {
    if (wasOpen.current && !lightboxOpen) {
      openBtnRef.current?.focus();
    }
    wasOpen.current = lightboxOpen;
  }, [lightboxOpen]);

  return (
    <>
      <article
        className="before-after-card rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white"
        aria-labelledby={titleId}
      >
        <div className="relative">
          <div className="bg-primary px-4 py-3">
            <h2 id={titleId} className="text-white font-semibold text-sm">
              {item.title}
            </h2>
            <p className="text-white/70 text-xs">{item.subtitle}</p>
          </div>

          <button
            ref={openBtnRef}
            type="button"
            className="ba-image-container group relative block w-full cursor-zoom-in overflow-hidden border-none p-0"
            style={{ height: 220 }}
            onClick={() => setLightboxOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={lightboxOpen}
            aria-label={`Відкрити фото «${item.title}» на весь екран (${showAfter ? 'після' : 'до'})`}
          >
            <Image
              src={item.beforeImage}
              alt={`${item.title} — фото до`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              loading="lazy"
              className="absolute inset-0 object-cover"
            />
            <Image
              src={item.afterImage}
              alt={`${item.title} — фото після`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              loading="lazy"
              className={`ba-after absolute inset-0 object-cover ${showAfter ? 'opacity-100' : 'opacity-0'}`}
            />
            <span
              className="pointer-events-none absolute right-3 bottom-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-sm transition-transform duration-200 group-hover:scale-105 group-focus-visible:scale-105"
              aria-hidden="true"
            >
              <Expand className="h-4 w-4" />
            </span>
            <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/50 px-2 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
              {showAfter ? 'Після' : 'До'}
            </span>
          </button>

          <div
            className="flex border-t border-gray-100"
            role="group"
            aria-label="Перемикач до і після"
          >
            <button
              type="button"
              onClick={() => setShowAfter(false)}
              aria-pressed={!showAfter}
              className={`ba-btn flex-1 min-h-11 py-3 text-sm font-semibold transition-colors ${
                !showAfter
                  ? 'text-primary bg-primary/10'
                  : 'text-gray-400 hover:text-primary'
              }`}
            >
              До
            </button>
            <button
              type="button"
              onClick={() => setShowAfter(true)}
              aria-pressed={showAfter}
              className={`ba-btn flex-1 min-h-11 py-3 text-sm font-semibold transition-colors ${
                showAfter
                  ? 'text-primary bg-primary/10'
                  : 'text-gray-400 hover:text-primary'
              }`}
            >
              Після
            </button>
          </div>
        </div>
      </article>

      <BeforeAfterLightbox
        item={item}
        initialPhase={showAfter ? 'after' : 'before'}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
