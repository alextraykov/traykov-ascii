# Billing Core — Frontend Implementation Notes

## 1. State Machine

The credit state machine lives entirely in `src/lib/useCreditState.ts`. Four states — `healthy`, `warning`, `low`, `depleted` — are derived by `deriveState()` (line 55–60) from a single scalar: `percentRemaining = creditsRemaining / creditsTotal * 100`. Thresholds are constants at lines 50–53: warning at ≤20%, low at ≤5%, depleted at ≤0%. This is purely event-based, not time-based — state changes the instant `creditsRemaining` changes via the setter exposed on the `CreditInfo` interface.

The `renewalCountdown` is time-based but only for display. A `setInterval` at line 110–116 fires every 60 seconds, recomputes a formatted "Xd : Xh" or "Xh : XXm" string, and stores it in local state. The renewal date itself is memoized once at mount (line 97–101) as `now + 1h 3m`, so the countdown has no external clock source in the prototype — it drifts relative to real time. In production this would come from the billing API and would be stable across remounts.

Banner dismissal adds a layer of state-machine logic. `dismissedAtState` records which state the user dismissed at, and `isBannerDismissed` is truthy only when `STATE_SEVERITY[currentState] <= STATE_SEVERITY[dismissedAtState]` (lines 119–123). This means a warning-dismissed banner re-shows automatically if the state escalates to low or depleted — escalation resets dismissal without any imperative code.

## 2. Context Design

`CreditStateContext` at `src/contexts/CreditStateContext.tsx` is a thin wrapper: it calls `useCreditState(initialCredits, initialTotal)` (line 19) and passes the returned `CreditInfo` object directly as the context value. There is no additional memoization layer — `useCreditState` returns a plain object literal, which means every render of the provider creates a new reference and triggers downstream consumers. In a production app this would warrant `useMemo` over the returned object, but for a prototype with small component trees the re-render overhead is invisible.

The provider mounts at `App.tsx:264–269`, wrapping `DarkModeProvider > CreditStateProvider > TooltipProvider > AppContent`. The `initialCredits={1}` and `initialTotal={13}` hardcoded values put the demo into depleted state on load, which makes the credit warning surfaces immediately visible to reviewers without manual scrubbing. Two props (`initialCredits`, `initialTotal`) allow demo overrides; there is no slot for injecting a real API response.

The choice of context over Zustand is consistent with this repo's stated intent as a design prototype. Context is sufficient for a tree with one provider and a handful of consumers (CreditPill, CreditBanner, CreditPopover, CreditBanner). Zustand would add value when multiple isolated subtrees need synchronized credit state — for example, if a sidebar summary and a page header both needed to update independently of their common ancestor's render cycle.

`useCreditContext` at line 28–34 throws if called outside the provider, which is the correct guard for a context that has no reasonable default.

## 3. PricingPage Tier Rendering

Plan tiers are hardcoded in a `PLAN_TIERS` constant at `PricingPage.tsx:53–121`. The array is typed as `PlanTier[]` with a local interface defined at lines 24–41. This is a module-scoped data structure, not imported from a shared data file — unlike `CheckoutPage` and `CheckoutModal` which both import `PLAN_TIERS` from `src/data/plans`. The two constants are not the same shape: PricingPage's `PLAN_TIERS` uses a flat `price: number | null` while `src/data/plans` uses `price: { monthly, yearly }`. This divergence is a concrete duplication risk if copy or prices change.

Plan cards are rendered by mapping over the array (line 207–274), so adding or reordering tiers requires only a data change, not JSX surgery. Credit pack tiles at lines 293–317 use a similar data-driven pattern via `CREDIT_TOPUP_PACKS` imported from `src/data/plans`, with `aria-pressed={selectedPack === i}` (line 303) correctly marking the active tile as a toggle button.

Accessibility on plan cards is partial. The "Current" badge at lines 219–224 is a `<span>` with text and a `Check` icon — it carries no ARIA role. Plan cards themselves are `<div>` elements with no interactive role or keyboard handler, meaning keyboard users cannot interact with them. The credit pack buttons do use `aria-pressed` correctly, which is the right pattern for a radio-like group. The plan card container would benefit from `role="radiogroup"` with individual cards as `role="radio"` plus `aria-checked`, matching the pattern already present in `CheckoutPage.tsx:244`.

## 4. CheckoutPage Form Pattern

`CheckoutPage.tsx` holds all six payment fields as uncontrolled-style local state (lines 145–150). There is no form validation library — no Zod, no react-hook-form, no required attribute enforcement. The submit handler at lines 178–187 calls `preventDefault()`, sets `isSubmitting`, then resolves after a hardcoded 2-second `setTimeout`, transitions to `isSuccess`, and after 1.5 more seconds calls `onNavigate('Builder')`. No field values are read or validated before the simulated submit fires.

Card input formatting is handled by two pure helper functions: `formatCardNumber` (line 44–47) inserts spaces every four digits up to 16 digits, and `formatExpiry` (line 50–53) inserts a slash after the second digit. These run on every `onChange` with simple regex replacements — correct for prototype purposes, but they do not handle the Amex 4-6-5 grouping or the 15-digit card length.

All payment fields carry correct `autoComplete` attributes (`cc-number`, `cc-exp`, `cc-csc`, `cc-name`, `postal-code`) which is the right foundation for a real Stripe port.

Loading and success states are represented as two booleans (`isSubmitting`, `isSuccess`). The CTA swaps between a `Loader2` spinner button and a `CheckCircle` success panel via `AnimatePresence mode="wait"` (lines 553–593). No error state exists.

## 5. CheckoutModal vs. CheckoutPage

These are two separate components with substantial duplication. `CheckoutModal.tsx` and `CheckoutPage.tsx` share identical implementations of `detectCardBrand`, `formatCardNumber`, `formatExpiry`, and `CardBrandIcon` — all copy-pasted verbatim. The payment form field layout, submit simulation logic, `isSubmitting`/`isSuccess` state, and trust indicator text are reproduced in both. The two differ only in their outer shells: the Page wraps inside `PageLayout` with a two-column plan selector on the left, while the Modal wraps in an overlay `div` with a compact single-column summary.

No shared `<PaymentForm>` primitive exists. A production refactor would extract the payment fields, formatters, brand detection, and submit state into one component and let Page and Modal compose it. As-is, any copy or validation change requires two edits.

Focus trap in `CheckoutModal`: the modal overlay uses `onClick={() => onOpenChange(false)}` to close on backdrop click (line 131), and the modal panel stops propagation (line 141). There is no native focus trap — no `inert` attribute on the rest of the page, no `aria-modal="true"`, and no `FocusScope` or equivalent. The `role="dialog"` and `aria-label` (lines 136–137) are correct, but without a focus trap, keyboard users can tab out of the modal into the obscured background. In production this would require Radix `Dialog` or a custom `FocusScope`.

## 6. CreditPill in AppHeader

`CreditPill.tsx` reads `creditState`, `creditsRemaining`, and `creditsTotal` directly from `useCreditContext()` (line 15). Because the provider is at `App.tsx:264`, any call to `setCreditsRemaining` anywhere in the tree triggers a re-render of all consumers including the pill — no additional subscription or selector needed. The pill label displays `formattedUsed / formattedTotal` (line 23) and updates synchronously with every state change.

The pill has no decrement animation of its own. For animated count changes, the work is done inside `CreditPopover.tsx` via `AnimatedBalance` (lines 21–45), which uses Framer Motion `useSpring` with `stiffness: 80, damping: 18` — a soft spring that eases the numeric display to the new value over roughly 400–600ms. The pill's outer `motion.button` only animates on hover (`scale: 1.02`) and tap (`scale: 0.98`), both gated by `useReducedMotion()` (line 14). When `prefers-reduced-motion` is set, both the scale gestures and the spring number animation collapse to instant jumps — `AnimatedBalance` skips the `display.on('change')` subscription and sets text directly (lines 35–38).

`data-state={creditState}` on the pill element (line 31) drives color changes via CSS attribute selectors, keeping the visual state logic in CSS rather than component logic.

## 7. CreditBanner Lifecycle

`CreditBanner.tsx` enters and exits via `AnimatePresence` wrapping a `motion.div` keyed by `creditState` (line 119). The enter transition is `opacity: 0 → 1, height: 0 → auto` over 150ms with `[0, 0, 0.2, 1]` ease (lines 124–127). The exit mirrors this. When `prefers-reduced-motion` is active, `initial` is `false` (no enter animation) and `exit` is `undefined` (no exit animation), which means the banner appears and disappears instantly.

Dismissal persistence: `isBannerDismissed` and `dismissBanner` come from context, backed by `dismissedAtState` in `useCreditState`. There is no `sessionStorage` or `localStorage` write — dismissal is in-memory only and resets on page reload. The banner reappears on state escalation via the severity comparison described in section 1. The `depleted` state's `dismissible: false` config (line 38 in `CreditBanner.tsx`) means the close button is never rendered for that state, enforcing permanent visibility.

The "credits renewed" success nudge (lines 66–98) is a separate render path triggered by the `showRenewed` prop, not by a state transition — it is caller-controlled and not wired to any automatic post-renewal event in the prototype.

## 8. Payment Integration Readiness

A real Stripe port would touch these points:

The plain `<Input>` fields for card number, expiry, and CVC must be replaced with Stripe Elements (`CardNumberElement`, `CardExpiryElement`, `CardCvcElement`) or the combined `CardElement`. This eliminates all PCI scope for card data — no raw PAN ever reaches the application's JavaScript. The current stub stores raw card digits in React state (`cardNumber` string), which in production would be a SAQ D PCI scope issue if the page is not fully isolated.

The `handleSubmit` function would call `stripe.createPaymentMethod()` or `stripe.confirmCardPayment()` with a `client_secret` fetched from the backend, replacing the `setTimeout` stub.

`autoComplete` attributes (`cc-number`, `cc-exp`, `cc-csc`) are already correct (CheckoutPage.tsx lines 423, 459, 474), which assists browser autofill and reduces friction.

The `detectCardBrand` and `formatCardNumber` helpers are pure UI conveniences and would be deleted in production, as Stripe Elements render their own formatted input and brand detection internally.

The success redirect using `onNavigate('Builder')` after 1.5s would be replaced with a webhook-confirmed redirect or a polling call to verify subscription activation before sending the user into a metered builder session.

## 9. Error Handling

There is none in the current prototype. `handleSubmit` in both `CheckoutPage.tsx:178–187` and `CheckoutModal.tsx:112–119` always transitions to success after 2 seconds. The `isSubmitting`/`isSuccess` boolean pair has no `isError` counterpart and no error message slot in the JSX.

Specifically absent: a declined card state (no red feedback below the card number field), a network failure state (no retry prompt), and a duplicate purchase guard (clicking the CTA while `isSubmitting` is gated at line 180 by an early return, but the state cannot represent "already subscribed"). The `billing-states-flow.md` edge case analysis flags this as critical item 3: "failed payment leaves user at depleted with no feedback."

For production, the payment form needs an `isError` state driving an inline `Alert` variant `destructive` below the CTA, with distinct messages for card decline ("Your card was declined. Try a different card."), network failure ("Something went wrong. Your card was not charged."), and idempotency/duplicate ("You already have an active subscription."). The `CheckoutModal` close-on-success path also needs guarding — the modal currently has no auto-close after success, leaving it open indefinitely in the success state.
