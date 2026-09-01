'use client';

import { useState } from 'react';
import { explainError, type UiError } from '@/lib/errors';

export function ErrorNotice({
  error,
  title,
  onRetry,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const detail = explainError(error, title);
  const raw = error instanceof Error ? error.message : String(error);

  async function copyDetail() {
    try {
      await navigator.clipboard?.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`notice ${detail.tone}`} role="alert" aria-live="polite">
      <ErrorBody detail={detail} />
      <div className="notice-actions">
        {onRetry && <button className="secondary" onClick={onRetry}>Try again</button>}
        <button className="secondary" onClick={copyDetail}>{copied ? 'Copied' : 'Copy detail'}</button>
      </div>
    </div>
  );
}

function ErrorBody({ detail }: { detail: UiError }) {
  return (
    <>
      <span className={`status-badge ${detail.tone === 'warn' ? 'status-disputed' : 'status-shortfall'}`}>
        {detail.title}
      </span>
      <p style={{ margin: '12px 0 0' }}>{detail.message}</p>
      <p className="aside-note" style={{ margin: '8px 0 0' }}>{detail.action}</p>
    </>
  );
}
