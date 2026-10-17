# 02 - Peer companies: designers prototyping in code (research, 15 Oct 2026)

Scope: what companies similar to Quickbase have publicly shared about designers prototyping in code / AI prototyping / designers contributing code.
Method: WebSearch + WebFetch, 2025-2026 primary sources preferred. Search quota was rate-limited mid-run, so some companies got thin coverage (see "Coverage gaps").
Convention: [verified] = I fetched the page and read it (via fetch summarizer). [search-only] = surfaced in search snippets, page not read. [unverified] = claim I could not trace to a page I read. Quotes are <=15 words.

---

## TL;DR (read this first)

- **Best-evidenced peer pattern = Atlassian + Adobe + Notion + Hinge Health.** Four different shapes of the same idea: *shared, guard-railed environment + design system as machine-readable context + champions/training + engineer review.*
- **Nobody credible hands designers a raw production repo and says "go".** Every success story has one of: a prototype-only repo (Notion), an internal wrapper app (Adobe Protopack), templates (Atlassian), or a scoped "low-risk PR" lane with normal eng review (Hinge Health, Relevance AI).
- **Design system quality is the precondition, not a nice-to-have.** Atlassian: ~70% DS accuracy one-shot, fixed to near-zero errors with templates + instructions. Dropbox designer: AI "exposes" detached components and missing tokens.
- **Git is abstracted, not taught.** Notion: a `/deploy` slash command does branch + commit + PR + CI. Atlassian: remote dev environments, nothing installed locally. Adobe: Protopack wraps GitHub, keys, MCP.
- **Failure mode to plan for:** prototype code is not production code. Engineers rewrite ~half or all of it. Treat prototypes as communication artifacts unless there is an explicit, scoped, reviewed PR lane.
- **Little public info on security/IT approval** at these companies. The hard constraints show up indirectly: Adobe deploys behind the corporate firewall; Microsoft keeps data in internal domain; Claude Design is off-by-default for Enterprise orgs; GitLab publishes an approved-AI-tools list.

---

## Atlassian (strongest source set)

### 1. "Turning Handoffs into Handshakes: Integrating Design Systems for AI Prototyping at Scale" [verified]
- Authors: Lewis-Ethan Healey (Lead Design Technologist - AI) and Kylor Hall (Principal Prompt Engineer). Inside Atlassian blog, 26 Nov 2025.
- URL: https://www.atlassian.com/blog/design/turning-handoffs-into-handshakes-integrating-design-systems-for-ai-prototyping-at-scale
- Key points:
  - ~2,000 lines of custom instructions in a single `guidelines.md` (tokens, icons, buttons first). "Fast" template = 2k lines / 8 component packages; "Full" = 2.5k lines / 17 packages. 50+ packages searchable via MCP (`@atlaskit/ads-mcp`).
  - Pre-coded **templates** (instructions + feature flags + navigation + theme switcher) + JSON config for deterministic changes (e.g., logo swap). Errors dropped "to nearly zero".
  - Screenshot to prototype: "about 70% ADS accuracy in one pass", improves with iteration.
  - People model: Design Ops + Design System team built self-serve courses; **champions program (6-10% of users trained as experts)**; workshops + structured courses + real projects.
  - Known limits: production-quality code generation at scale still hard; evals/benchmarks under development; agentic content needed ~6 months of iteration.
  - Where prototypes live: vendor AI prototyping tools, started from templates (not production repo).
- Quote: "Templates became our secret weapon" (paraphrased by summarizer; check original wording before quoting).

### 2. "Design Technologists: turning creativity into code" one-pager (Teamwork Lab, Apr 2026) [verified - PDF read locally]
- URL: https://atlassianblog.wpengine.com/wp-content/uploads/2026/04/ai-design-technologists-and-transformed-sdlc.pdf
- Role: Design Technologists build coded prototypes, **handoff tooling/automation (token migration, extensions, scripts)**, and AI-integrated design-system scaffolding so "anyone can spin up realistic, on-brand, coded prototypes in minutes".
- Numbers (Atlassian-reported): 12,000+ AI-powered prototypes across teams; 35% MoM growth in AI prototyping activity; 92% of PMs/designers say prototyping significantly affects decision-making; 42% report faster delivery. PMs/designers get to "~70%-accurate, mid-fidelity prototypes".
- Quotes by Maria Christley (Head of Atlassian Design System) and Lewis Healey (Principal Design Technologist) on handoffs becoming "handshakes" / decisions shifting earlier.
- Takeaway for Quickbase: a **dedicated design-technologist role** (not every designer) builds the rails; that is how 85% adoption is achieved.

### 3. "A design technologist's take on AI Builders Week" [verified]
- Katie Langerman (Lead Design Technologist) with Laura Huerta (Design Ops), 10 Mar 2026.
- URL: https://www.atlassian.com/blog/ai-at-work/a-design-technologists-take-on-ai-builders (also /blog/design/ variant)
- 1,400 designers + PMs, 31 sessions, 108 presenters/mentors, 240+ builds, 96% positive; 85% of designers/PMs actively use AI prototyping tools.
- **Onboarding trick:** designers/PMs set up a **remote development environment without downloading code locally**, ran dev servers, and opened PRs with product engineers (Bitbucket, Rovo Dev, Cursor, Replit). One group opened a production PR for a Trello feature.
- Lesson: friction in env setup is where design technologists add value; teams moved Figma -> Replit -> Cursor as ambition grew.

### 4. "Behind the scenes: Atlassian AI Builders Week" [verified]
- Kathleen De Lara, 13 Apr 2026. URL: https://www.atlassian.com/blog/how-we-build/behind-the-scenes-atlassian-ai-builders-week
- 77% of PM org and 80% of Design org attended (search snippet); Rovo Dev used to explore the front-end monorepo; 96% positive; 95% reported concrete implementable changes.
- Public kit: "Builders Week in a Box" https://aibw.atlassian.com/ [search-only]

### 5. "How to make your design system AI-ready" - Hardik Pandya (Atlassian) [search-only; original URL not found]
- Secondary: https://dive-club.beehiiv.com/p/templates-recipes (surfaced in search; not read)
- Three mechanisms: **token layer** (AI picks from a closed set of named tokens), **audit script** (flags hard-coded values), **sync routine** (flags stale spec files when the DS ships). Cites Atlassian, Carbon, CMS Design System, Nordhealth as examples.
- Directly relevant: this is the same shape as a Pave design-system MCP + validate-CSS tool.

---

## Adobe (best "wrapper app for designers" example)

### "The systems behind AI-assisted prototyping at Adobe" [verified]
- Author: Adobe Design (no byline), date not stated. URL: https://adobe.design/ideas/the-systems-behind-ai-assisted-prototyping-at-adobe
- Designers gravitated to Cursor and Claude Code on their own. Adobe built **Protopack**, an internal desktop app that handles: local env setup, authentication, connections to internal services, pulling in Spectrum (DS) components and guidance, GitHub + API keys + MCP preconfigured.
- Prototypes deploy via an internal hosting service **behind the corporate firewall**, with real service access.
- Community **starter packs** (e.g., Photoshop, Acrobat) contributed by designers and engineers; "remixing is easy".
- Governance: guardrails so designers can work in shared production codebases; contributions "clear, reviewable, and reversible".
- Stated philosophy: not turning designers into engineers; removing barriers.
- Quote: "Prototypes no longer sit isolated on personal machines or circulate only as screen recordings."

---

## Notion (best "prototype-only shared repo" example)

### Brian Lovin (designer, Notion AI) on How I AI, Feb 2026
- Lenny's: https://www.lennysnewsletter.com/p/i-havent-written-a-single-line-of ; write-up (Claire Vo, 23 Feb 2026): https://www.chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows [verified via summarizer]
- **One shared Next.js app in one GitHub repo, namespaced directory per designer** (no collisions), file-based, no backend DB, shared Notion design-system components.
- **`/deploy` slash command** automates branch creation, commits, PR, CI monitoring, auto-fixes lint/type errors. Non-technical users never touch git; GitHub Desktop remains an option.
- Prototype PRs: code review optional, merged after CI passes (because the repo is prototype-only).
- **`/figma` command**: pulls Figma frames via MCP, generates Next.js/Tailwind, verifies with Chrome DevTools MCP, loops up to 3 times. First pass ~80% complete.
- Custom skill to find valid icon names (5,000+ icons) to stop broken imports.
- Quote: "I haven't written a single line of front-end code in 3 months" (episode title).
- Not covered publicly: security review, hosting, IT approval.

---

## Hinge Health (best "staged, scoped PR lane" example)

### "How 100% of our designers shipped production code within one month" [verified]
- Nima Habibi-Beltijeh, Director of Product Design, 2 Jul 2026. URL: https://rnd.hingehealth.com/blog/how-100-of-our-designers-shipped-production-code-within-one-month
- Goal: every designer ships one production PR in a month. Result: 100%.
- Onboarding: local dev setup took "a few sessions" per designer; documented guides, **office hours, 1:1 support**; a simplified first-PR pathway agreed with engineering.
- Tools: Claude Code + Figma MCP. Standard eng PR review + QA review. No special merge rights.
- Scope: "low-risk" only - typos, color bugs, DS misuse, small interaction fixes, component improvements. **Explicitly excluded: major feature development.**
- Lessons: initial anxiety (fixed by incremental wins); exposed DevEx friction; next phase needs stronger code-quality standards and DS alignment as volume grows.
- Caveat: engineers, not designers, own quality; they are mid-size enterprise-ish (health tech, regulated) - useful comparator.

---

## Dropbox

### Sara Clayton (Designer, Dropbox), "Lessons learned in AI and design workflows", 13 Sep 2025 [verified; posted on Josh Cusick's Substack]
- URL: https://joshcusick.substack.com/p/lessons-learned-in-ai-and-design
- Four lessons: (1) generated code needs engineering refinement before production; designers own "fit-and-finish"; (2) **AI exposes weak design systems** - detached components, missing tokens, inconsistent colors; (3) **internal champions** (on Dash) made Cursor more capable so other designers can spin up **staging branches** with production-ready code; (4) critical thinking - AI lacks context on prior decisions.
- Quote: "Generated code isn't production-ready out of the box."
- Search snippet [search-only]: Dropbox gives enterprise access to ChatGPT, Cursor and Figma Make; two DS engineers built an MCP server on the design system during Hackweek; one Dash designer's Cursor code shipped only after engineers refactored it.
- Cursor case study (Ali Dasdan, CTO, 26 Jan 2026) is engineering-only (90% adoption, 1M+ lines/month) - not about designers: https://cursor.com/blog/dropbox [verified]

---

## Intercom

- **Fin/Intercom internal rollout** - Andrii Yakovenko, 23 Mar 2026: https://ideas.fin.ai/p/we-gave-claude-code-to-everyone-at [verified]. Same Claude Code engineers use, with **one-click install** wiring Snowflake/Drive/Slack and domain skills; a **publishing platform** turns conversations into shareable versioned web apps with URLs. 1,000+ users in a month, 300+ weekly, 330 pages in a week, 60% of Director+ using it. Gaps: no detail on guardrails, git, or failures.
- **Brian Scanlan (Senior Principal Engineer) on Lenny's, 20 Apr 2026**: https://www.lennysnewsletter.com/p/how-intercom-2xd-their-engineering [verified]. Headline: R&D throughput ~2x in 9 months; designers/PMs/TPMs also ship via Claude Code. Fetch gave no designer-specific detail.
- "Designers Playground" in Claude Code (temporary controls to fine-tune positioning in the real product) [search-only; surfaced via a LinkedIn-based snippet - original not found].
- **Older precedent (2017)**: Lorcan Coyle, "Shipping code for designers, not just engineers" - a workshop demystifying shipping code; led to shared vocabulary, designer code reviews, designers' own PRs; rule of thumb: copy/CSS/animation yes, rewriting JS behavior no. https://www.intercom.com/blog/?p=12069 [search-only]. Useful as proof the *training workshop + scoped boundaries* model predates AI.

---

## Gusto

- Eddie Kim (CTO) on How I AI, 29 Jun 2026: https://www.lennysnewsletter.com/p/no-figma-no-jira-no-docs-how-gusto ; https://www.chatprd.ai/how-i-ai/how-gusto-built-a-new-product-line-in-10-weeks-with-claude-code-no-jira-and-no-docs [verified]
- Gusto Cofounder built by 3 engineers + 1 designer (Katie Chen) in 10 weeks. Designer shipped **feature-flagged UI skeletons with canned data** to production; engineers wired real logic. Designer reached the 94th percentile of code throughput in the R&D org. PR review (median ~9 min) was the design checkpoint.
- Caution: tiny, elite, greenfield team; no design system mentioned; not representative of a 10-designer org with 5,000 customers on legacy code.

---

## Microsoft

- Quirine van Walt Meijer (Computational Design Manager), "Vibe coding makes prototyping close to code, closer to users", 21 Aug 2025: https://microsoft.design/articles/vibe-coding-makes-prototyping-close-to-code-closer-to-users/ [verified]
- Internal prototyping tool in plain HTML/CSS/JS; GitHub Copilot in VS Code for designers; **UX engineers guide designers through context engineering and secure setup**; secure internal environments so designers can experiment with protected data; keeps work within the org domain rather than third-party providers; accessibility (ARIA, tab order, reflow) baked into prompts.
- Quote: "we all need to be mindful of where our data goes" (paraphrase of the article; verify wording before quoting).
- Separately: Microsoft reportedly encouraged non-developer staff (incl. designers, PMs) to use Claude Code for early prototypes - https://letsdatascience.com/news/microsoft-encourages-nontechnical-employees-to-code-06146b72 [search-only].
- Aparna Chennapragada (CPO, Experiences + Devices) on prototyping with AI, May 2025: https://echai.ventures/how-founders-use-ai/design-prototyping/why-prototype-with-ai-before-hiring-a-designer [search-only]. Fluent/Power Apps-specific designer-in-code material: not found.

---

## GitLab

- Pedro Moreira da Silva (@pedroms), "AI usage in UX" handbook page (MR created 21 Aug 2025, edited 22 Sep 2025): https://handbook.gitlab.com/handbook/product/ux/how-we-work/ai-usage ; MR https://gitlab.com/gitlab-com/content-sites/handbook/-/merge_requests/15473 [handbook page fetch returned no usable body; MR summary verified].
- **Approved tools list** (Claude, Dovetail, FigJam, Figma Design, Figma Make, GitLab Duo, Rally per search snippet); guidelines on data safety, prompt writing, bias checking, transparency; AI "should assist rather than replace" judgment.
- **AI Up-Skill for product designers**, Module 1 (~5 h): 2 h learn (usage guidance + "Vibe Coding 101 with Replit") + 3 h build (a Claude helper; a prototype in Replit/Builder.io/Bolt/HeroUI/v0/Lovable evaluated against GitLab's AI UX heuristics) + reflection. https://gitlab.com/gitlab-org/gitlab-design/-/issues/2923 [verified]
- Takeaway: a **cheap, time-boxed, self-paced curriculum with a Slack channel**, and a public approved-tool list. GitLab prototypes in vendor tools, not the repo.

---

## Salesforce

- **SLDS 2 AI Starter Kit**: gives Cursor/Claude/AF Vibes the context to generate SLDS 2-compatible components, with a local preview environment that checks light/dark mode "no org required". Source: Trailblazer Community post https://trailhead.salesforce.com/trailblazer-community/feed/0D5KX00000pNQ4S0AW [search-only; page not read]. Pattern = DS-as-AI-context kit plus local preview. No designer-process material found.

---

## Datadog

- Design system DRUIDS used by 100+ designers, thousands of engineers, 30+ products; job-post language: agents write a growing share of interfaces, designers working in code [search-only, job listing].
- Claude Design launch (Anthropic, 17 Apr 2026): Aneesh Kethini (Product Manager, Datadog) quote on faster prototyping: "Prototyping is dramatically faster, enabling live design during conversations." https://www.anthropic.com/news/claude-design-anthropic-labs [verified]. Vendor-sourced.
- **Enterprise control fact from same page:** Claude Design is **off by default for Enterprise orgs**; admins enable in Organization settings; it builds a design system by reading codebase + design files.

---

## Zendesk, Pendo, Miro, ServiceNow (hiring-signal only; no primary process write-ups found)

- **Zendesk** - Design Systems (Garden) role copy: designers "prototype in code with agentic IDEs" when a static mock cannot answer the question [search-only; I could not locate the posting text - the Built In Dublin posting I fetched did NOT contain this; treat as [unverified]]. Garden structure: designers and engineers in the same team.
- **Pendo** - Product Designer postings: LLM-assisted exploration, Cursor/Claude prototyping, code-level prototypes validated with users before engineering investment; familiarity "evaluated in practice". https://jobs.firstmark.com/companies/pendo/jobs/82241414-staff-product-designer [search-only, job posting]
- **Miro** - Staff Design Engineer posting: "prototyping in code" as the honest medium; also sells its own canvas prototyping product. https://startup.jobs/staff-design-engineer-miro-8062546 [search-only]
- **ServiceNow** - postings for an "AI-native design system" with data pipelines/automation for design-to-code; designers' rapid-prototyping tools listed as Axure/Framer/Principle (i.e., not yet code-first) [search-only].

---

## Knak (smaller B2B SaaS, but best repo-prep story)

- Jack Steele (Director of Engineering), 7 May 2026: https://knak.com/blog/claude-code-streamlining-at-knak/ [verified]
- **A tiger team of developers spent six weeks making the repo a safe, productive prototyping place for designers before rollout.** Claude configured as a *prototyping collaborator, not a coding collaborator*. One branch with a designer profile + three skill files. Prototypes bounded by existing codebase components. Reported: fewer handoff cycles, earlier feasibility detection, better edge-case discovery.
- Quote (Megan Pollock): "getting into the code has actually made me a better, more detailed, designer."
- Gap: no formal onboarding, security process, or failures described.

---

## Mattermost (mid-size, open-source; documentation of a designer-facing guide)

- Matt Birtch, "Claude Prototyping Guide for Designers", updated 14 Apr (2026) [verified at index level]: https://mattermost.atlassian.net/wiki/spaces/DES/pages/4460249102/Claude+Prototyping+Guide+for+Designers
- 9-section path: prerequisites/mental models, terminal comfort, env setup, first prototype in Claude Code, Cursor as IDE, Figma MCP, prompting patterns, troubleshooting, **first-week guidance**, **credits/model selection and cost estimates**. Goal: "idea to a working, shareable URL in under an hour". For designers "comfortable in Figma ... without becoming engineers". Child pages not read (git, data policy details unknown).
- Good template for the *shape* of a Quickbase onboarding doc, including cost transparency.

---

## Relevance AI (small company, strongest "engineering safety net" playbook)

- Freya Stockman (Product Designer), "How Engineers Can Enable Designers To Ship Production Code Safely", Web Directions Next 2025: https://conffab.com/presentation/how-engineers-can-enable-designers-to-ship-production-code-safely/ [verified at abstract level]
- Git essentials (branch/commit/push/revert); document current components/APIs/auth/risks first; phased implementation plans; feasibility tests; **small PRs**; **draft PRs with early questions**; designer-engineer **15-20 min daily check-ins**; effort split **70% planning / 20% execution / 10% pairing**; track comment-to-code ratio in review as a learning vs rework signal. Treats designers like junior devs under supervision.
- Via https://www.toolsforhumans.ai/blog/your-designers-and-pms-can-ship-code-now-heres-what-that-actually-means (Alec Chambers, 13 Apr 2026) [verified]: playbook = define boundaries, assign named engineer owners with response windows, 30-day pilot with one willing person. epilot: 11 non-technical staff opened 40 PRs in 60 days (~6% of PRs).

---

## Others with useful material

- **GOV.UK Prototype Kit + HMCTS** (public sector, but the canonical "prototype kit built on the real design system"): kit is "designed for prototyping, not for production code"; needs only HTML/CSS; ~30 min install; shareable online. https://prototype-kit.service.gov.uk/docs/principles [verified]. HMCTS trained content designers with a workshop: HTML basics, kit mechanics, command line, GitHub workflow (branching, PRs, deployment); takeaways "coding is not as scary as you first think" and hide-don't-delete for versioning (Nadege Preston and Ros Boyes, 31 Oct 2022) https://insidehmcts.blog.gov.uk/2022/10/31/developing-digital-prototyping-skills-how-interaction-designers-trained-content-designers/ [verified]. Old but a proven non-technical training format.
- **The Design Project** (Dianne Alter, 9 Apr 2026), "Claude Code for designers: from wireframe to pull request": https://designproject.io/blog/claude-code-designer-workflow/ [verified]. Rules: say "PR" in the first prompt; review the plan first; commit often; **PRs of 80-200 lines**; follow repo contribution guidelines; accessibility check; "works best with existing design systems".
- **Anthropic internal** (claude.com, 24 Jul 2025): Product Design team feeds Figma to Claude Code in autonomous loops; uses it to map error states/logic flows/edge cases at design time; automated PR comments via GitHub Actions. https://claude.com/blog/how-anthropic-teams-use-claude-code [verified]. Not a peer, but source-of-truth for the tool.
- **Base44** (Wix; Pave competitor) - "Base Code" launch: cloud platform for engineers/designers/product to work on GitHub repo code in sandboxes [search-only: https://devops.com/base44-unveils-ai-platform-to-transform-application-development/]. A claim that a Base44 designer spends ~90% of time in Claude Code and opened ~150 PRs in 2 months surfaced in a search summary but I could not find the page: [unverified].
- **Zapier** - Powered-by-Zapier team prototypes with v0 in "a few hours" vs weeks (Michelle Chu, technical lead): https://vercel.com/blog/how-zapier-scales-product-partnerships-with-v0 [search-only; vendor case study]. Zapier marketing hackathon after mandating Cursor/Claude Code/Codex: 57 shipped, 87% participation [search-only: createwith.com]. No design-team code process found.
- **Failure story** - Ruslan Vashchenko (Head of Design, Phenomenon Studio), 14 Aug 2026: designer-built AI prototype took 80 hours; devs rewrote the frontend. Reasons: duplicate components (a new date picker per form), no DRY/component library use, hidden vulnerabilities found only in audit, UX gaps. ~50% of AI code refactored before production. https://hackernoon.com/im-a-designer-i-built-an-ai-prototype-in-80-hours-why-devs-rewrote-the-frontend-from-scratch [verified, agency perspective].
- Enterprise approval background: Cursor's own docs note code data is sent to Cursor servers; enterprise approvals typically hinge on SOC 2, admin controls, audit logs, and often GitHub Copilot as the default procurement path. https://aurascape.ai/answers/cursor-security-questions-enterprise-approval/ [search-only, vendor-ish].

---

## Coverage gaps (searched, nothing usable found)

HubSpot, Asana, monday.com (only Vibe DS/AI-engineering job copy), Smartsheet, Workday, Retool (competitor product material only), Rippling, Webflow, Canva (only MCP + Claude Design CEO quote), Brex (only an engineering Claude Code customer story: https://claude.com/blog/how-brex-improves-code-quality-and-productivity-with-claude-code [search-only]), Shopify (Polaris/Dev MCP only: https://shopify.dev/docs/apps/build/devmcp [search-only]; no designer-process piece found), Microsoft Fluent/Power Apps specifically. Worth a second pass with direct fetches of their engineering/design blogs.

---

## Patterns

1. **Four environment shapes, in rising order of investment:**
   - *Vendor AI builder + template* (Atlassian, GitLab): lowest risk, DS accuracy depends on templates/instructions.
   - *Shared prototype-only repo* (Notion): per-designer namespaces, `/deploy` abstracts git, review optional because it never ships.
   - *Wrapper app on top of agent + DS + firewall hosting* (Adobe Protopack, Microsoft internal tool): highest governance, biggest build cost.
   - *Scoped production PR lane* (Hinge Health, Relevance AI, Gusto, Dropbox staging branches): real code, normal eng review, low-risk scope only.
2. **Design system as machine-readable context is the unlock.** Atlassian (guidelines.md, MCP, templates, token layer, audit script, sync routine), Salesforce (SLDS 2 starter kit), Adobe (Spectrum tokens/components/docs), Dropbox (DS MCP built at Hackweek), Shopify (Dev MCP with Polaris). Without it, AI outputs are generic and engineers rewrite.
3. **Abstract git; do not teach it.** Slash commands (Notion `/deploy`), remote dev environments (Atlassian), wrapper app (Adobe), GitHub Desktop as fallback. Where designers do learn git (HMCTS, Relevance AI), it is a short workshop plus pairing.
4. **Champions + a dedicated enabler role.** Atlassian: design technologists + champions at 6-10% of users. Dropbox Dash: internal champions. Hinge: office hours + 1:1s. Knak: dev tiger team for six weeks before rollout.
5. **Scope fences beat trust.** Hinge: low-risk list, no feature work. Intercom (2017): copy/CSS/animation yes, JS behavior no. Relevance: small PRs, draft PRs, named engineer owners. Feature flags (Gusto) as a production safety valve.
6. **Prototype-vs-production must be explicit.** GOV.UK kit says so in its principles; Dropbox, Phenomenon and Atlassian ("production-quality ... remains challenging") all report engineers refactor or rewrite. Prototype = communication artifact; PR lane = separate, governed.
7. **Training formats that work:** time-boxed self-paced module (GitLab ~5 h), themed build week with mentors (Atlassian ~1:13 mentor ratio by headcount: 108 for 1,400), PR-in-a-month challenge (Hinge), workshop + hands-on exercise (HMCTS/Intercom), first-week guide + cost guide (Mattermost).
8. **Measured outcomes are mostly adoption/self-report**, not quality: Atlassian 12,000+ prototypes, 92% say decision impact, 42% faster delivery (self-reported); Hinge 100% shipped one PR; Gusto designer 94th percentile throughput; epilot 6% of PRs from non-engineers. **No one published defect rates or rework cost for designer-authored code.**
9. **Failure/risk themes:** duplicated components and DRY violations; hidden security issues; huge PRs engineers can't review; accessibility regressions; reviewers become the bottleneck ("bottleneck shifted from writing to reviewing"); initial designer anxiety; DevEx friction exposed; design-system gaps exposed.

---

## Enterprise constraints checklist (what peers did or implied; use as a pre-flight for Quickbase)

Tool approval and data
- [ ] Which agent/IDE is approved (Claude Code, Cursor, Copilot)? GitLab publishes an approved list; Dropbox gives enterprise Cursor/ChatGPT/Figma Make seats; Claude Design is off by default for Enterprise orgs (admin toggle).
- [ ] Data classification: what may enter prompts (customer data, internal APIs, secrets). Microsoft keeps prototyping inside internal domain with protected-data environments; Adobe hosts behind the firewall.
- [ ] Vendor review inputs: SOC 2, data retention/training opt-out, audit logs, admin controls (Cursor/enterprise vendors list these).
- [ ] Prototype hosting policy: internal-only URL / SSO-gated, never public (Adobe internal host; Intercom publishing platform with their own URLs and versioning).
- [ ] No real customer data or production credentials in prototypes; mock data or sandbox services.

Repo and access
- [ ] Decide the lane: prototype-only repo (no merge to prod) vs scoped production PRs. Do not give designers merge rights to production (every peer: normal eng review, QA).
- [ ] GitHub/SSO seats for designers; branch protection; CODEOWNERS for areas designers may touch; named engineer owner + response window per area (Relevance AI model).
- [ ] CI as the safety net: lint, type-check, tests, visual regression, accessibility check on every designer PR.
- [ ] Feature flags for anything that lands in production (Gusto).
- [ ] Remote/cloud dev environments to skip local setup (Atlassian) or an installer/wrapper (Adobe Protopack).

Onboarding and operations
- [ ] Enabler role/owner (design technologist or DS engineer) plus champions (Atlassian 6-10%).
- [ ] Repo prep sprint before rollout (Knak: six weeks, tiger team).
- [ ] Training: ~5 h starter module (GitLab), first-week guide + cost guide (Mattermost), office hours + 1:1 for the first PR (Hinge), mentors at build events (Atlassian).
- [ ] Git abstraction: slash commands/skills for deploy/PR; PR size rule of 80-200 lines.
- [ ] Cost governance: model selection, credits per designer (Mattermost cost estimates).

Design system readiness
- [ ] Tokens and coded components accessible to the agent (MCP, guidelines file, templates).
- [ ] Automated checks that catch hard-coded values and non-DS components (Atlassian audit script; Pave `validate_css` equivalent).
- [ ] Sync process so agent instructions track DS releases.
- [ ] Accessibility baked into instructions (Microsoft: ARIA, tab order, reflow).

Measurement
- [ ] Track: adoption, prototypes created, PRs by designers, review comment-to-code ratio (Relevance), rework/rewrite rate, time-to-first-PR, security findings. Peers mostly lack the quality metrics; defining them would be ahead of the field.
