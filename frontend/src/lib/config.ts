/**
 * Central site configuration.
 * All deployment-specific values come from environment variables
 * so the same build can be promoted between environments.
 */
export const siteConfig = {
  name: 'Agro Aggregator',
  title: 'Agro Aggregator — Вспашка, целина і покос',
  description:
    'Вспашка, обробка целини і покос трави дизельним мотоблоком Powercraft МБ 1012Д. ' +
    'Виїзд сьогодні по місту та за його межами. Оплата після виконання роботи.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001',
  /** Displayed phone (footer / navbar / tel: links) */
  phone: process.env.NEXT_PUBLIC_PHONE ?? '+380000000000',
  phoneDisplay: process.env.NEXT_PUBLIC_PHONE_DISPLAY ?? '+38 (000) 000-00-00',
  workingHours: 'Пн–Нд: 7:00 – 20:00',
  /** City the landing sells to — backend requires a valid city_id */
  defaultCityId: Number(process.env.NEXT_PUBLIC_DEFAULT_CITY_ID ?? 1),
} as const;
