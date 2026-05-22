# InspectorCanvas — UX Research Case Study

**Author**: UX Researcher
**Date**: 2026-04-22
**Version**: 1.0

---

## 1. The Problem

AI-generated output in tools like Pave is not a finished artifact — it is a starting point. The moment a user sees the generated canvas, they have opinions: this heading is too large, that button needs a different background, that card needs more breathing room. The friction sitting between that opinion and the corrected output determines whether users stay with the product or re-prompt into an increasingly unreliable feedback loop.

The competitive analysis (`docs/prd-pm-pd/visual-edit-competitive-analysis.md`) documents this gap concretely: v0 by Vercel users on Twitter and Reddit describe rebuilding pages from scratch because visual changes cannot be made without re-prompting, and re-prompting for one element frequently degrades others. Durable users report the same pattern — the "regenerate rather than edit" philosophy frustrates anyone who needs precise control. Across the twelve tools audited, every AI builder that lacked direct visual editing drew the same complaint category: users want a "quick text and color fix" path that does not touch the AI generation cycle.

The problem is therefore structural: AI systems produce output that users want to nudge incrementally, but every nudge that routes through the AI re-runs a generative process with irreversible side effects. Direct manipulation — selecting an element on the live canvas and changing its properties through a deterministic, local operation — breaks this loop. It gives the user authorship over the delta without asking the AI to guess what "a little less padding" means.

---

## 2. Options Considered

Four approaches were evaluated against the core problem.

**Re-prompt with scoped context.** The user describes the change in a follow-up message. The AI applies the edit to the generated output. Base44 and Figma Make both offer element-scoped prompting (the AI is told which element is selected). This is the most capable path for structural changes but fails for minor numeric adjustments — users report surprise when a prompt about one heading restructures surrounding layout. The competitive analysis notes this directly: Base44 users reported expectation violation as a primary driver of undo usage.

**Prop-sheet panel (fixed right side).** A persistent right panel like Bolt, Lovable, Webflow, and Hostinger. Reliable for property coverage, always visible, never obscures the canvas element being edited. The trade-off is spatial: it reduces canvas real estate and signals that "inspection mode" is a first-class, persistent activity rather than a contextual one. For a product where the canvas is the app being built — not a design-tool artboard — a persistent panel risks changing the ambient feeling of the interface.

**Direct manipulation, floating toolbar.** A toolbar anchored below (or above) the selected element, appearing on click and disappearing on deselect. This is what Figma Make and Base44 use. The competitive analysis identifies the key trade-off: floating toolbars work when the property set is deliberately small (under eight controls). Tools that try to put many properties into a floating toolbar end up with icon-dense UIs that users describe as "busy" — Base44's feedback is the cited evidence. Canvas primacy is maintained but discoverability suffers as property count grows.

**Hybrid: direct manipulation with a staged-change preview model.** The approach Pave chose. A floating toolbar for immediate, deterministic edits, combined with a staging layer that holds changes in a pending state until the user explicitly saves or discards. Changes render live on the canvas immediately via inline style overrides, but are not committed to the data model until Save is clicked. This is the Bolt and Hostinger pattern from the competitive analysis — distinguished from immediate-apply tools (Figma Make, Base44, Lovable, Webflow) by adding an explicit commit gate.

---

## 3. Decision: Direct Manipulation with Staged-Change Preview

The team chose the hybrid model for two reasons grounded in research evidence.

The first is psychological safety. The competitive analysis states that Bolt's save/discard model "reduces accidental destructive edits" and is "praised for psychological safety" in public user feedback. Pave's target users are builders who are not necessarily developers — a population for whom "I accidentally broke the layout" is a support event, not a recoverable nuisance. The staged model converts accidental edits from destructive to reversible.

The second reason is credit-model alignment. Staged changes prevent accidental AI regeneration cycles. If every direct property change immediately triggered a new AI generation, the cost model becomes unpredictable. Staging insulates the user: direct manipulation edits are cheap and local; AI edits (via Prompt mode) are a deliberate, higher-cost operation. The two-mode toolbar makes this distinction visible.

The design rejected immediate-apply on the basis that undo-as-safety-net (the implicit alternative) requires users to remember to undo, whereas a staged model requires users to remember to save. The latter error mode is less destructive: a user who forgets to save has not corrupted their output, they have only lost a pending edit.

On the floating-versus-panel question, the flow document confirms the choice (`docs/diagrams/visual-edit-flow.md`): "Canvas is the app, not a design-tool canvas. Toolbar maintains canvas primacy and appears in context. Right panel would signal inspection as a primary mode — it is not." The toolbar appears when selection happens and disappears when it ends. The canvas is never permanently split.

---

## 4. Element Selection Model as UX

The element selection interaction is itself a UX surface — the moment before any property is changed, the user must correctly identify what they have selected. The competitive analysis establishes that the blue selection ring plus an element tag badge is a de facto standard: present in eight of ten audited tools. Both Figma Make and Base44 position the tag badge above the element; Bolt places it in the panel header. The analysis calls the above-element position stronger confirmation because it does not require the user to cross-reference the panel.

Pave follows the above-element convention (`docs/handoffs/visual-edit.md`): a tag badge positioned six pixels above the top-left corner of the selection ring, entering 40ms before the toolbar to establish visual anchor before controls appear.

Three additional affordances support selection confidence.

Hover rings appear before click. The inspector flow document describes a 1.5px dashed hover ring at reduced opacity as the pre-selection state. This tells the user what will be selected before they commit the click — a preview of the selection intent. The competitive analysis notes that Framer users frequently use the Layers panel for selection rather than the canvas because dense layouts make hover targets ambiguous; the hover ring partially addresses this by making intent legible.

Sibling outlines appear alongside selection. The `useInspectorState` hook surfaces `siblingElements` as lightweight outline data, which `ElementSelectionOverlay` renders as faint rings around adjacent elements. This gives the user orientation within the DOM hierarchy without opening a layers panel. The competitive analysis identified mini-layers navigation as a market opportunity (Opportunity 4); sibling outlines are a spatial approximation of that.

Multi-select via CMD/CTRL+click and region drag serves the batch-edit use case. The competitive analysis identified multi-element selection as absent from all AI builders (present only in mature desktop tools like Webflow and Framer) and described it as a "table-stakes" feature missing from the AI builder space. The inspector state machine (`docs/diagrams/visual-edit-flow.md`) distinguishes the two entry paths: CMD+click accumulates with an 800ms debounce before the prompt appears; region drag shows the prompt immediately. The debounce on CMD+click avoids a premature prompt during rapid selection; region drag implies immediate intentionality.

Discovery research on these selection affordances is thin in the existing docs — the competitive analysis flags that hover affordances and sibling outlines are inference from market observation, not behavioral data from Pave users specifically. This is an explicit gap. Moderated usability testing with 6–8 target users performing element selection tasks is the recommended next step.

---

## 5. Spacing Editor: Research Findings and Design Choices

The spacing editor UX research (`docs/prd-pm-pd/spacing-editor-ux-research.md`) is the most empirically grounded document in the research corpus. Its core finding: the concentric-rectangle box-model diagram with four edge-positioned inputs is the most spatially accurate approach in the AI builder market. Pave's `SpacingControls` component implements this pattern correctly — and already exceeds every AI builder competitor structurally.

The research identified five specific gaps in the existing implementation relative to professional-grade design tools.

Arrow key increment is absent. Every professional tool — Figma, Framer, Webflow, Penpot — ships `ArrowUp`/`ArrowDown` for ±1 increment and `Shift+Arrow` for ±10. The research classifies this as both a UX gap and an accessibility gap: users with motor disabilities who cannot scrub rely on keyboard-based value adjustment. Estimated engineering cost is 2–4 hours. It is the single highest-ROI improvement available.

Scrub input behavior (click-drag on the label to increment) is absent from the current implementation and from all AI builders. The research notes that Figma's scrub inputs were cited in Figma user research as the primary reason for preferring Figma over alternatives for property manipulation. Scrub is classified as a Tier 2 target (Q2 2026), requiring `onMouseDown`/`mousemove` handling on the directional labels with a cursor change to `ew-resize`.

No canvas zone overlay appears while editing. The research calls this "the single largest quality gap between AI builders and design tools in spacing UX." When a user changes a margin value in Figma, an orange highlight shows exactly where the margin is on the canvas. In the current Pave implementation, the layout reflows but the user gets no spatial signal indicating which zone changed. This is a medium-complexity cross-component addition: an amber overlay for the margin region, a blue overlay for the padding region, appearing when the SpacingControls popover is open.

No all-sides-at-once shortcut exists. To set equal padding on all four sides, users must edit four inputs individually. The research recommends a link-chain icon in the center of the concentric rectangle — clicking it links all four sides such that changing any one propagates to all.

Spacing token hint display is the most strategically differentiated recommendation in the research. When a user enters a value that matches a Blinq/Pave spacing token (4, 8, 12, 16, 24, 32, 48, 64px — the xs through 4xl scale in `src/tokens/tokens.css`), a small token badge would appear beside the input showing the token name. No AI builder has shipped this. Figma Variables is the only market precedent, and it is in a design tool. The research classifies this as a Tier 3 strategic differentiator targeting Q3 2026.

The shape chosen — a box diagram with ghost inputs at each edge, opened as a popover from a single Spacing button in the toolbar — reflects the architectural rationale documented in the flow spec: inline expansion of the toolbar would break the positioning algorithm and violate the popover pattern used by color pickers. The popover anchors independently of toolbar dimensions.

---

## 6. Design Mode vs. Prompt Mode Toolbar

The mode toggle is the most deliberate UX decision in the inspector. The competitive analysis calls Figma Make's Design/Prompt toggle "the most important interaction pattern found in this analysis" and "the most elegant integration of visual and AI editing seen in this audit." It earns this framing because it resolves a genuine conceptual tension: some edits are best made visually (font size, alignment, background color) and some via language (restructure this section, make this form feel more approachable). Making the tool acknowledge both mental models as valid — rather than subordinating one to the other — is what the toggle accomplishes.

The handoff spec documents the implementation: a sliding pill (`var(--color-accent-primary)`, Pave Green `#04764E`) that animates between the Design and Prompt segments via `animate={{ left }}`. No x-axis translation — only left-offset interpolation. The Pave Green is described as "the only saturated color on the always-dark toolbar — identifies active editing mode at a glance (brand-forward intent)" (`docs/handoffs/visual-edit.md`). The mode indicator's visual weight is intentional: it tells the user which mode is active before they look at the controls area.

Users should use Design mode when they know the specific property they want to change and can express it through a control (a font size value, a color swatch, an alignment button). They should switch to Prompt mode when the desired change is semantic or structural — when they cannot easily specify the property themselves. The PM preview brief (`docs/previews/visual-edit.md`) frames Prompt mode as: submitting a message returns to Design mode, implying that Prompt mode is a transient state entered for specific AI operations, not a parallel workspace.

Both modes share the same element selection context, the same staged-change model, and the same save/discard surface. This is architecturally important: a prompt submitted in Prompt mode produces a staged change that goes through the same commit gate as a Design mode property edit. The user's mental model of "pending change" is consistent regardless of how the change was authored.

The flow document recommends building the dual-mode toggle from the start rather than retrofitting it: "Building it into the initial design (rather than retrofitting later) avoids a costly rearchitecture. The toggle should be above the property form, not buried." (`docs/prd-pm-pd/visual-edit-competitive-analysis.md`, Recommended Design Principles section.)

---

## 7. Open Questions

The research corpus surfaces four categories of unresolved questions with meaningful UX implications.

**Keyboard accessibility.** The handoff spec documents a comprehensive ARIA structure and focus management model (`docs/handoffs/visual-edit.md`, Accessibility section): `role="toolbar"`, `role="group"` for each control cluster, `aria-pressed` on mode toggle buttons, `aria-label` updates dynamically on color swatches. The focus ring is a two-layer pattern (1.5px knockout gap + 3px Pave Green ring, ~6:1 contrast). Two issues remain open. The tag badge in dark mode at 12px achieves approximately 3.2:1 contrast with `--color-info` dark — below WCAG AA's 4.5:1 requirement for normal text (Open Question 1 in the handoff spec). The `SpacingControls` diagram uses 9px labels ("MARGIN", "PADDING") — below `--font-size-xs` (12px), flagged as needing a11y review (Open Question 4). Arrow key increment in the spacing editor is simultaneously the highest-ROI UX improvement and a WCAG compliance gap — currently absent from the implementation.

**Nested element selection.** The inspector state machine handles hover-to-click selection and DOM tree traversal via `data-inspector-id` attributes, but the docs do not describe behavior when the user wants to select a deeply nested element inside a container that is itself selectable. The flow document describes walking the DOM tree to the "nearest inspectable element" on mouseover — the selection granularity policy for nested elements is not explicitly specified. The canvas targeting open question (`docs/diagrams/visual-edit-flow.md`, Open Question 1) adds a related concern: cross-origin iframe restrictions will prevent direct DOM access when the real preview is integrated, requiring a `postMessage` bridge. The nested selection model should be resolved before that integration.

**Undo and redo.** The current model collapses all pending changes into a single Discard operation. The PM preview brief asks explicitly: "Should there be per-change undo (Cmd+Z stepping through individual property changes), or is all-or-nothing discard sufficient for this surface?" (Open Question 5, `docs/previews/visual-edit.md`). The flow doc documents `Cmd+Z` as discarding all staged changes — a full-batch undo, not a per-step undo. The competitive analysis identifies visual change history as a significant unmet need across the category (Opportunity 6): "v0 users describe rebuilding pages from scratch because they can't undo far enough." The current implementation addresses the staged-change scenario but not the post-save scenario. Per-property undo would require a history stack in `useInspectorState` and is classified as a future panel concern in the flow document.

**Persistence across generations.** When a new AI generation runs (triggered by a Prompt mode submission or a new chat message), what happens to direct-manipulation edits that were saved? The preview spec notes that `discardChanges` and `selectElement` auto-discard both mutate the DOM directly via `el.style.removeProperty` — a prototype behavior not intended for production (`docs/handoffs/visual-edit.md`, Open Question 3). The production style application strategy is unresolved: "Engineering decision: map changes to design tokens, CSS class overrides, or a visual diff format" (`docs/diagrams/visual-edit-flow.md`, Open Question 2). Until the persistence model is defined, the relationship between visual edits and AI generations is architecturally ambiguous. This is the highest-priority open question for the transition from prototype to production.

---

## Source Documents Referenced

| Document | Status |
|---|---|
| `docs/prd-pm-pd/visual-edit-competitive-analysis.md` | Exists — primary competitive evidence |
| `docs/prd-pm-pd/spacing-editor-ux-research.md` | Exists — primary spacing research |
| `docs/prd-pm-pd/table-editing-ux-research.md` | Exists — covers table inspector patterns; confirms Tier 1/2/3 tools framework; no direct InspectorCanvas interaction findings |
| `docs/handoffs/visual-edit.md` | Exists — full engineer spec |
| `docs/previews/visual-edit.md` | Exists — PM preview brief and open questions |
| `docs/diagrams/visual-edit-flow.md` | Exists — state machines and architecture decisions |
| `docs/audits/component-portability-audit.md` | Exists — token compliance notes for `DesignModeControls.css` |
| `docs/audits/dark-mode-audit.md` | Exists — dark mode issues; all resolved as of 2026-02-02; no inspector-specific findings |
| `docs/audits/dark-mode-checklist.md` | Exists — validation checklist for new components |
| `docs/audits/full-repo-remediation-plan.md` | Exists — broader remediation; no inspector-specific findings relevant to this case study |
| Visual edit competitive analysis — Pave user behavioral data | Does not exist — research calls for moderated usability testing with 6–8 Pave target users to validate market findings against the specific user segment |
