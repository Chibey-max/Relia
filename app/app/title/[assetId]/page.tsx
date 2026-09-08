'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { encodeFunctionData, getAddress, isAddress, type Hex } from 'viem';
import { ASSET_KINDS, registryAbi, titlePassAbi } from '@/lib/abi';
import { addresses, creditcoinClient, explorers } from '@/lib/chain';
import { connectWallet, getInjectedProvider, readWallet, walletClientFor, walletChains, type WalletActivity } from '@/lib/wallet';
import { ErrorNotice } from '@/components/ErrorNotice';
import { LoadingButton, LoadingMessage, ProgressStatus, TitleSkeleton } from '@/components/LoadingUI';
import { useLoadingTiming } from '@/lib/useLoadingTiming';
import { AddressField, Badge, Button, DataEmptyState, IdentifierField, Notice, TransactionField } from '@/components/ui';
import { SignerContext } from '@/components/SignerContext';

type WriteStage = 'idle' | 'wallet' | 'network' | 'signature' | 'confirmation';
type WriteAction = 'transfer' | 'token-approval' | 'operator-approval';

interface TitleMetadata {
  name: string;
  description: string;
  attributes: Array<{ trait_type: string; value: string | number; max_value?: number }>;
}

interface TitleRecord {
  kind: number;
  owner: Hex;
  approved: Hex;
  filled: number;
  cleared: boolean;
  tokenUri: string;
  metadata: TitleMetadata | null;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Hex;
const WRITE_STAGES: Array<{ key: Exclude<WriteStage, 'idle'>; label: string }> = [
  { key: 'wallet', label: 'Connect wallet' },
  { key: 'network', label: 'Switch to Creditcoin' },
  { key: 'signature', label: 'Approve signature' },
  { key: 'confirmation', label: 'Confirm on-chain' },
];

function parseMetadata(uri: string): TitleMetadata | null {
  const prefix = 'data:application/json;utf8,';
  if (!uri.startsWith(prefix)) return null;
  try { return JSON.parse(decodeURIComponent(uri.slice(prefix.length))) as TitleMetadata; } catch { return null; }
}

function normalizedAddress(value: string): Hex | null {
  if (!isAddress(value) || value.toLowerCase() === ZERO_ADDRESS) return null;
  try { return getAddress(value) as Hex; } catch { return null; }
}

export default function TitleOwnershipPage() {
  const writeLock = useRef(false);
  const params = useParams<{ assetId: string }>();
  const assetId = decodeURIComponent(params.assetId ?? '');
  const [title, setTitle] = useState<TitleRecord | null>(null);
  const [account, setAccount] = useState<Hex | null>(null);
  const [callerOperator, setCallerOperator] = useState(false);
  const [operatorApproved, setOperatorApproved] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [approvedAddress, setApprovedAddress] = useState('');
  const [operator, setOperator] = useState('');
  const [transferReview, setTransferReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [readError, setReadError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [stage, setStage] = useState<WriteStage>('idle');
  const [writeAction, setWriteAction] = useState<WriteAction | null>(null);
  const [result, setResult] = useState<{ label: string; hash: Hex } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const timing = useLoadingTiming(loading);

  const validAssetId = /^0x[0-9a-fA-F]{64}$/.test(assetId);
  const tokenId = validAssetId ? BigInt(assetId) : 0n;

  const readTitle = useCallback(async (): Promise<TitleRecord | null> => {
    if (!validAssetId) return null;
    const id = assetId as Hex;
    const exists = await creditcoinClient.readContract({ address: addresses.registry, abi: registryAbi, functionName: 'exists', args: [id] });
    if (!exists) return null;
    const [record, owner, approved, filled, cleared, tokenUri] = await Promise.all([
      creditcoinClient.readContract({ address: addresses.registry, abi: registryAbi, functionName: 'getAsset', args: [id] }),
      creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'ownerOf', args: [tokenId] }),
      creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'getApproved', args: [tokenId] }),
      creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'slicesFilled', args: [id] }),
      creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'isCleared', args: [id] }),
      creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'tokenURI', args: [tokenId] }),
    ]);
    return { kind: Number(record.kind), owner, approved, filled: Number(filled), cleared: Boolean(cleared), tokenUri, metadata: parseMetadata(tokenUri) };
  }, [assetId, tokenId, validAssetId]);

  useEffect(() => {
    if (!assetId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setReadError(null);
    void readTitle().then((next) => {
      if (cancelled) return;
      if (!next) setNotFound(true); else setTitle(next);
    }).catch((error) => { if (!cancelled) setReadError(error); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [assetId, readTitle, retryKey]);

  useEffect(() => {
    const refresh = async () => { const wallet = await readWallet().catch(() => null); setAccount(wallet?.account ?? null); };
    void refresh();
    const provider = getInjectedProvider();
    const changed = () => { void refresh(); };
    provider?.on?.('accountsChanged', changed);
    provider?.on?.('chainChanged', changed);
    window.addEventListener('relia:wallet-activity', changed);
    return () => { provider?.removeListener?.('accountsChanged', changed); provider?.removeListener?.('chainChanged', changed); window.removeEventListener('relia:wallet-activity', changed); };
  }, []);

  useEffect(() => {
    if (!title || !account) { setCallerOperator(false); return; }
    let cancelled = false;
    void creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'isApprovedForAll', args: [title.owner, account] }).then((approved) => { if (!cancelled) setCallerOperator(Boolean(approved)); }).catch(() => { if (!cancelled) setCallerOperator(false); });
    return () => { cancelled = true; };
  }, [account, title]);

  const operatorAddress = normalizedAddress(operator);
  useEffect(() => {
    if (!title || !operatorAddress) { setOperatorApproved(false); return; }
    let cancelled = false;
    void creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'isApprovedForAll', args: [title.owner, operatorAddress] }).then((approved) => { if (!cancelled) setOperatorApproved(Boolean(approved)); }).catch(() => { if (!cancelled) setOperatorApproved(false); });
    return () => { cancelled = true; };
  }, [operatorAddress, title]);

  const recipientAddress = normalizedAddress(recipient);
  const tokenApprovalAddress = normalizedAddress(approvedAddress);
  const isOwner = Boolean(account && title && account.toLowerCase() === title.owner.toLowerCase());
  const isTokenApproved = Boolean(account && title && title.approved.toLowerCase() === account.toLowerCase());
  const canTransfer = Boolean(title?.cleared && account && (isOwner || isTokenApproved || callerOperator));
  const canManageTokenApproval = Boolean(title?.cleared && account && (isOwner || callerOperator));
  const canManageOperators = Boolean(title?.cleared && isOwner);
  const busy = stage !== 'idle';
  const currentStage = stage === 'idle' ? -1 : WRITE_STAGES.findIndex((item) => item.key === stage);

  function trackWallet(activity: WalletActivity) {
    if (activity === 'opening') setStage('wallet');
    if (activity === 'switching') setStage('network');
  }

  async function refreshTitle() {
    const next = await readTitle();
    if (!next) throw new Error('The title could not be found after confirmation.');
    setTitle(next);
    return next;
  }

  async function submitWrite(action: WriteAction, prepare: (walletAccount: Hex) => Promise<Hex>, successLabel: string) {
    if (busy || writeLock.current) return;
    writeLock.current = true;
    setWriteAction(action);
    setActionError(null);
    setResult(null);
    setStage('wallet');
    try {
      const { client, account: walletAccount } = await walletClientFor(walletChains.creditcoin, trackWallet);
      const data = await prepare(walletAccount);
      setStage('signature');
      const hash = await client.sendTransaction({ account: walletAccount, to: addresses.titlePass, data });
      setStage('confirmation');
      const receipt = await creditcoinClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error(`${successLabel} reverted before confirmation.`);
      await refreshTitle();
      setResult({ label: successLabel, hash });
      if (action === 'transfer') { setRecipient(''); setTransferReview(false); }
      if (action === 'token-approval') setApprovedAddress('');
    } catch (error) {
      setActionError(error);
    } finally {
      writeLock.current = false;
      setStage('idle');
      setWriteAction(null);
    }
  }

  async function prepareAuthority(walletAccount: Hex, requireOwner = false) {
    if (!title?.cleared) throw new Error(`Soulbound(${tokenId}, ${title?.filled ?? 0})`);
    const [latestOwner, latestApproved] = await Promise.all([
      creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'ownerOf', args: [tokenId] }),
      creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'getApproved', args: [tokenId] }),
    ]);
    const operatorAuthority = await creditcoinClient.readContract({ address: addresses.titlePass, abi: titlePassAbi, functionName: 'isApprovedForAll', args: [latestOwner, walletAccount] });
    if (latestOwner.toLowerCase() !== title.owner.toLowerCase()) throw new Error('The connected transaction uses the wrong from address because the current title owner changed.');
    if (requireOwner && walletAccount.toLowerCase() !== latestOwner.toLowerCase()) throw new Error('The connected wallet is not the current title owner.');
    if (!requireOwner && walletAccount.toLowerCase() !== latestOwner.toLowerCase() && latestApproved.toLowerCase() !== walletAccount.toLowerCase() && !operatorAuthority) throw new Error('The connected wallet is not authorized to move this title.');
    return { latestOwner, operatorAuthority };
  }

  async function transferTitle() {
    if (!recipientAddress || !title || !canTransfer) return;
    await submitWrite('transfer', async (walletAccount) => {
      const { latestOwner } = await prepareAuthority(walletAccount);
      return encodeFunctionData({ abi: titlePassAbi, functionName: 'safeTransferFrom', args: [latestOwner, recipientAddress, tokenId] });
    }, 'Title transfer confirmed');
  }

  async function setTokenApproval(to: Hex) {
    if (!title || !canManageTokenApproval) return;
    await submitWrite('token-approval', async (walletAccount) => {
      const { latestOwner, operatorAuthority } = await prepareAuthority(walletAccount);
      if (walletAccount.toLowerCase() !== latestOwner.toLowerCase() && !operatorAuthority) throw new Error('The connected wallet is not authorized to approve this title.');
      return encodeFunctionData({ abi: titlePassAbi, functionName: 'approve', args: [to, tokenId] });
    }, to === ZERO_ADDRESS ? 'Token approval revoked' : 'Token approval confirmed');
  }

  async function setOperatorApproval(approved: boolean) {
    if (!operatorAddress || !title || !canManageOperators) return;
    await submitWrite('operator-approval', async (walletAccount) => {
      await prepareAuthority(walletAccount, true);
      return encodeFunctionData({ abi: titlePassAbi, functionName: 'setApprovalForAll', args: [operatorAddress, approved] });
    }, approved ? 'Operator approval confirmed' : 'Operator approval revoked');
  }

  const authorityLabel = isOwner ? 'Owner' : isTokenApproved ? 'Token-approved wallet' : callerOperator ? 'Approved operator' : 'Read-only visitor';

  return (
    <main className="task-main ownership-main">
      <header className="ownership-hero" data-reveal><div><div className="eyebrow"><span className="dot" />Title ownership</div><h1>{title ? `${ASSET_KINDS[title.kind] ?? 'Asset'} title pass` : 'Who can move this title?'}</h1><p className="lead">Read the on-chain pass, understand its authority, and manage it only after every payment slice is proven.</p></div><IdentifierField kind="identifier" label="Asset ID" value={assetId} explorerHref={explorers.creditcoinAddress(addresses.titlePass)} explorerLabel="TitlePass contract" /></header>

      {loading && <section className="ownership-loading" aria-busy="true">{timing.show && <><LoadingMessage network="Creditcoin" slow={timing.slow}>Reading title ownership and approvals…</LoadingMessage><TitleSkeleton /></>}{timing.prolonged && <Button variant="secondary" onClick={() => setRetryKey((key) => key + 1)}>Retry title read</Button>}</section>}
      {!loading && readError != null && <ErrorNotice error={readError} title="Could not read title ownership" onRetry={() => setRetryKey((key) => key + 1)} />}
      {!loading && notFound && <DataEmptyState symbol="?" title="Title not found" body={validAssetId ? 'No listed title exists for this asset ID.' : 'This URL does not contain a valid 32-byte asset ID.'} action={<Button href="/title" variant="secondary">Find another title</Button>} />}

      {!loading && title && <>
        <section className="ownership-status-grid" data-reveal>
          <article className="ownership-progress-card"><span className="mini-title">TITLE STATE</span><strong>{title.filled}<small> / 12 slices</small></strong><div className="asset-progress-track">{Array.from({ length: 12 }, (_, index) => <i className={index < title.filled ? 'filled' : ''} key={index} />)}</div><Badge tone={title.cleared ? 'live' : 'due'}>{title.cleared ? 'Cleared · transferable' : 'Soulbound · cannot move'}</Badge></article>
          <article className="ownership-authority-card"><div><span className="mini-title">CONNECTED AUTHORITY</span><h2>{authorityLabel}</h2><p>{account ? 'Authority is calculated from ownerOf, getApproved, and isApprovedForAll.' : 'Connect a wallet in the header to check whether it may manage this title.'}</p></div>{account ? <AddressField label="Connected account" value={account} explorerHref={explorers.creditcoinAddress(account)} /> : <Button variant="secondary" onClick={() => void connectWallet().then((wallet) => setAccount(wallet.account)).catch(setActionError)}>Connect wallet</Button>}</article>
        </section>

        <section className="ownership-facts" data-reveal><div className="asset-section-heading"><div><span className="mini-title">ON-CHAIN AUTHORITY</span><h2>Owner and approvals.</h2></div><p>Approvals are transfer authority, not cosmetic settings. They are cleared automatically after a transfer.</p></div><div className="ownership-address-grid"><AddressField label="Current owner" value={title.owner} explorerHref={explorers.creditcoinAddress(title.owner)} /><AddressField label="Single-token approval" value={title.approved} explorerHref={title.approved !== ZERO_ADDRESS ? explorers.creditcoinAddress(title.approved) : undefined} /><div className="ownership-operator-fact"><span className="type-label">CONNECTED WALLET · OPERATOR APPROVAL</span><strong>{account ? callerOperator ? 'Approved for all owner titles' : 'Not approved as operator' : 'Connect to check'}</strong></div></div></section>

        <section className="ownership-metadata" data-reveal><div><span className="mini-title">ON-CHAIN TOKEN URI</span><h2>A pass that explains itself.</h2><p>{title.metadata?.description ?? 'The token URI was returned, but its embedded JSON could not be parsed.'}</p></div>{title.metadata && <div className="ownership-metadata-paper"><strong>{title.metadata.name}</strong><dl>{title.metadata.attributes.map((attribute) => <div key={attribute.trait_type}><dt>{attribute.trait_type}</dt><dd>{attribute.value}{attribute.max_value ? ` / ${attribute.max_value}` : ''}</dd></div>)}</dl><details><summary>Raw token URI</summary><code>{title.tokenUri}</code></details></div>}</section>

        {!title.cleared && <Notice tone="due" title="Title remains soulbound" consequence={`Only ${title.filled} of 12 slices are proven. TitlePass refuses transfer and single-token approval until the twelfth slice is live.`} recovery="Payments and proofs must complete first. No wallet action on this screen can bypass that contract rule." actions={<Button href={`/assets/${assetId}`} variant="secondary" size="compact">Open payment record</Button>} />}

        {title.cleared && <section className="ownership-controls" data-reveal>
          <div className="ownership-control-heading"><div><span className="mini-title">CLEARED TITLE CONTROLS</span><h2>Move or delegate carefully.</h2></div><Badge tone="live">Contract gate open</Badge></div>
          <SignerContext account={account} requiredLabel="Owner or approved operator" authorized={canTransfer} role="TitlePass signer" network="Creditcoin" contract={addresses.titlePass} />
          {!account && <Notice tone="neutral" title="Wallet required" consequence="Connect a wallet to calculate management authority." recovery="Public ownership and metadata remain visible without a wallet." />}
          {account && !canTransfer && <Notice tone="disputed" title="Read-only wallet" consequence="The connected wallet is not the owner, token-approved address, or an approved operator." recovery="Connect an authorized wallet before preparing a transfer." />}

          {canTransfer && <article className="ownership-action-card ownership-transfer"><div><span className="mini-title">TRANSFER</span><h3>Choose the next owner.</h3><p>The recipient becomes the on-chain owner immediately after confirmation.</p></div><div><label className="field"><span>Recipient address</span><input placeholder="0x…" value={recipient} onChange={(event) => { setRecipient(event.target.value.trim()); setTransferReview(false); }} aria-invalid={recipient.length > 0 && !recipientAddress} /></label>{recipient.length > 0 && !recipientAddress && <small className="field-error">Enter a valid, non-zero address. Mixed-case addresses must have a valid checksum.</small>}<Button onClick={() => setTransferReview(true)} disabled={!recipientAddress || busy}>Review transfer</Button></div></article>}

          {transferReview && recipientAddress && title && <article className="ownership-transfer-review"><Badge tone="due">Final review</Badge><h3>This changes the title owner.</h3><div className="ownership-review-grid"><IdentifierField kind="identifier" label="Asset" value={assetId} /><AddressField label="Current owner" value={title.owner} /><AddressField label="Recipient" value={recipientAddress} /></div><div className="ownership-review-actions"><LoadingButton onClick={() => void transferTitle()} loading={busy && writeAction === 'transfer'} loadingLabel="Completing transfer…" disabled={busy && writeAction !== 'transfer'}>Confirm title transfer</LoadingButton><Button variant="quiet" onClick={() => setTransferReview(false)} disabled={busy}>Cancel</Button></div></article>}

          {canManageTokenApproval && <article className="ownership-action-card"><div><span className="mini-title">SINGLE-TOKEN APPROVAL</span><h3>Delegate this title only.</h3><p>The approved address can transfer this cleared title. A successful transfer clears this approval.</p></div><div><label className="field"><span>Approved address</span><input placeholder="0x…" value={approvedAddress} onChange={(event) => setApprovedAddress(event.target.value.trim())} aria-invalid={approvedAddress.length > 0 && !tokenApprovalAddress} /></label><div className="ownership-inline-actions"><LoadingButton className="secondary" onClick={() => tokenApprovalAddress && void setTokenApproval(tokenApprovalAddress)} disabled={!tokenApprovalAddress || busy} loading={busy && writeAction === 'token-approval'} loadingLabel="Updating approval…">Approve address</LoadingButton>{title.approved !== ZERO_ADDRESS && <LoadingButton className="secondary" onClick={() => void setTokenApproval(ZERO_ADDRESS)} disabled={busy} loading={busy && writeAction === 'token-approval'} loadingLabel="Revoking approval…">Revoke current approval</LoadingButton>}</div></div></article>}

          {canManageOperators && <article className="ownership-action-card"><div><span className="mini-title">OPERATOR APPROVAL</span><h3>Delegate all of your titles.</h3><p>This is broader than a token approval: the operator can move any cleared TitlePass you own.</p></div><div><label className="field"><span>Operator address</span><input placeholder="0x…" value={operator} onChange={(event) => setOperator(event.target.value.trim())} aria-invalid={operator.length > 0 && (!operatorAddress || operatorAddress.toLowerCase() === title.owner.toLowerCase())} /></label>{operatorAddress?.toLowerCase() === title.owner.toLowerCase() && <small className="field-error">The owner does not need to approve itself.</small>}<div className="ownership-inline-actions"><LoadingButton className="secondary" onClick={() => void setOperatorApproval(true)} disabled={!operatorAddress || operatorAddress.toLowerCase() === title.owner.toLowerCase() || operatorApproved || busy} loading={busy && writeAction === 'operator-approval'} loadingLabel="Updating operator…">Approve operator</LoadingButton><LoadingButton className="secondary" onClick={() => void setOperatorApproval(false)} disabled={!operatorAddress || !operatorApproved || busy} loading={busy && writeAction === 'operator-approval'} loadingLabel="Revoking operator…">Revoke operator</LoadingButton></div>{operatorAddress && <small className="field-help">Current state: {operatorApproved ? 'approved' : 'not approved'} for all titles owned by this address.</small>}</div></article>}

          <Notice tone="disputed" title="Approval is transfer authority" consequence="An approved address can move a cleared title without another owner signature." recovery="Approve only addresses you control or trust, and revoke access when it is no longer needed." />
        </section>}

        {stage !== 'idle' && <ol className="ownership-write-progress" aria-label="Title transaction progress" aria-live="polite">{WRITE_STAGES.map((item, index) => <li data-state={index < currentStage ? 'done' : index === currentStage ? 'active' : 'pending'} key={item.key}><i>{index < currentStage ? '✓' : index + 1}</i><span>{item.label}</span></li>)}</ol>}
        {stage !== 'idle' && <ProgressStatus label={stage === 'wallet' ? 'Connecting wallet…' : stage === 'network' ? 'Switching to Creditcoin…' : stage === 'signature' ? 'Waiting for title signature…' : 'Confirming title action…'} />}
        {actionError != null && <ErrorNotice error={actionError} title="Title action did not complete" />}
        {result && <section className="durable-result ownership-result"><Badge tone="live">Confirmed</Badge><div><strong>{result.label}</strong><TransactionField label="Creditcoin transaction" value={result.hash} explorerHref={explorers.creditcoinTx(result.hash)} explorerLabel="View confirmation" /></div></section>}
      </>}
    </main>
  );
}
