# Agent Role Contracts

## Primary Orchestrator

Keep the primary Sol agent responsible for intent, architecture, classification, exact file ownership, acceptance criteria, diff inspection, verification, and the human handoff. Allow only one spawned agent at a time and close the implementer before starting the fresh reviewer.

Give every implementer this five-part contract:

1. **Objective:** one observable outcome.
2. **File ownership:** the exact files it may edit.
3. **Interfaces:** behavior and contracts it must preserve or add.
4. **Constraints:** repository rules, exclusions, and authority boundaries.
5. **Verification and evidence:** commands, browser states, and report format required for acceptance.

Require the implementer to return files changed, checks and outcomes, browser evidence, and residual risk. Inspect the actual diff and rerun verification; do not accept the report alone.

## Routing And Escalation

- Delegate clear content/frontmatter, scoped Astro/CSS/JS, harness, and mechanical work to `luna_implementer`.
- Delegate shared CSS or motion, renderer/routing, WebGL, contact/security, cross-cutting browser debugging, and Luna rescue work to `terra_implementer`.
- Do not loop a failed Luna attempt. Rewrite the contract and escalate to Terra.
- Give Terra at most one corrected attempt before replanning in the primary thread.
- Do not use Ultra or parallel writers.
- If the required custom agent is unavailable, keep the work in the Sol primary and disclose the routing deviation; do not silently substitute an unpinned agent.

## Final Reviewer

After deterministic checks pass, record `git status --short` and the relevant diff, close the implementer, then invoke `portfolio_reviewer` with the diff, verification output, browser evidence, and editorial sources when applicable.

Treat read-only mode as requested rather than guaranteed because parent runtime permissions may override it. Compare repository status before and after review. Reject a review that mutates the tree.

Accept `ship`, or address `fix-first` once through the appropriate worker and rerun affected checks. A second review disagreement or `rethink` returns to the human owner.
