import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import Link from 'next/link';
import { ClientMotion } from '@/components/ClientMotion';
import { WalletConnect } from '@/components/WalletConnect';
import { SiteNav } from '@/components/SiteNav';
import './globals.css';

export const metadata = {
  title: 'Relia',
  description: 'Hire-purchase title, proven across chains.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <noscript>
          <div className="no-script-notice">
            <strong>JavaScript is off.</strong>{' '}
            The public explanations remain readable, but live chain lookups and wallet actions need JavaScript in this prototype.
          </div>
        </noscript>
        <ClientMotion />
        <div className="app-shell">
          <header className="site-header">
            <div className="nav-pill">
              <Link className="brand" href="/">
                <span className="brand-mark">R</span>
                <span className="brand-name">Relia</span>
              </Link>
              <SiteNav />
              <WalletConnect />
            </div>
          </header>
          <div id="main" tabIndex={-1}>{children}</div>
        </div>
      </body>
    </html>
  );
}
