# Portfolio engagement plan

## Intent

Improve how people continue through the portfolio without turning it into a SaaS funnel. Release changes gradually, keep the site authored and personal, and measure only behavior that can inform a real decision.

## Guardrails

- No visitor-persona router.
- No newsletter popup, gated case study, chatbot, or fake gamification.
- No new dependency unless a later release truly requires one.
- Keep capture mechanisms quiet and contextual.
- Use the existing ASCII and printed-paper language, motion primitives, and reduced-motion contract.
- Publish only factual, confidentiality-cleared work.

## Release 0.1 — small discovery improvements

### Footer links

Add two links to the shared footer:

- `ASCII Studio` → `/svg-ascii-studio/`
- `Notes` → the existing Substack initially

The local files under `src/content/writing/` currently contain archive placeholders rather than full essays, so an internal Notes index should wait until real article bodies are available.

### Pave quick path

When the Pave walkthrough is ready, expose it through the existing case-reading tools rather than creating a separate viewing system.

Pin three anchor links above the full Pave table of contents:

1. `From working alpha to an actual product`
2. `Plan before spending credits`
3. `Rebuild navigation around the product Pave had become`

Optionally show the existing frontmatter role directly below the hero summary:

`MY ROLE / Design Manager + hands-on IC`

### Local contact anchors

On About and case-study pages, `Contact` should point to the footer on the current page with `#contact`, rather than navigating to `/#contact`.

## Release 0.2 — shareable case chapters

Add a small `Copy section link` control to case-study headings.

Behavior:

- Hidden at rest on pointer devices; visible when the heading is hovered or contains focus.
- Always keyboard accessible.
- Copies the canonical case URL plus the heading anchor.
- Shows a short `Copied` confirmation without a toast system.
- Falls back to selecting or exposing the URL when the Clipboard API is unavailable.
- Does not add animation beyond existing reveal/blink vocabulary.

This makes a specific product decision easy to send to a colleague without creating a separate case-study dossier.

## Release 0.3 — quiet continue reading

Store only the latest meaningful case-study position in `localStorage`:

```json
{
  "caseId": "designing-pave",
  "sectionId": "plan-before-spending-credits",
  "sectionTitle": "Plan before spending credits",
  "progress": 43,
  "updatedAt": 1784600000000
}
```

Rules:

- Update only when a real case heading becomes active.
- Store coarse progress, not a scroll history.
- Never auto-scroll.
- Never display a welcome-back message, streak, badge, or completion score.
- Offer one quiet link on the matching homepage project card: `Continue from “Plan before spending credits”`.
- Remove or replace stale state after a reasonable period, such as 30 days.
- Keep the case fully readable when storage is unavailable.

Ship this only after the project cards link to live case studies and there is a stable place for the continuation link.

## Release 0.4 — useful Vercel Analytics events

Use the installed Vercel Analytics package. Start with a deliberately small event set:

- `case_open` — a project card or internal case link was opened.
- `case_engaged` — the visitor reached 50% of a case or meaningfully played its walkthrough. Fire once per case per session.
- `second_proof_open` — after engagement, the visitor opened another case, About, Notes, or a polished experiment.
- `chapter_link_copy` — a section URL was copied.
- `continue_reading_open` — the saved section was reopened.
- `contact_intent` — calendar, email, LinkedIn, or mentorship was selected.

Use `sessionStorage` to synthesize one higher-value event when an engaged reader opens a second internal proof surface:

`qualified_exploration`

Recommended properties:

- `from`
- `to`
- `source`
- `case_id`
- `contact_type`

Never send names, email addresses, employer data, free text, full URLs containing sensitive parameters, or persistent visitor identifiers.

## Later — on-site Notes, Lab, RSS, and email

### On-site Notes

Build `/notes/` only after full article bodies exist. Keep Substack as the optional follow/subscribe destination at the end of an on-site article.

### Lab

Do not create `/lab/` just to collect links. First surface polished experiments contextually from About, cases, and the footer. Create an index only when the collection is large enough to need one.

### RSS

RSS is worth adding once Notes are genuinely hosted on-site because it is cheap, open, private, and requires no publishing platform or email collection. It is not useful while Notes only redirects to Substack.

### Email subscription

Add an email field only when there is a publishing cadence Alexander intends to maintain. Until then, link to the existing Substack subscription rather than creating a dormant promise on the portfolio.

## Suggested order

1. Footer links, Pave quick path, and local Contact anchors.
2. Copyable chapter links.
3. Vercel Analytics baseline.
4. Quiet continue-reading prompt after observing long-case behavior.
5. On-site Notes and RSS once real article bodies are ready.
6. Lab index or email capture only when the content volume justifies them.
