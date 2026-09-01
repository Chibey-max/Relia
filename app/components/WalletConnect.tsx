'use client';

import { useEffect, useState } from 'react';
import { explainError } from '@/lib/errors';
import { connectWallet, getInjectedProvider, readWallet, shortAddress, walletChains } from '@/lib/wallet';

function chainLabel(chainId: number | null): string {
  if (chainId === walletChains.sepolia.id) return 'Sepolia';
  if (chainId === walletChains.creditcoin.id) return 'Creditcoin';
  if (chainId === null) return 'No chain';
  return `Chain ${chainId}`;
}

export function WalletConnect() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    try {
      const state = await readWallet();
      setAccount(state?.account ?? null);
      setChainId(state?.chainId ?? null);
    } catch {
      setAccount(null);
      setChainId(null);
    }
  }

  useEffect(() => {
    void refresh();

    const provider = getInjectedProvider();
    if (!provider?.on) return;

    const onAccounts = (accounts: unknown) => {
      const [next] = Array.isArray(accounts) ? accounts : [];
      setAccount(typeof next === 'string' ? next : null);
    };
    const onChain = (nextChainId: unknown) => {
      if (typeof nextChainId === 'string') setChainId(Number(nextChainId));
    };

    provider.on('accountsChanged', onAccounts);
    provider.on('chainChanged', onChain);

    return () => {
      provider.removeListener?.('accountsChanged', onAccounts);
      provider.removeListener?.('chainChanged', onChain);
    };
  }, []);

  async function onConnect() {
    setBusy(true);
    setMessage('');
    try {
      const next = await connectWallet();
      setAccount(next.account);
      setChainId(next.chainId);
    } catch (error) {
      const detail = explainError(error);
      setMessage(`${detail.title}: ${detail.action}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wallet-widget">
      {account ? (
        <>
          <span className="wallet-chain">{chainLabel(chainId)}</span>
          <span className="wallet-account">{shortAddress(account)}</span>
        </>
      ) : (
        <button className="wallet-button" onClick={onConnect} disabled={busy}>
          {busy ? 'Connecting...' : 'Connect wallet'}
        </button>
      )}
      {message && <span className="wallet-message">{message}</span>}
    </div>
  );
}
