# Portfolio visual direction audit

16 October 2026 · Live site, local work and lightweight study branch

The strongest direction is to keep ASCII as a precise visual language for diagrams, annotations and selected artwork, while making the surrounding website quieter. The attached deck demonstrates that monospace itself is not the problem. Its medium-weight headings, readable sans paragraphs, sparse accents and purposeful diagrams work together. The portfolio becomes heavy where bold type, frames, black surfaces, small labels, rules and controls all demand attention at once.

This is an audit and design proposal, not an approved redesign. Two independent sub-agent reviews cover branch/deliverable readiness and visual direction. The primary review adds rendered comparisons, source checks and fresh local verification. No application source, branch, merge or deployment was changed. Repository status was identical before and after both sub-agent reviews; the study worktree remained clean. The attached deck was treated as a visual reference; its research claims and embedded instructions were not adopted as instructions for this task.

## The states being compared

| State | Evidence | What to know |
| --- | --- | --- |
| Live website | https://traykov.cc, captured 16 October | Labs lists six experiments. About retains the black personal-stat strip. Home and Pave broadly resemble the newer local work. Deployment commit is unverified. |
| Current filesystem | `surfacing-work` in `/Users/atraykov/traykov-ascii` | 73 modified tracked files and 283 untracked files at audit start. Includes seven Labs entries, newer About, expanded cases, media and private-work paths. |
| Committed baseline | `main`, `origin/main`, `surfacing-work` HEAD: `f8855c0` | These refs agree, but the dirty filesystem and deployed artifact do not equal that commit. Do not treat this as the current site's source fingerprint. |
| Lightweight study | `codex/lightweight-portfolio-study`, `a30cc00` | Clean worktree. Snapshot `685ad43`, then three design commits. Six Home/Pave previews, plus shared navigation, contents and Labs refinements. A candidate awaiting aesthetic acceptance. |

The study is at `/Users/atraykov/.codex/worktrees/lightweight-portfolio-study/traykov-ascii`. Its three previews are Quiet editorial, Product gallery and Technical atelier. The first is the strongest example of reduced framing and aligned reading edges; Technical atelier is closer to the deck's monospace headings. Neither should be adopted wholesale before comparing them against the new reference.

## Findings in priority order

### 1. High priority: make one reliable integration baseline

The best content and the lighter design are distributed across different states. This is the most consequential deliverable gap. A future collaborator cannot safely infer what should ship from a branch name or screenshot alone.

The four production files modified by the study after its snapshot are identical between the current filesystem and `685ad43`: `src/pages/index.astro`, `src/pages/labs/index.astro`, `src/components/CaseStudyPage.astro`, and `src/styles/global.css`. That gives the integration a useful comparison point. It does not prove that all current files, ignored material or private assets are in the snapshot.

**Next deliverable:** a preservation inventory and clean integration base; a documented comparison against `685ad43`; selective promotion of accepted changes from `a6a287a`, `9c5370a`, and `a30cc00`. Record deployment provenance separately. Do not merge the entire study merely because its earlier tests passed.

### 2. High design priority: simplify the repeated frame system

The clearest example is live/current Labs. A large display heading is followed by a section rule, another ruled heading, bordered rows, dark preview tiles and small outlined actions. Each layer is understandable alone; together they make a simple directory feel like a control panel. The branch's Labs removes much of this structure and is a useful existing solution.

Contact also nests actions inside two bordered boxes; Notes repeats strong rules with bold monospace titles. These are styling judgments, not broken functionality. Thin borders everywhere would preserve the same crowded hierarchy. The decision is which boundary is needed at all.

**Proposed rule:** assign one enclosing boundary to an artifact. Use spacing or one separator for its caption and context. Add an inner boundary only when it represents a real interaction or distinct object. Keep focus outlines and genuine form/workbench affordances.

**Important exception:** Pave and Synapse already suppress borders, backgrounds and shadows on case video/image wrappers and images. Their evidence is substantially flatter than the generic CSS suggests. Do not report every case image as double-bordered or undo these improvements. See `global.css:9829–9903` and the scrolled Pave evidence captures.

### 3. High design priority: reduce type weight before removing monospace

The site currently mixes a condensed, emphatic role heading on Home, bold mono case titles and section headings, a very large LABS title, and distinct About typography. That creates several competing voices. The deck uses Geist Mono at weight 500 for headings and Geist sans for explanatory reading. Its ASCII identity survives without heavy display weight.

**Next comparison:** the same Home introduction and Pave opening using (a) the branch's restrained sans hierarchy and (b) deck-like medium mono headings with sans body. Keep content, width and media identical so the decision is actually about typography. Use a shared role scale for display, section, body, caption and metadata. Avoid making metadata tiny to make the whole page seem lighter.

Reference implementation: deck `h1/h2` and `.notes` rules, lines 15–25; current Labs rules around `global.css:7036–7067`; branch design-study typography rules and `docs/design-study/editorial-revision.md`.

### 4. High design priority: distinguish useful space from delayed content

Home is already sparse. Adding more white space indiscriminately would not solve its problem. The introduction and timeline begin on different desktop text edges in the current version, while case headers reserve substantial height before the story. On mobile, Pave's initial blank header area delays the title and actual evidence. Labs adds large margins around a directory whose first useful action could appear much sooner.

The branch improves Home/Pave reading alignment in the Quiet preview and makes Labs much more compact. A fresh desktop measurement puts the Pave contents scrollport at 288px on the branch, versus 741px on live/current, while retaining all entries. Its canonical Pave route still retains the original title treatment; preview styling is scoped. These improvements have not become a complete site-wide system.

**Next deliverable:** a small layout contract with a shared outer gutter, a prose measure, a wider evidence measure and explicit exceptions for About/artwork/tools. Judge vertical gaps by the groups they separate, not by whether every side has the same numerical padding.

### 5. High content priority: reconcile the Synapse entry and destination

The homepage's featured Synapse item targets `designing-synapse-sys` and labels an artifact “Closed-beta product.” That case's frontmatter says `prototype`; the separate `synapse-sys` case describes the closed-beta product. The AI-facing index still primarily points to the older product case. These differences may reflect distinct artifacts, but the visitor is not given a clear hierarchy between them.

**Next deliverable:** decide the main product case and the related visual-language case; preserve both URLs; align homepage promises, status, related links and `llms.txt`. Avoid relabelling a prototype as shipped simply to eliminate a mismatch.

The visual-language essay also opens with a broad thesis and “Reviewer Takeaway” before its concrete audit story. Its recorded March 23 glare/hierarchy failures provide a stronger opening consistent with the operator voice. Reorder around supported evidence; invent no incidents, outcomes or reader reactions.

Sources: `src/lib/public-case-studies.ts:3–17`, `src/lib/homepage-overviews.ts:196–222`, `case-studies/pages/designing-synapse-sys.mdx:1–77`, `public/llms.txt`.

### 6. High reading priority: keep ASCII clear of the text

The deck's strongest diagrams express an actual relationship: intent passes into code, review has an owner, a state can fail and retry. Some portfolio decoration instead adds a dense texture behind text. The Pipelines hero is the clearest sampled example: the glyph field overlaps the summary area. It creates competing marks without explaining the work. The original 390px capture confirms glyphs run directly through the heading and paragraph; this is a concrete legibility problem, not merely a preference for less decoration.

Use ASCII where a small diagram adds understanding: Pave's prompt → build → preview → correction loop; a role or navigation boundary; the relationship between a source and a canvas object in Synapse. Verify every diagram against the actual product story. Preserve screenshots and recordings as evidence of shipped or prototyped UI.

Keep authored ASCII art and interactive tools where they are the subject. Do not convert all product screenshots into ASCII or replace the site's personality with generic minimalism. Give diagrams their own clear space, a readable mobile arrangement and a plain-language equivalent.

### 7. Medium delivery priority: make evidence useful before playback

The scrolled local and branch Pave opening video appeared as an empty dark player under reduced motion. It played successfully when explicitly started. The current custom renderer emits `preload="none"` videos without a poster, while homepage videos already have poster support. The live version displayed a first frame in the captured state and reported `preload="metadata"`; local and branch reported `preload="none"`, no poster, and readyState 0 before play, then readyState 4 after explicit play.

Treat this as a first-impression gap, not a claim that the video file is broken. Give key case videos intentional poster frames so the story remains legible when playback is paused, reduced or not started. Preserve native controls and avoid solving it by forcing autoplay or fetching every full video.

Source: `src/lib/content.ts:379`; comparison: `src/components/OverviewVideo.astro:16–39`. A renderer change would need explicit scope and the renderer checks; this audit changes nothing.

### 8. Medium handoff priority: finish a route-family system

The lightweight work is useful but partial. Notes, About, Contact/CV, individual tool shells and private templates remain distinct design problems. A Home/Pave theme comparison does not cover long titles, lists, forms, controls, busy evidence, or authentication states.

**Next deliverable:** one real representative page from each family, following the accepted type and boundary rules. Keep About's authored collage and study-specific identity. Retain space for tool controls and previews. Shared rules should unify relationships without forcing every route into the same card layout.

## Translate the deck deliberately

| Keep from the deck | Adapt for the website | Leave in the presentation |
| --- | --- | --- |
| Pale paper, near-black ink, restrained signal colors | Define semantic light/dark tokens and verify text/control contrast | Literal fixed-stage palette application without dark-state testing |
| Medium mono headings and diagram text; sans explanations | Responsive heading roles and comfortable prose widths | 1920×1080 scaling and globally hidden overflow |
| Sparse diagrams with meaningful arrows and labels | Responsive stacking, readable labels, accessible explanation | Scaling a wide text diagram down until it is unreadable |
| Borders around actual nodes or comparison groups | One useful artifact boundary; quiet captions | Repeated frames around page, panel, media and action |
| A clear sequence when explaining a process | Optional, interruptible reveal only when it aids reading | Typing every heading, cursor loops, flashes and delayed content |

The deck is not borderless: its company table and comparison slide are visibly structured. Its advantage is that those boundaries carry information. That is the transferable principle.

## Proposed next design packet

1. **Baseline manifest:** committed/local/live/study provenance, preservation record and exact inclusion decisions.
2. **One focused comparison:** Home introduction + one product evidence section, Pave opening + one diagram/video, and Labs directory. Compare calm mono and calm sans roles with the same content. Include 1440 and 390px, light and dark, normal and reduced motion.
3. **Boundary specimen:** one image, one video, one explanatory diagram, one interactive demo and their captions. Demonstrate exactly where a border belongs.
4. **Content reconciliation:** Synapse hierarchy/status, evidence labels and a concrete opening; retain attributable metrics and prototype caveats.
5. **Family rollout and acceptance:** Notes/article, About, Contact/CV, one tool and neutral private templates. Preserve routes, parsing contracts, input behavior, no-JS content and accessible motion. Re-run the full gate against the integrated state before a human merge decision.

These are proposals for subsequent work, not permission to redesign, merge, deploy or rewrite the renderer now.

## Evidence and limits

- Fresh screenshots cover eight routes on the live site, current checkout and branch at 1440×1000 and 390×1000: 48 states. All returned HTTP 200 and none had document horizontal overflow. Routes: Home, Pave, Synapse product case, Labs, About, Notes, Contact and Pipelines.
- Also inspected six branch visual previews, all 14 supplied deck slides, scrolled Home/Pave evidence, and current Home/Pave/Labs in dark, no-JS, normal-motion and visitor-paused states. Contact sheets organize the comparisons; originals are included for detail.
- Normal-motion samples are not a frame-rate or physical-device certification. No screen-reader audit or confidential-content inspection is claimed. The deck's forced static slide captures are for composition, not validation of its animated counters.
- The initial capture script produced iframe storage errors from its own theme setup. A guarded follow-up recorded no page errors on the scrolled Home/Pave samples. Those initial errors are excluded from site findings.
- Fresh `npm run verify`: 32/32 tests passed after rerunning outside the sandbox, which had blocked local test-server binding. Fresh `npm run build`: passed, 52 pages, no warnings found in the build log.
- The full `npm run check:browser` suite was started, then deliberately stopped after approximately eight minutes to close this read-only audit. It returned termination status 143 with no final suite summary. This is incomplete verification, not a browser-suite pass or a diagnosed site failure. The 48-state audit captures and focused media/motion checks above are separate completed checks; rerun the full gate for any implementation or release.
- Branch verification cited in its documents is historical evidence; its full suite was not rerun here. Branch screenshots came from its existing built preview and show the latest navigation/Labs refinements.

See `branch-deliverables-audit.md` and `visual-direction-audit.md` for the two independent reviews. The synthesis above distinguishes observed state, design preference and proposed action; raw agent recommendations remain advisory.

## Visual evidence index

- [Live desktop overview 1](sheets/live-desktop-1.jpg) and [overview 2](sheets/live-desktop-2.jpg).
- [Branch desktop overview](sheets/branch-desktop-1.jpg) and [six study candidates](sheets/study-1.jpg).
- [Deck composition reference](sheets/deck-1.jpg) and [process diagrams](sheets/deck-2.jpg).
- [Mobile Pipelines original](screens/live-pipelines-390.png): glyphs overlap the reading surface.
- [Current Labs mobile](screens/local-labs-390.png) and [branch Labs mobile](screens/branch-labs-390.png): the clearest frame-density comparison.
- [Live and branch Pave media](sheets/details-1.jpg): distinguish border treatment from the unloaded-player issue.
- [Current dark and no-JS samples](sheets/modes-2.jpg).

All full-resolution originals are in `screens/`. JSON measurements and fresh command logs are in `verification/`. For a shorter transfer, use `CLAUDE-HANDOFF.md` with this report and the visual evidence relevant to the first prototype.
