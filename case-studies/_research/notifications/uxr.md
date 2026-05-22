# UX Research: Notification Builder

**Case study area**: Notification configuration panel
**Primary sources**: `docs/handoffs/notification-settings-panel.md`, `docs/previews/notification-settings-panel.md`, `docs/diagrams/notification-settings-flow.md`, `docs/NOTIFICATION_CONFIG_PANEL_SPEC.md`, `docs/prd-pm-pd/ai-native-workflow-builder-vision.md`, `docs/content-guidelines/`
**Date**: 2026-04-22

---

## 1. The User Task — Who Configures a Notification and Why

The user is an app builder (Admin or Builder role) responsible for keeping end-users informed about record-level activity in their app. The task surfaces from two distinct triggers.

The first is operational: a record event just happened (a new request was submitted, a status changed, an approval was issued) and the builder wants downstream stakeholders — record owners, role-based recipients, or email field values — to receive a message without manual intervention. The second trigger is scheduled oversight: a manager or team lead wants a recurring digest of activity, such as a Monday-morning summary of open requests.

The entry point is `Sidebar → Notifications → New notification` (`docs/diagrams/notification-settings-flow.md:Entry Point`). An alternative entry point from the empty state is a `Build with AI` CTA, which signals that the expected path for less-confident builders is AI-assisted rather than form-driven. The config panel also surfaces within the Template Editor path: a user can start from a default template (welcome, transactional, billing, security, etc.) and arrive at the same configurable surface (`docs/diagrams/notification-settings-flow.md:Default Templates`).

The user bringing the task is not a workflow engineer. Per the vision doc, the target is "app builders who are not workflow engineers" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Scope`). The user understands their data — they know their tables and what the records mean — but they should not need to understand trigger encoding, recipient field resolution, or condition logic formalisms.

---

## 2. Problem Statement — What Is Hard in Traditional Tools

The vision doc names three failure modes in competing tools that apply directly to notification configuration (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Competitive Landscape`).

**The generation cliff**: Zapier Copilot and Power Automate Copilot both put AI at the start — they generate a starter workflow and then drop the user into a traditional configuration surface. For notifications specifically, this means the user is handed a field-by-field form with no guidance after the initial scaffold.

**Opaque condition logic**: Every existing tool forces users through field/operator/value pickers for conditions. The vision doc calls this out explicitly: "Only if the request is high priority" requires finding the correct field, picking the right comparison operator, and entering an exact value. One mistake produces silent failures — the notification either fires when it should not or never fires at all. There is no in-product feedback loop.

**No schema awareness**: Zapier does not understand what fields are in a QuickBase table. Every recipient mapping, every trigger field selection, and every condition is configured manually. This is a particular pain point for recipient configuration: in classic QuickBase notifications, the user must know in advance which fields contain email addresses or user references. The Pave config panel addresses this by loading only email and user fields from the selected table into the recipients dropdown (`docs/diagrams/notification-settings-flow.md:Recipients Flow`).

The design QA spec adds a fourth failure mode specific to this implementation: the selected trigger card's visual state used a full ring with `box-shadow` that was "extreme" in contrast, and the sub-options for each trigger (events, schedule fields) were visually disconnected from the card that owned them (`docs/NOTIFICATION_CONFIG_PANEL_SPEC.md:A3, A4`). This is the prototype-layer equivalent of opaque workflow structure: the user cannot tell which settings belong to which trigger.

---

## 3. Options Considered — Wizard vs. Inline Panel vs. Chat-Driven

The docs do not contain a direct comparative decision log, but the architectural evidence points to a considered three-way choice.

**Wizard flow** (multi-step modal, one section per page) was not chosen. The config panel is a single vertical form inside a dialog (`docs/diagrams/notification-settings-flow.md:Config Panel Form Layout`). This is intentional: the form is short enough that a wizard would add navigation overhead without reducing cognitive load. The single-form approach also supports progressive disclosure within the form — table selection unlocks downstream fields — without requiring page transitions.

**Inline panel** (persistent side panel in the notifications list view) was also not the direction. The panel lives in a dialog (`NotificationsPage.tsx` renders it inside a `Dialog`), meaning it has a discrete create/cancel lifecycle. This matches the handoff note that "edit opens Template Editor directly" — creation and editing are intentionally separate surfaces (`docs/handoffs/notification-settings-panel.md:Edge Cases, #5`).

**Chat-driven creation** is the direction for the `Build with AI` CTA path, not the manual path. The notifications page empty state offers both `New notification` (form dialog) and `Build with AI` as parallel entry points (`docs/diagrams/notification-settings-flow.md:Empty State`). The AI path aligns with the broader vision doc interaction model — intent mode feeding a structured output — but the manual form remains for users who want direct control or who are editing an existing notification.

The manual form won for the explicit creation case because it is deterministic. When a user knows their table, their recipient fields, and their trigger conditions, a form gives them control without requiring them to phrase their intent correctly. The `Build with AI` path is the ramp; the form is the fallback and the edit surface.

---

## 4. Natural-Language Condition Input — Is It Applied Here?

The vision doc describes natural-language condition resolution as a primary differentiator: the user types "Only escalate if the request has been open for more than 3 days and hasn't been assigned yet," and the AI resolves intent to field mappings, showing a hybrid display of plain language on the left and the resolved field mapping on the right (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Screen 4 — Natural language conditions`).

In the current notification config panel, this capability is **not applied**. The condition builder is a recursive field/operator/value tree — exactly the pattern the vision doc describes as the pain point in legacy tools (`docs/diagrams/notification-settings-flow.md:Condition Tree`). The operators are enumerated (`equals`, `does not equal`, `contains`, `is empty`) and the field picker requires the user to select from a dropdown populated by the table's field list. There is no natural-language input surface in the conditions section.

This is a meaningful gap between the prototype's current state and the vision. The conditions section represents the hardest part of notification configuration — precisely where natural-language resolution would have the highest impact. The design QA spec flags a related problem: the condition tree empty state gives no guidance ("No conditions yet — all records will trigger this notification" is recommended but not yet implemented, `docs/NOTIFICATION_CONFIG_PANEL_SPEC.md:B4`). Without that empty state text, the user cannot tell whether having no conditions is intentional or a misconfiguration.

The `Build with AI` path is where natural-language condition entry is expected to live in a future iteration, routed through the workflow builder's conversation model rather than the form's condition tree.

---

## 5. Channel Ergonomics — Email, Slack, Webhook

The current implementation is email-only. The page header reads "Email notifications" and the channel filter in the table view lists Email, In-App, and SMS as options — but only Email is implemented in the config panel as of this writing (`docs/diagrams/notification-settings-flow.md:Filter Bar`).

The prioritization of email first reflects the user's mental model for record-level alerts: email is the default notification channel for enterprise tools, it maps to an existing field type (email fields in QB tables), and recipient resolution against table field values is a pattern already understood by QuickBase users. Slack and webhook channels introduce a different recipient model — channels and endpoint URLs rather than field-resolved addresses — which requires a separate design pattern for recipient configuration.

The channel filter columns in the notifications table (`docs/diagrams/notification-settings-flow.md:Table Columns`) suggest that multi-channel support is planned at the data model level even if not yet configurable. The DSL skeleton referenced in the agent-teams spec already includes a `NOTIFY` node type, which is channel-agnostic at the execution layer (`docs/prd-pm-pd/agent-teams-workflow-spec.md:What's needed`).

No formal research findings or channel preference data are cited in the available docs. The current priority reflects a pragmatic "email first because it is the simplest recipient model" decision rather than user research on channel preference.

---

## 6. Preview and Test Affordance

A preview dialog exists and is implemented in dual-mode: it surfaces when a user selects "View" on a template card in the carousel, and when a user selects the eye icon on an existing notification row (`docs/diagrams/notification-settings-flow.md:Preview Dialog`). The dialog shows a notification's email fields (From, Reply-To, Subject), body blocks, and variable list.

This is post-creation preview — the user sees what a notification looks like after it has been saved or templated. There is no pre-save "send a test email" flow in the creation dialog itself. The handoff doc notes that the `onTestSend` prop exists on `NotificationConfigPanel` but is wired up in the Template Editor footer, not inside the creation dialog (`docs/handoffs/notification-settings-panel.md:Edge Cases, #10; docs/NOTIFICATION_CONFIG_PANEL_SPEC.md:B10`). The prop was included speculatively but is not rendered.

The preview brief explicitly lists "Preview dialog (dual mode)" as implemented (`docs/diagrams/notification-settings-flow.md:Implementation Status`), but the test-send affordance — seeing what a notification would actually deliver before activating it — is not available from the creation flow. The vision doc establishes the design principle for this: "One-click test run using synthetic data drawn from the schema... step-by-step trace in plain language" (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Trust Mechanisms, Test run with sample data`). This trust mechanism exists in the workflow builder vision but has not been applied to the notification panel.

---

## 7. Copy Patterns — Notification Body, Subject Lines, Action Buttons

The preview brief contains a comprehensive copy inventory for the config panel itself (`docs/previews/notification-settings-panel.md:Copy Inventory`). Key patterns observed:

**Trigger card descriptions** use the "What it does + when it fires" format: "Send when records are added, modified, or deleted" and "Send at a recurring time — daily, weekly, or monthly." This matches the `docs/content-guidelines/components/descriptions.md` anatomy: what it is, why it matters, stated in one sentence without restating the label.

**Placeholder copy** follows a consistent instruction pattern: "Select a table first" (recipients when no table), "Select a table to add conditions" (conditions hint), "Select a table to choose specific trigger fields" (tooltip). The repetition of "Select a table first" as the blocking message is intentional — it reinforces the required sequencing of the form without error states. This aligns with the content guideline that framing should never blame the user for system sequencing constraints (`docs/content-guidelines/style-rules.md:Framing Rules`).

**Action buttons** in the dialog use `Save` and `Cancel` — the standard pair for form submission per the content guidelines (`docs/content-guidelines/components/buttons-ctas.md:Button Pairs`). The condition tree actions use `+ Add condition` and `⑂ Add group`, which deviate slightly from the imperative-verb-first rule (the `+` prefix precedes the verb). The `⑂` branch symbol for "Add group" is a visual affordance that has no text alternative for screen readers — a potential accessibility gap.

**Notification body and subject copy** are not governed by the config panel — those live in the Template Editor. The preview dialog shows the email's From, Reply-To, Subject, and body blocks, but no content guidelines in the available docs specifically address notification email copy patterns (subject line length, variable placeholder format, body tone). This is an open area.

---

## 8. Open Questions

The following are unresolved in the docs as of the research date.

**Delivery timing and digesting**: The recurring schedule supports daily/weekly/monthly delivery, but there is no batching or digest model. If twenty records change within a trigger window, does the notification fire twenty times or once with a summary? The workflow builder vision describes a `NOTIFY` DSL node but does not specify whether it supports batch aggregation. This is flagged in the design QA spec as `Monthly` frequency lacking a "day of month" selector (`docs/NOTIFICATION_CONFIG_PANEL_SPEC.md:B8`), which is a related gap — the schedule model as a whole is underspecified for production use.

**Escalation paths**: The vision doc describes error path design as proactive — the AI should prompt "what should happen if no one responds within 24 hours?" after the happy path is built (`docs/prd-pm-pd/ai-native-workflow-builder-vision.md:Screen 5 — Error path design`). The notification config panel has no equivalent. There is no escalation rule, no retry logic, and no fallback recipient. For enterprise use cases (approvals, incident routing), the absence of escalation is a significant gap.

**Recipient multi-select resolution**: The save handler currently uses only `recipientFields[0]` to populate the encoded config, discarding any additional selected recipients (`docs/handoffs/notification-settings-panel.md:Edge Cases, #3`). This is flagged as an engineering decision needed, but no resolution is documented.

**Natural-language condition entry**: As established in section 4, the vision capability has not been applied to the notification conditions section. Whether it should be integrated into the config panel form or exclusively accessed through the `Build with AI` path is unresolved.

**Table-change data loss warning**: Changing the selected table silently resets recipients, trigger fields, and conditions (`docs/NOTIFICATION_CONFIG_PANEL_SPEC.md:B2`). No confirmation or warning is implemented. A user who has built a multi-condition tree and accidentally changes the table loses all work without any recourse.

**Notification naming conventions**: The name field placeholder is `e.g., Welcome Email`, which implies email-format copy conventions for the notification name. As channels expand to Slack and webhook, the name placeholder will need to evolve — or a channel-aware naming hint will need to be introduced.
