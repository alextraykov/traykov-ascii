# Creative Coding Sketchbook

The local sketchbook lives at `/labs/sketchbook/`. It is a small Canvas runtime
inside the existing Astro project, so it uses the same development server and
adds no dependencies.

## Run it

```sh
npm install
npm run sketches
```

The second command opens `http://localhost:4321/labs/sketchbook/`. Normal Astro
hot reload applies: save a sketch file and the browser refreshes it.

Interface shortcuts:

- `1`–`5`: switch starter sketch;
- `Space`: pause or play;
- `R`: create a new seed;
- `S`: save the current canvas as PNG;
- `F`: preview the active sketch fullscreen without interface controls. Press `F`
  again or `Esc` to leave fullscreen.

The selected sketch and seed stay in the URL. Parameters are intentionally
ephemeral so a reload remains a clean reset.

## Add a sketch

1. Copy `src/sketches/_template.js` to a descriptive filename.
2. Give it a unique `meta.id`, title, description, technique, and controls.
3. Import the module in `src/sketches/index.js`.
4. Add it to the exported `sketches` array.

The directory and inspector are generated from `meta`; no page markup is
required.

## Sketch contract

Each module exports `meta` and `createSketch`.

```js
export const meta = {
  id: "signal-study",
  title: "Signal study",
  technique: "Canvas 2D",
  description: "What the sketch is testing.",
  controls: [
    {
      key: "speed",
      label: "Speed",
      type: "range",
      min: 0,
      max: 2,
      step: 0.01,
      default: 0.4
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      default: "one",
      options: [
        { value: "one", label: "One" },
        { value: "two", label: "Two" }
      ]
    }
  ]
};

export const createSketch = ({ canvas, context, params, seed, pointer }) => ({
  resize({ width, height, dpr }) {
    // Cache the current CSS size and device-pixel ratio.
  },

  frame({ time, delta, width, height, dpr }) {
    // Draw one frame. `params` and `pointer` are live mutable objects.
  },

  destroy() {
    // Optional cleanup for sketch-owned resources.
  }
});
```

The host owns canvas resizing, animation, pause behavior, reduced-motion
handling, pointer normalization, controls, seeds, and PNG export.

## Starter sketches

- `dither-orbit.js`: 8×8 Bayer ordered dithering;
- `ascii-current.js`: luminance-to-glyph mapping with the canonical ASCII ramp;
- `lcd-memory.js`: RGB subpixel, scan-loss, bloom, and channel separation;
- `floyd-signal.js`: one-bit Floyd–Steinberg error diffusion;
- `blocktype-dither.js`: analytic Gerstner wave field quantized into Departure Mono blocktypes.

Shared deterministic random and noise helpers live in
`src/sketches/shared/math.js`.

## Blocktype wave field

`blocktype-dither.js` evaluates six wind-aligned Gerstner-style waves in one
WebGL fragment pass. A trochoidal phase warp sharpens and leans each crest while
keeping troughs rounder; shorter crossing waves break the symmetry.

The resulting height and normal field drives view-dependent reflection,
specular glints, and restrained foam at compressed high crests. That continuous
tone is quantized between the measured Departure Mono coverage levels for
blank, `░`, `▒`, and `▓` with a stable Bayer 4×4 threshold. The glyph grid
therefore is the surface—it is not a texture or overlay applied after rendering.

Pointer motion adds a small local wake without attaching an action to clicks.
With reduced motion enabled, directional phases freeze into a readable static
surface.

The implementation stays analytic: no framebuffer simulation, mesh, image
asset, or dependency is required. The current sketchbook render loop sustains
59–60 FPS in the local browser at its DPR-capped canvas size.
