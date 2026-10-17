# Component directions plan: three deepenings of the same system

17 October 2026 · Planner output for the visual-system refinement. Companion to `component-system-plan.md`, `motion-language-plan.md`, `rollout-plan.md` and the two specimens. This is a plan for a review artifact, not authorization to change site source.

**What this is for.** Alexander picks a direction *per component*. To do that he needs to see every component rendered three ways, side by side, light and dark, motion on and off. Opus agents build that page from §4. Sections 1–3 are the spec they build from; nothing in them should need a guess.

**What every direction keeps (non-negotiable, from the owner's round 3 decisions and `AGENTS.md`):**

- Hover is a solid marker arriving at an edge. Nothing is ever drawn behind text.
- Disabled: dotted outline (border drawn through `--dither-4`), muted text, the reason in words, stays focusable (`aria-disabled` + `aria-describedby`).
- Done: held marker + green cell check (`--signal-ok`) + the new word, held about 1.5 s.
- Density scale: 8 solid = current, selected, done or shipped; 5 in progress; 3 read or supporting; 1 texture only, never behind text; 0 not yet.
- Type: Departure Mono 400 for headings, numbers and short labels at 11/22/33/44/55/66 px only; Geist Sans for reading; Geist Mono only for character grids.
- Three button roles: primary (one per view, dither press), secondary, quiet text with a dither rule.
- No CRT or LCD artefacts: no scanlines, glow, flicker, fringing, light sweeps. Borrow order and steps only.
- No terminal wording in anything a visitor reads.
- Footer: quiet, four columns, no call-to-action band. Phone nav keeps five visible links. Logo mark is `public/sasi.svg` (1,996 bytes; small enough to inline as a mask).
- Motion: steps inside, curves across; one shared 40 ms clock; reduced motion and the visitor motion switch stop everything and leave a complete rest frame.
- Focus: 2 px ink outline, never removed. Targets 44 px minimum, 48 px default; 36 px only inside tool panels.
- Corners square. Colour is ink, paper and the two signals; `--muted` and `--line` are tints of ink, not colours.

---

## 1. The three directions

The three are distinct along three axes: **how much the grid shows** (A hides it, B is the grid, C prints through it), **how dense the marks are** (A sparse, B dense, C coarse) and **how motion reads** (A one snap, B counted steps, C a dissolve). All three use the same marks, the same ladder and the same clock.

| | A · Ruled paper | B · Cell grid | C · Printed dither |
| --- | --- | --- | --- |
| Intent in one line | A quiet editorial page where hairlines and type do the work and cells appear only where they mean something | A page visibly built on an 8 px cell lattice, where every rule, marker and meter is a row of counted cells | A page printed through a coarse ordered dither, where fills, rules and entrances are visibly made of dots |
| Grid | Hidden; 11 px type rhythm | Shown; 8 px cell pitch | Felt; 12 px dither tile |
| Mark density | Sparse: levels 0, 3, 8 in chrome | Dense: full 0–8 everywhere | Coarse: full scale, bigger cells, fewer of them |
| Motion | One snap, short staggers | Counted steps on the clock | Dither dissolves, held a beat |

### Direction A · Ruled paper

**Intent.** The restrained reading. The system's cells are the exception, not the texture: one cell marks what is current, one dither rule marks what is soft, and everything else is hairline and type. Reading comfort leads. Motion is a single snap with quiet staggers; nothing blinks. This is the direction to pick for components that carry long reading (case bodies, notes, about).

- **Type rhythm.** Departure h1 66 (44 on phones), h2 33 (22 on phones), h3 22. Reading Geist Sans 17 px / 1.6, measure 64 ch. Labels and metadata Geist Sans 500 13 px in `--muted`; Departure 11 only for numbers and dates. Vertical spacing on the 11 px grid: 11 / 22 / 33 / 44 / 66. Headings get 44 above and 22 below.
- **Rules and lines.** Real boundaries: 1 px `--line` hairline (`A-hairline`). Soft boundaries and quiet links: 2 px rule at level 3, 8 px tile (`A-soft`). Never two rules stacked. No boxes around text blocks; containers are open.
- **Cell density.** Chrome uses three tones only: 0 (not yet), 3 (read / supporting), 8 (current). The full 0–8 scale appears only inside meters that show real progress (reading cell, back-to-top, video, sliders). Cell size 6 × 16 px in rails, 8 × 8 px in chips, 5 × 10 px in the footer meter (as today).
- **Marker.** `A-marker`: 4 px wide, full height, left edge. Arrives in 3 steps (scaleX ⅓, ⅔, 1) at 40 ms each = 120 ms, `steps(3)`. The label steps 4 px aside in 2 steps of 60 ms. Under-markers (tabs, nav) are 2 px tall. Leaves in 1 step.
- **Motion character.** Entrance = `A-snap`: one step from hidden to shown after its stagger delay (no blink). Stagger total 400 ms, ease-out across the group. Media = `A-sweep`: 6 bands, 300 ms, `steps(6)`. Exit = `A-afterglow`: 2 steps (55 %, 0) over 120 ms. Panels = `A-switch`: scaleY in 4 steps over 200 ms. Press = fill in **reading order** (left to right), 160 ms, 4 levels (2, 4, 6, 8), hold 200 ms, dissolve out 160 ms. Loaders on the 40 ms clock, but only the quarter turn and the reading cell ever move.
- **Colour.** Ink, paper, `--muted` for metadata and the two signals only in done and error. No `--link-blue`; the case link becomes ink on a solid 2 px rule.
- **Dark mode.** Paper `#0c0c0b`, `--line` at 24 %, muted `#aaa89f`. Markers stay ink (light). Hairlines are the main structure in dark, so they carry 24 % rather than 16 %. Nothing else changes; the page reads as the same page with the lights off.

### Direction B · Cell grid

**Intent.** The system made visible. Everything sits on an 8 px pitch (7 px cells, 1 px gaps), rules are rows of cells, markers are columns of cells, and every list and section is numbered in Departure 11. Status is always a small meter, so density carries meaning at a glance. Motion counts: cells step on the clock, staggers run in reading order, and loaders are always cells. This is the direction for components that show state and progress (nav, index, chips, meters, tool panels, video).

- **Type rhythm.** Departure h1 44 (33 on phones), h2 22, h3 22. Reading Geist Sans 16 px / 1.5 (a 24 px line = three 8 px rows), measure 62 ch. Labels Departure 11 sentence case (two words at most). Counters: Departure 11 `01`, `02` on rows, tabs, sections and figures. Spacing on the 8 px grid: 8 / 16 / 24 / 32 / 48.
- **Rules and lines.** `B-rule`: a row of 4 px cells with 1 px gaps, 3 px tall (the nav cell rule today), at level 8 for current or selected and level 3 for soft rules. Hairlines remain only as container edges (segmented groups, inputs). A heading rule under h2 is a `B-rule` at level 3, 2 px tall.
- **Cell density.** Full 0–8 scale in chrome and content. Status chips are 3-cell meters: Launched 8·8·8, Closed beta 8·5·0, Prototype 3·0·0, Before and Concept = dotted outline cell + word (the "not active" drawing). Reading and progress meters are everywhere a position exists (rails, index, footer, video, sliders).
- **Marker.** `B-marker`: a column of 7 px cells (8 px pitch) on the left edge, arriving top to bottom. Each cell steps 3 → 8 in 2 steps of 30 ms; column delays follow an ease-out over 90 ms, so a 48 px button (6 cells) completes in about 150 ms. The label steps 8 px aside in 1 step. Under-markers are a `B-rule` filling left to right in 7 steps over 140 ms (today's nav rule).
- **Motion character.** Entrance = `B-snap`: today's `mark-snap` (on at 30 %, off at 50 %, on from 70 %) over 280 ms, `steps(1)`. Stagger total 600 ms, ease-out, **reading order** per cell or row. Media = `B-sweep`: 10 bands, 360 ms. Exit = `B-afterglow`: 3 steps (55 %, 20 %, 0) over 180 ms. Panels = `B-switch`: scaleY 4 steps over 240 ms, then content snaps. Press = diagonal fill 180 ms, 8 steps of 16 ms, hold 260 ms, out 220 ms (today's `press.js`). Selection handoff: new option fills in reading order 240 ms while the old empties 200 ms. Everything that keeps moving is on the 40 ms tick.
- **Colour.** Ink, paper, signals. `--muted` only for the counters and read rows. Empty cells `--cell-empty`.
- **Dark mode.** Cells are the brightest marks on the page, so the lattice reads as light dots on dark. Empty cells at 9 %. Level 1 is never used in dark chrome (texture zones use level 2 at 4 px tile) so the page does not sparkle. Rules at level 3 render at 4 px tile, not 8, for the same reason.

### Direction C · Printed dither

**Intent.** The dither becomes the material. The tile is coarser (12 px, 3 px dots in light), so fills, rules and entrances are visibly dotted, like a print. Pressed states fill through the dither and sit at level 6 for a beat before going solid. Rules are dither bands. Headings are larger and carry a band beneath them. Level 1 texture is allowed in gutters and frames around media, never behind text. Motion is one gesture everywhere: resolve through 2 → 4 → 6 → solid, the way the page transition already does. This is the direction for components that are *shown* more than read (heroes, media, stats, quotes, 404, tool stages).

- **Type rhythm.** Departure h1 66 (44 on phones), h2 33, h3 22; the stat numeral 66 (44 on phones). Reading Geist Sans 18 px / 1.55, measure 62 ch. Captions and metadata Departure 11. Spacing 11 / 22 / 33 / 66 with more air: headings get 66 above, 22 below. Every h2 carries a 4 px `C-band` below it (never behind it).
- **Rules and lines.** `C-band`: a 4 px tall dither band at level 4, 12 px tile, for soft rules, heading rules and quiet links (3 px under links). Hard boundaries are 2 px solid ink (a heavier print line). Frames around media: 1 px hairline plus a 6 px level-1 gutter outside it.
- **Cell density.** Full scale, but cells are 12 px and there are fewer: chips 12 × 12, rails 8 × 22, footer meter 8 cells of 10 × 10. Texture (level 1) appears in: media gutters, the sheet scrim, the 404 field, the empty state, tool stage margins. Never under a label.
- **Marker.** `C-marker`: 6 px wide, full height, left edge, arriving through **levels** not width: level 3 → 6 → 8 at 50 ms each (150 ms). The label steps 5 px aside in 1 step at 100 ms. Under-markers 3 px tall, same level steps. Leaves through 6 → 3 → 0 (150 ms).
- **Motion character.** Entrance = `C-dissolve`: the element is masked through `--dither-2`, `-4`, `-6`, then unmasked, 50 ms per step (200 ms), in ordered-dither (Bayer) order across a group with 480 ms total. Media use the same dissolve as a paper cover (R4, 480 ms, 16 px cells). No band sweep in C. Exit = `C-afterglow`: mask 8 → 4 → 2 → 0, 60 ms per step (180 ms). Panels = `C-switch`: the panel resolves through the dither from a 2 px line, 4 steps over 240 ms. Press = fill in Bayer order 2 → 4 → 6 at 50 ms, **hold at 6 for 120 ms, then 8**; hold 400 ms; out 6 → 4 → 2 → 0 at 60 ms. Selection: the new option resolves 2 → 6 → 8, the old one 8 → 4 → 0, both 240 ms.
- **Colour.** Ink, paper, signals. Done checks and the ok cell are drawn at level 8 in `--signal-ok`; error cells at level 8 in `--signal-fail`. The ok and fail cells may be dithered (level 5) while *in progress toward* a result, never when final.
- **Dark mode.** The tile drops to 8 px (2 px dots) so bright dots on dark do not sparkle. Pressed hold sits at level 5 instead of 6. Texture zones use level 1 at 8 px tile. Heading bands stay level 4.

### Per-direction tokens (the review page sets these on each column; the site would set them in `:root` for the chosen direction)

| Token | A | B | C (light / dark) |
| --- | --- | --- | --- |
| `--dither-size` | 8px | 8px | 12px / 8px |
| `--cell-size` (default) | 6px | 7px | 12px |
| `--cell-gap` | 2px | 1px | 2px |
| `--marker-width` | 4px | 7px | 6px |
| `--marker-height` | 2px | 3px | 3px |
| `--marker-step` | 40ms | 30ms | 50ms |
| `--label-step` | 4px | 8px | 5px |
| `--snap` | 120ms | 280ms | 200ms |
| `--sweep` / bands | 300ms / 6 | 360ms / 10 | not used (dissolve 480ms) |
| `--afterglow` / steps | 120ms / 2 | 180ms / 3 | 180ms / 3 |
| `--switch` | 200ms | 240ms | 240ms |
| `--stagger-total` | 400ms | 600ms | 480ms |
| `--press-in / hold / out` | 160 / 200 / 160 ms | 180 / 260 / 220 ms | 150 (+120 hold at 6) / 400 / 180 ms |
| `--rule-soft` | 2px level 3 | 3px cell row level 3 | 4px band level 4 |
| `--type-h1 / h2 / h3` | 66 / 33 / 22 | 44 / 22 / 22 | 66 / 33 / 22 |
| `--read-size / line` | 17px / 1.6 | 16px / 1.5 | 18px / 1.55 |
| `--space-unit` | 11px | 8px | 11px |

---

## 2. Component inventory

Everything below was found in `src/components`, `src/pages`, `src/lib/content.ts` and `global.css` sections 16–27 plus the round 4 case evidence block. Numbering is the component id used by the review page (`cmp-<id>`).

**Chrome**
1. `nav` Site nav (logo mark, five links, cell rule, case-variant reading line)
2. `theme` Theme control (nav icon; footer "Theme · Auto")
3. `motion` Motion control (footer; nav variant on footer-less tool pages)
4. `footer` Footer (four columns, base row)
5. `back-to-top` Back to top with the progress cells
6. `dialog` Booking / walkthrough dialog (`<dialog>`, close button, backdrop)
7. `skip` Skip link (not on the site today; proposed in the component plan)

**Actions**
8. `primary` Primary button (press → Sending → Sent)
9. `secondary` Secondary button
10. `quiet` Quiet action (word + dither rule + arrow nudge)
11. `inline-link` Inline link in prose
12. `arrows` Arrows and back links (→ ↗ ←, breadcrumb)
13. `icon-button` Icon button (video toggle, full-screen, close, play)
14. `case-link` The one big link in a case (`.case-link`)

**Selection**
15. `segmented` Tabs and segmented controls (case switch, breathing grid, flip tabs, turntable tabs, pc-controls)
16. `select` Select (tool select with chevron; banner listbox)
17. `checkbox` Checkbox and switch (tool kit checkbox, `.control-toggle`)
18. `slider` Slider (cell-range over a real input)
19. `stepper` Stepper (deck arrows under live embeds; proposed − / value / +)
20. `disclosure` Disclosure (`pc-disclosure`, notes search `<details>`, studio "More controls")

**Lists**
21. `notes-rows` Notes rows + search + count + empty state
22. `labs-rows` Labs rows (screen, number, title, body, Open →)
23. `item-rows` Published items (About) and experience rows (CV)
24. `entry-rail` Home entry rail (`homepage-timeline__toc`)
25. `work-entry` Home work entry (date, title, media, caption label, context, impact, link)
26. `private-work` Private work link block

**Case pages**
27. `hero` Hero: breadcrumb, status chip, read time, title, summary
28. `facts` Facts list under the summary
29. `caption` Figure captions (`case-figure-head`, `figcaption`)
30. `compare` Compare switch (`case-compare`), drag slider (`case-slider`), x-ray lens (`case-lens`)
31. `video` Video player (`cell-player`) and the overview strip
32. `grid` Image grid and gallery (`case-image-grid`, `case-gallery` with theme tags)
33. `live` Live embed (`case-live`: frame, corner full-screen, tags, switcher)
34. `quote` Pull quote and the quotes carousel (`case-pull-quote`, `case-quotes`)
35. `stat` Stat row (`case-stats`, count-up)
36. `timeline` Day-cell timeline (`case-timeline`)
37. `sibling` Sibling nav (+ coming soon)
38. `contact-prompt` Contact prompt
39. `index-rail` Case index, desktop rail
40. `index-phone` Case index, phone strip and sheet
41. `walkthrough` Walkthrough trigger
42. `cover` Case cover / hero media entrance (R4)

**Feedback**
43. `loaders` Loaders: quarter turn, dither bar, sweep, breathing cells, mosaic poster, turntable skeleton
44. `empty` Empty state
45. `toast` Toast (proposed)
46. `tooltip` Tooltip (proposed; `title` today)
47. `field` Text field and textarea (contact, private access), error state
48. `form-status` Form status line (contact), working and done on the submit
49. `not-found` 404
50. `status-line` Status lines and live regions (notes count, copy status)

**Labs tool panels**
51. `tool-panel` Tool panel (labels, values, sliders, buttons, select, checkbox, settings textarea)
52. `tool-primary` Tool primary and export with progress (banner Save, studio exports)
53. `drop-zone` Drop zone (SVG studio)
54. `swatches` Swatches (SVG studio colour)
55. `next-tool` Next tool row (`labs-tool-related`)

**Page**
56. `transition` Page transition
57. `reveal` Reveal (snap, sweep, dissolve) with stagger
58. `point-refresh` Point refresh on hover (R5)

---

## 3. Per-component specification

Format for each: **Baseline** (what the site does today, one line) · **A / B / C** (structure, sizes, states, motion, phone) · **Contracts** where a direction risks one. "States" lists only what differs from the shared ladder: rest hairline → hover marker → focus 2 px outline → pressed/selected fill → working loader + word → done marker + check + word → disabled dotted + reason → error one sentence, two flashes, then still. Sizes are px unless a token is named. "Phone" means ≤ 640 px (container width on the review page).

Shared vocabulary used below: `A-marker`, `B-marker`, `C-marker`, `A-soft`, `B-rule`, `C-band`, `A-snap`, `B-snap`, `C-dissolve`, `A/B/C-afterglow`, `A/B/C-switch`, and the press timings from the token table in §1.

### Chrome

#### 1. Site nav
**Baseline.** 64 px bar, hairline below, logo mask 38 px left, five Geist Sans 500 14 px links centred (44 px targets), theme icon right. Current link: a 3 px cell rule (4 px cells, 1 px gaps) under the link; hover fills a half-dithered rule left to right in 7 steps over 140 ms. Case variant adds a 2 px dithered reading line at the bar's bottom edge. Phone: brand + controls row, then five equal links on a hairline (13 px).

- **A.** Bar 66 px (6 × 11). Links Geist Sans 500 14 px, `--muted`; current link ink. Current marker: a 2 px solid rule under the link text (text width, not target width), no cells. Hover: an `A-marker` under-rule (2 px) arrives in 3 steps over 120 ms; leaves in 1 step. Choosing a link: the old rule steps out (1 step) and the new rule steps in after the page dissolve. Case reading line: 1 px solid ink, grows with scroll (as today, solid). Logo 33 px. Phone: 44 px link row, 13 px; current rule 2 px.
- **B.** Bar 64 px (8 × 8). Links as today; each link is preceded by a Departure 11 counter `1`–`5` in `--muted` at 8 px gap (counters are decorative: `aria-hidden`). Current: today's `B-rule` at level 8 under the whole target width. Hover: the rule fills in reading order, 7 steps over 140 ms at level 4; leaving empties right to left. Choosing: the current rule hands over, old empties 140 ms while new fills 140 ms. Case reading line: a row of 4 px cells, 3 px tall, filling left to right with progress (`setLevel` per cell, leading cell dithered). Logo 32 px. Phone: counters hidden, five links as today, 3 px rule.
- **C.** Bar 66 px, bottom edge is a 2 px solid ink line. Links Geist Sans 500 14 px. Current: a 3 px `C-band` at level 8 (solid) under the link text. Hover: the band arrives through levels 3 → 6 → 8 at 50 ms (150 ms), leaves 6 → 3 → 0. Choosing: the new band resolves while the old dissolves, 150 ms each. Case reading line: a 4 px band at level 4 whose filled part is solid; progress resolves per 12 px cell. Logo 36 px. Phone: link row 48 px tall, 14 px text, band 3 px.
- **Contracts.** `aria-current="page"` on the current link in all three; the rule is CSS only. Targets stay ≥ 44 px. The case reading line is `aria-hidden`. Keep the "Primary" nav label and five links (verify-site).

#### 2. Theme control
**Baseline.** Nav: a 15 px half-filled square, no frame, 48 px target, tooltip through `title`; on flip the interior dithers 2 → 4 → 6 → none over 240 ms. Footer: "Theme · Auto" text setting with the value in Departure 11. Cycles auto → light/dark → auto.

- **A.** Nav icon: a 13 px square outline (2 px stroke) half filled; flip = the fill side swaps in 1 step after a 120 ms single-step blank. Tooltip: a real tooltip (see 46) saying "Theme: automatic" on hover and focus. Footer: "Theme" Geist Sans 15 px + value "Auto" / "Light" / "Dark" in Departure 11, value steps in 1 step. Hover: text to ink; no marker (settings are quiet words).
- **B.** Nav icon: a 5 × 5 cell icon (`themeLight` / `themeDark` from `cells.js`, 3 px cells, 15 px total) that **morphs** cell by cell in 3 steps over 120 ms (`morphIcon`). Under it, a 2-cell `B-rule` shows the state: auto = 3·3, light = 8·0, dark = 0·8. Footer: "Theme" Departure 11 label, then a 3-cell meter + the word. Hover: a 3 px under-rule fills in reading order.
- **C.** Nav icon: a 15 px square filled through the dither; auto = level 4, light = level 1 outline only (2 px stroke, empty), dark = level 8. Flip = resolves 2 → 4 → 6 → target over 200 ms at 12 px tile (dots visible at this size: use 4 px tile for the icon so at least 3 dots show per side). Footer: "Theme" + a 12 px cell at the current level + the word. Hover: the cell's level rises one step (never beyond 8) and returns; the word goes ink.
- **Contracts.** Keep `aria-label` and the polite status text from `ThemeToggle.astro`. Tooltip must not replace the accessible name.

#### 3. Motion control
**Baseline.** Footer button "Motion ON / OFF / REDUCED" (name lower-cased with a capital, state in Departure 11), `aria-pressed`, disabled under system reduced motion, hidden without JavaScript. Nav variant on tool pages.

- **A.** "Motion" Geist Sans 15 px + state word "On" / "Off" / "Reduced by system" in Departure 11. Off: the state word is `--muted`. Reduced: dotted outline on the control, reason as the state word ("Reduced by your system"). Hover: text to ink. Click: the state word swaps in 1 step.
- **B.** "Motion" Departure 11 label + a 2-cell switch (7 px cells, 8 px pitch, inside a 1 px hairline 20 × 11 px): on = 8·8 with the right cell blinking 1 on / 1 off on the tick (one visible moving thing, which is what the control is for); off = 0·0; reduced = dotted outline around the switch, cells 0·0, reason in words. Click: cells step 0 → 4 → 8 in 2 steps of 30 ms.
- **C.** "Motion" + a 12 px cell: on = level 8 pulsing 8 → 6 → 8 every 10 ticks (400 ms); off = level 0 with a 1 px outline; reduced = dotted cell + reason. Click: the cell resolves through 2 → 4 → 6 → 8 (200 ms) or dissolves back.
- **Contracts.** Keep `data-motion-toggle`, `aria-pressed`, `aria-describedby` and the description text ("Motion is on / off", "Reduced by system setting"). When off or reduced, **the control's own blink stops** in B and C and shows the rest frame. Still 44 px tall.

#### 4. Footer
**Baseline.** Paper, hairline above, four columns (Site, Contact, Feeds, Settings) with Departure 11 headings in `--muted` and Geist Sans 500 15 px links at 48 px rows; base row with a 24 px logo mark, "Alexander Traykov · Sofia, Bulgaria · 2026" in 13 px, and Back to top. 2 columns at ≤ 820.

- **A.** As baseline with 66 px top padding, headings Geist Sans 500 13 px `--muted` (not Departure), links 15 px, base row text 13 px. Link hover: text to ink only (no marker in the footer; it is the quietest surface). Columns 4 → 2 at 820 → 1 at 480 (stacked, each column keeps its heading).
- **B.** Headings Departure 11 with a `B-rule` at level 3 under each heading (2 px). Each link row gets an `B-marker` on hover (column of 7 px cells, 48 px tall = 6 cells) and the label steps 8 px. Base row text Departure 11. Columns 4 → 2 → 1 as A.
- **C.** Top edge is a 2 px solid line. Headings Departure 11 with a 4 px `C-band` beneath. Links 15 px; hover is a `C-marker` 6 px arriving through levels. Base row 13 px. Columns as A.
- **Contracts.** Keep the four columns, no call-to-action band, the "Back to top" label, the booking link's `data-booking-modal-open`, and the Settings column holding theme and motion.

#### 5. Back to top
**Baseline.** A link "Back to top · 61% down" with 16 cells (5 × 10 px, 1 px gaps) filling with scroll progress, leading cell dithered.

- **A.** Text "Back to top" 13 px, then one 6 × 16 px cell whose level is the page progress (0–8) — one cell, not a meter. Hover: text to ink. Click: smooth scroll to top is allowed (it is the one scroll the visitor asks for); the cell empties in 8 steps over 240 ms as the page arrives.
- **B.** 24 cells (7 × 10 px, 1 px gaps) and the percentage in Departure 11 "61% down". Hover: `B-marker` under-rule. Click: cells empty right to left in reading order over 240 ms while scrolling.
- **C.** 8 cells of 10 × 10 px at 12 px tile; the leading cell is at a dither level; percentage Departure 11. Hover: the row's leading cell rises a level. Click: all cells dissolve 8 → 4 → 0 over 180 ms.
- **Contracts.** `href="#top"` keeps working without JavaScript; cells are `aria-hidden`; the percentage is decorative text, not the accessible name.

#### 6. Dialog (booking, walkthrough)
**Baseline.** `<dialog>` with a header (Departure h2), a "×" close button, an iframe or video, backdrop dimmed. Opens with `showModal()`, closes on backdrop click, returns focus.

- **A.** Panel: paper, 1 px hairline, max 720 × 80 vh, no shadow. Header: h3 22, close is an icon button (see 13) with a 5 × 5 cell close icon. Backdrop: paper at 50 % (`--paper-50`). Open: `A-switch` from a 2 px line to full height in 4 steps over 200 ms, then content in 1 step. Close: reverse, 160 ms.
- **B.** Panel: 1 px ink border; header has a Departure 11 counter-style label ("Booking") and a close button with a cell icon; a 4 px `B-rule` at level 3 runs under the header. Backdrop: ink at 46 % (`--ink-46`). Open: `B-switch` 240 ms then content `B-snap`. Close: `B-afterglow`.
- **C.** Panel: 2 px ink border with a 6 px level-1 gutter outside it (texture in the frame, not behind content). Backdrop: a level-2 dither scrim at 12 px tile in ink (not a flat tint) — the scrim is texture over the page, never behind the dialog's text. Open: panel `C-dissolve` 200 ms. Close: `C-afterglow` 180 ms.
- **Contracts.** Native `<dialog>`; close button ≥ 44 px, labelled "Close"; Escape closes; focus returns to the trigger. With motion off the dialog appears and disappears instantly.

#### 7. Skip link (proposed)
**Baseline.** None today.

- **A / B / C.** A secondary-style button "Skip to content" positioned at the top-left, visually hidden until focused; on focus it is drawn in that direction's secondary button style. Motion: appears in 1 step in all three (focus must not wait).
- **Contracts.** First focusable element on the page; target `#top` exists on every page already.

### Actions

#### 8. Primary button
**Baseline.** 48 px tall, 180 px minimum, 1 px ink border, paper fill, Geist Sans 500 15 px, 20 px side padding. Hover: a 6 px left marker in 3 steps over 120 ms, label steps 5 px. Press: diagonal dither fill 180 ms / 8 steps, hold 260, out 220; label in difference blend. Working: quarter turn (2 × 2 cells, 6 px) + "Sending…"; done: green 5 × 5 check + "Sent" for 1.6 s. Disabled: dotted outline, muted.

- **A.** 44 px tall, 176 px min (16 × 11), 1 px ink border, Geist Sans 500 15 px. Hover: `A-marker` 4 px. Press: fill in reading order 160 ms (levels 2, 4, 6, 8), label inverts at level ≥ 6, hold 200, out 160. Working: quarter turn 2 × 2 at 5 px cells on the tick + "Sending". Done: marker held, check in `--signal-ok`, "Sent", 1.5 s, then marker steps out. Disabled: dotted outline, reason beneath in 13 px `--muted` ("Add a message first"). Error: border flashes `--signal-fail` twice at 120 ms, then stays; sentence beneath. Phone: full width.
- **B.** 48 px tall, 184 px min (23 × 8), 1 px ink border. Hover: `B-marker` column (6 cells). Press: diagonal fill 180 / 260 / 220 (baseline). Working: a 4-cell dither bar at the button's bottom edge (7 px cells) walking on the tick + "Sending"; the quarter turn is replaced by the bar so the button's own grid shows. Done: check + "Sent". Disabled and error as A. Phone: full width.
- **C.** 48 px tall, 1 px ink border. Hover: `C-marker` through levels. Press: Bayer fill 2 → 4 → 6 at 50 ms, hold at 6 for 120 ms, then 8; label inverts at level ≥ 6; hold 400; out 6 → 4 → 2 → 0 at 60 ms. Working: the whole fill rests at level 5 (visibly dithered, text still inverted) with a 12 px quarter turn + "Sending". Done: fill dissolves, check at level 8 in `--signal-ok` (12 px cells → draw the check at 3 px cells; the signal colour, not the tile, is what changes), "Sent". Disabled: dotted outline at 12 px tile (dots spaced 3 px: still reads as dotted). Phone: full width.
- **Contracts.** One primary per view. Label text never changes during the press except for working/done words. Difference blend stays off in forced-colours mode (rest state is fine). Disabled uses `aria-disabled` + `aria-describedby` to the reason.

#### 9. Secondary button
**Baseline.** Same box as primary without the min-width; press is the same fill.

- **A.** As 8-A, no min-width, border `--ink`. Press: fill reading order to level 8, hold 200, out. Hover `A-marker`.
- **B.** As 8-B, no min-width. Press: diagonal fill. The bottom edge carries a 2 px `B-rule` at level 3 **only while hovered** (the marker is still the hover signal; the rule is the "secondary" tell).
- **C.** As 8-C, border 1 px, press fills only to level 6 and holds there (secondary never goes solid), out 4 → 2 → 0. Hover `C-marker`.
- **Contracts.** Never two different box sizes beside a primary; both 44 (A) or 48 (B, C) tall.

#### 10. Quiet action
**Baseline.** A word in Geist Sans 500 15 px, 44 px tall, no box, 2 px rule at level 3 under the text; hover makes the rule solid; the arrow `→` nudges 0 → 2 → 4 → 3 px over 240 ms.

- **A.** Word 15 px, `A-soft` 2 px rule 8 px tile. Hover: rule to solid in 1 step; arrow nudges 2 steps (2 px, 3 px) over 120 ms. Pressed: the word inverts? No — quiet actions have no fill; pressed is the rule going 3 px for 100 ms. Disabled: rule dotted (level 2), word muted, reason in words.
- **B.** Word 15 px with a `B-rule` 2 px at level 3 under it (cell row). Hover: the row fills to level 8 in reading order, 7 steps over 140 ms; the arrow nudges 3 steps over 90 ms (2, 4, 3 px). Pressed: row to level 8 instantly, holds 200 ms.
- **C.** Word 15 px with a 3 px `C-band` level 4 under it. Hover: band resolves 4 → 6 → 8 at 50 ms; arrow nudges 1 step of 4 px at 100 ms then settles to 3 px. Pressed: band at 8 for 200 ms then back to 4 via 6.
- **Contracts.** 44 px tall target even though the visible text is small. The arrow is `aria-hidden`.

#### 11. Inline link in prose
**Baseline.** Ink text, dotted 2 px underline at 4 px offset; hover makes it solid.

- **A.** 2 px `A-soft` dotted underline (CSS `text-decoration-style: dotted`), 4 px offset; hover solid in 1 step. Visited is not drawn differently. External links get `↗` after the text in Geist Mono.
- **B.** 2 px underline drawn as a cell row (4 px cells, 1 px gaps via `text-decoration-style: dashed` at 2 px thickness; if the dash pitch cannot be controlled, use a masked `background-image` under the text). Hover: solid, in reading order over 140 ms (clip-path on the background). External `↗`.
- **C.** 3 px dither band under the text at level 4 (background mask), 5 px offset; hover: band resolves to solid through 6 (100 ms). External `↗`.
- **Contracts.** Underline never removed; colour never the only cue. Ink text in all three.

#### 12. Arrows and back links
**Baseline.** `→` internal, `↗` external, `←` back, Geist Mono. Breadcrumb "← Work" in Geist Sans 500 14 px with a 2 px level-3 rule; hover solid.

- **A.** Arrows Geist Mono 400 at the surrounding size. Back link: "← Work" 14 px, `A-soft` rule, hover solid; the arrow nudges **left** 2 steps over 120 ms.
- **B.** Arrows Geist Mono; the back link is "← Work" preceded by nothing (no counter on back links); rule is a `B-rule` 2 px level 3; hover fills right to left (back) in 7 steps.
- **C.** Arrows Geist Mono; back link has a 3 px `C-band`; hover resolves to solid. The arrow nudges left 4 px in 1 step and settles at 3 px.
- **Contracts.** Arrows are `aria-hidden`; link text carries the meaning ("Work", not "←").

#### 13. Icon button
**Baseline.** 44 px square, 1 px ink border, paper, a 5 × 5 cell icon at 3 px cells (play/pause/close) or the SVG full-screen glyph; hover: a 3 px under-marker inside the bottom edge or an inset 6 px left marker; full-screen button inverts on hover.

- **A.** 44 px square, 1 px border, 5 × 5 cell icon at 3 px (15 px). Hover: `A-marker` 4 px left. Pressed (toggle on, e.g. pause): fill solid, icon inverts; the icon morphs 3 steps over 120 ms. Tooltip on hover and focus (46). Disabled: dotted + reason in the tooltip and `aria-describedby`.
- **B.** 48 px square (6 cells), 1 px border, icon at 3 px cells. Hover: `B-rule` 3 px under-rule filling left to right. Pressed: diagonal fill 180 ms; icon morphs on the tick (one cell per tick, reading order, 25 cells → 1 s is too long; use 3 steps of 40 ms as today).
- **C.** 48 px square, 1 px border with a 4 px level-1 gutter outside (icon buttons sit on media, so the gutter separates them from the picture). Icon at 3 px cells. Hover: `C-marker` 6 px left through levels. Pressed: Bayer fill to 6, hold, 8; icon inverts.
- **Contracts.** Accessible name on the button ("Play video", "Pause video", "Open full screen", "Close"); `aria-pressed` on toggles; ≥ 44 px.

#### 14. The one big link in a case (`.case-link`)
**Baseline.** Departure 33 (22 on phones) in `--link-blue`, 2 px underline at 6 px offset; hover fills blue with paper text; blue focus ring. A caption line beneath.

- **A.** Departure 33 (22 phone) in ink, 2 px solid underline, hover: underline becomes 4 px (1 step), arrow `↗` nudges. No blue. Caption 15 px `--muted`.
- **B.** Departure 33 in ink with a 4 px `B-rule` at level 8 beneath (cell row, 4 px cells); hover: the row doubles to 8 px tall in 1 step; a Departure 11 counter "Link" label above.
- **C.** Departure 44 (33 phone) in ink with a 6 px `C-band` at level 6 beneath; hover: band resolves to 8 and the text inverts on a solid ink block **only on the text's own line box** (a fill behind text is pressed/selected vocabulary; this is the one component where the baseline already inverts — keep it as the hover on this link only, or drop the inversion; the review page shows both so Alexander decides: C-1 band only, C-2 inversion).
- **Contracts.** If `--link-blue` is dropped the link must still be unmistakable: underline thickness ≥ 2 px at rest in all three. Focus ring ink.

### Selection

#### 15. Tabs and segmented controls
**Baseline.** One ink-ruled group (1 px border, 1 px dividers), 44 px options, Geist Sans 500 14 px, 16 px side padding; selected is solid ink with paper text; `segmented.js` hands the fill over (new fills in reading order 240 ms, old empties 200 ms) and band-sweeps the panel; arrow keys move; hover is a 3 px under-marker.

- **A.** Group: 1 px hairline border, no dividers; options 44 px, 16 px padding. Selected: solid ink, paper text (the ladder's fill), filled in reading order 160 ms. Hover: `A-marker` 2 px under-rule. Panel change: `A-snap` (1 step) — no sweep. Phone: options wrap to a second row; the group keeps its border.
- **B.** Group: 1 px ink border, 1 px dividers; options 48 px (6 cells), Departure 11 counters `1`, `2` before each label at 8 px gap. Selected: diagonal fill to solid; handoff as today (240 / 200). A 3 px `B-rule` under the group shows position: the selected option's span is level 8, the rest level 0. Hover: under-rule fills in reading order. Panel: `B-sweep` 10 bands. Phone: options scroll horizontally in one row (48 px), rule follows.
- **C.** Group: 2 px ink border, no dividers; options 48 px. Selected: Bayer fill 2 → 4 → 6 (hold 120) → 8; the old option dissolves 8 → 4 → 0. Hover: `C-marker` 3 px under-band through levels. Panel: `C-dissolve` 200 ms. Phone: options wrap; selected keeps its fill.
- **Contracts.** `aria-pressed` (switch groups) or `role="tablist"` + `aria-selected` + roving tabindex (tabs). 44 px minimum; 36 px only inside tool panels (51). The secondary small label (`small`, e.g. "Before") stays Departure 11.

#### 16. Select
**Baseline.** Tool select: native `<select>` with appearance off, 40 px, 1 px ink border, 12 px left padding, 40 px reserved end padding, a 6 px chevron drawn 14–20 px from the right edge. Banner uses a custom listbox.

- **A.** 44 px, 1 px hairline border, Geist Sans 500 14 px; chevron: a 5-cell `chevron` icon (3 px cells, 15 × 9 px) 14 px from the right edge, 44 px reserved end padding. Open (custom listbox variant): the list `A-switch`es on under the control, 1 px border, options 44 px, selected option has an `A-marker` 4 px held. Hover: `A-marker`.
- **B.** 48 px, 1 px border; chevron cell icon; the control carries a 3 px `B-rule` at level 3 along its bottom edge that fills to 8 while open. Options 48 px with counters. Selected option: diagonal fill to solid. Open: `B-switch` 240 ms, options `B-snap` in reading order.
- **C.** 48 px, 2 px border; chevron cell icon; open: list `C-dissolve`; selected option: fill at level 6 (secondary-style), hover `C-marker`.
- **Contracts.** The `AGENTS.md` select rule: visible chevron, reserved end padding, a clear gap between label, chevron and border; verify the longest label ("Presentations in Code" and the longest turntable example name) at 375 px. Native `<select>` stays the fallback; the listbox variant is a `button` + `role="listbox"` with full keyboard support.

#### 17. Checkbox and switch
**Baseline.** Tool checkbox 18 px square, 1 px border; checked = ink with a 3 px paper inset. `.control-toggle` is a label with the same checkbox.

- **A.** Checkbox 18 px, 1 px border; checked: fills in 3 dither steps (3, 6, 8) at 40 ms, then a 5 × 5 check in paper at 2 px cells. Switch: two 18 px cells in a 1 px frame; on = right cell 8, left 0; change: the fill walks across in 2 steps of 40 ms. Label Geist Sans 14 px.
- **B.** Checkbox 16 px (2 cells), checked fills 0 → 4 → 8 (2 steps of 30 ms); a Departure 11 "On" / "Off" word after the label in `--muted`. Switch: 2 cells 7 px pitch 8 inside a hairline; on = 8·8 (both lit), off = 0·0, half = 8·0 for indeterminate.
- **C.** Checkbox 24 px (2 dither tiles), checked resolves 2 → 4 → 6 → 8 at 50 ms; check at 3 px cells in paper. Switch: one 24 × 12 cell pair; on = 8, off = 0, moving through 4.
- **Contracts.** Real `<input type="checkbox">` (and `role="switch"` + `aria-checked` for switches); 44 px total hit area including the label; focus ring on the drawn box.

#### 18. Slider
**Baseline.** `cell-range`: 24 cells (14 px tall, 2 px gaps) filling to the value with a dithered leading cell; the real range input sits on top invisible, 24 px hit height; focus outline on the track. Playground/turntable use a checker rail with a 6 × 20 px thumb.

- **A.** Track: a 2 px hairline, 44 px hit height; a 4 × 16 px solid thumb; the filled part of the hairline is 2 px solid ink, the rest `--line`. Value in Departure 11 right-aligned, label Geist Sans 13 px. Drag: the thumb moves continuously (it tracks the finger; that is real position, not decoration); on release the value snaps in 1 step. Disabled: dotted thumb, 45 % track.
- **B.** 24 cells of 7 px pitch 8, 12 px tall; leading cell dithered to the fractional value (as today). Value Departure 11. Keyboard steps change one cell with a 30 ms step. Hover: the track's leading cell rises one level. Disabled: cells at level 1 with a dotted frame.
- **C.** 12 cells of 12 px, 2 px gaps, 12 px tall; the leading cell shows the fraction through levels 2 → 7; a 2 px solid thumb line marks the exact value over the cells. Disabled: dotted frame, cells at 1.
- **Contracts.** Real `<input type="range">` on top with `aria-valuetext` where units matter; focus ring 2 px around the whole track (as today); 36 px hit height allowed only inside tool panels.

#### 19. Stepper
**Baseline.** Deck arrows under live embeds: two 48 px buttons ("Previous" / "Next" in Departure 11, 1 px border, invert on hover) and an `output` "3 / 12" in Departure 11. The − / value / + stepper exists only in the plan.

- **A.** `−` and `+` as 44 px icon buttons (13-A) with the value in Departure 22 between them, 11 px gaps; the value changes in 1 step. Deck arrows: secondary buttons "Previous" / "Next" with `output` 11.
- **B.** 48 px buttons; the value in Departure 22 with a 3 px `B-rule` beneath whose filled cells show position (12 slides = 12 cells). Press: diagonal fill; the value digit resolves through `░ ▓` in 2 steps of 30 ms (text swap only; it is one glyph, so it reads as a step, not scramble).
- **C.** 48 px buttons with 2 px borders; value in Departure 33; press fills to level 6 and back. Position: a 12-cell row of 12 px cells under the value.
- **Contracts.** Buttons labelled "Previous slide" / "Next slide"; `output` is a live region; at the ends the button is disabled with the dotted outline and the reason "First slide" / "Last slide".

#### 20. Disclosure
**Baseline.** `<details>` with a summary ("Read & copy skill", "Search notes"); `pc-disclosure` draws a pixel chevron; the studio's "More controls" is the same pattern.

- **A.** Summary is a quiet action (10-A) with a `chevron` cell icon that morphs to `chevronUp` (3 steps, 120 ms); the panel `A-switch`es open (200 ms) under a hairline.
- **B.** Summary with a Departure 11 counter and the chevron icon; a 3 px `B-rule` at level 3 under the summary fills to 8 while open; content `B-switch`es then `B-snap`s.
- **C.** Summary with a 3 px `C-band`; open resolves the panel (`C-dissolve`) and the band goes solid; the panel has a 6 px level-1 gutter on its left edge (texture in the margin).
- **Contracts.** Native `<details>`; summary ≥ 44 px; with motion off the panel toggles instantly; the chevron is decorative.

### Lists

#### 21. Notes rows, search, count, empty state
**Baseline.** One link per row: Departure 22 title left, Departure 11 date and read time right, hairline beneath, Departure 22 arrow. Hover: a 6 px left marker in 3 steps, title and meta step 14 px right. Search is a `<details>` with a search input; `output` gives the count; rows that stop matching leave with `mark-afterglow` 180 ms and returning rows snap in; the empty state is a cells icon, "Nothing here yet" (Departure 22) and one sentence.

- **A.** Row 66 px tall (title 22 + meta 11 on 11 px rhythm), hairline beneath, title Departure 22, meta Geist Sans 13 px `--muted` right-aligned, arrow Geist Mono 22. Hover: `A-marker` 4 px; title steps 4 px. Search: a 44 px underline field (47-A) under a quiet "Search notes" summary; count "3 notes" 13 px `--muted`. Filter: leaving rows `A-afterglow` 120 ms; returning rows `A-snap` in reading order, 400 ms total. Empty: a single 6 × 16 cell at level 1, "Nothing here yet" 22, sentence 17 px. Phone: meta moves under the title; row 88 px.
- **B.** Row 64 px, `B-rule` level 3 beneath (cell row), a Departure 11 counter `01` left of the title (2.4 ch column), title 22, meta Departure 11. Hover: `B-marker` column (8 cells), title steps 8 px. Count "3 notes" Departure 11 with a 3-cell meter (matches / total as a fraction of 24 cells → 24-cell meter showing matches of total). Filter: `B-afterglow` 180; returning rows `B-snap` in reading order over 600 ms; counters renumber (CSS counters, so no text change). Empty: a 5 × 3 cells icon breathing at rest on the tick (diagonal wave through levels 1–3, one cell per tick), "Nothing here yet", sentence 16 px. Phone: counter stays, meta under title.
- **C.** Row 66 px, 4 px `C-band` level 4 beneath, title Departure 22, meta Departure 11. Hover: `C-marker` through levels, title steps 5 px. Search: underline field with a 3 px band; count 11. Filter: leaving rows `C-afterglow` (dither 8 → 4 → 2 → 0), returning rows `C-dissolve` in Bayer order, 480 ms. Empty: a 6 × 4 field of 12 px cells at level 1 (texture, no text over it), "Nothing here yet" 33, sentence 18 px. Phone: meta under title.
- **Contracts.** Rows are single links (title + meta inside one `<a>`); the count is a polite live region in plain words; the empty state is `hidden` until needed; the search works without JavaScript as a plain list (no filter).

#### 22. Labs rows
**Baseline.** Two-column grid of links: a 16:10 screen (hairline frame, inverted in dark), a Departure 11 number and meta, Departure 22 title, 16 px body (46 ch), "Open →" 15 px with a level-3 rule. Hover: a 3 px marker under the screen, frame to ink, rule solid, arrow nudge; screens band-sweep in and point-refresh on hover. Single column at ≤ 820.

- **A.** List, not grid: one row per tool, 132 px screen on the left (16:10 → 132 × 83), title 22, body 17 px, "Open →" quiet. Hairline between rows. Hover: `A-marker` on the row's left edge; the screen's frame goes ink. Entrance: `A-sweep` 6 bands on the screen. Phone: screen above text, full width.
- **B.** Two-column grid as today; number `01` Departure 11 with a 3 px `B-rule` level 3 across the card top; the screen frame is 1 px ink; hover: `B-rule` under the screen fills in reading order (7 steps) and the "Open →" row fills. Entrance: `B-sweep` 10 bands per screen, reading-order stagger 600 ms across the four. Phone: single column.
- **C.** Two-column grid; the screen sits in a 6 px level-1 gutter inside a 1 px hairline frame (texture around the picture); title 22, body 18 px; hover: the gutter rises to level 3 (texture, no text over it) and `C-marker` under-band under the screen. Entrance: `C-dissolve` (R4 paper cover, 480 ms) per screen. Phone: single column.
- **Contracts.** One link per row/card; the screen `img` has a real `alt`; dark inversion stays unless the screen is marked `data-screen-invert="false"`; the review page shows a **cell placeholder** (a 16:10 box of 12 px cells at level 1 with a 5 × 5 solid glyph) instead of a real screen, because the page carries no images.

#### 23. Published items and experience rows
**Baseline.** Rows with an h2 Departure 22 (CV) or a title + body (About), a Departure 11 left column (dates), and a secondary button ("Visit", "Read") where there is a link. No background on hover.

- **A.** As 21-A with the date column 11 px `--muted` left (88 px column), title 22, body 17 px, secondary button 44 px on the right; hover marker on the button only (the row is not a link).
- **B.** As 21-B: counter + `B-rule`, date in Departure 11, button 48 px with the `B-marker`.
- **C.** As 21-C: band beneath, date 11, title 22, body 18 px, secondary at level-6 press.
- **Contracts.** When the whole row is not a link, the hover marker belongs to the button, not the row.

#### 24. Home entry rail
**Baseline.** A sticky rail of links with a 6 × 16 px cell each: current = solid, earlier = level 3, later = empty; Geist Sans 14 px, current 500. ≤ 900: a horizontal strip of 48 px pills with the cell.

- **A.** Cell 4 × 16 (matches the A marker width), text 14 px; current ink 500; hover: text to ink only. Horizontal strip on phones, 48 px items, nowrap.
- **B.** Cell column 7 × 22 (3 cells stacked 7 px with 1 px gaps = 23 px) per entry where the stack shows depth: current 8·8·8, earlier 3·3·3, later 0·0·0; Departure 11 counter before the label. Hover: the stack fills to 8 top-down. Phone strip: counter + label.
- **C.** One 12 × 22 cell per entry; current 8, earlier 3, later 0, the entry being approached rises through 1 → 3 → 5 as its section nears the reading line. Hover: `C-marker`. Phone strip as A.
- **Contracts.** `aria-current="location"` on the current entry; the rail scrolls the page on click without moving itself.

#### 25. Home work entry
**Baseline.** Departure 11 date, h2 title, summary, lead media (video with a 48-cell 4 px strip at its bottom edge and a 44 px play/pause square), Departure 11 caption label, a context `dl`, supporting recordings, impact, and "Open case →" quiet action. Media band-sweeps in and point-refreshes on hover.

- **A.** Date 13 px `--muted`, title 33, summary 17 px / 64 ch. Media in a 1 px hairline, no strip (the player is the toggle + a single 4 × 16 progress cell beside it); caption label 13 px. Context `dl`: terms 13 px `--muted`, values 17 px on `A-soft` rules. Impact as a stat row (35-A). Entrance: `A-sweep` on media, `A-snap` on text, 400 ms stagger. Hover on media: point refresh (58) at 12 px cells, 240 ms total.
- **B.** Date Departure 11 with counter, title 22, summary 16 px. Media in a 1 px ink frame with the 48-cell 4 px strip (today) and a 48 px cell play button. Context `dl` on `B-rule`s. Entrance: `B-sweep` on media, `B-snap` text in reading order 600 ms. Hover: point refresh 12 px cells, 360 ms.
- **C.** Date 11, title 44 (33 phone) with a `C-band`, summary 18 px. Media in a hairline frame with a 6 px level-1 gutter; player = 48 px cell button + a 12-cell progress row under the frame. Context on `C-band`s. Entrance: `C-dissolve` paper cover on media (480 ms), text resolves 200 ms. Hover: point refresh at 16 px cells through levels 5 → 3 → 1, 360 ms.
- **Contracts.** The video keeps native controls without JavaScript; the caption label is text, not `title`; media keeps intrinsic size (no layout shift).

#### 26. Private work link
**Baseline.** A quiet block (hairline top, Departure 11 kicker, h2 22, one paragraph, a secondary button), no box.

- **A.** As baseline, kicker 13 px `--muted`, h2 22, paragraph 17 px, secondary 44 px.
- **B.** Kicker Departure 11 + a `B-rule` level 3 above the block, h2 22, secondary 48 px with the marker.
- **C.** `C-band` above, h2 33, paragraph 18 px, secondary 48 px.
- **Contracts.** Hidden until configured (as today); never a boxed alert.

### Case pages

#### 27. Hero: breadcrumb, status chip, read time, title, summary
**Baseline.** "← Work" breadcrumb (14 px, level-3 rule), meta line in Departure 11 `--muted` with a status cell (8 × 8, level by status: launched 8, closed beta 5, prototype 3, archived 1) + word + "· 15 min read", h1 Departure 66 (44 phone), summary.

- **A.** Breadcrumb 14 px with `A-soft`. Meta Geist Sans 13 px `--muted`: one 8 × 8 cell at the status level + word; read time plain. h1 66 / 1.05, 44 above; summary 17 px / 1.6, 64 ch. Entrance: `A-snap` in reading order (breadcrumb, meta, title, summary), 400 ms. Phone: h1 44, summary 17.
- **B.** Breadcrumb with a `B-rule`. Status chip: 3-cell meter (7 px cells) + word in Departure 11 (Launched 8·8·8, Closed beta 8·5·0, Prototype 3·0·0, Before/Concept dotted outline cell). Read time Departure 11 with a 1-cell separator. h1 44 / 1.1 (33 phone), summary 16 px. Entrance: `B-snap` reading order 600 ms; the status meter fills cell by cell on arrival (3 × 30 ms).
- **C.** Breadcrumb with a `C-band`. Status chip: one 12 × 12 cell at the status level + word 11. h1 66 (44 phone) with a 4 px `C-band` beneath the title block, 66 above; summary 18 px / 62 ch. Entrance: `C-dissolve` 200 ms per element, Bayer order across the group, 480 ms. The hero media (42) dissolves behind.
- **Contracts.** Status words stay plain ("Launched", "Closed beta", "Prototype", "Archived", "Concept"); the cell is `aria-hidden` and the word carries the meaning. h1 keeps `id="case-title"`.

#### 28. Facts list
**Baseline.** A `ul` after the summary: each `li` has a Departure 11 `--muted` term (`strong`) and a value, on a level-4 dither rule above, no boxes.

- **A.** Definition rows on `A-soft` rules: term Geist Sans 13 px `--muted` (120 px column), value 17 px. 44 px row height.
- **B.** Rows on `B-rule`s level 3, term Departure 11, value 16 px; a counter is **not** added (facts are not ordered).
- **C.** Rows on 4 px `C-band`s, term Departure 11, value 18 px; the first row's band is solid (2 px ink) as the list's top edge.
- **Contracts.** Keep the markup contract `#bluf + p + ul` (renderer); styling only.

#### 29. Figure captions
**Baseline.** A hairline between media and caption; `strong` lead in Departure 11 ink ("Fig. 2" or a title), `em` note in Geist Sans 15 px `--text-soft`; image-card captions start with a Departure 11 span.

- **A.** Hairline above the caption; lead Geist Sans 500 13 px ink; note 15 px `--muted`; 11 px gap. No figure numbers.
- **B.** A 2 px `B-rule` level 3 above; lead Departure 11 with an automatic counter "Fig. 02" (CSS counter, decorative), note 15 px.
- **C.** A 4 px `C-band` above; lead Departure 11; note 15 px; captions sit inside the media's 6 px gutter block (the gutter stops at the caption's left edge so text is never on texture).
- **Contracts.** The caption is a `figcaption`; counters are decorative only (the `strong` text is the real label).

#### 30. Compare switch, drag slider, x-ray lens
**Baseline.** `case-compare`: figure head, a `.case-switch` (15) over a stage; the active panel shows, others hidden; without JS all panels show. `case-slider`: before/after images, a 2 px ink divider with a 48 px "◂▸" grip, corner labels in Departure 11, a transparent range on top. `case-lens`: a 240 px square window following the pointer, 2 px frame.

- **A.** Compare: switch 15-A above the stage; panel change `A-snap`. Slider: 1 px divider, grip 44 px square with a 5 × 3 chevron pair cell icon, corner labels Geist Sans 13 px on paper (1 px hairline), drag continuous. Lens: 220 px window, 1 px frame, corner label "Layers" 13 px.
- **B.** Compare: switch 15-B with counters and the position rule; panel `B-sweep`. Slider: divider = a column of 4 px cells (level 8) 3 px wide; grip 48 px with cell chevrons; a 24-cell row under the stage shows the split position (filled left of the split). Lens: 240 px window with a 2 px ink frame whose corners are 8 px cell squares; the frame moves in 8 px steps (snaps to the lattice — a visible B tell).
- **C.** Compare: switch 15-C; panel `C-dissolve` 200 ms (the new image resolves through the old). Slider: divider 2 px ink with a 6 px level-3 dither shadow on the "after" side (texture on the image edge, not text); grip 48 px, 2 px border. Lens: the window resolves on first hover (2 → 4 → 6 → clear over 200 ms) and the outside of the window is covered at level 1 texture (12 px tile) while the lens is on — the picture outside the lens is still visible through the dots.
- **Contracts.** Without JavaScript, every panel is visible and the switch is hidden (today's contract). The slider's range input keeps `aria-label` and the stage focus ring. Lens is pointer-only enhancement; a "Show all layers" button (`data-lens-full`) remains for keyboard and touch.

#### 31. Video player and overview strip
**Baseline.** `cell-player` under the video: 44 px play/pause square (cell icon), a 48-cell 12 px track (played solid, buffered level 2, leading cell dithered) with a real range on top, time "0:00 / 1:24" Departure 11. Overview videos keep their toggle and a 4 px 48-cell strip on the frame's bottom edge. Native controls without JS.

- **A.** Bar: 44 px play square (13-A), a 2 px hairline track with the played part 2 px solid, buffered part `--line` at 2 px, a 4 × 12 thumb; time Geist Sans 13 px tabular. Loading: "Loading video" 13 px beside a quarter turn (4 px cells). Overview strip: one 4 × 16 cell beside the toggle showing progress (no strip on the frame).
- **B.** Bar as today: 48 px play, 48 cells (7 px pitch 8 → 48 cells need 384 px; use `minmax(0,1fr)` cells as today), time Departure 11. Buffering: the buffered cells breathe 2 ↔ 3 on the tick. Loading: a dither bar (12 cells) walking on the tick + "Loading video". Overview strip: today's 4 px 48-cell strip.
- **C.** Bar: 48 px play (2 px border), 24 cells of 12 px, played solid, buffered level 2, the leading cell shows the fraction through levels; time Departure 11. Loading: the poster is covered at level 4 texture (no text over it) with "Loading video" below the frame; the cover resolves (R3-style, but via the dither, not a mosaic) when ready. Overview: a 12-cell row under the frame.
- **Contracts.** Play button `aria-pressed` + name; range `aria-label="Seek"` and `aria-valuetext`; native `controls` restored without JS; status words once in a polite region, not per frame.

#### 32. Image grid and gallery
**Baseline.** `case-image-grid` 2–3 columns, each a figure with an image and a caption line; `case-gallery` swaps `<stem>-<theme>.webp` with a tag chip per theme. Band sweep on entry; no hover shadow.

- **A.** Hairline frames, 11 px gaps, captions 29-A; entrance `A-sweep` reading order 400 ms. Gallery theme switch: segmented 15-A.
- **B.** 1 px ink frames, 8 px gaps, Departure 11 counters per item; entrance `B-sweep` reading order 600 ms. Gallery switch 15-B.
- **C.** Each image in a 6 px level-1 gutter inside a hairline, 11 px gaps; entrance `C-dissolve` per image, Bayer order across the grid 480 ms. Gallery switch 15-C.
- **Contracts.** Grid collapses to one column ≤ 640; alt text on every image; the review page uses cell placeholders (no images).

#### 33. Live embed
**Baseline.** `case-live`: a frame (hairline, `--card-media-surface`) with a lazy iframe, a 48 px corner full-screen button (inverts on hover), status tags as chips, an optional switcher (segmented) and deck arrows (19). Fallback image without JS.

- **A.** Frame 1 px hairline; corner button 13-A (44 px) with tooltip "Open full screen"; tag chip as 27-A. Loading: "Loading demo" 13 px centred on paper (no texture) with a quarter turn. Entrance `A-sweep`.
- **B.** Frame 1 px ink; a 3 px `B-rule` level 3 along the frame's bottom edge that fills left to right while the iframe loads (unknown length → a 4-cell band walking on the tick, as the dither sweep loader); corner button 13-B. Tags 27-B meters.
- **C.** Frame with a 6 px level-1 gutter; loading: the frame interior at level 2 texture (no text over it) with "Loading demo" below; resolves 2 → 0 when loaded. Corner button 13-C. Tags 27-C.
- **Contracts.** `title` on the iframe; the full-screen link is a real link to the demo URL; tags are words with a cell, never only a colour.

#### 34. Pull quote and quotes carousel
**Baseline.** Pull quote: 2 px ink left border, Geist Sans 1.2–1.5 rem / 1.36, Departure 11 source. Carousel: hairline above, one quote at a time (dither out/in), a row of meters (4 px, level-2 track, solid fill animating over `--quote-dwell` 5.2 s in 26 steps), a 48 px "Next" step button in Departure 11.

- **A.** Pull quote: no border; a 2 px `A-soft` rule above and below, quote Geist Sans 22 px / 1.4 (18 phone) ink, source Geist Sans 13 px `--muted`. Carousel: same type; meters are 2 px hairlines that fill solid over the dwell in 13 steps (400 ms each); step button = secondary 44 px "Next"; change: `A-afterglow` out, `A-snap` in.
- **B.** Pull quote: a 7 px `B-marker`-style cell column on the left (level 3, held), quote 20 px / 1.5, source Departure 11 with a counter. Carousel: meters are 12-cell rows (7 px) filling one cell per 433 ms on the tick (5.2 s / 12); step button 48 px with counter "2 / 5"; change: `B-afterglow` out, `B-snap` in.
- **C.** Pull quote: quote Geist Sans 24 px / 1.35 (20 phone) with a 6 px `C-band` level 4 on the left edge (vertical band, not behind text), source 11. Carousel: meters are 4 px bands at level 2 resolving to 8 over the dwell in 4 level steps (1.3 s each); change: `C-afterglow` out, `C-dissolve` in. Step button 48 px, 2 px border.
- **Contracts.** The carousel pauses when off-screen and when motion is off (rest = the current quote, all meters still); the "Next" button works without the autoplay; quotes are `blockquote`s with a visible source.

#### 35. Stat row
**Baseline.** A 3-column row (2 on phones) on a hairline, each stat: Departure 44 (33 phone) numeral counting once on a curve, a 0.94 rem label; hairline beneath each.

- **A.** Numerals Departure 44, label Geist Sans 15 px `--muted`, caveat 13 px; the row sits between two hairlines. Count: integers step on an ease-out over 600 ms, 12 steps (the digit changes in steps; no glyph noise). Phone: 2 columns, 33.
- **B.** Numerals Departure 44 with a 3 px `B-rule` beneath each at level 8 whose length is the stat's share where the stat is a percentage (e.g. 42 % → 42 % of the row's cells lit; otherwise all lit); label Departure 11; count: one digit per tick (40 ms) from 0 to the value, capped at 24 ticks.
- **C.** Numerals Departure 66 (44 phone), label 15 px, caveat 11; the numeral **resolves through the dither** (2 → 4 → 6 → solid, 50 ms each) rather than counting; a 4 px `C-band` beneath. Phone 2 columns.
- **Contracts.** Real figures only (`case-stat` policy); the final number is in the DOM at rest; counting respects the motion switch.

#### 36. Day-cell timeline
**Baseline.** A vertical rail per event: 8 px day cells (one per day that passed) and a 12 px event mark; a 2 px fill line grows as the reader reaches events; the current event's mark blinks on the tick (20 ticks); Departure 22 date, Departure 11 relative label, 600 1.02 rem title, 0.96 rem body; entries hidden until reached (JS) and visible at rest without it.

- **A.** Rail: a 1 px hairline with one 4 × 12 solid mark per event (no day cells); dates Geist Sans 13 px `--muted`, title Geist Sans 500 17 px, body 17 px. Reached: the mark goes solid in 1 step; the current mark does not blink (A keeps nothing moving); entries `A-snap` when reached.
- **B.** As today (day cells 7 px pitch 8, event mark 12 px, dotted spine at level 3), title Geist Sans 500 16 px, dates Departure 22, relative label 11; the current mark blinks 10 ticks on / 10 off; day cells light one per 30 ms as the fill reaches them.
- **C.** Rail: 12 px event marks and 12 px day cells at level 1 (texture) that resolve to 3 when passed; dates Departure 22; title 500 18 px; entries `C-dissolve` when reached; current mark pulses 8 → 6 → 8 every 10 ticks.
- **Contracts.** Rest frame complete (all entries visible, marks solid) with motion off or no JS; the blink is `aria-hidden` and stops with the motion switch.

#### 37. Sibling nav
**Baseline.** Hairline above; two links, each with a Departure 11 label ("Previous case" / "Next case") and a Departure 22 title; hover: a 6 px left marker in 3 steps. "More case studies coming soon" in a dotted outline when a side is empty.

- **A.** Two halves on a hairline, 88 px tall; label Geist Sans 13 px `--muted`, title 22; the left half's marker is `A-marker` on its left edge, the right half's on its **right** edge; arrows `←` / `→` in Geist Mono nudge toward their edge. Empty side: dotted outline, "More case studies coming soon" 13 px. Phone: stacked, each 66 px.
- **B.** `B-rule` level 3 above; halves 96 px; label Departure 11 with counters ("Previous case · 02"); title 22; marker `B-marker` columns on outer edges; a 3 px `B-rule` under each title fills in reading order on hover (left half fills right-to-left). Empty side: dotted + words.
- **C.** 2 px ink line above; halves 99 px (9 × 11); label 11; title 33 (22 phone); `C-marker` 6 px on outer edges through levels. Empty: dotted outline at 12 px tile + words.
- **Contracts.** `aria-label="More case studies"`; the empty state is text, not a disabled link; ≥ 48 px rows.

#### 38. Contact prompt
**Baseline.** An `aside` with an h2 (Departure 33) and a sentence, primary "Write to me" and secondary "Book a call" (compact: one primary "Book 30 minutes").

- **A.** h2 33 (22 phone), sentence 17 px, buttons 8-A / 9-A side by side with 11 px gap; a hairline above the block. Phone: buttons stacked full width.
- **B.** h2 22 with a `B-rule`, sentence 16 px, buttons 8-B / 9-B.
- **C.** h2 44 (33 phone) with a `C-band`, sentence 18 px, buttons 8-C / 9-C.
- **Contracts.** Exactly one primary; the booking link keeps `data-booking-modal-open`.

#### 39. Case index, desktop rail
**Baseline.** "On this case · 28% read" head on a hairline; rows: a 6 × 17 cell (unread empty, current filling 1–8 with reading, read level 3), a Departure 11 counter `01`, the title Geist Sans 13 px (current ink 500, read `--text-soft`), 6 px row padding; the rail keeps the current row in view.

- **A.** Head: "On this case" Geist Sans 500 13 px, "28% read" 13 px `--muted`. Rows 33 px: a 4 × 17 cell (empty / filling / level 3), no counters, title 14 px. Hover: title to ink. Narrow desktop (≤ 1180): cells only with a tooltip on hover.
- **B.** Head: "On this case" Departure 11 + a 24-cell meter for overall progress; rows 32 px: a 7 × 17 cell, counter, title 13 px; read rows get a level-3 `B-rule` under the title. Narrow: cells + counters.
- **C.** Head: "On this case" 11 + "28% read" 11; rows 33 px with a 12 × 17 cell; the current cell fills through levels 1–8; read cells level 3; a 4 px `C-band` level 2 runs the rail's left edge (texture beside, not behind, the titles). Narrow: cells only.
- **Contracts.** `aria-current="location"` on the current row; the list is the source of truth; counters are CSS so link text never changes (private template + verify-site).

#### 40. Case index, phone strip and sheet
**Baseline.** ≤ 900: a sticky strip with the section number in Departure 22, the current title 14 px (resolving through ░ ▓ on change, 220 ms), a "Contents" / "Close" word (inverts when open), and a 30-cell 4 px progress row on the strip's bottom edge; the sheet switches on (clip-path 4 steps, 240 ms) with 48 px rows on hairlines, opened scrolled to the current row.

- **A.** Strip 48 px: number Geist Sans 500 14 px `--muted` ("3 of 12"), title 14 px ink, "Contents" quiet word with `A-soft`; progress: a 2 px hairline whose filled part is solid. Title change: 1-step swap (no resolve). Sheet: `A-switch` 200 ms, rows 48 px on hairlines, current row with a held `A-marker`. Scrim: `--paper-50`.
- **B.** Strip 56 px (7 cells): number Departure 22, title 14 px resolving through ░ ▓ (today), "Contents" with a 3 px `B-rule` that fills while open; progress 30 cells × 4 px (today). Sheet: `B-switch` 240 ms then rows `B-snap` in reading order 300 ms; rows 48 px with the 7 × 22 cell + counter; current row has a held `B-marker`. Scrim: ink 46 %.
- **C.** Strip 55 px: number Departure 22, title 14 px resolving through the dither (the text is masked 2 → 4 → 6 → none, 150 ms) rather than glyphs, "Contents" with a `C-band`; progress 12 cells of 12 px. Sheet: `C-switch` (resolves from a 2 px line, 240 ms); rows 48 px; scrim: level-2 dither in ink at 12 px tile (texture over the page, not behind the sheet's text).
- **Contracts.** `aria-expanded` on the button; Escape and the scrim close; the word reads "Contents" / "Close"; rows ≥ 48 px; section becomes current when its top passes 8 px below the strip (today's reading line).

#### 41. Walkthrough trigger
**Baseline.** A button with a small avatar/poster, Departure label and copy, opening the walkthrough dialog.

- **A.** A secondary button 9-A "Watch the walkthrough · 4 min" with a 5 × 5 play cell icon; no poster.
- **B.** A 48 px row: 7-cell play icon, label Departure 11 "Walkthrough", title 16 px, duration Departure 11; `B-marker` on hover.
- **C.** A 66 px row with a 44 × 44 cell poster stand-in at level 1 (texture) + a solid play icon over it, title 18 px; `C-marker`.
- **Contracts.** A `button` opening the `dialog` (6); duration in words ("4 min"), not "04:12".

#### 42. Case cover / hero media entrance
**Baseline.** Featured images (`.case-cover img`, `.case-hero-media img`) arrive through the dither dissolve (paper cover stepping 7 → 1 in diagonal order with Bayer jitter, 480 ms, 16 px cells), once per visit.

- **A.** `A-sweep` 6 bands, 300 ms (no dissolve; A is one gesture).
- **B.** `B-sweep` 10 bands, 360 ms, then a 3 px `B-rule` under the image fills in reading order 140 ms as a "settled" mark.
- **C.** Today's dissolve, 480 ms, 16 px cells (12 px in dark).
- **Contracts.** Intrinsic size from frame one; no-JS and reduced motion show the image.

### Feedback

#### 43. Loaders
**Baseline.** Quarter turn (2 × 2 cells 6 px, one solid cell walking with a level-3 tail, head advances every 3 ticks) inside buttons; dither bar (video buffered cells); the sheet/afterglow; `turntable-skeleton` fades to 58 % opacity; no sweep, breathing cells or mosaic poster on the site yet.

- **A.** Only two loaders exist: the quarter turn (2 × 2 at 5 px, head every 3 ticks) beside a word, and a single cell whose level is known progress. Unknown waits show the word alone ("Loading video") with the quarter turn. Turntable: a 13 px `--muted` "Loading the model" line on paper, no skeleton texture.
- **B.** Full set: quarter turn (2 × 2 at 7 px, head every 2 ticks), dither bar (12 cells, leading cell dithered to the fraction), dither sweep (a 3-cell band of levels 3·6·3 walking a 12-cell row, one cell per tick, for unknown waits), breathing cells (3 × 3 at 7 px, diagonal wave through levels 1 → 3 → 5 → 3 → 1, one step per 2 ticks), mosaic poster (R3: the poster drawn at 1/32, 1/16, 1/8, full, 4 steps of 120 ms — canvas). Turntable: breathing cells + "Loading the model".
- **C.** Everything is dither: the quarter turn is 2 × 2 at 12 px; progress is a 12-cell bar at 12 px; unknown waits cover the area at level 2 texture (never over text) with the word beneath; the poster resolves through levels 2 → 4 → 6 → clear when ready (the dither replaces the mosaic). Turntable: the stage at level 1 texture + "Loading the model" below it.
- **Contracts.** Every loader is `aria-hidden` with a plain word in a polite region beside it; all run on the 40 ms tick; all stop and show a complete frame when motion is off (bar shows the current fraction; sweep and breathing stop at level 3; the word stays).

#### 44. Empty state
**Baseline.** A cells icon (12 px, 1 px gaps), "Nothing here yet" Departure 22, one sentence.

- **A.** One 4 × 16 cell at level 1, "Nothing here yet" 22, sentence 17 px.
- **B.** 5 × 3 breathing cells (43-B) at rest level 1–3, title 22, sentence 16 px.
- **C.** A 6 × 4 field of 12 px cells at level 1, title 33, sentence 18 px; the field is beside the text (left), never under it.
- **Contracts.** Plain words ("No notes match that. Try a shorter word."); `hidden` when not needed.

#### 45. Toast (proposed)
**Baseline.** None.

- **A.** A 44 px paper strip with a 1 px hairline, bottom-left, 11 px from the edges, "Copied" Geist Sans 500 14 px + a held `A-marker`; appears in 1 step, holds 1.8 s, leaves with `A-afterglow`.
- **B.** A 48 px strip, 1 px ink border, a 5 × 5 green check + "Copied" 14 px + a 12-cell `B-rule` at the bottom edge that empties over the hold (a visible countdown, one cell per 150 ms); `B-switch` in from a line, `B-afterglow` out.
- **C.** A 48 px strip with a 2 px border and a 6 px level-1 gutter; check at level 8 in `--signal-ok`; `C-dissolve` in, `C-afterglow` out; hold 2 s.
- **Contracts.** `role="status"`, one at a time, never covers a control; Escape dismisses; no toast for things the button itself can say ("Sent" stays in the button).

#### 46. Tooltip (proposed)
**Baseline.** `title` attributes only.

- **A.** A small ink label (paper text, Geist Sans 500 13 px, 6 × 11 px padding) 6 px above the control, appears in 1 step after 300 ms hover or immediately on focus; no arrow.
- **B.** Same, with a 1-cell (7 px) pointer under the label aligned to the lattice; appears with `B-snap`.
- **C.** Same, 2 px border paper label with ink text (print style), appears by `C-dissolve` 150 ms.
- **Contracts.** `role="tooltip"` + `aria-describedby`; shown on focus-visible; never the only accessible name; dismissed by Escape.

#### 47. Text field and textarea
**Baseline.** Label Geist Sans 500 14 px `--text-soft`; input 48 px, 17 px text, 2 px bottom line in `--line`, ink on focus, `--signal-fail` on `:user-invalid`; focus ring 2 px.

- **A.** Label 13 px `--muted` above; field 44 px, 17 px text, 1 px bottom hairline; focus: the line becomes 2 px ink drawn left to right in 4 steps over 160 ms (clip-path). Error: line `--signal-fail`, flashes twice at 120 ms then stays; one sentence 13 px below. Counter (textarea) Geist Sans 13 px right-aligned. Phone: same.
- **B.** Label Departure 11; field 48 px, 16 px text; the bottom line is a `B-rule` 2 px at level 3 that fills to 8 in reading order on focus (7 steps, 140 ms). Error: the rule in `--signal-fail`, two flashes, sentence 14 px; counter Departure 11 "120 / 600" with a 12-cell meter.
- **C.** Label 11; field 48 px, 18 px text; the bottom line is a 3 px `C-band` level 4 that resolves to solid on focus (4 → 6 → 8, 100 ms). Error: band in `--signal-fail` at level 8, two flashes; sentence 14 px. Counter 11.
- **Contracts.** Real `label`/`input` association; `aria-describedby` to the error sentence; `:user-invalid` not `:invalid` (no red before the visitor has typed); focus ring never removed; the Turnstile and honeypot untouched.

#### 48. Form status line and the submit press
**Baseline.** `role="status"` line 15 px with a 10 px signal cell (ok green / fail red) before the words; the submit runs the primary press (working: quarter turn + "Sending…"; done: check + "Sent", 1.6 s).

- **A.** Status: a 4 × 16 cell at level 8 in the signal colour + sentence 15 px. Submit: 8-A working/done. Error: the sentence is red for its first two flashes, then ink with the red cell held.
- **B.** Status: a 3-cell meter in the signal colour (8·8·8 ok; 8·0·0 fail) + sentence. Submit: 8-B (dither bar in the button).
- **C.** Status: one 12 px cell at level 8 in the signal colour + sentence 18 px. Submit: 8-C (level-5 hold while sending).
- **Contracts.** Status words stay as today ("Message sent. I'll get back to you soon." / "The message could not be sent. Try again or email hi@traykov.cc."); `aria-busy` on the form drives the press; one announcement per change.

#### 49. 404
**Baseline.** A field of 12 px cells (10 px on phones) spelling "404" in 5 × 7 glyphs resolving left to right; h1 "This page isn't here." Departure 22; one lede; secondary "Go to the work" + quiet "Read the notes →".

- **A.** No field. h1 Departure 66 (44 phone) "This page isn't here.", lede 17 px, the two actions. Entrance `A-snap`. The visually hidden "Error 404" stays.
- **B.** The "404" cell field at 7 px pitch 8 (23 cells wide), resolving in reading order one cell per tick (≈ 0.9 s), then h1 22, lede 16, actions. The field has a `B-rule` beneath.
- **C.** The "404" field at 12 px cells with a surrounding level-1 texture field (the glyphs are solid holes in a dotted sheet: 40 × 11 cells, glyph cells at 8, the rest at 1), resolving through the dither over 480 ms; h1 33, lede 18, actions.
- **Contracts.** The field is `aria-hidden`; the h1 and links carry the page; with motion off the field is complete.

#### 50. Status lines and live regions
**Baseline.** Notes count `output` (polite), the pc "copy status" span, contact status (48), the theme status text.

- **A / B / C.** Plain words in that direction's label style (A: Geist Sans 13 px `--muted`; B: Departure 11 with a 1-cell signal where there is a result; C: Departure 11 with a 12 px cell). Changes swap in 1 step (A), `B-snap` (B), `C-dissolve` (C) — text is never scrambled.
- **Contracts.** `aria-live="polite"`, one update per change, never per frame.

### Labs tool panels

#### 51. Tool panel
**Baseline.** Panel with Departure 11 `--muted` labels and ink Departure 11 values, cell-range sliders (18), 36 px plain-word buttons (1 px ink border; hover: inset 6 px left marker; selected solid), a 40 px chevron select, 18 px checkboxes, a readonly settings textarea in Geist Mono 12 px, flip tabs as a segmented group, and one primary ("Save PNG") in solid ink.

- **A.** Labels Geist Sans 13 px `--muted`, values Departure 11 right-aligned; sliders 18-A; buttons 36 px, 1 px hairline, 13 px text, hover `A-marker`; select 16-A at 40 px; checkbox 17-A; textarea in a hairline, Geist Mono 12 px; groups separated by `A-soft` rules with 22 px between. Phone: panel below the stage, full width.
- **B.** Labels Departure 11 with a counter per group ("1 Shape", "2 Light"); values Departure 11; sliders 18-B; buttons 36 px with a `B-marker` (4 cells) on hover and a solid fill when selected; a 2 px `B-rule` at level 3 under each group heading; select 16-B at 40 px; checkbox 17-B. Phone: as A.
- **C.** Labels Departure 11; sliders 18-C; buttons 36 px with 1 px border and a `C-marker`; selected at level 6 (the tool's own primary is the only solid); a 4 px `C-band` under each group heading; the panel sits on a 6 px level-1 gutter along its outer edge (texture beside the controls, never under labels). Phone: as A.
- **Contracts.** 36 px targets only here, with ≥ 8 px between them; labels visible; the settings textarea stays readonly and is not UI copy (it is output).

#### 52. Tool primary and export with progress
**Baseline.** Banner "Save PNG" is a 40 px solid ink primary; studio exports are buttons that open in one tab; no progress.

- **A.** Primary 8-A at 44 px; export: "Export" → working "Exporting" with the quarter turn → done "Saved" with the check; known progress is one cell's level beside the word.
- **B.** Primary 8-B; export shows a 12-cell dither bar in the button's bottom edge filling with real progress ("Exporting · 40%" in the label, Departure 11 for the number), then "Saved".
- **C.** Primary 8-C; export: the fill holds at level 5 while working; progress raises the fill level 5 → 6 → 7 → 8 by thirds; "Saved" with the check.
- **Contracts.** One primary per tool view; progress numbers only when real; "Saved", "Copied" as the done word.

#### 53. Drop zone
**Baseline.** (SVG studio) a hairline box with an upload cell icon, "Drop an SVG here", a "choose a file" link, one hint line; drag-over thickens the border and snaps in corner cells; loaded: a green check + file name.

- **A.** 1 px hairline box, 176 px tall, icon 5 × 5 at 3 px, words 15 px; drag-over: border 2 px ink in 1 step; loaded: `A-marker` held on the left edge + check + name 15 px.
- **B.** 1 px ink box; icon 5 × 5 at 7 px (35 px); drag-over: the four corners get 2 × 2 cell squares snapping in (reading order, 4 × 30 ms) and a `B-rule` fills along the bottom edge; loaded: check + name Departure 11 + a 12-cell "Read" meter.
- **C.** Box interior at level 1 texture at 12 px tile **with the words in a paper label block** (the text block is paper on top; the texture surrounds it, never under it); drag-over: texture rises to level 3 (the words' paper block stays); loaded: the texture dissolves out and the file name appears with the check.
- **Contracts.** The real `<input type="file">` is the drop target's control; keyboard "choose a file" link focuses it; the hint says which formats are accepted in words.

#### 54. Swatches
**Baseline.** (SVG studio) colour inputs; the plan proposes squares with a cell marker under the selected one and an "Other…" swatch for the native picker.

- **A.** 24 px squares on a 1 px hairline, 11 px gaps; selected: a 2 px solid rule under it; hover: the rule at level 3. "Other…" is a quiet action.
- **B.** 24 px squares (3 cells) with a 7 px cell under each: selected 8, others 0; hover 3; the row sits on a `B-rule`.
- **C.** 36 px squares (3 tiles) with a 12 px cell under each; selected 8; hover rises 0 → 3; "Other…" opens the native picker.
- **Contracts.** Radio inputs underneath with the colour name in words as the label; the native picker remains reachable.

#### 55. Next tool row
**Baseline.** "Next tool" Departure 11 + a Departure 33 title link with a 3 px under-marker on hover and an arrow nudge.

- **A.** Label 13 px `--muted`, title 33 (22 phone), `A-marker` 2 px under-rule on hover, arrow nudge 2 steps.
- **B.** Label Departure 11 with counter ("Next tool · 03"), title 22, `B-rule` fills in reading order on hover.
- **C.** Label 11, title 44 (33 phone), `C-band` resolves to solid on hover.
- **Contracts.** One link; the title is the link text.

### Page

#### 56. Page transition
**Baseline.** (Protected: `public/page-transitions.js` timings are not changed.) The new page is drawn over the old through `--dither-2`, `-4`, `-6`, solid, one step every 50 ms (200 ms), at 8 px tile; the bar stays put; reduced or paused motion swaps instantly.

- **A.** Same 200 ms, 4 steps, but at 4 px tile (finer dots: the dissolve reads as a soft fade in steps). Review page: a 320 × 200 stand-in "page" box that dissolves to a second box on a button.
- **B.** Same steps at 8 px tile (today), plus the nav cell rule hand-over (1-B) running in the same 200 ms.
- **C.** Same steps at 12 px tile (8 px in dark), 50 ms each; the dissolve is the direction's signature, so no other entrance plays on arrival (today's rule).
- **Contracts.** Timings and the transport logic untouched; only the tile size is a token (`--dither-size`) the direction may change. The review page simulates with a masked box, not real navigation.

#### 57. Reveal with stagger
**Baseline.** `data-reveal` snaps text and blocks (`mark-snap` 280 ms with the 30/50 % blink), band-sweeps media (10 bands, 360 ms), staggered by `--reveal-delay`; hidden states gated by `html[data-motion="ready"]`; rest state complete.

- **A.** `A-snap` (1 step, no blink) after an ease-out delay, 400 ms per group; media `A-sweep` 6 bands 300 ms.
- **B.** Today's snap with the blink, 600 ms per group in reading order; media `B-sweep` 10 bands.
- **C.** `C-dissolve` (mask 2 → 4 → 6 → none, 200 ms) per element, Bayer order across the group 480 ms; media: the paper-cover dissolve 480 ms.
- **Contracts.** No blur, slide or spring; reduced motion and no JS show everything; a viewport settles within 900 ms.

#### 58. Point refresh on hover
**Baseline.** Hovering a work entry's media or a Labs screen covers it in paper cells (12 px) through levels 5 → 3 → 1 outward from the pointer, delays on an ease-out of distance over 360 ms, 40 ms per step; fine pointers only.

- **A.** 12 px cells, levels 3 → 1 (two steps), 240 ms total: a brief shimmer-free refresh.
- **B.** 8 px cells (7 px pitch 8), levels 5 → 3 → 1, 360 ms, with a 4 px `B-rule` under the media filling from the pointer's x outward (both directions) over 140 ms.
- **C.** 16 px cells, levels 6 → 4 → 2, 360 ms at 12 px tile: visibly dotted.
- **Contracts.** Runs only with `(hover: hover) and (pointer: fine)` and motion active; the canvas never catches the pointer; never over text.

---

## 4. Build spec for the review artifact

**Output:** `docs/audits/2026-10-16-visual-direction/component-directions.html`, one self-contained file, built from partials in `docs/audits/2026-10-16-visual-direction/directions/`. No site source is touched. Nothing is committed by the agents.

### 4.1 Hard constraints

- **Size.** The app's file preview opens the page as a data URL and fails above about 600 KB. Fonts alone are ≈ 218 KB of base64 (Geist 92,872 + Geist Mono 95,160 + Departure Mono 29,996 characters, as embedded in `motion-specimen.html`). Budget: shell + tokens + runtime ≤ 40 KB; each batch partial ≤ 48 KB; **built file ≤ 580 KB** (the build script fails above that).
- **No external or relative assets.** No `<img>`, no `url(` except the font data URLs and the inlined logo mask, no `http` references. Media are stand-ins: a 16:10 box of cells at level 1 with a 5 × 5 solid glyph (the runtime provides `Dir.placeholder(host, cols, rows)`).
- **Fonts.** Embedded exactly as the specimens do: the three `@font-face` rules with `data:font/woff2;base64` sources, family names `"Geist"`, `"Geist Mono"`, `"Departure Mono"`. The build script extracts them from `motion-specimen.html` at build time so no partial contains base64. Tokens map `--sans: "Geist", …`, `--mono: "Geist Mono", …`, `--font-pixel: "Departure Mono", …`.
- **Logo.** `public/sasi.svg` (1,996 bytes) is inlined once in `00-shell.css` as a URL-encoded `mask-image` on `.logo-mark` (ink background, 38 px). Encode with `encodeURIComponent` in the build script from the real file so it is never hand-typed.
- **Plain words.** No terminal wording anywhere a reviewer reads. The build script greps every partial's visible text for a forbidden list (`grep`, `localhost`, `$ `, `SOURCE /`, `ERR`, `null`, `undefined`, `TODO`, `lorem`) and for any run of three or more ALL-CAPS words, and fails.
- **No new dependencies.** The build is a single Node script using `fs` only.

### 4.2 Files

```
docs/audits/2026-10-16-visual-direction/
  component-directions.html            ← built output
  directions/
    build.mjs                          ← node build.mjs  (batch 0)
    00-shell-head.html                 ← <!doctype> … <body>, sticky controls, intro, group nav (batch 0)
    00-tokens.css                      ← :root + dark tokens copied from global.css (batch 0)
    00-shell.css                       ← layout, direction scopes, shared primitives (batch 0)
    00-runtime.js                      ← the Dir runtime (batch 0)
    00-shell-foot.html                 ← picks panel, export, </body></html> (batch 0)
    10-chrome.html                     ← batch 1
    20-actions-selection.html          ← batch 2
    30-lists-home.html                 ← batch 3
    40-case-evidence.html              ← batch 4
    50-case-nav-feedback.html          ← batch 5
    60-tools-page.html                 ← batch 6
```

**Assembly (`build.mjs`):** read `motion-specimen.html`, extract the three `@font-face{…}` rules by regex (`/@font-face\{font-family:"(Geist|Geist Mono|Departure Mono)";src:url\("data:font\/woff2;base64,[^"]+"\)[^}]*\}/g`); read `public/sasi.svg` and URL-encode it; then write, in order: `00-shell-head.html` → `<style>` + fonts + `00-tokens.css` + `00-shell.css` (with `__LOGO__` replaced) + `</style>` → every `[1-9]*.html` partial sorted by name → `<script>` + `00-runtime.js` + `</script>` → `00-shell-foot.html`. Then run the checks (size per partial, total size, forbidden words, `<img`, `http`, `url(` outside the style block) and print a one-line report with the final byte count. Exit non-zero on any failure.

### 4.3 Shell contract (batch 0)

**Document attributes.** `html[data-theme]` = absent (auto), `"light"` or `"dark"` — the same attribute the site uses, so the copied dark tokens apply unchanged (also copy the `@media (prefers-color-scheme: dark) html:not([data-theme])` block). `html[data-motion]` = `"on"` (default) or `"off"`. `html[data-view]` = `"desktop"` or `"phone"`.

**Controls (sticky top bar, 48 px targets, in the A style since the bar is chrome of the review page, not a component under review):** Theme (auto / light / dark), Motion (on / off), View (desktop / phone), "Replay all", a picks counter ("12 of 58 picked"), and a jump list to the groups. Persist theme, motion and view in `localStorage` key `traykov-directions-review` (wrapped in try/catch).

**Tokens (`00-tokens.css`).** Copy verbatim from `global.css`: `--ink`, `--paper`, `--muted`, `--line`, `--text-soft`, `--text-caption`, `--cell-empty`, `--signal-ok`, `--signal-fail`, `--difference-ink`, `--ink-06 … --ink-72`, `--paper-15/30/50/92`, `--hairline`, `--tap-target`, `--focus-ring-width: 2px`, `--focus-ring-offset: 2px`, `--space-1…6`, `--radius-0`, `--ease-out-expo`, `--ease-snap`, `--dur-1…6`, `--dither-1…7`, `--dither-size`, `--font-pixel`, `--type-px-11…66`, `--tick`, `--step`, `--snap`, `--sweep`, `--afterglow`, `--switch`, `--stagger-total`, `--marker-width`, `--marker-height`, `--link-blue`; plus the dark overrides for each. Set `--sans`, `--mono`, `--font-pixel` to the embedded families.

**Direction scopes (`00-shell.css`).** Three classes carrying the §1 token table:

```css
.dir-a { --dither-size: 8px; --cell-size: 6px; --cell-gap: 2px; --marker-width: 4px; --marker-height: 2px; --marker-step: 40ms; --label-step: 4px; --snap: 120ms; --sweep: 300ms; --sweep-bands: 6; --afterglow: 120ms; --afterglow-steps: 2; --switch: 200ms; --stagger-total: 400ms; --press-in: 160ms; --press-hold: 200ms; --press-out: 160ms; --type-h1: 66px; --type-h2: 33px; --type-h3: 22px; --read-size: 17px; --read-line: 1.6; --unit: 11px; }
.dir-b { --dither-size: 8px; --cell-size: 7px; --cell-gap: 1px; --marker-width: 7px; --marker-height: 3px; --marker-step: 30ms; --label-step: 8px; --snap: 280ms; --sweep: 360ms; --sweep-bands: 10; --afterglow: 180ms; --afterglow-steps: 3; --switch: 240ms; --stagger-total: 600ms; --press-in: 180ms; --press-hold: 260ms; --press-out: 220ms; --type-h1: 44px; --type-h2: 22px; --type-h3: 22px; --read-size: 16px; --read-line: 1.5; --unit: 8px; }
.dir-c { --dither-size: 12px; --cell-size: 12px; --cell-gap: 2px; --marker-width: 6px; --marker-height: 3px; --marker-step: 50ms; --label-step: 5px; --snap: 200ms; --sweep: 0ms; --afterglow: 180ms; --afterglow-steps: 3; --switch: 240ms; --stagger-total: 480ms; --press-in: 150ms; --press-hold: 400ms; --press-out: 180ms; --type-h1: 66px; --type-h2: 33px; --type-h3: 22px; --read-size: 18px; --read-line: 1.55; --unit: 11px; }
html[data-theme="dark"] .dir-c { --dither-size: 8px; }
@media (prefers-color-scheme: dark) { html:not([data-theme]) .dir-c { --dither-size: 8px; } }
```

Plus the direction-level primitives every partial reuses, written once with these tokens: `.cell` + `[data-level]` masks (from global.css §16), `.cells`, `.marker` (the three marker behaviours as `.dir-a .marker`, `.dir-b .marker` (cell column built by the runtime), `.dir-c .marker` (level steps)), `.rule-soft` (`A-soft` / `B-rule` / `C-band` per scope), `.fill-layer` + `.is-filling/.is-filled` (press), `.is-dotted` (disabled), `.cell-icon`, keyframes `snap-a` (1 step), `snap-b` (today's `mark-snap`), `dissolve-c` (mask 2 → 4 → 6 → none), `sweep` (clip-path with `steps(var(--sweep-bands))` — since `steps()` cannot take a variable, write `.dir-a .is-sweeping{animation-timing-function:steps(6)}` and `.dir-b … steps(10)`), `afterglow-2`, `afterglow-3`, `switch-on/off`, and the global `:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px }`.

**Motion off.** `html[data-motion="off"] .cmp *, @media (prefers-reduced-motion: reduce) { .cmp * }` → `animation: none !important; transition: none !important;` and the runtime's `Dir.motionActive()` returns false (so JS-driven fields render their final frame at once and the tick clock stops). The motion button toggles `data-motion`; reduced motion is read from `matchMedia` and shown in the bar as "Reduced by your system".

**Layout.** Each group is `<section class="group" id="g-chrome">` with an h2. Each component is:

```html
<article class="cmp" id="cmp-nav" data-name="Site nav" data-group="Chrome"
         data-baseline="64px bar, cell rule under the current link, hover fills the rule left to right.">
  <template data-markup> …one copy of the markup… </template>
  <template data-markup="b"> …optional override for one direction… </template>
  <style> #cmp-nav .dir-a … { } #cmp-nav .dir-b … { } @container col (max-width: 640px) { … } </style>
  <script> Dir.component("cmp-nav", (col, dir, api) => { /* bind behaviour for this column */ }); </script>
</article>
```

The runtime builds, for each `.cmp`: a header (name, the baseline line, a Replay button) → `.tri` (three `.col` elements, `.col.dir-a[data-dir="a"]`, `-b`, `-c`, each `container-type: inline-size; container-name: col`, each headed "A · Ruled paper" etc. and holding a clone of the matching template) → the pick control. Desktop view: columns `minmax(0, 1fr)` capped at 440 px; phone view: columns fixed at 375 px. Below 1180 px window width the three columns stack vertically (A, B, C). Components marked `data-phone-only` always render at 375 px. Components marked `data-wide` (nav, footer, hero) render the three directions **stacked full width** instead of side by side, each column still scoped.

**Runtime API (`00-runtime.js`, exposed as `window.Dir`).** A port of the site's `cells.js` / `tick.js` / `press.js` behaviours, nothing new:
- `Dir.cells(host, n, {clear, level})`, `Dir.setLevel(cell, level)`, `Dir.icon(host, name, {cell})`, `Dir.morph(host, name)` (icons: check, play, pause, close, chevron, chevronUp, upload, themeLight, themeDark, menu).
- `Dir.runField({values, total, curve, steps, stepMs, render, done})` with `Dir.curves.out/linear`; `Dir.order(kind, x, y, cols, rows, origin)` for `reading | diagonal | point | bayer`.
- `Dir.fill(element, {size})` → `{to(level, {order, total, holdAt, holdMs, done})}` — the press, with `holdAt` for C's level-6 beat.
- `Dir.marker(element, dir, edge)` builds the marker for that direction (A: scaled bar; B: cell column; C: level-stepped bar) and returns `{arrive(), leave(), hold(bool)}`.
- `Dir.onTick(element, cb)` — one 40 ms clock, visible-only, stops when motion is off.
- `Dir.motionActive()`, `Dir.replay(id)`, `Dir.placeholder(host, cols, rows, glyph)`, `Dir.readMs(token)`.
- `Dir.component(id, fn)` registers the binder; the runtime calls `fn(col, dir, api)` once per column after cloning, where `api` has `{press, marker, tick, fill}` already bound to the direction's tokens.
- `Dir.pick(id)` returns the stored pick.

**Picks.** Under each component: a `fieldset` "Your pick" with four radios (A, B, C, Undecided) and a one-line note input, saved on change to `localStorage` `traykov-direction-picks-v1` as `{ "cmp-nav": { "pick": "b", "note": "…" } }`. The foot panel ("Your picks") has: Export (fills a textarea with one line per component, `Chrome · Site nav: B — note`, grouped by section, undecided listed last under "Still undecided"), Copy, Clear all, and a count. Export is plain text only.

### 4.4 Batches

Six batches of roughly equal effort, each owning one partial; agents never edit another batch's file. Batch 0 ships first; batches 1–6 run in parallel against its contract. Component numbers refer to §2/§3.

| Batch | Name | Components | Partial |
| --- | --- | --- | --- |
| 0 | Shell and runtime | Controls bar, tokens, direction scopes, primitives, runtime, picks, build script, a "Primitives" article (`cmp-primitives`: cells at every level × 3 directions, the three markers, the three soft rules, the three entrances, press, dotted, done) | `00-*.{html,css,js}`, `build.mjs` |
| 1 | Chrome | 1 nav (wide), 2 theme, 3 motion, 4 footer (wide), 5 back-to-top, 6 dialog, 7 skip link | `10-chrome.html` |
| 2 | Actions and selection | 8 primary, 9 secondary, 10 quiet, 11 inline link, 12 arrows and back links, 13 icon button, 14 case link, 15 segmented, 16 select, 17 checkbox and switch, 18 slider, 19 stepper, 20 disclosure | `20-actions-selection.html` |
| 3 | Lists and Home | 21 notes rows + search + empty, 22 labs rows, 23 item rows, 24 entry rail, 25 work entry, 26 private work | `30-lists-home.html` |
| 4 | Case evidence | 27 hero (wide), 28 facts, 29 captions, 30 compare / slider / lens, 31 video, 32 grid and gallery, 33 live embed, 34 quote and carousel, 35 stat, 36 timeline, 42 cover entrance | `40-case-evidence.html` |
| 5 | Case navigation and feedback | 37 sibling nav, 38 contact prompt, 39 index rail, 40 index phone (phone-only), 41 walkthrough, 43 loaders, 44 empty state, 45 toast, 46 tooltip, 47 field, 48 form status + submit, 49 404, 50 status lines | `50-case-nav-feedback.html` |
| 6 | Tools and page | 51 tool panel, 52 tool primary and export, 53 drop zone, 54 swatches, 55 next tool, 56 page transition (simulated), 57 reveal with stagger, 58 point refresh | `60-tools-page.html` |

Batch 2 and batch 5 are the heaviest; batch 1 and 6 the lightest, balanced by the wide layouts and the runtime-heavy pieces (loaders, point refresh). If a batch exceeds 48 KB, it splits its partial into `NN-a-…html` and `NN-b-…html` (the build sorts by name) rather than trimming states.

### 4.5 What every component block must show

1. **All states, visibly and interactively.** Rest; hover (pointer); focus (Tab); pressed/selected (click); working and done (a "Simulate send" link under buttons runs the press → working 1.2 s → done); disabled with its reason sentence; error (a "Show error" link) where the ladder applies. Static state swatches are allowed **in addition**, never instead.
2. **Both themes.** Nothing hard-coded; only tokens. Check dark for sparkle (C) and for the 24 % line (A).
3. **Motion on and off.** With motion off (bar toggle or system reduced motion) every block is complete at rest and nothing moves, including the B/C motion control's own blink and the quote meters.
4. **Phone.** The View → Phone switch sets every column to 375 px; blocks use `@container col (max-width: 640px)` (and 700 / 900 where the site does) to apply the "Phone" lines of §3.
5. **Replay.** The component's Replay button re-runs its entrance (57) and resets picks-independent state.
6. **No texture behind text.** Level-1 texture only in gutters, frames, scrims and fields with no text over them (the review page should make this visible: C's drop zone and 404 are the test cases).
7. **Plain words.** All visible copy is designer language from §3; the build's forbidden-word check must pass.
8. **Accessibility floor.** Real controls (`button`, `a`, `input`, `dialog`, `details`); names on icon buttons; `aria-current`, `aria-pressed`, `aria-expanded` where §3 says; 44 px targets (36 px only in 51); focus ring 2 px ink, never removed.

### 4.6 Acceptance per batch

Run `node docs/audits/2026-10-16-visual-direction/directions/build.mjs` (it must pass), then open `component-directions.html` in the app's file preview **and** in a browser at 1440 and 390 px wide.

- **Batch 0.** The page opens from the file preview with the three fonts rendering (Departure headings are pixel-crisp, no fallback face). Theme, motion and view toggles work and persist. The Primitives article shows 9 levels × 3 directions, three markers arriving (A width, B column, C levels), three soft rules, three entrances, the press with C's level-6 beat, dotted disabled, done with the green check. Picks save, export produces the text format above, clear works. Build fails on a planted `grep` word and on a 600 KB dummy partial (test once, then remove).
- **Batch 1.** Nav: current rule per direction; hover fill/arrive/leave; a "Choose Notes" link hands the rule over; the case reading line shows progress on a "scrub" range. Theme control flips with its direction's animation and the footer value changes. Motion control shows on / off / reduced and its own blink stops when off. Footer: four columns, 2 at 820, 1 at 480; no call-to-action band. Back to top shows progress on a scrub. Dialog opens with the direction's switch, closes on Escape, returns focus. Skip link appears on Tab.
- **Batch 2.** Primary runs press → Sending → Sent and shows disabled (with reason) and error. Secondary never goes solid in C. Quiet rule and arrow nudge per direction. Inline link underline per direction, solid on hover. Icon buttons morph play ↔ pause. Case link shows C-1 and C-2 variants. Segmented hands over, arrow keys move, counters in B, phone wrapping/scrolling per direction. Select shows the chevron gap with the longest label at 375 px; the listbox variant is keyboard-operable. Checkbox, switch, slider (keyboard and drag), stepper (ends disabled with reason), disclosure all operate.
- **Batch 3.** Notes: a working filter input hides/returns rows with the direction's exit/entrance; count and empty state appear; counters renumber in B. Labs rows use cell placeholders; hover and entrance per direction. Item rows: marker on the button only. Entry rail: a "scrub" range moves the current entry. Work entry: placeholder media, caption label, context list, point refresh on hover (fine pointer only).
- **Batch 4.** Hero (wide) with status chips for all five status words per direction; facts; captions with B counters; compare switch (no-JS note: all panels visible when scripts fail), drag slider (keyboard works), lens (keyboard "Show all layers"); video bar with a simulated 90 s clip (play/pause morph, scrub, buffered cells, loading state); grid/gallery theme switch; live embed loading → loaded; pull quote and carousel (autoplay stops when motion is off; Next works); stat counting per direction (C resolves instead of counting); timeline with a "scrub" that reaches events (blink stops when motion off); cover entrance replays.
- **Batch 5.** Sibling nav with markers on the outer edges and an empty side; contact prompt with one primary; index rail and phone strip/sheet driven by a "scrub" range (sheet opens, scrolls to current, Escape closes); walkthrough trigger opens the batch-1 dialog pattern (its own copy); all six loaders running on the tick and stopping together; empty state; toast (appears, holds, leaves, Escape dismisses); tooltip on hover and focus; field focus line per direction, error flash twice then still, counter; form status with the submit press; 404 field resolving (none in A); status lines updating in plain words.
- **Batch 6.** Tool panel with 36 px buttons at ≥ 8 px spacing, sliders, select, checkbox, settings textarea; export progress on a "Simulate export"; drop zone drag-over (simulate with a button) and loaded; swatches selectable by keyboard; next-tool row; page transition simulated on a button (tile size differs per direction); reveal stagger replays; point refresh on hover.

### 4.7 Order of work and handoff

1. Batch 0 lands first (shell, runtime, primitives, build). Its author runs the build and confirms the file opens in the preview with fonts.
2. Batches 1–6 run in parallel. Each agent reads only §1, its own §3 blocks, §4, and `00-shell.css` / `00-runtime.js` for the API. Each ends by running the build and the §4.6 checks for its batch.
3. A final pass (batch 0's agent or a reviewer) runs the build, checks total size, opens the page at 1440 and 390, in light and dark, motion on and off, and reads every visible string once for terminal wording.
4. Alexander reviews, picks per component, exports the text, and the picks feed the next rollout plan.

---

## 5. Things this plan could not settle (for the owner or the builders)

- **Case link colour (14).** `--link-blue` is outside the ink/paper/signal palette. The page shows ink variants only; if Alexander wants the blue kept, that is a palette decision, not a direction.
- **C's texture in dark.** The 8 px tile in dark is a judgement from the specimen; the review page is where it is verified for sparkle. If it still shimmers, C in dark drops texture zones to level 1 at 4 px tile.
- **B's counters.** Counters on nav links and figure captions are decorative (`aria-hidden`); if screen-reader users should hear them, they become real text and the private template / verify-site string contracts must be checked first.
- **Page transition (56).** `public/page-transitions.js` timings are protected; only the tile size is a token. If a direction wins that needs other timings, that is a separately approved change.
- **Loaders not on the site yet** (dither sweep, breathing cells, mosaic poster, toast, tooltip, stepper, skip link, swatches, drop zone outside the studio) are shown as proposals; picking a direction for them does not add them to the site by itself.
- **Fonts budget.** If a future batch pushes the built page over 580 KB, drop the Geist Mono embed (used only for arrows and character grids on the page) and fall back to `ui-monospace`; Departure and Geist stay embedded.
