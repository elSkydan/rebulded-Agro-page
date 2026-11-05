import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Services } from '@/components/sections/Services';
import { ServicesFaq } from '@/components/sections/ServicesFaq';

export const metadata: Metadata = {
  title: 'Послуги в Харкові',
  description:
    'Вспашка і культивація городу, обробка целини, покос трави, буріння лунок і мийка техніки в Харкові. Виїзд сьогодні, оплата після роботи.',
  alternates: { canonical: '/services' },
  openGraph: {
    title: 'Послуги в Харкові — Agro Aggregator',
    description:
      'Вспашка, культивація, обробка целини, покос трави, буріння лунок, мийка техніки в Харкові.',
    url: '/services',
    images: ['/opengraph-image'],
  },
};

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <Breadcrumbs items={[{ label: 'Послуги' }]} />
      <main className="flex-1">
        <Services />
        <ServicesFaq />
      </main>
      <Footer />
    </>
  );
}
