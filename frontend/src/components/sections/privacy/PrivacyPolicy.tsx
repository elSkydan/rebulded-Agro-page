import Link from 'next/link';
import { siteConfig } from '@/lib/config';

const UPDATED = '11 листопада 2026';

/** Privacy policy for lead form + analytics data processing. */
export function PrivacyPolicy() {
  return (
    <section className="flex-1 py-16 sm:py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <span className="inline-block bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            Документи
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Політика конфіденційності
          </h1>
          <p className="text-gray-500 text-sm">Оновлено: {UPDATED}</p>
        </div>

        <div className="space-y-10 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Хто ми</h2>
            <p>
              Сайт {siteConfig.name} ({siteConfig.url}) допомагає замовити сільськогосподарські
              послуги в регіоні {siteConfig.region}. Оператором персональних даних виступає{' '}
              {siteConfig.legal.entityName}, код ЄДРПОУ/РНОКПП: {siteConfig.legal.edrpou}, адреса:{' '}
              {siteConfig.legal.address}.
            </p>
            <p className="mt-3">
              Зв&apos;язок:{' '}
              <a href={`tel:${siteConfig.phone}`} className="text-primary font-medium hover:underline">
                {siteConfig.phoneDisplay}
              </a>
              ,{' '}
              <a href={`mailto:${siteConfig.email}`} className="text-primary font-medium hover:underline">
                {siteConfig.email}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Які дані збираємо</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Ім&apos;я та номер телефону — з форми заявки на сторінці «Ціни».</li>
              <li>Тип послуги, площа, місто, позначка «за містом», коментар — якщо ви їх вказали.</li>
              <li>Технічні дані (IP, тип браузера, сторінки перегляду) — якщо увімкнена аналітика (GA4).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Навіщо використовуємо</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Щоб зв&apos;язатися з вами та передати заявку виконавцю.</li>
              <li>Щоб розрахувати орієнтовну вартість і запобігти спаму.</li>
              <li>Щоб покращувати сайт і розуміти, які сторінки працюють (аналітика).</li>
            </ul>
            <p className="mt-3">
              Ми не продаємо ваші контакти третім сторонам для реклами.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Кому передаємо</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Виконавцям у вашому місті — лише дані, потрібні для виїзду й зв&apos;язку.</li>
              <li>Telegram — для сповіщень виконавців і адміністрації (якщо бот увімкнено).</li>
              <li>Google Analytics — узагальнена статистика відвідувань (якщо налаштовано GA4).</li>
              <li>Хостинг / база даних — для зберігання заявок.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Зберігання та захист</h2>
            <p>
              Заявки зберігаються в захищеній базі даних стільки, скільки потрібно для виконання
              послуги та обліку звернень. Доступ мають лише уповноважені особи. Передача даних іде
              через HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Ваші права</h2>
            <p className="mb-3">
              Ви можете запросити доступ до своїх даних, виправлення або видалення, написавши на{' '}
              <a href={`mailto:${siteConfig.email}`} className="text-primary font-medium hover:underline">
                {siteConfig.email}
              </a>{' '}
              або зателефонувавши за номером вище. Ми відповімо в розумний строк.
            </p>
            <p>
              Подаючи заявку на сайті, ви підтверджуєте, що ознайомлені з цією політикою.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Оновлення</h2>
            <p>
              Текст може оновлюватися. Актуальна версія завжди на цій сторінці. Питання — через{' '}
              <Link href="/contacts" className="text-primary font-medium hover:underline">
                контакти
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
