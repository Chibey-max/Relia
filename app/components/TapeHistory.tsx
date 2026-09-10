'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Hex } from 'viem';
import { tapeAbi } from '@/lib/abi';
import { addresses, creditcoinClient, explorers } from '@/lib/chain';
import { ErrorNotice } from '@/components/ErrorNotice';
import { LoadingMessage, TableSkeleton } from '@/components/LoadingUI';
import { Badge, Button, DataEmptyState, RecordStateBadge } from '@/components/ui';
import { RECORD_STATES, recordStateFromStatus, type RecordState } from '@/lib/recordStates';
import { TableIdentifier } from '@/components/TableIdentifier';
import { MaterialIcon } from '@/components/MaterialIcon';

interface HistoryEntry {
  index: number;
  assetId: Hex;
  n: number;
  state: RecordState | null;
  at: bigint;
  payTx: Hex;
  ackTx: Hex;
}

const PAGE_SIZE = 16;
const STALE_AFTER_MS = 30_000;
const ZERO_HASH = `0x${'0'.repeat(64)}`;

function eventVerb(state: RecordState | null): string {
  if (state === 'due') return 'Payment window opened';
  if (state === 'live') return 'Payment and acknowledgement proved';
  if (state === 'shortfall') return 'Window settled as shortfall';
  if (state === 'disputed') return 'Proven payment entered dispute';
  if (state === 'reclaimed') return 'Shortfall slice reclaimed';
  return 'Unknown tape transition';
}

function eventDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
}

export function TapeHistory({ assetId }: { assetId?: Hex }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [clock, setClock] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const loadedOnce = useRef(false);

  const load = useCallback(async (cancelled?: () => boolean) => {
    if (loadedOnce.current) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const count = assetId
        ? await creditcoinClient.readContract({ address: addresses.tape, abi: tapeAbi, functionName: 'entryCountOf', args: [assetId] })
        : await creditcoinClient.readContract({ address: addresses.tape, abi: tapeAbi, functionName: 'entryCount' });
      const numericCount = Number(count);
      const start = Math.max(0, numericCount - limit);
      const reads = Array.from({ length: numericCount - start }, (_, offset) => {
        const index = start + offset;
        return assetId
          ? creditcoinClient.readContract({ address: addresses.tape, abi: tapeAbi, functionName: 'entryOfAt', args: [assetId, BigInt(index)] })
          : creditcoinClient.readContract({ address: addresses.tape, abi: tapeAbi, functionName: 'entryAt', args: [BigInt(index)] });
      });
      const records = await Promise.all(reads);
      if (cancelled?.()) return;
      setTotal(numericCount);
      setEntries(records.map((entry, offset) => ({
        index: start + offset,
        assetId: entry.assetId,
        n: Number(entry.n),
        state: recordStateFromStatus(Number(entry.status)),
        at: entry.at,
        payTx: entry.payTx,
        ackTx: entry.ackTx,
      })));
      setLastUpdated(Date.now());
      loadedOnce.current = true;
    } catch (problem) {
      if (!cancelled?.()) setError(problem);
    } finally {
      if (!cancelled?.()) { setLoading(false); setRefreshing(false); }
    }
  }, [assetId, limit]);

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => { cancelled = true; };
  }, [load, refreshKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const age = lastUpdated ? Math.max(0, (clock || Date.now()) - lastUpdated) : 0;
  const stale = age >= STALE_AFTER_MS;
  const remaining = Math.max(0, total - entries.length);

  return (
    <section className="tape-history" aria-labelledby={assetId ? 'asset-history-title' : 'global-history-title'} data-reveal>
      <div className="tape-history-heading">
        <div><span className="mini-title">APPEND-ONLY AUDIT TRAIL</span><h2 id={assetId ? 'asset-history-title' : 'global-history-title'}>{assetId ? 'How this title reached today.' : 'Latest activity across the tape.'}</h2><p>Old entries remain intact when a slice changes. This view reads the newest bounded page and orders it from earlier to later.</p></div>
        <div className="tape-history-tools"><Badge tone={stale ? 'due' : 'live'}>{lastUpdated ? stale ? 'Stale snapshot' : 'Fresh snapshot' : 'Waiting for read'}</Badge><Button variant="secondary" size="compact" onClick={() => setRefreshKey((key) => key + 1)} busy={refreshing} busyLabel="Refreshing..."><MaterialIcon name="refresh" />Refresh history</Button></div>
      </div>

      {loading && <div className="tape-history-loading" aria-busy="true"><LoadingMessage network="Creditcoin">Reading append-only tape entries...</LoadingMessage><TableSkeleton rows={4} columns={3} labels={['State', 'Event', 'Evidence']} /></div>}
      {!loading && error != null && <ErrorNotice error={error} title="Could not read tape history" onRetry={() => setRefreshKey((key) => key + 1)} />}
      {!loading && error == null && entries.length === 0 && <DataEmptyState symbol="radio_button_unchecked" title="No history entries yet" body={assetId ? 'This asset exists, but its tape has no indexed transitions.' : 'The configured tape has not recorded any transitions.'} />}

      {!loading && error == null && entries.length > 0 && <>
        <ol className="tape-history-timeline">
          {entries.map((entry) => {
            const definition = entry.state ? RECORD_STATES[entry.state] : null;
            return <li key={entry.index} data-state={entry.state ?? 'unknown'}>
              <div className="tape-history-rail"><i aria-hidden="true" /><time dateTime={new Date(Number(entry.at) * 1000).toISOString()}>{eventDate(entry.at)} UTC</time></div>
              <article className="tape-history-card">
                <div className="tape-history-event"><div><span className="tape-history-index">ENTRY {entry.index + 1}</span><h3>{eventVerb(entry.state)}</h3></div>{entry.state ? <RecordStateBadge state={entry.state} /> : <Badge tone="neutral">Unknown</Badge>}</div>
                <div className="tape-history-context"><span>Slice {String(entry.n).padStart(2, '0')}</span>{!assetId && <Link href={`/assets/${entry.assetId}`}>Open asset <MaterialIcon name="arrow_forward" /></Link>}</div>
                {definition && <p>{definition.meaning}</p>}
                {(entry.payTx !== ZERO_HASH || entry.ackTx !== ZERO_HASH) && <div className="tape-history-evidence">
                  {entry.payTx !== ZERO_HASH && <TableIdentifier value={entry.payTx} copyLabel="Copy payment hash" href={`/verify/${entry.payTx}`} actionLabel="Receipt" />}
                  {entry.ackTx !== ZERO_HASH && <TableIdentifier value={entry.ackTx} copyLabel="Copy acknowledgement hash" href={explorers.sepoliaTx(entry.ackTx)} actionLabel="Acknowledgement" external />}
                </div>}
                {entry.state === 'disputed' && <div className="tape-history-dispute"><strong>Why reclaim is blocked</strong><span>The payment itself was proven. Missing shop acknowledgement cannot be turned into a reclaim against the buyer.</span></div>}
              </article>
            </li>;
          })}
        </ol>
        <div className="tape-history-footer"><span>Showing {entries.length} of {total} entries.</span>{remaining > 0 && <Button variant="secondary" onClick={() => setLimit((current) => current + PAGE_SIZE)} busy={refreshing} busyLabel="Loading older entries...">Load {Math.min(PAGE_SIZE, remaining)} older</Button>}</div>
      </>}
    </section>
  );
}
