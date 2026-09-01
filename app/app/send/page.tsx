'use client';

/**
 * Pay a slice on Sepolia, then let the shop acknowledge it.
 *
 * Deliberately thin: this is the scaffold that proves the pipeline, not the
 * product surface. The ack is a single button rather than a /shop route.
 */
import { useEffect, useState } from 'react';
import { createPublicClient, http, encodeFunctionData, type Hex } from 'viem';
import { sepolia } from 'viem/chains';
import { addresses, explorers } from '@/lib/chain';
import { loadListedAssets, shortId, type ListedAsset } from '@/lib/assets';
import { paySinkAbi, shopAckAbi, erc20Abi } from '@/lib/abi';
import { PipelineRail, type StageEvent } from '@/components/PipelineRail';
import { ErrorNotice } from '@/components/ErrorNotice';
import { walletClientFor, walletChains } from '@/lib/wallet';

const publicClient = createPublicClient({ chain: sepolia, transport: http() });

export default function SendPage() {
  const [assets, setAssets] = useState<ListedAsset[]>([]);
  const [assetId, setAssetId] = useState<string>('');
  const [n, setN] = useState<number>(1);
  const [shop, setShop] = useState<string>('');
  const [buyer, setBuyer] = useState<string>('');
  const [amount] = useState<bigint>(40_000_000n);

  const [payTx, setPayTx] = useState<string>('');
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);

  useEffect(() => {
    loadListedAssets().then(setAssets).catch(setProblem);
  }, []);

  function selectAsset(id: string) {
    setAssetId(id);
    const hit = assets.find((a) => a.assetId === id);
    if (hit) {
      setShop(hit.shopSepolia);
      setBuyer(hit.buyer);
    }
  }

  const preview = `REL1|payment|${assetId || '<assetId>'}|${n}|${shop || '<shop>'}|${buyer || '<buyer>'}|${amount}`;

  async function onPay() {
    setBusy(true);
    setProblem(null);
    try {
      const { client: w, account } = await walletClientFor(walletChains.sepolia);

      await w.sendTransaction({
        account,
        to: addresses.usdc,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'mint', args: [account, amount] }),
      });
      await w.sendTransaction({
        account,
        to: addresses.usdc,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [addresses.paySink, amount] }),
      });

      const hash = await w.sendTransaction({
        account,
        to: addresses.paySink,
        data: encodeFunctionData({
          abi: paySinkAbi,
          functionName: 'pay',
          args: [assetId as Hex, n, shop as Hex, buyer as Hex],
        }),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setPayTx(hash);
      setEvents((prev) => [
        ...prev,
        { stage: 'sepolia_mined', assetId, n, at: new Date().toISOString(), detail: { payTx: hash, block: Number(receipt.blockNumber) } },
      ]);
    } catch (e) {
      setProblem(e);
    } finally {
      setBusy(false);
    }
  }

  async function onAck() {
    setBusy(true);
    setProblem(null);
    try {
      const { client: w, account } = await walletClientFor(walletChains.sepolia);

      const hash = await w.sendTransaction({
        account,
        to: addresses.shopAck,
        data: encodeFunctionData({ abi: shopAckAbi, functionName: 'ack', args: [assetId as Hex, n, payTx as Hex] }),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setEvents((prev) => [
        ...prev,
        { stage: 'ack_located', assetId, n, at: new Date().toISOString(), detail: { ackTx: hash, block: Number(receipt.blockNumber) } },
      ]);
    } catch (e) {
      setProblem(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="eyebrow"><span className="dot" />Send</div>
      <h1>Send an installment</h1>
      <p className="lead">Two transactions on Sepolia, from two different senders. Both are proven together, or nothing happens.</p>

      <div className="two-col" style={{ marginTop: 32 }}>
        <div>
          <div className="mini-title">1 · WHAT YOU ARE PAYING</div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <label className="field full">
              Asset
              <select value={assetId} onChange={(e) => selectAsset(e.target.value)}>
                <option value="">{assets.length ? 'Select a listed asset…' : 'No assets listed yet'}</option>
                {assets.map((a) => (
                  <option key={a.assetId} value={a.assetId}>{shortId(a.assetId)} — buyer {a.buyer.slice(0, 8)}…</option>
                ))}
              </select>
            </label>
            <label className="field full">
              …or paste an asset id
              <input value={assetId} onChange={(e) => setAssetId(e.target.value)} />
            </label>
            <label className="field">
              Slice
              <input type="number" min={1} max={12} value={n} onChange={(e) => setN(Number(e.target.value))} />
            </label>
            <label className="field">
              Installment
              <input value={`${(Number(amount) / 1e6).toFixed(2)} USDC`} readOnly />
            </label>
            <label className="field full">
              Shop · Sepolia
              <input value={shop} onChange={(e) => setShop(e.target.value)} />
            </label>
            <label className="field full">
              Buyer
              <input value={buyer} onChange={(e) => setBuyer(e.target.value)} />
            </label>
          </div>
          <div className="notice" style={{ marginTop: 16, background: 'var(--paper-strong)' }}>
            Anyone may pay for any buyer. The payer is recorded and never has to be the buyer.
          </div>
        </div>

        <div>
          <div className="mini-title">2 · REVIEW BEFORE YOU SIGN</div>
          <div className="panel" style={{ marginTop: 12 }}>
            <pre className="rel1-preview">{preview}</pre>
            <div className="toolbar">
              <button onClick={onPay} disabled={busy || !assetId}>Pay {(Number(amount) / 1e6).toFixed(2)} USDC on Sepolia</button>
              <button className="secondary" onClick={onAck} disabled={busy || !payTx}>Acknowledge as shop</button>
            </div>
          </div>
          {payTx && (
            <p className="aside-note" style={{ marginTop: 14 }}>
              Payment: <a className="hash" href={explorers.sepoliaTx(payTx)} target="_blank" rel="noreferrer">{payTx.slice(0, 12)}…{payTx.slice(-6)}</a>
            </p>
          )}
          {problem != null && <div style={{ marginTop: 14 }}><ErrorNotice error={problem} /></div>}
        </div>
      </div>

      <div style={{ marginTop: 56, paddingTop: 28, borderTop: '2px solid var(--ink-deep)' }}>
        <div className="mini-title">3 · PROOF PIPELINE</div>
        <h2 style={{ marginTop: 8 }}>Slice {String(n).padStart(2, '0')}</h2>
        <div style={{ marginTop: 20 }}>
          <PipelineRail events={events} />
        </div>
        <p className="aside-note" style={{ marginTop: 16 }}>
          Stages past the acknowledgement are driven by the worker&apos;s stage events.
        </p>
      </div>
    </main>
  );
}
