'use client';

import { useState } from 'react';
import type { BeforeAfterItem } from '@/lib/content';

interface BeforeAfterCardProps {
  item: BeforeAfterItem;
}

export function BeforeAfterCard({ item }: BeforeAfterCardProps) {
  const [showAfter, setShowAfter] = useState(false);

  return (
    <div className="before-after-card rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white">
      <div className="relative">
        <div className="bg-primary px-4 py-3">
          <h3 className="text-white font-semibold text-sm">{item.title}</h3>
          <p className="text-white/70 text-xs">{item.subtitle}</p>
        </div>
        <button
          type="button"
          className="ba-image-container relative overflow-hidden block w-full cursor-pointer border-none p-0"
          style={{ height: 220 }}
          onClick={() => setShowAfter((v) => !v)}
          aria-label={showAfter ? 'Показати фото до' : 'Показати фото після'}
        >
          {/* <span> instead of <div>: a <button> only permits phrasing content */}
          <span
            role="img"
            aria-label={`${item.title} — фото до`}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${item.beforeImage}')` }}
          ></span>
          <span
            role="img"
            aria-label={`${item.title} — фото після`}
            className={`ba-after absolute inset-0 bg-cover bg-center ${showAfter ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url('${item.afterImage}')` }}
          ></span>
          <span className="absolute top-3 left-3">
            <span className="ba-label bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              ← До
            </span>
          </span>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap">
            Натисніть для порівняння
          </span>
        </button>
        <div className="flex border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowAfter(false)}
            className={`ba-btn flex-1 py-3 text-sm font-semibold ${
              !showAfter
                ? 'text-red-500 bg-red-50'
                : 'text-gray-400 hover:text-primary transition-colors'
            }`}
          >
            До
          </button>
          <button
            type="button"
            onClick={() => setShowAfter(true)}
            className={`ba-btn flex-1 py-3 text-sm font-semibold ${
              showAfter ? 'text-primary' : 'text-gray-400 hover:text-primary transition-colors'
            }`}
          >
            Після
          </button>
        </div>
      </div>
    </div>
  );
}
