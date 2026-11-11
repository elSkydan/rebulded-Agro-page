import { ExternalLink, Star } from 'lucide-react';
import { siteConfig } from '@/lib/config';
import { REVIEW_ITEMS } from '@/lib/content';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Оцінка ${rating} з 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'fill-primary text-primary' : 'text-gray-300'}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/** Customer reviews list + outbound Google Business Profile CTA. */
export function Reviews() {
  return (
    <section className="flex-1 py-16 sm:py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            Відгуки
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Що кажуть клієнти в {siteConfig.region}у
          </h1>
          <p className="text-gray-500 text-base sm:text-lg">
            Реальні історії з ділянок. Повний список і актуальний рейтинг — у нашому профілі Google.
          </p>
        </div>

        <ul className="space-y-8 mb-12">
          {REVIEW_ITEMS.map((review) => (
            <li key={`${review.author}-${review.dateLabel}`} className="border-l-4 border-primary/40 pl-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                <Stars rating={review.rating} />
                <span className="text-sm text-gray-500">{review.dateLabel}</span>
              </div>
              <p className="text-gray-900 text-base leading-relaxed mb-3">&ldquo;{review.text}&rdquo;</p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{review.author}</span>
                {' · '}
                {review.city}
                {' · '}
                {review.service}
              </p>
            </li>
          ))}
        </ul>

        <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Більше відгуків у Google</h2>
          <p className="text-gray-500 text-sm mb-5 max-w-md mx-auto">
            Залишити свій відгук також можна там — після виконаної роботи ми будемо раді вашій оцінці.
          </p>
          <a
            href={siteConfig.googleReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 min-h-11 bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-3 rounded-xl transition-colors"
          >
            Відкрити Google-відгуки
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
