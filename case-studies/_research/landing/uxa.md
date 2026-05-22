# Landing / Marketing Page — UX Architecture

**Source**: `docs/diagrams/marketing-page-flow.md`, `docs/diagrams/homepage-gradient-system.md`,
`src/pages/LoginPage/LoginPage.tsx`, `src/pages/HomePage/HomePage.tsx`,
`src/pages/LoginPage/LoginPage.css`, `src/components/ui/BackgroundGradientAnimation/BackgroundGradientAnimation.tsx`,
`src/components/ui/BlurText/BlurText.tsx`

---

## 1. Page Structure

The flow doc (`docs/diagrams/marketing-page-flow.md`) specifies seven sections in scroll order. All seven are architecturally present in the codebase, with one partial exception noted in section 7.

| # | Section | CSS class / element |
|---|---------|---------------------|
| 1 | **Hero** — gradient canvas, BlurText heading, ChatInput, template pills | `marketing-page__hero` |
| 2 | **Trusted By** — "Powered by the Quickbase Platform — 12,000+ teams" logo row | `marketing-page__trusted` |
| 3 | **How It Works** — three showcase steps, each a full `<section>` with a `BrowserFrame`-wrapped mockup | `marketing-page__section--showcase` (×3) |
| 4 | **Bento Feature Grid** — 6 animated cards on a dark-background section | `marketing-page__section--dark` / `marketing-page__bento-grid` |
| 5 | **Proven in the Real World** — `ProvenIllustration` SVG + copy | `marketing-page__section--proven` |
| 6 | **Bottom CTA** — `GradientCanvas` + "Start building" button | `marketing-page__section--cta` (CSS exists; JSX absent — see §7) |
| 7 | **Footer** — brand column, 4 nav columns, legal bar, social icons | `marketing-page__footer` |

The topbar is a fixed nav (`marketing-page__topbar`) that gains a blur backdrop on scroll via `scrollY > 40` state (`LoginPage.tsx:256–262`). It carries a "Sign in" link that directly opens `LoginModal` — a fifth conversion surface alongside the hero send, both mockup CTAs, and the bottom CTA.

---

## 2. Visual Continuity with the Authenticated Home

The marketing page (`LoginPage`) and the authenticated app (`HomePage`) share the same gradient engine, `BackgroundGradientAnimation`, without modification. Both pass `showOrbs`, `parallaxOffset`, `isInputFocused`, and `inputText` from identical local state shapes (`LoginPage.tsx:353–358`, `HomePage.tsx:125–131`). The cascade reveal sequence — BlurText heading → subheading → ChatInput wrapper → pills, each gated on the previous `onAnimationComplete` — is reproduced verbatim in both files using the same `CASCADE_INITIAL / CASCADE_ANIMATE / CASCADE_TRANSITION` constants.

This matters for trust. A user who types a prompt in the hero, completes sign-up, and lands in the Builder sees the same gradient orb system, the same frosted-glass input, and the same blur-reveal heading animation they just watched. There is no visual discontinuity between pre-auth and post-auth states. The effect is psychological: the product you see in the marketing page *is* the product. Nothing gets swapped out or rebranded at the auth boundary.

The `homepage-gradient-system.md` diagram makes the layer stack explicit — grain overlay, vignette, content, frost, orb wrapper, page background. That stack is unchanged across the boundary. The sidebar offset logic (`translate: 36px 0` collapsed, `128px 0` expanded) is the only structural difference: the marketing hero has no sidebar, so the orb wrapper sits at the collapsed offset permanently.

---

## 3. IA Tiers

The flow doc establishes four conversion tiers with distinct cognitive jobs:

**Tier 1 — Prompt (Hero)**: Capture intent. The user's first action is typing a build request, not consuming content. The heading ("Move fast, build right") and subheading are secondary to the ChatInput. Template pills lower activation energy by pre-filling the input. Every send from this tier opens `LoginModal` with `stashedPrompt` set.

**Tier 2 — Demo (How It Works)**: Demonstrate the full product loop through three interactive mockups — `HomeMockup` (describe), `BuilderMockup` (build), `PreviewMockup` (deploy). The first two mockups are interactive easter eggs: typing and sending in either one triggers a CTA overlay that routes to `LoginModal` (`LoginPage.tsx:501`, `LoginPage.tsx:531`). The third is purely decorative — it shows the output state, not the process.

**Tier 3 — Proof (Bento + Proven)**: De-risk the purchase decision. The 6-card bento grid addresses infrastructure anxiety (databases, auth, hosting, email, security, branding). The Proven section anchors the Quickbase heritage credibility claim. Neither section has direct CTA affordances — they are content, not conversion.

**Tier 4 — Conversion (Bottom CTA + Topbar)**: Re-catch users who scrolled through without converting. The bottom CTA section (`marketing-page__section--cta`) is specified with `GradientCanvas` and a "Start building" button. The topbar "Get started" / "Sign in" button persists across all four tiers on scroll.

The hierarchy the flow doc describes is: intent capture first, product proof second, risk removal third, conversion catch-all fourth.

---

## 4. Token Reuse

There is no separate marketing design system. `LoginPage.css` consumes the same token set as every other page: `--color-bg-page`, `--color-text-primary`, `--color-text-secondary`, `--color-border-default`, `--color-accent-primary`, `--spacing-*`, `--radius-*`, `--motion-duration-*`, `--motion-ease-*`. The pill components in both pages share identical CSS structure with only a BEM namespace difference (`marketing-page__pill` vs `home-page__pill`).

Two exceptions worth noting: `LoginPage.css` uses one hardcoded hex value for the dark-mode footer background (`#1c1c1a` at line 901) and the bento card accent is hardcoded to `#05875A` in the `BENTO_CARDS` data array (`LoginPage.tsx:67`, repeated ×6). Both should be replaced with `--color-accent-primary` and `--color-bg-surface` respectively to maintain strict token compliance as required by CLAUDE.md.

---

## 5. Responsive Behavior

The flow doc (`docs/diagrams/marketing-page-flow.md`, "Responsive Behavior — Showcase Mockups") defines three breakpoint tiers:

- **Desktop (>1024px)**: 2-column grid, text left / mockup right (reversed on Step 2). All sidebars visible. Full 16:10 mockup.
- **Tablet (768–1024px)**: Single column, text above / mockup below. HomeMockup sidebar hidden, BuilderMockup at 40px, PreviewMockup at 48px icon strip. Step 2 reverse layout reset.
- **Mobile (<768px)**: Single column. All sidebars hidden. Mockup capped at `max-height: 360px` with an 80px bottom fade gradient. HomeMockup pills hidden. PreviewMockup SKU column hidden, stat cards collapse to 2-column.

`HomePage.css` implements mobile-first responsive breakpoints at `479px` (pills stack vertically, heading 1.5rem), `639px` (heading 1.75rem, tighter padding), and `640px–1023px` (max-width 580px, heading 2.25rem). The marketing page CSS follows the same breakpoint vocabulary. The `<479px` edge case documented in the flow doc — pills stack vertically — matches `HomePage.css:223–243` exactly.

`BackgroundGradientAnimation` notes in `homepage-gradient-system.md` that orb positioning uses `vw` units tuned for ~1440px viewports and may drift at extremes (<768px, >2560px). This is flagged as an engineer-assessed item, not a prototype blocker.

---

## 6. Pre-auth vs. Post-auth Boundary

The `stashedPrompt` string is the sole data artifact that crosses the auth boundary. The flow is: hero `ChatInput` send → `handleSend` sets `stashedPrompt(inputValue.trim())` and `setShowLoginModal(true)` (`LoginPage.tsx:269–274`) → `LoginModal` receives `stashedPrompt` as a prop and displays it as context (`LoginModal.tsx:23`) → after successful authentication, redirect to `/builder` with the stashed prompt pre-filling the Builder's chat input.

Surfaces on the pre-auth side: hero ChatInput, template pills, HomeMockup interactive input, BuilderMockup interactive input, topbar "Sign in" / "Get started", bottom CTA "Start building". All route through `LoginModal`.

Surfaces on the post-auth side: Builder ChatInput (receives stashed prompt), authenticated HomePage (identical gradient + input, no modal gating). The `CollapsibleSidebar` appears post-auth; it is absent from the marketing page entirely, which is why the orb wrapper sidebar offset is fixed rather than reactive.

The modal close path (`LoginPage.tsx:728`) preserves `stashedPrompt` in component state — it is not cleared on close — so a user who dismisses the modal can re-open it from any CTA and their prompt remains. The flow doc confirms: "Modal close without login → Stashed prompt preserved in component state."

---

## 7. Gaps vs. Built Code

**Gap 1 — Bottom CTA section is not rendered.**
`LoginPage.css` defines `.marketing-page__section--cta` (line 772) and the dark-mode override (line 784). The comment at line 888 says "CTA gradient now handled by GradientCanvas component." However, no `<section className="marketing-page__section--cta">` block appears anywhere in `LoginPage.tsx`. `GradientCanvas` is imported in its own component file but never imported or used in `LoginPage.tsx`. The "Start building" button, the gradient canvas backdrop, and Journey 4 ("Scroll to bottom → Click 'Start building'") from the flow doc are entirely missing from the rendered page.

**Gap 2 — Trusted By logos are placeholders.**
Six `<div className="marketing-page__logo-placeholder">` elements sit where partner/customer logos should appear (`LoginPage.tsx:447–454`). The flow doc specifies "Logo banner" content. No real logos are connected.

**Gap 3 — Gradient toggle pill position.**
The flow doc specifies the gradient mode toggle as a "bottom-right pill." The current implementation renders it inside the hero section markup (`LoginPage.tsx:320–335`) without an explicit bottom-right positioning class. The CSS behavior may match, but the component hierarchy places it inside the hero flow rather than as a fixed/absolute overlay as diagrammed.

**Gap 4 — HomeMockup CTA overlay animation.**
The flow doc specifies that typing and sending in the HomeMockup input produces an `AnimatePresence` CTA overlay: "Great idea! sign up free →" (`docs/diagrams/marketing-page-flow.md`, Step 1 Easter Eggs). `HomeMockup` receives an `onCtaClick` prop (`LoginPage.tsx:501`) but whether the AnimatePresence overlay is internally implemented requires a separate audit of `src/components/ui/ProductMockup/HomeMockup.tsx`.

**Gap 5 — Topbar scroll threshold discrepancy.**
The flow doc specifies `scrollY > 20` as the topbar blur trigger. `LoginPage.tsx:259` uses `scrollY > 40`. Minor, but the spec and implementation differ.

**Gap 6 — No testimonials section.**
The flow doc lists "Proven in the Real World" but the IA tier labeling in the spec also mentions "testimonials?" as a possible sub-component. No testimonial or quote content exists in the current implementation — only the `ProvenIllustration` SVG and a copy block.
