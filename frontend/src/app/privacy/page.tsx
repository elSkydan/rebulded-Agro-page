import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { PrivacyPolicy } from '@/components/sections/privacy/PrivacyPolicy';

export const metadata: Metadata = {
  title: 'Політика конфіденційності',
  description:
    'Як Agro Aggregator збирає й використовує персональні дані з форми заявки та аналітики сайту.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Політика конфіденційності — Agro Aggregator',
    description: 'Обробка телефону, імені та технічних даних на сайті.',
    url: '/privacy',
    images: ['/opengraph-image'],
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <Breadcrumbs items={[{ label: 'Політика конфіденційності' }]} />
      <main className="flex-1 flex flex-col bg-gray-50">
        <PrivacyPolicy />
      </main>
      <Footer />
    </>
  );
}
