/**
 * Central site configuration.
 * All deployment-specific values come from environment variables
 * so the same build can be promoted between environments.
 */
export const siteConfig = {
  name: 'Agro Aggregator',
  title: 'Вспашка, целина і покос у Харкові — Agro Aggregator',
  description:
    'Вспашка городу, обробка целини і покос трави в Харкові. Дизельний мотоблок Powercraft МБ 1012Д, ' +
    'виїзд сьогодні. Оранка від 300 грн/сот., покіс від 200 грн/сот. Оплата після виконання роботи. Тел. +38 (067) 902-03-26.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001',
  /** Displayed phone (footer / navbar / tel: links) */
  phone: process.env.NEXT_PUBLIC_PHONE ?? '+380679020326',
  phoneDisplay: process.env.NEXT_PUBLIC_PHONE_DISPLAY ?? '+38 (067) 902-03-26',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'info@agro-aggregator.ua',
  workingHours: 'Пн–Нд: 7:00 – 20:00',
  /** Active service region for SEO / local intent */
  region: 'Харків',
  /** City the landing sells to — backend requires a valid city_id */
  defaultCityId: Number(process.env.NEXT_PUBLIC_DEFAULT_CITY_ID ?? 1),
  /**
   * Public Google Business Profile reviews URL.
   * Replace with the real GBP link when the listing is ready.
   */
  googleReviewsUrl:
    process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL ??
    'https://www.google.com/maps/search/?api=1&query=Agro+Aggregator+Kharkiv',
  /**
   * Telegram deep-link for contractors who want to join.
   * Replace with the real bot username / start param.
   */
  contractorBotUrl:
    process.env.NEXT_PUBLIC_CONTRACTOR_BOT_URL ?? 'https://t.me/AgroAggregatorBot?start=contractor',
  /** Legal entity stubs — replace with real FOP details before production legal use. */
  legal: {
    entityName: process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME ?? 'ФОП «Agro Aggregator» (чернетка)',
    edrpou: process.env.NEXT_PUBLIC_LEGAL_EDRPOU ?? '0000000000',
    address:
      process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? 'м. Харків, Україна (юридична адреса — уточнюється)',
  },
} as const;
