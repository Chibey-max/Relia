'use client';

/**
 * The public receipt.
 *
 * No wallet, no backend, no indexer, no API key. Everything on this page is
 * read from Creditcoin by anyone who has the URL.
 */
import { useEffect, useState } from 'react';
import { use } from 'react';
import { creditcoinClient, addresses, deployBlock, explorers } from '@/lib/chain';
import { consumerAbi } from '@/lib/abi';
import { ErrorNotice } from '@/components/ErrorNotice';

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
}

export default function VerifyPage({ params }: { params: Promise<{ payTx: string }> }) {
  const { payTx } = use(params);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const events = await creditcoinClient.getContractEvents({
          address: addresses.consumer,
          abi: consumerAbi,
          eventName: 'InstallmentReceipt',
          fromBlock: deployBlock,
        });

        const hit = events.find((e) => String(e.args.payTx).toLowerCase() === payTx.toLowerCase());
        if (!hit) {
          setNotFound(true);
          return;
        }

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
        });
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [payTx]);

  if (loading) return <main><div className="empty-state">Reading Creditcoin…</div></main>;

  if (notFound) {
    return (
      <main>
        <h1>No slice for this payment</h1>
        <div className="notice error">
          <div style={{ fontWeight: 800 }}>Nothing proven</div>
          <p style={{ marginTop: 6 }}>
            Creditcoin holds no installment receipt citing <code className="mono hash" style={{ wordBreak: 'break-all' }}>{payTx}</code>.
            Either the payment was never proven together with a shop acknowledgement, or it was refused.
          </p>
        </div>
        <p className="aside-note" style={{ marginTop: 16 }}>
          A payment on Sepolia is not a title slice. The slice exists only once both facts are proven here.
        </p>
      </main>
    );
  }

  if (error != null) return <main><ErrorNotice error={error} title="Could not read Creditcoin" /></main>;
  if (!receipt) return null;

  return (
    <main>
      <div className="eyebrow"><span className="dot" />Verify</div>
      <h1>Installment receipt</h1>
      <p className="lead">Read live from Creditcoin with no wallet connected.</p>

      <div className="screen-card" style={{ marginTop: 24 }}>
        <div className="screen-head">
          <div className="window-dots"><i /><i /><i /></div>
          <span className="stamp">✓ LIVE</span>
        </div>
        <div className="receipt-table">
          <div className="receipt-panel">
            <div className="mini-title">INSTALLMENT RECEIPT</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Slice {String(receipt.n).padStart(2, '0')} of 12 · proven</div>
          </div>

          <div className="receipt-panel">
            <div className="mini-title">THE TWO SEPOLIA FACTS</div>
            <div className="receipt-kv">
              <span style={{ fontWeight: 700 }}>Payment</span>
              <a className="hash" href={explorers.sepoliaTx(receipt.payTx)} target="_blank" rel="noreferrer">{receipt.payTx}</a>
              <span className="muted-text mono" style={{ whiteSpace: 'nowrap' }}>block {String(receipt.payHeight)}</span>
              <span style={{ fontWeight: 700 }}>Acknowledgement</span>
              <a className="hash" href={explorers.sepoliaTx(receipt.ackTx)} target="_blank" rel="noreferrer">{receipt.ackTx}</a>
              <span className="muted-text mono" style={{ whiteSpace: 'nowrap' }}>block {String(receipt.ackHeight)}</span>
            </div>
          </div>

          <div className="receipt-panel" style={{ background: '#f7fbfc' }}>
            <div className="mini-title">DECODED REL1 RECORD</div>
            <div className="kv">
              <dt>version</dt><dd className="mono">REL1</dd>
              <dt>kind</dt><dd className="mono">payment</dd>
              <dt>slice</dt><dd className="mono">{receipt.n} of 12</dd>
              <dt>shop</dt><dd className="mono">{receipt.shop}</dd>
              <dt>buyer</dt><dd className="mono">{receipt.buyer}</dd>
              <dt>payer</dt><dd className="mono" style={{ color: 'var(--yellow)', fontWeight: 700 }}>{receipt.payer}</dd>
              <dt>amount</dt><dd className="mono">{(Number(receipt.amount) / 1e6).toFixed(2)} USDC</dd>
            </div>
            {receipt.payer.toLowerCase() !== receipt.buyer.toLowerCase() && (
              <p className="aside-note" style={{ marginTop: 14 }}>
                Paid by someone other than the buyer. That is allowed, and the tape records who paid.
              </p>
            )}
          </div>

          <div className="receipt-panel">
            <div className="mini-title">PROVEN ON CREDITCOIN</div>
            <div className="kv">
              <dt>Verification tx</dt><dd><a className="hash" href={explorers.creditcoinTx(receipt.creditcoinTx)} target="_blank" rel="noreferrer">{receipt.creditcoinTx}</a></dd>
              <dt>Block</dt><dd className="mono">{String(receipt.creditcoinBlock)}</dd>
              <dt>Consumer</dt><dd><a className="hash" href={explorers.creditcoinAddress(addresses.consumer)} target="_blank" rel="noreferrer">{addresses.consumer}</a></dd>
            </div>
            <div style={{ marginTop: 18, paddingTop: 15, borderTop: '2px solid var(--ink-deep)', fontFamily: 'IBM Plex Mono, ui-monospace, monospace', fontSize: 12, fontWeight: 600 }}>
              Both hashes are now spent: neither can fill another slice.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
