# Relia UI Improvement TODO

## Current implementation status

Completed in the first UI refresh:

- [x] Rebuilt the landing page around the human trust journey.
- [x] Replaced unfinished hero placeholders with a native payment-to-title illustration.
- [x] Introduced open editorial, quiet contained, dark evidence, and tactile proof section types.
- [x] Simplified the main mechanism into four user-facing steps with progressive technical disclosure.
- [x] Redesigned the public receipt preview and live receipt page around a verdict-first hierarchy.
- [x] Added an active navigation state and reduced the header's visual weight.
- [x] Consolidated connected wallet identity and network information.
- [x] Standardized the operational hierarchy across Send, Title, Tape, and Verify.
- [x] Added durable transaction results, clearer loading states, and an active proof-pipeline step.
- [x] Added reusable copy controls for critical receipt hashes.
- [x] Preserved the colorful, tactile, hand-drawn visual identity and physics centerpiece.
- [x] Added compact responsive layouts and reduced-motion behavior for the refreshed surfaces.
- [x] Completed desktop and compact-width Chrome visual QA.
- [x] Passed TypeScript validation and the optimized production build.

Still intentionally open below are full wallet-state controls, print/share behavior, exhaustive browser/device testing, and performance profiling.

## Guiding constraint

- [x] Preserve Relia's colorful, playful, hand-drawn identity.
- [x] Maintain yellow, green, pink, pale blue, and deep teal as the core palette.
- [x] Keep tactile borders, hard shadows, annotations, stamps, and slight rotations.
- [x] Use quieter surfaces to strengthen expressive moments, not replace them with generic SaaS styling.
- [x] Keep the physics-based brand section as the primary kinetic centerpiece.

## Phase 1 — Foundation and design tokens

- [x] Convert repeated inline styles into reusable CSS classes.
- [x] Formalize semantic color tokens for:
  - [x] Canvas and raised surfaces
  - [x] Primary and muted text
  - [x] Live/proven states
  - [x] Due/pending states
  - [x] Disputed/warning states
  - [x] Shortfall/error states
  - [x] Reclaimed/neutral states
- [x] Add reusable spacing tokens based on a 4px scale.
- [x] Define consistent radius tokens for controls, cards, panels, and landing stages.
- [x] Define separate hard and soft shadow tokens.
- [x] Standardize motion durations and easing curves.
- [x] Create consistent typography classes for display, page title, section title, card title, body, label, and technical text.
- [x] Document which visual treatments are reserved for marketing, operational, and proof surfaces.

## Phase 2 — Shared component system

- [x] Create reusable `Section`, `Container`, `Stack`, and `Grid` layout primitives.
- [x] Create standard card variants:
  - [x] Quiet card
  - [x] Interactive card
  - [x] Proof artifact
  - [x] Dark technical card
  - [x] Illustrated card
- [x] Create consistent button variants:
  - [x] Primary
  - [x] Secondary
  - [x] Quiet
  - [x] Danger
  - [x] Loading
- [x] Standardize badges and status indicators.
- [x] Build a reusable notice component with title, consequence, recovery action, and technical details.
- [x] Create reusable address and transaction-hash fields with copy and explorer actions.
- [x] Create hand-drawn annotation primitives:
  - [x] Arrow
  - [x] Loop
  - [x] Underline
  - [x] Starburst
  - [x] Stamp
- [x] Ensure decorative annotations are hidden from assistive technology.

## Phase 3 — Navigation and wallet controls

- [x] Reduce the header's heavy double-shadow appearance.
- [x] Preserve its rounded, tactile character with a quieter border and shadow.
- [x] Add a clear active-route state.
- [x] Keep one dominant header CTA.
- [x] Consolidate network and account information into a compact wallet control.
- [x] Minimize wallet prominence on public read-only pages.
- [x] Design explicit states for:
  - [x] Disconnected
  - [x] Connecting
  - [x] Connected
  - [x] Wrong network
  - [x] Unsupported wallet
  - [x] Connection failure
- [x] Improve mobile navigation without creating a tall multi-row header.
- [x] Verify keyboard navigation and visible focus indicators.

## Phase 4 — Landing-page hero

- [x] Shorten and sharpen the hero's supporting copy.
- [x] Establish one primary CTA and one quieter verification CTA.
- [x] Remove the unfinished grey photo placeholders.
- [x] Replace them with a custom Relia product illustration showing:
  - [x] Installment payment
  - [x] Shop acknowledgement
  - [x] Proof acceptance
  - [x] New title slice
- [x] Keep the visual understandable without blockchain terminology.
- [x] Add restrained hand-drawn connectors and annotations.
- [x] Create a quick hero entrance sequence for headline, copy, actions, and artifact.
- [x] Ensure all hero content remains visible without JavaScript.
- [x] Test the headline and illustration at 320px.

## Phase 5 — Landing-page composition

- [x] Stop wrapping every section in the same heavy rounded panel.
- [x] Introduce three section types:
  - [x] Open editorial section
  - [x] Quiet contained section
  - [x] High-emphasis evidence section
- [x] Alternate dense sections with generous breathing space.
- [x] Remove unnecessary borders where spacing or a divider is sufficient.
- [x] Reserve saturated backgrounds for pivotal moments.
- [x] Reserve hard shadows for interactive controls and tangible proof artifacts.
- [x] Reduce decorative rotations inside data-heavy sections.
- [x] Keep illustrated cards and annotations in narrative sections.
- [x] Verify that each viewport has one dominant visual message.

## Phase 6 — Product narrative

- [x] Reorder the story around the user's trust journey:
  - [x] Human promise
  - [x] Existing problem
  - [x] Payment-to-title process
  - [x] Public receipt
  - [x] Exceptional states
  - [x] Technical architecture
  - [x] Evidence and status
  - [x] FAQ
  - [x] Final action
- [x] Replace protocol-first explanations with plain-language summaries.
- [x] Put chain and serialization details behind expandable technical sections.
- [x] Explain every technical value with a nearby human-readable interpretation.
- [x] Reduce long paragraphs and improve line lengths.
- [x] Eliminate repeated explanations across sections.
- [x] Make buyer and merchant outcomes equally understandable.

## Phase 7 — Payment-to-title mechanism

- [x] Replace the dense architecture-first diagram with a four-step user-facing sequence:
  - [x] Payment sent
  - [x] Shop acknowledges payment
  - [x] Payment and acknowledgement are proven
  - [x] Title slice becomes live
- [x] Add source-chain and execution-chain labels as secondary metadata.
- [x] Create pending, active, complete, and failed states for each step.
- [x] Animate the connecting rail only as steps complete.
- [x] Use a vertical sequence on compact screens.
- [x] Add an expandable “How verification works” technical view.
- [x] Clearly state that funds are not bridged.

## Phase 8 — Receipt and verification experience

- [x] Put the verification verdict at the top of the page.
- [x] Answer immediately:
  - [x] What the record represents
  - [x] Whether it is valid
  - [x] Who or what it belongs to
  - [x] What state it is in
  - [x] Where the source facts can be inspected
- [x] Redesign the receipt as a durable document rather than a browser mockup.
- [x] Separate the receipt into readable panels.
- [x] Show human-readable facts before hashes.
- [x] Add copy actions for all identifiers.
- [x] Add descriptive explorer links.
- [x] Show human-readable dates alongside exact timestamps.
- [x] Add share and print-friendly presentation.
- [x] Prevent technical values from causing horizontal overflow.
- [x] Ensure public verification never requires a wallet.

## Phase 9 — State language

- [x] Standardize the five primary states:
  - [x] `✓ Live`
  - [x] `! Disputed`
  - [x] `× Shortfall`
  - [x] `↩ Reclaimed`
  - [x] `○ Due`
- [x] Give every state a name, symbol, color, meaning, and possible next action.
- [x] Avoid relying on color alone.
- [x] Add contextual explanations wherever a state appears.
- [x] Ensure submitted transactions are not described as final.
- [x] Standardize state language across landing, title, tape, and verification pages.

## Phase 10 — Transaction pages

- [x] Give `/send`, `/title`, and related write flows a shared task layout.
- [x] Add a visible step indicator.
- [x] Present one primary action per step.
- [x] Add an adjacent transaction summary on wide screens.
- [x] Move the summary below the form on compact screens.
- [x] Show wallet and network requirements before submission.
- [x] Add inline field validation.
- [x] Preserve user input after recoverable failures.
- [x] Keep button width stable during loading.
- [x] Add explicit progress states:
  - [x] Waiting for wallet
  - [x] Transaction submitted
  - [x] Waiting for finality
  - [x] Waiting for acknowledgement
  - [x] Proof generation
  - [x] Title update
  - [x] Complete
- [x] Replace transient success toasts with durable result panels.
- [x] Add expandable technical transaction details.

## Phase 11 — Tables and data-heavy interfaces

- [x] Standardize table typography and spacing.
- [x] Use mono typography only for machine values.
- [x] Add copy controls to addresses and hashes.
- [x] Add clear empty states.
- [x] Add skeleton or progress states where loading is expected.
- [x] Convert table rows to labeled cards below the compact breakpoint.
- [x] Preserve semantic table markup where possible.
- [x] Prevent page-level horizontal scrolling.
- [x] Test with maximum-length identifiers and error messages.

## Phase 12 — Motion system

- [x] Keep the brand physics section as the only complex continuous animation.
- [x] Add subtle one-time section entrances.
- [x] Limit sibling staggering to approximately 180ms total.
- [x] Add sequential activation to the proof pipeline.
- [x] Add restrained count-up behavior to metrics.
- [x] Add tactile hover and press feedback to actionable controls.
- [x] Pause marquees when hovered.
- [x] Stop animation when components are outside the viewport.
- [x] Avoid animating operational data while users are reading or copying it.
- [x] Ensure animation initialization cannot leave content invisible.
- [x] Complete the reduced-motion fallback for every animated component.

## Phase 13 — Responsive refinement

- [x] Test at 320px, 390px, 768px, 1024px, 1280px, and 1440px.
- [x] Test at 200% browser zoom.
- [x] Reduce decorative density on small screens.
- [x] Keep essential actions at least 44px high.
- [x] Stack complex grids before columns become cramped.
- [x] Remove decorative rotations that create mobile overflow.
- [x] Keep hand-drawn accents away from headings and controls.
- [x] Ensure long hashes wrap or truncate safely.
- [x] Confirm hover-only information remains accessible by touch.
- [x] Respect safe-area insets.

## Phase 14 — Accessibility and trust

- [x] Audit heading order.
- [x] Verify the skip link on every route.
- [x] Test complete keyboard navigation.
- [x] Ensure focus rings are visible and unclipped.
- [x] Audit body, muted, badge, and button contrast.
- [x] Add live-region announcements for transaction progress.
- [x] Announce copy confirmation accessibly.
- [x] Associate every input with a persistent label.
- [x] Ensure errors identify both the problem and the recovery action.
- [x] Test with motion disabled.
- [x] Test with JavaScript unavailable where public reading is expected.
- [x] Verify decorative SVGs and physics elements are excluded from the accessibility tree.

## Phase 15 — Final polish and validation

- [x] Remove unused legacy landing-page styles.
- [x] Eliminate remaining nonessential inline styles.
- [x] Check visual consistency across all routes.
- [x] Run TypeScript checks and production builds.
- [ ] Test Chrome, Firefox, Safari, and mobile browsers.
  - [x] Chromium desktop and mobile-sized rendering.
  - [x] Firefox desktop and mobile-sized rendering.
  - [ ] Safari rendering — requires a macOS/Safari or remote Safari environment.
- [ ] Test wallet interactions on supported networks.
  - [x] EIP-1193 UI states for disconnected, connected, wrong network, Sepolia switch, Creditcoin, and disconnect.
  - [ ] Real extension approval and signing — requires a user-controlled funded testnet wallet.
- [x] Review performance impact from physics and animation code.
- [x] Lazy-load the physics engine near the animated section if beneficial.
- [x] Check layout shift and interaction responsiveness.
- [x] Conduct a final copy and terminology review.
- [x] Compare every completed page against the acceptance checklist in `design.md`.

## Recommended delivery sequence

- [x] **Milestone 1:** Tokens, typography, shared surfaces, and navigation
- [x] **Milestone 2:** Hero, landing-page composition, and product narrative
- [x] **Milestone 3:** Mechanism, receipt, and state system
- [x] **Milestone 4:** Transaction flows and data interfaces
- [ ] **Milestone 5:** Motion, responsive behavior, accessibility, and final QA
  - Automated QA is complete; Safari/iOS Safari, hands-on screen-reader navigation, and real extension-wallet signing still require external devices/accounts.

---

## Loading system implementation

### Loading principles

- [x] Preserve page context while asynchronous work is happening.
- [x] Use skeletons that match the final layout instead of replacing entire pages with generic spinners.
- [x] Keep loading animation quieter than the physics-based brand section.
- [x] Use the visual idea of a proof being assembled: payment → acknowledgement → proof → title.
- [x] Prevent layout shifts when loading content is replaced by real content.
- [x] Use accurate stage language rather than artificial progress percentages.
- [x] Keep all button widths and surrounding layouts stable while actions run.

### Phase L1 — Shared loading primitives

- [x] Create a reusable `RouteLoading` component.
- [x] Create a reusable `PanelSkeleton` component.
- [x] Create a reusable `TableSkeleton` component.
- [x] Create a reusable `ReceiptSkeleton` component.
- [x] Create a reusable `TitleSkeleton` component.
- [x] Create a reusable `LoadingButton` component.
- [x] Create a reusable `ProgressStatus` component for longer blockchain operations.
- [x] Add shared loading tokens for:
  - [x] Skeleton base color
  - [x] Skeleton highlight color
  - [x] Loading border color
  - [x] Loading animation duration
  - [x] Loading animation easing
- [x] Give all skeleton components the same pale-paper, thin-border visual treatment.
- [x] Add a static fallback for reduced-motion users.
- [x] Ensure loading components render useful structure without JavaScript animation.

### Phase L2 — Route-level loading

- [x] Add `app/loading.tsx` for route transitions.
- [x] Retain the global header while route content is loading.
- [x] Display a compact payment-to-title progress path:
  - [x] Payment
  - [x] Acknowledgement
  - [x] Proof
  - [x] Title
- [x] Animate only one active path marker at a time.
- [x] Disable path movement under `prefers-reduced-motion: reduce`.
- [x] Avoid using a full-screen splash treatment.
- [x] Verify the route loader appears during first-time route chunk loading.
- [x] Verify the loader does not flash unnecessarily on fast cached navigation.

### Phase L3 — Verify index loading

- [x] Keep the receipt search form usable while recent receipts load.
- [x] Keep the receipt table header visible during loading.
- [x] Replace the plain loading message with four or five skeleton rows.
- [x] Add `aria-busy="true"` to the receipt-list region while loading.
- [x] Announce “Reading public receipt events from Creditcoin” once.
- [x] Add a slow-network message after approximately three seconds.
- [x] Keep loading, empty, error, and success states visually distinct.
- [x] Ensure “No proven receipts found” never appears before loading completes.
- [x] Render labeled row-card skeletons on compact screens.

### Phase L4 — Public receipt loading

- [x] Keep the public receipt page heading visible while its data loads.
- [x] Add a verdict placeholder matching the final receipt dimensions.
- [x] Add amount and slice placeholders.
- [x] Add two source-transaction skeleton rows.
- [x] Add decoded-record skeleton rows.
- [x] Add a Creditcoin-verification skeleton section.
- [x] Keep the receipt's outer dimensions stable when real data arrives.
- [x] Add `aria-busy="true"` to the receipt document.
- [x] Preserve the requested payment hash in the loading interface.
- [x] Provide an error-with-retry state if the Creditcoin read fails.

### Phase L5 — Tape loading

- [x] Keep the Tape heading and explanation visible while loading.
- [x] Display a skeleton table matching the final desktop columns.
- [x] Display labeled skeleton row cards on compact screens.
- [x] Add `aria-busy="true"` to the data surface.
- [x] Announce “Reading the public tape from Creditcoin” once.
- [x] Add a slow-testnet explanation after approximately three seconds.
- [x] Add a retry action after a prolonged or failed request.
- [x] Ensure loading does not temporarily render the empty state.

### Phase L6 — Title loading and read optimization

- [x] Add an explicit loading state to `/title`.
- [x] Start loading only after a valid 32-byte asset ID is entered.
- [x] Clear or mark stale results when the asset ID changes.
- [x] Show a twelve-cell title skeleton matching the final slice board.
- [x] Display “Reading 12 title slices” near the board.
- [x] Add `aria-busy="true"` to the title-result region.
- [x] Replace the skeleton only after the complete title result is ready.
- [x] Prevent results from an earlier asset ID from replacing newer results.
- [x] Parallelize independent title and tape contract reads where safe.
- [x] Handle partial RPC failures as one recoverable read error.
- [x] Add a retry action that preserves the entered asset ID.

### Phase L7 — Send transaction phases

- [x] Replace the shared `/send` `busy` boolean with an explicit payment phase.
- [x] Define the supported phases:
  - [x] `idle`
  - [x] `connecting-wallet`
  - [x] `minting-test-usdc`
  - [x] `approving-usdc`
  - [x] `submitting-payment`
  - [x] `confirming-payment`
  - [x] `submitting-ack`
  - [x] `confirming-ack`
  - [x] `complete`
- [x] Show “Opening wallet…” during connection.
- [x] Show “Preparing test USDC…” during minting.
- [x] Show “Approving 40.00 USDC…” during approval.
- [x] Show “Submit payment in wallet” during the payment signature request.
- [x] Show “Waiting for Sepolia confirmation…” after submission.
- [x] Show “Submit acknowledgement in wallet” during acknowledgement signing.
- [x] Show “Waiting for acknowledgement…” after acknowledgement submission.
- [x] Show “Payment acknowledged” when both source transactions are present.
- [x] Apply loading treatment only to the action currently running.
- [x] Disable conflicting actions without changing their dimensions.
- [x] Preserve all form values after recoverable wallet and network failures.
- [x] Announce major phase changes through one polite live region.

### Phase L8 — Wallet loading states

- [x] Distinguish wallet detection from wallet connection.
- [x] Add a “Detecting wallet…” state when initial provider discovery is pending.
- [x] Add an “Opening wallet…” state after Connect is selected.
- [x] Add a “Waiting for account approval…” state when appropriate.
- [x] Add a “Switching network…” state for chain changes.
- [x] Preserve the existing connected identity state.
- [x] Preserve the rejected-request state and recovery guidance.
- [x] Preserve the unsupported-wallet state and installation guidance.
- [x] Keep the wallet control's width stable across every state.
- [x] Prevent wallet loading state changes from shifting navigation.

### Phase L9 — Progressive timing and slow-network feedback

- [x] Avoid showing loading UI for operations completing in approximately 200ms or less.
- [x] Reveal skeletons after the short anti-flicker delay.
- [x] Add contextual slow-network copy after approximately three seconds.
- [x] Offer retry after approximately ten seconds where cancellation is safe.
- [x] State which network is being queried in slow and failed states.
- [x] Do not show fake completion percentages for blockchain operations.
- [x] Stop loading timers when a component unmounts or a request completes.
- [x] Ensure retry actions do not create duplicate concurrent requests.

### Phase L10 — Loading accessibility

- [x] Add `aria-busy` to every asynchronous content region.
- [x] Use one polite live region per workflow for meaningful stage changes.
- [x] Avoid announcing shimmer frames, pulsing labels, or repeated copy.
- [x] Retain keyboard focus while content regions update.
- [x] Prevent loading overlays from trapping focus.
- [x] Ensure skeleton shapes are hidden from the accessibility tree.
- [x] Provide visible loading text in addition to animation.
- [x] Disable shimmer, pulse, and path movement under reduced motion.
- [x] Verify loaders remain understandable at 200% zoom.
- [x] Verify loading colors meet non-text contrast requirements where applicable.

### Phase L11 — Complete asynchronous state coverage

- [x] Define loading, success, empty, and error states for `/verify`.
- [x] Define loading, success, not-found, and error states for `/verify/[payTx]`.
- [x] Define loading, success, empty, and error states for `/tape`.
- [x] Define idle, loading, success, empty, and error states for `/title`.
- [x] Define every wallet and transaction phase for `/send`.
- [x] Add retry controls where the operation is safely repeatable.
- [x] Ensure empty states can only render after successful completed reads.
- [x] Ensure durable success results remain visible after temporary notices disappear.

### Phase L12 — Loading-system verification

- [x] Test route transitions with an empty browser cache.
- [x] Test fast cached navigation for loading-state flicker.
- [x] Test delayed RPC responses.
- [x] Test failed RPC responses.
- [x] Test wallet rejection at every signing phase.
- [x] Test network switching failures.
- [x] Test changing the Title asset ID during an active read.
- [x] Test repeated Verify searches while events are loading.
- [x] Test desktop and compact skeleton layouts.
- [x] Test keyboard focus during content replacement.
- [x] Test `prefers-reduced-motion: reduce`.
- [x] Run TypeScript validation and the optimized production build.

### Loading delivery sequence

- [x] **Loading milestone 1:** Shared loading primitives and route-level loading
- [x] **Loading milestone 2:** Verify, public receipt, and Tape skeletons
- [x] **Loading milestone 3:** Title loading and parallelized reads
- [x] **Loading milestone 4:** Send and wallet phase state machines
- [x] **Loading milestone 5:** Progressive timing, accessibility, and failure-mode QA
  - Verified 2026-09-08 by the C7/C8/C9 browser audits against the rebuilt production app; remaining external browser/device coverage is tracked separately below.

---

## Remaining contract-function UI

This backlog covers contract capabilities that do not yet have a complete user-facing screen. Deployment, one-time contract wiring, proof submission, and consumer-only state mutations remain infrastructure responsibilities and should not be exposed as ordinary public controls.

### Phase C0 — Live integration prerequisites

- [x] Deploy or confirm the Sepolia contracts:
  - [x] `MockUSDC`
  - [x] `ReliaPaySink`
  - [x] `ReliaShopAck`
- [x] Deploy or confirm the Creditcoin contracts:
  - [x] `AssetRegistry`
  - [x] `ShortfallTape`
  - [x] `TitlePass`
  - [x] `ProofConsumer`
- [x] Complete the one-time contract wiring with the existing deployment scripts.
  - `registry.wire(pass, tape)`, `tape.setConsumer`, `pass.setConsumer`, `pass.setRegistrar` all confirmed on-chain 2026-09-08 against the redeployed contracts.
- [x] Configure all seven `NEXT_PUBLIC_*` contract addresses for the frontend.
- [x] Configure `NEXT_PUBLIC_CTC_DEPLOY_BLOCK` so event reads do not scan from genesis.
- [x] Validate bytecode and chain IDs before enabling transaction controls.
- [x] Add a visible configuration-error state when an address is missing or malformed.
- [x] Disable affected actions instead of attempting transactions against an empty address.
- [x] Confirm the proof worker is configured with the matching deployments and source-chain key.
  - Worker started 2026-09-08 against the redeployed addresses; `SOURCE_CHAIN_KEY=1` resolved live via `npm run chainkey` rather than trusted as a guess.

Verified 2026-09-07: both RPC chain IDs matched, all seven configured addresses returned deployed bytecode, and the configured asset resolved through `AssetRegistry.getAsset(...)`. Re-verified 2026-09-08 after a full redeploy (see [README.md](../README.md#deployed-addresses) and Phase C10 below).

### Phase C1 — Asset detail route

- [x] Add `/assets/[assetId]` as the canonical screen for one listed asset.
- [x] Read and display `AssetRegistry.getAsset(assetId)`.
- [x] Read and display `AssetRegistry.allWindows(assetId)`.
- [x] Read and display `TitlePass.ownerOf(tokenId)`.
- [x] Read and display `TitlePass.slicesFilled(assetId)` and `isCleared(assetId)`.
- [x] Read the twelve `ShortfallTape.sliceOf(assetId, n)` records in parallel.
- [x] Show asset kind, installment amount, buyer, Creditcoin shop, and Sepolia shop.
- [x] Show all twelve payment deadlines with upcoming, open, expired, and resolved treatments.
- [x] Link proven or disputed payment hashes to their public receipt screens.
- [x] Provide contextual actions for Pay, Settle, Reclaim, and Transfer only when eligible.
- [x] Add loading, unknown-asset, RPC-error, and retry states.
- [x] Preserve the colorful paper-and-ledger design language from `design.md`.

Verified 2026-09-07 against the configured live asset: registry terms, title ownership/progress, and all twelve tape slices loaded from Creditcoin. Desktop and 390px responsive renders, unknown-asset handling, TypeScript, and an isolated production build passed. Tape and Title now link into the canonical asset record.

### Phase C2 — Asset listing wizard

- [x] Add `/assets/new` for creating a hire-purchase title.
- [x] Explain that listing writes to Creditcoin and shop registration writes to Sepolia.
- [x] Add fields for:
  - [x] Asset kind
  - [x] Installment amount
  - [x] Buyer address
  - [x] Creditcoin shop address
  - [x] Sepolia shop address
  - [x] Twelve increasing payment-window deadlines
- [x] Provide a schedule builder that can generate twelve dates from a start date and cadence.
- [x] Allow advanced users to edit each deadline individually.
- [x] Validate non-zero addresses, non-zero installment, future deadlines, and strictly increasing windows before wallet submission.
- [x] Add a readable review step before signing.
- [x] Switch to Creditcoin and submit `AssetRegistry.list(...)`.
- [x] Wait for confirmation and derive the new `assetId` from the `Listed` event.
- [x] Preserve the confirmed Creditcoin listing if the later Sepolia step fails.
- [x] Switch to Sepolia and submit `ReliaShopAck.registerShop(assetId, shop)`.
- [x] Confirm the registered shop matches the Creditcoin registry binding.
- [x] Show separate progress states for wallet connection, network switching, signature, and confirmation on each chain.
- [x] Provide a resumable “Finish shop registration” state after partial completion.
- [x] Finish with links to the asset detail, Send, Title, and explorer pages.

Verified 2026-09-07: TypeScript and an isolated production build passed. The dedicated C2 browser audit passed at 390px, 768px, and 1440px with twelve generated deadlines, no horizontal overflow, no hydration warnings, a valid review transition, and recovery from a persisted Creditcoin checkpoint. Live transaction code is wired to the configured testnets; the audit intentionally did not submit wallet transactions.

### Phase C3 — Shop registration recovery

- [x] Add a reusable shop-registration panel to the asset detail page.
- [x] Read `ReliaShopAck.shopOf(assetId)` before showing the action.
- [x] Show “Not registered on Sepolia” only after the read completes successfully.
- [x] Allow registration only when the current binding is empty.
- [x] Clearly display the immutable first-write behavior before signing.
- [x] Refuse a proposed shop address that differs from the Creditcoin registry value.
- [x] Handle already-registered, rejected-signature, wrong-network, and RPC-failure states.
- [x] Link the confirmed registration transaction to the Sepolia explorer.

Verified 2026-09-07: the configured live asset resolved to a matching Sepolia shop with no write action exposed. The dedicated C3 browser audit also injected empty and conflicting `shopOf` responses, confirmed that only the verified-empty state exposes registration, and passed the conflict layout at 390px with no overflow or hydration warnings. TypeScript and an isolated production build passed; no wallet transaction was submitted.

### Phase C4 — Reclaim workflow

- [x] Add a Reclaim action to eligible `Shortfall` rows on `/tape` and the asset detail page.
- [x] Never show Reclaim for `Due`, `Live`, `Disputed`, or `Reclaimed` slices.
- [x] Explain that the current contract allows any caller to submit a reclaim transaction.
- [x] Present the asset ID, slice number, window deadline, payment evidence, and current status before signing.
- [x] Switch to Creditcoin and submit `ShortfallTape.reclaim(assetId, n)`.
- [x] Add explicit signing and confirmation progress states.
- [x] Decode and explain `ReclaimBlockedLive`, `ReclaimBlockedDisputed`, and `NotReclaimable` errors.
- [x] Refresh the affected row in place after confirmation instead of reloading the full page.
- [x] Keep the confirmed transaction link visible as a durable result.

Verified 2026-09-07: a dedicated C4 browser audit supplied Shortfall, Due, Live, Disputed, and Reclaimed records and confirmed that exactly the Shortfall exposed reclaim on both Tape and Asset Detail. The evidence review, three custom refusal explanations, 390px dialog fit, zero overflow, and hydration checks passed. TypeScript and an isolated production build passed; no wallet transaction was submitted.

### Phase C5 — Title ownership and transfer

- [x] Extend `/title` or add `/title/[assetId]` with ownership-management controls.
- [x] Read and display `ownerOf`, `getApproved`, and relevant `isApprovedForAll` state.
- [x] Display the on-chain `tokenURI` metadata in a human-readable preview.
- [x] Hide or disable transfer and token-approval controls until all twelve slices are cleared.
- [x] Explain the soulbound restriction when a title is still in progress.
- [x] Require the connected wallet to be the owner or an authorized operator before presenting Transfer.
- [x] Add a recipient-address field with checksum and zero-address validation.
- [x] Show a final transfer review containing the asset, current owner, and recipient.
- [x] Submit `TitlePass.safeTransferFrom(from, to, tokenId)` on Creditcoin.
- [x] Add explicit network-switch, signature, and confirmation phases.
- [x] Refresh ownership after confirmation and preserve the explorer link.
- [x] Add a single-token approval control for `TitlePass.approve`.
- [x] Add operator approval and revocation controls for `setApprovalForAll`.
- [x] Warn that approvals permit another address to move a cleared title.
- [x] Handle soulbound, wrong-owner, unauthorized, rejected-signature, and RPC errors.

Verified 2026-09-07: the configured live title rendered its owner, empty token approval, embedded token metadata, and soulbound explanation with no management controls. The dedicated C5 audit also exercised mocked cleared-title states for the owner, an unauthorized visitor, and an approved operator; zero-address rejection; the final transfer review; 390px overflow; and hydration stability. TypeScript and an isolated production build passed; no wallet transaction was submitted.

### Phase C6 — Tape history and audit detail

- [x] Add a per-asset history view using `entryCountOf` and `entryOfAt`.
- [x] Add an optional global activity view using `entryCount` and `entryAt`.
- [x] Render entries chronologically as an append-only timeline.
- [x] Distinguish Due, Live, Shortfall, Disputed, and Reclaimed transitions.
- [x] Link payment and acknowledgement hashes wherever present.
- [x] Explain why a disputed payment blocks reclaim.
- [x] Add pagination or bounded reads for large histories.
- [x] Add loading, empty, error, retry, and stale-data states.

Verified 2026-09-07: the dedicated C6 browser audit covered the initial 16-entry bounded read, loading four older entries, chronological rendering, all five tape states, disputed-reclaim guidance, payment and acknowledgement evidence links, stale/empty/error/retry states, the global activity feed, 390px responsive behavior, and hydration stability. TypeScript and an isolated production build passed.

### Phase C7 — Proof-worker visibility

- [x] Add a non-custodial proof-status panel without exposing worker signing controls.
- [x] Show the public sequence: payment found → acknowledgement found → attestation ready → proof submitted → receipt emitted.
- [x] Distinguish a pending acknowledgement from a failed or refused proof.
- [x] Surface the worker’s refusal reason in plain language when safely available.
- [x] Link the Sepolia payment, Sepolia acknowledgement, and Creditcoin proof transactions.
- [x] Provide a manual refresh action without allowing duplicate proof submission.
- [x] Document that `ProofConsumer.consume(...)` and `proveShortfallDispute(...)` are worker operations, not browser-wallet actions.

Verified 2026-09-07: the dedicated C7 browser audit covered pending acknowledgement, named worker refusal, complete proof, worker-feed outage, manual refresh, all three explorer evidence links, the absence of proof-submission controls, 390px responsive behavior, and hydration stability. The worker status endpoint passed a live read-only/CORS check, both app and worker TypeScript validation passed, the worker compiled, and an isolated frontend production build completed successfully. No wallet or proof transaction was submitted.

### Phase C8 — Existing-screen consolidation

- [x] Replace the temporary combined buyer/shop acknowledgement control on `/send` with role-aware presentation.
- [x] Keep the buyer payment result durable while the shop acknowledgement is still pending.
- [x] Show the connected account and required signer beside each write action.
- [x] Detect and explain when the connected account is not the registered shop.
- [x] Link asset selections in `/send`, `/tape`, and `/title` to the canonical asset detail route.
- [x] Add an asset picker to `/title` so users are not required to paste a hash.
- [x] Add filters to `/tape` for asset, buyer, shop, status, and actionable slices.
- [x] Replace full-page reload after settlement with targeted state refresh.
- [x] Ensure all write actions reuse `LoadingButton`, `ProgressStatus`, wallet phases, and shared error decoding.

Verified 2026-09-07: the dedicated C8 browser audit restored a confirmed buyer payment from browser storage after navigation, kept its acknowledgement pending, detected and blocked a non-shop connected account, checked role and signer summaries, canonical asset links, the title picker, all five tape filters, targeted row refresh, shared write-state primitives, 390px responsive behavior, and hydration stability. TypeScript and an isolated production build passed; no wallet transaction was submitted.

### Phase C9 — Safety, accessibility, and responsive QA

- [x] Never present infrastructure-only methods as general user actions:
  - [x] `AssetRegistry.wire`
  - [x] `ShortfallTape.setConsumer`
  - [x] `TitlePass.setConsumer`
  - [x] `TitlePass.setRegistrar`
  - [x] `ShortfallTape.markLive`
  - [x] `ShortfallTape.markPaymentProven`
  - [x] `TitlePass.mint`
  - [x] `TitlePass.tick`
- [x] Confirm every write screen displays chain, contract, action, and signer before submission.
- [x] Add confirmation steps for irreversible or first-write actions.
- [x] Preserve form values after rejected signatures and network errors.
- [x] Prevent duplicate transaction submission while a hash is pending.
- [x] Keep transaction results visible after temporary messages disappear.
- [x] Add `aria-busy`, polite live regions, keyboard focus management, and reduced-motion behavior.
- [x] Test every screen at 320px, 768px, 1024px, and wide desktop widths.
- [x] Test 200% zoom and keyboard-only operation.
- [x] Test missing-wallet, wrong-network, rejected-signature, RPC-failure, revert, empty, and success states.
- [x] Run TypeScript validation, contract tests, worker validation, and the optimized frontend build.

Verified 2026-09-07: the C9 safety audit checked all nine routes at 320px, 768px, 1024px, and 1440px with no horizontal overflow; the 200%-zoom equivalent; keyboard roving focus; missing-wallet, wrong-network, rejected-signature, RPC, revert, empty, and success handling; form and durable-result preservation; infrastructure-method exclusion; review gates; duplicate locks; live regions; error focus; reduced motion; and hydration stability. The C8 regression remained green. All 46 Solidity tests passed, the worker typechecked and compiled, frontend TypeScript passed, and the isolated optimized frontend build succeeded. No wallet transaction was submitted.

### Phase C10 — End-to-end live workflow completion

- [x] Confirm the one-time contract wiring is correct on both testnets before running user transactions.
  - Verified 2026-09-08 via direct `cast call` against the redeployed contracts (not assumed from scripts): `AssetRegistry.titlePass()/tape()`, `ShortfallTape.consumer()`, `TitlePass.consumer()/registrar()`, and `ProofConsumer.paySinkSepolia()/shopAckSepolia()` all match the addresses in [README.md](../README.md#deployed-addresses).
- [x] Configure and run the proof worker against the same Sepolia and Creditcoin deployments.
  - Worker built and started 2026-09-08 against the redeployed addresses; `npm run chainkey` resolved `SOURCE_CHAIN_KEY=1` live rather than trusting the prior guessed value.
- [x] Confirm the worker can observe a finalized payment and matching acknowledgement.
  - A real `pay()` and `ack()` were submitted on Sepolia for the demo asset; the worker logged `sepolia_mined`, `ack_located`, `block_finalized`, and `attested` for both.
- [x] Generate the cross-chain proof and submit it through the infrastructure-controlled consumer flow.
  - Verified 2026-09-09: the worker observed the real Sepolia payment `0x0e07b1fd3695b95299d877f4772d6a12aec05ddb9662c11159676dc3f7e355d8`, acknowledgement `0xf4b28cdfe57ff04ebbc8d4db0f2e4f35d6add642040f854a3cbd537ce9786190`, reached `attested` and `proof_generated`, and the matching `consume()` calldata landed on Creditcoin as `0x0fd7b4319f4cd8693d92578a29451d032082b80bce4b09f63b41d1bc27405ab2` in block `5457260`.
- [x] Verify the corresponding Creditcoin receipt event is emitted and the correct title slice becomes live.
  - Verified 2026-09-09 by direct Creditcoin reads: `InstallmentReceipt` exists, `consumed(payTx) == true`, `consumed(ackTx) == true`, `isSliceLive(assetId, 1) == true`, and `slicesFilled(assetId) == 1` for asset `0x5aea9e7b1c2f754cacfb4cd1113db6727b001400fcfa4eaeb40e2c3aff425668`.
- [x] Add a read-only frontend status source for:
  - [x] Payment confirmed — `sepolia_mined`
  - [x] Acknowledgement confirmed — `ack_located`
  - [x] Proof queued — `proof_queued`
  - [x] Attestation ready — `attested`
  - [x] Proof submitted — `proof_generated`
  - [x] Proof refused or failed — `failure()` / decoded refusal names
  - [x] Receipt emitted — `verified`
  - [x] Title updated — `title_ticked`
  - All emitted by `worker/src/status.ts` + `worker/src/stages.ts` and consumed by `app/components/ProofStatusPanel.tsx`, wired into `/send`.
- [x] Drive live progress animation only from confirmed status data; do not infer completion from elapsed time.
  - `/send` now passes only confirmed payment/ack hashes into the proof observer, and the observer marks proof steps complete from status events rather than submitted hashes.
- [x] Reconcile status after refresh, temporary RPC failure, worker restart, and browser back/forward navigation.
  - The worker now writes a bounded JSON checkpoint with cursor, pairs, submitted proof hash, and public stage events; the status endpoint hydrates from it on restart.
- [x] Prevent duplicate proof submission while a payment is queued or already consumed.
  - The worker checks `consumer.consumed()` before proving, persists queued pairs, records `proofTxHash` as soon as `consume()` returns a transaction hash, and waits on that existing transaction after restart instead of submitting a duplicate.
- [x] Complete the user-facing contract screens tracked in Phases C1–C8:
  - [x] Canonical asset detail and twelve-slice history
  - [x] Asset listing and resumable shop registration
  - [x] Reclaim workflow
  - [x] Cleared-title transfer and approval management
  - [x] Proof-worker visibility and existing-screen consolidation
- [ ] Run a funded-wallet testnet journey with real extension approval:
  - [ ] Connect wallet and verify account/network presentation
  - [x] Mint and approve test USDC — done directly via `cast send` with the buyer's key (not through the browser wallet UI)
  - [x] Submit and confirm an installment payment — real, confirmed on Sepolia
  - [x] Submit and confirm the registered shop acknowledgement — real, confirmed on Sepolia
  - [x] Observe proof generation without a browser signing control — confirmed via the worker's own status feed
  - [x] Verify receipt emission and title update through the public UI — verified 2026-09-09 in headless Chrome against the production server: `/verify/0x0e07b1fd3695b95299d877f4772d6a12aec05ddb9662c11159676dc3f7e355d8`, `/assets/0x5aea9e7b1c2f754cacfb4cd1113db6727b001400fcfa4eaeb40e2c3aff425668`, and `/title/0x5aea9e7b1c2f754cacfb4cd1113db6727b001400fcfa4eaeb40e2c3aff425668` render the live receipt/title data with no horizontal overflow. Still not a browser-extension signing journey because payment and acknowledgement were driven through `cast`/scripts.
- [x] Test wallet rejection at every signature request without losing entered values.
- [x] Test wrong-network recovery, RPC timeout, reverted transaction, worker refusal, and worker outage.
- [x] Preserve every submitted transaction hash and reconcile confirmation without duplicate writes.
- [x] Run contract tests, proof-worker validation, frontend browser audits, and the optimized production build as one release gate.
  - 2026-09-08: `forge test` 56/56 passing (46 original + 10 new, covering the `ReliaShopAck` front-run fix and `TitlePass.safeTransferFrom` fix); `tsc --noEmit` clean on `app` and `worker`; `forge build` clean.

### Contract UI delivery sequence

- [x] **Contract UI milestone 1:** Deployment configuration and address validation
- [x] **Contract UI milestone 2:** Canonical asset detail and read-only history
- [x] **Contract UI milestone 3:** Asset listing and resumable shop registration
- [x] **Contract UI milestone 4:** Reclaim actions and role-aware settlement refresh
- [x] **Contract UI milestone 5:** Cleared-title transfer and approval management
- [x] **Contract UI milestone 6:** Proof-worker visibility and existing-screen consolidation
- [ ] **Contract UI milestone 7:** Accessibility, failure-mode, responsive, and end-to-end QA
  - Automated accessibility, failure-mode, responsive, worker-outage, and duplicate-submission coverage is done. Still open: live funded-wallet browser-extension approval; the final on-chain `consume()` broadcast is complete.

---

## Landing-page interactivity expansion

This work should make the landing page feel responsive and exploratory while using interaction to explain Relia. Motion must support comprehension rather than becoming continuous decoration.

### Interaction principles

- [x] Make every reaction correspond to a user action, narrative transition, or meaningful product state.
- [x] Preserve the colorful, playful, hand-drawn visual language in every new interaction.
- [x] Keep the physics-based brand section as the only complex continuous animation.
- [x] Prefer short, one-time sequences over looping movement.
- [x] Keep important content visible before client-side JavaScript initializes.
- [x] Do not use motion to conceal loading, contract latency, or incomplete functionality.
- [x] Avoid layout shifts, hydration-dependent attributes, random render-time values, and server/client markup differences.
- [x] Support pointer, keyboard, and touch input; do not make essential information hover-only.
- [x] Provide a quiet equivalent for every interaction under `prefers-reduced-motion: reduce`.

### Phase I1 — Interaction architecture

- [x] Inventory every landing-page element as static, actionable, explanatory, or decorative.
- [x] Define shared interaction states for idle, hover, focus-visible, pressed, active, complete, failed, and disabled.
- [x] Extend the motion tokens in `design.md` with durations for drawing, stamping, sequencing, and panel expansion.
- [x] Create reusable viewport-entry and replay-on-intent utilities.
- [x] Ensure viewport observers disconnect when their elements unmount.
- [x] Stop ambient work while the page is hidden or an animated section is offscreen.
- [x] Keep initial server and client markup deterministic.
- [x] Establish a performance budget before adding new client-side dependencies.

### Phase I2 — Interactive hero story

- [x] Turn the hero proof illustration into a guided payment-to-title demonstration.
- [x] Let users select or focus each of the four proof stages.
- [x] Highlight the selected stage and reveal one concise explanatory annotation.
- [x] Animate connectors only when advancing between stages.
- [x] Draw the hero arrow once when the proof artifact enters the viewport.
- [x] Animate the final title slices filling after proof acceptance.
- [x] Give the proof stamp a restrained landing response without moving surrounding content.
- [x] Add a replay control that is discoverable by keyboard and touch.
- [x] Keep the complete illustration and explanation understandable when animation is disabled.

### Phase I3 — Scroll-led narrative

- [x] Coordinate section entrances so headings, explanations, and artifacts reveal in reading order.
- [x] Keep total sibling staggering below approximately 180ms.
- [x] Use drawn connectors or underlines to guide attention between related ideas.
- [x] Animate the notebook-to-public-tape comparison as a single causal transformation.
- [x] Reveal receipt evidence only after its human-readable verdict appears.
- [x] Activate proof and state diagrams when they become relevant in the viewport.
- [x] Avoid scroll-jacking, forced snapping, pinned sections, or transformations that interfere with reading.
- [x] Ensure anchor links and browser history restore to stable positions.

### Phase I4 — Payment-to-title playground

- [x] Preserve the In progress, All complete, and Proof refused preview controls.
- [x] Animate marker, connector, card-surface, and label changes as one coordinated state transition.
- [x] Prevent marker movement or card-size changes while switching states.
- [x] Add a short plain-language consequence for the selected state.
- [x] Allow direct selection of an individual step for more detail.
- [x] Keep selected-step detail close to the relevant card on desktop and directly below it on mobile.
- [x] Announce preview changes through one polite live region.
- [x] Verify rapid state switching cannot leave mixed colors, labels, or connector states.

### Phase I5 — Receipt exploration

- [x] Make the landing-page receipt preview inspectable without turning it into a full application screen.
- [x] Let users expand payment, acknowledgement, and title evidence independently.
- [x] Provide copy feedback for sample identifiers without implying they are live records.
- [x] Add a tactile page or panel response when details open and close.
- [x] Animate the receipt stamp and slice board only after the verdict is visible.
- [x] Keep all technical details reachable through keyboard controls.
- [x] Preserve a direct path to the real public verification interface.
- [x] Ensure expandable content does not cause horizontal overflow or obscure nearby sections.

### Phase I6 — Tactile micro-interactions

- [x] Standardize hover, focus, press, and release behavior for buttons and links.
- [x] Use small shadow compression and translation to make primary controls feel physical.
- [x] Give cards a restrained lift or border response only when they are genuinely interactive.
- [x] Add drawn underline movement to important text links.
- [x] Give stamps, badges, and state markers distinct but related state-change responses.
- [x] Add clear copy-success, replay, expansion, and selection feedback.
- [x] Avoid pointer-following movement on text, forms, or proof data.
- [x] Disable hover transforms on touch-first devices.

### Phase I7 — Hand-drawn responsive motion

- [x] Animate existing arrows, loops, underlines, and annotations using their native SVG or CSS geometry.
- [x] Keep decorative paths behind content and outside control hit areas.
- [x] Reduce the number and amplitude of decorative reactions below the compact breakpoint.
- [x] Replace cursor-dependent effects with tap or focus responses on touch devices.
- [x] Ensure annotations never cover headings, buttons, receipt facts, or focus rings.
- [x] Prevent slight rotations and translations from creating page-level overflow.
- [x] Verify the experience remains playful without relying on continuous motion.

### Phase I8 — Accessibility and motion safety

- [x] Verify every interactive object has an appropriate semantic element, accessible name, and visible focus state.
- [x] Ensure the interaction order matches the visual and reading order.
- [x] Provide keyboard operation for state previews, detail panels, replay controls, and receipt inspection.
- [x] Keep touch targets at least 44px in both dimensions where practical.
- [x] Avoid flashing, abrupt zooming, parallax, and large involuntary movement.
- [x] Replace reduced-motion sequences with immediate state changes and static emphasis.
- [x] Keep live-region announcements concise and prevent duplicate announcements.
- [x] Verify all explanatory content is available without hover, animation, or precise pointer control.

### Phase I9 — Performance and implementation safety

- [x] Use CSS transforms and opacity for visual motion where possible.
- [x] Avoid layout animation of large sections and frequently changing `top`, `left`, width, or height values.
- [x] Lazy-load any optional animation engine near the section that uses it.
- [x] Do not add a general animation dependency unless native CSS and the current utilities are insufficient.
- [x] Measure initial JavaScript, main-thread work, interaction latency, and cumulative layout shift before and after implementation.
- [x] Test throttled mobile CPU and network conditions.
- [x] Ensure observers, pointer listeners, timers, and animation frames are cleaned up.
- [x] Confirm the landing page remains complete and navigable when optional effects fail.

Local production performance snapshot (single-run diagnostics, 2026-09-07):

- Initial route JavaScript held at 116 kB; the 83 kB raw Matter.js chunk remains separate and loads only near its section.
- Desktop: transferred script 231 → 231 kB, task time 1,882 → 1,934 ms, CLS 0.0953 → 0, measured replay interaction 16 → 104 ms, and DOM nodes 742 → 682.
- 390px mobile with 4× CPU and Fast 3G: transferred script 231 → 231 kB, task time 2,342 → 2,830 ms, CLS 0 → 0, measured replay interaction unavailable in the baseline → 64 ms, and DOM nodes 742 → 681.
- Save-data simulation confirmed the main heading and primary navigation remain present while the optional physics canvas stays disabled.
- These figures are local lab diagnostics rather than field Core Web Vitals; compare repeated runs or production telemetry before treating small timing changes as regressions.

### Phase I10 — Integration-aware experiences

- [x] Keep demo interactions clearly distinguishable from live contract state.
- [x] Connect live animations to confirmed contract events only when reliable event data is available.
- [x] Represent wallet approval, submission, confirmation, proof generation, and title update as distinct stages.
- [x] Never animate a submitted transaction as final before confirmation.
- [x] Provide deterministic sample data when live contracts or wallets are unavailable.
- [x] Preserve usable fallback states for RPC failure, wallet rejection, and unsupported networks.

Implementation notes:

- Landing interactions use a shared sample-mode disclosure and centralized deterministic values; none of those values enter a write path.
- Contract availability is derived from the configured non-zero public addresses instead of a hard-coded deployment claim.
- The live `/send` rail advances submission from a wallet-returned hash and advances confirmation only from a successful network receipt. Proof and title remain pending until corresponding confirmed events exist.
- If an RPC read fails after a hash is returned, retry reconciles that retained hash rather than issuing a duplicate transaction.
- Missing contract configuration disables wallet actions while keeping public explanation, sample interactions, and verification navigation available.

### Phase I11 — Cross-device validation

- [ ] Test the complete landing-page interaction path with mouse, keyboard, touch, and screen-reader navigation.
  - [x] Mouse, keyboard, and emulated-touch input paths.
  - [x] Browser accessibility tree: main and navigation landmarks present, 15 named buttons, and zero unnamed focusable controls.
  - [ ] Hands-on screen-reader navigation with VoiceOver, NVDA, or a GUI-attached Orca session requires an external desktop test.
- [x] Test at 320px, 390px, 768px, 1024px, 1280px, and 1440px.
- [x] Test at 200% zoom and with enlarged text.
- [ ] Test Chrome, Firefox, Safari, and representative mobile browsers.
  - [x] Chromium desktop and mobile device emulation at 320px and 390px.
  - [x] Firefox desktop and compact rendering; headless Firefox clamps its minimum window to 500px.
  - [ ] Safari and real iOS Safari require a macOS/iOS or remote-device environment unavailable in this workspace.
- [x] Test with JavaScript unavailable, reduced motion enabled, a slow CPU, and a slow network.
- [x] Test repeated interaction, rapid clicking, reverse navigation, tab restoration, and browser back/forward behavior.
- [x] Verify there are no hydration warnings, console errors, stuck hidden elements, or layout shifts.
- [x] Run TypeScript validation and the optimized production build.

Local production validation snapshot (2026-09-07):

- Chromium passed all six required widths with no horizontal overflow, no stuck hidden content, working 44px hero actions, and CLS between 0 and 0.0001.
- Hero selection, keyboard arrow navigation, five rapid replays, forward and reverse process changes, touch activation, receipt expansion, FAQ expansion, history restoration, and background-tab restoration all passed.
- Reduced motion kept content visible, stopped the marquee, and disabled the physics canvas. JavaScript-disabled checks retained the heading, navigation, and no-script explanation.
- Firefox passed interactive examples, disclosure panels, reduced motion, no-JavaScript content, and compact/desktop overflow checks.
- The 390px, 4× CPU, Fast 3G run measured CLS 0 and a 32 ms replay interaction in the local lab profile.
- Chromium reported no console messages, runtime exceptions, unhandled rejections, or hydration warnings.
- Re-run with `npm run interaction:audit -- <url>`, `npm run firefox:audit -- <url>`, and `npm run perf:audit -- <url> --throttled`.

### Phase I12 — Landing-page content density and mobile rhythm

Reduce the cumulative reading burden without removing Relia's colorful, playful, hand-drawn character or weakening the product's trust story. The problem is repeated explanation across sections, not long individual paragraphs. Let interaction, artifacts, and confirmed state carry more of the meaning.

#### Guiding constraints

- [x] Preserve the hero promise, interactive proof demonstration, public receipt, live-status honesty, and primary paths to Send and Verify.
- [x] Keep essential risk, signer, network, and non-custodial information visible at the point where it affects a decision.
- [x] Do not hide required instructions or transaction consequences merely to shorten the page.
- [x] Keep technical evidence accessible through progressive disclosure and canonical detail routes.
- [x] Preserve meaningful headings and landmarks for screen-reader and keyboard navigation.
- [x] Preserve deterministic server/client markup, reduced-motion behavior, and no-JavaScript comprehension.
- [x] Do not replace useful copy with unexplained decorative motion.
- [x] Reuse the existing design tokens, illustrations, state system, and interaction language from `design.md`.

#### Composition reduction

- [x] Reduce the landing page's visible copy by approximately 30–40% while preserving its complete core argument.
- [x] Recompose the current hero plus eight numbered sections into six focused narrative beats:
  - [x] Hero and interactive proof demonstration
  - [x] Private-notebook versus public-record comparison
  - [x] Four-step payment-to-title mechanism
  - [x] Inspectable public receipt
  - [x] Combined trust, live evidence, and honest status
  - [x] Compact FAQ and final CTA
- [x] Keep one primary idea and one dominant action within each mobile viewport where practical.
- [x] Remove repeated explanations that payments stay on Sepolia while only proof travels; state this once prominently and reference it concisely elsewhere.
- [x] Merge “The Problem” and “Designed for the Hard Cases” into one coherent trust narrative.
- [x] Keep “Payment to Title” as the human explanation and move “Under the Hood” details into its expandable technical drawer.
- [x] Merge “Public Evidence” and “Honest Status” into one compact, live-aware evidence strip.
- [x] Keep the physics-based brand moment as a visual pause, but verify it does not interrupt the core reading sequence.
- [x] Shorten the final CTA so it closes the story without restating the hero.

#### Mobile presentation

- [x] Recompose desktop grids for mobile instead of stacking every desktop block into one long column.
- [x] Replace the overflowing two-row mobile header with a contained one-row header and an accessible navigation sheet.
- [x] Make the hero kicker and highlighted promise wrap inside the viewport at 320px and 390px.
- [x] Present one active hero-proof artifact at a time behind a four-step touch selector on compact screens.
- [x] Reduce the mobile brand-motion stage so it remains a visual pause instead of a screen-height interruption.
- [x] Use full-width primary actions and maintain touch targets of at least 44px.
- [x] Convert optional metadata and technical explanations into accessible disclosure panels.
- [x] Use horizontal scrolling only for optional, clearly signposted content such as the 12-slice title rail; never for required reading.
- [x] Reduce nested card-within-card presentation by using spacing, background shifts, and typography for hierarchy.
- [x] Keep body-copy lines readable and prevent headings from producing awkward single-word wraps at 320px and 390px.
- [x] Keep the active product state, artifact, or demonstration visually dominant over its supporting copy.
- [x] Ensure compact layouts leave sufficient breathing room between narrative beats without creating empty, screen-height gaps.

#### Content and evidence accuracy

- [x] Update the landing-page contract-test count from 46 to the current verified total of 56.
- [x] Derive changing evidence counts from one shared source or clearly label them as a dated snapshot to prevent future drift.
- [x] Replace generic trust claims with verifiable states, transaction evidence, or plain-language contract guarantees.
- [x] Keep sample and live records unmistakably distinct.
- [x] Use user goals—Pay, Acknowledge, Verify, Claim title—as primary language; keep contract names in technical detail views.
- [x] Confirm every remaining sentence adds new information, supports a decision, or explains the adjacent interaction.

#### Validation

- [x] Compare visible word count, section count, and mobile page height before and after the revision.
- [ ] Confirm a first-time reader can explain Relia's payment-to-title mechanism after viewing the hero and first three narrative beats.
- [x] Confirm Send and Verify remain discoverable without opening any disclosure.
- [x] Test the revised page at 320px, 390px, 768px, 1024px, and 1440px.
- [x] Test enlarged text and 200% zoom without clipping, overlap, or horizontal page overflow.
- [x] Test keyboard, touch, reduced-motion, and JavaScript-disabled variants.
- [x] Verify heading order, landmarks, disclosure names, focus visibility, and reading order.
- [x] Confirm no hydration warnings, layout shifts, stale hidden content, or interaction regressions.
- [x] Audit visible element bounds so `overflow-x: clip` cannot conceal a containment failure.
- [x] Run the interaction, Firefox, performance, TypeScript, and optimized production-build gates.

Verified 2026-09-10: at 390px the initial visible copy fell from 1,050 to 700 words (33.3%) and page height fell from 11,920px to 8,357px (29.9%). The landing page now has six narrative beats, six visible secondary headings, retained Send and Verify paths, explicit visible-element containment across the required widths, and no hydration errors. The compact header, wrapping hero treatment, single-stage proof selector, and shorter brand-motion pause passed the optimized Chromium interaction audit. Firefox, reduced-motion, enlarged-text, 200%-zoom, no-JavaScript, and throttled production performance checks remain covered by the broader phase validation. A real first-reader comprehension study remains intentionally open.

### Phase I13 — Mobile experience quality: 8–9/10

Turn the technically responsive landing page into a deliberately composed mobile experience. Preserve Relia's colorful, playful, hand-drawn identity while reducing repetition, visual competition, interaction ambiguity, and responsive CSS fragility.

#### Guiding constraints

- [ ] Preserve the hero promise, Send and Verify paths, public receipt, honest testnet status, and non-custodial explanation.
- [ ] Preserve complete keyboard, screen-reader, reduced-motion, enlarged-text, and no-JavaScript experiences.
- [ ] Keep sample records unmistakably distinct from live chain evidence.
- [ ] Do not hide transaction consequences, signer requirements, network requirements, or recovery guidance to reduce page length.
- [ ] Keep the existing color system, paper metaphors, tactile outlines, and hand-drawn accents, but concentrate them around meaningful actions and artifacts.
- [ ] Prefer mobile-specific composition over shrinking or stacking desktop layouts.
- [ ] Keep deterministic server/client markup and do not reintroduce hydration-sensitive DOM decoration.

#### I13.1 — Responsive foundation and CSS consolidation

- [x] Inventory every active landing-page and navigation rule at the 860px, 820px, 760px, 640px, 560px, and 420px breakpoints.
- [x] Remove superseded phase-specific declarations and resolve conflicting cascade ownership.
- [x] Establish one compact navigation breakpoint and one primary landing-page compact breakpoint.
- [x] Use container queries where behavior depends on component width rather than viewport width.
- [x] Standardize compact-screen page gutters at 16px, with safe-area additions where required.
- [x] Ensure all grid and flex children that contain copy, hashes, or controls use `min-width: 0` and bounded inline sizing.
- [x] Add `scroll-padding-top` and appropriate `scroll-margin-top` values for the sticky header, headings, errors, and focus targets.
- [x] Preserve the visible-element bounding-box audit so `overflow-x: clip` cannot conceal containment failures.

#### I13.2 — Mobile header and navigation

- [x] Give the Relia brand link a minimum 44px touch area without visually enlarging the mark.
- [x] Keep the hamburger as an icon-only 44px control with a clear accessible name.
- [x] Replace ambiguous compact wallet copy:
  - [x] Show `Connect` when an injected wallet is available.
  - [x] Show `Get wallet` or equivalent recovery language when no provider is available.
  - [x] Keep unavailable, loading, error, and connected states visually distinct.
- [x] Replace duplicated desktop/mobile navigation markup with one canonical route source and one controlled responsive presentation.
- [x] Expose accurate expanded/collapsed state to assistive technology.
- [x] Close the mobile menu on route selection, outside interaction, and Escape.
- [x] Return focus to the hamburger when the menu closes.
- [x] Confirm the menu never obscures its trigger, a focused control, or an inline error.
- [x] Keep the complete mobile header approximately 60–64px tall, excluding device safe areas.

Verified 2026-09-10: I13.1 and I13.2 now have one canonical route tree, one 680px compact-navigation/landing ownership layer, safe-area-aware 16px gutters, sticky-header scroll offsets, bounded navigation and wallet content, and explicit provider-recovery copy. The Chromium audit covers 320px through 1440px, visible-element containment, 44px brand and menu targets, 60–64px compact header height, expanded state, panel clearance, Escape focus return, outside dismissal, route-selection dismissal, wallet recovery language, enlarged text, 200% zoom, reduced motion, no JavaScript, hydration, and runtime errors.

#### I13.3 — Hero hierarchy and first viewport

- [x] Raise the hero kicker and public-reading note to at least 11–12px where they communicate useful information.
- [x] Tune the compact hero heading to approximately 35–36px at 375–390px without awkward single-word wraps.
- [x] Reduce the yellow highlight's border and shadow weight on compact screens while preserving the hand-marked emphasis.
- [x] Tighten spacing between supporting copy, primary CTA, secondary action, and proof preview.
- [x] Keep `Send an installment` as the only dominant hero action.
- [x] Keep Verify visible as a quieter secondary path.
- [x] Show a meaningful portion of the proof artifact within the first viewport on common 667px and 844px device heights.
- [x] Confirm the first viewport contains one promise, one primary action, and one visible product consequence.

#### I13.4 — Mobile proof interaction

- [x] Remove automatic playback or slow it to approximately 1,400–1,800ms per stage so each state can be read.
- [x] Prefer an explicit `Play story` control over unsolicited state changes.
- [x] Stop playback immediately when the user selects a stage.
- [x] Keep four stage selectors with touch areas of at least 44px.
- [x] Increase visible stage labels from 8px to at least 11px.
- [x] Give every selector a concise accessible name and clear selected styling using more than color alone.
- [x] Make the displayed proof artifact non-interactive on mobile unless tapping it intentionally advances the story.
- [x] If card tapping advances the story, communicate that behavior and announce the resulting stage.
- [x] Animate the evidence that changes rather than moving the complete card unnecessarily.
- [x] Keep a complete, stable final state for reduced-motion and no-JavaScript users.

Verified 2026-09-10: I13.3 and I13.4 now use a 35–36px compact hero heading, 11px essential labels, a lighter hand-marked highlight, tighter action rhythm, and a short-screen composition that exposes the active title artifact at 390×667. The proof initializes to its complete final state without autoplay, runs only from an explicit `Play story` control at 1,500ms per stage, cancels immediately on direct selection, advances one step when the displayed compact card is activated, and announces its updated explanation politely. The Chromium matrix passed at 320–1440px with short-viewport, touch-target, selected-state, keyboard, reduced-motion, no-JavaScript, hydration, containment, and CLS assertions all green.

#### I13.5 — Narrative reduction and page composition

- [x] Keep the hero proof as the primary payment-to-title explanation.
- [x] Convert the later four-step process section into a compact optional technical disclosure.
- [x] Remove repeated explanations already communicated by the hero interaction.
- [x] Recompose the private-note/public-record comparison into one bounded two-state frame with explicit controls.
- [x] Keep the comparison understandable without animation or interaction.
- [x] Integrate the hard-case outcomes into the comparison rather than presenting another large card cluster.
- [x] State prominently once that payment funds remain on Sepolia; use concise references elsewhere.
- [x] Move contract names, source mechanics, and secondary implementation details into accessible disclosures.
- [x] Reduce initially visible mobile copy from approximately 700 words to 525–575 words.
- [x] Reduce 390px page height from approximately 8,357px to 6,500–7,000px without removing required trust information.

#### I13.6 — Surface hierarchy and card reduction

- [x] Reserve hard borders and offset shadows for the primary CTA, active proof artifact, public receipt, and final conversion panel.
- [x] Use flatter borders or background shifts for stage selectors, status rows, FAQ items, and technical disclosures.
- [x] Remove unnecessary card-within-card structures.
- [x] Ensure each remaining card has one responsibility and one dominant information level.
- [x] Use spacing and typography before adding another border or shadow.
- [x] Keep pink, yellow, and green attached to consistent editorial, attention, and live-state meanings.
- [x] Confirm that decorative surfaces never compete visually with transaction or verification controls.

Verified 2026-09-10: I13.5 and I13.6 reduce the initially visible 390px landing page from 700 to 574 words and from 8,357px to 6,016px—shorter than the estimated height target without removing the public receipt, testnet status, non-custodial explanation, Send/Verify paths, or hard-case outcomes. The hero proof is now the sole initially expanded four-step explanation; the detailed process is an accessible optional walkthrough. One bounded private/public comparison replaces the previous ledger plus card cluster, includes explicit mobile controls, integrates silent-shop and refused-proof outcomes, and retains a no-JavaScript summary. Secondary surfaces use flat one-pixel structure and inset selection marks, while tactile borders and shadows remain concentrated on consequential actions and evidence. Density and Chromium interaction audits passed with no overflow, hydration warnings, runtime errors, stuck content, or meaningful CLS across 320–1440px.

#### I13.7 — Mobile typography and scanability

- [x] Use 11–12px as the minimum for essential metadata and technical labels.
- [x] Use at least 12px for interactive labels.
- [x] Keep supporting body copy near 15–16px with comfortable line height.
- [x] Keep major mobile section headings near 28–32px unless a deliberate display treatment justifies otherwise.
- [x] Reduce uppercase tracking on labels below 12px.
- [x] Keep body-copy lines near 35–45 characters where practical.
- [x] Left-align explanations longer than two lines; reserve centered copy mainly for the hero and final CTA.
- [x] Test long wallet states, localized labels, contract errors, hashes, and enlarged text without clipping.

#### I13.8 — Mobile motion and touch behavior

- [x] Prevent the brand-motion canvas from consuming vertical page gestures on coarse pointers.
- [x] Use `touch-action: pan-y`, a touch-safe alternative, or disable drag physics on touch devices.
- [x] Prefer simple tap reactions over precision dragging on phones.
- [x] Stop the continuous ticker on compact screens when the physics field is active.
- [x] Reduce the number of physics tokens on constrained devices.
- [x] Keep the brand-motion section approximately 280–320px tall.
- [x] Pause optional animation when its section leaves the viewport or the document becomes hidden.
- [x] Keep pressed feedback immediate and restrained, without shifting surrounding layout.
- [x] Confirm all interaction remains understandable when motion is disabled or fails to initialize.

Verified 2026-09-10: I13.7 and I13.8 establish 11px essential metadata, 12px interactive controls, 15–16px supporting copy, 28–32px section headings, reduced tracking, readable measures, and left-aligned long explanations on compact screens. Long wallet and comparison labels, hashes, 200% zoom, and enlarged text remain contained without horizontal overflow. The 300px brand-motion field now preserves vertical scrolling with `touch-action: pan-y`, disables precision drag capture on coarse pointers, provides a restrained tap nudge, limits compact devices to six or eight tokens, stops the competing ticker, and pauses outside the viewport or while the document is hidden. Reduced-motion, Save-Data, no-JavaScript, and failed-initialization fallbacks retain understandable content. The density audit passes at 566 initially visible mobile words and 5,993px page height; typechecking and the optimized production build pass.

#### I13.9 — Evidence, status, and final conversion

- [ ] Replace the cramped three-column compact evidence row with one principal statistic and two supporting facts.
- [ ] Raise evidence labels to at least 11px and preserve the dated snapshot label.
- [ ] Continue expressing status with text and symbols as well as color.
- [ ] Keep current testnet limitations visible without giving them equal weight to the main product promise.
- [ ] Move raw hashes, addresses, and network implementation detail into expandable or canonical detail views.
- [ ] Keep the FAQ compact and reveal only one answer at a time if testing shows cumulative expansion is distracting.
- [ ] Keep the final CTA short and avoid restating the complete hero argument.

#### I13.10 — Validation and first-reader testing

- [ ] Capture and review full-page and first-viewport renders at 320px, 375px, 390px, and 430px.
- [ ] Test at common short and tall viewport heights, including approximately 667px and 844px.
- [ ] Test a physical iPhone and Android device in addition to emulation.
- [ ] Test Safari/iOS Safari and Chrome/Android.
- [ ] Test slow network, CPU throttling, Save-Data, and a constrained device profile.
- [ ] Test 200% zoom and enlarged text without clipping, overlap, or loss of function.
- [ ] Test keyboard order, visible focus, menu dismissal, focus return, and sticky-header obstruction.
- [ ] Test representative screen-reader navigation and announcements.
- [ ] Confirm every important touch target is at least 44px and has sufficient separation.
- [ ] Confirm no page-level or visually clipped horizontal overflow at 320px.
- [ ] Confirm production CLS stays below `0.05` at the required viewport widths.
- [ ] Confirm no hydration warnings, runtime exceptions, unhandled rejections, or content stuck in an animated state.
- [ ] Keep landing First Load JS at or below the design-system budget unless a measured product requirement documents the exception.
- [ ] Run the interaction, Firefox, performance, TypeScript, and isolated optimized-build gates.
- [ ] Conduct a five-person first-reader study and ask each participant:
  - [ ] What does Relia do?
  - [ ] Where does the payment money remain?
  - [ ] What does the public receipt prove?
  - [ ] What happens if the shop does not acknowledge payment?
  - [ ] What would you tap first?
- [ ] Confirm at least four of five first-time readers can explain the core payment-to-title journey without opening technical disclosures.

#### Phase I13 acceptance criteria

- [ ] No clipping or horizontal scrolling at 320px.
- [ ] All important controls and navigation targets are at least 44px.
- [ ] No essential text is smaller than 11px.
- [ ] Initially visible mobile copy is approximately 525–575 words.
- [ ] The 390px landing page is approximately 6,500–7,000px tall.
- [ ] Each narrative beat has one dominant idea and no more than one dominant interaction.
- [ ] The four-step payment-to-title explanation is not duplicated.
- [ ] No decorative region traps vertical touch scrolling.
- [ ] No uncontrolled autoplay changes readable content.
- [ ] Production CLS remains below `0.05` across the required viewport matrix.
- [ ] Navigation has complete open, close, dismissal, focus, and route-change behavior.
- [ ] The landing page passes hydration, accessibility, responsive, interaction, reduced-motion, no-JavaScript, and performance checks.
- [ ] Safari, physical-device, and first-reader results are documented.

### Interactivity delivery sequence

- [x] **Interactivity milestone 1:** Architecture, state model, and deterministic reveal utilities
- [x] **Interactivity milestone 2:** Hero demonstration and scroll-led narrative
- [x] **Interactivity milestone 3:** Process playground and receipt exploration
- [x] **Interactivity milestone 4:** Tactile controls, hand-drawn responses, and compact-screen adaptation
- [ ] **Interactivity milestone 5:** Accessibility, performance profiling, failure modes, and cross-browser QA
  - Automated Chromium/Firefox-style interaction, responsive, reduced-motion, no-JavaScript, and failure-mode checks are done. Still open: Safari/iOS Safari and hands-on screen-reader navigation.
- [x] **Interactivity milestone 6:** Landing-page content-density reduction and mobile narrative recomposition
  - Implementation and automated validation are complete; the first-reader comprehension study remains open.
- [ ] **Interactivity milestone 7:** Mobile experience quality and 8–9/10 refinement
  - Complete Phase I13, including the responsive CSS consolidation, mobile-first content recomposition, touch-safe motion, physical-device coverage, and first-reader study.
