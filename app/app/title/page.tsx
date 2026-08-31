'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { creditcoinClient, addresses } from '@/lib/chain';
import { tapeAbi, titlePassAbi } from '@/lib/abi';

export default function TitlePage() {
  const [assetId, setAssetId] = useState('');
  const [cells, setCells] = useState<{ live: boolean; payTx: string }[]>([]);
  const [filled, setFilled] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!assetId || assetId.length !== 66) return;
    (async () => {
      try {
        setError('');
        const next: { live: boolean; payTx: string }[] = [];
        for (let n = 1; n <= 12; n++) {
          const live = await creditcoinClient.readContract({
            address: addresses.titlePass,
            abi: titlePassAbi,
            functionName: 'isSliceLive',
            args: [assetId as `0x${string}`, n],
          });
          const slice = await creditcoinClient.readContract({
            address: addresses.tape,
            abi: tapeAbi,
            functionName: 'sliceOf',
            args: [assetId as `0x${string}`, n],
          });
          next.push({ live: Boolean(live), payTx: slice.payTx });
        }
        setCells(next);

        setFilled(
          Number(
            await creditcoinClient.readContract({
              address: addresses.titlePass,
              abi: titlePassAbi,
              functionName: 'slicesFilled',
              args: [assetId as `0x${string}`],
            }),
          ),
        );
        setCleared(
          Boolean(
            await creditcoinClient.readContract({
              address: addresses.titlePass,
              abi: titlePassAbi,
              functionName: 'isCleared',
              args: [assetId as `0x${string}`],
            }),
          ),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [assetId]);

  return (
    <main>
      <h1>Title</h1>
      <input
        placeholder="0x… asset id"
        value={assetId}
        onChange={(e) => setAssetId(e.target.value)}
        style={{ width: '100%', maxWidth: 620, padding: 6, fontFamily: 'monospace', fontSize: 12 }}
      />

      {error && <p style={{ color: '#b00020', fontSize: 13 }}>{error}</p>}

      {cells.length === 12 && (
        <>
          <p style={{ fontSize: 14 }}>
            {filled} of 12 slices proven. {cleared ? 'Cleared — the pass is transferable.' : 'Soulbound until all twelve are proven.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, maxWidth: 620 }}>
            {cells.map((c, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid #999',
                  background: c.live ? '#e7f5e9' : '#f6f6f6',
                  padding: 12,
                  textAlign: 'center',
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 700 }}>{i + 1}</div>
                {c.live ? <Link href={`/verify/${c.payTx}`}>verify</Link> : <span style={{ color: '#999' }}>—</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
