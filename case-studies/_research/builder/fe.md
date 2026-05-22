# BuilderPage — Frontend Engineering Notes

_Research date: 2026-04-22. All line references are to source files as read._

---

## 1. Component Boundaries and Communication Model

BuilderPage (`src/pages/BuilderPage/BuilderPage.tsx`) is the root orchestrator. It owns the full viewport and composes roughly 10 composite children in a direct tree: `CollapsibleSidebar`, `AppHeader`, `ChatWindow`, `PreviewPanel`, `VersionPanel`, `TemplateEditor`, `WorkflowDiagram`, and the floating `CreditDemoControls`.

Boundary discipline is tight and deliberate. Each composite gets a well-typed props surface — `AppHeader` receives `chatPanelWidth`, `reviewingPlan`, and action callbacks; `ChatWindow` receives `planActionsRef` so the parent can imperatively call `approvePlan` / `updatePlanContent` without lifting those functions through multiple intermediaries (BuilderPage.tsx:112, 343–346). This is the one place prop-drilling is avoided via an imperative ref bridge rather than a shared context — a reasonable tradeoff for a one-way action, but worth flagging as a prod smell since it bypasses React's data-flow model.

The remaining cross-cutting concerns use React context: `InspectorProvider` wraps only the `builder-page__content` subtree (BuilderPage.tsx:228–384), scoping inspector state to the chat+preview region. `CreditStateContext` is consumed above at the app level. No external store (Zustand, Redux) exists — there are no files in `src/stores/`.

---

## 2. State Architecture

State is distributed across three layers:

**BuilderPage local state** (BuilderPage.tsx:98–112): layout geometry (`chatWidthPercent`, `availableWidth`), sidebar expansion, UI mode flags (`showVersionPanel`, `reviewingPlan`, `reviewingWorkflow`), and the live-edited `editorDocument`. This is the heaviest local state surface on the page.

**ChatWindow local state** (ChatWindow.tsx:145–154): the `messages` array (the single source of truth for the entire conversation including plan cards, workflow specs, and credit cards), `mode` (plan / build / workflow), and plan execution timers tracked via `executionTimersRef` (ChatWindow.tsx:290). `messages` is mutated via functional `setMessages` throughout — no reducer pattern, no immer. The plan lifecycle state machine (generating-plan → plan-ready → generating-steps → executing → paused / completed / cancelled) lives entirely inside individual `Message.plan` objects.

**InspectorContext** (`src/contexts/InspectorContext.tsx`): a thin wrapper around `useInspectorState` (`src/components/composite/InspectorToolbar/hooks/useInspectorState.ts`). All inspector state — `isInspectorActive`, `selectedElement`, `multiSelectedElements`, `stagedChanges`, `isEditingContent`, `toolbarMode` — lives in that single hook (useInspectorState.ts:94–102). `currentStyles` is a `useMemo` over `selectedElement` + `stagedChanges` (useInspectorState.ts:299–313), which is the only memoization in the inspector path.

**No persistence layer exists.** `chatWidthPercent` is never written to `localStorage`; inspector staged changes live in memory only and are discarded on reload.

---

## 3. Motion Orchestration

Framer Motion is used in three distinct places on BuilderPage:

**Panel slot switching** (BuilderPage.tsx:281–381): `AnimatePresence mode="wait"` governs the three mutually exclusive states in the preview column — default preview, plan review, and workflow review. Each branch animates with `{ x: 40, opacity: 0 }` → resting → exit same. The `prefersReducedMotion` guard at BuilderPage.tsx:97 short-circuits to `initial={false}` and `transition={{ duration: 0 }}` on all three panels. The timing constant `duration: 0.25, ease: [0, 0, 0.2, 1]` is hardcoded inline rather than pulled from `--motion-duration-*` and `--motion-ease-*` tokens — a token-compliance gap.

**InspectorToolbar enter/exit** (InspectorToolbar.tsx:69–80): `AnimatePresence mode="wait"` with `key={inspector.selectedElement.id}` forces a cross-fade when the selected element changes. `useReducedMotion` is checked and collapses to opacity-only. The animation is interruptible — `AnimatePresence` will immediately start the exit of the departing toolbar and begin the enter for the new one, with no artificial delay.

**Multi-select prompt and staged-changes bar** (PreviewPanel.tsx:522–568): both use `AnimatePresence` with standard enter/exit pairs. The prompt uses a debounced 800ms timer (`showPrompt`, PreviewPanel.tsx:181–189) to avoid flicker on rapid CMD+click multi-select — clean UX pattern.

**CSS transition** on `.builder-page__main` (BuilderPage.css:35): sidebar expansion uses a raw CSS `transition: left 200ms cubic-bezier(0.4, 0, 0.2, 1)` rather than Framer Motion — consistent with the token `--motion-ease-standard` value but again hardcoded inline.

---

## 4. Performance

This is the page with the highest component count and the heaviest chat list render. The findings are sparse:

- **No `React.lazy` or `Suspense` boundaries** anywhere in BuilderPage or its direct children. WorkflowDiagram (which loads `@xyflow/react`) is imported statically (BuilderPage.tsx:12). That library is non-trivial and is a clear code-splitting candidate.
- **No `React.memo`** on any composite child. ChatWindow re-renders on every BuilderPage state change (e.g., sidebar toggle), taking the full message list render with it.
- **One `useMemo`** in the inspector: `currentStyles` (useInspectorState.ts:299). `gapViz` in PreviewPanel is also memoized (PreviewPanel.tsx:201–241), computing bounding-box gap rects off DOM reads.
- **`useCallback` is used consistently** in `useInspectorState` for all actions (toggleInspector, selectElement, clearSelection, applyChange, commitChanges, discardChanges), which prevents unnecessary child re-renders of InspectorToolbar and InspectorCanvas.
- **Message list render**: all messages render in one pass with no virtualization. At prototype scale (14 static messages) this is acceptable; at production volume it will become the primary jank source.
- **`setTimeout`-based plan simulation**: multiple overlapping `setTimeout` chains in ChatWindow (ChatWindow.tsx:390–428, 447–495) write to state from closure captures. These do not use `useRef` guards consistently — the `generatingStepsForRef` at ChatWindow.tsx:154 partially addresses this for the generation phase but execution scheduling does not have equivalent protection.

---

## 5. Accessibility

Mixed picture. Strong in some areas, absent in others.

**Good**: viewport toggle uses `role="radiogroup"` + `role="radio"` + `aria-checked` (PreviewPanel.tsx:578–594). Inspector button uses `aria-pressed` (PreviewPanel.tsx:387). `InspectorToolbar` root has `role="toolbar"` + `aria-label` (InspectorToolbar.tsx:77–78). Credit demo trigger has `aria-label` (BuilderPage.tsx:48). SVG chart mocks include `aria-label` strings.

**Gaps**: 
- No `aria-live` region for mode changes. Switching from plan → workflow mode appends an assistant message but there is no announcement to screen readers.
- The resize divider (BuilderPage.tsx:273–277) has no ARIA role, no `aria-label`, no `aria-valuenow`. A keyboard user cannot resize the panels.
- Multi-select region drag (InspectorCanvas) has no keyboard equivalent and no announcement of selection count change.
- `CreditDemoControls` popover is not a focus trap — clicking outside dismisses it, but keyboard users have no Escape handling and no `role="menu"` structure.
- No `tabIndex` management when plan review overlay opens; focus does not move to the TemplateEditor.

---

## 6. Resizable Layout

The panel resize is a hand-rolled implementation, not `react-resizable-panels`. BuilderPage maintains `chatWidthPercent` as a percentage of `availableWidth` (BuilderPage.tsx:98, 145). On `mousedown` on the divider it attaches `mousemove` / `mouseup` directly to `document` (BuilderPage.tsx:152–174), clamped to [25%, 55%] (BuilderPage.tsx:162). `availableWidth` is recomputed on window `resize` via an effect (BuilderPage.tsx:134–142) that subtracts `sidebarWidth`.

**No persistence**: `chatWidthPercent` resets to 35% on every page load. **No touch support**: the drag handler uses `MouseEvent` only — mobile layout falls back to CSS `flex-direction: column` at 768px (BuilderPage.css:334–362). Constraints are min 280px / max 60% enforced via CSS on `.builder-page__chat` and the percentage clamp in JS.

---

## 7. Flags for Production Port

**Must fix before shipping:**

1. **No error boundaries** anywhere in the subtree. A runtime error in ChatWindow or WorkflowDiagram will crash the entire Builder surface with no recovery path.
2. **No loading states for real data** — all content is mock/static. The `isLoadingVersion` blur in PreviewPanel (PreviewPanel.tsx:311–324) is the only simulated network feedback; there is no skeleton or suspense for initial project load.
3. **Plan lifecycle uses `setTimeout` for simulation** — these chains (ChatWindow.tsx:390–495, 644–738, 785–817) must be replaced with real streaming API calls, but the state-machine shape they drive (generating-plan → plan-ready → executing → completed) is architecturally sound and can be preserved.
4. **`planActionsRef` imperative bridge** (BuilderPage.tsx:112, 343–346): bypasses React data flow. In production, plan approval should be a proper callback lifted into shared state or a context action.
5. **No undo/redo**: `Cmd+Z` in PreviewPanel discards inspector staged changes only (PreviewPanel.tsx:247–255). There is no global undo for chat-driven mutations.
6. **WorkflowDiagram is eagerly imported**: `@xyflow/react` should be `React.lazy`-wrapped since the workflow review panel is not always visible.
7. **Message list is unbounded and unvirtualized**: production conversation histories need a windowed list (e.g. `@tanstack/react-virtual`).
8. **Network failure has no handling**: `executeSend` and all simulation functions assume success; no error state exists in the `Message` type.
9. **`chatWidthPercent` is not persisted**: a small `localStorage` write in the drag handler would preserve user preference across sessions.
10. **`deleteSelectedElement` mutates the DOM directly** via `el.style.display = 'none'` (useInspectorState.ts:263–266) — this is a prototype shortcut that breaks on next render since React owns the DOM.
