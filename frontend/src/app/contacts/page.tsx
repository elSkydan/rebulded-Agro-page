import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Contacts } from '@/components/sections/Contacts';

export const metadata: Metadata = {
  title: 'Контакти',
  description:
    'Зв\'яжіться з Agro Aggregator: телефон, графік роботи, зона обслуговування по всій Україні. Передзвонимо протягом 15 хвилин.',
  alternates: { canonical: '/contacts' },
  openGraph: {
    title: 'Контакти — Agro Aggregator',
    description: 'Телефон, графік роботи і зона обслуговування Agro Aggregator.',
    url: '/contacts',
    images: ['/opengraph-image'],
  },
};

export default function ContactsPage() {
  return (
    <>
      <Navbar />
      <Breadcrumbs items={[{ label: 'Контакти' }]} />
      <main>
        <Contacts />
      </main>
      <Footer />
    </>
  );
}
