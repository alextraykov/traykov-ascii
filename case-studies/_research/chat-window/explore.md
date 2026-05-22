# ChatWindow Composite — Codebase Map

## 1. Entry File & Public API

**File:** `/src/components/composite/ChatWindow/ChatWindow.tsx:1–100`  
**Exports:** `ChatWindow`, `ChatWindowProps` via `/src/components/composite/ChatWindow/index.ts:1–2`

**Props Interface** (`ChatWindowProps` at line 46–77):
- `projectName: string` — active project identifier
- `environment?: BuildEnvironment` (line 58) — `'dev' | 'live'`, default `'dev'`
- `onBack?`, `showVersionHistory?`, `onOpenVersionPanel?` — legacy version history bridge
- `onReviewPlan?` (line 62) — callback when user clicks "Review" to open template editor overlay
- `onPlanContentUpdate?` (line 64) — streaming plan markdown updates to preview panel
- `planActionsRef?` (line 68) — ref exposing `approvePlan` and `updatePlanContent` methods
- `onWorkflowSpecUpdate?`, `onWorkflowDismissed?` — workflow spec callbacks to show diagram overlay
- `onNavigate?` — route to pages (e.g., "Connections")

**Internal State** (lines 134–287):
- `messages: Message[]` — full chat thread, initialized with mock conversation
- `input: string`, `mode: ChatMode` — current input + mode (`'plan' | 'build' | 'workflow'`)
- `pendingRevertVersion`, `pendingRevertIndex` — version-control revert flow state
- `environment: BuildEnvironment` — local copy of build target

---

## 2. Message Model — Shape & Lifecycle

**Message Type** (lines 94–123):
```typescript
interface Message {
  id: string;
  type: 'user' | 'assistant' | 'credit-warning' | 'credit-pack-selector' | 'credit-upgrade';
  content: string;
  timestamp: Date;
  author?: string;
  mode?: ChatMode;
  // Rich content containers:
  statusSteps?: StatusStep[];           // for VerticalStepper
  subagents?: SubagentData[];           // for SubagentBubble[]
  plan?: PlanData;                      // → PlanCard
  workflowSpec?: WorkflowSpecData;      // → WorkflowSpecCard
  clarifyingOptions?: ClarifyingOption[]; // → ClarifyCard
  // Plan state machine:
  optionsConfirmed?: boolean;
  pendingPlanInput?: string;
  pendingTemplateId?: string;
}
```

**Lifecycle States:**

**Plan Mode Flow:**
1. User sends message → `mode: 'plan'` (line 1017)
2. Show clarifying questions (`ClarifyCard`, line 1305)
3. On confirm → `triggerPlanGeneration` (line 666)
4. Generates `plan.status: 'generating-plan'` → streams markdown at 50ms intervals (line 736)
5. Markdown complete → `'plan-ready'`, shows "Approve" button
6. On approve → `handlePlanApprove` (line 316) → `'generating-steps'`, auto-streams steps at 1500ms + 600ms stagger (line 427)
7. Last step → `'executing'`, auto-runs `simulatePlanExecution` (line 447) at 2000ms ticks
8. All steps complete → `'completed'`

**Workflow Mode Flow:**
- Similar to plan, but generates `workflowSpec.status: 'generating-spec'` → `'spec-ready'` → `'testing'` → `'test-complete'` → `'active'`

**Build Mode Flow:**
- Shows SubagentBubble[] (line 1070–1099), no clarification step

---

## 3. Subcomponents & Render Locations

| Component | Imported | Renders When | File:Line |
|-----------|----------|--------------|-----------|
| **ChatBubble** | line 21 (unused) | N/A — inline rendering instead | — |
| **ChatInput** | line 21 | Pinned at bottom, always visible | 1423–1456 |
| **SubagentBubble** | line 17 | `msg.subagents?.length > 0` | 1391–1405 |
| **ClarifyCard** | line 22 | `msg.clarifyingOptions && !msg.optionsConfirmed` | 1304–1329 |
| **PlanCard** | imported via types | `msg.plan !== undefined` | 1331–1353 |
| **WorkflowSpecCard** | imported via types | `msg.workflowSpec !== undefined` | 1355–1374 |
| **VerticalStepper** | line 18 | `msg.statusSteps?.length > 0` | 1377–1388 |
| **CreditWarningCard** | line 26 | `msg.type === 'credit-warning'` | 1159 |
| **CreditPackCard** | line 27 | `msg.type === 'credit-pack-selector'` | 1169 |
| **CreditUpgradeCard** | line 28 | `msg.type === 'credit-upgrade'` | 1179 |

**PlanCard API** (`/src/components/composite/PlanCard/PlanCard.tsx:88–110`):
- `onApprove` → user approved markdown, start step generation
- `onReview` → open template editor in preview column
- `onCancel` → user dismissed plan
- `onExecute` → skip draft, jump directly to executing
- `onPause`, `onResume`, `onRetryStep`, `onSkipStep` — manual execution control

---

## 4. State & Hooks — Local vs. Store

**Local State (ChatWindow.tsx):**
- `messages` — useState (line 181)
- `input`, `mode`, `pendingRevertVersion`, `showEnvConfirm` — useState (lines 145–149)
- `executionTimersRef` — useRef Map (line 290) to track step execution timeouts
- `generatingStepsForRef` — useRef guard (line 154) to prevent double-invoke on plan approval
- `revertCardRefs` — useRef Map (line 150) for version revert card scroll positioning

**Context Hooks:**
- `useCreditContext()` (line 142) — `creditState`, `setCreditsRemaining`, `renewalCountdown`
- `useInspectorContext()` (line 143) — `isInspectorActive`, `toggleInspector`, `multiSelectedElements`

**No Redux/Zustand** — all chat state is local to ChatWindow; parent (BuilderPage) owns overlays.

---

## 5. Motion & Animation

**Motion Tokens** (`/src/tokens/tokens.css`):
- `--motion-duration-fast: 150ms`
- `--motion-duration-medium: 250ms`
- `--motion-duration-slow: 350ms`
- `--motion-ease-default: cubic-bezier(0.4, 0, 0.2, 1)` (decelerate/standard easing)

**Framer Motion Usage:**
- **ClarifyCard** (line 4): `motion`, `AnimatePresence`, `useReducedMotion` — option chips fade in at staggered intervals (MOTION_MEDIUM = 0.25s)
- **PlanCard** (line 2): Step list animates with `AnimatePresence`, progress bar updates on each step stream
- **ChatInput** (line 2): Mode selector popover animates in/out

**Streaming Cursor & Bubble Entrance:**
- Markdown generation streams word-by-word at 50ms intervals (line 736)
- Steps stream at 1500ms + 600ms stagger between steps (line 427)
- No explicit cursor animation in ChatWindow itself; subcomponents handle visual feedback

**Auto-Scroll:** `useEffect` (line 309) on messages change → `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })`

---

## 6. Scroll Behavior

**Auto-Scroll Logic** (line 308–311):
```typescript
React.useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```
- Anchor ref (`messagesEndRef`) placed at end of messages list (line 1418)
- Fires on every message add/update
- **No manual "jump to latest" button** — always follows new messages

**Revert Card Scroll** (line 170–179):
- When `pendingRevertIndex !== null`, smooth-scroll to revert card at center of viewport (line 175)
- Used to surface version selection UX

**CSS Scroll Container** (`ChatWindow.css:16–23`):
```css
.chat-window__messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xl) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}
```

---

## 7. Accessibility Primitives

**No Live Region Setup** — ChatWindow does not implement `aria-live` or `role="log"`:
- CreditBanner (line 26) handles its own `aria-live="polite"` for credit state changes
- **Opportunity for enhancement:** streaming plan/workflow messages would benefit from `role="log"` container with `aria-live="assertive"`

**Focus Management:**
- Version divider buttons are keyboard-accessible (line 1239–1263)
- Revert card action buttons are focusable (line 1212, 1223)
- ChatInput has native focus management

**Semantic HTML:**
- User messages wrapped in `.chat-window__message-row--user` (line 1268)
- Assistant messages have author header with PaveLogo (line 1277–1284)
- Dialog for environment confirmation (line 1460–1495) uses Dialog primitives from `@/components/ui/Dialog`

**Recommended A11y Additions:**
1. Add `role="log" aria-live="polite"` to `.chat-window__messages-list` to announce new messages
2. Announce plan/workflow step progression with `aria-current="step"`
3. Ensure subagent bubbles have semantic structure for screen readers

---

## Summary

ChatWindow is a **stateful chat container** that orchestrates three major workflows (plan, build, workflow) through a pluggable message model. Its strength lies in:
1. **Composability** — renders SubagentBubble, PlanCard, WorkflowSpecCard, ClarifyCard as modular message payloads
2. **Streaming UX** — progressive markdown + step reveals simulate real-time AI reasoning
3. **Lifecycle management** — ref-based actions (`planActionsRef`) and callbacks (`onReviewPlan`, `onWorkflowSpecUpdate`) decouple chat from parent overlays
4. **Motion fidelity** — consistent use of motion tokens and Framer Motion for smooth transitions

**Key Files:**
- `/src/components/composite/ChatWindow/ChatWindow.tsx:1–1500` — main logic & render
- `/src/components/composite/PlanCard/PlanCard.tsx` — plan card UI & state
- `/src/components/composite/SubagentBubble/SubagentBubble.tsx` — subagent timeline UI
- `/src/components/composite/ClarifyCard/ClarifyCard.tsx` — multi-select option card
- `/src/components/composite/ChatInput/ChatInput.tsx` — input bar with mode selector
- `/src/tokens/tokens.css` — motion & spacing tokens

