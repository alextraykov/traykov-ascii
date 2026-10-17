---
name: coded-presentation-setup
description: Use at the start of any presentation built in code on a real interface, to set up the deck on the real screen, the slide registry, steps in the URL, motion tokens and reduced motion before any slide is built.
---

# Set up a presentation in code

A deck host that every technique in this set depends on: your product's real screen component, on a slide that scales as a whole, with every step addressable and every duration a token.

## Ask for these first

1. The screen component to present, and the props that put it in each state you need.
2. The slide list as beats (from presentation-planner, or written now): one point per slide.
3. The brand tokens: type, colours, spacing, and any existing motion durations and curves.
4. Where the deck should live in the codebase, and its route.

## Plan first, then wait

Propose, and wait for approval:

- one fixed size for the screen and one for the slide, picked to suit your screen and your talk;
- the slide list as beats, each with its heading, its demo and its step count;
- the motion tokens the deck will define, with values;
- the route and the URL shape (#your-deck?slide=N&step=M).

## Build

1. A deck host component. Pick one fixed size for your screen and one for the slide, then scale: the host lays every slide out at the slide's size and fits it to the window with one transform, scale = min(window width / slide width, window height / slide height). Nothing on a slide is ever laid out in window pixels.
2. A slide registry: an array of slides, each with a slug, a title, a step count and a component. A slide component receives { step, active, advance }.
3. Routing in the URL hash. The arrow keys, space and Page Up / Page Down move one step at a time; Home and End jump to the ends; a click on the left third goes back, elsewhere forward. The hash always names the current state.
4. The screen component at its fixed size wherever it appears, scaled with a transform. Never let it reflow to the slide or the window.
5. Motion tokens: every duration and easing as a custom property on the deck root, read by CSS and by script alike.
6. Reduced motion: data-motion="reduce" on the root, set from prefers-reduced-motion or ?motion=reduce, which sets every duration token to 0ms.
7. Neighbour slides mounted in the background, hidden, once the current slide has settled, so a slide change is a fade between two mounted slides.

## Rules

- Animate transform and opacity only.
- A control inside a slide handles Enter and space itself; the deck's keys leave it alone. A list that uses up and down arrows marks itself so the deck leaves those keys too.
- A slide that is not on screen never animates, and is put back to its starting state once it is hidden.
- Tab only reaches the current slide's own controls, never the screens or the hidden slides.

## Acceptance checks

- Every slide and step loads directly from its URL.
- With ?motion=reduce every step is reached in one paint.
- No main-thread task over 50 ms on any step change.
- The first painted frame of every slide is already at its final scale.

## Common failures

- Laying out the screen at the window's size: every measurement then changes with the window.
- Keeping steps only in memory: a reload, a link and a screenshot script cannot reach them.
- Literal durations in components: reduced motion cannot turn them off.
- Mounting the next slide on the key press: the first frame of every slide change stutters.
