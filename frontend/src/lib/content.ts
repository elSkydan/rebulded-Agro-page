import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  CalendarCheck,
  Calculator,
  Navigation,
  PhoneCall,
  Settings,
  Truck,
  Zap,
} from 'lucide-react';
import type { StaticImageData } from 'next/image';
import { SERVICE_CATALOG } from './services-catalog';
import celinaBefore from '@/assets/works/celina-before.jpg';
import celinaAfter from '@/assets/works/celina-after.jpg';
import pokosBefore from '@/assets/works/pokos-before.jpg';
import pokosAfter from '@/assets/works/pokos-after.jpg';

/** Options shared by the calculator select and the lead-form select.
 *  Keep labels short — long option text overflows native selects on mobile. */
export { SERVICE_OPTIONS } from './services-catalog';

/** Names that identify the currently active service region (Kharkiv). */
export const ACTIVE_REGION_NAMES = ['харків', 'харьков', 'kharkiv', 'kharkov'] as const;

export function isActiveRegion(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return ACTIVE_REGION_NAMES.some((n) => normalized === n || normalized.includes(n));
}

export interface ServiceCard {
  icon: LucideIcon;
  title: string;
  description: string;
  price: string;
  /** SEO landing under /services/[slug] */
  slug: string;
  badge?: string;
}

export const SERVICE_CARDS: ServiceCard[] = SERVICE_CATALOG.map((s) => ({
  icon: s.icon,
  title: s.cardTitle,
  description: s.cardDescription,
  price: s.cardPrice,
  slug: s.slug,
  badge: s.cardBadge,
}));

export interface HeroCard {
  icon: LucideIcon;
  label: string;
  value: string;
}

export const HERO_CARDS: HeroCard[] = [
  { icon: Truck, label: 'Транспорт', value: 'Nissan Primastar' },
  { icon: Settings, label: 'Мотоблок', value: 'Powercraft МБ 1012Д' },
  { icon: Zap, label: 'Потужність', value: '12 к.с. дизель' },
  { icon: Navigation, label: 'Виїзд', value: 'Місто та за містом' },
];

export interface WorkStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const WORK_STEPS: WorkStep[] = [
  {
    icon: PhoneCall,
    title: 'Дзвінок',
    description: 'Зателефонуйте або залиште заявку — передзвонимо за 15 хвилин',
  },
  {
    icon: Calculator,
    title: 'Розрахунок',
    description: 'Обговорюємо обсяг та вартість робіт — безкоштовна консультація',
  },
  {
    icon: CalendarCheck,
    title: 'Виїзд',
    description: 'Приїжджаємо в зручний час, зазвичай того ж дня',
  },
  {
    icon: BadgeCheck,
    title: 'Оплата після',
    description: 'Оплата тільки після виконання робіт',
  },
];

export interface BeforeAfterItem {
  title: string;
  subtitle: string;
  beforeImage: string | StaticImageData;
  afterImage: string | StaticImageData;
}

export const BEFORE_AFTER_ITEMS: BeforeAfterItem[] = [
  {
    title: 'Обробка целини',
    subtitle: 'Запущена ділянка → готовий ґрунт',
    beforeImage: celinaBefore,
    afterImage: celinaAfter,
  },
  {
    title: 'Покос трави',
    subtitle: 'Висока трава → акуратний газон',
    beforeImage: pokosBefore,
    afterImage: pokosAfter,
  },
  {
    title: 'Підготовка ділянки',
    subtitle: 'Неприбрана земля → готові грядки',
    beforeImage:
      'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=600&q=80',
    afterImage:
      'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&q=80',
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'А що, якщо тракторист не приїде?',
    answer:
      'Кожна заявка в нашій системі автоматично закріплюється за конкретним спеціалістом. Якщо він не підтверджує виїзд вчасно — заявка миттєво й автоматично переходить до наступного вільного виконавця, без вашої участі й без втрати часу. Ви нічого не платите наперед: оплата — тільки після виконання роботи, тож фінансового ризику для вас немає в будь-якому разі.',
  },
  {
    question: 'А що, якщо виконають роботу неякісно?',
    answer:
      'Перед виїздом ми безкоштовно узгоджуємо з вами обсяг і особливості ділянки, щоб уникнути непорозумінь. Результат ви оцінюєте на місці одразу після завершення робіт — оплата відбувається тільки після того, як вас все влаштувало. Якщо виникають спірні моменти — звертайтесь напряму, ми на зв’язку і вирішуємо такі питання оперативно.',
  },
];

export const NAV_LINKS = [
  { href: '/services', label: 'Послуги' },
  { href: '/pricing', label: 'Ціни' },
  { href: '/works', label: 'Роботи' },
  { href: '/reviews', label: 'Відгуки' },
  { href: '/contacts', label: 'Контакти' },
];

/** Secondary / legal links shown in the footer (not primary nav). */
export const FOOTER_LINKS = [
  { href: '/contractors', label: 'Стати виконавцем' },
  { href: '/privacy', label: 'Політика конфіденційності' },
  { href: '/reviews', label: 'Відгуки' },
];

export interface ReviewItem {
  author: string;
  city: string;
  service: string;
  rating: 1 | 2 | 3 | 4 | 5;
  dateLabel: string;
  text: string;
}

/**
 * Placeholder customer reviews for the /reviews page.
 * Replace with real quotes (or a CMS/API feed) once Google/manual collection is live.
 * Bot-driven review requests after lead completion are intentionally deferred.
 */
export const REVIEW_ITEMS: ReviewItem[] = [
  {
    author: 'Олена К.',
    city: 'Харків',
    service: 'Вспашка городу',
    rating: 5,
    dateLabel: 'жовтень 2026',
    text: 'Залишила заявку ввечері — наступного ранку вже працювали на ділянці. Порахували по калькулятору, без сюрпризів. Дякую!',
  },
  {
    author: 'Андрій М.',
    city: 'Харківська область',
    service: 'Покос трави',
    rating: 5,
    dateLabel: 'вересень 2026',
    text: 'Велика ділянка за містом. Приїхали вчасно, зробили акуратно. Оплата після роботи — так і домовились.',
  },
  {
    author: 'Ірина С.',
    city: 'Харків',
    service: 'Обробка целини',
    rating: 4,
    dateLabel: 'серпень 2026',
    text: 'Целина була запущена кілька років. Виконавець пояснив, що саме зроблять, і вклались у погоджений обсяг.',
  },
];

export const CONTRACTOR_REQUIREMENTS = [
  'Власна або орендована техніка (мотоблок / трактор) у справному стані',
  'Готовність виїжджати в Харкові та області в робочі години',
  'Telegram для отримання заявок і швидкої відповіді',
  'Готовність підтвердити особу та досвід під час короткої перевірки',
] as const;

export const CONTRACTOR_STEPS = [
  {
    title: 'Заявка в Telegram',
    body: 'Напишіть боту, коротко опишіть техніку, район виїзду і досвід.',
  },
  {
    title: 'Перевірка',
    body: 'Менеджер уточнює деталі, перевіряє контакти й готовність брати заявки.',
  },
  {
    title: 'Отримання лідів',
    body: 'Після активації заявки з вашого міста приходять у Telegram — приймаєте або відхиляєте.',
  },
] as const;
