# Design Language

## Thesis

The portfolio is a printed terminal: black ink, paper grain, ASCII texture, square geometry, direct labels, and motion that feels like a system coming online rather than a marketing page.

## Tokens

Use `:root` in `src/styles/global.css` for color, spacing, timing, shadows, z-index, and radius. Do not invent one-off values when a token exists.

- Easings: `--ease-out-expo`, `--ease-in-expo`, `--ease-snap`.
- Durations: `--dur-1` through `--dur-6`.
- Staggers: `--stagger-1` through `--stagger-4`.
- Spacing: `--space-1` through `--space-6`.
- Shape: square by default through `--radius-0`; pills only for deliberately pill-shaped controls.

## Motion Primitives

- Reveal: opacity, translateY, and small blur on below-fold elements.
- Scan: one-pixel line draw for headings, TOC active bars, and separators.
- Scramble: canonical ASCII ramp `" .:+*#%@"`.
- Rise-stagger: grouped child reveal using `data-reveal-group`.
- Blink: caret and terminal-state emphasis with `steps(2)`.

Timeline: page enter starts at 0ms, nav enters around 520ms, reveal gate activates after setup, and scroll effects write `--scroll-progress` plus `--hero-exit`.

## Components

- `ProjectCard.astro`: direct route card, hover lift, block shadow, Synapse identity layer.
- `SiteFooter.astro`: global route footer and shared motion import.
- Case pages: `case-progress`, reading tools, sibling nav, and `.case-study-body` typography form the long-read system.
- Figures: `.case-image`, `.case-video-copy`, `.case-image-grid`, and `.case-cover` share caption and hover behavior.

## Case Identity

Per-study identity is a feature, not inconsistency. Use scoped attributes like `body[data-case-theme="synapse"]` to layer accent color, progress, TOC, figure, and quote treatments over the shared system. Do not flatten the Synapse dark-neon treatment.

## MDX Authoring

The renderer is intentionally constrained. Prefer short headings, line-based custom fences, and explicit evidence. `case-stat` is for measured signals or concrete artifacts. `case-quote` is for a principle or decision line that deserves visual weight. `case-timeline` is optional and only for compact sequences.

## Accessibility And Motion

Everything must be readable with JavaScript disabled. `html[data-motion="ready"]` is the only hidden-state gate. Reduced motion disables parallax, progress motion, reveal transitions, count-up, and scramble animation.

## Deferred

Deferred ideas: before/after slider, lightbox, and View Transitions API expansion. Do not add these unless requested.
