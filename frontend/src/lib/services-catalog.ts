/**
 * Single source of truth for public services:
 * /services cards, landings, calculator select, lead form, ?service= links.
 *
 * `tree` remains a legacy ServiceType for old leads / admin, but is not
 * offered in the public calculator.
 */

import type { LucideIcon } from 'lucide-react';
import { Drill, Droplets, Shovel, Tractor, Wind } from 'lucide-react';

/** All service_type values the API / DB may store (incl. legacy). */
export type ServiceType =
  | 'ogorod'
  | 'celina'
  | 'mowing'
  | 'drilling'
  | 'washing'
  | 'tree';

/** Services shown in calculator + lead form selects. */
export type CalculatorServiceType = Exclude<ServiceType, 'tree'>;

export type PricingMode = 'area' | 'fixed';

export interface ServiceCatalogEntry {
  type: CalculatorServiceType;
  /** SEO landing slug under /services/[slug] */
  slug: string;
  /** Short label for native <select> */
  label: string;
  /** Card title on /services */
  cardTitle: string;
  cardDescription: string;
  cardPrice: string;
  cardBadge?: string;
  icon: LucideIcon;
  pricingMode: PricingMode;
  /** Hint under the calculator service select */
  uiNote: string;
}

export const SERVICE_CATALOG: readonly ServiceCatalogEntry[] = [
  {
    type: 'ogorod',
    slug: 'vspashka',
    label: 'Огород / вспашка',
    cardTitle: 'Вспашка і культивація',
    cardDescription:
      'Обробка огородів та присадибних ділянок потужним дизельним мотоблоком. Ширина захвату фрези 1 м, глибина культивації до 18 см, вспашки до 25–30 см.',
    cardPrice: 'від 300 грн',
    cardBadge: 'Популярно',
    icon: Tractor,
    pricingMode: 'area',
    uiNote: '',
  },
  {
    type: 'celina',
    slug: 'tsilyna',
    label: 'Цілина',
    cardTitle: 'Обробка целини',
    cardDescription:
      'Обробка целини можлива будь-якої пори, навіть взимку за плюсової температури. Перетворимо запущену ділянку на готовий ґрунт під посадку.',
    cardPrice: 'від 600 грн',
    icon: Shovel,
    pricingMode: 'area',
    uiNote: '',
  },
  {
    type: 'mowing',
    slug: 'pokos',
    label: 'Покос трави',
    cardTitle: 'Покос трави',
    cardDescription:
      'Покос трави фрезами. Швидко та якісно обробимо ділянки від 10 соток — орієнтовно за ставкою калькулятора.',
    cardPrice: 'від 200 грн/сот.',
    icon: Wind,
    pricingMode: 'area',
    uiNote: 'Покос виконується фрезами.',
  },
  {
    type: 'drilling',
    slug: 'burinnya',
    label: 'Буріння лунок',
    cardTitle: 'Буріння лунок',
    cardDescription:
      'Буріння лунок мотобуром діаметром до 250 мм. Ідеально для встановлення паль, посадки дерев та будь-яких інших потреб.',
    cardPrice: 'від 100 грн/лунку',
    icon: Drill,
    pricingMode: 'fixed',
    uiNote: 'Ціна за лунку — точна сума за кількістю на місці.',
  },
  {
    type: 'washing',
    slug: 'myjka',
    label: 'Мийка техніки',
    cardTitle: 'Мийка техніки',
    cardDescription:
      'Мийка техніки та обладнання мобільною дизельною мийкою високого тиску 200 бар. Якісна чистка прямо у вас на ділянці.',
    cardPrice: 'від 250 грн',
    icon: Droplets,
    pricingMode: 'fixed',
    uiNote: '',
  },
] as const;

export const SERVICE_OPTIONS: { value: CalculatorServiceType; label: string }[] =
  SERVICE_CATALOG.map((s) => ({ value: s.type, label: s.label }));

/** Services where area does not affect price — hide the area field. */
export const AREA_HIDDEN_SERVICES: ReadonlySet<ServiceType> = new Set<ServiceType>([
  ...SERVICE_CATALOG.filter((s) => s.pricingMode === 'fixed').map((s) => s.type),
  'tree', // legacy
]);

export const SERVICE_UI_NOTE: Record<ServiceType, string> = {
  ogorod: '',
  celina: '',
  mowing: 'Покос виконується фрезами.',
  drilling: 'Ціна за лунку — точна сума за кількістю на місці.',
  washing: '',
  tree: 'Точна ціна за домовленістю.',
};

const BY_TYPE = new Map(SERVICE_CATALOG.map((s) => [s.type, s]));
const BY_SLUG = new Map(SERVICE_CATALOG.map((s) => [s.slug, s]));

/** All known public query values: service_type + landing slug. */
const QUERY_ALIASES: Record<string, ServiceType> = {
  ogorod: 'ogorod',
  celina: 'celina',
  mowing: 'mowing',
  drilling: 'drilling',
  washing: 'washing',
  tree: 'tree',
  vspashka: 'ogorod',
  tsilyna: 'celina',
  pokos: 'mowing',
  burinnya: 'drilling',
  myjka: 'washing',
};

export function getCatalogEntry(type: ServiceType): ServiceCatalogEntry | undefined {
  return BY_TYPE.get(type as CalculatorServiceType);
}

export function getCatalogBySlug(slug: string): ServiceCatalogEntry | undefined {
  return BY_SLUG.get(slug);
}

export function serviceLabel(type: ServiceType): string {
  if (type === 'tree') return 'Демонтаж дерева';
  return BY_TYPE.get(type)?.label ?? type;
}

/**
 * Resolve `?service=` from either a service_type or a /services slug.
 * Unknown values return null (caller keeps current / default).
 */
export function parseServiceParam(raw: string | null): ServiceType | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return QUERY_ALIASES[key] ?? null;
}

export function isCalculatorService(type: ServiceType): type is CalculatorServiceType {
  return type !== 'tree' && BY_TYPE.has(type as CalculatorServiceType);
}
