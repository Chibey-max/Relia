'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ROUTES = [
  { href: '/tape', label: 'Tape' },
  { href: '/title', label: 'Title' },
  { href: '/verify', label: 'Verify' },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Primary">
      {ROUTES.map((route) => {
        const active = pathname === route.href || pathname.startsWith(`${route.href}/`);
        return (
          <Link href={route.href} aria-current={active ? 'page' : undefined} key={route.href}>
            {route.label}
          </Link>
        );
      })}
      <Link className="nav-cta" href="/send" aria-current={pathname === '/send' ? 'page' : undefined}>
        <span className="nav-cta-wide">Get started</span><span className="nav-cta-short">Send</span>
      </Link>
    </nav>
  );
}
