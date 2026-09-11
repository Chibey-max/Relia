'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { encodeFunctionData, formatUnits, type Hex } from 'viem';
import { ASSET_KINDS, registryAbi, tapeAbi, titlePassAbi } from '@/lib/abi';
import { addresses, creditcoinClient, explorers } from '@/lib/chain';
import { recordStateFromStatus, sliceDisplay, type RecordState } from '@/lib/recordStates';
import { walletClientFor, walletChains, type WalletActivity } from '@/lib/wallet';
import { ErrorNotice } from '@/components/ErrorNotice';
import { LoadingMessage, ProgressStatus, TitleSkeleton } from '@/components/LoadingUI';
import { useLoadingTiming } from '@/lib/useLoadingTiming';
import { AddressField, Badge, Button, DataEmptyState, RecordStateBadge, TransactionField } from '@/components/ui';
import { ShopRegistrationPanel } from '@/components/ShopRegistrationPanel';
import { ReclaimAction, type ReclaimSliceSnapshot } from '@/components/ReclaimAction';
import { TapeHistory } from '@/components/TapeHistory';
import { SignerContext } from '@/components/SignerContext';
import { useWalletSnapshot } from '@/lib/useWalletSnapshot';
import { ConfirmWriteAction } from '@/components/ConfirmWriteAction';
import { MaterialIcon } from '@/components/MaterialIcon';

type WindowState = 'upcoming' | 'open' | 'expired' | 'resolved';

interface AssetRecord {
  kind: number;
  installment: bigint;
  shopCtc: Hex;
  shopSepolia: Hex;
  buyer: Hex;
  owner: Hex;
  filled: number;
  cleared: boolean;
  windows: readonly bigint[];
  slices: Array<{
    n: number;
    state: RecordState;
    windowEnd: bigint;
    updatedAt: bigint;
    payTx: Hex;
    ackTx: Hex;
    payer: Hex;
    paymentProven: boolean;
    reclaimTx?: Hex;
  }>;
}

const ZERO_HASH = `0x${'0'.repeat(64)}` as Hex;

function dateLabel(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function exactDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toISOString();
}

export default function AssetDetailPage() {
  const wallet = useWalletSnapshot();
  const params = useParams<{ assetId: string }>();
  const assetId = decodeURIComponent(params.assetId ?? '');
  const validAssetId = /^0x[0-9a-fA-F]{64}$/.test(assetId);
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [readError, setReadError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [actionBusy, setActionBusy] = useState<string>('');
  const [actionPhase, setActionPhase] = useState<'idle' | 'wallet' | 'network' | 'signature' | 'confirmation' | 'refresh'>('idle');
  const [actionResult, setActionResult] = useState<{ label: string; hash: Hex } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const timing = useLoadingTiming(loading);

  const loadAsset = useCallback(async (cancelled?: () => boolean) => {
    if (!validAssetId) {
      setAsset(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setReadError(null);
    try {
      const id = assetId as Hex;
      const exists = await creditcoinClient.readContract({ address: addresses.registry, abi: registryAbi, functionName: 'exists', args: [id] });
      if (!exists) {
        if (!cancelled?.()) setNotFound(true);
        return;
      }

      const tokenId = BigInt(id);
      const sliceReads = Array.from({ length: 12 }, (_, index) => creditcoinClient.readContract({
        address: addresses.tape,
        abi: tapeAbi,
        functionName: 'sliceOf',
        args: [id, index + 1],
      }));
      const [record, windows, owner, filled, cleared, slices] = await Promise.all([
        creditcoinClient.readContract({ address: addresses.registry, abi: registryAbi, functionName: 'getAsset', args: [id] }),
        creditcoinClient.readContract({ address: addresses.registry, abi: registryAbi, functionName: 'allWindows', args: [id] }),
        creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'ownerOf', args: [tokenId] }),
        creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'slicesFilled', args: [id] }),
        creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'isCleared', args: [id] }),
        Promise.all(sliceReads),
      ]);
      if (cancelled?.()) return;
      setAsset({
        kind: Number(record.kind),
        installment: record.installment,
        shopCtc: record.shopCtc,
        shopSepolia: record.shopSepolia,
        buyer: record.buyer,
        owner,
        filled: Number(filled),
        cleared: Boolean(cleared),
        windows,
        slices: slices.map((slice, index) => ({
          n: index + 1,
          state: recordStateFromStatus(Number(slice.status)) ?? 'due',
          windowEnd: slice.windowEnd,
          updatedAt: slice.updatedAt,
          payTx: slice.payTx,
          ackTx: slice.ackTx,
          payer: slice.payer,
          paymentProven: slice.paymentProven,
        })),
      });
    } catch (error) {
      if (!cancelled?.()) setReadError(error);
    } finally {
      if (!cancelled?.()) setLoading(false);
    }
  }, [assetId, validAssetId]);

  useEffect(() => {
    let cancelled = false;
    void loadAsset(() => cancelled);
    return () => { cancelled = true; };
  }, [loadAsset, retryKey]);

  const firstOpenSlice = useMemo(() => {
    if (!asset) return -1;
    const now = Date.now();
    return asset.slices.findIndex((slice) => slice.state === 'due' && Number(slice.windowEnd) * 1000 >= now);
  }, [asset]);

  function windowState(index: number): WindowState {
    if (!asset) return 'upcoming';
    const slice = asset.slices[index];
    if (slice.state !== 'due') return 'resolved';
    if (Number(slice.windowEnd) * 1000 < Date.now()) return 'expired';
    return index === firstOpenSlice ? 'open' : 'upcoming';
  }

  function scheduleDescription(): string {
    if (!asset) return '';
    const states = asset.slices.map((_, index) => windowState(index));
    const expired = states.filter((state) => state === 'expired').length;
    const upcoming = states.filter((state) => state === 'upcoming').length;
    if (firstOpenSlice >= 0) return `Slice ${firstOpenSlice + 1} is open now${upcoming ? `; ${upcoming} later ${upcoming === 1 ? 'window remains' : 'windows remain'} upcoming` : ''}.`;
    if (expired) return `${expired} closed unresolved ${expired === 1 ? 'window can' : 'windows can'} now be settled. Resolved windows keep their recorded outcome.`;
    return 'Every window has a recorded outcome on the public tape.';
  }

  async function settleSlice(n: number) {
    if (!asset || actionBusy) return;
    const key = `settle-${n}`;
    setActionBusy(key);
    setActionError(null);
    setActionResult(null);
    setActionPhase('wallet');
    try {
      const trackWallet = (activity: WalletActivity) => {
        if (activity === 'opening') setActionPhase('wallet');
        if (activity === 'switching') setActionPhase('network');
      };
      const { client, account } = await walletClientFor(walletChains.creditcoin, trackWallet);
      setActionPhase('signature');
      const hash = await client.sendTransaction({
        account,
        to: addresses.tape,
        data: encodeFunctionData({ abi: tapeAbi, functionName: 'settleWindow', args: [assetId as Hex, n] }),
      });
      setActionPhase('confirmation');
      const receipt = await creditcoinClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('The settle transaction reverted before confirmation.');
      setActionResult({ label: `Slice ${n} settled`, hash });
      setActionPhase('refresh');
      setRetryKey((keyValue) => keyValue + 1);
    } catch (error) {
      setActionError(error);
    } finally {
      setActionBusy('');
      setActionPhase('idle');
    }
  }

  function updateReclaimedSlice(n: number, slice: ReclaimSliceSnapshot, transaction: Hex) {
    setAsset((current) => current ? {
      ...current,
      slices: current.slices.map((item) => item.n === n ? {
        ...item,
        state: recordStateFromStatus(slice.status) ?? item.state,
        windowEnd: slice.windowEnd,
        updatedAt: slice.updatedAt,
        payTx: slice.payTx,
        ackTx: slice.ackTx,
        payer: slice.payer,
        paymentProven: slice.paymentProven,
        reclaimTx: transaction,
      } : item),
    } : current);
  }

  return (
    <main className="task-main asset-detail-main">
      <header className="asset-detail-hero" data-reveal>
        <div>
          <div className="eyebrow"><span className="dot" />Canonical asset record</div>
          <h1>{asset ? ASSET_KINDS[asset.kind] ?? `Asset ${asset.kind}` : 'One title. Every slice.'}</h1>
          <p className="lead">Registry terms, ownership, payment windows, and the public tape, read directly from Creditcoin.</p>
        </div>
        <div className="asset-id-ticket"><span>ASSET ID</span><code>{assetId}</code><a href={explorers.creditcoinAddress(addresses.registry)} target="_blank" rel="noreferrer">Inspect registry <MaterialIcon name="open_in_new" /></a></div>
      </header>

      {loading && <section className="asset-loading" aria-busy="true">{timing.show && <><LoadingMessage slow={timing.slow} network="Creditcoin">Assembling this asset's public record...</LoadingMessage><TitleSkeleton /></>}{timing.prolonged && <Button variant="secondary" onClick={() => setRetryKey((key) => key + 1)}>Retry public read</Button>}</section>}

      {!loading && readError != null && <div className="notice-slot"><ErrorNotice error={readError} title="Could not read this asset" onRetry={() => setRetryKey((key) => key + 1)} /></div>}

      {!loading && notFound && <DataEmptyState symbol="help" title="Asset not found" body={validAssetId ? 'The configured registry does not contain this asset ID.' : 'This URL does not contain a valid 32-byte asset ID.'} action={<Button href="/title" variant="secondary">Find another title</Button>} />}

      {!loading && asset && (
        <>
          <section className="asset-summary-grid" aria-label="Asset overview" data-reveal>
            <article className="asset-progress-card">
              <span className="mini-title">TITLE PROGRESS</span>
              <strong>{asset.filled}<small> / 12</small></strong>
              <div className="asset-progress-track" role="img" aria-label={`${asset.filled} of 12 title slices live`}>{Array.from({ length: 12 }, (_, index) => <i className={index < asset.filled ? 'filled' : ''} key={index} />)}</div>
              <Badge tone={asset.cleared ? 'live' : 'due'}>{asset.cleared ? 'Cleared and transferable' : 'Soulbound while in progress'}</Badge>
              <Button href={`/title/${assetId}`} variant="secondary" size="compact">Open ownership workspace</Button>
            </article>
            <article className="asset-facts-card">
              <div className="asset-card-heading"><span className="mini-title">PURCHASE TERMS</span><strong>{formatUnits(asset.installment, 6)} USDC per slice</strong></div>
              <dl><div><dt>Kind</dt><dd>{ASSET_KINDS[asset.kind] ?? asset.kind}</dd></div><div><dt>Network</dt><dd>Creditcoin testnet</dd></div><div><dt>Schedule</dt><dd>12 public windows</dd></div><div><dt>Custody</dt><dd>No bridged funds</dd></div></dl>
            </article>
          </section>

          <section className="asset-people" aria-labelledby="asset-people-title" data-reveal>
            <div className="asset-section-heading"><div><span className="mini-title">PEOPLE AND OWNERSHIP</span><h2 id="asset-people-title">Who the record names.</h2></div><p>Buyer and shops come from the immutable registry terms. Current owner comes from TitlePass.</p></div>
            <div className="asset-address-grid">
              <AddressField label="Buyer" value={asset.buyer} explorerHref={explorers.creditcoinAddress(asset.buyer)} explorerLabel="Buyer on Creditcoin" />
              <AddressField label="Current title owner" value={asset.owner} explorerHref={explorers.creditcoinAddress(asset.owner)} explorerLabel="Owner on Creditcoin" />
              <AddressField label="Creditcoin shop" value={asset.shopCtc} explorerHref={explorers.creditcoinAddress(asset.shopCtc)} explorerLabel="Shop on Creditcoin" />
              <AddressField label="Sepolia shop" value={asset.shopSepolia} explorerHref={explorers.sepoliaAddress(asset.shopSepolia)} explorerLabel="Shop on Sepolia" />
            </div>
          </section>

          <ShopRegistrationPanel assetId={assetId as Hex} expectedShop={asset.shopSepolia} />

          {actionError != null && <div className="notice-slot"><ErrorNotice error={actionError} title="The asset action did not complete" /></div>}
          {actionPhase !== 'idle' && <ProgressStatus label={actionPhase === 'wallet' ? 'Connecting wallet...' : actionPhase === 'network' ? 'Switching to Creditcoin...' : actionPhase === 'signature' ? 'Waiting for settlement signature...' : actionPhase === 'confirmation' ? 'Confirming settlement...' : 'Refreshing this asset...'} />}
          {actionResult && <section className="durable-result"><Badge tone="live">Confirmed</Badge><div><strong>{actionResult.label}</strong><TransactionField label="Creditcoin transaction" value={actionResult.hash} explorerHref={explorers.creditcoinTx(actionResult.hash)} explorerLabel="View confirmation" /></div></section>}

          <section className="asset-schedule" aria-labelledby="asset-schedule-title" data-reveal>
            <div className="asset-section-heading"><div><span className="mini-title">TWELVE-SLICE LEDGER</span><h2 id="asset-schedule-title">Every deadline and outcome.</h2></div><p>{scheduleDescription()}</p></div>
            <div className="asset-write-context"><SignerContext account={wallet.account} role="Settlement or reclaim caller" network="Creditcoin" contract={addresses.tape} /><p>These maintenance actions are permissionless; the connected account is the gas-paying caller.</p></div>
            <ol className="asset-window-grid">
              {asset.slices.map((slice, index) => {
                const timingState = windowState(index);
                const definition = sliceDisplay(slice.state, slice.windowEnd, index === firstOpenSlice);
                const hasPayment = slice.payTx !== ZERO_HASH;
                const canPay = timingState === 'open';
                const canSettle = timingState === 'expired';
                const canReclaim = slice.state === 'shortfall';
                return (
                  <li className="asset-window-card" data-state={slice.state} data-window={timingState} key={slice.n}>
                    <div className="asset-window-top"><span className="asset-window-number">{String(slice.n).padStart(2, '0')}</span><RecordStateBadge state={slice.state} windowEnd={slice.windowEnd} current={index === firstOpenSlice} /></div>
                    <div className="asset-window-date"><span>{timingState === 'expired' ? 'deadline passed' : timingState === 'open' ? 'open · deadline' : timingState}</span><strong>{dateLabel(asset.windows[index] ?? slice.windowEnd)}</strong><small>{exactDate(asset.windows[index] ?? slice.windowEnd)}</small></div>
                    <p>{definition.meaning}</p>
                    {hasPayment && (slice.state === 'live' || slice.state === 'disputed') && <Link className="asset-receipt-link" href={`/verify/${slice.payTx}`}>{slice.state === 'live' ? 'Open public receipt' : 'Inspect disputed payment'} <MaterialIcon name="arrow_forward" /></Link>}
                    <div className="asset-window-actions">
                      {canPay && <Button href={`/send?assetId=${assetId}&slice=${slice.n}`} size="compact">Pay this slice</Button>}
                      {canSettle && <ConfirmWriteAction title={`Settle slice ${slice.n}?`} consequence="This permanently records the closed window as Shortfall or Disputed according to the latest proven payment evidence." confirmLabel="Confirm settlement" loadingLabel="Settling..." onConfirm={() => settleSlice(slice.n)} busy={Boolean(actionBusy)}><div className="confirm-write-facts"><span>Creditcoin | ShortfallTape</span><code>{assetId}</code><span>Slice {slice.n}</span></div></ConfirmWriteAction>}
                      {canReclaim && <ReclaimAction assetId={assetId as Hex} n={slice.n} windowEnd={slice.windowEnd} payTx={slice.payTx} paymentProven={slice.paymentProven} onConfirmed={(confirmed, transaction) => updateReclaimedSlice(slice.n, confirmed, transaction)} />}
                      {slice.reclaimTx && <TransactionField label="Confirmed reclaim" value={slice.reclaimTx} explorerHref={explorers.creditcoinTx(slice.reclaimTx)} explorerLabel="View confirmation" />}
                    </div>
                    {(slice.paymentProven || slice.updatedAt > 0n) && <details className="asset-window-detail"><summary>Technical record</summary><dl><div><dt>Payment proven</dt><dd>{slice.paymentProven ? 'Yes' : 'No'}</dd></div><div><dt>Updated</dt><dd>{slice.updatedAt > 0n ? exactDate(slice.updatedAt) : 'Not updated'}</dd></div><div><dt>Payer</dt><dd><code>{slice.payer}</code></dd></div><div><dt>Payment tx</dt><dd><code>{slice.payTx}</code></dd></div><div><dt>Ack tx</dt><dd><code>{slice.ackTx}</code></dd></div></dl></details>}
                  </li>
                );
              })}
            </ol>
          </section>

          <TapeHistory assetId={assetId as Hex} />
        </>
      )}
    </main>
  );
}
