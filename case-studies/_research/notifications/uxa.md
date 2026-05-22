# Notification Builder — UX Architecture Analysis

**Date**: 2026-04-22
**Files reviewed**: NotificationsPage.tsx, NotificationsPage.css, NotificationConfigPanel.tsx, NotificationConfigPanel.css, docs/diagrams/notification-settings-flow.md, docs/handoffs/notification-settings-panel.md

---

## 1. Page IA

The page uses a **single-pane list** pattern, not a list/detail split. There is no persistent sidebar of notifications — the full-width layout shows a template carousel at top, a filter/search toolbar, then the data table beneath. Editing opens either a Dialog (create) or navigates to TemplateEditor (edit/view).

Navigation pattern:
- Entry: sidebar → Notifications (single route, no sub-navigation)
- Create: toolbar "New email notification" button → Dialog containing NotificationConfigPanel
- Edit: row click → TemplateEditor page (full navigation, not inline)
- Preview: Eye icon → Dialog (read-only)

The decision to navigate away for edit rather than opening an in-page panel means the list and editor are never visible simultaneously. For a tool where admins frequently compare or audit multiple notifications, this is an architectural constraint worth revisiting. A right-panel drawer or side-by-side split would let users keep list context while editing. The current pattern favors simplicity over power-user density.

The template carousel above the table mixes two distinct contexts — "start fresh from a template" and "manage existing notifications" — on the same page without a visual separator strong enough to signal the mode shift. The `notifications-section` gap provides spacing, but no heading hierarchy makes the carousel feel subordinate to the table rather than a parallel entry point.

---

## 2. Panel IA — Section Order

Current order in NotificationConfigPanel.tsx (lines 994–1178):
1. Name (required)
2. Description
3. Table (required, gates everything downstream)
4. Separator
5. Recipients + Check permissions checkbox
6. Separator
7. Trigger (2 cards: record event + schedule)
8. Conditions (recursive tree)

This order has a meaningful dependency chain: Table gates Recipients, Recipients informs Trigger field scope, Trigger context informs Conditions. The "Table first" gate is architecturally sound and matches the handoff spec.

The ordering concern is **Recipients before Trigger**. Recipients answers "who gets this" while Trigger answers "when does it fire." In most mental models for notification builders (SendGrid, Klaviyo, Quickbase's own rule interfaces), trigger comes before recipients because the trigger establishes the data context that makes recipient logic meaningful. The current order requires the user to answer an audience question before they've finished defining the event that causes the send.

Recommended order:
1. Name
2. Description
3. Table (gate)
4. Trigger (what fires it — establishes context)
5. Conditions (filters on that trigger)
6. Recipients (who receives it — now informed by trigger context)
7. Permissions checkbox (modifier of recipients)

Channel (Email / In-App / SMS) and Content sections are absent from the panel. NotificationsPage.tsx:143–148 shows the `EmailNotification` type carries a `type: 'email' | 'in-app' | 'sms'` field, but the panel only handles email. Channel and Content selection live in TemplateEditor. This creates a split architecture where the panel handles routing/audience logic and TemplateEditor handles channel/content — reasonable as a separation of concerns but not communicated to the user at creation time.

---

## 3. Form Layout

The panel uses **full-width stacked fields** throughout. Labels sit above inputs (`notifConfig__field` is `flex-direction: column`, gap `--spacing-xs`). This is the correct choice for a narrow dialog context (max-width 520px per `notifications-dialog`).

Field grouping observations:
- Name + Description are implicitly grouped at top but have no visual group container — they share the same `gap: var(--spacing-lg)` as all other fields. Adding a subtle section header or slightly tighter gap between Name/Description and the Table selector would make the "identity" group distinct from the "configuration" group.
- The trigger cards use a custom card-select pattern (role="checkbox", expandable body) rather than native form inputs. This works visually but the interactive surface is the entire card, which creates an accidental-click risk when users intend to interact with the nested sub-options (checkboxes, dropdowns) inside the expanded card.
- The Conditions section is visually naked — no containing card, no section heading with a background — while the Trigger cards have a bordered card treatment. The conditions tree floats in the same vertical flow as named form fields, making its recursive depth hard to predict for users on first encounter.
- The schedule grid (`notifConfig__scheduleGrid`, line 353) is the only two-column block. It reads well at 520px but the dynamic column count (2-col when daily, 3-col otherwise, line 756 in .tsx) is a layout shift that could be disorienting. Fixed 3-column with the Day column conditionally hidden via `display: none` would be spatially more stable.

---

## 4. Token Compliance

**NotificationConfigPanel.css**

| File:Line | Issue |
|-----------|-------|
| `NotificationConfigPanel.css:263` | `color: #fff` — hardcoded white on checked trigger circle. Should be `var(--color-text-inverse)`. |
| `NotificationConfigPanel.css:82` | `var(--color-border)` — this token does not exist in `src/tokens/tokens.css`. The defined tokens are `--color-border-light`, `--color-border-medium`, `--color-border-divider`. This is a silent failure; the hover border-color on `.notifConfig__select:hover` resolves to nothing. Flagged in handoff (issue #1) but not fixed. Same at lines 184 and 193 on `.notifConfig__triggerCard:hover` and `.notifConfig__triggerCard--active:hover`. |
| `NotificationConfigPanel.css:252` | `border: 1.5px solid var(--color-border)` on `.notifConfig__triggerCheck` — same undefined token plus a hardcoded border-width (no border-width token exists, so 1.5px is defensible, but combine with the undefined token and the border renders invisible on hover). |
| `NotificationConfigPanel.css:375` | `transition-duration: 0.01ms !important` — acceptable reduced-motion pattern but not using a motion token. The project has `--motion-duration-*` tokens; a `--motion-duration-instant: 0.01ms` token would be more consistent. |
| `NotificationConfigPanel.css:397, 420, 429, 430` | `height: 1.75rem`, `width: 1.75rem` — hardcoded sizes for condition row elements. No spacing token maps to this value. These are intentional compact sizing choices but should be documented as a local design decision rather than treated as tokens. |
| `NotificationConfigPanel.css:506` | `letter-spacing: 0.04em` on `.notifConfig__segSwitchBtn` — no letter-spacing token in the system. |

**NotificationsPage.css**

| File:Line | Issue |
|-----------|-------|
| `NotificationsPage.css:569, 578` | `font-size: 0.6875rem` (11px) on table header labels — below `--font-size-xs` (0.75rem). No token maps to 0.6875rem. This is a styling choice to keep table headers visually subordinate, but it lives outside the type scale. |
| `NotificationsPage.css:573, 582` | `letter-spacing: 0.3px` on table header — hardcoded, no token. |
| `NotificationsPage.css:314` | `padding: 2px 10px` on `.template-preview-dialog__badge` — mixed: 2px is not a spacing token value (tokens go xs=0.25rem, sm=0.5rem), 10px is also off-scale. The badge at `NotificationsPage.css:197` has `padding: 2px var(--spacing-sm-plus)` which is closer to correct. |
| `NotificationsPage.css:1103–1124` | `:root` block redefines all 10 accent color tokens with hardcoded hex + rgba values. These are labeled as "fallbacks if not defined." This is a significant compliance risk — if `src/tokens/tokens.css` defines these differently (especially for dark mode), the `:root` block here will shadow the canonical values for light mode. The dark mode overrides in `NotificationsPage.css:1130–1226` use `var()` correctly, but the light-mode base layer is fully hardcoded. |
| `NotificationsPage.css:1143` | `background: rgba(0, 0, 0, 0.5)` on `.dark .notification-card__overlay` — hardcoded dark overlay. Could be `var(--color-overlay)` or `var(--color-bg-scrim)` if those exist, otherwise warrants a new token. |

---

## 5. Motion

The expand/collapse on trigger cards uses `AnimatePresence` with `height: 0 → auto` and `opacity: 0 → 1` at `duration: 0.2` (NotificationConfigPanel.tsx:560–701). The duration is hardcoded inline rather than using a `--motion-duration-*` token — minor violation but consistent with the handoff note that this was intentional.

The `expandVariants` object (NotificationConfigPanel.tsx:433–436) correctly handles reduced motion by setting `variants={prefersReducedMotion ? undefined : expandVariants}`, which causes Framer Motion to skip the animation entirely and mount/unmount instantly. This is the correct pattern.

The segmented switch thumb uses CSS `transition: transform var(--motion-duration-normal) var(--motion-ease-emphasized)` (line 487) — token-compliant. The reduced-motion CSS block at line 368–377 overrides this with `transition-duration: 0.01ms !important`, covering all transition-based elements in the panel.

One gap: the trigger card border-color and background-color transitions (lines 178–181) respond to the active state toggle but have no AnimatePresence wrapper — the checkmark icon inside `.notifConfig__triggerCheck--checked` appears/disappears instantly. Adding an `AnimatePresence` with a fast scale or opacity variant on the checkmark would polish the activation moment.

Filter chip appearance uses `motion.button` with `scale: 0.9 → 1` and `opacity: 0 → 1` at `duration: 0.1` (NotificationsPage.tsx:961–968). The transition duration is hardcoded rather than using `--motion-duration-fast`. The filter bar itself uses `height: 0 → auto` at `duration: 0.15` (line 956) — also hardcoded.

---

## 6. Dark Mode

The panel CSS has no `.dark` overrides — it relies entirely on CSS custom properties that update via the `.dark` class on `<html>`. This is the correct pattern per CLAUDE.md.

The issue is the `:root` accent color block in `NotificationsPage.css:1103–1124`. Those tokens define light-mode values at the `:root` level. When `.dark` is applied, the dark token overrides in `src/tokens/tokens.css` would need to re-define the same names to take precedence. If `tokens.css` does not redefine these accent colors under `.dark`, the hardcoded light-mode hex values persist in dark mode. The badge backgrounds (`rgba(3, 105, 161, 0.1)` etc.) would show light-mode blue tints in dark mode regardless of theme, failing contrast requirements.

The `.dark .notification-card__overlay` override correctly uses a hardcoded dark scrim (`rgba(0, 0, 0, 0.5)`) rather than the same `var(--color-bg-hover)` used in light mode — this is the right call given that blur overlays need an absolute dark value, but it should be documented as an intentional exception.

Input and select styling in the panel (`notifConfig__select`, `notifConfig__conditionInput`) inherits `var(--color-bg-input)` and `var(--color-border-light)` which both have dark mode overrides in `tokens.css`. These will adapt correctly. No contrast issues found in the input styling itself.

---

## 7. Reuse Potential

The condition tree (`ConditionGroupRenderer`, `ConditionLeafRenderer`, the `ConditionGroup`/`ConditionLeaf` types) is the strongest reuse candidate. It is a generic recursive AND/OR predicate builder with field/operator/value leaves and nested groups. The only notification-specific coupling is that `fields: QuickbaseField[]` is sourced from `getFieldsForTable()` — replace the field source and the component works for any entity. The segmented switch (`notifConfig__segSwitch`) is also fully generic.

The `TriggerSection` is notification-specific in its card copy and the record-event/schedule duality, but the card-with-expandable-body pattern (`notifConfig__triggerCard`, `notifConfig__triggerCardBody`) is reusable as a selectable-card primitive.

The recipient picker (multi-select dropdown with checkmarks, scoped to email/user field types) is tightly coupled to Quickbase field semantics. For a generic rule builder it would need a `getRecipientOptions()` prop rather than the hardcoded `getRecipientFieldOptions(tableId)` call (NotificationConfigPanel.tsx:174–178).

---

## 8. System Fit

NotificationConfigPanel is currently **email-notification-specific in its framing but generic in its mechanics**. The panel name, copy annotations (`@copy Config / Trigger / Label`), and the hardcoded email/user field type filter in `getRecipientFieldOptions` tie it to email notifications. But the underlying data model — table selection, condition tree, trigger type selection — is architecturally identical to what an audit rule builder or approval rule builder would need.

An audit rule builder would need: table selection, trigger (record event), conditions (which fields changed, to what value), and action (write to audit log). That maps exactly onto this panel with a different "action" section replacing "recipients."

An approval rule builder would need: table selection, conditions (who submitted, what field values), trigger (record added/modified), and routing (approver field). Again structurally identical.

The panel could become a `RuleConfigPanel` with an `intent: 'notification' | 'audit' | 'approval'` prop that swaps the recipients/action section and adjusts copy, while keeping the table/trigger/condition core constant. As implemented it is email-notification-scoped, but the architecture is one abstraction step away from a system-wide rule engine.

---

## Flags Summary

| Priority | Location | Issue |
|----------|----------|-------|
| High | `NotificationConfigPanel.css:82, 184, 193, 252` | `var(--color-border)` token does not exist — hover and active border states silently fail |
| High | `NotificationsPage.css:1103–1124` | `:root` block redefines all accent tokens with hardcoded hex, shadowing canonical token values in light mode and not adapting in dark mode |
| Medium | `NotificationConfigPanel.css:263` | `color: #fff` should be `var(--color-text-inverse)` |
| Medium | `NotificationsPage.css:1143` | `rgba(0, 0, 0, 0.5)` on dark overlay — document as intentional or extract to a scrim token |
| Low | `NotificationsPage.css:569, 578` | `font-size: 0.6875rem` is below the type scale floor (`--font-size-xs`) |
| Low | `NotificationsPage.css:573, 582` | `letter-spacing: 0.3px` — no token |
| Low | `NotificationsPage.css:314` | `padding: 2px 10px` — mixed token/non-token shorthand on badge |
| Low | `NotificationConfigPanel.css:506` | `letter-spacing: 0.04em` on segmented switch — no token |
| Low | Panel form order | Recipients before Trigger inverts the natural mental model; consider reordering to Trigger → Conditions → Recipients |
