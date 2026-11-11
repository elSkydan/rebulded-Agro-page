import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, MapPin, Phone } from 'lucide-react';
import { HERO_CARDS } from '@/lib/content';
import { siteConfig } from '@/lib/config';
import {
  MIN_ORDER_UAH,
  OUT_OF_CITY_RADIUS_KM,
  OUT_OF_CITY_SURCHARGE_UAH,
} from '@/lib/pricing';
import pokosAfter from '@/assets/works/pokos-after.jpg';

export function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background — real works photo (покос) */}
      <div className="hero-bg absolute inset-0">
        <Image
          src={pokosAfter}
          alt="Покос трави мотоблоком у Харкові — результат роботи"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover"
        />
        <div className="hero-overlay absolute inset-0"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
          <MapPin className="w-4 h-4 text-primary-light" aria-hidden="true" />
          <span className="text-white text-sm font-medium">
            Харків · виїзд сьогодні
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 max-w-2xl">
          Якісна <span className="text-primary-light">оранка</span>,
          <br />
          обробка цілини, покіс та інші господарські роботи у Харкові
        </h1>

        {/* Subtitle */}
        <p className="text-white/80 text-base sm:text-lg mb-8 max-w-md">
          Приїдемо вже сьогодні. Працюємо по Харкову та області.
        </p>

        {/* CTA above cards so mobile first screen shows actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <a
            href={`tel:${siteConfig.phone}`}
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-primary/30 hover:shadow-xl"
          >
            <Phone className="w-5 h-5" aria-hidden="true" />
            Зателефонувати зараз
          </a>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200"
          >
            Розрахувати ціну
          </Link>
        </div>

        <p className="text-white/70 text-sm mb-8 max-w-lg">
          Мін. замовлення від {MIN_ORDER_UAH} грн · Виїзд за місто +{OUT_OF_CITY_SURCHARGE_UAH}{' '}
          грн (до {OUT_OF_CITY_RADIUS_KM} км)
        </p>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3 max-w-lg">
          {HERO_CARDS.map((card) => (
            <div key={card.label} className="hero-card flex items-center gap-3 p-3 rounded-xl">
              <div className="w-8 h-8 bg-primary/80 rounded-lg flex items-center justify-center flex-shrink-0">
                <card.icon className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-white/60 text-xs">{card.label}</p>
                <p className="text-white text-sm font-semibold">{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-6 h-6 text-white/50" aria-hidden="true" />
      </div>
    </section>
  );
}
