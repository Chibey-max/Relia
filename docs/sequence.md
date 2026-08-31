# Sequence: how a payment becomes title

## The claim, stated exactly

> Title slice N of a generator on Creditcoin does not exist until the Attestcoin
> Protocol proves two finalized Sepolia transactions in one batch — a
> **successful** REL1 installment payment, and the shop's acknowledgement citing
> that exact payment hash — and Relia confirms neither hash has been consumed
> and the window is still open.

Every clause of that sentence maps to a line of `ProofConsumer.consume()`. The
word **successful** is enforceable because Gate 1 landed on Branch A; see
`gate-1-findings.md`.

## The flow

```mermaid
sequenceDiagram
    autonumber
    participant Payer as Payer (anyone)
    participant Sink as ReliaPaySink (Sepolia)
    participant Shop as Shop (Sepolia)
    participant Ack as ReliaShopAck (Sepolia)
    participant W as Relia worker
    participant Prover as Block Prover 0x..0FD2
    participant PC as ProofConsumer (Creditcoin)
    participant Title as TitlePass + ShortfallTape

    Payer->>Sink: pay(assetId, n, shop, buyer)
    Sink->>Sink: transferFrom payer, transfer to shop
    Sink-->>W: Paid(assetId, n, REL1 payment record)
    Note over Sink: USDC settles here and stays here.<br/>Nothing is bridged.

    Shop->>Ack: ack(assetId, n, payTx)
    Ack-->>W: Acked(assetId, n, REL1 ack record)
    Note over Ack: A second real transaction from a<br/>different sender. An off-chain signature<br/>would prove nothing to Attestcoin.

    W->>W: pair by (assetId, n)
    W->>Prover: waitUntilHeightAttested(chainKey, max(payBlock, ackBlock))
    W->>W: getBatchProof([payTx, ackTx]) -> 1 continuity proof, 2 merkle proofs
    W->>PC: consume(payQ, ackQ, continuity)

    PC->>Prover: verify(chainKey, heights[2], txs[2], proofs[2], continuity)
    Prover-->>PC: true / false
    PC->>PC: decode, check 12 rules (below)
    PC->>Title: tick(assetId, n) + markLive(...)
    PC-->>W: InstallmentReceipt(...)
```

Attestcoin is not a third chain in this picture. It is the readability path on
Creditcoin: the precompile plus the decoder are what let a Creditcoin contract
read a Sepolia fact.

## The exact fields read

### 1. Block Prover precompile — `0x0000000000000000000000000000000000000FD2`

Relia calls the **batch** overload, once, with both queries:

```solidity
function verify(
    uint64 chainKey,
    uint64[] heights,              // [payBlock, ackBlock]
    bytes[] encodedTransactions,   // [payTxBytes, ackTxBytes]
    MerkleProof[] merkleProofs,    // one per query
    ContinuityProof sharedContinuityProof
) external returns (bool);

struct MerkleProof     { bytes32 root; MerkleProofEntry[] siblings; }
struct MerkleProofEntry{ bytes32 hash; bool isLeft; }
struct ContinuityProof { bytes32 lowerEndpointDigest; bytes32[] roots; }
```

One shared continuity proof across both queries is what makes this a *batch*
rather than two independent claims: the payment and the acknowledgement are
proven against the same attested span of Sepolia history.

Relia reads exactly one thing from this call: the returned `bool`. A `false`
becomes `ProofRejected()`.

### 2. ChainInfo precompile — `0x0000000000000000000000000000000000000fD3`

Used off-chain by the worker, never inside `consume()`:

- `get_supported_chains() -> (uint64 chainKey, uint64 chainId, bytes chainName, uint8 chainEncoding)[]`
  — to resolve Sepolia's `chainKey` by matching `chainId == 11155111`, rather
  than hardcoding a value. See `gate-2-constants.md` for why the claimed `1`
  is almost certainly Ethereum Mainnet.
- `get_latest_attestation_height_and_hash(chainKey)` — via the SDK's
  `waitUntilHeightAttested`.

### 3. EVM-v1 decoder — the fields that actually decide

This is where Relia reads the receipt. The attested leaf is
`abi.encode(uint8 txType, bytes[] chunks)`, and for a type-2 transaction chunk 2
is the receipt.

```solidity
getTransactionType(bytes) -> uint8 txType

decodeTransactionType2(bytes) -> (
  CommonTx    commonTx,
  Type2Fields type2,
  Receipt     receipt
)
```

Relia reads these and only these:

| Field | Read from | Used for |
|---|---|---|
| `receipt.receiptStatus` | `Receipt` | **Refusal #1.** Must be `1`. A reverted payment is still provable — this is the check that stops it buying title. |
| `receipt.receiptLogs` | `Receipt` | Source of the `Paid` / `Acked` event, via `getLogsByEventSignature`. |
| `log.address_` | `EvmLog` | Must equal Relia's own Sepolia contract. A lookalike sink emitting a correctly-shaped event proves nothing. |
| `log.topics[0]` | `EvmLog` | `keccak256("Paid(bytes32,uint8,bytes)")` / `keccak256("Acked(bytes32,uint8,bytes)")`. |
| `log.topics[1]`, `log.topics[2]` | `EvmLog` | Indexed `assetId` and `n`, cross-checked against the REL1 body. |
| `log.data` | `EvmLog` | The REL1 record itself. |
| `commonTx.to` | `CommonTx` | Must be `paySinkSepolia` / `shopAckSepolia`. |
| `commonTx.nonce`, `gasLimit`, `to`, `value`, `data`, `toIsNull` | `CommonTx` | Transaction hash recomputation. |
| `type2.chainId`, `maxPriorityFeePerGas`, `maxFeePerGas`, `accessList`, `yParity`, `r`, `s` | `Type2Fields` | Transaction hash recomputation. |

`receiptGasUsed`, `receiptLogsBloom` and `commonTx.from` are decoded but not
relied on. `from` in particular is deliberately **not** checked: anyone may pay
for any buyer.

### 4. Log selection

```solidity
getLogsByEventSignature(Receipt receipt, bytes32 eventSignature)
    -> EvmLog[] { address address_; bytes32[] topics; bytes data; }
```

Relia then takes the first returned log whose `address_` is its own contract.
No match is `EventNotFound(topic, expectedEmitter)`.

## Why the transaction hash is recomputed

The prover attests to a transaction's *contents*, not to its hash. That leaves
a gap: the acknowledgement cites a payment **by hash**, and `consumed[]` is
keyed by hash. If the worker simply told the contract which hash it was
proving, both checks would be verifying a number the worker made up.

So `LibTxHash` rebuilds the canonical EIP-1559 serialization from the attested
fields and hashes it:

```
txHash = keccak256(0x02 || rlp([chainId, nonce, maxPriorityFeePerGas,
                                maxFeePerGas, gasLimit, to, value, data,
                                accessList, yParity, r, s]))
```

Every input comes from the proven payload, so the resulting hash is exactly as
trustworthy as the proof. It is verified in `LibTxHash.t.sol` against five real
transactions signed offline by ethers.

**Known limitation, stated plainly:** only type-2 transactions with an empty
access list are supported. Anything else is refused with
`AccessListUnsupported()` or `WrongTransactionType(txType)` rather than
mis-hashed. Relia's own frontend and worker never produce either. Supporting
access lists needs a nested-list RLP encoder and would buy nothing here.

## The rules, in the order they fire

1. `ProofRejected()` — the Block Prover returned false.
2. `WrongTransactionType(txType)` — not EIP-1559.
3. **`NotSuccessful(txHash, status)`** — receipt status is not `1`. Checked
   before any log is read, so a reverted transaction's payload is never even
   inspected. *(Branch A only. If Gate 1 had landed on Branch B this rule, and
   every claim about it, would have been removed.)*
4. `WrongTarget(expected, found)` — the transaction did not call Relia's contract.
5. `EventNotFound(topic, emitter)` — no `Paid`/`Acked` from the right address.
6. `Rel1BadVersion(found)` / `Rel1WrongKind(...)` / `Rel1Malformed(len)`.
7. `TopicBodyMismatch()` — indexed topics disagree with the REL1 body.
8. `UnknownAsset` / `ShopMismatch` / `BuyerMismatch` — the registry, not the
   event, is the authority on what the payment was supposed to be.
9. `UnderPaid(paid, required)` — overpayment is fine; underpayment is not a payment.
10. `AckDoesNotCitePayment(cited, actual)` / `SliceMismatch` / `AssetMismatch`.
11. `AlreadyConsumed(txHash)` — either hash already spent.
12. `WindowClosed(assetId, n, windowEnd, now)`.

Then, and only then: `TitlePass.tick`, `ShortfallTape.markLive`,
`InstallmentReceipt`.

## Settlement honesty

USDC arrives at `ReliaPaySink` on Sepolia and is forwarded to the shop on
Sepolia. Creditcoin holds title and tape state only. **No USDC is bridged to
Creditcoin, and nothing in this repo should be read as claiming otherwise.**

## Residual risks

- **The decoder address is unverified.** It could not be checked from the build
  environment. If it is wrong or has moved, every `consume()` fails closed —
  no title is issued on a bad read. Fix is one config value.
- **The `chainKey` must be resolved, not assumed.** The worker refuses to start
  if the value it resolves disagrees with the one `ProofConsumer` was deployed
  with.
- **The proof builder is a service.** If it is down, nothing can be proven.
  Facts stay on Sepolia and can be proven later by anyone; nothing is lost, but
  a window can close in the meantime. That is what the `Disputed` state exists
  to make survivable — a buyer who paid can prove the payment alone and block
  the reclaim.
- **Gate 1 was resolved by source inspection, not a live round trip.** The
  evidence is strong and specific, but the tutorials have not been run green.
  Listed as the first item in `gate-1-findings.md`.
