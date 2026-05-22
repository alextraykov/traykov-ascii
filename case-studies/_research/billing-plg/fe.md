# Billing PLG — Frontend Engineering Notes

> Surfaces: CreditWarningCard, CreditPackCard, CreditUpgradeCard, UpgradeModal, CreditBanner
> Triggered inline inside ChatWindow
> Prototype branch: `workflow` (active), billing work landed in `billing`

---

## 1. Message-type injection pattern

Credit nudge surfaces live as typed entries in the `messages: Message[]` array, not as overlays or portals. The `Message` interface union (`ChatWindow.tsx:96`) is:

```
type: 'user' | 'assistant' | 'credit-warning' | 'credit-pack-selector' | 'credit-upgrade'
```

Three credit-specific message shapes are defined:

- `credit-warning` — carries a `creditWarningState` field (`'warning' | 'low' | 'depleted'`), renders `CreditWarningCard` (`ChatWindow.tsx:1155–1163`)
- `credit-pack-selector` — no content field needed; renders `CreditPackCard` inline (`ChatWindow.tsx:1165–1173`)
- `credit-upgrade` — renders `CreditUpgradeCard` (`ChatWindow.tsx:1175–1183`)

Each type falls through a conditional render block inside the message list map, wrapped in `.chat-window__message--system`. The `isDimmed` class is still applied based on `pendingRevertIndex`, so credit cards participate in the version-revert dimming sweep — consistent with treating them as real thread entries.

**Why messages instead of overlays.**

Three reasons documented across the handoff and in the component JSDoc:

1. **Persistent in thread.** The card remains visible in the scroll history. A user who scrolled past a credit warning and then scrolled back can still act on it, unlike a toast or a floating overlay that disappears.
2. **Audit trail.** The message timestamp is set at injection time. This creates an implicit log of when each credit state was first surfaced to the user in a session — useful for analytics and for debugging depletion timing.
3. **User-dismissible via scroll.** The user controls when the card exits their viewport. There is no forced interruption; the build prompt remains accessible below the card. The `CreditPackCard` and `CreditUpgradeCard` do not have an explicit close button in the chat context (no `onDismiss` prop is passed from `ChatWindow`) — dismissal is scroll-based.

---

## 2. UpgradeModal vs. inline card

The flow escalates from inline card to full modal at the point of plan selection, not credit purchase.

**Inline cards** (`CreditWarningCard`, `CreditPackCard`, `CreditUpgradeCard`) handle the decision surface: which state triggered this, what options exist, what to buy or upgrade to. They stay in the thread.

**UpgradeModal** (`UpgradeModal.tsx`) opens when the user clicks a plan CTA. Specifically:

- `CreditWarningCard` (warning/low state): "Compare plans" ghost button at line 169 calls `openModal` → `setShowUpgradeModal(true)` (`CreditWarningCard.tsx:83–84`).
- `CreditWarningCard` (depleted state): "Upgrade plan" solid CTA at line 127 calls `setShowUpgradeModal(true)` (`CreditWarningCard.tsx:126–129`).
- `CreditBanner`: "Add more" / "Upgrade" primary button calls `openModal` (`CreditBanner.tsx:63`).
- `CreditUpgradeCard`: the "+ Upgrade" button calls `onUpgrade` — in the prototype this prop is not passed from `ChatWindow` (line 1178 passes no props), so the button is currently a no-op.

`UpgradeModal` delegates to the `Dialog` component from `@/components/ui/Dialog` (`UpgradeModal.tsx:75`). Focus trap and keyboard escape are handled by that primitive — the dialog conforms to `role="dialog"` with `aria-modal`, and `Escape` closes it via Radix's `Dialog.onOpenChange`. Overlay z-index is managed by the Dialog primitive's portal, which renders above the chat layer.

On plan selection, `UpgradeModal` calls:
```ts
onSelectPlan?.(plan.name.toLowerCase());
onOpenChange(false);
```
The `onSelectPlan` callback at every call site is `(plan) => { window.location.hash = '#checkout?plan=' + plan; }` (`CreditWarningCard.tsx:136`, `CreditWarningCard.tsx:176`, `CreditBanner.tsx:151`). This navigates to `CheckoutPage` via hash routing, closing the modal simultaneously.

---

## 3. CTA → flow

The full chain from "Buy credits" / "Upgrade" button to checkout:

**Plan upgrade path (connected):**
`CreditWarningCard` CTA → `UpgradeModal` opens → user selects Solo/Team → `window.location.hash = '#checkout?plan=solo'` → app routes to `CheckoutPage` with plan pre-selected → simulated submit → redirect to builder.

**Credit pack purchase path (not connected in prototype):**
`CreditPackCard` "Buy $N in credits" button → calls `onBuy?.(chargeAmount)` (`CreditPackCard.tsx:99`) → `onBuy` prop is not passed from `ChatWindow` (line 1169 renders `<CreditPackCard />` with no props) → click is a no-op.

`CreditUpgradeCard` "+ Upgrade" → calls `onUpgrade` → prop not passed from `ChatWindow` → no-op.

The prototype has two checkout mechanisms that don't converge: `UpgradeModal` → hash route → `CheckoutPage` (full page, from warning surfaces), and `CheckoutModal` (overlay, triggered only from `PricingPage` plan cards). Credit pack purchases connect to neither. This is documented as an unresolved product decision in `docs/diagrams/credit-purchase-flow.md` (Open Questions section).

---

## 4. State transitions that trigger PLG

`CreditStateContext` wraps `useCreditState` (`src/lib/useCreditState.ts`). The `creditState` value is derived purely from `percentRemaining`:

```ts
// useCreditState.ts:55–60
if (percentRemaining <= 0) return 'depleted';
if (percentRemaining <= 5)  return 'low';
if (percentRemaining <= 20) return 'warning';
return 'healthy';
```

`ChatWindow` consumes `creditState` and `setCreditsRemaining` from the context (`ChatWindow.tsx:142`). The comment at line 156–159 is explicit:

```ts
// Track credit state transitions (depleted card removed per design decision)
React.useEffect(() => {
  prevCreditStateRef.current = creditState;
}, [creditState]);
```

A `useEffect` watches `creditState` but only updates `prevCreditStateRef` — it does **not** auto-inject a credit card message on state transition. There is no reactive side effect that pushes a new message when `creditState` crosses a threshold.

**Credit cards are only injected by the slash command handler.** When the user types `/credits warning`, `/credits low`, `/credits depleted`, `/credits depleted1`, or `/credits depleted2`, `executeSend` (`ChatWindow.tsx:948`) intercepts the input, calls `setCreditsRemaining` to force the context into the target state, and then manually pushes the appropriate message type into `setMessages`.

**Prototype-only caveat.** The `setCreditsRemaining` call is a demo control — it simulates what a real server push would do. In production, credit state transitions would originate from the server (build action completes → credits debited → balance pushed to client). The injection of a warning card into the thread would need to be triggered by the client detecting an escalation in the incoming credit balance — for example, comparing the new server value against the previous `creditState` and pushing a message if it crossed a threshold. Whether that detection happens via WebSocket event, polling response delta, or post-build API response body is an open port concern not resolved in this prototype.

---

## 5. Motion

**CreditWarningCard card enter** (`CreditWarningCard.tsx:93–95`):
Framer Motion: `initial={{ opacity: 0, y: 6 }}` → `animate={{ opacity: 1, y: 0 }}`, `duration: 0.25s`, `ease: [0, 0, 0.2, 1]` (matches `--motion-ease-decelerate`). `useReducedMotion()` check sets `initial={false}` to skip the enter animation entirely.

**CreditWarningCard depleted orbs** (`CreditWarningCard.css:245–268`):
Three CSS `@keyframes` running on 20s / 25s / 30s cycles (`card-orb-drift-primary/accent/deep`). Each orb uses `translate` + `scale` on the transform property with `will-change: transform`. Dark mode reduces orb opacity to 25% / 12% / 12%. `@media (prefers-reduced-motion: reduce)` sets `animation: none` on `.credit-warning-card__orb` — orbs freeze at their initial positions.

**CreditPackCard and CreditUpgradeCard enter** (`CreditPackCard.tsx:34–37`, `CreditUpgradeCard.tsx:22–24`):
Same Framer Motion pattern with `y: 12` (larger travel distance, heavier card). `useReducedMotion()` → `initial={false}` + `transition={{ duration: 0 }}`.

**UpgradeModal overlay** (`UpgradeModal.tsx:75`):
Delegates to the `Dialog` / `DialogContent` primitives. The dialog enter/exit animation is in `src/components/ui/Dialog/Dialog.css` (not read here — not modified by this billing work). The overlay uses a portal, so z-index conflicts with the chat layer are avoided.

**CreditBanner fade** (`CreditBanner.tsx:70–77`, `118–128`):
`AnimatePresence` wraps the banner. `initial={{ opacity: 0, height: 0 }}` → `animate={{ opacity: 1, height: 'auto' }}` → `exit={{ opacity: 0, height: 0 }}`, `duration: 0.15s` (`MOTION_FAST`). The `key={creditState}` prop on the motion element means the banner remounts and re-animates on each state escalation. `prefers-reduced-motion` check: `initial={false}` skips mount animation; `exit={undefined}` removes the exit animation.

---

## 6. Slash command presets

`SLASH_CREDIT_PRESETS` is defined at `ChatWindow.tsx:39–44`:

```ts
const SLASH_CREDIT_PRESETS: Record<string, { credits: number; state: Exclude<CreditState, 'healthy'> | null }> = {
  healthy:  { credits: 18.4, state: null },
  warning:  { credits: 5.0,  state: 'warning' },
  low:      { credits: 1.2,  state: 'low' },
  depleted: { credits: 0,    state: 'depleted' },
};
```

The regex match (`ChatWindow.tsx:954`) also accepts `depleted1` and `depleted2` as special cases handled before the `SLASH_CREDIT_PRESETS` lookup:

- `/credits depleted1` or `/credits depleted` → `setCreditsRemaining(0)` + inject `type: 'credit-pack-selector'` → renders `CreditPackCard` (the 5-option radio buy flow)
- `/credits depleted2` → `setCreditsRemaining(0)` + inject `type: 'credit-upgrade'` → renders `CreditUpgradeCard` (the plan upsell card)
- `/credits healthy` → `setCreditsRemaining(18.4)`, `state: null` → no card injected, context updates only
- `/credits warning` → `setCreditsRemaining(5.0)` + inject `type: 'credit-warning'` with `creditWarningState: 'warning'`
- `/credits low` → `setCreditsRemaining(1.2)` + inject `type: 'credit-warning'` with `creditWarningState: 'low'`

Note: the `depleted` key in `SLASH_CREDIT_PRESETS` (`state: 'depleted'`) is never reached for the `CreditWarningCard` path because the `depleted` input string hits the `depleted1` branch first (`ChatWindow.tsx:959`). `CreditWarningCard` with `state="depleted"` is still a valid render from the Component Preview page but is bypassed in the chat context in favor of the more actionable `CreditPackCard`.

---

## 7. Production port concerns

The prototype simulates credit state via `setCreditsRemaining` (a React `useState` setter) called directly by the slash command handler. Several gaps must be resolved before this pattern is production-ready:

**Server event trigger for state injection.** Real credit depletion is caused by build actions on the server. The server debits credits and the client must detect the transition. Two plausible approaches:

- **WebSocket push**: Server emits a `credit_balance_update` event after each build. Client listener compares new balance against previous `creditState`. If the derived state escalates (healthy → warning, warning → low, low → depleted), the listener calls `setCreditsRemaining(newBalance)` and pushes the appropriate message into the chat thread.
- **Post-build polling**: Client polls `/api/credits` after each build response. Cheaper to implement but higher latency; also misses out-of-band depletion (e.g., concurrent session on another device).

**State reconciliation after purchase.** `CreditPackCard` in chat does not connect to `useCreditContext`. Buying credits in the prototype leaves the depleted state and the inline card unchanged (`billing-credit-packs.md`, Edge Case #9). Production must call `setCreditsRemaining(newBalance)` after a successful purchase API call to update the pill, banner, and popover simultaneously. The stale `credit-pack-selector` message in the thread should either auto-collapse (preferred) or display a post-purchase confirmation state — neither is designed yet (noted as an open question in `billing-credit-packs-preview.md`).

**`CREDIT_RATE` duplication.** The constant `1.30` ($/credit for custom amounts) is hardcoded in both `PricingPage.tsx` and `CreditPackCard.tsx`. In production this should come from a pricing API response or a shared constants module — otherwise a pricing change requires two surgical edits with no compile-time enforcement.

**Double-click guard.** The "Buy" button in `CreditPackCard` has no loading state or debounce. Rapid double-click will dispatch multiple `onBuy` calls (`billing-credit-packs.md`, Edge Case #8). Production needs disabled-after-first-click or an optimistic loading spinner.

**Checkout surface decision.** The prototype has two checkout components (`CheckoutModal` from PricingPage, `CheckoutPage` from hash routing via `UpgradeModal`) that implement the same action with different UX registers. The credit pack purchase path connects to neither. A single canonical checkout surface must be chosen before any billing flow is production-wired. This decision is tracked in `docs/diagrams/credit-purchase-flow.md` (Open Questions #1–5).
