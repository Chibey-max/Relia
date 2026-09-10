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
| **Deployed to testnet** | **Sepolia and Creditcoin: yes** — see [addresses](#deployed-addresses) |
| **End-to-end run** | **Live** — Sepolia payment + acknowledgement proved on Creditcoin |

### Deployed addresses

Redeployed 2026-09-09 after fixing the Creditcoin receipt-log scan, plus the
earlier 2026-09-08 contract findings: `ReliaShopAck`
(front-runnable `registerShop`, [contracts/sepolia/ReliaShopAck.sol](contracts/sepolia/ReliaShopAck.sol))
now requires the caller to be the shop it is registering, and `TitlePass`
(missing receiver check, [contracts/creditcoin/TitlePass.sol](contracts/creditcoin/TitlePass.sol))
now checks `IERC721Receiver` in `safeTransferFrom`. All contracts were
redeployed together for a clean, matching address set — the demo asset was
re-listed and the shop re-registered under the new deployment. 56/56 tests
pass (46 original + 10 covering these two fixes).

**Sepolia (chain ID `11155111`)**

| Contract | Address |
|---|---|
| MockUSDC | `0x0cd668A257D28e369DCf7e3C36F41cE451ef8000` |
| ReliaPaySink | `0x809CdCD32Ac8851D3f4DbC2DA13bcb82aCEefa7D` |
| ReliaShopAck | `0x091b76c3919B78c6c746032F00160A34fb321bdf` |

**Creditcoin Testnet (chain ID `102031`)**

| Contract | Address |
|---|---|
| AssetRegistry | `0x6A5B61Db6A6FBF97cF1EB8Da1885198e62A1fc90` |
| ShortfallTape | `0x504135Af815a5a2EF2C40b55B13DaB2bb007F29c` |
| TitlePass | `0xFa06135c72dE736556b57795d7893E4e6ABE3360` |
| ProofConsumer | `0x71F008587f49b560b167C5581855D297b3a1f75f` |

Demo asset (relisted under this deployment): `0x5aea9e7b1c2f754cacfb4cd1113db6727b001400fcfa4eaeb40e2c3aff425668`,
shop `0xbD00277dFec1265d2aA10e003A331839c4aE14C8` registered on both chains,
buyer `0x3bF16591b7FAd920e34b2bF8B0b788AFF8Ae05e7`.

Live proof, 2026-09-09: Sepolia payment
`0x0e07b1fd3695b95299d877f4772d6a12aec05ddb9662c11159676dc3f7e355d8`
and shop acknowledgement
`0xf4b28cdfe57ff04ebbc8d4db0f2e4f35d6add642040f854a3cbd537ce9786190`
were consumed by Creditcoin transaction
`0x0fd7b4319f4cd8693d92578a29451d032082b80bce4b09f63b41d1bc27405ab2`
in block `5457260`. `InstallmentReceipt` was emitted, both source hashes are
marked consumed, and title slice `1` is live.

ABIs for these are in [`app/lib/abi.ts`](app/lib/abi.ts) (frontend) and
[`worker/src/abi.ts`](worker/src/abi.ts) (worker); full compiled ABI JSON is
under `contracts/out/<Contract>.sol/<Contract>.json`. The frontend reads these
addresses from `app/.env.local` (see `app/.env.local.example`) via
[`app/lib/chain.ts`](app/lib/chain.ts) — copy the example file and fill in the
values above to point a local frontend at these deployments.

### Remaining Caveat

The Hello Bridge / Loan Flow tutorials were not run green. Relia's own live
round trip is now complete: a real Sepolia payment and acknowledgement produced
a real Creditcoin receipt and title tick. **No result in this repo is mocked and
presented as live.**

The remaining QA gap is external: a hands-on browser-extension signing journey
and device/browser coverage outside this container.

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
  demo.md                 runbook: what to show live, what to show as tests
contracts/
  lib/                    Rel1.sol LibRLP.sol LibTxHash.sol
  sepolia/                ReliaPaySink ReliaShopAck MockUSDC
  creditcoin/             AssetRegistry ProofConsumer TitlePass ShortfallTape
  test/                   Relia.t.sol Rel1.t.sol LibTxHash.t.sol
  script/                 DeploySepolia DeployCreditcoin
                          ListAsset RegisterShop SettleWindow
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

Then list an asset. The shop must be bound on **both** chains or nothing can
ever be proven for it:

```bash
export SHOP_CTC=0x… SHOP_SEPOLIA=0x… BUYER=0x…
export WINDOW_SPACING_SECONDS=300     # short windows so a demo can close one

forge script contracts/script/ListAsset.s.sol --rpc-url creditcoin --broadcast
export ASSET_ID=0x…                   # printed by the line above

# RegisterShop must be broadcast with the SHOP's own key: registerShop()
# requires msg.sender == shop, so a third party can no longer squat another
# shop's binding.
forge script contracts/script/RegisterShop.s.sol --rpc-url sepolia --broadcast --private-key $SHOP_PRIVATE_KEY
```

A closed window writes nothing on its own — `settleWindow` decides Shortfall
or Disputed, from the `/tape` button or:

```bash
SLICE=2 forge script contracts/script/SettleWindow.s.sol --rpc-url creditcoin --broadcast
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

Emits JSON-line stage events on stdout (`sepolia_mined`, `ack_located`,
`proof_queued`, `block_finalized`, `attested`, `proof_generated`,
`proof_submitted`, `verified`, `title_ticked`) and
mirrors the latest bounded set at the read-only `GET /status` endpoint on port
8787. The frontend can therefore show the attestation wait as real hashes
resolving rather than a spinner. Human logs go to stderr. Configure
`WORKER_STATUS_ORIGIN` and `NEXT_PUBLIC_PROOF_STATUS_URL` when the two processes
do not use the default local origins.

The worker also checkpoints its public cursor, paired Sepolia facts, emitted
status events, and any submitted Creditcoin proof transaction to
`WORKER_STATE_PATH` (default `.relia-worker-state.json`). On restart it resumes
from that checkpoint and waits on a previously submitted proof transaction
instead of broadcasting a duplicate.

The worker has **no custody**. It holds no user funds, has no authority over
anyone's money, and cannot cause a payment or an acknowledgement. Its only
privilege is paying gas. If it disappears, every fact is still on Sepolia and
anyone can prove it. `ProofConsumer.consume(...)` and
`proveShortfallDispute(...)` remain infrastructure operations; the status API
accepts no writes and the browser exposes no proof-submission control.

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
