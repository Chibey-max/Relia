'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { encodeFunctionData, type Hex } from 'viem';
import { tapeAbi } from '@/lib/abi';
import { addresses, creditcoinClient } from '@/lib/chain';
import { walletClientFor, walletChains, type WalletActivity } from '@/lib/wallet';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Badge, Button, IdentifierField, Notice, RecordStateBadge } from '@/components/ui';
import { LoadingButton, ProgressStatus } from '@/components/LoadingUI';
import { SignerContext } from '@/components/SignerContext';
import { MaterialIcon } from '@/components/MaterialIcon';
import { useWalletSnapshot } from '@/lib/useWalletSnapshot';

type ReclaimStage = 'idle' | 'wallet' | 'network' | 'signature' | 'confirmation';

export interface ReclaimSliceSnapshot {
  status: number;
  windowEnd: bigint;
  updatedAt: bigint;
  payTx: Hex;
  ackTx: Hex;
  payer: Hex;
  paymentProven: boolean;
}

const ZERO_HASH = `0x${'0'.repeat(64)}` as Hex;
const STAGES: Array<{ key: Exclude<ReclaimStage, 'idle'>; label: string }> = [
  { key: 'wallet', label: 'Connect wallet' },
  { key: 'network', label: 'Switch to Creditcoin' },
  { key: 'signature', label: 'Approve reclaim' },
  { key: 'confirmation', label: 'Confirm on-chain' },
];

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function protectedReason(error: unknown): { title: string; consequence: string; recovery: string } | null {
  const raw = errorText(error);
  if (/ReclaimBlockedLive/i.test(raw)) return { title: 'Live slice protected', consequence: 'This installment was proven paid and acknowledged in time. The contract permanently blocks reclaim.', recovery: 'Close this review and treat the Live record as final.' };
  if (/ReclaimBlockedDisputed/i.test(raw)) return { title: 'Disputed payment protected', consequence: 'A payment was proven, but no valid acknowledgement followed. The shop cannot profit from its own silence, so reclaim is blocked.', recovery: 'Open the payment receipt and resolve the acknowledgement dispute instead.' };
  if (/NotReclaimable/i.test(raw)) return { title: 'Slice is not reclaimable', consequence: 'The latest on-chain status is not Shortfall. Only a genuinely missed, settled slice can be reclaimed.', recovery: 'Close this review and refresh the public record before taking another action.' };
  return null;
}

function utcDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
}

export function ReclaimAction({ assetId, n, windowEnd, payTx, paymentProven, onConfirmed }: {
  assetId: Hex;
  n: number;
  windowEnd: bigint;
  payTx: Hex;
  paymentProven: boolean;
  onConfirmed: (slice: ReclaimSliceSnapshot, transaction: Hex) => void;
}) {
  const wallet = useWalletSnapshot();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<ReclaimStage>('idle');
  const [problem, setProblem] = useState<unknown>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const busy = stage !== 'idle';

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); };
  }, [busy, open]);

  function trackWallet(activity: WalletActivity) {
    if (activity === 'opening') setStage('wallet');
    if (activity === 'switching') setStage('network');
  }

  async function reclaim() {
    if (busy) return;
    setProblem(null);
    setStage('wallet');
    try {
      const latest = await creditcoinClient.readContract({ address: addresses.tape, abi: tapeAbi, functionName: 'sliceOf', args: [assetId, n] });
      const status = Number(latest.status);
      if (status === 2) throw new Error(`ReclaimBlockedLive(${assetId}, ${n})`);
      if (status === 4) throw new Error(`ReclaimBlockedDisputed(${assetId}, ${n}, ${latest.payTx})`);
      if (status !== 3) throw new Error(`NotReclaimable(${assetId}, ${n}, ${status})`);

      const { client, account } = await walletClientFor(walletChains.creditcoin, trackWallet);
      setStage('signature');
      const hash = await client.sendTransaction({ account, to: addresses.tape, data: encodeFunctionData({ abi: tapeAbi, functionName: 'reclaim', args: [assetId, n] }) });
      setStage('confirmation');
      const receipt = await creditcoinClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('The reclaim transaction reverted before confirmation.');
      const confirmed = await creditcoinClient.readContract({ address: addresses.tape, abi: tapeAbi, functionName: 'sliceOf', args: [assetId, n] });
      if (Number(confirmed.status) !== 5) throw new Error(`NotReclaimable(${assetId}, ${n}, ${Number(confirmed.status)})`);
      onConfirmed({ ...confirmed, status: Number(confirmed.status) }, hash);
      setOpen(false);
    } catch (error) {
      setProblem(error);
    } finally {
      setStage('idle');
    }
  }

  const protection = problem ? protectedReason(problem) : null;
  const currentStage = stage === 'idle' ? -1 : STAGES.findIndex((item) => item.key === stage);

  return (
    <>
      <Button variant="danger" size="compact" onClick={() => { setProblem(null); setOpen(true); }}>Review reclaim</Button>
      {open && <div className="reclaim-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
        <section className="reclaim-dialog" role="dialog" aria-modal="true" aria-labelledby={`reclaim-title-${n}`}>
          <button ref={closeRef} className="reclaim-close" type="button" aria-label="Close reclaim review" onClick={() => setOpen(false)} disabled={busy}><MaterialIcon name="close" /></button>
          <div className="reclaim-dialog-heading"><div><span className="mini-title">PERMISSIONLESS CONTRACT ACTION</span><h2 id={`reclaim-title-${n}`}>Review slice {n} reclaim.</h2></div><RecordStateBadge state="shortfall" /></div>
          <p className="reclaim-dialog-lead">The current contract allows any caller to submit this transaction. Reclaim changes a genuine Shortfall to Reclaimed; it does not transfer funds or erase the earlier record.</p>

          <div className="reclaim-evidence-grid">
            <IdentifierField kind="identifier" label="Asset ID" value={assetId} />
            <div className="reclaim-fact"><span>Slice</span><strong>{String(n).padStart(2, '0')} of 12</strong></div>
            <div className="reclaim-fact"><span>Window closed</span><strong>{utcDate(windowEnd)} UTC</strong></div>
            <div className="reclaim-fact"><span>Current status</span><RecordStateBadge state="shortfall" /></div>
          </div>

          <div className="reclaim-payment-evidence">
            <div><span className="mini-title">PAYMENT EVIDENCE</span><strong>{paymentProven ? 'Payment proof is recorded' : 'No proven payment is recorded'}</strong><p>{paymentProven ? 'A proven payment normally makes this slice Disputed and contract-protected. Review the receipt before continuing.' : 'The settled Shortfall records no proven payment for this window.'}</p></div>
            {payTx !== ZERO_HASH ? <Link href={`/verify/${payTx}`}>Open payment receipt <MaterialIcon name="arrow_forward" /></Link> : <Badge tone="neutral">No payment hash</Badge>}
          </div>

          <SignerContext account={wallet.account} role="Reclaim caller" network="Creditcoin" contract={addresses.tape} />

          {stage !== 'idle' && <ol className="reclaim-progress" aria-label="Reclaim transaction progress" aria-live="polite">{STAGES.map((item, index) => <li data-state={index < currentStage ? 'done' : index === currentStage ? 'active' : 'pending'} key={item.key}><i>{index < currentStage ? <MaterialIcon name="check" /> : index + 1}</i><span>{item.label}</span></li>)}</ol>}
          {stage !== 'idle' && <ProgressStatus label={stage === 'wallet' ? 'Connecting wallet...' : stage === 'network' ? 'Switching to Creditcoin...' : stage === 'signature' ? 'Waiting for reclaim signature...' : 'Confirming reclaim...'} />}

          {protection && <Notice tone="disputed" title={protection.title} consequence={protection.consequence} recovery={protection.recovery} technicalDetails={<code>{errorText(problem)}</code>} />}
          {problem != null && !protection && <ErrorNotice error={problem} title="Reclaim did not complete" onRetry={() => void reclaim()} />}

          <div className="reclaim-dialog-actions"><LoadingButton className="danger" onClick={() => void reclaim()} loading={busy} loadingLabel={stage === 'wallet' ? 'Connecting wallet...' : stage === 'network' ? 'Switching network...' : stage === 'signature' ? 'Waiting for signature...' : 'Confirming reclaim...'}>Confirm reclaim</LoadingButton><Button variant="quiet" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button></div>
        </section>
      </div>}
    </>
  );
}
