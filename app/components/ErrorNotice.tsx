'use client';

import { useEffect, useRef, useState } from 'react';
import { explainError } from '@/lib/errors';
import { Button, Notice } from '@/components/ui';

export function ErrorNotice({
  error,
  title,
  recovery,
  onRetry,
}: {
  error: unknown;
  title?: string;
  recovery?: string;
  onRetry?: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resetTimerRef = useRef<number | undefined>(undefined);
  const noticeRef = useRef<HTMLDivElement>(null);
  const detail = explainError(error, title);
  const raw = error instanceof Error ? error.message : String(error);

  useEffect(() => () => {
    if (resetTimerRef.current !== undefined) window.clearTimeout(resetTimerRef.current);
  }, []);

  useEffect(() => { noticeRef.current?.focus(); }, [raw]);

  function resetCopyStatus(delay: number) {
    if (resetTimerRef.current !== undefined) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => setCopyStatus('idle'), delay);
  }

  async function copyDetail() {
    try {
      await navigator.clipboard?.writeText(raw);
      setCopyStatus('copied');
      resetCopyStatus(1400);
    } catch {
      setCopyStatus('failed');
      resetCopyStatus(2400);
    }
  }

  return <div ref={noticeRef} className="error-focus-target" tabIndex={-1}>
    <Notice
      tone={detail.tone === 'warn' ? 'disputed' : 'shortfall'}
      title={detail.title}
      consequence={detail.message}
      recovery={recovery ?? detail.action}
      technicalDetails={<code>{raw}</code>}
      actions={<>
        {onRetry && <Button variant="secondary" size="compact" onClick={onRetry}>Try again</Button>}
        <Button variant="quiet" size="compact" onClick={copyDetail} aria-label="Copy technical error detail">{copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? 'Copy failed' : 'Copy detail'}</Button>
        <span className="sr-announcement" role="status" aria-live="polite" aria-atomic="true">
          {copyStatus === 'copied' ? 'Technical error detail copied to the clipboard.' : copyStatus === 'failed' ? 'The technical error detail could not be copied. Select it and copy it manually.' : ''}
        </span>
      </>}
    />
  </div>;
}
