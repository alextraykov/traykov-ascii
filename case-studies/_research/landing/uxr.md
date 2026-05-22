# UX Research — Marketing / Landing Page
**Case study**: Landing page (unauthenticated entry point)
**Date**: 2026-04-22
**Researcher**: UX Researcher agent
**Status**: Research complete — ready for design and product review

---

## 1. Who the marketing page is for

The landing page sits at the login route and is the first surface an unauthenticated visitor touches. The intended audience is an app builder — someone managing data-driven workflows inside an organization — who is not necessarily a workflow engineer or a developer.

The product vision document is explicit about this audience: "target users are app builders who are not workflow engineers" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Scope`). These users arrive having already formed an opinion of AI workflow builders, and that opinion is predominantly skeptical. They have experienced what the vision doc names the "generation cliff" — AI generates a starter workflow, then abandons the user alone with a complex visual canvas (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Where all of them break`). Zapier Copilot, Power Automate Copilot, and Make all follow this pattern.

Concretely, the visitor's prior belief set before landing here is:

- AI builders are useful to *start* a workflow, not to *finish* one.
- Conditional logic, error handling, and schema-aware field mapping always require manual work.
- "Natural language" means "first step only, then you're on your own."
- The real interface is the node canvas, and the AI is a shortcut to get there.

The marketing page's job is to replace this belief set before the visitor reads a single word of feature copy. The page does this through behavior, not assertion.

---

## 2. Primary conversion goal

The single conversion goal is: **get the visitor to type a prompt**.

The page is not trying to convert a visitor to a signed-up user in one step. It is trying to convert a visitor to a *committed intent* — someone who has started something. The stash mechanism (see section 5) makes this the minimum viable commitment that survives authentication friction.

The mental-model bet is documented in the flow diagram: "any attempt to 'build' routes through the LoginModal, and the user's prompt is stashed so it pre-fills in the Builder after sign-up/login" (`docs/diagrams/marketing-page-flow.md:Overview`). The page does not ask the visitor to sign up in order to try — it asks the visitor to try, then presents authentication as the necessary next step to see the result. The prompt is the value, and sign-up is the retrieval mechanism.

This inverts the standard SaaS conversion funnel. The visitor is not evaluating whether to give up an email address. They are retrieving something they have already made. The LoginModal is framed as a handoff point, not a paywall.

The hero chat input enforces this: it is a real `textarea` with a typewriter placeholder cycling through prompt examples, not a screenshot of one (`docs/diagrams/marketing-page-flow.md:State Management`, `inputValue` and `isInputFocused` states). The visitor can type immediately. There is no "try it free" button to click before the input becomes active.

---

## 3. How It Works — the HomeMockup strategy

The "How It Works" section contains three showcase steps rendered as interactive mockups (`docs/diagrams/marketing-page-flow.md:How It Works`). The design rationale for this is stated structurally: Step 1 uses a `HomeMockup` that mirrors the authenticated Home page interaction. This is not a screenshot or an animation. The `HomeMockup` has a real `textarea`, real suggestion pills that fill the input on click, and a real submit path that surfaces a `'sign up free →'` CTA via `AnimatePresence` (`docs/diagrams/marketing-page-flow.md:Step 1: Describe — HomeMockup`).

The reason this beats a static "3 steps" explainer is that the visitor has already formed a mental model of what the product *feels like* before they authenticate. The show-don't-tell principle from the content guidelines applies here with unusual force: "Clarity is the north star for content decisions" (`docs/content-guidelines/principles.md:Clarity`). A visitor reading "describe what you want to build" understands a claim. A visitor typing into a live input and watching a CTA animate in understands a product.

Step 2 (`BuilderMockup`) uses a `SubagentBubble` that auto-plays a four-step timeline with real timing values (1.2s → 2.8s → 4.6s → 6.2s) and a completion badge at 7.4s (`docs/diagrams/marketing-page-flow.md:Step 2: Build — BuilderMockup`). This is the product vision's "generation is not one-shot" claim rendered as observable behavior — the visitor watches steps appear sequentially rather than reading a description of the AI building node by node.

Step 3 (`PreviewMockup`) is deliberately static — "purely decorative, no interactivity" — with animated count-up KPI cards and a status-badged data table (`docs/diagrams/marketing-page-flow.md:Step 3: Deploy — PreviewMockup`). This communicates the end state without inviting interaction that would require authentication to be meaningful.

The responsive behavior of the mockups is carefully considered: on desktop, Step 2 reverses the grid (mockup left, text right), creating visual rhythm across the three steps. On mobile, sidebars are hidden, mockup height is capped at 360px with a bottom fade gradient, and `HomeMockup` pills are suppressed entirely (`docs/diagrams/marketing-page-flow.md:Responsive Behavior — Showcase Mockups`). The mobile degradation strategy prioritizes text legibility over interactive fidelity, which is the correct priority given mobile visit-to-convert rates on B2B SaaS landing pages.

---

## 4. Key user journeys

The flow document names seven distinct journeys (`docs/diagrams/marketing-page-flow.md:Key User Journeys`):

**Journey 1 — Prompt → Sign Up → Builder (primary conversion path)**
Visitor arrives, types in the hero input, sends. `LoginModal` opens with prompt stashed. Visitor authenticates (Google, GitHub, Apple, SSO, or email/password). Redirect to Builder with prompt pre-filled. This is the page's designed outcome and the flow the entire visual hierarchy supports.

**Journey 2 — Template pill → Sign Up → Builder**
Visitor does not have a prompt ready. Clicks a suggestion pill (Inventory, Project, CRM, Portal). Pill text fills the input as `'Build me a [label]'`. Visitor sends. Same LoginModal → Builder redirect sequence follows. The pills function as a decision scaffold for visitors whose arrival intent is vague.

**Journey 3 — Showcase mockup easter egg → Sign Up**
Visitor scrolls to "How It Works." Interacts with `HomeMockup` or `BuilderMockup` input. Types and sends. A CTA overlay appears (`'Great idea! sign up free →'` for HomeMockup, `'sign up to refine →'` for BuilderMockup). Visitor clicks the CTA and `LoginModal` opens. This journey converts visitors who arrived skeptical but are won over by the interactive demonstration.

**Journey 4 — Bottom CTA → Sign Up**
Visitor reads the full page and reaches the bottom `GradientCanvas` section. Clicks "Start building." `LoginModal` opens. This is the lowest-intent conversion point — it captures visitors who needed the full page to form intent.

**Journey 5 — Topbar CTA → Sign Up**
Visitor scrolls past `scrollY > 20` — the topbar gains `backdrop-filter: blur(16px)` — and clicks "Get started" in the topbar (`docs/diagrams/marketing-page-flow.md:Scroll-Triggered Behaviors`). This captures visitors who formed intent mid-page and do not want to scroll back to the hero.

**Journey 6 — Browse only (no conversion)**
Visitor reads all sections, does not interact with any input or CTA. Leaves. No stash is created. This is the majority outcome for most landing pages; the page design accepts this and prioritizes the quality of the conversion path for visitors who do engage.

**Journey 7 — Reduced motion user**
`prefers-reduced-motion: reduce` disables all transitions, bento hover transforms, `BlurText` cascade animations, and `ProvenIllustration` pulses. Content is immediately visible. All functionality is preserved (`docs/diagrams/marketing-page-flow.md:Edge Cases`). This is a correct accessibility implementation per the content guidelines' accessibility constraint: "Content must be usable and understandable by all people" (`docs/content-guidelines/principles.md:Accessibility`).

**Decision points that determine journey outcome:**
The first fork is whether the visitor types in the hero input (Journey 1 or 2) or scrolls (Journeys 3–7). The second fork, for scrollers, is whether the `HomeMockup` interaction converts them before the bottom CTA does. The third fork is authentication method inside `LoginModal` — five options are offered (Google, GitHub, Apple, SSO, email/password), which minimizes drop-off from authentication friction (`docs/diagrams/marketing-page-flow.md:LoginModal — Authentication Flow`).

---

## 5. The prompt-handoff narrative

The mechanic is: visitor types → `inputValue` is captured → visitor sends → `stashedPrompt` is set → `showLoginModal` opens → visitor authenticates → `stashedPrompt` is passed to Builder as a pre-filled input.

The full state table confirms `stashedPrompt` persists through modal close: "Modal close without login → Stashed prompt preserved in component state" (`docs/diagrams/marketing-page-flow.md:Edge Cases`). Edge cases are handled: long prompts expand the textarea and are still stashed, special characters are preserved, and a double-open attempt is guarded against by the `showLoginModal` boolean (`docs/diagrams/marketing-page-flow.md:Edge Cases`).

This pattern beats the industry-standard "sign up first, then type" flow because it eliminates the category of visitor who signs up, arrives at an empty canvas, does not know what to type, and leaves. The product vision names this the "generation cliff" and identifies it as the primary failure mode of every current workflow builder (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Where all of them break`). The stashed-prompt approach means the Builder never presents a blank slate to a new user — it presents their own stated intent, already in progress.

There is also a semantic layer to the prompt interaction. The gradient system responds to the text in the hero input: as the visitor types, the background palette cross-fades to a semantic category match (dashboard, CRM, ecommerce, inventory, HR, booking) using a 400ms debounce and a 1800ms `easeInOutCubic` RGB lerp running entirely in rAF without React re-renders (`docs/diagrams/homepage-gradient-system.md:Colour Interpolation Flow`). The six semantic palettes cover the product's primary use cases. The visitor who types "track my inventory" sees an amber-orange palette shift — the product environment is already orienting itself around their problem before they finish the sentence. This is a behavioral demonstration of the product vision's core claim: "the AI understands your data model before you say anything" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Screen 1`).

---

## 6. Competitive context

The competitive analysis covers twelve tools across web builders, no-code platforms, and AI builders (`docs/prd-pm-pd/visual-edit-competitive-analysis.md`), and the product vision document provides a detailed assessment of workflow-specific competitors (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Competitive Landscape`). The landing page strategy can be evaluated against five relevant entry page models:

**Zapier**: The Zapier marketing page presents use cases and integration logos. Conversion is "sign up free." The visitor describes their workflow *after* authentication — the blank canvas problem. No prompt engagement on the marketing page.

**Make (Integromat)**: Make's landing page is primarily feature marketing with a "Get started free" CTA. No interactive demonstration of workflow building. The product vision notes Make has "no meaningful AI workflow generation" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Make`). The landing experience does not differentiate from traditional SaaS entry flows.

**Durable**: Durable's entry page leads with speed ("Build a website in under 30 seconds") and a business description input. This is the closest analog to the stashed-prompt pattern — Durable asks for input before sign-up. However, Durable's "regenerate rather than edit" philosophy (confirmed in the competitive analysis) means the prompt is a generation trigger, not a persistent intent that carries through authentication (`docs/prd-pm-pd/visual-edit-competitive-analysis.md:Durable`). The visitor relationship to the prompt is disposable, not persistent.

**v0 (Vercel)**: v0's entry allows immediate component generation without authentication for limited usage. The visitor interacts with a prompt input on the landing page and sees output, then is prompted to sign in to save or extend. The interactive demonstration model is similar to the stashed-prompt approach, but v0's output is code, not a workflow — the audience and mental model differ. The competitive analysis notes v0's primary audience is developers, not app builders (`docs/prd-pm-pd/visual-edit-competitive-analysis.md:v0 by Vercel`).

**Framer**: Framer's landing page uses high-quality motion to communicate design quality but converts on "Start for free" without prompt engagement. Framer AI operates at page generation level; there is no element-level AI integration on the landing page experience (`docs/prd-pm-pd/visual-edit-competitive-analysis.md:Framer`).

The differentiating position of this landing strategy is: it is the only pattern in the competitive set that treats the visitor's typed intent as a durable object that persists through authentication and arrives in the product ready to act on. The prompt is not discarded at the LoginModal. It travels with the user.

---

## 7. Open questions

The following questions are not answerable from the current documentation and represent gaps that should be addressed before the landing page is considered research-complete.

**A/B test existence**: No A/B testing data or experiment design is documented in the current spec set. The flow document defines the prompt-first design as the canonical pattern but does not compare it to an alternative (e.g., sign-up-first with empty Builder, or a static landing page with a demo video CTA). The stashed-prompt approach is a strong hypothesis but is unvalidated by comparative data. The `blinq-trail-experiment.md` document exists in `docs/prd-pm-pd/` but was not cited in the marketing page specification — it may contain relevant experiment data worth reviewing.

**Conversion rate data**: No quantitative data exists in the documented sources for hero input engagement rate, LoginModal open rate, stashed-prompt survival rate through authentication, or Builder prompt pre-fill utilization rate. All current design decisions are hypothesis-driven, not evidence-driven. Before the landing page design is locked, baseline conversion metrics should be established, even from prototype usability sessions.

**Stashed-prompt usability testing**: The stashed-prompt handoff is the most novel interaction in the flow and the highest-risk assumption. The specific UX moment — "your prompt is waiting for you in Builder" — requires that the visitor understands what they are being asked to authenticate into. If visitors experience the LoginModal as a paywall rather than a retrieval mechanism, the stash mechanic fails silently (they authenticate but do not notice the pre-filled prompt, or they abandon authentication entirely). No usability testing of this moment is documented. A moderated session with 6–8 representative users performing the full Journey 1 flow would directly test this assumption.

**Semantic gradient discoverability**: The gradient palette system responds to input text, but this behavior has no affordance — there is no tooltip, label, or animation that signals to the visitor that typing will change the visual environment. Users who do not notice the gradient shift miss one of the strongest behavioral demonstrations of the product thesis. An eye-tracking study or think-aloud session would establish whether this feature registers as meaningful or is invisible to most visitors.

**Template pill copy validation**: The four suggestion pills use category labels (Inventory, Project, CRM, Portal) that fill the input as `'Build me a [label]'` (`docs/diagrams/marketing-page-flow.md:Step 1: Describe — HomeMockup`). The category choices and the fill-text format have not been validated against visitor vocabulary. If visitors do not recognize their use case in the four options, or if the phrase "Build me a Portal" does not match how they describe their need, the pills fail as a decision scaffold. Unmoderated card sort or first-click testing on the hero section would surface this quickly.

**Mobile journey validation**: The responsive specification suppresses `HomeMockup` pills on mobile, caps mockup height at 360px, and hides all sidebars (`docs/diagrams/marketing-page-flow.md:Responsive Behavior`). The mobile experience is a text-and-hero-input flow with degraded demonstrations. No mobile-specific conversion hypothesis or usability data is documented. Given that a substantial fraction of landing page visits originate from mobile, a mobile-specific usability session would establish whether the reduced demonstration fidelity materially impacts conversion intent.
