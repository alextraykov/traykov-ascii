# InspectorCanvas — Frontend Engineering Notes

_Entry: `src/components/composite/InspectorCanvas/InspectorCanvas.tsx`_

---

## 1. DOM Overlay Technique

Every selectable element in the mock canvas carries a `data-inspector-id` attribute and a `data-inspector-tag` that names its semantic type (`"h1"`, `"button"`, `"chart"`, etc.). Hit detection runs through `resolveElement()` at `InspectorCanvas.tsx:735–767`, which calls `el.closest('[data-inspector-id]')` on the event target, then immediately calls `getBoundingClientRect()` on both the matched element and the canvas root. The canvas-relative rect is computed as:

```
rect.left = elRect.left - canvasRect.left
rect.top  = elRect.top  - canvasRect.top
```

and wrapped in a new `DOMRect` (`InspectorCanvas.tsx:753–758`). That value travels as `InspectableElement.rect` and becomes the sole source of truth for overlay positioning in `ElementSelectionOverlay`, which applies it directly as inline `top/left/width/height` (`ElementSelectionOverlay.tsx:167–172`).

Because rects go stale on scroll and resize, the canvas wires a passive `scroll` listener and a `ResizeObserver` that both call `onScrollOrResize` (`InspectorCanvas.tsx:853–859`). The hook's `updateSelectedRect()` at `useInspectorState.ts:273–296` re-queries the element, recomputes the canvas-relative rect, and updates state only when a value actually changes (four-field equality check). The `passive: true` flag on the scroll listener (`InspectorCanvas.tsx:854`) ensures the browser's scroll thread is never blocked.

The alternative — rendering highlight elements as `position: absolute` children inside each inspectable element — was avoided because it alters the inspected element's layout and invalidates the computed styles read from `window.getComputedStyle`. A portal-to-body approach was equally unattractive because viewport-relative coordinates would require subtracting the canvas scroll offset on every render. The current scheme keeps one coordinate space (canvas-relative) and co-locates the overlay inside the same scroll container, so no offset arithmetic is needed at paint time.

---

## 2. Region Select Drag

`DRAG_THRESHOLD = 5` pixels is declared at `InspectorCanvas.tsx:665`. On `mousedown`, `dragStartRef` captures the canvas-relative start position (`InspectorCanvas.tsx:957–973`). Each `mousemove` computes Euclidean distance with `Math.sqrt(dx * dx + dy * dy)` (`InspectorCanvas.tsx:882`) and only promotes the interaction to a drag once that distance exceeds the threshold, at which point `isDraggingRef.current` flips to `true` and `setIsDragging(true)` triggers the crosshair cursor class (`InspectorCanvas.tsx:884–898`).

On `mouseup`, if `wasDragging` is true and a `dragRect` exists, `resolveElementsInRect()` at `InspectorCanvas.tsx:676–732` is called. It queries all `[data-inspector-id]` nodes in the canvas, converts each node's `getBoundingClientRect()` to canvas-relative coordinates (accounting for `canvasEl.scrollLeft` / `scrollTop`), and applies a standard AABB overlap test:

```
regionLeft < elRight && regionRight > elLeft &&
regionTop < elBottom && regionBottom > elTop
```

(`InspectorCanvas.tsx:704–709`). Any node where `offsetParent === null` is skipped as hidden (`InspectorCanvas.tsx:692`). When multiple nodes overlap the selection region, all are included in the returned array — no z-order preference or containment filter is applied. The caller (`onRegionSelect`) receives the full set and the rendered region rect, and passes it to `setMultiSelectedElements` in `useInspectorState`. A `justDraggedRef` flag (`InspectorCanvas.tsx:843, 1002–1003`) suppresses the trailing `click` event that the browser fires after `mouseup`, preventing accidental single-selection.

---

## 3. Multi-Select State Machine

CMD+click is handled in two stages deliberately. On `mousedown`, if the target has a `[data-inspector-id]` ancestor and `e.metaKey || e.ctrlKey` is true, `resolveElement()` runs immediately and the result plus the modifier flags are stored in `metaClickRef.current` (`InspectorCanvas.tsx:963–968`). The `dragStartRef` is _not_ set, so no rubber-band can begin. On `mouseup`, `metaClickRef.current` is read, cleared, and dispatched as `onElementSelect(element, { metaKey, ctrlKey })` (`InspectorCanvas.tsx:984–988`).

The reason modifier state is captured on `mousedown` into a ref rather than read from the `click` event is sequencing: the click event fires _after_ mouseup, and in some browser configurations (especially when an animation or React state update is in-flight between the two) the modifier key may no longer be held. Capturing it synchronously on `mousedown` into a stable ref guarantees the value is available when the `mouseup` handler fires.

Multi-select state lives as `multiSelectedElements: InspectableElement[]` in `useInspectorState.ts:102`. The hook exposes `setMultiSelectedElements` and `clearMultiSelect` (`useInspectorState.ts:106–108`). In the overlay, `ElementSelectionOverlay.tsx:383–434` iterates the array and renders one `.element-selection-overlay__multi-selection` border and one `.__badge--multi` tag badge per element. Each border animates with a `0.03 * i` second stagger delay (`ElementSelectionOverlay.tsx:398`), giving a sequential "lock-on" feel without being distracting.

---

## 4. Staged Changes vs. Computed Styles

`StagedChanges` is defined at `types.ts:179–185` as:

```ts
{ elementId: string; changes: Map<string, StyleChange>; originalStyles: ElementStyles }
```

The `Map<string, StyleChange>` is keyed on `change.property` (a camelCase CSS property name like `"fontSize"` or `"backgroundColor"`, or the special tokens `"margin"`, `"padding"`, `"textContent"`). A `Map` rather than a plain object was chosen for O(1) keyed overwrite: when a control emits a second `fontSize` change, `next.changes.set(change.property, change)` replaces the previous entry rather than appending (`useInspectorState.ts:182`). Only the final value per property matters for both live DOM preview and revert.

An element is "dirty" when `stagedChanges.changes.size > 0` (`useInspectorState.ts:104`). The `isDirty` boolean propagates to `ElementSelectionOverlay`, which applies `.element-selection-overlay__selection--dirty` and `.element-selection-overlay__badge--dirty` classes (`ElementSelectionOverlay.tsx:206–207, 362–363`). The CSS switches the selection border from a solid accent-color ring to a dashed warning-color ring, giving a persistent ambient signal that edits are pending without requiring the user to look at the toolbar.

Inline CSS overrides are applied in a `useEffect` that reacts to `stagedChanges` (`InspectorCanvas.tsx:1224–1259`). Structural properties like `chartType`, `formLayout`, and `filterMode` are excluded from inline styles via the `STRUCTURAL_PROPERTIES` Set (`InspectorCanvas.tsx:1214–1221`) and are instead consumed by page sub-components at render time through `getStagedValue()`. On commit, `getComputedStylesFor()` is re-run on the element so the inline overrides become the new baseline (`useInspectorState.ts:191–201`). On discard, each entry in the `changes` Map drives a `removeProperty` call (`useInspectorState.ts:220–234`).

---

## 5. Motion

All animation timing in the overlay is governed by two constants in `ElementSelectionOverlay.tsx:69–73`:

```ts
const MOTION_DURATION_FAST = 0.15;  // 150 ms — maps to --motion-duration-fast token
const BADGE_STAGGER_DELAY  = 0.04;  // 40 ms after selection border
```

150 ms is at the boundary where interactions feel responsive rather than sluggish on human reaction time curves — anything shorter loses the communicative value of the transition; anything longer competes with the next input. The 40 ms badge stagger creates a lightweight hierarchy signal (element locks first, label follows) without adding perceptible latency. Exit transitions use a shorter 100 ms (`MOTION_DURATION_EXIT = 0.1`) because exits need to feel faster than entries to not feel like obstacles.

Every animated element gates its variants on `useReducedMotion()` from Framer Motion (`ElementSelectionOverlay.tsx:98`, `InspectorToolbar.tsx:56`). When the hook returns true, `initial` is `{ opacity: 1 }` (instant mount), `exit` is `{ opacity: 0, transition: { duration: 0 } }` (instant unmount), and `scale`/`y` offsets are removed from all variants. `AnimatePresence` is still used so that components unmount correctly, but no perceptible motion occurs. The toolbar also respects this: `InspectorToolbar.tsx:79–95` collapses all enter/exit variants to plain opacity when reduced motion is preferred.

---

## 6. Element-Type Routing

`getElementType()` at `types.ts:33–45` maps a raw `data-inspector-tag` string to one of ten `ElementType` values using tag-name Sets (`TEXT_TAGS`, `CONTAINER_TAGS`, `CHART_TAGS`, etc.). This resolved type is stored on every `InspectableElement` object and flows to two routing sites:

**`DesignModeControls`** (`DesignModeControls.tsx:69–88`): a direct `if/else` chain renders one of `ChartControls`, `ContainerControls`, `ButtonControls`, `FormControls`, `FilterControls`, `DetailControls`, `BadgeControls`, `MetricControls`, or the default `TextControls`. The crossfade transition (`AnimatePresence mode="popLayout"`) uses an 80 ms opacity-only animation (`DesignModeControls.tsx:60–68`) so rapid type switches feel instant rather than choreographed.

**`InspectorPanel`** (`InspectorPanel.tsx:46–68`): a `renderPanel()` function switches on `elementType` to render `TablePanel`, `FormPanel`, `FilterPanel`, `DetailPanel`, `StatusBadgePanel`, `MetricCardPanel`, or `ChartPanel`. Each panel receives `{ activeTab, currentStyles, onStyleChange }` — a minimal contract. The `activeTab` prop (one of `'content' | 'style' | 'actions'`) lets each panel decide which section to render. Neither routing site holds type-specific logic internally; all business rules live in the dedicated panel/control files.

---

## 7. Production-Port Risks

**Cross-frame DOM.** The inspector reads `window.getComputedStyle` and `getBoundingClientRect` directly. If the canvas were hosted in a cross-origin `<iframe>`, both calls would throw `SecurityError`. Even a same-origin iframe would require `contentDocument.defaultView.getComputedStyle` and coordinate translation through the host frame's scroll position, which `updateSelectedRect` currently does not account for.

**iframe sandboxing.** `getComputedStylesFor` at `useInspectorState.ts:64–91` calls `window.getComputedStyle(el)`, which requires the element to be in the document. Sandboxed iframes with `allow-scripts` blocked would make this call undefined. The `contentEditable` editing path (`InspectorCanvas.tsx:1114–1116`) also requires the element to be in a writable document.

**Virtualization.** `resolveElementsInRect` queries `canvasEl.querySelectorAll('[data-inspector-id]')` (`InspectorCanvas.tsx:689`) — a full DOM scan on every region-drag mousemove. At 1000 rendered nodes this becomes measurable (typically 5–15 ms per call). If the canvas were virtualized (rows unmounted when off-screen), elements outside the viewport would not be queryable, meaning region selection could miss them. The current architecture assumes all inspectable nodes are simultaneously in the DOM.

**Performance at 1000 nodes.** `resolveSiblings` at `InspectorCanvas.tsx:770–812` runs `parentEl.querySelectorAll` scoped to a specific `data-inspector-tag` on every `mousemove` that crosses an element boundary. At high node counts this could spike. A production build would want an O(1) lookup table built once on mount (id → element ref, id → siblings list) rather than querying the DOM on each hover.

**Keyboard selection.** There is currently no keyboard path for element selection. The canvas handles only pointer events (`onMouseDown`, `onMouseMove`, `onMouseUp`, `onClick`, `onDoubleClick`). A production inspector would need `Tab`-navigable focus rings on `[data-inspector-id]` nodes and `Enter`/`Space` to select, with `ArrowUp`/`ArrowDown` to step through the element tree.

**Screen-reader exposure.** Selected state is communicated visually via the overlay border and badge but is not wired to ARIA. `aria-selected` is absent from inspectable elements, and the overlay div has no `role` or live region. A screen reader user has no programmatic indication of which element is selected or what its computed properties are. The `InspectorPanel` panel does carry `role="complementary"` and a meaningful `aria-label` (`InspectorPanel.tsx:90–91`), but that is downstream of selection and inaccessible without pointer interaction. The toolbar itself has `role="toolbar"` and `aria-label="Element inspector"` (`InspectorToolbar.tsx:74`), and auto-focuses its first control after enter animation (`InspectorToolbar.tsx:97–102`), which is the most complete a11y surface in the system.
