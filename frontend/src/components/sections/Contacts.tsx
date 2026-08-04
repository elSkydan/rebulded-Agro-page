import Link from 'next/link';
import { Clock, MapPin, Phone, Send } from 'lucide-react';
import { siteConfig } from '@/lib/config';

const CONTACT_CARDS = [
  {
    icon: Phone,
    title: 'Телефон',
    body: siteConfig.phoneDisplay,
    href: `tel:${siteConfig.phone}`,
  },
  {
    icon: Clock,
    title: 'Графік роботи',
    body: siteConfig.workingHours,
  },
  {
    icon: MapPin,
    title: 'Зона обслуговування',
    body: 'Працюємо по всій Україні — виїзд у будь-яке місто чи село за домовленістю',
  },
];

export function Contacts() {
  return (
    <section className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            Контакти
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Зв&apos;яжіться з нами</h1>
          <p className="text-gray-500 text-base sm:text-lg">
            Зателефонуйте — відповімо на всі питання і безкоштовно розрахуємо вартість
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {CONTACT_CARDS.map((card) => {
            const content = (
              <>
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
                  <card.icon className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {card.title}
                </h2>
                <p className="text-gray-900 font-medium">{card.body}</p>
              </>
            );

            return card.href ? (
              <a
                key={card.title}
                href={card.href}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
              >
                {content}
              </a>
            ) : (
              <div
                key={card.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                {content}
              </div>
            );
          })}
        </div>

        <div className="bg-primary rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Send className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm sm:text-base">
                Не хочете дзвонити зараз?
              </p>
              <p className="text-white/70 text-sm">Залиште заявку онлайн — передзвонимо самі</p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            Залишити заявку
          </Link>
        </div>
      </div>
    </section>
  );
}
