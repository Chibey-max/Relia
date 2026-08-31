/**
 * Resolves Attestcoin's internal chainKey for Sepolia.
 *
 * The original research table claimed `1`. In the SDK's own worked examples
 * chainKey 1 is Ethereum *Mainnet* and 2 is Binance Smart Chain, while another
 * example uses 11 — so `1` would have pointed Relia's proofs at the wrong
 * source chain entirely. Rather than verify a constant once and hope it never
 * moves, resolve it from the chain every time.
 */
import { JsonRpcProvider } from 'ethers';
import { chainInfo } from '@gluwa/usc-sdk';
import { config } from './config.js';
import { log } from './stages.js';

export async function resolveSourceChainKey(
  provider: JsonRpcProvider,
  expectedChainId: number,
): Promise<number> {
  const infoProvider = new chainInfo.PrecompileChainInfoProvider(
    provider,
    config.chainInfoPrecompile,
  );

  const chains = await infoProvider.getSupportedChains();
  const match = chains.find((c) => Number(c.chainId) === expectedChainId);

  if (!match) {
    throw new Error(
      `Sepolia (chainId ${expectedChainId}) is not in Attestcoin's supported chains. ` +
        `Supported: ${chains.map((c) => `key=${c.chainKey} chainId=${c.chainId}`).join(', ')}. ` +
        `Relia cannot prove anything from a source chain the protocol does not attest.`,
    );
  }

  return Number(match.chainKey);
}

/** `npm run chainkey` — prints the value to paste into .env before deploying. */
async function main(): Promise<void> {
  const provider = new JsonRpcProvider(config.creditcoinRpc);
  const key = await resolveSourceChainKey(provider, config.sepoliaChainId);
  log(`Sepolia (chainId ${config.sepoliaChainId}) has Attestcoin chainKey ${key}`);
  process.stdout.write(`SOURCE_CHAIN_KEY=${key}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    log('failed:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
