import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Phone, Wallet } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { siteConfig } from '@/lib/config';
import { getServiceLanding, serviceLandingSlugs } from '@/lib/service-pages';
import { jsonLdScript, serviceSchema } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return serviceLandingSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const landing = getServiceLanding(slug);
  if (!landing) return {};

  return {
    title: landing.title,
    description: landing.description,
    keywords: landing.keywords,
    alternates: { canonical: `/services/${landing.slug}` },
    openGraph: {
      title: `${landing.title} — ${siteConfig.name}`,
      description: landing.description,
      url: `/services/${landing.slug}`,
      images: ['/opengraph-image'],
    },
  };
}

export default async function ServiceLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const landing = getServiceLanding(slug);
  if (!landing) notFound();

  const pageUrl = `${siteConfig.url}/services/${landing.slug}`;
  const schema = serviceSchema({
    name: landing.h1,
    description: landing.description,
    url: pageUrl,
    priceFrom: landing.priceFrom,
  });

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: landing.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <>
      <Navbar />
      <Breadcrumbs
        items={[
          { label: 'Послуги', href: '/services' },
          { label: landing.title },
        ]}
      />
      <main className="flex-1">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(schema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(faqSchema) }}
        />

        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="inline-block bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              {siteConfig.region}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{landing.h1}</h1>
            <p className="text-gray-600 text-base sm:text-lg mb-6">{landing.intro}</p>
            <p className="text-primary font-bold text-xl mb-8">{landing.priceLabel}</p>

            <ul className="flex flex-col gap-3 mb-10">
              {landing.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-gray-700 text-sm sm:text-base">
                  <span className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" aria-hidden="true" />
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <a
                href={`tel:${siteConfig.phone}`}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-3 rounded-xl"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                {siteConfig.phoneDisplay}
              </a>
              <Link
                href={`/pricing?service=${landing.serviceType}`}
                className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-900 font-semibold px-5 py-3 rounded-xl hover:bg-gray-50"
              >
                <Wallet className="w-4 h-4" aria-hidden="true" />
                Розрахувати ціну
              </Link>
            </div>

            {landing.faq.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Часті запитання</h2>
                {landing.faq.map((item) => (
                  <div key={item.question} className="bg-white rounded-2xl p-5 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.answer}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-10 text-sm text-gray-500">
              Дивіться також:{' '}
              <Link href="/services" className="text-primary hover:underline">
                усі послуги
              </Link>
              ,{' '}
              <Link href="/kharkiv" className="text-primary hover:underline">
                роботи в Харкові
              </Link>
              ,{' '}
              <Link href="/works" className="text-primary hover:underline">
                фото робіт
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
