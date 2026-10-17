---
name: frame-check
description: Use whenever anything moves in a coded presentation, before it is shown; it writes and runs a probe that records every animation frame of every step and fails on doubled text, reverts, blank regions, long tasks and a wrong first paint.
---

# Frame check

A probe that records every animation frame while each step plays, and fails on what the eye would catch.

## Ask for these first

1. The deck's URL and how a step is addressed (for example #your-deck?slide=N&step=M).
2. The list of slides and steps that move, and the controls on each.
3. The regions that must never be blank (the screen's main parts).

## Plan first, then wait

Propose, and wait for approval:

- the scenarios: one per animated step, one per control in each direction, and each slide change;
- the rules below, and any you would add for this deck;
- the window sizes and browsers it runs in.

## Build

1. A script (Playwright, for example) that opens each scenario from its URL, injects a probe, plays the step or presses the control, and records for about 4 seconds.
2. The probe runs on requestAnimationFrame and records, every frame:
   - doubled text: two elements with the same text, both above 0.3 opacity (counting every ancestor's opacity), in boxes that overlap. Boxes that match to the pixel are one element fading and count apart;
   - reverts: the screen's change groups shrinking when no switch was pressed in the last 400 ms;
   - blank regions: a required region with nothing visible;
   - long tasks over 50 ms, from a PerformanceObserver.
3. A screenshot at the first frame of each hit.
4. A separate check that the first painted frame of every slide is at its final scale.

## Rules

- Never change the deck to make a check pass. Report the hit and its likely cause.
- Run headless and in a visible browser: headless draws in software and makes paint look slower.
- Run at the slide's own size and at a window of a different shape.

## Acceptance checks

- Every scenario reports frames recorded, hits per rule, and the first three hits with a timestamp and a screenshot.
- The deck passes with zero hits on every rule.

## Common failures

- Checking only the last frame of each step.
- Sampling with a timer, which misses frames.
- Counting a copy at opacity 0 as doubled text.
- Trusting a headless run alone.
