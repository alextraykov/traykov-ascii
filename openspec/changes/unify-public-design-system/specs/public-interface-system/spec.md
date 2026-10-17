## Purpose

Defines a coherent, recruiter-scannable public portfolio interface while preserving its ASCII and printed-paper identity, existing routes, themes, and project-specific visual character.

## ADDED Requirements

### Requirement: Public pages use one readable hierarchy
The public portfolio SHALL present one primary heading per page and one clear heading per section. Supporting context MUST add information rather than repeat the heading, and mono typography MUST be reserved for controls and concise factual metadata while reading copy remains sans-serif.

#### Scenario: A recruiter scans a public route
- **WHEN** a visitor opens the homepage, case study, Notes, About, Contact, CV, Labs, or a linked public tool
- **THEN** the page exposes an unambiguous primary heading and section hierarchy without a duplicate eyebrow-heading pair

### Requirement: Shared visual primitives are tokenized
The public portfolio SHALL use the shared token system for public surfaces, borders, shadows, spacing, focus states, responsive behavior, and interaction timing. Public components MUST preserve square corners, automatic light/dark behavior, canonical breakpoints, and scoped case/lab identity tokens.

#### Scenario: A visitor changes theme or viewport
- **WHEN** a public route is viewed in either automatic theme at desktop or mobile width
- **THEN** surfaces, text, controls, spacing, focus indication, and project-specific identity remain readable without horizontal overflow

### Requirement: Project and case summaries prioritize evidence
Public project cards and case heroes SHALL expose their title, concise factual summary, and only useful status or reading-time metadata. They MUST NOT use a general eyebrow property or repeat a project category as decorative metadata.

#### Scenario: A visitor opens a featured case from the homepage
- **WHEN** the visitor scans or activates a featured project card
- **THEN** the card identifies the case, its factual state, and its action without a repeated "recent case study" label

### Requirement: Existing public compatibility is retained
The interface system SHALL retain primary navigation labels and order, public and legacy case routes, public/private case behavior, frontmatter fields, renderer output, automatic theme behavior, contact fallbacks, and WebGL-readable fallbacks.

#### Scenario: Existing public routes are revisited
- **WHEN** a visitor opens a canonical or legacy public route after the redesign
- **THEN** navigation, redirects, public content, and readable non-WebGL fallback behavior remain available

### Requirement: Reading tools preserve semantic reading order
Case-study reading tools SHALL precede article content in document and narrow-layout order. On desktop they MUST remain a normal-flow secondary column to the right of the article rather than a floating overlay.

#### Scenario: A visitor reads a case study on mobile or desktop
- **WHEN** the visitor reaches a public case study with reading tools
- **THEN** tools occur before the article on mobile and assist the article from a right-side desktop column without obscuring reading
