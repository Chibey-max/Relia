# Relia Design Direction

## Purpose

This document defines a reusable visual and interaction system for Relia. It is informed by an audit of a contemporary product-studio site, but it deliberately does not reuse that site's identity, wording, imagery, exact section order, or signature compositions.

Relia should feel:

- trustworthy enough for payment and ownership records;
- understandable without prior blockchain knowledge;
- technically precise without looking like developer tooling;
- energetic and human, with a distinctly practical point of view;
- public and inspectable rather than exclusive or mysterious.

The central design principle is **evidence with momentum**. Every page should make the next action obvious, show the proof behind a claim, and use motion to explain state changes rather than merely decorate the screen.

---

## 1. Product-specific visual thesis

Relia sits between a public record, a transaction tool, and an ownership artifact. Its visual language should combine three modes:

1. **Editorial explanation** for the landing page and educational passages.
2. **Instrument-panel clarity** for transaction and verification flows.
3. **Receipt-like permanence** for proofs, title slices, hashes, and final states.

The site should not resemble a generic crypto dashboard. Avoid dark gradients everywhere, glowing tokens, abstract chain artwork, glass-on-neon cards, and unexplained hexadecimal data. Use plain language first and technical detail second.

### Design character

- Pale blue-grey paper is the default field.
- Deep green-black ink supplies authority and contrast.
- Yellow marks attention, not decoration.
- Green means successfully proven or live.
- Pink is a small editorial accent, never a status color.
- Mono typography denotes machine-verifiable facts.
- Slightly imperfect rotations and hard offset shadows make explanatory artifacts feel handled and physical.
- Large, quiet areas around important statements prevent the dense technical UI from feeling overwhelming.

---

## 2. Page composition

### Landing page narrative

Use a progressive story rather than a collection of interchangeable feature cards:

1. **Promise:** one concrete human outcome and two clear actions.
2. **Problem:** what fails in the current paper or trust-based process.
3. **Mechanism:** the minimum explanation of how payment, acknowledgement, proof, and title connect.
4. **Artifact:** a believable receipt or title specimen that users can inspect.
5. **Decision logic:** explain disputed, live, shortfall, and reclaimed states.
6. **Public evidence:** numbers, constraints, and system status.
7. **Questions:** resolve objections close to the conversion point.
8. **Final action:** repeat the primary path with lower-friction language.

Do not reproduce any reference site's sequence literally. The order above follows Relia's trust journey: claim → mechanism → evidence → action.

### Application pages

Transaction pages should use a repeatable composition:

- compact page intro with eyebrow, title, and one-sentence purpose;
- primary task panel on the left or first in source order;
- context/status panel alongside it on wide screens;
- step or state rail immediately after the input panel;
- output artifact below, never hidden in a transient toast;
- technical detail progressively disclosed beneath the human-readable result.

Verification pages should put the verdict before the raw data. The first viewport must answer:

- What is this?
- Is it valid?
- Who or what does it belong to?
- What happened next?
- Where can I inspect the source facts?

### Section rhythm

Alternate between three densities:

- **Breathing section:** large headline, short copy, one focal object.
- **Working section:** two-column explanation plus an interactive or data artifact.
- **Evidence band:** dense metrics, statuses, or a compact ledger.

Never place more than two dense sections back-to-back. After a table, diagram, or long form, use a breathing section or generous divider space.

---

## 3. Layout grid

### Containers

Use three named content widths:

| Token | Width | Use |
| --- | ---: | --- |
| `--container-reading` | `720px` | Long copy, FAQs, legal explanation |
| `--container-product` | `1180px` | App shell, forms, data views, standard sections |
| `--container-stage` | `1280px` | Landing-page color blocks and visual showcases |

Global page gutters:

- small: `12px` minimum, usually `16px`;
- medium: `24px`;
- large: `32px`;
- wide: `40px` where the stage container permits it.

Respect safe-area insets on all edge-to-edge sections.

### Columns

Base all wide layouts on a 12-column conceptual grid, even when CSS Grid uses simpler fractions.

- Hero copy: columns 2–11, centered.
- Standard two-up: 6/6 or 5/7 depending on artifact importance.
- App intro: 7/5.
- Three-up evidence cards: 4/4/4.
- Footer: 4/2/2/4.
- Reading content: centered 7-column equivalent.

Use `minmax(0, 1fr)` to prevent hashes and addresses from forcing overflow. Long machine values must wrap, truncate with a copy action, or scroll inside a deliberately bounded code surface.

### Alignment rules

- Headings and body copy are left-aligned by default.
- Center alignment is reserved for the opening promise, a single pivotal statement, or a final action.
- Technical labels align to the same left edge as their values.
- Cards in a row share either their top edge or baseline; decorative rotation may break the silhouette but not the information alignment.
- Do not center dense forms, tables, receipt fields, or explanatory paragraphs.

---

## 4. Spacing system

Use a 4px base with a practical, limited scale:

| Token | Value | Typical use |
| --- | ---: | --- |
| `--space-1` | `4px` | icon nudges, compact inline gaps |
| `--space-2` | `8px` | icon/label, badge internals |
| `--space-3` | `12px` | compact controls, mobile gutters |
| `--space-4` | `16px` | default component gap |
| `--space-5` | `20px` | card subgroups |
| `--space-6` | `24px` | card padding, field groups |
| `--space-8` | `32px` | layout gaps, compact section padding |
| `--space-10` | `40px` | section subgroups |
| `--space-12` | `48px` | standard section separation |
| `--space-14` | `56px` | large card padding |
| `--space-16` | `64px` | desktop hero/section padding |
| `--space-20` | `80px` | major landing-page rhythm |
| `--space-24` | `96px` | breathing sections on wide screens |

Spacing is relational:

- label to heading: `12–16px`;
- heading to supporting copy: `16–24px`;
- copy to actions: `28–40px`;
- field label to field: `8px`;
- field to field: `16–20px`;
- card heading to body: `12–16px`;
- card body to footer/action: `20–28px`;
- section heading to section content: `32–56px`.

On small screens, reduce large spacing by roughly one third, but keep control padding and tap target sizes intact.

---

## 5. Typography and visual hierarchy

Retain Relia's existing role separation:

- **Figtree** for display headings, decisive labels, and controls.
- **Schibsted Grotesk** for readable body copy and navigation.
- **IBM Plex Mono** for hashes, chain names, block numbers, machine states, and eyebrow labels.

### Type scale

| Role | Size | Line height | Weight |
| --- | --- | --- | --- |
| Display | `clamp(44px, 6vw, 72px)` | `0.98–1.06` | `800–900` |
| Page title | `clamp(36px, 5vw, 58px)` | `1.02` | `800–900` |
| Section title | `clamp(28px, 4vw, 42px)` | `1.05–1.12` | `800–900` |
| Card title | `18–22px` | `1.2` | `750–850` |
| Lead | `17–20px` | `1.55–1.65` | `400–500` |
| Body | `15–16px` | `1.55–1.7` | `400–500` |
| Label | `10–12px` | `1.3` | `600–700` |
| Technical | `11–13px` | `1.5` | `400–600` |

### Hierarchy principles

- One message dominates each viewport.
- Use weight, size, and whitespace before introducing another color.
- Body copy should rarely exceed 70 characters per line.
- Eyebrows orient; they do not carry essential meaning.
- Use uppercase only for compact metadata and states.
- Highlight no more than one phrase in a headline.
- Every technical code should have a nearby plain-language interpretation.
- Numerical status is tabular and mono when comparison matters.

---

## 6. Color system

The current Relia palette is suitable and should be formalized by role:

```css
:root {
  --surface-canvas: #edf4f7;
  --surface-subtle: #dceef6;
  --surface-raised: #ffffff;
  --surface-dark: #0e3a42;
  --surface-darkest: #101b1e;

  --text-primary: #0e3a42;
  --text-strong: #101b1e;
  --text-muted: #4b6b73;
  --text-on-dark: #eaf4f6;

  --border-default: #c9dde3;
  --border-strong: #101b1e;

  --accent-attention: #ffc629;
  --accent-live: #17b26a;
  --accent-live-soft: #c9f5de;
  --accent-editorial: #ec2e6b;

  --state-error: #e5484d;
  --state-warning-bg: #fdf3d7;
  --state-error-bg: #fbe3e4;
}
```

### Usage constraints

- Canvas and raised surfaces carry most of the site.
- Dark fields are reserved for the proof mechanism, system internals, or dense evidence bands.
- Yellow identifies the current focus, a crucial caveat, or a selected phrase.
- Green is exclusive to success/live/proven status and primary completion actions.
- Red is exclusive to errors, shortfalls, and destructive warnings.
- Pink may number sections or punctuate editorial moments; it must not imply a system state.
- Meet WCAG AA contrast for all body text and controls. Never rely on color alone for a verdict.

---

## 7. Border radii, borders, and shadows

### Radius scale

| Token | Value | Use |
| --- | ---: | --- |
| `--radius-xs` | `6px` | tiny tags, inline code |
| `--radius-sm` | `10px` | inputs, compact rows |
| `--radius-md` | `14px` | notices, dropdowns |
| `--radius-lg` | `18px` | app cards, table cards |
| `--radius-xl` | `22px` | hero panels and mobile section blocks |
| `--radius-2xl` | `28px` | desktop landing-page blocks |
| `--radius-pill` | `999px` | buttons, status pills, navigation shell |

Do not mix more than three radius sizes within one component family. A pill shape indicates an action, filter, identity, or compact status—not a general-purpose container.

### Borders

- Strong, important artifacts: `2px solid var(--border-strong)`.
- Quiet dividers and nested rows: `1px solid var(--border-default)`.
- Dark surfaces: low-contrast teal border until focused or hovered.
- Focus rings sit outside the component and must not replace the component border.

### Shadows

Use two distinct shadow languages:

- **Physical proof artifact:** hard `4–5px` offset shadow in dark ink.
- **Temporary overlay:** soft ambient shadow, e.g. `0 18px 50px rgba(11,20,22,.14)`.

Hard shadows suit receipts, decisive buttons, and cards meant to feel tangible. Soft shadows suit popovers, wallet messages, and floating navigation. Never combine heavy blur, a hard offset, and a thick border on the same component.

---

## 8. Cards and information surfaces

### Surface governance

Use surface treatments by responsibility, not simply for visual variety:

| Surface role | Reserved for | Treatment | Avoid |
| --- | --- | --- | --- |
| Marketing | Landing-page promises, demonstrations, playful explanations | Brand color fields, expressive scale, annotations, slight rotation, occasional hard shadow | Dense live data and wallet-critical decisions |
| Operational | Forms, lookups, wallet steps, filters, tables | Quiet raised paper, disciplined alignment, restrained borders, minimal or soft depth | Decorative rotation, cursor-following effects, ambiguous status color |
| Proof | Receipts, finalized title state, source facts, durable transaction results | Strong border, receipt structure, hard physical shadow, mono evidence, copy and explorer actions | Glass blur, transient-only success, decorative motion over selectable values |
| Technical | REL1 payloads, contract mechanics, decoded data, implementation detail | Dark teal field, low-contrast teal rule, light technical text, progressive disclosure | Primary page verdicts and long explanatory prose |

Marketing surfaces may be visually louder, but they must never imitate a live proof. Operational surfaces prioritize task completion. Proof surfaces communicate permanence. Technical surfaces explain how the evidence works without dominating the human-readable result.

The corresponding CSS roles are `.surface-marketing`, `.surface-operational`, `.surface-proof`, and `.surface-technical`. Component-specific classes may extend these roles, but should preserve their border, depth, motion, and information-density rules.

### Standard card

- Raised white surface.
- `18–20px` radius.
- `2px` strong border for primary artifacts; `1px` quiet border for nested items.
- `22–26px` padding desktop, `18–22px` small screens.
- One heading, one responsibility, one primary action maximum.

### Receipt card

Treat a receipt as a durable document, not a marketing mockup:

- strong outside border and hard offset shadow;
- a clear verdict header;
- horizontal panels separated by rules;
- plain-language summary before hashes;
- copy and explorer actions adjacent to each source value;
- immutable/final language near the bottom;
- no decorative rotation once the user is reading real data.

### State card

Each state card includes:

- icon or symbol;
- state name;
- one-sentence meaning;
- next possible action;
- timestamp or block reference where relevant.

State colors supplement the name and icon. For example: `✓ Live`, `! Disputed`, `× Shortfall`, `↩ Reclaimed`, `○ Due`.

### Demonstration card

For landing-page examples, a subtle `-1deg` to `1deg` rotation is allowed. Hover settles it to `0deg` and lifts it `2–4px`, creating the sense that the object is being picked up for inspection.

### Dense data

- Use tables above `860px` where comparison across columns matters.
- Convert table rows to labeled cards below `860px` rather than forcing horizontal page scroll.
- Preserve semantic table markup when possible.
- Pin identifiers to a mono style and enable wrapping at safe boundaries.
- Place copy buttons inside the value cell with explicit accessible labels.

---

## 9. Controls and navigation

### Navigation

Use a compact floating shell on wide screens:

- maximum width aligned to the product container;
- high-opacity white surface with mild backdrop blur;
- clear brand area, central routes, and wallet/action cluster;
- fixed or sticky only while it remains compact and does not hide content.

On small screens:

- the header may become static to protect vertical space;
- routes may use a horizontally scrollable row with visible overflow cues;
- every item remains at least `44px` high;
- wallet status wraps beneath navigation rather than squeezing labels.

### Buttons

Primary buttons should feel direct and slightly physical:

- pill shape;
- `42px` minimum height desktop, `44px` small screens;
- semibold or bold display face;
- concise verb-led label;
- arrow only when it communicates navigation or progression.

Interactions:

- hover: rise `1px`, strengthen shadow or slightly shift fill;
- active: compress to `0.97–0.99` or move into the hard shadow by `1–2px`;
- focus-visible: `3px` yellow outline with `3px` offset;
- disabled: lower opacity and remove all lift/press behavior;
- loading: keep width stable and change the interior, not the overall geometry.

Secondary buttons use a white surface with dark text. Danger actions do not borrow the success green.

### Inputs

- Labels are always visible; placeholders are examples, not labels.
- Default height at least `44px`.
- Inputs use the mono face only for addresses, hashes, amounts, and chain values.
- Focus may shift `-1px` and gain a hard shadow, but must not cause layout shift.
- Validation messages live beneath the field and state the correction.
- Network and wallet constraints should appear before submission when knowable.

---

## 10. Hover states and micro-interactions

Hover behavior is available only inside `@media (hover: hover) and (pointer: fine)`.

Use these patterns consistently:

| Element | Hover response | Active response |
| --- | --- | --- |
| Primary button | `translate(-1px, -1px)`, stronger hard shadow | move `1px` into shadow |
| Navigation link | muted → primary text, quiet tinted fill | no bounce |
| Artifact card | settle rotation, rise `3–4px`, stronger shadow | optional `scale(.995)` |
| Dark mechanism card | rise `3–4px`, accent border | none unless clickable |
| Image/specimen | rise `2–3px`, soft depth | none |
| Copy control | icon swap to check, label becomes “Copied” | immediate |
| Address/hash link | underline or border reveal | preserve selectable text |
| Accordion trigger | tinted row background, icon rotates | expand/collapse |

### Micro-interaction principles

- Every response confirms either **affordance**, **input**, **progress**, or **result**.
- Cursor-following effects are limited to one optional hero accent; never apply them to operational cards or transaction controls.
- Copy success persists about `1.5–2s` and is also announced to assistive technology.
- Wallet connection, chain switching, and proof generation require explicit progress states.
- A completed pipeline step should visually lock into place instead of continuing to pulse.
- Error motion is a small notice entrance, not a shake.
- Decorative icons may travel slightly on hover, but text and essential controls stay stable.

---

## 11. Motion and transitions

### Motion tokens

```css
:root {
  --motion-tap: 100ms;
  --motion-fast: 160ms;
  --motion-standard: 240ms;
  --motion-reveal: 520ms;
  --motion-expand: 420ms;
  --motion-sequence-step: 45ms;
  --motion-draw: 620ms;
  --motion-stamp: 360ms;
  --motion-panel: 420ms;
  --ease-out: cubic-bezier(.23, 1, .32, 1);
  --ease-expand: cubic-bezier(.22, 1, .36, 1);
  --ease-sweep: cubic-bezier(.7, 0, .2, 1);
  --ease-stamp: cubic-bezier(.2, 1.45, .4, 1);
}
```

### Interaction principles

1. **State before spectacle.** The most visible animation should communicate what changed.
2. **Transform and opacity first.** Avoid animating layout dimensions except controlled accordion grids.
3. **Short for controls, longer for context.** Controls respond within `100–240ms`; section entrances may take `420–560ms`.
4. **One focal movement at a time.** A section reveal, odometer, and marquee should not compete in the same viewport.
5. **Finite by default.** Repeating animation is reserved for passive ambient marks and slow marquees; pause it on hover where users may want to inspect content.
6. **No motion debt.** Elements must render visible without JavaScript and remain usable if animation initialization fails.

### Interaction roles and state contract

Classify an element before adding behavior:

| Role | Purpose | Permitted behavior |
| --- | --- | --- |
| Static | Stable reading or proof data | No entrance dependency or pointer response |
| Actionable | Navigates, submits, selects, copies, or expands | Idle, hover, focus-visible, pressed, active, and disabled states |
| Explanatory | Demonstrates sequence or cause and effect | One-time entrance, user-controlled selection, and explicit replay |
| Decorative | Adds hand-drawn character without meaning | Quiet finite motion or one ambient loop that pauses offscreen |

Shared state names are `idle`, `hover`, `focus-visible`, `pressed`, `active`, `complete`, `failed`, and `disabled`. Semantic HTML and native pseudo-classes express control state first; `data-state` or `data-interaction-state` may supplement them when a product state cannot be represented natively. State must never be encoded only by animation or color.

### Landing-page interaction inventory

| Area | Primary role | Interaction boundary |
| --- | --- | --- |
| Navigation and hero actions | Actionable | Tactile control feedback; no pointer-following on controls |
| Hero proof artifact | Explanatory | Selectable stages, finite connector drawing, explicit replay |
| Hand-drawn hero accents | Decorative | One-time drawing or a few pixels of fine-pointer response |
| Notebook-to-tape comparison | Explanatory | A finite causal transformation when it enters the viewport |
| Payment-to-title journey | Actionable and explanatory | State preview, step inspection, and accessible announcements |
| Receipt specimen | Explanatory | Independently expandable evidence and copy feedback |
| Hard-case cards and architecture | Explanatory | Focus/tap disclosure where additional detail exists |
| Evidence and status | Static | Finite count-up only; final values always remain in the DOM |
| Physics brand stage | Decorative and exploratory | The single complex ambient system; pause offscreen and when hidden |
| FAQ | Actionable | Native disclosure behavior with stable focus |
| Final actions | Actionable | Standard tactile button and link feedback |

### Runtime contract

- Viewport entrances are one-shot and unobserve immediately after playing.
- Replay occurs only after explicit click, keyboard activation, or touch activation of a semantic control.
- Observers, event listeners, animation frames, and Web Animations are disconnected or cancelled on route change and unmount.
- Ambient CSS animation and physics stop when offscreen or while `document.hidden` is true.
- Fine-pointer effects are enabled only when both hover and a fine pointer are available.
- Server-rendered markup never depends on viewport size, pointer capability, time, randomness, locale, or browser globals.
- Random physics values are created only after hydration and never alter the initial React tree.

### Demo and live-state boundary

- Label explanatory controls as `Interactive example · sample data · no wallet`; interaction alone must never make a specimen look live.
- Keep deterministic sample values in one dedicated module and never pass them into contract write functions.
- Use three explicit availability modes: sample, live testnet, and unavailable. Each needs text as well as color.
- A submitted transaction means only that a wallet returned a hash. Mark confirmation complete only after a successful network receipt.
- Drive proof and title completion only from reliable confirmed events. Never use an elapsed timer or landing-page replay sequence to imply contract progress.
- If an RPC fails after submission, retain the transaction hash and retry receipt reconciliation rather than submitting a duplicate transaction.
- When configuration, RPC access, or a wallet is unavailable, preserve public explanation and deterministic examples while disabling unsafe write controls.

### Landing-page performance budget

- Keep initial landing-page First Load JS at or below `115 kB` unless a measured product need justifies a revision.
- Keep the physics engine out of the initial route bundle and load it only when its stage approaches the viewport.
- Add no general-purpose animation package while CSS and the Web Animations API satisfy the interaction.
- Target CLS below `0.10` and INP at or below `200ms` at the 75th percentile.
- Decorative work must not create main-thread tasks longer than `50ms` during ordinary reading.
- Run no more than one complex continuous animation system at a time.
- Effects must fail open: content stays visible, controls stay operable, and navigation remains available.

### Entrance animations

For below-the-fold sections:

- initial: `opacity: 0`, `translateY(16–20px)`, optional `scale(.98)`;
- visible: `opacity: 1`, neutral transform;
- trigger around `12%` intersection with a lower root margin;
- animate once, then unobserve;
- stagger siblings by `40–60ms`, capped near `180ms` total.

Hero entrance may reveal text by line or phrase, but it must complete quickly and avoid hiding the headline for more than about `700ms`. The CTA appears no later than the supporting copy.

### Scroll effects

Recommended:

- sticky navigation that subtly condenses after the hero;
- one slow horizontal evidence strip with duplicated content for continuity;
- scroll-triggered counters only when the source value is already present in the DOM;
- stacked explanatory panels only if the scroll maps directly to sequential process steps;
- very subtle background geometry or parallax, capped to a few pixels.

Avoid scroll hijacking, pinned scenes longer than one viewport, surprise horizontal scrolling, autoplay carousels, and transformations that interfere with reading or selecting proof data.

### Reduced motion

Under `prefers-reduced-motion: reduce`:

- disable smooth scrolling;
- show all reveal content immediately;
- remove cursor-following and parallax;
- stop marquees and display a wrapped static list;
- replace animated odometers with final values;
- collapse transition durations to near-zero;
- preserve focus, hover color, and other non-motion feedback.

---

## 12. Responsive behavior

Treat breakpoints as layout pressure points, not device labels.

### Wide: `≥1280px`

- Stage width up to `1280px`.
- Section gutters `40px`.
- Two- and three-column compositions are fully expressed.
- Decorative rotations and peripheral accents may appear.

### Standard: `861–1279px`

- Product container up to `1180px`.
- Header may wrap into two rows before content becomes cramped.
- Complex mechanism diagrams may collapse from five tracks to a vertical sequence around `1120px`.
- Preserve 5/7 artifact layouts while both columns remain readable.

### Compact: `641–860px`

- Primary grids become one column.
- Data tables become labeled row cards.
- Section blocks reduce from `28px` to about `22px` radius.
- Desktop rotations are reduced or removed.
- Floating callouts become in-flow content.
- Actions stretch where that improves clarity.

### Small: `≤640px`

- `12–16px` gutters.
- Navigation is static or compact and horizontally scrollable.
- All primary controls are full width and at least `44px` high.
- Display text uses `clamp(34px, 12vw, 48px)` and must be tested at 320px.
- Two-column slice boards may remain two-up only when each cell stays legible; otherwise use one column.
- Long identifiers wrap inside cards; the page itself never overflows horizontally.
- Decorative elements that collide with copy are hidden.
- Hover-only content is always visible or reachable by tap.

Test at `320`, `390`, `768`, `1024`, `1280`, and `1440px`, plus 200% browser zoom.

---

## 13. Accessibility and trust

Trust is part of the design system, not a legal footer item.

- Use semantic headings in sequence.
- Provide a skip link and visible keyboard focus.
- Keep tap targets at least `44 × 44px` on compact screens.
- Do not encode proof states by color alone.
- Announce transaction progress and copy confirmation with appropriate live regions.
- Preserve user-entered values during recoverable errors.
- Explain wallet and network requirements before a write action.
- Show the exact source chain and execution chain near transaction actions.
- Link source facts to explorers with descriptive labels.
- Show dates in human-readable form and retain the exact timestamp in detail.
- Never animate or truncate a value in a way that makes it impossible to copy.
- Keep all critical content present and readable when scripts or motion are unavailable.

---

## 14. Relia component recipes

### Shared primitive layer

The reusable implementation lives under `app/components/ui` and follows four groups:

- Layout: `Section`, `Container`, `Stack`, and `Grid`. These express spacing, width, and responsive collapse without page-specific inline styles.
- Surfaces: `Card` variants for quiet, interactive, proof, technical, and illustrated content; `Button` variants for primary, secondary, quiet, danger, and loading actions.
- Feedback: `Badge`, `StatusIndicator`, `Notice`, `AddressField`, and `TransactionField`. Status always includes a word or symbol, while identifier fields keep copy and explorer actions beside the exact value.
- Annotation: `DrawnArrow`, `DrawnLoop`, `DrawnUnderline`, `Starburst`, and `Stamp`. Decorative SVGs and shapes are hidden from assistive technology; a stamp that carries real status remains readable.

Prefer these primitives for new screens. Existing page-specific classes may extend them when a composition genuinely needs a distinct silhouette, but should not recreate their spacing, status, or interaction rules locally.

### Public verdict header

Composition:

- eyebrow: `PUBLIC RECEIPT`;
- large verdict with icon and state word;
- one-sentence explanation;
- asset/title identifier;
- primary source link and copy/share action.

Use a light surface for normal states. Reserve a full dark panel for mechanism detail, not for the verdict itself.

### Proof pipeline

Represent the flow as four named steps:

`Payment → Shop acknowledgement → Proof accepted → Title updated`

Each step has pending, active, complete, and failed variants. The connecting rail fills only after completion. On compact screens, the rail becomes vertical. Technical chain labels are secondary metadata, not step titles.

### Wallet status

- Disconnected: primary connect action plus a short reason.
- Connecting: stable-width button and progress label.
- Connected: account pill, network pill, and explicit disconnect menu.
- Wrong network: warning pill and single switch action.
- Unsupported wallet: inline explanation with recovery path.

Do not let the wallet cluster dominate public read-only pages. Reading must remain possible without connection.

### Status notice

Use a `14px` radius and restrained entrance (`8px` rise + fade). Structure every notice as:

- concise title;
- plain-language consequence;
- recovery action when available;
- expandable technical detail when useful.

Success notices should disappear only if the durable result is visible elsewhere on the page.

### FAQ accordion

- Reading-width container.
- Row separators instead of a pile of floating cards.
- `20–24px` trigger padding.
- Plus icon rotates 45 degrees when open.
- Expand with a grid-row transition around `420ms`.
- Only the answer region changes height; neighboring headings do not move sideways.
- Keyboard and screen-reader state use a native button and `aria-expanded`.

---

## 15. Implementation guardrails

### Do

- Build sections from shared container, stack, grid, card, badge, button, and notice primitives.
- Keep actual proof data visually distinct from illustrative examples.
- Use CSS custom properties for color, spacing, radius, and motion.
- Limit each page to one dominant display treatment.
- Verify all layouts with realistic long addresses and error messages.
- Use `IntersectionObserver` for one-time reveals and unobserve after entry.
- Gate fine-pointer hover effects with media queries.
- Make visible content the default before motion enhancement.

### Do not

- Recreate another site's hero arrangement, logo treatment, product-card stack, testimonial styling, or color identity.
- Import external brand marks or flags as decoration.
- use a carousel when a grid or list is easier to inspect;
- hide essential navigation on mobile without an accessible replacement;
- animate every card independently;
- use glass blur on dense data surfaces;
- place raw hashes in hero copy;
- imply finality while a transaction is merely submitted;
- make decorative motion respond more strongly than actionable controls.

---

## 16. Acceptance checklist

Before considering a page designed, verify:

### Composition and hierarchy

- [ ] The first viewport has one dominant message and one primary action.
- [ ] The reading order still works with CSS disabled.
- [ ] Dense evidence is followed by visual breathing room.
- [ ] The verdict precedes implementation detail.

### Layout and responsive behavior

- [ ] Content aligns to one of the three container widths.
- [ ] No page-level horizontal overflow occurs at 320px.
- [ ] Tables become understandable cards or deliberately bounded scrollers.
- [ ] Long addresses, hashes, and localized text do not break the grid.
- [ ] Touch targets remain at least 44px.

### Components

- [ ] Radius and shadow choices match component meaning.
- [ ] Each card has one responsibility.
- [ ] Status is expressed with text/symbol as well as color.
- [ ] Buttons retain their dimensions while loading.

### Motion

- [ ] Hover effects are gated to fine pointers.
- [ ] Entrance content remains visible without JavaScript.
- [ ] Motion explains state, sequence, or affordance.
- [ ] Reduced-motion users receive a complete static experience.
- [ ] No infinite animation competes with a transaction or proof state.

### Trust and accessibility

- [ ] Keyboard focus is clear and never clipped.
- [ ] Public read paths do not require a wallet.
- [ ] Source facts are inspectable and copyable.
- [ ] Error messages describe a recovery path.
- [ ] Contrast meets WCAG AA.

---

## Final direction

Relia's design should feel like a public receipt brought to life: spacious when explaining, compact when proving, and tactile when inviting action. Use editorial scale to make the human promise memorable, then switch to disciplined grids, explicit states, and mono evidence to earn trust. Motion should make the system easier to follow—showing progress, completion, and causality—while every critical fact remains stable, selectable, and available without animation.
