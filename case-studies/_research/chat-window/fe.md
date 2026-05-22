# ChatWindow — Frontend Engineering Notes

**File:** `src/components/composite/ChatWindow/ChatWindow.tsx`
**Scope:** Implementation decisions a FE engineer would flag before a production port.

---

## 1. React Patterns

**Message list as local state.** All 14 seeded messages plus every generated one live in a single `useState<Message[]>` at line 181. Every state transition — streaming word append, step status flip, plan phase change — calls `setMessages((prev) => prev.map(...))`. There is no reducer, no action enum, and no batching boundary. For a prototype this is acceptable; at production scale it becomes a debugging problem because the mutation shape is inlined across ~20 call sites.

**`generatingStepsForRef` as a synchronous mutex.** The ref at line 154 is the most non-obvious pattern in the file. When `simulateStepGeneration` fires it immediately writes `generatingStepsForRef.current = messageId` (line 371) before scheduling any timeouts. The early-return guard at line 370 prevents a second invocation from the overlay "Approve" button racing with the in-card button. Because React state reads inside a `setTimeout` closure are stale, a ref is the correct tool — a second `useState` boolean would not be visible synchronously to both call paths. The ref is cleared at line 404 once the last step has been dispatched. On revision (line 434) it is explicitly nulled before re-entry.

**`planActionsRef` imperative bridge.** Lines 343–347 expose `{ approvePlan, updatePlanContent }` to the parent (`BuilderPage`) via a `MutableRefObject`. The effect has no dependency array, so it re-assigns on every render. This is intentional — handlers close over fresh state — but it means the parent must not cache the methods. A `useCallback`-stabilized approach with a proper dep array would be safer in production.

**Context consumption.** `useCreditContext()` (line 142) and `useInspectorContext()` (line 143) are consumed directly. The credit state drives `isDepleted` (line 144) which gates the `ChatInput` disabled prop (line 1451) and guards the "continue in Live" dialog path. The inspector context passes `multiSelectedElements.length` directly to `ChatInput` (line 1454) for the visual-edit badge count — a clean separation where ChatWindow mediates between contexts without owning either.

---

## 2. Streaming Architecture

**Word-by-word at 50 ms.** `triggerPlanGeneration` (line 666) splits the template's markdown on spaces and schedules one `setTimeout` per word at `50 * (i + 1)` ms (line 736). This produces a linear drip — not chunked. The choice over chunked delivery is deliberate for the prototype: it makes the streaming cursor illusion feel proportional regardless of template length, and it fires `onPlanContentUpdate` per word so the preview panel overlay stays in sync with the chat bubble simultaneously (lines 713–716).

**Step stagger at 1500 ms + 600 ms.** `simulateStepGeneration` (line 368) schedules each step at `1500 + i * 600` ms (line 427). The 1500 ms initial delay gives the markdown generation time to visually settle before the phase transition. The 600 ms inter-step gap is long enough to read each label but short enough that a 5-step plan completes in under 5 seconds. After the last step there is a further 400 ms hold (line 403) before auto-advancing to `executing`.

**Why not chunked?** Chunked delivery (e.g. Server-Sent Events of N words) would require a streaming API and a buffer flush strategy. For a design prototype driving mock data from templates, per-word timeouts achieve the same visual result with zero infrastructure. In production, the 50 ms ticker would be replaced by an SSE/WebSocket consumer flushing tokens into the same `setMessages` updater.

**Workflow progress is tick-based, not word-based.** `triggerWorkflowGeneration` (line 744) uses 20 uniform ticks over 1500 ms (lines 787–817) to drive `generationProgress` from 0 to 1. This drives a progress bar in `WorkflowSpecCard` rather than visible text streaming, so granularity matters less than smoothness.

---

## 3. Performance

**No virtualization.** The message list at line 1139 is a plain `.map()` over the full `messages` array, rendered inside a `flex-direction: column` overflow container (`ChatWindow.css` lines 16–23). Every state update re-renders the entire list. With the 14-message seed plus a typical conversation, renders stay cheap. At 1,000 messages this becomes untenable: each word-tick in streaming fires `setMessages`, triggering a full list reconcile. The first casualty would be the streaming feel itself — word appends would visually stutter as React works through ~1,000 DOM nodes per tick.

**No `memo` on message rows.** The render function for each message is inlined inside `messages.map()` at line 1139 — there is no `React.memo` wrapper. Every `setMessages` call (including single-word appends) re-runs all conditional blocks for all rows. Extracting a `MessageRow` component wrapped in `memo` with a stable identity predicate would be the first perf fix for a production port.

**No `useCallback` on handlers.** `handlePlanApprove`, `handlePlanPause`, etc. are plain functions in the component body, re-created every render. They are passed inline into `PlanCard` (lines 1335–1352), defeating any `memo` on `PlanCard` itself. The cure is `useCallback` with the correct `messageId` dep — though given the prototype constraint this is not a real cost today.

**Execution timer cleanup is correct.** The `executionTimersRef` Map at line 290 is cleared on unmount (lines 301–306), and each pause/cancel path calls `clearExecutionTimer` (lines 292–298) before state updates. No timer leak exists in the prototype.

---

## 4. Accessibility

**No live region on the message container.** The `chat-window__messages-list` div at line 1138 has no `role="log"` and no `aria-live` attribute. A screen reader receives no announcement when new assistant messages arrive, when plan steps stream in, or when a workflow transitions to `testing`. This is the single largest a11y gap.

**What to add.** For conversational messages: `role="log" aria-live="polite"` on the list container is sufficient — the browser will queue and announce additions without interrupting the user. For plan execution step changes (which are in-place mutations, not appends), a separate visually-hidden `aria-live="assertive"` region populated with the active step label would provide runtime feedback.

**Focus management gap on send.** After `executeSend()` appends a user message and schedules an assistant response (lines 1014–1037), focus remains in the `ChatInput` textarea. This is correct. But when the assistant message arrives 500 ms later and a `ClarifyCard` is inserted, no focus management fires — a keyboard user would need to Tab forward to discover the new options. In production, moving focus to the first option chip or the confirm button on insertion would complete the keyboard flow.

**Keyboard-accessible elements that work.** Version divider `<button>` elements (line 1239) are native buttons with `disabled={isDimmed}` correctly propagated. The revert card Cancel/Revert buttons (lines 1212, 1222) are focusable. The environment confirmation Dialog (line 1460) uses the shared Dialog primitive which handles focus trap and Escape dismiss.

**Version divider `disabled` attribute.** At line 1254, `disabled={isDimmed}` is applied to a `<button>`. When `isDimmed` is false, the button is interactive. The button does not have an `aria-label` beyond its visible text children ("X min ago" + RotateCcw icon). Adding `aria-label="Revert to version from X min ago"` would make the affordance unambiguous to screen readers.

---

## 5. Scroll Behavior

**Auto-scroll fires on every `messages` change.** The effect at lines 308–311 calls `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })` whenever `messages` updates. Because streaming appends update a single message object — not the array length — this will fire on every 50 ms word tick during plan generation, creating a continuous smooth-scroll chain while content grows. In a short window this is fine; in a tall window with slow network it could fight a user who scrolled up to re-read earlier context. Production should suppress auto-scroll when `scrollTop` is not near the bottom of the container.

**No "jump to latest" affordance.** There is no scroll-to-bottom button. If a user scrolls up during a streaming response, they have no way to jump back without manual scrolling. This is a standard feature of production chat UIs and is absent here by design scope.

**Revert card scroll.** When `pendingRevertIndex` is set, a `setTimeout(..., 100)` fires (line 172) to `scrollIntoView({ behavior: 'smooth', block: 'center' })` on the stored ref. The 100 ms delay is a layout paint guard — the revert card is conditionally rendered and may not be in the DOM at the tick the effect fires. The pattern works but `requestAnimationFrame` would be more precise than a fixed delay.

---

## 6. Motion Tokens

**Token mapping.** `src/tokens/tokens.css` defines the motion vocabulary:

| Token | Value |
|---|---|
| `--motion-duration-fast` | 150 ms (line 319) |
| `--motion-duration-medium` | 250 ms (line 321) |
| `--motion-duration-slow` | 350 ms (line 322) |
| `--motion-ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` (line 323) |
| `--transition-fast` | 0.15s (line 291) |
| `--transition-base` | 0.2s (line 292) |

**Framer Motion usage is delegated.** `ChatWindow.tsx` itself imports no Framer Motion. Animated behaviour lives in `PlanCard` (line 2 of PlanCard.tsx: `import { motion, AnimatePresence, useReducedMotion }`), `ClarifyCard`, and `ChatInput`. `AnimatePresence` wraps step lists and option chips in those components; `useReducedMotion` is checked before applying transitions. This keeps `ChatWindow` as a pure orchestration layer.

**Bubble entrance.** Individual message rows are not wrapped in `motion.div` — there is no fade-in or slide-in on message append. The streaming word-by-word content change is the visual entrance signal. Adding a subtle `opacity: 0 → 1` transition on new message rows (using `--motion-duration-fast`) would complete the chat UX without adding complexity.

**No streaming cursor.** There is no blinking cursor or `…` indicator during the 50 ms word-tick phase. The word count growing is the only signal. A CSS `::after` pseudo-element on the last word token (animated with `animation: blink 1s step-end infinite`) using `--motion-duration-slow` as the period would be a low-cost addition.

---

## 7. Integration Surface — PlanCard Callback Signature

`PlanCardProps` (PlanCard.tsx lines 88–116) exposes 9 callbacks:

```
onApprove, onReview, onCancel, onExecute, onReviseSubmit,
onPause, onResume, onRetryStep(stepId), onSkipStep(stepId)
```

This surface area is a direct representation of the orchestration state machine. What it signals for a production port:

- **`onRetryStep(stepId)` and `onSkipStep(stepId)`** imply the chat layer must own step-level error recovery. In production these would call an agent API endpoint with `{ planId, stepId, action: 'retry' | 'skip' }`, then reconcile the returned step state back into the message. The prototype simulates this with a local `setMessages` + re-invoke of `simulatePlanExecution`.
- **`onReviseSubmit(revisionText)`** implies the chat layer sends a correction prompt mid-plan. In production this would interrupt the current job, send the revision to the LLM, and stream a new step list — the `generatingStepsForRef` null-clear pattern (line 434) is a direct prototype of that interrupt-and-restart contract.
- **`onPause` / `onResume`** imply the backend must support job suspension. This is non-trivial: the timer-based simulation here (lines 447–495) clears a `window.setTimeout` ID, but a real orchestrator pause would require a server-side interrupt signal.
- **`onReview`** opens the overlay side panel from within the card, but the callback data (`messageId`, `title`, `markdownContent`) is owned by `ChatWindow` and passed upward through `onReviewPlan` (ChatWindow.tsx line 62). The double-hop — card fires up to ChatWindow, ChatWindow fires up to BuilderPage — is intentional decoupling but creates two places where plan state can diverge (the card's local copy vs. the preview panel's copy).

---

## 8. What to Flag for a Production Port

**Error handling is absent.** Every `setMessages` call assumes success. There is no error state on `Message`, no retry-on-failure UI, and no error boundary around the message list. A production port needs at minimum: an `error?: string` field on `Message`, a rendered error chip with retry affordance, and a React error boundary wrapping the list container.

**Timer IDs are `window.setTimeout` numbers, not `ReturnType<typeof setTimeout>`.** Line 449 uses `window.setTimeout` and stores the result as `number` (line 290 types the Map as `Map<string, number>`). In a Node/SSR environment this would fail. Prefer `ReturnType<typeof setTimeout>` for portability.

**Optimistic UI.** User messages append immediately (line 1014) before any server acknowledgement — that is correct optimistic behavior. But if the server rejects the send, there is no rollback path. A `status: 'pending' | 'sent' | 'failed'` field on the user `Message` type would enable failure state and resend affordance.

**No persistence layer.** Messages are ephemeral React state. A page reload loses the entire conversation. Production needs either local persistence (IndexedDB via a hook) or server-side session hydration, with the `messages` array seeded from a stored transcript on mount rather than from the hard-coded array at lines 181–287.

**Slash command dev affordances are production-visible.** The `/credits [state]` command handler (lines 954–1002) and `SLASH_CREDIT_PRESETS` (lines 39–44) are compiled into the bundle unconditionally. These should be gated behind `import.meta.env.DEV` or stripped with a build flag before shipping.

**`Date.now().toString()` as message IDs.** Lines 1006, 1023, 668 generate IDs with `Date.now().toString()` or `(Date.now() + 1).toString()`. In rapid succession (e.g., plan + clarify in same tick) these can collide. A `crypto.randomUUID()` or `nanoid()` call is the correct fix.
