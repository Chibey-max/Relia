'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { creditcoinClient, addresses, explorers } from '@/lib/chain';
import { registryAbi, tapeAbi, STATUS_LABELS, ASSET_KINDS } from '@/lib/abi';

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const listed = await creditcoinClient.getContractEvents({
          address: addresses.registry,
          abi: registryAbi,
          eventName: 'Listed',
          fromBlock: 'earliest',
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
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Reading the tape from Creditcoin…</p>;
  if (error) return <p style={{ color: '#b00020' }}>Could not read the tape: {error}</p>;
  if (rows.length === 0) return <p>No assets listed yet.</p>;

  return (
    <main>
      <h1>Tape</h1>
      <p style={{ fontSize: 13, color: '#555' }}>
        Every slice of every listed asset, as Creditcoin has it. Red rows are real and stay
        visible — a record that only shows the good months is not worth carrying.
      </p>

      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #333' }}>
            <th>Asset</th><th>Kind</th><th>Slice</th><th>Status</th><th>Window ends</th><th>Payment</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const label = STATUS_LABELS[r.status] ?? 'Unknown';
            const bad = label === 'Shortfall' || label === 'Reclaimed';
            const disputed = label === 'Disputed';
            return (
              <tr
                key={`${r.assetId}-${r.n}`}
                style={{
                  borderBottom: '1px solid #eee',
                  background: bad ? '#fff0f0' : disputed ? '#fffaf0' : undefined,
                }}
              >
                <td style={{ fontFamily: 'monospace' }}>{r.assetId.slice(0, 10)}…</td>
                <td>{ASSET_KINDS[r.kind] ?? r.kind}</td>
                <td>{r.n}</td>
                <td style={{ fontWeight: bad || disputed ? 700 : 400 }}>
                  {label}
                  {disputed && (
                    <span style={{ fontSize: 11, display: 'block', color: '#8a5a00' }}>
                      paid, never acknowledged — shop cannot reclaim
                    </span>
                  )}
                </td>
                <td>{new Date(Number(r.windowEnd) * 1000).toISOString().slice(0, 10)}</td>
                <td>
                  {r.payTx && r.payTx !== ZERO ? (
                    <Link href={`/verify/${r.payTx}`}>verify</Link>
                  ) : (
                    <span style={{ color: '#999' }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p style={{ fontSize: 12, marginTop: 16 }}>
        <a href={explorers.creditcoinAddress(addresses.tape)} target="_blank" rel="noreferrer">
          ShortfallTape on Blockscout
        </a>
      </p>
    </main>
  );
}
