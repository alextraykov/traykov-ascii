# ChatWindow — UX Research Case Study
**Component**: `src/components/composite/ChatWindow/ChatWindow.tsx`
**Surface**: BuilderPage split-pane (`/#builder`)
**Research date**: 2026-04-22

---

## 1. Why Chat — The Problem with Form-Based Specifiers

The foundational argument against a form or wizard as the app-generation entry point is articulated in the vision doc's core thesis: "Every workflow builder on the market today is a visual tool with AI bolted on. The AI is a ramp, not a collaborator." — `docs/prd-pm-pd/ai-native-workflow-builder-vision.md`

Forms and wizards enforce a known answer space. The user must navigate predefined fields — trigger type, action type, connector — before they have a full picture of what they are building. The specification and the understanding are sequential, not concurrent. This is the root cause of what the vision doc calls "the generation cliff": AI generates a starter workflow, then the user is alone with a complex visual tool they do not understand. Completion rates drop sharply after initial generation.

Four specific failure modes attributed to form-based and wizard-based paradigms are named in the vision doc and validated against current market leaders:

- Zapier Copilot: "corrections require re-describing the whole workflow" — the form is one-shot, with no carry-forward context
- Power Automate: "non-technical users still get lost once they hit connector configuration" — the form schema exceeds user vocabulary
- Monday.com: "breaks immediately for anything not covered by an existing recipe" — the form's answer space is bounded by pre-authored templates
- n8n "Ask AI": "requires users to understand the n8n data model, expression language, and connector abstractions" — the form vocabulary is the product's internal model, not the user's

Chat removes the bounded answer space. A user can express "when a new request comes in, send the requester a confirmation, then route it to the right team based on category" without knowing what a "trigger node" or "branch action" is. The AI maps from natural language intent to implementation vocabulary. The user stays in their own mental model throughout.

The second structural reason is that chat carries context across turns. The vision doc distinguishes this explicitly: "Chat is not a separate tool that generates into the canvas once — it is permanently coupled to canvas state." A form submission is stateless per submission; a chat thread is a shared artifact that survives and accumulates. Every subsequent refinement — "make the approval timeout 48 hours instead of 24" — is applied against an existing model rather than re-stated from scratch. This is the Cursor model applied to workflow building: `docs/prd-pm-pd/ai-native-workflow-builder-vision.md` names it explicitly.

The content guidelines add a third constraint that a form cannot satisfy: the system must support progressive disclosure calibrated to the user's complexity level — `docs/content-guidelines/checklist.md`. A form has a fixed schema; a chat surface can reveal complexity on demand. The ClarifyCard, PlanCard, and WorkflowSpecCard patterns are all expressions of this: the chat reveals more structure as the user's intent becomes clearer.

---

## 2. Turn Types — What Each Conversational Move Encodes

The ChatWindow renders four distinct structured turn types inline with unstructured chat bubbles. Each encodes a different relationship between user intent and system response.

**ClarifyCard** (rendered when `msg.clarifyingOptions && !msg.optionsConfirmed` — `case-studies/_research/chat-window/explore.md`) encodes ambiguity resolution before commitment. The card presents 1–4 checkbox options scoped to the detected plan type, plus a free-text "Something else" input. The conversational move is: the system surfaces the dimensions along which the request is underspecified, and the user narrows them. This is structurally different from a clarifying question in prose — it presents a bounded option set that prevents the user from adding requirements the system cannot act on yet. The copy pattern ("Before I plan the schema changes, a few things to nail down:") signals collaborative scoping, not interrogation — `docs/previews/plan-mode.md`. The user intent served: reducing the specification gap before expensive generation begins.

**PlanCard** (rendered when `msg.plan !== undefined`) encodes a two-phase reviewable proposal. Phase 1 is a markdown-rendered plan — a narrative of what will be built. Phase 2 is a typed step list with agent assignments, estimated durations, and constraints. The PlanCard has eight named states (`generating-plan`, `plan-ready`, `generating-steps`, `draft`, `executing`, `paused`, `completed`, `cancelled`) — each a distinct conversational posture between system and user. The critical design decision is the single approval gate: "Approve & Run" starts execution immediately; there is no separate execution trigger — `docs/handoffs/plan-mode.md`. The user intent served: seeing and understanding the full plan before committing compute to it. The PlanCard's rationale for existence (per design review feedback in the preview brief) is that "single approval works because full-screen view forces attention" — `docs/previews/plan-mode.md`.

**WorkflowSpecCard** (rendered when `msg.workflowSpec !== undefined`) encodes a living specification artifact rather than a one-time proposal. The WorkflowSpecCard tracks status through `generating-spec`, `spec-ready`, `testing`, `test-complete`, and `active` — it persists in the thread as a reference object, not just a transient proposal. This reflects the vision doc's "canvas is the chat's memory" principle: the spec is the externalized cognitive artifact the user can return to. The user intent served: maintaining a human-readable, revisable source of truth for what the workflow is supposed to do, separate from the implementation graph on canvas.

**SubagentBubble** (rendered when `msg.subagents?.length > 0`) encodes execution transparency. Where the PlanCard is prospective (this is what will happen), the SubagentBubble is live (this is what is happening, agent by agent, action by action). The agent-teams spec identifies this pattern as derived from Devin's "task log transparency; every action logged and replayable" — `docs/prd-pm-pd/agent-teams-workflow-spec.md`. The user intent served: maintaining a legible mental model of what the system is doing during execution, so that failures or surprises can be caught before they compound.

---

## 3. The "Plan-then-Review" Loop — Breaking the Single-Prompt Cliff

The plan-then-review loop is the structural answer to the generation cliff. The flow, as documented in the plan mode flow diagram, is: user types intent → ClarifyCard scopes the request → plan generates with streaming markdown → preview panel slides in showing streaming content → on plan-ready, TemplateEditor becomes editable → user edits markdown inline → edits push back to PlanCard in real time via `updatePlanContent` → "Approve & Run" triggers step generation — `docs/diagrams/plan-mode-flow.md`.

The critical structural property of this loop is bidirectional live binding. The sequence diagram shows that `TemplateEditor` changes fire `onChange(document)` → `BuilderPage.updatePlanContent(messageId, markdown)` → `ChatWindow` updates `PlanCard.markdownContent` in real time. The plan is not a read-only confirmation dialog — it is a shared, editable artifact that both the AI and the user can modify — `docs/handoffs/plan-mode.md`.

Why this breaks the single-prompt cliff: every competitor described in the vision doc generates once, then exits the conversation. The user who disagrees with a generated workflow must re-describe from scratch. The plan-then-review loop interposes a review surface between generation and execution, and makes that review surface editable. The user can reach into the plan, fix a step's description, or remove an unwanted step, before execution begins. The AI's proposal is a draft, not a contract.

The content guidelines' treatment of decision points is relevant here: "Decision point — default to Complete — information reduces anxiety" — `docs/content-guidelines/checklist.md`. The plan-ready state is a decision point (approve vs. revise). The TemplateEditor satisfies the "Complete" formula by giving users the full plan context rather than a summary.

The step generation phase (phase 2 in the flow diagram) adds a second review gate at the implementation level. After the user approves the narrative plan, steps appear one-by-one with agent assignments and duration estimates. The "Revise" action at the draft state allows step-level revision without abandoning the whole plan — `docs/diagrams/plan-mode-flow.md`. This two-gate model (plan approval, then step approval) is not documented as intentionally parallel to any competitor — no existing doc explicitly names this as a differentiator, though the vision doc's general principle of "progressive trust" is the underpinning.

---

## 4. Progressive Disclosure — When Chat Reveals More vs. Collapses

The ChatWindow's disclosure strategy operates at three levels, though the docs describe them across multiple files rather than in a single taxonomy.

**Subagent visibility** is controlled by the SubagentBubble's timeline entry model. The SubagentBubble renders a live timeline of agent actions during execution. The agent-teams spec identifies the risk of full transparency: "UX debt — fast parallel work skips step-by-step transparency users rely on" — `docs/prd-pm-pd/agent-teams-workflow-spec.md`. The design resolution, not yet fully specified in the docs, appears to be: show agent activity during execution (transparency), then collapse completed agents (density). The step's `subagents?: SubagentStepData[]` field on `PlanStepData` is marked "Shown for active step during execution" only — `docs/handoffs/plan-mode.md`. Completed steps show only their label and a green check; the execution trace is no longer surfaced.

**Clarification depth** is calibrated to the detected template. Each of the five plan templates has its own `clarifyingPrompt` and `clarifyingOptions[]` — schema templates ask about backward compatibility; UI templates ask about mobile-first priority — `docs/handoffs/plan-mode.md`. The system does not ask maximally; it asks the minimum set relevant to that template. This is progressive disclosure at the question level: the user sees only the scoping dimensions that matter for their stated intent.

**PlanCard collapse** on completion is the third mechanism. The `completed` status auto-collapses the card — `docs/handoffs/plan-mode.md`. Once execution is done, the plan no longer competes for attention in the thread. The thread retains the completed card as an audit entry, but it recedes visually. This echoes the content guideline principle of mid-task conciseness: "mid-task flow — concise — interruptions are costly" — `docs/content-guidelines/checklist.md`.

The content guidelines' progressive disclosure prescription is for onboarding specifically ("start simple, reveal complexity"), but the same logic applies to the plan lifecycle: the ClarifyCard reveals dimension by dimension; the PlanCard reveals plan then steps; the SubagentBubble reveals agent by agent. Each layer is gated by a user action (confirm, approve, approve again), not by a timer or automatic advancement.

---

## 5. Open Questions — What the Docs Leave Unresolved

The research surface has five material open questions, drawn directly from the documents.

**Conversation length and context carry.** The vision doc states "the chat thread is the audit log" and describes rollback via "undo everything since yesterday at 2pm" — `docs/prd-pm-pd/ai-native-workflow-builder-vision.md`. No doc addresses how context degrades as a thread grows. For long-running projects with hundreds of turns, what gets retained in the AI's working context, and what falls off? This has direct UX implications: if the AI loses context from early turns, users will experience non-sequitur responses that erode trust. The open question is flagged at the product level (question 5 in the vision doc's open questions section) as having "legal and compliance review needed before committing to chat = audit log as single source of truth" but there is no design answer for graceful context degradation.

**Failure recovery UX.** The vision doc describes debugging as a conversational flow: failed runs appear in the chat thread with plain-language explanations and inline action options ("Fix the records now", "Make Email required going forward") — `docs/prd-pm-pd/ai-native-workflow-builder-vision.md`. No handoff doc or preview brief has designed this state for the ChatWindow composite. The current ChatWindow has no `type: 'failure'` message variant — `case-studies/_research/chat-window/explore.md`. This is a documented vision capability with no implemented design.

**Build mode in Plan mode context.** The plan-mode preview brief flags: "What if you send build command in Plan Mode? — AI redirects to switch modes (open question for eng)" — `docs/previews/plan-mode.md`. No resolution is documented. This is a mode collision that will surface frequently for users who switch intent mid-task.

**Multi-element prompt integration.** Both the plan-mode and visual-edit preview briefs note that the multi-select `PromptModeInput` "currently logs to console" and "needs AI integration" — `docs/previews/plan-mode.md`, `docs/handoffs/visual-edit.md`. The connection between canvas selection and chat turn is not designed. This is the bidirectional coupling the vision doc promises ("clicking on a node inserts a reference token into the chat input") but it is unimplemented and unspecified.

**Prompt mode scope in the InspectorToolbar.** The visual edit preview brief asks: "Should [a prompt submitted in the inspector toolbar] apply changes inline and stage them, or open a new AI turn in the chat?" — `docs/previews/visual-edit.md`. The answer determines whether the InspectorToolbar's Prompt mode is a ChatWindow entry point (adds a turn to the thread) or a local action (applies changes independently). This is a significant architectural question about where conversation state lives.

---

## 6. Competitive Signals — What the Docs Compare Against

The vision doc and competitive analysis together name and evaluate seven systems directly relevant to the ChatWindow's design rationale.

**Cursor** is the named model for the "chat and canvas are the same object" principle: "This is the Cursor model applied to workflows" — `docs/prd-pm-pd/ai-native-workflow-builder-vision.md`. The competitive analysis confirms Cursor has no visual editing surface at all — it is entirely code-first — `docs/prd-pm-pd/visual-edit-competitive-analysis.md`. The borrowing from Cursor is conceptual (persistent coupled context, not mode-switching) rather than interaction-level.

**v0 by Vercel** is cited in the agent-teams spec as a prior-art pattern worth studying: "iterative, request-by-request; no parallel work surprises — progressive building avoids overwhelm" — `docs/prd-pm-pd/agent-teams-workflow-spec.md`. The competitive analysis also notes v0's limitation: "users report frustration when they want to make quick visual changes without re-prompting and regenerating" — `docs/prd-pm-pd/visual-edit-competitive-analysis.md`. v0's chat-only model is the failure mode the plan-then-review loop is designed to avoid.

**Figma Make** is identified as having "the most elegant integration of visual and AI editing seen in this audit" specifically because of its Design/Prompt mode toggle — `docs/prd-pm-pd/visual-edit-competitive-analysis.md`. The InspectorToolbar's Design/Prompt mode toggle in this codebase is a direct implementation of the pattern Figma Make pioneered. The competitive analysis rates this as a "must implement from the start" finding.

**Zapier Copilot**, **Power Automate Copilot**, **Monday.com AI Automations**, and **n8n "Ask AI"** are all cited in the vision doc to characterize the generation-cliff failure mode that chat-as-primary-surface is designed to correct — `docs/prd-pm-pd/ai-native-workflow-builder-vision.md`. The vision doc's comparison table summarizes the differentiation across seven dimensions (AI entry point, schema awareness, condition building, error handling, debugging, control spectrum, trust).

**Lovable** is assessed in the competitive analysis as having a clean "Back to Chat" model that explicitly separates visual editing from chat — the opposite of the "conversation and canvas must never decouple" framing in this product. The analysis notes Lovable users find it "safe" but criticizes it for limited properties and separation that works against power users — `docs/prd-pm-pd/visual-edit-competitive-analysis.md`. This positions the dual-surface binding model here as a bet that coupling is better than separation for the target user.

**GitHub Copilot Workspace** and **Devin** are cited in the agent-teams spec as prior art for the plan-before-build and full-task-log-transparency patterns respectively — `docs/prd-pm-pd/agent-teams-workflow-spec.md`. These are the clearest external validation of the PlanCard and SubagentBubble design directions, though neither reference is surfaced in the plan-mode handoff itself.

---

*All claims above are sourced from documents in this repository. Claims without a cited document are noted as undocumented in the source material.*
