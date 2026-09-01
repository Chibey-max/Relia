import { createPublicClient, defineChain, http } from 'viem';
import { sepolia } from 'viem/chains';

/**
 * Next.js only inlines `NEXT_PUBLIC_*` vars into the client bundle when they
 * appear as literal `process.env.NEXT_PUBLIC_X` member expressions — a
 * dynamic `process.env[key]` lookup is invisible to its build-time replace
 * step, so every value below silently reads back empty in the browser. Keep
 * each one spelled out literally, even though it's repetitive.
 */
export const creditcoinTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CREDITCOIN_CHAIN_ID ?? '102031'),
  name: 'Creditcoin Testnet',
  nativeCurrency: { name: 'Creditcoin', symbol: 'tCTC', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_CREDITCOIN_RPC ?? 'https://rpc.cc3-testnet.creditcoin.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER ?? 'https://creditcoin-testnet.blockscout.com',
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
  registry: (process.env.NEXT_PUBLIC_CTC_ASSET_REGISTRY ?? '') as `0x${string}`,
  tape: (process.env.NEXT_PUBLIC_CTC_SHORTFALL_TAPE ?? '') as `0x${string}`,
  titlePass: (process.env.NEXT_PUBLIC_CTC_TITLE_PASS ?? '') as `0x${string}`,
  consumer: (process.env.NEXT_PUBLIC_CTC_PROOF_CONSUMER ?? '') as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_SEPOLIA_USDC ?? '') as `0x${string}`,
  paySink: (process.env.NEXT_PUBLIC_SEPOLIA_PAY_SINK ?? '') as `0x${string}`,
  shopAck: (process.env.NEXT_PUBLIC_SEPOLIA_SHOP_ACK ?? '') as `0x${string}`,
};

const sepoliaExplorer = process.env.NEXT_PUBLIC_SEPOLIA_EXPLORER ?? 'https://sepolia.etherscan.io';
const creditcoinExplorer = process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER ?? 'https://creditcoin-testnet.blockscout.com';

export const explorers = {
  sepoliaTx: (h: string) => `${sepoliaExplorer}/tx/${h}`,
  creditcoinTx: (h: string) => `${creditcoinExplorer}/tx/${h}`,
  creditcoinAddress: (a: string) => `${creditcoinExplorer}/address/${a}`,
};
