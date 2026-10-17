# Quickbase AI initiatives: data and sources

Compiled 15 Oct 2026 for the design-in-code discussion. Internal only.
Confluence links use `viewpage.action?pageId=` so they work without a space key.

## How we work with AI (design team)

| Initiative | Data | Owner | Source |
|---|---|---|---|
| Bebop 2 motion PRs | 9 merged in huey, engineering review (Radoslav, Marin) | Alexander | [huey PR #51442](https://github.com/QuickBase/huey/pull/51442) · Daniel's #ux-team post, 14 Oct |
| Claude Design process | v1, Bebop 2 packaged as 65 components | Chavdar Nedialkov | [Claude Design Process v1](https://quickbase.atlassian.net/wiki/pages/viewpage.action?pageId=6376063014) · [gap re-audit](https://quickbase.atlassian.net/wiki/pages/viewpage.action?pageId=6478561285) |
| Design Spine plugin | 7 Claude skills (v0.4.1), announced 2 Jul | Alexander + Eva Miranda | [QuickBase/design-spine-plugin](https://github.com/QuickBase/design-spine-plugin) |
| bebop-rapid kit (Core) | 24 Bebop 2 components, preview per branch | Alexander | [QuickBase/bebop-rapid](https://github.com/QuickBase/bebop-rapid) |
| vibe-design (Pave) | 29 prototype pages, token + a11y tests | Alexander (104/106 commits) | [QuickBase/vibe-design](https://github.com/QuickBase/vibe-design) |
| pave-ds-mcp | 9 tools, specs from 605 Figma symbols (62 sets) | Alexander | Local only, no remote yet |
| bebop2-baseline | 43 components, 173 tokens, 1,130 checks | Alexander | #design-team-hackathon-2026, 23 Jun |
| Pave design audit | 2,123 style gaps; 2% of screens match Figma; 642 of 1,003 still open (13 Oct) | Alexander | #pave-product-design, 2 + 13 Oct |
| Motion audit | 153 `transition: all` sites in 84 files | Alexander | `pave-north-star/03-eng-landing.md` |
| design-qa-audit skill | Playwright + axe, ends in a designer verdict | Alexander | `~/QA-design` |
| Bebop 2 in code | 21–23 components; adoption ~0.1% (6 vs 4,576 files) | Bebop 2 team | [QDS home](https://quickbase.atlassian.net/wiki/pages/viewpage.action?pageId=6011322475) · [success metrics](https://quickbase.atlassian.net/wiki/pages/viewpage.action?pageId=6576472099) · [contribution process](https://quickbase.atlassian.net/wiki/pages/viewpage.action?pageId=6737494017) · [Storybook](https://storybooks.quickbaserocks.com/bebop2-components/) |

## AI features we shipped (measured)

| Feature | Data | Window | Source |
|---|---|---|---|
| Pipelines AI | 57 → 862 accounts / month (~15×) | Aug 2024 → Aug 2026 | Pendo app 4923516481830912 |
| AI umbrella | 67 → 924 accounts | May 2024 → Jun 2026 | Pendo |
| AI Troubleshooting | 969 accounts in 5 months, 32.5% follow-through, 35% positive votes | Apr → Sep 2026 | Pendo |
| Pave share | 0.2% → 10–12% of weekly actives, held 7 weeks | Jun → Sep 2026 | Snowflake `LANDING_DB.PAVE.ANALYTICS_EVENTS_SECURE` |

Notes:
- Pave share is before/after with a cohort split, not causal (no holdout). Builder release (Nick Vanselow) and Share V2 (Simona Georgieva) were team releases. Publish rate stayed flat at 19–27%.
- Generate Steps fell 34% (Apr 2025 → Aug 2026). AI Product Help had 30% positive votes. Keep these honest negatives if anyone asks.

## Who else prototypes with AI

| Who | What | Source |
|---|---|---|
| PMs: Kevin Rau, Simona Georgieva, Ryan Murray | Claude Design prototypes, HTML files | #pave-product-design, Sep–Oct |
| Engineer: Ilia Todorov | `/huey-design` skill, PAv2 redesign in Claude Design | #claude-design, 1 Jul |
| Designer: Johnny Lee | Hosted HTML Pave prototype ("you could have had me fooled", Kevin Rau) | [Slack](https://quickbase.enterprise.slack.com/archives/C0AT9UB0CKG/p1789411685158969) |
