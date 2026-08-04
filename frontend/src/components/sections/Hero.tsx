import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, MapPin, Phone } from 'lucide-react';
import { HERO_CARDS } from '@/lib/content';
import { siteConfig } from '@/lib/config';

export function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="hero-bg absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1800&q=85"
          alt=""
          fill
          priority
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
            Виїзд сьогодні · Будь-який район
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 max-w-2xl">
          Вспашка, <span className="text-primary-light">целина</span> і{' '}
          <br />
          покос
        </h1>

        {/* Subtitle */}
        <p className="text-white/80 text-base sm:text-lg mb-8 max-w-md">
          Приїдемо вже сьогодні на <strong className="text-white">Nissan Primastar</strong> з
          дизельним мотоблоком <strong className="text-white">Powercraft МБ 1012Д</strong>
        </p>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3 mb-8 max-w-lg">
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

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
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
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-6 h-6 text-white/50" aria-hidden="true" />
      </div>
    </section>
  );
}
