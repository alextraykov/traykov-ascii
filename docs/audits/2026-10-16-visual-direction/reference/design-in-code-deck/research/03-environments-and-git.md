# 03 — Environments and git for a ~10-designer team shipping coded prototypes with Claude Code

Researched 2026-10-15. Context: ~10 product designers, mostly not git/terminal-fluent but motivated. A coded design system (tokens + React components) will exist.

Confidence notes: official docs (code.claude.com, support.claude.com, Vercel, GitHub, Figma) were fetched directly. Practitioner write-ups were read via a summarizing fetch, so details are second-hand. Vendor blogs (Magic Patterns, Builder.io, Knak) are marked as vendor content. Anything I could not confirm is tagged [unverified].

---

## TL;DR

- **Recommended: a hybrid.** Explore in a dedicated **prototype playground repo** (Notion pattern) that imports the real design system as a package. Use **preview URLs** as the review artifact. **Promote** only what ships into the production repo through an engineer-paired PR.
- **Do not let designers work on the production repo by default.** Knak does this, but only after a six-week tiger team made the repo safe. Make it a Tier 3 privilege, not the starting point.
- **Git safety is mostly platform config, not training.** Branch protection on `main` + CODEOWNERS + required CI + Claude Code deny rules/hooks + preview deployments. Designers never merge.
- **Claude Design is being folded into Claude.** The standalone site (claude.ai/design) closes **14 Dec 2026**. Use it, if at all, for early exploration. Do not build a workflow on the standalone site.
- **Biggest real risks:** prototype becomes production by accident, off-system code, review burden on engineers, uneven skill, secrets and prod data.

---

## 0. Claude Design status (verified)

**It exists. It is not retired outright, but the standalone product is being closed and folded into Claude.**

| Fact | Detail | Source |
|---|---|---|
| Launch | Anthropic Labs product, research preview, 17 Apr 2026, powered by Opus 4.7. Pro/Max/Team/Enterprise. Enterprise orgs must enable it in admin settings. | https://www.anthropic.com/news/claude-design-anthropic-labs |
| Update | 17 Jun 2026: design-system import from GitHub repos/design files, admin approval role to lock a standard design system, `/design-sync` and `/design` commands in Claude Code. | https://techrepublic.com/article/news-anthropic-claude-design-overhaul-enterprise-teams (secondary source, reporting an Anthropic announcement) |
| Standalone closes | **claude.ai/design closes 14 Dec 2026.** "Claude Design now lives in Claude." Design works inside any Claude conversation. | https://support.claude.com/en/articles/17440474-migrate-from-standalone-claude-design-to-claude |
| What migrates | Design systems migrate as artifacts (one click, brings every design system in the org). Empty systems and unmodified built-in themes are excluded. | same |
| What does not | Projects, chats and comments stay in the standalone site and are **deleted after closure** per retention policy. Export per project via Share > Project HTML > Export before 14 Dec. A project-transition path is "coming soon" per the article. | same |
| Admin gates | Artifacts must be on (default On for Team, Off for Enterprise). Design systems setting must be On. Zero-data-retention orgs cannot enable artifacts and cannot migrate. | same |
| Announcement of the merge | 16 Sep 2026: Cowork and chat merge into one Claude, with Claude Design inside conversations. Enterprise admins get 30+ days' notice. | https://claude.com/blog/cowork-is-now-claude |
| Design-system setup | Three routes: from chat (upload repo/files/Figma), from Claude Code via `/design-sync` (reads React components and tokens), or migration. | https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design |
| Anthropic's own rollout advice | "Have an experienced designer set up your organization's design system" first; four phases: DS setup (2-4 designers), design team, product/UX, wider org. | https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans |

Gaps:
- **Recommended migration path to Claude Code desktop: not stated.** The migration article does not name Claude Code as the destination for projects. I found no official statement of one. [unverified]
- The support article says Claude Design is in Claude Code, the Artifacts tab, mobile and Desktop. The article page I fetched was a summary of Anthropic's help page; re-check the help page before relying on exact wording.
- Handoff: the original launch post says designs export as handoff bundles to Claude Code with a single instruction, and also to Canva/PDF/PPTX/standalone HTML. Whether the handoff bundle survives the 14 Dec closure is not documented. [unverified]
- Claude Design fidelity to a real code design system: Anthropic says it applies your system; one independent experience report found "subtle inconsistencies" (https://www.goldfinch.me/blog/from-design-system-to-deployed-code-a-weekend-with-claude-design). A vendor comparison (Magic Patterns) says "limited (generic components)" but that is competitor content and I would not rely on it.

Implication: treat Claude Design as an **optional front-end for exploration and stakeholder-shareable HTML**, not as the team's system of record.

---

## 1. Environment options

### Comparison table

Ratings are my judgment from the sources below, for this team (10 designers, DS in code). "Git needed?" means the designer has to touch git concepts, not that git is absent underneath.

| Option | Fidelity (interaction/logic) | Git needed? | DS fidelity (real components) | Speed to first result | Risk | Best for |
|---|---|---|---|---|---|---|
| **a. Single-file HTML / Claude artifacts / Claude Design** | Medium (good visuals, fake logic) | No | Low-Medium. Claude Design can import a DS; HTML artifacts use look-alike markup, not your components | Fastest (minutes) | Low technical risk. Medium: drift from real DS; Claude Design standalone closes 14 Dec 2026; org admin gating | Early divergence, stakeholder storytelling, throwaway concepts |
| **b. Hosted AI builders** (Figma Make, v0, Lovable, Bolt, Replit, Magic Patterns) | Medium-High | Mostly no (GitHub sync optional) | Varies: Make kits and Magic Patterns import a DS; v0 locks to shadcn; others loose. Make kit fidelity is inconsistent | Fast | Medium-High: data/security (Lovable RLS incidents), code not on-system, vendor lock-in, per-tool cost, separate guardrail setup per tool | Individual designers on isolated concepts; Figma-first teams (Make) |
| **c. Dedicated prototype repo/"playground" wired to the real DS** | High | Low-Medium (Claude/skills hide most of it) | High (imports the real package) | Medium (setup once, then fast) | Low-Medium: prototypes mistaken for product; repo sprawl if not curated | **Default home for the team's prototypes** |
| **d. Storybook / component playground inside DS repo** | Low-Medium (component and state level, not flows) | Medium (it is the DS repo) | Highest | Medium | Medium: designers editing the DS repo; wrong place for flow prototypes | Component-level exploration, state matrices, DS contributions |
| **e. Production repo on a branch + preview deploys** | Highest (real data shapes, real routing) | High | Highest | Slow setup, then fast | **Highest**: accidental production impact, secrets, review burden, merge conflicts; needs a hardened repo | Late-stage, ship-bound work with an engineer partner |
| **f. Hybrid: explore (a/c) → promote to production branch with engineer pairing** | High where it counts | Staged | High | Fast early, deliberate late | Lowest overall if the promotion gate is real | **Recommended** |

### Per-option notes

**a. Single-file HTML / artifacts / Claude Design**
- Pros: no setup, no git, instant sharing. Claude Design shares as internal URLs, saves as folders, exports standalone HTML. Anthropic markets realistic prototypes "without code review or PRs" (https://www.anthropic.com/news/claude-design-anthropic-labs).
- Cons/risks: does not use your actual components unless the DS import works well; Goldfinch found loose system enforcement and heavy token use (https://www.goldfinch.me/blog/from-design-system-to-deployed-code-a-weekend-with-claude-design). Claude Design's Enterprise handoff to Claude Code is off by default and an admin must enable it (reported in a search summary; confirm in admin guide). Standalone closure on 14 Dec 2026 (section 0).
- Cometeer's public starter shows a lighter variant: pure static HTML/CSS/JS, no build step, tokens as the authority, deploy with Vercel (https://try.cometeer.com/starter/CLAUDE.md). Good for brand/marketing surfaces, not for a React app.

**b. Hosted AI builders**
- **Figma Make:** Make kits let you bring a React design system (npm package, Vite-compatible, React 18) into Make; guidelines in a `guidelines/` folder are essential. Full seats on paid plans. Private packages need an org registry. (https://help.figma.com/hc/articles/43602872461079, https://developers.figma.com/docs/code/write-design-system-guidelines/). Independent reviews: fidelity is inconsistent, and code is "not production-ready" (https://annaarteeva.substack.com/p/choosing-your-ai-prototyping-stack; https://mantlr.com/blog/figma-make-limitations-2026, secondary).
- **v0:** shadcn/ui-opinionated, one-way GitHub export, React/Tailwind (Arteeva). Only builder that enforces an opinionated DS.
- **Lovable:** two-way GitHub sync. Security record is the red flag: CVE-2025-48757 (RLS disabled in generated apps; CVE entry marked disputed), and an April 2026 platform bug that exposed chat history and source of public projects (https://cvemon.intruder.io/cves/CVE-2025-48757 and https://bastion.tech/blog/lovable-april-2026-data-breach; secondary sources, verify before citing internally).
- **Bolt/Replit:** Bolt "generates more bugs"; Replit is developer-feeling, two-way GitHub sync (Arteeva).
- **Magic Patterns:** imports component libraries (Chrome extension, Figma, Storybook). Source is vendor content: https://www.magicpatterns.com/blog/best-ai-design-tools.
- Net: each has its own DS-import mechanism, its own guardrails, its own accounts and billing. Ten designers on five tools means five places for drift. Fine for individual exploration; not the team standard.

**c. Prototype repo / playground (prototype kit pattern)**
- Strongest practitioner evidence: Notion's design team. A single Next.js repo, one namespaced folder per designer, shared DS components and tokens, no backend DB, external links to Figma/v0 prototypes. A `/deploy` command wraps git: checks `gh` auth, creates a named branch, commits, opens a PR, watches CI/lint and fixes, opens the result. Team merges after CI passes because the repo prioritizes prototypes over production-grade review. (https://chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows; episode: https://www.lennysnewsletter.com/p/i-havent-written-a-single-line-of, whose transcript summary did not give repo details). Brian Lovin also uses custom `/figma` and icon-search skills.
- Pros: designers cannot touch production; real DS import; one place to find all prototypes; CI can lint for token use; previews per branch.
- Cons: still need to teach branches and PRs at a minimum, or wrap them in a skill; a playground that gets popular tempts people to treat it as product; the DS package must be consumable (published or linked workspace).
- Design question for your DS: playground depends on DS as a versioned package (npm/private registry or git dependency) rather than copying files. Decide this early; it determines whether prototypes silently rot when the DS changes.

**d. Storybook / component playground in the DS repo**
- Storybook MCP gives agents component discovery, story authoring, and a11y/interaction tests. It is in preview, supports React/Angular/Vue Vite-based frameworks, and the docs toolset needs a components manifest (https://storybook.js.org/docs/ai/mcp/overview). Install per the LogRocket write-up: `npx storybook add @storybook/addon-mcp` (https://blog.logrocket.com/storybook-mcp-component-libraries/, secondary).
- Pros: highest DS fidelity; stories double as a component spec; preview/Chromatic-style review.
- Cons: wrong shape for multi-screen flows; puts designers inside the DS repo where mistakes propagate to every product team. Use as a **read-only knowledge source** (via MCP) for the playground, and as a contribution path for a few trained designers.

**e. Production repo on a branch with preview deployments**
- Knak: designers prototype in the production codebase on one git branch; setup was "one designer profile and three skill files", after a six-week tiger team made the repo safe; handoff time "cut roughly in half" (https://knak.com/blog/claude-code-streamlining-at-knak/; vendor/company blog; the piece gives few technical details on guardrails).
- Anthropic itself describes small pods where designers ship code and engineers design (search-summary level; I did not verify a primary source for the "pods of 5 AI Builders" claim) [unverified].
- Vercel: previews are created for every non-production branch push and PR, with branch-specific and commit-specific URLs (https://vercel.com/docs/deployments/environments). **Standard Protection** (all plans) protects previews but not production domains; Vercel Authentication, Password Protection, Passport and Trusted IPs are available by plan (https://vercel.com/docs/deployment-protection). Comments on previews are on by default and show up in the GitHub PR (https://vercel.com/docs/comments).
- Risks: previews can use real env vars; staged production deployments use **production** variables (Vercel docs above). Needs strict env separation.
- Use this for work that is actually going to ship, with an engineer, after promotion.

**f. Hybrids (recommended)**
- Explore (HTML/Claude Design/Figma Make/playground) → pick a direction → **promote**: rebuild or port into the production repo on a branch, paired with an engineer, using the same DS components. Reviews happen on the preview URL.
- Builder.io frames the end state as a PR as the design review, and the PR as the final gate (https://www.builder.io/blog/designers-ship-code-with-ai; vendor blog selling Fusion). Design Project's guidance: scope PRs to 80-200 lines (https://designproject.io/blog/claude-code-designer-workflow/).

### Recommended structure for this team

| Tier | Where | Who | Git exposure | Gate |
|---|---|---|---|---|
| 0. Explore | Claude artifacts / HTML / Claude Design (until 14 Dec) / Figma Make | anyone | none | none. Labeled "sketch" |
| 1. Prototype | Playground repo, own folder, DS as a dependency, preview deploy per PR | all designers, after a 1-day onboarding | Claude/skill handles branch+PR; designer reviews diff in desktop app | CI (lint, tokens, build); a design peer can merge |
| 2. Candidate | Same repo, "ready-for-eng" label, written spec of states and data | designer + lead | same | design-lead review |
| 3. Ship | Production repo branch/PR | 2-3 designated "design engineers" + engineering partner | real git | Engineering CODEOWNERS, normal review |

---

## 2. Git for non-git designers

### Principle
Minimize the surface: designers learn **four nouns** (main, branch, commit, pull request), and the platform makes the dangerous verbs impossible.

Mental model (practitioner): main = live trusted version, branch = sandbox, commits = snapshots, PR = formal review before merge. "Nothing on the real product moves until you and a developer both say yes." (https://www.designkey.studio/guides/claude-code-for-designers/part-1-git-and-claude-code).

### What the Claude Code desktop app gives non-engineers (official docs)

Source for all rows unless noted: https://code.claude.com/docs/en/desktop and https://code.claude.com/docs/en/desktop-quickstart.

| Feature | What it does for a designer | Caveat |
|---|---|---|
| Code tab, no terminal needed | Install the desktop app, pick a folder, chat. "The desktop app includes Claude Code, so you don't need to install Node.js or the CLI." | Requires a Pro/Max/Team/Enterprise plan. **Local sessions need Git installed** for worktrees (`git --version`; most Macs have it). |
| Worktrees per session | Each session can get its own worktree and branch (`worktree-<name>` under `.claude/worktrees/`), based on the default branch by default (`worktree.baseRef`). Auto-archives when PR merges/closes. Clean worktrees are removed on exit; worktrees with work prompt you to keep or remove. | Fresh checkout, so you must install deps there; `.env` is not copied unless listed in `.worktreeinclude`. Worktree docs: https://code.claude.com/docs/en/worktrees |
| Diff view | Click `+12 -1` to open per-file diff; comment on lines; Claude revises. `/code-review` gives grouped findings and can apply fixes. | Reading diffs is a skill to teach, see curriculum. |
| Live preview | Embedded browser; Claude starts the dev server (configured in `.claude/launch.json`), verifies with screenshots, reads console logs. Auto-verify on by default. | Ports, env vars, and install failures still happen; ship a working `launch.json`. |
| PR creation + monitoring | Claude can open a PR; status bar shows CI; optional **auto-fix** CI failures and **auto-merge** when checks pass. Needs GitHub CLI (`gh`) installed and authenticated; desktop prompts to install on Windows. | **Turn auto-merge off for designers** (or restrict via branch protection). Feature announced 20 Feb 2026: https://claude.com/blog/preview-review-and-merge-with-claude-code |
| Permission modes | Manual (asks before edits/commands), Accept edits, Plan (no edits), Auto (classifier-gated), Bypass (sandboxed containers only). Best practice: start in Plan, then Accept edits or Manual. | Admins can disable bypass/auto mode via `permissions.disableBypassPermissionsMode` / `disableAutoMode` in managed settings (https://code.claude.com/docs/en/permissions). |
| Skills / plugins / connectors | `/` menu for skills; Plugins via `+` (scoped to user, project, or local; orgs can manage centrally; not in cloud/WSL sessions); Connectors (MCP) for GitHub, Slack, Linear, etc. | Project skills and settings are read from the **main checkout root** in desktop worktree sessions, `CLAUDE.md`/rules load from the worktree. |
| Cloud sessions | Run on Anthropic infrastructure and continue when the app is closed. | No worktrees, no local plugin browser. |

### "Let Claude handle git" is legitimate
- Anthropic: developers describe what they want and Claude Code runs git/`gh` itself (secondary summary; I could not retrieve the primary on this) [unverified].
- Builder.io's setup guide tells designers to ask Claude to clone the repo and "get local dev working", and to ask engineers for `.env` files rather than paste secrets into Claude (https://www.builder.io/blog/claude-code-for-designers; vendor blog). It also insists designers must still handle commits, pushing and PRs, and warns about merge conflicts and environment drift.
- Design Project: Claude creates branches at the start of a task and commits as it goes, designers review (https://www.designkey.studio/guides/claude-code-for-designers/part-1-git-and-claude-code and https://designproject.io/blog/claude-code-designer-workflow/).
- Risk: delegating git to a model without limits. Counter with permission rules and hooks (Guardrails section).

### GitHub Desktop
- A visual diff/commit/push tool recommended in the Design Key guide as the safety net for seeing what changed (red/green lines). Useful as a "see what changed" view; the Claude desktop diff view overlaps with it. Optional, not required. [Official GitHub Desktop doc not fetched.]

### Platform-side safety (do this once, centrally)
1. **Branch protection / rulesets on `main`:** require PR, require status checks, block direct pushes, no force-push. (GitHub docs: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches. My fetch of that page returned no content, so these specifics are from general GitHub knowledge, not that fetch.) [unverified on this page]
2. **CODEOWNERS** + "Require review from Code Owners": any change to the DS dependency, config, `.github/`, `.claude/`, and CI files needs an engineer owner. Protect the CODEOWNERS file itself. Any one owner's approval suffices (https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners).
3. **"Designers never merge" rule:** in the playground repo a design peer may merge after CI passes (Notion merges after CI); in the production repo only engineers merge. Enforce with permissions (write access, but not merge/admin), not with policy docs.
4. **Preview URL as the review artifact:** reviewers click a link, comment on it, and see comments in the PR (Vercel Comments, https://vercel.com/docs/comments). The PR diff is for engineers; the preview is for design review.
5. **Deployment protection:** keep preview URLs behind Vercel Authentication or password so unreleased work and any accidental data are not public (https://vercel.com/docs/deployment-protection). Standard Protection is all plans; password protection is paid.
6. **Env separation:** previews get dummy/staging variables only; never production credentials (https://vercel.com/docs/deployments/environments).

### Recovery from mistakes (what to teach and what exists)
- **In-session undo:** `/rewind` (or Esc Esc) restores code and/or conversation to any prior prompt. Tracks Claude's file edits only. **Does not track changes made by Bash commands (`rm`, `mv`, `cp`), subagent edits, or external changes.** Not a replacement for version control. Snapshots expire after ~30 days by default (https://code.claude.com/docs/en/checkpointing).
- **Git undo:** because Claude works on a branch/worktree, the worst case is delete the branch and start again from `main`. Builder.io's analogy: cloning is like duplicating a Figma file; worst case is delete the folder and re-clone.
- **Commit often:** small, frequent commits make any step reversible (Design Project: commit as you advance, PRs 80-200 lines).
- **Escalation path:** one named engineer or Slack channel for "I think I broke git". Do not train designers on `reset --hard`, `rebase`, force-push.
- **Worktree safety net:** the desktop app prompts before deleting a worktree that has work; keep that default.

---

## 3. Guardrails that keep AI-coded prototypes on-system

Layered from soft (advice) to hard (enforced). Docs: Claude Code says CLAUDE.md is "context, not enforced configuration"; use hooks or permissions to block actions (https://code.claude.com/docs/en/memory).

| Layer | What | Strength | Source |
|---|---|---|---|
| **CLAUDE.md / rules** | Team-wide instructions: token names only, use DS components, folder conventions, "no raw hex", how to open a PR. Locations: managed policy (macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`), project, user, `CLAUDE.local.md`. Path-scoped `.claude/rules/`. Keep under ~200 lines per file; conflicting rules get picked arbitrarily. | Soft | https://code.claude.com/docs/en/memory |
| **Starter template** | The playground repo itself: pre-installed deps, working `launch.json`, example prototypes, DS package, CLAUDE.md. Cometeer's starter is a public example (tokens authority order, named tokens only, no raw hex) | Medium | https://try.cometeer.com/starter/CLAUDE.md |
| **Skills / slash commands** | Wrap hard things: `/deploy` (branch+commit+PR+CI watch), `/figma` (frame to code with verify loop), icon search to stop broken imports. Notion's pattern. | Medium | https://chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows |
| **Design system MCP / Storybook MCP** | Agent queries component list, props, docs before writing UI; reduces hallucinated props. Preview-stage. | Medium | https://storybook.js.org/docs/ai/mcp/overview |
| **Figma MCP + Code Connect** | `get_design_context`, `get_variable_defs`, `get_code_connect_map` map Figma components to code components and import paths; rules files for token usage. Rate limits: Starter/View/Collab seats get up to 6 tool calls/month; Dev/Full seats on paid plans get per-minute limits. Install via `claude plugin install figma@claude-plugins-official`. | Medium (needs Code Connect set up) | https://github.com/figma/mcp-server-guide |
| **Claude Design / `/design-sync`** | Pull React components and tokens into Claude Design as a design system; admin approval role locks the standard system. | Medium | https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design |
| **Lint and token validation in CI** | ESLint/stylelint rules that fail on hardcoded colors/spacing. Real examples: Atlassian `ensure-design-token-usage` (https://atlassian.design/components/eslint-plugin-design-system/ensure-design-token-usage); Firefox `use-design-tokens` stylelint rules (https://firefox-source-docs.mozilla.org/code-quality/lint/linters/stylelint-plugin-mozilla/rules/use-design-tokens/color.html). | **Hard** (blocks merge) | as listed |
| **Hooks** | `PreToolUse` can block a tool call (exit code 2), e.g. edits to `.env`, `package-lock.json`, `.git/`, the DS package, or `git push` to main. `PostToolUse` can run lint/format after each edit. `ConfigChange` can block settings edits. | **Hard** | https://code.claude.com/docs/en/hooks-guide |
| **Permission rules** | `deny` is evaluated first and beats allow. Example: deny `Bash(git push *)`, `Read(./.env)`. Known gap: a `Bash(git push *)` deny does not match `git -C . push`, so it is not a security boundary; pair with GitHub branch protection and, for OS-level enforcement, the sandbox. Managed settings can pin policy org-wide and disable auto/bypass modes. | Hard-ish | https://code.claude.com/docs/en/permissions |
| **Sandbox** | OS-enforced limits on files and network hosts for shell commands. macOS/Linux/WSL2; native Windows is unsandboxed. Covers shell only, not file tools, MCP or hooks. | Hard (for Bash) | https://code.claude.com/docs/en/sandboxing |
| **Branch protection + CODEOWNERS + required CI** | Server-side gate that does not depend on the designer's laptop. | **Hardest** | GitHub docs above |
| **Design review in PRs** | Define which UI changes need design review, a reviewer pool, previews in review, self-review checklist, tiered review to avoid bottlenecks. | Process | https://designsystemproblems.com/component-drift/pull-request-design-review/ |

Practical note: because desktop worktree sessions read settings, hooks and skills from the **main checkout's root**, put the guardrails in the repo's committed `.claude/` and make sure designers work from a clean clone, so it is the same policy for everyone.

Honest limit: AI self-review is unreliable. The Design Key case study had Claude make three mistakes (wrong aspect ratio, off-brand colors, overconfident self-review) all caught by human review (https://www.designkey.studio/guides/claude-code-for-designers/part-1-git-and-claude-code).

---

## 4. Learning path / curriculum

No single canonical curriculum for "designers + Claude Code + git" exists that I could verify. What exists: vendor/educator courses and one maturity model. The staged path below is my synthesis; each stage cites what supports it.

### Evidence found
- 1Password's five-stage AI maturity model for UX (limited, reactive, developing, embedded, leading); "embedded" = prototypes using real components. Model itself is in Figma, not fetched in full. (https://1password.com/blog/evolving-ai-maturity-for-our-user-experience-team)
- Mattermost's internal guide: idea to shareable URL in under an hour; sections on prerequisites/mental models, terminal basics, IDE setup (Cursor), first prototype, Figma connection, prompting patterns, cost. Child pages not fetched. (https://mattermost.atlassian.net/wiki/spaces/DES/pages/4460249102/Claude+Prototyping+Guide+for+Designers)
- Builder.io setup steps: clone via Claude, get local dev working, handle permission prompts, env vars via engineers, localhost fallback (https://www.builder.io/blog/claude-code-for-designers).
- Design Key and Design Project guides (git mental model; prompt structure "page, section, visual outcome, protect unchanged elements"; PR scoping).
- Paid courses: Maven "Claude Code for Designers" (https://maven.com/xinran/claudecodefordesigners, https://maven.com/hcaiinstitute/claude-code-for-designers). Not reviewed for content. [unverified quality]
- Claude Code has `/powerup` interactive lessons (https://code.claude.com/docs/en/common-workflows).
- Stats: Figma's 2026 report says designers participating in development rose from 21% to 41% (reported in a search summary of https://www.figma.com/resource-library/claude-code-for-designers/; I did not open the primary) [unverified].

### Proposed staged path (maps to environment tiers)

| Stage | Outcome | Minimum concepts (only these) | Time | Exit test |
|---|---|---|---|---|
| **0. See it** | Build and share an HTML sketch | what a prompt/plan is; open a `.html` in a browser; share a link | 0.5 day | Share a clickable sketch |
| **1. Run it** | Run the playground locally | Folder = project; what `localhost` is; start/stop the dev server (via desktop Preview); "install" (Claude does it); the Plan/Manual permission modes | 0.5 day | Open own folder's prototype on localhost |
| **2. Change it** | Make and keep a change safely | Branch = sandbox; commit = snapshot; read a diff (red/green); `/rewind`; ask Claude to explain a diff | 1 day | Make a change, review its diff, undo one step |
| **3. Share it** | Open a PR and a preview link | PR = request for review; CI check red/green; preview URL; responding to review comments | 1 day | Open a PR via `/deploy`, get a peer comment on the preview |
| **4. Make it on-system** | Output uses the DS correctly | Token vs hardcoded value; component props; reading the DS docs/Storybook; lint errors in plain language | 1-2 days over weeks | Lint passes, zero raw hex, only DS components |
| **5. Hand it off** | Engineer-ready candidate | State matrix (loading/empty/error); data shape; what not to ship (mock data, fake auth); writing a handoff PR; pairing with an engineer | ongoing | Engineer accepts PR scope without rework |
| **6. Design engineer** (2-3 people only) | Ship in the production repo | Production branching, CI, review etiquette, env vars, accessibility checks, debugging a failing build | n/a | Merged production PR reviewed by engineering |

Training principles:
- Teach concepts in **prompts, not commands**: "ask Claude to...". Have a skills library (`/deploy`, `/new-prototype`, `/check-tokens`) so designers do not memorize CLI.
- Pair people by skill; use Design Hour for show-and-tell of diffs.
- Make a one-page "when stuck" card: stop, `/rewind`, new branch, ask the channel.
- Do not require everyone to reach stage 5. Stage 3-4 is enough for most of the team.

---

## 5. Known failure modes and mitigations

| Failure mode | Evidence | Mitigation |
|---|---|---|
| **Prototype becomes production by accident** | Fast prototypes slip into production; teams make "a few tweaks" and ship (https://ckeditor.com/blog/vibe-coding-prototype-trap/). Anthropic/others: quality gates move downstream. | Separate repo and deploy target for prototypes; "PROTOTYPE" banner/footer baked into the template; explicit promotion step (rebuild or port with engineer); CODEOWNERS on anything importable from production; no shared database or auth. |
| **Design debt / orphaned prototypes** | Scope creep and knowledge erosion when builders leave (CKEditor). | Prototype folders have an owner and expiry date; archive quarterly; prototype index page. |
| **Off-system code** | Make kits fall back to generic components for undocumented variants (https://mantlr.com/blog/figma-make-limitations-2026, secondary); Goldfinch found loose spacing/size enforcement. | DS as package; token lint in CI; Storybook/Figma MCP; Code Connect; guidelines files; periodic token-usage report. |
| **Security: secrets and prod data** | Builder.io: companies do not store keys in repos, designers need engineering support; never paste secrets into Claude. Lovable RLS findings (secondary). Vercel staged production uses prod env vars. | `Read(./.env)` deny rules + hook blocking `.env` edits; `.worktreeinclude` only for dummy values; mock data only; preview protection; no prod credentials on designer machines; sandbox on. |
| **Engineers reject AI code / review burden** | Secondary data: AI PRs larger and slower to get reviewed (e.g. 2.6x larger, 4.6x longer to first review; 32.7% vs 84.4% 30-day acceptance in one summary; methodology not verified) [unverified]. See https://octopus-review.ai/blog/engineers-pick-smaller-pr-ai-ones-wait-longer (secondary). Builder.io pitfalls: bypassing architectural decisions, treating visual polish as sufficient. | Keep designer PRs in the playground (no engineering review needed there); production PRs scoped to 80-200 lines; engineer pairing; PR template with preview link + states checklist; CI does the objective checks; design owns visual QA, engineering owns logic. |
| **Designers spend all their time debugging** | Builder.io: terminal intimidation, per-repo setup repetition, environment drift, merge conflicts, individual-focus. | Pre-built template with working `launch.json`; "reset to clean" skill; office hours; cap debugging time (30 min, then ask); keep the DS version pinned so updates are deliberate. |
| **Uneven skill across the team** | Observed in maturity-model framing (1Password: early adopters prototype impressive but shallow work). | Tier system; pairing; skills encode expertise; share working prompts and skills; do not make Stage 5 a performance expectation. |
| **Over-trusting AI self-review** | Design Key case: three misses incl. overconfident self-review. | Human check on preview; a11y tests via Storybook MCP testing toolset; contrast and keyboard checks in CI. |
| **Hosted-builder sprawl** | Five tools = five guardrail setups. | Approve a short list; the playground is default; builders for tier 0 only. |
| **Auto-merge / auto-fix misuse** | Desktop can auto-merge PRs once checks pass (docs). | Disable for designers; branch protection requires a human approval. |
| **Cost/usage surprises** | Goldfinch: Claude Design burned its weekly allowance quickly. Mattermost guide has a cost section. | Track per-seat usage; use Plan mode first; pick models deliberately. |

---

## 6. Open questions to resolve before rollout

1. **How is the DS consumed?** Published npm/private registry vs workspace link. Decides upgrade strategy and Figma Make kit eligibility (needs npm package, Vite-compatible).
2. **Is Claude Design allowed in your Enterprise org?** Artifacts and design systems default Off on Enterprise; ZDR orgs cannot enable. Deadline 14 Dec 2026 for standalone projects. Whether to bother at all given the closure.
3. **GitHub org permissions:** can designers have write without merge on the production repo? Do rulesets exist? [needs a check in your org]
4. **Vercel plan:** which deployment protection is available for previews on your plan; where is the preview data coming from?
5. **Pave-specific:** the `pave-design-system` MCP already in this environment (tools: component_match, validate_css, tokens, conventions) is effectively the "design system MCP" layer for section 3. Confirm whether it is the one designers will use, and whether it enforces anything beyond advising.

---

## Source index

Official / primary
- Claude Design launch: https://www.anthropic.com/news/claude-design-anthropic-labs
- Claude Design migration/closure: https://support.claude.com/en/articles/17440474-migrate-from-standalone-claude-design-to-claude
- Claude Design getting started: https://support.claude.com/en/articles/14604416-get-started-with-claude-design
- Claude Design DS setup: https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design
- Claude Design admin guide: https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans
- Cowork/chat merge, 16 Sep 2026: https://claude.com/blog/cowork-is-now-claude
- Claude Code desktop: https://code.claude.com/docs/en/desktop ; quickstart: https://code.claude.com/docs/en/desktop-quickstart
- Worktrees: https://code.claude.com/docs/en/worktrees
- Checkpointing: https://code.claude.com/docs/en/checkpointing
- Hooks guide: https://code.claude.com/docs/en/hooks-guide
- Permissions: https://code.claude.com/docs/en/permissions
- Memory/CLAUDE.md: https://code.claude.com/docs/en/memory
- Sandboxing: https://code.claude.com/docs/en/sandboxing
- Common workflows: https://code.claude.com/docs/en/common-workflows
- Preview/review/merge announcement: https://claude.com/blog/preview-review-and-merge-with-claude-code
- How Anthropic teams use Claude Code: https://claude.com/blog/how-anthropic-teams-use-claude-code
- Figma MCP guide: https://github.com/figma/mcp-server-guide
- Figma Make kits: https://help.figma.com/hc/articles/43602872461079
- Storybook MCP: https://storybook.js.org/docs/ai/mcp/overview
- Vercel environments: https://vercel.com/docs/deployments/environments
- Vercel deployment protection: https://vercel.com/docs/deployment-protection
- Vercel comments: https://vercel.com/docs/comments
- GitHub CODEOWNERS: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitHub protected branches: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches

Practitioner / secondary
- Notion Prototype Playground (ChatPRD How I AI): https://chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows
- Lenny's / How I AI episode: https://www.lennysnewsletter.com/p/i-havent-written-a-single-line-of
- Knak: https://knak.com/blog/claude-code-streamlining-at-knak/
- Design Key, Git and Claude Code: https://www.designkey.studio/guides/claude-code-for-designers/part-1-git-and-claude-code
- Design Project, wireframe to PR: https://designproject.io/blog/claude-code-designer-workflow/
- Goldfinch, Claude Design to code: https://www.goldfinch.me/blog/from-design-system-to-deployed-code-a-weekend-with-claude-design
- Anna Arteeva tool comparison (Nov 2025): https://annaarteeva.substack.com/p/choosing-your-ai-prototyping-stack
- Mattermost designer guide: https://mattermost.atlassian.net/wiki/spaces/DES/pages/4460249102/Claude+Prototyping+Guide+for+Designers
- Cometeer prototype starter CLAUDE.md: https://try.cometeer.com/starter/CLAUDE.md
- 1Password AI maturity model for UX: https://1password.com/blog/evolving-ai-maturity-for-our-user-experience-team
- Design system PR review: https://designsystemproblems.com/component-drift/pull-request-design-review/
- Atlassian token lint rule: https://atlassian.design/components/eslint-plugin-design-system/ensure-design-token-usage

Vendor content (treat as marketing)
- Builder.io for designers: https://www.builder.io/blog/claude-code-for-designers ; PR design review: https://www.builder.io/blog/designers-ship-code-with-ai
- Magic Patterns comparison: https://www.magicpatterns.com/blog/best-ai-design-tools

Weak/secondary (verify before citing)
- Prototype trap: https://ckeditor.com/blog/vibe-coding-prototype-trap/
- Lovable incidents: https://bastion.tech/blog/lovable-april-2026-data-breach ; https://cvemon.intruder.io/cves/CVE-2025-48757
- Figma Make limits: https://mantlr.com/blog/figma-make-limitations-2026
- AI PR review stats: https://octopus-review.ai/blog/engineers-pick-smaller-pr-ai-ones-wait-longer
- Claude Design coverage: https://techrepublic.com/article/news-anthropic-claude-design-overhaul-enterprise-teams
