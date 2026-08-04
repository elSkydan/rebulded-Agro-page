import Link from 'next/link';
import { ArrowRight, Images, MapPinned, Wallet, Wrench } from 'lucide-react';

const TILES = [
  {
    icon: Wrench,
    title: 'Послуги',
    description: 'Вспашка, цілина, покос, буріння, мийка техніки',
    href: '/services',
  },
  {
    icon: Images,
    title: 'Наші роботи',
    description: 'Фото до і після виконаних робіт',
    href: '/works',
  },
  {
    icon: Wallet,
    title: 'Ціни',
    description: 'Калькулятор вартості та заявка онлайн',
    href: '/pricing',
  },
  {
    icon: MapPinned,
    title: 'Контакти',
    description: 'Телефон, графік роботи, зона виїзду',
    href: '/contacts',
  },
];

/** Compact hub links shown on the home page — full content lives on each dedicated page. */
export function ExploreMore() {
  return (
    <section className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            На сайті
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Дізнайтеся більше</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="service-card group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
                <tile.icon className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{tile.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{tile.description}</p>
              <span className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold">
                Детальніше
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
