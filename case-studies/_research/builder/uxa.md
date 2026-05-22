# Builder Page — UX Architecture Analysis

## 1. Information Architecture

The Builder page enforces a clear three-tier hierarchy through its geometric split.

The **canvas is primary**. The right column — `builder-page__preview` — holds `PreviewPanel`, the only region where the actual app being built lives. It takes `flex: 1` (`BuilderPage.css:77`), expanding to fill all remaining horizontal space after the chat panel claims its percentage. This is a deliberate weight decision: the preview is the ground truth of the product, and the layout encodes that by granting it the residual space rather than a fixed share.

The **chat panel is secondary**. It defaults to 35% of available width (`BuilderPage.tsx:98`) and is bounded between 25% and 55% (`BuilderPage.tsx:162`). The 55% ceiling is architecturally significant — it prevents chat from ever becoming visually dominant, preserving the canvas as the attention anchor even if the user drags the divider aggressively toward the preview. The chat surface owns `--color-bg-surface` (`BuilderPage.css:73`) while the preview sits on `--color-bg-page` (`BuilderPage.css:81`), a one-step lightness difference that adds subtle depth contrast without requiring a border.

The **inspector and version panel are tertiary**. `InspectorToolbar` renders as a floating overlay inside the preview frame (`PreviewPanel.tsx:497–518`), appearing only when an element is selected. `VersionPanel` slides in as an overlay within `builder-page__preview-default` (`BuilderPage.tsx:368`), appearing alongside `PreviewPanel` in a side-by-side flex row rather than replacing it. Neither tertiary surface claims persistent space in the layout tree.

`AppHeader` sits above all content regions at `--header-height: 56px` (`BuilderPage.css:15`) with `flex-shrink: 0` (`BuilderPage.css:52`). Its positional authority is structural, but its informational weight is service-level — publishing controls, plan approval state, project identity — rather than content.

## 2. Layout System

The shell is a **fixed-viewport, CSS-driven geometry**, not a library layout. The root element is `position: relative; width: 100vw; height: 100vh; overflow: hidden` (`BuilderPage.css:17–21`). The main area is `position: fixed; top: 0; right: 0; bottom: 0` with its `left` property driven by CSS class variants (`BuilderPage.css:29–44`):

- `.builder-page__main--sidebar-collapsed` → `left: var(--sidebar-width-collapsed)`
- `.builder-page__main--sidebar-expanded` → `left: var(--sidebar-width-expanded)`

The sidebar offset transition is `200ms cubic-bezier(0.4, 0, 0.2, 1)` applied directly to the `left` property (`BuilderPage.css:35`). This is a valid motion pattern but uses a literal cubic-bezier string rather than `var(--motion-ease-standard)`, which resolves to the identical value in tokens. It is not a token violation per se, but is an inlining inconsistency — the value is semantically equivalent but not symbolically connected. Compare: the workflow close button correctly uses `var(--motion-duration-fast) var(--motion-ease-default)` (`BuilderPage.css:239`).

**The divider is hand-rolled** (`BuilderPage.tsx:152–174`). The choice not to use `react-resizable-panels` is intentional and defensible for a prototype context. `react-resizable-panels` would add a runtime dependency, introduce opinionated DOM structure, and require style overrides to match the design system aesthetic. The hand-rolled version is approximately 25 lines of vanilla event logic and delivers exactly the 25–55% clamp behavior needed. The cost is that the divider does not handle touch events or keyboard accessibility out of the box — neither concern applies to this prototype's scope.

The `builder-page__content` container uses `flex: 1; min-height: 0` (`BuilderPage.css:61–65`). The `min-height: 0` is load-bearing: without it, flex children in a column-direction flex parent cannot shrink below their content height, which would break the overflow scroll behavior inside `ChatWindow` and `PreviewPanel`.

At `768px`, the layout collapses to a stacked column with each pane taking `height: 50%` (`BuilderPage.css:334–362`). The divider flips to horizontal with `cursor: row-resize`. The JavaScript drag handler does not currently account for vertical dragging at this breakpoint — it still computes delta from `clientX` (`BuilderPage.tsx:159`). This is an expected prototype tradeoff, not an architectural defect.

## 3. Token Usage

**`BuilderPage.css` is substantially compliant.** Background colors, border colors, text colors, spacing, radius, shadow, and motion tokens are all drawn from `src/tokens/tokens.css`. The layout dimension variables (`--sidebar-width-collapsed: 72px`, `--sidebar-width-expanded: 256px`, `--header-height: 56px`) are declared on `.builder-page` (`BuilderPage.css:13–15`) rather than consumed from a global token. This is a pragmatic local scope decision — these values must coordinate with `CollapsibleSidebar.css` and the comment at `BuilderPage.css:11` acknowledges this coupling explicitly.

**`BuilderPage.tsx:71–72`** declares JS constants `SIDEBAR_WIDTH_COLLAPSED = 72` and `SIDEBAR_WIDTH_EXPANDED = 256`. These mirror the CSS variables and are used exclusively in the `availableWidth` calculation for the drag handler (`BuilderPage.tsx:145`, `BuilderPage.tsx:161`). Since CSS custom properties are not directly readable in JS without `getComputedStyle`, this is an accepted bridging pattern. The risk is drift if either value changes — the comment at `BuilderPage.tsx:70` flags this dependency.

**`ChatInput.tsx:63–70`** is the primary token violation in the system:

```ts
const MOTION = {
  fast: 0.15,
  medium: 0.25,
  slow: 0.4,
  easeOut: [0, 0, 0.2, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
};
```

These are hardcoded numeric values used throughout `ChatInput.tsx` for all Framer Motion `transition` props (e.g., `duration: MOTION.fast` at lines 221, 250, 260, 571). The equivalent design tokens exist: `--motion-duration-fast: 150ms`, `--motion-ease-decelerate: cubic-bezier(0, 0, 0.2, 1)`, `--motion-ease-accelerate: cubic-bezier(0.4, 0, 1, 1)`. Because Framer Motion consumes JS values (not CSS strings), a token bridge constant is appropriate — but it should reference a single source rather than re-declaring the values. The violation is that the constant is an independent island rather than a typed mapping derived from the token file.

**`InspectorCanvas.tsx:14`** declares `CHART_COLORS = ['#3b82f6', '#22c55e', ...]` as literal hex values. These correspond to `--chart-1` through `--chart-5` tokens. The comment acknowledges this: "Uses hex directly since these are SVG fill values in a mock canvas." SVG fill attributes cannot consume CSS custom properties in the same way as CSS properties, so this is an accepted technical constraint of the SVG rendering path, not an oversight.

**`BuilderPage.css:129`** uses `background-color: white` for the dragging divider pip (`builder-page__divider--dragging::after`). This is a hardcoded value that should be `var(--color-bg-input)` or `var(--color-text-on-accent)`.

## 4. Component Hierarchy

`BuilderPage` functions as the **orchestrator** of the entire surface. It owns all sub-state — `chatWidthPercent`, `reviewingPlan`, `reviewingWorkflow`, `showVersionPanel`, `buildEnvironment`, `isSidebarExpanded` — and passes callbacks down to composites. No composite stores cross-region state; they receive it via props and emit events upward.

The region ownership model is strict:

- `ChatWindow` owns the left column entirely. It manages the message list, plan lifecycle simulation, workflow simulation, credit state slash commands, and `ChatInput` composition. It reaches back up to Builder via `planActionsRef` (`BuilderPage.tsx:112`) for bidirectional plan content sync — a ref-based imperative bridge that avoids prop threading for the streaming update path.
- `PreviewPanel` owns the right column in the default state. It composes `InspectorCanvas`, `InspectorToolbar`, `ElementSelectionOverlay`, `StagedChangesBar`, and `VersionPanel` internally (the version panel appears as a sibling in `builder-page__preview-default` rather than inside `PreviewPanel`, meaning Builder controls its visibility while PreviewPanel controls the canvas below it).
- `InspectorCanvas` is a region inside `PreviewPanel` that renders the mock app content and handles all pointer interaction for element selection, multi-select, and region drag. It does not know about the toolbar.
- `InspectorToolbar` is a floating overlay inside PreviewPanel's frame. Its position is calculated relative to the canvas via `useToolbarPosition` (`InspectorToolbar.tsx:5`).

**Plan-review overlay** replaces the default preview entirely via `AnimatePresence mode="wait"` (`BuilderPage.tsx:281`). When `reviewingPlan` is set, Builder unmounts `PreviewPanel` and mounts `TemplateEditor` in the preview slot. The `x: 40 → 0` slide transition signals entry from the right, reinforcing the spatial metaphor that plan review is a deeper layer of the same right-side region. Exit reverses to `x: 40` rather than a typical fade, which creates a coherent push/pull motion between states.

**Workflow-review overlay** follows the same `AnimatePresence` pattern as plan review, but renders `WorkflowDiagram` instead of `TemplateEditor`. Both overlays share identical motion parameters (`duration: 0.25, ease: [0, 0, 0.2, 1]`, `BuilderPage.tsx:289, 315`) — these should be tokenized.

`InspectorProvider` wraps only the `builder-page__content` div (`BuilderPage.tsx:228, 384`), scoping the inspector context to the content region and correctly excluding the header from the inspection surface.

## 5. Navigation Role

The Builder page is reached from Home via hash routing (`#builder`) and sidebar navigation. The `CollapsibleSidebar` receives `currentPage="Builder"` (`BuilderPage.tsx:189`) to highlight the active nav item.

**Sub-state is local React, not URL-persisted.** Plan review mode, workflow review mode, version panel visibility, inspector mode, and the divider position all live in component state. This is the correct tradeoff for a prototype: URL-persisted sub-state would require a router abstraction, serialization logic for complex objects like `reviewingPlan`, and back-button handling. None of these add prototype value. The cost is that refreshing the page resets all sub-state to defaults, and sharing a URL to a specific plan review state is impossible. In a production product, at minimum the plan review state (keyed to `messageId`) and version panel visibility would benefit from URL persistence, as these represent meaningful navigable states.

The `onNavigate` callback flows from `App` → `BuilderPage` → `CollapsibleSidebar` and `ChatWindow`. This single prop enables navigation to `Connections` from within `ChatWindow` when a workflow is enabled (`ChatWindow.tsx:919`), without `ChatWindow` needing to know about the router.

## 6. Relationship to Other Surfaces

**`TemplateEditor`** is imported from `@/components/composite/TemplateEditor` and used in the plan-review overlay. It is a standalone composite designed for document editing with its own serialization types (`deserializeFromTemplateString`, `serializeToTemplateString`, `BuilderPage.tsx:10`). The two-way sync — Builder pushing editor changes back to `PlanCard` in chat via `useEffect` on `editorDocument` (`BuilderPage.tsx:120–124`) — means `TemplateEditor` participates in Builder's cross-region data flow without needing to know about `ChatWindow`.

**`WorkflowDiagram`** is imported from `@/components/composite/WorkflowDiagram` and rendered read-only in the workflow-review overlay. It receives `steps` and `isGenerating` as props and has no interaction surface in this context (`BuilderPage.tsx:353–357`). The diagram is also reachable via the `Connections` page, where it likely has a different interaction posture.

**`VersionPanel`** is overlay-only within Builder. It is mounted alongside `PreviewPanel` inside `builder-page__preview-default` and appears as a slide-in panel. It is not a page-level route and has no independent entry point — its lifecycle is entirely controlled by `showVersionPanel` state in `BuilderPage`.

## 7. Design-System Fit

**Bespoke to Builder:**

- The resizable divider (`builder-page__divider`) with its 4px hit target, hover pip, and drag-active accent state is purpose-built for this split-pane shell. No primitive in the design system provides this.
- The plan-review and workflow-review overlay shells (`.builder-page__plan-review`, `.builder-page__workflow-review`) are page-level layout containers that exist only in Builder's context.
- The credit demo controls (`CreditDemoControls`, `BuilderPage.tsx:27–68`) are a prototype-only scaffolding component. They use `position: fixed; bottom; right; z-index: var(--z-toast)` (`BuilderPage.css:368–373`) to float above all content. This is the correct z-layer choice given that `--z-toast: 10002` clears all other z-layers.
- The sidebar CSS variable redefinition at the `@media (max-width: 1024px)` breakpoint (`BuilderPage.css:319–323`) — collapsing `--sidebar-width-collapsed` to `0px` — is Builder-specific responsive behavior.

**Borrowed from the system:**

- `CollapsibleSidebar`, `AppHeader`, `ChatWindow`, `PreviewPanel`, `VersionPanel`, `TemplateEditor`, `WorkflowDiagram` are all composite components with independent specifications.
- All color, spacing, typography, shadow, and motion values in `BuilderPage.css` draw from `tokens.css` (with the single `white` exception noted above).
- `InspectorProvider` / `useCreditContext` are shared context patterns used by multiple pages.
- The `AnimatePresence mode="wait"` pattern for overlay transitions follows the motion guidelines for enter/exit pairs.
