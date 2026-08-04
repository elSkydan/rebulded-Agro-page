import { BEFORE_AFTER_ITEMS } from '@/lib/content';
import { BeforeAfterCard } from './BeforeAfterCard';

export function Works() {
  return (
    <section id="works" className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            Наші роботи
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">До і після</h1>
          <p className="text-gray-500">Натисніть на фото, щоб побачити результат нашої роботи</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BEFORE_AFTER_ITEMS.map((item) => (
            <BeforeAfterCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
