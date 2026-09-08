'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { explainError } from '@/lib/errors';
import { connectWallet, disconnectWallet, ensureChain, getInjectedProvider, readWallet, shortAddress, walletChains } from '@/lib/wallet';
import { CopyButton } from '@/components/CopyButton';

function chainLabel(chainId: number | null): string {
  if (chainId === walletChains.sepolia.id) return 'Sepolia';
  if (chainId === walletChains.creditcoin.id) return 'Creditcoin';
  if (chainId === null) return 'No chain';
  return `Chain ${chainId}`;
}

export function WalletConnect() {
  const pathname = usePathname();
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [phase, setPhase] = useState<'detecting' | 'idle' | 'opening' | 'approval' | 'switching' | 'connected' | 'unsupported' | 'error'>('detecting');
  const [message, setMessage] = useState('');
  const approvalTimerRef = useRef<number | undefined>(undefined);
  const expectedChain = pathname.startsWith('/send') ? walletChains.sepolia : pathname.startsWith('/tape') ? walletChains.creditcoin : null;
  const isPublicRead = !pathname.startsWith('/send');
  const wrongNetwork = Boolean(account && expectedChain && chainId !== expectedChain.id);

  async function refresh() {
    if (!getInjectedProvider()) {
      setAccount(null);
      setChainId(null);
      setPhase('unsupported');
      return;
    }
    try {
      const state = await readWallet();
      setAccount(state?.account ?? null);
      setChainId(state?.chainId ?? null);
      setPhase(state?.account ? 'connected' : 'idle');
    } catch {
      setAccount(null);
      setChainId(null);
      setPhase('idle');
    }
  }

  useEffect(() => {
    void refresh();

    const provider = getInjectedProvider();
    if (!provider?.on) return () => {
      if (approvalTimerRef.current !== undefined) window.clearTimeout(approvalTimerRef.current);
    };

    const onAccounts = (accounts: unknown) => {
      const [next] = Array.isArray(accounts) ? accounts : [];
      setAccount(typeof next === 'string' ? next : null);
      setPhase(typeof next === 'string' ? 'connected' : 'idle');
    };
    const onChain = (nextChainId: unknown) => {
      if (typeof nextChainId === 'string') {
        setChainId(Number(nextChainId));
        setPhase('connected');
      }
    };

    provider.on('accountsChanged', onAccounts);
    provider.on('chainChanged', onChain);
    const onActivity = (event: Event) => {
      const activity = (event as CustomEvent<'opening' | 'switching' | 'connected' | 'idle'>).detail;
      if (activity === 'connected') {
        void refresh();
        return;
      }
      setPhase(activity);
    };
    window.addEventListener('relia:wallet-activity', onActivity);

    return () => {
      provider.removeListener?.('accountsChanged', onAccounts);
      provider.removeListener?.('chainChanged', onChain);
      window.removeEventListener('relia:wallet-activity', onActivity);
      if (approvalTimerRef.current !== undefined) window.clearTimeout(approvalTimerRef.current);
    };
  }, []);

  async function onConnect() {
    setPhase('opening');
    setMessage('');
    approvalTimerRef.current = window.setTimeout(() => setPhase('approval'), 650);
    try {
      const next = await connectWallet();
      if (approvalTimerRef.current !== undefined) window.clearTimeout(approvalTimerRef.current);
      approvalTimerRef.current = undefined;
      setAccount(next.account);
      setChainId(next.chainId);
      setPhase('connected');
    } catch (error) {
      if (approvalTimerRef.current !== undefined) window.clearTimeout(approvalTimerRef.current);
      approvalTimerRef.current = undefined;
      const detail = explainError(error);
      setMessage(`${detail.title}: ${detail.action}`);
      setPhase('error');
    }
  }

  async function onSwitchNetwork() {
    if (!expectedChain) return;
    setPhase('switching');
    setMessage('');
    try {
      await ensureChain(expectedChain);
      await refresh();
    } catch (error) {
      const detail = explainError(error);
      setMessage(`${detail.title}: ${detail.action}`);
      setPhase('error');
    }
  }

  async function onDisconnect() {
    setMessage('');
    try {
      await disconnectWallet();
      setAccount(null);
      setChainId(null);
      setPhase('idle');
    } catch (error) {
      const detail = explainError(error);
      setMessage(`${detail.title}: ${detail.action}`);
      setPhase('error');
    }
  }

  const pending = phase === 'detecting' || phase === 'opening' || phase === 'approval' || phase === 'switching';
  const buttonLabel = phase === 'detecting' ? 'Detecting wallet…' : phase === 'opening' ? 'Opening wallet…' : phase === 'approval' ? 'Waiting for approval…' : phase === 'switching' ? 'Switching network…' : phase === 'unsupported' ? 'Wallet unavailable' : phase === 'error' ? 'Try wallet again' : 'Connect wallet';

  return (
    <div className={`wallet-widget ${isPublicRead ? 'wallet-widget-public' : 'wallet-widget-write'} ${wrongNetwork ? 'wallet-widget-wrong-network' : ''}`}>
      {account && !pending ? (
        <details className="wallet-menu">
          <summary className="wallet-identity" title={`${account} · ${chainLabel(chainId)}`} aria-label={`Wallet ${shortAddress(account)}, ${wrongNetwork ? `wrong network, expected ${expectedChain?.name}` : chainLabel(chainId)}`}>
            <span className="wallet-live-dot" aria-hidden="true" />
            <span>{shortAddress(account)}</span>
            <span className="wallet-network">{wrongNetwork ? 'Wrong network' : chainLabel(chainId)}</span>
            <span className="wallet-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="wallet-menu-panel">
            <div className="wallet-menu-head"><span className="type-label">CONNECTED WALLET</span><code>{account}</code></div>
            {wrongNetwork && <div className="wallet-network-warning" role="status"><strong>Switch to {expectedChain?.name}</strong><span>This route writes on {expectedChain?.name}.</span></div>}
            <div className="wallet-menu-actions">
              {wrongNetwork && <button type="button" onClick={onSwitchNetwork}>Switch network</button>}
              <CopyButton value={account} label="Copy address" />
              <button className="secondary wallet-disconnect" type="button" onClick={onDisconnect}>Disconnect</button>
            </div>
          </div>
        </details>
      ) : (
        <button className="wallet-button" onClick={onConnect} disabled={pending} aria-busy={pending} data-state={phase} title={phase === 'unsupported' ? 'Install MetaMask, Rabby, or another browser wallet.' : undefined}>
          {buttonLabel}
        </button>
      )}
      {message && <span className="wallet-message" role="alert">{message}</span>}
      <span className="sr-announcement" role="status" aria-live="polite" aria-atomic="true">
        {phase === 'connected' ? `Wallet connected on ${chainLabel(chainId)}.` : ''}
      </span>
    </div>
  );
}
