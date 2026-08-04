import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Services } from '@/components/sections/Services';
import { ServicesFaq } from '@/components/sections/ServicesFaq';

export const metadata: Metadata = {
  title: 'Послуги',
  description:
    'Вспашка і культивація городу, обробка целини, покос трави фрезами, буріння лунок мотобуром, мийка техніки під тиском. Виїзд по всій Україні, оплата після виконання роботи.',
  alternates: { canonical: '/services' },
  openGraph: {
    title: 'Послуги — Agro Aggregator',
    description:
      'Вспашка, культивація, обробка целини, покос трави, буріння лунок, мийка техніки. Виїзд по всій Україні.',
    url: '/services',
    images: ['/opengraph-image'],
  },
};

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <Breadcrumbs items={[{ label: 'Послуги' }]} />
      <main>
        <Services />
        <ServicesFaq />
      </main>
      <Footer />
    </>
  );
}
