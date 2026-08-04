import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { siteConfig } from '@/lib/config';

export interface BreadcrumbItem {
  label: string;
  /** Omit on the last (current page) item. */
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/** Visible breadcrumb trail + matching BreadcrumbList JSON-LD for rich results. */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const trail: BreadcrumbItem[] = [{ label: 'Головна', href: '/' }, ...items];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${siteConfig.url}${item.href === '/' ? '' : item.href}` } : {}),
    })),
  };

  return (
    <nav aria-label="Хлібні крихти" className="bg-gray-50 border-b border-gray-100 pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-1.5 text-sm text-gray-500 overflow-x-auto">
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;
          return (
            <span key={item.label} className="flex items-center gap-1.5 whitespace-nowrap">
              {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" aria-hidden="true" />}
              {isLast || !item.href ? (
                <span className="text-gray-700 font-medium" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-primary transition-colors">
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
