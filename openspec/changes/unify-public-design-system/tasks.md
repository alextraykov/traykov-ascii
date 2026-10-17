## 1. Specification and shared foundation

- [x] 1.1 Create and strictly validate the OpenSpec proposal, capability specs, design, and task plan; verify with `openspec validate unify-public-design-system --strict`.
- [x] 1.2 Align shared public type, surface, spacing, focus, responsive, and motion-rest tokens in `global.css`; verify light/dark desktop/mobile readability and no horizontal overflow.

## 2. Public route hierarchy and copy

- [x] 2.1 Remove arbitrary eyebrow props from project cards and case contact prompts; verify featured case links and booking fallbacks with `npm run verify`.
- [x] 2.2 Simplify homepage, case, Notes, About, Contact, CV, Labs, and public tool shells; verify one clear heading per section across the public route set.
- [x] 2.3 Remove defensive authorship copy and make bounded evidence-backed local editorial corrections; verify imported source attribution and generated detail shells remain intact.
- [x] 2.4 Correct public heading nesting, About summary facts, and case reading-tool order; verify CV/Notes headings and desktop/mobile case layout with the browser contract.

## 3. Motion and interaction quality

- [x] 3.1 Limit public reveal and page transition motion to calm, interruptible transform/opacity continuity; verify normal/reduced/no-JavaScript states and rapid interaction behavior.
- [x] 3.2 Preserve keyboard, pointer, touch, dialog, form-status, search, and lab-control parity; verify with the browser contract and manual route inspection.
- [x] 3.3 Preserve direct walkthrough-video links, static About trail fallbacks, and conditional Turnstile loading; verify no-JavaScript and reduced-motion states with the browser contract.

## 4. Validation and handoff

- [x] 4.1 Run `npm run check`; verify all deterministic and browser gates pass.
- [x] 4.2 Run `npm run audit:visual`, `npm run audit:routes`, and `npm run audit:performance`; inspect advisory findings and record any residual risk.
- [x] 4.3 Add the required first-ten-change harness row and inspect the final `git status --short` plus diff for owned files only.
