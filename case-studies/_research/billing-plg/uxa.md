# Billing PLG — UX Architecture Analysis

**Date**: 2026-04-22
**Branch**: workflow
**Scope**: CreditWarningCard, CreditPackCard, CreditUpgradeCard, UpgradeModal, CreditBanner, CreditPill

---

## 1. Card IA — Hierarchy Inside Each PLG Card

All three inline cards share a common four-slot IA, but differ in how they weight each slot.

**CreditWarningCard (warning/low states)** is a single horizontal row. Left-to-right reading order establishes visual priority: accent bar (semantic color signal, `3px` left edge) → status icon (14px, color-matched to state) → body text (title + optional credit badge + secondary desc) → ghost CTA. The accent bar carries the most visual information per pixel; it tells the user what kind of message this is before they read anything. The title (`--color-text-primary`, weight 600) has the highest text contrast. The CTA is deliberately low-weight — it is ghost/text-only on warning/low, which is correct because these states are advisory, not blocking. See `CreditWarningCard.tsx:159–173`.

**CreditWarningCard (depleted state)** promotes the CTA to a solid pill (`border-radius: var(--radius-full)`, filled `--color-text-primary` background) against a gradient field. The gradient shifts visual weight to the card body rather than the chrome. The upsell text "Save 20% with a yearly plan" appears in the description slot — its placement below "Out of credits" follows a title → value-prop → action sequence. The ambient orbs provide emotional register without introducing a separate headline element. See `CreditWarningCard.tsx:107–133`.

**CreditPackCard** uses a vertical four-zone stack: header (title + subtitle) → highlight panel (price display + feature checklist) → radio list (pack rows) → footer CTA. Visual priority is inverted from the warning card: the price (`--font-size-3xl`, bold) dominates the highlight zone, pushing the user to anchor on cost before engaging with the pack picker. The radio list uses staggered enter animation (60ms per row, `--step-index`) that directs attention sequentially from top to bottom, guiding toward the pre-selected Power ($100) default. See `CreditPackCard.tsx:47–63` and `CreditPackCard.css:99–121`.

**CreditUpgradeCard** mirrors CreditPackCard's zone structure but collapses the picker step. Its IA is: header (title + subtitle) → highlight panel (price + feature checklist) → footer CTA. The dismiss button (`position: absolute; top: var(--spacing-sm); right: var(--spacing-sm)`) is present but deliberately small (24×24px), making dismissal a secondary affordance. Visual priority goes: headline "You're out of credits" → price "$25/month" → feature list → Upgrade CTA. See `CreditUpgradeCard.tsx:37–76`.

---

## 2. Three-Card Escalation — Soft, Offer, Tier-Up

The escalation maps to three distinct behavioral registers:

**CreditWarningCard** (soft nudge — warning and low states) lives inline in the chat message stream, not as an interruption. It is visually quiet: `--color-bg-page` fill, single accent bar, ghost CTA. The text is informational ("80% used this cycle") rather than commercial. In the low state, the accent bar and icon escalate to `--color-warning-dark` and the border tightens to `--color-border-warning`, but the structural weight does not change. This card says "you should know this" without saying "you need to act now."

The jump to **CreditPackCard** (offer — `/credits depleted1`) represents the first commercial surface. The price is front-and-center in `--font-size-3xl`. The radio-list picker forces a micro-decision (which pack?) that functions as a commitment device — choosing a pack before seeing the buy button increases intent. The feature list ("Credits pool to your account / Use across all your apps / Expire one year from purchase") provides purchase justification. This card says "here is a transaction; choose what you want."

**CreditUpgradeCard** (tier-up — `/credits depleted2`) removes the picker entirely and presents a single opinionated offer (Pave Solo, $25/month) with a feature checklist and a primary-variant Upgrade button. There is no customization step — it is a conversion surface, not a comparison surface. The visual weight is highest of the three inline cards: solid fill on the CTA, `--font-size-3xl` price, dismiss-but-not-easily affordance. This card says "the right answer is this plan."

The progression in visual weight: single-row (warning card) → two-zone card (pack picker) → single-offer card with dismiss. The implicit message escalates from ambient awareness to active offer to closed-loop conversion ask.

---

## 3. UpgradeModal Structure

The modal is a four-column plan comparison grid (Free / Solo / Team / Enterprise) wrapped in a Dialog primitive. There is no payment form inside the modal — it is a plan selector whose CTAs navigate to `#checkout?plan={name}` via `window.location.hash`. See `UpgradeModal.tsx:73–133`.

Column structure per plan: icon + name → price + period → credits allocation → feature checklist → CTA button. The "Most popular" badge on Team floats above the card using `position: absolute; top: -spacing-xs` and a double border (`border-color: var(--color-accent-primary); box-shadow: 0 0 0 1px var(--color-accent-primary)`). This is the only plan with the primary button variant; all others use outline. The current plan (Free) is disabled.

The modal is a comparison-only surface, not a checkout surface. There is no payment step, billing address, or card input. This is architecturally correct for a first-time conversion: users need a tier decision before entering payment context. The handoff to `CheckoutPage` (full-page Stripe-style form) is the correct separation. However, as documented in `credit-purchase-flow.md:70–85`, PricingPage uses a different checkout mechanism (`CheckoutModal`), meaning the two upgrade paths currently diverge architecturally — this is a known prototype gap.

The modal's 4-column grid (`grid-template-columns: repeat(4, 1fr)`) collapses to 2-col at 768px and 1-col at 480px. This is implemented as raw breakpoints in `CreditWarningCard.css:345–355` — the modal CSS is co-located in the warning card's stylesheet rather than having its own file, which is an organization issue but not a visual one.

---

## 4. CreditBanner and CreditPill Relationship

These two surfaces answer different questions at different scanning distances.

**CreditPill** is persistent ambient state. It lives in the chat input bar, visible at all times, and encodes credit state as a color shift: `--color-border-light` (healthy) → `--color-border-warning-subtle` (warning) → `--color-border-warning` (low) → `--color-border-error-subtle` + `--color-bg-error` fill (depleted). It shows a numerical balance and opens `CreditPopover` on click. It answers "what is my state?" in a single glance without requiring text reading. See `CreditPill.css:50–99`.

**CreditBanner** is ephemeral and textual. It appears above the chat input when state transitions into warning, low, or depleted, and carries formatted prose ("X of Y credits used this month. Add more to keep building."). Warning and low states are dismissible; depleted is not. It answers "what does this mean and what should I do?" — the inverse of the pill's role. See `CreditBanner.tsx:20–39`.

The coexistence contract is: CreditPill signals, CreditBanner explains. They do not create redundancy because they operate at different registers (glanceable vs. readable) and different persistence models (always-on vs. appears-on-transition). The doubled signal risk is managed by the banner's dismissibility — users who understood the warning from the pill can remove the banner, leaving the pill as the only ongoing signal. The one place redundancy is highest is the depleted state, where the pill fills with `--color-bg-error`, the banner becomes non-dismissible, and the CreditWarningCard may also be present in the chat thread. This triple-signal state is probably intentional (depletion requires action) but should be tested for annoyance threshold.

---

## 5. Token Compliance — Hardcoded Values

**CreditWarningCard.css** — Critical violations. The orb gradient system uses hardcoded rgba values on lines 202–242. These encode the amber/orange warning palette directly:

- `CreditWarningCard.css:202–203`: `rgba(245, 158, 11, 0.55)` — hardcoded, maps conceptually to `--color-warning` at 55% opacity
- `CreditWarningCard.css:215–216`: `rgba(255, 203, 71, 0.4)` — no token equivalent; a lighter yellow
- `CreditWarningCard.css:228–229`: `rgba(255, 120, 20, 0.3)` — no token equivalent; orange-red
- `CreditWarningCard.css:236`: dark mode orb at 25% opacity, same base color — also hardcoded
- `CreditWarningCard.css:239`: dark mode accent orb at 12% opacity — hardcoded
- `CreditWarningCard.css:242`: dark mode deep orb at 12% opacity — hardcoded

These are defensible only if the token system lacks `rgba()` alpha variants. In production, they should become CSS custom property alpha variants (e.g., `color-mix(in srgb, var(--color-warning) 55%, transparent)`) or dedicated `--color-warning-glow-*` tokens. The orb blur and sizing values (`inset: -40px`, `width: 160%`, `filter: blur(30px)`) are geometric, not semantic, and raw values there are acceptable.

Additional minor hardcoded values in `CreditWarningCard.css`:
- `CreditWarningCard.css:26`: `width: 3px` (accent bar width — no spacing token maps to sub-4px values; acceptable)
- `CreditWarningCard.css:302`: `height: 1.75rem` (upgrade CTA height — not a spacing token, but a component-level size constant)

**CreditPackCard.css** — Two violations:
- `CreditPackCard.css:107`: `gap: 8px` — should use `var(--spacing-sm)` or `var(--spacing-xs-plus)` depending on the token scale
- `CreditPackCard.css:108`: `padding: 10px var(--spacing-xl)` — `10px` is a hardcoded vertical padding; no token maps to 10px cleanly unless `--spacing-sm` is 8px and there is no 10px stop

**CreditPill.css** — One violation:
- `CreditPill.css:98`: `color: #fff` — this is the icon color inside the depleted dot. The dark mode variant on line 101 correctly uses `var(--color-bg-page)`. The light-mode value should match: replace `#fff` with `var(--color-text-inverse)` or `var(--color-bg-page)`.

**CreditBanner.css**, **CreditUpgradeCard.css** — Clean. All color values use tokens. The `1px solid transparent` border on `CreditBanner.css:19` and `border: 1px solid var(...)` patterns elsewhere are structural (maintaining layout space for border transitions) and appropriate.

---

## 6. Motion

Enter motion across all PLG cards uses a common pattern: `opacity 0→1, y 12→0` (CreditPackCard, CreditUpgradeCard) or `y 6→0` (CreditWarningCard) over `duration: 0.25` with `ease: [0, 0, 0.2, 1]`. This cubic bezier is a material-style decelerate curve — the element moves quickly at first and eases to rest. The y-offset is small (6–12px), meaning the card appears to settle into position from just above its resting point. The effect reads as "arriving" rather than "dropping."

The framing of "help arriving" is well-served by this curve. A pure ease-in (accelerating) would feel like an interruption. The decelerate ease with a small y-offset suggests the card was always on its way — it just became visible.

There is a split in which tokens back the motion:

- CSS transitions (state color changes, hover states) correctly use `var(--motion-duration-fast)`, `var(--motion-duration-normal)`, and `var(--motion-ease-standard)` from the token system. See `CreditWarningCard.css:19–20`, `CreditPackCard.css:116–117`, `CreditPill.css:22–24`.
- Framer Motion enter/exit transitions use hardcoded numeric constants (`MOTION_MEDIUM = 0.25`, `MOTION_FAST = 0.15`, `EASE_OUT = [0, 0, 0.2, 1]`). These are defined as module-level constants in each tsx file and are consistent with the token values they shadow, but they bypass the token system. Framer Motion does not consume CSS custom properties directly, so this is a known limitation — but a comment mapping each constant to its corresponding CSS token (`--motion-duration-normal = 0.25s`, `--motion-ease-standard = cubic-bezier(0, 0, 0.2, 1)`) would help maintain alignment when tokens are updated.

The CreditBanner uses `height: 0 → 'auto'` collapse/expand via Framer Motion's `AnimatePresence`, at `MOTION_FAST = 0.15s`. This makes the banner feel like a tight nudge bar pushing content down rather than an overlay. Combined with `AnimatePresence` wrapping, the exit (height → 0) is handled, satisfying the "every enter has an exit" rule.

The orb drift animation in the depleted card uses CSS keyframes at 20/25/30s cycles — long enough to be perceived as ambient rather than looping. Reduced-motion compliance is handled in both Framer (`prefersReducedMotion ? false : { opacity: 0, y: 6 }`) and CSS (`@media (prefers-reduced-motion: reduce) { animation: none }`). See `CreditWarningCard.css:264–268`.

CreditPackCard's stagger animation (`animation-delay: calc(var(--step-index, 0) * 60ms)`) with `credit-pack-appear` keyframes (translateX -4px → 0) is the only directional enter that doesn't use y-offset. The x-offset reads as a list unrolling left-to-right, which matches the radio-list affordance and distinguishes this card's enter from the simpler card variants.

---

## 7. Dark Mode

Token coverage on PLG surfaces is strong. All state-semantic colors (`--color-bg-warning`, `--color-text-warning`, `--color-warning-dark`, `--color-border-warning-subtle`, `--color-border-error-subtle`, `--color-bg-error`, `--color-text-error`) are expected to remap in dark mode via the `.dark` class on `<html>`. No component uses conditional logic (`if (isDark)`) — all theming flows through data-attribute-driven CSS selectors and token inheritance. This is correct and means dark mode is guaranteed by the token layer if tokens are maintained.

The one explicit dark mode override in this surface set is the orb gradient intensity in `CreditWarningCard.css:235–242`. The dark mode orb variants reduce alpha from 0.55/0.4/0.3 to 0.25/0.12/0.12. This is necessary because the gradient sits over `--color-bg-page`, which is dark in dark mode, and full-opacity amber orbs over a dark field would read as bright glow rather than ambient warmth. The intent is correct. The implementation is hardcoded rgba, which is the token violation noted in §5.

A second explicit override: `CreditBanner.css:125–127` adjusts the depleted CTA text color for dark mode (`.dark .credit-banner[data-state="depleted"] .credit-banner__cta`). This works, but it exposes a gap — `--color-text-inverse` should already handle this without a `.dark`-scoped override if the token is correctly defined. Likely a conservative patch during authoring.

Similarly, `CreditPill.css:101–103` uses a `.dark` override for the depleted dot icon color (`var(--color-bg-page)`) while the light mode uses the hardcoded `#fff`. Both should use the same token.

The UpgradeModal has no `.css` file (it uses classes defined in `CreditWarningCard.css`). All upgrade modal styles correctly use semantic tokens. No dark mode violations there.

---

## 8. System Fit — Reusability for Other Offer Patterns

The three-card escalation pattern (soft nudge → offer card → tier-up card) is not tightly scoped to billing. The underlying architecture maps onto any resource-constraint or gate scenario:

- The CreditWarningCard IA (accent bar + icon + message + ghost CTA) can represent any soft system notification — storage limits, API rate limits, feature trial expirations — without conceptual changes. The state machine (`warning`, `low`, `depleted`) is generic enough that it could accept any threshold-based resource name.
- The CreditPackCard (select-then-buy) is a general purchase picker pattern. The `--step-index` stagger and radio-list styling are not billing-specific. The "plan highlight" zone (price + feature checklist) could represent any selectable product option.
- The CreditUpgradeCard is the most tightly scoped. The hardcoded `$25` price in `CreditUpgradeCard.tsx:48` and the specific feature copy make it billing-specific in the current implementation. If the price and features were props, this becomes a reusable "featured plan card" pattern.

The shared motion contract (opacity+y decelerate enter, AnimatePresence exit, reduced-motion bypass) and shared token set mean these cards will blend visually with any other surfaces that follow the same conventions. They are not stylistically isolated billing components — they read as first-class members of the component system.

The tight dependency on `useCreditContext` (CreditBanner, CreditPill, CreditPopover) is the primary reuse barrier. The credit-specific context is consumed directly rather than passed as props, so these three surfaces are not extractable to a general billing slot without refactoring the context interface. The inline chat cards (CreditPackCard, CreditUpgradeCard, CreditWarningCard) accept props and are more portable.
