# 05 - Review and collaboration for coded prototypes

Research date: 2026-10-15. Scope: how a Figma-to-code design team (product designers, content designers, PMs, engineers) replaces canvas-based review.
Method: web search + page fetches. Facts below come from fetched pages unless marked **[unverified]**. Page dates are publication or "last updated" dates as shown on the page.

## TL;DR

- **Engineer review:** every serious example uses a **preview URL per PR** plus a normal PR. The unresolved question is merge vs rewrite. Jane Street says "prototype is disposable, eng owns production code". Knak and a 40-person B2B org say designers commit into the real codebase with guardrails. Pick one explicitly, per PR, with a label.
- **Live component states:** the working pattern is **one "Show"/state-matrix story per component** (all variants x states x sizes on one canvas) in Storybook, published per PR via Chromatic Publish or similar. That page is also the visual-regression baseline.
- **Content designers:** two proven routes. (a) Copy lives in a strings file and the content designer opens PRs (Justworks). (b) A copy platform (Ditto, Frontitude) syncs strings to the repo via CLI and opens PRs, with style rules co-located with components (Ditto Specs).
- **PM/exec review:** the cheapest thing that works is a **protected preview URL + Vercel/Netlify comment overlay**. Figma's "Claude Code to Figma" capture is the bridge back to the canvas for side-by-side storyboards and annotation, but it has real fidelity limits.
- **End-to-end examples** exist, but mostly at small/mid companies. No public enterprise SaaS example of the complete chain was found. Treat the Quickbase workflow as something to define, not copy.

---

## Q1. Engineer review of coded prototypes

### 1.1 Preview deployments per branch/PR

| Tool | What it does | Cost / enterprise fit | Source | Date |
|---|---|---|---|---|
| **Vercel** | Preview deployment per PR/branch. Toolbar comments, share-by-invite, "outdated deployment" refresh prompt. Deployment Protection: Vercel Authentication (all plans), Password Protection (Pro $20/mo per protected project; included in Enterprise), **Passport = your IdP/SSO (Enterprise only)**, Trusted IPs (Enterprise only). | Comments free on all plans. External invitees: Pro/Enterprise (Hobby = 1 collaborator). SSO-gated previews need Enterprise. | https://vercel.com/docs/deployment-protection ; https://vercel.com/docs/deployments/sharing-deployments | updated 2026-09-15; 2026-08-28 |
| **Netlify** | Deploy Preview per PR/MR plus branch deploys. Netlify Drawer for reviewers (comments, screenshots, Loom video, ticket creation in Jira/Linear/GitHub). | Reviewer role historically free and unlimited, not counted as paid seats (older 2021 post; re-check current plan terms). | https://www.netlify.com/blog/discuss-site-changes-and-file-issues-with-the-improved-netlify-drawer.md ; https://www.netlify.com/blog/2021/08/03/new-netlify-integration-with-gitlab-for-fast-visual-feedback-on-deploy-previews.md | Drawer post shows 2026-10-15 (the fetch date, so probably a render date **[unverified]**); 2021 |
| **Cloudflare Pages** | Unique preview URL per PR plus branch aliases. Public by default; gate with **Cloudflare Access** (SSO via your IdP). `noindex` header by default. | Access policy is the SSO-friendly route. No comment overlay built in. | https://developers.cloudflare.com/pages/configuration/preview-deployments/ | undated |
| **Render** | Per-PR preview environments. **Not researched in depth [unverified].** | n/a | n/a | n/a |

Takeaway: Vercel gives the best review UX (comments plus share model) but SSO gating costs Enterprise. Netlify has the friendliest non-technical reviewer model. Cloudflare is best for "behind SSO, cheap", worst for review UX.

### 1.2 PR review of design code, merge vs rewrite

| Example | What they do | Source | Date |
|---|---|---|---|
| **Jane Street** (Edwin Morris) | Designer builds a working prototype with Claude, pushes it for code review. Problem named: reviewers get "a fully baked feature" and don't engage with design space. Fix: PR description states "prototypes are living proposal docs, the code is disposable". Engineers implement a separate production version "referencing the prototype but owning the production code." | https://blog.janestreet.com/i-design-with-claude-code-more-than-figma-now-index/ | 2026-02-05 |
| **Knak** (B2B SaaS) | Designers prototype in the production codebase on a branch. Guardrails: one designer profile plus three skill files; engineering spent **six weeks** on guardrails first. A front-end dev says working from a handoff branch roughly halved time-to-production. Surfaces loading/error/empty states early. | https://knak.com/blog/claude-code-streamlining-at-knak/ | ~May 2026 |
| **40-person B2B org** (Ops Forward / changying.substack) | 4-month change: vibe-code training, production onboarding, internal tools, "papercut fixes" to prod. Design system exists only in code. Merge-request gate for all changes. Prototypes call real components so engineers can inspect. Preview URLs validate before merge. Engineers review both code quality and UX. Needs design engineers on staff. | https://changying.substack.com/p/case-study-from-figma-first-to-code | 2026-02 |
| **Merge (merge.dev)** | Backend first, Claude generates a rough frontend, designer pulls the branch and rebuilds UX. "Everyone reviews in code." No prototype or Figma handoff. | https://www.merge.dev/blog/product-design-with-claude-code | 2026 (date not shown) |
| **designproject.io** | Designer PR hygiene: commit early, 80-200 line PRs (under 500 lines), follow repo contribution guide. Article does **not** cover previews, checklists or labels. | https://designproject.io/blog/claude-code-designer-workflow/ | 2026-04-09 |
| **Builder.io** | Share preview URLs with stakeholders before merge; use Plan Mode so Claude proposes before editing; designers approve terminal commands. | https://www.builder.io/blog/claude-code-for-designers | 2026-02-25 |
| **Anthropic Claude Code desktop** | Built-in app preview, "Review code" inline comments on local diff, PR/CI monitoring, auto-merge option. | https://claude.com/blog/preview-review-and-merge-with-claude-code | 2026-02-20 |

Merge vs rewrite, as reported:
- **Disposable** (Jane Street): fits when prototype explores a new interaction and eng owns data/logic.
- **Mergeable** (Knak, the 40-person org, Merge): works when the prototype uses real components/tokens and guardrails exist.
- Nobody reports a hybrid label scheme in public. A practical one to propose: `proto/disposable` (reference only, never merged), `proto/mergeable-ui` (UI layer only, eng wires data). Treat this as our design, not a sourced practice.

Review checklists: no public design-code review checklist was found beyond designproject.io's PR-scope rules. The closest is guardrails-as-config (Knak skills files; "AGENTS.md hard fidelity rules" in the Designers-in-the-repo example). **Gap.**

### 1.3 Visual regression

| Tool | Fit | Cost | Source |
|---|---|---|---|
| **Chromatic** | Storybook-first; snapshots every story; **UI Review** assigns designers/PMs to approve visual diffs in the PR; threads must resolve before merge; SSO/SAML. Bitwarden routes component-library UI Review to a design group via CODEOWNERS-style review request. | Free 5k snapshots; Starter $179/mo (35k); Pro $399/mo (85k); Enterprise custom. The pricing page as extracted shows UI Review and SSO as Enterprise-only; **verify on the live pricing page**. | https://www.chromatic.com/pricing ; https://chromatic.com/features/review ; https://contributing.bitwarden.com/contributing/pull-requests/chromatic |
| **Percy (BrowserStack)** | Page-level cross-browser diffs, review dashboard. | 5,000 free screenshots/mo; paid pricing no longer public (third-party sources quote $399-$599/mo, **[unverified]**). | https://www.browserstack.com/docs/percy/overview/plans-and-billing ; https://agentdeals.dev/vendor/browserstack-percy |
| **Playwright `toHaveScreenshot`** | Free, in CI, no review UI. Baselines are per OS/browser; run in Docker for determinism. | $0 | https://playwright.dev/docs/test-snapshots |
| **Argos** | Cheaper alternative cited by a third party ($100/mo flat, 35k screenshots, July 2026). My fetch of the source URL 404'd. | **[unverified]** | https://argos-ci.com/blog/visual-testing-pricing (404 at fetch time) |

Takeaway: for prototype PRs, visual regression is optional. It earns its keep on the **shared component states page** (1.1 of Q2), not on one-off prototypes.

---

## Q2. Live component states

### 2.1 Where the full state matrix lives

| Option | What it is | Fit | Source | Date |
|---|---|---|---|---|
| **Storybook (+ Chromatic Publish)** | Stories per state; Chromatic hosts a Storybook per branch/PR at `<branch>--<appid>.chromatic.com`, private by default, SSO for enterprise, shareable to people without GitHub. | Default choice. Ecosystem: a11y, visual regression, Figma integration, 200+ addons. | https://www.chromatic.com/docs/publish/ | undated |
| **Storybook MCP** | `@storybook/addon-mcp` exposes component docs/stories/test running to agents (Claude Code). Needs `componentsManifest: true`, an `AGENTS.md` instruction, local server. Tests include a11y with self-healing loop. | Lets Claude reuse documented components and check its own work against states. | https://storybook.js.org/docs/ai/mcp/overview | 10.x docs, 2026 |
| **Ladle** | Vite-native, React-only, ~1.2s cold start, far fewer addons. | Small teams, low overhead; no Chromatic-like ecosystem. | https://www.pkgpulse.com/guides/storybook-8-vs-ladle-vs-histoire-2026 (third-party benchmark) | 2026 |
| **Histoire** | Vue/Svelte only. | Not relevant unless Vue/Svelte. | same | 2026 |
| **In-app "playground" route** | Rootly builds small design playgrounds (Vite + Base UI) with **fixtures for happy and failure paths, latency toggles, keyboard-first nav, minimal styling**. Built in 3 hours. Becomes the "north star" for implementation. | Lowest tooling cost. No built-in regression or hosting beyond the app's preview URL. | https://rootly.com/blog/prototyping-with-design-playgrounds.md | 2025-11-13 |
| **Design-system doc sites** (Atlassian, Polaris, Primer, Geist) | I did **not** find fetchable evidence of their internal states-page structure; searches returned generic docs. **[unverified]** | n/a | n/a | n/a |

### 2.2 What a good "states page" contains

Sourced pattern (VTEX Shoreline Storybook guideline, https://shoreline.vtex.com/guides/code/storybook-guideline, undated):
- **Play** story: one interactive story with Storybook controls bound to props.
- **Show** story: one story with **all states, variants and sizes side by side**. This is the only story with Chromatic snapshots enabled, so it is both the review page and the regression baseline.
- **Examples**: real-world scenario stories.
- **Tests**: interaction tests (play functions).
- Overlays/modals cannot be visually diffed but still get a Show story.

A Storybook best-practice write-up and a skill file in the wild (https://storybook.js.org/blog/structuring-your-storybook/ ; third-party skill refs **[unverified]**) describe the same: Overview, Playground, then feature stories covering states. A "StateMatrix" component (variants x states on one canvas) is a community pattern, not an official Storybook feature.

Proposed checklist for our states page (derived, not sourced as a single standard): default, hover, focus-visible, active, disabled, loading, error, empty, read-only, long-text/overflow, RTL/locale expansion, sizes, themes (light/dark if applicable), reduced motion.

### 2.3 Becoming the handoff artifact

- **Storybook <-> Figma:** Storybook Connect (Figma plugin, via Chromatic) links stories to Figma components/variants; Designs addon embeds Figma in Storybook. https://storybook.js.org/docs/sharing/design-integrations
- **Code Connect:** maps Figma components to code. The Storybook parser is **React-only and flagged deprecated** (no further updates; migrate to Code Connect template files). https://developers.figma.com/docs/code-connect/storybook/
- Bitwarden: published Storybook per PR is a required PR check; design group reviews component library changes. https://contributing.bitwarden.com/contributing/pull-requests/chromatic
- Knak reports edge-case states (loading/error/empty) surface during design because they must exist in code. https://knak.com/blog/claude-code-streamlining-at-knak/

---

## Q3. Content designers on coded prototypes

| Tool / company | What it does | Cost / fit | Source | Date |
|---|---|---|---|---|
| **Justworks** (Sarah Kessler) | Content designer used Claude Code to find/update strings in locale files (key-value). Built "Justwords", a strings-management tool with automated spelling/style checks that opens GitHub PRs. Engineers review and approve; nothing unvetted reaches prod. Engineers had been asking content designers to open PRs. Pain point: renaming English strings means changing keys across repos. | Internal build | https://technology.justworks.com/the-content-designer-who-opened-a-pull-request-6c1e5a8790ce | 2026-04-28 |
| **Ditto** | Copy platform. CLI pulls string files (JSON, iOS, Android, ARB) into the repo; stable "Developer IDs" shared by design/code/translation; **GitHub Action opens PRs with updated text**; **PR review bot flags style-guide violations and reusable strings**; Ditto MCP lets coding agents read/write copy and style rules; Figma sync. | Pricing not found [unverified]; has Enterprise tier | https://developer.dittowords.com/ | 2026 |
| **Ditto Specs** | `.ditto.md` files sit next to components, declare each text surface; CLI syncs matching style rules from the platform into them; agents read them as context; humans review copy decisions in PR diffs. Workspace-level + component-level specs. | Pricing not stated | https://www.dittowords.com/blog/how-to-build-copy-guidance-into-your-design-system-with-ditto-specs ; https://developer.dittowords.com/ditto-specs-cli-reference/spec-files | 2026 |
| **Frontitude** | UX content platform; Figma + Dev Mode plugins; Developer CLI pulls strings (i18next-compatible, e.g. react-i18next); webhooks; CSV/JSON export. | Pricing not found [unverified] | https://npmjs.com/package/@frontitude/cli | undated |
| **Lokalise / Crowdin** | Localization TMS; Figma plugins for design-stage strings; in-context screenshots/visual editor for translators. Relevant if Quickbase already localizes; less so for pure copy authoring. | n/a | https://crowdin.com/blog/2024/10/18/design-stage-localization-figma ; https://lokalise.com/solutions/figma-translation/ | 2024 |
| **UX Writing Hub** | Practitioner guide: `CLAUDE.md` as style guide, bulk content audits across files, diff view, read-only consistency reports, Plan Mode as safety. | Free article | https://uxwritinghub.com/claude-code-ux-writing/ | 2026 |

Not found: public, first-hand accounts from Shopify, Intuit, Atlassian, Dropbox or Microsoft content teams working in code. Searches returned only generic Claude/Cursor-for-designers pieces. **Gap; do not claim these companies do this.**

Comment-and-suggest on preview URLs: Vercel Toolbar comments and Netlify Drawer both let a non-engineer pin copy feedback on the page. Neither converts the comment into a suggested string edit in the PR. **No sourced tool does "suggest copy on the preview, becomes a PR suggestion"**; closest is GitHub's own "suggested change" in PR review, which requires the strings to be in a reviewable file (hence strings-file separation).

Pattern that follows from the evidence:
1. Strings in a dedicated locale/JSON file, not inline JSX (Justworks).
2. Content designer owns that file via CODEOWNERS or required review **[derived; Bitwarden shows the CODEOWNERS-style pattern for design, not content]**.
3. Style rules as agent-readable files (CLAUDE.md, or Ditto Specs if buying Ditto).
4. Lint/bot check on the PR (Justworks automated checks; Ditto review bot).

---

## Q4. PM present / review of coded prototypes

### 4.1 Stable shareable URLs and comment overlays

| Tool | What it does | Cost / fit | Source | Date |
|---|---|---|---|---|
| **Vercel Toolbar comments** | Pin comments to UI or highlighted text on preview deployments; thread links to Slack; captures browser/device; PR owner gets email. Free on all plans, on by default. Commenters need a Vercel account. Invite external users (Pro/Enterprise); "anyone with the link" works with protection on. Share branch link (always latest) or commit link (frozen). | Good PM fit; friction = Vercel accounts for externals | https://vercel.com/docs/comments ; https://vercel.com/docs/deployments/sharing-deployments | updated 2026-08-19; 2026-08-28 |
| **Netlify Drawer** | Comments, annotated screenshots, Loom video, ticket creation (Jira, Linear, GitHub, Azure DevOps...). Reviewers need no Git account. Live-refresh notice. | Good for non-technical reviewers | https://www.netlify.com/blog/discuss-site-changes-and-file-issues-with-the-improved-netlify-drawer.md | see 1.1 note |
| **BugHerd / Marker.io / Pastel** | Third-party overlays on any staging URL. BugHerd: pins on page, built for non-technical clients (~$129/mo per a BugHerd-authored comparison). Marker.io: 2-way sync with Jira/GitHub etc. (~$59/mo agency tier). Pastel: lighter UI. | Vendor-authored comparison; verify pricing | https://bugherd.com/article/bugherd-vs-marker-io-2025 | 2025 |
| **Agentation** | Open-source React annotation toolbar. Click elements, add notes; outputs structured markdown (selectors, source paths, React tree, computed styles); **MCP** so agents read/resolve annotations. Free for individuals and internal company use. Desktop-only. React 18+. **Aimed at people working with a coding agent, not at PMs without repo access.** A third-party review (2026-08-05) says it needs codebase access and copy-paste (that review does not mention MCP; the vendor page does). | Fits designer-to-Claude loop, not exec review | https://www.agentation.com ; https://www.banani.co/blog/agentation-dev-review | 2026 |

### 4.2 Back to the canvas

**Figma "Claude Code to Figma" / code-to-canvas** (remote Figma MCP server): capture a running UI (production, staging, localhost) into editable Figma frames. Whole screen or selected element; multiple captures in one session keep order, so you get **a side-by-side storyboard**. Works with Claude Code, Cursor, Codex, VS Code, others. Any seat can capture into drafts; editing existing files needs a Full seat. https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/ ; https://www.figma.com/blog/introducing-claude-code-to-figma/ (2026-02-17).
Known limits (Codeminer42, 2026-03-06): only the visible viewport is captured, `background-clip:text` gradients lost, fixed sidebars mis-scale, layers only (no state/handlers), early-version roughness. https://blog.codeminer42.com/?p=12651. Figma's announcement post names no customers.
thoughtbot (2026-05-22) describes the loop Figma frame -> Claude code -> preview -> back to Figma as editable layers. https://thoughtbot.com/blog/claude-code-figma-for-non-technical-designers

### 4.3 Presenting, switching states, recording

- **Scenario switchers / fake data presets:** MSW documents "dynamic mock scenarios" switched at runtime via query params so you don't edit code mid-demo. https://mswjs.io/docs/best-practices/dynamic-mock-scenarios . Rootly's playgrounds use fixtures plus latency toggles. DemoKit (persona-driven scenarios) exists **[unverified, vendor page only]** https://demokit.kasava.dev/ . No source reports a team that built a PM-facing state panel at enterprise scale.
- **Why present live:** Adam Silver argues Figma presentations hide loading/error/edge states and make the audience watch navigation; PMs reacted well to a coded GOV.UK-kit demo. Single enterprise project, opinion piece. https://adamsilver.io/blog/design-in-code-get-praise/
- **Recording:** Loom is the standard (timestamped comments; Atlassian-owned; Netlify Drawer embeds it). https://www.atlassian.com/software/loom/use-case/design . A Chime PM sharing a screen recording of a Claude-built prototype in Slack is reported in a secondary roundup **[unverified]** https://www.prodmgmt.world/blog/how-to-use-claude-code . Screen Studio: no sourced findings.
- **Exec review evidence:** weak. Sources agree prototypes beat static mocks for execs (generic UX presentation advice), but no first-hand report of an exec review process for coded prototypes surfaced. **Gap.**

---

## Q5. End-to-end examples

| Team | Chain | Fit for enterprise SaaS | Source |
|---|---|---|---|
| **Knak** (B2B SaaS, marketing email platform) | Designer profile + skills -> prototype on a git branch in the real codebase -> engineering guardrails (6 weeks to set up) -> handoff branch cuts front-end time roughly in half. PM/content steps not described. | Closest match; size unknown | https://knak.com/blog/claude-code-streamlining-at-knak/ |
| **40-person B2B org** | Training -> prod access -> internal tools -> papercut fixes; design system only in code; MR gate; preview URLs; eng reviews code + UX; design engineers bridge. | Small; states its prerequisites (design engineers, collaborative culture) | https://changying.substack.com/p/case-study-from-figma-first-to-code |
| **Jane Street** | Written proposal -> Claude prototype -> user feedback -> code review -> prototype treated as disposable reference. | Enterprise-scale firm, internal tooling, not SaaS | https://blog.janestreet.com/i-design-with-claude-code-more-than-figma-now-index/ |
| **Justworks** (content leg only) | Content designer -> Claude Code/Justwords -> style checks -> PR -> eng approval. | Mid-size HR/payroll SaaS | https://technology.justworks.com/the-content-designer-who-opened-a-pull-request-6c1e5a8790ce |
| **Bitwarden** (review leg only) | Storybook Publish + Chromatic UI Tests + UI Review as PR checks; design dept reviews component-library changes. | Open-source security SaaS, documented contributor process | https://contributing.bitwarden.com/contributing/pull-requests/chromatic |
| **"Designers in the repo"** (infra platform, Oct 2026) | One repo of HTML/Alpine prototypes; per-prototype README; AGENTS.md fidelity rules; PR with side-by-side old/new preview; domain experts' decisions logged in READMEs. | Internal tools, tiny kit; useful as a guardrail pattern, not as a model | https://www.designsystemscollective.com/designers-in-the-repo-9266cdc3d44b |
| **Unnamed 200-person real estate product org** | Designers use Claude Code -> HTML/CSS -> Vercel links -> GitHub -> developers do data/API hookup. | Secondary source (Sacra), 2026-06-02 | https://sacra.com/chat/h/9f77bb37-182f-49dc-8d5d-94990a8e56b5/ |

No public source describes the full chain (design -> content -> PM review -> eng review -> production) at an enterprise SaaS company. Each source covers 1-2 legs. The full chain for Quickbase would be assembled from them.

---

## Recommended stack for a mid-size enterprise SaaS team

Ranked cheapest/simplest first. Each tier adds to the previous; you don't swap.

### Tier 0: Process only (cost ~$0)
- **Draft PR with preview URL per prototype branch**, with a required PR template: intent (disposable vs mergeable), screens/states covered, copy file touched, open questions.
- **Labels:** `proto/disposable`, `proto/mergeable-ui` (our proposal).
- **Strings in a separate file**, content designer as required reviewer.
- **Guardrails as config:** CLAUDE.md/AGENTS.md with tokens, components, "flag don't fix" rules (Knak skills, Designers-in-the-repo).
- Trade-off: no comment overlay, no regression; reviewers need to use GitHub for copy.

### Tier 1: Add a preview host with comments (low cost)
- **Option A, Vercel Pro:** comments free, external invites on Pro, Slack-linked threads, share branch link (live) vs commit link (frozen). SSO-gated previews need Enterprise (Passport); Password Protection $20/mo per project on Pro. Commenters need Vercel accounts.
- **Option B, Netlify:** reviewer-friendly Drawer (comments/screenshots/Loom/ticket creation). Check current reviewer-seat terms.
- **Option C, Cloudflare Pages + Access:** SSO-gated cheaply and correctly for a security-conscious enterprise; no comment layer, so pair with Loom or Figma capture.
- Trade-off: hosting choice depends on how Quickbase's security team treats prototype data. Prototypes should run on fake data; this is the main reason a Tier-1 host is acceptable.

### Tier 2: Live states page (low-medium cost)
- **Storybook** with one **Show story per new component** (all states x sizes x themes) + **Play** story. Publish per PR via Chromatic Publish (private, SSO on enterprise) or self-host the static build on the same preview host.
- Add **Storybook MCP** so Claude reuses existing components and checks a11y.
- Skip Ladle unless Storybook setup cost is prohibitive; you lose the ecosystem.
- Trade-off: story maintenance. Mitigate by making "Show story exists" part of the PR template and having Claude generate it.

### Tier 3: Regression and design sign-off (medium cost)
- **Chromatic** Show-story snapshots: Free tier 5k snapshots is plenty for a few dozen components; UI Review (designer approval in PR) is likely Enterprise-only, so verify. Alternative: Playwright `toHaveScreenshot` in Docker CI for $0, no review UI.
- Figma **Storybook Connect** or Code Connect only if designers still maintain a Figma library. Code Connect's Storybook parser is React-only and deprecated, use template files.
- Trade-off: snapshot noise and baseline churn; budget someone to own it.

### Tier 4: Content platform (medium cost, only if copy volume justifies it)
- **Ditto** (CLI + GitHub Action PRs + review bot + Ditto Specs + MCP) or **Frontitude** (CLI, i18next). Buys: content designers edit copy outside the repo, PRs generated for them, style rules enforced in PR and readable by agents.
- Trade-off: second source of truth; needs engineering to wire the CLI; pricing unverified.
- Cheaper interim: Justworks-style internal script, or just Claude Code + CLAUDE.md voice guide + CODEOWNERS.

### PM and exec review layer (pick per audience)
1. **Live walkthrough on the preview URL** with a scenario switcher (query-param presets via MSW-style scenarios). Cheapest, best for loading/error/edge states (Silver, Rootly).
2. **Loom recording** for async PM/exec review.
3. **Figma capture storyboard** (code-to-canvas) when PMs want pinned canvas comments or screens side by side. Accept the fidelity limits above; capture is a review artifact, not a source of truth.
4. **Agentation** for designer-to-Claude annotation, not for PMs/execs.

### What to decide first
1. Merge vs rewrite policy and who owns the label (biggest unresolved question in the sources).
2. Preview host and SSO requirement (security sign-off).
3. Who owns the strings file and the state-matrix standard.

### Open gaps
- No enterprise SaaS end-to-end write-up found.
- No first-hand content-team accounts from Shopify, Intuit, Atlassian, Dropbox or Microsoft.
- No design-code PR review checklist found beyond PR scoping advice.
- Chromatic UI Review plan gating, Ditto/Frontitude/Netlify/Percy pricing, and Render previews not verified.
- Design-system docs-site (Atlassian, Polaris, Primer, Geist) state-page anatomy not verified.
