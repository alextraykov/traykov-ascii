# ChatWindow — UX Architecture Analysis

## 1. Vertical Rhythm

ChatWindow is a flex column that fills the left pane of BuilderPage. The scroll region (`.chat-window__messages`) uses `flex: 1` with `overflow-y: auto` and is padded with `var(--spacing-xl)` vertically and `var(--spacing-lg)` horizontally (`ChatWindow.css:19`). The messages list inside it adds a second `gap: var(--spacing-xl)` between all top-level message nodes (`ChatWindow.css:28`). This double application of `--spacing-xl` (1.5rem each) means adjacent messages breathe at 3rem of vertical clearance — deliberate, since different message types vary dramatically in height and the space prevents visual merging.

Within each assistant message, child components (text, ClarifyCard, SubagentBubble, PlanCard, WorkflowSpecCard) are stacked with `gap: var(--spacing-sm)` (`ChatWindow.css:94`). This creates a tighter internal grouping that visually signals all content belongs to one turn. Version dividers interrupt this rhythm with `margin: var(--spacing-sm) 0` (`ChatWindow.css:44`) — they are intentionally thinner separators so a user turn and its preceding divider read as one grouped unit rather than two independent events.

The `.chat-window__subagents-container` narrows the gap back to `var(--spacing-sm)` (`ChatWindow.css:201`), since subagent bubbles form a serial list within a single response and should feel contiguous. Status steppers get an additional `margin-top: var(--spacing-md)` (`ChatWindow.css:189`), pushing them slightly away from surrounding text to signal a shift to structured data.

## 2. Content-First Hierarchy

Plain assistant messages render text directly inside `.chat-window__message-content` with padding `var(--spacing-md) var(--spacing-lg)` and a transparent background (`ChatWindow.css:152,164–166`). No decoration, no border — prose stays prose.

The four rich card types (ClarifyCard, PlanCard, WorkflowSpecCard, SubagentBubble) get dedicated render paths because they require state machines, not just display. Each is only added to `Message` when semantically appropriate: `plan` payload for multi-phase plan lifecycle, `workflowSpec` for the generate-test-enable arc, `clarifyingOptions` for the pre-plan scoping step, and `subagents` for the build mode parallel-execution view. The render switch reads in priority order: clarifying options first, then plan, then workflow spec, then subagents, then status steps (`ChatWindow.tsx:1304–1405`).

ClarifyCard strips its parent padding entirely via a `:has(.clarify-card)` selector (`ChatWindow.css:169–172`), which zeroes out the content box padding so the card's own border and radius read flush against the message boundary. PlanCard receives the same treatment (`ChatWindow.css:169–172`). This is a meaningful design decision: it says these components are architecturally distinct from prose — they are actionable surfaces, not annotations on top of text.

Credit message types (`credit-warning`, `credit-pack-selector`, `credit-upgrade`) are rendered before the normal message loop (`ChatWindow.tsx:1155–1183`) and assigned to `.chat-window__message--system`, which adds only `padding: var(--spacing-xs) 0` (`ChatWindow.css:181–183`). They have no bubble shape. Positionally they land in the message timeline like system notifications, not conversational turns.

## 3. ChatInput as a Reusable Primitive

ChatInput is used in two contexts: BuilderPage's chat pane and HomePage's splash screen. The props that differ between these contexts are substantial and reveal where the component was designed with reuse in mind.

In BuilderPage, ChatInput receives `showModeSelector={true}`, `environment`, `onEnvironmentChange`, `isVisualEditActive`, `onVisualEditToggle`, `multiSelectCount`, and `onClearMultiSelect` (`ChatWindow.tsx:1426–1455`). These are all builder-specific: mode switching between plan/build/workflow, the dev/live environment gate, and the inspector multi-select badge. The `disabled={isDepleted}` prop gates interaction on credit state.

In HomePage, ChatInput is called with none of those props (`HomePage.tsx:155–160`). No mode selector, no environment, no inspector. Only `value`, `onChange`, `onSend`, and `placeholder` (via typewriter hook). This is the minimal composition of ChatInput as a pure text entry surface — the same component strips itself down by virtue of conditional rendering logic inside (`ChatInput.tsx:136–166` default values handle all the omitted props gracefully).

The one tension is that ChatInput owns `CreditBanner` and `MessageQueue` internally (`ChatInput.tsx:231–241`). On HomePage, these are always hidden because no credit or queue props are passed and `hideNudge` defaults to false — meaning `CreditBanner` will still render if credit state transitions on the home page. This is a latent coupling: the banner is wired to context, not to explicit placement, so it will appear wherever ChatInput is mounted if the context fires.

## 4. Token Usage

Token compliance is mostly strong. Spacing, typography, border, and motion values throughout `ChatWindow.css` and `ChatInput.tsx` draw from `--spacing-*`, `--font-size-*`, `--font-weight-*`, `--motion-duration-*`, and `--motion-ease-*` tokens.

**Confirmed violations:**

- `ChatWindow.css:291` — `rgba(255, 255, 255, 0.05)` is a hardcoded inner border highlight on `.chat-window__input-inner-border`. No token exists for this value. It should be a `--color-border-inner-glow` or similar surface token.
- `ChatWindow.css:760,776` — `var(--color-warning, #f59e0b)` uses `--color-warning` as a fallback to the raw hex `#f59e0b`. The token `--color-warning` is defined in tokens.css (line 104, light: `#8C6800`; dark: `#D4A000`) but the hardcoded fallback creates a mismatch — the fallback color is different from both light and dark token values, meaning it would apply an incorrect amber if the token ever failed to resolve.
- `ChatWindow.css:777` — `color: #fff !important` is a fully hardcoded value. Should use `--color-text-inverse`.
- `ChatWindow.css:781` — `var(--color-warning-dark, #d97706)` same pattern; `--color-warning-dark` is defined in tokens (light: `#7A5200`, dark: `#E8B400`) but the fallback hex diverges from both.
- `ChatWindow.css:456,663,670,699` — Several pixel font sizes in the version modal and spreadsheet popover sections (`font-size: 18px`, `font-size: 16px`, `font-size: 14px`, `font-size: 12px`) use raw px values instead of `--font-size-*` tokens.
- `ChatWindow.css:534–535` — Badge uses `font-size: 11px` and `padding: 2px 8px` — neither references tokens.
- `ChatWindow.css:833–836` — `.chat-window__clarifying-chip--selected` references `var(--color-brand)` and `var(--color-brand-subtle)`. Neither token exists in `src/tokens/tokens.css`. This is an undefined variable — CSS will silently fall back to initial values (transparent background, inherited text color), visually breaking selected chip state.

`ChatInput.tsx:63–70` defines a local `MOTION` object with numeric values (`fast: 0.15`, `medium: 0.25`) rather than consuming `--motion-duration-*` CSS tokens. Because Framer Motion accepts numeric seconds and not CSS variable strings, this is an unavoidable JS-side duplication — but the values should stay synchronized with the token definitions (tokens.css uses `150ms`, `250ms`, matching the numeric equivalents).

## 5. Stacked Component Interplay

The vertical layout of ChatWindow allocates three named zones:

**Messages area** — `flex: 1`, scrollable, owns the entire conversation history. It is the only growing region. All message types, system cards, version dividers, and revert cards live here (`ChatWindow.tsx:1136–1419`).

**Input area** — `flex-shrink: 0`, pinned at bottom, contains the full ChatInput composite. ChatInput itself stacks MessageQueue above the text field and CreditBanner between queue and field (`ChatInput.tsx:229–241`). These two sub-zones only appear when populated — MessageQueue renders null when `messages.length === 0` (`MessageQueue.tsx:44`) and CreditBanner is conditional. So the input area can vary in height but never competes with the scroll region for space because the messages area holds `flex: 1`.

The result is a classic chat chrome pattern: expand-from-top scrolling messages, fixed-height-from-bottom composer. The composer can grow (textarea auto-resizes via `handleTextareaInput`, `ChatInput.tsx:204–208`) but remains anchored. This means very long queued message lists could push the textarea below the fold — a layout edge case not currently guarded.

**Dialog layer** — The environment confirmation Dialog (`ChatWindow.tsx:1460–1495`) is positioned outside the flex flow entirely, rendered as a modal overlay. It does not occupy a vertical slot.

## 6. State Coupling

`ChatWindow.tsx:142` reads `{ creditState, setCreditsRemaining, renewalCountdown }` from `useCreditContext()`. `ChatWindow.tsx:143` reads `{ isInspectorActive, toggleInspector, multiSelectedElements, clearMultiSelect }` from `useInspectorContext()`.

The credit context coupling has two effects on the layout. First, `isDepleted` (derived at line 144) directly disables the ChatInput via the `disabled` prop (`ChatWindow.tsx:1451`). No depleted state is shown in the input area itself — the signal is a dead input, not an explanatory banner. The explanatory cards (`CreditWarningCard`, `CreditPackCard`, `CreditUpgradeCard`) are injected as message-type entries via the `/credits` slash command prototype, not auto-triggered by context state transitions. This means the prototype context state and the visible warning messaging are decoupled by design: the context controls form capability, but the visible explanation is driven by simulated message injection.

The inspector context coupling is shallower. It passes three props down into ChatInput: the toggle state, the toggle handler, and the multi-select count. ChatWindow does not render any inspector-specific UI itself — it is purely a prop passthrough. The only ChatWindow-level behavior is that `clearMultiSelect` is wired to clear selection when a user takes an unrelated ChatInput action (`ChatInput.tsx:130`). The inspector thus affects ChatInput decoration (the selection count badge, the visual-edit active state on the button) but does not alter which messages render or how the messages area behaves.

## 7. Design-System Fit

ChatWindow is Pave-specific, not a generic chat primitive. The following properties make it non-transferable without modification: (a) the `Message` interface encodes Pave domain concepts — `plan`, `workflowSpec`, `clarifyingOptions` — directly as optional fields rather than a generic `payload` slot; (b) the mode system (plan/build/workflow) and the environment gate (dev/live) are QuickBase/Pave builder concepts; (c) the version divider and revert card mechanics are tied to the concept of versioned AI builds; (d) the credit warning message types encode a specific billing model.

What is transferable: the structural pattern of a scrolling messages container with a pinned composer, the technique of rendering rich cards as message payloads via a type discriminant, the `planActionsRef` pattern for exposing imperative state mutations to a parent without lifting all state, and the approach of using separate CSS classes for user/assistant/system message types to control visual treatment. These patterns are conventional enough to adapt into other AI-driven chat surfaces with different domain models.

The component sits at the boundary between a generic chat shell and a Pave-specific orchestrator. A future refactor that wanted to generalize it would need to extract the domain-specific message types into a plugin registry pattern, keeping the scroll/layout/input structure as the reusable core.
