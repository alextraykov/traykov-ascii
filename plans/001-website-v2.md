# Website v2 — an editorial portfolio with expressive work

Status: proposed design and implementation brief, 13 September 2026. Planning only; no application changes in this assessment.

## Execution correction from the owner

During implementation, the owner refined the direction: preserve the earlier generous left/right spacing; remove the large “Notes.” heading and generic lede; keep “All notes” as the modest visible heading. Remove the “TITLE, IDEA, PHRASE” strip and idle count from the default view, with search remaining secondary. This supersedes the earlier Notes wording below.

About must correct its awkward wrapping/proportions while retaining the full-width interactive artwork and photo-free fallback. Authorized biographical updates: purple belt, enjoys coffee, builds things on the side, interests in nature/history/culture, and enjoys talking to people for human connection and learning about others. These facts supersede the old blue-belt/excess-coffee copy.

## Assessment

The homepage has the strongest organizing idea: show the work, give enough context to understand it, and let the visitor choose depth. The rest of the website should extend that idea into reading, personal context, and experiments.

The present inconsistency is structural. Notes has multiple layers of introduction and utility before the writing. Case studies give secondary navigation the visual weight of a control panel. Several generations of layout rules create competing alignment edges and spacing owners. Page transitions try to connect objects whose typography and positions are substantially different. Additional animation would amplify these problems.

V2 should make three things immediately evident: what Alexander worked on, what he personally contributed, and where someone can inspect the evidence. Its personality comes from the actual work, the writing, and the ASCII artwork. Precision in hierarchy, spacing, media presentation, and behavior supplies the sense of quality.

This brief expands the [earlier browser-based repair assessment](../docs/design-coherency-plan.md). It uses those observations and current repository structure; it is not a claim of a new exhaustive runtime audit or user research. Numeric visual targets below are starting specifications to validate on representative pages.

## Skills and their concrete contribution

| Skill | Contribution to this initiative |
| --- | --- |
| portfolio-change | Repository constraints, route and renderer preservation, sequential implementation ownership, functional and browser verification. |
| motion-guidelines | An explicit purpose and lifecycle for each motion treatment; reduced-motion parity; input remains immediate. |
| find-animation-opportunities | A small motion budget and an explicit list of surfaces that remain static. |
| improve-animations | A focused, executable continuity repair plan with exact timings and bounded scope. This is a focused assessment, not a complete course audit. |
| review-animations | Final implementation review criteria: interruption, entrance ownership, stationary targets, settling, and frequency. |

A fresh read-only portfolio reviewer challenged this brief for missing visitor journeys, route strategy, template ownership, preservation, and rollout risks. Those recommendations are incorporated below. The editorial architecture and art direction are design judgments informed by the repository and your feedback; animation skills do not substitute for them.

## 1. Visitor journeys and information architecture

Treat these as hypotheses to test with realistic browsing tasks:

- **Someone assessing your work:** Home → relevant project → evidence and contribution → About/CV → Contact. In a 30-second skim they should identify the kind of work and a relevant project. A two-minute inspection should expose your contribution and an honest outcome or limitation.
- **Someone arriving for the writing:** Notes or a direct article → readable essay → optional related writing/work or About. Reading should not require understanding the portfolio navigation first.
- **Someone exploring the experiments:** Labs or a direct tool link → immediate orientation → interaction → return to Labs or relevant project context. Tool controls may be denser than editorial pages because they serve a different task.

Keep the current primary navigation initially. Do not add a new top-level destination merely to distribute pages more evenly. Make each direct-entry page identify what it is and offer a clear route back. Avoid a repeated generic sales CTA after every section.

Before migration, classify every public route as a primary destination, supporting artifact, or internal preview. Record current URL, redirects, navigation state, indexing, sitemap membership, and parent link. Preserve current URLs and discoverability by default. Proposed removals from indexing or URL moves require a separate explicit decision; v2 styling is not authorization to hide content.

## 2. Content and evidence contract

Use existing material to expose context, problem, contribution, evidence, outcome, and limitations. This is an evaluation checklist, not a requirement to repeat six labeled boxes on every page.

- Homepage: retain large recordings and succinct Background / Problem / Impact. Ensure contribution is understandable from the existing copy. Keep the full-study link clearly subordinate to the work itself.
- Case study: let a visitor understand the project and Alexander's role before the deep narrative. Surface shipped behavior versus prototype status near the relevant artifact, rather than burying that distinction in a closing disclaimer.
- About/CV: provide personal context and working experience that complement project evidence. Preserve the restored About composition and existing authored voice.
- Notes: the title and writing lead. Remove generic framing that adds no information. Preserve article text, dates, feeds, and search behavior.
- Labs: distinguish an experiment someone can use from a recording or supporting artifact. Supply a short orientation when entering directly.

Inventory evidence before editing presentation: asset, project, existing caption, shipped/prototype/local-demo status, contribution, known limitation, and source of any metric. Record unknowns rather than filling them with plausible copy. Synapse-Sys is the current version of the existing project. Do not replace it with a differently named project or older evidence.

Do not impose a uniform narrative voice on the essays and case studies. No fabricated research, metrics, reactions, or tidy lessons. An optional reading path must not remove evidence or heading deep links.

## 3. Shared visual foundations

Freeze the current homepage as the reference in both themes and at desktop/mobile sizes. Any homepage adjustment during v2 must solve a demonstrated system issue and be compared against that baseline.

**Widths and alignment.** Retain the 1220px outer shell and 900px standard work/introduction measure. Use approximately 66ch for continuous reading. Case evidence can widen within the outer shell; the TOC belongs inside that shell, not outside an already full-width article. Each block must declare whether it follows the reading edge or evidence edge. Do not let intrinsic media width determine a grid track.

**Typography by role.** Keep Geist Sans and Geist Mono. Start visual trials with 40–56px page titles, 28–32px project titles, 24–32px section headings, 20–24px Notes entry titles, 17–19px reading text at approximately 1.6 line height, and 12–14px metadata. Long TOC labels start at 13–14px with approximately 1.45 line height. These are responsive role targets, not hardcoded route overrides. Use the weights actually loaded by the site; confirm font availability rather than relying on synthetic weight. Uppercase is reserved for short labels.

**Spacing ownership.** Reuse the existing 6/10/14/18/28/42px scale and intentional token-derived multiples. The figure owns media-to-caption space; the article owns figure-to-section space. Define page-intro, section, paragraph, figure, caption, and utility-row roles. Avoid additive margins from both parent and child. Generous space should clarify relationships rather than leave a small title stranded in a large empty block.

**Surfaces.** Paper remains the default. Quiet rules indicate meaningful boundaries. Avoid enclosing an entire list in a border and boxing every row again. Reserve filled or bounded surfaces for media, inputs, and genuine groups of controls. Corners remain square.

**Controls.** Unify label size, focus visibility, hit areas, disabled states, and action hierarchy. Preserve immediately legible navigation, search, reading controls, and form feedback. Hover must not be necessary to discover an action. “Read more” links need project context in their accessible names.

All styling remains in src/styles/global.css. Introduce shared semantic roles within the existing system, migrate their consumers, then remove proven obsolete selectors. Do not solve each page by appending another override block.

## 4. Page families and migration map

| Family and routes | Preserve | V2 treatment |
| --- | --- | --- |
| Showcase: / and case index entry | Visual-first projects, playback behavior, current index redirect contract | Reference composition; verify project summary width, caption attachment, and clear full-study links. |
| Case detail: /case-studies/[slug]/ | All evidence, identity, heading IDs, custom renderer output | Shared introduction, reading rhythm, evidence figures, quiet margin TOC, purposeful next action. Validate Pave and Synapse before other studies. |
| Editorial index: /notes/ | All entries, search, RSS, URLs | One heading; title-first entries; date secondary; quiet search/RSS row. Remove redundant “All notes,” generic lede, and idle result count. |
| Editorial detail: /notes/[slug]/ | Writing, artwork, dates, full-bleed behavior | One metadata line and title; comfortable reading measure; shared figures and captions; optional useful continuation. |
| Profile: /about/, /cv/ | Full-width About artwork, photo-free fallback, experience content | Consistent lower-page type and spacing. CV may remain denser and print-oriented. Never convert About back into the rejected compact card. |
| Conversation: /contact/ | Recent compact layout, form/security/email/booking behavior | Align field and action hierarchy with the system; a clear main contact path; genuine immediate state feedback. |
| Experiment directory: /labs/ | Existing experiments and preview eligibility | Consistent introductions and preview captions, clear distinction between runnable tools and documentation. |
| Interactive tools: Labs subroutes, Playground, image trail, shader explainer, turntables, SVG studio | Direct manipulation, renderer APIs, upload/export, keyboard controls, fallbacks | Shared entry context and return link; consistent surrounding controls. Keep full-screen workspace variants when the task needs them. |
| Supporting routes: component preview, roadmap, feeds, search endpoint, sitemap, legacy aliases | Existing contracts until classified | Include in preservation manifest; avoid accidentally applying editorial spacing to utility output or tool interfaces. |

Reusable building blocks: page introduction, utility row, directory entry, reading body, evidence figure/caption, section index, contextual next action, and tool header. Components should reflect repeated responsibilities; do not build one enormous page component with dozens of conditionals.

## 5. Case navigation and TOC

At the inspected 1280px viewport, the current TOC begins just 1px below the navigation and uses small, heavy uppercase text in boxed rows. It competes with the case instead of helping someone skim it.

- Position the desktop index 28px below the actual navigation bottom. Use one navigation-height source for sticky placement, anchor scroll margins, and section tracking.
- Start with a 224px rail and 42px gutter, tokenized, inside the 1220px shell. Validate the actual reading and media widths before accepting these values.
- Remove outer and per-row boxes. Use sentence-case links and one restrained active marker. The full destination must remain understandable.
- At widths below 1180px, use a compact native in-flow disclosure. Preserve anchor navigation without JavaScript and avoid a permanent reading toolbar.
- Long indexes must scroll natively within the available viewport without clipping their last entries. Test first/last sections, late media loading, hashes, keyboard focus, and history restoration.
- If concise display labels are needed, keep them separate from authored headings and IDs. Do not alter the custom renderer to make a navigation label fit.

## 6. Motion budget

The prior “Print Becoming Live” direction remains appropriate for expressive artwork. V2 revises its application to page continuity and editorial reading: fewer simultaneous treatments and no ceremonial delay before content.

| Opportunity | Trigger and exact behavior | Purpose and limit |
| --- | --- | --- |
| Page arrival | Eligible same-site arrival: incoming content opacity 0→1 over 180ms, no delay, existing ease-out-expo | Quiet continuity. No outgoing ghost, title morph, or second hero entrance. See the separate executable plan. |
| Large evidence reveal | First eligible viewport entry: opacity 0→1 and Y 10px→0 over 340ms; caption may follow by 60ms | Introduce a substantial visual once. Do not stagger reading paragraphs or replay on history restoration. |
| Artwork accent | One transformed decorative scan on entrance over 520ms; eligible pointer wrappers retain maximum 6px response and 180ms return | Concentrate personality in existing art. No simulated touch hover, no obscured product imagery, no renderer rewrite. |
| Control feedback | Press 120ms; hover/release 180ms on inner visuals, with existing easing tokens | Confirm action without moving the hit area. State changes and keyboard feedback remain immediate. |
| Contact status | Actual success/error state updates immediately; optional opacity settling over 180ms | Reinforce the result, never defer it or create a false sending state. |

Use --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1) and existing duration tokens. Keep the existing canonical scramble ramp “ .:+*#%@” only on short identity/project labels with stable accessible text; add no new scramble surfaces by default.

**Static by design:** body text, repeated section headings, TOC selection, reading progress, search results, filters, validation, focus, and ordinary navigation labels. Do not routinely scan every section boundary. Existing tool gestures follow their own direct-manipulation model.

Central eligibility remains responsible for system preference, visitor pause, document visibility, viewport visibility, and navigation. Reduced motion or visitor pause yields immediate readable content and static decoration. Videos retain explicit play controls. No-JS retains content and native controls. History restoration does not replay entrances. Cancel rather than queue decorative work during rapid input.

## 7. Execution and review sequence

1. **Baseline and preservation manifest.** Snapshot the dirty worktree without stashing/resetting it. Capture reference states and record route/content/interaction contracts. Map final computed styles and their cascade owners. Identify which old tests intentionally encode presentation that v2 changes.
2. **Isolated continuity repair.** Execute plan 002 and inspect recorded Pave/Synapse transitions. Resolve ghosting and interruption before evaluating the new visual layouts.
3. **Representative design slice.** Keep Home visible as the reference. Develop Notes index, “The internet feels dead,” and Pave including a long TOC and media captions. Produce desktop/mobile, light/dark comparisons. Evaluate hierarchy, reading comfort, and identity before broad migration.
4. **Shared roles and case rollout.** Extract the proven roles from that slice; apply them to Synapse and remaining case content. Exercise different custom fences and long headings. Remove obsolete rules only after confirming remaining consumers.
5. **Profile, Contact, and Labs.** Apply the proven shared roles to their surrounding interface. Preserve About composition and each studio's interaction model. Check all direct-entry routes, not only links reachable from Home.
6. **Independent acceptance.** Primary owner inspects actual diffs and runs verification. Close the single implementer before a fresh read-only portfolio review. Separate functional findings from visual judgment. Produce route contact sheets and representative interaction recordings.

Use one sequential Terra Max implementer for shared CSS, routing, motion, and cross-cutting browser changes. Give each phase a five-part contract: objective, owned files, preservation boundaries, acceptance evidence, and stop/report conditions. No parallel writers. No production deployment or automatic merge is included.

## 8. Acceptance and risk controls

- **Hierarchy:** in screenshots, evidence or writing leads; metadata and TOC are secondary. Titles, captions, controls, and spacing use recognizable shared roles.
- **Geometry:** no horizontal page overflow, clipped long titles, stretched grid tracks, crowded sticky index, or accidental doubled margins. Check just above/below 1180/900/820/700/640 and representative desktop/mobile sizes.
- **Content:** preserve canonical and legacy URLs, heading hashes, case evidence, Notes feeds/search, truthful claims, and current project versions.
- **Interaction:** no Pave double-title/source ghost, About photo flash, duplicate entrance, moving hit areas, hidden restored content, or broken media/tool controls.
- **Accessibility:** keyboard, reduced motion, visitor pause, no-JS, contrast and focus in both themes, native scrolling and hashes, readable artwork fallbacks.
- **Performance:** profile the busiest eligible artwork/video combination on the test device; record device, viewport, and trace. Target smooth 60fps without new layout shifts or continuous work for inactive surfaces. Do not infer success from subjective smoothness alone.
- **Checks:** npm run verify, npm run build, npm run check:browser through npm run check. Add targeted geometry/lifecycle regression coverage. Green checks do not constitute visual approval.

The main risk is global CSS changing pages that were already accepted. Mitigate through scoped role migration, per-family comparisons, and a preserved baseline. Another risk is flattening the site's character; preserve the expressive About/Labs exceptions and actual work. A third is turning a presentation initiative into a content rewrite; inventory gaps and limit edits to supported clarification.

Record a rollback boundary for each implementation phase. Revert only that phase's reviewed edits if needed; never reset the shared dirty worktree. The completion artifact should identify approved visual states, unresolved content gaps, verification evidence, and any remaining exceptions. V2 is complete when the page families belong together and the preserved behaviors work—not when every route has received a new effect.
