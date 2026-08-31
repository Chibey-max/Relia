# Gate 2: network constants, verified and corrected

Verification method available in this environment: inspection of the published
`@gluwa/usc-sdk@0.18.0` package (full TypeScript source + ABIs) and the npm
registry. **No live RPC call was possible** — this build environment's egress
policy blocks `github.com`, all Sepolia RPC endpoints, and
`*.cc3-testnet.creditcoin.network`. Constants marked UNVERIFIED need one online
session with `cast`/`curl` to confirm; each row says exactly how.

| Constant | Claimed | Verdict | Value Relia uses |
|---|---|---|---|
| Creditcoin testnet chain ID | `102031` | UNVERIFIED | `102031` (config, not hardcoded) |
| Creditcoin testnet RPC | `https://rpc.cc3-testnet.creditcoin.network` | MATCHES SDK README | same |
| Block Prover precompile | `0x…0FD2` | **CONFIRMED** | `0x0000000000000000000000000000000000000FD2` |
| ChainInfo precompile | *(missing from the table)* | **ADDED** | `0x0000000000000000000000000000000000000fD3` |
| Decoder (testnet) | `0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f` | UNVERIFIED | config value; ABI confirmed |
| Proof generation API | `https://proof-gen-api.cc3-testnet.creditcoin.network/` | **WRONG** | `https://prover.cc3-testnet.creditcoin.network` |
| Sepolia `chainKey` | `1` | **LIKELY WRONG** | discovered at runtime, never hardcoded |
| Explorer | `https://creditcoin-testnet.blockscout.com/` | UNVERIFIED | config value |
| SDK | `@gluwa/usc-sdk`, ethers v6 *peer* dep | **CONFIRMED / CORRECTED** | `0.18.0`; ethers v6 is a normal dependency |

## The three corrections that matter

### 1. The proof API host is wrong

`proof-gen-api.…` does not appear anywhere in the SDK. The SDK README documents
`CREDITCOIN_PROOF_BUILDER_URL`, and every code example uses:

```
https://prover.cc3-testnet.creditcoin.network
```

The batch endpoint the SDK actually calls is `POST /api/v1/proof-batch-by-tx`,
and attested height is polled at `GET /api/v1/attested-height/{chainKey}`.

### 2. Sepolia's `chainKey` is almost certainly not `1`

`chainKey` is an Attestcoin-internal index, not an EVM chain ID — the claimed
table says so, and it is right about that. But the SDK's own worked examples
show `chainKey: 1` resolving to **Ethereum Mainnet** and `chainKey: 2` to
Binance Smart Chain, while another example uses `chainKey: 11`. Hardcoding `1`
would point Relia's proofs at the wrong source chain.

**Relia never hardcodes it.** The worker resolves it at startup:

```ts
const chains = await chainInfo.getSupportedChains();
const sepolia = chains.find(c => c.chainId === 11155111);
```

and fails loudly with a named error if Sepolia is not in the supported set.
`SOURCE_CHAIN_KEY` exists in `.env` only as an optional override for when you
already know it. This is strictly better than a verified constant: it stays
correct if Gluwa reindexes.

### 3. ethers v6 is a dependency, not a peer dependency

`@gluwa/usc-sdk@0.18.0` declares `ethers: ^6.15.0` under `dependencies`. You do
not need to install it yourself, and pinning a conflicting v6 minor in the
worker can produce two ethers instances. The worker depends on `ethers@^6.15.0`
explicitly so npm dedupes to one copy.

## Batch limits

"Max 10 proofs, within 1000 blocks, sharing one continuity proof" does not
appear as an enforced constant anywhere in the SDK source — `getBatchProof()`
forwards the hash list to the service without a client-side length check. Treat
it as a documented service-side limit, UNVERIFIED. Relia submits 2, which is
comfortably inside it either way.

## Proof payload shapes (confirmed from the ABI)

These are what `ProofConsumer` accepts, and they are load-bearing for the
worker's serialization:

```solidity
struct MerkleProofEntry  { bytes32 hash; bool isLeft; }
struct MerkleProof       { bytes32 root; MerkleProofEntry[] siblings; }
struct ContinuityProof   { bytes32 lowerEndpointDigest; bytes32[] roots; }

// BlockProver precompile, batch form:
function verify(
    uint64 chainKey,
    uint64[] heights,
    bytes[] encodedTransactions,
    MerkleProof[] merkleProofs,
    ContinuityProof sharedContinuityProof
) external returns (bool);
```

The service's batch response maps onto these directly:
`{ fromHeader, toHeader, continuityProof: { lowerEndpointDigest, roots[] },
merkleProofs: { [height]: { [txIndex]: { txHash, txBytes, merkleProof } } } }`.

## To close the UNVERIFIED rows

```bash
cast chain-id                 --rpc-url https://rpc.cc3-testnet.creditcoin.network
cast code 0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f --rpc-url $CREDITCOIN_RPC_URL
cast call 0x0000000000000000000000000000000000000fD3 "get_supported_chains()" --rpc-url $CREDITCOIN_RPC_URL
curl -s https://prover.cc3-testnet.creditcoin.network/api/v1/attested-height/<chainKey>
```
