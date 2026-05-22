# Email Templates — UX Architecture Analysis

> Generated: 2026-04-22
> Branch: workflow
> Sources: TemplateEditorPage, TemplateEditor composite, VersionPanel composite,
>          docs/diagrams/template-editor-page-flow.md

---

## 1. Page IA — Editor + Header Fields + Config Sidebar

The page uses a `ResizablePanelGroup` with a fixed top bar and two horizontal panels
(TemplateEditorPage.tsx:135). The structure from top to bottom and left to right is:

```
┌─ TemplateEditorHeader (full width, 56px fixed) ─────────────────┐
│  breadcrumb | template name + draft badge | icon group | actions │
└──────────────────────────────────────────────────────────────────┘
┌─ editorPane (defaultSize 65, min 40) ──┬─ configPane (35, 20–50) ┐
│  emailHeaderFields                     │  "Notification settings" │
│    From                                │  header + subtitle        │
│    Reply-to                            │  NotificationConfigPanel  │
│    Subject  [AI sparkle]               │  (scrollable body)        │
│                                        │  footer: Test | Publish   │
│  TemplateEditor (block editor)         │                           │
└────────────────────────────────────────┴───────────────────────────┘
```

The left pane scrolls independently and is constrained to `max-width: 720px`
(TemplateEditorPage.css:22), centering the reading column. The config pane is
`display:flex; flex-direction:column` with a sticky footer
(TemplateEditorPage.css:59–66).

**Header fields** (From / Reply-to / Subject) live in the page component, not in
TemplateEditor itself (TemplateEditorPage.tsx:140–213). Labels are fixed at
`min-width: 100px` (EmailHeaderFields.css:34), creating a column-aligned form that
reads as metadata, not content. The Subject field carries an inline AI sparkle button
(`Sparkles` icon, 14px) positioned inline-end of the input. Only From and Subject
are validated before test send; Reply-to is optional. This asymmetry is implicit in
the validation logic (TemplateEditorPage.tsx:83) and not signalled visually —
a required indicator on From and Subject would close the gap.

**Breakpoint**: below 900px the panels stack vertically and the resize handle hides
(TemplateEditorPage.css:69–82). configPane caps at `max-height: 50vh` in stacked
mode, which risks truncating long notification config forms.

---

## 2. Block Hierarchy — Visual Weights

Block types are CSS class variants on `.templateEditor__block--{type}`
(TemplateEditor.css:61–101). The rendered weight scale from heaviest to lightest:

| Block type | Size token | Weight token | Notes |
|---|---|---|---|
| heading1 | `--font-size-3xl` | `--font-weight-bold` | `margin-top: --spacing-lg` |
| heading2 | `--font-size-2xl` | `--font-weight-semibold` | `margin-top: --spacing-md` |
| heading3 | `--font-size-xl` | `--font-weight-semibold` | `margin-top: --spacing-sm` |
| paragraph | `--font-size-lg` | inherited normal | body baseline |
| quote | `--font-size-lg` | normal | left border `--color-border-primary`, italic, `--color-text-secondary` |
| code | `--font-size-sm` | normal | `--color-bg-tertiary` background, mono font |
| bulletedList / numberedList | `--font-size-lg` | normal | indented via `--spacing-xl` |

There is no explicit `divider` or `image` block type in the current type registry
(TemplateEditor/types.ts is the canonical source, not read here but confirmed by
SlashCommandMenu which lists only: paragraph, heading1–3, quote, code, bulletedList,
numberedList, and a variable action). Divider and image are future additions;
their absence should be noted in any handoff.

---

## 3. Toolbar Affordance — Floating vs. Fixed; Contextual vs. Always-Visible

There is no traditional floating format toolbar (no bold/italic button bar). The
affordance model is entirely command-driven:

- **Row-level controls** appear on hover/focus-within of each block wrapper
  (TemplateEditor.css:280–283): a `+` (add block) and a `⠿` drag handle, both at
  `opacity:0` until hover, positioned in a 44px left gutter via negative margin
  (TemplateEditor.css:253–255). This is always-present-but-hidden, revealed per row.

- **SlashCommandMenu** (`/` trigger) is a fixed-position popover at cursor coordinates
  (TemplateEditor.tsx:1358–1365). It is contextual — only appears when `/` is typed
  at start or after whitespace (TemplateEditor.tsx:190).

- **VariablePicker** (`{{` trigger) is a fixed-position popover (VariablePicker.css:5–14).
  Also contextual, cursor-anchored.

- **AIInputOverlay** (Spacebar on empty row, per the flow diagram) provides an inline
  AI prompt bar with suggestion chips (AIInputOverlay.css). The reveal animation on
  suggestion chips uses raw `@keyframes suggestionReveal` with hardcoded
  `transform: translateX(-8px)` and `animation-delay` values rather than motion tokens.

**Assessment**: the row-control + command-menu model works well for keyboard-first
users. The pattern matches Notion's interaction model and avoids toolbar clutter for
an email context. The gap is discoverability — a first-time user sees no affordance
until they hover or type. The persistent hint bar (TemplateEditor.tsx:1353–1355)
partially addresses this by showing `/` and `{{ }}` keyboard hints at the bottom of
the editor canvas.

---

## 4. Variable Pill Visual System

Variable chips are imperative DOM constructs rendered by `InlineRenderer`
(TemplateEditor.tsx:128–149). They use the class `.templateEditor__chip`.

**Visual spec from TemplateEditor.css:147–211:**

- **Background**: `--color-bg-selected` (light: `rgba(0,0,0,0.06)`; dark: `rgba(255,255,255,0.08)`)
- **Text color**: `--color-accent-primary` (brand green, `#04764E` light / same dark)
- **Font size**: `--font-size-sm`, `--font-weight-medium`
- **Padding**: `2px --spacing-sm` — tighter than a standard badge
- **Radius**: `--radius-sm`
- **Hover**: `color-mix(in srgb, --color-accent-primary 15%, transparent)` — shifts to a
  green tint fill, reinforcing interactivity
- **Focus ring**: `0 0 0 2px color-mix(in srgb, --color-accent-primary 30%, transparent)`
- **Remove button**: `×`, `14×14px`, `--color-accent-primary`, `opacity: 0.5` at rest,
  `1.0` on hover

The chip sits `vertical-align: baseline` to align with surrounding text at body size.
Visually it reads as a green label within the prose, distinct from regular text via
color and rounded background. The `contenteditable: false` attribute and
`data-variable="true"` marker ensure keyboard/mouse interactions are intercepted
(TemplateEditor.tsx:133–136). Backspace removes the entire chip atom
(TemplateEditor.tsx:231–296).

**Dark mode**: `--color-bg-selected` darkens to the rgba white variant; `--color-accent-primary`
remains the same green (`#04764E`), providing adequate contrast on dark backgrounds.
The `color-mix` hover tint is relative to the accent, so it self-adapts.

**One gap**: the chip label is the human-readable field name (e.g., "Full Name"), not
the template string (`{{contacts.Full Name}}`). This is correct for editing clarity
but the serialized output mapping lives in `serializeToTemplateString` — that contract
is not surfaced to the user, which is fine for this prototype but needs documentation
in the engineer handoff.

---

## 5. VersionPanel Layout

The VersionPanel (BuilderPage context, not TemplateEditorPage) expands from `width: 0`
to `width: 280px` via a CSS transition on the outer shell
(VersionPanel.css:16–23). An inner wrapper is fixed at `min-width: 280px` to hold
content stable while the outer animates.

**List structure** (VersionPanel.tsx:173–289):

```
version-panel
  version-panel__header       [Clock icon | "Version history" | X close]
  version-panel__list
    version-panel__item × N
      dot-col                 [8–10px dot + vertical connector line]
      item-body
        item-row              [title | Current badge | Live badge]
        item-meta             [source icon | timestamp | version string]
      actions                 [Eye preview | RotateCcw revert — opacity:0 at rest]
```

**State encodings on the dot:**
- Default: `--color-border-medium` (neutral)
- Current: `--color-accent-primary`, 10px (larger, brand green)
- Published: `--color-success` (green)
- Previewing: `--color-info` (blue)

**Selection highlight**: `--color-bg-info` background on the previewing row
(VersionPanel.css:119–125). The "return to current" hint uses
`--color-bg-success-subtle` with a raw rgba fallback (addressed in section 6).

**Restore CTA**: no explicit modal or confirmation step is shown in the panel itself.
`onRevertToVersion` fires immediately on button click (VersionPanel.tsx:277). The
flow diagram specifies a confirm dialog (`docs/diagrams/template-editor-page-flow.md:148–153`)
but the component does not implement it — the revert is direct. This is a prototype
gap that will need a guard in production.

**No VersionPanel in TemplateEditorPage**: the TemplateEditorPage wires version history
through `VersionHistoryPopover` (a popover anchored to the header icon group, not a
side panel). The standalone `VersionPanel` composite is used in BuilderPage. These
are two parallel version-history surfaces with different affordances — see section 9.

---

## 6. Token Compliance — Hardcoded Values by File:Line

### TemplateEditorPage.css

| Line | Value | Issue |
|---|---|---|
| 30 | `var(--color-border, #e5e5e5)` | `--color-border` does not exist in tokens.css. Fallback `#e5e5e5` is used. Should be `--color-border-light`. |
| 37 | `var(--color-border, #e5e5e5)` | Same as above. |
| 43 | `var(--color-text-primary, #1a1a1a)` | Token exists; the hardcoded fallback is redundant and can be dropped. |
| 49 | `var(--color-text-tertiary, #999)` | `#999` does not match the token value (`#A3A3A3`). Color drift in the fallback. |
| 65 | `var(--color-border, #e5e5e5)` | Same as line 30. |
| 80 | `var(--color-border, #e5e5e5)` | Same as line 30. |
| 41–42 | `font-size: 15px; font-weight: 600` | `.templateEditorPage__configTitle` uses raw px size not in the type scale, and `font-weight: 600` instead of `--font-weight-semibold`. |
| 48 | `font-size: 13px` | `.templateEditorPage__configSubtitle` — 13px is not in the font-size scale. Closest is `--font-size-xs` (13px at current token value) but that should be referenced by token. |
| 50 | `margin: 4px 0 0` | Raw margin, should use `--spacing-xs` or `--spacing-1`. |

### TemplateEditorHeader/TemplateEditorHeader.css

| Line | Value | Issue |
|---|---|---|
| 10 | `padding: 0 16px` | Raw px. `--spacing-lg` resolves to 16px and should be used. |
| 41, 51, 84, 104, 118, 184, 206 | `font-weight: 500` | Multiple instances. Token `--font-weight-medium` exists and equals 500. Should be replaced. |
| 46, 79, 113 | `padding: 4px 8px` | Raw px. Should use spacing tokens (e.g., `--spacing-xs --spacing-sm`). |
| 101 | `padding: 2px 6px` | Raw px micro-padding. Acceptable for a badge if there is no badge-padding token, but worth documenting. |
| 107 | `color: var(--color-warning-text, #92400e)` | `--color-warning-text` does not exist in tokens.css. Fallback `#92400e` is a hardcoded amber. Should map to `--color-warning` (`#8C6800` light). |
| 108 | `background-color: var(--color-warning-bg, #fef3c7)` | `--color-warning-bg` is an alias token that exists and resolves to `--color-bg-warning`. But `#fef3c7` is the Tailwind amber-100 value, not matching the token `#FFFCE8`. Color drift in the fallback. Use `var(--color-bg-warning)` directly. |
| 150, 178, 200 | `height: 32px` | Raw px button heights. Consider a `--size-control-sm` token if this height recurs. |
| 179, 201 | `padding: 0 16px` | Raw px. |

### VersionPanel/VersionPanel.css

| Line | Value | Issue |
|---|---|---|
| 133 | `var(--color-bg-success-subtle, rgba(22, 163, 74, 0.06))` | `--color-bg-success-subtle` exists and aliases `--color-bg-success`. The raw rgba fallback is Tailwind green-600 alpha, not matching the token. Drop the fallback. |
| 142 | `var(--color-bg-success-subtle, rgba(22, 163, 74, 0.08))` | Same issue, different opacity. |
| 226, 241 | `font-size: 10px` | Sub-scale font size for badges. No token covers 10px (smallest is `--font-size-xs` at 13px). This is a known badge-specific size; document as intentional if keeping, or introduce `--font-size-badge`. |

### TemplateToolbar/TemplateToolbar.css

| Line | Value | Issue |
|---|---|---|
| 9 | `height: 48px` | Raw px. Consider `--size-toolbar-height` token for consistency with the 56px header. |
| 12 | `background: var(--background)` | `--background` is a shadcn alias for `--color-bg-surface`. Works, but `--color-bg-surface` is more explicit and preferred per codebase convention. |

**Summary count**: 4 CSS files contain hardcoded values. TemplateEditorHeader.css has
the highest density (8+ instances of `font-weight: 500` and multiple raw px values).
TemplateEditorPage.css references a non-existent `--color-border` token four times.
VersionPanel.css has two rgba fallbacks that diverge from token values.

---

## 7. Motion

### Block Insert
`blockVariants` in TemplateEditor.tsx:374–386:
```
initial: { opacity: 0, y: -4 }
animate: { duration: 0.15, ease: [0.4, 0, 0.2, 1] }
exit:    { opacity: 0, y: 4, duration: 0.1 }
```
The easing array `[0.4, 0, 0.2, 1]` is a hardcoded cubic-bezier. It should reference
`--motion-ease-standard` from tokens. The durations (0.15s, 0.1s) are close to
`--motion-duration-fast` — worth aligning. `AnimatePresence mode="popLayout"` ensures
exits run before inserts settle, which is correct.

`Reorder.Group` / `Reorder.Item` provide drag reordering with `layout` animation
on each block wrapper (TemplateEditor.tsx:487, 567). This is appropriate but will
fire layout animations on every drag frame — acceptable for a prototype, flagged for
production performance review.

### Version Restore Confirmation
There is no dedicated animation for the restore action — `onRevertToVersion` fires
immediately without a toast or inline confirmation. The flow diagram specifies a
confirm dialog that is not implemented. Once added, the confirm dialog entry should
use `--motion-ease-decelerate` (matching the VersionPanel open transition)
and exit with `--motion-ease-accelerate`.

### VersionPanel Open/Close
CSS transition on `width`, `min-width`, `margin`, `opacity`
(VersionPanel.css:16–23) uses `--motion-duration-slow` and `--motion-ease-decelerate`
for open, with `opacity` at `--motion-duration-normal`. This is compliant and well-tuned
— the width expansion precedes opacity for a slide-in feel.

### ToolbarReveal (Row Controls)
`opacity: 0 → 1` on `templateEditor__rowControls` at `0.15s ease`
(TemplateEditor.css:277). The `ease` keyword is not a token. Should be
`var(--motion-ease-standard)`. Functional but technically non-compliant.

### Reduced-Motion
`@media (prefers-reduced-motion: reduce)` blocks are present in TemplateEditor.css:340–352,
VersionPanel.css:369–393, VariablePicker.css:222–229, SlashCommandMenu.css:206–213,
VersionHistoryPopover.css:215–221. All disable transitions. The AIInputOverlay
`@keyframes suggestionReveal` animation does NOT have a reduced-motion override —
this is a gap. The `blurReveal` Framer Motion variants in TemplateEditorPage.tsx:29–33
also lack a reduced-motion guard in the component; the `filter: blur()` transition
should respect `useReducedMotion()`.

---

## 8. Dark Mode

### Editor Canvas
The canvas background inherits `--color-bg-page` (dark: `#111715`), which is a
very dark green-black. Body text uses `--color-text-primary` (dark: `#EAECEB`) —
high contrast, suitable for reading copy. Line height is fixed at 1.7
(TemplateEditor.css:43), appropriate for email body composition.

Heading blocks receive no explicit dark-mode override; they inherit through the same
token stack. The quote border uses `--color-border-primary` which maps to
`--color-border-light` (dark: `#262C2A`) — this is very low contrast against the
dark canvas. The quote's left accent bar will nearly disappear in dark mode.

### Pill Colors in Dark Mode
`--color-bg-selected` in dark is `rgba(255,255,255,0.08)` — a light glass tint.
`--color-accent-primary` is the same `#04764E` green in both modes. On the dark
canvas (`#111715`) the green text on a light-glass chip reads adequately but is
lower contrast than in light mode. A dark-mode chip refinement would boost
`--color-bg-selected` toward 12–15% alpha or shift the chip to use
`--color-accent-primary-alpha` (`rgba(4,118,78,0.15)`) for a coloured rather than
neutral tint, reinforcing the variable semantic.

### Toolbar
TemplateToolbar uses `var(--background)` which in dark resolves to `--color-bg-surface`
(`#1C2220`). The top TemplateEditorHeader uses `--color-bg-page` (`#111715`). The two
headers differ by one shade in dark mode, which may read as unintentional layering.
Align both to `--color-bg-page` or document the intentional elevation difference.

VersionPanel has explicit `.dark` overrides (VersionPanel.css:332–363) targeting
background, borders, and action buttons. SlashCommandMenu and VariablePicker also
have `.dark` blocks. These are correct and complete relative to the token stack.

---

## 9. Reuse with Plan Review — Config-Driven vs. Fork

### What is Config-Driven Today

`TemplateEditor` (TemplateEditor.tsx:35–46) accepts:
- `initialDocument?: Document` — pre-populated blocks
- `onChange?: (document: Document) => void` — parent-controlled state
- `placeholder?: string` — first-block placeholder text
- `showPreview?: boolean` — debug serialized output
- `className?: string` — BEM modifier passthrough

This is sufficient for: blank template, AI-generated template, and loaded existing
template (all three entry states from the flow diagram). The block schema is
content-agnostic — any structured prose fits.

`VersionPanel` is fully data-driven via `VersionPanelProps` (VersionPanel.tsx:28–35):
`isOpen`, `onPreviewVersion`, `onRevertToVersion`, `previewingVersionId`. Mock data
is co-located (VersionPanel.tsx:41–93) and should be extracted to a prop or context
before production use.

### What Would Need Forking

1. **Email header fields** are inlined in the page component
   (TemplateEditorPage.tsx:140–213), not inside `TemplateEditor`. If this editor is
   reused for non-email contexts (e.g., push notification or in-app message), the
   header fields section must be conditionally mounted by the page, not the editor.
   This separation is already correct.

2. **Variable schema** is hardcoded in `VariablePicker` via mock data from
   `lib/mockQuickbase.ts`. Reuse across different Quickbase environments or different
   table schemas requires a `variables` prop or a context provider injected at the
   page level. Today this would need a fork of VariablePicker.

3. **Slash command registry** in `SlashCommandMenu` would need extension if a
   non-email context requires different block types (e.g., table block, attachment
   block). The command list is currently static inside the component.

4. **VersionPanel vs. VersionHistoryPopover**: the two surfaces are parallel
   implementations serving the same conceptual need. TemplateEditorPage uses
   `VersionHistoryPopover` (header-anchored popover); BuilderPage uses `VersionPanel`
   (side panel). If these converge in product, one should be the canonical composite
   with a `displayMode: 'popover' | 'panel'` prop rather than two codebases.

---

## 10. System Fit — Generic Rich-Editor vs. Email-Tuned

`TemplateEditor` is an **email-tuned** editor, not a generic rich-text primitive.
Evidence:

- **No inline format bar**: bold, italic, link, and text color are absent. These are
  standard in generic rich editors and intentionally excluded here, because email
  notification templates in a business context have limited styling needs. The iA
  Writer inspiration (noted in TemplateEditor.css:3) confirms this editorial
  constraint is deliberate.

- **Variable system is first-class**: `{{` trigger and chip rendering are baked into
  the inline model, not a plugin. This is email/notification-specific.

- **Block set is email-appropriate**: heading, paragraph, list, quote, code. No tables,
  embeds, callouts, or images. The set matches what renders predictably across email
  clients when serialized.

- **Serialization target**: `serializeToTemplateString` outputs a template string with
  `{{variable}}` syntax (referenced in TemplateEditor.tsx:9, 1267). This is not
  a generic format (HTML, markdown, JSON) — it is an application-specific template
  language.

If a future case study needs a generic editor (e.g., page builder body copy), a
separate primitive should be created that removes the variable system and adds inline
formatting. Extracting the block schema (`types.ts`) and `InlineRenderer` as shared
primitives would be the clean separation path.

---

*All line citations are to files as read on 2026-04-22 on branch `workflow`.*
