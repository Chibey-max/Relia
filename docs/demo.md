# Demo runbook

Everything below is reproducible. Nothing is staged, and no result is
simulated — if a step cannot be run live, this file says so and shows the test
that proves the same rule instead.

## 0. Setup (once)

```bash
cp .env.example .env      # fill in RPCs and keys
forge script contracts/script/DeploySepolia.s.sol   --rpc-url sepolia    --broadcast
cd worker && npm install && npm run chainkey        # prints SOURCE_CHAIN_KEY
forge script contracts/script/DeployCreditcoin.s.sol --rpc-url creditcoin --broadcast
```

Paste every printed address into `.env` and `app/.env.local`.

### List a demo asset

**Use short windows.** The default schedule is twelve monthly deadlines, which
is the real product shape but means no window ever closes on camera — and the
Shortfall and Disputed rows are the most persuasive thing here.

```bash
export WINDOW_SPACING_SECONDS=300      # 5 minutes per slice
export SHOP_CTC=0x…  SHOP_SEPOLIA=0x…  BUYER=0x…

forge script contracts/script/ListAsset.s.sol --rpc-url creditcoin --broadcast
# → prints ASSET_ID

export ASSET_ID=0x…
forge script contracts/script/RegisterShop.s.sol --rpc-url sepolia --broadcast
```

The shop must be bound on **both** chains. If they disagree, nothing can ever
be proven for that asset and `consume()` refuses with `ShopMismatch`.

Then start the worker and the app:

```bash
cd worker && npm run dev      # JSON stage events on stdout
cd app    && npm run dev
```

---

## 1. The happy path — a payment becomes title

1. `/send` → pick the asset from the dropdown. Shop and buyer fill themselves.
2. Read the **REL1 preview** aloud before signing. This is the claim being put
   on Sepolia, shown before it is made.
3. **Pay on Sepolia.** Point out that the money settles here and stays here —
   nothing is bridged.
4. **Acknowledge as shop.** A second real transaction, from a different sender.
   An off-chain signature would prove nothing to Attestcoin.
5. Watch the **pipeline rail**. This is the part worth narrating: attestation
   takes minutes, and each row fills in with a real hash or block height as it
   resolves. `attested` and `proof_generated` are Attestcoin doing the work.
6. `/title` → the slice is green. `/verify/<payTx>` → **disconnect the wallet
   first**, then reload. The receipt still renders. It is read from Creditcoin
   by anyone with the URL.

The sentence to land: *the slice did not exist until both facts were proven
together.*

---

## 2. Refusal #5, live — one payment cannot fill two slices

The strongest live refusal, because the payment is genuine.

1. Take the `payTx` you just proved.
2. Have the shop acknowledge it again — a **new** Sepolia transaction citing
   the **same** payment.
3. The worker submits, and Creditcoin refuses: **`AlreadyConsumed`**.

The frontend names the rule: *"Consumed. This payment hash has already filled a
slice."* Not a revert string, not a toast.

---

## 3. Refusal #8, live — a shop cannot profit from its own silence

This is the design decision worth defending, and it runs live in about ten
minutes with 5-minute windows.

1. Pay slice 2 on `/send`. **Do not acknowledge.**
2. The buyer proves the payment alone:
   `ProofConsumer.proveShortfallDispute(payQ, continuity)`.
   No title is minted — a payment on its own never moves title — but the
   payment is now on the record.
3. Wait for the window to close.
4. `/tape` → press **settle** on that row.
5. The row reads **Disputed**, not Shortfall, and publishes the payment hash.
6. The shop attempts `reclaim(assetId, 2)` and is refused:
   **`ReclaimBlockedDisputed`**.

The point: under the obvious rule — window closed, write Shortfall, let the
shop reclaim — the shop could take the money, stay silent, wait, reclaim the
slice, and leave a false miss against a buyer who actually paid. Splitting
`Disputed` from `Shortfall` closes that.

For contrast, settle a slice nobody paid: it reads **Shortfall** and the shop
*can* reclaim it. Relia is not anti-shop; it is anti-ambiguity.

---

## 4. Refusals #1, #2 and #7 — on the test suite

These cannot be produced live against a real chain, and pretending otherwise
would be dishonest:

- **#1 (reverted payment)** needs a `pay()` that reverts *and* still gets
  proven. Reproducible, but it needs a deliberately broken sink deployed
  alongside.
- **#2 (bad REL1 version)** would need a contract emitting a REL2 payload —
  and the emitter binding rejects any foreign contract first, so the version
  check never even gets reached from outside.
- **#7 (reclaim on Live)** needs a settled slice and a shop willing to try.

So show them where they are actually proven:

```bash
forge test --match-test test_refusal1_revertedPaymentIsNotATitle -vvv
forge test --match-test test_refusal2_wrongVersionByteIsRefused -vvv
forge test --match-test test_refusal7_reclaimOnLiveSliceIsRefused -vvv
forge test --match-test test_refusal8_shopCannotReclaimWhatTheBuyerProvedTheyPaid -vvv
```

Each asserts the **specific named error**, not merely that it reverted.

Worth showing alongside — the attack the emitter binding closes:

```bash
forge test --match-test test_foreignEmitterIsRefused -vvv
```

A lookalike sink emitting a correctly-shaped `Paid` event proves nothing.

And the whole matrix at once:

```bash
forge test
# 46 passed
```

---

## 5. If something fails on camera

- **Worker stuck at `attested`** — normal. Attestation is minutes, and the SDK
  timeout is 15. The rail is showing real state; say so and keep talking.
- **`ProofRejected`** — the block was not attested yet, or `chainKey` is wrong.
  The worker refuses to start on a chainKey mismatch, so this is almost always
  the former.
- **`ShopMismatch`** — the two shop bindings disagree. Re-run
  `RegisterShop.s.sol`.
- **Everything fails identically** — check the decoder address
  (`cast code $CREDITCOIN_DECODER`). It is the one constant that could not be
  verified offline. It fails closed: a wrong decoder issues no title.

## What to say about what is not built

Attestcoin writability is out of scope this season, so nothing here depends on
Creditcoin writing back to Ethereum. No USDC is bridged. There is no KYC, no
credit score, and no shop bond vault — title and tape are already Creditcoin
state, and a bond would add custody without adding proof.
