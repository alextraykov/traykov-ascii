---
name: live-anchors
description: Use when a slide needs to point at a live element and explain it in a coded presentation; it adds a ring measured from the real element and a leader line to a note card that follows the element through every change.
---

# Live anchors

A ring round a live element, and a leader line from it to a note that explains it. The ring is measured from the element, never placed by hand.

## Ask for these first

1. The elements to anchor, by selector, and the state of the screen for each.
2. What each note says: the element's name, and one sentence on why it matters.
3. Whether a camera stop frames each element (camera-zoom), and what changes the element while it is anchored.

## Plan first, then wait

Propose, and wait for approval:

- which element is anchored on which step, and the note for each;
- where the note column sits beside the screen, so the card never moves;
- what the viewer can change while the ring shows, and that the ring will follow.

## Build

1. An overlay: an SVG over the camera viewport, in the viewport's own pixels, with pointer-events none.
2. After the camera has settled (its duration token plus one frame), read the target's rect with getBoundingClientRect.
3. Convert it to the overlay's coordinates: subtract the overlay's own rect, then divide by the slide's scale (the overlay's on-screen width divided by its layout width).
4. Draw the ring as a rounded rectangle about 5 px outside the element, clipped to the viewport.
5. Draw the leader from the ring's nearest edge to the note card, which always sits in the same place in a column beside the viewport.
6. Re-measure after every change to the screen (once its animation has ended), after every camera move, and on resize. Hide the ring while it re-measures, then draw it back in.

## Rules

- Never measure during a camera flight or a layout animation.
- The ring and the line draw in with opacity and stroke-dashoffset on duration tokens.
- The note names the element and says why it matters, in one short sentence.
- Reduced motion draws the ring and the line in one paint.

## Acceptance checks

- At every stop, at two window sizes and in light and dark, the ring sits within 1 px of its offset from the element.
- Change the screen while a ring shows: the ring follows the element and never points at its old place.

## Common failures

- The ring sits 20 px off: it was measured mid-zoom.
- The ring is right at one window size and wrong at another: it was not divided by the slide's scale.
- The ring points at where the element used to be: it was not re-measured after a change.
- The note card jumps from stop to stop: give it one fixed place and move only the line.
