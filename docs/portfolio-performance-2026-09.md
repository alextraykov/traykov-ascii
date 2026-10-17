# Portfolio performance and cross-device evidence — 2026-09

This is an evidence plan for the broad goal of a fast, reliable portfolio on desktop, tablet, and mobile. It records what the repository can prove locally and the evidence that still requires production or real hardware. A green local check does not prove field performance or universal device usability.

## Local performance sample

Run `npm run audit:performance` after a build. The audit opens a fresh Playwright browser context for every route and shared viewport, waits a bounded two seconds after `DOMContentLoaded`, then records local resources, buffered Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS) using the session-window method, and long-task totals.

The JSON labels this profile `cold-local-lab`. It is advisory, has no network throttling, and is explicitly not field INP or Chrome UX Report (CrUX) data. It also cannot represent a real phone or tablet CPU, radio, memory state, assistive technology, or the production CDN.

## Requirements matrix

| Goal | Local evidence | What it proves | Deployment or physical-device follow-up |
| --- | --- | --- | --- |
| Initial load and media cost | `npm run audit:performance` across desktop, two tablet orientations, mobile, and narrow mobile; `npm run verify` media budgets | Relative local resource cost, response failures, largest resources, LCP, CLS session windows, and long tasks during a fixed early sample | Production CDN test and field LCP/INP/CLS or CrUX where eligible; the constrained local CPU/network sample is recorded below |
| Layout at five widths | `npm run check:browser` with the shared 1440, 1180, 820, 390, and 320 viewport matrix; targeted Chromium and WebKit evidence while iterating | Required content, navigation, redirects, visible media/fallbacks, and no document overflow in normal, no-JS, and reduced-motion modes | Visual review on physical devices and at browser zoom/text-size settings |
| Keyboard and touch navigation | Browser contract semantic anchors, visible controls, focusable native elements, and touch-enabled tablet/mobile contexts; focused keyboard journeys | The same DOM contract is present under touch-capable contexts. At 320px and 390px the two-row primary navigation keeps 12px type and at least 48px targets. | Screen-reader pass and real touch scrolling/tapping in Safari/Chrome |
| Motion and no-JavaScript rest state | Browser contract normal/no-JS/reduced-motion modes plus the motion contract when motion changes | Primary content remains readable, native video controls remain available without JavaScript, and reduced motion has a rest state in Chromium | OS-level reduced-motion and real-device review; Safari-specific behavior |
| Core forms and search | Contact API unit tests, configured/fallback contact branch contracts, and completed focused search/keyboard journeys | Server-side contact safeguards, working local search journeys, and a useful fallback when Turnstile is absent | Manual form error/success, autofill, virtual keyboard, and a configured production submission. The deployed protected form remains unavailable until its Turnstile and sending service are configured; see [contact form setup](contact-form.md). Direct email and booking remain actionable without that configuration. |
| Reliability outside the lab | Same-origin response failures and console/page errors in browser contract | Local preview does not exhibit the measured failure | Production monitoring, Web Vitals/RUM collection, error telemetry, and real-device regression evidence |

## Page-family coverage

The cold-local-lab route set covers the homepage, About, the case-study redirect and selected case studies, Notes directory and a note, Contact, Labs directory, and one interactive lab. That gives the audit representative media-heavy, reading, form, directory/search, and scripted-page samples. It is not a claim that every note, lab, form state, search query, or interaction is covered; those need route-specific behavior checks when they change.

## Final verification

The parent full `npm run check` completed successfully against the final application build: deterministic verification and unit tests passed, all 65 pages built, and all 426 browser cases passed with zero failures. The matrix covers 1440, 1180, 820, 390, and 320px widths in normal, reduced-motion, and no-JavaScript modes, plus the generated-image preflight. The terminal evidence is `/tmp/portfolio-ux-final-check.log`.

Parent visual checks also covered the homepage icon control at 320px (successful pause, correct accessible label, 48px target, no overflow) and the image-rich 2019 note at 820px (readable text and correctly sized photography).

## Current layout and playback evidence

The current static-output preflight scans every generated case-study and note page before Chromium launches. The sized build contained 46 pages and 45 local `<img>` elements in those families, with `width` and `height` present and positive on all 45. The helper resolves only real paths under `public/`, rejects remote, malformed, missing, unsupported, traversal, and escaping symlink sources, preserves existing author attributes, and invalidates cached metadata after a file changes. Its Node tests cover those cases.

This fixes a demonstrated lazy-image failure rather than adding a cosmetic aspect ratio: two Pave images had initially occupied about 2px, then grew by hundreds of pixels during a native chapter jump. The current WebKit case-navigation run, saved at `/tmp/portfolio-webkit-case-navigation-sized.log`, passed 30 of 30 actual second- and last-chapter clicks across Designing Pave and Synapse, all five viewport widths, and normal, reduced-motion, and no-JavaScript modes. The destination heading and active table-of-contents link both remained correct.

The homepage video lifecycle now observes the visual frame rather than the surrounding figure, so a caption cannot keep playback active after the recording itself has moved out of view. The observer subtracts the cached sticky-header height from its viewport and refreshes that margin only on resize. The browser contract exercises the recording paused behind the header while its caption remains visible, its visible autoplay resume, explicit play, manual pause, reduced-motion, no-JavaScript controls, and initial `/#work` navigation behavior.

The focused Chromium rerun at 390px and 320px passed all 25 checks: the static-output preflight plus the homepage, Designing Pave, Synapse, and Contact in normal, reduced-motion, and no-JavaScript modes. Its terminal record is `/tmp/portfolio-ux-targeted-narrow.log`. A separate 320px manual inspection confirmed the latest-work icon control pauses the video, exposes its accessible Play label, retains a 48px target, and does not introduce horizontal overflow.

The focused keyboard journey record, `/tmp/portfolio-keyboard-journeys-final.log`, passed 6 of 6 checks: primary tab focus at three widths and keyboard opening, searching, and clearing in both Chromium and WebKit at those widths. That is completed local interaction evidence; a screen-reader pass and physical-device input remain deployment follow-up rather than inferred coverage.

## Constrained local measurement

`/tmp/portfolio-constrained-final.json` records the current advisory measurement: 24 rows across the homepage, About, case-study redirect, Designing Pave, Notes directory, Contact, Product Systems Kit, and the image-rich 2019 year-in-review note. It covers desktop 1440, tablet portrait 820, and mobile 390. Each row used a fresh context, 4× CPU slowdown, 150ms latency, 1.6Mbps downstream, 750kbps upstream, and a 10-second post-`DOMContentLoaded` sample. It returned zero errors and zero failed responses; LCP ranged from 740–1392ms, the largest CLS session window was 0.0172, and long-task totals ranged from 58–123ms.

This is still a local lab measurement, not field data. The desktop and tablet homepage samples had the Pave loading MP4 pending at the sample boundary, so their aggregate resource totals exclude that incomplete request and must not be read as its full weight. The measurement is useful for repeatable hotspot comparisons, not a production or universal-device claim.

## Recorded image-loading change

On September 13, image-led homepage project overviews changed from eager to lazy loading. Their `width`, `height`, alternative text, captions, and all video behavior remained unchanged. The first before/after samples each covered 52 route-and-viewport rows (13 routes × four viewports), used clean contexts, and returned no same-origin response failures.

| Homepage viewport | Before encoded / transfer | After encoded / transfer | Change |
| --- | --- | --- | --- |
| Desktop 1440×1000 | 2,591KB / 2,599KB | 2,086KB / 2,093KB | −505KB / −506KB |
| Tablet portrait 820×1180 | 957KB / 964KB | 571KB / 578KB | −386KB / −386KB |
| Tablet landscape 1180×820 | 957KB / 964KB | 451KB / 458KB | −506KB / −506KB |
| Mobile 390×844 | 957KB / 964KB | 571KB / 578KB | −386KB / −386KB |

The remaining 119KB Pipelines lead image still appears in the portrait/mobile bounded sample because native lazy loading may request nearby content before it is visually reached; this audit does not establish the browser’s exact look-ahead threshold. The visible desktop Pave loading video remains a 1.63MB hotspot, and the case-study redirect can fetch multiple Pave videos; neither changed in this image-only step. Post-change local LCP values were 48–64ms, CLS session-window values were at most 0.0033 on the homepage, and no long tasks were observed. Those numbers are comparison evidence for this local run, not a field-performance claim.

The completed deterministic gate for this image-loading comparison was `npm run check`, saved to `/tmp/portfolio-device-check.log`: verify and build passed, then the then-current four-viewport normal/no-JS/reduced-motion browser matrix passed all 340 cases. This is historical comparison evidence; the shared matrix now covers five widths and must be rerun after later interaction and intrinsic-size work. The before audit is `/tmp/portfolio-performance-expanded.json`; the matching after audit is `/tmp/portfolio-performance-after.json`.

## How to read the evidence

Treat the performance audit as a hotspot finder. Compare like-for-like route and viewport rows after a change; do not turn its local milliseconds into a public performance claim. The resource list identifies candidates for loading-policy, media-encoding, or responsive-asset work. The browser contract detects regressions in deterministic states, while the remaining-evidence column keeps physical-device and field validation visible rather than assumed complete.
