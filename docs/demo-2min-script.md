# Relia 2 Minute Demo Script

Target length: 1:45 to 2:00.

## 0:00-0:15 - Open

"Relia turns an informal installment sale into a public, verifiable title update. The buyer pays on Sepolia, the shop acknowledges the exact payment, and the app turns both facts into a proof-backed receipt."

Show the landing page. Point to the three tabs: Tape, Title, Verify.

## 0:15-0:35 - Explain the Problem

"The problem is trust after payment. A buyer can send money, but the public title record should not update from a screenshot, a private database row, or a seller promise. Relia requires two public facts: payment and shop acknowledgement."

Open `Send an installment`.

## 0:35-1:05 - Payment Flow

"Here is a sample title slice. The app reads the installment amount from the payment contract, so the UI is not guessing the price. Any payer can pay for the named buyer, and the receipt records both addresses."

Show asset ID, slice number, buyer, shop, and amount. Click or show `Review pay`.

"The wallet signs a Sepolia transaction. Once confirmed, Relia stores the payment hash and advances the rail."

## 1:05-1:25 - Shop Acknowledgement

"Now the registered shop wallet acknowledges that same payment. This is intentionally a separate wallet action, because the title should not advance from payment alone."

Switch to the shop account if needed. Click `Review acknowledge payment`, then show the confirmed payment and acknowledgement hashes.

## 1:25-1:45 - Proof and Receipt

"After both source facts exist, the proof worker pairs them, waits for finalized source blocks, submits the proof, and emits the public receipt. The UI shows every stage instead of hiding the wait behind fake progress."

Scroll to the proof observer. Show payment found, acknowledgement found, proof queued, attestation ready, proof submitted, and receipt emitted.

## 1:45-2:00 - Close

"For judges, the important part is that Relia is not a mock checkout. It is a full payment-to-title rail with contract tests, live Sepolia transactions, public proof links, and clear failure states. If a slice window is closed or the worker refuses a proof, the app says so plainly instead of pretending."

Open the Judge page and point to the evidence counts and links.

## Backup Line

"If the live worker is slow during the demo, the Judge page and Verify page preserve completed evidence, so the project can still be evaluated from public transactions."
