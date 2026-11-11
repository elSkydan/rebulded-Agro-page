import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Contractors } from '@/components/sections/contractors/Contractors';

export const metadata: Metadata = {
  title: 'Стати виконавцем у Харкові',
  description:
    'Підключіться як виконавець Agro Aggregator: отримуйте заявки на вспашку, целину та покос у Telegram після короткої перевірки.',
  alternates: { canonical: '/contractors' },
  openGraph: {
    title: 'Стати виконавцем — Agro Aggregator',
    description: 'Вимоги, перевірка та заявки для виконавців у Харкові.',
    url: '/contractors',
    images: ['/opengraph-image'],
  },
};

export default function ContractorsPage() {
  return (
    <>
      <Navbar />
      <Breadcrumbs items={[{ label: 'Стати виконавцем' }]} />
      <main className="flex-1 flex flex-col bg-gray-50">
        <Contractors />
      </main>
      <Footer />
    </>
  );
}
