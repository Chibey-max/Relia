import Link from 'next/link';

export function AppFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <span className="brand-mark">R</span>
        <div>
          <strong>Relia</strong>
          <p>Hire-purchase title, proven across chains.</p>
        </div>
      </div>
      <nav aria-label="Footer">
        <Link href="/tape">Tape</Link>
        <Link href="/send">Send</Link>
        <Link href="/title">Title</Link>
        <Link href="/verify">Verify</Link>
      </nav>
      <div className="footer-privacy">
        <strong>Privacy</strong>
        <p>Reading is public and wallet-free. Connected wallet state stays in the browser. Relia does not bridge payment funds.</p>
      </div>
      <div className="footer-meta">
        <span>No bridged funds</span>
        <span>Testnet only</span>
      </div>
    </footer>
  );
}
