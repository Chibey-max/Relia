'use client';

import { useEffect, useMemo, useState } from 'react';
import { encodeFunctionData } from 'viem';
import { creditcoinClient, addresses, explorers } from '@/lib/chain';
import { tapeAbi, ASSET_KINDS } from '@/lib/abi';
import { loadListedAssets, shortId, type ListedAsset } from '@/lib/assets';
import { ErrorNotice } from '@/components/ErrorNotice';
import { walletClientFor, walletChains, type WalletActivity } from '@/lib/wallet';
import { LoadingMessage, ProgressStatus, TableSkeleton } from '@/components/LoadingUI';
import { useLoadingTiming } from '@/lib/useLoadingTiming';
import { RecordStateBadge } from '@/components/ui';
import { RECORD_STATES, recordStateFromStatus, sliceDisplay } from '@/lib/recordStates';
import { TableIdentifier } from '@/components/TableIdentifier';
import { DataEmptyState } from '@/components/ui';
import { Select } from '@/components/ui/Select';
import { Pagination, clampPage } from '@/components/ui/Pagination';
import { ReclaimAction, type ReclaimSliceSnapshot } from '@/components/ReclaimAction';
import { TapeHistory } from '@/components/TapeHistory';
import { SignerContext } from '@/components/SignerContext';
import { useWalletSnapshot } from '@/lib/useWalletSnapshot';
import { ConfirmWriteAction } from '@/components/ConfirmWriteAction';
import { MaterialIcon } from '@/components/MaterialIcon';

interface Row {
  assetId: `0x${string}`;
  kind: number;
  buyer: string;
  shop: string;
  n: number;
  status: number;
  windowEnd: bigint;
  payTx: `0x${string}`;
  ackTx: `0x${string}`;
  payer: `0x${string}`;
  updatedAt: bigint;
  paymentProven: boolean;
  reclaimTx?: `0x${string}`;
}

const ZERO = `0x${'0'.repeat(64)}`;
const TAPE_PAGE_SIZE = 8;

export default function TapePage() {
  const wallet = useWalletSnapshot();
  const [assets, setAssets] = useState<ListedAsset[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [settlePhase, setSettlePhase] = useState<'idle' | 'wallet' | 'network' | 'signature' | 'confirmation' | 'refresh'>('idle');
  const [settleResult, setSettleResult] = useState<{ assetId: string; n: number; hash: `0x${string}` } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [assetFilter, setAssetFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [shopFilter, setShopFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionableOnly, setActionableOnly] = useState(false);
  const [page, setPage] = useState(0);
  const timing = useLoadingTiming(loading);

  function updateReclaimedRow(assetId: `0x${string}`, n: number, slice: ReclaimSliceSnapshot, transaction: `0x${string}`) {
    setRows((current) => current.map((row) => row.assetId === assetId && row.n === n ? {
      ...row,
      status: slice.status,
      windowEnd: slice.windowEnd,
      payTx: slice.payTx,
      ackTx: slice.ackTx,
      payer: slice.payer,
      updatedAt: slice.updatedAt,
      paymentProven: slice.paymentProven,
      reclaimTx: transaction,
    } : row));
  }

  /**
   * Nothing on the tape turns red on its own. A window closing is not an
   * event, so someone has to write the outcome: Shortfall if no payment was
   * proven, Disputed if one was and the shop never acknowledged it.
   * Permissionless on purpose: the buyer has every incentive to call it too.
   */
  async function settle(assetId: string, n: number) {
    if (busy) return;
    setBusy(`${assetId}-${n}`);
    setActionError(null);
    setSettleResult(null);
    setSettlePhase('wallet');
    try {
      const trackWallet = (activity: WalletActivity) => {
        if (activity === 'opening') setSettlePhase('wallet');
        if (activity === 'switching') setSettlePhase('network');
      };
      const { client: w, account } = await walletClientFor(walletChains.creditcoin, trackWallet);
      setSettlePhase('signature');
      const hash = await w.sendTransaction({
        account,
        to: addresses.tape,
        data: encodeFunctionData({ abi: tapeAbi, functionName: 'settleWindow', args: [assetId as `0x${string}`, n] }),
      });
      setSettlePhase('confirmation');
      const receipt = await creditcoinClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('The settlement transaction reverted before confirmation.');
      setSettlePhase('refresh');
      const slice = await creditcoinClient.readContract({ address: addresses.tape, abi: tapeAbi, functionName: 'sliceOf', args: [assetId as `0x${string}`, n] });
      setRows((current) => current.map((row) => row.assetId === assetId && row.n === n ? { ...row, status: Number(slice.status), windowEnd: slice.windowEnd, payTx: slice.payTx, ackTx: slice.ackTx, payer: slice.payer, updatedAt: slice.updatedAt, paymentProven: slice.paymentProven } : row));
      setSettleResult({ assetId, n, hash });
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy('');
      setSettlePhase('idle');
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const listed = await loadListedAssets();
        if (!cancelled) setAssets(listed);

        const out: Row[] = [];
        for (const asset of listed) {
          const assetId = asset.assetId;
          for (let n = 1; n <= 12; n++) {
            const slice = await creditcoinClient.readContract({
              address: addresses.tape,
              abi: tapeAbi,
              functionName: 'sliceOf',
              args: [assetId, n],
            });
            out.push({
              assetId,
              kind: asset.kind,
              buyer: asset.buyer,
              shop: asset.shopCtc,
              n,
              status: Number(slice.status),
              windowEnd: slice.windowEnd,
              payTx: slice.payTx,
              ackTx: slice.ackTx,
              payer: slice.payer,
              updatedAt: slice.updatedAt,
              paymentProven: slice.paymentProven,
            });
          }
        }
        if (!cancelled) setRows(out);
      } catch (e) {
        if (!cancelled) setLoadError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [retryKey]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const state = recordStateFromStatus(row.status);
    const actionable = (state === 'due' && Number(row.windowEnd) * 1000 < Date.now()) || state === 'shortfall';
    return (!assetFilter || row.assetId === assetFilter)
      && (!buyerFilter || row.buyer.toLowerCase().includes(buyerFilter.toLowerCase()))
      && (!shopFilter || row.shop.toLowerCase().includes(shopFilter.toLowerCase()))
      && (!statusFilter || state === statusFilter)
      && (!actionableOnly || actionable);
  }), [actionableOnly, assetFilter, buyerFilter, rows, shopFilter, statusFilter]);

  useEffect(() => { setPage(0); }, [actionableOnly, assetFilter, buyerFilter, shopFilter, statusFilter]);
  const currentPage = clampPage(page, filteredRows.length, TAPE_PAGE_SIZE);
  const pageRows = filteredRows.slice(currentPage * TAPE_PAGE_SIZE, (currentPage + 1) * TAPE_PAGE_SIZE);
  // Per asset, the earliest unsettled slice whose deadline has not passed is the one open now.
  const currentWindowByAsset = useMemo(() => {
    const now = Date.now();
    const current = new Map<string, number>();
    for (const row of rows) {
      if (recordStateFromStatus(row.status) !== 'due' || Number(row.windowEnd) * 1000 < now) continue;
      const known = current.get(row.assetId);
      if (known === undefined || row.n < known) current.set(row.assetId, row.n);
    }
    return current;
  }, [rows]);

  return (
    <main className="task-main">
      <header className="task-header compact" data-reveal>
      <div className="eyebrow"><span className="dot" />Public record</div>
      <h1>The tape shows good months and hard ones.</h1>
      <p className="lead">
        Every slice of every listed asset, as Creditcoin has it. Bad outcomes are real and stay visible, a record
        that only shows the good months is not worth carrying.
      </p>
      </header>

      {actionError != null && <div className="action-error-slot"><ErrorNotice error={actionError} title="Could not settle this slice" /></div>}
      {settlePhase !== 'idle' && <ProgressStatus label={settlePhase === 'wallet' ? 'Connecting wallet...' : settlePhase === 'network' ? 'Switching to Creditcoin...' : settlePhase === 'signature' ? 'Waiting for settlement signature...' : settlePhase === 'confirmation' ? 'Confirming settlement on Creditcoin...' : 'Refreshing this slice...'} detail="The rest of the tape stays in place while this row refreshes." />}
      {settleResult && <section className="durable-result"><span className="status-badge status-live"><MaterialIcon name="check" /> CONFIRMED</span><div><strong>Slice {settleResult.n} settled without reloading the page.</strong><TableIdentifier value={settleResult.hash} copyLabel="Copy settlement transaction" href={explorers.creditcoinTx(settleResult.hash)} actionLabel="View confirmation" external /></div></section>}

      <section className="screen-card data-surface" aria-busy={loading} aria-labelledby="all-title-slices-title" data-reveal>
        <div className="data-surface-head"><div><span className="mini-title">CREDITCOIN</span><h2 id="all-title-slices-title">All title slices</h2></div><span className="status-badge status-live"><MaterialIcon name="circle" /> LIVE READ</span></div>
        <div className="tape-filter-panel" aria-label="Filter title slices">
          <div className="tape-filter-field"><span>Asset</span><Select label="Asset" value={assetFilter} onChange={setAssetFilter} options={[{ value: '', label: 'All assets' }, ...assets.map((asset) => ({ value: asset.assetId, label: `${ASSET_KINDS[asset.kind] ?? asset.kind} · ${shortId(asset.assetId)}` }))]} /></div>
          <label><span>Buyer</span><input value={buyerFilter} onChange={(event) => setBuyerFilter(event.target.value.trim())} placeholder="0x..." /></label>
          <label><span>Shop</span><input value={shopFilter} onChange={(event) => setShopFilter(event.target.value.trim())} placeholder="0x..." /></label>
          <div className="tape-filter-field"><span>Status</span><Select label="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: '', label: 'All states' }, ...Object.entries(RECORD_STATES).map(([key, definition]) => ({ value: key, label: definition.label }))]} /></div>
          <label className="tape-actionable-filter"><input type="checkbox" checked={actionableOnly} onChange={(event) => setActionableOnly(event.target.checked)} /><span>Actionable only</span></label>
          <div className="tape-filter-result"><strong>{filteredRows.length}</strong><span>of {rows.length} slices</span>{(assetFilter || buyerFilter || shopFilter || statusFilter || actionableOnly) && <button type="button" onClick={() => { setAssetFilter(''); setBuyerFilter(''); setShopFilter(''); setStatusFilter(''); setActionableOnly(false); }}>Clear filters</button>}</div>
        </div>
        <div className="tape-write-context"><SignerContext account={wallet.account} role="Settlement or reclaim caller" network="Creditcoin" contract={addresses.tape} /><p>Settlement and reclaim are permissionless. The connected account pays gas, but does not need to be the buyer or shop.</p></div>
        <div className="table-scroll data-surface-scroll">
          {loading ? (
            <div className="loading-data-region">
              {timing.show && <><LoadingMessage slow={timing.slow} network="Creditcoin">Reading the public tape from Creditcoin...</LoadingMessage><TableSkeleton rows={6} columns={7} labels={['Asset', 'Kind', 'Slice', 'Status', 'Window ends', 'Payment', 'Action']} /></>}
              {timing.prolonged && <button className="secondary loading-retry" onClick={() => setRetryKey((key) => key + 1)}>Retry tape read</button>}
            </div>
          ) : loadError != null ? (
            <div className="loading-error-region"><ErrorNotice error={loadError} title="Could not read the tape" onRetry={() => setRetryKey((key) => key + 1)} /></div>
          ) : rows.length === 0 ? (
            <DataEmptyState symbol="auto_awesome" title="No title slices to show" body="The tape is reachable, but no assets have been listed on this deployment yet." action={<a href={explorers.creditcoinAddress(addresses.registry)} target="_blank" rel="noreferrer">Inspect the registry <MaterialIcon name="open_in_new" /></a>} />
          ) : filteredRows.length === 0 ? (
            <DataEmptyState symbol="search_off" title="No slices match these filters" body="The public tape still has records; broaden or clear the current filters to see them." action={<button className="secondary" type="button" onClick={() => { setAssetFilter(''); setBuyerFilter(''); setShopFilter(''); setStatusFilter(''); setActionableOnly(false); }}>Clear filters</button>} />
          ) : <table className="data-table">
            <caption className="sr-only">All title slices recorded by the Creditcoin ShortfallTape contract</caption>
            <thead>
              <tr><th scope="col">Asset</th><th scope="col">Kind</th><th scope="col">Slice</th><th scope="col">Status</th><th scope="col">Window ends</th><th scope="col">Payment</th><th scope="col">Action</th></tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const state = recordStateFromStatus(r.status);
                const current = currentWindowByAsset.get(r.assetId) === r.n;
                const definition = state ? sliceDisplay(state, r.windowEnd, current) : null;
                const rowClass = state ? `row-${state}` : '';
                return (
                  <tr key={`${r.assetId}-${r.n}`} className={rowClass}>
                    <td data-label="Asset"><TableIdentifier value={r.assetId} copyLabel="Copy asset ID" href={`/assets/${r.assetId}`} actionLabel="Open asset" /></td>
                    <td data-label="Kind">{ASSET_KINDS[r.kind] ?? r.kind}</td>
                    <td data-label="Slice">{r.n}</td>
                    <td data-label="Status">
                      {state ? <RecordStateBadge state={state} windowEnd={r.windowEnd} current={current} /> : <span className="status-badge"><MaterialIcon name="help" /> Unknown</span>}
                      {definition && <div className="aside-note table-status-note">{definition.meaning}<br /><strong>Next:</strong> {definition.nextAction}</div>}
                    </td>
                    <td data-label="Window ends">{new Date(Number(r.windowEnd) * 1000).toISOString().slice(0, 10)}</td>
                    <td data-label="Payment">
                      {r.payTx && r.payTx !== ZERO ? <TableIdentifier value={r.payTx} copyLabel="Copy payment" href={`/verify/${r.payTx}`} actionLabel="Verify" /> : <span className="muted-text">No payment recorded</span>}
                    </td>
                    <td data-label="Action">
                      {state === 'due' && Number(r.windowEnd) * 1000 < Date.now() && (
                        <ConfirmWriteAction title={`Settle slice ${r.n}?`} consequence="This writes the closed window's final Shortfall or Disputed state to the append-only tape. It does not move funds and cannot erase the previous record." confirmLabel="Confirm settlement" loadingLabel="Settling..." onConfirm={() => settle(r.assetId, r.n)} busy={busy !== ''}><div className="confirm-write-facts"><span>Creditcoin</span><code>{r.assetId}</code><span>Slice {r.n}</span></div></ConfirmWriteAction>
                      )}
                      {state === 'shortfall' && <ReclaimAction assetId={r.assetId} n={r.n} windowEnd={r.windowEnd} payTx={r.payTx} paymentProven={r.paymentProven} onConfirmed={(slice, transaction) => updateReclaimedRow(r.assetId, r.n, slice, transaction)} />}
                      {r.reclaimTx && <TableIdentifier value={r.reclaimTx} copyLabel="Copy reclaim transaction" href={explorers.creditcoinTx(r.reclaimTx)} actionLabel="Confirmed" external />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>}
        </div>
        {!loading && loadError == null && filteredRows.length > 0 && <Pagination label="Title slice pages" page={currentPage} total={filteredRows.length} pageSize={TAPE_PAGE_SIZE} onPageChange={setPage} noun="slices" />}
      </section>

      <TapeHistory />

      <p className="aside-note surface-footnote">
        <a href={explorers.creditcoinAddress(addresses.tape)} target="_blank" rel="noreferrer">ShortfallTape on Blockscout</a>
      </p>
    </main>
  );
}
