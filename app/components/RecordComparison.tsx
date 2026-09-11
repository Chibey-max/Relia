'use client';

import { useState } from 'react';
import { ExperienceMode } from '@/components/ExperienceMode';
import { MaterialIcon } from '@/components/MaterialIcon';
import { DEMO_DISCLOSURE } from '@/lib/demoData';

type ComparisonView = 'private' | 'public';

export function RecordComparison() {
  const [view, setView] = useState<ComparisonView>('public');

  const chooseView = (next: ComparisonView) => setView(next);

  return (
    <div className="record-comparison" data-view={view}>
      <div className="record-comparison-toolbar">
        <ExperienceMode>{DEMO_DISCLOSURE}</ExperienceMode>
        <div className="record-comparison-controls" role="group" aria-label="Compare payment record types">
          <button type="button" aria-pressed={view === 'private'} aria-controls="private-record" onClick={() => chooseView('private')}>
            Private note
          </button>
          <button type="button" aria-pressed={view === 'public'} aria-controls="public-record" onClick={() => chooseView('public')}>
            Public record
          </button>
        </div>
      </div>
      <noscript>
        <p className="comparison-noscript">A private notebook depends on one person&apos;s account. The public tape preserves the matched payment state and its hard-case outcome for anyone to inspect.</p>
      </noscript>

      <div className="record-comparison-frame" data-scroll-story="ledger">
        <article className="ledger-sheet ledger-old" id="private-record" data-scroll-item>
          <span className="tape-mark" aria-hidden="true" />
          <div className="mini-title">ONE PERSON&apos;S NOTEBOOK</div>
          <div className="mini-row"><span>04</span><span>paid</span><span><MaterialIcon name="check" /></span></div>
          <div className="mini-row is-missing"><span>05</span><span>missed?</span><span>shop says</span></div>
          <div className="mini-row"><span>06</span><span>paid</span><span><MaterialIcon name="check" /></span></div>
          <p>Private notes can change or disappear, leaving the buyer with little to defend.</p>
        </article>

        <article className="ledger-sheet ledger-public" id="public-record" data-scroll-item>
          <div className="mini-title">THE PUBLIC TAPE</div>
          <div className="mini-row"><span>04</span><span className="state-live"><MaterialIcon name="check" /> Live</span><span className="proof-hash">0x71c3...</span></div>
          <div className="mini-row"><span>05</span><span className="state-disputed"><MaterialIcon name="warning" /> Disputed</span><span className="proof-hash">0x2fb4...</span></div>
          <div className="mini-row"><span>06</span><span className="state-live"><MaterialIcon name="check" /> Live</span><span className="proof-hash">0x9d0b...</span></div>
          <div className="comparison-outcomes" aria-label="How hard cases are recorded">
            <p><MaterialIcon name="schedule" /><span><strong>Shop stays silent</strong>A proven payment remains visible as Disputed and cannot be reclaimed.</span></p>
            <p><MaterialIcon name="block" /><span><strong>Evidence does not match</strong>The proof is refused and the title remains unchanged.</span></p>
          </div>
        </article>
      </div>

      <span className="sr-announcement" role="status" aria-live="polite" aria-atomic="true">
        {view === 'public' ? 'Public record view selected.' : 'Private note view selected.'}
      </span>
    </div>
  );
}
