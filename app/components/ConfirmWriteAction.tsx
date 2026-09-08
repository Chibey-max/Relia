'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LoadingButton } from '@/components/LoadingUI';
import { Button } from '@/components/ui';

export function ConfirmWriteAction({ title, consequence, confirmLabel, loadingLabel, onConfirm, busy = false, disabled = false, tone = 'secondary', children }: {
  title: string;
  consequence: string;
  confirmLabel: string;
  loadingLabel: string;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
  disabled?: boolean;
  tone?: 'secondary' | 'danger';
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLButtonElement>('.loading-button')?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [busy, open]);

  async function confirm() {
    if (busy || submittingRef.current) return;
    submittingRef.current = true;
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      submittingRef.current = false;
    }
  }

  return <div className="confirm-write-action">
    <Button variant={tone} size="compact" onClick={() => setOpen(true)} disabled={busy || disabled}>Review {confirmLabel.toLowerCase()}</Button>
    {open && <div className="confirm-write-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section ref={dialogRef} className="confirm-write-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-write-title" aria-busy={busy} tabIndex={-1}>
        <span className="mini-title">FINAL WALLET REVIEW</span>
        <h2 id="confirm-write-title">{title}</h2>
        <p>{consequence}</p>
        {children}
        <div className="confirm-write-buttons">
          <LoadingButton className={tone === 'danger' ? 'danger' : ''} onClick={() => void confirm()} loading={busy} loadingLabel={loadingLabel}>{confirmLabel}</LoadingButton>
          <Button variant="quiet" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
        </div>
      </section>
    </div>}
  </div>;
}
