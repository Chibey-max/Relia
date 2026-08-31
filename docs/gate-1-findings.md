# Gate 1: what the Block Prover actually exposes

**Answer: Branch A. Receipt status and logs are both readable by the consuming contract.**

Status: resolved by source inspection of `@gluwa/usc-sdk@0.18.0` (the published
package ships full TypeScript source and the canonical decoder ABI). It was
**not** resolved by running the Hello Bridge / Loan Flow tutorials, because this
build environment has no egress to `github.com`, to any Sepolia RPC, or to the
Creditcoin testnet RPC and prover. See "What is still unverified" below.

## The evidence

The attested leaf is not the transaction alone. `abiEncode()` in
`src/encoding/abi/v1.ts` builds each Merkle leaf as:

```
leaf = abi.encode(uint8 txType, bytes[] chunks)
```

and for a type-2 (EIP-1559) transaction the chunks are:

| Chunk | Contents |
|---|---|
| 0 | `nonce, gasLimit, from, toIsNull, to, value, data` |
| 1 | `chainId, maxPriorityFeePerGas, maxFeePerGas, accessList, yParity, r, s` |
| 2 | **`receiptStatus, receiptGasUsed, receiptLogs, receiptLogsBloom`** |

Chunk 2 is produced by `encodeReceiptFields(rx)`:

```ts
coder.encode(
  ['uint8', 'uint64', 'tuple(address, bytes32[], bytes)[]', 'bytes'],
  [rx.status ?? 1, rx.gasUsed, rx.logs.map(l => [l.address, l.topics, l.data]), rx.logsBloom],
)
```

The receipt — status **and** the full log list — is inside the bytes that the
Merkle root commits to, and therefore inside what the Block Prover verifies.

The canonical decoder confirms it is meant to be read on-chain. From
`src/utils/evmV1DecoderAbi.json`:

```
decodeTransactionType2(bytes chunk) -> (
  (uint64 nonce, uint64 gasLimit, address from, bool toIsNull,
   address to, uint256 value, bytes data) commonTx,
  (uint64 chainId, uint128 maxPriorityFeePerGas, uint128 maxFeePerGas,
   (address account, bytes32[] storageKeys)[] accessList,
   uint8 yParity, bytes32 r, bytes32 s) type2,
  (uint8 receiptStatus, uint64 receiptGasUsed,
   (address address_, bytes32[] topics, bytes data)[] receiptLogs,
   bytes receiptLogsBloom) receipt
)

getLogsByEventSignature(
  (uint8,uint64,(address,bytes32[],bytes)[],bytes) receipt,
  bytes32 eventSignature
) -> (address address_, bytes32[] topics, bytes data)[]
```

`getLogsByEventSignature` exists specifically so a consuming contract can pull
one event out of a proven receipt by topic0. That is exactly Relia's read path.

## Consequences for Relia (Branch A rules applied)

- `status == 0x1` **is** enforceable on-chain. `ProofConsumer` asserts it for
  both the payment and the acknowledgement. Refusal #1 stays in the test suite
  and in the demo.
- Relia reads the **`Paid` and `Acked` events**, not calldata. The `REL1`
  version prefix is carried as a field inside the event payload, per the
  Branch A instruction.
- A reverted `pay()` cannot be laundered into a title slice: its receipt
  status is `0`, and `NotSuccessful()` fires before anything else is checked.

## Reverting transactions are still provable

A reverted transaction is included in its block and has a receipt, so it is
still a valid Merkle leaf and a proof for it can be generated. The protocol
does not refuse to prove it. This is *why* the explicit `status == 0x1` check
is load-bearing rather than redundant — the prover will happily attest that a
failed payment happened.

## What is still unverified, and how to close it

Everything above is read off the shipped SDK source and the decoder ABI, which
is strong evidence but is not the same as a green round trip against a live
chain. These remain open and need one online session to close:

1. Run Hello Bridge and Loan Flow end to end.
2. Deploy the `probe(bool shouldRevert)` contract on Sepolia, send one
   succeeding and one reverting call, and prove both. Confirm the reverting
   one returns `receiptStatus == 0` rather than failing to prove.
3. Confirm the deployed decoder address on Creditcoin testnet still matches
   the ABI above.

The Discord question for `#buidl-ctc-qna` is unchanged and still worth asking
as confirmation: *"Does a Block Prover query expose the transaction receipt
(logs and status), or only the transaction itself?"* — the SDK source says
receipt, and Relia is built on that.
