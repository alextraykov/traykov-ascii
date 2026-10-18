# Case-study structure

The shape every case study follows, set by `case-studies/pages/pave-new-look.mdx` (October 2026). It is written for a head of design skimming in two minutes: what you owned, how fast, whether it shipped and how it landed come first; the craft follows.

## Order

1. **Summary** (`## Summary`): two short paragraphs. What the problem was, what you did and what shipped. Then one credit line: "Designed by … Implemented by …" plus thanks by name.
2. **Key numbers** (`case-stat`, no title): exactly four short values (at most about 6 characters each, for example `20`, `1 day`, `0`, `100%`), each with one plain sentence underneath. Use only real, attributable figures from the study.
3. **One link** (`case-link`), when the work is public: the place a reader can see it live.
4. **The hero visual**: the one interactive or moving piece that shows the whole story (a `case-scroll`, a `case-live` or a `case-video-copy`).
5. **How it landed** (`## How it landed` + `case-quotes`), only when there are real quotes. Attribute by role unless the person agreed to be named. No disclaimer line under it.
6. **The timeline** (`## …` + `case-timeline`), when the study has dates: "D Mon" dates give the day-cell rail; month labels also work.
7. **The chapters** (`##`): each one names a move, opens on the problem, shows the evidence (a figure) and ends on the decision or the rule it taught. Mark what shipped and what stayed a prototype with tags.
8. **In short** (`## In short`): one paragraph, the initiative's point in Alexander's own words.
9. **Related work** (`## Related work`).

The page's closing line and "Book a call" button come from `CaseStudyPage.astro`; do not add a contact section to the study.

## Layout rules (enforced in `global.css`)

- Text blocks (paragraphs, lists, key numbers, quotes, the timeline, the link) sit on the 640 px reading column. Figures run the full 860 px case width.
- One hairline where a block starts, never an ink rule, never a rule per item.
- Switches are plain-word tabs; the chosen one is ink with a 2 px underline.
- Interactive embeds carry a `hint:` notice ("Interactive · …") that disappears once used.
- No "What I'd keep"/lessons list: the point goes in **In short**.
