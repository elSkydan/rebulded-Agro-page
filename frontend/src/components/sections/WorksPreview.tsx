import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BEFORE_AFTER_ITEMS } from '@/lib/content';
import { BeforeAfterCard } from '@/components/sections/works/BeforeAfterCard';

/** Homepage teaser: first two before/after cards + link to full /works. */
export function WorksPreview() {
  const preview = BEFORE_AFTER_ITEMS.slice(0, 2);

  return (
    <section id="works-preview" className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            Наші роботи
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">До і після</h2>
          <p className="text-gray-500">
            Реальні результати — відкрийте фото на весь екран
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto mb-8">
          {preview.map((item) => (
            <BeforeAfterCard key={item.title} item={item} />
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/works"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary-dark transition-colors"
          >
            Дивитися всі роботи
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
