'use client';

import { Select } from '@/components/ui/Select';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { creditcoinClient, addresses } from '@/lib/chain';
import { ASSET_KINDS, tapeAbi, titlePassAbi } from '@/lib/abi';
import { ErrorNotice } from '@/components/ErrorNotice';
import { LoadingMessage, TitleSkeleton } from '@/components/LoadingUI';
import { useLoadingTiming } from '@/lib/useLoadingTiming';
import { Badge, RecordStateBadge } from '@/components/ui';
import { MaterialIcon } from '@/components/MaterialIcon';
import { RECORD_STATES, currentWindowIndex, recordStateFromStatus, sliceDisplay, type RecordState } from '@/lib/recordStates';
import { TaskSteps } from '@/components/TaskSteps';
import { loadListedAssets, shortId, type ListedAsset } from '@/lib/assets';

const ZERO = `0x${'0'.repeat(64)}`;

export default function TitlePage() {
  const [assets, setAssets] = useState<ListedAsset[]>([]);
  const [assetListError, setAssetListError] = useState<unknown>(null);
  const [assetId, setAssetId] = useState('');
  const [cells, setCells] = useState<{ state: RecordState; payTx: string; windowEnd: bigint}[]>([]);
  const [filled, setFilled] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const timing = useLoadingTiming(loading);
  const validAssetId = /^0x[0-9a-fA-F]{64}$/.test(assetId);

  useEffect(() => {
    const requestedAssetId = new URLSearchParams(window.location.search).get('assetId');
    if (requestedAssetId && /^0x[0-9a-fA-F]{64}$/.test(requestedAssetId)) setAssetId(requestedAssetId);
    loadListedAssets().then(setAssets).catch(setAssetListError);
  }, []);

  useEffect(() => {
    if (!validAssetId) {
      setCells([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCells([]);
    (async () => {
      try {
        const sliceReads = Array.from({ length: 12 }, (_, index) => {
          const sliceNumber = index + 1;
          return Promise.all([
            creditcoinClient.readContract({
              address: addresses.titlePass,
              abi: titlePassAbi,
              functionName: 'isSliceLive',
              args: [assetId as `0x${string}`, sliceNumber],
            }),
            creditcoinClient.readContract({
              address: addresses.tape,
              abi: tapeAbi,
              functionName: 'sliceOf',
              args: [assetId as `0x${string}`, sliceNumber],
            }),
          ]);
        });
        const [sliceResults, nextFilled, nextCleared] = await Promise.all([
          Promise.all(sliceReads),
          creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'slicesFilled', args: [assetId as `0x${string}`] }),
          creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'isCleared', args: [assetId as `0x${string}`] }),
        ]);
        if (cancelled) return;
        setCells(sliceResults.map(([, slice]) => ({
          state: recordStateFromStatus(Number(slice.status)) ?? 'due',
          payTx: slice.payTx,
          windowEnd: slice.windowEnd,
        })));
        setFilled(Number(nextFilled));
        setCleared(Boolean(nextCleared));
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assetId, retryKey, validAssetId]);

  return (
    <main className="task-main">
      <header className="task-header compact" data-reveal>
        <div className="eyebrow"><span className="dot" />Public title</div>
        <h1>Follow every slice of ownership.</h1>
        <p className="lead">Enter an asset ID to read its twelve-slice title directly from Creditcoin. No wallet required.</p>
        <div className="task-context"><Link className="button ui-button ui-button-secondary ui-button-compact" href="/assets/new">List a new asset</Link></div>
      </header>
      <TaskSteps steps={[{ label: 'Find title', detail: 'Enter its public ID' }, { label: 'Read slices', detail: 'Check Creditcoin' }]} current={validAssetId ? 1 : 0} />
      <div className="task-layout title-task-layout" data-reveal>
        <section className="lookup-panel">
          <div className="task-panel-heading"><span className="task-step">01</span><div><h2>Find a title</h2><p>The lookup stays public and does not request a signature.</p></div></div>
          <label className="field full"><span>Listed asset</span><Select label="Listed asset" value={assets.some((asset) => asset.assetId === assetId) ? assetId : ''} onChange={setAssetId} placeholder={assets.length ? 'Choose a public title...' : 'No listed assets loaded'} disabled={assets.length === 0} options={assets.map((asset) => ({ value: asset.assetId, label: `${ASSET_KINDS[asset.kind] ?? `Asset ${asset.kind}`}: ${shortId(asset.assetId)}`, detail: `Buyer ${asset.buyer.slice(0, 8)}...${asset.buyer.slice(-4)}` }))} /></label>
          {assetListError != null && <ErrorNotice error={assetListError} title="Could not load the asset picker" onRetry={() => { setAssetListError(null); loadListedAssets().then(setAssets).catch(setAssetListError); }} />}
          <label className="field full"><span>Creditcoin asset ID</span><input aria-describedby="asset-id-help" aria-invalid={assetId.length > 0 && !validAssetId} placeholder="0x..." value={assetId} onChange={(e) => setAssetId(e.target.value.trim())} /></label>
          <p id="asset-id-help" className={assetId.length > 0 && !validAssetId ? 'field-error' : 'field-help'}>{assetId.length > 0 && !validAssetId ? 'Enter exactly 32 bytes: 0x followed by 64 hexadecimal characters.' : 'A 32-byte identifier beginning with 0x.'}</p>
          {validAssetId && <Link className="field-record-link" href={`/assets/${assetId}`}>Open canonical asset record <MaterialIcon name="arrow_forward" /></Link>}
        </section>
        <aside className="task-panel task-review title-read-summary">
          <div className="task-panel-heading"><span className="task-step task-step-note"><MaterialIcon name="keyboard_arrow_down" /></span><div><h2>Read summary</h2><p>What this lookup will do.</p></div></div>
          <dl className="transaction-summary-list"><div><dt>Network</dt><dd>Creditcoin</dd></div><div><dt>Wallet</dt><dd>Not required</dd></div><div><dt>Cost</dt><dd>Free public read</dd></div><div><dt>Result</dt><dd>12 title slices</dd></div></dl>
        </aside>
      </div>

      {loading && (
        <section className="title-loading-region" aria-busy="true">
          {timing.show && <><LoadingMessage slow={timing.slow} network="Creditcoin">Reading 12 title slices from Creditcoin...</LoadingMessage><TitleSkeleton /></>}
          {timing.prolonged && <button className="secondary loading-retry" onClick={() => setRetryKey((key) => key + 1)}>Retry title read</button>}
        </section>
      )}

      {!loading && error != null && <div className="notice-slot"><ErrorNotice error={error} onRetry={() => setRetryKey((key) => key + 1)} /></div>}

      {!loading && cells.length === 12 && (
        <>
          <h2 className="sr-only">Title slice results</h2>
          <div className="title-summary">
            <div>
              <div className="title-progress-value">{filled} <span className="muted-text title-progress-context">of 12 slices proven</span></div>
              <div className="aside-note title-summary-note">{cleared ? 'Cleared, the pass is transferable.' : 'Soulbound until all twelve are proven.'}</div>
            </div>
            <div className="title-summary-actions">
              <Badge tone={cleared ? 'live' : 'neutral'} symbol={cleared ? 'check' : 'circle'}>{cleared ? 'Cleared' : 'Soulbound'}</Badge>
              <Link className="button ui-button ui-button-primary ui-button-compact" href={`/title/${assetId}`}>Manage ownership</Link>
              <Link className="secondary" href={`/assets/${assetId}`}>Open full asset record</Link>
            </div>
          </div>

          <div className="slice-board title-slices">
            {cells.map((cell, i) => {
              const n = i + 1;
              const current = i === currentWindowIndex(cells);
              const definition = sliceDisplay(cell.state, cell.windowEnd, current);
              const hasPayment = cell.payTx && cell.payTx !== ZERO;
              return (
                <div key={n} className={`slice-cell ${cell.state}`}>
                  <span className="slice-number">{String(n).padStart(2, '0')}</span>
                  <RecordStateBadge state={cell.state} windowEnd={cell.windowEnd} current={current} />
                  <p className="slice-state-meaning">{definition.meaning}</p>
                  {hasPayment ? (
                    <Link className="slice-action" href={`/verify/${cell.payTx}`}>
	                      {cell.state === 'live' ? 'Open receipt' : 'Inspect payment'} <MaterialIcon name="arrow_forward" />
                    </Link>
                  ) : (
                    <div className="muted-text slice-action">{definition.nextAction}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="inline-guidance title-guidance">
	            <MaterialIcon name="arrow_forward" /><p>
            <strong>Why it cannot move yet.</strong> A transfer before all twelve slices are proven would hand over a
            title that is not paid for. <code className="mono">Soulbound</code> is the rule that refuses it.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
