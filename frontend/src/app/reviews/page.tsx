import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Reviews } from '@/components/sections/reviews/Reviews';

export const metadata: Metadata = {
  title: 'Відгуки клієнтів у Харкові',
  description:
    'Відгуки про вспашку, целину та покос у Харкові. Читайте досвід клієнтів і дивіться рейтинг у Google.',
  alternates: { canonical: '/reviews' },
  openGraph: {
    title: 'Відгуки — Agro Aggregator',
    description: 'Що кажуть клієнти про роботи в Харкові.',
    url: '/reviews',
    images: ['/opengraph-image'],
  },
};

export default function ReviewsPage() {
  return (
    <>
      <Navbar />
      <Breadcrumbs items={[{ label: 'Відгуки' }]} />
      <main className="flex-1 flex flex-col bg-gray-50">
        <Reviews />
      </main>
      <Footer />
    </>
  );
}
