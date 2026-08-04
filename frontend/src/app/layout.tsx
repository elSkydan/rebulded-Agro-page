import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { siteConfig } from '@/lib/config';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'вспашка',
    'культивація',
    'обробка целини',
    'покос трави',
    'мотоблок',
    'вспашка огорода',
    'буріння лунок',
    'мийка техніки',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'uk_UA',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3e7b31',
};

/** LocalBusiness structured data for rich search results. */
function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    image: `${siteConfig.url}/opengraph-image`,
    telephone: siteConfig.phone,
    priceRange: '₴₴',
    openingHours: 'Mo-Su 07:00-20:00',
    areaServed: { '@type': 'Country', name: 'Ukraine' },
    makesOffer: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Вспашка і культивація' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Обробка целини' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Покос трави' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Буріння лунок' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Мийка техніки' } },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Set on Render (frontend service) once you have a GA4 property. Left unset,
// no analytics script is injected at all — safe to deploy either way.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={inter.variable}>
      <body className="font-sans bg-white text-gray-900 antialiased">
        <JsonLd />
        {children}
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
      </body>
    </html>
  );
}
