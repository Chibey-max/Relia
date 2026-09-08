import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') throw new Error(`Missing required env var: ${name}`);
  return v.trim();
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : fallback;
}

export const config = {
  sepoliaRpc: required('SEPOLIA_RPC_URL'),
  sepoliaChainId: Number(optional('SEPOLIA_CHAIN_ID', '11155111')),

  paySink: required('SEPOLIA_PAY_SINK'),
  shopAck: required('SEPOLIA_SHOP_ACK'),

  creditcoinRpc: required('CREDITCOIN_RPC_URL'),
  proofBuilderUrl: optional(
    'CREDITCOIN_PROOF_BUILDER_URL',
    'https://prover.cc3-testnet.creditcoin.network',
  ),
  chainInfoPrecompile: optional(
    'CREDITCOIN_CHAIN_INFO',
    '0x0000000000000000000000000000000000000fD3',
  ),
  proofConsumer: required('CTC_PROOF_CONSUMER'),

  /** Blank means "resolve it from the chain", which is the recommended mode. */
  sourceChainKey: process.env.SOURCE_CHAIN_KEY?.trim()
    ? Number(process.env.SOURCE_CHAIN_KEY)
    : null,

  workerKey: required('WORKER_PRIVATE_KEY'),

  fromBlock: Number(optional('WORKER_FROM_BLOCK', '0')),
  pollIntervalMs: Number(optional('WORKER_POLL_INTERVAL_MS', '12000')),
  attestationTimeoutMs: Number(optional('ATTESTATION_TIMEOUT_MS', '900000')),
  statusPort: Number(optional('WORKER_STATUS_PORT', '8787')),
  statusOrigin: optional('WORKER_STATUS_ORIGIN', 'http://localhost:3000'),
};

export type Config = typeof config;
