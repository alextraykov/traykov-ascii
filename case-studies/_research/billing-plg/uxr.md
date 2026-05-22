# UX Research: Billing PLG — Depletion to Upgrade Conversion

> **Scope:** The research and design rationale behind the depletion-to-upgrade conversion moment.
> **Sources:** Seven primary documents cited inline.
> **Date:** 2026-04-22

---

## 1. The User Moment: Depletion as a Failure State

Credits reaching zero is not a neutral system event. For a developer or designer who is mid-build, it is an abrupt interruption of a productive task. The design premise across all source documents is that the conversion surface must feel like a resolution to that interruption, not an escalation of it.

`docs/prd-pm-pd/credit-popover-redesign.md:Problem Statement` names this directly: the existing credit UI "generates the kind of low-grade anxiety that Cursor identified as a churn driver." The comparison to Cursor is significant — it is cited as a reference for how opaque metering erodes trust and increases support burden even before depletion occurs.

`docs/diagrams/billing-states-flow.md:edge-cases` reinforces this framing: Edge Case 9 flags that showing a "Limited time offer" countdown tied to the renewal timer "feels deceptive," and recommends decoupling the offer from the timer entirely. The implication is clear — users who feel manipulated at a moment of vulnerability are less likely to convert and more likely to churn.

The copy stance at depletion reflects this philosophy. The depleted state message is specified as "Building is paused. Apps keep running." (`docs/prd-pm-pd/credit-popover-redesign.md:§6 Copy Recommendations`). This is not apologetic and not sales-oriented. It answers the user's first question — are my published apps safe? — before asking for anything. The design bet is that anxiety reduction precedes conversion willingness.

---

## 2. Credit Packs as a Research Finding: Why One-Time Alongside Recurring

The credit pack model — one-time purchases layered on top of monthly plan tiers — is the direct result of recognizing that different users face different kinds of depletion.

`docs/diagrams/billing-states-flow.md:cta-split` articulates the behavioral distinction: "Add more" means "I need credits now" (instant, low-friction, stays on current plan), while "Upgrade" means "I need a bigger plan" (considered, opens modal, reviews features). These are genuinely different user decisions and the design treats them as such, routing them to separate surfaces rather than collapsing them into a single CTA.

The trial experiment data from `docs/prd-pm-pd/blinq-trail-experiment.md` provides a relevant behavioral signal, though it predates the credit pack design. The experiment established a spending cap of "$10 on day 1" with credits explicitly described as something that "should be abstracted away from the user experience." The stated goal was to "allow approximately two hours of building time." This suggests the research team understood early that credit limits needed to match the shape of a user's productive session — not a calendar month. A user who exhausts their monthly allowance in a two-hour session is not a bad actor; they are a high-engagement user who needs a fast replenishment path, not a plan upgrade lecture.

`docs/prd-pm-pd/end-user-usage.md` is a QuickBase end-user access specification rather than a billing behavior study, but it signals the same multi-tier access logic: the platform thinks in terms of access levels and portal contexts, not a single binary of in or out.

---

## 3. Warning Before Depletion: Agency Before the Block

The credit state machine defines four states: Healthy (100–21%), Warning (20%), Low (5%), and Depleted (0%) (`docs/diagrams/billing-states-flow.md:credit-state-machine`). The Warning and Low thresholds exist precisely to give users information before they are blocked.

`docs/prd-pm-pd/credit-popover-redesign.md:§3 Section A` makes the agency rationale explicit for the renewal countdown: a Warning user seeing "Renews in 3d" may decide to wait rather than purchase. A Low user seeing "Renews in 1d" will almost certainly wait. The design labels this "decision-relevant" information — showing the renewal anchor at all states, not just at depletion, was described as "the single highest-value change in the redesign."

Edge Case 19 in `docs/diagrams/billing-states-flow.md:edge-cases` validates that this was not being done before: "`renewalCountdown` unused in warning/low — prop passed but only rendered in depleted card. Warning/low users don't see when credits reset." The fix is explicit: show "Credits renew in Xd" in warning and low cards.

The progressive CTA split reinforces the agency model. In the Warning state, the card's CTA is "Compare plans." In the Low state, the popover shows a split CTA: primary "Upgrade plan" (solid) and secondary "Add more" (ghost). The rationale documented in `docs/prd-pm-pd/credit-popover-redesign.md:§7 Design Decisions Log` is: "at ≤5% with renewal in ~1 day, waiting is a valid option." The split CTA is not indecision in the design; it accurately reflects a genuine decision fork in user behavior.

---

## 4. In-Flow vs. Pricing Page: Interruption Cost Analysis

`docs/previews/billing-credit-packs-preview.md:Why` states the core finding plainly: "Chat-native purchase reduces abandonment. Pulling a depleted user to the Plans and Usage page to buy credits breaks their build session."

This is supported by the competitive audit. The preview brief reports that an audit of twelve platforms — OpenAI, Anthropic, Twilio, Airtable, SendGrid, AWS, Figma, Linear, Stripe, Replicate, Midjourney, and Vercel — found zero that use a pricing-page redirect for in-session credit replenishment. The inline purchase surface was the universal pattern.

`docs/diagrams/credit-purchase-flow.md:open-questions` maps the interruption cost concretely: Question 4 asks "Should CreditPackCard in chat open a modal or navigate away?" and frames the stakes as: "If a user is mid-build and depleted, navigating to a checkout page breaks flow. But a modal checkout inside the builder is a new pattern." The design chose to surface the full purchase UI inline in chat (the `CreditPackCard` component) rather than redirect, specifically to avoid navigation context-switching. This decision is unresolved at the checkout wiring level but the UX direction is explicit.

The `CreditBanner` nudge above the chat input follows the same logic. It is the least interruptive surface — a single dismissible bar — positioned to allow users to acknowledge the warning and keep typing. `docs/diagrams/billing-states-flow.md:cta-split` assigns the "Add more" action to the nudge specifically because it is "low-friction" and "immediate relief."

---

## 5. Popover vs. Full Modal: Iteration from Tooltip to Inline Card

`docs/prd-pm-pd/credit-popover-redesign.md:Problem Statement` describes the starting point: a "minimal tooltip-style panel" with a plan name, a balance counter, a usage bar, and a single CTA. It answered "how much do I have left?" but not the questions users actually asked when they opened it: how fast am I burning, when do they reset, can I get more without changing my plan, why is the number going down?

The redesign is an escalation in information density, not in surface size. The popover expands to 280px from 240px, adds a renewal countdown in all states (not just depleted), a usage rate signal ("~20 days at current pace"), a credit source breakdown (plan vs. purchased vs. promotional), and a recent activity snippet. Critically, it does not become a modal or a drawer. The document is explicit: "a wider panel starts to feel like a drawer, which is the wrong register for a quick-glance surface" (`docs/prd-pm-pd/credit-popover-redesign.md:§2 Width and Sizing`).

The full escalation path uses progressive surface escalation rather than a single modal. The popover handles ambient awareness and quick top-up. The inline `CreditWarningCard` in chat handles the considered upgrade decision. The `CreditPackCard` (also inline in chat) handles the one-time purchase. The `UpgradeModal` handles plan comparison. Each surface is calibrated to a different level of user intent and commitment. `docs/diagrams/billing-states-flow.md:ui-surface-map` diagrams this split: the popover's depleted CTA focus is Upgrade; the nudge's focus is Add More; the warning card's focus is Compare Plans.

---

## 6. Copy Stance: Transparent and Calm, Never Apologetic or Playful

The content philosophy is consistent across all surfaces: billing copy should be accurate, not alarming, and should never use urgency that the design cannot justify.

`docs/prd-pm-pd/credit-popover-redesign.md:§6 Copy Recommendations` cites the billing context as "never playful" and references `docs/content-guidelines/style-rules.md` for sentence case and framing rules. The depleted state copy "Building is paused. Apps keep running." was chosen over an error message because "credits at 0 is a system state, not a user mistake" — the balance value uses a muted tone rather than error red.

`docs/handoffs/billing-credit-packs.md:CreditUpgradeCard Component` shows the same stance in the upgrade card copy: title "You're out of credits," subtitle "Upgrade to keep building. Your apps continue to run." The phrase "Your apps continue to run" appears in two separate documents as a deliberate reassurance anchor before any conversion ask. It is the product making a promise before making a request.

Edge Case 9 in `docs/diagrams/billing-states-flow.md:edge-cases` flags a copy failure that violates this stance: the depleted card's "Limited time offer · {renewalCountdown}" creates fake urgency by using the renewal timer as an offer expiry. The recommendation is to either make the offer real with its own expiry or remove the timer — transparency over pressure.

---

## 7. Experiment Data: What the Trail Experiment Signals

No dedicated A/B test on the depletion-to-upgrade conversion moment exists in the available documents. `docs/prd-pm-pd/blinq-trail-experiment.md` is a routing experiment — it funnels users from a specific marketing landing page into the Vibe UI 100% of the time for consistent measurement. It is not a test of billing conversion variants.

However, the experiment's credit limit parameters are behaviorally significant. The spec requires "approximately two hours of building time" with a day-1 cap of $10 and "reasonable token allowance per day to get trial users to a meaningful outcome." The instruction to abstract tokens away from the user experience signals an early hypothesis: credit anxiety during the critical first-build moment degrades the experience of the product itself, not just the billing funnel. This supports the broader design posture that credit surfaces should reduce anxiety rather than manufacture it.

`docs/previews/billing-credit-packs-preview.md:Metrics to Watch` establishes the forward measurement framework: credit purchase conversion rate, average order value, custom pack selection rate (no prior baseline), and "chat-to-purchase conversion" — a new metric that was not measurable before the inline `CreditPackCard` existed. The prior flow had no in-chat purchase path, so there was no conversion event to instrument.

---

## 8. Open Questions the Docs Flag as Unresolved

The documents are candid about what remains undefined. The most significant gaps:

**Renewal countdown discoverability.** The popover redesign makes the renewal anchor visible in all states (`docs/prd-pm-pd/credit-popover-redesign.md:§3 Section A`), but Edge Case 8 in `docs/diagrams/billing-states-flow.md:edge-cases` notes the depleted nudge never mentions renewal countdown, meaning a user who dismisses all cards still has no passive signal that waiting is an option.

**Auto-renewal UX.** `docs/prd-pm-pd/credit-popover-redesign.md:§8 Future Opportunities` lists the "auto add-more toggle" (modeled on Replicate's pattern, which has 90% adoption) as explicitly out of scope pending "a confirmed product policy on auto-charges." No policy exists yet.

**Checkout path for credit purchases.** `docs/diagrams/credit-purchase-flow.md:open-questions` identifies five unresolved decisions: which checkout component handles credit purchases (modal vs. full page vs. inline one-click), whether `CheckoutModal` and `CheckoutPage` should be unified, where the sidebar "Upgrade to Pro" button navigates, whether `CreditPackCard` in chat should open a modal or navigate away, and whether credit pack purchases should use the same checkout form as plan upgrades.

**Refund policy and failed payment state.** Edge Case 3 in `docs/diagrams/billing-states-flow.md:edge-cases` flags that production has no payment failure state — a failed purchase leaves the user at depleted with no feedback. No refund policy is documented anywhere in the source set.

**Post-purchase card state.** `docs/previews/billing-credit-packs-preview.md:Risks and Open Questions` and `docs/handoffs/billing-credit-packs.md:Edge Cases` both flag that the `CreditPackCard` in chat has no defined state after a purchase completes. The card persists with stale "0 credits / Upgrade" content even after credits are replenished (Edge Case 4 in the handoff). Whether the resolved state shows a confirmation, dismisses automatically, or collapses is undesigned.
