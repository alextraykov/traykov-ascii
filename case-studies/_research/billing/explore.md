# Billing Core — Codebase Map

_Routes: `#pricing`, `#checkout` · Providers: `CreditStateProvider` at `App.tsx:264`_

## 1. Route map

- `#pricing` → `PricingPage` (`src/App.tsx:49, 178–184`)
- `#checkout` → `CheckoutPage` (`src/App.tsx:50, 185–191`). Accepts query params: `#checkout?plan=solo&period=yearly`.

Provider hierarchy: `DarkModeProvider` → `CreditStateProvider(initialCredits={1}, initialTotal={13})` → `TooltipProvider` (`App.tsx:263–269`). `initialCredits={1}` / `initialTotal={13}` = 7.7 % — boots the demo into **low state**.

## 2. PricingPage structure

`src/pages/PricingPage/PricingPage.tsx` (399 lines).

- **Header**: "Plans & usage" title (171–177).
- **Tab bar**: Plans / Usage (179–201).
- **Plans tab** (203–379): four plan cards (Free / Launch $99 / Scale $299 / Enterprise) + credit purchase section with 5 packs + "Manage billing" footer link.
- **Usage tab** delegates to `UsageTabContent.tsx` (358 lines): heatmap, stats, usage table.

Plan tiers hardcoded at `PricingPage.tsx:53–121` — a **different shape** (`price: number | null`) from `src/data/plans.ts:25–105` (`price: { monthly, yearly }`). The Launch card has `isPopular=true`. Credit top-up packs at `src/data/plans.ts:107–113`: Starter $20 / Standard $50 / Power $100 / Ultra $500 / Max $1000.

State: `activeTab`, `checkoutPlanId`, `selectedPack` (default 2 = Power), `expiryDate` (1 year out).

Plan CTAs open `CheckoutModal` via `setCheckoutPlanId` (`254–257`). **Credit pack "Buy" button is unwired** (`355–361`) — renders but no handler.

## 3. Two checkout surfaces

### CheckoutPage — `src/pages/CheckoutPage/CheckoutPage.tsx` (615 lines)

Full page, two-column. Left: billing period toggle (Monthly / Yearly with "−20 %" badge) + expandable plan cards (`role="radiogroup"`, `role="radio"`, `aria-checked`). Right: order summary + payment form (card number, expiry, CVC, cardholder, country, ZIP) + SSL trust indicator + submit CTA with loading → success → auto-redirect to Builder (1.5 s).

State: `isSubmitting`, `isSuccess`, six raw form fields locally held. Validation client-side only. Simulated 2 s delay; no API calls. Entrance uses staggered `fadeBlurIn` with `useReducedMotion()` gate (152).

### CheckoutModal — `src/components/composite/CheckoutModal/CheckoutModal.tsx` (357 lines)

Opened from PricingPage on plan CTA click. Props: `open`, `onOpenChange`, `planId`, `billingPeriod`. **Code duplication** with CheckoutPage: `detectCardBrand`, `formatCardNumber`, `formatExpiry`, `CardBrandIcon`, entire form structure copy-pasted verbatim. No shared `<PaymentForm>` primitive. `role="dialog"` + `aria-label` but **no focus trap** — tab exits into obscured background.

Modal for in-app plan upgrades; page for discovery buyers or deep-link URLs.

## 4. CreditStateContext

`src/contexts/CreditStateContext.tsx` wraps `useCreditState` hook (`src/lib/useCreditState.ts`, 177 lines). Consumer: `useCreditContext()` (throws outside provider).

`CreditInfo` fields (`useCreditState.ts:15–46`):

| Field | Type |
|---|---|
| `creditState` | `'healthy' \| 'warning' \| 'low' \| 'depleted'` |
| `creditsRemaining`, `creditsTotal`, `percentRemaining` | numbers (demo-settable) |
| `planName` | `'Pave Solo'` (hardcoded, 165) |
| `renewalDate` | ISO, mocked 1 h 3 m ahead (97–101) |
| `renewalCountdown` | formatted string, updates every 60 s (110–116) |
| `isBannerDismissed`, `dismissBanner` | dismiss state |
| `setCreditsRemaining`, `setCreditsTotal` | demo controls |
| `creditSources` | breakdown (plan allowance / purchased / used) |
| `usageRateTrend`, `usageRateLabel`, `estimatedDaysLeft` | derived |

Thresholds (`50–60`): `healthy > 20 %`, `warning ≤ 20 %`, `low ≤ 5 %`, `depleted ≤ 0 %`. `deriveState()` is event-driven — flips the instant `creditsRemaining` changes. Banner dismissal auto-resets on state escalation (`119–127`). No `useMemo` on provider value — fine at prototype scale.

## 5. CreditPill placement

`src/components/composite/CreditPill/CreditPill.tsx` (45 lines) — button with Coins icon + "X.XX / Y.YY" label, `data-state={creditState}` for styling. Wraps `CreditPopover.tsx` (287 lines).

**Persistent chrome**: mounted in `AppHeader.tsx:250` on every authenticated page. Also optionally mountable in `ChatInput.tsx:406` via `showCreditPill` flag — two possible mount points.

Popover zones: plan header → animated balance number (`useSpring`, stiffness 80, damping 18, reduced-motion skips) + usage meter → trend indicator → renewal date → collapsible credit sources accordion → footer CTAs that change by state (Upgrade / Add more).

## 6. CreditBanner placement

`src/components/composite/CreditBanner/CreditBanner.tsx` (156 lines). Mounted in `ChatInput.tsx:241` as a nudge bar above the textarea.

State → icon + message + CTA map (`20–39`):

| State | Icon | CTA | Dismissible |
|---|---|---|---|
| warning | Info | Add more | ✓ |
| low | AlertTriangle | Add more | ✓ |
| depleted | XCircle | Upgrade | **✗** |
| renewed | CheckCircle | — (dismiss only) | ✓ |

Visibility: `creditState !== 'healthy'` AND `!isBannerDismissed` (or `creditState === 'depleted'` overrides dismissal). CTA opens `UpgradeModal`. Enter/exit: height 0→auto + opacity, 150 ms.

## 7. Usage heatmap

`UsageTabContent.tsx` (358 lines). Credit summary with stacked bar (Used / Included / Purchased segments), 4 summary stat cards, filters (scope: All/By App/By User; time range: 7d/30d/90d/All), calendar heatmap 365 days (level 0–4 intensity based on credits spent), detailed usage table (Date/App/Project/Credits/Input Tokens/Output Tokens/Prompts). Mock data in `usageData.ts`. Heatmap generator `generateUsageHeatmapData()` weekday-weighted random.

## 8. Mock data sources

- `src/data/plans.ts` — canonical `PLAN_TIERS`, `CREDIT_TOPUP_PACKS`, `CREDIT_INFO_CARDS`.
- `src/pages/PricingPage/usageData.ts` — `CREDIT_SEGMENTS`, `CREDIT_TOTAL`, `MOCK_STATS`, `MOCK_USAGE_RECORDS`.

## 9. Documentation

- `docs/handoffs/billing.md`, `docs/previews/billing.md` — core billing spec.
- `docs/diagrams/billing-states-flow.md` — state machine, UI surface map, CTA split, 19 edge cases.
- `docs/prd-pm-pd/credit-popover-redesign.md` — popover PRD.
- `docs/prd-pm-pd/blinq-trail-experiment.md` — trial experiment (2 h build time / $10 day cap).

## 10. Architectural notes

- Two checkout variants duplicate payment-form code. Extract `<PaymentForm>` primitive.
- `CheckoutModal` hand-rolls overlay — skips Radix Dialog's focus trap / `aria-modal`.
- Raw PAN digits sit in React state — SAQ D scope if deployed. Stripe Elements swap is the correct port target; all `autoComplete` attributes are already correct.
- No error handling path (declined card, network failure, duplicate purchase).
- `blinq-*` prefixed class names in `CheckoutPage.css` and `CheckoutModal.css` are rebrand leftovers.
