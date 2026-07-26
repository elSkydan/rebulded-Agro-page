# Агро Сервіс — Frontend (Next.js)

Лендінг сервісу вспашки/целини/покосу. Переписаний з статичного HTML на
**Next.js (App Router) + TypeScript + Tailwind CSS v4** зі збереженням
ідентичного вигляду та поведінки. Працює з існуючим Express-бекендом
(папка `../server`).

## Стек

- Next.js 16 (App Router, React Server Components)
- React 19 + TypeScript
- Tailwind CSS v4 (дизайн-токени в `globals.css` через `@theme`)
- lucide-react (іконки, як в оригіналі)

## Структура

```
src/
├── app/                    # роутинг, метадані, SEO
│   ├── layout.tsx          # шрифти, Metadata API, JSON-LD (LocalBusiness)
│   ├── page.tsx            # головна сторінка (збірка секцій)
│   ├── globals.css         # дизайн-токени + кастомні стилі
│   ├── robots.ts           # /robots.txt
│   └── sitemap.ts          # /sitemap.xml
├── components/
│   ├── layout/             # Navbar, Footer
│   └── sections/           # Hero, Services, HowWeWork, Works, pricing/
├── lib/
│   ├── config.ts           # конфіг сайту (env-driven)
│   ├── content.ts          # контент-дані (послуги, кроки, роботи)
│   ├── pricing.ts          # калькулятор (дзеркало server/services/pricingService.js)
│   └── api.ts              # API-клієнт (POST /api/leads)
```

**Принципи:** статичні секції — серверні компоненти (нуль JS на клієнті);
інтерактив (калькулятор, форма, navbar) — клієнтські. Контент відділений
від розмітки (`lib/content.ts`) — додати послугу = додати об'єкт у масив.

## Локальний запуск

```bash
npm install
cp .env.example .env.local   # відредагуйте за потреби
npm run dev                  # http://localhost:3001
```

Бекенд повинен працювати на `http://localhost:3000` (див. `BACKEND_URL`).
Запити `/api/*` проксуються на бекенд через rewrite — CORS не потрібен.

## Змінні середовища

| Змінна | Опис |
|---|---|
| `BACKEND_URL` | URL Express-бекенду (server-side, для проксі) |
| `NEXT_PUBLIC_SITE_URL` | Публічний URL сайту (canonical, OG, sitemap) |
| `NEXT_PUBLIC_DEFAULT_CITY_ID` | ID міста з таблиці `cities` бекенду |
| `NEXT_PUBLIC_PHONE` | Телефон у форматі `tel:` |
| `NEXT_PUBLIC_PHONE_DISPLAY` | Телефон для відображення |

## Продакшн-деплой (single deployable unit)

Збірка `standalone` — самодостатня, без `node_modules` на сервері:

```bash
npm run build
# артефакт: .next/standalone (+ .next/static і public скопіювати поруч)
```

Запуск на сервері:

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
BACKEND_URL=http://127.0.0.1:3000 PORT=3001 node .next/standalone/server.js
```

Або простіше — весь каталог + `npm run start`. Або Docker:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server.js"]
```

## SEO

- Metadata API: title, description, canonical, Open Graph, Twitter cards
- JSON-LD `LocalBusiness` зі списком послуг
- `robots.txt` і `sitemap.xml` генеруються автоматично
- Семантична розмітка (`main`, `nav`, `section`, `h1`–`h3`), `lang="uk"`
- Весь контент рендериться на сервері (SSG) — повністю індексується
