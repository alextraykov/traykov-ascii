# Email Templates Case Study: Architecture Exploration

**Date:** 2026-04-22  
**Scope:** Email template authoring end-to-end (TemplateEditor + VersionPanel)  
**Status:** Complete codebase exploration

---

## 1. Entry Points & Routing

### Page Route
- **Route hash:** `#template-editor`
- **Navigation mapping:** `/src/App.tsx` line 38
- **Page component:** `/src/pages/TemplateEditorPage/TemplateEditorPage.tsx`

The TemplateEditorPage is routed via hash-based navigation in App.tsx, mapped to the `TemplateEditor` navigation page type.

---

## 2. TemplateEditorPage Structure

**File:** `/src/pages/TemplateEditorPage/TemplateEditorPage.tsx` (267 lines)

### Layout
- **Top bar:** `TemplateEditorHeader` (title, draft badge, actions)
- **Horizontal panels:** ResizablePanelGroup (65% editor | 35% config)
  - Left (Editor): Email headers + TemplateEditor body
  - Right (Config): NotificationConfigPanel for notification settings

### State Management
```typescript
- templateName: string (default: 'Welcome Email')
- from, replyTo, subject: email header fields
- isDraft: boolean (tracks unsaved changes)
- publishConfig: NotificationConfig | null
- initialDocumentRef: tracks serialized state for draft detection
```

### Key Props
- `onNavigate(page: NavigationPage)` — navigate to other pages
- `isSidebarExpanded` — sidebar state sync
- `onSidebarExpandedChange` — sidebar toggle callback

### Call Sites in App Context
- TemplateEditorPage is rendered conditionally in App.tsx (line 131)
- Receives onNavigate, sidebar state, and callbacks from App level

---

## 3. TemplateEditor Composite

**File:** `/src/components/composite/TemplateEditor/TemplateEditor.tsx` (1400+ lines)

### Architecture: Block-based + Inline Model

The TemplateEditor uses a **document-oriented architecture** with serialization to markdown-like templates:

#### Data Types
- **Document:** `Block[]`
- **Block:** TextBlock | ListBlock
  - **TextBlock:** `{ id, type: 'paragraph'|'heading1'|'heading2'|'heading3'|'quote'|'code', inlines: Inline[] }`
  - **ListBlock:** `{ id, type: 'bulletedList'|'numberedList', items: ListItem[] }`
- **Inline:** TextInline | VariableInline
  - **TextInline:** `{ type: 'text', text: string }`
  - **VariableInline:** `{ type: 'variable', tableId, fieldId, label }`

**Type file:** `/src/components/composite/TemplateEditor/types.ts` (380 lines)

#### Serialization
- **To template string:** `serializeToTemplateString(document: Document): string`
  - Markdown-like: `# Heading`, `- bullet`, `> quote`, ` ``` code ` ``
  - Variables: `{{Label}}` (extracts variable label from inline)
  - Output: newline-separated blocks
- **From template string:** `deserializeFromTemplateString(template: string): Document`
  - Parses markdown patterns and regex `{{...}}` for variables
  - Returns structured blocks with placeholder tableId/fieldId for unknown variables

**Key export from `/src/components/composite/TemplateEditor/index.ts`:**
```typescript
export {
  serializeToTemplateString,
  deserializeFromTemplateString,
  createBlock,
  createEmptyParagraph,
  isListBlock,
  isTextBlock,
}
export type { Block, TextBlock, ListBlock, Inline, Document, BlockType }
```

### Main Component Props
```typescript
export interface TemplateEditorProps {
  initialDocument?: Document;
  onChange?: (document: Document) => void;
  placeholder?: string;
  showPreview?: boolean;
  className?: string;
}
```

### Internal Architecture: InlineRenderer

The TemplateEditor renders blocks in a loop. Each block contains an **InlineRenderer** (lines 49-165, ~500+ lines of component code):

**InlineRenderer function** (lines 64-165)
- **Contenteditable div** for text input
- **Sync mechanism:** `useLayoutEffect` imperatively syncs DOM with inlines array
  - Pure text: updates `el.innerText`
  - Mixed text + variables: rebuilds DOM with variable chips
- **Conflict avoidance:** Uses `isTypingRef` to prevent React reconciliation during user input
- **Variable chips:** Non-editable spans with label + remove button, styled with `.templateEditor__chip`

### Keyboard & Command Handling

#### 1. Slash Commands (`/`)
- **Trigger:** Type `/` at start of line or after whitespace
- **Menu component:** `SlashCommandMenu` (lines 1-150, file `/src/components/composite/TemplateEditor/SlashCommandMenu/SlashCommandMenu.tsx`)
- **Available commands** (SlashCommandMenu.tsx lines 40-112):
  - Text, Heading 1-3, Bullet List, Numbered List, Quote, Code Block
  - Insert Variable (opens VariablePicker)
- **Navigation:** Arrow Up/Down to select, Enter to confirm, Esc to close
- **Autocomplete:** Suggests first matching command label remainder

#### 2. Variable Picker (`{{`)
- **Trigger:** Type `{{` at start of block
- **Menu component:** `VariablePicker` (lines 1-200+, file `/src/components/composite/TemplateEditor/VariablePicker/VariablePicker.tsx`)
- **Data source:** Mock Quickbase schema from `/src/components/composite/TemplateEditor/lib/mockQuickbase.ts`
  - Tables: Contacts, Projects, Tasks, Invoices
  - Each table has searchable fields with type info (text, email, date, currency, user, checkbox)
- **Search & selection:** Type to filter fields by label/name, arrow keys to navigate, Enter to insert
- **Output:** Variable inline chip with table/field IDs and label

**Mock tables sample** (mockQuickbase.ts):
- **Contacts:** Full Name, Email, Phone Number, Company, Job Title, Created Date
- **Projects:** Project Name, Status, Due Date, Budget, Project Owner, Is Active
- **Tasks:** Task Title, Description, Assignee, Priority, Due Date, Completed
- **Invoices:** Invoice Number, Amount, Issue Date, Due Date, Client Email, Paid

#### 3. AI Input (Spacebar on empty line)
- **Trigger:** Press spacebar on empty row
- **Overlay:** `AIInputOverlay` (file `/src/components/composite/TemplateEditor/AIInputOverlay/AIInputOverlay.tsx`)
- **Suggestions:**
  - "Generate change update notification"
  - "Write a welcome message"
  - "Create a reminder email"
- **Behavior:** Type prompt + Enter to submit, Esc to close

### Block Management
- **Add block:** Plus icon in empty row (line ~700, uses Reorder from framer-motion)
- **Reorder blocks:** Drag handle (GripVertical icon) via framer-motion Reorder component
- **Delete block:** Backspace on empty block (implicit in inlines management)
- **Type conversion:** Slash command selects block type and converts current block

### Styling
**CSS file:** `/src/components/composite/TemplateEditor/TemplateEditor.css` (352 lines)
- `.templateEditor__` prefix for all classes
- Variable chips: `.templateEditor__chip`, `.templateEditor__chipLabel`, `.templateEditor__chipRemove`
- Block containers, focus states, animations for block addition

---

## 4. Supporting Sub-Components

### 4.1 TemplateEditorHeader
**File:** `/src/components/composite/TemplateEditor/TemplateEditorHeader/TemplateEditorHeader.tsx` (156 lines)

**Props:**
```typescript
export interface TemplateEditorHeaderProps {
  templateName: string;
  isDraft?: boolean;
  onTemplateNameChange?: (name: string) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onTestEmail?: () => void;
  onPublish?: () => void;
  isPublishDisabled?: boolean;
  onNavigateToNotifications?: () => void;
}
```

**Layout:**
- **Left:** Breadcrumb navigation ("Email Notifications" > template name)
- **Center:** Inline editable template name + Draft badge (when isDraft=true)
- **Right:**
  - Icon buttons: Duplicate (Copy icon), Delete (Trash2 icon)
  - Secondary button: "Send test email"
  - Primary button: "Publish"

**Name editing:** Click name or Edit3 icon to enter inline edit mode (Enter to save, Esc to cancel)

**CSS:** `/src/components/composite/TemplateEditor/TemplateEditorHeader/TemplateEditorHeader.css` (214 lines)

### 4.2 EmailHeaderFields
**File:** `/src/components/composite/TemplateEditor/EmailHeaderFields/EmailHeaderFields.tsx` (118 lines)

**Props:**
```typescript
export interface EmailHeaderFieldsProps {
  from?: string;
  replyTo?: string;
  subject?: string;
  onFromChange?: (value: string) => void;
  onReplyToChange?: (value: string) => void;
  onSubjectChange?: (value: string) => void;
  onGenerateSubject?: () => void;
  isGeneratingSubject?: boolean;
}
```

**Fields:**
1. **From** — text input, required (validated in TestEmail flow)
2. **Reply-To** — email input, optional
3. **Subject** — text input with AI generation button (Sparkles icon)

**AI button:** Disabled state during generation, tooltip "Generate subject with AI"

**CSS:** `/src/components/composite/TemplateEditor/EmailHeaderFields/EmailHeaderFields.css` (96 lines)

### 4.3 TemplateToolbar
**File:** `/src/components/composite/TemplateEditor/TemplateToolbar/TemplateToolbar.tsx` (107 lines)

**Props:**
```typescript
export interface TemplateToolbarProps {
  templateName?: string;
  onPublish?: () => void;
  onDescribeWithAI?: () => void;
  onTemplateNameClick?: () => void;
  isPublishing?: boolean;
  isGenerating?: boolean;
  className?: string;
}
```

**Layout:** Breadcrumbs (Templates > template name) on left, AI + Publish buttons on right

**Note:** This component is defined but not currently used in TemplateEditorPage; likely for future or alternate layouts.

### 4.4 VersionHistoryPopover
**File:** `/src/components/composite/TemplateEditor/VersionHistoryPopover/VersionHistoryPopover.tsx` (200+ lines)

**Props:**
```typescript
export interface VersionHistoryPopoverProps {
  versions: TemplateVersion[];
  onPreview?: (version: TemplateVersion) => void;
  onRevert?: (version: TemplateVersion) => void;
  onPreviewInNewTab?: (version: TemplateVersion) => void;
  trigger?: React.ReactNode;
}

export interface TemplateVersion {
  id: string;
  version: number;
  timestamp: Date;
  isDeployed?: boolean;
}
```

**UI:**
- **Trigger:** History icon button (customizable via trigger prop)
- **Popover:** Command-based searchable version list
- **Version row:** Shows version number, relative time (e.g., "5 minutes ago"), "Published" badge if deployed
- **Hover actions:** Revert button (RotateCcw), Preview in new tab (ExternalLink)
- **Search:** CommandInput to filter versions by number/timestamp

**CSS:** `/src/components/composite/TemplateEditor/VersionHistoryPopover/VersionHistoryPopover.css` (252 lines)

---

## 5. VersionPanel (Separate Component)

**File:** `/src/components/composite/VersionPanel/VersionPanel.tsx` (200+ lines)

**Props:**
```typescript
export interface VersionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewVersion: (version: VersionEntry) => void;
  onRevertToVersion: (version: VersionEntry) => void;
  onReturnToCurrent?: () => void;
  previewingVersionId?: string | null;
}

export interface VersionEntry {
  id: string;
  title: string;
  timestamp: string;
  version: string;
  isCurrent?: boolean;
  isPublished?: boolean;
  source?: 'user' | 'ai' | 'publish';
}
```

**Purpose:** Side panel (as opposed to popover) for version history, used in BuilderPage

**Features:**
- **Source icons:** Bot (AI), Pencil (manual edit), Rocket (published)
- **Current version:** Highlighted row with isCurrent=true
- **Actions:** Revert (↺), view external link (↗)
- **Hover state:** Reveals action buttons
- **Previewing state:** Highlights the version being previewed

**Mock data sample** (VersionPanel.tsx lines 40-93):
- 7 versions with descending timestamps ("1 min ago", "45 min ago")
- Mix of user edits and AI changes
- One published version

**CSS:** `/src/components/composite/VersionPanel/VersionPanel.css` (No exact line count provided but file exists)

---

## 6. Reuse Context: BuilderPage

**File:** `/src/pages/BuilderPage/BuilderPage.tsx` (390 lines)

The TemplateEditor is **reused inside BuilderPage** for plan markdown editing (not email templates):

### Integration Points
- **Line 9:** Imports TemplateEditor
- **Line 10:** Imports serialization/deserialization utilities
- **Line 8:** Imports VersionPanel
- **Lines 102-104:** State for version history and plan review
- **Lines 282-307:** Conditional render of TemplateEditor for plan review

### Context Adaptation
```typescript
<TemplateEditor
  key={reviewingPlan.messageId}
  initialDocument={deserializeFromTemplateString(reviewingPlan.markdownContent)}
  onChange={setEditorDocument}
  placeholder="Plan content..."
/>
```

**Key difference:** BuilderPage uses TemplateEditor for **plan markdown** (architecture/workflow docs), not email templates
- No EmailHeaderFields (plan doesn't have From/Subject)
- No TemplateEditorHeader (plan review has its own AppHeader)
- Same block-based editor with slash commands and variable insertion
- Cross-sync: Editor changes update ChatWindow in real-time (line 122)

### VersionPanel Integration in BuilderPage
- **Line 368-378:** VersionPanel rendered as side panel for entire app preview
- **State tracking:** previewingVersion, onReturnToCurrent callback
- **Behavior:** Shows version history for the whole builder session, not template-specific

---

## 7. Draft Badge & State Tracking

**In TemplateEditorPage:**

```typescript
const [isDraft, setIsDraft] = React.useState(false);
const initialDocumentRef = React.useRef<string | null>(null);

const handleDocumentChange = React.useCallback((newDocument: Document) => {
  const serialized = serializeToTemplateString(newDocument);
  
  if (initialDocumentRef.current === null) {
    initialDocumentRef.current = serialized;
  } else {
    setIsDraft(serialized !== initialDocumentRef.current);
  }
}, []);
```

**Flow:**
1. First change: Store serialized state in initialDocumentRef
2. Subsequent changes: Compare current serialized state to initial
3. If different: isDraft = true, TemplateEditorHeader shows "Draft" badge
4. On publish: isDraft = false, badge hidden

**TemplateEditorHeader (line 97-99):**
```typescript
{isDraft && (
  <span className="template-header__draft-tag">Draft</span>
)}
```

---

## 8. Test Email Flow

**Trigger:** TemplateEditorPage line 81-91

```typescript
const handleTestEmail = React.useCallback(() => {
  if (!from.trim() || !subject.trim()) {
    toast.warning('Please fill in required fields', {
      description: 'From and Subject are required to send a test email.',
    });
    return;
  }
  console.log('Sending test email...');
  // TODO: Implement test email sending
}, [from, subject]);
```

**Validation:**
- From field: Required
- Subject field: Required
- Toast on missing fields with error message

**UI:** "Send test email" button in TemplateEditorHeader (secondary button)

**Documentation flow diagram:** `/docs/diagrams/template-editor-page-flow.md` lines 180-218
- Modal opens with recipient email input
- Validates recipient email format
- Shows variable preview with editable test values
- Sends test email with spinner feedback

---

## 9. Publish Flow

**Handler:** TemplateEditorPage lines 102-108

```typescript
const handlePublishConfirm = React.useCallback(() => {
  console.log('Publishing with config:', publishConfig);
  toast.success('Notification published', {
    description: `"${templateName}" is now live.`,
  });
  setIsDraft(false);
}, [publishConfig, templateName]);
```

**Requirements:**
- publishConfig.name must be filled (set in NotificationConfigPanel)
- publishConfig.tableId must be selected (set in NotificationConfigPanel)
- isPublishDisabled controlled by: `!publishConfig?.name || !publishConfig?.tableId`

**UI:** Primary "Publish" button in TemplateEditorHeader, disabled when validation fails

**Documentation flow diagram:** `/docs/diagrams/template-editor-page-flow.md` lines 257-284
- Confirmation dialog with change summary
- Optional diff view from previous version
- Publishing state with spinner
- Success/error toast with retry option

---

## 10. Exports & Public API

**Entry point:** `/src/components/composite/TemplateEditor/index.ts`

```typescript
// Main component
export { TemplateEditor } from './TemplateEditor';
export type { TemplateEditorProps } from './TemplateEditor';

// Sub-components
export { TemplateToolbar } from './TemplateToolbar';
export { TemplateEditorHeader } from './TemplateEditorHeader';
export { EmailHeaderFields } from './EmailHeaderFields';
export { VersionHistoryPopover } from './VersionHistoryPopover';

// Types & utils
export type { Block, TextBlock, ListBlock, Inline, Document, BlockType };
export {
  serializeToTemplateString,
  deserializeFromTemplateString,
  createBlock,
  createEmptyParagraph,
  isListBlock,
  isTextBlock,
};

// Mock data
export { getTables, getTableById, getFieldById, searchFields };
export type { QuickbaseTable, QuickbaseField };
```

**Separate export:** VersionPanel is exported from `/src/components/composite/VersionPanel/index.ts` (not from TemplateEditor)

---

## 11. Key Dependencies

### External libraries
- `framer-motion` — animations, Reorder for drag-drop blocks
- `lucide-react` — icons (Plus, GripVertical, Sparkles, Copy, Trash2, Edit3, History, RotateCcw, ExternalLink, etc.)
- `@radix-ui/` — Popover, Command, Tooltip (via ui/Popover, ui/Command, ui/Tooltip)

### Internal design system
- `@/components/ui/Button` — Button component with variants
- `@/components/ui/Tooltip` — Tooltip for icon buttons
- `@/components/ui/Sonner` — Toast notifications (toast.warning, toast.success)
- `@/lib/utils` — cn() utility for className merging

### Style organization
- Scoped CSS files with BEM naming (`.templateEditor__`, `.emailHeaderFields__`, etc.)
- Total ~1673 lines of CSS across TemplateEditor sub-components
- Prefix convention: component name in lowercase with `__` for child selectors and `--` for modifiers

---

## 12. Flow Diagrams Reference

**File:** `/docs/diagrams/template-editor-page-flow.md` (464 lines)

Documents 8 major flows with Mermaid diagrams:
1. **Entry Points** (lines 7-56) — How to reach editor from various sources
2. **Draft Badge Flow** (lines 90-125) — When badge appears/disappears
3. **Version History Flow** (lines 128-176) — Popover interactions and version actions
4. **Test Email Flow** (lines 180-254) — Modal, validation, sending
5. **Publish Flow** (lines 257-284) — Confirmation, publishing, error handling
6. **AI Generate Flow** (lines 297-310) — Spacebar trigger, AI input overlay
7. **Slash Commands Flow** (lines 323-355) — Typing `/`, menu navigation
8. **Variable Picker Flow** (lines 358-414) — Typing `{{`, field selection
9. **Template Header Actions** (lines 421-442) — Edit name, duplicate, delete

**Edge cases** (lines 446-463) — Spacebar on non-empty row, slash mid-word, variable chips, publish with empty body, etc.

---

## 13. File Structure Summary

```
src/
├── pages/
│   ├── TemplateEditorPage/
│   │   ├── TemplateEditorPage.tsx (267 lines)
│   │   ├── TemplateEditorPage.css
│   │   └── index.ts
│   └── BuilderPage/
│       └── BuilderPage.tsx (390 lines) — reuses TemplateEditor
│
└── components/
    └── composite/
        ├── TemplateEditor/
        │   ├── TemplateEditor.tsx (1400+ lines)
        │   ├── TemplateEditor.css (352 lines)
        │   ├── types.ts (380 lines) — Document, Block, Inline, serialization
        │   ├── index.ts (42 lines) — Public API
        │   ├── TemplateEditorHeader/
        │   │   ├── TemplateEditorHeader.tsx (156 lines)
        │   │   └── TemplateEditorHeader.css (214 lines)
        │   ├── EmailHeaderFields/
        │   │   ├── EmailHeaderFields.tsx (118 lines)
        │   │   └── EmailHeaderFields.css (96 lines)
        │   ├── TemplateToolbar/
        │   │   ├── TemplateToolbar.tsx (107 lines)
        │   │   └── TemplateToolbar.css (101 lines)
        │   ├── VersionHistoryPopover/
        │   │   ├── VersionHistoryPopover.tsx (200+ lines)
        │   │   └── VersionHistoryPopover.css (252 lines)
        │   ├── SlashCommandMenu/
        │   │   ├── SlashCommandMenu.tsx (150+ lines)
        │   │   └── SlashCommandMenu.css (249 lines)
        │   ├── VariablePicker/
        │   │   ├── VariablePicker.tsx (150+ lines)
        │   │   └── VariablePicker.css (270 lines)
        │   ├── AIInputOverlay/
        │   │   ├── AIInputOverlay.tsx (136 lines)
        │   │   └── AIInputOverlay.css (139 lines)
        │   └── lib/
        │       └── mockQuickbase.ts (121 lines) — Field definitions, search
        │
        └── VersionPanel/
            ├── VersionPanel.tsx (200+ lines)
            ├── VersionPanel.css
            └── index.ts
```

---

## 14. Design Patterns

### 1. Document-Centric Architecture
- **Immutable updates:** onChange callback with new Document
- **Serialization as contract:** Template string format for persistence
- **Block-based structure:** Enables reordering, type conversion, nested editing

### 2. Imperative DOM Management
InlineRenderer uses `useLayoutEffect` to imperatively sync contenteditable with React state, avoiding React reconciliation conflicts:
```typescript
React.useLayoutEffect(() => {
  if (!el || isTypingRef.current) return;
  // Sync imperative: el.innerText = ... or el.innerHTML = ...
}, [inlines, hasVariables]);
```

### 3. Portal Menus
Slash commands and variable picker use createPortal for absolute positioning:
```typescript
return createPortal(<menu />, document.body);
```

### 4. Keyboard-Driven UX
- Slash commands: `/` trigger, type to filter, arrow keys to navigate, Enter to select
- Variable picker: `{{` trigger, search filter, arrow key navigation
- AI input: Spacebar on empty row, type prompt, Enter to submit

### 5. Contextual Sub-Components
- EmailHeaderFields: Email-specific (From, Reply-To, Subject)
- NotificationConfigPanel: Where to send and who receives (right sidebar)
- VersionPanel: Shared across BuilderPage and TemplateEditorPage

### 6. Draft State Tracking
Serialize on change, compare to initial to detect modifications. Simple, effective pattern for unsaved state.

---

## 15. Integration Points for Users

### From NotificationsPage
- Create new notification → TemplateEditorPage with blank template
- Edit existing template → TemplateEditorPage with loaded template
- Use default template → TemplateEditorPage with template content pre-filled

### From BuilderPage (Plan Review)
- AI generates plan markdown → TemplateEditor in read-only streaming mode
- User edits plan → TemplateEditor with onChange updates
- Approve plan → Serialized markdown sent back to ChatWindow

### Navigation
- TemplateEditorPage header breadcrumb: "Email Notifications" link navigates back to NotificationsPage
- Sidebar integration: CollapsibleSidebar handles page navigation

---

## 16. TypeScript Type Hierarchy

```
Document = Block[]

Block = TextBlock | ListBlock

TextBlock = {
  id: string
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'quote' | 'code'
  inlines: Inline[]
}

ListBlock = {
  id: string
  type: 'bulletedList' | 'numberedList'
  items: ListItem[]
}

ListItem = {
  id: string
  inlines: Inline[]
}

Inline = TextInline | VariableInline

TextInline = {
  type: 'text'
  text: string
}

VariableInline = {
  type: 'variable'
  tableId: string
  fieldId: string
  label: string
}
```

---

## 17. Notable Implementation Details

### 1. Variable Chip Rendering
Non-editable spans with:
- `contenteditable="false"` to prevent editing
- `data-variable="true"` attribute for identification
- Remove button (×) with aria-label
- Styled `.templateEditor__chip` container

### 2. Block ID Generation
```typescript
export function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
```
Unique per block, used for React keys and block management.

### 3. Cursor Management After Sync
After imperatively updating DOM:
```typescript
const range = document.createRange();
const sel = window.getSelection();
range.setStart(textNode, inlinesText.length);
range.collapse(true);
sel.removeAllRanges();
sel.addRange(range);
```
Restores cursor to end of content to maintain user experience.

### 4. Markdown Serialization Format
- Headings: `# text`, `## text`, `### text`
- Lists: `- item`, `1. item`
- Quote: `> text`
- Code: ` ```\ncode\n``` `
- Variables: `{{Label}}`
- Blocks separated by `\n\n`

### 5. Mock Quickbase Schema
4 tables × 6 fields each = 24 insertable variables for demo/testing:
- Contacts: Full Name, Email, Phone, Company, Job Title, Created Date
- Projects: Name, Status, Due, Budget, Owner, Active
- Tasks: Title, Description, Assignee, Priority, Due, Completed
- Invoices: Number, Amount, Issue Date, Due, Client Email, Paid

---

## 18. CSS Architecture

All TemplateEditor sub-components use **BEM naming with module prefix:**

```css
.templateEditor__chip { ... }
.templateEditor__chipLabel { ... }
.templateEditor__chipRemove { ... }

.emailHeaderFields__field { ... }
.emailHeaderFields__label { ... }
.emailHeaderFields__input { ... }
.emailHeaderFields__aiButton { ... }

.template-header__center { ... }
.template-header__breadcrumb { ... }
.template-header__draft-tag { ... }
.template-header__primary-button { ... }

.version-history__item { ... }
.version-history__deployed-badge { ... }
.version-history__item-actions { ... }
```

**No Tailwind utility classes** — all styling in component-scoped CSS files with clear scoping strategy.

---

## 19. Summary: 500-Word Map

### What It Is
The **TemplateEditor** is a block-based rich email template authoring system. It lets users compose email notifications with:
- Email metadata (From, Reply-To, Subject)
- Rich text body with markdown-like blocks (paragraphs, headings, lists, quotes, code)
- Dynamic variables from Quickbase tables ({{First Name}}, {{Email}}, etc.)
- AI-assisted content generation (spacebar trigger)
- Draft tracking and version history

### How It Works
**Editing model:** Document = Block[] where each block is TextBlock | ListBlock. Inlines within blocks are TextInline | VariableInline. This structure serializes to markdown-like template strings for persistence.

**Text entry:** Contenteditable div synced imperatively with React state to avoid contentEditable/React conflicts. Variable chips are non-editable spans with removal buttons.

**Content creation shortcuts:**
- **Slash commands:** Type `/` to open block-type menu (text, heading, list, quote, code, insert variable)
- **Variable picker:** Type `{{` to search and insert Quickbase fields
- **AI input:** Spacebar on empty line to get AI suggestions

**Email headers:** From, Reply-To, Subject fields at top; From and Subject are required for test email.

**Version history:** VersionHistoryPopover (inline in TemplateEditorHeader) or VersionPanel (side panel in BuilderPage). Search, preview, revert to previous versions.

**Draft tracking:** Serializes document on each change, compares to initial state. Shows "Draft" badge when unsaved.

**Publishing:** RequiresNotificationConfigPanel settings (name, tableId). Toast feedback on success/error.

### Where It Lives
- **Main page:** TemplateEditorPage (route `#template-editor`)
- **Page layout:** Header + resizable panels (editor 65% | config 35%)
- **Sub-components:** TemplateEditorHeader, EmailHeaderFields, TemplateEditor (body editor), NotificationConfigPanel
- **Reused:** BuilderPage uses same TemplateEditor for plan markdown editing (different context, same mechanics)

### Key Technologies
- **Data model:** TypeScript types for Document/Block/Inline; serialization/deserialization
- **UI:** React with contentEditable, framer-motion for drag/animations, Radix for popovers
- **Icons:** lucide-react
- **Styling:** Component-scoped CSS with BEM naming, no Tailwind utilities
- **Mock data:** Quickbase schema with 4 tables and 24 fields for variable insertion

### Entry Points
- From **Notifications page:** Click "New", "Build with AI", "Use template", or edit existing
- From **Builder page (plan review):** AI generates markdown, open in TemplateEditor to edit
- Direct: Navigate to `#template-editor` hash

### Extensibility
- Document structure is decoupled from UI; any consumer can deserialize template strings
- Serialization format is markdown-like, human-readable
- Slash commands and variable picker are pluggable menus
- Draft and version tracking work at Document level, not view level
- VersionPanel can be integrated anywhere you need version history

---

## Appendix: File Line References

| File | Lines | Purpose |
|------|-------|---------|
| TemplateEditorPage.tsx | 267 | Page layout, state, email headers, editor, config panel |
| TemplateEditor.tsx | 1400+ | Main editor, InlineRenderer, block management |
| types.ts | 380 | Document, Block, Inline types; serialization logic |
| TemplateEditorHeader.tsx | 156 | Top bar with name, draft badge, actions (test, publish) |
| EmailHeaderFields.tsx | 118 | From, Reply-To, Subject fields with AI button |
| VersionHistoryPopover.tsx | 200+ | Searchable version list with revert/preview actions |
| VersionPanel.tsx | 200+ | Side panel version history with source icons |
| SlashCommandMenu.tsx | 150+ | `/` command menu with 9 block types |
| VariablePicker.tsx | 150+ | `{{` variable picker with Quickbase field search |
| AIInputOverlay.tsx | 136 | Spacebar AI input with suggested actions |
| mockQuickbase.ts | 121 | 4 tables × 6 fields; field search utilities |
| TemplateEditor.css | 352 | Styling for editor, chips, blocks |
| template-editor-page-flow.md | 464 | 8 flow diagrams with edge cases |
| BuilderPage.tsx | 390 | Reuses TemplateEditor for plan markdown + VersionPanel |
| App.tsx | 200+ | Route mapping (#template-editor) and page navigation |

