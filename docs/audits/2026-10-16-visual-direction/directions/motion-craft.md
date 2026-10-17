# Motion craft pass for the component examples

Apply these rules to every component in the review page. They come from the *Animations on the Web* course (animations.dev, Emil Kowalski). The skills are installed at `~/.claude/skills/`. The full values are in `review-animations/STANDARDS.md`, `css-animations/`, `animation-accessibility/` and `animate/`.

When a rule here conflicts with the approved system, **the system wins**: stepped dither changes, the marker hover, the 40 ms clock and density levels stay. Use the course rules to tune *when*, *how long* and *how often* things move.

## 1. Should it move at all?
- **High-frequency means instant.** These get no animated transition:
  - arrow-key movement in tabs, segmented controls, selects and lists;
  - keyboard focus moving;
  - the select's highlighted option following the pointer.
  The selection changes on the next frame. A mouse click on a tab may keep the dither handoff.
- **Keyboard-initiated actions do not animate.** Opening a select with Enter and closing it with Escape is immediate. Page-level keyboard shortcuts are immediate.
- **Hover markers are frequent.** Their arrival is ≤ 120 ms total (steps(3) at 40 ms is right). Leaving is ≤ 80 ms or instant. Never wait on a hover.

## 2. Timing
- **UI stays under 300 ms:** press, toggle, select open, tooltip, toast in. Only rare, big moments may run longer: a page transition, the first entrance of a hero, a case index sheet on a phone.
- **Exits are shorter and simpler than entries.** Roughly 60–70% of the entry duration and fewer steps. The afterglow exit stays 180 ms.
- **Duration scales with size and travel.** A row marker is 120 ms. A full-width panel switching on is 240 ms. A phone sheet is 280 ms.
- **Asymmetric timing.** Slow where the visitor is deciding (hold-to-confirm, a scrub), fast where the system answers (release, cancel).

## 3. Curves, used inside our steps
- **Never `ease-in` on UI.** Default to a strong ease-out such as `cubic-bezier(0.19, 1, 0.22, 1)`, or the site's `--ease-out-expo`.
- **Stepped motion keeps `steps()` inside an element** (the dither levels). The *spread across* elements (stagger delays, sweep order) follows the strong ease-out curve. That is our "steps inside, curves across".
- Movement on screen (a marker sliding between tabs, a slider thumb) uses `ease-in-out` category curves, e.g. `cubic-bezier(0.645, 0.045, 0.355, 1)`.

## 4. Physicality
- **Press feedback is felt, not seen.** On primary and secondary buttons, add `transform: scale(0.97)` on `:active` with a ~120–150 ms transition, alongside the dither press. Never scale below 0.97.
- **Nothing appears from nothing.** Panels, toasts, sheets and popovers start at `scale(0.96–0.98)` or are clipped, never `scale(0)`. Popovers and the select list scale from their trigger (`transform-origin` at the trigger edge). Centred dialogs stay centred.
- **Hover never moves the hover target.** The row "step aside" moves an inner child, so the row stays under the cursor.

## 5. Interruptibility
- Anything that can be retriggered quickly uses **CSS transitions or the runtime's fill**, which can be retargeted mid-flight, not restarting `@keyframes`. This covers tabs, toggles, hover markers, the theme switch, the select and the toast. A second click mid-animation continues from where it is. It never jumps back to zero.
- Keyframes are fine for one-shot entrances that play once (the reveal, the 404 resolve).

## 6. Stagger and hierarchy
- **30–80 ms between items**, never uniform: the most important item goes first and gets the most screen time. Less important items may just appear.
- **One entrance per container.** If a panel switches on, its contents are already there. Do not also trickle the children in.
- **Stagger never blocks interaction.**

## 7. Performance
- **Animate only `transform`, `opacity` and `clip-path`.** Dither masks change by swapping a class or attribute (the level). Never animate width, height, top, left, margin or padding.
- Never drive many children through one changing CSS variable on a parent.
- Add `will-change` only where frames actually drop.

## 8. Reduced motion: gentler, not zero
- With reduced motion or the motion switch off, **movement and position changes go**. State changes that aid understanding stay, as an instant swap or a single opacity step (≤ 100 ms):
  - the selected tab still turns solid;
  - Sending → Sent still shows;
  - the check still appears.
- Looping signals (loaders, the breathing cells) **stop on a meaningful still frame**, not on frame 0.

## Checklist per component (record the result in a comment above its `Dir.component` call)
1. Frequency: what triggers it and how often, and is it animated appropriately for that (instant for keyboard and high-frequency)?
2. Entry and exit durations (the exit is shorter) are under 300 ms unless it is a rare, big moment.
3. Curves: no ease-in; stepped inside, curved across.
4. Press uses scale(0.97); nothing starts from scale(0); origin is at the trigger.
5. It is interruptible (transitions or fill, not restarting keyframes).
6. Only transform, opacity and clip-path animate.
7. Reduced motion: gentler, not zero; loops rest on a meaningful frame.
