# Site picks: implementation plan

17 October 2026 · Planner output. Turns `component-picks.md` (Alexander's picks of 17 October, with his notes and the global underline rule) into three sequential batches on the live site (`/Users/atraykov/traykov-ascii`, Astro). Sources of truth, in this order: the picks file, the review partials in `directions/*.html` and `directions/00-shell.css` / `00-runtime.js` (what Alexander actually looked at), then `component-directions-plan.md` §1 and §3 for numbers the partials do not show, then `directions/motion-craft.md` for timing and interruptibility. `AGENTS.md` and the two contract scripts stay in force.

This is a plan. Nothing in the site has been changed by it.

## 0. Decisions that apply everywhere

### 0.1 The global underline rule, applied

Alexander: *"Underlines in B are a major issue, and most look bad."* Wherever a B pick has an underline, link rule, current-item rule or under-marker, the A treatment replaces it: a 1 px `--line` hairline for a real boundary, the A soft rule (2 px, level 3, 8 px tile) for a quiet link rule, the A under-marker (2 px solid, arrives in 3 steps over 120 ms) for hover. B keeps cells, counters, meters and grids. Concretely, these B pieces change:

| B pick | What was a B cell-row underline | Now |
| --- | --- | --- |
| Dialog | 4 px cell rule under the header | 1 px hairline under the header |
| Figure captions | 2 px cell rule above the caption | 1 px hairline above the caption (the "Fig. 02" counter stays) |
| Compare switch | 3 px position rule under the group; cell under-rule on hover | No position rule; selected option solid (A); hover is the A 2 px solid under-marker |
| Video play and overview toggle | 3 px cell under-rule on hover | A 4 px left marker |
| Point refresh | 4 px cell rule under the media | No rule; only the 8 px cells |
| Stat row | 3 px cell rule under every numeral | Kept only where it is a real meter (percentage stats, filled to the share); no rule under other numerals |
| 404 (his note: "like B, but the underline is ugly and should be like A") | cell rule under the field | 1 px hairline, full width, 11 px below the field |
| Motion control | none | none (cells are a switch, not a rule) |
| Home entry rail, slider, timeline, loaders, empty state, status lines | no underlines | unchanged |

Rules that stay in B because they are vertical or are meters: the slider divider column in the drag compare, the 24-cell split row under the compare stage, the lens corner cells, video tracks, progress rows, the entry rail stacks, the timeline day cells.

### 0.2 Six hybrids, resolved to one design each

1. **Footer** — *"Cell grids but lighter."* B's footer with less ink: Departure 11 `--muted` column headings with **no rule under them** (the rule was an underline), 15 px Geist Sans links in `--text-soft` that go ink on hover, and B's cell-column hover marker made lighter: a column of 7 px cells on an **8 px pitch but only 4 px wide** (the A marker width) arriving top to bottom 3 → 8 in 2 steps of 30 ms, label stepping 8 px. Base row 13 px Geist Sans (not Departure). Back to top is the A pick (one cell). Columns 4 → 2 at 820 → 1 at 480. Top edge stays a hairline. Confirm with Alexander (§5).
2. **Case index, desktop rail** — *"The dither block for a scrubbed case section on A, but the 'On this case' heading and percentage as in C."* Rows are A: a 4 × 17 px reading cell (empty, filling 1–8 while read, level 3 when read), no counters, title Geist Sans 14 px `--muted` (current ink 500, read `--text-soft`), 33 px rows, hover turns the title ink only. Head is C: "On this case" and "28% read" both Departure 11 on one line, `--muted` percentage, hairline beneath. Narrow desktop (≤ 1180): cells only, title on a tooltip (A tooltip, §1.7).
3. **Case index, phone strip and sheet** — *"Like C, but underlines are like in A."* Strip 55 px: section number Departure 22, current title 14 px that resolves through the dither mask (2 → 4 → 6 → none, 150 ms) instead of ░▓ glyphs, the "Contents / Close" word with an **A soft rule** (2 px level 3, solid while open) instead of the C band; progress row stays C: 12 cells of 12 px (a meter, not an underline) on the strip's bottom edge. Sheet: C switch (resolves through the dither from a 2 px line, 4 steps over 240 ms, 180 ms out), 48 px rows on hairlines, current row with a held 6 px C marker, scrim = level 2 dither in ink at 12 px tile (8 px in dark).
4. **Form status line and the submit press** — undecided, no note. A, as the rollout note says and because the primary button is A: a 4 × 16 px cell at level 8 in the signal colour before the sentence (15 px); on failure the sentence is red for its first two flashes (120 ms each) then ink with the red cell held; the submit runs the A press, then quarter turn + "Sending", then the check + "Sent" held 1.5 s with the marker.
5. **404** — *"Like B, but the underline is ugly and should be like A."* The B field: "404" in 5 × 7 glyphs on 23 columns of 7 px cells (8 px pitch), resolving in **reading order one column per tick** (23 × 40 ms ≈ 0.9 s), then a 1 px `--line` hairline 11 px below the field (the A boundary), h1 Departure 22, lede 16 px, secondary "Go to the work" + quiet "Read the notes →". The visually hidden "Error 404" stays.
6. **Tool panel** — *"A combination of A minimalism and B interactions."* A's look: labels Geist Sans 13 px `--muted`, values Departure 11 right-aligned, no group counters, no rules under group headings, groups separated by an A soft rule with 22 px between, 36 px buttons with a `--line` hairline border and 13 px text, the native select at 40 px with a hairline border and the cell chevron, settings textarea in a hairline. B's interactions: the slider is the B cell track (18-B), the hover marker on 36 px buttons is B's cell column (4 cells of 7 px, top to bottom), the selected button fills with B's diagonal dither press and stays solid, the checkbox fills 0 → 4 → 8 in 2 steps of 30 ms, the panel's one primary ("Save PNG") is the A primary. Confirm (§5).

### 0.3 Motion control (resolved)

Alexander confirmed on 17 October: **keep the control (accessibility), use B's version with no animated or blinking indicator at all; a static state indicator only.** So: "Motion" in Departure 11 ink, a 2-cell switch (7 px cells, 8 px pitch, inside a 1 px `--line` frame 20 × 11 px), the state word in Departure 11. On = 8·8, off = 0·0, reduced = dotted frame (`.is-dotted` on the switch), cells 0·0, word "Reduced". A click swaps the cells in one step; nothing subscribes to the tick. Still 48 px tall (the browser contract needs 48, not the review's 44). No open question remains here.

### 0.4 Where the CSS goes, and the other person's work

The working tree holds someone else's uncommitted round 4: `case-studies/pages/pave-new-look.mdx` (renamed), `src/components/CaseStudyPage.astro` (blueprint hero), `src/lib/content.ts` (new fences: case-link, case-quotes, case-slider, case-lens, deck), `src/scripts/case-media.js`, `vercel.json`, the `--link-blue` tokens at the top of `global.css`, and the block appended at the end of `global.css` that starts `/* 24 CASE EVIDENCE, ROUND 4` (line 17917 today, to the end of file). **None of that is edited, moved or reformatted by any batch.**

Each batch appends **one** new section **after** the round 4 block, at the end of the file:

- Batch 1: `/* 28 PICKS · CHROME, ACTIONS AND MOTION */`
- Batch 2: `/* 29 PICKS · LISTS, HOME AND CASE EVIDENCE */`
- Batch 3: `/* 30 PICKS · CASE NAVIGATION, FEEDBACK AND TOOLS */`

Why after, not before: (1) their block stays byte-identical and contiguous, and a later commit of theirs is a clean hunk above ours; (2) the picks are the newest layer, so they should win cascade ties without escalating specificity: a picks rule written with the same selector shape as the round 3 or round 4 rule it replaces wins by order alone; (3) their `body[data-case-id="pave-new-look"] …` exceptions are more specific than anything we write with `:root …`, so they keep winning for that case even after our rules; (4) if they append more to their block before a batch runs, the anchor is the comment `/* 24 CASE EVIDENCE, ROUND 4` and the end of file, never a line number. Before each batch: `git diff --stat` must show their files unchanged by us, and `git diff src/styles/global.css` must show only additions after their block (and, in batch 1 only, nothing above line 17917).

**Coordination (17 October, from the coordinator):** a separate implementer is rebuilding the case-evidence components on Pave's new look right now (drag compare/slider, x-ray lens with the outside of the lens dimmed per Alexander, day-cell timeline, captions and every other round 4 evidence fence), editing only the `24 CASE EVIDENCE, ROUND 4` block of `global.css`, those renderers in `content.ts`, and `case-media.js`. The three batches here **do not touch those files or that block, and do not override any selector that lives in that block**, so they can run after the fix without conflict. The components that fix owns are marked **"handled by the case-evidence fix"** below; their resolved picks (design and the underline-rule adjustments) are written out so that implementer can take them: 1.13 case link, 2.9 figure captions, 2.10 compare / slider / lens, 2.13 live embed (frame, corner button, deck, loading), 2.14 pull quote and quotes carousel, 2.15 stat row, 2.16 day-cell timeline. Shared primitives those components reuse (the A segmented group, the A icon button, the tooltip, A chips, `loader.js`) ship in batches 1–3 as shared CSS and runtime and are available to the fix. When both land, one cleanup pass folds duplicates (not part of these three batches).

Superseded round 3 rules are **not deleted** in these batches either (same reason: one writer, no reformatting of a 18 700-line file while another person works in it). Each component lists the round 3 rules it supersedes, so the cleanup pass can remove them. Where a round 3 rule would otherwise leak (a `::after` marker that is not re-declared, a keyframe), the picks section neutralises it explicitly.

### 0.5 Tokens for the picks (top of section 28, on `:root`, with dark overrides)

New names only, so the existing `:root` block at the top of the file is untouched (it holds the other person's `--link-blue` lines). Legacy tokens (`--marker-width: 6px`, `--snap: 280ms`, …) stay for rules we do not touch.

```css
:root {
  --marker-a: 4px;  --rule-a: 2px;                 /* A left marker; A under-marker and A soft rule height */
  --cell-b: 7px;    --gap-b: 1px;  --rule-b: 3px;  /* B cells on an 8 px pitch */
  --marker-c: 6px;  --band-c: 4px; --tile-c: 12px; /* C marker, C band, C dither tile */
  --label-a: 4px;   --label-b: 8px; --label-c: 5px;/* how far a label steps aside under its marker */
  --snap-a: 120ms;  --sweep-a: 300ms; --afterglow-a: 120ms; --switch-a: 200ms; --stagger-a: 400ms;
  --snap-b: 280ms;  --afterglow-b: 180ms; --switch-b: 240ms;
  --switch-c: 240ms; --level-c: 50ms;              /* one C level step */
  --press-a-in: 160ms; --press-a-hold: 200ms; --press-a-out: 160ms;
  --transition-tile: 4px;                          /* page transition (A): finer dots */
  --pick-ease-move: cubic-bezier(0.645, 0.045, 0.355, 1); /* craft §3: on-screen movement between positions */
}
html[data-theme="dark"] { --tile-c: 8px; }
@media (prefers-color-scheme: dark) { html:not([data-theme]) { --tile-c: 8px; } }
```

Masks for A soft rules use `--dither-3` at `var(--dither-size)` (8 px, as today). C bands use `--dither-4` at `var(--tile-c)`. Level-1 texture is not used anywhere in the picks except the C scrim (level 2) and the lens/compare pieces that already exist.

### 0.6 Drawing B cell rows without `repeating-linear-gradient`

`verify-site` fails on any `repeating-linear-gradient` in `global.css` ("Global CRT scanlines are removed"). The review page uses it for every cell row; the site must not. Two ways, both already used by round 3:

- **CSS-only rows**: a `linear-gradient` mask that repeats on one axis, e.g. 4 px cells with 1 px gaps: `mask: linear-gradient(90deg, #000 4px, transparent 4px) 0 0 / 5px 100% repeat-x;` and 7 px cells on an 8 px pitch: `… #000 7px, transparent 7px) 0 0 / 8px 100%`. A soft level composes a second mask layer (`var(--dither-3) 0 0 / 4px 4px`) with `mask-composite: intersect` (`-webkit-mask-composite: source-in`), exactly as section 25 does for the nav. Vertical columns use `180deg` and `100% 8px repeat-y`.
- **DOM cells** (`createCells` from `cells.js`) wherever JavaScript drives levels (progress, meters, loaders, stacks that fill on hover).

### 0.7 Motion craft rules carried into every batch

From `directions/motion-craft.md`, the ones that change site code:

- Keyboard-initiated changes are instant: arrow keys in tabs and segmented groups, Enter/Escape on dialogs and disclosures, Tab-focus arrival of a marker. The runtime learns the input kind from `event.detail === 0` (click without pointer) and from a 120 ms `keydown` flag on the group.
- Hover markers arrive in ≤ 120 ms and leave in ≤ 80 ms or instantly. The A marker leaves in 1 step.
- Press feedback: `transform: scale(0.97)` on `:active` with a 140 ms `--ease-out-expo` transition on primary, secondary and icon buttons, never below 0.97, none under reduced motion or when the visitor switch is off. **Not** on the motion control (its contract forbids transforms on the control and its children) and not on links in the nav.
- Exits shorter than entries: A afterglow 120 ms in 2 steps (55 %, 0); B afterglow 180 ms in 3 steps.
- Panels and sheets open from a line (clip-path), never from `scale(0)`; the dialog stays centred.
- Interruptible: markers, fills and the segmented handoff retarget from their current levels (`cells.js` already does this; the tooltip and sheet use transitions).
- Stagger: gaps 70, 55, 45, 40, 35, 30 ms (first item gets the most time), never uniform; one entrance per container.
- Reduced motion and the visitor switch: state swaps in one step (selected tab solid, Sent still shows, the check still appears); loops rest on a meaningful frame (quarter turn with its tail, breathing cells at 1·2·3, sweep band at level 3).
- Only `transform`, `opacity`, `clip-path` and mask-level swaps animate.

### 0.8 Components not on the site, and whether to add them

| Component | On the site? | Decision |
| --- | --- | --- |
| Skip link (A) | No | **Add** in batch 1: first focusable element, before `<header class="site-nav">`, `href="#top"` (every page's `main` has `id="top"`). The site has five nav links and the theme control before content, so WCAG 2.4.1 wants it. |
| Tooltip (A) | No (`title` only) | **Add** in batch 1 as one small primitive, used for the two icon-only chrome controls (nav theme icon, case-live full-screen button) and the narrow case rail. `title` attributes stay as the no-JS fallback. |
| Toast (C) | No | **Skip.** Nothing on the site needs a confirmation a button cannot say itself ("Copied" is a status line beside the control in Presentations in Code). |
| Stepper (A) | Only the deck arrows under live embeds (round 4 block) | **Handled by the case-evidence fix** (A secondary look on the existing Previous / Next buttons, `output` 13 px sans); the −/value/+ form is not needed anywhere. |
| Drop zone (A), swatches (A) | SVG studio only (`apps/svg-ascii-studio`) | **Add** in batch 3 inside the studio's scoped `app.css` and `studio-ui.js`; the engine (`studio.js`) is untouched. |
| Loaders (B) | Quarter turn only | **Add** the sweep and breathing loaders as one shared helper (`motion/loader.js`) for the places that need them (video loading, live-embed loading, the Notes empty state). The mosaic poster and the turntable breathing loader are **deferred**: turntable scripts are protected by `AGENTS.md`. |
| Listbox select (A) | Banner studio quality picker | Restyle in batch 1; no new select is added. |

---

## 1 + 2. Resolved spec and site mapping, per component

Format per component: **Pick** · **Design** (sizes, every state, motion, phone) · **Site** (files, selectors, scripts; what is superseded; which contracts change). Numbers are px unless a token is named. "Phone" is ≤ 640 unless the site's own breakpoint is named. Components are grouped by the batch that ships them.

### Batch 1 · Chrome, actions, selection, page motion (section 28)

#### 1.1 Site nav — C

**Design.** Bar 66 tall, bottom edge a 2 px solid `--ink` line (not a hairline). Logo mask 36 × 36 (`/sasi.svg`). Five links Geist Sans 500 14 px `--ink`, centred, 44 px targets. Current link: a 3 px C band at level 8 (solid) under the **link text** (text width, not target width), 6 px below the baseline box. Hover on another link: the band arrives through levels 3 → 6 → 8 at 50 ms each (150 ms) at `--tile-c`; leaves 6 → 3 → 0 in 2 steps of 40 ms (80 ms, craft). Keyboard focus: band at 8 at once. Choosing a link: the arriving page's current band resolves 3 → 6 → 8 (150 ms) once the page dissolve has landed (`body.is-page-arriving` / `html[data-transition-incoming]`); the old band leaves with the old page. Case reading line: a 4 px band at level 4 at the bar's bottom edge whose filled part is solid; progress resolves per 12 px cell (the leading cell steps 4 → 8 as the fraction grows). Phone: brand + theme row on top (48 px), five equal links on one 48 px row, 14 px text, band 3 px.

**Site.** `src/components/SiteNav.astro`: wrap each link's text in `<span class="site-nav__text">` so the band can sit under the text; keep `has-marker has-marker--under` classes (inert) or drop them, and keep `aria-current="page"`, the "Primary" label, five links, `.brand`, `.site-nav__controls`, `.case-progress`. CSS in section 28: `.site-nav` (min-height 66, `border-bottom: 2px solid var(--ink)`), `.site-nav .brand::before` 36 px, `.site-nav nav a::after` re-declared as the band on `.site-nav__text` (`position:absolute; left:0; right:0; bottom:-6px; height:3px; background:var(--ink); mask: var(--dither-4) 0 0 / var(--tile-c) var(--tile-c)`) with keyframes `band-c-in` (mask 3 → 6 → none, `150ms steps(1)`) and `band-c-out` (6 → 3 → hidden, `80ms`); the round 3 / 25 rules on `.site-nav nav a::after` are neutralised (`content: none`). `.site-nav .case-progress span`: 4 px, level 4 mask, with a solid `::before` sized by `--scroll-progress` in 12 px steps (`width: calc(round(down, var(--scroll-progress) * 100%, 12px))`; fallback plain width where `round()` is unsupported). Update `--site-nav-phone-height` (used by `.case-reading-tools` at ≤ 640) to the measured new height (48 + 48 + 2 = 98). Supersedes: §17 `.site-nav*`, §25 entirely. Contracts kept: `verify-site` nav strings and `grid-template-columns: repeat(5, minmax(0, 1fr))` (keep that exact declaration in the phone rule); `browser-contract` responsive navigation (5 links, phone links ≥ 48 × 48 and ≥ 12 px, no wrap, brand → nav → controls order, painted colours in both themes). No contract text changes.

#### 1.2 Theme control — C

**Design.** Nav icon: a 15 × 15 square, 48 px target, filled through the dither at a 4 px tile (so at least three dots show per side): automatic = level 4, light = 2 px outline only (empty), dark = level 8. Flip: the interior resolves 2 → 4 → 6 → target over 200 ms (4 steps of 50 ms); Enter/Space flips at once. Hover and focus: the level rises one step (never past 8) and returns on leave. Footer "Theme" setting: the word in Geist Sans 15 px `--text-soft`, a 12 × 12 cell at the current level, then "Auto / Light / Dark" in Departure 11; hover: word to ink and the cell one level up. Tooltip "Theme: automatic" (1.7) on hover and focus of the nav icon.

**Site.** `ThemeToggle.astro` keeps `<i class="hn hn-sun">` and `<i class="hn hn-moon">` (asserted strings) and `aria-live="polite"`: `.hn-sun` becomes the 2 px outline square, `.hn-moon` the fill layer whose level follows `html[data-theme-preference]` (`SiteHead` already writes `data-theme-preference` and `data-theme`): auto → `--dither-4`, light → hidden, dark → solid. The `.is-flipping` class (already added by the script for 260 ms) plays keyframes `theme-resolve-c 200ms steps(1)` (2 → 4 → 6 → final) replacing §25 `theme-dither` at 3 px. Footer: `SiteFooter.astro` adds `<i class="cell site-footer__theme-cell" aria-hidden="true">` before `data-theme-value`; CSS sets its level from `html[data-theme-preference]`. Supersedes §17 `.theme-toggle .hn*` and §25 theme rules. Contracts: unchanged.

#### 1.3 Motion control — B, static (resolved, §0.3)

**Design.** "Motion" Departure 11 ink, the 2-cell switch (20 × 11 frame, 7 px cells, 1 px gap), state word Departure 11. On 8·8, off 0·0 (the word `--muted`), reduced: dotted frame + 0·0 + "Reduced" word, control disabled. Click swaps cells in one step. 48 px tall, natural width. No transforms, no transitions on the control or its children.

**Site.** `MotionToggle.astro`: insert `<span class="motion-toggle__switch cells" aria-hidden="true"><i class="cell"></i><i class="cell"></i></span>` between name and state; keep the asserted text nodes `MOTION` and `ON` (CSS lowercases them visually; the contracts read `textContent`), `aria-pressed`, `aria-describedby="motion-toggle-description"`, `data-motion-toggle`, `hidden`. `lifecycle.js updateControls` sets `data-level` on the two cells (8/8, 0/0) and toggles `is-dotted` on the switch when reduced; it already writes the words. CSS: `.motion-toggle` min-height 48, `.motion-toggle__name` and `__state` Departure 11, `.motion-toggle__switch` frame. Supersedes §17 `.motion-toggle*`. Contracts kept exactly: `browser-contract` motion-control-* (one per page, ≥ 48 × 48, label "Motion", noun "MOTION" visible on every viewport, state "ON/OFF/REDUCED", description texts, `disabled` under reduced motion, hidden without JS, **no transform or transform transition on any visible child**, natural width > 48 on phones) and `scripts/motion-contract.mjs` (same expectations). The nav variant on tool pages keeps the same markup.

#### 1.4 Back to top — A

**Design.** "Back to top" Geist Sans 500 13 px `--text-soft` (ink on hover), then one 6 × 16 cell whose level is the page progress (0–8). No percentage. Click: native anchor to `#top` (works without JS; smooth scroll allowed here), the cell empties in 8 steps over 240 ms (30 ms each) as the page arrives; Enter empties it at once.

**Site.** `SiteFooter.astro` script: `count = 1`, `setLevel(cell, Math.round(progress * 8))`, drop the percentage text (`data-back-to-top-pct` stays empty; keep the span so the markup contract line is intact), add the click handler for the stepped emptying; the `aria-label="Back to top"` and "Back to top" text stay. CSS: `.site-footer__top` 13 px, `.site-footer__progress` cell 6 × 16 (`--cell-size: 6px`, height 16). Supersedes §17 `.site-footer__progress*`.

#### 1.5 Footer — hybrid (§0.2.1)

**Design.** Top padding 48 (B's 8 px grid: 6 × 8), hairline top edge. Four columns, headings Departure 11 `--muted`, 8 px below them, no rule. Links and settings: 48 px rows, Geist Sans 500 15 px `--text-soft`, 4 px left padding, ink on hover; hover marker: a 4 px wide column of 7 px cells (8 px pitch) on the row's left edge, arriving top → bottom 3 → 8 in 2 steps of 30 ms with an ease-out spread of 60 ms across the 6 cells (≈ 120 ms), leaving instantly; the label steps 8 px in 1 step; keyboard focus lands the column at 8 at once. Base row: 44 px top margin, hairline above, 13 px Geist Sans; logo 24 px. Columns 4 at ≥ 821, 2 at ≤ 820, 1 at ≤ 480 (new breakpoint for the footer only). No call-to-action band.

**Site.** CSS only, plus `cells.js`-driven markers: a small `motion/edge-marker.js` (batch 1, ~60 lines, port of `L3.mark` for B) that builds the cell column on `pointerenter`/`focusin` for `.site-footer .footer-links a, .site-footer__setting, .site-footer .motion-toggle` — **except the motion control** (contract: no transforms, and a column of cells appended to it would become a visible child; the motion control gets text-to-ink only). Selectors: `.site-footer__inner`, `.site-footer__columns` (keep the asserted `grid-template-columns: repeat(4, minmax(0, 1fr))` declaration inside our rule), `.site-footer__heading`, `.footer-links a`, `.site-footer__setting`, `.site-footer__base`. Supersedes §17 footer rules. Contracts kept: `verify-site` footer strings (`siteLinks`, labels, `<MotionToggle`, `data-theme-toggle`, `.site-footer__columns`, the 4-column declaration).

#### 1.6 Dialog — B (booking and walkthrough)

**Design.** Panel: `--paper`, 1 px `--ink` border, max 720 wide × 80 vh, no shadow, no backdrop blur. Header: a Departure 11 `--muted` label ("Booking" / "Walkthrough") above the h2 in Departure 22, a 48 px close icon button (1.12) with the 5 × 5 cell close icon, a 1 px hairline under the header (A, §0.1). Backdrop `--ink-46`. Open: B switch, `clip-path` from a 2 px line at the centre to full height in 4 steps over 240 ms (`steps(4, jump-start)`), content already in place; Enter/Space opens at once. Close: B afterglow 180 ms in 3 steps, then `close()`; Escape and backdrop click close at once; focus returns to the trigger.

**Site.** `SiteFooter.astro`: add `<p class="footer-booking-modal__kicker" aria-hidden="true">Booking</p>` in the header, replace the "×" text with `<span data-cell-icon="close">` (built by `cells.js createIcon` in the footer script); open/close animation classes (`is-opening` on `showModal()`, `is-closing` with `animationend` → `close()`; Escape path: `cancel` event → instant). Same in `CaseStudyPage.astro` for `.case-walkthrough-modal` (the "x" text close button becomes the icon button; keep `data-case-walkthrough-close`, `aria-label`). CSS: `.footer-booking-modal`, `.footer-booking-modal__header`, `.footer-booking-modal__close`, `.case-walkthrough-modal*`, keyframes `dialog-switch-on` (clip-path `inset(calc(50% - 1px) 0)` → `inset(0)`), `::backdrop`; motion off: `animation: none`. Supersedes the older modal rules (`--modal-backdrop`, `--modal-shadow`, `--footer-modal-blur` usages for these dialogs). Contracts kept: `browser-contract` booking dialog opens on the Cal link, close button works, focus restored; `verify-site` footer strings (`data-footer-booking-modal`, "Book a 30-minute call…", `url.searchParams.set("embed", "true")`).

#### 1.7 Skip link — A (new) and tooltip — A (new)

**Skip link.** `<a class="skip-link" href="#top">Skip to content</a>` as the first child of `<body>`, rendered by `SiteNav.astro` **before** `<header class="site-nav">` (so the header's brand → nav → controls order the contract checks is untouched). Visually hidden until `:focus`; then the A secondary button style (44 px, 1 px `--ink` border, paper, Geist Sans 500 15 px, 20 px padding) at `position:fixed; top:8px; left:8px; z-index: calc(var(--z-nav) + 1)`. Appears in 1 step. Press scale 0.97.

**Tooltip.** A small ink label (paper text, Geist Sans 500 13 px, 6 × 11 padding, no arrow) 6 px above the control, `role="tooltip"`, linked by `aria-describedby`; shows after a 300 ms hover rest (instantly if another tooltip closed < 400 ms ago) or at once on `:focus-visible`; Escape hides; appears and leaves in 1 step. `motion/tooltip.js` (~40 lines) enhances `[data-tooltip]`: it moves the element's `title` into the tooltip text and removes `title` (the no-JS fallback keeps `title`). Used on: the nav theme icon (`ThemeToggle.astro` adds `data-tooltip`) and the narrow case rail rows (batch 3); the case-evidence fix may add `data-tooltip` to `.case-live__open` in its renderer. The accessible name is never the tooltip.

#### 1.8 Primary and secondary buttons — A

**Design.** 44 tall, primary min-width 176, 1 px `--ink` border, paper, Geist Sans 500 15 px, 20 px side padding, 10 px gap between word and arrow. Hover: A marker, 4 px wide, full height, left edge, arrives in 3 steps (scaleX ⅓, ⅔, 1) at 40 ms = 120 ms, leaves in 1 step; the label steps 4 px aside in 2 steps of 60 ms; keyboard focus: marker at once, no label step. Press (`press.js`): fill in **reading order** through levels 2, 4, 6, 8 (4 steps of 20 ms, 80 ms spread, 160 ms total), the label inverts once the mean level ≥ 6, hold 200 ms, out in reading order 6 → 4 → 2 → 0 (40 ms steps, 160 ms). Plus `scale(0.97)` on `:active` (140 ms). Working: 2 × 2 quarter turn at 5 px cells (head every 3 ticks) + "Sending"; done: marker held, 5 × 5 check in `--signal-ok`, "Sent" for 1.5 s; disabled: dotted outline through `--dither-4`, muted text, `aria-disabled` + `aria-describedby` to a reason in 13 px `--muted`; error: border flashes `--signal-fail` twice at 120 ms then stays, sentence beneath. Phone (≤ 640): primary and secondary full width. Secondary: same box, no min-width, same press to level 8.

**Site.** CSS: `:root [data-ascii-action]:is(a, button)` 44 px, `[data-ascii-action="primary"]` 176, `::after` marker 4 px (`--marker-a`) with `transition: transform 120ms steps(3)` on hover and `transition: none` on `:focus-visible`, `> .fill-label` `translateX(var(--label-a))` in `steps(2)` 120 ms, `:active:not([aria-disabled="true"])` scale 0.97, `.is-inverted > .fill-label` (replaces `.is-filling` as the inversion trigger). `press.js`: timings from `--press-a-*`, `order: "reading"`, `levels: [2,4,6,8]`, hold 200, out `[6,4,2,0]`; `workingAndDone`: loader at 5 px cells, done hold 1500, hold the marker while `data-press-state="done"` (CSS: `[data-press-state="done"]::after { transform: none }`). `cells.js fillLayer.to` gains `levels` (an explicit level path), `stepMs`, and an `is-inverted` toggle when the mean level ≥ `invertAt` (default 6); the default 8-step interpolation stays for callers that pass no path. Supersedes §18 `[data-ascii-action]` sizing and marker rules (kept for everything not re-declared). Contracts: none asserted on button size; `browser-contract` touch targets are only checked on nav links and the motion control.

#### 1.9 Quiet action — A

**Design.** Word Geist Sans 500 15 px, 44 px tall, no box; A soft rule 2 px level 3 at 8 px tile, 10 px below the baseline box; hover and focus: rule solid in 1 step, the arrow `→` nudges 2 px then 3 px over 120 ms (`steps(2)`) and stays at 3 px while hovered; leave: back in 1 step. Pressed: the rule thickens to 3 px for 100 ms. Disabled: rule level 2, word muted, reason in words.

**Site.** CSS on `[data-ascii-action="text"]`, `.labs-item__action`, `.homepage-timeline__related`, `.project-overview__link`: re-declare `::after` (2 px, `--dither-3`), hover `mask: none`, arrow `span[aria-hidden="true"]` transition `transform 120ms steps(2)` to `translateX(3px)` replacing keyframe `arrow-nudge` (240 ms, 3 steps). Supersedes §18 quiet rules and the `arrow-nudge` block near line 17443.

#### 1.10 Inline link in prose — A

**Design.** Ink text, 2 px dotted underline at 4 px offset, solid on hover/focus in 1 step; external links get ` ↗` after the text in Geist Mono (`content: " ↗" / ""`, so it is not read aloud). Visited not drawn differently.

**Site.** Already matches apart from the arrow: one rule in section 28 for the same prose scope as the rule at ~17003, `a[href^="http"]:not([href*="traykov.cc"])::after`. Nothing superseded.

#### 1.11 Arrows and back links — A

**Design.** Arrows Geist Mono 400 at the surrounding size, `aria-hidden`. Back link "← Work" Geist Sans 500 14 px with the A soft rule; hover solid; the arrow nudges **left** 2 steps over 120 ms (−2, −3 px).

**Site.** `CaseStudyPage.astro`: `caseBreadcrumb.label` splits into `<span class="case-breadcrumb__arrow" aria-hidden="true">←</span> {title}` (the private template path uses the same component; verify-site only asserts `case-breadcrumb` exists in CSS). Same for `.note-page__back a` (`notes/[slug].astro`) and `.pc-kicker a`. CSS: arrow `display:inline-block; transition: transform 120ms steps(2)`, hover `translateX(-3px)`. Supersedes nothing (adds to §21/§27 rules).

#### 1.12 Icon button — A

**Design.** 44 px square, 1 px `--ink` border, paper, 5 × 5 cell icon at 3 px (15 px). Hover: A marker 4 px left (inset, inside the border); focus ring 2 px. Pressed/toggled on (pause): solid ink, icon in paper, the icon morphs in 3 steps over 120 ms (`morphIcon`). Press scale 0.97. Disabled: dotted + reason via tooltip and `aria-describedby`. Names: "Play video / Pause video / Open full screen / Close".

**Site.** `.cell-player__play` (44 ✓; hover changes from the 6 px inset marker to a 4 px `::after`), `.overview-video__toggle` (keep the SVG glyph markup for now at 15 px, hover marker instead of the under-marker; a cell icon swap needs `overview-video.js` and is not worth touching the playback contract), `.footer-booking-modal__close`, `.case-walkthrough-modal__close`. (`.case-live__open` gets the same treatment from the case-evidence fix inside the round 4 block.) CSS in section 28 under a shared selector list. Supersedes §23 `.overview-video__toggle` hover and the `.cell-player__play` hover rule.

#### 1.13 The one big link in a case — C · handled by the case-evidence fix

Resolved pick for that implementer (`case-link` fence, round 4 block). Not part of batch 1.

**Design.** Departure 44 (33 on phones) in `--ink`, no blue, 12 px bottom padding, a 6 px C band at level 6 (`--dither-6` at `--tile-c`) beneath; hover and focus: the band resolves to 8 (solid) in 1 step after 50 ms, the arrow `↗` nudges 3 px in 1 step at 100 ms. **Band only (C-1), no text inversion** (the ladder reserves a fill behind text for pressed/selected); see §5. Caption below in Departure 11 `--muted`. Focus ring ink.

**Site (for the fix).** In the round 4 block: `:root .case-study-body .case-link .case-link__a` (colour ink, no `text-decoration`, `::after` band at `--tile-c` from §0.5, which batch 1 defines first), `:is(:hover, :focus-visible)` without a background, `:focus-visible` outline ink, `.case-link > span` Departure 11, the 640 px size 22 → 33. `--link-blue` can stay declared. Contracts: none.

#### 1.14 Tabs and segmented controls — A

**Design.** Group: 1 px `--line` hairline border, **no dividers**; options 44 px, 16 px side padding, Geist Sans 500 14 px `--text-soft` (ink on hover). Selected: solid ink, paper text, filled in reading order 2 → 4 → 6 → 8 over 160 ms (20 ms steps, 80 ms spread); the old option empties in 1 step. Hover on an unselected option: A under-marker (2 px solid) in 3 steps / 120 ms, leaves in 1 step. Panel change: A snap, 1 step after 120 ms (no band sweep). Arrow keys, Home, End: selection changes on the next frame, no fill animation. Phone: options wrap to a second row; the group keeps its border. The `small` tag ("Before") stays Departure 11.

**Site.** `segmented.js`: fill size 6 → 8 px cells, `order:"reading"`, `levels:[2,4,6,8]`, `stepMs:20`, `total:80`; old option `fill.to(0, {levels:[0], total:0})`; replace the `is-sweeping` panel class with `is-snapping` (keyframe `pick-snap-a`, 120 ms, 1 step); a `keydown` flag on the group makes the next `sync` instant. CSS: the §18 group selector list (`.case-switch`, `.breathing-grid__variants`, `.breathing-grid__inspector > [role="group"]`) plus `.playground-flip-tabs`, `.pave-turntable-tabs`, `.pc-controls`: border `--line`, `> button { border-right: 0; min-height: 44px }`, `::before` wipe removed (`content: none`), `::after` under-marker 2 px (`--rule-a`), phone `flex-wrap: wrap`. Supersedes §18 segmented rules, `mark-wipe-in`, and the §24 `[data-segmented-ready]` colour rules (re-declared). Contracts: none assert the sweep.

#### 1.15 Select — A

**Design.** Native select in tool panels: 40 px (36–40 allowed there), 1 px `--line` border, Geist Sans 500 14 px, 12 px left padding, **44 px reserved end padding**, a 5-cell chevron (15 × 9, 3 px cells) drawn 14 px from the right edge, never touching it. Listbox variant (banner quality): trigger as above at 44 px; list opens under it with an A switch (clip-path, 4 steps, 200 ms; keyboard open at once), 1 px `--line` border, options 44 px, the selected option carries a held 4 px A marker, the highlighted option a 2 px under-rule; arrows move at once, Enter picks, Escape closes.

**Site.** CSS: the §23 select rule's two-gradient chevron is replaced by one crisp SVG data-URI chevron background (`shape-rendering="crispEdges"`, 15 × 9) at `calc(100% - 14px) 50%`; `padding-right: 44px`; border `--line`. Banner: `.ascii-banner-studio__quality-trigger`, `__quality-listbox`, `[role="option"]`, `[aria-selected="true"]` (`box-shadow: inset 4px 0 0 var(--ink)`), `.is-active` under-rule; the listbox's open animation class is added by `AsciiBannerStudio.astro`'s own script where it sets `aria-expanded` (two lines). Verify the longest labels ("Presentations in Code"; the longest turntable example name in `/playground/`) at 375 px. Supersedes §23 select rules. Contracts: `AGENTS.md` select rule holds; no script asserts the chevron.

#### 1.16 Checkbox — A

**Design.** 18 × 18, 1 px `--ink` border, square. Checked: fills in 3 dither steps (3, 6, 8) at 40 ms, then a 5 × 5 check in paper at 2 px cells; unchecking empties in 1 step. Label Geist Sans 14 px; the whole label is the 44 px hit area (36 px inside tool panels). Focus ring on the box. Keyboard (Space): the final state at once.

**Site.** CSS on the §23 checkbox selector (`.playground-controls, .pave-turntable-controls, .ascii-banner-studio__controls input[type="checkbox"]`) and `.control-toggle`: `:checked` → `background: var(--ink)` plus the check as an SVG data-URI background (5 × 5 at 2 px = 10 × 10, paper), and `animation: check-fill-a 120ms steps(1)` whose frames set `mask` to `--dither-3`, `--dither-6`, none. The inset `box-shadow` check of round 3 goes. The switch form (`role="switch"`) is not used on the site; nothing added.

#### 1.17 Slider — B

**Design.** 24 cells of 7 px on an 8 px pitch (1 px gaps), 12 px tall, left-aligned (191 px track); filled cells level 8, the leading cell dithered to the fractional value (1–8), the rest 0. Value in Departure 11 right of the label. Hover: the leading cell rises one level (max 8). Keyboard: one cell per arrow press (`step` snapped to 1/24 of the range), repainted next frame. Drag: 1:1, no transition. Disabled: cells at level 1 and a dotted frame; the input `aria-disabled`. Focus: 2 px ring around the track, offset 2. Hit height 36 inside tool panels.

**Site.** `cell-range.js`: `track.style.setProperty("--cells", 24)`, hover handlers for the +1 level, arrow-key snapping (only when the input has no finer `step` the owner relies on; the Playground sliders use arbitrary steps, so snap by **value**, not by cell, where `step` is set and keep the cell-level mapping visual), `is-disabled` → `is-dotted`. CSS: `:root .cell-range { grid-template-columns: repeat(24, 7px); gap: 1px; width: max-content; height: 12px }`, `.cell-range .cell { width: 7px; height: 12px }`, `.cell-range.is-disabled .cell { … level 1 }` + dotted frame; the playground/turntable native range styling (§23 `::-webkit-slider-*`) is left for the no-JS case. Supersedes the §24 `.cell-range` sizing.

#### 1.18 Disclosure — A

**Design.** The summary is a quiet action (1.9) with a 5 × 3 cell chevron (3 px cells) after the word that morphs to `chevronUp` in 3 steps over 120 ms on pointer toggles (keyboard: swapped at once); the panel switches open with an A switch (clip-path from the summary edge, 4 steps, 200 ms) under a 1 px hairline; closing is instant (native `details`).

**Site.** `.notes-search summary`, `.pc-shell details > summary` (`pc-disclosure`), the studio's "More controls" summary (`app.css`, batch 3). CSS: summary rule 2 px level 3 + solid on hover, `::after` chevron becomes a cell icon host; a small enhancement in `motion/disclosure.js` (~30 lines) builds the icon with `createIcon`/`morphIcon` and adds `is-switching-on` (keyframe `switch-a` 200 ms `steps(4)`) to the first child after `summary` on pointer-driven `toggle`. Supersedes §27 `.pc-shell details > summary::after` (the SVG chevron).

#### 1.19 Page transition — A

**Design.** Same 200 ms, 4 steps of 50 ms (protected timings, untouched), at a **4 px tile** in both themes so the dissolve reads as a soft fade in steps.

**Site.** Section 28 re-declares `@keyframes page-continuity-in` and `@keyframes motion-editorial-in` (last definition wins) with `mask … / var(--transition-tile) var(--transition-tile)`; the `::view-transition-*` rules and `public/page-transitions.js` are not edited. Supersedes the §26 keyframes.

#### 1.20 Reveal with stagger — A

**Design.** Text and blocks: A snap, 1 step from hidden to shown after the stagger delay (no blink), 120 ms. Media: A sweep, 6 bands, 300 ms. Group stagger: cumulative gaps 70, 55, 45, 40, 35, 30 ms (0, 70, 125, 170, 210, 245, 275 ms), capped at 7 items, within the 400 ms budget. Reduced motion and no JS: everything shown; history restores land whole.

**Site.** CSS: `html[data-motion="ready"] [data-reveal][data-reveal-animate="true"] { animation: pick-snap-a var(--snap-a) steps(1) both }`, media variant `mark-sweep var(--sweep-a) steps(6)`; `.is-snapping` → `--snap-a`. `reveal.js decorateGroups`: the cumulative gap table replaces `index * 60`. Keep the asserted strings (`data-reveal` in CSS; `reveal.js` must not mention `.case-study-body` or `.note-body`). Supersedes the §16 reveal animation rules. Contracts kept: `browser-contract` reduced-motion reveals exposed and ≤ 1 ms durations (the §16 reduced-motion block still zeroes animations; our rule inherits it because the selector list is re-declared inside a `prefers-reduced-motion` block too).

#### 1.21 Point refresh on hover — B

**Design.** 8 px cells (7 px drawn on an 8 px pitch), levels 5 → 3 → 1, 40 ms per step, delays on an ease-out of distance from the pointer over 360 ms. Fine pointers only, motion on, once per 600 ms per target, never over text. No rule under the media (§0.1).

**Site.** `point-refresh.js`: `CELL = 8` (draw 7 × 7 at an 8 px pitch), the rest unchanged; the featured-image dissolve block in the same file is removed in batch 2 (1.44 cover). Targets stay `.overview-video__frame, .labs-item__screen`.

### Batch 2 · Lists, Home, case evidence (section 29)

#### 2.1 Notes rows, search, count, empty state — A (empty state B)

**Design.** Row: one link, 66 px tall, hairline beneath; title Departure 22, meta (date · read time) Geist Sans 500 13 px `--muted` right-aligned, arrow `→` Geist Mono 22 at the right. Hover/focus: A marker 4 px on the row's left edge (3 steps, 120 ms; instant on focus), title steps 4 px in 2 steps; leave in 1 step. Search: "Search notes" is a quiet-action summary (1.18); the field is 44 px, 17 px text, 1 px hairline under it, on focus a 2 px ink line draws left → right in 4 steps over 160 ms (keyboard focus: at once). Count "3 notes / 1 note / No notes match" Geist Sans 500 13 px `--muted`, polite, one update per change. Filter: rows that stop matching leave with the A afterglow (120 ms, 2 steps), returning rows snap in with the A stagger; the empty state appears after the afterglow. Empty state (B): a 5 × 3 block of 7 px cells breathing on the tick (diagonal wave 1 → 2 → 3 → 2 one step per 3 ticks; at rest and with motion off: a fixed 1·2·3 diagonal), "Nothing here yet" Departure 22, one sentence 16 px. Phone (≤ 640): meta under the title, row 88 px.

**Site.** `notes/index.astro`: add the arrow span back into view (it exists, hidden by §25 `display:none`), nothing else (no `data-reveal` on rows, no `<dl>`, `<h3>{note.title}</h3>` stays). CSS: `:root .notes-list__item > a` (grid `minmax(0,1fr) auto 22px`, 66 px, padding-left 10), `::before` marker 4 px, `h3` step 4 px, `.notes-list__meta` 13 px sans (supersedes the Departure 11 meta of §20/§25), `.notes-list__arrow` shown, `.notes-search input` line (160 ms `steps(4)` replaces 180 ms `steps(9)`), `.notes-search output` 13 px sans, `.notes-empty__icon` → `--cells: 5; --cell-size: 7px; --cell-gap: 1px`, `.notes-empty p` 16 px. `notes-search.js`: build the 5 × 3 breathing icon through `loader.js` (`breathe` variant, rest 1·2·3) instead of the fixed 3 × 3 levels; the afterglow class uses `--afterglow-a`; the returning rows get the cumulative gap delays. Supersedes §20 and §25 notes rules. Contracts kept: `verify-site` Notes strings; `browser-contract` notes route selectors (`#notes-title`, `.notes-directory`, `.notes-search`).

#### 2.2 Labs rows — A

**Design.** A list, one row per tool, hairline between rows: the real screen on the left at **132 px wide** (4:3 as captured, 132 × 99; see §5 for the size question), title Departure 22, body 17 px `--text-soft` (46 ch), "Open →" quiet action; row padding 16 px 0 16 px 12 px; hover/focus: A marker on the row's left edge, the screen frame goes `--ink`, the quiet rule goes solid, arrow nudge; no step aside of the copy (the marker is enough at this width). Entrance: screens sweep in (A sweep, 6 bands, 300 ms) with the A stagger across the four; point refresh B on hover. Phone (≤ 700): screen above the text, full width.

**Site.** CSS on `:root .labs-item__link` (`grid-template-columns: 132px minmax(0,1fr) auto`), `::before` marker 4 px at `left: 0` (row padding-left 12), `> *` transition removed, `.labs-item__screen` (`aspect-ratio: 4 / 3` stays), hover rules, phone grid. The `data-reveal-group` on `.labs-list` already staggers; `.labs-item__screen img` gets `data-reveal="scan"` via the existing `[data-motion-artwork]`? No: add `data-reveal="scan"` to the `span.labs-item__screen` in `labs/index.astro` so the sweep plays on the screen, not the row. Supersedes §19 and §25 labs rules (and their block's `:root .labs-list { border-top: 0 }` is compatible). Contracts kept: Labs strings and the ≤ 40 KB screens (no recapture needed; the screens are not re-rendered).

#### 2.3 Published items (About) and experience rows (CV) — A

**Design.** Date column Departure 11 `--muted`, 88 px; title Departure 22; body 17 px `--text-soft`; a 44 px secondary button on the right where there is a link; hover marker on the button only; row padding 22 px 0; hairline beneath. Phone: one column, button left-aligned.

**Site.** CSS: `.experience-item` grid `88px minmax(0,1fr) auto`, `.published-item` the same without the date column; keep `.experience-item h2` and `.notes-list__item h3` as literal selectors in our section (asserted strings). Supersedes the older `.published-item a:not([data-ascii-action])` hover rules. `cv.astro` and `about.astro` markup unchanged.

#### 2.4 Home entry rail — B

**Design.** Each entry: a stack of three 7 px cells (1 px gaps, 7 × 23) on the left; current 8·8·8, earlier 3·3·3, later 0·0·0; a Departure 11 `--muted` counter `01` before the label; label Geist Sans 14 px `--muted`, current ink 500. Hover (pointer): the stack fills to 8 top → bottom, 3 steps of 30 ms; leave: back to the state levels at once; keyboard focus: at once. Click scrolls the page, never the rail. ≤ 900: a horizontal strip of 48 px items, counter + label, no cells.

**Site.** CSS only on `:root .homepage-timeline__toc a` (grid `7px 2.4ch minmax(0,1fr)`), `::before` = the stack (7 × 23, `mask: linear-gradient(#000 7px, transparent 7px) 0 0 / 100% 8px repeat-y`, composed with `--dither-3` for read), `[data-rail-state="read" | "current"]` levels, counter via `::after { content: counter(entry, decimal-leading-zero) }` on `li` counters, hover keyframe `stack-fill-b 90ms steps(3)` (clip-path inset from the bottom 100% → 66% → 33% → 0 on an ink layer), `@media (max-width: 900px)` strip. `homepage-timeline.js` unchanged (`data-rail-state` already written). Supersedes §24 entry-rail rules. Contracts kept: `browser-contract` homepage timeline (six targets, `aria-current`, same-path anchors).

#### 2.5 Home work entry — A

**Design.** Date Geist Sans 500 13 px `--muted` (not Departure), title Departure 33 (22 on phones), summary 17 px / 1.6 / 64 ch. Lead media in a 1 px hairline frame, **no strip on the frame**; the player is the 44 px toggle (1.12) plus one 4 × 16 progress cell beside it inside the frame's bottom-left corner. Caption label 13 px `--muted`. Context `dl`: terms 13 px `--muted`, values 17 px, each pair on an A soft rule. Impact: a two-column stat row between hairlines (terms Departure 22, descriptions 15 px `--text-soft`); one column on phones. "Read full case study →" quiet action. Entrance: title and date first, media sweeps 50 ms later, summary 120, caption 170, context 210, impact 245, link 275 ms; point refresh B on hover.

**Site.** `ProjectOverview.astro` / `HomepageTimeline.astro`: add `data-reveal` + `data-reveal-delay` to the pieces that stagger (they are not in `notes/index.astro`, so the asserted "no `data-reveal="rise" data-reveal-delay`" string is untouched); `OverviewVideo.astro` unchanged (contract strings). `video-cells.js stripFor`: build one `.overview-video__cell` (4 × 16) instead of the 48-cell strip and set its level from `currentTime / duration`. CSS: `:root .homepage-timeline__date` 13 px sans, `.project-overview__copy h3` 33, `.project-overview__context dt/dd`, `.project-overview__impact`, `.video-cells--strip` hidden if any remain. Supersedes §23/§24 overview rules and the §25 strip rule. Contracts kept: `browser-contract` homepage playback (toggle visible, play/pause semantics are in `overview-video.js`, untouched).

#### 2.6 Private work link — A

**Design.** As today: hairline top, kicker 13 px `--muted` (sans, not Departure), h2 Departure 22, paragraph 17 px, secondary 44 px. Hidden until configured.

**Site.** CSS: `.private-work-link > p:first-child` 13 px sans. Supersedes the §18 kicker rule.

#### 2.7 Hero — A

**Design.** Breadcrumb 14 px with the A soft rule and the left-nudging arrow. Meta line Geist Sans 500 13 px `--muted`: one 8 × 8 cell at the status level (launched 8, closed beta 5, prototype 3, archived 1) + the word in ink, " · 15 min read" plain. h1 Departure 66 / 1.05 with 44 px above; summary 17 px / 1.6, 64 ch, 22 px below the title. Entrance: breadcrumb, meta, title, summary snap in reading order at 0, 70, 125, 170 ms. Phone: h1 44, summary 17.

**Site.** `CaseStudyPage.astro` (`.case-hero-copy`): move `data-reveal="rise" data-reveal-page-enter="true"` from the container to its four children with `data-reveal-delay` 0/70/125/170; `.case-status .cell` 8 px. CSS: `.case-hero-meta` 13 px sans (supersedes §21 Departure 11), `.case-status` 13 px, `.case-hero-summary` 17 px, h1 margin. Contracts kept: `#case-title`, the `[slug].astro` strings; `browser-contract` reduced-motion reveal exposure (each child still lands `data-reveal-state="in"`).

#### 2.8 Facts list — A

**Design.** Rows on A soft rules (2 px, level 3, 8 px tile) above each row; term Geist Sans 500 13 px `--muted` in a 120 px column, value 17 px, 44 px row height, 11 px padding below.

**Site.** CSS on `:root body .case-study-body #bluf + p + ul li` (grid `120px minmax(0,1fr)`) and `::after` (2 px, `--dither-3` at 8 px) and `strong` (13 px sans). Supersedes §21/§25 facts rules. The renderer contract (`#bluf + p + ul`) is untouched.

#### 2.9 Figure captions — B · handled by the case-evidence fix

**Design (resolved pick for the fix).** 1 px hairline above the caption (A boundary, §0.1; the B cell rule is not used), 11 px above and below; lead Departure 11 ink with an automatic counter "Fig. 02 · " before it (decorative, CSS counter on `figcaption::before`, `decimal-leading-zero`); note Geist Sans 15 px `--text-soft`; one column, no 7ch label column. Image-card captions (`.case-image-card figcaption > span:first-child`) keep Departure 11. Pave's new look keeps dropping the counter (its exception already lives in the round 4 block). Supersedes the §25 caption grid (7ch column, 500 15 px lead) once the fix lands; batch 2 does not touch captions.

#### 2.10 Compare switch, drag slider, x-ray lens — B · handled by the case-evidence fix

**Design (resolved pick for the fix).** Compare: the switch is the shared A segmented group from batch 1 (1.14: hairline group, solid selection filled in reading order, A 2 px solid hover under-rule, no position rule) with Departure 11 `--muted` counters `01`, `02` before the labels (CSS `counter()` on the buttons, decorative); the stage change keeps the B sweep (10 bands, 360 ms) on pointer clicks and is instant on keys; without JS every panel shows. Drag slider: the divider is a 3 px wide column of 4 px cells with 1 px gaps at level 8 (mask `linear-gradient(#000 4px, transparent 4px) 0 0 / 100% 5px repeat-y`, never `repeating-linear-gradient`); grip 48 px square, 1 px `--ink` border, paper, with a 5 × 3 cell chevron pair (`◂▸` drawn as 4 px cells); dragging inverts the grip; corner labels Departure 11 on paper with a hairline; a 24-cell row of 7 px cells under the stage shows the split (filled left of the split, leading cell dithered to the fraction), painted on every `set()`; the real range keeps `aria-label` and the stage focus ring. Lens: 240 px window, 2 px `--ink` frame whose four corners are 8 × 8 solid cells; the frame snaps to the 8 px lattice as it follows the pointer; **outside the window the picture is dimmed** (Alexander's note to the fix: a paper cover at level 2, 8 px tile, over everything but the window, drawn with an `evenodd` clip-path so it never covers text); "Show all layers" stays a plain-word button for keyboard and touch. Batch 2 does not touch any of this.

#### 2.11 Video player and overview strip — B

**Design.** Bar: 48 px play icon button (1.12 at 48, B size), 48 cells (`minmax(0,1fr)`, 1 px gaps, 12 px tall: played solid, buffered level 2, leading cell dithered), time Departure 11 tabular. Playing: the buffered cells breathe 2 ↔ 3 on the tick (every 10 ticks). Loading (after play is requested and `readyState < 3`): a 12-cell sweep loader (band 3·6·3 walking one cell per tick) replaces the track and "Loading video" sits in a polite region once. Overview videos: today's 4 px 48-cell strip on the frame's bottom edge **only where the entry is not the A work entry** — on Home the work entries are A (2.5), so the strip is gone there; case-study overview videos (`pave-loading-animation`, breathing grids process) keep the B strip. Native controls without JS.

**Site.** `video-cells.js`: play button 48 px, breathing on `onTick` while playing, loading sweep via `loader.js` on `waiting`/`play` until `canplay`; `stripFor` keeps the strip for `.case-study-body [data-overview-video-media]` and builds the single cell for Home (2.5). CSS: `.cell-player` grid `48px …`, `.cell-player__play` 48, `.video-cells--strip` scoped to `.case-page`. Supersedes §25 player sizes.

#### 2.12 Image grid and gallery — A

**Design.** Hairline frames, 11 px gaps, captions as 2.9; entrance A sweep per image in reading order within 400 ms; the gallery theme switch is 1.14. Grid collapses to one column ≤ 640.

**Site.** CSS: `.case-image-grid__items { gap: 11px }`, `.case-image-card` hairline, no hover lift/shadow (older rules at ~1228–1260 are neutralised), `img[data-reveal]` sweep at 6 bands (`content.ts` already emits `data-reveal` on figures? If not, the `[data-reveal-media]` path in `reveal.js` handles `figure` elements marked by the renderer; no renderer change). Supersedes the older `.case-image-card:hover` rules.

#### 2.13 Live embed — A · handled by the case-evidence fix (frame, corner button, deck, loading); tag chips in batch 2

**Design (resolved pick for the fix).** Frame 1 px hairline, `--card-media-surface` behind; the corner full-screen link is the A icon button at 44 px (1 px `--ink` border, paper, 15 px glyph, hover = 4 px left marker in 3 steps, **no inversion**, `scale(0.97)` on press) with the A tooltip "Open full screen" (batch 1 ships `motion/tooltip.js`; the fix adds `data-tooltip` to the link in `renderCaseLiveFrame`); deck arrows under the frame are 44 px secondary-look buttons (hairline border, paper, hover marker) with the slide count in Geist Sans 13 px `--muted`; loading: "Loading demo" Geist Sans 13 px centred on paper with a 2 × 2 quarter turn at 5 px cells (`loader.js`, batch 2) until the iframe's `load`; entrance A sweep (6 bands, 300 ms).

**Batch 2 (shared, outside the round 4 block):** status tag chips `.case-tag` as A chips: one 8 × 8 cell at the status level + the word in Geist Sans 500 13 px (Before / Concept / Rejected keep the dotted outline cell); supersedes the §21 Departure 11 chip. That selector is round 3 (`:root .case-tag`), not in their block.

#### 2.14 Pull quote and quotes carousel — A · handled by the case-evidence fix

**Design (resolved pick for the fix).** Pull quote: no left border and no dither bar; a 2 px A soft rule (level 3, 8 px tile) above and below with 11 px gaps; quote Geist Sans 22 / 1.4 (18 on phones) ink; source Geist Sans 500 13 px `--muted`. Carousel: hairline above; meters are 2 px `--line` hairlines whose fill goes solid over the 5.2 s dwell in 13 steps (`steps(13, end)`, 400 ms each); the step and pause buttons are 44 px secondary-look buttons (hairline border, paper, A hover marker, no inversion, words "Previous / Next / Pause" rather than arrows if the renderer is touched anyway); change: the outgoing quote leaves with the A afterglow (120 ms, 2 steps), the incoming snaps in (1 step after 120 ms) instead of the 7-step dither; autoplay pauses off-screen, on hover/focus and with motion off; keyboard steps swap at once. Batch 2 does not touch these selectors.

#### 2.15 Stat row — B · handled by the case-evidence fix (CSS); the count in batch 2 (`count-up.js`)

**Design (resolved pick).** Three columns (two on phones) on an ink hairline; numerals Departure 44 (33 phone) tabular; label Departure 11 `--muted` / 1.5 (not sans); caveat (`.case-stat p`) 13 px. Count: one integer per tick (40 ms) from 0 to the value, capped at 24 ticks (60 → 24 steps of 2.5, rounded on screen), linear, no glyph noise; decimals keep their precision; the final figure is in the DOM at rest. Meter: **only where the figure is a percentage**, a 16-cell row of 7 px cells under the numeral at level 8 filled to the share (42 % → 7 cells lit), filling with the count; no rule under other numerals (§0.1, and see §5). Motion off: final figure, meter full.

**Split.** The fix owns the CSS in the round 4 block (`.case-stat span` → Departure 11, `.case-stat__meter { --cells: 16; --cell-size: 7px; --cell-gap: 1px; height: 3px }`). Batch 2 owns `src/scripts/motion/count-up.js` (round 3, not in the fix's files): `steps = min(24, ceil(target))`, `stepMs: 40`, linear; when the suffix starts with `%`, it appends `<span class="case-stat__meter cells" aria-hidden="true">` with 16 cells and paints them with the count. Agree the class name `case-stat__meter` with the fix implementer before batch 2 starts. `.case-stat p` stays a literal selector somewhere in `global.css` (asserted string; it is in the older sections today).

#### 2.16 Day-cell timeline — B · handled by the case-evidence fix

**Design (resolved pick for the fix).** Day cells 7 px on an 8 px pitch (1 px gaps) at level 1, lighting to **level 3** (not 5) one per 30 ms as the fill reaches them; dotted spine at level 3 behind; event mark 12 px, solid when reached; the current mark blinks between level 8 and level 3 (10 ticks on, 10 off) by a mask swap, not opacity; title Geist Sans 500 16 px, body 16 px `--text-soft`, dates Departure 22 (no scramble on the date: text is never scrambled in B status pieces), relative label Departure 11; entries hidden until reached, visible at rest and without JS; the blink stops on the solid frame with motion off. Batch 2 does not touch the timeline.

#### 2.17 Case cover / hero media entrance — A

**Design.** A sweep, 6 bands, 300 ms, once per visit when the cover enters the view; no dissolve. Intrinsic size from frame one; reduced motion and no JS show the image.

**Site.** `CaseStudyPage.astro`: `figure.case-cover` gets `data-reveal="scan"`; `point-refresh.js`: delete the `FEATURED` dissolve block (the `.case-hero-media` selector has no live use). CSS: `.case-cover[data-reveal-animate="true"]` uses `--sweep-a` and `steps(6)`.

### Batch 3 · Case navigation, feedback, tools (section 30)

#### 3.1 Sibling nav — C

**Design.** 2 px solid `--ink` line above, hairline below; two halves 99 px tall; label Departure 11 `--muted` ("Previous case" / "Next case"); title Departure 33 (22 on phones); arrows `←`/`→` Geist Mono inside the title, nudging toward their edge 4 px in 1 step then settling at 3 px; the left half's marker is a 6 px C marker on its **left** edge, the right half's on its **right** edge, arriving through levels 3 → 6 → 8 at 50 ms (150 ms) and leaving 6 → 3 → 0 in 2 steps of 40 ms; keyboard focus: marker solid at once. Empty side: dotted outline at the 12 px tile + "More case studies coming soon" 13 px. Phone (≤ 640): stacked, each 66 px.

**Site.** CSS on `:root .case-sibling-nav` (border-top 2 px ink; keep the literal `.case-sibling-nav` selector), `a` (99 px), `span` 11, `strong` 33 (22 phone), `a::after` as the level-stepped marker (`background: var(--ink); mask: var(--dither-3)…` with keyframes `marker-c-in 150ms steps(1)` and `marker-c-out 80ms steps(1)`; the round 3 `scaleX(0)` marker is replaced by `transform: none; visibility` states), `.case-sibling-nav__empty::before` mask at `--tile-c`. Supersedes §21/§25 sibling rules.

#### 3.2 Contact prompt — A

**Design.** Hairline above; h2 Departure 33 (22 on phones); sentence 17 px `--text-soft`; primary "Write to me" and secondary "Book a call" side by side with an 11 px gap; stacked full width on phones. Compact variant (mini-studies): one primary "Book 30 minutes".

**Site.** CSS: `:root main .case-contact-prompt:not(.case-contact-prompt--compact) h2` 33 (supersedes §25's 22), `.case-contact-prompt__copy p` 17 px, `.case-contact-prompt__actions { gap: 11px }`, phone stack. Contracts kept: `data-booking-modal-open` on the booking link, `href={bookingPageUrl}` (component untouched); `browser-contract` synapse-sys booking path.

#### 3.3 Case index, desktop rail — hybrid (§0.2.2)

**Design.** Head: "On this case" Departure 11 ink, "28% read" Departure 11 `--muted`, space-between, hairline beneath. Rows 33 px: a 4 × 17 reading cell (`--cell-empty`; current fills 1–8 at 4 px tile as the section is read; read = level 3), **no counters**, title Geist Sans 14 px / 17 px `--muted` (current ink 500, read `--text-soft`); hover and focus: title ink only, no marker; the rail keeps the current row in view without moving the page. Narrow desktop (901–1180): cells only (titles visually hidden), the A tooltip shows the title on hover/focus.

**Site.** CSS on `:root .case-toc[data-case-index="cells"] > p` (Departure 11), `.case-toc__read`, `a` (grid `4px minmax(0,1fr)`, 14 px, min-height 33), `a::before` 4 × 17, `a::after { content: none }` (removes the CSS counter; link text never changed, so the private template and `verify-site` are unaffected), `@media (max-width: 1180px)` cells-only + visually hidden titles. `case-index.js`: unchanged except adding `data-tooltip` (1.7) to each link at ≤ 1180. Supersedes §24 rail rules. Contracts kept: `browser-contract` case reading tools (sticky, anchors, exactly one `aria-current`, desktop rail top = heading scroll margin, reduced-motion active-link transition ≤ 1 ms — keep `transition: none` on `a` and `a::before`).

#### 3.4 Case index, phone strip and sheet — hybrid (§0.2.3)

**Design.** ≤ 900: strip 55 px on paper with a hairline beneath: section number Departure 22 (`··` before the first section), current title Geist Sans 500 14 px resolving through the dither mask (2 → 4 → 6 → none, 3 steps of 50 ms) when it changes, "Contents" / "Close" Geist Sans 500 14 px with the A soft rule under the word (solid while open; no inverted block), a 12-cell progress row of 12 px cells (level 8 filled, leading cell dithered) on the strip's bottom edge. Sheet: resolves from a 2 px line through the dither in 4 steps over 240 ms (clip-path + mask steps), rows 48 px on hairlines, 15 px text, current row with a held 6 px C marker on its left edge, opened scrolled to the current row; close in 180 ms (afterglow) or instantly on Escape/keyboard; scrim = `--ink` at level 2, 12 px tile (8 px dark), covers the page below the strip. Section becomes current when its top passes 8 px below the strip (today's reading line).

**Site.** `case-index.js`: `progressCells` 12 (not 30); `resolveTitle` sets `data-level` 2 → 4 → 6 on `[data-case-toc-current]` instead of writing ░▓ characters (keeps `textContent` stable, so the inline script's `activate()` and the private template are unaffected); the sheet uses `is-sheet-on` with the new keyframe `sheet-switch-c` and adds a `.case-toc__scrim` element while open. CSS: the §24 phone block re-declared: `.case-toc__toggle` 55 px, `.case-toc__num` 22, `.case-toc__word` with `::after` soft rule and `[aria-expanded="true"]` solid (the inverted background goes), `.case-toc__progress` 12 columns × 12 px, rows 48 px with `::after` C marker, scrim. Supersedes §24 phone rules and `sheet-switch-on`. Contracts kept: toggle ≥ 48 tall and visible, `aria-expanded` "false" at rest, list `overflow-y: auto`, rows ≥ 48, no document horizontal overflow at 900 (the scrim is `position: fixed; inset: var(--strip-bottom) 0 0`, inside the viewport), Escape closes (inline script).

#### 3.5 Walkthrough trigger — A

**Design.** A secondary button (1.8, 44 px) "Watch the walkthrough" with a 5 × 5 play cell icon before the word; no poster, no avatar video on screen. Opens the dialog (1.6).

**Site.** `CaseStudyPage.astro`: keep the `<a class="case-walkthrough__trigger" href={study.walkthroughVideo} data-case-walkthrough-open …>` and its `<video>` markup (asserted strings: `case-walkthrough`, `href={study.walkthroughVideo}`, `synapse-product-preview-avatar.mp4`, the static-preview regex, the modal video with `controls`), add `data-ascii-action="secondary"` to the trigger and a `<span data-cell-icon="play">`; hide `.case-walkthrough__avatar` with `display: none` (the poster is not fetched for a non-rendered video in Chromium; verify in the network panel), change the copy to "Watch the walkthrough" (the "Skip read" kicker goes). The duration ("· 4 min") is omitted until the frontmatter carries one (§5). Contracts kept: `browser-contract` walkthrough preview rest state (the hidden video stays paused, no autoplay/loop) and the modal video.

#### 3.6 Loaders — B (shared helper)

**Design.** On the 40 ms tick, `aria-hidden`, a plain word beside each in a polite region, all stop on a meaningful frame with motion off. Quarter turn: 2 × 2 at 7 px cells, head every 2 ticks, level-3 tail (rest: head + tail). Dither bar: 12 cells, leading cell dithered to the fraction (rest: the fraction). Sweep: a 3-cell band 3·6·3 walking a 12-cell row one cell per tick (rest: all at 3). Breathing cells: 3 × 3 (or 5 × 3) at 7 px, diagonal wave 1 → 3 → 5 → 3 → 1 one step per 2 ticks (rest: all 3; the Notes empty state rests at 1·2·3). Used by: the primary press (quarter turn stays 5 px there, A), the video player (2.11), the live embed (deferred), the Notes empty state (2.1). Mosaic poster and the turntable loader: deferred (§0.8).

**Site.** New `src/scripts/motion/loader.js` (port of the runtime's `loader`, ~70 lines) exported through `motion/index.js`; CSS `.loader-bar`, `.loader-breathe` sizes in section 30. `press.js` imports the quarter turn from it.

#### 3.7 Empty state — B

Covered by 2.1 for Notes; the same block (`.notes-empty` markup) is the only empty state on the site. Section 30 only adds the generic `.empty-state` aliases if batch 3 finds a second use (none today).

#### 3.8 Text field and textarea — A (contact, private access, notes search)

**Design.** Label Geist Sans 500 13 px `--muted` above; field 44 px, 17 px text, 1 px `--line` hairline beneath; focus: a 2 px ink line draws left → right in 4 steps over 160 ms (keyboard focus: at once); `:user-invalid`: the line in `--signal-fail`, flashing twice at 120 ms then staying; focus ring 2 px ink. Textarea: same line plus a counter "120 / 5000" Geist Sans 13 px `--muted` right-aligned under it (new, JS). Turnstile and the honeypot untouched.

**Site.** CSS on the §22/§25 field selectors: `min-height: 44px`, `border-bottom: 1px solid var(--line)`, `background-size` transition `160ms steps(4, end)`, `label > span` 13 px `--muted`; a `.contact-form__count` rule. `contact.astro` inline script: 8 lines that keep a `<p class="contact-form__count" aria-live="polite">` under the textarea in sync (`maxlength` is already 5000). Supersedes §22 label/field sizing and the §25 180 ms line. Contracts kept: `verify-site` contact strings (`PUBLIC_CAL_BOOKING_URL`, `id="book-a-call"`, `data-booking-modal-open`), the Turnstile markup, `aria-busy` driving the press.

#### 3.9 Form status line and the submit press — A (§0.2.4)

**Site.** CSS: `:root .contact-form__status::before` → 4 × 16 (`width: 4px; height: 16px`) in `--signal-ok` / `--signal-fail`; `[data-state="error"]` plays `status-flash-a 480ms steps(1)` (colour red at 0–120 and 240–360 ms, ink after). `press.js workingAndDone`: done hold 1500 ms, the held marker (1.8). The status sentences stay as they are in `contact.astro`. Private access (`private-access.astro`) gets the same field rules by selector.

#### 3.10 404 — hybrid (§0.2.5)

**Site.** `404.astro` script: columns = 23, `createCells` 7 px (`--cell-size: 7px; --cell-gap: 1px`), `runField({ values: cells.map((_, i) => (i % cols) / (cols - 1)), total: 880, curve: curves.linear, steps: 1, stepMs: 40 })` lighting only glyph cells to 8 (motion off: final frame). Markup: a `<span class="not-found__rule" aria-hidden="true">` after the field. CSS: `.not-found__field` cell sizes, `.not-found__rule` 1 px `--line` with 11 px margin, h1 22 (already), lede 16 px (`.not-found__lede` 17 → 16). Supersedes §22 404 sizes.

#### 3.11 Status lines and live regions — B

**Design.** Plain words in Departure 11; a 1-cell signal (7 px) in `--signal-ok` / `--signal-fail` where there is a result; the text swaps with the B snap (280 ms `mark-snap`), never scrambled; one update per change. Applies to the Presentations in Code copy status (`[data-pc-copy-status]`) and the banner studio status (`.ascii-banner-studio__status`). The Notes count is A (2.1) and the contact status is A (3.9); the theme status is visually hidden.

**Site.** CSS: `[data-pc-copy-status]`, `.ascii-banner-studio__status` Departure 11 + `.is-snapping` on change (the owning scripts set `textContent`; a `MutationObserver` in `motion/index.js` on `[aria-live="polite"][data-status-snap]` adds the class). Markup: `data-status-snap` on those two elements. Supersedes §23 banner status 14 px sans.

#### 3.12 Tool panel — hybrid (§0.2.6)

**Site.** CSS on the §23 panel selector list (`.playground-controls, .pave-turntable-controls, .ascii-banner-studio__controls`): labels 13 px Geist Sans `--muted` (supersedes Departure 11), `output` Departure 11, buttons `border-color: var(--line)` with the B cell-column marker via `edge-marker.js` (4 cells × 7 px for a 36 px button, arriving top → bottom 60 ms, instant on focus) replacing the `box-shadow` inset marker, `[aria-pressed="true"]`/`.is-active` solid via `press.js` fills (add `data-ascii-press="toggle"` handling: the fill runs to 8 diagonally and stays while pressed, empties when unpressed), select 1.15, checkbox 1.16, slider 1.17, textarea hairline, group separators `.control-group + .control-group::before` as A soft rules with 22 px space. `.ascii-banner-studio__save` loses its solid override and becomes the standard A primary (44 px; `data-ascii-action="primary"` is already on it). Supersedes §23 tool-kit button/label rules. Contracts kept: `browser-contract` routes (`.playground-controls`, `.pave-turntable-controls`, `[data-ascii-banner-studio]`), `verify-site` turntable/control strings (`.pave-turntable-controls` in CSS).

#### 3.13 Tool primary and export with progress — A

**Design.** Primary = 1.8 at 44 px. Export (studio): "Export" → "Exporting" with the quarter turn and one cell whose level is the real progress → "Saved" with the check for 1.5 s; progress numbers only when real.

**Site.** Banner "Save PNG": covered by 3.12. Studio exports: the engine (`studio.js`) emits status text, not progress events; the working/done ladder can be driven from the status text it writes (`studio-ui.js` observes the status region and runs `simulate`-style working → done on the pressed export button, no progress cell). Implement that minimal version in `apps/svg-ascii-studio/src/scripts/studio-ui.js`; no engine change.

#### 3.14 Drop zone — A (SVG studio)

**Design.** 1 px `--line` box, 176 px tall, upload 5 × 5 cell icon at 3 px, "Drop an SVG here" 15 px, "or choose a file" as a dotted-underline link that focuses the real file input, hint 13 px `--muted` ("SVG files only. Filled shapes work best."). Drag-over: border 2 px `--ink` in 1 step. Loaded: a held 4 px A marker on the left edge, the green check and the file name 15 px. Error: one sentence, two flashes, then still.

**Site.** `apps/svg-ascii-studio/src/styles/app.css` (scoped to the studio, uses global tokens): `.s2-empty[data-stage-drop-target]`, `.s2-replace[data-dropzone]`; `studio-ui.js` toggles `is-over` on `dragenter/dragleave/drop` and builds the icons with `cells.js`. The `[data-file-input]` and `[data-stage-drop-target]` hooks `studio.js` reads are untouched; `scripts/svg-ascii-studio-smoke.mjs` selectors (`.s2-source-actions [data-clear-source]`, `.s2-paste summary`, `.s2-export`) stay.

#### 3.15 Swatches — A (SVG studio)

**Design.** For each of Face, Sides, Ground: a row of 24 px squares with a 1 px `--line` border and 11 px gaps (Ink, Stone, Green, Rust, Paper, from tokens), each a radio with the colour name as its visually hidden label; selected: a 2 px solid rule under the square; hover: the rule at level 3; "Other…" is a quiet action that focuses the existing native `<input type="color">` (kept, visually small but reachable). Keyboard: arrows move at once.

**Site.** `StudioWorkbench.astro`: wrap each `.s2-colors label` with the swatch row markup (keeping `input[type="color"][data-control]` exactly as is); `studio-ui.js` sets the colour input's value and dispatches `input` when a swatch is chosen (the engine listens to the input). `app.css` styles.

#### 3.16 Next tool row — C

**Design.** "Next tool" Departure 11 `--muted` (no counter); title Departure 44 (33 on phones) with a 4 px C band at level 4 (`--tile-c`) beneath (11 px padding); hover/focus: the band resolves 6 → 8 (2 steps of 50 ms), leaves in 1 step; the arrow nudges 3 px in 1 step at 100 ms. Hairline above the row, 22 px padding.

**Site.** CSS on `:root .labs-tool-related > span`, `a > span` 44/33, `a::after` as the band (replaces the §23 `scaleY(0)` under-marker). Markup unchanged (`labs/*.astro`).

---

## 3. Implementation order: three sequential batches

All three append to `src/styles/global.css` and share the motion runtime, so they run one after another, each on its own branch from the previous one's merge, one writer at a time. Before starting each: `git status` snapshot; confirm the other person's files are unchanged by us; confirm the anchor `/* 24 CASE EVIDENCE, ROUND 4` and that nothing of ours sits before it except batch-1 additions in `src/components`/`src/scripts`.

### Screenshot comparison (all batches)

Add `scripts/picks-screens.mjs` (advisory, not in `npm run check`; Playwright is already a dev dependency): for a list of `[component, route, selector, reviewId, direction]` rows it captures (a) the site element at 1440 and 390 wide, light and dark, motion on and `reducedMotion: "reduce"`, and (b) the matching column of `docs/audits/2026-10-16-visual-direction/component-directions.html` opened as a file URL with `html[data-one="<dir>"]`, `data-theme`, `data-view="phone"` set before capture (`#cmp-<id> .col.dir-<dir> .col-body`), into `audit-artifacts/picks/<batch>/<component>-<viewport>-<theme>-{site,review}.png`. The implementer compares the pairs by eye against the numbers in §1 (cell size, marker width, rule height, type size) and keeps the sheet in `docs/audits/2026-10-16-visual-direction/verification/picks-<batch>.md` with one line per component: matched / differs (why). Hybrids compare against the two source directions named in §0.2.

### Batch 1 — Chrome, actions, selection, page motion

- **Section:** `/* 28 PICKS · CHROME, ACTIONS AND MOTION */` appended after the round 4 block (end of file). Starts with the token block (§0.5).
- **Components:** 1.1 nav, 1.2 theme, 1.3 motion control, 1.4 back to top, 1.5 footer, 1.6 dialog, 1.7 skip link + tooltip, 1.8 primary/secondary, 1.9 quiet, 1.10 inline link, 1.11 arrows/back links, 1.12 icon button, 1.14 segmented, 1.15 select, 1.16 checkbox, 1.17 slider, 1.18 disclosure, 1.19 page transition, 1.20 reveal, 1.21 point refresh. **Handled by the case-evidence fix:** 1.13 case link.
- **Files:** `src/styles/global.css` (section 28 only), `src/components/SiteNav.astro`, `ThemeToggle.astro`, `MotionToggle.astro`, `SiteFooter.astro`, `CaseStudyPage.astro` (breadcrumb arrow span, walkthrough modal close button, cover `data-reveal` can wait for batch 2), `src/pages/notes/[slug].astro` and `labs/presenting-in-code.astro` (back-link arrow spans), `AsciiBannerStudio.astro` (listbox open class), `src/scripts/motion/cells.js` (level paths, `is-inverted`), `press.js`, `segmented.js`, `reveal.js`, `cell-range.js`, `point-refresh.js` (cell 8), `lifecycle.js` (switch cells), new `motion/edge-marker.js`, `motion/tooltip.js`, `motion/disclosure.js`, `motion/index.js` (imports), `scripts/picks-screens.mjs` (new).
- **Contract checks that change:** none in text. Verify by reading: `verify-site` nav/footer/theme strings and the `repeating-linear-gradient` ban (use masks, §0.6); `browser-contract` motion-control-* (48 px, no transforms on visible children — the new `.motion-toggle__switch` child must have `transform: none` and no transition), responsive-navigation-geometry (phone links ≥ 48 × 48 after the 48 px row), reduced-motion-reveals/duration, booking dialog open/close/focus, document-horizontal-overflow on the five viewports (the skip link is `position: fixed` and clipped until focus). `scripts/motion-contract.mjs` for the toggle.
- **Acceptance:** `npm run verify`, `npm run build`, `npm run check:browser` pass; `node scripts/run-browser-check.mjs scripts/motion-contract.mjs` passes; picks-screens sheet for every batch-1 component vs the review column (C for nav and theme; B for motion control, dialog, slider; A for the rest) at 1440/390, light/dark, reduced motion; manual: Tab from the address bar lands on "Skip to content"; theme flip resolves 2 → 4 → 6; the motion control shows 8·8 / 0·0 / dotted and nothing on it ever moves; nav hover band 150 ms in, 80 ms out; a button press inverts the label at level 6 and scales 0.97; arrow keys in `.case-switch` change selection with no fill animation; page transition dots are 4 px; `/playground/` select shows the chevron with ≥ 14 px clearance at 375 px with the longest option.

### Batch 2 — Lists, Home, case evidence

- **Section:** `/* 29 PICKS · LISTS, HOME AND CASE EVIDENCE */` appended after section 28.
- **Components:** 2.1 notes rows/search/count/empty, 2.2 labs rows, 2.3 item rows, 2.4 entry rail, 2.5 work entry, 2.6 private work, 2.7 hero, 2.8 facts, 2.11 video player (round 3 `case-video-copy`), 2.12 grid/gallery (round 3 `case-image-grid`), 2.13 tag chips only, 2.15 the count only (`count-up.js`), 2.17 cover entrance. **Handled by the case-evidence fix, not in this batch:** 2.9 captions, 2.10 compare/slider/lens, 2.13 live embed frame/button/deck/loading, 2.14 pull quote and carousel, 2.15 stat CSS, 2.16 timeline.
- **Files:** `global.css` (section 29), `src/pages/notes/index.astro` (arrow shown; nothing asserted changes), `labs/index.astro` (`data-reveal="scan"` on the screen), `ProjectOverview.astro` / `HomepageTimeline.astro` (reveal delays), `CaseStudyPage.astro` (hero children reveal attributes, cover `data-reveal` — these lines are outside the blueprint-hero edits the other person made; re-check the diff before editing), `src/scripts/notes-search.js`, `motion/video-cells.js`, `motion/count-up.js`, `motion/point-refresh.js` (remove the dissolve), new `motion/loader.js` (needed here by video loading), `homepage-timeline.js` unchanged.
- **Not touched:** `content.ts`, `case-media.js`, the `24 CASE EVIDENCE, ROUND 4` block, and no selector that lives in that block (`.case-live__*`, `.case-timeline*`, `.case-quotes*`, `.case-pull-quote*`, `.case-stats*`/`.case-stat*` CSS, `.case-link*`, `.case-slider*`, `.case-lens*`, `.case-hero-sheet`, `.case-hero--sheet`, the pave-new-look caption exception).
- **Contract checks that change:** none in text. Verify: `verify-site` Notes/CV/About strings (`<h3>{note.title}</h3>`, `.notes-list__item h3`, `.experience-item h2`, `.case-video-copy`, no `data-reveal="rise" data-reveal-delay` in `notes/index.astro`), homepage overview strings; `browser-contract` homepage playback (toggle still visible and clickable with the strip gone), homepage timeline, case reading tools on the four case routes (hero reveal children land `in`), generated image dimensions (no `<img>` added without width/height), console errors.
- **Acceptance:** the three gates; picks-screens for every batch-2 component (A for notes/labs/items/work entry/hero/facts/grid/cover/chips; B for entry rail/video/empty); routes `/`, `/notes/`, `/labs/`, `/about/`, `/cv/`, `/case-studies/designing-pave/`, `/case-studies/synapse-sys/`, and `/case-studies/pave-new-look/` only to confirm nothing of the fix's components changed (diff the screenshots before/after) at 1440/390, light/dark, reduced motion, no-JS (native video controls back); manual: filter Notes to zero → breathing empty state, clear → rows stagger 70/55/45…; a stat counts one integer per tick; the case cover sweeps in 6 bands; the hero copy snaps in four steps.

### Batch 3 — Case navigation, feedback, tools

- **Section:** `/* 30 PICKS · CASE NAVIGATION, FEEDBACK AND TOOLS */` appended after section 29.
- **Components:** 3.1 sibling nav, 3.2 contact prompt, 3.3 index rail, 3.4 index phone, 3.5 walkthrough, 3.6 loaders, 3.8 fields, 3.9 form status, 3.10 404, 3.11 status lines, 3.12 tool panel, 3.13 tool primary/export, 3.14 drop zone, 3.15 swatches, 3.16 next tool.
- **Files:** `global.css` (section 30), `src/scripts/case-index.js`, `CaseStudyPage.astro` (walkthrough trigger), `src/pages/404.astro`, `contact.astro` (counter), `AsciiBannerStudio.astro` and `presenting-code/Skill.astro` (`data-status-snap`), `motion/press.js` (quarter turn from `loader.js`), `motion/index.js` (status snap observer), `apps/svg-ascii-studio/src/components/StudioWorkbench.astro`, `apps/svg-ascii-studio/src/styles/app.css`, `apps/svg-ascii-studio/src/scripts/studio-ui.js`.
- **Contract checks that change:** none in text. Verify: `verify-site` case strings (`case-walkthrough`, `href={study.walkthroughVideo}`, `synapse-product-preview-avatar.mp4`, `case-progress`, the forbidden `scrollIntoView({ behavior: "smooth"` and `window.addEventListener("scroll", () =>` strings stay absent from `CaseStudyPage.astro`), `.case-toc`, `.case-sibling-nav`, `.case-breadcrumb`, contact strings; `browser-contract` case reading tools at desktop and 900 px (toggle 55 ≥ 48, rows 48, list scrolls, no horizontal overflow with the scrim, active-link transition 0 under reduced motion), walkthrough preview rest state, synapse-sys booking link; `scripts/svg-ascii-studio-smoke.mjs` (run it: `node scripts/run-browser-check.mjs scripts/svg-ascii-studio-smoke.mjs`), `npm run check:presenting-in-code`.
- **Acceptance:** the three gates plus the studio smoke; picks-screens for every batch-3 component (C for sibling/next tool and the index phone strip; A for contact prompt/walkthrough/fields/form status/drop zone/swatches; B for loaders/status lines/404 field; the two index hybrids against both A and C columns; the tool panel against A and B); routes `/case-studies/designing-pave/` (rail, phone strip at 390, sheet open/close with Escape and scrim), `/case-studies/synapse-sys/` (walkthrough button opens the B dialog), `/contact/` (field line 160 ms in 4 steps, counter, a simulated failure flashes twice), `/404/`, `/playground/`, `/labs/ascii-banner/` (Save PNG is the paper primary with the press), `/svg-ascii-studio/` (drop zone drag-over, swatches by keyboard, native picker reachable), `/labs/presenting-in-code/` (copy status snaps in Departure 11), at 1440/390, light/dark, reduced motion, no-JS.

---

## 4. Round 3 rules superseded (for the later cleanup pass, not these batches)

§16 reveal animation rules (`mark-snap` on `[data-reveal]`, `steps(10)` sweep); §17 nav, theme icon, motion control, footer, progress cells; §18 button sizing and marker, quiet rule and arrow, segmented wipe and dividers, `mark-wipe-in`, private-work kicker; §19 labs grid; §20 notes meta and step aside; §21 case meta, tags, sibling marker, breadcrumb; §22 field sizes, status cell, 404 sizes; §23 tool labels/buttons/select/checkbox/textarea, overview toggle hover, next-tool marker, pc summary chevron; §24 case index rail and phone rules, entry rail, `cell-range` sizing, segmented colour rules; §25 nav cell rule, `theme-dither`, notes rows, labs rows, status cell size, breadcrumb rule, facts rule, caption grid, blockquote left rule, sibling layout, contact h2, player sizes, `sheet-switch-on`, `arrow-nudge`, `.case-stat strong` 66; §26 keyframes (tile); §27 pc chevron. The round 3 caption grid (§25) and `.case-stat strong[data-count-up]` 66 px (§25) are superseded by the case-evidence fix, not by these batches. No round 4 rule is overridden by these batches.

## 5. Open questions for Alexander, and deferred items

**Needs his answer**
1. **Case link (C):** the review showed C-1 (band only) and C-2 (text inverts on hover). The plan uses C-1; C-2 would be the one hover-fill-behind-text on the site. Which?
2. **Footer "cell grids but lighter":** the plan reads it as Departure 11 headings with no rule, soft link text, and a 4 px-wide B cell column marker. Is that the lightness he meant, or should the marker be A's plain text-to-ink with only the headings and base row in Departure?
3. **Labs screens:** A's row shows a 132 px screen; today's real screens are 320 px 4:3 crops captured for legibility. Keep 132 as picked, or 176/220 so the screens still read?
4. **Stat row (B):** keep the 16-cell meter under percentage stats (it is a meter), or drop every rule under numerals under the underline rule?
5. **404 "underline like A":** hairline (chosen) or A's 2 px dither soft rule?
6. **Tool panel hybrid:** confirm "B interactions" = B cell-column markers, diagonal press on selected buttons, B slider and checkbox, on A's quiet labels and hairlines.
7. **Walkthrough duration:** A shows "· 4 min"; no study has a duration field. Add `walkthroughDuration` to frontmatter later, or leave the duration out?
8. **Case index narrow desktop (901–1180):** cells only with a tooltip, as A; fine?

**Handed to the case-evidence fix** (resolved picks written in 1.13, 2.9, 2.10, 2.13, 2.14, 2.15, 2.16 and the stepper row of §0.8): case link, captions, compare switch counters, drag slider, x-ray lens with the dimmed outside, live embed frame / corner button / deck / loading line, pull quote, quotes carousel, stat CSS, day-cell timeline. Two hand-offs to agree before batch 2: the `--tile-c` token (batch 1 defines it in section 28; the fix should reference it, not redefine it) and the `case-stat__meter` class (`count-up.js` creates it, the fix styles it).

**Deferred for other reasons:** the mosaic video poster (not needed), the turntable breathing loader (turntable scripts are protected), the toast (nothing needs it), the cleanup pass that removes the superseded rules in §4 after both the fix and the three batches have landed.
