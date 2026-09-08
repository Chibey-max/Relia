'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { explorers } from '@/lib/chain';
import type { StageEvent } from '@/components/PipelineRail';
import { Badge, Button, TransactionField } from '@/components/ui';

type PublicWorkerEvent = StageEvent;

interface WorkerResponse {
  online: boolean;
  updatedAt?: string;
  events?: PublicWorkerEvent[];
}

interface ProofStatusPanelProps {
  assetId?: string;
  n?: number;
  payTx?: string;
  ackTx?: string;
  creditcoinTx?: string;
  localEvents?: StageEvent[];
}

const STATUS_URL = process.env.NEXT_PUBLIC_PROOF_STATUS_URL ?? 'http://localhost:8787/status';
const ZERO_HASH = `0x${'0'.repeat(64)}`;

const STEPS = [
  { key: 'payment', label: 'Payment found', detail: 'A successful payment transaction is visible on Sepolia.' },
  { key: 'ack', label: 'Acknowledgement found', detail: 'The registered shop cited that exact payment on Sepolia.' },
  { key: 'attestation', label: 'Attestation ready', detail: 'The source blocks are finalized and available to the proof builder.' },
  { key: 'proof', label: 'Proof submitted', detail: 'The worker submitted the paired proof to Creditcoin.' },
  { key: 'receipt', label: 'Receipt emitted', detail: 'Creditcoin accepted the pair and created the public receipt.' },
] as const;

function eventHas(events: PublicWorkerEvent[], stages: PublicWorkerEvent['stage'][]): boolean {
  return events.some((event) => stages.includes(event.stage) && !event.error);
}

function detailHash(events: PublicWorkerEvent[], key: 'payTx' | 'ackTx' | 'creditcoinTx'): string {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const value = events[index]?.detail?.[key];
    if (typeof value === 'string' && value.startsWith('0x')) return value;
  }
  return '';
}

export function ProofStatusPanel({ assetId, n, payTx = '', ackTx = '', creditcoinTx = '', localEvents = [] }: ProofStatusPanelProps) {
  const [workerEvents, setWorkerEvents] = useState<PublicWorkerEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [workerOnline, setWorkerOnline] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState(0);
  const [clock, setClock] = useState(0);

  const refresh = useCallback(async () => {
    if (!assetId && !payTx) return;
    if (lastChecked) setRefreshing(true); else setLoading(true);
    const query = new URLSearchParams();
    if (assetId) query.set('assetId', assetId);
    if (n) query.set('n', String(n));
    if (payTx) query.set('payTx', payTx);
    try {
      const response = await fetch(`${STATUS_URL}?${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Status endpoint returned ${response.status}`);
      const body = await response.json() as WorkerResponse;
      setWorkerEvents(Array.isArray(body.events) ? body.events : []);
      setWorkerOnline(body.online === true);
    } catch {
      setWorkerOnline(false);
    } finally {
      setLastChecked(Date.now());
      setLoading(false);
      setRefreshing(false);
    }
  }, [assetId, n, payTx, lastChecked]);

  useEffect(() => { void refresh(); }, [assetId, n, payTx]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const events = useMemo(() => [...localEvents, ...workerEvents], [localEvents, workerEvents]);
  const evidence = {
    payTx: payTx && payTx !== ZERO_HASH ? payTx : detailHash(events, 'payTx'),
    ackTx: ackTx && ackTx !== ZERO_HASH ? ackTx : detailHash(events, 'ackTx'),
    creditcoinTx: creditcoinTx && creditcoinTx !== ZERO_HASH ? creditcoinTx : detailHash(events, 'creditcoinTx'),
  };
  const complete = [
    Boolean(evidence.payTx) || eventHas(events, ['sepolia_mined']),
    Boolean(evidence.ackTx) || eventHas(events, ['ack_located']),
    eventHas(events, ['attested', 'proof_generated', 'verified', 'title_ticked']) || Boolean(evidence.creditcoinTx),
    eventHas(events, ['verified', 'title_ticked']) || Boolean(evidence.creditcoinTx),
    eventHas(events, ['title_ticked']) || Boolean(creditcoinTx),
  ];
  const refusal = [...events].reverse().find((event) => Boolean(event.rule && event.error));
  const transientFailure = !refusal && [...events].reverse().find((event) => Boolean(event.error) && !/not ready yet|retrying/i.test(event.error ?? ''));
  const waitingForAck = complete[0] && !complete[1] && !refusal;
  const activeIndex = complete.findIndex((done) => !done);
  const stale = lastChecked > 0 && Math.max(0, (clock || Date.now()) - lastChecked) >= 30_000;

  return (
    <section className="proof-status-panel" aria-labelledby="proof-status-title" aria-busy={loading || refreshing}>
      <header className="proof-status-head">
        <div><span className="mini-title">READ-ONLY PROOF OBSERVER</span><h2 id="proof-status-title">From payment fact to public receipt.</h2><p>This panel can observe the worker, but it cannot sign, generate, or submit a proof.</p></div>
        <div className="proof-status-tools">
          <Badge tone={workerOnline ? stale ? 'due' : 'live' : workerOnline === false ? 'neutral' : 'due'}>{workerOnline ? stale ? 'Status may be stale' : 'Worker reachable' : workerOnline === false ? 'Worker feed unavailable' : 'Checking worker'}</Badge>
          <Button variant="secondary" size="compact" onClick={() => void refresh()} busy={refreshing} busyLabel="Refreshing…" disabled={!assetId && !payTx}>Refresh status</Button>
        </div>
      </header>

      <ol className="proof-status-steps" aria-label="Public proof progress">
        {STEPS.map((step, index) => {
          const state = complete[index] ? 'done' : refusal || transientFailure ? index === activeIndex ? 'failed' : 'pending' : index === activeIndex ? 'active' : 'pending';
          return <li key={step.key} data-state={state} aria-current={state === 'active' ? 'step' : undefined}><span className="proof-status-number" aria-hidden="true">{state === 'done' ? '✓' : state === 'failed' ? '×' : String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><p>{step.detail}</p><small>{state === 'done' ? 'Confirmed' : state === 'failed' ? 'Stopped here' : state === 'active' ? waitingForAck && index === 1 ? 'Waiting for the shop' : 'Waiting for confirmed data' : 'Not reached'}</small></div></li>;
        })}
      </ol>

      {waitingForAck && <div className="proof-status-callout pending"><strong>Acknowledgement pending</strong><span>The payment is safe on Sepolia, but the shop has not yet published the matching acknowledgement. No proof or title update can happen until it does.</span></div>}
      {refusal && <div className="proof-status-callout refused" role="alert"><strong>Proof refused · {refusal.rule}</strong><span>{refusal.error}</span><small>This is a final rule verdict for this evidence pair, not a pending acknowledgement.</small></div>}
      {transientFailure && <div className="proof-status-callout failed" role="status"><strong>Proof processing failed</strong><span>The worker observed the source facts but could not advance them. Refresh after the worker recovers; the payment remains on Sepolia.</span></div>}
      {workerOnline === false && !complete[4] && <div className="proof-status-callout offline"><strong>The observer feed is unavailable</strong><span>Chain evidence remains public. A worker outage does not move funds or erase either Sepolia transaction.</span></div>}

      {(evidence.payTx || evidence.ackTx || evidence.creditcoinTx) && <div className="proof-status-evidence">
        {evidence.payTx && <TransactionField label="Sepolia payment" value={evidence.payTx} explorerHref={explorers.sepoliaTx(evidence.payTx)} explorerLabel="View payment" />}
        {evidence.ackTx && <TransactionField label="Sepolia acknowledgement" value={evidence.ackTx} explorerHref={explorers.sepoliaTx(evidence.ackTx)} explorerLabel="View acknowledgement" />}
        {evidence.creditcoinTx && <TransactionField label="Creditcoin proof" value={evidence.creditcoinTx} explorerHref={explorers.creditcoinTx(evidence.creditcoinTx)} explorerLabel="View proof" />}
      </div>}

      <footer className="proof-status-boundary"><span aria-hidden="true">↗</span><p><strong>Infrastructure boundary</strong> <code>ProofConsumer.consume(...)</code> and <code>proveShortfallDispute(...)</code> are worker operations. The browser intentionally exposes no button for either method.</p></footer>
    </section>
  );
}
