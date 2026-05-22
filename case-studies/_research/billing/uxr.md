# UX Research: Billing Core
> Case study research — April 2026

---

## 1. Why Credits, Not Seats

The credit model is a direct product thesis statement: value is generated per AI action, not per user present in a workspace. Seats price access; credits price output. For an AI builder where one engaged user might generate more compute than five passive ones, seat pricing systematically misaligns cost with value.

The trial experiment doc makes this legible at the earliest stage: it sets a per-day spend cap at $10 and targets "two hours of building time" as the trial unit (`docs/prd-pm-pd/blinq-trail-experiment.md:Limits`). The design signal is that the product team evaluated early access in units of build time, not user count. Credits translate that internal framing directly into the pricing surface.

The billing states flow adds a second rationale: credits create a predictable cost surface for the user. "Pre-flight estimates: credit cost shown before every build action. No surprises." (`docs/handoffs/billing.md:PricingPage data structures — CREDIT_INFO_CARDS`). Seat pricing cannot provide this — a seat does not carry an action-level cost estimate. Credits do, and the system was explicitly designed to surface them pre-action before any charge occurs.

The credit popover PRD surfaces the anxiety risk of this model: an opaque balance counter generates "low-grade anxiety that Cursor identified as a churn driver" (`docs/prd-pm-pd/credit-popover-redesign.md:Problem Statement`). The credits model is only defensible if the product makes consumption legible — hence the four-state warning system, renewal countdown, and per-action pre-flight estimate all functioning as anxiety-reduction infrastructure around the core pricing mechanic.

---

## 2. Pricing Tiers and What Each Signals

The tier ladder is Free / Solo ($25/mo, $21 yearly) / Team ($79/mo, $71 yearly) / Enterprise (`docs/handoffs/billing.md:PricingPage data structures — PLAN_TIERS`). The tier descriptions position each segment precisely: Free "for exploring what Blinq can do," Solo "for individuals building and shipping real apps," Team "for ops teams building and rolling out internal tools," Enterprise "for IT-standardized, org-wide platform adoption" (`docs/previews/billing.md:Copy Inventory — Pricing Page`).

The $20 price point that appears in the recent commit history and account billing mock data (`docs/previews/billing.md:Account Page — Billing Tab — Plan card / Features`) is the included monthly credit allowance on the Core plan, not a standalone tier. It functions as the baseline AI spend bundled into subscription price, communicating that the plan is AI-native, not AI-optional.

The credit pack tier structure reveals the conversion strategy. Three preset packs (Starter $20 / Standard $50 / Power $100, with an Ultra and Max at higher amounts per the credit packs redesign) use middle-tier anchoring: Standard is pre-selected with a "Best value" badge (`docs/previews/billing-credit-packs-preview.md:Why — Anchoring is intentional on Standard`). A competitive audit of 12 platforms found this identical pattern at Anthropic, OpenAI, and Figma. The strategy is explicit: "Anchoring is intentional on Standard — a deliberate conversion lever, not a neutral default."

---

## 3. The Purchase Moment — When Users Buy

The billing state machine defines the purchase trigger with precision. Credits progress through Healthy (100–21%) → Warning (20%) → Low (5%) → Depleted (0%) (`docs/diagrams/billing-states-flow.md:Credit State Machine`). The 80% consumption threshold is the designed "upgrade moment": "The 80% alert is your upgrade moment. Never a silent drain." (`docs/previews/billing.md:Copy Inventory — Pricing Page — Info card 3`).

Two distinct user states arrive at checkout. The first is proactive: a Warning-state user who responds to the "Compare plans" CTA in the inline chat card or the "Add more" nudge above the input. They have runway and are making a forward-looking decision. The second is reactive: a Depleted user whose input is disabled and who faces the CreditPackCard inline in chat or the depleted CreditWarningCard with the "Upgrade plan" CTA (`docs/diagrams/billing-states-flow.md:UI Surface Map`). These two states require different checkout contexts — proactive users are browsing, reactive users need immediate relief.

The CTA responsibility split formalizes this: the nudge (CreditBanner) owns "Add more" for instant, low-friction credit replenishment; the inline card owns "Upgrade" for the considered plan decision (`docs/diagrams/billing-states-flow.md:CTA Responsibility Split`). The nudge is dismissible at Warning and Low but not at Depleted — the non-dismissible escalation is the product's signal that blocking has occurred and a decision is required.

---

## 4. Checkout Page vs. Modal

The docs describe a three-surface purchase architecture. The inline CreditPackCard appears in chat at depletion and handles top-up without navigation away from the build session — this is explicitly motivated by abandonment reduction: "Pulling a depleted user to the Plans & Usage page to buy credits breaks their build session" (`docs/previews/billing-credit-packs-preview.md:Why — Chat-native purchase reduces abandonment`). The CreditUpgradeCard ("depleted2") handles plan upsell inline in the same context but for users where a plan change is the better path.

The upgrade modal (accessed from the depleted card CTA) presents the four-tier plan selector without navigating away from the builder. It is the mid-commitment surface: more information than the inline card, less friction than the full checkout page (`docs/previews/billing.md:What to Look At — Upgrade modal`).

The CheckoutPage is the full two-column layout: plan selector left, payment form right, with URL params (`#checkout?plan=team&period=monthly`) enabling direct deep-links from the Pricing page's "Get started" CTAs (`docs/handoffs/billing.md:CheckoutPage behavior — URL params`). This page is for users who arrived from the Pricing page via deliberate plan comparison — discovery-mode buyers. The checkout state initializes from URL hash, meaning the Pricing page controls which plan pre-populates, removing a selection step for users who chose on the pricing page.

---

## 5. Failure Modes the Docs Flag

The edge case analysis in the billing states flow is the most explicit articulation of anti-patterns (`docs/diagrams/billing-states-flow.md:Edge Case Analysis`). Three categories are worth naming:

**Fake urgency.** The depleted card previously showed "Limited time offer · {renewalCountdown}" — using the renewal countdown as an offer expiry timer. The docs flag this directly: "timer is the renewal countdown, not an offer expiry. Feels deceptive." The recommendation is to decouple the offer from the countdown or remove the timer entirely (`docs/diagrams/billing-states-flow.md:Edge Case 9`).

**Surprise charges and hidden information.** The credit source breakdown was hover-only in the original popover. The redesign PRD promotes it to always-visible at Warning and Low states specifically because "users are actively investigating where their credits went" and hiding that data behind a hover adds friction at the worst moment (`docs/prd-pm-pd/credit-popover-redesign.md:Design Decisions Log`). The info cards on the pricing page ("Pre-flight estimates — no surprises") are the product-level commitment against surprise charges.

**Cancellation and renewal opacity.** The stale card problem — a depleted card persisting in chat history after renewal — is flagged as Critical: "shows '0 credits / Upgrade' next to healthy balance" (`docs/diagrams/billing-states-flow.md:Edge Case 2`). Related: no renewal countdown in the Warning/Low nudge means users don't know if waiting is viable. The popover redesign adds renewal anchor to all states specifically to eliminate the forced-upgrade pressure that comes from renewal opacity (`docs/prd-pm-pd/credit-popover-redesign.md:Section A — Renewal Countdown`).

---

## 6. Open Pricing Questions

Several pricing unknowns remain unresolved in the docs:

**Ramp and trial credit strategy.** The trial experiment targets PMF measurement with a generous initial allowance ("be generous initially, then fine-tune in later experiments") and an explicit note that "tokens should be abstracted away from the user experience" (`docs/prd-pm-pd/blinq-trail-experiment.md:Limits`). No ramp curve is defined — how credit allowance tightens post-trial has not been documented.

**Credit pack surface convergence.** The Plans page shows four named packs (Starter/Standard/Power/Custom); the Account billing "Buy credits" dialog shows three unnamed dollar packs ($10/$25/$50). These two surfaces are explicitly out of sync and flagged as an open gap before release (`docs/previews/billing-credit-packs-preview.md:Risks and Open Questions`).

**Enterprise conversion path.** Enterprise is selectable in the checkout prototype like any other plan (`docs/handoffs/billing.md:CheckoutPage behavior — Plan selection`), but "Custom pricing" and "Negotiated commit" (`docs/previews/billing.md:Copy Inventory — Pricing Page — Enterprise`) imply a sales-assisted close. The handoff does not define what happens when Enterprise checkout submits.

**Downgrade math and mid-cycle proration.** Team to Solo mid-cycle with credits remaining above the new plan's total produces a percentage-remaining above 100%. The edge case is flagged but the policy — carry, prorate, or forfeit — is undecided (`docs/diagrams/billing-states-flow.md:Edge Case 13`).

**Refunds.** No refund policy appears anywhere in the reviewed docs. The invoices surface ("managed on the Blinq dashboard") defers to an external system without describing what dispute or refund paths exist.
