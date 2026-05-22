# InspectorCanvas — Codebase Map

_Entry: `src/components/composite/InspectorCanvas/` · Host: BuilderPage via PreviewPanel_

## 1. Entry + exports

- `index.ts` — exports `InspectorCanvas` + `InspectorCanvasProps`.
- `InspectorCanvas.tsx:814–850` — ref-forwarding canvas container. Props: `isInspectorActive`, `selectedElementId`, `stagedChanges`, `isEditingContent`, and callbacks for `onElementHover`, `onElementSelect`, `onRegionSelect`, `onBackgroundClick`, `onScrollOrResize`.
- Internal responsibilities: mouse event delegation, region drag with threshold, CMD/CTRL capture for multi-select, ResizeObserver + scroll sync for overlay positions.

## 2. Related components

| Component | File | Responsibility |
|---|---|---|
| `InspectorPanel` | `InspectorPanel.tsx:75–82` | Right-side property editor; routes by element type to TablePanel, FormPanel, FilterPanel, DetailPanel, StatusBadgePanel, MetricCardPanel, ChartPanel. Tabs: Content / Style / Actions |
| `InspectorToolbar` | `InspectorToolbar.tsx:39–95` | Floating toolbar above/below the selected element; toggles Design vs. Prompt mode |
| `ElementSelectionOverlay` | `ElementSelectionOverlay.tsx:87–440` | Visual highlights: hover (dashed), selection (solid, dashed when dirty), tag badge, siblings, spacing/gap visualization, multi-select borders |
| `SpacingControls` | `SpacingControls.tsx` | Box-model diagram, margin/padding inputs with scrub gestures |
| `DesignModeControls` | `DesignModeControls.tsx:37–90` | Type-aware property editors keyed on `elementType` |

## 3. Element selection model

- Identifier: `data-inspector-id` attribute on any selectable DOM node.
- Resolution: `resolveElement()` (InspectorCanvas.tsx:744) queries `[data-inspector-id]`, reads `data-inspector-tag`, captures `getBoundingClientRect()`.
- Rect coords are **canvas-relative** — canvas rect subtracted (877–878), new `DOMRect` created (802–807).
- States:
  - Single-select: `click → onElementSelect({ metaKey:false, ctrlKey:false })` (1043).
  - Multi-select (CMD/CTRL): captured on `mouseDown` (966), emitted on `mouseUp` (987) with the modifier flags.
  - Region-select (drag): `DRAG_THRESHOLD` (884); `resolveElementsInRect()` (1004) returns the hit set; `onRegionSelect()` fires.
  - Deselect: `onBackgroundClick()` (1045) or `clearSelection()` (useInspectorState.ts:169–173).

## 4. Hooks + state

- Central hook: `useInspectorState()` in `src/components/composite/InspectorToolbar/hooks/useInspectorState.ts:93–210`. Returns the `UseInspectorStateReturn` interface (16–61).
- Fields: `isInspectorActive`, `hoveredElement`, `siblingElements`, `selectedElement`, `stagedChanges` (`Map<StyleChange>`), `isDirty`, `multiSelectedElements[]`, `isEditingContent`, `toolbarMode` ('design'|'prompt').
- Context: `InspectorProvider` (`src/contexts/InspectorContext.tsx:1–35`) wraps app; `useInspectorContext()` throws if missing, `useOptionalInspectorContext()` is nullable.
- Computed style extraction: `getComputedStylesFor()` (useInspectorState.ts:64–91) reads `window.getComputedStyle()` for margin, padding, flex, typography.

## 5. State shape

- `selectedElement: InspectableElement` (InspectorToolbar/types.ts:159–170): `id`, `tagLabel`, `elementType`, `rect`, `computedStyles`.
- `stagedChanges`: `{ elementId, changes: Map<string, StyleChange>, originalStyles }`. Map chosen for O(1) keyed lookup when rendering ghost inputs.
- `isDirty = (stagedChanges?.changes.size ?? 0) > 0` (useInspectorState.ts:104).
- `multiSelectedElements: InspectableElement[]` — array for stable iteration order in the overlay.

## 6. Overlay positioning

- All overlays position via canvas-relative DOMRect read from `getBoundingClientRect()`, written to inline `top/left/width/height` (ElementSelectionOverlay.tsx:167–172).
- Sync loop:
  - `ResizeObserver` (InspectorCanvas.tsx:856–859) watches the canvas + selected element; on resize callback runs `updateSelectedRect()`.
  - Passive `scroll` listener (854) runs the same update, debounced.
- Motion gated by `useReducedMotion()`:
  - Hover: opacity 150 ms.
  - Selection: opacity + scale 0.995 → 1, 150 ms.
  - Badge: staggered 40 ms after selection.

## 7. Multi-select rendering

- Entry points: CMD+click (966) and region-drag finalize (1004).
- Hook: `setMultiSelectedElements()` accepts an array; `clearMultiSelect()` resets.
- Render (ElementSelectionOverlay.tsx:382–434): map over `multiSelectedElements`, emit `.element-selection-overlay__multi-selection` borders and `.__badge--multi` tag badges, with staggered 0.03 s per index (respecting reduced motion).
- Recent commit `d2c2aa3` ("feat(inspector): production pass — token compliance, type refactor, plan extraction") stabilized multi-select and extracted the element-type plan panels.
