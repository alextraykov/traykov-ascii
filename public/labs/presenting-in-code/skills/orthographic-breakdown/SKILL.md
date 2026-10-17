---
name: orthographic-breakdown
description: Use when a slide should show how a screen is built from levels in a coded presentation; it plans which screen and which levels tell the story, then explodes the live screen into levels with CSS 3D, step by step.
---

# Orthographic breakdown

The live screen lifts apart into its levels, with no perspective: flat, swap in one copy per level, tilt, rise, then drop lines and footprints.

## Ask for these first

1. The screen component, tagged with layer-tagging (run that skill first if it is not).
2. The point the breakdown makes: which levels matter, and what the audience should notice about them.
3. The steps the slide needs: the whole build-up, or only the final view.
4. The tokens for the tilt, the gap between levels and the durations.

## Plan first, then wait

Propose, and wait for approval:

- which screen state is exploded, and which levels become sheets (merge or drop the ones that do not serve the point);
- the steps, one per stage, with the caption for each;
- the tilt, the gap and the scale, so the lifted stack fits the slide.

## Build

1. A stage component showing one live copy of the screen, flat.
2. Behind it, one copy of the screen per level at the same place. Each copy shows only its own level: [data-layer] elements of other levels are hidden with visibility, not removed. Mount the copies one per frame after the stage has painted.
3. Swap: hide the live screen and show the copies while everything is flat. They are identical, so nothing changes on screen.
4. Tilt: one transform on the copies' parent, for example rotateX(56deg) rotateZ(-32deg), with transform-style: preserve-3d and no perspective.
5. Rise: each level moves up on translateZ by its index times the gap token, bottom level first, each a little after the one below.
6. Once every level has settled, read each sheet's projected corners from small marker elements at its corners, and draw drop lines to the level below and each sheet's footprint in one flat SVG over the stage.
7. Collapse runs the same stages backwards; the live screen takes over only when everything is flat again.

## Rules

- Never crossfade the live screen into the copies. Swap them in at the same place while flat.
- Every element between the stack's root and the planes keeps preserve-3d, with no overflow, filter or opacity below 1.
- Labels and lines live in a flat SVG over the stage, never on the tilted planes.
- Durations, the tilt and the gap are tokens. Reduced motion shows each stage's end state in one paint.

## Acceptance checks

- No frame shows two copies of the same text.
- No task over 50 ms while the copies mount or while the stack lifts.
- The drop lines meet every sheet's corners within 1 px.
- Walking the steps backwards collapses the stack the same way it rose.

## Common failures

- Text shows twice during the swap: the live screen was crossfaded.
- The page freezes when the slide opens: every copy mounted at once.
- The levels flatten into one plane: an element in between lost preserve-3d.
- Labels blur on the tilted planes: draw them flat over the stage.
