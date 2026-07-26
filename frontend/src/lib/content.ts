import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  CalendarCheck,
  Calculator,
  Drill,
  Droplets,
  Navigation,
  PhoneCall,
  Settings,
  Shovel,
  Tractor,
  Truck,
  Wind,
  Zap,
} from 'lucide-react';
import type { ServiceType } from './pricing';

/** Options shared by the calculator select and the lead-form select. */
export const SERVICE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'ogorod', label: '🌾 Огород / вспашка — від 300 грн/сот.' },
  { value: 'celina', label: '🌿 Цілина — від 600 грн/сот.' },
  { value: 'mowing', label: '🌺 Покос трави — 200 грн/сот. (фрезами)' },
  { value: 'tree', label: '🌳 Демонтаж дерева — від 500 грн' },
  { value: 'washing', label: '🚿 Мийка техніки — від 250 грн' },
];

export interface ServiceCard {
  icon: LucideIcon;
  title: string;
  description: string;
  price: string;
  badge?: string;
}

export const SERVICE_CARDS: ServiceCard[] = [
  {
    icon: Tractor,
    title: 'Вспашка і культивація',
    description:
      'Обробка огородів та присадибних ділянок потужним дизельним мотоблоком. Ширина захвату фрези 1 м, глибина культивації до 18 см, вспашки до 25–30 см.',
    price: 'від 300 грн',
    badge: 'Популярно',
  },
  {
    icon: Shovel,
    title: 'Обробка целини',
    description:
      'Обробка целини можлива будь-якої пори, навіть взимку при плюсових температурах. Перетворимо запущену ділянку на готовий ґрунт під посадку.',
    price: 'від 600 грн',
  },
  {
    icon: Wind,
    title: 'Покос трави',
    description:
      'Покос трави фрезами. Швидко та якісно обробимо ділянки від 10 соток — орієнтовно за ставкою калькулятора.',
    price: 'від 200 грн/сот.',
  },
  {
    icon: Drill,
    title: 'Буріння лунок',
    description:
      'Буріння лунок мотобуром діаметром до 250 мм. Ідеально для встановлення паль, посадки дерев та будь-яких інших потреб.',
    price: 'від 100 грн/лунка',
  },
  {
    icon: Droplets,
    title: 'Мийка техніки',
    description:
      'Мийка техніки та обладнання мобільною дизельною мийкою високого тиску 200 бар. Якісна чистка прямо у вас на ділянці.',
    price: 'від 250 грн',
  },
];

export interface HeroCard {
  icon: LucideIcon;
  label: string;
  value: string;
}

export const HERO_CARDS: HeroCard[] = [
  { icon: Truck, label: 'Транспорт', value: 'Nissan Primastar' },
  { icon: Settings, label: 'Мотоблок', value: 'Powercraft МБ 1012Д' },
  { icon: Zap, label: 'Потужність', value: '12 л.с. дизель' },
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
    description: "Обговорюємо об'єм та вартість робіт — безкоштовна консультація",
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
  beforeImage: string;
  afterImage: string;
}

export const BEFORE_AFTER_ITEMS: BeforeAfterItem[] = [
  {
    title: 'Обробка целини',
    subtitle: 'Запущена ділянка → готовий ґрунт',
    beforeImage:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
    afterImage:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
  },
  {
    title: 'Покос трави',
    subtitle: 'Висока трава → акуратний газон',
    beforeImage:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    afterImage:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  },
  {
    title: 'Підготовка ділянки',
    subtitle: 'Неприбрана земля → готові грядки',
    beforeImage:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
    afterImage:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
  },
];

export const NAV_LINKS = [
  { href: '#services', label: 'Послуги' },
  { href: '#works', label: 'Роботи' },
  { href: '#how', label: 'Як ми працюємо' },
  { href: '#pricing', label: 'Ціни' },
];
