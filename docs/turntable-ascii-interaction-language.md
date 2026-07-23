# Turntable ASCII Interaction Language

Status: canonical reference  
Approved reference: homepage portrait turntable  
Route: `/`  
Primary implementation: `src/scripts/obj-turntable.js`

## Why this document exists

The homepage portrait interaction is no longer an isolated shader experiment. It is the clearest expression of the portfolio's visual language.

The effect works because it does not place generic particles over an object. It treats the visible ASCII glyphs as material:

1. A rendered object becomes a field of glyphs.
2. Pointer proximity pushes that field locally.
3. Pointer velocity tears real glyphs out of the field.
4. Those glyphs lose visual density as they lose energy.
5. A faint structural underprint remembers the undamaged form.
6. The field regenerates after the displaced material leaves.

The name for this behavior is **structural dispersal**.

This document freezes the approved behavior before the language is adapted to other components. New work may reuse its principles, but should not casually change the homepage reference.

## The visual thesis

The portfolio is a printed terminal whose interface behaves like physical ASCII material.

The material has six properties:

- **Structure** — every visible mark belongs to an underlying form.
- **Density** — stronger or nearer energy produces heavier glyphs.
- **Pressure** — pointer proximity bends the local field without destroying its identity.
- **Momentum** — detached glyphs remember the direction in which they were released.
- **Decay** — glyphs become smaller and quieter as their energy falls.
- **Memory** — a faint guide remains when the active surface is displaced.

The result should feel responsive, legible, and slightly physical. It should not feel like confetti, a cursor sparkle library, or a particle emitter placed on top of the page.

## Renderer stack

The portrait is produced by three aligned layers:

```text
hidden WebGL source
  -> grayscale pixel sample
  -> object and tone fields
  -> faint dash underprint
  -> active ASCII surface
  -> detached ASCII particles
```

### 1. Hidden WebGL source

`/models/me.glb` is loaded into Three.js, normalized to a stable bounding box, lit, and slowly rotated.

The WebGL canvas is source data. It is not the visible design surface.

### 2. Sample grid

The source canvas is drawn into a small sampling canvas:

```js
sampleContext.drawImage(renderer.domElement, 0, 0, cols, rows);
const pixels = sampleContext.getImageData(0, 0, cols, rows).data;
```

Desktop stage dimensions are derived from the component rather than the viewport:

```js
cols = floor(width / density);
rows = floor(height / (density * 1.55));
```

This keeps character cells aligned to the actual stage. Font size and line height are calculated from the same grid.

### 3. Object mask

Each sampled pixel is converted to perceived luminance:

```js
const luma =
  (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
```

Cells below `0.94` luminance belong to the solid object mask:

```js
objectMask[cell] = luma < 0.94 ? 1 : 0;
```

The mask is used for hit testing and for constraining surface displacement. It prevents the portrait from behaving like an unbounded rectangle of characters.

### 4. Tone field

Darkness is the base signal:

```js
const darkness = 1 - luma;
```

Brightness, contrast, hover trail, click ripple, and device motion contribute to the final tone:

```js
const tone = clamp(
  (darkness + brightness - 0.5) * contrast
    + 0.5
    + trail * hover
    + ripple * click * 0.24
    + motionTone,
  0.08,
  1
);
```

Tone selects a glyph from the surface ramp:

```js
[" ", "·", "•", "+", "*", "✦", "✶", "✷", "✸", "✹"]
```

The ramp is ordered from empty to dense. Its order is behavioral, not merely typographic.

This surface ramp is different from the portfolio text-scramble ramp:

```text
" .:+*#%@"
```

Use the surface ramp for rendered material. Use the canonical text ramp for labels, navigation, and decoding.

## Initial load: structural scan

The portrait first appears as horizontal dashes.

The load is not a separate illustration. Every non-empty shader cell is temporarily replaced with `-`, so the number and position of loading dashes exactly match the pre-displacement surface topology.

The scan runs from top to bottom. The line state then reloads into the full glyph field.

Rules:

- Loading dashes use the faint structural color.
- The dash count must come from the sampled object, not from a hand-authored outline.
- The full glyph field must occupy the same cells after decoding.
- Reduced motion skips the animated scan and presents the readable final state.

## Faint structural underprint

The portrait keeps a second `<pre>` under the active ASCII surface.

For every frame, the renderer records the eligible pre-displacement cells before hover lifting, particle removal, or click displacement:

```js
silhouetteGlyphs[cellIndex] = "-";
```

The underprint therefore has the same topology as the initial loading state.

Layer order:

```text
z1  faint dash underprint
z2  active glyph field and detached glyphs
```

The underprint serves three purposes:

- it preserves recognition when the active surface opens into a hole;
- it makes regeneration feel like material returning to a remembered structure;
- it visually connects loading, interaction, and recovery.

The underprint should remain clearly quieter than the active surface. It is a guide, not a second drawing competing for attention.

## Hover interaction

Hover combines two related systems:

1. **field displacement** pushes glyphs while they remain part of the object;
2. **glyph lifting** detaches actual surface glyphs and gives them momentum.

Both systems respond to the same pointer, but they communicate different material states.

### Pointer coordinates and velocity

Pointer coordinates are mapped into grid space:

```js
point.x = ((clientX - left) / width) * (cols - 1);
point.y = ((clientY - top) / height) * (rows - 1);
```

Velocity is measured in grid cells per millisecond:

```js
velocity.x = (point.x - previous.x) / delta;
velocity.y = (point.y - previous.y) / delta;
```

This is important: a fast gesture should displace more material than a slow inspection.

### Proximity pressure

The hover trail writes an elliptical pressure field. Vertical distance is weighted more heavily so the response follows the visual proportions of text cells:

```js
const dx = (x - pointerX) / radius;
const dy = ((y - pointerY) / radius) * 1.45;
const distance = sqrt(dx * dx + dy * dy);
```

Pressure falls off nonlinearly:

```js
pow(1 - distance, 1.35)
```

When the surface is displaced, local pressure uses:

```js
pow(1 - distance / radius, 1.7)
  * heat
  * 22
  * magnetism
```

This creates a strong center with a softer edge. A linear falloff would read as a hard circular cursor mask.

Displaced surface glyphs remain inside the object mask. The portrait flexes before material breaks free.

### Velocity-driven glyph lifting

Hover particles are not newly stamped decoration. Candidate particles are sampled from currently visible source glyphs inside the cursor radius:

```js
if (
  distance <= radius
  && objectMask[index]
  && glyph !== " "
) {
  candidates.push({ x, y, index, glyph });
}
```

Speed becomes normalized interaction intensity:

```js
intensity = clamp((speed - 0.008) / 0.22, 0, 1);
```

Intensity controls:

- sampling radius: `2` to `5.5` grid cells;
- emitted glyph count: approximately `4` to `22`;
- particle velocity scale;
- source removal strength;
- lifetime: `460` to `820ms`.

The emitted particle stores the exact source character:

```js
{
  x,
  y,
  vx,
  vy,
  glyph: sourceGlyph,
  mode: "hover",
  life: 1
}
```

This is the reason the effect feels like smearing the shader rather than drawing a cursor trail.

### Source lifting

When a glyph detaches, its source cell is weakened through `smearSourceLift`.

Strong lift removes the active glyph:

```js
if (sourceLift > 0.16) continue;
```

Partial lift reduces its tone:

```js
liftedTone = tone * (1 - sourceLift * 0.84);
```

The faint dash underprint is not lifted. It remains as structural memory.

### Particle momentum

Hover particles inherit the pointer's direction and speed with a small deterministic variance.

Airborne particles are allowed to receive more acceleration only along their existing heading:

```js
const projectedMovement =
  movement.x * headingX
  + movement.y * headingY;

if (projectedMovement > 0) {
  velocity += heading * projectedMovement * influence;
}
```

This directional projection is a critical behavior.

If the pointer reverses direction:

- existing left-moving particles continue left;
- newly emitted particles may move right;
- old particles never snap around and chase the new cursor direction.

Momentum belongs to the particle generation that received it.

### Leaving the object and canvas

The gesture does not stop abruptly when the pointer stops touching the portrait.

While particles remain active, movement outside the object can continue accelerating them along their own headings.

When the pointer leaves the canvas, a synthetic continuation travels toward the nearest outer edge for `240ms` using cubic-out easing. This makes the distortion appear to leave with the cursor rather than freeze at the boundary.

The synthetic continuation:

- begins at the last pointer position;
- uses the actual exit vector when available;
- falls back to pointer velocity;
- falls back again to an outward vector from the stage center;
- terminates beyond the stage padding.

The effect should feel like completing a physical stroke, not like an animation playing after hover.

### Horizontal slow fields

The outer `26%` of the stage on both the left and right acts as an invisible braking and dispersal field for outward-moving hover glyphs.

The field only affects particles moving toward its corresponding edge:

- left-moving particles enter the left field;
- right-moving particles enter the right field;
- click particles remain ballistic and do not use the field.

Field strength increases progressively from the inner boundary to the stage edge:

```js
leftStrength = (0.26 - normalizedX) / 0.26;
rightStrength = (normalizedX - 0.74) / 0.26;
```

The field applies three related changes:

1. horizontal velocity receives additional exponential drag;
2. a stable per-particle vertical fan separates the glyphs;
3. life decay slows by up to `52%`, leaving enough time to see the density ramp.

The additional drag uses a `145ms` reference constant weighted by field depth. It does not begin as a hard wall. Particles keep their horizontal direction, cross into the field, lose momentum progressively, fan apart, and finish their glyph decay while still visible.

The vertical fan direction is assigned when a glyph is lifted. Glyphs sampled above the pointer tend upward and glyphs sampled below it tend downward, with deterministic variance. The field therefore disperses a coherent stroke instead of adding random jitter at the edge.

This edge behavior is part of the approved hover interaction. It ensures the slowdown and large-to-small decay remain visible rather than finishing immediately outside the canvas.

## Glyph decay: large to small

Detached glyphs begin as the exact character removed from the surface.

As particle life falls below `0.36`, the renderer stops showing the stored source glyph and selects from the same ordered surface ramp:

```js
fadeIndex = round(life * (ASCII_RAMP.length - 1));
visibleGlyph = ASCII_RAMP[fadeIndex];
```

Because life decreases over time, the visible sequence moves from dense marks toward sparse marks:

```text
✹ → ✸ → ✷ → ✶ → ✦ → * → + → • → · → space
```

This is both the fade and the scale change. The interaction does not need opacity-only particles because character density communicates energy loss more distinctly.

Fast particles also clear one or two cells behind themselves. This small wake prevents dense glyphs from turning into visually continuous streaks.

## Decay and regeneration

Hover velocity uses exponential drag:

```js
hoverDrag = exp(-delta / 230);
```

Hover particle life decreases linearly across its velocity-dependent lifetime.

Source lift decays on the shared recovery clock:

```js
liftDecay = exp(-delta / 420);
```

The field regenerates because lifted source cells gradually become eligible again. No replacement glyphs are spawned into the hole. The original sampling pass simply resumes drawing those cells.

This matters to the visual language:

- removal and restoration are two states of one structure;
- regeneration follows the original rendered source;
- the silhouette does not have to be reconstructed manually.

## Click interaction

Click is a stronger, deliberately different gesture.

It ejects actual source glyphs left and right:

- radius: `7` to `11` grid cells;
- maximum particles: `68`;
- horizontal side alternates per particle;
- center cells receive more force;
- vertical velocity preserves some local position and deterministic variance.

Click particles use `mode: "click"` and are ballistic. Cursor movement must never steer them.

The click system shares one `420ms` decay constant across:

- explosion displacement;
- particle velocity decay;
- particle life;
- source lift recovery;
- color tint, if enabled.

This synchronization prevents the hole, displaced field, and detached material from feeling like unrelated animations.

## Collision and legibility

Displacement can map multiple source glyphs into the same output cell.

The renderer stores a score for every target cell and keeps the strongest source:

```js
if (score >= targetScores[targetIndex]) {
  outputGlyphs[targetIndex] = glyph;
  targetScores[targetIndex] = score;
}
```

Without this rule, iteration order would decide which glyph survives, producing unstable flicker.

## Timing reference

| Behavior | Timing |
| --- | ---: |
| Desktop ASCII sampling | 60 fps target |
| Mobile/coarse pointer sampling | 24 fps target |
| Hover velocity drag constant | 230ms |
| Horizontal slow-field width | 26% per edge |
| Horizontal slow-field drag reference | 145ms |
| Maximum life-decay reduction in slow field | 52% |
| Hover particle lifetime | 460–820ms |
| Canvas-exit continuation | 240ms |
| Click/displacement/recovery constant | 420ms |
| Homepage reload reveal | 1780ms |

These values describe the approved reference. Adaptations should use system duration tokens and preserve the relative order:

```text
input response
  < visible displacement
  < particle decay
  < full structural recovery
```

## State model

```text
REST
  stable active surface
  faint underprint aligned underneath

PRESSURE
  pointer touches object
  nearby surface glyphs displace within mask

LIFT
  sufficient pointer velocity
  real glyphs detach
  source cells weaken

CONTINUE
  pointer leaves object or stage
  active particles complete their existing trajectory

DECAY
  drag reduces velocity
  glyph density steps down through the ramp

RECOVER
  source lift falls
  sampled glyphs return over the underprint

REST
```

Click branches from `REST`, `PRESSURE`, or `LIFT` into a ballistic burst, then rejoins `RECOVER`.

## Accessibility and input contracts

### Reduced motion

With `prefers-reduced-motion: reduce`:

- the turntable does not rotate continuously;
- the reveal finishes immediately;
- pointer-leave continuation is disabled;
- click particles are not emitted;
- active smear state is cleared on exit;
- the object remains readable at rest.

### No JavaScript

Text and interface content must remain readable without JavaScript. Turntables are progressive decorative enhancement and must not hide nearby meaning.

### Coarse pointer and mobile

Coarse pointers use a lower ASCII frame rate. Device-motion effects require a user gesture before permission is requested.

### Semantics

The visible `<pre>` layers are decorative. The containing turntable owns the accessible image label when a label is useful. Decorative card turntables use an empty label and remain hidden from assistive technology.

## What makes an adaptation belong to this language

An adaptation does not need a 3D model or hundreds of particles. It belongs when it preserves at least three of these relationships:

1. source structure maps to glyph structure;
2. proximity changes local density or position;
3. velocity controls how much material detaches;
4. detached marks preserve momentum;
5. energy loss moves down an ordered character ramp;
6. a faint structure remains during disruption;
7. recovery restores the original structure rather than drawing a replacement;
8. reduced motion exposes a complete readable state.

## Portfolio-wide primitives

The language should be applied with different intensity levels.

### Level 0 — Static structure

Use for dense reading surfaces and quiet metadata.

- faint dash rules;
- monospace labels;
- stable ASCII diagrams;
- no continuous motion.

### Level 1 — Decode

Use for navigation, labels, counts, buttons, and compact headings.

- text scrambles through `" .:+*#%@"`;
- characters resolve in reading order;
- focus and keyboard receive the same result as hover;
- reduced motion shows the final label.

### Level 2 — Erosion

Use for card edges, media captions, tags, and selected states.

- local marks step down the character ramp;
- a structural line or label remains;
- motion is bounded to the component.

### Level 3 — Trail

Use for image trails, media previews, diagrams, and expressive card marks.

- velocity controls emitted density;
- particles preserve heading;
- movement may finish just outside the component;
- trails decay into smaller glyphs.

### Level 4 — Structural dispersal

Reserve for hero objects and a small number of high-value interactive surfaces.

- sampled or explicit source structure;
- field pressure plus real glyph lifting;
- persistent underprint;
- click burst and regeneration;
- complete reduced-motion state.

Not every component should reach Level 4. If everything explodes, nothing feels important.

## Component adaptation map

This is the initial intent, not permission to implement every effect identically.

| Component or pattern | Recommended level | Candidate behavior |
| --- | ---: | --- |
| Site navigation | 1 | existing decode, tighter directional scan |
| Theme toggle | 1–2 | icon cells decode and invert around the switch |
| Identity rotator | 1 | bilingual decode through canonical ramp |
| Project card shell | 2 | edge erosion and faint structural memory |
| Project mark/media | 2–3 | source-aware trail appropriate to each identity |
| Project metadata/status | 1 | hover/focus decode |
| Case-study table of contents | 1–2 | scanning active rail with fading character tail |
| Case figures and captions | 1–2 | caption decode and local edge erosion |
| Case contact prompt | 2 | bounded pressure field around the call to action |
| Footer booking interface | 1–2 | decoded state changes, faint frame memory |
| About image trail | 3 | align existing dispersal with shared decay rules |
| Turntable hero | 4 | canonical reference; preserve behavior |

## Component-preview playground

The existing `/playground/` remains the renderer-tuning studio for ASCII shaders and turntables.

A separate `/component-preview/` route catalogues production UI.

The catalogue renders real components, not visual copies.

Each preview includes:

- component name and source file;
- production props or fixture;
- light and dark theme support;
- default, hover, focus, active, loading, and reduced-motion notes where applicable;
- viewport-width controls using the canonical breakpoints;
- an interaction-level label from `0` to `4`;
- a short statement of which structural-dispersal principles it uses;
- links to the production routes where the component appears.

Current reusable component inventory:

- `CaseContactPrompt.astro`
- `DitherImageTrail.astro`
- `ObjTurntable.astro`
- `PaveTurntable.astro`
- `ProjectCard.astro`
- `ProjectMark.astro`
- `SiteFooter.astro`
- `SvgLogoTurntable.astro`
- `SynapseSysTurntable.astro`
- `ThemeToggle.astro`

Infrastructure-only components such as `SiteHead.astro` and `SiteAnalytics.astro` are documented in the catalogue but do not receive a decorative visual stage.

The catalogue must also track production patterns that currently live inline in pages:

- site navigation;
- homepage identity rotator;
- section heading;
- case-study progress and reading tools;
- case-study figure families;
- case sibling navigation;
- contact form and contact panels;
- about metrics and experience rows;
- turntable control panels.

These inline patterns should be promoted into components only when doing so improves reuse or testing. The catalogue must not force abstraction for its own sake.

### Generated state contract

`/component-preview/` is not a static catalogue or a sheet of decorative variants. It is a state generator.
Each fixture exposes only the states that make sense for its interaction level, and the control must drive
the real production event path whenever one exists.

The shared state vocabulary is:

- `REST` — complete source structure, zero borrowed energy;
- `PRESSURE` — proximity changes local position or density without detachment;
- `LIFT` — pointer velocity detaches source glyphs and fixes their heading;
- `CONTINUE` — the cursor leaves, while the existing motion finishes outside the source;
- `CLICK` / `ACTIVE` — a short impulse throws source material without erasing structural memory;
- `DECAY` — energy steps down through the ordered glyph ramp;
- `RECOVER` — the displaced source regenerates in place;
- `FOCUS` — keyboard-visible equivalent of the component's hover affordance;
- `LOADING` — scan/decode state with stable reading order;
- `REDUCED` — readable source at rest, with no simulated momentum.

The state lab also exposes `FORCE` and `TIME`. `FORCE` changes how much source material can detach; `TIME`
changes the interval between inputs, not the approved production decay constants. This keeps the homepage
reference timing intact while making the causality inspectable.

| Component | Generated states | Real driver |
| --- | --- | --- |
| `ThemeToggle` | rest, hover, focus, active, light, dark, auto, reduced | theme controller, focus, global ASCII splash |
| `IdentityRotator` | rest, English, Bulgarian, decode, loading, reduced | canonical text ramp and bilingual source data |
| `CaseContactPrompt` | rest, hover, focus, active, decay, recover, reduced | production stream, decode, and click splash |
| `ProjectCard` | rest, hover, focus, active, loading, decay, recover, reduced | card identity hover and text decode |
| `ProjectMark` | rest, hover, trail, decay, recover, reduced | identity-specific media or turntable source |
| portrait and logo turntables | rest, pressure, lift, continue, click, decay, recover, reduced | synthetic pointer sequences through production handlers |
| `DitherImageTrail` | rest, trail, click, decay, recover, reduced | document-level production pointer and explosion handlers |
| `SiteFooter` | rest, hover, focus, active, booking, decay, recover, reduced | production decode, click splash, and dialog |
| nonvisual infrastructure | rest, light, dark, auto, loading, reduced | metadata/theme state only; no fake visual fixture |

Generated telemetry is a legibility aid, not a claim that the renderer measures a literal percentage. Its
job is to make the causal chain readable: source → pressure → velocity → detachment → momentum → decay →
memory → recovery.

## Guardrails

Do:

- preserve the homepage portrait as the reference behavior;
- derive particles from source glyphs;
- make distance and velocity visibly different inputs;
- use ordered ramps to communicate energy;
- keep recovery tied to original structure;
- use existing tokens for timing and color;
- support pointer, keyboard, reduced motion, and no-JS reading;
- give each case-study identity room to adapt the shared primitives.

Do not:

- add generic dots over a component and call it ASCII dispersal;
- reverse old particle momentum when the pointer reverses;
- freeze trails at component boundaries;
- use opacity as the only form of decay when glyph density can communicate it;
- apply full structural dispersal to every link and paragraph;
- let decorative motion obscure reading or click targets;
- duplicate production component markup inside the playground;
- change the approved turntable timings while extracting the shared language.

## Source map

- `src/scripts/obj-turntable.js` — canonical sampling, pressure, particles, click burst, decay, and recovery.
- `src/scripts/turntable-ascii-reveal.js` — initial dash scan and reload.
- `src/components/ObjTurntable.astro` — semantic and visual layer structure.
- `src/styles/global.css` — turntable colors, underprint, typography, theme, and reduced motion.
- `src/pages/index.astro` — approved homepage configuration.
- `src/scripts/motion/scramble.js` — canonical text decode ramp.
- `src/scripts/motion/index.js` — bilingual identity decode.
- `src/pages/playground.astro` — existing renderer-tuning playground.
- `src/pages/component-preview.astro` — production component catalogue and responsive fixture stages.
- `docs/ascii-shader-system.md` — older general pixel-to-ASCII renderer notes.

## Acceptance test for future changes

Before changing or reusing the interaction, answer:

1. What is the source structure?
2. What does distance control?
3. What does velocity control?
4. What preserves momentum?
5. How does the character ramp express energy loss?
6. What remains while material is displaced?
7. How does the original structure regenerate?
8. What is the readable reduced-motion state?
9. Is this component important enough for the selected interaction level?

If those answers are unclear, the work is probably decorative particle styling rather than this visual language.
