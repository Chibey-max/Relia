'use client';

import { useEffect, useState } from 'react';
import { getInjectedProvider, readWallet } from '@/lib/wallet';

export interface WalletSnapshot {
  account: string | null;
  chainId: number | null;
  detected: boolean;
}

export function useWalletSnapshot(): WalletSnapshot {
  const [snapshot, setSnapshot] = useState<WalletSnapshot>({ account: null, chainId: null, detected: false });

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void readWallet().then((wallet) => {
        if (active) setSnapshot({ account: wallet?.account ?? null, chainId: wallet?.chainId ?? null, detected: true });
      }).catch(() => {
        if (active) setSnapshot({ account: null, chainId: null, detected: true });
      });
    };
    refresh();
    const provider = getInjectedProvider();
    const onChange = () => refresh();
    provider?.on?.('accountsChanged', onChange);
    provider?.on?.('chainChanged', onChange);
    window.addEventListener('relia:wallet-activity', onChange);
    return () => {
      active = false;
      provider?.removeListener?.('accountsChanged', onChange);
      provider?.removeListener?.('chainChanged', onChange);
      window.removeEventListener('relia:wallet-activity', onChange);
    };
  }, []);

  return snapshot;
}
