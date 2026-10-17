# Round 3 rollout plan

17 October 2026 · Approved direction: [`motion-language-plan.md`](motion-language-plan.md) v3, [`component-system-plan.md`](component-system-plan.md) with its round 3 decisions, and the two specimens. This document turns them into ordered, shippable work packages: foundations and the SVG studio first, then the rest of the site.

Nothing here has been implemented yet, apart from the studio preview route described in R2.

## Ground rules

- **Preserve first.** The working tree has extensive uncommitted work on `surfacing-work`, plus the untracked `public/case-studies/pave-blueprint/`. Per `AGENTS.md`, it must be snapshotted before implementation and never stashed, reset or overwritten. You own that snapshot (R0).
- **One writer at a time.** Each package is one branch and one reviewable change. Packages that touch `global.css` or the motion runtime never run in parallel.
- **Gates for every package:** `npm run verify`, `npm run build`, `npm run check:browser`, plus the package's own checks below, then a browser pass at 1440 and 375px, light and dark, motion on, off and reduced, and no-JS.
- **Contracts change only together with their checks.** Several assertions in `scripts/verify-site.mjs` and `scripts/browser-contract.mjs` encode today's design. Round 3 deliberately changes some of them. Each package lists exactly which assertions it updates, so nothing is weakened silently.
- **Protected files stay protected:** `public/page-transitions.js` timings, `public/ascii-shader.js`, turntable scripts, and the `content.ts` parse, slug and heading contracts (unless a package is explicitly renderer work).
- **Repo rules hold:** tokens only in `src/styles/global.css`, square corners, no new dependencies, the select chevron rule, and readable no-JS and reduced-motion states.

## The order

| # | Package | Visible change | Depends on | Size |
| --- | --- | --- | --- | --- |
| R0 | Snapshot and branch | None | — | Owner, minutes |
| **R1** | **Foundations** | Entrances become snap and band sweep; click particles disappear | R0 | Medium |
| **R2** | **SVG studio swap** | `/svg-ascii-studio/` gets the new UI on the same engine | R1 (soft) | Small–medium |
| R3 | Type and chrome | Departure headings, logo nav with Labs, quiet theme icon, quiet footer, phone menu | R1 | Medium |
| R4 | Actions and selection | Three button roles with the press, one tabs/segmented component, one select | R1, R3 | Large |
| R5 | Lists and Labs index | Notes and Labs rows with the hover marker; real tool screens; four Labs tools | R4 | Medium |
| R6 | Case pages | Status chips, facts, captions, one video player, stat/quote/chart, sibling nav, case index, diagrams | R4 | Large |
| R7 | Forms and feedback | Contact fields and states, private access errors, toast, tooltip, empty and loading states | R4 | Medium |
| R8 | Labs tool kit | Shared controls across Banner, Presenting in code, Playground and the turntable pages | R4, R2 | Large |
| R9 | Cleanup and release | Override layers collapsed, dead CSS removed, full check, owner review | All | Medium |

R1 and R2 are written out in full below. R3–R9 have scope, contracts and acceptance criteria and will be detailed when each starts.

---

## R0. Snapshot and branch (you)

1. Decide what the current filesystem state is: commit it on `surfacing-work` as a checkpoint, or on a dedicated branch. Include or exclude the untracked `public/case-studies/pave-blueprint/` and `case-studies/pages/pave-blueprint.mdx` deliberately; they appeared during this audit and are not part of it.
2. Create `round-3/foundations` from that checkpoint.
3. Separately: the dev server fails on `/labs/presenting-in-code/` because source code imports `/labs/presenting-in-code/web/runtime-api.js` from `public/`, which Vite refuses. Production builds are fine. It is worth a small fix before R8; it doesn't block R1 or R2.

---

## R1. Foundations

**Goal:** add the system's building blocks once, globally, and retire the pieces that contradict it. No component redesigns yet, so the site looks almost the same afterwards, except for entrances and the absence of click particles.

### R1.1 Tokens (`src/styles/global.css`, `:root` and both theme blocks)

| Token | Value | Notes |
| --- | --- | --- |
| `--dither-1` … `--dither-7` | Static SVG data URIs of the 4×4 ordered-dither masks (2, 4 … 14 of 16 dots) | Generated once by a short script and pasted as literal values, so cells render with **no JavaScript** |
| `--dither-size` | `8px` | Mask tile size (2px dots) |
| `--signal-ok`, `--signal-fail` | `#04764e` / `#b8421f` in light; `#4cc58f` / `#ef7c56` in dark | Only for real state: done, error, diagram states |
| `--cell-empty` | ink at 7% (9% dark) | Empty cell |
| `--font-pixel` | `"Departure Mono Local", "Departure Mono", var(--mono)` | The face is already declared in `global.css` |
| `--type-px-11` … `--type-px-66` | `11px, 22px, 33px, 44px, 55px, 66px` | Departure's crisp sizes; the only sizes headings may use |
| `--tick` | `40ms` | The shared clock |
| `--step` | `30ms` | One cell or character step |
| `--snap` | `280ms` | Snap-on |
| `--sweep` | `360ms` | Band sweep |
| `--afterglow` | `180ms` | Exit |
| `--switch` | `240ms` | Switch on/off for panels |
| `--stagger-total` | `600ms` | Budget for one group's stagger |

**Contract watch:** `verify-site` "Global CRT scanlines are removed" fails if `global.css` contains `repeating-linear-gradient`. The interlace treatment (R2 in the raster list) must therefore use masks, not stripes. It is deferred anyway; R1 ships snap, sweep, afterglow and switch only.

### R1.2 Primitive CSS (one new section in `global.css`, "16 SIMPLE MARKS")

- **Cell:** `.cell` with `data-level="0…8"`. Levels 1–7 use mask tokens, 8 is solid, 0 is `--cell-empty`, and a `.cell--clear` variant makes 0 transparent.
- **Marker (hover):** `.has-marker` plus `::after` (or a child `.marker`) on the left, right or bottom edge, stepping in over three `steps()` frames. **Never a fill behind text.**
- **Disabled:** `[aria-disabled="true"]` and `:disabled` get a dotted outline drawn through `--dither-4`, muted text, `cursor: not-allowed`.
- **Done:** a `.is-done` state with a held marker and a cell check icon in `--signal-ok`.
- **Keyframes:** `snap`, `sweep` (clip-path, `steps(10)`), `afterglow` (opacity `steps(1)` per segment), `switch-on` and `switch-off` (scaleY in steps). All are named and documented.
- **Focus:** keep the global `:focus-visible` rule, fixed at a 2px ink outline.
- **Reduced motion:** every primitive has a still rest state under `prefers-reduced-motion` and when `html[data-motion]` is not `ready`.

### R1.3 Motion runtime (`src/scripts/motion/`)

- **`cells.js` (new):** `setLevel`, `cellsInto`, the curved-stagger scheduler (`runField`: delays computed once, one rAF loop, ease-out by default), `fillLayer` (the dither press), and cell icons with `morph`. Ported from the specimen and tidied; no dependencies.
- **`tick.js` (new):** one 40ms clock that runs only while subscribers are visible and `isMotionActive()` is true. It subscribes to `lifecycle.js`, so the visitor motion switch and reduced motion stop everything.
- **`reveal.js` / CSS:** keep the `data-reveal` API and `html[data-motion="ready"]` gating, but swap the look:
  - `rise` and `fade` become **snap**.
  - `scan` becomes **band sweep** for media (`figure`, `img`, `video`, `[data-media]`).
  - `scramble` is unchanged.
  - The blur and 18px rise (`global.css` ~990–1013) and the second definition (~12672) are removed, so there is one definition.
- **`count-up.js`:** respect `isMotionActive()` and step through integers on a curve instead of glyph noise.
- **`index.js`:** import `cells.js` and `tick.js`.

### R1.4 Retirements

| Retire | Where | Check first |
| --- | --- | --- |
| Click particle bursts | `src/components/SiteHead.astro:222` imports `ascii-control-effects.js` | `grep` checks and browser contract for `ascii-control` / `data-ascii-stream`. Remove the import and keep the file until R9 |
| Blur reveal | `global.css` reveal blocks | `browser-contract` reduced-motion reveal checks must still pass (they test rest state, not the look) |
| Inert scramble markup | `data-scramble` inside `.site-nav`, `.site-footer`, `.case-toc`, `.case-sibling-nav`, `.case-contact-prompt`, `.contact-call`, `.published-item`, `.labs-tool-hero` (suppressed by `scramble.js:129`) | Remove the attributes and the suppression list together; `grep` verify-site for asserted strings first |

### R1.5 `AGENTS.md` amendments (owner-approved wording)

- **Motion vocabulary:** reveal (snap, sweep), scramble, rise-stagger, blink, **afterglow, switch, cell stagger and tick signals**. "Steps inside, curves across".
- **Density scale:** 8 = current, selected, done or shipped; 5 = in progress; 3 = read or supporting; 1 = texture only, never behind text; 0 = not yet.
- **State ladder:** rest, hover (marker), focus, pressed or selected (dither fill), working, done (marker plus check), disabled (dotted outline plus reason), error.
- **Type:** Departure Mono for headings and numbers, only at multiples of 11px and weight 400. Geist Sans for reading. Geist Mono for character grids.
- **Button roles:** primary, secondary and quiet only.

### R1.6 Living reference

Add a "Simple marks" section to the existing `/component-preview/` route (already a shared-nav shell in `verify-site`). It should show cells at every level, the marker, disabled, done, the press and one stagger. It becomes the in-repo reference that later packages are checked against, replacing the HTML specimens as the source of truth.

### R1 acceptance

- All gates pass with no contract assertions weakened.
- Entrances on Home, a case study, Notes and Labs use snap and sweep. No blur appears anywhere in the reveal path. Clicks make no particles.
- With motion off or reduced, every element is visible at rest. The tick clock is idle offscreen, and the Performance panel shows no work while scrolled past.
- `/component-preview/` shows every primitive in light and dark.

---

## R2. SVG studio swap

**Goal:** ship the redesigned studio on the unchanged engine. It is mostly self-contained, so it can land straight after R1, or even before it if R1 slips. Its only R1 dependency is reusing the shared dither and marker primitives instead of its local copies.

**Already built (preview, uncommitted):**
- `apps/svg-ascii-studio/src/components/StudioRedesign.astro` keeps every hook `studio.js` reads.
- `apps/svg-ascii-studio/src/styles/redesign.css` is scoped to `.studio2`.
- `apps/svg-ascii-studio/src/scripts/redesign.js` draws the step strip and the cell tracks.
- `src/pages/svg-ascii-studio/redesign.astro` is noindex and not linked.

It has been verified on the dev server at 1440 and 375px with the real Three.js engine.

### R2.1 Swap

1. Replace `StudioWorkbench` with the redesign:
   - In `src/pages/svg-ascii-studio.astro` and in the standalone app's `apps/svg-ascii-studio/src/pages/index.astro`.
   - Rename the new component to `StudioWorkbench.astro` (the old one is deleted), so existing imports keep working.
2. Move styles: `redesign.css` becomes the app's `app.css`; the old `app.css` rules are deleted.
   - In the site, it is imported after `global.css` and uses its tokens.
   - In the standalone app, `app.css` must define fallback values for `--ink`, `--paper`, `--line`, `--muted` and `--soft` on `.studio2`, so the app still works without the site stylesheet.
3. After R1: replace the local `--s2-d*` masks and the local marker and disabled CSS with the shared primitives. Rename `redesign.js` to `studio-ui.js` and use `cells.js` for the cell tracks.
4. Delete the preview route `src/pages/svg-ascii-studio/redesign.astro`.
5. Leave `studio.js` untouched except where a test proves it necessary. (UI copy that the engine writes into the empty state is already hidden and replaced by the layout; error copy still shows.)

### R2.2 Polish to finish during the swap

- **Dark theme:** the engine's default ground colour is `#fbfbf8`. Map its initial value to `--paper` when the page loads in dark, and keep the visitor's own colour choices.
- **Phone stage bar:** keep the ASCII · 3D · Both control and Pause on one line; move "Full screen" into the overflow at ≤640px.
- **Steps strip:** advance step 3 only when an export succeeds (listen for the engine's success status), not on click.
- **Copy:** check every relabelled control (Cut-off, Characters, Grain, Lens, Tilt, Turn, Lean, Curve smoothness, Character size) against what the engine actually does.

### R2.3 Contract and test updates

| File | Change |
| --- | --- |
| `scripts/svg-ascii-studio-smoke.mjs` | Remove the `[data-panel-tab=export]` step (export controls are always present). Change `.source-actions [data-clear-source]` to `.s2-source-actions [data-clear-source]` and `.import-tools summary` to `.s2-paste summary`. Change the `exportVisible` check to `.s2-export` visibility. **Keep the malicious-paste test (`onload` must stay inert) unchanged** |
| `scripts/verify-site.mjs` | `src/pages/svg-ascii-studio.astro` stays a shared-nav shell; no assertion change expected. Confirm the sitemap entry is unchanged and that the preview route is gone |

### R2 acceptance

- `svg-ascii-studio-smoke` passes, along with all gates.
- Manual pass: drop, browse, paste (including the malicious sample), each sample, all six looks, every essential slider, More controls, the three view modes, pause, full screen, every export format, Start over, reload restores the saved workspace, keyboard-only run, reduced motion, dark, 375 and 1440px.
- No horizontal overflow, no console errors, and the engine frame rate is unchanged compared with the current studio.

---

## R3–R9 in brief

### R3. Type and chrome

- **Scope:** Departure headings site-wide on the 11px grid; logo-mark nav with Work, Notes, Labs, About, Contact; icon-only theme control; motion setting moved to the footer and phone menu; the quiet paper footer (four columns plus a base row with the small mark and Back to top; no call-to-action band); a phone menu panel.
- **Contract updates:**
  - `verify-site`, "Shared navigation has exactly the recruiter-facing primary links": allow `label: "Labs"`, five links, the new brand `aria-label`, and a five-column phone grid or the menu. The `SiteNavSection` union gains `"labs"`.
  - `verify-site`, "Color theme…": the auto/light/dark logic stays in `SiteHead`; update the `hn-sun`/`hn-moon` icon assertions to the cell icon.
  - `verify-site`: keep the footer "Back to top" label.
  - `browser-contract` and `motion-contract`: the `[data-motion-toggle]` hooks, description id and state text stay; only the location moves (`.site-nav__controls` to the footer).
- **Acceptance:** the nav fits at 375px with a working Menu; there is one Back to top, which shows progress; motion can still be stopped from every page (WCAG 2.2.2).

### R4. Actions and selection

- **Scope:** the three button roles with the press flow (fill, Sending, Sent with check) replace about 25 styles; one tabs/segmented component replaces 8–10 implementations; one select (button plus listbox, chevron rule); arrows (→ internal, ↗ external, ← back).
- **Contract watch:** `browser-contract` checks for `.case-switch`, BreathingGrid controls and contact submit states; update them with each migrated call site.
- **Acceptance:** keyboard operation for tabs (arrow keys) and select (arrows, Enter, Escape); 44px minimum targets (36px only inside tool panels).

### R5. Lists and Labs index

- **Scope:** one row component (Notes, Labs, About published items, CV experience) with the hover marker. The Labs index lists **Turntable Playground, SVG → 3D ASCII, ASCII Banner Studio, Presentations in Code** with real screens. The Notes filter uses afterglow and snap.
- **Screens:** add a repeatable capture script (Playwright is already a dev dependency) writing `public/labs/screens/*.webp`, at most 40 KB each. Playground needs a real frame injected, because WebGL doesn't draw headless; the method is documented in the script.
- **Contract updates:** `verify-site` "Rhizome field is routable…" checks `labs/index.astro` for the rhizome link; change it to check the route and assets only. The Sketchbook, Rhizome and Kit routes stay unless you decide otherwise.

### R6. Case pages

- **Scope:** hero with status chips (density means status), facts on dither rules, one caption style, **one video player** (replacing three, with a mosaic poster, cell scrubber and native-controls fallback), stat, quote and cell chart, sibling nav and prompt, the case index from motion plan §8, and the `ascii` diagram fence.
- **Also includes:**
  - The Synapse empty-block fix, if the separate session hasn't landed it.
  - Poster frames for case videos (Astra's #7).
  - The Synapse status and entry reconciliation (Astra's #5).
- **Contract watch:** the renderer work needs explicit scope; keep slugs, headings and existing fences unchanged and add tests for the new fence. Poster support touches `renderCaseVideo`.

### R7. Forms and feedback

- **Scope:** underline fields, cell checkbox and switch, the select, the press on submit, plain-word statuses, the private access error state, toast, tooltip, empty and loading states.
- **Security:** Turnstile and the honeypot are untouched; contact stays a separately reviewed change.

### R8. Labs tool kit

- **Scope:** cell sliders over real ranges, stepper, swatches, drop zone, export with progress, and disclosures, applied to Banner, Presenting in code, Playground and the four turntable pages. Consolidate the near-duplicate turntable pages. The studio from R2 is the template.
- **Pre-req:** the Presenting-in-code dev import fix (R0.3).

### R9. Cleanup and release

- Collapse each component's override layers into one definition.
- Delete the dead CSS listed in `component-system-plan.md` §1 and the retired scripts.
- Run the full `npm run check` plus the dedicated browser scripts (studio, presenting-in-code, private work, motion contract).
- You review a preview deployment, then merge and deploy.

## Risks and how each is contained

| Risk | Containment |
| --- | --- |
| `global.css` override layers make primitives lose specificity battles | R1 adds one late section with explicit selectors; R9 removes the old layers. Each package checks its components in the browser, not just the build |
| Contract checks encode the old design | Each package lists the exact assertions it changes and updates them in the same change |
| Dither masks render soft at fractional pixel positions | Fully solid cells always switch to a plain fill (the `.full` / level-8 rule); masks use 2px dots on an 8px tile |
| Motion cost on low-end phones | One clock, offscreen idle, DOM cell counts kept small (≤200 per element; canvas beyond that); measure in R1 and R6 |
| Studio regressions | The engine stays untouched, the smoke test keeps the security case, and the preview has already been verified with the real engine |
| Scope creep in R4/R6 | Each is split into call-site batches, and each batch ships independently |
