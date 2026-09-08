'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { encodeFunctionData, formatUnits, isAddress, parseEventLogs, parseUnits, type Hex } from 'viem';
import { ASSET_KINDS, registryAbi, shopAckAbi } from '@/lib/abi';
import { addresses, contractConfiguration, creditcoinClient, explorers, sepoliaClient } from '@/lib/chain';
import { ErrorNotice } from '@/components/ErrorNotice';
import { TaskSteps } from '@/components/TaskSteps';
import { AddressField, Badge, Button, IdentifierField, Notice, TransactionField } from '@/components/ui';
import { walletClientFor, walletChains, type WalletActivity } from '@/lib/wallet';
import { LoadingButton, ProgressStatus } from '@/components/LoadingUI';
import { SignerContext } from '@/components/SignerContext';
import { useWalletSnapshot } from '@/lib/useWalletSnapshot';
import { ConfirmWriteAction } from '@/components/ConfirmWriteAction';

type WizardMode = 'details' | 'review' | 'creditcoin' | 'sepolia' | 'complete';
type WriteStage = 'idle' | 'wallet' | 'network' | 'signature' | 'confirmation' | 'done';
type WindowTuple = readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];

interface ListingCheckpoint {
  assetId: Hex;
  shopSepolia: Hex;
  creditcoinTx: Hex;
  sepoliaTx?: Hex;
}

const CHECKPOINT_KEY = 'relia:pending-shop-registration:v1';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const STEPS = [
  { label: 'Terms', detail: 'Build and review' },
  { label: 'Creditcoin', detail: 'Create the title' },
  { label: 'Sepolia', detail: 'Bind the shop' },
  { label: 'Ready', detail: 'Use the asset' },
];
const WRITE_STAGES: Array<{ key: WriteStage; label: string }> = [
  { key: 'wallet', label: 'Connect wallet' },
  { key: 'network', label: 'Switch network' },
  { key: 'signature', label: 'Approve signature' },
  { key: 'confirmation', label: 'Confirm on-chain' },
];

function localDateInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function stageIndex(stage: WriteStage): number {
  if (stage === 'done') return WRITE_STAGES.length;
  return Math.max(0, WRITE_STAGES.findIndex((item) => item.key === stage));
}

function validNonZeroAddress(value: string): value is Hex {
  return isAddress(value) && value.toLowerCase() !== ZERO_ADDRESS;
}

function WriteProgress({ chain, stage }: { chain: string; stage: WriteStage }) {
  const current = stageIndex(stage);
  return (
    <div className="listing-write-progress" aria-live="polite">
      <div className="listing-write-heading"><span>{chain}</span><Badge tone={stage === 'done' ? 'live' : stage === 'idle' ? 'neutral' : 'due'}>{stage === 'done' ? 'Confirmed' : stage === 'idle' ? 'Waiting' : WRITE_STAGES[current]?.label ?? 'Working'}</Badge></div>
      <ol>
        {WRITE_STAGES.map((item, index) => <li data-state={stage === 'done' || index < current ? 'done' : index === current && stage !== 'idle' ? 'active' : 'pending'} key={item.key}><i>{stage === 'done' || index < current ? '✓' : index + 1}</i><span>{item.label}</span></li>)}
      </ol>
    </div>
  );
}

export default function NewAssetPage() {
  const writeLock = useRef(false);
  const wallet = useWalletSnapshot();
  const [mode, setMode] = useState<WizardMode>('details');
  const [kind, setKind] = useState(0);
  const [installment, setInstallment] = useState('40');
  const [buyer, setBuyer] = useState('');
  const [shopCtc, setShopCtc] = useState('');
  const [shopSepolia, setShopSepolia] = useState('');
  const [scheduleStart, setScheduleStart] = useState('');
  const [cadenceDays, setCadenceDays] = useState('30');
  const [windows, setWindows] = useState<string[]>(Array(12).fill(''));
  const [advanced, setAdvanced] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [creditcoinStage, setCreditcoinStage] = useState<WriteStage>('idle');
  const [sepoliaStage, setSepoliaStage] = useState<WriteStage>('idle');
  const [checkpoint, setCheckpoint] = useState<ListingCheckpoint | null>(null);
  const [problem, setProblem] = useState<unknown>(null);

  useEffect(() => {
    const base = new Date();
    base.setDate(base.getDate() + 7);
    base.setMinutes(0, 0, 0);
    const initialStart = localDateInput(base);
    setScheduleStart(initialStart);
    setWindows(Array.from({ length: 12 }, (_, index) => localDateInput(new Date(base.getTime() + index * 30 * 86_400_000))));

    const saved = window.localStorage.getItem(CHECKPOINT_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as ListingCheckpoint;
      if (/^0x[0-9a-fA-F]{64}$/.test(parsed.assetId) && validNonZeroAddress(parsed.shopSepolia) && /^0x[0-9a-fA-F]{64}$/.test(parsed.creditcoinTx)) {
        setCheckpoint(parsed);
        setShopSepolia(parsed.shopSepolia);
        setCreditcoinStage('done');
        setMode(parsed.sepoliaTx ? 'complete' : 'sepolia');
        if (parsed.sepoliaTx) setSepoliaStage('done');
      }
    } catch {
      window.localStorage.removeItem(CHECKPOINT_KEY);
    }
  }, []);

  const windowTimestamps = useMemo(() => windows.map((value) => value ? Math.floor(new Date(value).getTime() / 1000) : 0), [windows]);
  const parsedInstallment = useMemo(() => {
    try { return parseUnits(installment || '0', 6); } catch { return 0n; }
  }, [installment]);
  const validation = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const datesPresent = windowTimestamps.every((value) => Number.isFinite(value) && value > 0);
    const future = datesPresent && windowTimestamps.every((value) => value > now);
    const increasing = datesPresent && windowTimestamps.every((value, index) => index === 0 || value > windowTimestamps[index - 1]);
    return {
      installment: parsedInstallment > 0n ? '' : 'Enter an installment amount greater than zero with no more than six decimals.',
      buyer: validNonZeroAddress(buyer) ? '' : 'Enter a non-zero buyer address.',
      shopCtc: validNonZeroAddress(shopCtc) ? '' : 'Enter a non-zero Creditcoin shop address.',
      shopSepolia: validNonZeroAddress(shopSepolia) ? '' : 'Enter a non-zero Sepolia shop address.',
      windows: !datesPresent ? 'Set all twelve payment deadlines.' : !future ? 'Every deadline must still be in the future.' : !increasing ? 'Each deadline must be later than the one before it.' : '',
    };
  }, [buyer, parsedInstallment, shopCtc, shopSepolia, windowTimestamps]);
  const formValid = Object.values(validation).every((message) => !message);
  const wizardStep = mode === 'details' ? 0 : mode === 'review' ? 1 : mode === 'creditcoin' ? 1 : mode === 'sepolia' ? 2 : 4;
  const busy = mode === 'creditcoin' || (mode === 'sepolia' && sepoliaStage !== 'idle');

  function generateSchedule() {
    const start = new Date(scheduleStart).getTime();
    const cadence = Number(cadenceDays);
    if (!Number.isFinite(start) || !Number.isInteger(cadence) || cadence < 1) {
      setAttempted(true);
      return;
    }
    setWindows(Array.from({ length: 12 }, (_, index) => localDateInput(new Date(start + index * cadence * 86_400_000))));
  }

  function openReview() {
    setAttempted(true);
    setProblem(null);
    if (formValid) setMode('review');
  }

  function persist(next: ListingCheckpoint) {
    setCheckpoint(next);
    window.localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(next));
  }

  function activityStage(activity: WalletActivity, setter: (stage: WriteStage) => void) {
    if (activity === 'opening') setter('wallet');
    if (activity === 'switching') setter('network');
  }

  async function listOnCreditcoin() {
    setAttempted(true);
    if (!formValid || busy || writeLock.current) { if (!formValid) setMode('details'); return; }
    if (!contractConfiguration.creditcoinReady) { setProblem(new Error('Creditcoin contract configuration is incomplete.')); return; }
    setMode('creditcoin');
    setProblem(null);
    setCreditcoinStage('wallet');
    writeLock.current = true;
    try {
      const { client, account } = await walletClientFor(walletChains.creditcoin, (activity) => activityStage(activity, setCreditcoinStage));
      setCreditcoinStage('signature');
      const data = encodeFunctionData({
        abi: registryAbi,
        functionName: 'list',
        args: [kind, parsedInstallment, windowTimestamps.map(BigInt) as unknown as WindowTuple, shopCtc as Hex, shopSepolia as Hex, buyer as Hex],
      });
      const hash = await client.sendTransaction({ account, to: addresses.registry, data });
      setCreditcoinStage('confirmation');
      const receipt = await creditcoinClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('The Creditcoin listing transaction reverted before confirmation.');
      const events = parseEventLogs({ abi: registryAbi, eventName: 'Listed', logs: receipt.logs });
      const assetId = events[0]?.args.assetId;
      if (!assetId) throw new Error('The listing confirmed, but its Listed event did not contain an asset ID.');
      const next = { assetId, shopSepolia: shopSepolia as Hex, creditcoinTx: hash };
      persist(next);
      setCreditcoinStage('done');
      setSepoliaStage('idle');
      setMode('sepolia');
    } catch (error) {
      setProblem(error);
      setCreditcoinStage('idle');
      setMode('review');
    } finally {
      writeLock.current = false;
    }
  }

  async function registerOnSepolia() {
    if (!checkpoint || busy || writeLock.current) return;
    if (!contractConfiguration.sepoliaReady) { setProblem(new Error('Sepolia contract configuration is incomplete.')); return; }
    setProblem(null);
    setSepoliaStage('wallet');
    writeLock.current = true;
    try {
      const [registryRecord, currentShop] = await Promise.all([
        creditcoinClient.readContract({ address: addresses.registry, abi: registryAbi, functionName: 'getAsset', args: [checkpoint.assetId] }),
        sepoliaClient.readContract({ address: addresses.shopAck, abi: shopAckAbi, functionName: 'shopOf', args: [checkpoint.assetId] }),
      ]);
      if (registryRecord.shopSepolia.toLowerCase() !== checkpoint.shopSepolia.toLowerCase()) throw new Error('The saved Sepolia shop does not match the immutable Creditcoin registry binding.');
      if (currentShop.toLowerCase() === checkpoint.shopSepolia.toLowerCase()) {
        setSepoliaStage('done');
        setMode('complete');
        window.localStorage.removeItem(CHECKPOINT_KEY);
        return;
      }
      if (currentShop.toLowerCase() !== ZERO_ADDRESS) throw new Error(`This asset is already registered to a different Sepolia shop: ${currentShop}`);

      const { client, account } = await walletClientFor(walletChains.sepolia, (activity) => activityStage(activity, setSepoliaStage));
      setSepoliaStage('signature');
      const hash = await client.sendTransaction({
        account,
        to: addresses.shopAck,
        data: encodeFunctionData({ abi: shopAckAbi, functionName: 'registerShop', args: [checkpoint.assetId, checkpoint.shopSepolia] }),
      });
      setSepoliaStage('confirmation');
      const receipt = await sepoliaClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('The Sepolia shop registration reverted before confirmation.');
      const confirmedShop = await sepoliaClient.readContract({ address: addresses.shopAck, abi: shopAckAbi, functionName: 'shopOf', args: [checkpoint.assetId] });
      if (confirmedShop.toLowerCase() !== checkpoint.shopSepolia.toLowerCase()) throw new Error('Sepolia confirmed a transaction, but the registered shop does not match the Creditcoin binding.');
      const next = { ...checkpoint, sepoliaTx: hash };
      setCheckpoint(next);
      setSepoliaStage('done');
      setMode('complete');
      window.localStorage.removeItem(CHECKPOINT_KEY);
    } catch (error) {
      setProblem(error);
      setSepoliaStage('idle');
    } finally {
      writeLock.current = false;
    }
  }

  function resetWizard() {
    window.localStorage.removeItem(CHECKPOINT_KEY);
    setCheckpoint(null);
    setProblem(null);
    setCreditcoinStage('idle');
    setSepoliaStage('idle');
    setMode('details');
  }

  return (
    <main className="task-main listing-main">
      <header className="listing-hero" data-reveal>
        <div><div className="eyebrow"><span className="dot" />Create a hire-purchase title</div><h1>Draw the terms. Then put them on-chain.</h1><p className="lead">First, Relia creates the asset and its twelve deadlines on Creditcoin. Then it binds the same shop on Sepolia so acknowledgements can be checked later.</p></div>
        <div className="listing-chain-sketch" aria-label="Two-chain listing sequence"><span>CREDITCOIN</span><i>1</i><b>Asset + title</b><em>then</em><span>SEPOLIA</span><i>2</i><b>Shop binding</b></div>
      </header>

      <TaskSteps steps={STEPS} current={wizardStep} />

      {checkpoint && mode === 'sepolia' && <Notice tone="due" title="Creditcoin listing is safe" consequence="The title already exists. Only its matching Sepolia shop registration remains." recovery="You can close this tab and return to this page on the same browser to finish later." />}
      {problem != null && <div className="notice-slot"><ErrorNotice error={problem} title="The listing flow paused" onRetry={mode === 'sepolia' && checkpoint ? () => void registerOnSepolia() : undefined} /></div>}

      {(mode === 'details' || mode === 'review') && (
        <div className="listing-workspace">
          <section className="task-panel task-panel-primary listing-form" aria-labelledby="listing-terms-title">
            <div className="task-panel-heading"><span className="task-step">01</span><div><h2 id="listing-terms-title">Purchase terms</h2><p>These values become the immutable reference used by later proofs.</p></div></div>
            <div className="listing-form-grid">
              <label className="field"><span>Asset kind</span><select value={kind} onChange={(event) => setKind(Number(event.target.value))}>{ASSET_KINDS.map((label, index) => <option value={index} key={label}>{label}</option>)}</select></label>
              <label className="field"><span>Installment amount · USDC</span><input inputMode="decimal" value={installment} onChange={(event) => setInstallment(event.target.value)} aria-invalid={attempted && Boolean(validation.installment)} />{attempted && validation.installment && <small className="field-error">{validation.installment}</small>}</label>
              <label className="field full"><span>Buyer address</span><input placeholder="0x…" value={buyer} onChange={(event) => setBuyer(event.target.value.trim())} aria-invalid={attempted && Boolean(validation.buyer)} />{attempted && validation.buyer && <small className="field-error">{validation.buyer}</small>}</label>
              <label className="field"><span>Creditcoin shop address</span><input placeholder="0x…" value={shopCtc} onChange={(event) => setShopCtc(event.target.value.trim())} aria-invalid={attempted && Boolean(validation.shopCtc)} />{attempted && validation.shopCtc && <small className="field-error">{validation.shopCtc}</small>}</label>
              <label className="field"><span>Sepolia shop address</span><input placeholder="0x…" value={shopSepolia} onChange={(event) => setShopSepolia(event.target.value.trim())} aria-invalid={attempted && Boolean(validation.shopSepolia)} />{attempted && validation.shopSepolia && <small className="field-error">{validation.shopSepolia}</small>}</label>
            </div>

            <div className="listing-schedule-builder">
              <div className="listing-subhead"><div><span className="mini-title">12 PAYMENT WINDOWS</span><h3>Build the deadline rhythm.</h3></div><p>The first deadline and cadence generate a strictly increasing schedule.</p></div>
              <div className="listing-generator-row">
                <label className="field"><span>First payment deadline</span><input type="datetime-local" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} /></label>
                <label className="field"><span>Cadence · days</span><input type="number" min="1" step="1" value={cadenceDays} onChange={(event) => setCadenceDays(event.target.value)} /></label>
                <Button variant="secondary" onClick={generateSchedule}>Generate 12 dates</Button>
              </div>
              {attempted && validation.windows && <p className="field-error">{validation.windows}</p>}
              <button className="listing-advanced-toggle" type="button" aria-expanded={advanced} onClick={() => setAdvanced((value) => !value)}>{advanced ? 'Hide individual deadlines' : 'Edit individual deadlines'} <span>{advanced ? '↑' : '↓'}</span></button>
              {advanced && <div className="listing-window-editor">{windows.map((value, index) => <label className="field" key={index}><span>Slice {String(index + 1).padStart(2, '0')}</span><input type="datetime-local" value={value} onChange={(event) => setWindows((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>)}</div>}
            </div>
            <div className="listing-form-actions"><Button onClick={openReview} disabled={!formValid && attempted}>Review immutable terms</Button><span>No wallet opens until after review.</span></div>
          </section>

          <aside className="task-panel task-review listing-review" aria-labelledby="listing-review-title">
            <div className="task-panel-heading"><span className="task-step task-step-note">{mode === 'review' ? '✓' : '→'}</span><div><h2 id="listing-review-title">Readable review</h2><p>Check both identities and the full schedule before signing.</p></div></div>
            <dl className="transaction-summary-list"><div><dt>Kind</dt><dd>{ASSET_KINDS[kind]}</dd></div><div><dt>Installment</dt><dd>{formatUnits(parsedInstallment, 6)} USDC</dd></div><div><dt>Buyer</dt><dd><code>{buyer || 'Not set'}</code></dd></div><div><dt>CTC shop</dt><dd><code>{shopCtc || 'Not set'}</code></dd></div><div><dt>Sepolia shop</dt><dd><code>{shopSepolia || 'Not set'}</code></dd></div></dl>
            <ol className="listing-review-windows">{windows.map((value, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span><time>{value ? new Date(value).toLocaleString() : 'Not set'}</time></li>)}</ol>
            <Notice tone="editorial" title="Two signatures, one durable checkpoint" consequence="Creditcoin is submitted first. If Sepolia fails, the confirmed title is preserved and this page offers Finish shop registration." />
            <SignerContext account={wallet.account} role="Listing caller" network="Creditcoin" contract={addresses.registry} />
            <div className="listing-review-actions"><LoadingButton onClick={() => void listOnCreditcoin()} disabled={!formValid || mode !== 'review'} loading={creditcoinStage !== 'idle' && creditcoinStage !== 'done'} loadingLabel="Creating title…">Create title on Creditcoin</LoadingButton>{mode === 'review' && <Button variant="quiet" onClick={() => setMode('details')}>Keep editing</Button>}</div>
          </aside>
        </div>
      )}

      {(mode === 'creditcoin' || mode === 'sepolia' || mode === 'complete') && checkpoint && <section className="listing-checkpoint" aria-labelledby="checkpoint-title"><div><span className="mini-title">DURABLE CHECKPOINT</span><h2 id="checkpoint-title">The asset exists on Creditcoin.</h2><p>The second chain cannot erase this confirmed listing.</p></div><IdentifierField kind="identifier" label="Asset ID" value={checkpoint.assetId} explorerHref={explorers.creditcoinTx(checkpoint.creditcoinTx)} explorerLabel="Listing transaction" /></section>}

      {(mode === 'creditcoin' || mode === 'sepolia' || mode === 'complete') && (
        <section className="listing-chain-progress" aria-label="Two-chain transaction progress">
          <WriteProgress chain="01 · Creditcoin listing" stage={creditcoinStage} />
          <div className="listing-chain-connector" aria-hidden="true">→</div>
          <WriteProgress chain="02 · Sepolia shop" stage={sepoliaStage} />
        </section>
      )}

      {mode === 'creditcoin' && !checkpoint && <section className="listing-signing-card"><Badge tone="due">Wallet flow active</Badge><h2>Creating the title on Creditcoin…</h2><p>Keep this page open through network confirmation. The asset ID comes from the confirmed Listed event.</p></section>}
      {creditcoinStage !== 'idle' && creditcoinStage !== 'done' && <ProgressStatus label={creditcoinStage === 'wallet' ? 'Connecting wallet…' : creditcoinStage === 'network' ? 'Switching to Creditcoin…' : creditcoinStage === 'signature' ? 'Waiting for listing signature…' : 'Confirming title creation…'} />}

      {mode === 'sepolia' && checkpoint && <section className="listing-finish-card"><div><span className="mini-title">SECOND CHAIN · RESUMABLE</span><h2>Finish shop registration.</h2><p>Relia will first compare the saved shop with the immutable Creditcoin record and the current Sepolia binding. Registration proceeds only when they agree.</p><AddressField label="Expected Sepolia shop" value={checkpoint.shopSepolia} explorerHref={explorers.sepoliaAddress(checkpoint.shopSepolia)} explorerLabel="Shop on Sepolia" /></div><div className="listing-finish-action"><Badge tone="due">Creditcoin confirmed</Badge><SignerContext account={wallet.account} role="Registration caller" network="Sepolia" contract={addresses.shopAck} /><ConfirmWriteAction title="Register this shop permanently?" consequence="This first-write binding has no replacement method. The address must match the already-confirmed Creditcoin title terms." confirmLabel="Confirm shop registration" loadingLabel={sepoliaStage === 'wallet' ? 'Connecting wallet…' : sepoliaStage === 'network' ? 'Switching to Sepolia…' : sepoliaStage === 'signature' ? 'Waiting for signature…' : 'Confirming registration…'} onConfirm={registerOnSepolia} busy={sepoliaStage !== 'idle' && sepoliaStage !== 'done'}><AddressField label="Shop to bind" value={checkpoint.shopSepolia} /></ConfirmWriteAction><small>Any caller may submit the first-write binding; the registered shop address must match the immutable terms.</small></div></section>}
      {sepoliaStage !== 'idle' && sepoliaStage !== 'done' && <ProgressStatus label={sepoliaStage === 'wallet' ? 'Connecting wallet…' : sepoliaStage === 'network' ? 'Switching to Sepolia…' : sepoliaStage === 'signature' ? 'Waiting for registration signature…' : 'Confirming shop registration…'} />}

      {mode === 'complete' && checkpoint && <section className="listing-complete" aria-labelledby="listing-complete-title"><Badge tone="live">Both chains confirmed</Badge><h1 id="listing-complete-title">The title is ready to use.</h1><p>Its terms live on Creditcoin and the matching shop is bound on Sepolia.</p><div className="listing-result-transactions"><TransactionField label="Creditcoin listing" value={checkpoint.creditcoinTx} explorerHref={explorers.creditcoinTx(checkpoint.creditcoinTx)} explorerLabel="View listing" />{checkpoint.sepoliaTx && <TransactionField label="Sepolia registration" value={checkpoint.sepoliaTx} explorerHref={explorers.sepoliaTx(checkpoint.sepoliaTx)} explorerLabel="View registration" />}</div><div className="listing-complete-actions"><Button href={`/assets/${checkpoint.assetId}`}>Open asset record</Button><Button variant="secondary" href={`/send?assetId=${checkpoint.assetId}&slice=1`}>Send first installment</Button><Button variant="secondary" href={`/title/${checkpoint.assetId}`}>Manage title</Button><Button variant="quiet" onClick={resetWizard}>List another asset</Button></div></section>}

      {!contractConfiguration.ready && <Notice tone="shortfall" title="Contract configuration incomplete" consequence={`Missing: ${contractConfiguration.missing.join(', ') || 'unknown configuration'}.`} recovery="Transaction controls remain unavailable until the public deployment variables are valid." />}
    </main>
  );
}
