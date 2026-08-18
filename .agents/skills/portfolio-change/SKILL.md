---
name: portfolio-change
description: Implement and verify changes to the Traykov ASCII Astro portfolio. Use for content or frontmatter edits, Astro component and route changes, shared CSS or motion work, Three.js/WebGL turntables, the custom case-study renderer, and the contact API when Codex must select the correct deterministic and browser checks before handoff.
---

# Portfolio Change

Follow `AGENTS.md` for design, content, review, and protected-file rules. Use this skill to route, implement, verify, and review portfolio changes. Read [references/role-contracts.md](references/role-contracts.md) before delegating implementation or final review.

## 1. Protect the Worktree

1. Inspect `git status --short` and the relevant diff before editing.
2. Treat pre-existing changes as user-owned. Do not stash, reset, reformat, or overwrite them.
3. Identify the smallest affected route set and files. Ask only when the requested outcome cannot be inferred safely.

## 2. Classify the Change

| Class | Typical paths | Extra verification |
| --- | --- | --- |
| Content | `case-studies/`, `src/content/` | Inspect rendered headings, media, links, and factual claims on the affected route. |
| UI, CSS, or motion | `src/components/`, `src/pages/`, `src/styles/global.css`, `src/scripts/motion/` | Check desktop and mobile, normal motion, reduced motion, no-JS readability, and both themes when appearance changes. |
| Routing or renderer | `src/lib/content.ts`, dynamic routes, `vercel.json` | Preserve slug/frontmatter/heading contracts; test canonical and legacy routes. |
| Turntable or WebGL | turntable components/scripts, shader assets | Check keyboard controls, successful rendering in a capable browser, readable fallback, reduced motion, and bounded retries. |
| Contact API | `api/contact.js`, `tests/contact-api.test.mjs` | Run the contact tests without sending external messages; preserve fixed-recipient and anti-abuse behavior. |

Apply every matching row for mixed changes.

## 3. Route Through The Harness

1. Keep Sol High in the primary thread as orchestrator and acceptance owner.
2. Delegate clear, bounded implementation to `luna_implementer` at Max.
3. Delegate shared CSS/motion, routing/renderer, WebGL, contact/security, cross-cutting browser debugging, or one failed Luna task to `terra_implementer` at Max.
4. Keep one subagent active at a time. Never use parallel writers or Ultra.
5. Give the worker the five-part contract from the role-contract reference. Do not let it expand file ownership.

## 4. Implement and Verify

1. Make the smallest in-scope change and preserve unrelated diffs.
2. Run targeted tests while iterating.
3. Run `npm run check` before handoff. Use `npm run check:fast` when browser work is temporarily blocked, and state that the task is not complete.
4. Use `npm run audit:visual`, `npm run audit:routes`, or `npm run audit:performance` only as diagnostics; they are not merge gates.
5. Inspect the affected route interactively. For WebGL work, confirm both GPU success and fallback behavior because headless CI only guarantees the fallback contract.
6. Inspect the worker's actual diff and rerun its checks. Close the worker before review.
7. After deterministic checks pass, record repository status and invoke `portfolio_reviewer` once. Verify the reviewer did not mutate the tree. Address one `fix-first` cycle, then rerun affected checks; return `rethink` or repeated disagreement to the owner.

## 5. Hand Off Evidence

Report changed behavior, worker lane and retries, exact checks run, routes and browser states inspected, reviewer verdict/findings, and residual risk. For the first ten harnessed changes, add one row to `docs/codex-harness.md`.
