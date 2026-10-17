---
name: blueprint-mode
description: Use when a slide should show a screen's structure rather than its paint in a coded presentation; it adds a switch that fades the rendered surfaces of an exploded or flat screen to wireframe boxes on their levels.
---

# Blueprint mode

A switch that fades the painted surfaces away and draws each one as a box on its level, so the audience sees structure, not paint.

## Ask for these first

1. The screen component, tagged with layer-tagging, and ideally exploded with orthographic-breakdown.
2. What the blueprint should make visible: nesting, spacing, which level each box sits on.
3. The ink tokens for the boxes in light and dark.

## Plan first, then wait

Propose, and wait for approval:

- which step or control turns the blueprint on;
- which boxes are drawn and labelled, and which are left out;
- the stroke weights per level (heavier for higher levels).

## Build

1. While the screen is flat, measure every tagged surface's box once, relative to the screen root.
2. On every level, draw its boxes as an SVG in that level's own plane, so they tilt and rise with it.
3. A switch with two real buttons fades the painted copies down and the boxes up, together, on one duration token.
4. Keep the sheets' outlines and the drop lines in both modes.

## Rules

- Measure the boxes from the same state the copies show.
- Fade with opacity. Never use display none on either side.
- The box ink comes from tokens that flip with the theme.
- Reduced motion switches in one paint.

## Acceptance checks

- In every frame of the switch, each box sits on its surface.
- The switch is reachable with Tab and reports its state with aria-pressed.

## Common failures

- Boxes that do not sit on their surfaces: measured from a different state.
- A jump instead of a fade: display none somewhere.
- Boxes that vanish in dark mode: hard-coded ink.
