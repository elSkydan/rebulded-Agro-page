'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Phone, X } from 'lucide-react';
import { NAV_LINKS } from '@/lib/content';
import { siteConfig } from '@/lib/config';
import logoIcon from '@/assets/logo-icon.png';
import logoNavbar from '@/assets/logo-navbar.png';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  // Only the home page has a full-bleed dark hero behind the navbar —
  // everywhere else the navbar needs a solid background from the start,
  // otherwise white nav text is unreadable over a white page background.
  const isHome = pathname === '/';
  const solid = scrolled || !isHome;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      id="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${solid ? 'scrolled' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0" aria-label={siteConfig.name}>
            <Image src={logoIcon} alt="" priority className="h-8 w-8 sm:hidden" />
            <Image src={logoNavbar} alt={siteConfig.name} priority className="hidden sm:block h-9 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/90 hover:text-white text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA + Mobile toggle */}
          <div className="flex items-center gap-3">
            <a
              href={`tel:${siteConfig.phone}`}
              className="navbar-cta flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Зателефонувати</span>
            </a>
            <button
              type="button"
              className="md:hidden text-white p-1"
              aria-label={menuOpen ? 'Закрити меню' : 'Відкрити меню'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`${menuOpen ? '' : 'hidden'} md:hidden bg-gray-900/95 backdrop-blur-md border-t border-white/10`}
      >
        <div className="px-4 py-4 flex flex-col gap-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/90 hover:text-white text-sm font-medium py-2"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
