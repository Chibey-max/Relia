'use client';

/**
 * Pay a slice on Sepolia, then let the shop acknowledge it.
 *
 * Deliberately thin: this is the scaffold that proves the pipeline, not the
 * product surface. The ack is a single button rather than a /shop route.
 */
import { useEffect, useState } from 'react';
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  encodeFunctionData,
  type Hex,
} from 'viem';
import { sepolia } from 'viem/chains';
import { addresses, explorers } from '@/lib/chain';
import { loadListedAssets, shortId, type ListedAsset } from '@/lib/assets';
import { paySinkAbi, shopAckAbi, erc20Abi } from '@/lib/abi';
import { PipelineRail, type StageEvent } from '@/components/PipelineRail';

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
  const [problem, setProblem] = useState<string>('');

  // Asset ids come from the chain that issued them. Pasting a raw 32-byte id
  // from a terminal is the kind of step that goes wrong on camera.
  useEffect(() => {
    loadListedAssets()
      .then(setAssets)
      .catch((e) => setProblem(e instanceof Error ? e.message : String(e)));
  }, []);

  function selectAsset(id: string) {
    setAssetId(id);
    const hit = assets.find((a) => a.assetId === id);
    if (hit) {
      setShop(hit.shopSepolia);
      setBuyer(hit.buyer);
    }
  }

  /**
   * The exact REL1 record that will be emitted. Showing it before signing is
   * the point: the payer can see the claim they are about to put on Sepolia.
   */
  const preview = `REL1|payment|${assetId || '<assetId>'}|${n}|${shop || '<shop>'}|${buyer || '<buyer>'}|${amount}`;

  async function wallet() {
    const eth = (globalThis as { ethereum?: unknown }).ethereum;
    if (!eth) throw new Error('No injected wallet found.');
    return createWalletClient({ chain: sepolia, transport: custom(eth as never) });
  }

  async function onPay() {
    setBusy(true);
    setProblem('');
    try {
      const w = await wallet();
      const [account] = await w.getAddresses();
      if (!account) throw new Error('No account authorized.');

      // Mint and approve are conveniences of the test token, not part of the
      // protocol. MockUSDC has an open mint so a demo never waits on a faucet.
      await w.sendTransaction({
        account,
        to: addresses.usdc,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'mint', args: [account, amount] }),
      });
      await w.sendTransaction({
        account,
        to: addresses.usdc,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [addresses.paySink, amount],
        }),
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
        {
          stage: 'sepolia_mined',
          assetId,
          n,
          at: new Date().toISOString(),
          detail: { payTx: hash, block: Number(receipt.blockNumber) },
        },
      ]);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onAck() {
    setBusy(true);
    setProblem('');
    try {
      const w = await wallet();
      const [account] = await w.getAddresses();
      if (!account) throw new Error('No account authorized.');

      const hash = await w.sendTransaction({
        account,
        to: addresses.shopAck,
        data: encodeFunctionData({
          abi: shopAckAbi,
          functionName: 'ack',
          args: [assetId as Hex, n, payTx as Hex],
        }),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setEvents((prev) => [
        ...prev,
        {
          stage: 'ack_located',
          assetId,
          n,
          at: new Date().toISOString(),
          detail: { ackTx: hash, block: Number(receipt.blockNumber) },
        },
      ]);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Send an installment</h1>

      <div style={{ display: 'grid', gap: 8, maxWidth: 620, fontSize: 14 }}>
        <label>
          Asset
          <select value={assetId} onChange={(e) => selectAsset(e.target.value)} style={input}>
            <option value="">
              {assets.length ? 'Select a listed asset…' : 'No assets listed yet'}
            </option>
            {assets.map((a) => (
              <option key={a.assetId} value={a.assetId}>
                {shortId(a.assetId)} — buyer {a.buyer.slice(0, 8)}…
              </option>
            ))}
          </select>
        </label>
        <label>
          …or paste an asset id
          <input value={assetId} onChange={(e) => setAssetId(e.target.value)} style={input} />
        </label>
        <label>
          Slice
          <input
            type="number"
            min={1}
            max={12}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            style={input}
          />
        </label>
        <label>
          Shop (Sepolia)
          <input value={shop} onChange={(e) => setShop(e.target.value)} style={input} />
        </label>
        <label>
          Buyer
          <input value={buyer} onChange={(e) => setBuyer(e.target.value)} style={input} />
        </label>
      </div>

      <h2 style={{ fontSize: 15 }}>What will be recorded</h2>
      <pre style={{ background: '#f6f6f6', padding: 12, fontSize: 12, overflowX: 'auto' }}>
        {preview}
      </pre>
      <p style={{ fontSize: 12, color: '#555' }}>
        Anyone may pay for any buyer. The payer is recorded and never has to be the buyer.
      </p>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onPay} disabled={busy || !assetId}>
          Pay on Sepolia
        </button>
        <button onClick={onAck} disabled={busy || !payTx}>
          Acknowledge as shop
        </button>
      </div>

      {payTx && (
        <p style={{ fontSize: 12, marginTop: 8 }}>
          Payment:{' '}
          <a href={explorers.sepoliaTx(payTx)} target="_blank" rel="noreferrer">
            {payTx}
          </a>
        </p>
      )}

      {problem && (
        <p style={{ color: '#b00020', fontSize: 13, maxWidth: 620 }}>{problem}</p>
      )}

      <h2 style={{ fontSize: 15, marginTop: 24 }}>Pipeline</h2>
      <PipelineRail events={events} />
      <p style={{ fontSize: 12, color: '#555' }}>
        Stages past the acknowledgement are driven by the worker&apos;s stage events.
      </p>
    </main>
  );
}

const input: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: 6,
  fontFamily: 'monospace',
  fontSize: 12,
};
