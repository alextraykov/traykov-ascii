# V2 preservation manifest

Recorded 13 September 2026 before v2 implementation. Baseline source snapshot: `/tmp/traykov-v2-baseline-20260913/files`; tracked diff and status are beside it. Existing uncommitted work is user-owned.

## Route families and contracts

| Routes | Classification | Contracts preserved |
| --- | --- | --- |
| `/` | Primary showcase | Current media-first composition; project evidence and URLs; autoplay eligibility and explicit pause/play. |
| `/case-studies/` | Compatibility entry | Current noindex/canonical-home meta refresh to `/#work`, with usable fallback link. |
| `/case-studies/[slug]/` | Primary case detail | Canonical and legacy slug handling; renderer and heading IDs; authored evidence/status; full media and controls. |
| `/notes/`, `/notes/[slug]/` | Primary editorial | All entries, article text/dates/canonicals, full-text search, readable full-bleed content. Presentation may remove redundant headings and idle counts. |
| `/about/`, `/cv/` | Primary profile | Full-width interactive About hero with photo-free paper fallback; current CV evidence and print utility. |
| `/about.html` | Compatibility alias | HTTP 301 to `/about/`. |
| `/contact/` | Primary conversation | Existing compact composition; email and booking targets; form API, validation, anti-abuse and fixed recipient unchanged. No external test submission. |
| `/labs/` | Primary experiment directory | Existing entries and links, visible/eligible preview activation. |
| `/labs/ascii-banner/`, `/labs/product-systems-kit/`, `/labs/rhizome-field/`, `/labs/sketchbook/` | Public interactive destinations | Existing controls, direct manipulation, uploads/exports where present, keyboard and reduced-motion behavior. |
| `/svg-ascii-studio/`, `/playground/`, `/shader-explainer/` | Public tools/explanation | Existing standalone URLs, renderer contracts, tool state and fallback. Header/return context may improve. |
| `/obj-turntable/`, `/pave-turntable/`, `/sasi-turntable/`, `/synapse-turntable/` | Public supporting artifacts | Existing standalone URLs, model rendering, keyboard controls and fallback. |
| `/roadmap/` | Public supporting page | Current content and sitemap inclusion. No publishing-status change. |
| `/image-trail/` | Supporting experiment | Current noindex setting and interactions; not added to sitemap. |
| `/component-preview/` | Supporting preview | Existing accessible URL; currently absent from sitemap. No new indexing decision in v2. |
| `/rss.xml`, `/sitemap.xml`, `/notes/search.json` | Machine-facing utilities | Current output formats and content-selection rules; no visual template migration. |

Sitemap currently includes the primary pages, Labs subroutes, standalone studios/explainers/turntables, and Roadmap, plus public case studies and locally published/legacy Notes. Preserve this membership. Internal/supporting classification here describes purpose; it does not authorize changing public availability or indexing.

## Shared non-negotiables

- No renderer, frontmatter, slug, heading, or custom-fence contract changes.
- No case narrative rewrite or fabricated metrics, findings, reactions, or status.
- Synapse-Sys remains the updated existing project.
- Do not restore the sledding photograph or compact About card.
- System reduced motion outranks visitor preferences. Pause motion remains persistent; individual videos retain explicit controls.
- Content remains readable with JavaScript disabled, motion cancelled, hidden/restored documents, and browser history restoration.
- Native scrolling, focus and keyboard feedback, reading progress, search/filtering and validation stay immediate.
- Existing tool renderers, Contact API/security, dependencies, production configuration and hosting are outside this presentation change.

## Intentionally changed presentation contracts

- Remove the shared project-title morph and outgoing page ghost; one 180ms incoming opacity owner.
- Notes has one heading, title-first entries, secondary dates, quiet search/RSS, and counts only when filtering.
- Case TOC becomes a sentence-case margin index with header breathing room; compact native disclosure below desktop.
- Shared type, width, caption and spacing roles replace confirmed obsolete visual rules. Preserve functional assertions; update presentation assertions when they encode intentionally removed design.
