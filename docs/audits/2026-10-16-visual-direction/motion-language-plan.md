# Simple marks, precise timing: motion, raster and delight plan

17 October 2026 · Version 3, revised after three rounds of owner direction. Extends `REPORT.md` and the two sub-agent reviews.

Live specimen: [`motion-specimen.html`](motion-specimen.html). It is self-contained (fonts and the demo image are embedded), so it opens correctly from the file preview, a browser or an attachment. Only the header-font candidates need a connection, since they load from Google Fonts. It covers a header-font tester, stagger, seven raster treatments, dithered loaders, two animated diagrams, the case index and the Notes filter, each with motion on/off and light/dark.

This is a plan, not authorization. Nothing here changes application source.

## What changed in version 3

- **The broken preview was a loading problem, not the design.** The app's file preview opens a page as a data URL, so the version 2 specimen's relative image path and all three font files failed to load. The "janky Geist" seen there was a system fallback font, not Geist. The specimen now embeds its assets.
- **Header font: Departure Mono.** §2 lists seven candidates, and the specimen lets you apply each to every heading. The owner chose Departure Mono, so it is now the specimen's default, with sizes snapped to its pixel grid.
- **Case index redesigned** for desktop and phone, driven by real scrolling (§8).
- **Loaders use real dither.** Cells fill through a 4×4 ordered-dither pattern in eight levels, rather than through opacity (§5).
- **Diagrams animate further.** They draw themselves along their own lines in process order, then a marker travels the real path and lights each step it reaches (§6).

## What changed in version 2

- **Fewer terminal words.** No commands, `$` prompts, `grep`, `localhost`, error codes or file paths in anything a visitor sees. The site borrows how old screens *behave*, not how engineers talk.
- **Characters plus blocks.** Loaders, meters and fills use block type (solid cells and the ░ ▒ ▓ █ shade ramp from the Blocktype wave study), not only line-drawing ASCII.
- **Polish comes from stagger.** Version 1 said "no easing". The better rule is **steps inside, curves across**: each cell switches in discrete steps, while the *delays* across many cells follow a smooth curve. That keeps the character-built feel and adds the refinement you want.
- **Readable type** is now its own section.
- **Raster** is explored in depth: seven treatments, each with where it belongs and how it stays fast.
- The working name "Teletype" is dropped. It was too technical.

## 1. The idea

> **Dead-simple marks, moving with precise timing.** Everything visible could be drawn on graph paper: lines, arrows, cells, shades. All the craft goes into *when* each mark appears.

That combination is the moat. Plenty of sites have ASCII decoration, and plenty have smooth animation. Very few pair deliberately plain, character-built artifacts with choreography that feels expensive.

### Principles

1. **Simple marks.** Build with characters and cells: box lines, arrows, dots, solid blocks and the ░ ▒ ▓ █ shades. No gradients, glows or illustration inside these elements.
2. **Steps inside, curves across.** A single cell or character changes in discrete steps (off → ░ → ▒ → ▓ → █). The wave of delays across a group follows an easing curve, so the group arrives fast and settles gently.
3. **Borrow the behaviour, not the look.** Take what old screens *did*, never what they looked like:
   - CRT: switching on from a line, afterglow on the way out.
   - LCD: cells refreshing in a sweep.
   - Terminals: text printing in reading order.
   - Never draw scanlines, pixel grids, subpixels, glow, colour fringing or flicker noise.
4. **Plain words.** Labels read like a designer wrote them: "Loading video", "Saved", "3 notes", "Nothing here yet". There is no machine language anywhere a visitor reads.
5. **Order means something.** Text arrives in reading order. Diagrams arrive in the order the process happens. Media resolves from coarse to sharp. If the order says nothing, use a single snap instead.
6. **Settle, then stay still.** Each element animates once into a complete resting frame. Only one thing per view keeps moving, and only when it shows something real (loading, the current step, progress).
7. **The rest state is the design.** Reduced motion, the site's motion switch, no-JS and print all show the finished frame.
8. **Fast by construction.** Only transform, opacity, clip-path and mask are animated. Canvas is used only for image rasters. Nothing runs offscreen.

## 2. Type that keeps the character and reads well

The audit found too many loud voices: mono at 700/800, uppercase micro-metadata, a weight-850 diagram style. The deck showed that the same mono family at a medium weight keeps the identity. Proposed roles use fonts that are already in the repo, so no dependency changes:

| Role | Font | Setting | Notes |
| --- | --- | --- | --- |
| Display and section headings | **Departure Mono** (owner's choice) | Sentence case, regular weight, no tracking; sizes only at multiples of 11px: display 66px (44px on phones), section 33px (22px on phones), small headings 22px | Already self-hosted in `public/fonts`. The Geist Mono 700/800 imports can probably be dropped |
| Reading | Geist Sans 400 | 17–18px/1.6, 64–68ch measure, ink at ~78% | Medium 500 for inline emphasis instead of bold |
| Labels and metadata | Geist Sans 500 | 13–14px, normal case, muted | Replaces tiny uppercase mono. Readable without shouting |
| Character elements (diagrams, signatures) | Geist Mono 400 | 14–16px/1.4, ligatures off | Labels inside diagrams in 500 |
| Numerals and index numbers | Departure Mono | 11px in lists and indexes, 22px or 33px for counters | Same face as the headings, so numbers and titles read as one voice. Never for body text |

Rules: no uppercase longer than two words, no weight above 600 outside a single emphasised word, and no metadata below 13px.

### Header font

The headings are where the identity is loudest, so this is worth a real choice. One honest caveat first: the version 2 specimen failed to load its fonts in the file preview, so what looked janky there was a fallback font. Judge Geist Mono again in the self-contained version 3 before ruling it out.

Monospace headings do have one real weakness at display sizes. Every letter gets the same width, so `i`, `l` and `r` leave gaps that read as uneven. Each candidate below handles that differently. All are open-licence. Using one on the site means adding one self-hosted `.woff2` file to `public/fonts` (as Departure Mono already is), not an npm package.

| Candidate | Character | How it handles mono gaps | Fit |
| --- | --- | --- | --- |
| Geist Mono 500 | Even, technical, current family | Doesn't; the gaps remain | Safe; matches the existing code text |
| Space Grotesk 500 | Proportional, drawn from Space Mono | Proportional widths, mono quirks kept | Strong runner-up; reads best at large sizes |
| Fragment Mono 400 | Helvetica-like mono | Narrower letters soften the gaps | Calm and designed rather than coded |
| Martian Mono, narrowed | Variable width and weight | Narrowing to about 87.5% closes the rhythm | Strong presence; slightly more technical |
| IBM Plex Mono 500 | Warm, humanist | Partly, through its softer shapes | Very readable, a little corporate |
| **Departure Mono** | Pixel face | Doesn't need to; the pixels are the point | **Chosen.** The most distinctive option, and it pairs naturally with the dither cells |
| Geist Sans 500 | No mono at all | Not applicable | Quietest option, closest to the study branch |

Diagrams, loaders and any character grid stay in Geist Mono whatever the heading choice, because they need equal-width characters and its box and block glyphs are verified.

**Rules for Departure Mono headings:**
- Use sizes on its 11px grid only (11, 22, 33, 44, 55, 66px), or the pixels blur.
- Use weight 400 only; there is no bold, and faux bold smears the pixels.
- Keep reading text in Geist Sans. Departure is for headings, numbers and short labels.
- Check the longest real headings at 22px on a 375px phone (for example "What an AI product designer owns in an enterprise product" or "Rebuild navigation around the product Pave had become"). Two lines is fine; three means the heading should drop to the next size on phones.
- It lacks a matching `▶`, so arrows inside headings fall back to another font. Keep arrows in Geist Mono diagrams.

**Glyph check.** Measured in the browser, Geist Mono renders `░ ▒ ▓ █ ─ │ ┌ ▶ ■` at the same advance width as `a`, so diagrams and shade text stay aligned. Departure Mono lacks a matching `▶`. Loaders and meters still draw their cells with CSS, which gives perfect alignment, any colour, and cheap animation. Any new glyph needs the same check before use.

## 3. Stagger: where the polish lives

Each group defines three things.

- **Order field**: what goes first.
  - **Reading**: line by line, left to right. For text and lists.
  - **Diagonal**: top-left to bottom-right (x + y). The default for grids and blocks; it feels like one sweeping gesture.
  - **From a point**: distance from the pointer or a tapped element. For hover and click responses.
  - **Dither order**: a 4×4 or 8×8 ordered-dither matrix. For images and fills; the group passes through ░ ▒ ▓ density on its way to solid.
  - **Seeded scatter**: rarely, for a sparkle on a single moment.
- **Delay curve**: `delay(i) = total × curve(i / count)`. An ease-out curve sends the first cells quickly and lets the tail settle. Linear delays look mechanical and cheap; curved delays look designed. The specimen has a switch to compare them.
- **Cell steps**: each cell takes 3–5 discrete steps (about 30–40 ms each) using `steps()` timing.

Budgets:
- One group takes at most 600 ms. A whole viewport settles within about 900 ms.
- Up to about 200 DOM cells per element; above that, draw on canvas.
- Delays are computed once and written as CSS custom properties, so the browser runs the animation without per-frame JavaScript.

## 4. Raster: seven treatments

"Raster" here means an image or block surface drawn in visible stages. Each treatment borrows one behaviour from old screens without reproducing their artefacts.

| # | Treatment | Borrowed behaviour | What it looks like | Use it for | Build |
| --- | --- | --- | --- | --- | --- |
| R1 | **Band sweep** | LCD refresh | The image appears top to bottom in 10 hard-edged bands | Default entry for case images and video posters | `clip-path` with `steps(10)`. Cheapest option |
| R2 | **Interlace** | Interlaced TV fields | Every other band appears, then the gaps fill | Large hero media, where one pass feels abrupt | Two pseudo-element covers, one striped, wiped in sequence |
| R3 | **Mosaic resolve** | Progressive image loading | Coarse blocks sharpen in 4 steps: 1/32 → 1/16 → 1/8 → full | **Loading video posters and slow media.** The loader is the content itself | Canvas: draw the image small, then scale it up with smoothing off. No pixel reading |
| R4 | **Dither dissolve** | Ordered dithering | The image fades in through ░ ▒ ▓ density, cell by cell, in dither order | Featured images on Home and in case heroes, and the About collage | Canvas cover of paper-coloured cells removed in matrix order, then the canvas is discarded |
| R5 | **Point refresh** | A screen redrawing where you touch it | On hover, cells refresh outward from the pointer | Home work entries and Labs rows | Reuses R4 with delays based on distance from the pointer. Runs only on hover-capable devices |
| R6 | **Switch on / off** | A CRT warming up | A panel opens from a thin line to full height in steps, then its content snaps in. Closing reverses it to a line, then nothing | Fullscreen previews, the mobile case index, the menu | `transform: scaleY` with `steps(6)`, then a snap. No glow |
| R7 | **Afterglow exit** | Phosphor fading | On leaving, an element steps down 100 → 55 → 20 → 0% opacity | Hover-out, dismissing, rows filtered away | `opacity` with `steps(3)`. Short, about 180 ms |

Shared rules:
- Media keeps its intrinsic size from the first frame, so there is no layout shift.
- The raster runs only when the media scrolls into view, and only once per visit.
- No-JS and reduced motion show the finished image. Canvas covers are deleted after they finish.
- R3 is the only treatment allowed to repeat, because it reflects real loading.

Relationship to existing work: the Blocktype wave study (`src/sketches/blocktype-dither.js`) already quantises into blank, ░, ▒ and ▓. The `dither-pixel-dispersal` and `project-card-ascii-dispersal` scripts already do card-level dispersal. R4 and R5 should share one small module with them instead of adding a third dither implementation. `lcd-memory.js` stays a Labs piece: its subpixels and scan loss are exactly the visible artefacts the site itself should avoid.

## 5. Dithered block loaders

Every loader is built from **dithered cells**: CSS squares filled through a 4×4 ordered-dither (Bayer) pattern in eight levels, from empty, through light, medium and dense dot patterns, to solid. The pattern is applied as a CSS mask, so the cell takes the ink colour in both light and dark themes, and stays crisp at any size. Changing a level only swaps a mask on a tiny element, with no layout and no canvas. The same cell powers the stagger field, so loaders, fills and grids share one look.

| Loader | Form | Means | Where |
| --- | --- | --- | --- |
| **Dither bar** | A row of cells; the leading edge is a dither gradient | Known progress (percentage, steps done) | Video buffering, exports in Labs |
| **Dither sweep** | A soft dithered band passing along a row | Waiting, length unknown, inline | Loading more, list refreshes |
| **Breathing cells** | 3×3 cells pulsing through the dither levels in a diagonal wave | Waiting, length unknown | General waits. Echoes the Pave breathing grids |
| **Quarter turn** | One solid block moving around a 2×2, with a dithered tail | Working on something right now | Inside buttons, the motion toggle |
| **Button press** | The button fills diagonally through the dither, then shows "Sending" with a quarter turn, then "Sent" and dithers back out | A form is sending | Contact form, any primary action |
| **Mosaic poster** | R3 on the actual poster frame | The content itself is loading | Case videos. The best loader, because it previews the content |
| **Pixel counter** | Departure Mono numerals stepping up | Real numbers (case stats) | `case-stat` only, real figures only |

Labels are a single plain word or two ("Loading video", "Sending", "Sent", "Didn't send. Try again"), placed beside the loader rather than inside it. Status changes go to a polite live region once, not on every frame. When a cell is fully filled, swap it for a plain solid fill so adjacent cells never show hairline seams.

## 6. Diagrams

The diagrams are still the clearest way to make the cases more legible than another video. The changes from version 1 are only about language and tone.

- **The diagram style must lighten.** `.ascii-diagram` and `.rfc-node` (`global.css:3425–3500`) use weight 850, uppercase, a fake-bold text shadow, a frame, a grid background, an offset shadow and dashed borders. Replace that with Geist Mono 400, sentence case, line-height 1.4 and no frame.
- **Proposed `ascii` fence** for the custom renderer (needs explicit renderer scope, backward-compatible). The body is drawn exactly as it should look. A `marks:` line names which words highlight or animate, so the source stays aligned. A `summary:` gives the plain-language equivalent for screen readers:

````md
```ascii
title: Direct Edit change states
summary: Selecting an element starts a clean state. Editing makes it dirty. Save or Discard returns it to clean.
marks: clean=state dirty=state save=ok discard=dim
---
     select element
           │
           ▼
     ┌──────────┐   edit     ┌──────────┐
     │  clean   │ ────────▶  │  dirty   │
     └──────────┘            └────┬─────┘
           ▲                 ┌────┴─────┐
           │                 ▼          ▼
           └──────────────  save      discard
```
````

- **Language inside diagrams:** product words from the case ("select element", "edit", "save"), never code identifiers or commands.

### How diagrams animate

Printing row by row (version 2) reveals unrelated parts of a diagram together, because a row can cross three boxes. Version 3 animates in **process order**:

1. **Grow along the lines.** Drawing starts from the diagram's start point (for example "select element", or both ideas at once in the Synapse loop). It spreads outward through touching marks, so ink appears to flow along the connectors into each box and label. Each character steps blank → ░ → ▒ → final, and the spread follows the curved stagger. Small horizontal gaps are bridged so labels inside boxes are reached. The whole diagram draws in about 1.1 s.
2. **Rest in a lighter tone.** Once drawn, lines and box edges settle to a muted ink, and labels stay full ink. This leaves contrast for what comes next.
3. **Travel the real path.** A small solid marker (■) with a short bold trail moves along the actual route, one character per tick. Labels the marker passes (such as "edit" or "connect") highlight while it travels.
4. **Light what it reaches.** On arrival, a box's border turns full ink at a heavier weight and its label inverts (paper on ink). It holds for about 0.6 s, then the marker moves on. Semantic states can use the signal colours (green for save, grey for discard).
5. **Vary each loop.** Branches alternate (Save, then Discard), and choices rotate (expand → compare → synthesise → summarise). Repeated loops then show the whole behaviour, not one path forever.
6. **Rest state.** With motion off, the diagram is complete, with one meaningful state lit (for example "dirty").

Authoring stays designer-friendly. Beyond `marks:`, the fence gets two optional lines:
- `start:` names where growth begins (`start: select element`, or `start: idea A, idea B`).
- `tour:` lists the stops in order: `tour: select element > clean > edit > dirty > save | discard > clean`. A `|` means "alternate between these on each loop".

The renderer finds the line route between consecutive stops itself, with a breadth-first search along line glyphs. Nobody types coordinates. The specimen hand-routes its two diagrams; auto-routing is part of the renderer work in Phase 6.

Performance: about 250–450 characters per diagram, each a span updated only when its state changes. Growth runs once on entering the viewport. The tour steps on the shared 40 ms clock, only while the diagram is visible and motion is on.
- **Candidates, unchanged from version 1, each from facts already in the case text:**
  - Pave: Direct Edit states (`designing-pave.mdx:163–188`), Plan Mode steps (`:148–160`), version restore (`:93–112`).
  - Pipelines: connection anatomy (`pipelines.mdx:30–38`), which also replaces the illegible hero glyph field, and the AI suggestion with its waiting and failure states (`:40–46`).
  - Synapse: the core loop (`synapse-sys.mdx:65–80`) and the sharing boundary (`:87–97`).

## 7. Findings from the code that still stand

- **The default reveal is generic.** `[data-reveal]` uses `blur(8px)` plus an 18px rise on an expo curve over 520 ms (`global.css:990–1013`). Replace it with a snap for text and R1 band sweep for media, both on curved staggers. This is the biggest identity shift for the least code.
- **The Synapse cases contain 14 empty blocks.** Their 11 + 3 custom diagram fences lost their renderer in commit `108dbeb`, so they render as empty `<pre>`. Confirmed in a fresh build. `CaseStudyPage.astro:339` still loads `synapse-mini-canvas.js`. A separate session has been proposed for this fix.
- **Mermaid fences become plain text.** `renderStructuredDiagram` (`content.ts:483–490`) reduces mermaid to `A -> B` lines.
- **`count-up.js` ignores the motion switch.** It checks only the system reduced-motion setting, not `isMotionActive()`.

## 8. Delight, route by route (plain language only)

1. **Site-wide reveal swap.** Snap for text and band sweep for media, with curved stagger. Prototype it in Astra's vertical slice first.
2. **Case index**, redesigned for both sizes and driven by real scrolling (see the specimen):
   - **One dithered cell per section is the reading meter.** Unread sections show an empty cell. The current one fills through the eight dither levels as you read through it. Read sections settle to a light shade. No separate progress bar or sliding marker is needed.
   - **Desktop rail:** an "On this case" heading with a plain "28% read". Rows show the cell, a Departure Mono number (`01`–`15`) and the title in Geist Sans; the current row is full ink at weight 500. Clicking a row scrolls to the section, and the rail keeps the current row in view without moving the page. On narrow desktops the rail collapses to cells and numbers only.
   - **Phone strip** (sticky): the section number in Departure Mono at 22px, the current title (it resolves through ░ ▓ when the section changes), and a plain **Contents** button. Under it, a row of 30 cells fills with overall progress, with a dithered leading cell. This replaces the old tiny "+" control.
   - **Phone sheet:** Contents opens a sheet from the strip with the switch-on treatment (R6), over a light dithered scrim. Rows are at least 48px tall and use the same cell, number and title. The current row is marked, and the sheet opens scrolled to it. Tapping a row closes the sheet and jumps there. Escape or tapping the scrim closes it, and the button reads "Close" while open.
   - **Reading line:** a section becomes current when its top passes about 80px below the strip, so a jump always lands on the section you chose, short ones included.
   - **Accessibility:** the current row carries `aria-current="location"`, the button carries `aria-expanded`, and the animated title is decorative; the list is the source of truth.
3. **Case video.** A mosaic poster (R3) while loading, the block bar while buffering, and plain labels. This needs Astra's poster-frame task first.
4. **Notes filter.** No grep line. Rows that stop matching leave with the afterglow exit (R7). Rows that come back snap in on a short reading-order stagger. A quiet count reads "3 notes". The empty state says "No notes about 'x' yet".
5. **Home first viewport.** One small character-built object with a meaning, for example `design ──▶ code ──▶ ship` from your own tagline. It prints once and holds. Home work entries get the point refresh (R5) on hover.
6. **Labs rows.** Replace the dust-sized ASCII thumbnails with a readable block signature for each tool, drawn in cells, plus the shared hover marker (see component-system-plan.md §2).
7. **Numbers.** Real case stats count up as pixel numerals on the shared timing, and the motion switch is respected.
8. **Contact.** Block bar while sending, then "Sent" or "Didn't send. Try again". Separately scoped because the form is sensitive.
9. **404.** A large "404" built from block cells that resolves with the dither dissolve, a plain line ("This page isn't here"), and real links.

Deliberately excluded: scanlines, pixel grids, glow, colour fringing, glitch, custom cursors, scroll-jacking, parallax, typing on prose, command-line wording, ambient loops on Home, and any change to `public/page-transitions.js` timings.

## 9. Phased plan

| Phase | Deliverable | Depends on | Notes |
| --- | --- | --- | --- |
| **0. Baseline** | Astra's preservation inventory and integration base, plus the Synapse empty-block fix | — | The fix can ship first |
| **1. Direction sign-off** | You review this document and the specimen, and decide the open questions in §10 | — | Can run in parallel with 0 |
| **2. Type roles** | Self-host the chosen header font (or import Geist Mono 500), apply the role table to Home, a case opening and Notes, and lighten `.ascii-diagram` | 1, header-font decision | Merges with Astra's type comparison |
| **3. Motion primitives** | Snap, band sweep, afterglow and switch on/off CSS; the curved-stagger helper; a shared cell module for blocks and loaders; the `count-up` fix; `AGENTS.md` vocabulary amendment | 1 | Shared CSS and motion work. Test no-JS, reduced motion, the motion switch and history restore |
| **4. Vertical slice** | Astra's Home, Pave and mobile Notes slice with type, boundaries and motion together, at 1440 and 390, light and dark, motion on and off | 2, 3 | One integrated judgment |
| **5. Raster and loaders** | R3–R5 canvas module (shared with the existing dispersal scripts), block loaders, video loading | 3, Astra's poster task | Measure frame time on a mid-range phone |
| **6. Diagrams** | `ascii` fence and three to five fact-checked diagrams | 3, renderer scope | Pipelines diagram replaces its hero field |
| **7. Delight pass** | Case index, Notes filter, Labs signatures, 404, contact | 3–5 | Each item ships independently |
| **8. Acceptance** | `npm run verify`, `npm run build`, `npm run check:browser`, and route checks per family. Also CLS = 0, no work offscreen, and the motion switch stopping everything | All | You own merge and deploy |

## 10. Decisions for you

1. Replace blur-rise with snap and band sweep as the default entrance? (Recommended.)
2. Header font: **decided, Departure Mono.** Remaining check: the longest real headings at 22px on a phone.
3. Which raster treatments feel right, now that they load? My shortlist is R1 (default), R3 (loading), R4 (featured images) and R6 (panels).
4. Signal colours: keep the deck's green and red for diagram states only, or stay strictly ink-on-paper?
5. Synapse empty blocks: restore the old figures, rebuild a few as diagrams (recommended), or delete them?
6. Amend the closed motion vocabulary in `AGENTS.md` to add snap, sweep, afterglow, switch and cell stagger?
