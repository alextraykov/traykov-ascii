# HomePage — Codebase Map

_Entry: `src/pages/HomePage/` · Route: `#home` · App wiring: `src/App.tsx:89–95`_

## 1. Entry file + key subcomponents

| File | Export | Purpose |
|------|--------|---------|
| `src/pages/HomePage/index.ts` | `HomePage`, `HomePageProps` | Public API |
| `src/pages/HomePage/HomePage.tsx` | `HomePage` | Landing hero — gradient backdrop, heading, chat input, template pills |
| `src/pages/HomePage/HomePage.css` | — | BEM-scoped layout, input wrapper, pills, dark mode, responsive |

`HomePageProps` (HomePage.tsx:43–47): `onNavigate`, `isSidebarExpanded`, `onSidebarExpandedChange`.

## 2. Wiring

- Props from `App.tsx:89–95`: navigation callback + sidebar expanded state.
- Contexts available (from `App.tsx:263–269`): `DarkModeProvider`, `CreditStateProvider`, `TooltipProvider`. HomePage reads DarkMode only via CSS (`.dark` class).
- Hash map: `#home → 'Home'` (`App.tsx:32`). Default fallback if hash invalid is `#builder` (App.tsx:67).

## 3. State & side effects

Local `useState` only — no Zustand:

- `headingComplete`, `descriptionComplete`, `inputComplete`, `pillsComplete` (HomePage.tsx:55–58) — cascade gates.
- `inputValue`, `isInputFocused` (61, 62) — input state drives the gradient orb behavior.
- `parallaxOffset` (69) — scroll-linked, updated in a passive `scroll` listener at 10% of `scrollY` (70–82).

`useEffect`:
- Scroll parallax attach/detach (70–82).
- Reduced-motion bypass — flips all four gates true when `prefers-reduced-motion: reduce` (88–95).
- Typewriter activation (66) — calls `useTypewriter(isTypewriterActive)` when `inputValue === ''`.

Callbacks: `handlePillClick` (98) pre-fills input with `Build me a "{name}"`; `handleSend` (102) currently logs and clears — **not wired to Builder**.

## 4. Dependencies

| Path | Component | Role |
|------|-----------|------|
| `src/components/layout/CollapsibleSidebar` | `CollapsibleSidebar` | Fixed nav with `currentPage="Home"` |
| `src/components/ui/BackgroundGradientAnimation` | — | Orb gradient, parallax, semantic color match |
| `src/components/ui/BlurText` | — | Word-by-word blur reveal for heading |
| `src/components/composite/ChatInput` | `ChatInput` | Only borrowed composite — reused from Builder chat |
| `src/lib/useTypewriter` | hook | 15 example prompts, typing + deletion animation, reduced-motion aware |

Lucide: `LayoutGrid`, `Calendar`, `Users`, `Receipt` for TEMPLATE_PILLS.

## 5. Motion usage

- `framer-motion` (HomePage.tsx:2): `motion`, `useReducedMotion`.
- Cascade config (36–38): `{ filter: 'blur(10px)→blur(0)', opacity: 0→1, y: -20→0 }`, 0.35 s easeOut, 0.08 s delay between tiers.
- Four `motion.div` tiers — subheading (143–153) → input (156–178) → pills (181–209) — each fires `onAnimationComplete` to unlock the next.
- `AnimatePresence`: not used here (used only inside ChatInput).
- CSS motion tokens on pill hover: `var(--motion-duration-fast)`, `var(--motion-ease-default)` (HomePage.css:121–124).

## 6. Tokens

HomePage.css references `--spacing-*`, `--font-*`, `--color-text-*`, `--color-border-*`, `--color-accent-primary`, `--radius-full`, `--motion-duration-fast`, `--motion-ease-default`.

**Hardcoded values flagged** (violate the tokens-only rule):
- `rgba(255,255,255,0.85)` (HomePage.css:60)
- `rgba(225,215,200,0.65)` (HomePage.css:111) — matches `--color-brand-oatmeal` but doesn't reference it
- `backdrop-filter: blur(12px)` (62), `blur(8px)` (118)

Cascade animation duration `0.35s` is also JS-literal, not a motion token (HomePage.tsx:38).

## 7. What makes Home "home"

Landing page, prompt-first. Heading "From idea to done with pave.", subhead, ChatInput with cycling typewriter placeholder, four template pills (Reporting Dashboard, Event Booking, Sales CRM, Expense Tracker) that pre-fill the input. Gradient orbs shift palette in response to semantic keywords in the typed input (`dashboard → blue`, `crm → amber`, etc.). The ChatInput is the **same composite** as in Builder chat — so the first thing a user types on Home is functionally the first message to the AI. The wire to Builder, however, is stubbed (handleSend logs only).
