# Relia

**Hire-purchase title, proven across chains.**

A buyer in Lagos pays for a generator in twelve installments. Today that
schedule lives in a shop's notebook. If the shop says she missed month five,
she missed month five — and none of it follows her to the next shop.

Relia makes each installment a fact that neither side can rewrite:

> Title slice N does not exist until the Attestcoin Protocol proves two
> finalized Sepolia transactions in one batch — a **successful** REL1
> installment payment, and the shop's acknowledgement citing that exact payment
> hash — and Relia confirms neither hash has been consumed and the window is
> still open.

Money settles on Sepolia. Creditcoin holds title and tape. **Nothing is
bridged**, and nothing here should be read as claiming otherwise.

Built for BUIDL CTC 2026 Fall (Creditcoin + Credit Labs).

---

## Status

| Item | State |
|---|---|
| Gate 1 — what the Block Prover exposes | **Answered: Branch A** ([evidence](docs/gate-1-findings.md)) |
| Gate 2 — network constants | Verified; three corrected ([details](docs/gate-2-constants.md)) |
| Contracts (Sepolia + Creditcoin) | Written, building clean |
| Refusal test suite | **46 tests green** under `forge test` |
| Worker | Written, typechecks, builds |
| Frontend scaffold | Four routes, builds clean |
| **Deployed to testnet** | **Not yet** — see below |
| **End-to-end run** | **Not yet** — see below |

### What has not been done, and why

The build environment for this work had no outbound network access to
`github.com`, to any Sepolia RPC, or to `*.cc3-testnet.creditcoin.network`.
So the following are complete as code but unexecuted:

- Contracts are **not deployed** to either testnet; no addresses to record.
- No end-to-end run: no real payment has produced a real title tick.
- The Hello Bridge / Loan Flow tutorials were **not** run green.
- The decoder address and Creditcoin chain ID are **unverified** constants.

Gate 1 was resolved instead by reading the published SDK's source, which ships
the full TypeScript and the canonical decoder ABI. The evidence is specific and
is laid out in full in [`docs/gate-1-findings.md`](docs/gate-1-findings.md) —
but source inspection is not a green round trip, and this README will not
pretend otherwise. **No result in this repo is mocked and presented as live.**

Closing the gap needs one online session: see [Deploying](#deploying).

---

## How it works

```
Sepolia (source)                    Creditcoin (execution)
────────────────                    ──────────────────────
MockUSDC
ReliaPaySink  ── Paid(REL1) ──┐
ReliaShopAck  ── Acked(REL1) ─┤
                              │  worker: watch → waitUntilHeightAttested
                              │          → batch proof (2 queries, 1 continuity)
                              └─►  ProofConsumer
                                     ├─ Block Prover precompile  0x..0FD2
                                     ├─ EVM-v1 decoder
                                     ├─ AssetRegistry
                                     ├─ TitlePass (soulbound ERC-721)
                                     └─ ShortfallTape
```

Attestcoin is not a third chain. It is the readability path on Creditcoin —
the precompile plus the decoder are what let a Creditcoin contract read a
Sepolia fact.

Full flow, the exact fields read from each precompile, and the twelve rules in
firing order: [`docs/sequence.md`](docs/sequence.md).

---

## The two design decisions worth arguing about

### 1. `Disputed` — a shop must not profit from its own silence

The obvious rule is: window closed without a valid batch, write `Shortfall`,
let the shop reclaim. That rule is exploitable. A shop takes the payment on
Sepolia, never acknowledges it, waits out the window, reclaims the slice, and
leaves a false miss on the record of a buyer who **actually paid**. It turns
the shop's own silence into evidence against the buyer, which defeats the
entire point of a portable record.

So the outcome depends on what was actually proven:

| At `windowEnd` | Tape state | Reclaim |
|---|---|---|
| No proven payment | `Shortfall` | allowed |
| Payment proven, no valid ack | `Disputed` | **blocked**, payment hash published |
| Valid batch consumed in time | `Live` | **blocked**, permanently |

This needs a way to prove a payment *without* an acknowledgement, so
`ProofConsumer.proveShortfallDispute()` exists. It ticks no title and mints
nothing — a payment alone never moves title — and deliberately does not consume
the payment hash, so the shop can still acknowledge and the full batch stays
consumable until the window closes.

### 2. The payment's transaction hash is recomputed on Creditcoin

The Block Prover attests to a transaction's *contents*, not its hash. So "the
ack cites **that exact** payment hash" and `consumed[payTx]` were both, as
originally specified, checks against a number the worker would have supplied
itself.

`LibTxHash` closes this: it rebuilds the canonical EIP-1559 serialization from
the attested fields and hashes it, so the hash is exactly as trustworthy as the
proof. Verified against five real transactions signed offline by ethers.

Limitation, stated plainly: type-2 with an empty access list only. Anything
else is **refused**, never mis-hashed.

---

## Refusals

Every rule is a named custom error. The frontend renders the rule that fired —
never a raw revert string, never an error toast. The reasons *are* the product.

```
NotSuccessful         the Sepolia transaction reverted
Rel1BadVersion        the payload is not a REL1 record
UnderPaid             short of the installment
AckDoesNotCitePayment the ack names a different payment
AlreadyConsumed       that hash already filled a slice
WindowClosed          correct, but too late
ReclaimBlockedLive    settled slices are settled forever
ReclaimBlockedDisputed the buyer proved they paid
Soulbound             title moves at twelve slices, not eleven
EventNotFound         a lookalike contract's event proves nothing
```

`forge test` covers all of them by name, plus the family rule, overpayment,
prover rejection, and the twelfth slice unlocking transfer.

---

## Repo layout

```
docs/
  gate-1-findings.md      what the prover exposes, and the evidence
  gate-2-constants.md     constants verified, three corrected
  sequence.md             flow + exact precompile fields read
contracts/
  lib/                    Rel1.sol LibRLP.sol LibTxHash.sol
  sepolia/                ReliaPaySink ReliaShopAck MockUSDC
  creditcoin/             AssetRegistry ProofConsumer TitlePass ShortfallTape
  test/                   Relia.t.sol Rel1.t.sol LibTxHash.t.sol
  script/                 DeploySepolia DeployCreditcoin
worker/                   Node 20 + TS, stage events on stdout
app/                      /tape /send /title /verify/[payTx]
```

---

## Running it

### Tests

```bash
forge test
```

Works from a bare clone with no network: `forge-std` is vendored, and
`tools/solc` shims Foundry's solc CLI onto the npm `solc` wasm build for
environments that cannot reach `binaries.soliditylang.org`. To use a native
solc instead, drop `solc = "tools/solc"` from `foundry.toml`.

### Deploying

```bash
cp .env.example .env      # fill it in; never commit it

# 1. Source chain
forge script contracts/script/DeploySepolia.s.sol --rpc-url sepolia --broadcast

# 2. Resolve Attestcoin's chainKey for Sepolia — do NOT assume 1
cd worker && npm install && npm run chainkey

# 3. Execution chain
forge script contracts/script/DeployCreditcoin.s.sol --rpc-url creditcoin --broadcast
```

Then verify the constants that could not be checked offline:

```bash
cast chain-id --rpc-url $CREDITCOIN_RPC_URL
cast code $CREDITCOIN_DECODER --rpc-url $CREDITCOIN_RPC_URL
```

### Worker

```bash
cd worker && npm install && npm run dev
```

Emits JSON-line stage events on stdout (`sepolia_mined`, `block_finalized`,
`attested`, `ack_located`, `proof_generated`, `verified`, `title_ticked`), so
the frontend rail can show the attestation wait as real hashes resolving rather
than a spinner. Human logs go to stderr.

The worker has **no custody**. It holds no user funds, has no authority over
anyone's money, and cannot cause a payment or an acknowledgement. Its only
privilege is paying gas. If it disappears, every fact is still on Sepolia and
anyone can prove it.

### Frontend

```bash
cd app && cp .env.local.example .env.local && npm install && npm run dev
```

Deliberately minimal — a scaffold that proves the pipeline, not a product
surface. `/verify/[payTx]` works with the wallet disconnected.

---

## Out of scope

No KYC, no fiat rails, no credit score, no bridging of real USDC, no shop bond
vault, no token, no governance, no AI agent layer. Attestcoin writability is
out of scope this season, and nothing here depends on Creditcoin writing back
to Ethereum.
