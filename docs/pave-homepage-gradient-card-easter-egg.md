# Rebuild the Pave homepage gradient as a project-card easter egg

## Objective

Rebuild the atmospheric gradient from the original Pave homepage **inside the Pave case-study preview card**. At rest, the card must remain the current portfolio card. When the Pave card is hovered—or when its link receives keyboard focus—the gradient should reveal inside the card's media pane as a small, quiet easter egg.

This is a scoped adaptation, not a literal transplant of the old full-viewport React component.

The finished effect should:

- appear only in the Pave card;
- remain clipped to `.project-mark--pave`;
- preserve the card's existing copy, border, link, and layout;
- cross-fade over the existing Pave portfolio video rather than remove it;
- react subtly to pointer position on fine-pointer devices;
- use a centered, static composition for keyboard focus, reduced motion, and no-JS;
- introduce no dependency and no second stylesheet;
- use only the portfolio's existing reveal vocabulary: opacity and transform, with existing duration and easing tokens.

Do not redesign the whole card. The Synapse card is the reference for layering a study-specific identity over shared card primitives without forking the card system.

## Read this context before editing

Inspect these files first:

- `src/components/ProjectCard.astro` — shared project-card structure and hover/focus boundary.
- `src/components/ProjectMark.astro` — the Pave media branch and existing video.
- `src/pages/index.astro` — where cards render and page-local scripts are imported.
- `src/styles/global.css` — the only design-system stylesheet; new tokens and styles belong here.
- `src/scripts/synapse-card-scramble.js` — example of a case-specific card interaction, not code to copy wholesale.
- `case-studies/_archive/pages/01-home.mdx` — authored account of the original homepage behavior.
- `case-studies/_research/home/fe.md` — implementation evidence for the old gradient engine.
- `case-studies/_research/landing/uxa.md` — evidence for the original visual layer stack.
- `public/case-studies/screenshots/pages/home-light.png` and `home-dark.png` — visual references.

Repository constraints still apply:

- Do not add a dependency.
- Keep all CSS in `src/styles/global.css`.
- Put every new color, duration, easing, z-index, shadow, and spacing decision behind a token. Reuse an existing token wherever possible.
- Keep corners square. The gradient may contain circular **radial gradients**, but do not add rounded card or media corners.
- Use the canonical breakpoints only: 1180, 900, 820, 700, and 640.
- Do not alter `content.ts`, turntable scripts, `public/ascii-shader.js`, or page-transition timings.
- Preserve strings asserted by `scripts/verify-site.mjs`.

## What the original effect actually did

The source component is no longer present in this repository, so do not claim a byte-for-byte restoration. The archived screenshots and implementation research support these facts:

1. The gradient used **five independently addressable color channels**, exposed as CSS custom properties `--c1` through `--c5`.
2. The rendered stack, back to front, was: page background → orb wrapper → frost → content → vignette → grain.
3. The orb group revealed on first mount from `scale(0.3)` to `scale(1)` over 3 seconds with `cubic-bezier(0.16, 1, 0.3, 1)`.
4. Pointer movement directly updated an interactive orb's position without routing through React state.
5. Typed keywords selected semantic palettes: dashboard, CRM, ecommerce, inventory, HR, and booking.
6. Palette changes waited for a 400 ms debounce, then interpolated five RGB channels over 1800 ms with an `easeInOutCubic` curve in `requestAnimationFrame`.
7. Scroll parallax displaced the full-size orb field by roughly 10% of `scrollY`.
8. Reduced motion removed the reveal, parallax, and animated transitions.

The card version has no text input and too little area for the full-page timing to feel responsive. Preserve the visual grammar, not the old orchestration.

## Adaptation decisions

Use the following translation exactly unless the existing code makes one item impossible:

| Original homepage behavior | Card adaptation |
| --- | --- |
| Full-viewport background | Clip to `.project-mark--pave` only |
| Five semantic color channels | Five fixed Pave-brand channels |
| Input keywords choose a palette | Pointer position changes the balance of the fixed palette |
| 400 ms debounce + 1800 ms RGB lerp | Omit; there is no text input |
| 3 second mount reveal | Hover/focus reveal using `--dur-6` and `--ease-out-expo` |
| Scroll parallax | Omit; the card should not move because the page scrolls |
| Mouse-following interactive orb | Keep as a small pointer-relative field displacement |
| Continuous full-page atmosphere | Run no animation while the card is idle |
| Reduced motion disables the effect | Keep a static, instantly revealed hover/focus state |

The easter egg should feel discovered, not announced. Add no label, badge, tooltip, cursor change, or explanatory copy.

## Target visual behavior

### Rest

- The Pave video and poster look exactly as they do now.
- The gradient layer has `opacity: 0` and `transform: scale(0.3)`.
- No `requestAnimationFrame` callback is running.
- The gradient layer has `pointer-events: none` and cannot interfere with the card link.

### Pointer enter

- The gradient fades and scales into the media pane.
- The existing Pave video fades to a low but still visible opacity so its forms remain embedded in the color field.
- The visual center begins at 50% / 50%; there must be no jump from an uninitialized pointer coordinate.
- The reveal is clipped by the existing `.project-mark` overflow.

### Pointer move

- Normalize the pointer to the Pave media pane, not to the viewport or the full card.
- Normalize both axes to the range `0` to `1`, then convert them to signed CSS lengths using the computed value of the existing `--space-4` token. Write the resulting lengths to `--pave-pointer-shift-x` and `--pave-pointer-shift-y`.
- Move the orb field by no more than one existing spacing step in each direction. This is a tint/parallax response, not a blob chasing the cursor.
- Schedule at most one DOM write per animation frame.
- Do not set React/Astro state and do not read layout more than once per pointer event.

### Pointer leave

- Let CSS return the gradient to hidden and the video to its existing rest state.
- Reset the pointer variables to `0.5` / `0.5` so the next entry starts centered.

### Keyboard focus

- `.project-card:is(:hover, :focus-within)` should reveal the effect.
- Keep the field centered because there is no pointer position.
- Do not add `tabindex` to a non-interactive “Coming soon” card solely to expose a decorative effect. When the card contains its normal link, that link already provides the keyboard path.

### Coarse pointer

- Do not create a sticky hover state on touch-only devices.
- Under `(hover: none) and (pointer: coarse)`, keep the easter egg hidden. The card's existing video remains the mobile treatment.

### Reduced motion

- The gradient may still appear as a static hover/focus style on a fine pointer.
- Remove all gradient and video transitions.
- Remove pointer-follow displacement and keep the field centered.
- Never run the pointer `requestAnimationFrame` path when `prefers-reduced-motion: reduce` matches.

### No JavaScript

- CSS hover/focus must still reveal a centered version of the effect.
- JavaScript is enhancement only; it supplies pointer coordinates.

## DOM structure

Modify only the Pave branch inside `ProjectMark.astro`. Keep the existing `<video>` and add the decorative layer as its sibling, after the video wrapper so normal source order supports the overlay.

Use this shape as the implementation target:

```astro
<>
  <div class="project-video-turntable is-pave">
    <video
      class="project-video-turntable__media"
      data-motion-media
      data-src="/case-studies/media/pave-portfolio-loop.mp4"
      poster={image}
      muted
      loop
      playsinline
      preload="none"
    ></video>
  </div>

  <div
    class="pave-card-gradient"
    data-pave-card-gradient
    aria-hidden="true"
  >
    <div class="pave-card-gradient__field">
      <span class="pave-card-gradient__orb pave-card-gradient__orb--1"></span>
      <span class="pave-card-gradient__orb pave-card-gradient__orb--2"></span>
      <span class="pave-card-gradient__orb pave-card-gradient__orb--3"></span>
      <span class="pave-card-gradient__orb pave-card-gradient__orb--4"></span>
      <span class="pave-card-gradient__orb pave-card-gradient__orb--5"></span>
    </div>
    <span class="pave-card-gradient__frost"></span>
    <span class="pave-card-gradient__vignette"></span>
    <span class="pave-card-gradient__grain"></span>
  </div>
</>
```

Notes:

- The spans are decorative and inherit `aria-hidden` from the root.
- Do not put interactive elements inside the gradient.
- Do not duplicate the gradient in `ProjectCard.astro`; `ProjectMark.astro` already knows which study is Pave.
- Keep the `data-motion-media` attribute. The existing visibility/media controller still owns video loading and playback.

## Design tokens

Add a small, clearly labeled Pave-card block inside `:root`. The archived Pave token export provides the brand values below. Raw values are allowed only in the token definitions, not in component selectors.

```css
/* Pave project-card gradient: archived Pave brand palette. */
--pave-gradient-1: #05875a;
--pave-gradient-2: #285a41;
--pave-gradient-3: #d7e6be;
--pave-gradient-4: #a0ffd2;
--pave-gradient-5: #e1d7c8;
--pave-gradient-base: #fafff0;
--pave-gradient-video-hover-opacity: 0.24;
--pave-gradient-grain-opacity: 0.1;
```

Prefer existing global motion and stacking tokens:

- reveal duration: `--dur-6`;
- video cross-fade: `--dur-3` or the video's existing duration;
- easing: `--ease-out-expo`;
- inline layer: `--z-inline-effect`;
- pointer travel: the current `--space-4` token;
- light/dark compositing: existing `--paper` and `--ink` through `color-mix()`.

Do not add theme-specific duplicate colors unless browser inspection shows the same composition failing in one theme. Pave brand colors are stable across themes; `--paper` and `--ink` already change for manual and system dark mode.

## CSS implementation

Place the new selectors in the **Work cards** area of `global.css`, adjacent to `.project-mark--pave` and the existing project-video rules. Keep selectors scoped to `.project-mark--pave` or `.pave-card-gradient`.

The following is a structural reference. Tune radial stops and centers in the browser, but do not change the interaction contract.

```css
.project-mark--pave {
  isolation: isolate;
}

.pave-card-gradient {
  --pave-pointer-shift-x: 0px;
  --pave-pointer-shift-y: 0px;
  position: absolute;
  inset: 0;
  z-index: var(--z-inline-effect);
  overflow: hidden;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.3);
  transform-origin: 50% 68%;
  background: color-mix(in srgb, var(--pave-gradient-base), var(--paper) 22%);
  transition:
    opacity var(--dur-6) var(--ease-out-expo),
    transform var(--dur-6) var(--ease-out-expo);
}

.pave-card-gradient__field,
.pave-card-gradient__orb,
.pave-card-gradient__frost,
.pave-card-gradient__vignette,
.pave-card-gradient__grain {
  position: absolute;
  inset: 0;
}

.pave-card-gradient__field {
  inset: calc(var(--space-6) * -1);
  transform: translate3d(
    var(--pave-pointer-shift-x),
    var(--pave-pointer-shift-y),
    0
  );
  will-change: transform;
}

.pave-card-gradient__orb {
  background-repeat: no-repeat;
}

.pave-card-gradient__orb--1 {
  background-image: radial-gradient(
    circle at 50% 82%,
    color-mix(in srgb, var(--pave-gradient-1) 96%, transparent) 0,
    color-mix(in srgb, var(--pave-gradient-1) 72%, transparent) 34%,
    transparent 70%
  );
}

.pave-card-gradient__orb--2 {
  background-image: radial-gradient(
    circle at 24% 68%,
    color-mix(in srgb, var(--pave-gradient-2) 82%, transparent) 0,
    transparent 58%
  );
}

.pave-card-gradient__orb--3 {
  background-image: radial-gradient(
    circle at 72% 22%,
    color-mix(in srgb, var(--pave-gradient-3) 88%, transparent) 0,
    transparent 62%
  );
}

.pave-card-gradient__orb--4 {
  background-image: radial-gradient(
    circle at 78% 72%,
    color-mix(in srgb, var(--pave-gradient-4) 76%, transparent) 0,
    transparent 58%
  );
}

.pave-card-gradient__orb--5 {
  background-image: radial-gradient(
    circle at 28% 18%,
    color-mix(in srgb, var(--pave-gradient-5) 82%, transparent) 0,
    transparent 64%
  );
}

.pave-card-gradient__frost {
  background: color-mix(in srgb, var(--paper) 12%, transparent);
  backdrop-filter: blur(var(--space-3));
}

.pave-card-gradient__vignette {
  background: radial-gradient(
    circle at 50% 52%,
    transparent 30%,
    color-mix(in srgb, var(--ink) 18%, transparent) 100%
  );
}

.pave-card-gradient__grain {
  opacity: var(--pave-gradient-grain-opacity);
  background-image: url("/pave-gradient-grain.svg");
  background-repeat: repeat;
  mix-blend-mode: multiply;
}

.project-card:is(:hover, :focus-within) .pave-card-gradient {
  opacity: 1;
  transform: scale(1);
}

.project-mark--pave .project-video-turntable__media {
  transition:
    opacity var(--dur-3) var(--ease-out-expo),
    filter var(--dur-3) var(--ease-out-expo),
    transform var(--dur-5) var(--ease-out-expo);
}

.project-card:is(:hover, :focus-within)
  .project-mark--pave
  .project-video-turntable__media {
  opacity: var(--pave-gradient-video-hover-opacity);
}
```

Important implementation notes:

- The field's negative inset deliberately gives the layer room to move without exposing an edge. It uses an existing spacing token.
- Radial gradients create the orb shapes; do not use `border-radius`, which would conflict with the square-corner system.
- Keep the reveal on the gradient root and pointer translation on the inner field. Combining both transforms on one element would make pointer updates overwrite the reveal scale.
- Avoid infinite `@keyframes`. The original atmosphere moved, but this card should only respond while a person is interacting.
- If `backdrop-filter` makes the video too muddy, reduce frost opacity before reducing brand-color contrast. Do not remove the vignette; it is what keeps the gradient from looking like five unrelated circles.
- If `color-mix()` support is already part of this site's browser baseline—it is used elsewhere in `global.css`—use it instead of introducing raw RGBA values in the selectors.

### Static grain asset

For visual fidelity, add a tiny, tileable monochrome SVG at `public/pave-gradient-grain.svg`. It should use a static `feTurbulence` filter, have no animation, contain no text, and be small enough to tile. Keep opacity controlled by the CSS token, not baked into several selectors.

If the SVG filter proves inconsistent in the supported Safari version, omit the grain layer rather than adding a package, canvas renderer, base64 raster, or animated noise loop. Frost, vignette, and five radial channels are the load-bearing parts.

## Pointer enhancement

Create `src/scripts/pave-card-gradient.js`. Export an initializer for testability, then auto-initialize the current document in the same simple style as the existing card script.

Use this implementation shape:

```js
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

export function initializePaveCardGradient(root) {
  const mark = root.closest(".project-mark--pave");
  if (!mark) return () => {};

  let frame = 0;
  let nextX = 0.5;
  let nextY = 0.5;
  const pointerRange = Number.parseFloat(
    getComputedStyle(root).getPropertyValue("--space-4")
  );

  const write = () => {
    frame = 0;
    if (!Number.isFinite(pointerRange)) return;

    const shiftX = (nextX - 0.5) * 2 * pointerRange;
    const shiftY = (nextY - 0.5) * 2 * pointerRange;
    root.style.setProperty("--pave-pointer-shift-x", `${shiftX.toFixed(2)}px`);
    root.style.setProperty("--pave-pointer-shift-y", `${shiftY.toFixed(2)}px`);
  };

  const onPointerMove = (event) => {
    if (reduceMotion.matches || !finePointer.matches) return;

    const rect = mark.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    nextX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    nextY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    if (!frame) frame = window.requestAnimationFrame(write);
  };

  const reset = () => {
    nextX = 0.5;
    nextY = 0.5;
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(write);
  };

  mark.addEventListener("pointermove", onPointerMove, { passive: true });
  mark.addEventListener("pointerleave", reset);

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    mark.removeEventListener("pointermove", onPointerMove);
    mark.removeEventListener("pointerleave", reset);
  };
}

const cleanups = Array.from(document.querySelectorAll("[data-pave-card-gradient]"))
  .map(initializePaveCardGradient);

window.addEventListener(
  "pagehide",
  () => cleanups.forEach((cleanup) => cleanup()),
  { once: true }
);
```

Then import it once from the homepage's existing module script:

```js
import "../scripts/pave-card-gradient.js";
```

Do not attach pointer listeners to `document` or `window`. Do not add an interval. Do not add state classes for hover; CSS already owns hover and focus visibility.

## Reduced-motion and touch CSS

Extend the existing reduced-motion section rather than creating contradictory rules far away:

```css
@media (prefers-reduced-motion: reduce) {
  .pave-card-gradient,
  .project-mark--pave .project-video-turntable__media {
    transition: none;
  }

  .pave-card-gradient__field {
    transform: none;
    will-change: auto;
  }
}

@media (hover: none) and (pointer: coarse) {
  .pave-card-gradient {
    display: none;
  }
}
```

Do not hide the gradient globally under reduced motion. A static state change is useful and respects the preference; the problem is forced movement, not color.

## Layering and regression traps

Watch for these failure modes:

1. **Gradient covers the entire card.** It belongs inside `.project-mark--pave`, not inside `.project-card`.
2. **Gradient blocks the link.** The entire decorative subtree must remain `pointer-events: none`.
3. **The video disappears at rest.** Scope the opacity rule to card hover/focus only.
4. **Pointer movement cancels scale reveal.** Keep translation on `__field` and scale on the root.
5. **Touch requires a second tap.** Disable the decorative layer on coarse, hoverless pointers.
6. **Keyboard users get no equivalent.** Use the card's existing `:focus-within` state.
7. **No-JS becomes blank.** Default coordinates must be centered in CSS; JS cannot be required for visibility.
8. **An idle animation burns resources.** No intervals or infinite keyframes; rAF is scheduled only after pointer movement.
9. **The Pave and Synapse identities leak into each other.** Every new selector must be Pave-scoped.
10. **Dark mode turns muddy or fluorescent.** Test actual compositing in both themes; tune the shared overlay/frost amount before inventing a second palette.
11. **The existing Pave video loader breaks.** Keep `data-motion-media`, `data-src`, poster, and playback attributes unchanged.
12. **The card's link or page transition stops working.** Do not prevent default, stop propagation, or attach click handlers.

## Browser QA

Check the relevant routes in a real browser after implementation:

- `/` — primary card location and the only place the effect is expected to be visible.
- `/case-studies/` — currently redirects to `/#work`; confirm the redirect remains unchanged.
- `/case-studies/designing-pave/` — confirm the card work did not leak into the case-study page.
- `/case-studies/synapse-sys/` — confirm the reference case identity is unchanged.
- `/about/` — smoke-check shared CSS.

Test at minimum:

### Visual

- Light theme and dark theme.
- Rest, mid-reveal, fully hovered, and pointer leave.
- Pointer at all four corners of the Pave media pane.
- Repeated rapid enter/leave; no flashing edge and no stuck opacity.
- The video remains faintly legible beneath the gradient.
- The card copy remains fully readable and un-tinted.
- The gradient is clipped exactly to the square media boundary.

### Input and accessibility

- Tab to the Pave card link: centered static gradient appears.
- Shift+Tab away: it returns to rest.
- Focus outline remains visible and unchanged.
- Touch emulation: gradient does not become sticky and the link activates normally.
- `prefers-reduced-motion: reduce`: reveal is instant, the field does not track the pointer, and no parallax runs.
- JavaScript disabled: centered CSS hover/focus still works and all content is visible.

### Responsive

- Desktop above 1180 px.
- 900 px.
- 640 px.
- A narrow mobile viewport below 640 px.

Do not introduce a new breakpoint just to tune the orbs. Because positions are percentages and the layer is clipped, the composition should scale with the existing media pane.

### Performance

- No console errors.
- No layout shift at rest or on hover.
- No running rAF after pointer activity stops.
- Pointer response remains smooth while the video is playing.
- The grain asset does not dominate paint time. Remove grain first if it does.

## Required verification

Run both commands and require clean exits:

```sh
npm run verify
npm run build
```

The task is not done until both pass and browser QA has covered `/`, the Pave case study, the Synapse case study, `/case-studies/`, and `/about/`.

## Definition of done

The implementation is complete when all of the following are true:

- Only the Pave card contains the gradient DOM.
- The existing card/video is unchanged at rest.
- Hover and link focus reveal a five-channel Pave gradient inside the media pane.
- Fine-pointer movement subtly rebalances the field.
- Copy, card chrome, links, transitions, and the Synapse identity are unaffected.
- Touch does not acquire a sticky decorative state.
- Reduced motion and no-JS each produce a readable, stable result.
- No dependency, new stylesheet, continuous animation loop, or unrelated refactor was added.
- `npm run verify` passes.
- `npm run build` passes cleanly.
- The required routes have been checked in a browser.

## Fidelity hierarchy

If time or browser behavior forces a compromise, preserve features in this order:

1. Containment inside the Pave media pane.
2. Five-channel Pave palette and soft horizon composition.
3. Cross-fade with the existing video.
4. Frost and vignette.
5. Hover/focus scale-and-opacity reveal.
6. Subtle pointer-relative displacement.
7. Grain.

Never trade link reliability, reduced-motion behavior, or mobile usability for decorative fidelity.
