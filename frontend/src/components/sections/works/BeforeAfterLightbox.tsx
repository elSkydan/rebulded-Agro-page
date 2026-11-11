'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { BeforeAfterItem } from '@/lib/content';

type Phase = 'before' | 'after';

interface BeforeAfterLightboxProps {
  item: BeforeAfterItem;
  initialPhase: Phase;
  open: boolean;
  onClose: () => void;
}

const SWIPE_THRESHOLD_PX = 56;

/**
 * Fullscreen before/after viewer — pattern adapted from Airbnb / Google Photos
 * lightboxes + portfolio before-after UX:
 * native <dialog>, Esc/backdrop/× close, arrow + swipe for До/Після,
 * focus return, object-contain so photos keep their ratio.
 */
export function BeforeAfterLightbox({
  item,
  initialPhase,
  open,
  onClose,
}: BeforeAfterLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [entered, setEntered] = useState(false);
  const pointerStartX = useRef<number | null>(null);

  const src = phase === 'after' ? item.afterImage : item.beforeImage;
  const phaseLabel = phase === 'after' ? 'Після' : 'До';
  const alt = `${item.title} — фото ${phase === 'after' ? 'після' : 'до'}`;

  useEffect(() => {
    if (open) setPhase(initialPhase);
  }, [open, initialPhase]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      // Next frame so CSS transition can run from opacity 0.
      const raf = requestAnimationFrame(() => setEntered(true));
      closeBtnRef.current?.focus();
      return () => cancelAnimationFrame(raf);
    }

    setEntered(false);
    if (dialog.open) dialog.close();
  }, [open]);

  const handleClose = useCallback(() => {
    setEntered(false);
    onClose();
  }, [onClose]);

  const showBefore = useCallback(() => setPhase('before'), []);
  const showAfter = useCallback(() => setPhase('after'), []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showBefore();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        showAfter();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, showBefore, showAfter]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStartX.current = event.clientX;
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerStartX.current === null) return;
    const dx = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (dx < 0) showAfter();
    else showBefore();
  }

  function onPointerCancel() {
    pointerStartX.current = null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="ba-lightbox fixed inset-0 m-0 max-h-none max-w-none h-full w-full border-0 bg-transparent p-0 open:flex"
      aria-labelledby={titleId}
      onClose={handleClose}
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) handleClose();
      }}
    >
      <div
        className={`ba-lightbox-shell relative flex h-full w-full flex-col bg-black/92 text-white transition-opacity duration-200 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Top chrome */}
        <header className="flex items-start justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:px-6">
          <div className="min-w-0 pt-1">
            <p id={titleId} className="truncate text-base font-semibold sm:text-lg">
              {item.title}
            </p>
            <p className="truncate text-sm text-white/65">{item.subtitle}</p>
            <p className="mt-1 text-xs text-white/50" aria-live="polite">
              {phaseLabel} · {phase === 'before' ? '1' : '2'} / 2
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={handleClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Закрити"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Stage */}
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-12"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <button
            type="button"
            onClick={showBefore}
            disabled={phase === 'before'}
            className="absolute left-2 z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30 sm:inline-flex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Показати фото до"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>

          <figure className="relative mx-auto h-full w-full max-w-6xl min-h-[45vh]">
            <Image
              key={phase}
              src={src}
              alt={alt}
              fill
              priority
              sizes="100vw"
              className="ba-lightbox-image object-contain select-none"
              draggable={false}
            />
          </figure>

          <button
            type="button"
            onClick={showAfter}
            disabled={phase === 'after'}
            className="absolute right-2 z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30 sm:inline-flex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Показати фото після"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Bottom controls */}
        <footer className="flex flex-col items-center gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div
            className="inline-flex rounded-full bg-white/10 p-1"
            role="group"
            aria-label="Перемикач до і після"
          >
            <button
              type="button"
              onClick={showBefore}
              aria-pressed={phase === 'before'}
              className={`min-h-11 min-w-[5.5rem] rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                phase === 'before'
                  ? 'bg-primary text-white'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              До
            </button>
            <button
              type="button"
              onClick={showAfter}
              aria-pressed={phase === 'after'}
              className={`min-h-11 min-w-[5.5rem] rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                phase === 'after'
                  ? 'bg-primary text-white'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              Після
            </button>
          </div>
          <p className="text-center text-xs text-white/45 sm:hidden">
            Свайпніть вбік або натисніть До / Після
          </p>
        </footer>
      </div>
    </dialog>
  );
}
