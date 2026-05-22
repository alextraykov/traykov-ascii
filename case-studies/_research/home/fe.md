# HomePage — Frontend Engineering Decisions

_Stack: React 19 · TypeScript · Framer Motion · pure CSS design tokens_
_Route: `#home` · Source: `src/pages/HomePage/`_

---

## 1. Component Architecture

**File count: 3** (`HomePage.tsx`, `HomePage.css`, `index.ts`). This is a deliberate prototype choice — the page holds all orchestration logic in a single file rather than extracting sub-components that would only be used here.

**What's correctly extracted:**
- `CollapsibleSidebar` — owns its own expand/collapse state externally (passed as props), which lets the page coordinate sidebar width with `BackgroundGradientAnimation`'s `isSidebarExpanded` prop to shift content area padding (`BackgroundGradientAnimation.css:26`).
- `BackgroundGradientAnimation` — extracted because it carries significant internal complexity (orb rAF loop, semantic palette matching, mouse tracking) that would pollute the page.
- `BlurText` — extracted because the IntersectionObserver + per-letter SVG wordmark logic is non-trivial and reusable elsewhere.
- `ChatInput` — a fully configured composite that spans 600 LOC; keeping it separate is non-negotiable.
- `useTypewriter` — isolated as a custom hook (`src/lib/useTypewriter.ts`) because it has its own cleanup surface (multiple `setTimeout` refs, reduced-motion branch).

**What could be extracted if this were production:**
- The 4-item `TEMPLATE_PILLS` constant and its pill-rendering loop (`HomePage.tsx:26–31`, `194–208`) would become a `TemplatePillBar` component the moment a second page needs similar quick-starts.
- The cascade orchestration state (4 boolean flags, lines `55–58`) could become a `useCascadeReveal(stages: number)` hook to avoid per-page boilerplate.

**Boundary judgment:** For a design prototype, the current single-file approach is the right call. The page component is ~215 lines with no nested conditionals of alarming depth. In a production app these would be separate files under `src/features/home/`.

---

## 2. State Model

All state is local `useState` — no Zustand, no context reads inside `HomePage` itself. This is the correct choice for an isolated landing view.

**State inventory (`HomePage.tsx:55–70`):**

| State var | Type | Purpose |
|---|---|---|
| `headingComplete` | `boolean` | Gates subheading animation entry |
| `descriptionComplete` | `boolean` | Gates input animation entry |
| `inputComplete` | `boolean` | Gates pills animation entry |
| `setPillsComplete` | `boolean` | Terminal cascade flag (value never read, setter only) |
| `inputValue` | `string` | Controlled textarea value |
| `isInputFocused` | `boolean` | Drives orb expansion in `BackgroundGradientAnimation` |
| `parallaxOffset` | `number` | Scroll-linked vertical orb displacement |

**Surprising picks:**
- `setPillsComplete` is declared but the value side is never consumed (`const [, setPillsComplete]`, line 58). The cascade chain terminates there. A linter would flag this as dead state in production.
- `parallaxOffset` is maintained as React state (`useState`) updated inside a `requestAnimationFrame` callback (`lines 70–82`). This means every scroll tick schedules a state update and React re-render. In production this should be a ref driving a CSS custom property directly on the DOM node, bypassing React entirely — matching the pattern `BackgroundGradientAnimation` already uses for its colour interpolation (`BackgroundGradientAnimation.tsx:211–259`).
- `isTypewriterActive` is a plain derived boolean (`line 65`), not memoized. Safe at this scale; `useTypewriter` is already doing all the heavy lifting.

Sidebar expand state is lifted to the parent router level and passed down as `isSidebarExpanded` prop — correct, since both `CollapsibleSidebar` and `BackgroundGradientAnimation` need to read it.

---

## 3. Motion Implementation

### Cascade Reveal (5-stage)
The page uses a manual boolean-chain approach: `BlurText.onAnimationComplete` → sets `headingComplete` → `motion.p` enters → its `onAnimationComplete` sets `descriptionComplete` → etc. (`HomePage.tsx:135–209`).

Each `motion.*` element shares the same variant objects:
```
CASCADE_INITIAL: { filter: 'blur(10px)', opacity: 0, y: -20 }
CASCADE_ANIMATE: { filter: 'blur(0px)', opacity: 1, y: 0 }
CASCADE_TRANSITION: { duration: 0.35, ease: 'easeOut', delay: 0.08 }
```
(`HomePage.tsx:36–38`)

**Token compliance gap:** These duration and easing values are hardcoded inline (0.35s, 0.08s, `'easeOut'`). The design system defines `--motion-duration-slow: 350ms` and `--motion-ease-decelerate` at `tokens.css:322–326`. In production JS, the numeric equivalents should come from a shared motion constants object rather than scatter-quoted literals. Compare: `ChatInput.tsx:63–70` has a `MOTION` object that's closer to compliant.

**Interruptibility:** The cascade is not interruptible. If a user navigates away mid-sequence and returns, the boolean flags do not reset. On this single-direction hero page that's acceptable, but a `useEffect` that resets flags on unmount would be required in a multi-route SPA.

### BlurText — Word-by-word Stagger
`BlurText.tsx` uses IntersectionObserver (threshold 0.2) to trigger visibility, then Framer Motion per-word with computed `delay = (i * staggerDelay) / 1000` (`BlurText.tsx:156`). The "pave." word swaps text for an inline SVG with 4 `motion.path` elements staggered at 80ms per letter (`BlurText.tsx:65`). This is clever — it matches the brand wordmark exactly and avoids font dependency on the hero word.

**Enter/exit:** BlurText has enter only. There is no exit animation — visibility is set and never reversed. Acceptable for a hero that doesn't conditionally appear/disappear within the page.

### BackgroundGradientAnimation
Orb reveal: CSS `transform: scale(0.3)` → `scale(1)` on `.horizon-gradient__overlay--revealed`, driven by a double-rAF flip (`BackgroundGradientAnimation.tsx:176–188`) to ensure the browser paints the initial scale before the transition fires. Duration: 3s `cubic-bezier(0.16,1,0.3,1)` (spring-like exponential decelerate). Not a token — `BackgroundGradientAnimation.css:48`.

Semantic colour transitions bypass React entirely: the rAF loop lerps RGB values directly onto CSS custom properties `--c1`–`--c5` on the orb-wrapper DOM node (`BackgroundGradientAnimation.tsx:245–258`). This is the correct pattern for high-frequency animation — zero re-renders.

Mouse-following interactive orb: direct `el.style.left/top` mutation in `handleMouseMove` (`BackgroundGradientAnimation.tsx:277–279`). Zero React involvement.

### Pill Hover
CSS-only: `transition: background/border-color/color/transform var(--motion-duration-fast) var(--motion-ease-default)` (`HomePage.css:120–124`). Correctly uses tokens. `prefers-reduced-motion` media query at `HomePage.css:259–262` sets `transition: none`.

**Reduced-motion compliance:** Three-layer approach — `useReducedMotion()` (Framer hook) skips all JS animations; `@media (prefers-reduced-motion: reduce)` kills CSS transitions; `useTypewriter` serves static swapping instead of character-by-character animation (`useTypewriter.ts:80–88`). Well executed.

---

## 4. Performance Considerations

**Re-render risk from `parallaxOffset`:** As noted above, scroll → `setState` → full React reconcile. This is the single highest-risk pattern. The orbs are outside React (CSS transitions), but everything inside `<BackgroundGradientAnimation>` re-renders on every scroll frame. At 60fps this is 60 renders/sec while scrolling.

**No memoization:** `HomePage` has no `memo()` wrapper, no `useMemo`, and only two `useCallback`s for `handleFocus`/`handleBlur` (`lines 110–111`). This is fine for a prototype but in production `handlePillClick` and `handleSend` should be memoized to prevent ChatInput and pill buttons from re-rendering on every state change.

**No virtualization:** 4 pills rendered inline. Not a concern. If the pill list were user-generated and unbounded, virtualization would be needed.

**`will-change: transform`** is declared on `.blur-text__word` (`BlurText.css:12`) and `.horizon-gradient__orb-wrapper` (`BackgroundGradientAnimation.css:74`). These promote to compositor layers, which is correct for elements with active transforms. The risk is over-use — the 5 orb divs each animate separately, potentially creating 5+ compositor layers. Worth profiling on mid-range devices.

**Layout shift risk:** `BlurText` renders words as `inline-block` spans with `will-change: filter` and initial `y: -20` offset. The heading `<h1>` doesn't have a declared min-height, so as words reveal from `opacity: 0` to `1`, the heading collapses then expands. This is a CLS risk. A production build should set `min-height` on `.home-page__heading` matching the rendered height.

**Backdrop-filter on pills and input:** `backdrop-filter: blur(12px)` on `.home-page__input-wrapper .chat-input` and `blur(8px)` on `.home-page__pill` (`HomePage.css:63`, `119`). These are compositor-only on GPU but can cause compositing layer explosion when many elements use it simultaneously. On this page the count (1 input + 4 pills) is manageable.

---

## 5. Accessibility Implementation

**Landmark structure:** The page renders inside `BackgroundGradientAnimation` which is a generic `div`. There is no `<main>` landmark wrapping the hero content. Screen readers navigating by landmark would find only the sidebar's nav (which does have navigation semantics in `CollapsibleSidebar`). **This is a gap.**

**Heading:** `<h1>` is used correctly for the page title (`HomePage.tsx:134`). But `BlurText` wraps words in `motion.span` elements with no role — acceptable since spans are inline phrasing content.

**Template pills:** Rendered as `<button type="button">` (`HomePage.tsx:197`) — correct semantic element. Lucide icons inside pills have no `aria-hidden` attribute, but they're decorative in context (the text label is present). Production should add `aria-hidden="true"` to each `<Icon>` component.

**ARIA on `BlurText`:** The inline SVG wordmark for "pave." has `aria-hidden="true"` (`BlurText.tsx:49`), which is correct — the parent `<h1>` text "From idea to done with pave." is the accessible label. However, the heading text is split across `motion.span` elements; a screen reader reading character-by-character would encounter the word gap spaces inconsistently. Not a blocker but worth testing.

**Focus management:** `ChatInput` is passed `autoFocus={false}` (`HomePage.tsx:176`). Correct for a landing page — autofocus on load would surprise users arriving via keyboard.

**Keyboard flow:** Pills are reachable by Tab. The sidebar has its own keyboard handling. No focus trap is implemented — appropriate since there are no modal overlays on this page.

**Reduced-motion:** As noted in section 3, this is well-handled across JS and CSS layers.

---

## 6. Dark Mode

The page itself has zero conditional dark-mode logic in JSX. All theming is handled via the `.dark` class on `<html>` which cascades through CSS custom property redefinitions in `tokens.css` (dark overrides begin around line 380 in the token file). Component-level dark mode CSS lives in the cascade:

- `HomePage.css:144–191` — overrides `chat-input` backdrop color, pill backgrounds, and send-button icon contrast for the translucent glassmorphism surfaces (e.g., `rgba(30, 30, 28, 0.75)` vs. light-mode `rgba(255, 255, 255, 0.85)`).
- `BlurText.css:23–25` — `--color-accent-primary` is used for highlight; token automatically resolves to the dark value.
- `BackgroundGradientAnimation.css:145–151` — frost layer background adjusted.

**Gap:** The pill backgrounds in dark mode use hardcoded `rgba(30, 30, 28, 0.6)` and `rgba(50, 50, 48, 0.8)` (`HomePage.css:186–190`) rather than token-derived values. These could drift from the design if the dark background token changes. Production should introduce a token like `--color-glass-bg-dark` for this surface.

---

## 7. Gaps for a Production Port

**Critical**
- `parallaxOffset` state update on scroll tick — replace with a ref + direct DOM mutation pattern (`el.style.setProperty('--parallax', ...)`) to eliminate 60 renders/sec.
- Missing `<main>` landmark — add a `role="main"` or `<main>` wrapper around `.home-page`.
- `handleSend` calls `console.log` (`HomePage.tsx:103`) — no real submission handler, no loading state, no error state. A production build needs optimistic navigation or a pending spinner.

**Accessibility**
- Add `aria-hidden="true"` to Lucide icon instances inside pill buttons.
- Declare `min-height` on `.home-page__heading` to prevent CLS during BlurText reveal.
- `setPillsComplete` (dead state, `line 58`) — remove or consume.

**Motion**
- Replace inline magic numbers in `CASCADE_TRANSITION` with references to the `MOTION` constants already defined in `ChatInput.tsx` or a shared `@/lib/motion.ts`.
- Add an `AnimatePresence` exit to the cascade sections so navigating away from the homepage doesn't leave orphaned animations running.

**Token compliance**
- `BackgroundGradientAnimation.css` — the 3s orb reveal and 1.2s orb slide transitions use raw cubic-bezier values, not tokens.
- Dark-mode pill glass backgrounds need a dedicated token rather than hardcoded `rgba` values.

**No loading / skeleton states** — the gradient and heading animate in together, so there's no empty flash. But if `TEMPLATE_PILLS` or the `ChatInput` prop configuration were ever fetched asynchronously, there's no placeholder UI.

**Testing** — no unit tests for `useTypewriter` (phase transitions, cleanup on deactivation), no snapshot or visual test for the cascade sequence. The E2E suite referenced in CLAUDE.md should cover the send-empty-input guard and pill-fills-input interaction as a minimum.
