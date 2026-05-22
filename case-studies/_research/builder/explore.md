# BuilderPage — Codebase Map

_Entry: `src/pages/BuilderPage/BuilderPage.tsx` (390 lines) · Route: `#builder` · Wired: `src/App.tsx:96–102`_

## 1. Entry + subcomponents

- `src/pages/BuilderPage/index.ts` — exports `BuilderPage`, `BuilderPageProps`.
- `BuilderPage.tsx` — single orchestrator. Holds split-pane geometry, mode state, sidebar expansion, resize drag state, and a plan-editor document in local React state.
- `CreditDemoControls` (20–68) — inline dev helper for simulating `healthy | warning | low | depleted` credit states.
- `BuilderPage.css` (277 lines) — BEM layout for the full viewport shell, sidebar cutout, header bar, resizable split.

## 2. Composite dependencies

| Composite | Import | Region |
|---|---|---|
| `ChatWindow` | `@/components/composite/ChatWindow` | Left 35 % (default) |
| `PreviewPanel` | `@/components/composite/PreviewPanel` | Right 65 % (default) |
| `VersionPanel` | `@/components/composite/VersionPanel` | Overlay on preview |
| `TemplateEditor` | `@/components/composite/TemplateEditor` | Right panel when `reviewingPlan` |
| `WorkflowDiagram` | `@/components/composite/WorkflowDiagram` | Right panel when `reviewingWorkflow` |
| `AppHeader` | `@/components/composite/AppHeader` | Top 56 px |
| `InspectorCanvas`, `InspectorToolbar`, `InspectorPanel` | inspector stack | Nested inside PreviewPanel |
| `DesignModeControls`, `SpacingControls`, `PromptModeInput` | nested in InspectorToolbar | — |
| `MessageQueue`, `CreditBanner` | nested in ChatWindow | — |
| `CollapsibleSidebar` | `@/components/layout/CollapsibleSidebar` | Left rail, 72 → 256 px |

## 3. Modes + state

- `mode: 'plan' | 'build' | 'workflow'` lives in ChatWindow, propagated up via `onEnvironmentChange`.
- `reviewingPlan: null | { messageId, title, markdownContent, isGenerating }` (145).
- `reviewingWorkflow: null | { messageId, title, steps, isGenerating }` (146).
- `editorDocument: null | PlanDocument` (147) — structured plan payload for the right-pane editor.
- Live cross-sync: `planActionsRef` (119–124) pushes edits from the TemplateEditor back into the chat payload before approval.

## 4. Layout + resizing

- Fixed viewport shell; sidebar rail width is a CSS var (`--sidebar-width-collapsed: 72px`, `--sidebar-width-expanded: 256px`), and the main area offsets `left:` by it with a transition (BuilderPage.css:35).
- Split pane is **not** `react-resizable-panels` (library is installed but unused here). Hand-rolled: `handleDividerMouseDown` (152–174) captures mousemove delta, clamps to 25 %–55 %, writes `chatWidthPercent` state. Divider `.builder__divider` is 4 px with `col-resize` cursor (90–129).
- `AnimatePresence mode="wait"` (281–382) swaps the right pane between PreviewPanel + VersionPanel (default) and the plan- or workflow-review editors, sliding `x: 40 → 0` over 0.25 s with `[0,0,0.2,1]` easing.

## 5. State + context reads

- `useCreditContext()` (CreditStateContext:28–34) — credit banner + pill gating; used by ChatWindow (142).
- `useDarkMode()` — read by AppHeader; Builder itself doesn't toggle.
- `useInspectorContext()` (InspectorContext:20–32) — wraps BuilderPage content at 228; consumed by PreviewPanel and ChatWindow.
- Zustand: **not used** here. React Context only.

## 6. Motion

- `useReducedMotion()` at line 97, 281 — applied to plan/workflow review entry.
- Motion token JS bridge lives in `ChatInput.tsx:63–70` (`fast:0.15, medium:0.25, slow:0.4`) and mirrors CSS `--transition-fast/base/slow`.
- Heavy motion surfaces: MessageQueue (collapse/expand y-slide), CreditBanner (height + opacity), DesignModeControls (80 ms crossfade on element type change), InspectorPanel (slide from right), PreviewPanel CSS keyframes via `useAnimatedPresence`.

## 7. Hash routing

- Builder owns `#builder` (App.tsx:33). Sub-state (plan review, workflow review, inspector on/off) is **not** URL-persisted — all local React state.
- `App.tsx` listens to `hashchange` (75–79) and re-derives `currentPage`; navigation happens through `onNavigate` prop, which writes `window.location.hash` (81–85).
- Figma capture escape hatch: `?page=builder` query param is honored (App.tsx:60).
