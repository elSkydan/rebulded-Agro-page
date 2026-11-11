import { CheckCircle2, MessageCircle } from 'lucide-react';
import { siteConfig } from '@/lib/config';
import { CONTRACTOR_REQUIREMENTS, CONTRACTOR_STEPS } from '@/lib/content';

/** Landing for specialists who want to receive leads via Telegram. */
export function Contractors() {
  return (
    <section className="flex-1 py-16 sm:py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            Виконавцям
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Стати виконавцем у {siteConfig.region}у
          </h1>
          <p className="text-gray-500 text-base sm:text-lg">
            Отримуйте заявки на вспашку, целину та покос у Telegram. Без передплати від клієнта —
            робота після підтвердження виїзду.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Вимоги</h2>
          <ul className="space-y-3">
            {CONTRACTOR_REQUIREMENTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-gray-700">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Як проходить перевірка</h2>
          <ol className="space-y-6">
            {CONTRACTOR_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mb-12 border-t border-gray-200 pt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Скільки можна заробити</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Орієнтовні ставки на сайті: оранка від <strong>300 грн/сот.</strong>, покос від{' '}
            <strong>200 грн/сот.</strong>, целина від <strong>600 грн/сот.</strong> Фактичний дохід
            залежить від кількості прийнятих заявок, району та вашої завантаженості. Комісійна модель
            і деталі виплат узгоджуються під час підключення.
          </p>
          <p className="text-sm text-gray-500">
            Цифри — орієнтир для клієнта; ваша винагорода фіксується в умовах співпраці з агрегатора.
          </p>
        </div>

        <div className="rounded-2xl bg-primary p-6 sm:p-8 text-center">
          <h2 className="text-white text-lg font-bold mb-2">Готові підключитися?</h2>
          <p className="text-white/80 text-sm mb-5">
            Напишіть у Telegram — менеджер відповість і проведе коротку перевірку.
          </p>
          <a
            href={siteConfig.contractorBotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 min-h-11 bg-white text-primary font-semibold px-5 py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <MessageCircle className="w-5 h-5" aria-hidden="true" />
            Написати в Telegram-бот
          </a>
        </div>
      </div>
    </section>
  );
}
