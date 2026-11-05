import { siteConfig } from '@/lib/config';

/** Safe JSON-LD payload for <script> (Next/Google recommendation). */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export const ORGANIZATION_ID = `${siteConfig.url}/#organization`;
export const WEBSITE_ID = `${siteConfig.url}/#website`;

/** Shared LocalBusiness / Organization entity — Kharkiv is the active region. */
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': ORGANIZATION_ID,
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    image: `${siteConfig.url}/opengraph-image`,
    telephone: siteConfig.phone,
    priceRange: '₴₴',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      opens: '07:00',
      closes: '20:00',
    },
    areaServed: [
      {
        '@type': 'City',
        name: 'Харків',
        containedInPlace: { '@type': 'Country', name: 'Ukraine' },
      },
      { '@type': 'Country', name: 'Ukraine' },
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Харків',
      addressRegion: 'Харківська область',
      addressCountry: 'UA',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Сільськогосподарські послуги',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Вспашка і культивація',
            areaServed: 'Харків',
          },
          priceCurrency: 'UAH',
          price: '300',
          description: 'від 300 грн/сотку',
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Обробка целини',
            areaServed: 'Харків',
          },
          priceCurrency: 'UAH',
          price: '600',
          description: 'від 600 грн/сотку',
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Покос трави',
            areaServed: 'Харків',
          },
          priceCurrency: 'UAH',
          price: '200',
          description: 'від 200 грн/сотку',
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Буріння лунок',
            areaServed: 'Харків',
          },
          priceCurrency: 'UAH',
          price: '100',
          description: 'від 100 грн/лунка',
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Мийка техніки',
            areaServed: 'Харків',
          },
          priceCurrency: 'UAH',
          price: '250',
          description: 'від 250 грн',
        },
      ],
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'uk-UA',
  };
}

export function serviceSchema(input: {
  name: string;
  description: string;
  url: string;
  priceFrom: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: input.url,
    provider: { '@id': ORGANIZATION_ID },
    areaServed: {
      '@type': 'City',
      name: 'Харків',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'UAH',
      price: input.priceFrom,
      description: `від ${input.priceFrom} грн`,
    },
  };
}

/** Bump only when public SEO content actually changes (sitemap lastModified). */
export const SITE_CONTENT_UPDATED = new Date('2026-11-05T00:00:00.000Z');
