'use client';

/** Public receipt, read without a wallet, backend, indexer, or API key. */
import { use, useEffect, useState } from 'react';
import { formatUnits } from 'viem';
import { creditcoinClient, sepoliaClient, addresses, deployBlock, explorers } from '@/lib/chain';
import { shortId } from '@/lib/assets';
import { consumerAbi } from '@/lib/abi';
import { ErrorNotice } from '@/components/ErrorNotice';
import { LoadingMessage, ReceiptSkeleton } from '@/components/LoadingUI';
import { ReceiptActions } from '@/components/ReceiptActions';
import { useLoadingTiming } from '@/lib/useLoadingTiming';
import { AddressField, IdentifierField, RecordStateBadge, TransactionField } from '@/components/ui';
import { RECORD_STATES } from '@/lib/recordStates';
import { ProofStatusPanel } from '@/components/ProofStatusPanel';

interface Receipt {
  assetId: string;
  n: number;
  payTx: string;
  ackTx: string;
  payer: string;
  buyer: string;
  shop: string;
  amount: bigint;
  payHeight: bigint;
  ackHeight: bigint;
  creditcoinTx: string;
  creditcoinBlock: bigint;
  payTimestamp: bigint | null;
  ackTimestamp: bigint | null;
  creditcoinTimestamp: bigint | null;
}

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function readableTime(timestamp: bigint | null): string {
  if (timestamp === null) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(Number(timestamp) * 1000)) + ' UTC';
}

function exactTime(timestamp: bigint | null): string {
  return timestamp === null ? 'Exact timestamp unavailable' : `Unix ${String(timestamp)}`;
}

export default function VerifyPage({ params }: { params: Promise<{ payTx: string }> }) {
  const { payTx } = use(params);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const timing = useLoadingTiming(loading);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setReceipt(null);

    (async () => {
      try {
        const events = await creditcoinClient.getContractEvents({
          address: addresses.consumer,
          abi: consumerAbi,
          eventName: 'InstallmentReceipt',
          fromBlock: deployBlock,
        });
        const hit = events.find((event) => String(event.args.payTx).toLowerCase() === payTx.toLowerCase());
        if (cancelled) return;
        if (!hit) {
          setNotFound(true);
          return;
        }

        const [payBlock, ackBlock, proofBlock] = await Promise.allSettled([
          sepoliaClient.getBlock({ blockNumber: hit.args.payHeight as bigint }),
          sepoliaClient.getBlock({ blockNumber: hit.args.ackHeight as bigint }),
          creditcoinClient.getBlock({ blockNumber: hit.blockNumber }),
        ]);
        if (cancelled) return;

        setReceipt({
          assetId: String(hit.args.assetId),
          n: Number(hit.args.n),
          payTx: String(hit.args.payTx),
          ackTx: String(hit.args.ackTx),
          payer: String(hit.args.payer),
          buyer: String(hit.args.buyer),
          shop: String(hit.args.shop),
          amount: hit.args.amount as bigint,
          payHeight: hit.args.payHeight as bigint,
          ackHeight: hit.args.ackHeight as bigint,
          creditcoinTx: hit.transactionHash,
          creditcoinBlock: hit.blockNumber,
          payTimestamp: payBlock.status === 'fulfilled' ? payBlock.value.timestamp : null,
          ackTimestamp: ackBlock.status === 'fulfilled' ? ackBlock.value.timestamp : null,
          creditcoinTimestamp: proofBlock.status === 'fulfilled' ? proofBlock.value.timestamp : null,
        });
      } catch (caught) {
        if (!cancelled) setError(caught);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [payTx, retryKey]);

  if (loading) return (
    <main className="task-main receipt-page">
      <header className="task-header compact">
        <div className="eyebrow"><span className="dot" />Public receipt · Creditcoin read</div>
        <h1>Checking this installment.</h1>
        <p className="lead mono hash">{payTx}</p>
      </header>
      <section className="loading-receipt-region" aria-busy="true">
        {timing.show && <><LoadingMessage slow={timing.slow} network="Creditcoin">Matching the payment to its public proof…</LoadingMessage><ReceiptSkeleton paymentHash={payTx} /></>}
        {timing.prolonged && <button className="secondary loading-retry" onClick={() => setRetryKey((key) => key + 1)}>Retry receipt read</button>}
      </section>
    </main>
  );

  if (notFound) return (
    <main className="task-main receipt-page">
      <header className="task-header compact"><div className="eyebrow"><span className="dot" />Public verification result</div><h1>No title slice uses this payment.</h1></header>
      <ErrorNotice error="Creditcoin has no installment receipt tied to this payment. It may not have been proven with a matching shop confirmation, or the proof may have been refused." title="Nothing proven" recovery="Check that the payment hash is correct, inspect the Sepolia source transaction below, or try again after proof generation completes." />
      <div className="not-found-source"><TransactionField label="Payment checked" value={payTx} explorerHref={explorers.sepoliaTx(payTx)} explorerLabel="View payment on Sepolia" /></div>
      <p className="aside-note not-found-note">A payment alone is not a title slice. Public verification never requires a wallet.</p>
      <ProofStatusPanel payTx={payTx} />
    </main>
  );

  if (error != null) return <main className="task-main"><h1 className="sr-only">Receipt could not be loaded</h1><ErrorNotice error={error} title="Could not read Creditcoin" onRetry={() => setRetryKey((key) => key + 1)} /></main>;
  if (!receipt) return null;

  const amount = Number(formatUnits(receipt.amount, 6)).toFixed(2);

  return (
    <main className="task-main receipt-page">
      <header className="receipt-page-verdict">
        <div>
          <div className="eyebrow"><span className="dot" />Public receipt · live Creditcoin read</div>
          <span className="verdict-mark" aria-hidden="true">✓</span>
          <h1>This installment is proven.</h1>
          <p className="lead">Slice {String(receipt.n).padStart(2, '0')} of 12 for asset {shortId(receipt.assetId)} belongs to buyer {shortAddress(receipt.buyer)}. Its payment and shop confirmation match.</p>
          <a className="receipt-source-jump" href="#source-facts">Inspect the source records <span aria-hidden="true">↓</span></a>
        </div>
        <div className="verdict-side">
          <div className="verdict-summary">
            <RecordStateBadge state="live" />
            <p className="verdict-state-context">{RECORD_STATES.live.meaning} <strong>Next:</strong> {RECORD_STATES.live.nextAction}</p>
            <dl>
              <div><dt>Record</dt><dd>Installment title slice</dd></div>
              <div><dt>Asset</dt><dd>{shortId(receipt.assetId)}</dd></div>
              <div><dt>Buyer</dt><dd>{shortAddress(receipt.buyer)}</dd></div>
              <div><dt>Amount</dt><dd>{amount} USDC</dd></div>
              <div><dt>Wallet</dt><dd>Not required</dd></div>
            </dl>
          </div>
          <ReceiptActions />
        </div>
      </header>

      <ProofStatusPanel assetId={receipt.assetId} n={receipt.n} payTx={receipt.payTx} ackTx={receipt.ackTx} creditcoinTx={receipt.creditcoinTx} />

      <article className="receipt-document" aria-labelledby="receipt-document-title">
        <header className="receipt-document-head">
          <div><span className="mini-title">RELIA · PUBLIC INSTALLMENT RECORD</span><h2 id="receipt-document-title">Installment receipt</h2><p>Issued from finalized public records. No account or wallet is needed to inspect it.</p></div>
          <span className="stamp">✓ LIVE</span>
        </header>

        <div className="receipt-table">
          <section className="receipt-panel receipt-panel-summary" aria-labelledby="summary-title">
            <h3 className="mini-title" id="summary-title">What this receipt says</h3>
            <div className="receipt-human-grid">
              <div><span>State</span><strong>✓ Live</strong><small>{RECORD_STATES.live.meaning}</small></div>
              <div><span>Installment</span><strong>Slice {String(receipt.n).padStart(2, '0')} of 12</strong></div>
              <div><span>Amount</span><strong>{amount} USDC</strong></div>
              <div><span>Belongs to</span><strong>Buyer {shortAddress(receipt.buyer)}</strong></div>
            </div>
          </section>

          <section className="receipt-panel" aria-labelledby="identifiers-title">
            <h3 className="mini-title" id="identifiers-title">People and asset</h3>
            <div className="receipt-identifier-grid">
              <IdentifierField label="Asset identifier" value={receipt.assetId} kind="identifier" />
              <AddressField label="Buyer · title owner" value={receipt.buyer} />
              <AddressField label="Payer · sent the installment" value={receipt.payer} />
              <AddressField label="Shop · confirmed the installment" value={receipt.shop} />
            </div>
            {receipt.payer.toLowerCase() !== receipt.buyer.toLowerCase() && <p className="aside-note receipt-payer-note">Someone else paid for the buyer. The receipt preserves both roles.</p>}
          </section>

          <section className="receipt-panel" id="source-facts" aria-labelledby="source-title">
            <h3 className="mini-title" id="source-title">Source records · Sepolia</h3>
            <p className="receipt-panel-intro">These are the finalized payment and matching shop confirmation behind the verdict.</p>
            <div className="receipt-source-fields">
              <div className="receipt-source-record">
                <div><strong>Payment recorded</strong><span>{readableTime(receipt.payTimestamp)} · {exactTime(receipt.payTimestamp)} · block {String(receipt.payHeight)}</span></div>
                <TransactionField label="Payment transaction" value={receipt.payTx} explorerHref={explorers.sepoliaTx(receipt.payTx)} explorerLabel="View payment on Sepolia" />
              </div>
              <div className="receipt-source-record">
                <div><strong>Shop confirmation recorded</strong><span>{readableTime(receipt.ackTimestamp)} · {exactTime(receipt.ackTimestamp)} · block {String(receipt.ackHeight)}</span></div>
                <TransactionField label="Confirmation transaction" value={receipt.ackTx} explorerHref={explorers.sepoliaTx(receipt.ackTx)} explorerLabel="View confirmation on Sepolia" />
              </div>
            </div>
          </section>

          <section className="receipt-panel" aria-labelledby="proof-title">
            <h3 className="mini-title" id="proof-title">Proof record · Creditcoin</h3>
            <p className="receipt-panel-intro">Creditcoin accepted both source records once and made this title slice live.</p>
            <div className="receipt-proof-time"><strong>Verified {readableTime(receipt.creditcoinTimestamp)}</strong><span>{exactTime(receipt.creditcoinTimestamp)} · block {String(receipt.creditcoinBlock)}</span></div>
            <div className="receipt-source-fields">
              <TransactionField label="Verification transaction" value={receipt.creditcoinTx} explorerHref={explorers.creditcoinTx(receipt.creditcoinTx)} explorerLabel="View proof on Creditcoin" />
              <AddressField label="Receipt contract" value={addresses.consumer} explorerHref={explorers.creditcoinAddress(addresses.consumer)} explorerLabel="View receipt contract" />
            </div>
            <div className="receipt-finality">This payment and confirmation are locked to slice {String(receipt.n).padStart(2, '0')}. Neither can be reused.</div>
          </section>

          <details className="receipt-panel receipt-panel-decoded">
            <summary>Technical REL1 record <span aria-hidden="true">+</span></summary>
            <dl className="kv receipt-decoded-values">
              <dt>version</dt><dd className="mono">REL1</dd>
              <dt>kind</dt><dd className="mono">payment</dd>
              <dt>slice</dt><dd className="mono">{receipt.n} of 12</dd>
              <dt>amount</dt><dd className="mono">{amount} USDC</dd>
            </dl>
          </details>
        </div>

        <footer className="receipt-document-foot"><span>Publicly readable</span><span>No wallet required</span><span>Source records linked above</span></footer>
      </article>
    </main>
  );
}
