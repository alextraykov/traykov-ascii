# Landing / Marketing Page — Codebase Map

_Route: `#login` · Entry: `src/pages/LoginPage/LoginPage.tsx` (744 lines) · Flow: `docs/diagrams/marketing-page-flow.md`_

## 1. Surprise: the "marketing page" is the LoginPage

Despite the filename, `src/pages/LoginPage/LoginPage.tsx` is the **public-facing marketing + auth entry** page. It serves both product marketing and authentication through a single surface. The hash route `#login` lands here.

## 2. Page sections (top to bottom)

| Section | File:lines | Status |
|---|---|---|
| Topbar (blurs on scroll) | `LoginPage.tsx:256–262, 285` | built |
| Hero — gradient + BlurText + ChatInput + pills | `LoginPage.tsx:316–438` | built |
| Trusted By banner (placeholder logos) | `LoginPage.tsx:443–455` | built, 6 empty divs |
| How It Works — 3 interactive mockups | `LoginPage.tsx:458–564` | built |
| Bento feature grid (6 cards) | `LoginPage.tsx:567–600` | built |
| Proven in the Real World | `LoginPage.tsx:605–630` | built |
| **Bottom CTA (gradient + "Start building")** | — | **documented, NOT built** |
| Footer | `LoginPage.tsx:636–743` | built |

The diagram (`marketing-page-flow.md:59–61`) specifies a standalone Bottom CTA between Proven and Footer. In code, Proven flows directly into Footer. The CSS class exists but JSX is absent.

## 3. Shared components with authenticated Home

Three core visual components cross the auth boundary **unchanged**:

- `src/components/ui/BackgroundGradientAnimation/` — orb gradient, parallax, semantic palette, sidebar offset
- `src/components/ui/BlurText/` — cascade heading with per-word blur reveal
- `src/components/composite/ChatInput/` — the real composer (not a mock)

The cascade animation config (`LoginPage.tsx:130–136`) is duplicated verbatim from `HomePage.tsx:36–38`. Intentional — the post-auth experience feels literally identical to the pre-auth preview.

## 4. `stashedPrompt` handoff

The load-bearing mechanic. `LoginPage.tsx:227` holds `const [stashedPrompt, setStashedPrompt] = useState('')`. `handleSend` (`LoginPage.tsx:269–273`):

```ts
if (inputValue.trim()) {
  setStashedPrompt(inputValue.trim());
  setShowLoginModal(true);
}
```

The modal receives the prompt as a prop (`LoginPage.tsx:728–739`) but in `src/components/composite/LoginModal/LoginModal.tsx` the prop is currently prefixed `_stashedPrompt` — received but not acted on. The redirect-to-builder-with-pre-fill is wired via parent callbacks (`onLogin`, `onSignUp`, `onGoogleLogin`, `onGitHubLogin`, `onAppleLogin`, `onSSOLogin`) that are props on `LoginPageProps` (`LoginPage.tsx:186–195`). Parent component owns OAuth redirects, email/password auth, post-auth routing.

## 5. ProductMockup components

The "How It Works" section uses three interactive dioramas:

- `src/components/ui/ProductMockup/HomeMockup.tsx` — **interactive** `<textarea>` with local `showReply` state. **Does not reuse `ChatInput`** — it's a custom composer. Contract: one prop `onCtaClick?: () => void`.
- `BuilderMockup.tsx` — same pattern; contains an auto-animating `SubagentBubble` when in view.
- `PreviewMockup.tsx` — static, no props.

Each wraps in `BrowserFrame` for visual framing. Both `HomeMockup` and `BuilderMockup` have inline CTAs that trigger the LoginModal via `setShowLoginModal(true)` — every mockup is a conversion surface.

## 6. LoginModal architecture

Hand-rolled overlay modal (`LoginModal.tsx`), not Radix Dialog. Manual `keydown` Escape listener. Scroll position preserved (no body lock). **Focus-trap gap**: Tab can cycle out of the card into the obscured background. Production needs either Radix Dialog (already a dep) or `inert` on background.

## 7. State inventory

From `marketing-page-flow.md:280–291`, all 10 variables implemented: `gradientMode`, `headingComplete`, `descriptionComplete`, `inputComplete`, `inputValue`, `isInputFocused`, `parallaxOffset`, `scrolled`, `showLoginModal`, `stashedPrompt`.

## 8. Scroll + parallax

- Topbar blur trigger at `scrollY > 40` (`LoginPage.tsx:256–262`). Spec says `scrollY > 20` — minor divergence.
- Orb parallax offset via rAF-driven CSS custom property (no React re-render).
- `whileInView` triggers for scroll-reveal animations throughout.

## 9. Shipped vs. documented

Full-featured implementation of 6 of 7 diagram sections. Hero gradient toggle (orbs/mesh), semantic palette matching, and persistent input stashing all work. Gaps: Bottom CTA section is diagramed but unbuilt, Trusted By has empty placeholder logos, testimonials content in Proven section is absent (illustration + copy only).

## 10. SSR / bundle

Fully CSR. `BackgroundGradientAnimation.tsx:171` accesses `navigator.userAgent` — requires a `typeof window` guard before SSR migration. No code-splitting — `LoginPage` and its Framer Motion + `gradflow` dependencies ship to all unauthenticated visitors.
