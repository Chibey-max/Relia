'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { creditcoinClient, addresses } from '@/lib/chain';
import { tapeAbi, titlePassAbi } from '@/lib/abi';
import { ErrorNotice } from '@/components/ErrorNotice';

const ZERO = `0x${'0'.repeat(64)}`;

export default function TitlePage() {
  const [assetId, setAssetId] = useState('');
  const [cells, setCells] = useState<{ live: boolean; payTx: string }[]>([]);
  const [filled, setFilled] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!assetId || assetId.length !== 66) return;
    (async () => {
      try {
        setError(null);
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
        setFilled(Number(await creditcoinClient.readContract({
          address: addresses.titlePass, abi: titlePassAbi, functionName: 'slicesFilled', args: [assetId as `0x${string}`],
        })));
        setCleared(Boolean(await creditcoinClient.readContract({
          address: addresses.titlePass, abi: titlePassAbi, functionName: 'isCleared', args: [assetId as `0x${string}`],
        })));
      } catch (e) {
        setError(e);
      }
    })();
  }, [assetId]);

  return (
    <main>
      <div className="eyebrow"><span className="dot" />Title</div>
      <h1>Title</h1>
      <div className="toolbar" style={{ maxWidth: 720 }}>
        <input placeholder="0x… asset id" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
      </div>

      {error != null && <div style={{ marginTop: 16 }}><ErrorNotice error={error} /></div>}

      {cells.length === 12 && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginTop: 32, paddingBottom: 16, borderBottom: '2px solid var(--ink-deep)' }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 900 }}>{filled} <span className="muted-text" style={{ fontWeight: 400 }}>of 12 slices proven</span></div>
              <div className="aside-note" style={{ marginTop: 6 }}>{cleared ? 'Cleared — the pass is transferable.' : 'Soulbound until all twelve are proven.'}</div>
            </div>
            <span className="status-badge status-due">{cleared ? 'Cleared' : 'Soulbound'}</span>
          </div>

          <div className="slice-board" style={{ marginTop: 28 }}>
            {cells.map((cell, i) => {
              const n = i + 1;
              const disputed = !cell.live && cell.payTx && cell.payTx !== ZERO;
              return (
                <div key={n} className={`slice-cell ${cell.live ? 'live' : ''}`} style={disputed ? { background: 'var(--yellow)' } : undefined}>
                  <span className="slice-number">{String(n).padStart(2, '0')}</span>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{cell.live ? 'Live' : disputed ? 'Disputed' : 'Due'}</div>
                  {(cell.live || disputed) ? (
                    <Link href={`/verify/${cell.payTx}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 12 }}>
                      {cell.live ? 'receipt →' : 'payment →'}
                    </Link>
                  ) : (
                    <div className="muted-text" style={{ marginTop: 8, fontSize: 12 }}>—</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="notice" style={{ marginTop: 28, background: 'var(--paper-strong)' }}>
            <strong>Why it cannot move yet.</strong> A transfer before all twelve slices are proven would hand over a
            title that is not paid for. <code className="mono">Soulbound</code> is the rule that refuses it.
          </div>
        </>
      )}
    </main>
  );
}
