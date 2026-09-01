'use client';

import { createWalletClient, custom, numberToHex, type Chain, type Hex } from 'viem';
import { creditcoinTestnet, sepoliaChain } from './chain';

export interface InjectedProvider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export interface ConnectedWallet {
  account: Hex;
  chainId: number;
}

export function getInjectedProvider(): InjectedProvider | null {
  if (typeof window === 'undefined') return null;
  const provider = (window as { ethereum?: InjectedProvider }).ethereum;
  return provider ?? null;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function readWallet(): Promise<ConnectedWallet | null> {
  const provider = getInjectedProvider();
  if (!provider) return null;

  const [accounts, chainId] = await Promise.all([
    provider.request({ method: 'eth_accounts' }) as Promise<Hex[]>,
    provider.request({ method: 'eth_chainId' }) as Promise<Hex>,
  ]);

  const account = accounts[0];
  if (!account) return null;
  return { account, chainId: Number(chainId) };
}

export async function connectWallet(): Promise<ConnectedWallet> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error('No injected wallet found. Install MetaMask, Rabby, or another EIP-1193 wallet.');
  }

  const accounts = await provider.request({ method: 'eth_requestAccounts' }) as Hex[];
  const chainId = await provider.request({ method: 'eth_chainId' }) as Hex;
  const account = accounts[0];
  if (!account) throw new Error('No wallet account was authorized.');

  return { account, chainId: Number(chainId) };
}

export async function ensureChain(chain: Chain): Promise<void> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error('No injected wallet found. Install MetaMask, Rabby, or another EIP-1193 wallet.');
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: numberToHex(chain.id) }],
    });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? Number((error as { code: unknown }).code)
      : undefined;

    if (code !== 4902) throw error;

    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: numberToHex(chain.id),
        chainName: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: chain.rpcUrls.default.http,
        blockExplorerUrls: chain.blockExplorers?.default ? [chain.blockExplorers.default.url] : undefined,
      }],
    });
  }
}

export async function walletClientFor(chain: Chain) {
  await connectWallet();
  await ensureChain(chain);
  const provider = getInjectedProvider();
  if (!provider) throw new Error('Wallet disconnected.');

  const client = createWalletClient({ chain, transport: custom(provider as never) });
  const [account] = await client.getAddresses();
  if (!account) throw new Error('No wallet account was authorized.');

  return { client, account };
}

export const walletChains = {
  sepolia: sepoliaChain,
  creditcoin: creditcoinTestnet,
};
