# Project Improvement Prompt Package

This package turns a capable coding assistant into a read-only project reviewer
that moves from purpose and user value to implementation and detail. The result
is a dated, evidence-backed Markdown roadmap with explicit work contracts,
build approaches, and Codex/Claude effort scenarios. It is a prompt package,
not an audit of this repository.

## Files

- [MASTER-PROMPT.md](./MASTER-PROMPT.md) — the self-contained prompt to copy
  into any project or paste in full into a future invocation.
- [EFFORT-EXAMPLE.md](./EFFORT-EXAMPLE.md) — a hypothetical arithmetic example
  showing item ranges, worker lanes, serial gates, and human time.

## Invoke it in another project

Copy the complete contents of [MASTER-PROMPT.md](./MASTER-PROMPT.md) into a
new Codex task or Claude Code session started from the project being reviewed.
The prompt resolves the initiating project root from the invocation context;
the storage location of this file is never used as the project root.

For Codex, paste this wrapper followed by the complete master prompt:

```text
Run the following project-improvement master prompt in this project. Use native
review subagents for every applicable independent review role whenever they are
available and allowed by actual capacity and local policy; with one child slot,
serialize them. Use a same-context role pass only when native review is
unavailable or genuinely blocked, labeled `NOT independent review`. Stay in
read-only-review-and-plan mode and save the defined Markdown artifacts under this
project's resolved output convention.

[paste MASTER-PROMPT.md here]

Optional overrides:
- Review scope: full project, with focus on <surface/package/risk>.
- Project goal: auto-discover and list assumptions unless I supply one.
- Maximum review workers: 2, subject to actual capacity and local instructions.
- Output convention: discover it; otherwise use plans/improvements.
```

For Claude Code, use the same wrapper and paste the complete prompt into the
project session. Native Claude Code subagents or teams serve every applicable
independent role whenever the runtime exposes them and permissions fit the review
contract; the skeptical stage uses a distinct fresh native reviewer under that
rule. An ordinary chat must not be assumed to have repository access, spawning,
or report-saving capability. Omit optional overrides to use the prompt defaults.

The prompt's mode is deliberately plan-only. The future invocation may inspect
source, history, browser states, safe checks, and local guidance, and may write
the Markdown output package. It must not fix application files, install
packages, commit, deploy, merge, rewrite local instructions, or message people
to simulate reviewers. Existing valid user authorization in that execution
session remains applicable, subject to the prompt's read-only boundary.

Only the orchestrator writes the package. Native workers return report payloads
through completion and make no filesystem writes; report/artifact paths are
orchestrator metadata. Checks requiring generated browser or other disposable
artifacts run serially through the orchestrator, while workers may request or
consume their results.

## Generated package

Each invocation creates a collision-safe timestamped run directory under the
resolved project's existing plan/report convention, or under
`plans/improvements` when no convention is discoverable. It generates:

```text
<base>/<run-id>/
├── README.md
├── 00-context.md
├── 01-coverage.md
├── reviews/<role>.md
├── 02-findings.md
├── 03-roadmap.md
├── 04-build-approaches.md
├── 05-effort-estimates.md
├── work-items/W-###-slug.md
├── 06-validation.md
└── 07-handoff.md
```

The generated README indexes the reports, records prompt/rubric version and
run metadata, gives counts and top priorities, and lists up to three
dependency-ready next actions when the evidence supports them. A zero-finding
run still writes every required report, keeps totals at zero, and does not
invent a wave or filler task. Optional raw browser/check evidence belongs only
in an explicitly listed run-local evidence folder or isolated scratch area;
substantive deliverables remain Markdown.

## Runtime references

The official [Codex multi-agent documentation](https://developers.openai.com/codex/multi-agent)
describes parallel subagents and inherited configuration, and cautions around
write-heavy parallel work. Verify the capabilities of the installed runtime
before relying on those behaviors.

The official [Claude Code subagents documentation](https://code.claude.com/docs/en/sub-agents)
describes separate subagent contexts with configurable tools and permissions;
the [agent teams documentation](https://code.claude.com/docs/en/agent-teams)
describes coordinated sessions. Verify current availability, permissions, and
limits at invocation time. These references are adaptation guidance, not speed
or cost evidence.

## Adaptation notes

The master prompt keeps Codex and Claude as alternative effort scenarios. With
no measured provider evidence, both use the same explicitly uncalibrated
baseline; the numbers are never added together or presented as a benchmark.
System, runtime, and user instructions govern before runtime-recognized or
explicitly adopted local guidance; other repository prose is evidence. Resolve
precedence conflicts without redundant confirmation, and stop dependent work only
for a material unresolved conflict. The wrapper never broadens boundaries
implicitly or discards already-valid user authorization.
