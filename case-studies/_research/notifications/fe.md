# Notification Builder — Frontend Notes

> Sources: `src/pages/NotificationsPage/NotificationsPage.tsx`,
> `src/components/composite/NotificationConfigPanel/NotificationConfigPanel.tsx`,
> `docs/handoffs/notification-settings-panel.md`,
> `docs/previews/notification-settings-panel.md`,
> `docs/diagrams/notification-settings-flow.md`

---

## 1. Form State Model

The panel uses plain `React.useState` — no form library. A single `NotificationConfig` object
is held in state and mutated via a shared `updateConfig(Partial<NotificationConfig>)` helper
(panel.tsx:879–888). Every field update calls `onChange?.(next)` synchronously, so the parent
Dialog can read the latest value at any time through a `dialogConfigRef` ref
(page.tsx:558, 619).

Validation is **gate-on-save only**, not on-change. `handleSaveNotification` (page.tsx:618–675)
returns early if `!cfg.name || !cfg.tableId`. No inline error messages are rendered — there is
no `aria-invalid`, no `aria-describedby` error region, and no visual error state on the fields
themselves. This is the most significant gap for production.

There is also a min-enforcement guard in `toggleSendOption` (panel.tsx:461–468) that blocks
deselecting the last active trigger card, and a parallel guard in `toggleRecordEvent`
(panel.tsx:902–910) that keeps at least one event checked. Both are silent — no feedback copy.

Default state (panel.tsx:128–142): `sendOptions: ['record-event']`, `recordEvents: ['added']`,
`triggerFieldsMode: 'all'`, `checkPermissions: true`, `frequency: 'weekly'`, `day: 'monday'`,
`time: '09:00'`.

---

## 2. Trigger Builder

The trigger section uses **two clickable card rows**, not a dropdown tree. Each card is a
`role="checkbox"` div with `aria-checked` and `onKeyDown` Space/Enter handling
(panel.tsx:526–534, 710–719). Both can be active simultaneously; at least one must remain on.

When a card is checked its body expands (Framer `AnimatePresence`). Inside:

- **Record event card** renders three `<Checkbox>` items — Added / Modified / Deleted
  (panel.tsx:574–590) — plus a segmented switch for "All fields" vs. "Specific fields"
  (panel.tsx:595–636).
- **Schedule card** renders a 2- or 3-column grid of `DropdownMenu` pickers for Frequency,
  Day, and Time (panel.tsx:756–843). The Day column is conditionally hidden when
  `frequency === 'daily'` (panel.tsx:785), collapsing the grid to 2-col via inline
  `gridTemplateColumns` (panel.tsx:756).

The trigger encoding at save time joins active triggers with `+` and events with `,`:
`record-event.added,modified+recurring-schedule.weekly` (page.tsx:624–630, diagram save-flow).

---

## 3. Recipient Selector

Recipients are resolved from the **selected table's fields** filtered to `type === 'email'` or
`type === 'user'` (panel.tsx:174–178). The selector is a single `DropdownMenu` that remains
`disabled` until a table is chosen (panel.tsx:1053). When the table has no qualifying fields, a
disabled `DropdownMenuItem` with explanatory text is shown (panel.tsx:1062–1065).

Selection is multi-select with checkmarks, stored as `RecipientField[]`
(panel.tsx:69–75) — an array of `{ tableId, tableName, fieldId, fieldLabel }` objects.
Selected values are summarized as a comma-joined string in the trigger button label
(`recipientSummary`, panel.tsx:943–946).

There are no inline badge chips in the recipient selector (unlike the trigger field picker).
The UX is a plain multi-select combobox with a summary label — not a chip-input pattern.

A `checkPermissions` `<Checkbox>` below the dropdown (panel.tsx:1087–1103) adds a
permission-check flag to the config with no further UX branching.

**Production gap**: `handleSaveNotification` maps only `recipientFields[0]` to the saved
`RecipientConfig` (page.tsx:635–638). Multi-selection is captured in config state but lost at
serialization. Engineering needs to decide the recipient model before this is wired to an API.

---

## 4. Channel Selection

Channel is **not a field in the config panel**. The `EmailNotification.type` property
(`'email' | 'in-app' | 'sms'`, page.tsx:133) exists in the list data model and drives the
icon/badge color in the table (page.tsx:143–153), but the creation dialog always produces
`type: 'email'` (page.tsx:658). There is no channel picker in `NotificationConfigPanel`.

The TemplateEditor page is the destination for both "New notification" and every edit path
(page.tsx:566–568, 940–942), so channel selection and template editing are downstream of the
config panel in the prototype flow. The preview dialog (`TemplatePreviewDialog`,
page.tsx:1491–1622) renders a static template body keyed by `notification.id` and highlights
`{{variable}}` tokens inline. It does not sync with config panel state — it is a read-only
preview of pre-authored template content, not a live preview driven by form values.

---

## 5. Preview Pattern

There is no live preview inside the config panel. The `TemplatePreviewDialog` (page.tsx:1480)
operates in two independent modes:

- **Template mode** — opened from the carousel "View" button; shows static `templateContent`
  (page.tsx:346–528) for the selected template ID.
- **Notification mode** — opened from the table row Eye icon; maps `notification.templateId`
  through a lookup table to a template ID (page.tsx:690–709), then shows the same static
  content.

Variable tokens render as highlighted `<span>` chips via `renderWithVariables`
(page.tsx:1506–1519), but their values are not interpolated — they display the raw token name.
There is no connection between `NotificationConfig` state and the preview dialog content.

---

## 6. Save / Publish Flow

Save is **pessimistic by design in the prototype** — no optimistic update, no loading state,
no toast. `handleSaveNotification` (page.tsx:618–675) runs synchronously:

1. Reads `dialogConfigRef.current` (written by `NotificationConfigPanel.onChange`).
2. Validates `name` and `tableId`; returns early silently if either is missing.
3. Constructs a new `EmailNotification` with `status: 'draft'` and `lastSent: null`.
4. Calls `setEmailNotifications(prev => [...prev, newNotif])`.
5. Closes the dialog.

There is no dirty-state warning on navigation away from an in-progress form. The Dialog
`onOpenChange` handler (page.tsx:677–681) clears `dialogConfigRef` on close — any uncommitted
changes are lost without prompt. The table kebab menu has Activate/Deactivate toggle
(page.tsx:604–612) and Delete (page.tsx:614–616), both instant without confirmation.

---

## 7. Accessibility

**What is implemented:**

- Trigger cards use `role="checkbox"`, `aria-checked`, `tabIndex={0}`, and `onKeyDown`
  Space/Enter (panel.tsx:526–534, 710–719).
- The AND/OR segmented switch uses `role="radiogroup"` on the container and `role="radio"` +
  `aria-checked` on each button (panel.tsx:354–377, 596–631).
- Remove buttons on trigger field badges have `aria-label="Remove {label}"`
  (panel.tsx:663).
- Condition leaf delete button has `aria-label="Remove condition"` (panel.tsx:314–319);
  group delete has `aria-label="Remove group"` (panel.tsx:379–386).
- `<Label>` components are used throughout and associated via `htmlFor`/`id` on checkboxes
  (panel.tsx:1089–1097).
- Disabled "Specific fields" and conditions buttons show `<Tooltip>` with explanatory copy
  (panel.tsx:612–630, 1155–1176).

**What is missing / gaps for production:**

- No `aria-live` region for save state or error feedback. Silent failures (name or table
  missing at save) provide no accessible announcement.
- `<Input>` for Name has no `required` attribute, no `aria-required`, and no `aria-describedby`
  pointing to an error message (panel.tsx:998–1004).
- The `<Textarea>` for Description and the `<DropdownMenu>` for Table/Recipients have no
  error state markup.
- Condition rows do not associate their three dropdowns and input with a group label
  (`role="group"` + `aria-label`).
- The carousel uses `<div>` cards with hover-triggered action overlays — no keyboard focus
  management on the overlay buttons (page.tsx:1412–1473).

---

## 8. Motion

All animations respect `useReducedMotion()` from Framer Motion (panel.tsx:457).

| Trigger | Implementation | Reduced motion |
|---------|----------------|----------------|
| Trigger card expand/collapse | `AnimatePresence` + `motion.div` with `height: 0 → auto, opacity: 0 → 1`; `duration: 0.2`, `ease: [0.4, 0, 0.2, 1]` (panel.tsx:433–436, 560–569) | `variants={prefersReducedMotion ? undefined : expandVariants}` makes transition instant |
| Segmented switch thumb | CSS `translateX(0) → translateX(100%)` via inline `style` (panel.tsx:357, 599) | CSS `prefers-reduced-motion` block sets `transition-duration: 0.01ms !important` per handoff |
| Trigger check circle | CSS background-color transition on `.notifConfig__triggerCheck--checked` | Same CSS block |
| Filter bar appear | `motion.div` with `opacity: 0 → 1, height: 0 → auto, duration: 0.15` (page.tsx:950–956) | Not explicitly guarded in JS; relies on CSS media query |
| Filter chip enter/exit | `motion.button` with `opacity/scale 0.9 → 1` (page.tsx:961–972) | Same as above |
| Table row enter/exit | `AnimatePresence mode="popLayout"` + `opacity/y` (page.tsx:999–1011) | Not guarded |
| Carousel nav buttons | `motion.button` with `opacity/x` slide (page.tsx:1358–1382) | Not guarded |

---

## 9. Production-Port Concerns

**Rule versioning.** The saved `NotificationConfig` has no version field. If the condition tree
schema or trigger encoding format changes, existing saved rules will be unreadable without a
migration layer. Production needs a `schemaVersion` on `NotificationConfig` or a dedicated API
type separate from the UI model.

**Trigger encoding brittleness.** The `+` / `.` / `,` delimited encoding
(`record-event.added,modified+recurring-schedule.weekly`, page.tsx:624–630) is a
presentation-layer serialization, not a real API contract. Production should represent triggers
as a typed array of trigger objects rather than parsing a string.

**Test-before-enable.** There is no "Send test" flow. `onTestSend` exists as a prop on
`NotificationConfigPanelProps` (panel.tsx:98) but is wired to nothing in the prototype.
Production needs a test dispatch endpoint and a success/failure feedback path before a rule
can be activated.

**Idempotency of triggers.** The prototype fires no real events, so duplicate sends are not
modeled. Production must handle cases where a record event fires while a previous dispatch is
in-flight (e.g., rapid record modifications) and where a scheduled digest run overlaps with
the prior one if the job is slow.

**Recipient mapping.** As noted in section 3, only `recipientFields[0]` is persisted at save
(page.tsx:635). Multi-recipient fan-out (multiple email fields, user fields, or role-based
expansion) is not modeled. The `RecipientConfig` type on `EmailNotification`
(page.tsx:122–125) supports only a single `rule` + optional `specificRole` string — this type
needs to be expanded or replaced with a proper recipient list before the feature ships.

**No pagination or virtualization.** The notifications table renders all `MOCK_EMAIL_NOTIFICATIONS`
(page.tsx:230–329) directly — no virtualization, no pagination, no cursor. At scale this will
need either server-side pagination or a windowed list.

**Condition tree completeness.** Leaves with empty `field`, `operator`, or `value` are not
blocked at save (handoff edge case #2). Production needs leaf validation before the rule is
persisted or activated.
