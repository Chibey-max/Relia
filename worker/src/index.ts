/**
 * Relia worker.
 *
 * Watches Sepolia for a payment and its acknowledgement, pairs them, waits for
 * the later block to be attested, asks the proof builder for one batch proof
 * covering both, and submits it to ProofConsumer on Creditcoin.
 *
 * It has no custody of anything. It holds no user funds, has no authority over
 * anyone's money, and cannot make a payment or an acknowledgement happen. If it
 * disappears, every fact it was going to prove is still on Sepolia and anyone
 * can prove it instead. Its only privilege is paying gas.
 */
import { Contract, JsonRpcProvider, Wallet, type Log } from 'ethers';
import { proofProvider } from '@gluwa/usc-sdk';
import type { BatchContinuityResponse, BatchMerkleProofEntry } from '@gluwa/usc-sdk/dist/proof-provider/index.js';

import { config } from './config.js';
import { PAY_SINK_ABI, SHOP_ACK_ABI, PROOF_CONSUMER_ABI } from './abi.js';
import { resolveSourceChainKey } from './chainkey.js';
import { decodeRefusal } from './refusals.js';
import { failure, log, stage } from './stages.js';

interface Seen {
  txHash: string;
  blockNumber: number;
}

interface Pair {
  assetId: string;
  n: number;
  pay?: Seen;
  ack?: Seen;
  /** Set once submitted or found already consumed, so we never resubmit. */
  done?: boolean;
}

const pairs = new Map<string, Pair>();

const keyOf = (assetId: string, n: number): string => `${assetId.toLowerCase()}:${n}`;

async function main(): Promise<void> {
  const sepolia = new JsonRpcProvider(config.sepoliaRpc);
  const creditcoin = new JsonRpcProvider(config.creditcoinRpc);
  const wallet = new Wallet(config.workerKey, creditcoin);

  const chainKey =
    config.sourceChainKey ?? (await resolveSourceChainKey(creditcoin, config.sepoliaChainId));

  const consumer = new Contract(config.proofConsumer, PROOF_CONSUMER_ABI, wallet);

  // The consumer was deployed against one chainKey. If the worker resolved a
  // different one, every proof would be built for the wrong source chain and
  // rejected — better to say so now than to fail obscurely later.
  const onChainKey = Number(await consumer.getFunction('sourceChainKey')());
  if (onChainKey !== chainKey) {
    throw new Error(
      `chainKey mismatch: ProofConsumer was deployed with ${onChainKey}, ` +
        `but Sepolia resolves to ${chainKey}. Redeploy the consumer or fix SOURCE_CHAIN_KEY.`,
    );
  }

  const builder = new proofProvider.service.ProofBuilder(chainKey, config.proofBuilderUrl);

  const paySink = new Contract(config.paySink, PAY_SINK_ABI, sepolia);
  const shopAck = new Contract(config.shopAck, SHOP_ACK_ABI, sepolia);

  const latest = await sepolia.getBlockNumber();
  let cursor = config.fromBlock > 0 ? config.fromBlock : latest;

  log(`relia worker up`);
  log(`  sepolia      ${config.paySink} / ${config.shopAck}`);
  log(`  creditcoin   ${config.proofConsumer}`);
  log(`  chainKey     ${chainKey} (resolved, not assumed)`);
  log(`  from block   ${cursor}`);

  for (;;) {
    try {
      const head = await sepolia.getBlockNumber();
      if (head >= cursor) {
        await scan(paySink, shopAck, cursor, head);
        cursor = head + 1;
      }
      await drain(builder, consumer, chainKey);
    } catch (e) {
      log('loop error:', e instanceof Error ? e.message : String(e));
    }
    await sleep(config.pollIntervalMs);
  }
}

async function scan(
  paySink: Contract,
  shopAck: Contract,
  from: number,
  to: number,
): Promise<void> {
  const paid = await paySink.queryFilter(paySink.filters.Paid!(), from, to);
  for (const ev of paid) {
    record(ev as Log & { args: unknown[] }, 'pay');
  }

  const acked = await shopAck.queryFilter(shopAck.filters.Acked!(), from, to);
  for (const ev of acked) {
    record(ev as Log & { args: unknown[] }, 'ack');
  }
}

function record(ev: Log & { args: unknown[] }, kind: 'pay' | 'ack'): void {
  const assetId = String(ev.args[0]);
  const n = Number(ev.args[1]);
  const k = keyOf(assetId, n);

  const pair = pairs.get(k) ?? { assetId, n };
  pair[kind] = { txHash: ev.transactionHash, blockNumber: ev.blockNumber };
  pairs.set(k, pair);

  if (kind === 'pay') {
    stage('sepolia_mined', assetId, n, { payTx: ev.transactionHash, block: ev.blockNumber });
  } else {
    stage('ack_located', assetId, n, { ackTx: ev.transactionHash, block: ev.blockNumber });
  }
}

async function drain(
  builder: InstanceType<typeof proofProvider.service.ProofBuilder>,
  consumer: Contract,
  chainKey: number,
): Promise<void> {
  for (const [k, pair] of pairs) {
    if (pair.done || !pair.pay || !pair.ack) continue;

    try {
      await submit(builder, consumer, chainKey, pair);
      pair.done = true;
    } catch (e) {
      const refusal = decodeRefusal(e);

      if (refusal) {
        // A refusal is a verdict, not a transient fault. Retrying it would
        // just burn gas on the same answer.
        failure('verified', pair.assetId, pair.n, refusal.sentence, refusal.name);
        pair.done = true;
        continue;
      }

      const msg = e instanceof Error ? e.message : String(e);
      if (/timeout|Timeout/.test(msg)) {
        // The attestation window is minutes long by design. Not a crash.
        log(`attestation not ready for ${k}; will retry next pass`);
        failure('attested', pair.assetId, pair.n, 'attestation not ready yet, retrying');
        continue;
      }

      failure('error', pair.assetId, pair.n, msg);
    }
  }
}

async function submit(
  builder: InstanceType<typeof proofProvider.service.ProofBuilder>,
  consumer: Contract,
  chainKey: number,
  pair: Pair,
): Promise<void> {
  const { assetId, n, pay, ack } = pair;
  if (!pay || !ack) return;

  // Idempotence is checked on-chain, not from local memory: a restarted worker
  // has an empty map, and submitting a spent hash would revert and waste gas.
  const isConsumed = consumer.getFunction('consumed');
  if ((await isConsumed(pay.txHash)) || (await isConsumed(ack.txHash))) {
    stage('verified', assetId, n, { alreadyConsumed: true, payTx: pay.txHash, ackTx: ack.txHash });
    return;
  }

  const later = Math.max(pay.blockNumber, ack.blockNumber);
  stage('block_finalized', assetId, n, { height: later });

  await builder.waitUntilHeightAttested(
    chainKey,
    later,
    15000,
    config.attestationTimeoutMs,
  );
  stage('attested', assetId, n, { height: later });

  const result = await builder.getBatchProof([pay.txHash, ack.txHash]);
  if (!result.success || !result.data) {
    throw new Error(`proof builder returned no proof: ${result.error ?? 'unknown'}`);
  }

  const { payQ, ackQ, continuity } = shapeBatch(result.data, pay.txHash, ack.txHash);
  stage('proof_generated', assetId, n, {
    payHeight: payQ.height,
    ackHeight: ackQ.height,
    continuityRoots: continuity.roots.length,
  });

  const tx = await consumer.getFunction('consume')(payQ, ackQ, continuity);
  const receipt = await tx.wait();

  stage('verified', assetId, n, { creditcoinTx: tx.hash, block: receipt?.blockNumber ?? null });
  stage('title_ticked', assetId, n, {
    creditcoinTx: tx.hash,
    payTx: pay.txHash,
    ackTx: ack.txHash,
  });
}

interface Query {
  height: number;
  encodedTransaction: string;
  merkleProof: { root: string; siblings: { hash: string; isLeft: boolean }[] };
}

/**
 * Reshapes the proof service's response into the tuples ProofConsumer expects.
 *
 * The service returns merkleProofs keyed by block height and then by
 * transaction index within that block, so locating one transaction means
 * walking both levels and matching on txHash. The SDK types both levels as
 * `Map`, but a JSON-decoded response can arrive as a plain object depending on
 * how it was deserialized, so both shapes are handled rather than assumed.
 */
function entriesOf<V>(m: Map<number, V> | Record<string, V> | undefined): [number, V][] {
  if (!m) return [];
  if (m instanceof Map) return [...m.entries()];
  return Object.entries(m).map(([k, v]) => [Number(k), v]);
}

function shapeBatch(
  data: BatchContinuityResponse,
  payTxHash: string,
  ackTxHash: string,
): { payQ: Query; ackQ: Query; continuity: { lowerEndpointDigest: string; roots: string[] } } {
  const find = (wanted: string): Query => {
    for (const [height, byIndex] of entriesOf(data.merkleProofs)) {
      for (const [, entry] of entriesOf<BatchMerkleProofEntry>(
        byIndex as Map<number, BatchMerkleProofEntry>,
      )) {
        if (entry.txHash.toLowerCase() !== wanted.toLowerCase()) continue;

        return {
          height,
          encodedTransaction: entry.txBytes,
          merkleProof: {
            root: entry.merkleProof.root,
            siblings: (entry.merkleProof.siblings ?? []).map((s) => ({
              hash: s.hash,
              isLeft: Boolean(s.isLeft),
            })),
          },
        };
      }
    }
    throw new Error(`proof service returned no proof for ${wanted}`);
  };

  return {
    payQ: find(payTxHash),
    ackQ: find(ackTxHash),
    continuity: {
      lowerEndpointDigest: data.continuityProof.lowerEndpointDigest,
      roots: data.continuityProof.roots ?? [],
    },
  };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

main().catch((e) => {
  log('fatal:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
