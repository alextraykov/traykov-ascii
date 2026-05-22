# Notification Builder Codebase Inventory

**Case Study**: Notifications thematic  
**Date**: 2026-04-22  
**Scope**: Form builder + config panel for email notification rules  

---

## 1. NotificationsPage — Route & Structure

**File**: `/Users/atraykov/vibe-design/src/pages/NotificationsPage/NotificationsPage.tsx` (lines 1–1625)

**Route**: `#notifications` (managed via hash history in state)

**Structure**:
- `PageLayout` wrapper with sidebar navigation
- Two views: **empty state** and **filled view** (toggle via hash)
- **Empty state**: Shows `EmptyState` with CTAs "New email notification" and "Build with AI"
- **Filled view** (lines 839–1180):
  1. **Header** — "Email notifications" title + subtitle
  2. **Template carousel** — 12 pre-built email template cards (welcome, order confirmation, invoice, etc.)
  3. **Toolbar** — Search input, filter button, count badge, "New" button
  4. **Inline filter chips** — Motion-animated removable badges when filters active
  5. **Data table** — Rows with: Name, Status badge, Audience tag, Trigger (category + detail), Last sent, Actions (eye + kebab menu)
  6. **Dialog: Create Notification** — Embeds `NotificationConfigPanel` inside a modal
  7. **Dialog: Template Preview** — Shows template content, email fields, variables (dual mode: template or notification)

**Key Props** (lines 535–539):
```typescript
export interface NotificationsPageProps {
  onNavigate: (page: NavigationPage) => void;
  isSidebarExpanded: boolean;
  onSidebarExpandedChange: (expanded: boolean) => void;
}
```

**State Management** (lines 546–563):
- Mock data: `MOCK_EMAIL_NOTIFICATIONS` (7 sample rules, lines 230–329)
- Filters: `filterStatuses`, `filterTriggers`, `filterRecipients` (all `Set<string>`)
- Dialog control: `isCreateNotificationOpen`, `dialogConfigRef` (holds `NotificationConfig`)
- Search & UI: `searchQuery`, `isFocused`, `showEmpty`, preview state

**Event Handlers** (lines 565–675):
- `handleNewNotification()` — navigates to TemplateEditor
- `handleSaveNotification()` — encodes triggers, creates EmailNotification, adds to table
- Filter toggles: `toggleFilterStatus()`, `toggleFilterTrigger()`, `toggleFilterRecipient()`
- Table actions: `handleToggleNotificationStatus()`, `handleDeleteNotification()`, `handlePreviewNotification()`

**Type Definitions** (lines 77–171):
- `EmailNotification` (lines 128–141) — id, name, type, description, dates, status, recipientConfig, triggerEvent, templateId, fields
- `RecipientConfig` (lines 123–126) — rule ('all-users' | 'admins' | 'record-owner' | 'specific-role' | 'none') + optional specificRole
- `NotificationPreview` (lines 77–83) — for carousel templates

---

## 2. NotificationConfigPanel — The Builder Core

**File**: `/Users/atraykov/vibe-design/src/components/composite/NotificationConfigPanel/NotificationConfigPanel.tsx` (lines 1–1183)

**Purpose**: Interactive form for creating/editing notification rules. Used inside the "New notification" dialog.

**Props** (lines 95–100):
```typescript
export interface NotificationConfigPanelProps {
  initialConfig?: Partial<NotificationConfig>;
  onChange?: (config: NotificationConfig) => void;
  onTestSend?: () => void;
  className?: string;
}
```

**Form Sections** (vertical flow):

1. **Name** (lines 994–1005)
   - Label "Name" (required)
   - `<Input>` with placeholder
   - State: `config.name`

2. **Description** (lines 1007–1018)
   - Label "Description"
   - `<Textarea>` 2 rows
   - State: `config.description`

3. **Table Selection** (lines 1020–1043)
   - Label "Table" (required)
   - Dropdown (enabled/disabled based on table list)
   - Gates all downstream fields
   - Handler: `handleTableChange()` (lines 891–899) — resets recipients, trigger fields, conditions

4. **Recipients** (lines 1047–1084)
   - Multi-select dropdown (email/user fields from selected table)
   - Disabled if no table
   - Maps to `config.recipientFields: RecipientField[]`

5. **Check Permissions** (lines 1086–1103)
   - Checkbox with hint text
   - State: `config.checkPermissions: boolean` (default `true`)

6. **Trigger** (lines 1107–1127)
   - Delegate to `<TriggerSection>` sub-component
   - Two cards: "When a record changes" + "On a schedule"
   - Both can be active; minimum 1 enforced

7. **Conditions** (lines 1130–1178)
   - Recursive `<ConditionGroupRenderer>` if table selected
   - Disabled buttons + tooltip if no table
   - State: `config.conditionTree: ConditionGroup` (tree structure)

**State & Config** (lines 77–93):
```typescript
export interface NotificationConfig {
  name: string;
  description: string;
  tableId: string;
  sendOptions: SendOption[];  // ['record-event'] | ['recurring-schedule'] | both
  recordEvents: RecordEvent[];  // ['added', 'modified', 'deleted'] — min 1
  triggerFieldsMode: TriggerFieldsMode;  // 'all' | 'specific'
  triggerFieldIds: string[];  // IDs when 'specific'
  recipientFields: RecipientField[];  // selected email/user fields
  checkPermissions: boolean;
  conditionTree: ConditionGroup;  // recursive tree
  frequency: string;  // 'daily' | 'weekly' | 'monthly'
  day: string;  // 'monday' | 'tuesday' | ... (hidden when daily)
  time: string;  // '06:00' | '09:00' | ... (5 slots)
}
```

**Default State** (lines 128–142):
```typescript
const DEFAULT_CONFIG = {
  name: '', description: '', tableId: '',
  sendOptions: ['record-event'],
  recordEvents: ['added'],
  triggerFieldsMode: 'all',
  triggerFieldIds: [],
  recipientFields: [],
  checkPermissions: true,
  conditionTree: emptyGroup(),
  frequency: 'weekly', day: 'monday', time: '09:00',
};
```

---

## 3. TriggerSection — Dual Trigger Cards

**Component**: Nested inside NotificationConfigPanel (lines 438–851)

**Structure**: Two clickable cards with expand/collapse for sub-options.

### Record Event Card (lines 519–702)
- **Checkbox role**, toggle via click
- Header: Zap icon + "When a record changes" title + description
- **Sub-options** (expand when active):
  - **Events**: Checkboxes for Added/Modified/Deleted (min 1 checked)
  - **Field changes**: Segmented switch ("All fields" / "Specific fields")
    - If "Specific fields": multi-select dropdown with badges + overflow counter (lines 639–695)
    - Overflow handler: ResizeObserver measures visible badges (lines 479–513)

### Schedule Card (lines 704–848)
- **Checkbox role**, toggle via click
- Header: Calendar icon + "On a schedule" title + description
- **Sub-options** (expand when active):
  - **Frequency**: Dropdown (Daily/Weekly/Monthly)
  - **Day**: Dropdown (Mon–Fri, hidden when Daily)
  - **Time**: Dropdown (06:00, 09:00, 12:00, 15:00, 18:00)
  - **Grid layout**: Dynamic 2-col (daily) or 3-col (weekly/monthly)

**Animation** (lines 433–436):
```typescript
const expandVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: 'auto', opacity: 1 },
};
// Transition: duration 0.2s, ease [0.4, 0, 0.2, 1]
// Reduced motion: variants set to undefined (instant)
```

---

## 4. Condition Tree — Recursive Builder

**Components**: `ConditionGroupRenderer` (lines 340–427) + `ConditionLeafRenderer` (lines 247–323)

**Architecture**:
- Root is a `ConditionGroup` with `logic: 'and'`
- Each `ConditionGroup` has children array containing leaves and/or nested groups
- Recursive rendering: groups render themselves, leaves render as rows

**Condition Leaf** (lines 51–57):
```typescript
export interface ConditionLeaf {
  kind: 'leaf';
  id: string;
  field: string;      // field label (dropdown)
  operator: string;   // 'equals' | 'not-equals' | 'contains' | 'is-empty'
  value: string;      // input text (hidden when operator is 'is-empty')
}
```

**Condition Group** (lines 60–65):
```typescript
export interface ConditionGroup {
  kind: 'group';
  id: string;
  logic: 'and' | 'or';
  children: ConditionNode[];
}
```

**Leaf Renderer** (lines 247–323):
- Field dropdown (from table fields)
- Operator dropdown (lines 144–149)
- Value input (conditional on operator)
- Delete button (Trash icon)
- All elements forced to `height: 1.75rem`

**Group Renderer** (lines 340–427):
- AND/OR segmented switch (two-segment CSS pattern with thumb)
- Recursive render of children (leaves + nested groups)
- "Add condition" + "Add group" buttons
- Delete button (only on nested groups, not root)
- Progressive background color based on nesting depth

**Tree Mutation** (lines 191–234):
- `updateNodeInTree()` — recursive immutable update by node ID
- `removeNodeFromTree()` — recursive delete by node ID
- `addChildToGroup()` — recursive add child to group

**Handlers** (lines 948–990):
- `handleToggleLogic()` — flip AND ↔ OR
- `handleAddLeaf()` — add empty leaf to group
- `handleAddGroup()` — add nested group with one empty leaf
- `handleUpdateLeaf()` — update leaf field/operator/value
- `handleRemoveNode()` — remove leaf or group

---

## 5. Form Primitives — UI Components Used

**Location**: `src/components/ui/`

**Imported Components**:
- `<Input>` — text input
- `<Label>` — form label (supports `required` prop)
- `<Textarea>` — multi-line text
- `<Checkbox>` — checkbox input
- `<Separator>` — visual divider
- `<Button>` — button (variants: primary, secondary, ghost; sizes: default, sm, icon)
- `<Tooltip>` — hover tooltip
- `<DropdownMenu>` — custom menu with items + checkboxes
- `<Dialog>` — modal dialog wrapper (DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose)

**Special Controls**:
- **Segmented switch** — custom CSS (`.notifConfig__segSwitch` + `.notifConfig__segSwitchThumb`)
- **Field badges** — inline pills with remove button (lines 649–671)
- **Condition rows** — 4 inline elements in flex row

---

## 6. Read-Only vs. Editable Patterns

**Current State** (as of handoff):
- **New rule**: Config panel in dialog, `onChange` callback, save creates `EmailNotification` and adds to table
- **Edit existing rule**: Clicking row or "Edit" menu item navigates to `TemplateEditor` page (not config panel)
- **No edit-in-place**: Config panel only used for creation

**Handler Logic**:
- Page manages `emailNotifications` array state (lines 556)
- `handleSaveNotification()` (lines 618–675) reads from `dialogConfigRef.current` and builds new object
- Trigger encoding (lines 624–630):
  ```typescript
  // Example: record-event.added+recurring-schedule.weekly
  const parts: string[] = [];
  if (cfg.sendOptions?.includes('record-event')) {
    parts.push(`record-event.${cfg.recordEvents.join(',')}`);
  }
  if (cfg.sendOptions?.includes('recurring-schedule')) {
    parts.push(`recurring-schedule.${cfg.frequency}`);
  }
  const triggerEvent = parts.join('+') || 'record-event.added';
  ```

---

## 7. Documentation Inventory

### 7.1 `/docs/diagrams/notification-settings-flow.md` (353 lines)

**Coverage**:
- Entry point flowchart
- Page layout (carousel + toolbar + table + empty state)
- Table row actions (click, eye icon, kebab menu)
- Filter bar (4 categories: Status, Channel, Trigger, Audience)
- Create notification flow (dialog → config panel → save)
- Config panel form layout (vertical sections)
- Trigger section structure (both cards, sub-options)
- Condition tree (recursive, AND/OR, nesting depth)
- Recipients flow (table dependency, field loading)
- Save flow & trigger encoding
- Preview dialog (dual mode: template vs. notification)
- Table columns (Name, Status, Audience, Trigger, Last sent, Actions)
- Default templates (12 types with colors)
- Edge cases (10 scenarios: blocked actions, cascading resets, disabled states, reduced motion)
- Implementation status table (37 features, all marked ✅)
- Component mapping (section → component → file)

**Key Diagram Features**:
- Mermaid flowcharts for all major flows
- Table specs with widths and content
- Edge case numbering (referencing code behavior)

### 7.2 `/docs/handoffs/notification-settings-panel.md` (160 lines)

**Coverage**:
- "What Changed" table (component, change in engineering terms)
- State & Props map (NotificationConfigPanel props, NotificationConfig fields, exported types)
- Flows & Diagrams (links to flow diagrams)
- Animations table (4 triggers: expand/collapse, switch thumb, check circle, badge remove)
- Tokens used (colors, spacing, typography, radii)
- Edge cases & open questions (5 issues: missing token, validation, multi-recipient, deprecated field, edit flow)
- File index (4 files: panel TSX, panel CSS, page TSX, CSS adjustments)

**Specific Technical Details**:
- `sendOption` (singular, deprecated) vs. `sendOptions` (array)
- Trigger encoding examples
- Table change cascade (what gets reset)
- Design tokens: `--color-bg-popover`, `--color-bg-surface`, `--color-accent-primary`, etc.
- Dark mode: via `.dark` class on `<html>`

### 7.3 `/docs/previews/notification-settings-panel.md` (106 lines)

**Coverage**:
- What to look at (5 features: trigger cards, record events, schedule, conditions, recipients)
- Direct links (page URL, states to test)
- States to test (5 scenarios: no table, table selected, both triggers, daily schedule, nested conditions)
- Copy inventory (44 rows: element, exact copy text)
- Feedback section (how to give feedback, key questions for review)

**Test Scenarios**:
1. No table selected — Recipients disabled, Specific fields switch disabled, conditions hint
2. Table selected — All fields unlock
3. Both triggers active — Expand both simultaneously
4. Daily schedule — Day picker disappears
5. Nested conditions — Add OR sub-group inside AND root
6. Dark mode — Toggle `.dark` on `<html>`

---

## 8. Relationship to Email Templates

**File**: `/Users/atraykov/vibe-design/src/components/composite/TemplateEditor/TemplateEditor.tsx` (47,268 bytes, not fully read)

**Navigation**:
- NotificationsPage lines 566–567: "New notification" button → navigates to `TemplateEditor`
- Page carousel (lines 843–846): Template card "Use template" → navigates to `TemplateEditor`
- Row click (line 1013): Table row → navigates to `TemplateEditor`
- Kebab menu (line 1130): "Edit" → navigates to `TemplateEditor`

**Template Preview Dialog** (lines 1480–1622):
- Shows static template content by ID (lines 346–529)
- Maps template ID to content (email fields, body blocks, variables)
- Renders from `templateContent` object (12 templates: welcome, password-reset, order-confirmation, invoice, etc.)
- Two modes (lines 1486):
  - `'template'` — carousel preview, CTA "Use template"
  - `'notification'` — existing rule preview, CTA "Edit notification"

**NotificationConfig → TemplateEditor Link**:
- Page stores template relationship via `notification.templateId` (UUID) and `notification.templateName` (display name)
- Config panel **does not** select a template
- Save handler encodes trigger events but leaves `templateId: null` and `templateName: null` (lines 667–668)
- **Design implication**: Users create rules first, then navigate to TemplateEditor to pick/build an email template for that rule

**Template Content Structure** (lines 335–344):
```typescript
interface TemplateContent {
  from: string;  // e.g., "{{company_name}} <hello@{{company_domain}}>"
  replyTo: string;
  subject: string;
  body: Array<{ type: 'paragraph' | 'heading' | 'list'; content: string | string[] }>;
  variables: string[];
}
```

---

## 9. Summary Table: Files & Responsibilities

| File | Lines | Responsibility |
|------|-------|-----------------|
| `NotificationsPage.tsx` | 1–1625 | Page layout, table, filters, carousel, dialogs, mock data |
| `NotificationConfigPanel.tsx` | 1–1183 | Form builder, all config sections, recursive conditions, triggers |
| `NotificationConfigPanel.css` | (linked) | Scoped styles: triggers, conditions, segmented switch, badges |
| `notification-settings-flow.md` | 1–353 | Complete flow diagrams, specs, implementation status |
| `notification-settings-panel.md` | 1–160 | Handoff details, tokens, animations, edge cases |
| `notification-settings-panel.md` | 1–106 | Preview brief, test scenarios, copy inventory |

---

## 10. Key Design Patterns

1. **Table-gated form** — Table selection unlocks recipients, trigger fields, conditions
2. **Dual trigger cards** — Both record-event and recurring-schedule can be active; min 1 enforced
3. **Recursive condition builder** — Leaf rows + group containers with AND/OR logic
4. **Badge overflow** — ResizeObserver measures visible badges, renders "+N" counter
5. **Progressive nesting** — Condition groups have progressively darker backgrounds via `color-mix()`
6. **Segmented switch** — Custom CSS with CSS `transform: translateX()` thumb animation
7. **Reduced motion** — Framer Motion variants set to `undefined` when `prefers-reduced-motion`
8. **Trigger encoding** — Multi-select state → delimited string for backend (e.g., `record-event.added,modified+recurring-schedule.weekly`)

---

## 11. Open Questions (from handoff)

1. **Missing token** (line 142 in handoff): `.notifConfig__triggerCard:hover` references `var(--color-border)` which doesn't exist. Should be `--color-border-medium` or `--color-border-light`.

2. **Condition validation** — No check that all leaves are complete (field + operator + value) before save.

3. **Multi-recipient mapping** — Config panel captures all `recipientFields[]`, but save handler uses only `first` field (line 636):
   ```typescript
   let recipientConfig: RecipientConfig;
   if (cfg.recipientFields && cfg.recipientFields.length > 0) {
     const first = cfg.recipientFields[0];  // ← only first
     recipientConfig = { rule: 'specific-role', specificRole: first.fieldLabel };
   }
   ```

4. **Edit existing notifications** — Config panel only handles creation. Edit navigates to TemplateEditor, not back to config panel.

---

## 12. References in Codebase

**Import paths**:
- `@/components/composite/NotificationConfigPanel` — exported from index.ts
- `@/components/composite/TemplateEditor/lib/mockQuickbase` — mock data loader (getTables, QuickbaseField types)

**Cross-file dependencies**:
- `NotificationsPage` → `NotificationConfigPanel` (lines 49–50)
- `NotificationConfigPanel` → TemplateEditor lib (lines 37–39)
- `NotificationConfigPanel` → UI primitives (lines 23–35)

**Demo routes**:
- `#notifications` — filled view
- `#notifications-empty` — empty state view

