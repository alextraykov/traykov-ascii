# Codex Harness

This repository uses deterministic local/CI checks as merge gates and subscription-backed Codex as an advisory orchestration and review layer. It adapts the role contracts from [Sol Advisor](https://github.com/DannyMac180/sol-advisor) locally; the external plugin is neither installed nor vendored.

## Model and cost policy

| Role | Model | Use |
| --- | --- | --- |
| Primary orchestrator | GPT-5.6 Sol, High | Own intent, architecture, exact worker contracts, diff inspection, acceptance, and human handoff. |
| Routine implementer | GPT-5.6 Luna, Max | Clear content/frontmatter, scoped Astro/CSS/JS, harness, and mechanical work with deterministic acceptance. |
| Complex implementer | GPT-5.6 Terra, Max | Shared CSS/motion, renderer/routing, WebGL, contact/security, cross-cutting browser debugging, or Luna rescue. |
| Final reviewer | Fresh GPT-5.6 Sol, High | Read-only requested owner review after deterministic checks pass. |

Only one subagent may be active. Close the implementer before review; do not use Ultra or parallel writers. A failed Luna attempt escalates to Terra rather than looping. Terra gets at most one corrected attempt before Sol replans. A `fix-first` verdict allows one fix-and-review cycle; `rethink` or repeated disagreement returns to the human owner.

Current official pricing gives Luna roughly one-tenth Terra's and one-twenty-fifth Sol's token-credit rate. Plus currently lists approximately 10–100 Sol, 25–200 Terra, or 250–2,000 Luna local messages per shared five-hour window, with task-dependent variation and possible weekly limits. Recheck [model guidance](https://developers.openai.com/api/docs/guides/latest-model), [Codex model selection](https://learn.chatgpt.com/docs/models), and [pricing](https://learn.chatgpt.com/docs/pricing) before changing pins.

The [Voxyz](https://x.com/Voxyz_ai/status/2083545774768402673), [Dan McAteer](https://x.com/daniel_mac8/status/2083607027813662810), and [Tibo](https://x.com/thsottiaux/status/2082883636177916306) posts motivated testing Luna Max as the routine worker. Their historical discount percentages and claims about the provider-managed GitHub review model are not configuration guarantees and are not used as hard assumptions.

## Normal workflow

1. Inspect and preserve the worktree. Create a separate `codex/` worktree for substantial work.
2. Invoke `$portfolio-change`. Sol classifies the change and gives one worker the objective, exact file ownership, interfaces, constraints, and required evidence.
3. Inspect the worker's actual diff and rerun targeted checks.
4. Run `npm run check` and inspect affected routes manually where visual judgment or successful GPU rendering matters.
5. Record `git status --short`, close the worker, and invoke `portfolio_reviewer`. Verify status did not change during review.
6. Let the human owner decide whether to merge.

If custom agents are unavailable, keep the task in the Sol primary and disclose the deviation. Do not silently substitute an unpinned model.

## Developer interfaces

| Command | Contract |
| --- | --- |
| `npm run check:fast` | Run repository verification and build. |
| `npm run check:browser` | Run the built site through the 42-case core browser matrix plus focused fallback assertions. Requires `dist/`. |
| `npm run check` | Run both hard-gate layers. |
| `npm run audit:visual` | Capture report-only screenshots and layout diagnostics. |
| `npm run audit:routes` | Inspect every generated route without palette enforcement. |
| `npm run audit:performance` | Report advisory loading and resource measurements. |

The preview runner selects an isolated localhost port and owns preview/child cleanup. Its 42-case core matrix covers `/`, `/case-studies/`, both public case studies, `/about/`, `/contact/`, and `/notes/the-cemetery-loop/` at 1440×1000 and 390×844 in normal, no-JS, and reduced-motion modes. A focused no-JS fallback assertion also covers `/labs/sketchbook/` at both viewports. It gates navigation/redirects, primary content, document overflow, navigation wrapping, uncaught errors, same-origin resources, and rest-state motion. On failure it writes JSON and screenshots under `audit-artifacts/browser-contract/`; a passing run removes stale contract evidence.

Headless WebGL may use the readable fallback. Successful GPU rendering remains a manual affected-route check. Deterministic media-size budgets stay in `npm run verify`; visual, all-route, and performance audits remain advisory.

## CI and GitHub review

The `quality` workflow uses Node 24, `npm ci`, Chromium, and `npm run check`. Superseded PR runs are cancelled and failure evidence is retained for seven days. Run it in shadow mode for three representative pull requests before making it the only required harness check.

Codex GitHub review is advisory and provider-managed. Enable automatic reviews only through the subscription-backed Codex GitHub integration. Do not add an API key, `openai/codex-action`, `@codex fix`, automatic model-authored changes, or automatic merges. Use local `/review` or `portfolio_reviewer` when the integration is unavailable.

## First-ten-change calibration

Promote a class from Luna to Terra when two changes in that class require Terra rescue or one Luna change causes a hard browser-contract violation.

| # | Change class | Worker lane | Effort | Retries | `npm run check` | Reviewer verdict/findings | Escalation or notes |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| 1 | WebGL cemetery renderer | standard Terra fallback writer | Max | 2 visual correction cycles + 1 material micro-adjustment | pass | reviewer pending | pinned profile unavailable |
| 2 | Cross-cutting UI + SEO | Terra Max | Max | 0 | pass | ship after one booking-fallback fix-first cycle | Custom worker role was unavailable; Terra was pinned explicitly. Hard gate passed before the concurrent cemetery/WebGL contract expansion. |
| 3 | Local evidence-backed Note | Sol primary (Luna unavailable) | High | 0 | pass | pending | Local-first AI-product-design Note; generated route has one H1, local canonical/schema, and sitemap membership. |
| 4 | ASCII Banner Studio animation + recording controls | Terra Max | Max | 0 | pass | reviewer pending | Vortex/Flow use stateful physics; Interference/Topography use seeded procedural evolution; Cells use the rebirth lifecycle. Native fullscreen needs manual follow-up because the available browser rejected the fullscreen API. |
| 5 | Local Note + display-only Flow field sketch | Terra Max | Max | 0 | pass | reviewer pending | Reuses the existing Banner Studio Flow preset without exposing its controls. |
| 6 |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |  |
