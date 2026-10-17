# Component system plan

17 October 2026, revised the same day: hover, disabled and done redrawn after owner review · Companion to [`motion-language-plan.md`](motion-language-plan.md). The live, self-contained specimen is [`component-specimen.html`](component-specimen.html), which opens from the file preview or any browser.

The motion plan defined the aesthetic: simple marks, precise timing, dithered cells and Departure Mono. This plan applies it to every UI component on the site and says how they connect, so the site reads as one object rather than a collection of styles. It is a plan, not authorization; nothing here changes application source.

## Round 3 decisions (owner review, 17 October)

These override anything below that disagrees.

- **Navigation:** Alexander's logo mark (`public/sasi.svg`), drawn as a mask so it follows the theme, replaces the "AT" text. Links read Work, Notes, **Labs**, About, Contact.
- **Motion and theme:** the motion indicator leaves the top bar. The motion setting moves to the footer's Settings column (and the phone menu), so visitors can still stop motion, which WCAG 2.2.2 requires for anything moving longer than 5 seconds. Theme becomes an icon-only control: a small half-filled square, no frame, with a tooltip.
- **Footer:** quiet and on one grid, with no call-to-action band (the contact prompt already ends each case). It has four link columns with the same top line (Site, Contact, Feeds, Settings), then a base row: a small logo mark with "Alexander Traykov · Sofia · 2026", and Back to top with the progress cells. It is paper, not the dark band.
- **Labs index:** shows real screens of each tool, captured from the production build, instead of ASCII thumbnails. The list is now **Turntable Playground, SVG → 3D ASCII, ASCII Banner Studio and Presentations in Code**. Creative Coding Sketchbook, Rhizome Field and Product Systems Kit come off the index; their routes stay unless you want them removed.
- **Drop zones:** no texture behind text. A hairline box with a cell upload icon, "Drop an SVG here", a "choose a file" link and one hint line. Drag-over thickens the border and snaps in corner cells. Once loaded, a green check and the file name appear.
- **Hover, disabled, done:** see the state ladder below. These were redrawn in round 2.
- **SVG → 3D ASCII studio:** the render engine stays; the UI around it is rebuilt. See §3, Tools.

## 1. What the site has today

A read-only inventory of `src/components`, `src/pages`, the renderer, the scripts and `global.css` found:

- **About 25 distinct button styles.** They include ascii-action primary, secondary and text; the contact submit (which stacks two styles); the private-access submit; timeline outline links; the theme and motion toggles; the video toggle; breathing-grid buttons; `.case-switch`; the TOC toggle; the walkthrough trigger; modal closes ("×" in one place, "x" in another); and per-tool buttons in Banner, Sketchbook, Rhizome, the turntable pages, Presenting in code, Product kit and the SVG studio.
- **Eight segmented-control implementations and two tab systems.** Their pressed states vary (ink fill, inset underline, xylem border), and so do their heights (36–48px). `.case-switch` sits at 36px, below the 48px tap target.
- **Three video players:** the overview video (custom toggle, no native controls), `case-video-copy` (native controls with autoplay) and the walkthrough modal (native).
- **Layered CSS.** Components are redefined in override passes at roughly 992, 5714, 6646, 12027, 12664 and 13190+. The nav, `.case-sibling-nav` and the TOC are each overridden four to six times. `.case-toc` alone has 66 selectors.
- **Dead CSS:** `.work-directory`, `.project-card--expandable`, `.case-sibling-nav__preview`, `.about-metrics` (26 rules), `.case-bluf-note` (46 rules), `.case-index-grid`, `.recording-media`, `.case-reading-tools__status`, `.case-hero-disclaimer` and the unused ascii-action "inverse" variant.
- **Inert motion markup.** `scramble.js:129` switches scramble off inside the nav, footer, TOC, sibling nav, contact prompt, contact call, published items and the labs tool hero, but the markup is still in all of them.
- **A particle burst on every click.** `ascii-control-effects.js` loads on every page and fires an ASCII particle burst on every button and nav-link click. It is decoration that competes with the press and does not carry information.
- **Heavy frames.** `case-stats` and `.ascii-diagram` combine a border, a hard offset shadow and inner borders. Case images gain a shadow on hover.
- **Inconsistent small parts.** Captions mix weights (800 mono, 850 sans, 500 mono). ↗ is used for both internal and external links, alongside → and "+". Back links come in three casings ("← Work", "← ALL NOTES", "← All labs"). Hero sizes range from 1.5rem to 142px across routes.
- **Missing pieces:** no mobile menu (at 640px the nav becomes a two-row grid of tiny links), no skip link, no 404, no toasts, and no tooltips beyond `title`.
- **Unused or misplaced components.** The identity rotator is only on `/component-preview`, not a live page. `ProjectCard` is used only on the private collection and the preview, and Labs hand-copies its markup. The four turntable pages are near-duplicates of about 155 lines each.

## 2. The system: six primitives, one ladder, one density scale

Every component is built from the same six primitives (specimen §0):

| Primitive | Contents |
| --- | --- |
| **Cell** | A square with eight ordered-dither levels. Used for fills, meters, markers, selection, loaders, checkboxes and status |
| **Mark** | A hairline for real boundaries, a dither rule for soft ones, and box lines and arrows inside diagrams |
| **Type** | Departure Mono for headings, numbers and short labels; Geist Sans for reading; Geist Mono for character grids |
| **Timing** | Steps inside, curves across, with one 40ms clock for anything that keeps moving |
| **Raster** | Band sweep, mosaic, dither dissolve, switch on and off, and afterglow |
| **Words** | Plain labels ("Loading video", "Sent", "3 notes") |

### The state ladder

Every interactive component moves through the same states, drawn the same way:

| State | Drawing | Notes |
| --- | --- | --- |
| Rest | Hairline, ink text | — |
| Hover | A solid marker arrives at the edge in three steps (light, dense, solid), and the label steps aside about 5px | Left edge on buttons and rows, right edge on the right-hand sibling link, bottom edge on tabs and icon buttons. **Nothing is ever drawn behind text.** Media keeps its own point refresh |
| Focus | 2px ink outline | Never removed. Keeps the existing global `:focus-visible` rule, at a fixed 2px |
| Pressed or selected | Diagonal dither fill to solid; text inverts | Tabs, selected options, the current nav item and primary press |
| Working | A small cell loader in place, plus a plain word | Quarter turn in buttons, dither bar for known progress |
| Done | The fill dissolves first. Then, on plain paper, the marker stays solid, a green cell check appears, and the new word shows. It holds for about 1.5s, then the marker steps out to rest | "Sent", "Saved", "Copied". Must never look like Rest |
| Disabled | A dotted outline (the border drawn through the dither), muted text, the reason in words, and no hover marker | `aria-disabled` plus `aria-describedby`, so it stays focusable and explains itself. Dotted already means "not active" in the density scale |
| Error | One plain sentence; the line flashes twice, then stays red | Signal red only here and in diagram states |

### The density scale

Cell density means the same thing everywhere, which is what links components that look unrelated:

| Level | Meaning | Where it appears |
| --- | --- | --- |
| 8, solid | Current, selected, done, shipped | Current nav item, selected tab, active TOC section, "Launched", finished progress |
| 5 | In progress, partly there | "Closed beta", the leading edge of any progress |
| 3 | Visited, read, supporting | Read TOC sections, "Prototype", supporting cells in the matrix |
| 1 | Texture only, never behind text | Empty drop areas, placeholder bars |
| 0 | Not yet | Unread sections, empty cells |

One consequence: **status chips become honest by construction.** Launched is solid, Closed beta is 5, Prototype is 3 and Archived is 1. That gives Astra's Synapse "prototype" versus "closed beta" finding a visible vocabulary rather than a relabel.

## 3. Component map

**Priority** is the phase in §5. **Replaces** counts what the component consolidates.

### Chrome

| Component | Today | Proposed (specimen §) | Replaces |
| --- | --- | --- | --- |
| Site nav | Sticky, 12px mono uppercase, scale-in underline, blur fill; `.case-progress` bar on cases | Sans 14px links. The current page is a solid cell rule; hover fills the rule in reading order; choosing a link hands the rule over (§1) | Override layers 567, 5740, 6053, 12925, 13473, 13954 |
| Mobile menu | None: a two-row grid of 0.75rem links | A "Menu" button whose icon morphs to "Close"; a panel switches on below the bar with Departure links at 33px, numbered, snapping in (§1) | The ≤640 grid and the conflicting 6083 block |
| Motion toggle | Borderless "MOTION ON/OFF/REDUCED"; label hidden and re-shown by conflicting rules | "Motion" plus a two-cell switch; same `aria-pressed` and lifecycle wiring (§1) | Rules at 12712, 12936, 13509 |
| Theme toggle | Sun/moon cross-fade with rotate | A 5×5 cell icon whose interior dithers in for dark; tooltip on hover and focus (§1) | Rule at 619 |
| Footer | Dark band, logo, links, "Sofia · 2026", duplicated "Back to top" | Paper footer with a hairline. One "Back to top" that shows how far down you are as cells (§12) | The duplicate back link and dark band |
| Booking dialog | `<dialog>` with an iframe and an "×" close | The same dialog; switches on and off, cell close icon, dimmed backdrop (§7) | The "×" and "x" closes |
| Skip link | None | "Skip to content": a primary-style button revealed on focus | New |
| 404 | None | A block-built "404" that dissolves in, one plain line, two real links (§12) | New |
| Page transitions | View transitions, 180ms main fade | Keep as is: `page-transitions.js` is protected. A later, separately approved pass could swap the fade for a band sweep | — |
| Click particles | `ascii-control-effects.js` bursts on every click | **Retire.** The press fill does that job and carries meaning | One site-wide script |

### Actions

| Component | Proposed | Replaces |
| --- | --- | --- |
| **Primary button** | Ink border. Press: diagonal dither fill to solid → quarter turn and "Sending" → "Sent" → dither out. One per view (§2) | ascii-action primary, contact submit, private-access submit, banner save, ink save |
| **Secondary button** | Ink border. Hover: the left-edge marker. Press: solid, then out (§2) | ascii-action secondary, timeline outline links, published-item links, CV "Visit" |
| **Quiet action** | Text with a dither rule that turns solid on hover; the arrow nudges in three steps (§2) | ascii-action text, timeline related links, "Email instead" |
| Inline link | 2px dither underline that steps to solid on hover (§2) | Underlines in prose |
| Icon button | 44px square with a cell icon and a real tooltip on hover and focus (§2) | Theme toggle, video toggle, modal closes |
| Arrows | → internal, ↗ external, ← back, all in Geist Mono. Back links read "← Work", "← Notes", "← Labs" in sentence case | Mixed ↗, → and "+", and three casings |

### Selection

| Component | Proposed | Replaces |
| --- | --- | --- |
| **Tabs and segmented** (one component) | Selected is solid. A change hands the fill over: the new tab dithers in left to right as the old one dithers out. Arrow keys move between tabs (roving tabindex). Default size 44px; a compact 36px only inside tool panels (§3) | BreathingGrid buttons, `.case-switch`, banner presets and formats, Rhizome views, Sketchbook directory, `pc-controls`, private-demo buttons, playground and turntable tabs |
| Select | Button plus listbox with a cell chevron, reserved end padding, and a list that switches on; full keyboard support (§8). Meets the `AGENTS.md` select rule | Global select restyle at 14232 and the Banner custom listbox |

### Home

| Component | Proposed |
| --- | --- |
| Identity rotator | Decide whether it ships. If it does, it sits on Home in Departure at 22px, resolving each role through ░ ▒ ▓ (§4). It is not on a live page today |
| Timeline rail | Cell marker per entry, solid for the current one (§4). The ≤900px horizontal strip keeps its behaviour |
| Work entry | Departure date and title, small tabs, a quiet "Open case →". Media draws in with a band sweep; hovering refreshes it from the pointer (§4) |
| Breathing grid controls | Become the shared tabs component; the inspector uses the shared slider |
| Overview video | Becomes the shared video player (below) |
| Private work link | A secondary button, not an ink-bordered box with an 800 uppercase heading |

### Case study

| Component | Proposed |
| --- | --- |
| Hero | "← Work", status chips with density, read time, Departure title at 66/44, summary (§5) |
| Facts (role, timeline, scope) | Definition list on dither rules, no boxes (§5) |
| Case index | As specified in the motion plan §8: one reading cell per section, plus the phone strip and sheet |
| Captions | One hierarchy: a Departure 11px label ("Fig. 2", "Video") plus a sans note, separated from the media by one hairline (§6). Replaces the 800, 850 and 500 mixes |
| **Video player** (one) | Mosaic poster while loading; a cell play/pause icon that morphs; a cell scrubber (solid played, light buffered) over a real range input; Departure time; plain status words (§6). It replaces all three players, keeping native controls as the no-JS fallback |
| Image grid / carousel | Keep the layouts; drop hover shadows; band sweep on entry |
| Compare (`case-compare`) | Dither-rule divider over a real range input (§6). Replaces `.case-switch` cross-fades where a slider fits; otherwise uses the shared tabs |
| Live embeds and tags | Tags become status chips (density instead of dashed borders) |
| Stat (`case-stat`) | Departure 66px numerals counting once on a curve, a plain label and a caveat line. No border or shadow (§6) |
| Quote (`case-quote`) | Level-3 dither bar plus sans 22px quote plus Departure citation. Replaces ">>", the 2px rule and 800 mono |
| Timeline (`case-timeline`) | A cell chart where the data supports one (§6); otherwise dates in Departure on dither rules |
| Diagrams | As in motion plan §6: they grow along their own lines, and a marker travels the path |
| Contact prompt | A Departure line plus primary "Write to me" plus secondary "Book a call" (§7) |
| Sibling nav | Two halves on hairlines, with the hover marker on the outer edge and an arrow nudge. Drop the "coming soon" cell (§7) |
| Walkthrough trigger | Secondary button with a small poster; opens the shared dialog. Drop the offset shadow and blur |

### Lists

| Component | Proposed |
| --- | --- |
| Notes rows | One link per row: Departure 22px title, Departure 11px date, one hairline, and the left-edge hover marker (§9) |
| Notes search | The motion plan's filter: rows leave with afterglow and return with a snap; plain count and empty state |
| Labs rows | A 10×5 cell signature per tool replaces the dust-sized `<pre>` previews; Departure title, sans description, "Open →" (§9). Built on `ProjectCard` instead of hand-copied markup |
| Published items (About), experience rows (CV) | The same row pattern with a secondary button |

### Forms

| Component | Proposed |
| --- | --- |
| Text field and textarea | A label and a line. Focus draws the line solid in reading order. Errors get one sentence and a red line that flashes twice (§8). The counter is Departure 11 |
| Checkbox and switch | One bordered cell that fills in three dither steps; a switch is two cells. Both are real inputs (§8, §10) |
| Select | Shared (see Selection) |
| Contact submit and status | Primary press flow; the status line is a polite live region in plain words. Turnstile and the honeypot are unchanged |
| Private access | Same field and button. Adds a client-side error ("That code didn't match. Ask me for a new one.") (§8) |

### Tools (Labs)

**SVG → 3D ASCII studio, rebuilt around the same engine.** A working preview lives at `/svg-ascii-studio/redesign/` (noindex, not linked):
- `apps/svg-ascii-studio/src/components/StudioRedesign.astro` keeps every `data-*` hook that `studio.js` reads, so the Three.js render engine, sanitising, presets, exports and saved workspace all work unchanged.
- `apps/svg-ascii-studio/src/styles/redesign.css` is scoped to `.studio2`.
- `apps/svg-ascii-studio/src/scripts/redesign.js` only draws the step strip and the cell tracks over the real range inputs.

| Before | After |
| --- | --- |
| Three equal panels (Source, Stage, Controls) | One stage, then "Choose a look", then "Export", with a step strip (solid done, dither here, empty next) |
| Two drop areas, plus Browse, Load sample, Clear and Hide buttons | Empty: the whole stage is the drop target, with samples and "Paste SVG code instead" inside. Loaded: "Replace mark" (which also accepts a drop) and "Start over" |
| About 30 controls visible, Tune/Export tabs, six "Detailed …" panels | Six essential sliders under "Adjust". Everything else is under "More controls", grouped as Characters, Shape, Angle and camera, Colour and material, Light, Pointer |
| Jargon labels | Plain names: Cut-off (threshold), Characters (ramp), Grain (dither mode), Lens (FOV), Tilt/Turn/Lean (rotate X/Y/Z), Curve smoothness, Character size (was "Detail", which made characters coarser as it rose) |
| Exports, share loop, settings JSON and code all open in one tab | Download PNG and Copy ASCII first, with PNG size and credit. Text, SVG, settings, Three.js code and sharing under "More formats" |
| Security, geometry and performance diagnostics in the source panel | "About this file", beside the original SVG |
| ASCII / 3D source / Compare tabs at the page top | A small ASCII · 3D · Both segmented control on the stage bar, with Pause and Full screen |

Verified on the dev server at 1440 and 375px: samples load through the real engine ("3 meshes from 2 paths"), sliders drive the render (Character size changes the frame from 143 to 71 columns), the steps advance, and Start over resets. On approval this replaces `StudioWorkbench.astro` and most of `app.css`.


One control kit replaces the per-tool styles. Each control is a real input with cells drawn over it (specimen §10):

| Control | Cell form | Replaces |
| --- | --- | --- |
| Slider | 24-cell track, dithered leading cell, Departure value | Native ranges coloured per tool with `accent-color` (ink, sketch-paper, xylem pink) across about 80 sliders |
| Switch | Two cells | `.control-toggle` checkboxes |
| Segmented | Shared tabs, compact | Banner, Rhizome, Sketchbook and pc groups |
| Stepper | − / Departure number / +, digits resolving | Number inputs, seed buttons |
| Swatches | Squares with a cell marker under the selected one | `type=color` in the SVG studio (keep the native picker behind an "Other…" swatch) |
| Drop zone | Level-1 dither area; level 3 on drag-over; plain words | File input in the SVG studio |
| Export | Primary press with a dither bar: "Exporting · 40%" → "Saved" | Banner Save PNG, Sketchbook save, SVG studio exports, "Copy settings JSON" |
| Disclosure | A quiet action with a cell chevron | `<details>` in the SVG studio and `pc-disclosure` |

### Feedback

| Component | Proposed |
| --- | --- |
| Toast (new) | Switches on from a dot, holds about 1.8s, afterglows out. For "Copied" and "Saved" when the button can't show it (§11) |
| Tooltip (new) | A small ink label that snaps in on hover and focus; replaces `title` on icon buttons |
| Status lines | Polite live regions in plain words; replaces uppercase "SEARCH UNAVAILABLE" and "NO MATCHES." |
| Empty state | Breathing cells at rest, a Departure line, one helpful sentence (§11) |
| Loading text | Dither bars with a passing band (§11); replaces `.turntable-skeleton` |
| Turntable loader and fallback | Keep the logic. The fallback image enters with a mosaic resolve |

### Exempt (artwork, not UI)

The turntables, the dither image trail on About, the artwork pointer, the Blocktype wave and the other sketches stay as authored. They are the subject, not chrome. Only their surrounding controls join the kit.

## 4. How the components intertwine

- **One module, one stylesheet section.** Add `src/scripts/motion/cells.js` (dither levels, `setLevel`, `fillLayer`, the curved-stagger scheduler and cell icons) and `tick.js` (the 40ms clock). Their CSS lives in one `global.css` section. The seven dither masks become static `:root` tokens (small SVG data URIs), so cells render with no JavaScript at all and the scripts only animate them.
- **Shared, not similar.** Tabs, the nav, tool segmented controls and the selected select option all call the same selection code. All three button roles are one component with a `role` prop. All rows (notes, labs, published items, experience) use one row component. That is how about 25 button styles and 10 segmented implementations collapse to a handful.
- **Density carries meaning across routes.** A visitor who learns that a solid cell means "here" on the case index reads the nav, tabs, status chips and progress meters the same way without being taught.
- **One timing.** Every stagger uses the same curve and budget, and every loop runs on the same clock, so motion on different components feels like one machine. The motion switch stops all of it in one place (`lifecycle.js`).
- **One voice for numbers.** Departure numerals appear in the index, captions, stats, timestamps, slider values and dates, so data looks like data everywhere.

## 5. Phasing

This follows Phase 0 (baseline) and Phase 1 (direction sign-off) of the motion plan. Each phase is independently shippable.

| Phase | Scope | Notes |
| --- | --- | --- |
| **C1. Foundations** | Dither-mask tokens, the density scale, Departure size tokens (11/22/33/44/55/66), `cells.js`, `tick.js`, state-ladder CSS. Retire `ascii-control-effects.js`, inert scramble markup and the blur reveal | Shared CSS and motion work. Amend `AGENTS.md` (motion vocabulary, button roles, density scale) with owner approval |
| **C2. Actions and selection** | Three-role button, quiet and inline links, the arrow rule, one tabs/segmented component, one select. Migrate call sites | Biggest consistency win: about 25 styles to 3, about 10 segmented implementations to 1 |
| **C3. Chrome** | Nav with the cell rule, mobile menu, motion and theme toggles, footer, dialog, skip link, 404 | `page-transitions.js` untouched |
| **C4. Case pages** | Hero and status chips, facts, captions, one video player, stat, quote, chart and timeline, compare, sibling nav, prompt, then the case index and diagrams from the motion plan | Renderer changes need explicit scope; keep parser and slug contracts |
| **C5. Lists and Home** | Row component (notes, labs, published, experience), notes filter, labs signatures on `ProjectCard`, timeline rail, rotator decision | — |
| **C6. Forms and feedback** | Fields, checkbox, switch, statuses, private access error, toast, tooltip, empty and loading states | Contact is security-sensitive; Turnstile and the honeypot stay as they are |
| **C7. Tool kit** | Slider, stepper, swatches, drop zone, export, disclosure across Banner, Sketchbook, Rhizome, SVG studio, playground and the turntable pages; consolidate the four turntable pages | Largest surface; do one tool first as the template |
| **C8. Cleanup** | Collapse each component's override layers into one definition as it migrates; delete the dead CSS listed in §1 | Keeps `global.css` as the single design file, and smaller |

Every phase: `npm run verify`, `npm run build`, `npm run check:browser`, plus keyboard and screen-reader checks on the migrated components. Also test no-JS (cells render statically from CSS tokens), reduced motion, the motion switch, light and dark, and 375 and 1440px.

## 6. Contracts every component keeps

- **Real controls underneath.** Every visual is drawn over a native element (button, input, range, checkbox, dialog, listbox pattern) so keyboard, assistive tech and no-JS work.
- **Targets:** 44px minimum, 48px by default; compact 36px only inside dense tool panels with adequate spacing. This fixes `.case-switch`.
- **Never removed:** the focus outline and visible labels. A disabled control keeps its reason.
- **Rest state is complete.** No content waits on animation, and reduced motion and the motion switch show the final frame.
- **Repo rules:** square corners; tokens only; one global stylesheet; no new dependencies; the select chevron rule; stable slugs and renderer contracts.
- **Plain words only.** No uppercase labels longer than two words, and no machine language in visible copy.

## 7. Decisions for you

1. **Retire the click particle burst** (`ascii-control-effects.js`) in favour of the press fill? (Recommended.)
2. **Ship the identity rotator on Home, or delete it?** It is built but not live.
3. **Mobile menu:** replace the two-row nav grid with the Menu panel? (Recommended.)
4. **Status vocabulary:** adopt Launched (solid), Closed beta (5), Prototype (3) and Archived (1) for every case and Labs item?
5. **Footer:** move from the dark band to a paper footer with the back-to-top meter?
6. **Tool colours:** drop per-tool slider accent colours in favour of the shared ink kit, keeping colour only where it is the tool's output?
