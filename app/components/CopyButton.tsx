'use client';

import { useEffect, useRef, useState } from 'react';
import { MaterialIcon } from '@/components/MaterialIcon';

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resetTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    if (resetTimerRef.current !== undefined) window.clearTimeout(resetTimerRef.current);
  }, []);

  function resetAfter(delay: number) {
    if (resetTimerRef.current !== undefined) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => setStatus('idle'), delay);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
      resetAfter(1800);
    } catch {
      setStatus('failed');
      resetAfter(2400);
    }
  }

  return (
    <>
      <button className="copy-button" type="button" onClick={copy} aria-label={label} data-copy-state={status}>
        <MaterialIcon name={status === 'copied' ? 'check' : status === 'failed' ? 'priority_high' : 'content_copy'} />
        {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : label}
      </button>
      <span className="sr-announcement" role="status" aria-live="polite" aria-atomic="true">
        {status === 'copied' ? `${label} copied to the clipboard.` : status === 'failed' ? `${label} could not be copied. Select the value and copy it manually.` : ''}
      </span>
    </>
  );
}
