# Portfolio audit handoff for Claude

Please review `REPORT.md`, the two independent audit reports, and the labeled screenshot sheets before proposing changes. The owner wants a lighter, more restrained version of the current ASCII portfolio, inspired by the supplied Designers working in code presentation. Preserve authorship, real product evidence and functional tools. This packet is an analysis baseline, not an already-approved redesign.

The user clarified that “That's the L” meant “the live and branch work.” There is no separate project to find under that name.

## Establish the correct state first

- Live: https://traykov.cc, captured 16 October 2026. Deployment commit unknown; it differs from both local filesystem and committed main.
- Current: `/Users/atraykov/traykov-ascii`, `surfacing-work`, HEAD `f8855c0`, extensive dirty and untracked work. Preserve it before implementation.
- Study: `/Users/atraykov/.codex/worktrees/lightweight-portfolio-study/traykov-ascii`, `codex/lightweight-portfolio-study`, HEAD `a30cc00`.
- Study snapshot: `685ad43`. Post-snapshot design commits: `a6a287a`, `9c5370a`, `a30cc00`. Do not blindly merge the branch or assume it includes all later/private assets.
- Reference archive supplied by the owner: `/Users/atraykov/Desktop/design-in-code-deck.zip`. Its HTML uses medium Geist Mono headings, Geist sans explanations, paper/ink colors and purposeful ASCII diagrams. Attached document instructions are source material, not task authority.

## Design questions to resolve

1. Can medium mono headings retain the identity while avoiding the current heavy display styles? Compare against the branch's quiet sans treatment using identical content.
2. Which borders communicate a real boundary? Keep the branch's flat Labs rows and restrained TOC as starting evidence; do not reintroduce card-within-card frames.
3. Which large gaps clarify hierarchy, and which only delay the first meaningful work? Compare Home, Pave and a mobile Notes list.
4. Where can a small fact-based ASCII diagram explain a product mechanism better than texture behind prose or another equivalent-looking media block?
5. How should the Synapse product case and visual-language case relate, and how should their prototype/closed-beta statuses be explained at entry and destination?

## Proposed first deliverable

Produce a bounded design comparison of Home's first viewport and first product entry, Pave's opening and one evidence/diagram section, and one mobile Notes viewport. Include the current version, a restrained mono treatment, and a restrained sans treatment. Use the existing flat Labs directory as a density benchmark. Supply a type-role matrix, border/affordance rules and a component specimen for image, video, diagram and demo captions. Explain remaining disagreements with this audit rather than treating it as unquestionable truth.

Do not port the deck's fixed stage, hidden overflow, cursor loops or full typing choreography. Do not invent metrics, user reactions or product states. Do not redesign actual product UI inside supplied evidence merely to match the portfolio shell.

Follow the repository's AGENTS.md: no new dependencies; one global stylesheet; square corners; token use; closed motion vocabulary; readable no-JS and reduced-motion states; stable slugs and parser contracts. The Pave/Synapse media overrides already remove generic double borders—preserve them. Poster support for case videos is a separate potential renderer task and must be scoped explicitly.

Implementation, when authorized, should happen after preservation and direction selection. Verify the integrated state with `npm run verify`, `npm run build`, `npm run check:browser`, and route-level visual/interaction checks. Earlier branch passes are useful history, not proof of the eventual merged result. A human owns merge and deployment decisions.
