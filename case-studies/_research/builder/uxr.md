# Builder Page — UX Research Case Study

**Route**: `#builder`  
**Source docs**: `docs/prd-pm-pd/`, `docs/handoffs/`, `docs/previews/`, `docs/diagrams/`  
**Date**: 2026-04-22  
**Researcher**: UX Researcher agent

---

## 1. User and Intent

The user who lands on Builder is a **Quickbase app builder who is not a workflow or software engineer**. The vision doc's stated scope is "target users are app builders who are not workflow engineers" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Scope`). They arrive via the Projects page — either from the sidebar (`Sidebar → Projects → Click Project`) or from a ProjectCard — carrying active intent to build or modify a working business application (`docs/diagrams/builder-page-flow.md:Entry Point`).

Their state of mind at entry is task-specific and often time-pressured. The Alaska Airlines reference implementation makes this concrete: an operations staff member authoring a Root Cause Analysis record mid-process who wants AI coaching against their company's own SOPs without leaving the authoring context (`docs/prd-pm-pd/agent-teams-workflow-spec.md:Section 7, In-Record AI Context`). The pattern generalizes: the user has an existing data model in Quickbase, a business process they want to automate or surface, and no tolerance for the tooling to become the problem they are solving.

Two behavioral modes emerge from the docs:

- **Exploratory** — the user enters Plan mode ("What do you want to explore?"), requests a plan, reviews it before any files change, and iterates on the plan as a document before committing (`docs/handoffs/plan-mode.md:ChatMode`). This user wants to think out loud and have the system reflect their thinking back before acting.
- **Directive** — the user enters Build mode ("What do you want to build?"), types a specific instruction, and expects the preview panel to respond. This user knows what they want and is checking the system's interpretation.

Both modes share a state of mind: they want to stay in conversation. They do not want to context-switch into a separate configuration surface.

---

## 2. Problem Statement: The Generation Cliff

The central problem Builder addresses is named explicitly in the competitive vision as **the generation cliff**: "AI generates a starter workflow. Then the user is alone with a complex visual tool they do not understand. Completion rates drop sharply after initial generation" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Where all of them break, Finding 1`).

The cliff is not a single moment — it is a structural failure in every existing AI builder's interaction model. The AI is used as an **on-ramp** (generate from natural language) but then the product hands the user off to a traditional canvas the moment generation completes. The vision doc identifies this across the competitive set: "Zapier Copilot generates a starter workflow from a sentence, then hands you a traditional node canvas... The AI is a ramp, not a collaborator" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:The Central Bet`).

Three additional failure modes compound the cliff:

- **No schema awareness**: tools require manual field-by-field mapping because they have no access to the user's data model (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:No schema awareness`).
- **Opaque condition logic**: building conditional branches requires field/operator/value pickers — a code-adjacent skill that non-technical users cannot navigate reliably (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Opaque logic`).
- **No progressive trust**: the control spectrum is binary — either fully manual (traditional builder) or fully generated (pure AI output) with nothing in between (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:No progressive trust`).

The business logic layer is identified as structurally absent in the current product: "Logic is scattered into QB Formula fields, hardcoded React, and ad-hoc workflow transforms. No dedicated runtime" (`docs/prd-pm-pd/agent-teams-workflow-spec.md:The Three-Tier Gap`). Builder is the product surface that closes this gap.

---

## 3. Options Considered

**Chat-only (no persistent canvas)**  
Represented by Durable's "regenerate rather than edit" philosophy: every refinement goes through re-prompting, visual editing is intentionally minimal. The vision doc identifies this as a gap: "Frustrates users who want precise control" (`docs/prd-pm-pd/visual-edit-competitive-analysis.md:Durable, User feedback`). It works for low-complexity outputs (presence sites) but collapses when users need to make small, targeted adjustments without affecting surrounding structure.

**Canvas-only (visual editor, AI at generation level only)**  
Represented by Webflow and Framer: mature visual editing, but AI only handles initial generation or section-level regeneration. "No AI at the property level" (`docs/prd-pm-pd/visual-edit-competitive-analysis.md:AI Integration Patterns, Model 4`). This pattern fails non-technical users at exactly the moments traditional builders fail them — complex conditions, error handling, and configuration depth.

**Chat-then-edit (sequential, not concurrent)**  
Represented by Bolt, Lovable, and Hostinger Horizons: chat generates an artifact, then a separate visual edit panel allows post-hoc refinement. These are "parallel interfaces — chat and visual edit panel are separate surfaces" (`docs/prd-pm-pd/visual-edit-competitive-analysis.md:AI Integration Patterns, Model 3`). The fundamental problem remains: the AI is not present during editing, so users are still alone with the canvas for the hard parts.

**Dual-mode toggle (Figma Make pattern)**  
The competitive analysis identifies this as "the most elegant integration of visual and AI editing seen in this audit" (`docs/prd-pm-pd/visual-edit-competitive-analysis.md:Figma Make, Unique characteristics`). A Design/Prompt mode toggle acknowledges both mental models as valid and keeps the AI accessible in context. This is the interaction pattern that directly informed Builder's InspectorToolbar design.

**The workflow spec as a living chat artifact**  
The approach selected for workflow authoring: the WorkflowSpecCard is not a sidebar object but a chat message; the conversation thread is the version history (`docs/prd-pm-pd/workflow-spec-living-artifact.md:Section 1`). This is structurally different from every competitor — "the chat thread and the workflow canvas are not two panels. They are two views of the same object" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Core principle`).

---

## 4. Decision Rationale: The Split-Pane + Plan-Review + Visual-Edit Triad

**Split pane (chat left, preview right, resizable)**  
The layout explicitly refuses to treat chat and canvas as modes. The resize divider is clamped to 25–55% of available width (`docs/diagrams/builder-page-flow.md:Resize Divider Flow`), ensuring neither panel can be hidden — a structural commitment to both surfaces being simultaneously active. This expresses the "Cursor model applied to workflows: you can type or you can click, and both are real" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:The three interaction modes`).

**Plan-review overlay**  
The two-phase PlanCard lifecycle (plan generation → step generation → execution, all with explicit approval gates) directly addresses the generation cliff. The user sees the full plan as a reviewable, editable document before any files change. The preview panel slide-in during generation creates a second verification surface: streaming plan content is visible in the TemplateEditor before any build action fires (`docs/handoffs/plan-mode.md:PlanCard lifecycle`). The design review consensus was that "single approval works because full-screen view forces attention" (`docs/previews/plan-mode.md:Feedback from Design Review 2026-04-09`).

**Visual-edit toolbar (InspectorToolbar)**  
The floating toolbar over the canvas — rather than a fixed right-side panel — reflects a specific architectural decision: "Canvas is the app, not a design-tool canvas. Toolbar maintains canvas primacy and appears in context. Right panel would signal inspection as a primary mode — it is not" (`docs/diagrams/visual-edit-flow.md:Architecture Decisions`). The always-dark toolbar surface creates theme-independent separation between the editing instrument and the application being edited. The staged-changes model (changes held pending until Save or Discard) was adopted from Bolt's pattern: "The save/discard model is the right default. Experienced users can adapt; anxious first-time users need the safety net" (`docs/prd-pm-pd/visual-edit-competitive-analysis.md:Recommended Design Principles, Principle 2`).

The design/prompt mode toggle inside the toolbar was explicitly identified as requiring early-stage architectural commitment: "Building it into the initial design (rather than retrofitting later) avoids a costly rearchitecture" (`docs/prd-pm-pd/visual-edit-competitive-analysis.md:Recommended Design Principles, Principle 3`).

**WorkflowSpecCard as chat artifact**  
For workflow authoring, the decision to make the spec card a chat message (not a sidebar configuration object) creates the audit trail as an emergent property of the conversation itself. Rollback is always a new forward action — a new spec card — never deletion of history (`docs/prd-pm-pd/workflow-spec-living-artifact.md:Superseded state`). This was a deliberate trust mechanism: "Every change, whether from conversation or direct manipulation, is a visible entry in the chat thread" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Trust Mechanisms`).

---

## 5. Behavioral Signals

The docs surface several direct observations about how users interact with this class of tool:

**Users abandon after generation, not before it.** The generation cliff is empirically sourced: users who have tried Zapier or Make stop at the point where AI hands off to the visual canvas. The recommended follow-up research — "recruit 8–10 Quickbase power users who have tried Zapier or Make; understand specifically where they stopped and why" — frames this as the primary validation task (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Recommended Next Steps`).

**Condition-building is the hardest single task.** Across all tools in the competitive audit, conditional logic (field/operator/value pickers) is consistently identified as the point where non-technical users fail. The natural language conditions feature — "Only escalate if the request has been open for more than 3 days and hasn't been assigned yet" resolved to actual schema fields — is explicitly positioned as a differentiator against every existing tool (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Screen 4`).

**Error discovery in production drives abandonment.** "Users discover that error paths need to be built only when something breaks in production" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Error handling is manual and late`). The proactive error path design (AI prompts for failure scenarios after the happy path is complete) is a behavioral intervention — surfacing a behavior users would otherwise learn through failure.

**The staged-changes model reduces accidental destructive edits.** Bolt's user feedback explicitly confirms this: users praise the save/discard pattern for "psychological safety" (`docs/prd-pm-pd/visual-edit-competitive-analysis.md:Bolt, User feedback`). The InspectorToolbar implementation carries three simultaneous unsaved-state signals — dashed amber selection ring, amber tag badge, amber dirty dot on the toolbar — reflecting the doc's assessment that this triple signal is needed for users who are not developers and may not recognize a single indicator as consequential (`docs/handoffs/visual-edit.md:Visual Design Spec, Selection visual language`).

**Floating toolbars obscure content when the property set grows beyond eight controls.** The competitive analysis establishes this as a known failure mode: Base44 users report the toolbar "feels busy" with too many icon-only controls (`docs/prd-pm-pd/visual-edit-competitive-analysis.md:Base44, User feedback`). Builder's InspectorToolbar addresses this with a visual hierarchy across three opacity tiers — Tier 1 at full opacity, Tier 2 at 0.7, Tier 3 (delete) at 0.45 — reducing cognitive load at the point of entry (`docs/diagrams/visual-edit-flow.md:Architecture Decisions`).

**Plan approval copy requires explicit communication that execution starts immediately.** Design review feedback on the "Approve" button: "Wasn't clear execution starts after approval." Renamed to "Approve and Run" based on this signal (`docs/previews/plan-mode.md:Feedback from Design Review 2026-04-09, Emma`).

---

## 6. Open Questions and Gaps

The docs flag the following as explicitly unresolved:

**Schema access contract (blocking)**  
"The schema-aware suggestions and condition resolution are the core differentiators and both depend on this" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Open Questions, Question 1`). Until the API contract for accessing QB tables, field types, relationships, and required fields is defined, the natural language condition resolution feature cannot be designed or tested.

**Generation interruptibility architecture**  
"The interruptible generation model requires streaming generation with a well-defined checkpoint model. This is an engineering architecture decision that must be made before design begins" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Open Questions, Question 2`). The UX depends on this: if generation cannot be interrupted mid-build, the interaction model described in the vision doc (user says "Stop — I don't need that step" during canvas assembly) cannot be implemented.

**Pinning UX discoverability**  
"Risk: users may not discover pinning exists, leaving them feeling like they have less control than they do" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Open Questions, Question 3`). The AI-managed vs. Pinned node model is conceptually defined but has not been validated with users. The discoverability failure mode — users who want node-level control but don't know the feature exists — would reproduce the same trust gap the feature is designed to solve.

**Prompt mode AI integration in the toolbar**  
"The Prompt input in the toolbar is currently a mock. What is the expected AI behavior when a user submits a prompt in this context? Should it apply changes inline and stage them, or open a new AI turn in the chat?" (`docs/previews/visual-edit.md:Open Questions, Question 1`). The toolbar is too small for streamed output; the candidate approach is silent application as a staged change, but the loading state (spinner on toolbar vs. canvas overlay) is unresolved (`docs/diagrams/visual-edit-flow.md:Open Questions, Question 3`).

**Multi-select + design controls**  
Multi-select currently surfaces only the Prompt input. The question of whether to also offer shared property controls (e.g., bulk background color change) for design-mode edits is open (`docs/previews/visual-edit.md:Open Questions, Question 2`). No AI web builder in the competitive audit offers multi-element selection at all — "only desktop tools" have it — so there is no prior art to reference for the right scope (`docs/prd-pm-pd/visual-edit-competitive-analysis.md:Opportunity 5`).

**Plan review overlay re-accessibility during execution**  
"Currently the overlay closes on approve. Should users be able to re-open the plan as read-only reference during execution?" (`docs/handoffs/plan-mode.md:Open Questions, Question 2`). This matters for users who want to verify what they approved mid-execution — a trust gap that the closed-overlay behavior may create.

**Chat-as-audit-log legal and compliance review**  
"This is a strong product concept but has implications for data retention, privacy, and workflow ownership when users leave. Legal and compliance review needed before committing to 'chat = audit log' as the single source of truth" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Open Questions, Question 5`). This is not a UX design question but it blocks the audit trail from being a committed product guarantee rather than a prototype behavior.

**Cross-origin iframe inspector**  
"When the real iframe is integrated, cross-origin restrictions will prevent direct DOM access. The inspector may need a postMessage bridge or must operate only on same-origin preview content" (`docs/diagrams/visual-edit-flow.md:Open Questions, Question 1`). The current implementation uses direct DOM manipulation (`el.style.removeProperty`) that is explicitly marked prototype-only — production will require a style-patch system (`docs/handoffs/visual-edit.md:Open Questions, Questions 2 and 3`).
