'use client';

import { useState } from 'react';

export function ReceiptActions() {
  const [message, setMessage] = useState('');

  async function shareReceipt() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Relia installment receipt', text: 'Inspect this public installment receipt.', url });
        setMessage('Receipt shared.');
      } else {
        await navigator.clipboard.writeText(url);
        setMessage('Receipt link copied.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage('Sharing is unavailable. Copy the address from your browser.');
    }
  }

  return (
    <div className="receipt-actions" role="group" aria-label="Receipt actions">
      <button type="button" onClick={shareReceipt}>Share receipt</button>
      <button className="secondary" type="button" onClick={() => window.print()}>Print receipt</button>
      <span className="receipt-action-status" role="status" aria-live="polite" aria-atomic="true">{message}</span>
    </div>
  );
}
