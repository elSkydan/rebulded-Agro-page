import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';
import { NAV_LINKS } from '@/lib/content';
import logoIcon from '@/assets/logo-icon.png';

export function Footer() {
  return (
    <footer className="bg-gray-900 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Image src={logoIcon} alt="" className="h-8 w-8" />
              <span className="text-white font-semibold">{siteConfig.name}</span>
            </div>
            <p className="text-gray-400 text-sm">
              Вспашка, целина і покос — по всій Україні, виїзд у будь-яке місто
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

        <nav aria-label="Карта сайту" className="flex flex-wrap gap-x-6 gap-y-2 mt-8 pt-6 border-t border-gray-800">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            Головна
          </Link>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-800 mt-6 pt-6 text-center text-gray-600 text-xs">
          © {new Date().getFullYear()} {siteConfig.name}. Усі права захищені.
        </div>
      </div>
    </footer>
  );
}
