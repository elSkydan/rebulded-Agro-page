import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { PricingSection } from '@/components/sections/pricing/PricingSection';

export const metadata: Metadata = {
  title: 'Ціни в Харкові',
  description:
    'Скільки коштує вспашка городу, обробка целини та покос трави в Харкові. Онлайн-калькулятор і заявка — розрахунок за хвилину, передзвонимо протягом 15 хвилин.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Ціни в Харкові — калькулятор Agro Aggregator',
    description: 'Розрахуйте вартість вспашки, целини чи покосу в Харкові онлайн і залиште заявку.',
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
        <Suspense fallback={<div className="py-16 text-center text-gray-500 text-sm">Завантаження калькулятора…</div>}>
          <PricingSection />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
