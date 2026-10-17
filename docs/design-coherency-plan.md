# Design coherency initiative — 13 September 2026

Status: proposed plan; no application changes made for this audit.

The landing page is the visual reference: large product evidence, a compact introduction, ordinary readable copy, restrained metadata, and generous space with a clear purpose. Carry those relationships across the site. Do not equate coherence with putting every page inside identical cards or making every heading large and bold.

## Findings from the current site

- **Notes:** the browser shows a large “Notes.” heading, a second “All notes” heading, a generic subtitle, a search/count strip, heavy monospaced article titles, tiny dates, and repeated strong rules. Too many elements compete for attention before a visitor reads a title. The leading date column also consumes space that the writing needs.
- **Case navigation:** at the inspected 1280px viewport the site navigation ends at 73px and the sticky TOC offset is 74px. Its 208px rail uses 800-weight, 10.88px uppercase links with a 13.27px line height and 10px/14px padding. Full boxes and row borders make this secondary aid look like a primary control panel. The article/rail grid gap is 28px; internal reading and media widths introduce additional, inconsistent alignment edges.
- **Pave navigation:** clicking the homepage project title reproduced an overlapping small title and large destination title, with old homepage media and text visible over the new case hero. Code confirms simultaneous root crossfade and named `project-copy` morph. Incoming title naming depends on snapshot timing; a failed pairing is a plausible cause of the extra title, not yet a proven runtime cause. The old-page ghost is explicitly authored crossfade behavior. The reveal coordinator already attempts to prevent a second hero entrance.
- **System drift:** the stylesheet contains overlapping generations of case layouts, reading widths, card styles, and reveal rules. The previous overview overflow was another concrete example: obsolete two-column CSS outlived the index label it served. Functional checks have not been sufficient evidence of visual quality.

## Shared visual contract

1. **Preserve the landing page as the reference.** Capture its current desktop/mobile and light/dark states before implementation. Do not redesign it to accommodate inconsistencies elsewhere.
2. **Use three intentional widths.** Reuse the 900px work measure for standard page introductions and directories; use approximately 66ch for reading text; allow evidence up to the existing 1220px outer shell where useful. A desktop case layout includes the rail inside that outer shell. Media must never enlarge its parent’s intrinsic grid track.
3. **Define type by role.** Keep the existing Geist Sans/Mono families. Use the homepage’s medium-weight mono for primary titles; use quieter 20–24px linked titles for Notes. Body copy stays regular and comfortably readable. Metadata uses a legible 12–14px treatment. Reserve uppercase for genuinely short labels. Long TOC entries use sentence case and normal/medium weight.
4. **Give spacing one owner.** Map paragraph, caption, media, section, and page-introduction gaps to existing 18/28/42px tokens and intentional multiples. A media component owns its caption spacing; the parent owns spacing between blocks. Remove additive margins that accidentally create very large gaps. Do not shrink every gap uniformly.
5. **Use borders sparingly.** Prefer a flat paper surface and a quiet divider where it communicates a boundary. Avoid a bordered container around a list whose every item is also boxed. Reserve filled panels for meaningful grouping such as form inputs or media.
6. **Keep controls secondary and stable.** Shared button/link typography, predictable focus treatment, and stationary hit areas. Use real labels such as “Search notes” and “RSS.” Preserve accessible touch targets and immediate search, validation, and navigation feedback.
7. **Keep personality in the work.** Preserve the approved full-width About artwork, genuine product recordings, and experimental Labs canvases. Do not restore the About photo fallback or turn the About hero into a compact card again. Align the surrounding typography and spacing without flattening these intentional exceptions.

## Page treatments

| Surface | Proposed treatment |
| --- | --- |
| Notes index | One modest title. Remove the redundant visible “All notes” layer and generic subtitle. Place a quiet search field and RSS link in one utility row. Lead each entry with its title; place date second. Keep read time on the article page. Use lighter dividers, normal-weight metadata, and comfortable row spacing. Show a result count when searching rather than a permanent “35 / 35” counter. Preserve full-text search, all entries, and URLs. No invented featured articles or decorative thumbnails. |
| Note articles | One back/date/read-time line, one title, then writing or an intentional artwork. Share reading measure, paragraph rhythm, media/caption styling, and footer spacing with case studies. Preserve existing article text and authorial voice. |
| Case-study introduction | Align the title, factual summary, status, and first evidence with the shared page/reading grid. Keep project identity in artwork and evidence. Avoid a generic oversized hero followed by several competing introductory blocks. Preserve the current evidence and outcomes. |
| Case-study body | One heading scale, one paragraph rhythm, one caption style, and deliberate full-width media. Audit actual rendered custom fences rather than assuming identical markup. Keep captions visually attached to their media. Preserve heading IDs, deep links, renderer contracts, and authored claims. |
| Case-study TOC | A quiet margin index, not a boxed menu. Remove the outer card and per-row boxes; use a single subtle guide rule if helpful. Sentence-case links, readable type, a restrained active marker, and generous separation from the article. Keep semantic anchors, active-section tracking, and keyboard support. |
| About | Preserve the restored interactive composition and photo-free paper fallback. Apply the shared body, writing-link, and section-spacing roles below the hero. No automatic rollback to the rejected compact version. |
| Contact | Retain the recent compact layout. Reconcile its title, fields, call action, and vertical rhythm with the shared rules. Preserve form, spam protection, email, and booking behavior. Do not claim sending is configured when local credentials are absent. |
| Labs, CV, remaining public pages | Bring introductions, indexes, captions, and controls into the same system. Preserve each experiment’s interaction model, full-screen workspace where necessary, content, and renderer. |

## TOC geometry and behavior

- Define sticky positioning from the actual shared navigation height plus a **28px desktop gap**, using a shared variable consumed by the rail, heading scroll margins, and section observer. Avoid three independently maintained offsets.
- Start with a **224px rail and 42px article-to-rail gutter**, expressed through tokens. Keep the entire composition within the existing outer shell; allow media width to shrink naturally before text becomes cramped.
- Keep the rail at desktop widths of 1180px and above. Below that, use a compact in-flow native disclosure of the section links. When closed it must not consume a permanent horizontal toolbar’s worth of reading space. Preserve ordinary anchor navigation without JavaScript.
- Keep every section reachable. Bound an unusually long desktop index to the space remaining below its heading and navigation, with accessible native scrolling. Do not clip the last entries or hide them behind the footer.
- Use concise display labels when a full authored heading is too long. Store those labels separately from heading IDs/content; do not mutate the renderer or mechanically truncate meaning. If an override is introduced, retain the full destination heading as accessible context.
- Confirm first/last section behavior, active state after late-loading media, native hash navigation, keyboard focus visibility, and back/forward restoration.

## Transition repair and motion brief

**Direction:** a single incoming opacity reveal, with no shared-title morph and no old-page content overlay.

- Purpose: make arrival feel composed without animating the page’s typography between unrelated layouts.
- Trigger: a completed same-site navigation when motion is eligible.
- Properties: opacity only on the incoming content owner. No title translation/scaling, shared-media morph, blur, or scroll interpolation. Keep navigation stationary.
- Timing: use existing `--dur-2` (180ms) and `--ease-out-expo`. The outgoing document leaves at navigation commit without an imposed exit delay.
- Ownership: page continuity owns the incoming content; the hero and its children do not run a second entrance. Remove the obsolete `project-copy` transport and dead media-bridge branches only after checking all callers, including both homepage links and case-to-case navigation.
- Interruption: cancel/settle on new navigation, pause, hidden document, or history restoration. Never leave hidden copy, retained snapshot names, or a stuck navigation flag.
- Reduced motion / visitor pause: ordinary immediate navigation with resolved readable content. No-JS remains native navigation. Restored history content appears immediately at its saved position.
- Evidence: capture both Pave and Synapse transitions from the title and full-study CTA; inspect the initial, intermediate, and settled frames. After commit there must be one destination title layer and no old homepage text/media floating over the case. Also test slow media loading, rapid repeated navigation, and back/forward.

The captured double title is real. Proving the exact snapshot pairing race is useful diagnostic evidence, but the proposed simpler design removes the fragile shared-title requirement instead of retaining it at any cost.

## Implementation sequence and ownership

1. **Freeze the baseline and map the cascade.** Snapshot the dirty worktree; capture a contact sheet of Home, Notes, a note article, Pave, Synapse, About, Contact, and Labs. Inventory final computed type, width, spacing, and control roles. Identify live and shadowed rules before deleting anything.
2. **Repair Pave/Synapse navigation in isolation.** One Terra Max worker owns `public/page-transitions.js`, `src/components/SiteHead.astro`, the necessary continuity CSS, and reveal coordination only if required. Complete interruption/history checks before page redesign.
3. **Implement Notes and the shared editorial roles.** One Terra Max writer owns the shared stylesheet and Notes markup/search presentation. Start with Notes index and one representative note article as the first visual comparison against Home. Adapt dependent assertions when the user-visible contract intentionally changes; do not preserve redundant labels just to keep an old string test green.
4. **Apply the case layout and TOC.** The same sequential worker updates the case route, rail behavior, and shared reading/media styles. Validate Pave and Synapse, including long headings and varied media. Do not edit content parsing or slugs.
5. **Reconcile remaining pages.** Apply the established roles to About’s lower sections, Contact, CV, Labs introductions, and standalone tool controls. Preserve the approved artwork exceptions and working interactions. Remove only confirmed obsolete rules from `global.css`; do not append another competing visual system.
6. **Run functional and visual acceptance separately.** Primary owner inspects the actual diff, runs the final checks, and compares the route contact sheet. Close the writer before a fresh read-only portfolio review. No parallel writers or automatic merges. Implementation remains local until deployment is explicitly requested.

## Acceptance

- Home, Notes, article pages, case studies, and utility pages clearly share type roles, alignment, control styling, and spacing rhythm in both themes.
- The writing or product evidence is the first meaningful focus. Secondary navigation and metadata remain visually secondary.
- The TOC has a visible gap beneath the header, a generous gutter, readable links, and no boxed-row appearance. It remains functional through the whole article and on mobile.
- No double Pave/Synapse title, source-page ghost, photo flash, duplicate entrance, overflow, or accumulated media/section spacing.
- Preserve the fixed Notes full-bleed behavior, About artwork, current Synapse evidence, video controls, form safety, and canonical/legacy routes.
- Run `npm run verify`, `npm run build`, and `npm run check:browser` through the final `npm run check` gate. Add regression assertions for the concrete geometry/lifecycle failures; do not treat a green suite as aesthetic approval.
- Browser coverage: desktop/mobile, 1180/900/820/640 breakpoints, light/dark, reduced motion, no JavaScript, keyboard, direct links, slow assets, rapid navigation, and history restoration. Inspect representative recordings and side-by-side screenshots of every affected page family.

No dependency additions, production deployment, fabricated copy/metrics, global content rewrite, or renderer rewrite is included in this initiative.
