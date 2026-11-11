import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';
import { FOOTER_LINKS, NAV_LINKS } from '@/lib/content';
import { SiteNavLink } from '@/components/layout/SiteNavLink';
import logoIcon from '@/assets/logo-icon.png';

const navLinkClass =
  'inline-flex items-center min-h-11 px-2 text-gray-400 hover:text-white text-sm transition-colors';

export function Footer() {
  return (
    <footer className="bg-gray-900 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Image src={logoIcon} alt={siteConfig.name} className="h-8 w-8" />
              <span className="text-white font-semibold">{siteConfig.name}</span>
            </div>
            <p className="text-gray-400 text-sm">
              Вспашка, целина і покос у Харкові — виїзд сьогодні
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <a
              href={`tel:${siteConfig.phone}`}
              className="text-white font-semibold text-lg hover:text-primary transition-colors"
            >
              {siteConfig.phoneDisplay}
            </a>
            <p className="text-gray-500 text-sm">{siteConfig.workingHours}</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-y-2 gap-x-8">
          <nav
            aria-label="Юридична інформація"
            className="flex flex-wrap items-center gap-x-4 gap-y-1"
          >
            {FOOTER_LINKS.map((link) => (
              <SiteNavLink
                key={link.href}
                href={link.href}
                className="inline-flex items-center min-h-11 px-2 text-gray-500 hover:text-white text-sm transition-colors"
              >
                {link.label}
              </SiteNavLink>
            ))}
          </nav>

          <nav
            aria-label="Карта сайту"
            className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:justify-end"
          >
            <Link href="/" className={navLinkClass}>
              Головна
            </Link>
            {NAV_LINKS.map((link) => (
              <SiteNavLink key={link.href} href={link.href} className={navLinkClass}>
                {link.label}
              </SiteNavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-gray-800 mt-6 pt-6 text-gray-500 text-xs space-y-2">
          <p>
            {siteConfig.legal.entityName}
            {' · '}
            ЄДРПОУ/РНОКПП: {siteConfig.legal.edrpou}
          </p>
          <p>{siteConfig.legal.address}</p>
          <p>
            <a href={`mailto:${siteConfig.email}`} className="hover:text-gray-300 transition-colors">
              {siteConfig.email}
            </a>
          </p>
          <p className="text-gray-600 pt-2">
            © {new Date().getFullYear()} {siteConfig.name}. Усі права захищені.
          </p>
        </div>
      </div>
    </footer>
  );
}
