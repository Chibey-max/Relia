import type { ReactNode } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { RECORD_STATES, type RecordState } from '@/lib/recordStates';

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

export type StatusTone = 'live' | 'due' | 'disputed' | 'shortfall' | 'reclaimed' | 'neutral' | 'editorial';

const SYMBOLS: Record<StatusTone, string> = {
  live: '✓',
  due: '○',
  disputed: '!',
  shortfall: '×',
  reclaimed: '↩',
  neutral: '•',
  editorial: '✦',
};

export function Badge({ tone = 'neutral', symbol, children, className }: { tone?: StatusTone; symbol?: string | false; children: ReactNode; className?: string }) {
  return <span className={classes('status-badge', 'ui-badge', `ui-badge-${tone}`, className)}>{symbol !== false && <span aria-hidden="true">{symbol ?? SYMBOLS[tone]}</span>}{children}</span>;
}

export function RecordStateBadge({ state, className }: { state: RecordState; className?: string }) {
  const definition = RECORD_STATES[state];
  return <Badge tone={state} symbol={definition.symbol} className={classes('record-state-badge', className)}>{definition.label}</Badge>;
}

export function RecordStateContext({ state, compact = false, className }: { state: RecordState; compact?: boolean; className?: string }) {
  const definition = RECORD_STATES[state];
  return (
    <div className={classes('record-state-context', compact && 'record-state-context-compact', className)}>
      <RecordStateBadge state={state} />
      <div>
        <p>{definition.meaning}</p>
        <small><strong>Next:</strong> {definition.nextAction}</small>
      </div>
    </div>
  );
}

export function StatusIndicator({ tone = 'neutral', label, className }: { tone?: StatusTone; label: ReactNode; className?: string }) {
  return <span className={classes('ui-status-indicator', `ui-status-indicator-${tone}`, className)}><i aria-hidden="true" /><span>{label}</span></span>;
}

export function DataEmptyState({ symbol = '○', title, body, action }: { symbol?: string; title: ReactNode; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state data-empty-state">
      <span className="data-empty-mark" aria-hidden="true">{symbol}</span>
      <div><strong>{title}</strong><p>{body}</p>{action && <div className="data-empty-action">{action}</div>}</div>
    </div>
  );
}

export function Notice({
  tone = 'neutral',
  title,
  consequence,
  recovery,
  actions,
  technicalDetails,
  live = 'polite',
  className,
}: {
  tone?: StatusTone;
  title: ReactNode;
  consequence: ReactNode;
  recovery?: ReactNode;
  actions?: ReactNode;
  technicalDetails?: ReactNode;
  live?: 'polite' | 'assertive' | 'off';
  className?: string;
}) {
  return (
    <section className={classes('notice', 'ui-notice', `ui-notice-${tone}`, className)}>
      <div className="notice-live-copy" role={tone === 'shortfall' ? 'alert' : 'status'} aria-live={live} aria-atomic="true">
        <Badge tone={tone}>{title}</Badge>
        <div className="notice-message">{consequence}</div>
        {recovery && <div className="aside-note notice-recovery">{recovery}</div>}
      </div>
      {actions && <div className="notice-actions">{actions}</div>}
      {technicalDetails && <details className="notice-technical"><summary>Technical details</summary><div>{technicalDetails}</div></details>}
    </section>
  );
}

export function IdentifierField({ label, value, explorerHref, explorerLabel = 'Inspect on explorer', kind = 'address' }: { label: string; value: string; explorerHref?: string; explorerLabel?: string; kind?: 'address' | 'transaction' | 'identifier' }) {
  return (
    <div className="identifier-field">
      <span className="type-label">{label}</span>
      <code className="identifier-value">{value}</code>
      <div className="identifier-actions">
        <CopyButton value={value} label={kind === 'identifier' ? 'Copy identifier' : `Copy ${kind}`} />
        {explorerHref && <a href={explorerHref} target="_blank" rel="noreferrer" aria-label={`${explorerLabel}: ${value}`}>{explorerLabel} ↗</a>}
      </div>
    </div>
  );
}

export function AddressField(props: Omit<Parameters<typeof IdentifierField>[0], 'kind'>) {
  return <IdentifierField {...props} kind="address" />;
}

export function TransactionField(props: Omit<Parameters<typeof IdentifierField>[0], 'kind'>) {
  return <IdentifierField {...props} kind="transaction" />;
}
