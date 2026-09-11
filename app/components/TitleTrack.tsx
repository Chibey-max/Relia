import type { CSSProperties } from 'react';
import { MaterialIcon } from '@/components/MaterialIcon';

const SLICE_COUNT = 12;
const DISPUTED_SLICE = 5;

const REFUSALS = [
  ['NotSuccessful', 'The Sepolia payment reverted.'],
  ['UnderPaid', 'Short of the agreed installment.'],
  ['AckDoesNotCitePayment', 'The shop cited a different payment.'],
  ['AlreadyConsumed', 'That payment already filled a slice.'],
  ['WindowClosed', 'Correct, but after the deadline.'],
  ['Soulbound', 'Title moves at twelve slices, not eleven.'],
] as const;

/**
 * Replaces the old physics field. Pure CSS: server-rendered, no pointer
 * capture, never traps touch scrolling, and pauses offscreen through the
 * shared `data-motion-loop` activity observer. Reduced motion sees the
 * complete final state.
 */
export function TitleTrack() {
  return (
    <section className="title-track" aria-labelledby="title-track-heading" data-motion-loop>
      <div className="title-track-head">
        <span className="section-index section-index-light">THE RULE, VISUALIZED</span>
        <h2 id="title-track-heading">Twelve proven slices. Then the title is yours.</h2>
        <p>A slice fills only when the payment and the shop&apos;s acknowledgement are proven together. Silence leaves a Disputed mark, never a false miss.</p>
      </div>

      <div className="title-track-board">
        <div className="title-track-board-head" aria-hidden="true">
          <span>Sample title · Generator</span>
          <span className="title-track-transfer"><MaterialIcon name="lock_open" />Transfer unlocks at 12/12</span>
        </div>
        <ol className="title-track-slices" aria-label="Sample twelve-slice title: eleven live slices and one disputed slice">
          {Array.from({ length: SLICE_COUNT }, (_, index) => {
            const n = index + 1;
            const disputed = n === DISPUTED_SLICE;
            return (
              <li key={n} data-state={disputed ? 'disputed' : 'live'} style={{ '--slice-index': index } as CSSProperties}>
                <span className="title-track-n">{String(n).padStart(2, '0')}</span>
                <MaterialIcon name={disputed ? 'priority_high' : 'check'} className="title-track-mark" />
                <span className="sr-only">{disputed ? 'Disputed' : 'Live'}</span>
              </li>
            );
          })}
        </ol>
        <div className="title-track-legend" aria-hidden="true">
          <span><i data-state="live" />Live · payment and acknowledgement proven</span>
          <span><i data-state="disputed" />Disputed · paid, shop stayed silent</span>
        </div>
      </div>

      <div className="title-track-rules">
        <h3>What the contracts refuse</h3>
        <ul>
          {REFUSALS.map(([code, meaning]) => (
            <li key={code}><MaterialIcon name="block" className="title-track-rule-icon" /><div><code>{code}</code><span>{meaning}</span></div></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
