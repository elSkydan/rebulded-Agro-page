import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Works } from '@/components/sections/works/Works';

export const metadata: Metadata = {
  title: 'Наші роботи',
  description:
    'Фото до і після: обробка целини, покос трави, підготовка ділянки під посадку. Приклади виконаних робіт мотоблоком Powercraft МБ 1012Д.',
  alternates: { canonical: '/works' },
  openGraph: {
    title: 'Наші роботи — Agro Aggregator',
    description: 'Фото до і після виконаних робіт — обробка целини, покос трави, підготовка ділянки.',
    url: '/works',
    images: ['/opengraph-image'],
  },
};

export default function WorksPage() {
  return (
    <>
      <Navbar />
      <Breadcrumbs items={[{ label: 'Наші роботи' }]} />
      <main>
        <Works />
      </main>
      <Footer />
    </>
  );
}
