## Purpose

Defines concise, evidence-grounded public editorial presentation so the portfolio demonstrates work through concrete claims rather than generic AI language, defensive authorship copy, or invented outcomes.

## ADDED Requirements

### Requirement: Public editorial copy is evidence-grounded
Public case-study and locally stored note copy SHALL distinguish shipped behavior, prototypes, assumptions, and unmeasured outcomes. It MUST NOT introduce unsupported incidents, metrics, motives, quotations, user responses, or research findings.

#### Scenario: A visitor reads a public case or local note
- **WHEN** a claim describes product work, evidence, or an outcome
- **THEN** the claim is supported by the existing local source material or qualified as a limitation, prototype, or assumption

### Requirement: Defensive authorship claims are absent
Public page shells, cases, and note details MUST NOT display AI-slop-free labels or other defensive authorship disclaimers. Source attribution for imported and legacy writing SHALL remain visible.

#### Scenario: A visitor opens a case study or note detail
- **WHEN** the article header and body are rendered
- **THEN** the page presents the work and applicable source attribution without an authorship-disclaimer panel

### Requirement: Interface copy is direct and non-repetitive
Public headings, card metadata, contact prompts, labels, and calls to action SHALL state the relevant action or factual context once. They MUST NOT repeat page labels, numbered framings, or generic positioning statements when the title already communicates the intent.

#### Scenario: A visitor scans a public page family
- **WHEN** the visitor moves between homepage, Notes, About, Contact, CV, Labs, and case-study shells
- **THEN** labels make the next action or context clear without duplicated heading layers

### Requirement: Personal summary facts are supportable
About-page summary facts and metrics SHALL be directly supported by local source material. They MUST NOT imply unmeasured reach, product counts, organizational counts, or approximate totals as outcomes.

#### Scenario: A visitor scans the About summary
- **WHEN** the visitor reads the compact personal details
- **THEN** each detail is locally supportable and no unmeasured portfolio metric is presented as evidence

### Requirement: Imported writing is preserved
Live Substack and legacy imported prose SHALL remain unchanged except for existing shell-level source attribution and semantic heading adaptation performed by the content pipeline.

#### Scenario: A visitor opens imported writing
- **WHEN** the note source is synced or legacy content
- **THEN** its authored body remains intact and the source link remains available
