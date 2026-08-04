import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { PricingSection } from '@/components/sections/pricing/PricingSection';

export const metadata: Metadata = {
  title: 'Ціни',
  description:
    'Скільки коштує вспашка городу, обробка целини, покос трави мотоблоком. Онлайн-калькулятор вартості та заявка — розрахунок за хвилину, передзвонимо протягом 15 хвилин.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Ціни та калькулятор вартості — Agro Aggregator',
    description: 'Розрахуйте вартість вспашки, обробки целини чи покосу трави онлайн і залиште заявку.',
    url: '/pricing',
    images: ['/opengraph-image'],
  },
};

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <Breadcrumbs items={[{ label: 'Ціни' }]} />
      <main>
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}
