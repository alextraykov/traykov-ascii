# UX Research: Email Template Editor

**Research type**: Design decision analysis and pattern synthesis
**Date**: 2026-04-22
**Scope**: Template editor as authoring surface — user task, editing model, variable system, version history, cross-product reuse, preview fidelity, and open questions

---

## 1. The User Task — Who Writes Email Templates

The template editor serves a specific configuration role, not a mass-communication authoring role. The person writing an email template in this system is setting up a notification that will fire automatically when a database event occurs — a record being added, modified, or deleted, or a recurring schedule triggering — not composing a one-off blast.

Based on the role model (`docs/user-roles.md`) and the notification configuration panel design (`docs/handoffs/notification-settings-panel.md`, `docs/previews/notification-settings-panel.md`), the primary author is an **admin or builder-role user** who owns the notification setup. The Admin role has full access to notifications and template editing. The Builder role has access to the Notifications section but not to billing or user management. Trial users also access the full feature for evaluation.

In practice this is an **ops administrator, application builder, or product owner** inside a QuickBase customer organization — someone who understands the underlying data schema (which tables and fields exist), has decided a notification should fire for a specific event, and now needs to write the message that recipients will receive. This person may have no HTML or email-marketing background. They are likely a business analyst or operations lead who uses no-code tools precisely to avoid writing code.

The secondary path — entering the template editor from the Builder page after an AI chat generates a notification — introduces a **more exploratory user** who may arrive with AI-drafted content already populated and simply needs to review, adjust subject line, and publish.

Key behavioral implications: this user thinks in terms of field names and record events, not merge tags or template syntax. They need the editor to surface schema-awareness, not raw variable interpolation.

---

## 2. Problem Statement — What Is Wrong with Existing Template Editors

Email notification editors in no-code and internal-tool platforms share a consistent set of failure modes.

**HTML exposure by default.** Most platform editors (including early iterations of tools like Retool and Bubble) present a raw HTML textarea or a minimal rich-text surface that forces users to understand `<br>` and `&nbsp;` to control spacing. Users who make one formatting mistake receive broken emails with no meaningful error feedback.

**No variable autocomplete or schema awareness.** The dominant pattern in legacy tools is a static "available variables" sidebar list. Users must manually copy a token like `{{record.fields.project_name}}` and paste it into the correct position. There is no type information, no validation that the field exists, and no indication of what a currency or checkbox field will render as in email. Autocomplete — the `{{` keystroke triggering a scoped picker — is absent.

**No meaningful preview.** Tools either show a bare text preview in the same editing surface (no email styling, no rendered chip display) or open a new browser tab with an approximation that may not reflect how the actual email client will display the message. Variable placeholders are shown as raw tokens in preview rather than resolved against representative data.

**Disconnected from schema.** When a table is deleted or a field renamed, existing templates that reference those fields produce silent failures — the email sends with a blank value or no notification fires at all. There is no validation layer between the schema and the template.

The research on editable states (`docs/prd-pm-pd/editable-states-per-component-research.md`, Section "AI Builders Have No Component-Aware Inspector") names an adjacent version of this problem for visual builders: AI-generated tools produce flat HTML with no semantic component model, making structured property editing impossible. The same principle applies to template editors: a flat textarea treats all content as undifferentiated text and cannot offer schema-connected autocomplete, type-aware rendering, or variable validation.

---

## 3. Block Model vs. WYSIWYG — Why This Approach Uses Blocks

The template editor uses a **block-based model** with slash commands, not a traditional WYSIWYG editor.

The slash command inventory (`docs/diagrams/template-editor-page-flow.md`, Section 6) reveals the structural choice: `/text`, `/heading1`, `/heading2`, `/heading3`, `/quote`, `/code`, `/bullet-list`, `/numbered-list`, and `/variable` are first-class block primitives invoked via keyboard. This is the Notion / linear editor interaction model — each paragraph is a discrete block with a type, not a range of styled text within a monolithic document.

The rationale is threefold.

First, email rendering requires controlled structure. An arbitrary WYSIWYG editor produces HTML that varies significantly across email clients (Gmail, Outlook, Apple Mail). Block-typed content can be serialized to table-based HTML or inline-styled markup appropriate for email without exposing the user to that transformation. The user sees blocks; the system emits rendered email HTML.

Second, variables require a semantic boundary. A variable chip (`{{Full Name}}`) is not a span of text with special color — it is a distinct block-level or inline node with a resolved type (text, email, date, currency). A block model makes this first-class rather than a text replacement hack. The edge case table (`docs/diagrams/template-editor-page-flow.md`, Section "Edge Cases") confirms that backspace on a variable chip removes the entire chip atomically — correct behavior for a node, not achievable cleanly with character-range selection.

Third, AI generation needs a clean insertion target. The spacebar-to-AI-input overlay (`docs/diagrams/template-editor-page-flow.md`, Section 5) fires only on an empty row, inserts generated content at block level, and respects the existing document structure. A flat textarea cannot scope AI generation to a cursor position within structured content.

WYSIWYG was the default choice before block editors became mainstream. For email content that will be systematically rendered outside a browser, the block model provides the necessary semantic layer.

---

## 4. Variable Insertion UX — Autocomplete Popover, Chip Pills, Schema Awareness

The variable system is the highest-signal design decision in this editor because it is the primary way the editor reflects schema-awareness — the gap identified as most damaging in legacy tools.

**Two insertion affordances** are documented (`docs/diagrams/template-editor-page-flow.md`, Sections 6 and 7):

- `/variable` via slash command: opens the variable picker from the command menu, surfacing the insertion within the existing slash command mental model.
- `{{` double-brace trigger on an empty row: opens the picker directly, following the convention established by template languages (Mustache, Handlebars, Liquid) that technical users already know.

The picker is schema-aware. Variables are grouped by table (Contacts, Projects, Tasks, Invoices) and each field displays its type (text, email, phone, date, currency, user, checkbox). This means the user sees not just "Budget" but "Budget — currency." The type information matters because currency fields render differently from text fields in email: they need a format decision. The current schema defines four tables with 24 fields across them.

Once inserted, variables render as **chip pills** — inline nodes that are visually distinct from surrounding text, not editable as raw characters, and removable as a single atomic unit via backspace. This is the correct representation: it signals to the author that this token will be replaced at send time, not that it is literal text.

The test email flow (`docs/diagrams/template-editor-page-flow.md`, Section 3) extends variable awareness into the send experience. Before sending a test, the modal surfaces a variable preview panel showing resolved values, allowing the author to edit test variable values before dispatching. This closes the loop: insert variable, see what it will actually contain, send test.

The content principles in `docs/content-guidelines/principles.md` — specifically the accuracy constraint ("content must reflect how the system actually works") — apply here directly. A variable chip that looks resolved but is actually raw token text at send time would violate the accuracy principle. The chip model ensures the author's mental model and the system's actual behavior are aligned.

---

## 5. Version History as an Authoring Tool

Version history in this editor is designed as a **non-destructive authoring safety net**, not just an audit log.

The version history flow (`docs/diagrams/template-editor-page-flow.md`, Section 2) supports four actions per version entry: click to load a preview in the editor, revert via the ↺ icon (which restores the version as a new draft, not by overwriting the current published state), preview in a new tab via ↗, and search across all versions.

The key design decision is that **revert creates a new draft** rather than destructively replacing the current version. This mirrors the pattern in `docs/diagrams/version-restore-flow.md` for the builder chat — pending revert state is shown with dimmed downstream messages, giving the user a preview of what will be affected before confirming. In the template editor, reverting produces a draft with a "Draft" badge, not an immediate publish. The author can review the restored content and still choose to publish or abandon.

The draft badge flow (`docs/diagrams/template-editor-page-flow.md`, Section 1) is the continuous edit/publish gate. Any unsaved change triggers a Draft badge. Leaving the page without publishing produces an unsaved changes warning. This is the same "prevent close when form has changes" pattern identified in the competitive research (`docs/prd-pm-pd/editable-states-per-component-research.md`, Section 2 — modal/dialog forms) as a critical pattern for internal tool UX, present only in Retool among the tools surveyed.

The publish flow (`docs/diagrams/template-editor-page-flow.md`, Section 4) includes a confirmation dialog with a diff view option. This is where version history transitions from passive record to active authoring tool: the author can compare the pending change against the currently live version before committing. A new version entry is created on successful publish, making every published state browsable in the history panel.

---

## 6. Shared Editor — Template Editor and Plan Documents on BuilderPage

The plan-mode handoff (`docs/handoffs/plan-mode.md`) documents that when a plan is approved for review, the preview panel on BuilderPage opens a `TemplateEditor` component. The same surface used to author an email notification body is used to display and edit the markdown content of a plan document.

This reuse is not incidental. The underlying mental model is **editable markdown with variables and blocks**. A plan document is structured prose with typed blocks (headings, bullets, body text) that may contain dynamic references. An email template is the same thing with the addition of schema-connected variable chips that resolve against live data.

The live cross-connect described in the plan-mode handoff — edits in the preview panel overlay push back to the PlanCard in real time via `updatePlanContent` — works because the TemplateEditor emits a serialized document that can be treated as markdown or as a variable-interpolation template depending on context. The editor does not know whether it is editing a plan or an email template; that concern belongs to the consuming page.

This unification reflects a research-backed insight from competitive analysis: the authoring pattern that users already have for structured documents (block-based, keyboard-driven, variable-insertable) is the same pattern that should govern notification template creation. Forcing users to learn two different editors for plan documents and email templates is a cognitive cost with no benefit. One editor surface, two deployment targets.

The WorkflowSpecCard pattern (`docs/prd-pm-pd/workflow-spec-living-artifact.md`) adds a third instance of this model: the spec card itself is editable markdown rendered inline in chat. The same block editor abstraction could serve all three surfaces with appropriate context-specific extensions (schema-aware variables for email, step-specific metadata for plans, connector references for workflow specs).

---

## 7. Preview Fidelity — What the Editor Preview Matches and What It Does Not

The template editor provides two preview mechanisms: the in-editor live preview (rendering chip pills and block formatting in the editing surface itself) and the "test email" flow, which dispatches an actual email to a specified recipient with variable values filled in.

**What the in-editor preview accurately represents:**
- Block hierarchy (headings, bullets, body text in correct visual weight)
- Variable chips in their resolved-label form ("Full Name" chip rather than raw `{{contacts.full_name}}`)
- Draft vs. published state via the badge

**What the in-editor preview does not and cannot represent:**
- Email client rendering variation. The block-to-HTML serialization will produce a consistent output, but how that HTML renders across Gmail (web, mobile), Outlook (2019, 365, mobile), and Apple Mail involves variations in margin handling, font fallbacks, image blocking, and link styling. The editor preview renders in a browser with full CSS support — not in an email client's constrained rendering environment.
- Dark mode in email clients. The CSS custom property system (tokens via `.dark` class on `<html>`) that powers the design system has no equivalent in email clients. Most email clients ignore CSS custom properties entirely. Dark mode in email requires inline style overrides and media queries that differ from the web token system.
- Sent variable resolution at preview time. The test email modal surfaces variable values for editing before send, but the in-editor view always shows the chip label, not the resolved value. A `{{Due Date}}` chip always renders as a chip — the author must send a test to see that it resolves to "May 15, 2026" in the actual email.

The "preview in new tab" action in version history (`docs/diagrams/template-editor-page-flow.md`, Section 2 — version item hover actions) offers an approximation of the rendered email, but this is still a browser render, not an email client render. True email client fidelity would require integration with a service like Litmus or Email on Acid, which is not part of the current design scope.

---

## 8. Open Questions Flagged in the Docs

The following questions remain unresolved in the documented design as of this research pass.

**Merge variables vs. expressions.** The current variable picker is a field-reference system: insert a field value from a specific table. The docs do not address expression-based variables — for example, formatting a date field as "next Tuesday" instead of a raw ISO string, or computing "overdue by X days" from a due date and the current date. No-code platforms split on this: Retool allows JavaScript expressions as variable values; Softr/Glide do not. The design has not specified whether the variable chip should support only raw field references or also evaluated expressions.

**Conditional content blocks.** The slash command list (`docs/diagrams/template-editor-page-flow.md`, Section 6) does not include a conditional block — a block that renders only when a condition is true (for example, "include this section only if the Invoice is overdue"). Most email marketing platforms (Mailchimp, Customer.io) support conditional blocks as a first-class block type. The template editor design does not currently account for this, which limits template expressiveness for multi-state notifications where the message body should differ based on record state.

**Multi-lingual templates.** The notification configuration panel supports a single template per notification. There is no documented path for creating language variants of the same template — no locale selector, no variant branching in the version history. For QuickBase customers with international teams, this is a gap. The docs flag locale-aware schedule times (the schedule picker uses named weekday options without timezone or locale metadata) but do not extend this concern to template content.

**Variable rendering for non-text field types.** The variable picker shows field types (currency, date, checkbox, user), but the docs do not specify how each type renders in the email output. Does a currency field render with the locale's currency symbol? Does a checkbox field render as "Yes"/"No", "true"/"false", or a custom label? Does a user field render the full name, the email address, or both? These are authoring decisions that affect template quality but are not currently surfaced to the author at insertion time.

**Orphaned variables after schema changes.** The docs do not describe behavior when a referenced field is deleted or renamed after the template is published. The test email flow validates recipient email and required header fields, but no validation against the current schema is documented. Silent variable failures — sending an email where `{{Project Name}}` resolves to blank because the field was renamed — would be a high-trust-cost failure for a notification that is supposed to carry real operational data.
