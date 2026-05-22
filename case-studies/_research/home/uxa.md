# Home Page — UX Architecture Analysis

**Surface**: `src/pages/HomePage/`
**Route**: `#home` (hash routing via `src/App.tsx:31–52`)
**Token source**: `src/tokens/tokens.css`
**Stack**: React 19, pure CSS, BEM, Framer Motion

---

## 1. Information Architecture

The page carries exactly four content layers, arranged in strict descending priority:

| Tier | Element | Role |
|------|---------|------|
| Primary | `<h1>` — "From idea to done with pave." | Brand promise; first visual anchor |
| Secondary | `<p>` subheading | Value proposition disambiguation |
| Primary CTA | `ChatInput` composite | Task initiation; the single conversion action |
| Tertiary | Template pills + label | Guided discovery; reduces blank-canvas anxiety |

The hierarchy is enforced visually through cascade animation sequencing: heading resolves first, then subheading unlocks, then the input, then pills (`HomePage.tsx:54–58`). No element competes for attention while another is still entering. The result is a single directed reading path with zero branching decisions at the primary tier.

There is no secondary navigation on the surface itself. All navigation is delegated to `CollapsibleSidebar`, keeping the page content architecturally pure.

---

## 2. Layout System

**Structural pattern**: Single-column flexbox centred column, not grid.

```
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 680px;
  margin: 0 auto;
}
```
(`HomePage.css:5–17`)

The 680 px cap is intentional: `ChatInput` is a fixed-width component and the copy is short enough that wider measures reduce scannability. The container does not reference a layout token (`--max-width-sm` is 640 px, `--max-width-md` is 800 px); 680 px is a bespoke value sitting between the two — a deliberate fit to the input's ideal reading width.

**Responsive ladder** (three breakpoints, mobile-first by override):

| Breakpoint | Behaviour |
|---|---|
| `≥ 640px` (tablet) | `max-width: 580px` — slightly narrower to account for sidebar presence (`HomePage.css:245–253`) |
| `< 640px` (large mobile) | Heading drops to `1.75rem` via hard value; pills wrap, gap tightens to `6px` (`HomePage.css:197–221`) |
| `< 480px` (small mobile) | Pills stack vertically, each `max-width: 260px`, centred; `min-height` drops to `60vh` (`HomePage.css:223–243`) |

The responsive spec test suite (`tests/responsive/viewports.spec.ts`) covers overflow, touch targets, and sidebar behaviour, but does not include `'home'` in the `RESPONSIVE_PAGES` array (`viewports.spec.ts:16–23`). Home is not snapshot-tested at any breakpoint — a coverage gap.

**Sidebar offset**: Content shift is handled not by the page but by `BackgroundGradientAnimation`. When `isSidebarExpanded` is true, the `.horizon-gradient__content` wrapper gains `padding-left: 256px` vs. the default `72px` (`BackgroundGradientAnimation.css:21–28`). This keeps `HomePage` itself unaware of sidebar geometry.

---

## 3. Token Usage

**Typography**

| Element | Token |
|---|---|
| `<h1>` | `--font-family-display` (Pinokio Grand), `--font-weight-medium`, `--line-height-tight`, `clamp(2rem, 4vw, 3rem)` via bare value |
| `<p>` subheading | `--font-size-md` (1rem), `--font-family-base`, `--line-height-normal` |
| Pills label | `--font-size-xs` (0.8125rem) |
| Pills | `--font-size-sm`, `--font-weight-medium`, `--font-family-base` |

**Colour**

All text uses `--color-text-primary` and `--color-text-secondary`; all borders reference `--color-border-light` and `--color-border-medium`. The pill background (`rgba(225, 215, 200, 0.65)`) and the dark pill background (`rgba(30, 30, 28, 0.6)`) are **hardcoded raw values**, not tokens (`HomePage.css:112`, `HomePage.css:186`). The warm oatmeal tint aligns with `--color-brand-oatmeal: #E1D7C8` but is not referenced as such — a token compliance gap.

The `ChatInput` override for `--gradient-color-start/mid/end` also uses raw RGBA (`HomePage.css:73–76`). These are bespoke to the homepage context and have no token equivalent.

**Spacing**

Vertical rhythm uses the token scale correctly: `--spacing-sm`, `--spacing-xl`, `--spacing-2xl`, `--spacing-4xl` appear throughout. Pill padding (`7px 16px`) and gap (`6px`) are sub-token bare values, which is acceptable for micro-adjustments but worth noting.

**Radius**

Pills use `--radius-full` (9999px) — correct token usage for a pill shape.

**Motion**

Pill transitions correctly reference `--motion-duration-fast` and `--motion-ease-default` (`HomePage.css:121–124`). Cascade animations in the component use a hardcoded `duration: 0.35` and `delay: 0.08` in the Framer Motion config (`HomePage.tsx:38`) rather than CSS motion tokens — acceptable given this is Framer Motion's JS API, but worth flagging for the handoff doc.

---

## 4. Component Hierarchy

```
App (routing + sidebar state owner)
└── HomePage (page)
    ├── CollapsibleSidebar (layout/primitive — fixed, independent)
    └── BackgroundGradientAnimation (ui/composite — full-viewport wrapper)
        └── .home-page (flex column)
            ├── BlurText (ui/primitive — word-by-word reveal)
            ├── motion.p (Framer Motion primitive)
            ├── ChatInput (composite — shared with BuilderPage)
            └── .home-page__pills (local pattern — unique to Home)
```

`ChatInput` is the only composite that Home borrows from another surface (BuilderPage). Its configuration on Home differs: `showModeSelector={false}`, `showMicButton={false}` (`HomePage.tsx:173–176`). The component supports this via props; no CSS forking is needed at the composite level — only the wrapper override in `HomePage.css:59–75`.

`BlurText` and `BackgroundGradientAnimation` appear nowhere else in the page inventory, making them Home-exclusive rendering primitives in practice.

---

## 5. Navigation Role

Home is the **origin node** of the entire prototype. The hash router defaults to `'Builder'` when no hash is present (`App.tsx:67`), but `#home` explicitly lands here.

The sidebar is always rendered inside `HomePage` — it is never lifted to a layout shell. This means every page independently mounts its own sidebar, with `App.tsx` managing the shared `isSidebarExpanded` boolean as lifted state (`App.tsx:72`). Home receives `onNavigate`, which writes to `window.location.hash` and sets `currentPage` (`App.tsx:81–85`). There is no route guard, history stack, or enter/exit transition between pages — swapping is a synchronous conditional render.

Home's own exit pattern: none. When the user navigates via the sidebar, `currentPage` changes and `HomePage` unmounts without any exit animation.

---

## 6. Relationship to Other Surfaces

Home does not contain explicit links or preview cards to Builder, Projects, or Templates. Its relationship to those surfaces is **implicit and action-driven**:

- The `ChatInput` send handler currently logs to console and clears input (`HomePage.tsx:102–106`). In the intended product flow this would navigate to Builder with the prompt pre-populated — the wire is not yet connected.
- The four template pills fill the input with a prompt string (`HomePage.tsx:98–100`). They are named affordances for four of the system's application archetypes (Dashboard, CRM, Booking, Tracker) but do not navigate.
- The sidebar provides direct nav to all other surfaces including Projects and Builder.

No preview of existing projects or recent activity appears on Home. This is a deliberate "blank slate + prompt" pattern: conversion through a single input, not through content discovery.

---

## 7. Design-System Fit

Home stays within house style for typography, spacing, radius, motion timing, and dark mode inversion. The `.dark` overrides in `HomePage.css:144–191` follow the same pattern used across other pages — `.dark .component__element` with token-referenced borders and a surface-appropriate translucent background.

**Bespoke patterns unique to Home:**

1. `BackgroundGradientAnimation` with `showOrbs={true}` — this is not used by any other page. The gradient and orb system is a Home-exclusive atmospheric treatment.
2. Scroll-linked parallax (`parallaxOffset` at `scrollY × -0.10`, `HomePage.tsx:69–82`) — no other page implements parallax.
3. Typewriter placeholder via `useTypewriter` (`src/lib/useTypewriter.ts`) — a stateful hook exclusive to the home context.
4. Semantic colour matching: typing "crm" or "dashboard" into the input morphs the gradient palette (`BackgroundGradientAnimation.tsx:39–110`). This is a micro-delight without system-level token backing.
5. Glassmorphic `ChatInput` override: `backdrop-filter: blur(12px)` + `rgba(255,255,255,0.85)` background — other surfaces render `ChatInput` on an opaque surface, so this override is local and bespoke.

These five patterns constitute intentional one-off design for the hero surface. They are correctly scoped to `HomePage.css` and the `BackgroundGradientAnimation` subtree, so they do not pollute shared component CSS.

---

## Open Items

| # | Finding | Severity |
|---|---------|----------|
| 1 | Pill background and dark pill background use raw RGBA instead of `--color-brand-oatmeal` or a surface token | Low |
| 2 | `max-width: 680px` on `.home-page` is not a layout token value | Low |
| 3 | `ChatInput` `--gradient-color-*` overrides use hardcoded RGBA | Low |
| 4 | `'home'` is absent from `RESPONSIVE_PAGES` in `tests/responsive/viewports.spec.ts:16` | Medium |
| 5 | Cascade animation `duration: 0.35` (`HomePage.tsx:38`) bypasses JS-accessible motion tokens | Low |
| 6 | `handleSend` does not navigate to Builder — the intent-to-builder flow is unconnected | High (prototype gap) |
