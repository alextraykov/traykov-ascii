# Billing Core — UX Architecture Analysis

## 1. Persistent Chrome: CreditPill in AppHeader

`AppHeader.tsx:250` renders `<CreditPill />` inside the center section of the header, between the project breadcrumb and the actions cluster. The pill uses a 2rem-tall pill shape with `border-radius: var(--radius-full)` and a Coins icon inside a 20px circular dot. In the healthy state it reads `--color-text-secondary` on a transparent background with `--color-border-light` border — functionally invisible against the header surface until the balance matters.

The four-state escalation ladder does the work quietly. Healthy renders as secondary-colored text, no background fill. Warning adds `--color-border-warning-subtle` and shifts text to `--color-text-warning`. Low upgrades to `--color-border-warning` with the dot filling `--color-bg-warning`. Depleted flips the whole pill to `--color-bg-error` fill — the only state that breaks the "quiet peripheral" contract. This escalation is appropriate: a billing indicator that screams at healthy credit balance would erode trust in the signal. The pill earns attention only when it has something urgent to say.

The `whileHover: { scale: 1.02 }` / `whileTap: { scale: 0.98 }` on the motion.button (`CreditPill.tsx:32-33`) confirm it is interactive. Clicking opens `CreditPopover`, a 280px panel (`CreditPopover.css:8`) that breaks down balance, a usage-rate trend arrow, credit sources accordion, renewal date, and CTA buttons that escalate with state. The popover fires `side="top" align="end"` (`CreditPopover.tsx:87-88`), anchoring to the pill's right edge — correct for a header element that sits in the upper-right zone of the builder page.

**Gap:** CreditPill appears in `AppHeader` but is declared separately as `showCreditPill` in `ChatInput` (`ChatInput.tsx:108, 397-406`). Two mount points for the same logical object risk showing different computed states if either reads from a stale context snapshot. The `CreditStateContext` singleton prevents this in practice, but the dual-mount pattern is worth flagging for engineers.

---

## 2. Pricing Page IA

The page uses a Plans / Usage tab pair (`PricingPage.tsx:180-201`) that surfaces in two distinct reading contexts: discovery (Plans) and accountability (Usage). The tab bar renders in `--color-bg-surface` with an inset `--color-bg-page` highlight for the active tab — the same segmented-control pattern used elsewhere in the app, which is correct.

**Plans tab hierarchy:**

1. Page header — `font-size: var(--font-size-3xl)` / bold, primary color. Sets context: "Plans & usage". (`PricingPage.css:29`)
2. Four-column plan grid — `repeat(4, 1fr)` desktop, `repeat(2, 1fr)` tablet, `1fr` mobile. (`PricingPage.css:82-98`)
3. Credits purchase section — below the fold, separated by `--spacing-2xl` gap.
4. Footer — `justify-content: space-between` with "Manage billing" link left and a scoped annotation right.

The plan cards have a smart vertical flex layout: icon → name row → pricing block → CTA with `margin-top: auto` → feature list. The `margin-top: auto` on `.pricing-plan__cta` (`PricingPage.css:200-203`) locks the button to a consistent horizontal band across all four equal-height cards — a grid alignment technique that prevents the awkward misalignment common in pricing grids where feature-list lengths differ. The highlighted card (`pricing-plan--highlighted`) adds a 2px `--color-accent-primary` border with no background fill, keeping visual weight from becoming garish.

**Missing pattern:** There is no FAQ section and no annual/monthly toggle on the pricing page itself. The billing period toggle only appears inside `CheckoutPage` and `CheckoutModal`. This means users comparing plans never see the annual discount until they are already inside the purchase funnel. This is a known PLG conversion risk — the savings signal is buried.

The credits purchase section (`pricing-credits__card`) uses a 50/50 grid split: a vertical radio-list of packs on the left and a live summary panel on the right. The staggered `pack-enter` animation with `translateX(-6px)` delays (`PricingPage.css:304-336`) suggests each row slides in sequentially — a lightweight delight moment that draws attention to the selection without blocking completion.

---

## 3. Checkout Page and Modal Shape

Both surfaces share the same payment form logic but differ in container.

**CheckoutPage** uses a two-column sticky layout: `width: 380px; flex-shrink: 0; position: sticky; top: var(--spacing-2xl)` for the left plan selector (`CheckoutPage.css:69-77`), with the right column as `flex: 1`. This is the Stripe / Paddle convention — plan context remains visible while the user fills the form. At 1024px the layout collapses to a single column with the plan selector on top, which is correct.

The plan selector uses `grid-template-rows: 0fr → 1fr` on `.checkout-plan__details` (`CheckoutPage.css:216-224`) for CSS-only expand/collapse. This avoids a JS height calculation while keeping the animation hardware-compositable. The selected card elevates with `--shadow-md` and 2px `--color-accent-primary` border; the icon fills `--color-accent-primary` background.

The right column order is: order summary → payment method fields → billing address → trust indicator → CTA → legal copy. This follows Stripe's established pattern for cognitive load sequencing: "what you're buying" before "what you're paying with." The `payment-trust` block (`CheckoutPage.css:574-593`) renders a Lock icon + "256-bit SSL encrypted. We never store your card details." in `--color-text-tertiary` inside a `--color-bg-muted` pill — appropriately quiet. It is placed between billing address and the CTA, which is the correct position to resolve last-moment hesitation before the user's finger reaches the submit button.

**CheckoutModal** strips the plan selector entirely. It is triggered from PricingPage (`PricingPage.tsx:387-394`) when a plan CTA is clicked, passing `planId` and `billingPeriod` as props. The modal renders at `max-width: 480px` with `max-height: 90vh; overflow-y: auto` (`CheckoutModal.css:19-22`). The summary block appears above the form, condensed to 3 rows + divider. The trust line (`CheckoutModal.tsx:301-304`) here lacks the muted-background container treatment present in the page version — it is inline text with an icon, which gives less visual weight to the security signal.

**Overlay:** The modal overlay uses `rgba(0, 0, 0, 0.5)` with `backdrop-filter: blur(4px)` (`CheckoutModal.css:12-13`). This hardcoded rgba value is the single most impactful dark-mode risk in the billing surface (see Token Compliance below).

---

## 4. CreditBanner Hierarchy

`ChatInput.tsx:240-241` shows the stacking order:

```
<div class="chat-input-wrapper">
  {queuedMessages → MessageQueue}       ← floats above input
  {!hideNudge → <CreditBanner />}       ← directly above input container
  <motion.div class="chat-input__...">  ← the actual textarea
```

The banner sits between MessageQueue and the composer input div. It renders as a full-width horizontal bar inside `chat-input-wrapper` with `overflow: hidden` on `.credit-banner` (`CreditBanner.css:9`), allowing the height-animation from 0 to auto on enter/exit.

The attention competition is genuine. When credits are warning/low and the user also has queued messages, there are two informational bars above the textarea. The queue is operationally urgent (work is pending); the credit banner is financially urgent (future work is at risk). They serve different scopes and different timelines. A user mid-flow sees the message queue as immediately blocking and the credit banner as deferrable — which is correct, since warning and low states are dismissible (`BANNER_CONFIG.warning.dismissible: true`, `CreditBanner.tsx:24-25`). Depleted is non-dismissible, which is also correct.

The banner does not compete directly with the `MessageQueue` scroll — the queue renders its own container above (`chat-input__queue`) while the banner renders in the wrapper flow immediately below. In practice, both can be visible simultaneously. The combined height of queue + warning banner + input on a small viewport could push the textarea uncomfortably low. A responsive max-height constraint on the queue or a rule that collapses the banner when the queue is active would prevent layout thrash.

---

## 5. Token Compliance

Scan of all five CSS files and relevant TSX for hardcoded values:

**Confirmed violations:**

| Location | Line | Value | Severity |
|---|---|---|---|
| `CheckoutModal.css:12` | 12 | `rgba(0, 0, 0, 0.5)` overlay background | High — inverts in dark mode without a token |
| `CreditPill.css:98` | 98 | `color: #fff` on depleted dot | Medium — `--color-text-inverse` exists for this |
| `CheckoutPage.css:564` | 564 | `stroke='%2357534e'` in data-URI select chevron | Medium — hardcoded stone-600, invisible in dark mode |
| `CheckoutModal.tsx:43-44, 51-54, 60-61` | 43–61 | `fill="#1A1F71"`, `fill="#252525"`, `fill="#EB001B"`, `fill="#F79E1B"`, `fill="#FF5F00"`, `fill="#2E77BC"`, `fill="#fff"` in CardBrandIcon SVGs | Low — brand marks are intentionally locked; acceptable exception if documented |
| `CheckoutPage.tsx:87-105` | 87–105 | Same CardBrandIcon duplicated — identical hardcoded fills | Low — same exception applies, but the duplication itself is an issue |

**Hardcoded layout values (not token violations, but worth noting):**
- `PricingPage.css:122-123`: icon container `width: 40px; height: 40px` — icon sizing is commonly hardcoded and no icon-size token exists in the system.
- `PricingPage.css:280`: `min-height: 380px` on the credits card — could be `var(--size-credits-card-min)` if this constraint needs to flex with content.
- `CheckoutPage.css:76`: `width: 380px` for the left column — structural layout constant, no spacing token maps to 380px. Consider `--checkout-sidebar-width` as a local custom property.
- `CheckoutModal.css:20`: `max-width: 480px` — same reasoning.

The `letter-spacing: 0.04em` values in `PricingPage.css:264` and `CheckoutPage.css:317` are consistent with each other but absent from the token scale. They should be `var(--letter-spacing-widest)` if that token exists, or added.

---

## 6. Motion

**CreditBanner enter/exit:** Uses `height: 0 → auto` with `opacity: 0 → 1` at `MOTION_FAST = 0.15s` on the `motion.div` (`CreditBanner.tsx:75-78`). `AnimatePresence` wraps the banner, so the exit (height collapse back to 0) fires on dismiss. The approach is correct but `height: auto` animation in Framer Motion requires the outer `.credit-banner` to have `overflow: hidden` — which it does (`CreditBanner.css:9`). The transition between states (warning → low → depleted) is keyed by `key={creditState}` (`CreditBanner.tsx:119`), so each state change triggers exit/enter rather than a cross-fade. This is intentional: the message changes, so a discrete transition is semantically clearer than blending.

**CreditPill decrement:** The pill label text (`{formattedUsed} / {formattedTotal}`) is static string interpolation — it does not animate the number itself. The decrement animation lives inside `CreditPopover` via `AnimatedBalance` (`CreditPopover.tsx:21-45`), which uses `useSpring` with `stiffness: 80, damping: 18` to count down the displayed value. The popover must be open for the spring animation to be visible. When the popover is closed, credit changes snap instantly on the pill label. This is probably acceptable — the popover is the intended place to watch live credit flow.

**Checkout modal overlay:** `opacity: 0 → 1` at `duration: 0.15` for the overlay; the panel itself uses `y: 16 → 0, scale: 0.98 → 1` at `duration: 0.2` with `ease: [0, 0, 0.2, 1]` (`CheckoutModal.tsx:127-140`). Exit reverses to `y: 8, scale: 0.98`. The slight asymmetry (enter from 16px, exit to 8px) creates a subtle "settle in, lift out" feel that matches premium modal conventions. `useReducedMotion()` is correctly gated at `CheckoutModal.tsx:78`.

**Checkout page stagger:** Nine stagger steps at `baseDelay: 0.08s` + `stagger: 0.05s` increments using `fadeBlurIn` (`CheckoutPage.tsx:74-77, 164-175`). The blur-in `filter: blur(8px) → blur(0)` is the same pattern as LoginModal. Nine elements at 0.05s each means the last field (legal copy) enters at ~0.53s. This is on the slow side for a task-focused form — users on fast connections may feel friction waiting for the country dropdown to appear. Consider capping the stagger at 5-6 items with the remaining fields sharing the last delay step.

---

## 7. Dark Mode Parity

The billing surfaces inherit dark mode through the `.dark` class on `<html>` and `--color-*` token overrides in `tokens.css`. For most surfaces this works automatically because every color value references a semantic token. Gaps found:

**CheckoutModal.css:12 — overlay background:** `rgba(0, 0, 0, 0.5)` is hardcoded. In light mode this reads as a semi-transparent dark scrim, which is standard. In dark mode, the same value applies — which is actually acceptable visually because the page behind the overlay is already dark, but the scrim density is not calibrated to either theme's ambient luminance. The token system should expose `--color-overlay-scrim` or `--color-backdrop`. This is the highest-priority dark mode gap in the billing surface.

**CheckoutPage.css:564 — select chevron SVG:** The data-URI embeds `%2357534e` (stone-600, a medium-gray). On dark mode the select's background token darkens but the chevron icon stays stone-600, which may lose contrast against a dark field background. No `.dark` override for this selector exists.

**CreditPill.css:98 — depleted dot icon color:** `color: #fff` handles light mode. The `.dark` override at `CreditPill.css:101` corrects this to `var(--color-bg-page)`, which is the right semantic value (white in light, near-black in dark). This is correctly handled but only through an exception pattern rather than a token.

**CreditBanner.css:125 — same depleted CTA pattern:** `.dark .credit-banner[data-state="depleted"] .credit-banner__cta.blinq-button` corrects `color: var(--color-bg-page)` for the same reason. Both of these `.dark` exceptions would be eliminated by using `--color-text-on-accent` or `--color-text-inverse` at the source.

**CheckoutPage and CheckoutModal — no explicit .dark blocks.** These surfaces rely entirely on token inheritance. Since every structural color references a token, they should adapt correctly. The `payment-summary` block uses `--color-bg-surface` which should darken in `.dark`. No gaps observed beyond the overlay and select chevron issues above.

---

## 8. System Fit

**Primitive reuse:**

- `Button` — used throughout (PricingPage CTAs, CheckoutPage submit, CreditBanner CTA, CreditPopover actions). Consistent `variant` prop API.
- `Input` + `Label` — used in both CheckoutPage and CheckoutModal for all payment fields. Correct.
- `Alert` (AlertIcon, AlertDescription) — used in PricingPage credits section (`PricingPage.tsx:348-353`) for the charge confirmation nudge. Correct reuse of the ui/Alert primitive.
- `Popover` / `PopoverContent` / `PopoverTrigger` — used by CreditPopover (`CreditPopover.tsx:83-92`). This is direct Radix primitive reuse.
- `Dialog` primitives — notably absent from CheckoutModal. The modal is hand-rolled using `motion.div` + overlay div rather than wrapping `Dialog` from `@/components/ui/Dialog`. This means CheckoutModal lacks the focus-trap, scroll-lock, and `aria-modal` handling that Dialog provides. For a payment form this is a meaningful accessibility gap.

**Bespoke components:**

- CreditPill, CreditBanner, CreditPopover — correctly bespoke. They encode domain logic (credit state transitions, urgency escalation) that generic primitives cannot.
- `CardBrandIcon` — duplicated between `CheckoutPage.tsx:83-108` and `CheckoutModal.tsx:39-64`. This is a shared utility component that should be extracted to `src/components/composite/CardBrandIcon/` or `src/lib/cardBrand.tsx`. As it stands, any brand color update requires two edits.
- `CheckoutModal` — bespoke container wrapping `Button`, `Input`, `Label`. Acceptable given the payment-specific layout, but the missing `Dialog` wrapper is a structural gap.
- `CreditUpgradeCard`, `CreditWarningCard`, `CreditPackCard` — inline in the ChatWindow message stream as conversational billing surfaces. These are bespoke message-type cards that appear alongside `PlanCard` and `SubagentBubble`. They follow the same card-in-chat pattern and do not conflict with the header/input billing layer.

**Naming consistency:** All billing CSS follows BEM with the `pricing-`, `checkout-`, `payment-`, `credit-` block prefixes. No naming collisions observed. The `blinq-` prefix on `blinq-input` and `blinq-button` is a legacy artifact from the Blinq-to-Pave rebrand and should be resolved on the current rebrand branch.
