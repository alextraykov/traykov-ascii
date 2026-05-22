# UX Research Brief — Home Page (`#home`)

**Route**: `#home` | **Source**: `src/pages/HomePage/`
**Researcher**: UX Researcher agent | **Date**: 2026-04-22
**Status**: Evidence-based — no dedicated Home handoff or preview brief exists in docs

---

## 1. User and Intent

The Home page sits at the top of the authenticated navigation tree and is the first surface a signed-in user encounters (`docs/diagrams/app-navigation-flow.md`, Component Mapping table). The user who lands here has just completed authentication and carries a specific mental state: they have intent — an idea for a new application or workflow — but no existing project to continue. They are, in the language of the product vision, at the "blank slate" moment.

The marketing page flow (`docs/diagrams/marketing-page-flow.md`, Key User Journeys) establishes the primary journeys that deliver users to this moment: a user typed a prompt on the public marketing page, authenticated through LoginModal, and expects that intent to carry forward. Their mental state is primed and active, not exploratory. A secondary user arrives without a pre-formed prompt and relies on the suggestion system to surface one.

The product vision (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md`, Screen 1) defines this user specifically as "app builders who are not workflow engineers" — Quickbase customers who understand their business problem but have no interest in configuring a flowchart.

No user research study with recruited participants is documented in the repository. The persona described above is inferred from the product vision's stated scope, not from interview or survey data.

---

## 2. Problem Statement

The documented problem is the "generation cliff" — the failure mode where AI-assisted tools get a user started but abandon them the moment a canvas appears (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md`, "Where all of them break", item 1). The cliff exists because the transition from intent to tool is a context rupture: the user spoke in natural language, and then is handed a visual paradigm they did not ask for.

The Home page problem is the upstream version of that cliff: how do you capture intent at the moment it exists, without creating friction that causes the user to abandon before the AI can help? The design answer is a full-viewport chat input that is the only affordance on the page — no menus, no project grids, no configuration. The UI says nothing can happen until intent is stated.

A secondary problem is the blank-input paralysis documented across AI products: users who have vague intent but need a prompt to act. The suggestion pills (`src/pages/HomePage/HomePage.tsx`, `TEMPLATE_PILLS`) address this directly. The marketing page's `HomeMockup` uses the same pattern with identical interaction logic, confirming this was a deliberate design decision applied consistently.

No formal usability test or analytics data documenting blank-input abandonment rates exists in the repository.

---

## 3. Options and Alternatives Considered

No explicit decision log for the Home page layout exists in `docs/handoffs/`, `docs/previews/`, or `docs/prd-pm-pd/`. The following alternatives can be inferred from structural evidence:

**Project dashboard / picker model**: The `ProjectsPage` (`docs/diagrams/projects-page-flow.md`) already exists as a separate route and handles exactly this pattern — a list or grid of existing projects with search, sort, and creation affordances. The fact that Home is a separate route with no project list signals a deliberate rejection of "land in your projects" as the authenticated entry point. The vision doc's emphasis on "blank slate with schema-aware proactive suggestions" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md`, Screen 1) is the stated rationale for this separation.

**Onboarding walkthrough / wizard model**: No evidence this was considered. The vision doc's competitive analysis explicitly frames guided recipes (Monday.com's approach) as a limitation, not a model to emulate (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md`, Competitive Landscape, Monday.com entry).

**Hybrid dashboard + input**: The agent-teams spec describes the Connection object as the atomic product primitive — "What do you want to do with your Snowflake connection?" rather than "Create an automation" (`docs/prd-pm-pd/agent-teams-workflow-spec.md`, Section 9). The Home page applies the same logic at the product entry point: the question is the starting surface, not an inventory of existing objects.

---

## 4. Decision Rationale

The narrative that emerges across the vision docs is consistent: the interface is the conversation, and the conversation begins with intent capture. The Home page is the physical expression of that thesis.

The vision doc frames the core product bet as "conversation and the visual canvas are a single surface — you never leave the conversation" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md`, The Central Bet). For this to be true at the interaction level, the first thing the product asks of the user must be a conversational act — typing intent — not a navigational one such as selecting a project.

The gradient system (`docs/diagrams/homepage-gradient-system.md`) reinforces this rationale through motion design: the background is not decorative. It responds semantically to input text, shifting palette toward domain-specific hues (dashboard, CRM, ecommerce, HR, inventory, booking). This is legible intent feedback — the canvas is already reacting before the user has submitted anything, making the idea that "the canvas is the chat's output" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md`, Core Principle) perceptible from the first keystroke.

The cascade animation sequence in the component — BlurText heading resolves, then subheading, then input, then pills — is documented as a deliberate phase gate (`src/pages/HomePage/HomePage.tsx`, cascade phases comment). The effect draws the user's eye to the input as the terminal point of the sequence, reducing the cognitive cost of knowing what to do next.

---

## 5. Competitive Signals

The vision document contains the most substantive competitive analysis in the repository (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md`, Competitive Landscape). All five named competitors — Zapier Copilot, Power Automate Copilot, Monday.com AI Automations, n8n Ask AI, Make — share the same entry pattern: natural language describes, then a traditional canvas appears and the AI disengages. None of the reviewed competitors use the entry point as a semantic intent surface that stays coupled to what is built.

The agent-teams spec adds market signals: OpenClaw (355K GitHub stars), Claude Code, Cursor, and Devin are cited as normalizing "give it tools, let it figure it out" as the dominant interaction model in adjacent developer-tool categories (`docs/prd-pm-pd/agent-teams-workflow-spec.md`, Section 8.1). The Home page's prompt-first design is positioned as the non-developer equivalent of this interaction model.

No primary competitive UX research (teardown sessions, user switching studies, heuristic evaluations of competitor entry flows) is documented in the repository.

---

## 6. Open Questions

The following tensions are unresolved in the documentation as it pertains to Home specifically:

1. **Schema-aware suggestions are not yet implemented.** The vision doc's most differentiated feature at the entry point — proactive suggestions generated from the user's actual data model before they type anything — is described as a future capability (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md`, Screen 1). The current implementation uses four static `TEMPLATE_PILLS` (`src/pages/HomePage/HomePage.tsx`). No doc records whether this is a known gap or a v1 scoping decision.

2. **No returning-user state is designed.** The page has no documented behavior for a user who already has projects. The navigation model routes them through `ProjectsPage` if they go there, but Home has no "your recent projects" or "continue where you left off" affordance. Whether this is intentional (Home is always for new intent) or a gap is unstated.

3. **The stashed-prompt handoff contract is implicit.** The marketing page documents prompt stashing through LoginModal to the Builder (`docs/diagrams/marketing-page-flow.md`, State Management, `stashedPrompt`). Whether Home's ChatInput uses the same mechanism to carry intent to the Builder — or whether a Home submission navigates differently — is not specified in any handoff or diagram.

4. **No accessibility research exists.** The gradient system's motion complexity (six simultaneous animation layers, parallax, semantic color interpolation at 60fps) creates a significant `prefers-reduced-motion` surface area. The implementation addresses this (`src/pages/HomePage/HomePage.tsx`, shouldReduceMotion), but no usability testing with users who have vestibular disorders or cognitive sensitivity to motion is documented.

5. **No handoff or preview brief for this page exists.** `docs/handoffs/` and `docs/previews/` contain no `home.md` entry, which means the behavioral intent — particularly the semantic gradient response and cascade sequence — has not been formally specified for the engineering team building the production equivalent.
