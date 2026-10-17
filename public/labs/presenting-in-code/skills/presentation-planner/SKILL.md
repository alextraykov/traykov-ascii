---
name: presentation-planner
description: Use when someone wants to turn a design argument about a real interface into an interactive presentation in code; it picks which techniques go on which slides, in what order, and hands each slide to the right skill.
---

# Plan an interactive presentation

Turn a topic and a real screen into a slide plan, where every slide proves one point with a live demo, then build it with the other skills in this set.

## Ask for these first

1. The argument, in one sentence. What should the audience believe or decide at the end?
2. The audience, and how long they have.
3. The real screen or component the presentation is built on, and where its code lives.
4. The elements worth featuring: the two to five parts of the screen the argument depends on.
5. The before and the after, if the argument is a change: what exists today, and what is proposed.
6. The brand tokens: colours, type, spacing, motion durations.

Do not start planning until you have at least 1, 3 and 4.

## Plan first, then wait

Write the slide plan as beats, not as slides with decoration. For each beat give:

- the point it makes, as one plain sentence (this becomes the heading);
- the live demo that proves it, and which skill builds it;
- what the viewer does on it, if anything (point, press, switch);
- how many steps it has, and what changes on each.

Order the beats so the deck leads up to the point and then reveals it:

1. Open on the real screen, moving: show the result before explaining it.
2. Name the problem on the screen as it is today, pointing at it (camera-zoom, live-anchors).
3. Show the structure underneath (layer-tagging, orthographic-breakdown, level-pointing, blueprint-mode).
4. Reveal the change on the same screen (one-screen-before-after), one group at a time if it has several.
5. End on the decision you want, with nothing moving.

Use each technique only where it carries the argument. A deck with every technique on every slide proves nothing.

Present the plan and wait for approval. Change it as asked. Only then build.

## Build

1. Run coded-presentation-setup first, with the approved slide list.
2. Build the slides in order, one skill per demo. Each skill plans its own details (stops, targets, levels) against this plan before building.
3. After each slide, capture every step and look at it.
4. Run frame-check over the whole deck before calling it done.

## Rules

- One point per slide. The heading says it as a plain declarative sentence, in sentence case.
- Every demo runs on the real screen component, never a picture of it.
- Nothing changes by itself after the opening. The viewer or the presenter causes every change.
- Every step can be reached from its URL.

## Acceptance checks

- Read the headings in order, alone: they make the argument without the demos.
- Each demo, removed, would leave its slide's point unproven.
- frame-check passes on every slide and step.

## Common failures

- Planning slides before the argument is one sentence. Get the sentence first.
- Using a technique because it is impressive, not because a beat needs it.
- Revealing the change before the audience has seen the problem.
- A final slide that moves. End still, on the decision.
