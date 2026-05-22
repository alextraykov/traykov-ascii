# InspectorCanvas — UX Architecture Analysis

_Entry: `src/components/composite/InspectorCanvas/` · Siblings: InspectorPanel, InspectorToolbar, ElementSelectionOverlay, SpacingControls, DesignModeControls_

---

## 1. Z-order and Layering

The inspector system stacks four distinct planes over a live canvas. Reading bottom-up:

**Canvas** (`position: relative`, no z-index, natural stacking) renders the mock dashboard DOM. It is the ground truth for all hit-testing — every selectable element carries a `data-inspector-id` attribute, and rect coordinates are read directly from `getBoundingClientRect()` minus the canvas offset.

**ElementSelectionOverlay** (`position: absolute; inset: 0; z-index: 101; pointer-events: none`) occupies the full canvas area. It renders hover highlights, selection borders, tag badges, spacing stripes, gap regions, and multi-select borders as absolutely-positioned children. `pointer-events: none` on the overlay root and all its children is the load-bearing decision here — it means the overlay never intercepts mouse events, so hover and click delegation falls through to the canvas below. The region-drag rubber-band rectangle lives directly inside the canvas at `z-index: 50`, below the overlay, so the selection UI always wins visual priority.

**InspectorToolbar** (`position: absolute; z-index: var(--z-popover)` = 10000) floats above everything. Its position is computed in JS and written as inline `left`/`top` style. The `--z-popover` token (10000) ensures it clears any stacking context the canvas content might create.

**InspectorPanel** (`position: absolute; top: 0; right: 0; bottom: 0; z-index: var(--z-popover)`) is pinned to the right edge of the canvas container at the same z-level as the toolbar. It does not float — it is docked. `pointer-events: auto` is declared explicitly to override the overlay's inherited suppression.

The CSS expression of this hierarchy is intentionally minimal: the canvas holds `position: relative` to establish the containing block, and each overlay layer uses `position: absolute` with progressively higher z-index only where needed. The overlay-wide `pointer-events: none` pattern does more architectural work than z-index alone.

---

## 2. InspectorPanel Routing

The panel uses a two-level routing model. The outer level is a three-tab segmented control: `Content`, `Style`, `Actions`. The inner level is an `elementType` switch that maps to one of seven sub-panels: `TablePanel` (container), `FormPanel`, `FilterPanel`, `DetailPanel`, `StatusBadgePanel`, `MetricCardPanel`, `ChartPanel`. A fallback placeholder renders for unrecognized types.

The tab and element-type dimensions are orthogonal. Every sub-panel receives the same `{ activeTab, currentStyles, onStyleChange }` props and is responsible for showing the right controls per tab. This means `elementType` determines what properties exist; `activeTab` determines which categorical slice of those properties is visible at once.

What this IA implies about Pave's mental model: the system treats "editable things" as components with behavioral identity, not generic DOM nodes. A `container` is a table. A `badge` is a status indicator. The panel does not expose a generic CSS inspector; it exposes an opinion about what matters for each component type. Content tab is about data and labels. Style tab is about visual presentation. Actions tab is about interactions and triggers. This three-way split is a direct mapping of the product's three-dimensional view of every UI element — what it says, how it looks, what it does — rather than a structural mapping of CSS properties.

---

## 3. Element-Selection Vocabulary

The system defines four distinct selection states, each with a specific visual treatment:

**Hover** — dashed border (`--color-info`) at 60% opacity, with a faint tinted fill (`rgba(49, 117, 189, 0.06)`). Uses dashes to signal tentative, non-committed attention. The fill is deliberately near-invisible to avoid obscuring content.

**Selected** — solid border (`--color-info`), full opacity, with a compound box-shadow: `0 2px 8px rgba(0,0,0,0.15)` for lift plus `0 0 0 1px rgba(59,130,246,0.2)` for a soft outer halo. The transition from dashed hover to solid selection is the primary signal that a commitment has been made.

**Dirty-selected** — dashed border (`--color-warning`) replaces the solid border. The tag badge also switches from `--color-info` to `--color-warning` background. This is the only semantic difference in the selection vocabulary: solid = clean, dashed = staged changes pending. The warning color, not the dash alone, carries the dirty signal since hover is also dashed.

**Multi-selected** — solid border at `--color-info` matching single-select, but with a reduced box-shadow (`0 0 0 1px rgba(59,130,246,0.15)`) and badges carrying a `--multi` modifier. The reduced shadow distinguishes individual items in a multi-select set from the primary single selection. Staggered entry animation (0.03 s per index) reinforces the set identity.

The pattern is: border style encodes commitment (dashed = tentative or pending, solid = committed), border color encodes state semantics (info = normal, warning = dirty), and shadow intensity encodes selection hierarchy (heavier for primary, lighter for secondary set members).

---

## 4. Spacing Box-Model Diagram

`SpacingControls.tsx` renders two nested rectangular diagrams — one for margin, one for padding — with four ghost scrub inputs positioned at the top, right, bottom, and left edges of each box. The outer box uses a Pave-green tint; the inner box uses a Pave-teal tint. Center labels read "MARGIN" and "PADDING" at low opacity.

The CSS box-model mental model is reproduced verbatim rather than abstracted into a list of eight numeric fields for two reasons. First, spatial correspondence: a developer editing top-padding sees the top edge light up (`border-top-color` brightens via `:has(.spacing-box__input--focused[data-side="top"])`), which is directionally congruent with where that space lives in the rendered element. A list provides no such correspondence. Second, locked-axis editing: the box diagram naturally affords the question "are all four sides equal?" in a way a four-row list does not. The lock button in the header row capitalizes on this by treating the diagram as a unified shape rather than a collection of independent fields.

The ghost-input pattern (transparent background and border at rest, materializing only on hover/focus) reinforces the diagram-first reading. The numbers are secondary annotations on a spatial representation, not primary controls. This matches how Figma, Webflow, and browser devtools all handle spacing — the diagram is the interaction model, not a decoration over a form.

---

## 5. Toolbar Anchoring

`InspectorToolbar` uses a floating-above-element anchor strategy. Position is computed in JavaScript from the selected element's canvas-relative rect, placed above the element by default and flipped below when proximity to the canvas top would cause clipping. The toolbar uses `position: absolute` inside the canvas container and transitions its `left`/`top` on canvas resize via CSS (`transition: left/top var(--motion-duration-normal)`), so repositioning is smooth when the inspector panel opens or closes.

The architectural tradeoff versus docking: floating keeps the toolbar contextually adjacent to the thing being edited, which reduces eye travel between the selection target and its controls. It also keeps the canvas viewport clear for unselected content — a docked top bar would permanently consume vertical space. The cost is positional management complexity: the toolbar must avoid clipping at canvas edges, must reposition on scroll and resize, and must not obscure its own target element. The current implementation handles edge-clipping via the above/below flip but does not appear to handle horizontal edge avoidance at canvas boundaries.

The mode switcher (Design | Prompt) embedded in the toolbar is an architectural signal that the toolbar owns the editing mode, not the panel or the canvas. Switching mode changes what controls are visible in the toolbar's right section (`DesignModeControls` vs. a prompt input) while the panel remains visible independently. This means mode is orthogonal to selection — you can be in Prompt mode with an element selected.

---

## 6. Token Compliance

Scanning the four CSS files for hardcoded values:

**`InspectorCanvas.css`**
- Line 41: `background-color: rgba(255, 203, 71, 0.08)` — region-drag fill. The border uses `--color-border-warning` but the fill is hardcoded. Should be `color-mix(in srgb, var(--color-border-warning) 8%, transparent)` or a dedicated token.
- Line 43: `z-index: 50` — raw integer. No `--z-*` token covers this range (tokens define 1000 and 10000). The intent is "above canvas content, below overlay" — this range needs a token or the value needs a comment establishing its relationship to `--z-popover`.
- Lines 225, 318–319, 323–324, 328–329, 382–383: All six semantic badge color combinations (`--badge--green`, `--badge--yellow`, `--badge--blue`, `--badge--red`) use raw hex. These represent status semantics that belong in the token layer as `--color-status-success-text`, `--color-status-success-bg`, etc.
- Line 873: `background-color: #fff` — settings switch thumb. Should be `var(--color-text-on-accent)` or a surface-always-white token.
- Line 894: `color: #fff` — danger button text. Same issue.

**`ElementSelectionOverlay.css`**
- Line 20: `background: rgba(49, 117, 189, 0.06)` — hover fill. The border references `--color-info` but the fill is a raw rgba. Flag: if `--color-info` changes, the fill does not follow.
- Line 31: `box-shadow` uses `rgba(0, 0, 0, 0.15)` and `rgba(59, 130, 246, 0.2)`. These are partially justified as shadow values (no standard shadow token at this specificity exists), but the blue tint repeats `--color-info` as a hex-equivalent.
- Line 55: `color: #fff` on the badge. Commented as intentional ("no token stays white across both modes") — justified exception, but the comment belongs in TOKENS.md as a known deviation.
- Lines 101–102: `rgba(20, 110, 130, 0.12)` and `rgba(20, 110, 130, 0.35)` for gap visualization. The Pave-teal brand value is hardcoded in three files (also SpacingControls.css). A `--color-teal-raw` component custom property or a `--color-spacing-gap` semantic token would centralize it.
- Line 113: `rgba(59, 130, 246, 0.15)` on multi-select shadow — same issue as line 31.

**`InspectorPanel.css`**
- Lines 17–22: Entire always-dark surface is hardcoded (`#1c1917`, `rgba(255,255,255,0.1)`, `rgba(0,0,0,0.25)`, `#fafaf9`). This is the largest block of justified-but-untracked hardcoding in the system. The comment "Forced dark regardless of theme" explains the intent but the values should be extracted into a shared always-dark palette — at minimum as file-scoped custom properties mirroring the `--dc-*` pattern DesignModeControls established.
- All subsequent `rgba(255, 255, 255, N)` alpha values throughout the file follow from the always-dark decision. They are structurally correct but fragile if the dark surface color changes.

**`DesignModeControls.css`**
- Lines 16–41: The `--dc-*` local token block declares 19 hardcoded hex values. This is the correct pattern for an always-dark isolated surface — scoped tokens prevent bleed, and the block is easy to update. The values are hardcoded *intentionally as local overrides*, which is architecturally sound. The gap is that these `--dc-*` tokens are not in `src/tokens/tokens.css`, so they are invisible to the validation script.
- Lines 652–665: `rgba(255, 102, 102, N)` delete-state values reference `var(--dc-delete)` in some places and raw rgba in others. Lines 652 and 659–665 use raw rgba rather than `var(--dc-delete)` composites. Inconsistency within the same file.

---

## 7. System Fit

**InspectorCanvas-exclusive concerns:** The `data-inspector-id` hit-testing protocol, the canvas-relative rect calculation (`getBoundingClientRect() - canvasRect`), the ResizeObserver sync loop, the region-drag rubber-band logic, and the DRAG_THRESHOLD constant are all specific to the canvas interaction model. Nothing outside BuilderPage consumes or replicates these.

**Reusable without modification:** `ElementSelectionOverlay` is position-agnostic — it accepts rects and renders highlights. It has no dependency on the canvas DOM or the `data-inspector-id` protocol. It could overlay any absolutely-positioned container. `InspectorPanel` is fully data-driven via props (`elementType`, `currentStyles`, `onStyleChange`) and has no import from `InspectorCanvas`. `SpacingControls` is self-contained. `DesignModeControls` is keyed on `elementType` and `toolbarMode` only.

**Coupling to BuilderPage:** `InspectorCanvas` is tightly coupled in one direction — it is the canvas that BuilderPage mounts inside `PreviewPanel`, and it exports a ref that BuilderPage uses to obtain the canvas DOM node for overlay positioning. The coupling is clean (ref-based, not context-based) but it is real. If the canvas were replaced by a different mock, the entire `data-inspector-id` tagging protocol would need to be applied to the replacement. The inspector subsystem does not define an abstract canvas interface; the contract lives implicitly in the attribute naming convention.

The InspectorContext (`InspectorProvider`) is the widest coupling surface — it wraps the entire app and makes inspector state available globally. This is appropriate for the prototype's purposes but would be a seam to refactor in a production architecture where inspector state should scope to the builder route only.
