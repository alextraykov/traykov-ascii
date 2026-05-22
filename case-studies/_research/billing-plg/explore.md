# Billing PLG (Product-Led Growth) — Codebase Inventory & Architecture

> **Date**: 2026-04-22  
> **Scope**: In-app upgrade/upsell surfaces for free-to-paid conversion  
> **Status**: Maps PLG card system, trigger logic, state machine, and boundary with billing-core  

---

## 1. PLG Card Inventory

### 1.1 CreditWarningCard
**File**: `src/components/composite/CreditWarningCard/CreditWarningCard.tsx:1–182`

| Aspect | Details |
|--------|---------|
| **Props** | `state: Exclude<CreditState, 'healthy'>`, `credits?: string`, `renewalCountdown?: string`, `className?: string` |
| **States** | `warning` \| `low` \| `depleted` |
| **Visual shape** | Warning/Low: minimal inline card — accent bar (left edge) + icon + title + description + ghost CTA. Depleted: ambient gradient card with orbs + solid CTA. |
| **CTA labels** | Warning/Low: "Compare plans". Depleted: "Upgrade plan" |
| **CTA handler** | Opens `UpgradeModal` (plan selector); on selection, navigates to checkout via `window.location.hash = '#checkout?plan=X'` |
| **Mount point** | ChatWindow messages (inline system message, not a user/assistant message) |
| **Animation** | Framer Motion: opacity 0→1, y 6→0, 250ms easeOut. Respects `prefers-reduced-motion`. |
| **Special features** | Depleted state has animated CSS orbs (drift keyframes 20/25/30s). Copy flags @handoff and @copy annotations. |

### 1.2 CreditPackCard
**File**: `src/components/composite/CreditPackCard/CreditPackCard.tsx:1–109`

| Aspect | Details |
|--------|---------|
| **Props** | `className?: string`, `onBuy?: (amount: number) => void` |
| **States** | Always rendered in one state; internally tracks `selectedPack: number` (0–4, index into `CREDIT_TOPUP_PACKS`) |
| **Visual shape** | Full-width card with header (title + subtitle), highlight box (selected pack price + feature bullets), pack row list (radio-style, 5 options), footer (Buy button). |
| **Pack data source** | `CREDIT_TOPUP_PACKS` from `src/data/plans.ts`: Starter ($20), Standard ($50), Power ($100), Ultra ($500), Max ($1,000). Default selection: index 2 (Power). |
| **CTA** | "Buy $X in credits" — calls `onBuy?.(chargeAmount)`. In chat context, no handler passed (no-op). |
| **Mount point** | ChatWindow messages when `type: 'credit-pack-selector'` |
| **Animation** | Mount: opacity 0→1, y 12→0, 250ms easeOut. Pack rows stagger via `--step-index` CSS custom property (60ms per row). |
| **Icon patterns** | Rotates `[Zap, Star, Zap, LayoutGrid, Star]` across the 5 packs. |

### 1.3 CreditUpgradeCard
**File**: `src/components/composite/CreditUpgradeCard/CreditUpgradeCard.tsx:1–82`

| Aspect | Details |
|--------|---------|
| **Props** | `className?: string`, `onUpgrade?: () => void`, `onDismiss?: () => void` |
| **States** | Single state; no internal state tracking. Dismissible if `onDismiss` prop is provided (renders X button). |
| **Visual shape** | Replit-style upsell: header (title "You're out of credits" + subtitle), plan highlight box ($25/mo Pave Solo, 3 feature bullets), full-width upgrade button + dismiss X. |
| **Preset plan** | Hard-coded to Pave Solo: $25/month, 25 credits/month included, unlimited apps, on-demand credit packs. |
| **CTA** | "+ Upgrade" — calls `onUpgrade?.()`. In chat context, no handler (no-op). |
| **Mount point** | ChatWindow messages when `type: 'credit-upgrade'` |
| **Animation** | Mount: opacity 0→1, y 12→0, 250ms easeOut. Respects reduced motion. |

### 1.4 UpgradeModal
**File**: `src/components/composite/UpgradeModal/UpgradeModal.tsx:1–137`

| Aspect | Details |
|--------|---------|
| **Props** | `open: boolean`, `onOpenChange: (open) => void`, `onSelectPlan?: (planName: string) => void` |
| **States** | Modal overlay controlled by `open` prop. |
| **Visual shape** | Responsive grid of 4 plan cards: Free (current, disabled), Solo ($19/mo), Team ($49/mo, "Most popular" badge), Enterprise (custom, disabled). Each card has icon, name, price, credits, features, CTA. |
| **Plan data** | Static `UPGRADE_PLANS` array (hardcoded in component, not data-driven). |
| **CTA** | Plan-specific: Free shows "Current plan" (disabled), Solo/Team show "Get {name}", Enterprise shows "Contact us" (disabled). On click, calls `onSelectPlan?.(planName.toLowerCase())` and closes modal. |
| **Default trigger** | Opened from CreditWarningCard, CreditBanner, and CreditPill's popover. |
| **Animation** | Dialog from `@radix-ui/dialog`. No custom Framer Motion. |

### 1.5 CreditBanner (supporting PLG surface)
**File**: `src/components/composite/CreditBanner/CreditBanner.tsx:1–157`

| Aspect | Details |
|--------|---------|
| **Props** | `showRenewed?: boolean`, `className?: string` |
| **States** | `healthy` (no render), `warning`, `low`, `depleted`, + special `renewed` state |
| **Visual shape** | Single-line bar (dismissible for warning/low, non-dismissible for depleted) with icon, message, CTA button, X dismiss (if applicable). |
| **CTA labels** | Warning/Low: "Add more". Depleted: "Upgrade". |
| **Mount point** | Above `ChatInput` in ChatWindow (nudge bar pattern). |
| **Animation** | AnimatePresence + motion.div: height 0→auto, opacity 0→1 on entry, reverse on exit. |
| **Dismissal logic** | `isBannerDismissed` state; resets when state escalates (e.g., warning → low). Depleted state cannot be dismissed. |

### 1.6 CreditPill & CreditPopover (supporting surfaces)
**Files**: `src/components/composite/CreditPill/CreditPill.tsx:1–45`, `src/components/composite/CreditPill/CreditPopover.tsx` (not read; referenced)

| Aspect | Details |
|--------|---------|
| **CreditPill** | Header element showing `{used} / {total}` credits with icon. Wraps `CreditPopover`. Motion on hover/tap (scale). |
| **CreditPopover** | Detailed plan info + usage bar + renewal countdown (expanded from [credit-popover-redesign.md](../prd-pm-pd/credit-popover-redesign.md)). Triggers "Upgrade plan" or "Add more" CTA depending on state. |
| **State-aware rendering** | Pill color changes per state. Popover shows source breakdown + activity in warning/low states. |

---

## 2. Trigger Logic — How PLG Surfaces Are Injected

### 2.1 ChatWindow Message Types
**File**: `src/components/composite/ChatWindow/ChatWindow.tsx:94–123`

PLG surfaces are rendered as special `Message` types:

```typescript
type Message = {
  id: string;
  type: 'user' | 'assistant' | 'credit-warning' | 'credit-pack-selector' | 'credit-upgrade';
  content: string;
  timestamp: Date;
  // ... other fields
  creditWarningState?: Exclude<CreditState, 'healthy'>;  // for credit-warning type
};
```

### 2.2 Render Branches
**File**: `src/components/composite/ChatWindow/ChatWindow.tsx:1155–1183`

```typescript
// credit-warning message type → CreditWarningCard
if (message.type === 'credit-warning' && message.creditWarningState) {
  return (
    <div className="chat-window__message chat-window__message--system">
      <CreditWarningCard state={message.creditWarningState} renewalCountdown={renewalCountdown} />
    </div>
  );
}

// credit-pack-selector message type → CreditPackCard
if (message.type === 'credit-pack-selector') {
  return (
    <div className="chat-window__message chat-window__message--system">
      <CreditPackCard />
    </div>
  );
}

// credit-upgrade message type → CreditUpgradeCard
if (message.type === 'credit-upgrade') {
  return (
    <div className="chat-window__message chat-window__message--system">
      <CreditUpgradeCard />
    </div>
  );
}
```

### 2.3 Slash Command / Dev Presets
**File**: `src/components/composite/ChatWindow/ChatWindow.tsx:39–44, 953–1002`

Developers can simulate PLG states via `/credits [state]` slash command in ChatWindow:

```typescript
const SLASH_CREDIT_PRESETS: Record<string, { credits: number; state: Exclude<CreditState, 'healthy'> | null }> = {
  healthy:   { credits: 18.4, state: null },           // No card
  warning:   { credits: 5.0,  state: 'warning' },      // → CreditWarningCard (warning)
  low:       { credits: 1.2,  state: 'low' },          // → CreditWarningCard (low)
  depleted:  { credits: 0,    state: 'depleted' },     // → CreditWarningCard (depleted)
  depleted1: { credits: 0,    state: null (special) }, // → CreditPackCard (5-option radio)
  depleted2: { credits: 0,    state: null (special) }, // → CreditUpgradeCard (upsell)
};
```

**Dispatch Logic** (ChatWindow.tsx:959–984):
- `/credits warning`: Sets `creditsRemaining = 5.0`, injects `creditWarningState: 'warning'` message
- `/credits low`: Sets `creditsRemaining = 1.2`, injects `creditWarningState: 'low'` message
- `/credits depleted`: Sets `creditsRemaining = 0`, injects `type: 'credit-pack-selector'` message (NOT credit-warning)
- `/credits depleted1`: Alias for `/credits depleted` → `CreditPackCard`
- `/credits depleted2`: Sets `creditsRemaining = 0`, injects `type: 'credit-upgrade'` message → `CreditUpgradeCard`
- `/credits healthy`: Sets `creditsRemaining = 18.4`, no card (healthy state has no nudge)

---

## 3. Credit State → PLG Surface Mapping

### 3.1 State Machine
**File**: `src/lib/useCreditState.ts:48–60`

```typescript
const THRESHOLDS = {
  WARNING: 20, // ≤20% remaining → warning
  LOW: 5,      // ≤5% remaining → low
};

function deriveState(percentRemaining: number): CreditState {
  if (percentRemaining <= 0) return 'depleted';
  if (percentRemaining <= THRESHOLDS.LOW) return 'low';
  if (percentRemaining <= THRESHOLDS.WARNING) return 'warning';
  return 'healthy';
}
```

**Context Provider**: `src/contexts/CreditStateContext.tsx:1–37`
- Wraps entire app
- Exposes `useCreditContext()` hook returning `CreditInfo`
- Supports `initialCredits` and `initialTotal` overrides for demo

### 3.2 State → Surface Mapping (from docs/diagrams/billing-states-flow.md)

| Credit State | % Remaining | Nudge | Card | Input |
|--------------|-------------|-------|------|-------|
| **Healthy** | >20% | None | None | Enabled |
| **Warning** | ≤20% | CreditBanner ("Add more", dismissible) | CreditWarningCard (state='warning', "Compare plans") | Enabled |
| **Low** | ≤5% | CreditBanner ("Add more", dismissible) | CreditWarningCard (state='low', "Compare plans") | Enabled |
| **Depleted** | 0% | CreditBanner ("Add more", non-dismissible) | CreditPackCard (5 radio options) OR CreditUpgradeCard (upsell) OR CreditWarningCard (state='depleted') | **Disabled** |

### 3.3 How UpgradeModal Opens
1. **From warning/low cards**: CreditWarningCard CTA ("Compare plans"/"Upgrade plan") → `setShowUpgradeModal(true)` → renders `UpgradeModal`
2. **From CreditBanner**: "Add more" CTA → `setShowUpgradeModal(true)` → renders `UpgradeModal`
3. **From CreditPill popover**: "Upgrade plan" CTA (depleted only) → navigates to `UpgradeModal` or checkout
4. **Selection handler**: User picks Solo/Team → `onSelectPlan?.(planName.toLowerCase())` → `window.location.hash = '#checkout?plan=X'` → CheckoutPage mounts

---

## 4. PLG Card Inventory Summary Table

| Component | Mount Point | States | Primary CTA | Secondary CTA | When Shown |
|-----------|-------------|--------|-------------|---------------|-----------|
| **CreditWarningCard** | Chat message (warning, low, depleted) | 3 (warning, low, depleted) | "Compare plans" / "Upgrade plan" | None | Injected per state on credit change |
| **CreditPackCard** | Chat message (credit-pack-selector) | 1 (internal pack selection) | "Buy $X in credits" | None | Only when `/credits depleted1` or state='depleted' |
| **CreditUpgradeCard** | Chat message (credit-upgrade) | 1 | "+ Upgrade" | Dismiss (X) | Only when `/credits depleted2` |
| **CreditBanner** | Above ChatInput (nudge bar) | 4 (healthy=hidden, warning, low, depleted + renewed) | "Add more" (warning/low), "Upgrade" (depleted) | Dismiss (X, warning/low only) | Always visible except healthy or if dismissed (until escalation) |
| **CreditPill** | App header | 4 (all states) | Colored indicator; opens popover on click | None | Always visible |
| **UpgradeModal** | Modal overlay | 1 (always same plan grid) | Plan-specific: "Current plan" / "Get Solo" / "Get Team" / "Contact us" | None | Opened by warning/low/depleted cards or CreditBanner |

---

## 5. Documentation Summary

### 5.1 [billing-credit-packs.md](../handoffs/billing-credit-packs.md) — Engineering Handoff
**Status**: Primary technical spec (2026-04-08)  
**Key sections**:
- **Overview**: New credit pack radio selector on PricingPage; two inline chat cards (CreditPackCard + CreditUpgradeCard); global button radius change pill→8px; plan card equal-height fix
- **Pack data**: 5 tiers at $20-increment pricing (Starter $20, Standard $50, Power $100, Ultra $500, Max $1,000)
- **State & props**: Detailed tables for PricingPage state, CreditPackCard state, data source
- **Flows & diagrams**: Mermaid credit purchase flow (two execution paths: PricingPage vs ChatWindow)
- **Animations**: Staggered pack entry, hover transitions, mount/collapsible animations, token references
- **Tokens used**: Colors (bg-input, bg-selected, accent-primary), radius (md=8px, lg=10px), motion (fast=150ms, medium=250ms)
- **Accessibility**: aria-pressed on pack rows, aria-expanded on collapsible, known gap: nested input in button is invalid HTML
- **Edge cases**: 10 items (critical to nice-to-have): stale cards after purchase, CREDIT_RATE duplication, button not wired to payment API, etc.

**File index**: Lists all component files touched by credit pack redesign

### 5.2 [billing-credit-packs-preview.md](../previews/billing-credit-packs-preview.md) — PM Preview Brief
**Status**: Non-technical summary for PM/content/QA (2026-04-08)  
**Key sections**:
- **What changed**: Slider → preset tiles, two inline chat cards, global button polish
- **Why**: Preset tiles match industry pattern (12-platform audit: OpenAI, Anthropic, Figma, etc.); slider has mobile precision + accessibility issues
- **UX research**: Competitive audit findings (all 12 platforms audited use presets, zero use slider)
- **Risks and open questions**: Custom pack CTA undefined, copy alignment across surfaces, "Best value" badge permanence, post-purchase card state, button radius regression
- **Metrics to watch**: Conversion rate, AOV, custom pack selection rate, chat-to-purchase conversion (new), Starter pack selection
- **Copy inventory**: Tables for exact copy on PricingPage and CreditPackCard, post-purchase state TBD
- **Feedback routing**: How to file copy/interaction/visual/post-purchase issues

### 5.3 [credit-popover-redesign.md](../prd-pm-pd/credit-popover-redesign.md) — PRD (Product Requirements Document)
**Status**: Design decision doc for CreditPopover component (2026-03-30)  
**Key sections**:
- **Problem**: Current popover is minimal (balance only); doesn't answer "how fast am I burning?", "when do they reset?", "can I get more without upgrading?"
- **Goals**: Reduce billing anxiety, increase add-more conversion, reduce modal abandonment, establish popover as canonical billing quick-view
- **Users in scope**: Trial users (highest urgency), admin users, builder users
- **Proposed design**: 5 sections (renewal countdown, usage rate signal, source breakdown, activity snippet, CTA) with progressive disclosure
- **Layout**: 280px fixed width; heights vary by state (healthy ~148px, warning ~212px, low ~196px, depleted ~164px)
- **Design decisions log**: 8 key decisions with rationale and tradeoffs (e.g., source breakdown hover-only in healthy, always-visible in warning+)
- **Copy rules**: Sentence case, no playfulness, state-specific messages
- **Interaction model**: What's interactive (balance hover reveal, activity disclosure, CTAs) vs. display-only (plan name, bar, renewal)
- **Future opportunities**: Auto add-more toggle, cost projection, per-action credit cost preview, promotional credit display, usage trend arrow

### 5.4 [billing-states-flow.md](../diagrams/billing-states-flow.md) — Mermaid Diagrams
**Status**: Visual reference (updated 2026-04-08)  
**Key sections**:
- **Credit state machine**: 4 states (healthy, warning, low, depleted) with thresholds (20%, 5%, 0%)
- **UI surface map**: Component hierarchy (CreditPill → CreditPopover, ChatArea → CreditWarningCard/CreditPackCard, InputArea → CreditBanner)
- **CTA responsibility split**: Nudge focuses "Add more" (low friction), Card focuses "Upgrade" (considered decision), Pill reflects primary action per state
- **Credit lifecycle**: 30-day cycle diagram with escalation paths (warning → low → depleted) and recovery paths (add more/upgrade/renewal)
- **Dismiss & escalation logic**: When nudge reappears (state escalation), when it stays hidden, depleted always visible
- **Edge case analysis**: 19 items across critical (mid-build depletion, stale cards, payment failure, input not guarded), important (label inconsistency, triple-surface interruption, negative credits), and nice-to-have (multi-card injection, grace period)

### 5.5 [credit-purchase-flow.md](../diagrams/credit-purchase-flow.md) — Flow Maps
**Status**: Incomplete flows + open questions (2026-04-08)  
**Key sections**:
- **All entry points**: 11 paths (sidebar billing link, upgrade button, credit nudges, pages, modals, chat cards) with 3 unconnected buttons (marked ⚠️)
- **The problem**: Two different checkout mechanisms (CheckoutPage full-page vs CheckoutModal overlay) that don't converge
- **Flow 1**: Credit warning → UpgradeModal → CheckoutPage (works)
- **Flow 2**: PricingPage plan card → CheckoutModal (works)
- **Flow 3**: Credit pack purchase (NOT connected — no onClick handlers)
- **Component hierarchy**: Tree showing PricingPage structure, ChatWindow with CreditPackCard, shared data source (CREDIT_TOPUP_PACKS)
- **Open questions**: 5 unresolved decisions (where should buy credits go, should checkout mechanisms unify, sidebar button target, CreditPackCard modal vs navigate, credit pack vs plan upgrade same checkout or separate)
- **Unconnected buttons**: 4 buttons with no handlers (PricingPage buy, CreditPackCard buy, CreditUpgradeCard upgrade, sidebar "Upgrade to Pro")

---

## 6. Context: `useCreditState` Hook

**File**: `src/lib/useCreditState.ts:1–177`

### 6.1 Types & Interface

```typescript
export type CreditState = 'healthy' | 'warning' | 'low' | 'depleted';

export interface CreditInfo {
  creditState: CreditState;           // Derived from percentRemaining thresholds
  creditsRemaining: number;           // User-facing balance (abstract units)
  creditsTotal: number;               // Total for current billing cycle
  percentRemaining: number;           // 0–100, derived
  planName: string;                   // Hardcoded 'Pave Solo' in prototype
  renewalDate: string;                // ISO date, mock = 1h 3m from now
  renewalCountdown: string;           // Formatted "Xd : Xh" or "Xh : XXm"
  isBannerDismissed: boolean;         // Dismissal state per state level
  dismissBanner: () => void;          // Sets dismissedAtState
  setCreditsRemaining: (n) => void;   // Demo control
  setCreditsTotal: (n) => void;       // Demo control
  creditSources: CreditSource[];      // Mock: plan allowance, purchased, used
  usageRateTrend: 'up'|'down'|'neutral'; // Derived from state
  usageRateLabel: string;             // "~X days at current pace" or "On track"
  estimatedDaysLeft: number | null;   // Calculated from burn rate mock
}
```

### 6.2 Default Values & Thresholds

```typescript
// Hook call: useCreditState(initialCredits = 18.4, initialTotal = 25)
// Defaults: 73.6% healthy (high safe zone)

// Thresholds
const THRESHOLDS = {
  WARNING: 20, // ≤20% remaining → warning state
  LOW: 5,      // ≤5% remaining → low state
};

// State derivation
deriveState(percentRemaining):
  - percentRemaining <= 0    → 'depleted'
  - percentRemaining <= 5    → 'low'
  - percentRemaining <= 20   → 'warning'
  - else                     → 'healthy'
```

### 6.3 Countdown Formatter

```typescript
formatCountdown(renewalDate: string): string
// Example: "2h : 15m" or "14d : 8h"
// Updates every 60 seconds via useEffect
```

### 6.4 Banner Dismissal Logic

```typescript
isBannerDismissed: STATE_SEVERITY[creditState] <= STATE_SEVERITY[dismissedAtState]
// If user dismisses at warning (severity 1), banner hides
// If credit state escalates to low (severity 2), dismissal resets
// Depleted (severity 3) cannot be dismissed — always visible
```

### 6.5 Mock Derived Data

- **creditSources**: Plan allowance (20), Purchased (5), Used this cycle (calculated)
- **usageRateTrend**: 'up' (warning/low), 'down' (healthy), 'neutral' (depleted)
- **usageRateLabel**: "~20 days at current pace" (healthy), "~5 days" (warning), "~1 day" (low), empty (depleted)
- **estimatedDaysLeft**: `creditsRemaining / 0.92` (mock burn rate = 0.92 credits/day)

---

## 7. Comparison: PLG vs Billing-Core

### 7.1 Boundary Definition

**Billing-core** (dedicated pricing/checkout surfaces):
- **PricingPage** (`src/pages/PricingPage/PricingPage.tsx`): Full-page pricing table with plan tiers (Free/Launch/Scale/Enterprise) + credit purchase section + usage tab
- **AccountPage** (`src/pages/AccountPage/AccountPage.tsx`): Billing settings, payment methods, usage history, invoice download
- **CheckoutPage** / **CheckoutModal**: Payment form triggered from plan card or credit warning modal
- **Scope**: Dedicated pages for users who navigate *to* billing intentionally

**Billing-PLG** (in-flow upsell/friction-free surfaces):
- **CreditBanner**: Persistent nudge bar (not a dedicated page)
- **CreditWarningCard**: Inline chat message (intercepting user's current task)
- **CreditPackCard**: Inline chat purchase (no page navigation)
- **CreditUpgradeCard**: Inline chat upsell (no page navigation)
- **CreditPill + CreditPopover**: Header indicator (not a dedicated page)
- **UpgradeModal**: Lightweight plan selector (modal, not full page)
- **Scope**: In-flow friction reduction; surfaces shown *while* user is working

### 7.2 Data Sharing & Independence

| Surface | Data Source | State Owner | Payment Handler |
|---------|------------|------------|-----------------|
| CreditBanner | useCreditContext | CreditStateContext | UpgradeModal (modal) |
| CreditWarningCard | useCreditContext | CreditStateContext | UpgradeModal (modal) |
| CreditPackCard | CREDIT_TOPUP_PACKS (hardcoded) | Local React state | `onBuy` callback (unused) |
| CreditUpgradeCard | Hardcoded plan ($25/mo) | None (display-only) | `onUpgrade` callback (unused) |
| CreditPill / CreditPopover | useCreditContext | CreditStateContext | UpgradeModal or popup dialog |
| **UpgradeModal** | UPGRADE_PLANS (hardcoded, 4 tiers) | None (stateless) | `onSelectPlan` → hash navigate |
| **PricingPage** | PLAN_TIERS (hardcoded, 4 tiers) + CREDIT_TOPUP_PACKS | Local state (selectedPack, customCredits) | CheckoutModal or nothing |

### 7.3 CTA Responsibility Split (from billing-states-flow.md)

| Surface | Role | CTA Focus | Rationale |
|---------|------|-----------|-----------|
| **CreditBanner** (nudge) | Persistent quick-action above input | "Add more" | Low-friction, immediate relief on current plan |
| **CreditWarningCard** (card) | One-time inline message | "Compare plans" / "Upgrade plan" | Higher-commitment decision, consider switching plans |
| **CreditPill** (header) | Passive balance indicator | Reflects primary action per state | "Add more" (warning/low), "Upgrade" (depleted) |

### 7.4 Navigation Model

- **PLG surfaces → UpgradeModal** (in-context): Modal opens above current page, user picks plan, navigates to CheckoutPage via hash
- **PricingPage (billing-core) → CheckoutModal**: Overlay checkout, stays on `#pricing`
- **AccountPage (billing-core) → Account settings**: Dedicated page, no PLG surfaces
- **No direct page navigation from PLG surfaces**: All navigation is modal → hash → page. Preserves builder context.

---

## 8. File Index & Line References

### Component Files

| Component | File | Key lines |
|-----------|------|-----------|
| CreditWarningCard | `src/components/composite/CreditWarningCard/CreditWarningCard.tsx` | Props:66–75, config:38–57, depleted:87–139, warning/low:141–179 |
| CreditPackCard | `src/components/composite/CreditPackCard/CreditPackCard.tsx` | Props:19–22, pack data:6, render:24–106 |
| CreditUpgradeCard | `src/components/composite/CreditUpgradeCard/CreditUpgradeCard.tsx` | Props:9–13, hardcoded plan:47, render:18–78 |
| UpgradeModal | `src/components/composite/UpgradeModal/UpgradeModal.tsx` | Props:64–69, plan data:25–60, render:82–129 |
| CreditBanner | `src/components/composite/CreditBanner/CreditBanner.tsx` | Props:46–51, config:20–39, render:53–154 |
| CreditPill | `src/components/composite/CreditPill/CreditPill.tsx` | Props:8–11, render:13–42 |

### Context & Hooks

| Item | File | Key lines |
|------|------|-----------|
| CreditStateContext | `src/contexts/CreditStateContext.tsx` | Provider:14–26, hook:28–34 |
| useCreditState | `src/lib/useCreditState.ts` | Types:15–46, thresholds:50–53, deriveState:55–60, hook:90–177 |

### Pages & Views

| Page | File | Key lines |
|------|------|-----------|
| PricingPage | `src/pages/PricingPage/PricingPage.tsx` | Plan tiers, credit pack section, CheckoutModal trigger |
| ChatWindow | `src/components/composite/ChatWindow/ChatWindow.tsx` | Message types:94–123, render branches:1155–1183, slash command:953–1002, SLASH_CREDIT_PRESETS:39–44 |

### Data & Constants

| Data | File | Key lines |
|------|------|-----------|
| CREDIT_TOPUP_PACKS | `src/data/plans.ts` | (not read, referenced throughout) |
| UPGRADE_PLANS | `src/components/composite/UpgradeModal/UpgradeModal.tsx` | 25–60 |

### Documentation Files

| Doc | File | Purpose |
|-----|------|---------|
| Engineering Handoff | `docs/handoffs/billing-credit-packs.md` | Detailed component specs, props, tokens, motion, edge cases |
| PM Preview | `docs/previews/billing-credit-packs-preview.md` | Non-technical summary for PM/content/QA; UX research; metrics |
| PRD | `docs/prd-pm-pd/credit-popover-redesign.md` | CreditPopover design decisions, layout wireframes, copy recommendations |
| State Machine | `docs/diagrams/billing-states-flow.md` | Credit state transitions, UI surface map, CTA split, edge case analysis |
| Purchase Flows | `docs/diagrams/credit-purchase-flow.md` | All entry points, flow diagrams, open questions, component hierarchy |

---

## 9. Open Questions & Gaps (from docs)

### Critical (Needs Decision Before Production)

1. **Where does "Buy credits" button navigate?** (credit-purchase-flow.md#open-questions)
   - Option A: CheckoutModal with credit amount pre-filled
   - Option B: CheckoutPage (`#checkout?credits=65`)
   - Option C: Inline one-click buy with card on file
   - Status: **UNRESOLVED** — CreditPackCard and PricingPage "Buy" buttons have no handlers

2. **Should CheckoutModal and CheckoutPage unify?** (credit-purchase-flow.md#checkout-inconsistency)
   - Plan upgrades open CheckoutModal (modal overlay)
   - Credit warnings navigate to CheckoutPage (full page)
   - Status: **TWO DIFFERENT COMPONENTS** for same action

3. **Post-purchase card state** (billing-credit-packs-preview.md#risks-and-open-questions)
   - After buying credits inline in chat, what shows — confirmation, dismiss, or return to build prompt?
   - Status: **NOT DESIGNED**

4. **Stale card after renewal/add-more** (billing-states-flow.md#edge-cases, critical #2)
   - Depleted card persists in chat history after credits renew. Shows old state.
   - Status: **NEEDS FIX** — cards need state awareness to collapse or update

5. **"Upgrade to Pro" sidebar button has no handler** (credit-purchase-flow.md#open-questions)
   - No onClick. Should navigate to `#pricing`, open UpgradeModal, or skip to `#checkout?plan=solo`?
   - Status: **UNRESOLVED**

### Important (Affects UX)

6. **CreditPackCard not connected to credit context** (billing-credit-packs.md#edge-cases, #9)
   - Buying credits doesn't update useCreditContext. Depleted state persists.
   - Status: **OUT OF SCOPE FOR PROTOTYPE** — production must wire `onBuy` to update credits

7. **Button radius change affects all buttons globally** (billing-credit-packs.md#edge-cases, #10)
   - Pill → 8px change applied to every button in app
   - Status: **FULL REGRESSION PASS NEEDED** before deploying

8. **CREDIT_RATE duplication** (billing-credit-packs.md#implementation-notes)
   - Constant 1.30 ($/credit) hardcoded in PricingPage and CreditPackCard separately
   - Status: **SHOULD BE DEDUPLICATED** to single source

9. **Nested input in button (accessibility)** (billing-credit-packs.md#accessibility)
   - Custom credit row has `<input>` inside `<button>`, invalid HTML
   - Status: **NEEDS FIX BEFORE PRODUCTION** — restructure so input is sibling, not child

10. **Triple-surface interruption at depleted** (billing-states-flow.md#edge-cases, important #7)
    - Nudge + card + disabled input all appear simultaneously
    - Status: **SHOULD STAGGER** — show nudge first, inject card after ~30s

---

## 10. Prototype vs. Production Gaps

| Gap | Prototype Behavior | Production Needs |
|-----|-------------------|------------------|
| "Buy credits" button | No onClick handler (no-op) | Wire to payment API; update credit balance post-purchase |
| "/credits" slash command | Dev-only preset system | Remove or restrict to dev environment |
| Plan name hardcoded | "Pave Solo" everywhere | Query actual plan from user context |
| UPGRADE_PLANS static data | 4 hardcoded tiers | Fetch from billing API or backend |
| Mock renewal date | 1h 3m from now (fixed) | Real renewal date from backend; countdown updates every 60s |
| Mock burn rate | 0.92 credits/day (constant) | Calculate from usage history API |
| Mock credit sources | Plan allowance (20), Purchased (5) | Query actual sources from backend |
| CreditStateContext as React state | No persistence | Sync with backend credit API; update on purchase/renewal |
| Hash-based routing (`#checkout?plan=X`) | Browser hash navigation | Use router (Next.js, React Router, etc.) |
| Dismissal state | Local React state | Persist to backend (user preferences) |

---

## Conclusion

**Billing PLG** is a coordinated system of 6 components (warning card, pack card, upgrade card, banner, pill, popover) that inject friction-free upsell surfaces into the builder's flow. It uses a 4-state credit state machine (healthy/warning/low/depleted) with deterministic trigger logic. The system integrates with billing-core surfaces (PricingPage, CheckoutPage) but remains independent in data, state, and navigation.

**Key architectural decisions**:
1. PLG surfaces are injected as special `Message` types in ChatWindow (not as separate flows)
2. Credit state drives all surface visibility via `useCreditContext` (single source of truth)
3. CTA responsibility is split: nudge says "Add more" (immediate), card says "Upgrade" (considered)
4. UpgradeModal bridges PLG and billing-core (plan selection → hash navigate to CheckoutPage)
5. CreditPackCard and CreditUpgradeCard are currently unconnected (no payment flow; prototype-only)

**Critical unresolved items** for production: credit pack purchase target (where does "Buy" button go?), unifying CheckoutModal/CheckoutPage, stale card state after purchase, sidebar button target, and nested input accessibility issue.
