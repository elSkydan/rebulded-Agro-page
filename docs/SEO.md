# SEO.md — SEO Strategy for Agricultural Services Aggregator

> **Domain:** Ukrainian agricultural services (вспашка, целина, покос)  
> **Target:** Ukrainian-speaking users searching for local agricultural machinery services  
> **Language:** Ukrainian (UK)

---

## 1. Keyword Strategy

### Primary Keywords (Ukrainian)
| Keyword | Intent | Monthly Volume (Est.) |
|---------|--------|----------------------|
| вспашка городу | Transactional | High |
| вспашка городу Київ | Local transactional | Medium |
| трактор для вспашки | Informational | Medium |
| покос трави ціна | Transactional | Medium |
| целина розробка | Transactional | Low-Medium |
| вспашка мотоблоком | Informational | Medium |
| замовити вспашку | Transactional | Medium |
| ціна вспашки городу | Transactional | Medium |
| вспашка городу недорого | Transactional | Medium |

### City-Specific Keywords (Per City)
Pattern: `{service} {city}` — e.g.:
- вспашка городу Київ
- покос трави Харків
- целина Одеса ціна
- вспашка Дніпро недорого
- замовити покос Запоріжжя

### Long-tail Keywords
- скільки коштує вспашка городу
- вспашка городу за сотку ціна
- де замовити вспашку трактором
- вспашка городу в Києві ціна 2025

---

## 2. Landing Page Structure (Current & Recommended)

### Current Page (`index.html`)
- Single-page structure (not ideal for SEO — everything on one URL)
- Title tag: Not analyzed (assumed missing or generic)
- Meta description: Not analyzed
- H1: "Вспашка, целина і покос" (good keyword density)
- Services section with service descriptions
- Price calculator (good for user intent matching)

### Required Meta Tags (Add to `index.html`)
```html
<title>Вспашка городу в Києві | Покос трави | Цілина — Агро Сервіс</title>
<meta name="description" content="Замовте вспашку городу, покос трави або розробку цілини в Києві. Ціна від 200 грн/сотку. Виїзд у день замовлення. Зателефонуйте: +38 067 902-03-26">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://your-domain.com/">
<meta property="og:title" content="Вспашка городу в Києві — Агро Сервіс">
<meta property="og:description" content="Замовте вспашку від 300 грн/сотку. Виїзд у той же день!">
<meta property="og:image" content="https://your-domain.com/images/og-image.jpg">
<meta property="og:url" content="https://your-domain.com">
<meta name="geo.region" content="UA-30">
<meta name="geo.placename" content="Kyiv">
```

---

## 3. City Pages Architecture

### Problem with Current Design
- Single URL (`/`) serves all cities
- City-specific searches won't find relevant landing pages

### Solution: Dedicated City Pages

**URL structure:**
```
/                                     — Main page (Kyiv default)
/vspashka-gorodu-kyiv                 — Kyiv plowing
/vspashka-gorodu-kharkiv              — Kharkiv plowing
/pokos-travy-odesa                    — Odesa mowing
/tsilyna-dnipro                       — Dnipro virgin land

Or with Ukrainian URLs:
/послуги/київ/вспашка
/послуги/харків/покос
```

**Each city page contains:**
- H1: `Вспашка городу в {Місто} — від {min_price} грн/сотку`
- Local phone number (if available)
- City-specific pricing (if different)
- Local testimonials
- Map embed (Google Maps or OpenStreetMap)
- Same lead form with city pre-selected
- Schema.org LocalBusiness markup

### City Page Template Requirements
```html
<!-- Unique for each city -->
<title>Вспашка городу в {Місто} | Замовити вспашку | Агро Сервіс</title>
<meta name="description" content="Вспашка городу в {Місто} від {price} грн/сотку. ...">
<h1>Вспашка городу в {Місто}</h1>

<!-- Schema.org -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Агро Сервіс",
  "serviceArea": { "@type": "City", "name": "{Місто}" },
  "telephone": "+380679020326",
  "priceRange": "від 200 грн/сотку"
}
</script>
```

---

## 4. Content Structure

### Service Pages (Recommended)
```
/vspashka-gorodu          — Вспашка городу (informational + lead form)
/tsilyna                  — Цілина/Розробка цілини
/pokos-travy              — Покос трави
/sverdlinnya-lunok        — Свердління лунок під дерева
/myjka-tekhniky           — Мийка сільськогосподарської техніки
```

Each page:
- 500-1000 words about the service
- Price table
- FAQ (schema.org FAQPage)
- Lead form
- Before/After images with alt text

### Blog / Content (Long-term)
| Article | Target Keyword |
|---------|---------------|
| Коли краще орати город? | коли орати город |
| Ціна вспашки городу в 2025 | ціна вспашки городу |
| Як підготувати город до весни | підготовка городу до посіву |
| Целина vs вспашка — що вибрати | різниця між целиною і вспашкою |

---

## 5. Technical SEO

### Critical Technical Requirements

```html
<!-- Structured data for service business -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://your-domain.com",
  "name": "Агро Сервіс",
  "description": "Послуги з вспашки, покосу та розробки цілини",
  "telephone": "+380679020326",
  "openingHours": "Mo-Su 07:00-20:00",
  "priceRange": "від 200 грн",
  "areaServed": ["Київ", "Харків", "Одеса"],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Сільськогосподарські послуги",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Вспашка городу" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Покос трави" } }
    ]
  }
}
</script>
```

### Performance (Core Web Vitals)
| Metric | Target | Current Issue |
|--------|--------|--------------|
| LCP (Largest Contentful Paint) | < 2.5s | Hero image from Unsplash (external) |
| FID/INP | < 100ms | Large main.js inline — consider splitting |
| CLS | < 0.1 | Lucide icon loading may cause shift |

**Fixes:**
- Download and self-host the hero image (avoid external Unsplash in prod)
- Add `width` and `height` to all `<img>` tags
- Preload hero image: `<link rel="preload" as="image" href="hero.jpg">`
- Add `loading="lazy"` to below-fold images

### Sitemap
```xml
<!-- /sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://your-domain.com/</loc><priority>1.0</priority></url>
  <url><loc>https://your-domain.com/vspashka-gorodu</loc><priority>0.9</priority></url>
  <url><loc>https://your-domain.com/vspashka-gorodu-kyiv</loc><priority>0.8</priority></url>
  <url><loc>https://your-domain.com/pokos-travy</loc><priority>0.8</priority></url>
</urlset>
```

Generate dynamically from cities table and add route in Express.

### robots.txt
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Sitemap: https://your-domain.com/sitemap.xml
```

---

## 6. Indexing

### Verification
1. Submit domain to Google Search Console
2. Submit sitemap.xml
3. Request indexing for main page
4. Monitor: Coverage → Valid pages vs Errors

### Local SEO
1. **Google Business Profile:** Create listing for "Агро Сервіс" in each city served
2. **Yelp/2GIS:** Ukrainian directories list for local businesses
3. **OLX listing:** For each city — service listings with link to website
4. **Prom.ua:** Ukrainian marketplace profile

---

## 7. Implementation Priority

| Action | Priority | Effort |
|--------|----------|--------|
| Add meta title/description to index.html | CRITICAL | 30 min |
| Add Schema.org LocalBusiness markup | HIGH | 1 hour |
| Add canonical URL | HIGH | 15 min |
| Self-host hero image (remove Unsplash in prod) | HIGH | 30 min |
| Create sitemap.xml endpoint | HIGH | 2 hours |
| Add robots.txt | HIGH | 15 min |
| Register Google Search Console | HIGH | 30 min |
| Create Google Business Profile | HIGH | 1 hour |
| Create city-specific landing pages | MEDIUM | 1 week |
| Create service-specific pages | MEDIUM | 1 week |
| Add FAQ schema markup | MEDIUM | 2 hours |
| Start blog content | LOW | Ongoing |
