import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Contacts } from '@/components/sections/Contacts';

export const metadata: Metadata = {
  title: 'Контакти — Харків',
  description:
    'Зв\'яжіться з Agro Aggregator у Харкові: телефон +38 (067) 902-03-26, графік Пн–Нд 7:00–20:00. Передзвонимо протягом 15 хвилин.',
  alternates: { canonical: '/contacts' },
  openGraph: {
    title: 'Контакти в Харкові — Agro Aggregator',
    description: 'Телефон, графік роботи і зона обслуговування в Харкові.',
    url: '/contacts',
    images: ['/opengraph-image'],
  },
};

export default function ContactsPage() {
  return (
    <>
      <Navbar />
      <Breadcrumbs items={[{ label: 'Контакти' }]} />
      <main className="flex-1 flex flex-col bg-gray-50">
        <Contacts />
      </main>
      <Footer />
    </>
  );
}
