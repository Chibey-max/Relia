'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MaterialIcon } from '@/components/MaterialIcon';

const ROUTES = [
  { href: '/tape', label: 'Tape' },
  { href: '/title', label: 'Title' },
  { href: '/verify', label: 'Verify' },
];

export function SiteNav() {
  const pathname = usePathname();
  const disclosureRef = useRef<HTMLDetailsElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const closeFromOutside = (event: PointerEvent) => {
      if (!disclosureRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };

    document.addEventListener('pointerdown', closeFromOutside);
    document.addEventListener('keydown', closeFromKeyboard);
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside);
      document.removeEventListener('keydown', closeFromKeyboard);
    };
  }, [open]);

  return (
    <nav className="site-nav" aria-label="Primary">
      <details
        className="site-nav-disclosure"
        ref={disclosureRef}
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary
          ref={triggerRef}
          aria-controls="primary-navigation-links"
          aria-expanded={open}
          aria-label={open ? 'Close primary navigation' : 'Open primary navigation'}
        >
          <MaterialIcon name={open ? 'close' : 'menu'} />
        </summary>
        <div className="site-nav-links" id="primary-navigation-links">
          {ROUTES.map((route) => {
            const active = pathname === route.href || pathname.startsWith(`${route.href}/`);
            return (
              <Link href={route.href} aria-current={active ? 'page' : undefined} key={route.href} onClick={() => setOpen(false)}>
                {route.label}
              </Link>
            );
          })}
          <Link className="nav-cta" href="/send" aria-current={pathname === '/send' ? 'page' : undefined} onClick={() => setOpen(false)}>
            <span className="nav-cta-wide">Get started</span><span className="nav-cta-short">Send</span>
          </Link>
        </div>
      </details>
    </nav>
  );
}
