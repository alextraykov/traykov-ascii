# 002 — Remove competing page-transition layers

- **Baseline commit:** f8855c0, with substantial existing uncommitted work. Recheck before implementation; do not assume a clean checkout.
- **Severity:** HIGH
- **Category:** Choreography / lifecycle cohesion (focused motion assessment)
- **Estimated scope:** 3–5 application files plus focused browser assertions; approximately 80–200 changed lines, to confirm after caller inventory.
- **Status:** Proposed; not implemented by this planning task.

## Problem

Home → Designing Pave visibly overlaps the small source title with the destination title and shows old homepage text/media over the new case. Root crossfade and shared project-copy animation compete. Snapshot pairing timing may explain the extra title, but that race is not yet proven. The authored old-root fade already explains source-page ghosting.

The violated design contract is one entrance owner with a stable, readable arrival. Remove the fragile visual transport rather than masking it with blur or longer timing.

## Where and current code

- public/page-transitions.js, prepareSharedElements, approximately lines 155–173:

```js
copy.dataset.transitionShared = "true";
copy.style.viewTransitionName = "project-copy";
```

- src/components/SiteHead.astro, early pagereveal handler, approximately lines 43–60:

```js
title.dataset.transitionShared = "true";
title.style.viewTransitionName = "project-copy";
```

- src/styles/global.css, final continuity overrides around lines 12688–12708:

```css
::view-transition-old(root) {
  animation-duration: var(--dur-3);
}
::view-transition-new(root) {
  animation-duration: var(--dur-4);
  animation-delay: 0ms;
}
```

The stylesheet also has earlier root transition declarations. Inspect all matching rules before editing. src/scripts/motion/reveal.js may require integration adjustment, but do not give it another entrance. Case markup in src/pages/case-studies/[slug].astro contains related transition attributes.

## Exact target

- At navigation commit, outgoing content disappears with **0ms imposed exit delay** and no visible outgoing snapshot afterward.
- Incoming main content alone reveals opacity **0→1 over 180ms**, **0ms delay**, using **--dur-2** and **--ease-out-expo**, cubic-bezier(**0.16, 1, 0.3, 1**).
- Translation **0px**, scale **1**, blur **0px**. Navigation stays stationary and fully opaque.
- There is no project-copy morph, shared-media bridge, or additional hero entrance during this arrival.
- Reduced motion, visitor pause, history restoration, and unsupported/failed transition APIs use **0ms** immediate readable arrival and ordinary navigation.

180ms fits a small opacity change that should finish quickly. The former 340ms spatial treatment has no purpose when nothing changes position. Reuse the existing reveal primitive and lifecycle; do not combine root snapshot fade with a second live-content fade. The executor must choose one mechanism that meets this observable contract.

## House conventions

Use src/scripts/motion/lifecycle.js as the eligibility and cancellation exemplar, and src/scripts/motion/reveal.js as the entrance-ownership exemplar. Preserve their public contracts. Keep all CSS in src/styles/global.css. Maintain SiteHead's early transition promise rejection handling even when deleting title naming.

## Steps

1. Snapshot current edits. Reproduce Home title and full-study CTA transitions to Pave and Synapse; capture frames before any change.
2. Inventory callers and attributes for project-copy, project-media, transition-selected, sharedCopy, and sharedMedia. Identify stale .project-card lookup versus current .project-overview markup.
3. Remove shared object transport and its proven dead branches. Preserve navigation/history state, promise handling, and ordinary anchor fallback.
4. Establish one incoming main-content opacity owner. Ensure above-fold reveal handlers consume that entrance rather than replay it. Keep header outside that visual treatment.
5. Settle immediately on new navigation, hidden document, visitor pause, reduced-motion changes, or restored history. Clear transient snapshot names/styles and navigation state; do not queue work.
6. Consolidate affected CSS declarations so a later override cannot restore the old/new crossfade.
7. Add focused lifecycle and visible-frame regression coverage, then run the required checks and browser review.

## Out of scope

No renderer/slug changes, content rewriting, video autoplay changes, About/Labs renderer work, new libraries, timing changes to unrelated artwork, or production deployment. Do not delete unrelated uncommitted user edits.

## Verification

- npm run verify, npm run build, npm run check:browser; final npm run check.
- Exercise both featured studies through title and CTA links, case-to-case links, direct entry, ordinary reload, and back/forward at preserved scroll positions.
- Test light/dark, desktop/mobile, reduced motion, visitor pause, no-JS, slow assets, background-tab navigation, and rapid repeated navigation.
- Capture initial, intermediate, and settled frames. After commit, exactly one destination title is visible; no old homepage copy/media floats over it. Header remains stationary, with no opacity dip.
- Confirm immediate usable links and controls; no hidden title or stale navigation lock after interruption.
- Feel check: repeat normal browsing without slowing recordings first. Arrival should register as a quiet change of page, with no duplicate movement or visible typography transport. Then scrub the recording to inspect artifacts that ordinary screenshots miss.
