'use client';

/**
 * Pay a slice on Sepolia, then let the shop acknowledge it.
 *
 * Deliberately thin: this is the scaffold that proves the pipeline, not the
 * product surface. The ack is a single button rather than a /shop route.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { encodeFunctionData, isAddress, type Hex } from 'viem';
import { addresses, configuredAssetId, contractConfiguration, creditcoinClient, explorers, isConfiguredContractAddress, sepoliaChain, sepoliaClient } from '@/lib/chain';
import { loadListedAssets, shortId, type ListedAsset } from '@/lib/assets';
import { paySinkAbi, shopAckAbi, erc20Abi, tapeAbi, STATUS_LABELS } from '@/lib/abi';
import type { StageEvent } from '@/components/PipelineRail';
import { ProofStatusPanel } from '@/components/ProofStatusPanel';
import { ErrorNotice } from '@/components/ErrorNotice';
import { walletClientFor, walletChains } from '@/lib/wallet';
import { LoadingButton, ProgressStatus } from '@/components/LoadingUI';
import { MaterialIcon } from '@/components/MaterialIcon';
import { TaskSteps } from '@/components/TaskSteps';
import { TransactionField } from '@/components/ui';
import { ExperienceMode } from '@/components/ExperienceMode';
import { Select } from '@/components/ui/Select';
import { SignerContext } from '@/components/SignerContext';
import { useWalletSnapshot } from '@/lib/useWalletSnapshot';
import { ConfirmWriteAction } from '@/components/ConfirmWriteAction';

const publicClient = sepoliaClient;

type PaymentPhase = 'idle' | 'connecting-wallet' | 'minting-test-usdc' | 'approving-usdc' | 'submitting-payment' | 'confirming-payment' | 'submitting-ack' | 'confirming-ack' | 'acknowledged';

const phaseCopy: Record<PaymentPhase, string> = {
  idle: '',
  'connecting-wallet': 'Opening wallet...',
  'minting-test-usdc': 'Preparing test USDC...',
  'approving-usdc': 'Approving USDC...',
  'submitting-payment': 'Submit payment in wallet',
  'confirming-payment': 'Waiting for Sepolia confirmation...',
  'submitting-ack': 'Submit acknowledgement in wallet',
  'confirming-ack': 'Waiting for acknowledgement...',
  acknowledged: 'Acknowledgement confirmed',
};

const TASK_STEPS = [
  { label: 'Details', detail: 'Choose the title slice' },
  { label: 'Payment', detail: 'Sign on Sepolia' },
  { label: 'Acknowledgement', detail: 'Match the shop response' },
  { label: 'Proof', detail: 'Update the public title' },
];

const TRANSACTION_STAGES = [
  'Buyer wallet approval',
  'Payment submitted',
  'Payment confirmed',
  'Shop wallet approval',
  'Acknowledgement submitted',
  'Acknowledgement confirmed',
  'Proof generation',
  'Title update',
] as const;

type ProblemSource = 'payment' | 'acknowledgement' | null;
const PAYMENT_DRAFT_KEY = 'relia:pending-payment:v1';

export default function SendPage() {
  const wallet = useWalletSnapshot();
  const [assets, setAssets] = useState<ListedAsset[]>([]);
  const [assetId, setAssetId] = useState<string>(configuredAssetId);
  const [n, setN] = useState<number>(1);
  const [shop, setShop] = useState<string>('');
  const [buyer, setBuyer] = useState<string>('');
  const [amount, setAmount] = useState<bigint>(40_000_000n);
  const [selectedInstallment, setSelectedInstallment] = useState<bigint | null>(null);
  const [selectedSliceStatus, setSelectedSliceStatus] = useState<number | null>(null);

  const [payTx, setPayTx] = useState<string>('');
  const [submittedPayTx, setSubmittedPayTx] = useState<string>('');
  const [ackTx, setAckTx] = useState<string>('');
  const [submittedAckTx, setSubmittedAckTx] = useState<string>('');
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [phase, setPhase] = useState<PaymentPhase>('idle');
  const [intent, setIntent] = useState<'payment' | 'ack' | null>(null);
  const [problem, setProblem] = useState<unknown>(null);
  const [problemSource, setProblemSource] = useState<ProblemSource>(null);
  const [assetProblem, setAssetProblem] = useState<unknown>(null);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const requestedAssetId = search.get('assetId');
    const requestedSlice = Number(search.get('slice'));
    const selectedId = requestedAssetId && /^0x[0-9a-fA-F]{64}$/.test(requestedAssetId) ? requestedAssetId : configuredAssetId;
    const selectedSlice = Number.isInteger(requestedSlice) && requestedSlice >= 1 && requestedSlice <= 12 ? requestedSlice : 1;
    if (selectedId) setAssetId(selectedId);
    setN(selectedSlice);
    try {
      const raw = window.localStorage.getItem(PAYMENT_DRAFT_KEY);
      const draft = raw ? JSON.parse(raw) as { assetId?: string; n?: number; shop?: string; buyer?: string; submittedPayTx?: string; payTx?: string; submittedAckTx?: string; ackTx?: string } : null;
      if (draft?.assetId?.toLowerCase() === selectedId.toLowerCase() && draft.n === selectedSlice && draft.submittedPayTx) {
        setShop(draft.shop ?? '');
        setBuyer(draft.buyer ?? '');
        setSubmittedPayTx(draft.submittedPayTx);
        setPayTx(draft.payTx ?? '');
        setSubmittedAckTx(draft.submittedAckTx ?? '');
        setAckTx(draft.ackTx ?? '');
        setPhase(draft.ackTx ? 'acknowledged' : 'idle');
      }
    } catch {
      window.localStorage.removeItem(PAYMENT_DRAFT_KEY);
    }
    if (isConfiguredContractAddress(addresses.paySink)) {
      publicClient.readContract({ address: addresses.paySink, abi: paySinkAbi, functionName: 'installmentAmount' })
        .then((value) => setAmount(value as bigint))
        .catch(() => {});
    }
    if (!isConfiguredContractAddress(addresses.registry)) return;
    loadListedAssets().then((listedAssets) => {
      setAssets(listedAssets);
      const selected = listedAssets.find((asset) => asset.assetId.toLowerCase() === selectedId.toLowerCase());
      if (selected) {
        setShop(selected.shopSepolia);
        setBuyer(selected.buyer);
        setSelectedInstallment(selected.installment);
      }
    }).catch(setAssetProblem);
  }, []);

  useEffect(() => {
    if (!submittedPayTx || !/^0x[0-9a-fA-F]{64}$/.test(assetId)) return;
    window.localStorage.setItem(PAYMENT_DRAFT_KEY, JSON.stringify({ assetId, n, shop, buyer, submittedPayTx, payTx, submittedAckTx, ackTx }));
  }, [ackTx, assetId, buyer, n, payTx, shop, submittedAckTx, submittedPayTx]);

  useEffect(() => {
    if (!/^0x[0-9a-fA-F]{64}$/.test(assetId) || !isConfiguredContractAddress(addresses.tape)) {
      setSelectedSliceStatus(null);
      return;
    }

    let cancelled = false;
    creditcoinClient.readContract({
      address: addresses.tape,
      abi: tapeAbi,
      functionName: 'sliceOf',
      args: [assetId as Hex, n],
    }).then((slice) => {
      if (!cancelled) setSelectedSliceStatus(Number(slice.status));
    }).catch(() => {
      if (!cancelled) setSelectedSliceStatus(null);
    });

    return () => { cancelled = true; };
  }, [assetId, n]);

  function resetTransaction() {
    setPayTx('');
    setSubmittedPayTx('');
    setAckTx('');
    setSubmittedAckTx('');
    setEvents([]);
    setPhase('idle');
    setProblem(null);
    window.localStorage.removeItem(PAYMENT_DRAFT_KEY);
  }

  function selectAsset(id: string) {
    if (id !== assetId) resetTransaction();
    setAssetId(id);
    const hit = assets.find((a) => a.assetId === id);
    if (hit) {
      setShop(hit.shopSepolia);
      setBuyer(hit.buyer);
      setSelectedInstallment(hit.installment);
    } else {
      setSelectedInstallment(null);
    }
  }

  const installmentMismatch = selectedInstallment != null && selectedInstallment !== amount;
  const selectedSliceResolved = selectedSliceStatus != null && selectedSliceStatus !== 1;
  const selectedSliceLabel = selectedSliceStatus == null ? null : STATUS_LABELS[selectedSliceStatus] ?? 'Unknown';

  const preview = `REL1|payment|${assetId || '<assetId>'}|${n}|${shop || '<shop>'}|${buyer || '<buyer>'}|${amount}`;
  const validation = {
    assetId: /^0x[0-9a-fA-F]{64}$/.test(assetId) ? '' : 'Enter a 32-byte asset ID beginning with 0x.',
    n: Number.isInteger(n) && n >= 1 && n <= 12 ? '' : 'Choose a slice from 1 to 12.',
    shop: isAddress(shop) ? '' : 'Enter a valid Sepolia shop address.',
    buyer: isAddress(buyer) ? '' : 'Enter a valid buyer address.',
  };
  const formValid = Object.values(validation).every((message) => message === '');
  const showError = (field: keyof typeof validation) => Boolean(validation[field] && (attempted || touched[field]));
  const touch = (field: keyof typeof validation) => setTouched((current) => ({ ...current, [field]: true }));
  const busy = phase !== 'idle' && phase !== 'acknowledged';
  const paymentBusy = busy && intent === 'payment';
  const acknowledgementBusy = busy && intent === 'ack';
  const shopSignerMismatch = Boolean(wallet.account && isAddress(shop) && wallet.account.toLowerCase() !== shop.toLowerCase());
  const hasAck = Boolean(ackTx);
  const hasProof = events.some((event) => event.stage === 'proof_generated' || event.stage === 'verified' || event.stage === 'title_ticked');
  const hasTitle = events.some((event) => event.stage === 'title_ticked');
  const liveWriteReady = contractConfiguration.sepoliaReady;
  const taskStep = hasAck ? 3 : payTx ? 2 : formValid ? 1 : 0;
  const progressAnnouncement = phase !== 'idle'
    ? phaseCopy[phase]
    : hasTitle
      ? 'Complete. The public title has been updated.'
      : hasProof
        ? 'Proof generated. Waiting for the title update.'
        : hasAck
          ? 'Acknowledgement confirmed. Proof generation is next.'
          : payTx
            ? 'Payment confirmed. Waiting for acknowledgement.'
            : submittedPayTx
              ? 'Payment submitted. Waiting for finality.'
              : '';

  function transactionStageState(index: number): 'done' | 'active' | 'pending' {
    if (!liveWriteReady && !submittedPayTx) return 'pending';
    if (index === 0) return submittedPayTx ? 'done' : intent === 'payment' ? 'active' : 'active';
    if (index === 1) return submittedPayTx ? 'done' : phase === 'submitting-payment' ? 'active' : 'pending';
    if (index === 2) return payTx ? 'done' : submittedPayTx ? 'active' : 'pending';
    if (index === 3) return submittedAckTx ? 'done' : payTx ? 'active' : 'pending';
    if (index === 4) return submittedAckTx ? 'done' : phase === 'submitting-ack' ? 'active' : 'pending';
    if (index === 5) return ackTx ? 'done' : submittedAckTx ? 'active' : 'pending';
    if (index === 6) return hasProof ? 'done' : hasAck ? 'active' : 'pending';
    return hasTitle ? 'done' : hasProof ? 'active' : 'pending';
  }

  function appendConfirmedEvent(event: StageEvent) {
    setEvents((current) => current.some((item) => item.stage === event.stage) ? current : [...current, event]);
  }

  async function confirmPayment(hash: `0x${string}`) {
    setIntent('payment');
    setPhase('confirming-payment');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error('Payment transaction reverted before confirmation.');
    setPayTx(hash);
    appendConfirmedEvent({ stage: 'sepolia_mined', assetId, n, at: new Date().toISOString(), detail: { payTx: hash, block: Number(receipt.blockNumber) } });
    setPhase('idle');
    setIntent(null);
    setProblemSource(null);
  }

  async function confirmAcknowledgement(hash: `0x${string}`) {
    setIntent('ack');
    setPhase('confirming-ack');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error('Acknowledgement transaction reverted before confirmation.');
    setAckTx(hash);
    appendConfirmedEvent({ stage: 'ack_located', assetId, n, at: new Date().toISOString(), detail: { ackTx: hash, block: Number(receipt.blockNumber) } });
    setPhase('acknowledged');
    setIntent(null);
    setProblemSource(null);
  }

  async function retryTransactionState() {
    setProblem(null);
    try {
      if (submittedAckTx && !ackTx) return await confirmAcknowledgement(submittedAckTx as `0x${string}`);
      if (submittedPayTx && !payTx) return await confirmPayment(submittedPayTx as `0x${string}`);
      if (problemSource === 'acknowledgement') return await onAck();
      return await onPay();
    } catch (error) {
      setProblem(error);
      setPhase('idle');
      setIntent(null);
    }
  }

  async function onPay() {
    setAttempted(true);
    if (!formValid || submittedPayTx) return;
    setIntent('payment');
    setPhase('connecting-wallet');
    setProblem(null);
    setProblemSource(null);
    try {
      const { client: w, account } = await walletClientFor(walletChains.sepolia);

      setPhase('minting-test-usdc');
      const mintHash = await w.sendTransaction({
        account,
        to: addresses.usdc,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'mint', args: [account, amount] }),
      });
      await publicClient.waitForTransactionReceipt({ hash: mintHash });

      setPhase('approving-usdc');
      const approvalHash = await w.sendTransaction({
        account,
        to: addresses.usdc,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [addresses.paySink, amount] }),
      });
      await publicClient.waitForTransactionReceipt({ hash: approvalHash });

      setPhase('submitting-payment');
      const hash = await w.sendTransaction({
        account,
        to: addresses.paySink,
        data: encodeFunctionData({
          abi: paySinkAbi,
          functionName: 'pay',
          args: [assetId as Hex, n, shop as Hex, buyer as Hex],
        }),
      });

      setSubmittedPayTx(hash);
      await confirmPayment(hash);
    } catch (e) {
      setProblem(e);
      setProblemSource('payment');
      setPhase('idle');
      setIntent(null);
    }
  }

  async function onAck() {
    if (!payTx || submittedAckTx) return;
    setIntent('ack');
    setPhase('connecting-wallet');
    setProblem(null);
    setProblemSource(null);
    try {
      const { client: w, account } = await walletClientFor(walletChains.sepolia);
      if (account.toLowerCase() !== shop.toLowerCase()) throw new Error(`NotTheShop: the connected account ${account} does not match the registered shop ${shop}.`);

      setPhase('submitting-ack');
      const hash = await w.sendTransaction({
        account,
        to: addresses.shopAck,
        data: encodeFunctionData({ abi: shopAckAbi, functionName: 'ack', args: [assetId as Hex, n, payTx as Hex] }),
      });

      setSubmittedAckTx(hash);
      await confirmAcknowledgement(hash);
    } catch (e) {
      setProblem(e);
      setProblemSource('acknowledgement');
      setPhase('idle');
      setIntent(null);
    }
  }

  return (
    <main className="task-main">
      <header className="task-header" data-reveal>
        <div className="task-header-meta"><div className="eyebrow"><span className="dot" />Write on Sepolia</div>
        <ExperienceMode tone={liveWriteReady ? 'live' : 'unavailable'}>{liveWriteReady ? 'Live testnet action | wallet required' : 'Live action unavailable | sample explanation remains public'}</ExperienceMode></div>
        <h1>Send an installment</h1>
        <p className="lead">Review the record, pay the installment, then let the shop acknowledge the same payment.</p>
        <div className="task-context"><span>1 payment</span><span>1 acknowledgement</span><span>0 bridged funds</span></div>
      </header>

      <TaskSteps steps={TASK_STEPS} current={taskStep} />
      <p className="sr-announcement" role="status" aria-live="polite" aria-atomic="true">{progressAnnouncement}</p>

      <div className="task-layout" data-reveal>
        <section className="task-panel task-panel-primary" aria-labelledby="payment-details-title">
          <div className="task-panel-heading"><span className="task-step">01</span><div><h2 id="payment-details-title">What you are paying</h2><p>Choose the title and confirm the people named in the record.</p></div></div>
          <div className="form-grid form-grid-spaced">
            <label className="field full">
              Asset
              <Select label="Asset" mono value={assets.some((a) => a.assetId === assetId) ? assetId : ''} onChange={selectAsset} onBlur={() => touch('assetId')} invalid={Boolean(showError('assetId'))} describedBy={showError('assetId') ? 'asset-select-error' : undefined} disabled={Boolean(submittedPayTx) || assets.length === 0} placeholder={assets.length ? 'Select a listed asset...' : isConfiguredContractAddress(addresses.registry) ? 'No assets listed yet' : 'Live registry is not configured'} options={assets.map((a) => ({ value: a.assetId, label: shortId(a.assetId), detail: `Buyer ${a.buyer.slice(0, 8)}...${a.buyer.slice(-4)}` }))} />
              {showError('assetId') && <small className="field-error" id="asset-select-error">{validation.assetId}</small>}
            </label>
            <label className="field full">
              Or paste an asset id
              <input value={assetId} onChange={(e) => { if (e.target.value.trim() !== assetId) resetTransaction(); setAssetId(e.target.value.trim()); }} onBlur={() => touch('assetId')} aria-invalid={showError('assetId')} aria-describedby={showError('assetId') ? 'asset-id-error' : undefined} disabled={Boolean(submittedPayTx)} />
              {showError('assetId') && <small className="field-error" id="asset-id-error">{validation.assetId}</small>}
              {/^0x[0-9a-fA-F]{64}$/.test(assetId) && <Link className="field-record-link" href={`/assets/${assetId}`}>Open canonical asset record <MaterialIcon name="arrow_forward" /></Link>}
            </label>
            <label className="field">
              Slice
              <input type="number" min={1} max={12} value={n} onChange={(e) => { resetTransaction(); setN(Number(e.target.value)); }} onBlur={() => touch('n')} aria-invalid={showError('n')} aria-describedby={showError('n') ? 'slice-error' : undefined} disabled={Boolean(submittedPayTx)} />
              {showError('n') && <small className="field-error" id="slice-error">{validation.n}</small>}
            </label>
            <label className="field">
              Installment
              <input value={`${(Number(amount) / 1e6).toFixed(2)} USDC`} readOnly />
              <small className="field-help">This is what the payment contract actually pulls, read from its on-chain `installmentAmount()`, not a client-side guess.</small>
            </label>
            <label className="field full">
              Shop on Sepolia
              <input value={shop} onChange={(e) => setShop(e.target.value.trim())} onBlur={() => touch('shop')} aria-invalid={showError('shop')} aria-describedby={showError('shop') ? 'shop-error' : undefined} disabled={Boolean(submittedPayTx)} />
              {showError('shop') && <small className="field-error" id="shop-error">{validation.shop}</small>}
            </label>
            <label className="field full">
              Buyer
              <input value={buyer} onChange={(e) => setBuyer(e.target.value.trim())} onBlur={() => touch('buyer')} aria-invalid={showError('buyer')} aria-describedby={showError('buyer') ? 'buyer-error' : undefined} disabled={Boolean(submittedPayTx)} />
              {showError('buyer') && <small className="field-error" id="buyer-error">{validation.buyer}</small>}
            </label>
          </div>
          <div className="inline-guidance">
            <MaterialIcon name="auto_awesome" /><p><strong>Paying for someone else?</strong> That is allowed. The receipt records both payer and buyer.</p>
          </div>
        </section>

        <aside className="task-panel task-review transaction-summary" aria-labelledby="review-title">
          <div className="task-panel-heading"><span className="task-step task-step-note"><MaterialIcon name="edit_note" /></span><div><h2 id="review-title">Transaction summary</h2><p>Check the human-readable facts before opening a wallet.</p></div></div>
            <dl className="transaction-summary-list">
              <div><dt>Network</dt><dd>Sepolia</dd></div>
              <div><dt>Installment</dt><dd>{(Number(amount) / 1e6).toFixed(2)} USDC</dd></div>
              <div><dt>Slice</dt><dd>{String(n).padStart(2, '0')} of 12</dd></div>
              <div><dt>Buyer</dt><dd className="mono">{buyer ? `${buyer.slice(0, 8)}...${buyer.slice(-6)}` : 'Not selected'}</dd></div>
              <div><dt>Shop</dt><dd className="mono">{shop ? `${shop.slice(0, 8)}...${shop.slice(-6)}` : 'Not selected'}</dd></div>
            </dl>
            <div className="transaction-requirements" role="group" aria-label="Signing requirements"><strong>Before you sign</strong><span><MaterialIcon name="account_balance_wallet" />Browser wallet connected</span><span><MaterialIcon name="hub" />Sepolia network selected</span><span><MaterialIcon name="payments" />This test flow prepares and approves USDC after the wallet opens</span></div>
            <div className="record-preview"><span className="mini-title">REL1 RECORD</span><pre className="rel1-preview">{preview}</pre></div>
        </aside>
      </div>

      <div className="transaction-action-grid" data-reveal>
        <section className="task-panel transaction-action transaction-action-buyer" aria-labelledby="payment-action-title" aria-busy={paymentBusy}>
          <div className="action-role-label">BUYER OR PAYER ACTION</div>
          <div className="task-panel-heading"><span className="task-step">02</span><div><h2 id="payment-action-title">Send the installment</h2><p>Any wallet may pay for the named buyer. This action prepares test USDC and submits the payment.</p></div></div>
          <SignerContext account={wallet.account} role="Payment signer" network="Sepolia" contract={addresses.paySink} />
          <ConfirmWriteAction title={`Pay ${(Number(amount) / 1e6).toFixed(2)} USDC?`} consequence="This sequence mints test USDC, approves the payment contract, and sends the installment to the named shop on Sepolia. The payment cannot be undone by Relia." confirmLabel={`Pay ${(Number(amount) / 1e6).toFixed(2)} USDC`} loadingLabel={phaseCopy[phase] || 'Submitting payment...'} onConfirm={onPay} busy={paymentBusy} disabled={!liveWriteReady || busy || !formValid || Boolean(submittedPayTx) || installmentMismatch || selectedSliceResolved}><div className="confirm-write-facts"><span>Buyer</span><code>{buyer}</code><span>Shop</span><code>{shop}</code><span>Slice {n} of 12</span></div></ConfirmWriteAction>
          {!liveWriteReady && <p className="field-help action-help">The Sepolia contracts are not configured. This control will not open a wallet.</p>}
          {!formValid && <p className="field-help action-help">Complete the four validated payment fields to continue.</p>}
          {selectedSliceResolved && (
            <p className="field-error action-help" role="status">
              Slice {n} is already {selectedSliceLabel?.toLowerCase()}. Choose a due slice before sending another payment.
            </p>
          )}
          {installmentMismatch && selectedInstallment != null && (
            <p className="field-error action-help" role="status">
              This asset was listed for {(Number(selectedInstallment) / 1e6).toFixed(2)} USDC, but the payment contract is fixed at {(Number(amount) / 1e6).toFixed(2)} USDC per slice. Paying here would not match the asset's declared terms, so payment is disabled until the amounts agree.
            </p>
          )}
        </section>
        <section className="task-panel transaction-action transaction-action-shop" aria-labelledby="ack-action-title" aria-busy={acknowledgementBusy}>
          <div className="action-role-label">REGISTERED SHOP ACTION</div>
          <div className="task-panel-heading"><span className="task-step">03</span><div><h2 id="ack-action-title">Acknowledge the payment</h2><p>Only the registered shop may cite the confirmed payment.</p></div></div>
          <SignerContext account={wallet.account} requiredSigner={isAddress(shop) ? shop : undefined} role="Acknowledgement signer" network="Sepolia" contract={addresses.shopAck} />
          <ConfirmWriteAction title="Acknowledge this exact payment?" consequence="The shop acknowledgement is a permanent Sepolia fact citing the payment below. It cannot cite a different payment later for this submission." confirmLabel="Acknowledge payment" loadingLabel={phaseCopy[phase] || 'Submitting acknowledgement...'} onConfirm={onAck} busy={acknowledgementBusy} disabled={!liveWriteReady || busy || !payTx || Boolean(submittedAckTx) || shopSignerMismatch}><TransactionField label="Payment being acknowledged" value={payTx || 'Not available'} explorerHref={payTx ? explorers.sepoliaTx(payTx) : undefined} /></ConfirmWriteAction>
          {!payTx && <p className="field-help action-help">Waiting for a confirmed payment.</p>}
          {shopSignerMismatch && <p className="field-error action-help" role="status">The connected account is not the registered shop. Switch to <code>{shop}</code> before acknowledging.</p>}
        </section>
      </div>

      {phase !== 'idle' && phase !== 'acknowledged' && <ProgressStatus label={phaseCopy[phase]} detail="Keep this page open while the current step finishes." />}
      {(submittedPayTx || submittedAckTx) && (
        <section className="durable-result durable-result-pending transaction-result">
          <span className="status-badge status-due"><MaterialIcon name="radio_button_unchecked" />TITLE DUE</span>
          <div><strong>{hasAck ? 'Payment and acknowledgement confirmed; proof is next' : payTx ? 'Payment confirmed; acknowledgement is next' : 'Payment submitted; waiting for finality'}</strong><p>A submitted source transaction is not a live title slice. This result is stored in this browser so reloading cannot hide the payment while acknowledgement is pending.</p>{((submittedPayTx && !payTx) || (submittedAckTx && !ackTx)) && <LoadingButton className="secondary" onClick={() => void retryTransactionState()} loading={busy} loadingLabel={phaseCopy[phase] || 'Checking confirmation...'}>Resume confirmation check</LoadingButton>}</div>
          <details className="transaction-technical"><summary>Technical transaction details</summary><div className="transaction-hash-list">{submittedPayTx && <TransactionField label={payTx ? 'Confirmed payment' : 'Submitted payment'} value={submittedPayTx} explorerHref={explorers.sepoliaTx(submittedPayTx)} explorerLabel="View payment on Sepolia" />}{submittedAckTx && <TransactionField label={ackTx ? 'Confirmed acknowledgement' : 'Submitted acknowledgement'} value={submittedAckTx} explorerHref={explorers.sepoliaTx(submittedAckTx)} explorerLabel="View acknowledgement on Sepolia" />}<div className="technical-contracts"><span>PAYMENT CONTRACT</span><code>{addresses.paySink}</code><span>ACK CONTRACT</span><code>{addresses.shopAck}</code><span>CHAIN ID</span><code>{sepoliaChain.id}</code></div></div></details>
        </section>
      )}
      {problem != null && <div className="notice-slot"><ErrorNotice error={problem} onRetry={retryTransactionState} /></div>}
      {assetProblem != null && <div className="notice-slot"><ErrorNotice error={assetProblem} title="The asset registry could not be read" recovery="You can still paste a known asset ID, or retry the public registry read." onRetry={() => { setAssetProblem(null); loadListedAssets().then(setAssets).catch(setAssetProblem); }} /></div>}

      <section className="task-progress" aria-labelledby="pipeline-title" data-reveal>
        <div className="task-panel-heading"><span className="task-step">04</span><div><h2 id="pipeline-title">Payment-to-title progress</h2><p>This rail advances from wallet and confirmed receipt events only. It never uses a timed demo sequence.</p></div></div>
        <div className="live-progress-disclosure"><ExperienceMode tone={liveWriteReady ? 'live' : 'unavailable'}>{liveWriteReady ? 'Live contract progress' : 'Waiting for contract configuration'}</ExperienceMode><span>Submitted means a hash exists. Confirmed means the network returned a successful receipt. Only a confirmed proof can advance the title.</span></div>
        <ol className="transaction-timeline" aria-label="Transaction and proof progress">
          {TRANSACTION_STAGES.map((label, index) => { const state = transactionStageState(index); return <li className={state} aria-current={state === 'active' ? 'step' : undefined} key={label}><span aria-hidden="true">{state === 'done' ? <MaterialIcon name="check" /> : String(index + 1).padStart(2, '0')}</span><div><strong>{label}</strong><small>{state === 'done' ? 'Complete' : state === 'active' ? 'Current stage' : 'Not started'}</small></div></li>; })}
        </ol>
        <div className="pipeline-slot"><ProofStatusPanel assetId={assetId} n={n} payTx={payTx} ackTx={ackTx} localEvents={events} /></div>
      </section>
    </main>
  );
}
