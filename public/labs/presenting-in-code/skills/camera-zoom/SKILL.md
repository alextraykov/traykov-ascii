---
name: camera-zoom
description: Use when a slide needs to look closer at parts of a live screen in a coded presentation; it plans the camera stops from the story, then builds a camera that flies between them with one transform.
---

# Camera zoom

One live screen, and a camera that flies between named stops on it. The screen never changes; one element's transform does.

## Ask for these first

1. The screen component and the state it should be in.
2. The beats on this slide: what the audience should notice, in order.
3. The elements to feature, by name or selector.
4. How the viewer moves the camera: deck steps, pointing at a list, pressing buttons, or a mix.

## Plan first, then wait

Propose the stops, one per beat, and wait for approval:

- each stop's name, the element it frames, and the point it makes;
- its rectangle in the screen's own pixels (x, y, width, height), measured from the live screen, with enough of the surroundings to give context (a zoom of about 1.6 to 2 times);
- the order of the stops, and what drives each move.

## Build

1. A camera component: a viewport with overflow hidden, and inside it one world element at the screen's fixed size, holding the screen. The camera is the world's transform and nothing else.
2. Stops as constants: { id, x, y, w, h } in screen pixels. The whole screen is { 0, 0, screen width, screen height }.
3. The transform for a stop: scale = min(viewport width / w, viewport height / h); translate so the stop's centre lands on the viewport's centre.
4. One duration token and one easing token for every flight.
5. From one stop to the next, go straight there.
6. If stops follow the pointer, wait about 80 ms after the pointer settles before moving.

## Rules

- Measure the viewport before the first paint, and keep the camera hidden until it has a real size.
- Re-fit only when the viewport itself resizes, never when the content inside it changes.
- Anything drawn on a stop (a ring, a label) is measured after the flight has ended.
- Transform only. Never animate width, height, top or left.
- Reduced motion lands on each stop in one paint.

## Acceptance checks

- Record every frame of each flight: no jump, no snap, and the first frame is at its final scale.
- A quick sweep of the pointer across all the stops does not move the camera.
- Every stop frames its element with its surroundings visible.

## Common failures

- The camera jumps when the content inside it changes: it is re-fitting on content changes.
- The first frame paints at the wrong scale: the viewport was measured after paint.
- The camera thrashes as the pointer crosses the stops: no debounce.
- An overlay lands in the wrong place: it was measured during the flight.
- The camera zooms out and back in between two stops: it should pan straight across.
