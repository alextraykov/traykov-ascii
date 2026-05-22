# Porting the case-study previews into Astro

This bundle is the seed of a portable component package. The 9 preview components render the real UI from the `vibe-design` prototype inside your portfolio's MDX. Every preview is self-contained — its own state, its own theme toggle, its own replay.

**What's in this folder**

```
_astro-export/
├── components/      ← preview components you'll import from MDX
│   ├── Frame.tsx + .css       (shared chrome)
│   ├── SubagentBubblePreview.tsx
│   ├── PlanCardPreview.tsx
│   ├── ClarifyCardPreview.tsx
│   ├── CreditPillPreview.tsx
│   ├── CreditBannerPreview.tsx
│   ├── BackgroundGradientPreview.tsx
│   ├── BlurTextPreview.tsx
│   ├── TemplateEditorPreview.tsx
│   ├── SpacingControlsPreview.tsx
│   └── index.ts
├── providers/        ← theme + credit-state providers
├── lib/              ← utils (cn)
├── styles/           ← tokens.css, fonts.css, variables.css
└── fonts/            ← 5 .otf files
```

**What's *not* in this folder (but you still need)**

The previews import the real composites from `@/components/composite/...` and `@/components/ui/...`. You'll copy those out of the vibe-design `src/` tree into your Astro project. Instructions below.

---

## 1. Create the Astro project

```bash
npm create astro@latest my-portfolio -- --template minimal --typescript strict
cd my-portfolio
npx astro add react mdx
```

Say yes to all prompts. You should end up with these dependencies in `package.json`:

```json
{
  "dependencies": {
    "@astrojs/react": "^x",
    "@astrojs/mdx": "^x",
    "astro": "^x",
    "react": "^19",
    "react-dom": "^19"
  }
}
```

Add the runtime deps the real components use:

```bash
npm install \
  framer-motion \
  clsx \
  lucide-react \
  @radix-ui/react-accordion \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar \
  @radix-ui/react-checkbox \
  @radix-ui/react-collapsible \
  @radix-ui/react-context-menu \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-hover-card \
  @radix-ui/react-label \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-popover \
  @radix-ui/react-progress \
  @radix-ui/react-radio-group \
  @radix-ui/react-scroll-area \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-slider \
  @radix-ui/react-slot \
  @radix-ui/react-switch \
  @radix-ui/react-tabs \
  @radix-ui/react-toggle \
  @radix-ui/react-toggle-group \
  @radix-ui/react-tooltip \
  cmdk \
  sonner \
  vaul
```

These are the runtime deps the real components pull in. You can prune later if a specific preview doesn't need a given radix primitive.

---

## 2. Wire the path alias

Astro uses `tsconfig.json`. Add:

```jsonc
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

That's the same `@/` alias the vibe-design prototype uses — so imports inside the real components resolve without rewriting anything.

---

## 3. Copy the component system

Copy these folders **out of the vibe-design `src/` tree, into your Astro `src/`**:

```
vibe-design/src/components/  →  my-portfolio/src/components/
vibe-design/src/contexts/    →  my-portfolio/src/contexts/
vibe-design/src/lib/         →  my-portfolio/src/lib/
vibe-design/src/tokens/      →  my-portfolio/src/tokens/
vibe-design/src/fonts/       →  my-portfolio/src/fonts/
vibe-design/src/styles/variables.css  →  my-portfolio/src/styles/variables.css
```

You can leave out `vibe-design/src/pages/` and `vibe-design/src/App.tsx` — the portfolio doesn't need them.

Some composites reference `@/hooks/` or `@/types/`. If TypeScript complains about missing imports after the copy, grep the vibe-design source for those paths and pull the matching files across.

---

## 4. Copy this preview bundle

From this `_astro-export/` folder:

```
components/    →  my-portfolio/src/case-study-previews/
```

(The previews import `./Frame` relatively — keep them together.)

The `styles/`, `fonts/`, `providers/`, and `lib/` folders in this bundle are **duplicates** of what you already copied from the vibe-design tree. You can delete them here once you've confirmed the vibe-design copies are in place. They're included only so this bundle is self-describing.

---

## 5. Import global styles once

In `src/layouts/Layout.astro` (or wherever your top-level layout lives):

```astro
---
import '@/styles/variables.css';  // imports fonts.css + tokens.css
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="preload" href="/fonts/Polymath-Regular.otf" as="font" type="font/otf" crossorigin />
    <link rel="preload" href="/fonts/PinokioGrandTrial-Medium.otf" as="font" type="font/otf" crossorigin />
    <title><slot name="title">Portfolio</slot></title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

Move the OTF files into `public/fonts/` so the `<link rel="preload">` URLs work at runtime.

---

## 6. Set up MDX content collections

`src/content/config.ts`:

```ts
import { z, defineCollection } from 'astro:content';

const caseStudies = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(['page', 'composite', 'thematic']),
    status: z.enum(['shipped', 'prototype', 'exploration']),
    pubDate: z.date().optional(),
    tags: z.array(z.string()).optional(),
    heroImage: z.string().optional(),
    readTime: z.string().optional(),
  }),
});

export const collections = { 'case-studies': caseStudies };
```

Put your MDX files at `src/content/case-studies/`. Frontmatter on each file should match the schema.

---

## 7. Import previews inside MDX

Top of each MDX file:

```mdx
import { SubagentBubblePreview, PlanCardPreview } from '@/case-study-previews';
```

Then drop the preview at the right moment in the prose:

```mdx
Hover over the selected element and watch the tag badge settle 40ms after the
border lands. That's the move I'm proud of.

<SubagentBubblePreview client:visible />
```

**Use `client:visible` for every preview.** It defers hydration until the user scrolls the preview into view — so you don't ship 700KB of fonts + Framer Motion on the initial page paint.

For the `BackgroundGradientPreview`, `BackgroundGradientAnimation` reads `navigator.userAgent`. If Astro pre-renders with SSR, wrap the component with `client:only="react"` instead:

```mdx
<BackgroundGradientPreview client:only="react" />
```

---

## 8. Dark mode handoff

The previews flip `.dark` on their **own root**, not on `document.documentElement`. That means a preview's theme toggle only affects that preview — they won't fight your portfolio's global theme.

If your portfolio has a global theme toggle, make sure it toggles `.dark` on `<html>` (same convention the vibe-design prototype uses). Both the tokens and the real components read from `.dark` on `:root`, so your global switch propagates into every preview by default — and each preview's local toggle overrides it.

---

## 9. Screenshot images

Copy `vibe-design/case-studies/screenshots/` into `public/case-studies/screenshots/` in your Astro project. MDX image references become:

```mdx
![Builder — light mode](/case-studies/screenshots/pages/builder-light.png)
```

---

## 10. First sanity check

Run `npm run dev` in your Astro project. Create one test MDX file with one preview import. Open it in the browser. If it renders, everything's wired. If you get a font-not-found or token-not-defined error, trace back to steps 3 and 5.

---

## Performance notes

- Hydration cost per preview: ~8–15KB gzipped of JS (mostly Framer Motion, shared across the page).
- Fonts dominate the first-paint budget (~85KB gzipped). Preload only the weights the above-the-fold content uses; lazy-load the rest.
- The `TemplateEditor` preview is the heaviest — ~60KB of its own JS. Consider `client:only="react"` on pages that include it, or a Suspense boundary.

## Known gaps

- The `matchPalette` export isn't on `BackgroundGradientAnimation/index.ts` — the preview imports from the deep path. If you re-export `matchPalette` from the index you can simplify the preview's import.
- `TemplateEditor` has no SSR guard. It accesses `document` during hydration — use `client:only="react"` on MDX pages that include it.
- Some radix components emit warnings about `ResizeObserver` in strict mode. Cosmetic, but if it bothers you set `<React.StrictMode>` to false in the Astro React config.
