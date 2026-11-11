import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { PricingSection } from '@/components/sections/pricing/PricingSection';

export const metadata: Metadata = {
  title: 'Ціни в Харкові',
  description:
    'Скільки коштує вспашка городу, обробка целини та покос трави в Харкові. Оранка від 300 грн/сот., покіс від 200 грн/сот. Онлайн-калькулятор і заявка — передзвонимо протягом 15 хвилин.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Ціни в Харкові — калькулятор Agro Aggregator',
    description:
      'Розрахуйте вартість вспашки, целини чи покосу в Харкові онлайн. Оранка від 300 грн/сот., покіс від 200 грн/сот.',
    url: '/pricing',
    images: ['/opengraph-image'],
  },
};

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <Breadcrumbs items={[{ label: 'Ціни' }]} />
      <main className="flex-1">
        <section id="pricing" className="py-10 sm:py-12 lg:py-14 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 sm:mb-8">
              <span className="inline-block bg-gray-100 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-3">
                Ціни та заявка
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Розрахуйте вартість і залиште заявку
              </h1>
              <p className="text-gray-500 text-sm sm:text-base">
                Оберіть послугу, вкажіть площу — і одразу залишайте заявку.
                <br className="hidden sm:block" />
                Передзвонимо протягом 15 хвилин.
              </p>
            </div>
            <Suspense
              fallback={
                <div className="py-16 text-center text-gray-500 text-sm">
                  Завантаження калькулятора…
                </div>
              }
            >
              <PricingSection />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
