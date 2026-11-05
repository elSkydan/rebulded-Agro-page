'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode, MouseEvent } from 'react';

interface SiteNavLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
}

/**
 * Same-route clicks in the Next App Router are no-ops, so footer/nav
 * "Послуги" feels broken after the first visit. Scroll to top instead.
 */
export function SiteNavLink({ href, className, children, onNavigate }: SiteNavLinkProps) {
  const pathname = usePathname();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onNavigate?.();
    if (pathname === href) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
