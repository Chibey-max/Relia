import { createPublicClient, defineChain, http } from 'viem';
import { sepolia } from 'viem/chains';

const env = (k: string, fallback = ''): string => process.env[k] ?? fallback;

export const creditcoinTestnet = defineChain({
  id: Number(env('NEXT_PUBLIC_CREDITCOIN_CHAIN_ID', '102031')),
  name: 'Creditcoin Testnet',
  nativeCurrency: { name: 'Creditcoin', symbol: 'tCTC', decimals: 18 },
  rpcUrls: {
    default: {
      http: [env('NEXT_PUBLIC_CREDITCOIN_RPC', 'https://rpc.cc3-testnet.creditcoin.network')],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: env('NEXT_PUBLIC_CREDITCOIN_EXPLORER', 'https://creditcoin-testnet.blockscout.com'),
    },
  },
});

/**
 * Read-only client for Creditcoin. /verify uses this and nothing else: no
 * wallet, no backend, no indexer. If a page needs a connected account to show
 * you a receipt, the receipt is not really public.
 */
export const creditcoinClient = createPublicClient({
  chain: creditcoinTestnet,
  transport: http(),
});

export const sepoliaChain = sepolia;

export const deployBlock: bigint | 'earliest' = process.env.NEXT_PUBLIC_CTC_DEPLOY_BLOCK
  ? BigInt(process.env.NEXT_PUBLIC_CTC_DEPLOY_BLOCK)
  : 'earliest';

export const addresses = {
  registry: env('NEXT_PUBLIC_CTC_ASSET_REGISTRY') as `0x${string}`,
  tape: env('NEXT_PUBLIC_CTC_SHORTFALL_TAPE') as `0x${string}`,
  titlePass: env('NEXT_PUBLIC_CTC_TITLE_PASS') as `0x${string}`,
  consumer: env('NEXT_PUBLIC_CTC_PROOF_CONSUMER') as `0x${string}`,
  usdc: env('NEXT_PUBLIC_SEPOLIA_USDC') as `0x${string}`,
  paySink: env('NEXT_PUBLIC_SEPOLIA_PAY_SINK') as `0x${string}`,
  shopAck: env('NEXT_PUBLIC_SEPOLIA_SHOP_ACK') as `0x${string}`,
};

export const explorers = {
  sepoliaTx: (h: string) =>
    `${env('NEXT_PUBLIC_SEPOLIA_EXPLORER', 'https://sepolia.etherscan.io')}/tx/${h}`,
  creditcoinTx: (h: string) =>
    `${env('NEXT_PUBLIC_CREDITCOIN_EXPLORER', 'https://creditcoin-testnet.blockscout.com')}/tx/${h}`,
  creditcoinAddress: (a: string) =>
    `${env('NEXT_PUBLIC_CREDITCOIN_EXPLORER', 'https://creditcoin-testnet.blockscout.com')}/address/${a}`,
};
