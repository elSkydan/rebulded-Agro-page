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
    'виїзд сьогодні. Ціни від 200 грн/сотку. Оплата після виконання роботи. Тел. +38 (067) 902-03-26.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001',
  /** Displayed phone (footer / navbar / tel: links) */
  phone: process.env.NEXT_PUBLIC_PHONE ?? '+380679020326',
  phoneDisplay: process.env.NEXT_PUBLIC_PHONE_DISPLAY ?? '+38 (067) 902-03-26',
  workingHours: 'Пн–Нд: 7:00 – 20:00',
  /** Active service region for SEO / local intent */
  region: 'Харків',
  /** City the landing sells to — backend requires a valid city_id */
  defaultCityId: Number(process.env.NEXT_PUBLIC_DEFAULT_CITY_ID ?? 1),
} as const;
