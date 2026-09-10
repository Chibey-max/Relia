'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatUnits } from 'viem';
import { consumerAbi } from '@/lib/abi';
import { addresses, creditcoinClient, deployBlock, explorers } from '@/lib/chain';
import { ErrorNotice } from '@/components/ErrorNotice';
import { LoadingMessage, TableSkeleton } from '@/components/LoadingUI';
import { useLoadingTiming } from '@/lib/useLoadingTiming';
import { TableIdentifier } from '@/components/TableIdentifier';
import { Button, DataEmptyState } from '@/components/ui';
import { MaterialIcon } from '@/components/MaterialIcon';

interface ReceiptRow {
  assetId: string;
  n: number;
  payTx: string;
  buyer: string;
  payer: string;
  amount: bigint;
  creditcoinTx: string;
}

const RECEIPT_PAGE_SIZE = 10;

export default function VerifyIndexPage() {
  const router = useRouter();
  const [payTx, setPayTx] = useState('');
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [formError, setFormError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState(RECEIPT_PAGE_SIZE);
  const timing = useLoadingTiming(loading);
  const hashInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const events = await creditcoinClient.getContractEvents({
          address: addresses.consumer,
          abi: consumerAbi,
          eventName: 'InstallmentReceipt',
          fromBlock: deployBlock,
        });

        if (cancelled) return;
        setReceipts(events.reverse().map((event) => ({
          assetId: String(event.args.assetId),
          n: Number(event.args.n),
          payTx: String(event.args.payTx),
          buyer: String(event.args.buyer),
          payer: String(event.args.payer),
          amount: event.args.amount as bigint,
          creditcoinTx: event.transactionHash,
        })));
        setVisibleCount(RECEIPT_PAGE_SIZE);
      } catch (e) {
        if (!cancelled) setLoadError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [retryKey]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = payTx.trim();
    if (trimmed.startsWith('0x') && trimmed.length === 66) {
      router.push(`/verify/${trimmed}`);
      return;
    }
    setFormError('Enter a valid 32-byte Sepolia payment transaction hash.');
    hashInputRef.current?.focus();
  }

  return (
    <main className="task-main">
      <section className="intro-band verify-intro" data-reveal>
        <div className="hero-panel verify-hero">
          <div className="eyebrow"><span className="dot" /> Public receipt lookup</div>
          <h1>Check a payment without trusting a screenshot.</h1>
          <p className="lead">
            Enter its Sepolia transaction hash. Relia reads the corresponding receipt straight from Creditcoin, with no wallet, account, or backend.
          </p>
        </div>
        <aside className="panel soft lookup-card">
          <div className="lookup-card-heading">
            <div className="eyebrow"><span className="dot" /> Public search</div>
            <h2>Find one receipt.</h2>
            <p>Use the payment transaction from Sepolia. No wallet connection is needed.</p>
          </div>
          <form onSubmit={submit}>
            <label className="field full">
              Sepolia payment tx
              <input
                ref={hashInputRef}
                placeholder="0x..."
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? 'verify-hash-help verify-hash-error' : 'verify-hash-help'}
                value={payTx}
                onChange={(event) => { setPayTx(event.target.value); setFormError(''); }}
              />
            </label>
            <p className="field-help" id="verify-hash-help">Paste the complete 32-byte payment hash.</p>
            <div className="toolbar">
              <button type="submit">Check payment</button>
            </div>
          </form>
          {formError && (
            <div className="notice-slot" id="verify-hash-error">
              <ErrorNotice error={formError} />
            </div>
          )}
        </aside>
      </section>

      <section className="screen-card data-surface" aria-busy={loading} aria-labelledby="latest-receipts-title" data-reveal>
        <div className="data-surface-head"><div><span className="mini-title">PUBLIC INDEX</span><h2 id="latest-receipts-title">Latest proven receipts</h2></div><span className="status-badge status-live"><MaterialIcon name="circle" /> CREDITCOIN</span></div>
        <div className="table-scroll data-surface-scroll">
          {loading ? (
            <div className="loading-data-region">
              {timing.show && <><LoadingMessage slow={timing.slow} network="Creditcoin">Reading public receipt events from Creditcoin...</LoadingMessage><TableSkeleton rows={5} columns={6} labels={['Asset', 'Slice', 'Amount', 'Payer', 'Payment', 'Creditcoin']} /></>}
              {timing.prolonged && <button className="secondary loading-retry" onClick={() => setRetryKey((key) => key + 1)}>Retry public read</button>}
            </div>
          ) : loadError != null ? (
            <div className="loading-error-region"><ErrorNotice error={loadError} title="Could not load recent receipts" onRetry={() => setRetryKey((key) => key + 1)} /></div>
          ) : receipts.length === 0 ? (
            <DataEmptyState symbol="receipt_long" title="No proven receipts yet" body="The public index is working, but Creditcoin has not emitted an installment receipt in the configured range. You can still paste a known payment hash above." />
          ) : (
            <>
              <table className="data-table">
                <caption className="sr-only">Latest proven installment receipts on Creditcoin</caption>
                <thead>
                  <tr>
                    <th scope="col">Asset</th><th scope="col">Slice</th><th scope="col">Amount</th><th scope="col">Payer</th><th scope="col">Payment</th><th scope="col">Creditcoin</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.slice(0, visibleCount).map((receipt) => (
                    <tr key={`${receipt.payTx}-${receipt.n}`}>
                      <td data-label="Asset"><TableIdentifier value={receipt.assetId} copyLabel="Copy asset ID" /></td>
                      <td data-label="Slice">{receipt.n} of 12</td>
                      <td data-label="Amount">{Number(formatUnits(receipt.amount, 6)).toFixed(2)} USDC</td>
                      <td data-label="Payer"><TableIdentifier value={receipt.payer} copyLabel="Copy payer" /></td>
                      <td data-label="Payment"><TableIdentifier value={receipt.payTx} copyLabel="Copy payment" href={`/verify/${receipt.payTx}`} actionLabel="Receipt" /></td>
                      <td data-label="Creditcoin"><TableIdentifier value={receipt.creditcoinTx} copyLabel="Copy proof tx" href={explorers.creditcoinTx(receipt.creditcoinTx)} actionLabel="Explorer" external /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="receipt-index-pagination">
                <span>Showing {Math.min(visibleCount, receipts.length)} of {receipts.length} receipts.</span>
                {visibleCount < receipts.length && <Button variant="secondary" size="compact" onClick={() => setVisibleCount((count) => count + RECEIPT_PAGE_SIZE)}>Show {Math.min(RECEIPT_PAGE_SIZE, receipts.length - visibleCount)} more</Button>}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
