# Branch and deliverables audit

Date: 2026-10-16. Read-only review. “The live and branch work” is treated as the comparison target; there is no portfolio project named “That’s the L.” I did not run builds or browser checks. Verification results below are records already present in the repository or study branch.

## State map

| State | What it actually contains | Delivery status |
| --- | --- | --- |
| `origin/main`, `main`, `surfacing-work` commit | All three refs point to `f8855c0`. At that commit, only `designing-pave` and `synapse-sys` are public (`f8855c0:src/lib/public-case-studies.ts:3-7`), and the homepage is the older two-card composition (`f8855c0:src/pages/index.astro:109-128`). | This is the only committed state shared with `origin/main`; it must not be treated as a deployment fingerprint. |
| Current `surfacing-work` filesystem | 73 tracked files changed (11,407 additions / 5,759 deletions) plus 283 untracked files. It introduces four featured studies and three supporting studies (`src/lib/public-case-studies.ts:3-17`), the evidence-led homepage timeline (`src/pages/index.astro:111-123`), shared case shell, private-work path, broader motion lifecycle, Labs work, evidence assets, and expanded test contracts. | Substantive product/content work, but it is not a commit and therefore is not deployable or reviewable as one branch tip. |
| `codex/lightweight-portfolio-study` | Four commits ahead of `origin/main`. Commit `685ad43` is a snapshot of the current portfolio; the three following commits add six visual previews, then refine Quiet editorial, navigation, Labs and the case TOC. The branch describes itself as a local proposal (`docs/design-study/README.md:11-15`). | Clean, verified study branch at `a30cc00`, but no hosted deployment or production merge (`docs/design-study/alignment-audit.md:83-85`). |

The four production files touched by the study after its snapshot — `src/pages/index.astro`, `src/pages/labs/index.astro`, `src/components/CaseStudyPage.astro`, and `src/styles/global.css` — are byte-identical between the current filesystem and snapshot `685ad43`; the branch versions differ because they contain the study refinements. This makes `685ad43` a useful reconciliation anchor, but it does not protect the current worktree’s later private assets and other untracked material.

The main agent's live browser pass confirms deployment provenance is a fourth, mixed state rather than `origin/main`: the deployed Home/Pave broadly resemble the current filesystem, deployed Labs lists six tools while current/study Labs list seven, and deployed About retains the older black stat strip while current About uses the collage/biography composition. The deployment commit is unknown, so release work needs a build/deploy fingerprint instead of inferring it from local refs.

## Prioritized findings

### 1. Critical — there is no single deployable source of truth

The deployed artifact, committed baseline, extensive dirty application, and lightweight study are different products. The strongest content and IA work exists only in the dirty filesystem, while the best lightweight treatment exists only after the study snapshot. The study’s own record says the snapshot captured the prior portfolio and preserved its original inventory (`docs/design-study/README.md:27-31`), but the active branch still points at the pre-snapshot commit.

Observable risk: merging or deploying from `main` omits the new homepage, cases, evidence, private-work system, motion lifecycle and checks; redeploying the unknown live build cannot be reproduced from a named local ref; promoting `a30cc00` without reconciling the current filesystem can omit later local-only/private assets; attempting to merge into the dirty worktree makes omissions and accidental overwrites hard to detect.

Safe path: first capture the deployed build metadata/commit if the platform exposes it. Then create a recoverable preservation commit or archive from the current filesystem with an explicit inventory of the 73 tracked and 283 untracked files. Use that commit as the integration base, compare it to `685ad43`, then replay the three post-snapshot study commits (`a6a287a`, `9c5370a`, `a30cc00`) or port their 16-file diff. Do this in a clean worktree and retain an inclusion/exclusion manifest for secrets, generated archives and private media.

### 2. High — the lighter direction is proven as a study, but it is not a site-wide design handoff

The study intentionally scopes visual treatments to Home and Designing Pave (`docs/design-study/visual-spec.md:7-22`). The final pass also changes shared navigation, the case contents list, and the Labs landing, but explicitly leaves Notes, About, Contact/CV, experiment shells and private templates for later owners (`docs/design-study/alignment-audit.md:34-45`). Its ordered backlog still begins with owner approval of the heading treatment and ends with production application (`docs/design-study/alignment-audit.md:71-81`). The Quiet revision says the first three treatments were rejected and that this candidate remains a proposal (`docs/design-study/editorial-revision.md:35-37`).

Observable risk: taking only the polished branch changes produces a hybrid site — quieter Home/Pave/Labs and navigation beside untouched route-family typography and spacing. Taking its scoped CSS as a global answer would bypass the route-specific constraints the audit already identified.

Safe path: make one explicit visual decision before rollout. The decision should accept or reject the Quiet heading roles, system-sans choice, reading edge, active-nav weight, bounded TOC and Labs directory separately. Then execute the branch’s family backlog in order, with one shared token contract and representative pages at 1440, 1180, 820, 390 and 320px.

### 3. High — the two Synapse studies do not yet form a clear public hierarchy

The homepage features `designing-synapse-sys`, while `synapse-sys` is a supporting public study and neither is parented to the other (`src/lib/public-case-studies.ts:3-17`). The featured route declares `status: prototype` and frames itself as a visual-language case (`case-studies/pages/designing-synapse-sys.mdx:1-10`), but the homepage overview for that same ID presents “Closed-beta product” evidence and broad product capabilities (`src/lib/homepage-overviews.ts:196-222`). The actual closed-beta product case is the separate `synapse-sys` route (`case-studies/pages/synapse-sys.mdx:1-19`). The AI-facing index still links only the older product case (`public/llms.txt:66`, `public/llms.txt:96`).

Observable risk: a visitor clicks a broad closed-beta product story and lands on a prototype-status visual-language essay; search/AI surfaces describe a different canonical Synapse page than the homepage. This weakens the shipped/prototype distinction that the content contract otherwise handles carefully.

Safe path: choose a canonical Synapse entry. The safest IA is to make the closed-beta product case the homepage destination and attach the visual-language study as a clearly named related/child case. If the visual-language case must remain featured, change the homepage Background/Problem/Impact to match that route and add an explicit link to the full product case. Preserve both slugs; update `public/llms.txt`, sitemap expectations, related links and browser assertions together.

### 4. Medium — the new Synapse visual-language case needs an operator-voice edit before promotion

The case opens with an abstract thesis and already knows the lesson (`case-studies/pages/designing-synapse-sys.mdx:14-26`), then adds “Reviewer Takeaway” and “Product Notes” summaries before the narrative (`case-studies/pages/designing-synapse-sys.mdx:34-45`). “Taste In The Age Of AI Slop” continues as a generalized manifesto (`case-studies/pages/designing-synapse-sys.mdx:47-61`). This is the exact shape the repository voice rules warn against: conclusion-first, polished, and broadly applicable. The stronger material arrives later, where a March 23 audit and visible glare/hierarchy/trust failures create a concrete turning point (`case-studies/pages/designing-synapse-sys.mdx:63-77`).

Observable risk: the page reads like portfolio positioning rather than a specific account of what broke, and the generic confidence can make source-backed implementation details feel less trustworthy.

Safe path: reopen on the concrete audit or a specific failed visual state; show the attractive terminal choice, the cost it created, and the correction. Keep commit/audit references only where the local record supports them. Remove or fold “Reviewer Takeaway” into the narrative, preserve the unresolved mobile/onboarding limits, and avoid introducing new user reactions or outcome claims.

### 5. Medium — the supplied deck is a useful visual reference, not a reusable page system

The transferable parts are its paper palette, restrained green/break accents, mono/sans division, generous whitespace, hairline grids and ASCII diagrams (`/tmp/portfolio-audit-2026-10-16/design-in-code-deck/deck.html:9-35`). Its implementation is a fixed 1920×1080, absolutely positioned, overflow-hidden slide stage (`deck.html:10-13`) with terminal typing, flashes, snapping fades and an infinite cursor/blink loop (`deck.html:37-54`). It does include a reduced-motion override (`deck.html:54`), but the default motion is presentation choreography rather than portfolio navigation.

Observable risk: copying the deck literally would reintroduce dense mono display type, fixed-stage assumptions, continuous motion and hidden overflow — the opposite of the lighter, responsive reading system already validated by the study.

Safe path: translate the deck into a short token/art-direction brief only: off-white paper, near-black ink, one green signal, one warm failure color, mono for annotations/ASCII, sans for reading, and sparse bordered diagrams. Keep the portfolio’s native flow, existing motion lifecycle and shared tokens. Do not port the deck stage or animation code.

### 6. Medium — local verification is unusually strong, but release evidence still stops before deployment

The dirty application records a completed local `npm run check` with 65 pages and 426 browser cases (`docs/portfolio-performance-2026-09.md:26-30`), plus constrained local performance data and known media hotspots (`docs/portfolio-performance-2026-09.md:44-63`). The study records a later full 456/456 browser pass and focused post-review navigation checks (`docs/design-study/README.md:27-33`). These are documentary claims; I did not rerun them. Both records explicitly leave production CDN, field metrics, screen-reader and physical-device checks outstanding (`docs/portfolio-performance-2026-09.md:13-20`).

Observable risk: a clean local branch can still fail after the two work streams are integrated or under deployed caching/server/private-route behavior.

Safe path: after integration, rerun the repository’s single `npm run check` gate from the final commit, then inspect the canonical routes in both themes, reduced motion and no-JS. Add a deployed smoke pass for redirects, sitemap/robots, private-work auth boundaries, media byte ranges and analytics suppression on study previews. Keep physical-device and screen-reader checks as named release evidence rather than inferred coverage.

## What is already strong

- Content truth is handled well in the four main work stories. The sanitized claim register carries reporting windows, populations and caveats (`docs/portfolio-content-claims-2026-09.md:3-20`) and explicitly bans common overclaims (`docs/portfolio-content-claims-2026-09.md:22-26`). Pave, Pipelines and Connection Central repeat those limits near the claims.
- The homepage evidence definitions label prototypes, fabricated/sample data, shipped capabilities and evidence limits directly (`src/lib/homepage-overviews.ts:44-95`, `src/lib/homepage-overviews.ts:99-192`).
- Motion state has one shared owner for system preference, visitor pause, document visibility and page transitions (`src/scripts/motion/lifecycle.js:22-37`); reveals settle immediately when motion is inactive or history is restored (`src/scripts/motion/reveal.js:61-85`, `src/scripts/motion/reveal.js:93-95`). The study adds no decorative motion and specifies immediate, interruptible TOC following (`docs/design-study/alignment-audit.md:30-32`).
- Homepage video evidence keeps native controls, `preload="none"`, intrinsic dimensions and a direct fallback link (`src/components/OverviewVideo.astro:16-39`). This is a good accessibility/performance baseline to preserve through the visual rollout.
- The lightweight branch’s preview routes are correctly isolated: six static Home/Pave variants, noindex, no analytics, and production links left intact (`docs/design-study/visual-spec.md:11-22`; `src/pages/design-study/[direction]/[view].astro:8-35`).

## Claude-friendly next deliverables

1. **Preservation and integration manifest.** Output: one clean integration branch based on a preservation commit of the current filesystem, plus a machine-readable list of included, excluded, generated and private files. Acceptance: diff against `685ad43` is explained; the three study commits are present; no current file disappears silently.
2. **One-page visual decision.** Output: accepted values for display/section/body/meta roles, navigation active state, Home/Pave reading edge, TOC behavior, Labs row anatomy, and the deck-derived palette/ASCII annotation rules. Acceptance: owner approves actual Home, Pave and Labs screenshots in light/dark desktop/mobile; rejected alternatives are marked historical.
3. **Synapse IA and content pass.** Output: canonical route decision, explicit relationship between the product and visual-language studies, aligned homepage status/evidence, updated `llms.txt`/related links, and an operator-voice rewrite of the visual case opening. Acceptance: every artifact is labelled shipped, closed beta, prototype or unmeasured consistently at entry and destination.
4. **Route-family rollout.** Output: Notes, About, Contact/CV, tool shells and neutral private templates migrated to the accepted semantic tokens, one family at a time. Acceptance: preserve renderer/slug contracts, About composition, tool workspace area, contact behavior and private markers; no new motion primitive.
5. **Final release packet.** Output: final diff, `npm run check` log, browser evidence for canonical routes plus Synapse and Labs, reduced-motion/no-JS captures, deployed smoke record and a short residual-risk list. Acceptance: one commit/branch tip corresponds to the reviewed preview and deployed artifact.
