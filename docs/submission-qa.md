# Relia Submission QA

Last updated: 2026-09-11

This file separates checks completed inside the repo from checks that need external people or devices. Do not mark the human study complete from an automated run.

## Automated Pass

Run these against the production URL or a local production server:

```bash
npm --prefix app run submission:a11y -- https://relia-live.vercel.app
npm --prefix app run i13:visual-audit -- https://relia-live.vercel.app
npm --prefix app run interaction:audit -- https://relia-live.vercel.app
npm --prefix app run perf:audit -- https://relia-live.vercel.app
```

The `submission:a11y` pass checks the landing, Judge, Send, Verify, Tape, and Title routes for main/navigation landmarks, named buttons and links, skip-link support, labeled form fields, live regions, mobile target sizing, horizontal overflow, reduced motion, 200%-zoom proxy behavior, no-JavaScript readability, runtime errors, and hydration warnings.

## Screen-Reader Pass

Use one real screen reader before submission when available:

- VoiceOver on iOS Safari or macOS Safari
- NVDA on Windows Firefox or Chrome
- Orca on Linux Firefox with a GUI session

Pass criteria:

- The skip link reaches the main content.
- Primary navigation reads as navigation and each link has a useful name.
- The hero explains the product before technical details.
- Send, Verify, Tape, Title, and Judge page headings are announced correctly.
- Payment and acknowledgement stages announce current, complete, failed, or pending state in words.
- Copy buttons and explorer links include the value type in their accessible names.
- Wallet-required actions explain signer and network before opening the wallet.
- Status changes use polite live regions and do not repeat continuously.

## First-Reader Study

Recruit five people who have not seen Relia. Give them the live URL and do not explain the product first.

Ask these questions after two minutes:

1. What does Relia do?
2. Where does the payment money remain?
3. What does the public receipt prove?
4. What happens if the shop does not acknowledge payment?
5. What would you tap first?

Pass criteria:

- At least four of five readers describe the payment-to-title journey without opening technical disclosures.
- At least four of five understand that payment funds remain on Sepolia and proof updates Creditcoin.
- At least four of five identify Send or Verify as the next action.

## External Device Matrix

Still requires physical or hosted devices:

- iPhone Safari
- Android Chrome
- Real wallet extension approval with a funded testnet account

These checks are intentionally external because this repo environment cannot emulate the assistive technology and wallet-extension behavior faithfully enough to count as final human QA.
