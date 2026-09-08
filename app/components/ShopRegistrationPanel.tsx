'use client';

import { useCallback, useEffect, useState } from 'react';
import { encodeFunctionData, type Hex } from 'viem';
import { registryAbi, shopAckAbi } from '@/lib/abi';
import { addresses, creditcoinClient, explorers, isConfiguredContractAddress, sepoliaClient } from '@/lib/chain';
import { walletClientFor, walletChains, type WalletActivity } from '@/lib/wallet';
import { ErrorNotice } from '@/components/ErrorNotice';
import { LoadingMessage, ProgressStatus } from '@/components/LoadingUI';
import { AddressField, Badge, Notice, TransactionField } from '@/components/ui';
import { SignerContext } from '@/components/SignerContext';
import { useWalletSnapshot } from '@/lib/useWalletSnapshot';
import { ConfirmWriteAction } from '@/components/ConfirmWriteAction';

type RegistrationStage = 'idle' | 'wallet' | 'network' | 'signature' | 'confirmation';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const STAGE_LABELS: Record<Exclude<RegistrationStage, 'idle'>, string> = {
  wallet: 'Connecting wallet…',
  network: 'Switching to Sepolia…',
  signature: 'Waiting for signature…',
  confirmation: 'Confirming registration…',
};

export function ShopRegistrationPanel({ assetId, expectedShop }: { assetId: Hex; expectedShop: Hex }) {
  const wallet = useWalletSnapshot();
  const [binding, setBinding] = useState<Hex | null>(null);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [stage, setStage] = useState<RegistrationStage>('idle');
  const [transaction, setTransaction] = useState<Hex | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const readBinding = useCallback(async (cancelled?: () => boolean) => {
    setLoading(true);
    setReadError(null);
    try {
      const current = await sepoliaClient.readContract({ address: addresses.shopAck, abi: shopAckAbi, functionName: 'shopOf', args: [assetId] });
      if (!cancelled?.()) setBinding(current);
    } catch (error) {
      if (!cancelled?.()) {
        setBinding(null);
        setReadError(error);
      }
    } finally {
      if (!cancelled?.()) setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    let cancelled = false;
    if (!isConfiguredContractAddress(addresses.shopAck)) {
      setLoading(false);
      setReadError(new Error('The Sepolia shop acknowledgement contract is not configured.'));
      return;
    }
    void readBinding(() => cancelled);
    return () => { cancelled = true; };
  }, [readBinding, retryKey]);

  function trackWallet(activity: WalletActivity) {
    if (activity === 'opening') setStage('wallet');
    if (activity === 'switching') setStage('network');
  }

  async function register() {
    if (loading || binding !== ZERO_ADDRESS || stage !== 'idle') return;
    setActionError(null);
    setTransaction(null);
    setStage('wallet');
    try {
      const [record, latestBinding] = await Promise.all([
        creditcoinClient.readContract({ address: addresses.registry, abi: registryAbi, functionName: 'getAsset', args: [assetId] }),
        sepoliaClient.readContract({ address: addresses.shopAck, abi: shopAckAbi, functionName: 'shopOf', args: [assetId] }),
      ]);
      if (record.shopSepolia.toLowerCase() !== expectedShop.toLowerCase()) throw new Error('Registration refused: the proposed shop does not match the immutable Creditcoin registry binding.');
      if (latestBinding.toLowerCase() !== ZERO_ADDRESS) {
        setBinding(latestBinding);
        if (latestBinding.toLowerCase() !== expectedShop.toLowerCase()) throw new Error(`Registration refused: this asset is already bound to ${latestBinding} on Sepolia.`);
        return;
      }

      const { client, account } = await walletClientFor(walletChains.sepolia, trackWallet);
      setStage('signature');
      const hash = await client.sendTransaction({
        account,
        to: addresses.shopAck,
        data: encodeFunctionData({ abi: shopAckAbi, functionName: 'registerShop', args: [assetId, expectedShop] }),
      });
      setStage('confirmation');
      const receipt = await sepoliaClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('The Sepolia shop registration reverted before confirmation.');
      const confirmed = await sepoliaClient.readContract({ address: addresses.shopAck, abi: shopAckAbi, functionName: 'shopOf', args: [assetId] });
      if (confirmed.toLowerCase() !== expectedShop.toLowerCase()) throw new Error(`Registration confirmed an unexpected shop binding: ${confirmed}.`);
      setBinding(confirmed);
      setTransaction(hash);
    } catch (error) {
      setActionError(error);
    } finally {
      setStage('idle');
    }
  }

  const matched = binding?.toLowerCase() === expectedShop.toLowerCase();
  const conflict = binding !== null && binding !== ZERO_ADDRESS && !matched;
  const unregistered = binding === ZERO_ADDRESS;

  return (
    <section className="shop-registration-panel" aria-labelledby="shop-registration-title" data-reveal>
      <div className="shop-registration-heading">
        <div><span className="mini-title">SEPOLIA SHOP BINDING</span><h2 id="shop-registration-title">Match the shop across chains.</h2></div>
        {!loading && !readError && <Badge tone={matched ? 'live' : conflict ? 'shortfall' : 'due'}>{matched ? 'Registered' : conflict ? 'Binding conflict' : 'Registration needed'}</Badge>}
      </div>

      <p className="shop-registration-intro">Creditcoin names the shop that later acknowledgements must match. Sepolia stores the same address once, and does not provide a replacement function.</p>

      {loading && <div className="shop-registration-loading" aria-busy="true"><LoadingMessage network="Sepolia">Checking the current shop binding…</LoadingMessage></div>}
      {!loading && readError != null && <ErrorNotice error={readError} title="Could not read the Sepolia shop binding" onRetry={() => setRetryKey((key) => key + 1)} />}

      {!loading && !readError && matched && <div className="shop-binding-state shop-binding-matched"><Badge tone="live">Cross-chain match</Badge><div><strong>The expected shop is already registered.</strong><p>No recovery transaction is needed.</p></div></div>}

      {!loading && !readError && conflict && binding && <Notice tone="shortfall" title="Registration conflict" consequence="Sepolia is already bound to a different address. Relia will not attempt another registration because the binding is first-write and immutable." recovery="Compare the two addresses and inspect the deployment before accepting acknowledgements for this asset." technicalDetails={<><AddressField label="Creditcoin expects" value={expectedShop} explorerHref={explorers.sepoliaAddress(expectedShop)} /><AddressField label="Sepolia contains" value={binding} explorerHref={explorers.sepoliaAddress(binding)} /></>} />}

      {!loading && !readError && unregistered && (
        <div className="shop-binding-state shop-binding-open">
          <div><Badge tone="due">Not registered on Sepolia</Badge><h3>Finish the asset’s shop binding.</h3><p>This is an immutable first-write. Relia rechecks the Creditcoin record and Sepolia state immediately before opening the wallet.</p></div>
          <div className="shop-registration-action"><AddressField label="Shop to register" value={expectedShop} explorerHref={explorers.sepoliaAddress(expectedShop)} /><SignerContext account={wallet.account} role="Registration caller" network="Sepolia" contract={addresses.shopAck} /><ConfirmWriteAction title="Register this shop permanently?" consequence="ReliaShopAck accepts the first binding for this asset and provides no replacement method. Relia will recheck both chains before opening the wallet." confirmLabel="Confirm shop registration" loadingLabel={stage === 'idle' ? 'Registering…' : STAGE_LABELS[stage]} onConfirm={register} busy={stage !== 'idle'}><AddressField label="Immutable Sepolia shop" value={expectedShop} /></ConfirmWriteAction><small>Any connected account may submit this testnet registration, but the stored shop must exactly match the Creditcoin terms.</small></div>
        </div>
      )}

      {stage !== 'idle' && <ProgressStatus label={STAGE_LABELS[stage]} detail="The binding panel will refresh after confirmation." />}

      {actionError != null && <div className="notice-slot"><ErrorNotice error={actionError} title="Shop registration did not complete" onRetry={unregistered ? () => void register() : undefined} /></div>}
      {transaction && <div className="durable-result"><Badge tone="live">Confirmed</Badge><div><strong>Matching shop registered on Sepolia</strong><TransactionField label="Registration transaction" value={transaction} explorerHref={explorers.sepoliaTx(transaction)} explorerLabel="View on Etherscan" /></div></div>}
      <a className="shop-contract-link" href={explorers.sepoliaAddress(addresses.shopAck)} target="_blank" rel="noreferrer">ReliaShopAck contract ↗</a>
    </section>
  );
}
