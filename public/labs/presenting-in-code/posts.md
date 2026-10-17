# Three posts

Short posts for sharing the tutorial deck. Each one is a practical tip on one technique: camera zooms, anchors, and the orthographic breakdown.

## 1. A camera zoom is one transform

If you want to zoom into part of a real interface in a presentation, do not scale the interface. Put it inside one "world" element at a fixed size, and move that element.

Each stop is a rectangle in the screen's own pixels. The transform for a stop is a scale that fits the rectangle into the viewport and a translate that brings its centre to the middle. One duration token and one easing curve for every flight.

Three rules I would not skip: go straight from one stop to the next instead of zooming out in between; measure the viewport before the first paint so nothing snaps; and wait about 80 ms after the pointer settles before moving, so a quick pass across the stops does nothing.

## 2. Measure anchors, never place them

A ring around an element with a line to a note is the most useful thing on an explanatory slide, and the easiest to get slightly wrong.

Read the element's rect from the live DOM, but only after the camera has stopped moving. Subtract the overlay's position and divide by the slide's scale, or the ring will be right at one window size and wrong at every other. Draw it 5 px outside the element. Keep the note card in one place and let only the line move.

Then re-measure after every change to the screen. If the element changes size, the ring should follow it, not point at where it used to be.

## 3. Explode a screen in five steps

You can take a real screen apart into its levels with plain CSS 3D. The order matters more than the code.

First, tag every surface with one data-layer attribute. Mount one copy of the screen per level in the background, one per frame. Swap the copies in while everything is flat: they are identical, so nobody sees the swap. Then tilt the whole stack with rotateX and rotateZ and no perspective, and raise each level on translateZ by its number times a gap token. Only when everything has settled, read the corners and draw the drop lines.

Never crossfade the live screen into the copies. That is how you get every word on the slide twice.
