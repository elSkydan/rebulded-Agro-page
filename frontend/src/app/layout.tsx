import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { AnalyticsListeners } from '@/components/analytics/AnalyticsListeners';
import { siteConfig } from '@/lib/config';
import { jsonLdScript, localBusinessSchema, websiteSchema } from '@/lib/seo';
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
    'вспашка Харків',
    'вспашка городу Харків',
    'культивація Харків',
    'обробка целини Харків',
    'покос трави Харків',
    'мотоблок Харків',
    'буріння лунок Харків',
    'мийка техніки Харків',
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

/** LocalBusiness + WebSite structured data for rich / local results. */
function JsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(localBusinessSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteSchema()) }}
      />
    </>
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
      <body className="min-h-dvh flex flex-col font-sans bg-white text-gray-900 antialiased">
        <JsonLd />
        {children}
        <AnalyticsListeners />
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
      </body>
    </html>
  );
}
