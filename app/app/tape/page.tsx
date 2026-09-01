'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { encodeFunctionData } from 'viem';
import { creditcoinClient, addresses, deployBlock, explorers } from '@/lib/chain';
import { registryAbi, tapeAbi, STATUS_LABELS, ASSET_KINDS } from '@/lib/abi';
import { ErrorNotice } from '@/components/ErrorNotice';
import { walletClientFor, walletChains } from '@/lib/wallet';

interface Row {
  assetId: `0x${string}`;
  kind: number;
  buyer: string;
  n: number;
  status: number;
  windowEnd: bigint;
  payTx: `0x${string}`;
}

const ZERO = `0x${'0'.repeat(64)}`;

export default function TapePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  /**
   * Nothing on the tape turns red on its own. A window closing is not an
   * event, so someone has to write the outcome — Shortfall if no payment was
   * proven, Disputed if one was and the shop never acknowledged it.
   * Permissionless on purpose: the buyer has every incentive to call it too.
   */
  async function settle(assetId: string, n: number) {
    setBusy(`${assetId}-${n}`);
    setError(null);
    try {
      const { client: w, account } = await walletClientFor(walletChains.creditcoin);
      const hash = await w.sendTransaction({
        account,
        to: addresses.tape,
        data: encodeFunctionData({ abi: tapeAbi, functionName: 'settleWindow', args: [assetId as `0x${string}`, n] }),
      });
      await creditcoinClient.waitForTransactionReceipt({ hash });
      location.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy('');
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const listed = await creditcoinClient.getContractEvents({
          address: addresses.registry,
          abi: registryAbi,
          eventName: 'Listed',
          fromBlock: deployBlock,
        });

        const out: Row[] = [];
        for (const ev of listed) {
          const assetId = ev.args.assetId as `0x${string}`;
          for (let n = 1; n <= 12; n++) {
            const slice = await creditcoinClient.readContract({
              address: addresses.tape,
              abi: tapeAbi,
              functionName: 'sliceOf',
              args: [assetId, n],
            });
            out.push({
              assetId,
              kind: Number(ev.args.kind ?? 0),
              buyer: String(ev.args.buyer),
              n,
              status: Number(slice.status),
              windowEnd: slice.windowEnd,
              payTx: slice.payTx,
            });
          }
        }
        setRows(out);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <main><div className="empty-state">Reading the tape from Creditcoin…</div></main>;
  if (error) return <main><ErrorNotice error={error} title="Could not read the tape" /></main>;
  if (rows.length === 0) return <main><div className="empty-state">No assets listed yet.</div></main>;

  return (
    <main>
      <div className="eyebrow"><span className="dot" />Tape</div>
      <h1>Tape</h1>
      <p className="lead">
        Every slice of every listed asset, as Creditcoin has it. Bad outcomes are real and stay visible — a record
        that only shows the good months is not worth carrying.
      </p>

      <div className="screen-card" style={{ marginTop: 24 }}>
        <div className="table-scroll" style={{ padding: 22 }}>
          <table className="data-table">
            <thead>
              <tr><th>Asset</th><th>Kind</th><th>Slice</th><th>Status</th><th>Window ends</th><th>Payment</th><th>Action</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const label = STATUS_LABELS[r.status] ?? 'Unknown';
                const rowClass = label === 'Shortfall' || label === 'Reclaimed' ? 'row-shortfall' : label === 'Disputed' ? 'row-disputed' : '';
                return (
                  <tr key={`${r.assetId}-${r.n}`} className={rowClass}>
                    <td data-label="Asset" className="mono">{r.assetId.slice(0, 10)}…</td>
                    <td data-label="Kind">{ASSET_KINDS[r.kind] ?? r.kind}</td>
                    <td data-label="Slice">{r.n}</td>
                    <td data-label="Status">
                      <span className={`status-badge status-${label.toLowerCase()}`}>
                        {label === 'Live' ? '✓' : label === 'Disputed' ? '!' : label === 'Shortfall' ? '✕' : label === 'Reclaimed' ? '↩' : '○'} {label}
                      </span>
                      {label === 'Disputed' && <div className="aside-note" style={{ marginTop: 6 }}>paid, never acknowledged — shop cannot reclaim</div>}
                    </td>
                    <td data-label="Window ends">{new Date(Number(r.windowEnd) * 1000).toISOString().slice(0, 10)}</td>
                    <td data-label="Payment">
                      {r.payTx && r.payTx !== ZERO ? <Link href={`/verify/${r.payTx}`}>verify</Link> : <span className="muted-text">—</span>}
                    </td>
                    <td data-label="Action">
                      {label === 'Due' && Number(r.windowEnd) * 1000 < Date.now() && (
                        <button className="secondary" onClick={() => settle(r.assetId, r.n)} disabled={busy !== ''}>
                          {busy === `${r.assetId}-${r.n}` ? 'settling…' : 'Settle'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="aside-note" style={{ marginTop: 16 }}>
        <a href={explorers.creditcoinAddress(addresses.tape)} target="_blank" rel="noreferrer">ShortfallTape on Blockscout</a>
      </p>
    </main>
  );
}
