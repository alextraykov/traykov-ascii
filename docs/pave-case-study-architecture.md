# Pave Case Study Architecture

Source reviewed: `docs/YTqa4cD2.txt`

Current baseline reviewed:

- `case-studies/pages/designing-pave.mdx`
- `case-studies/pages/building-pave-environment.mdx`
- `case-studies/pages/02-builder.mdx`
- `case-studies/composites/chat-window.mdx`
- `case-studies/composites/inspector-canvas.mdx`
- `case-studies/pages/billing.mdx`
- `case-studies/composites/billing-plg.mdx`
- `case-studies/pages/01-home.mdx`
- `case-studies/pages/landing.mdx`
- `case-studies/pages/notifications.mdx`
- `case-studies/pages/email-templates.mdx`
- `case-studies/pages/projects.mdx`

## Baseline Read

The current flagship, `Designing Pave's MVP`, works as an umbrella case study. It frames the real product problem well: AI app creation needs to feel fast without becoming reckless. It also sets useful boundaries around what can be shown publicly and positions the work as design-intent prototype plus product strategy, not production architecture.

The main mismatch is scope. The flagship page is written as a first-six-month MVP story leading to the April 28, 2026 public launch, while the timeline source continues into a large post-launch product-system arc through June 26, 2026: direct edit, stage-aware suggestions, marketplace governance, guided previews, onboarding/forked app starts, ComponentSpecs, HandoffHub, and reliable detail deep links.

That later work is too important to hide as supporting proof inside the MVP page. It should become a small Pave collection, not one giant case study.

## Recommended Shape

Use two anchor stories plus focused Pave product deep dives.

Anchor stories:

- `Designing Pave`
- `Building Pave`

Product deep dives:

- `Pave - Building Loop`
- `Pave - Planning`
- `Pave - Direct Edit`
- `Pave - Credits`
- `Pave - Marketplace`

This keeps the naming plain. The page names say what the thing is, not the abstract portfolio lesson.

## Anchor 1: Designing Pave

Purpose: the executive narrative.

Keep this as the first read. It should answer:

- What was Pave?
- What was my role?
- What was the core product thesis?
- What launched?
- Why did the work matter?

Do not make this page carry every detail. It should be roughly a 10-minute overview with a clear evidence map at the end.

Best source phases:

- 1 to 3: early product grammar, app shell, roles, onboarding, governance
- 7 to 9: billing, rebrand, Plan Mode, workflow diagram/spec review, launch thesis
- Portfolio Narrative Draft: trust artifacts, staged changes, cost signals, audit trails

## Anchor 2: Building Pave

Purpose: the design-delivery/process case study.

This should stay separate from the product surface studies. It answers how the work became reviewable, handoff-ready, and safe to discuss with PM, engineering, content, and leadership.

Best source phases:

- 5: VibeDesign migration, GitHub Pages, branch previews
- 6: preview banner, feature delivery checklist, handoff docs, diagrams
- 13: ComponentSpecs, HandoffHub, reliable deep links

Current page:

- `case-studies/pages/building-pave-environment.mdx`

## Pave - Building Loop

Purpose: the core interaction case study.

This should focus on the actual builder workspace: chat, preview, build activity, app context, sidebar/header polish, and the repeated loop from prompt to generated surface.

Reader question:

> How did Pave keep chat, build activity, and preview connected instead of becoming just a chatbot?

Best source phases:

- 2: SubagentBubble and early AI activity affordances
- 6: builder polish across header, chat, sidebar, preview panel
- 9: chat-driven workflow builder and mobile-responsive builder cleanup

Current pages to draw from:

- `case-studies/pages/02-builder.mdx`
- `case-studies/composites/chat-window.mdx`

## Pave - Planning

Purpose: the AI trust-artifact case study.

This should own the planning layer: Plan Mode, ClarifyCard, WorkflowSpec, workflow diagram preview, revise-through-chat, connection setup, and the idea that users should review the intended app before generation runs too far.

Reader question:

> How did users review and revise what Pave was about to build before committing to generation?

Best source phases:

- 7: Plan Mode, ClarifyCard, CreditUpgradeCard in chat
- 9: workflow diagram preview, revise flow, connection setup
- Portfolio Narrative Draft: plans, diagrams, specs, previews, audit trails

Current pages to draw from:

- `case-studies/pages/02-builder.mdx`
- `case-studies/composites/chat-window.mdx`

## Pave - Direct Edit

Purpose: the strongest craft/depth case study.

This should own InspectorCanvas, direct edit, component-aware controls, staged save/discard, spacing editor, Design/Prompt toggle, multi-select, suggestions, audit pills, and motion handoff.

Reader question:

> Once AI creates something, how can a user inspect and change it without losing confidence?

Best source phases:

- 8: productionizing inspector model, token compliance, multi-select, consolidated visual-editor specs
- 10: per-component property controls, staged suggestions, audit pills, animated Pave icon handoff

Current page:

- `case-studies/composites/inspector-canvas.mdx`

## Pave - Credits

Purpose: the product-strategy monetization case study.

This should include credit state machine, warning/low/depleted surfaces, pricing, checkout, credit packs, account billing, and inline chat recovery.

Reader question:

> How did Pave turn cost and limits into understandable product state instead of surprise friction?

Best source phase:

- 7: credit warning cards, pricing, checkout, credit popover, credit packs, CreditUpgradeCard

Current pages to draw from:

- `case-studies/pages/billing.mdx`
- `case-studies/composites/billing-plg.mdx`

## Pave - Marketplace

Purpose: the post-launch ecosystem case study.

This replaces the unclear `Starting Points` label. It should cover marketplace, guided preview kit, realm review, policy-gated publishing, admin queue, use-case home gallery, one-click start, forked-app canvas, template detail, ComponentSpecs, HandoffHub, and deep links.

Reader question:

> How did Pave handle reusable apps, preview, and publishing without turning them into a generic template shelf?

Best source phases:

- 11: marketplace guided preview kit, policy-gated publishing, admin queue
- 12: onboarding funnel, use-case home gallery, forked app canvas
- 13: marketplace polish, template-card blueprint, ComponentSpecs, HandoffHub, deep links

Current gap:

- This appears underrepresented in the live case-study baseline. It needs a new primary page or a major expansion of the existing Home/Projects support pages.

Suggested file:

- `case-studies/pages/pave-marketplace.mdx`

## Supporting Studies

These can remain secondary pages linked from the hub or from relevant primary studies:

- `Home` and `Landing`: onboarding/acquisition support.
- `Notifications` and `Email templates`: evidence that the product system handled real operational configuration.
- `Projects`: use only if it supports marketplace/governance; otherwise keep it as archive/supporting material.

## Navigation Recommendation

On the case-study index, avoid showing every Pave page as equal. That makes the work feel sprawling.

Recommended public structure:

1. Featured card: `Designing Pave`
2. Inside the Pave page, add a "Pave collection" section:
   - `Pave - Building Loop`
   - `Pave - Planning`
   - `Pave - Direct Edit`
   - `Pave - Credits`
   - `Pave - Marketplace`
3. Add `Building Pave` as a separate "how the work shipped" companion.
4. Keep old/smaller pages reachable from "Related evidence" links, not primary navigation.

## What To Cut From The Flagship

The flagship should not list every surface. Move details out when they are really about:

- Inspector controls, spacing editor, and staged direct edit
- Full billing/credit state machine mechanics
- Marketplace publishing governance
- Branch preview implementation and CI mechanics
- Notification/template rule-authoring specifics

The flagship should keep one or two sentences per area, then link to the deep dive.

## Recommended Edit Order

1. Tighten `Designing Pave` into a hub: add collection cards and explicitly state that later Pave work continues beyond MVP.
2. Rename/reframe `Builder` plus `ChatWindow` into `Pave - Building Loop`.
3. Split planning artifacts out as `Pave - Planning` if the Builder story gets too dense.
4. Keep `InspectorCanvas` as `Pave - Direct Edit`.
5. Combine billing page and billing PLG page at the navigation level as `Pave - Credits`, even if they remain separate files.
6. Add the missing marketplace case study for phases 11 to 13.
7. Keep `Building Pave` as the companion process case study.

## Principle

The breakup should not be chronological. Chronology proves the amount of work, but portfolio readers need recognizable product areas:

- Pave overview
- Building loop
- Planning
- Direct edit
- Credits
- Marketplace
- Design delivery system

That covers the volume without making the reader feel like they are walking through every commit.
