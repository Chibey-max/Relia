'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatUnits } from 'viem';
import { consumerAbi } from '@/lib/abi';
import { addresses, creditcoinClient, deployBlock, explorers } from '@/lib/chain';
import { shortId } from '@/lib/assets';
import { ErrorNotice } from '@/components/ErrorNotice';

interface ReceiptRow {
  assetId: string;
  n: number;
  payTx: string;
  buyer: string;
  payer: string;
  amount: bigint;
  creditcoinTx: string;
}

export default function VerifyIndexPage() {
  const router = useRouter();
  const [payTx, setPayTx] = useState('');
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const events = await creditcoinClient.getContractEvents({
          address: addresses.consumer,
          abi: consumerAbi,
          eventName: 'InstallmentReceipt',
          fromBlock: deployBlock,
        });

        setReceipts(events.reverse().map((event) => ({
          assetId: String(event.args.assetId),
          n: Number(event.args.n),
          payTx: String(event.args.payTx),
          buyer: String(event.args.buyer),
          payer: String(event.args.payer),
          amount: event.args.amount as bigint,
          creditcoinTx: event.transactionHash,
        })));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = payTx.trim();
    if (trimmed.startsWith('0x') && trimmed.length === 66) {
      router.push(`/verify/${trimmed}`);
      return;
    }
    setError('Enter a valid 32-byte Sepolia payment transaction hash.');
  }

  return (
    <main>
      <section className="intro-band">
        <div className="hero-panel">
          <div className="eyebrow"><span className="dot" /> Public receipt lookup</div>
          <h1>Verify any proven installment with only its payment hash.</h1>
          <p className="lead">
            Receipts are read straight from Creditcoin. No wallet, no account, no backend.
          </p>
        </div>
        <aside className="panel soft">
          <div className="eyebrow"><span className="dot" /> Search</div>
          <form onSubmit={submit}>
            <label className="field full">
              Sepolia payment tx
              <input
                placeholder="0x..."
                value={payTx}
                onChange={(event) => setPayTx(event.target.value)}
              />
            </label>
            <div className="toolbar">
              <button type="submit">Open receipt</button>
            </div>
          </form>
          {error && (
            <div style={{ marginTop: 14 }}>
              <ErrorNotice error={error} />
            </div>
          )}
        </aside>
      </section>

      <section className="screen-card">
        <div className="screen-head">
          <div className="window-dots"><i /><i /><i /></div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>Latest receipts</span>
        </div>
        <div className="table-scroll" style={{ padding: 22 }}>
          {loading ? (
            <div className="empty-state">Reading receipt events from Creditcoin...</div>
          ) : receipts.length === 0 ? (
            <div className="empty-state">No proven receipts found yet.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset</th><th>Slice</th><th>Amount</th><th>Payer</th><th>Payment</th><th>Creditcoin</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={`${receipt.payTx}-${receipt.n}`}>
                    <td data-label="Asset" className="mono">{shortId(receipt.assetId)}</td>
                    <td data-label="Slice">{receipt.n} of 12</td>
                    <td data-label="Amount">{Number(formatUnits(receipt.amount, 6)).toFixed(2)} USDC</td>
                    <td data-label="Payer" className="mono">{receipt.payer.slice(0, 10)}...</td>
                    <td data-label="Payment"><Link href={`/verify/${receipt.payTx}`}>open</Link></td>
                    <td data-label="Creditcoin">
                      <a href={explorers.creditcoinTx(receipt.creditcoinTx)} target="_blank" rel="noreferrer">
                        tx
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
