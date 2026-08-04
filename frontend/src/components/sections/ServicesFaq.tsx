import { HelpCircle } from 'lucide-react';
import { FAQ_ITEMS } from '@/lib/content';

/** FAQ block for /services — also emits FAQPage JSON-LD for rich results. */
export function ServicesFaq() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <section className="py-16 sm:py-20 bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-block bg-gray-100 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            Питання і відповіді
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Часті запитання
          </h2>
        </div>
        <div className="flex flex-col gap-4">
          {FAQ_ITEMS.map((item) => (
            <div
              key={item.question}
              className="bg-gray-50 rounded-2xl p-6 border border-gray-100"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 pt-1">{item.question}</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed pl-11">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
