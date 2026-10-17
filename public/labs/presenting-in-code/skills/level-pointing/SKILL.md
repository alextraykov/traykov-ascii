---
name: level-pointing
description: Use when the audience should explore an exploded screen in a coded presentation; it adds hover and focus on each level and part, which lifts it, dims the rest, draws a leader to its card and zooms the stage onto it.
---

# Level pointing

Point at a level of an exploded screen, or at a part on it: it lifts, the rest dim, a line leads to its card, and the stage zooms onto it.

## Ask for these first

1. An exploded view built with orthographic-breakdown.
2. The parts on each level worth explaining, and one sentence on why each sits where it does.
3. Whether the viewer uses the pointer, the keyboard or both (plan for both).

## Plan first, then wait

Propose, and wait for approval:

- the list of levels and parts the viewer can point at, with each card's text;
- the column beside the stack that holds the list and the card;
- the zoom limit (about 1.8 times) and the dim (about 20 percent).

## Build

1. After the stack has settled, build one SVG polygon per level from its projected corners, and one per part from the part's box mapped through the level's corners, as hit areas.
2. On hover or focus of a level: lift it by a small token (about 12 px) on translateZ; dim every other level to about 20 percent opacity. Focusing a part outlines it too.
3. Draw a leader from the focused shape to the card in the column. The card names the level or part and says why it sits there.
4. Zoom: one translate and scale on the stage's container that brings the focused shape to the middle of the stage, and back out when nothing is focused.
5. A list of the levels and parts in the column does the same on keyboard focus; the up and down arrows move through it.

## Rules

- Debounce pointer moves by about 80 ms.
- Ignore pointer-enter events caused by the stage moving under a still pointer; react only if the pointer itself moved in the last few frames.
- Lift, dim and zoom use transform and opacity only, on duration tokens.
- The leader draws once the zoom has settled.

## Acceptance checks

- Sweeping the pointer across the stack never makes it shake.
- Every level and part can be reached with the keyboard alone.
- Every leader ends on its shape after the zoom.

## Common failures

- The stack shakes under a moving pointer: no debounce.
- The zoom causes a chain of hovers: pointer-enter events from the stage moving.
- Hit areas miss the tilted levels: they were built from the flat screen.
