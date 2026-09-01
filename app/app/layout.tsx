import type { ReactNode } from 'react';
import Link from 'next/link';
import { ClientMotion } from '@/components/ClientMotion';
import { WalletConnect } from '@/components/WalletConnect';
import './globals.css';

export const metadata = {
  title: 'Relia',
  description: 'Hire-purchase title, proven across chains.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <ClientMotion />
        <div className="app-shell">
          <header className="site-header">
            <div className="nav-pill">
              <Link className="brand" href="/">
                <span className="brand-mark">R</span>
                <span className="brand-name">Relia</span>
              </Link>
              <nav className="site-nav">
                <Link href="/tape">Tape</Link>
                <Link href="/send">Send</Link>
                <Link href="/title">Title</Link>
                <Link href="/verify">Verify</Link>
                <Link className="nav-cta" href="/send">Get started</Link>
              </nav>
              <WalletConnect />
            </div>
          </header>
          <div id="main">{children}</div>
        </div>
      </body>
    </html>
  );
}
