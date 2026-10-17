## Purpose

Defines calm, accessible public interaction behavior that provides continuity and feedback without hiding content, relying on hover, or reducing functionality for keyboard, touch, reduced-motion, and no-JavaScript users.

## ADDED Requirements

### Requirement: Public controls have equivalent accessible states
Public links, buttons, cards, forms, dialogs, search, and lab controls SHALL provide visible focus, pointer, and touch feedback using shared state styling. Information and actions MUST NOT be available only on hover.

#### Scenario: A keyboard or touch visitor uses a public control
- **WHEN** the visitor focuses, presses, or activates a navigation item, card, form, dialog, search result, booking action, or lab control
- **THEN** the control remains visible, identifies its state, and performs the same action available to a pointer visitor

### Requirement: Motion is calm and interruptible
Public motion SHALL communicate navigation continuity or explicit state feedback only. It MUST use the existing reveal, scan, scramble, rise-stagger, or blink vocabulary, prefer transform and opacity, remain interruptible during rapid input, and avoid routine blur, layout animation, and decorative loops.

#### Scenario: A visitor rapidly changes a public state
- **WHEN** the visitor rapidly hovers, focuses, toggles a dialog, navigates, or leaves a control
- **THEN** the current state settles without stale text, delayed navigation, blocked input, or lingering inline animation styles

### Requirement: Reduced-motion and no-JavaScript states are complete
Public content SHALL be readable at rest without JavaScript. With reduced motion, the interface MUST disable parallax and decorative loops, show reveal content immediately, and preserve all actions and outcomes. The About trail MUST expose a static image in no-JavaScript, reduced-motion, and mobile rest states and MUST NOT emit an ambient mobile trail.

#### Scenario: A motion-sensitive or no-JavaScript visitor opens a route
- **WHEN** reduced motion is enabled or JavaScript is unavailable
- **THEN** headings, content, links, forms, fallbacks, and essential controls remain visible and usable without forced animation

### Requirement: Dialog and form feedback preserves context
Public booking and walkthrough dialogs SHALL retain their real link or control fallback, move focus predictably, and restore focus after dismissal. Walkthrough triggers MUST expose their direct video href before enhancement. Contact submission status MUST remain text-based and exposed through its existing live region; Turnstile MUST load only when secure form sending is enabled and unavailable copy MUST direct visitors to email or booking.

#### Scenario: A visitor opens and closes an enhanced action
- **WHEN** the visitor opens then closes a booking or walkthrough dialog, or submits the contact form
- **THEN** focus returns to the triggering control and a visible non-motion status or fallback remains available
