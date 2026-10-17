---
name: one-screen-before-after
description: Use when a coded presentation compares a current design with a proposed one; it splits the change into named groups on one live screen and animates every switch with a FLIP, so before and after are one screen with a switch.
---

# One screen, before and after

One live screen and a switch. The change is split into named groups; each switch moves the screen's own elements from one state to the other, both ways.

## Ask for these first

1. The screen component, and the before and after designs.
2. The differences between them, as a list.
3. Where the comparison appears: the whole screen, or a camera stop (camera-zoom) on one part.
4. Whether the change should land all at once or one group at a time.

## Plan first, then wait

Propose, and wait for approval:

- the change as named groups (for example depth, edges, emphasis), each with what it changes;
- which slides show which groups, and what each switch covers;
- whether any slide lands the groups one at a time, and in what order.

## Build

1. The screen component takes a list of groups and writes it as one attribute on its root: data-fix="depth edges". Every new style keys off that attribute.
2. Every element that exists in both states carries the same id: data-morph="input". Duplicate ids get an index.
3. A FLIP on every change: right before the new state is committed, record the rect of every [data-morph] element; right after, before the paint, record them again; then animate each from the old rect to the new one with transform. An element only the new state has fades in; one only the old state had fades out from a copy.
4. A switch with two real buttons (Before and After) changes the groups. The change animates both ways on the same elements.
5. Run the re-render as a low-priority update (a React transition, for example) so no task goes over 50 ms.

## Rules

- Nothing changes back by itself. The only reverse is the one right after the viewer presses the switch.
- Never crossfade two whole screens.
- Never wipe a region with clip-path.
- Reduced motion lands each state in one paint.

## Acceptance checks

- Record every frame of both directions: each word appears once in every frame, and no region goes blank.
- A log of data-fix never shows a group switching off unless the switch was pressed in the last 400 ms.

## Common failures

- The screen flashes back and forward (1, 0, 1): something reverts on a timer.
- Every word shows twice for a moment: two screens crossfaded.
- A region goes blank under a moving edge: a clip-path wipe.
- A long task on every switch: the re-render was not a low-priority update.
