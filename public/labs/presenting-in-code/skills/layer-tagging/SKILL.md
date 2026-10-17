---
name: layer-tagging
description: Use before building an exploded view, x-ray or blueprint of a screen in a coded presentation; it tags every surface root of the screen component with the level it sits on, from one ordered list of levels.
---

# Layer tagging

One attribute on every surface root of your screen component, naming the level it sits on, so a presentation can take the screen apart.

## Ask for these first

1. The screen component, and the states it is presented in.
2. The levels of your design system, bottom to top. If there are none yet, propose a short list: for example L0 background, L2 raised, L3s dimmer, L3 floating.
3. The design tokens for one colour per level, for the x-ray.

## Plan first, then wait

Propose, and wait for approval:

- the ordered list of levels, each with a short id and a plain name;
- every surface on the screen and the level it sits on, as a table (surface, element, level);
- any surface that seems to need two levels, and how to split it.

## Build

1. Export the ordered list of levels from one file. Every other view (x-ray, exploded view, labels) reads it.
2. Put data-layer="<id>" on the root element of every surface: the element that paints the surface's background, edge and shadow. Never on the content inside it.
3. Add an x-ray mode to the screen component: every [data-layer] element gets an outline in its level's colour and a small label with the level's name.
4. Write a small script that lists every [data-layer] element and its level.

## Rules

- One level per surface.
- The tags change nothing about the normal screen's layout or paint.
- The x-ray's outlines must not shift layout: use outline, not border.
- Colours come from your tokens, one per level.

## Acceptance checks

- In x-ray mode every visible surface is outlined once, and nothing is outlined twice.
- The script's list matches the approved table.

## Common failures

- A surface tagged twice shows up on two levels later.
- A tag on content rather than on the surface that paints it: the exploded view lifts the text without its card.
- Each view keeps its own list of levels, and they drift apart.
