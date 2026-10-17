# Visual-direction audit

Scope: live `traykov.cc`, the current dirty checkout, and the clean `codex/lightweight-portfolio-study` branch, assessed from the supplied desktop/mobile captures and labeled contact sheets. The reference deck is treated as visual evidence, not as product or content authority. This report does not assess motion behavior.

Source-location note: file line references in this review refer to the lightweight study worktree unless explicitly marked otherwise. Screenshot judgments are design assessments; interaction risks require behavior checks before being called defects.

## Executive read

The portfolio's problem is not that it contains ASCII or borders. It is that too many surfaces use the same emphatic ingredients at once: heavy mono headings, tiny uppercase metadata, full-width rules, framed media, and decorative ASCII fields. That makes hierarchy depend on scale and enclosure rather than on sequence and meaning.

The branch makes two useful, concrete improvements. Labs becomes a flat directory instead of a stack of bordered cards, and the case-study table of contents becomes a quiet margin index. It does not yet establish a site-wide visual direction: Home, Notes, About, Contact, case-study bodies, and the Pipelines hero remain materially unchanged. Its use of system sans only for Labs also introduces a new type dialect rather than resolving the existing one.

The attached deck offers a better translation principle than a literal style transplant: mono at moderate weight for names, commands, and section headings; sans for explanation; borders only when they express a real container or relationship; ASCII used as a diagram with labels and arrows rather than as atmosphere behind copy. The deck succeeds with mono headings around a restrained 500 weight, so the next prototype should test role and weight before replacing mono wholesale.

## Prioritized findings

### 1. Typography has too many loud roles and too few quiet ones

**Type:** visual hierarchy and mobile readability; partly functional.

The mobile Notes capture is the clearest failure: every article title is a large, heavy mono block, while dates and read times drop to tiny uppercase metadata. Scanning becomes a sequence of equally loud headlines separated by equally strong rules. Home uses the same heavy mono voice for `PRODUCT DESIGNER`, the case pages use it for display titles, and About uses it at very large scale. The deck demonstrates that the same mono family can remain distinctive at medium weight while sans copy carries the explanation.

Evidence: `/notes/` in `branch-notes-390.png`; `/` in `branch-home-390.png`; `/about/` in `branch-about-390.png`; `.notes-hero > h1` and `.notes-list__item h3` in `src/styles/global.css:13079` and `src/styles/global.css:13202`; `.project-card h3` in `src/styles/global.css:2295`; `.case-hero-copy h1` in `src/styles/global.css:12204`.

The branch improves Labs by using `--system-sans` for its display and row headings (`src/styles/global.css:7047`, `src/styles/global.css:7078`, `src/styles/global.css:7130`), but because other public indexes remain mono-heavy, Labs now reads like a separate product. Safe direction: define a small role matrix and apply it across Home, Notes, Labs, and case studies. Test mono 500 for page and section headings, sans regular for summaries and row titles where density demands it, and mono regular for metadata. Increase metadata to a reliably legible 12–14px range instead of compensating with uppercase and weight.

### 2. Whitespace is often unassigned space rather than hierarchy

**Type:** taste with a real information-density cost.

At 1440px, the homepage introduction occupies a large, nearly empty band while the first work title is visible but much of its visual evidence lies below the initial viewport. The intro copy is too small and light to justify the reserved height; there is no diagram, claim, or artifact using the space. About uses a similarly large opening, but there the photo composition gives the space a subject and balance, so it reads as intentional. This difference is important: the fix should not be a global reduction in whitespace.

Evidence: `/` in `branch-home-1440.png` and `branch-home-full.png`; `/about/` in `branch-about-1440.png` and `branch-about-full.png`; home hero overrides in `src/styles/global.css:12173` and the mobile exception beginning at `src/styles/global.css:12717`.

The branch does not change this. Safe direction: reduce the homepage intro's desktop block height until its copy and the first work entry form one composed first viewport, or give that space one useful object, such as a compact designer → code → product relationship diagram based on actual practice. Preserve About's more generous composition because its imagery earns the space.

### 3. Notes remains the densest and heaviest public route

**Type:** functional scanability and touch-navigation risk, plus taste.

The branch leaves Notes visually unchanged. On mobile, the title, utility row, every article title, date, read time, outbound arrow, and divider all compete in a 354px content column. The repeated black rules create a ledger effect, but they do not add grouping beyond what row spacing already supplies. The deck's source table works because the cells are true comparative data; Notes is a list of writing and needs a reading hierarchy, not a matrix.

Evidence: `/notes/` in `branch-notes-390.png` and the Notes quadrant of `branch-desktop-2.jpg`; `.notes-directory__utility` at `src/styles/global.css:13108`, `.notes-list__item > a` at `src/styles/global.css:13188`, and `.notes-list__item h3` at `src/styles/global.css:13202`.

Safe direction: keep one divider per row but make it quieter; move the date and read time into one secondary line; use a medium-weight title with a little more leading; remove the decorative arrow unless it communicates an external destination. Retain the full-row link and visible focus state. This is a higher-value next step than further case-study decoration.

### 4. The branch correctly fixes Labs' nested-card density, but its tiny ASCII thumbnails are now mostly decorative

**Type:** branch success with a remaining clarity issue.

The live/current Labs page encloses each experiment in a card with a dark framed preview and a button-like label. The branch replaces that with one full-row link, one divider, a clear underlined action, and a simple text hierarchy. This is the strongest branch change and is close to the deck's economy.

Evidence: `/labs/` in `local-desktop-1.jpg` versus `branch-desktop-1.jpg`, and `local-labs-390.png` versus `branch-labs-390.png`; new markup in `src/pages/labs/index.astro:162-186`; row CSS in `src/styles/global.css:7065-7165`.

The remaining problem is that the ASCII previews are rendered at `0.3125rem–0.5rem` on mobile (`src/styles/global.css:12129-12131`). Several read as dust or broken text rather than as recognizable previews. Because they are `aria-hidden`, this is not an accessibility-name defect, but it weakens the visual promise of each tool. Safe direction: keep the flat rows and replace each miniature ASCII block with either a larger, cropped signature glyph or a simple explanatory micro-diagram. If a thumbnail cannot remain legible at the row size, remove it and let the title/action carry the link.

### 5. Decorative ASCII is strongest where it explains; the Pipelines hero uses it where it obstructs

**Type:** functional legibility risk.

The Pipelines title and summary sit directly over a high-density ASCII field. At desktop the face-like field competes with the title; on mobile the glyphs run through the title and summary, reducing figure/ground separation. The deck uses ASCII boxes, connectors, and state diagrams to explain a process. That is a better job for the visual language than a full-bleed watermark behind reading copy.

Evidence: `/case-studies/pipelines/` in the Pipelines quadrants of `live-desktop-2.jpg`, `branch-desktop-2.jpg`, and `local-mobile-2.jpg`; route content at `case-studies/quickbase/pipelines.mdx:1-14`; generic turntable field and scrim at `src/styles/global.css:2740-2813`, with the branch's case-hero sizing at `src/styles/global.css:12188-12218`.

The branch does not address it. Safe direction: move the ASCII image out from under copy into a bounded evidence region, or sharply lower/crop it so the title has a clean paper field. Use the case's real mechanics for diagrams: authorization anatomy, proposal → inspect → commit, and visual/code-mode ownership. Do not invent new claims or replace product evidence with abstract decoration.

### 6. Case-study navigation is lighter on the branch, but its active state and mobile disclosure are too quiet

**Type:** interaction affordance and orientation risk.

Removing the TOC card, shadow, row boxes, and per-item borders is the right move. Bounding long indexes and keeping ordinary anchors is also sound. On desktop, however, the only active cue becomes a small weight change from 400 to 500. On mobile, `ON THIS CASE / BLUF / 01 / 15 / +` is compressed into a tiny utility strip; the plus is easy to miss as the only disclosure cue.

Evidence: `/case-studies/designing-pave/` in `branch-pave-1440.png` and `branch-pave-390.png`; `.case-toc` and link states in `src/styles/global.css:12247-12339`; compact behavior beginning around `src/styles/global.css:12524`; the branch's list-frame markup/behavior in `src/components/CaseStudyPage.astro`.

Safe direction: keep the unboxed rail, but add one restrained non-color active marker, such as a short rule or dot, and make the mobile disclosure a plainly labeled button with a chevron. Keep the 44px target and focus outline. Do not restore full row borders.

### 7. Case studies still read as long evidence stacks rather than edited arguments

**Type:** information architecture and reading burden; mostly taste until it blocks comprehension.

The Pave full-page capture is a very long alternation of heading, paragraphs, dark video rectangle, and caption. Product media is valuable, but the repeated rhythm makes each artifact feel equivalent and makes the core argument hard to reconstruct. The deck is useful here because it alternates three structures according to the claim: a process diagram, a comparison table, or a short explanation. The website can translate that principle without becoming slides.

Evidence: `/case-studies/designing-pave/` in `branch-pave-full.png`; the first overview detail in `branch-pave-video-detail.png`; Pave's border-stripping overrides at `src/styles/global.css:9892-9928`; shared caption hierarchy around `src/styles/global.css:10045`; Pave's horizontal comparison at `src/styles/global.css:10081`.

This is not a blanket double-border problem. The Pave and Synapse overrides already remove the generic media/card borders, and the branch should preserve them. The problem is editorial repetition and equal visual weight. Safe direction: choose one dominant overview recording, convert one comparison-heavy section into an annotated before/after or flow diagram, and demote supporting clips into quieter inline evidence. Use only facts and states already present in the case source.

### 8. Interaction affordances are inconsistent across otherwise similar destinations

**Type:** functional discoverability.

The branch Labs rows use full-row links plus an underlined action, which makes destination behavior clear. Home mixes filled tabs (`Blocks`), plain text controls (`Pixel dither`, `How it's built`), and unadorned text actions (`Open a cell`, `New layout`) in the same region. Case TOC links are plain text, Notes has arrow glyphs, Contact uses black rectangular buttons, and primary navigation now relies on bold current-page text after removing the underline.

Evidence: `/` in `branch-home-390.png`; `/labs/` in `branch-labs-390.png`; `/contact/` in `branch-desktop-2.jpg`; nav rule change near `src/styles/global.css:960`; homepage timeline actions in `src/components/HomepageTimeline.astro:55-99` and `src/styles/global.css:13417-13445`.

Safe direction: define three affordance roles: selected tab, inline destination link, and primary action. Use the same underline/arrow logic for inline destinations, the same filled treatment only for true primary actions, and a stable selected-state cue for tabs and navigation. The visual system will feel lighter when controls communicate through consistent semantics instead of extra frames.

### 9. The paper-and-ink palette is already the right base; the issue is contrast distribution, not lack of color

**Type:** taste with legibility implications.

The restrained warm paper, black ink, and occasional green product evidence are more compatible with the reference deck than a new palette would be. Synapse's dark hero can remain a scoped project identity. The heavy feeling comes from large black areas, high-density glyphs, and repeated black rules landing near one another, especially on mobile. Adding more accent colors would make the system noisier.

Evidence: `/case-studies/synapse-sys/` and `/case-studies/designing-pave/` in `branch-desktop-1.jpg`; `/notes/` and `/case-studies/pipelines/` in the mobile sheets; theme tokens and scoped Synapse rules in `src/styles/global.css:271-272`, `src/styles/global.css:1348-1397`, and the media border exceptions at `src/styles/global.css:9892-9969`.

Safe direction: preserve the palette. Reserve green/red for semantic state or project evidence, reduce decorative black surface area, and use tonal contrast plus spacing for hierarchy. Keep Synapse's identity scoped rather than spreading dark panels across unrelated routes.

## Deck-to-web translation rules

1. **Translate roles, not slide geometry.** Keep the site's natural scroll and responsive measures. Borrow the deck's relationship between mono headings, sans explanation, and quiet metadata.
2. **Use mono at moderate weight.** Test 500 for display and section headings before changing families. Reserve 700/800 for short labels or moments that need genuine emphasis.
3. **A border must explain a boundary.** Tables, controls, and real media frames may use one border. Lists should usually use spacing and a single divider. Do not wrap a bordered list in another bordered panel.
4. **ASCII must carry information or identity.** Small signatures, product-specific motifs, labeled flows, and state diagrams earn their place. Full-bleed glyph fields behind prose should be rare and must preserve clear reading contrast.
5. **Whitespace needs an owner.** Large space should frame a subject, separate arguments, or prepare an artifact. If it does none of those, reduce it.
6. **Let evidence set the accent.** Product screenshots and charts already bring color. Keep the surrounding shell neutral so evidence wins.
7. **Use diagrams for mechanics, media for behavior.** A labeled flow explains ownership or sequence faster than a recording; a recording proves timing and interaction. Choose according to the claim.

## Smallest useful next prototype

Prototype one coherent vertical slice, not another full-site skin:

1. **Homepage first viewport and first work entry** at 1440px and 390px. Tighten the intro band, apply the proposed type roles, and standardize the first entry's tab/link affordances. Preserve the breathing-grid artifact and current content.
2. **Pave introduction through the first substantive evidence section** at the same two widths. Keep the branch's unboxed TOC, improve its active/disclosure cue, apply the same type roles, and replace only one repetitive evidence sequence with a fact-preserving diagram or annotated comparison.
3. **One Notes list viewport** at 390px as a density check. This does not need a full implementation in the first prototype; it tests whether the role system scales to the site's most compressed editorial surface.

Use the branch Labs directory as the reference for row density and clear links, the `technical-atelier` study as a reference for restrained mono character, and `quiet-editorial` only as evidence for spacing and TOC calm. None of the studies is user-approved as a wholesale direction.

Success criteria: the first viewport reaches work sooner; headings remain recognizably Traykov without shouting; each link/control role is visually distinct; no nested frame is introduced; media remains the loudest evidence; and the same hierarchy survives at 390px without tiny metadata or a compressed mystery toggle.
