# Landing / Marketing Page — Frontend Engineering Notes

_Source: `src/pages/LoginPage/`, `src/components/composite/LoginModal/`, `src/components/ui/ProductMockup/`, `src/components/ui/BackgroundGradientAnimation/`, `src/components/ui/BlurText/`, `docs/diagrams/marketing-page-flow.md`, `docs/diagrams/homepage-gradient-system.md`_

---

## 1. Component Stack

The marketing page is fully built. It lives at `src/pages/LoginPage/LoginPage.tsx` (not a separate `MarketingPage` — the route name is `#login`). The component assembles exclusively from shared primitives already in the codebase:

- `BackgroundGradientAnimation` (`src/components/ui/BackgroundGradientAnimation/`) — full-viewport horizon orb system with semantic palette matching. The marketing hero passes `showOrbs`, `parallaxOffset`, `isInputFocused`, and `inputText` to drive all four gradient states from a single component.
- `BlurText` (`src/components/ui/BlurText/`) — word-by-word IntersectionObserver-gated blur reveal used for the `<h1>`. The component fires `onAnimationComplete` callbacks that gate the cascade chain: heading → subheading → input wrapper → pills.
- `ChatInput` (`src/components/composite/ChatInput/`) — the full authenticated input, used verbatim in the hero with `showModeSelector={false}`, `showMicButton={false}`, and `hideNudge`. No structural changes.
- `HomeMockup`, `BuilderMockup`, `PreviewMockup` (`src/components/ui/ProductMockup/`) — self-contained diorama components wrapped in `BrowserFrame` for the "How it works" showcase steps.
- `LoginModal` (`src/components/composite/LoginModal/`) — the auth overlay, rendered once at the root of the page tree outside the scrollable `.marketing-page` div.
- Six animated bento illustration components (`DatabaseAnimated`, `AuthenticationAnimated`, `HostingAnimated`, `ChatAnimated`, `SecurityAnimated`, `IntegrationsAnimated`) wired through `BentoCardWithHover`.
- `ProvenIllustration` for the static "Proven in the real world" section.
- `useTypewriter` hook from `src/lib/useTypewriter` for hero placeholder cycling.
- `GradFlow` (the `gradflow` npm package) for the mesh gradient mode.

All page state is local to `LoginPage`. There is no global store, context, or routing library involved.

---

## 2. HomeMockup Pattern

`HomeMockup` exists at `src/components/ui/ProductMockup/HomeMockup.tsx` and is fully interactive. It is **not** the authenticated `ChatInput` component — it is a purpose-built diorama with its own raw `<textarea>`, a custom send button, and suggestion pills that pre-fill the input. State is local: `inputValue` and `showReply` controlled by `React.useState`.

When the user types and presses Enter or clicks send, `showReply` flips to `true` and an `AnimatePresence`-gated reply block slides in with "Great idea! To start building, sign up free →". The sign-up link calls a single `onCtaClick?: () => void` prop — that is the entire handoff contract from mockup to parent.

In `LoginPage.tsx` at line 501, the call is:
```
<HomeMockup onCtaClick={() => setShowLoginModal(true)} />
```

`BuilderMockup` follows the same pattern: one `onCtaClick` prop, the rest is self-contained. `PreviewMockup` takes no props and is purely decorative.

The mockup input intentionally does **not** reuse `ChatInput`. This is the correct call: reusing the full `ChatInput` would pull in `CreditPill`, `MessageQueue`, `CreditBanner`, mode toggles, and a dozen Framer Motion subtrees into each of three showcase dioramas. The bespoke textarea is lighter, fully controllable in CSS, and avoids any cross-contamination of credit/mode state.

---

## 3. `stashedPrompt` Handoff

`stashedPrompt` is `string` state on `LoginPage`, defaulting to `''`. It is set in `handleSend` (line 270–273) and immediately triggers `setShowLoginModal(true)`. It is passed as a prop to `LoginModal`:

```tsx
<LoginModal stashedPrompt={stashedPrompt} ... />
```

Inside `LoginModal`, the prop is accepted but prefixed `_stashedPrompt` (line 63), meaning it is received but not currently rendered. The intent documented in the flow diagram — "redirect to Builder, stashed prompt pre-fills chat input" — is not yet wired through to a real navigation callback. In the prototype, `onSignUp` and `onLogin` callbacks on `LoginPage` (lines 186–196) are the seam where the handoff would happen.

For production, the contract would be: on successful auth, the auth handler receives `stashedPrompt` from the modal's close/success path and navigates to `/builder?prompt=<encoded>` or writes to `sessionStorage` before the redirect. URL state (`?prompt=`) is preferable for direct-link support; `sessionStorage` works but breaks on new tabs. A Zustand slice keyed `pendingPrompt` is the cleanest option if the app already has a store, since it survives the React component tree being torn down during a route transition without polluting the URL.

The flow diagram documents one additional edge case at line 258: "Modal close without login → stashed prompt preserved in component state." This is satisfied automatically because `setStashedPrompt` is only updated when the user explicitly sends a prompt, and `setShowLoginModal(false)` does not clear it. Reopening the modal re-uses the same stash.

---

## 4. LoginModal Architecture

`LoginModal` is an overlay modal, not a route. It renders via `AnimatePresence` at the bottom of `LoginPage`'s return, outside the `.marketing-page` scroll container. This preserves scroll position on close — the page's `overflow` is never locked.

Escape key handling is a manual `keydown` listener on `document` (lines 99–106), added only when `isOpen` and cleaned up in the `useEffect` return. There is no Radix `Dialog` or focus-trap library involved; the implementation is hand-rolled. This is a gap: the current implementation does not trap focus inside the card, meaning Tab can cycle out to the blurred marketing page beneath. A production implementation needs either a Radix `<Dialog>` (already available in the project's dependencies as `@radix-ui/react-dialog`) or an explicit `inert` attribute on the background.

Backdrop click calls `onClose` via the backdrop element's `onClick`. The card stops propagation at line 150 (`onClick={(e) => e.stopPropagation()}`). Post-auth redirect logic is entirely delegated to the parent's `onLogin` and `onSignUp` callbacks — the modal itself never navigates.

The `isLoading` and `error` props allow the parent to reflect async auth state into the modal's submit button and error message. Form field reset on modal close happens in a `useEffect` watching `isOpen` (lines 89–96), so re-opening the modal always starts fresh.

---

## 5. Shared-Surface Tension: Demo Mode in ChatInput

The hero `ChatInput` submits to `handleSend`, which opens `LoginModal`. That is real interactivity, not demo mode.

The `HomeMockup` and `BuilderMockup` showcase components solve the demo problem differently: they do not reuse `ChatInput` at all. Each has its own `<textarea>` and a `handleSend` that sets local `showReply` state. There is no `onSend` callback that bubbles up — the "submission" is fully intercepted by the mockup, which shows a CTA instead of doing anything real.

The boundary between real and demo is therefore structural rather than prop-driven. There is no `demoMode?: boolean` flag on `ChatInput`, nor is one needed. If a future refactor wanted to embed the real `ChatInput` inside a mockup, the minimum viable demo-mode surface would be: pass `onSend` as a no-op or CTA launcher, and add a `disabled` variant that visually signals "try the real thing." The current architecture avoids the complexity entirely.

---

## 6. Performance and Bundle

The prototype ships as a single CSR bundle — no code splitting, no lazy imports, no dynamic `import()` calls anywhere in `App.tsx` or `LoginPage.tsx`. Every page component is statically imported at the top of `App.tsx` (lines 8–28). The marketing page, the builder, the billing pages, and all six bento illustration components are in one chunk.

`vite.config.ts` has no `build.rollupOptions.output.manualChunks` configuration. The `build` section only sets `outDir: 'dist'` and `sourcemap: true`.

On the dependency side, the marketing page alone pulls in `framer-motion` (the largest item), `gradflow` for mesh mode, `@xyflow/react` (unused on the marketing page but in the shared bundle), and the full Radix primitive set. The `gradflow` package includes a WebGL renderer that runs even when mesh mode is not selected — the component is conditionally rendered (`gradientMode === 'mesh'`), so it is not instantiated, but the module is still in the bundle.

For a real marketing page the immediate interventions are: (1) `React.lazy` + `Suspense` to split `LoginPage` from the authenticated app, keeping BackgroundGradientAnimation and Framer Motion on the marketing chunk but excluding builder, tables, relationships, and @xyflow/react; (2) lazy-load `GradFlow` behind the gradient toggle (it is only needed if the user switches to mesh mode); (3) consider whether `framer-motion` is worth the weight for the marketing page versus CSS-only animation for the cascade and scroll-reveals, which are simple enough to implement in pure CSS with `@keyframes` and `animation-delay`.

---

## 7. SEO and SSR

This prototype is fully CSR. There is no framework-level SSR, no `renderToString`, no streaming, and no meta-tag management. The entry point is a standard Vite + React 19 SPA with a single `<div id="root">` in `index.html`.

For a real marketing page, the gap matters significantly. The hero heading ("Move fast, build right"), the section titles, and the feature copy are all rendered in JavaScript — invisible to crawlers that do not execute JS, and contributing to LCP only after the bundle parses and React hydrates.

The minimum production path: move `LoginPage` to a framework with file-based routing and SSR support (Next.js App Router or Remix). The component architecture is compatible — the props-only API and zero global store usage make the component portable. The two runtime-only dependencies that need attention in an SSR context are `BackgroundGradientAnimation` (uses `navigator.userAgent` for Safari detection at line 171, which must be guarded behind `typeof window !== 'undefined'`) and `useTypewriter` (assumed to use `setInterval` or similar — needs the same guard). Everything else is pure React with no direct DOM access.

Static site generation (SSG) would also satisfy the SEO requirement at lower operational cost, since the marketing page has no personalized server-side data. The authenticated app can remain a CSR SPA behind the login boundary.
