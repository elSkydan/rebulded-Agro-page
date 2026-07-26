import { Info, Phone, PlusCircle } from 'lucide-react';
import { SERVICE_CARDS } from '@/lib/content';
import { siteConfig } from '@/lib/config';

export function Services() {
  return (
    <section id="services" className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            Послуги
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Що ми робимо</h2>
          <p className="text-gray-500 text-base sm:text-lg">
            Виконуємо роботи потужним дизельним мотоблоком 12 л.с.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {SERVICE_CARDS.map((service) => (
            <div
              key={service.title}
              className="service-card relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              {service.badge && (
                <div className="absolute top-4 right-4">
                  <span className="bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    {service.badge}
                  </span>
                </div>
              )}
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
                <service.icon className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{service.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{service.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-primary font-bold text-lg">{service.price}</span>
                <span className="text-gray-400 text-xs uppercase tracking-wide">
                  За домовленістю
                </span>
              </div>
            </div>
          ))}

          {/* Empty spacer card - desktop */}
          <div className="hidden lg:flex bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/10 items-center justify-center">
            <div className="text-center">
              <PlusCircle className="w-10 h-10 text-primary/40 mx-auto mb-3" aria-hidden="true" />
              <p className="text-primary/60 text-sm font-medium">Є інше завдання?</p>
              <p className="text-primary/40 text-xs mt-1">Зателефонуйте — обговоримо</p>
            </div>
          </div>
        </div>

        {/* Bottom CTA bar */}
        <div className="bg-primary rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm sm:text-base">
                Ціна залежить від об&apos;єму та складності робіт
              </p>
              <p className="text-white/70 text-sm">
                Зателефонуйте — розрахуємо безкоштовно за 2 хвилини
              </p>
            </div>
          </div>
          <a
            href={`tel:${siteConfig.phone}`}
            className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            Дзвонити
          </a>
        </div>
      </div>
    </section>
  );
}
