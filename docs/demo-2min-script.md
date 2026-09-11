# Relia 2 Minute Demo Runbook

Target length: 1:45 to 2:00.

Use the live path if Sepolia and the proof worker are healthy. Use the fallback path if a wallet, RPC, or worker delay would slow the recording.

## Before Recording

1. Open `https://relia-live.vercel.app`.
2. Set MetaMask to Sepolia.
3. Prepare two MetaMask accounts:
   - Buyer or payer account: any funded Sepolia account.
   - Shop account: `0xbd00277dFec1265d2aA10e003A331839c4aE14C8`.
4. Keep this asset ID ready:
   - `0xd978ba31435010c95543d2168ffe38e39f3728d81300c54853e6252a141d88f9`
5. Use a fresh unpaid slice if doing a live transaction. If slice 1 is already live, use slice 2, then slice 3, and so on.
6. Keep the Judge page open in another tab as backup:
   - `https://relia-live.vercel.app/judge`

## Live Transaction Path

### 0:00-0:15 - Landing Page

Action:
1. Show the Relia homepage.
2. Briefly point at Tape, Title, Verify, Judge, and Send an installment.

Say:
"Relia turns an installment payment into a public title update. The buyer pays on Sepolia, the registered shop acknowledges the exact payment, and Relia tracks the proof path until the title receipt is public."

### 0:15-0:25 - Open Send Flow

Action:
1. Click `Send an installment`.
2. Connect MetaMask if it is not connected.
3. Confirm the app shows Sepolia.

Say:
"This is not just a mock checkout. The write flow uses a wallet, contract reads, and live testnet transactions."

### 0:25-0:45 - Choose Asset and Slice

Action:
1. Confirm the asset ID is filled.
2. Set the slice to the next unpaid slice.
3. Show the Transaction summary card.
4. Point at Network, Installment, Buyer, and Shop.

Say:
"The app reads the installment amount from the contract, so the UI is not inventing the payment amount. Any payer can pay for the named buyer, and both addresses are preserved in the record."

### 0:45-1:05 - Submit Payment

Action:
1. Scroll to `Send the installment`.
2. Make sure MetaMask is on the buyer or payer account.
3. Click `Review pay 40.00 USDC`.
4. Confirm the wallet transaction.
5. Wait for `Payment confirmed`.

Say:
"The payer signs the Sepolia payment. Once the receipt is confirmed, Relia advances the rail from wallet approval to confirmed payment."

### 1:05-1:25 - Shop Acknowledgement

Action:
1. In MetaMask, switch to the shop account:
   - `0xbd00277dFec1265d2aA10e003A331839c4aE14C8`
2. Return to the app.
3. In `Acknowledge the payment`, click `Review acknowledge payment`.
4. Confirm the wallet transaction.
5. Wait for `Acknowledgement confirmed`.

Say:
"Payment alone is not enough to update title. The registered shop has to acknowledge the exact payment hash, so the proof has two public source facts to match."

### 1:25-1:45 - Proof Observer

Action:
1. Scroll to `From payment fact to public receipt`.
2. Click `Refresh status`.
3. Show the stage cards:
   - Payment found
   - Acknowledgement found
   - Proof queued
   - Attestation ready
   - Proof submitted
   - Receipt emitted

Say:
"After both facts exist, the worker pairs them, waits for finalized source blocks, submits the proof, and emits the public receipt. The UI shows each real state instead of pretending progress is instant."

### 1:45-2:00 - Judge Evidence

Action:
1. Click `Judge`.
2. Show the evidence counters and public links.

Say:
"For judges, the point is simple: Relia has live Sepolia writes, contract tests, public proof links, and honest failure states. If a window closes or evidence is refused, the app shows that instead of hiding it."

## Fast Fallback Path

Use this if the live proof step takes longer than the recording window.

1. Open the homepage.
2. Say the same 0:00-0:25 intro.
3. Open `Send an installment`.
4. Show the asset, slice, amount, buyer, and shop.
5. Do not submit a new wallet transaction.
6. Scroll to the proof observer for an already completed slice.
7. Show the completed stage cards.
8. Open `Judge`.
9. Show the public evidence and explain that the links are replayable by judges.

Fallback line:
"The live flow is wallet-based, but I am using completed public evidence for the recording so the demo does not depend on a slow RPC or proof worker during these two minutes."

## What Not To Do

1. Do not wait silently for 5 to 10 minutes in the demo video.
2. Do not use a slice that already says live when submitting a new payment.
3. Do not acknowledge from the buyer account. Switch to the shop account first.
4. Do not claim the proof is instant. Say clearly that finality and proof submission can take a few minutes.
5. Do not hide a refused proof. A refused proof is still useful because it proves the app handles hard cases honestly.
