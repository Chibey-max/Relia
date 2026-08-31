import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Relia',
  description: 'Hire-purchase title, proven across chains.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 24, maxWidth: 900 }}>
        <header style={{ marginBottom: 20, borderBottom: '1px solid #ddd', paddingBottom: 12 }}>
          <strong style={{ fontSize: 18 }}>Relia</strong>
          <nav style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 14 }}>
            <Link href="/tape">Tape</Link>
            <Link href="/send">Send</Link>
            <Link href="/title">Title</Link>
          </nav>
          <p style={{ fontSize: 12, color: '#666', marginTop: 8, marginBottom: 0 }}>
            Title slice N does not exist until two finalized Sepolia transactions are proven
            together on Creditcoin. Money settles on Sepolia; Creditcoin holds title and tape.
          </p>
        </header>
        {children}
      </body>
    </html>
  );
}
