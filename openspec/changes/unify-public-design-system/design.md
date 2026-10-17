## Context

See [proposal.md](proposal.md) for motivation. The portfolio is an Astro site with one shared `global.css`, an existing theme token layer, route-level Astro shells, a line-based case renderer, native browser APIs, and a closed motion vocabulary. Existing public routes and visual identities must remain compatible.

## Goals / Non-Goals

**Goals:**

- Create one calmer visual rhythm across public routes without adding dependencies or splitting the shared CSS.
- Remove repeated eyebrow/category metadata and defensive authorship language from public shells.
- Keep case and lab identity scoped, make useful content states visible, and maintain light/dark, responsive, keyboard, touch, no-JavaScript, and reduced-motion parity.

**Non-Goals:**

- Rewrite imported legacy/Substack prose, alter content parsing/routing/slug behavior, rebuild WebGL/turntables, or redesign excluded diagnostic pages.
- Claim new metrics or outcomes, add a motion library, or change contact delivery behavior.

## Decisions

### Tokenized editorial shell

Extend the existing root tokens and semantic classes rather than introduce a second stylesheet or component library. Route markup removes redundant context where it originates; the final shared CSS layer aligns typography, spacing, surfaces, cards, fields, and focus states. This protects all routes that already consume the shared shell. A page-by-page redesign was rejected because it would duplicate state behavior and fragment theme support.

### Factual card and prompt anatomy

`ProjectCard` derives compact metadata from status/read time and no longer accepts an arbitrary eyebrow. `CaseContactPrompt` accepts title/body only and presents one direct contextual invitation. This removes decorative repetition without changing study data, links, or booking fallback behavior. Altering frontmatter or the renderer was rejected because those are compatibility boundaries.

### Calm motion integration

Page entry uses small opacity/transform continuity only; hidden reveal states remain gated behind JavaScript and above-fold content is marked in synchronously. Existing reveal/scan/scramble/rise-stagger/blink hooks remain valid. Scroll parallax and routine blurred reveals are removed from public shell behavior; reduced motion resolves all content immediately. New animation primitives and layout-driven animation were rejected for accessibility and performance.

### Scoped public tool alignment

Labs retain their canvas and material systems, while route shells share the same page heading, card, border, focus, and responsive conventions. This aligns navigation and reading context without flattening tool-specific interaction design.

## Risks / Trade-offs

- [Large existing stylesheet contains earlier experimental rules] → Add a narrow final public-system layer and preserve scoped identities instead of destabilizing unrelated diagnostics.
- [Editorial changes can overstate source material] → Limit edits to duplicated/disclaimer copy and claims supported by the local source body.
- [Removing visual motion can reveal layout defects] → Inspect desktop/mobile, no-JavaScript, and reduced-motion routes; preserve readable fallback states.
- [Page transition changes can affect navigation] → Retain the existing native/fallback routing path and only remove blur/content-gating behavior.

## Migration Plan

1. Validate the proposal/spec/design/tasks contract before interface edits.
2. Update shared component APIs and route markup, then align the shared CSS and motion rest states.
3. Run deterministic, browser, and advisory checks; inspect public route families in normal, reduced-motion, no-JavaScript, light, and dark states.
4. Roll back by reverting this change's scoped component, CSS, route, motion, and OpenSpec files together; no data migration is required.
