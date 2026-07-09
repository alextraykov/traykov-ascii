# Case Study IA Assessment

Date: 2026-07-04

## Short Verdict

The current Astro portfolio has too many routable "case studies" competing for attention.
The old `/Users/atraykov/Downloads/traykov-design-portfolio` structure is objectively
clearer because it separates authored portfolio stories from raw evidence, screenshots,
screen-level notes, and archive material.

Current state:

- 33 routable portfolio-like entries in `case-studies/`.
- 18 of those are Pave entries.
- 7 are Quickbase entries.
- 2 are Synapse-Sys entries.
- 1 is PointLearn.
- 5 are old archived projects.

Old downloaded structure:

- 10 authored case-study markdown files.
- 1 principal-case summary.
- Raw evidence stays in `raw/`, `assets/`, and working files.
- The static site sidebar promotes a small ordered reading path instead of a gallery of every artifact.

The old model is the better portfolio model.

## What Is Wrong With The Current Shape

### 1. Evidence Pages Are Being Promoted As Case Studies

Several current Pave routes are useful evidence, but they are not standalone portfolio cases:

- `pave-home`
- `pave-builder`
- `pave-landing`
- `pave-email-templates`
- `pave-notifications`
- `pave-billing`
- `pave-chat-window`
- `pave-inspector-canvas`
- `pave-billing-plg`
- `pave-projects`

These should be sections, media blocks, or supporting evidence inside a larger Pave story.
They should not appear as peer case-study cards.

### 2. Pave Is Over-Fragmented

Pave is the strongest story, but the current route map weakens it by splitting one product arc
into too many pages. A reviewer should not have to infer the relationship between MVP,
planning, direct edit, credits, marketplace, billing, and component evidence.

Recommended consolidation:

- Primary case: `Building Pave`
- Supporting case: `Creating the Design Environment for Pave`
- Optional supporting case: `Blinq -> Pave`, only if the rebrand/access/journey story is strong enough.

Everything else should be folded into those.

### 3. Quickbase Is Mostly Right, But Needs Priority

The old structure had a reasonable Quickbase set:

- ALM Environments
- Pipelines
- Connection Central
- AI Surfaces
- Design Systems and AI Practice
- Design Leadership and Operations
- Foundations 2022-2024

That is still too much for a first-pass gallery, but it is coherent. These are authored stories,
not screen fragments. The fix is prioritization, not aggressive deletion.

Recommended public priority:

1. Pipelines
2. ALM Environments
3. Connection Central
4. Design Systems and AI Practice
5. Design Leadership and Operations
6. Foundations 2022-2024 as background or appendix
7. AI Surfaces folded into Pipelines, Design Systems, or Pave unless it gets stronger evidence

### 4. Synapse-Sys Should Be One Case Study

Current routes:

- `synapse-sys`
- `designing-synapse-sys`

These should be one case study. The visual-language route is supporting material for the product
case, not a separate peer case.

### 5. PointLearn Is Fine As Recent Work, But Not A Core Portfolio Pillar Yet

PointLearn currently reads like a short in-progress case. It can stay on the homepage as a recent
case study, but it should not carry the same weight as Pave, Pipelines, or ALM until it has more
evidence and a stronger outcome.

### 6. Old Work Belongs In Archive Only

The old work entries are routeable, which is fine. They should not be mixed into the main portfolio
map except under an explicit archive section.

## Recommended Public IA

### Homepage

Keep the current homepage direction:

1. Pave
2. Synapse-Sys
3. PointLearn

Then a single CTA:

- View older work -> `/case-studies/`

This matches the user's requested recent-work framing.

### Work / Portfolio Map

The Work page should not be a dump of every route. Recommended sections:

1. `Featured Case Studies`
   - Building Pave
   - Pipelines
   - ALM Environments
   - Connection Central
   - Creating the Design Environment for Pave

2. `Recent Experiments`
   - Synapse-Sys
   - PointLearn

3. `Leadership And Systems`
   - Design Systems and AI Practice
   - Design Leadership and Operations
   - Foundations 2022-2024

4. `Archive`
   - Bolt.fun
   - Alby Browser
   - Brewculator
   - The Improved Mind
   - We-are Design

Do not show the Pave surface/component evidence as cards. Surface evidence should live inside the
Pave case, as anchors or expandable evidence sections.

## Route Disposition

### Keep As Primary Or Secondary Case Studies

| Current route | Recommendation |
| --- | --- |
| `designing-pave` | Rename/reshape into `building-pave` or merge into old `08-building-pave` structure |
| `building-pave-environment` | Keep as `creating-the-design-environment-for-pave` |
| `pipelines` | Keep |
| `alm-environments` | Keep |
| `connection-central` | Keep |
| `design-systems-ai-practice` | Keep, but not homepage |
| `design-leadership-operations` | Keep, but not homepage |
| `foundations-2022-2024` | Keep as background/appended arc |
| `synapse-sys` | Keep, merged with visual-language material |
| `pointlearn` | Keep as recent/in-progress |

### Merge Into Building Pave

| Current route | Target |
| --- | --- |
| `blinq-pave-rebrand` | Building Pave or optional Blinq -> Pave subsection |
| `pave-building-loop` | Building Pave |
| `pave-planning` | Building Pave |
| `pave-direct-edit` | Building Pave |
| `pave-credits` | Building Pave |
| `pave-marketplace` | Building Pave |
| `pave-home` | Building Pave evidence |
| `pave-builder` | Building Pave evidence |
| `pave-landing` | Building Pave evidence |
| `pave-email-templates` | Building Pave evidence |
| `pave-notifications` | Building Pave evidence |
| `pave-billing` | Building Pave evidence |
| `pave-chat-window` | Building Pave evidence |
| `pave-inspector-canvas` | Building Pave evidence |
| `pave-billing-plg` | Building Pave evidence |
| `pave-projects` | Building Pave evidence |

### Merge Into Existing Cases

| Current route | Target |
| --- | --- |
| `designing-synapse-sys` | `synapse-sys` |
| `ai-surfaces` | Pipelines, Design Systems, or Pave depending on strongest evidence |

### Archive Only

| Current route | Recommendation |
| --- | --- |
| `bolt-fun` | Archive |
| `alby-browser` | Archive |
| `brewculator` | Archive |
| `the-improved-mind` | Archive |
| `we-are-design` | Archive |

## Implementation Recommendation

Do not delete content first. Add an indexing concept first:

- Add frontmatter such as `index: false` or `portfolioLevel: evidence`.
- Keep evidence pages routeable while removing them from `/case-studies/`.
- Build a new curated `caseStudyCollections` map in `src/lib/content.ts`.
- Make `/case-studies/` follow the old portfolio structure, not the current file tree.
- Later, physically merge content once the curated IA is stable.

This gives the site the old portfolio's clarity without losing source material.

