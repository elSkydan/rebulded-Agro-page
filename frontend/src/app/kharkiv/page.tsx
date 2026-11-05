import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, MapPin, Phone, Wallet } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { siteConfig } from '@/lib/config';
import { SERVICE_LANDINGS } from '@/lib/service-pages';
import { jsonLdScript, localBusinessSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Агропослуги в Харкові — вспашка, целина, покос',
  description:
    'Agro Aggregator у Харкові: вспашка городу, обробка целини, покос трави, буріння лунок і мийка техніки. Виїзд сьогодні, оплата після роботи. Тел. +38 (067) 902-03-26.',
  keywords: [
    'вспашка Харків',
    'покос трави Харків',
    'целина Харків',
    'агропослуги Харків',
    'мотоблок Харків',
  ],
  alternates: { canonical: '/kharkiv' },
  openGraph: {
    title: 'Агропослуги в Харкові — Agro Aggregator',
    description:
      'Вспашка, целина і покос у Харкові. Виїзд сьогодні, розрахунок за 2 хвилини, оплата після роботи.',
    url: '/kharkiv',
    images: ['/opengraph-image'],
  },
};

const HIGHLIGHTS = [
  'Зараз основний регіон роботи — Харків і область',
  'Виїзд зазвичай у день звернення',
  'Онлайн-калькулятор і заявка за 1 хвилину',
  'Оплата тільки після виконання робіт',
];

export default function KharkivPage() {
  const schema = {
    ...localBusinessSchema(),
    url: `${siteConfig.url}/kharkiv`,
  };

  return (
    <>
      <Navbar />
      <Breadcrumbs items={[{ label: 'Харків' }]} />
      <main className="flex-1">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(schema) }}
        />

        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 mb-5">
              <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700">Регіон роботи зараз</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Вспашка, целина і покос у Харкові
            </h1>
            <p className="text-gray-600 text-base sm:text-lg mb-8 max-w-2xl">
              Працюємо дизельним мотоблоком Powercraft МБ 1012Д по Харкову та області.
              Залиште заявку або зателефонуйте — передзвонимо протягом 15 хвилин і безкоштовно
              порахуємо вартість.
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <a
                href={`tel:${siteConfig.phone}`}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-3 rounded-xl"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                {siteConfig.phoneDisplay}
              </a>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-900 font-semibold px-5 py-3 rounded-xl hover:bg-gray-50"
              >
                <Wallet className="w-4 h-4" aria-hidden="true" />
                Калькулятор і заявка
              </Link>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Послуги в Харкові</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SERVICE_LANDINGS.map((service) => (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-bold text-gray-900 mb-1">{service.title}</h3>
                  <p className="text-primary font-semibold text-sm mb-2">{service.priceLabel}</p>
                  <p className="text-gray-500 text-sm line-clamp-2">{service.intro}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
