# Designing Pave: plain-language review draft

This is a review copy of the Pave case study. The content, facts, visuals and evidence labels stay the same. The sentences use simpler language for a 9th grade reading level. The live case study is unchanged.

## BLUF

I joined an early AI app builder made by engineers. I helped turn it into Pave, a public product with a clear builder experience, version control, planning mode, direct editing and a new navigation system.

```case-video-copy
title: Pave in 26 seconds
file: public/case-studies/media/pave-portfolio-loop.mp4

A quick look at the builder, Plan Mode, versioning and Direct Edit, plus an early workflow idea. The chapters below show what shipped and what stayed as a prototype.
```

```case-image-grid
title: The transformation at a glance
columns: 3
/case-studies/pave-evidence/scaffold-jan-2026-blinq.webp | 01 / Starting point | The first Blinq shell kept chat, build activity and the app preview in one workspace.
/case-studies/pave-evidence/plancard-light.webp | 02 / Product system | Plans, clear states and approval made the AI's intent easier to review.
/case-studies/pave-nav/manage-mode-builder-view.webp | 03 / Shipped product | The live Build/Manage header organized the product Pave had become. More Manage screens came later.
```

- Starting point: a working technical alpha with no clear product system, entry path or shared state language.
- What I did: research, product structure, coded prototypes, recovery, planning, editing, workflow exploration and engineering handoff.
- What shipped: Pave launched publicly, Direct Edit shipped and Navigation Phase 1 is live. I do not have a public adoption or retention number.

## The job

- **Role** Interim Design Manager and full-time IC on Pave
- **Timeline** December 2025 - today
- **Product evolution** Vibe UI -> Flint -> Blinq -> Pave
- **Public launch** [Quickbase announced Pave on April 28, 2026](https://www.quickbase.com/news/press-releases/quickbase-announces-pave) · [Pave is live](https://www.quickbase.com/pave)
- **Milestones** Internal product preview on April 14, 2026 / Navigation Phase 1 live on July 16, 2026
- **Scope** Product design, early research, coded prototypes, interaction models, design QA, rebrand work, motion detail and engineering handoff

I was managing the product designers while also acting as Pave's lead product designer. The nature of Pave as a product was that it grew while many of the rules were still being made. Initially there was no neat, enterprise process, no clear steps, no research to wireframes to handoff. I was researching, making screens, writing code and helping define the product at the same time, sometimes for multiple features in one day. A typical startup vibe.

## From working alpha to an actual product

As mentioned, I joined an engineer-built alpha that could turn a prompt into software using Quickbase's backend. The main loop worked: chat sent a request, the LLM generated the code and an iframe showed the result. The rest of the product was still unclear. Back then "Vibe UI" had screens, but no clear entry point, navigation, role model, build states or recovery behavior.

![FOUNDATION / MOCK CONTENT - The first coherent Blinq scaffold kept conversation, build activity and the generated application in one workspace.](/case-studies/pave-evidence/scaffold-jan-2026-blinq.webp)

Matthew Schweers was the engineering brain behind all of this (shoutout). Ryan Murray led the product direction. I was the first designer of the product, later joined by [Johnny Lee](https://www.johnny-lee.com/)  who led the visual and brand revolution.

## One workspace for chat, building and preview

As the product became Blinq, the sidebar, chat and app preview still did not feel like one builder.

```case-video-copy
title: Blinq builder clickthrough
file: public/case-studies/media/pave/blinq-builder-clickthrough.mp4

This coded clickthrough shows the first complete Blinq surface: entry, builder, themes, projects, notifications and the chat-and-preview relationship. The app names and data are prototype content.
```

I moved the main design work from Figma Make into a more robust repository on GitHub. 
1. I really didn't want to be charged for the same tokens I'm burning in Claude but with the extra cost.
2. I really wanted more freedom, robustness and power in terms of prototyping deliverables.

So, back to the building experience - we wanted more of the building process to happen inside chat. We even imagined all of it to happen there (in theory). So in my mind, that made it useful to keep chat beside the builder after the first app appeared -  preview stayed as the visual anchor and the feedback loop for the conversation: ask for something, see the app change, correct it and repeat.

The sidebar could expand and collapse, since it gave people more building space and less noise when they needed to focus. Chat and the builder used resizable columns, including the topbar, so dragging the split or changing modes did not make the whole app jump around. Now back then themes were a big deal, so we gave them more space instead of hiding them in settings. 2026 update: enterprise customers still ask for them often.

The top bar became a product-status area. Preview, Publish, Refresh and Live App had to stay clear without getting in the way of building. You can judge how well that worked in [the navigation rework](#rebuild-navigation-around-the-product-pave-had-become). (it really didn't)
The new Blinq navigation and its three role-based home views went live internally and with it we had a clear observation: a builder, an admin and an end user had different jobs. Giving them the same interface because they shared a login or homepage did not work.


## Component preview for engies to refer to
While I thought the prototypes I was delivering were clear enough, I decided to introduce a component preview pages so engineering had one place to check each new Blinq component: its states, visual design and intended motion. This was my first attempt to close the gap between a polished prototype and something engineers could inspect and rebuild in the product repository. The content is mocked because this is a handoff artifact.
```
```case-video-copy
title: Build status and component-state preview
file: public/case-studies/media/pave/blinq-build-status-preview.mp4


The build experience needed a few clear signals:

- The request was understood.
- Work had started and had steps.
- The generated app was changing in the preview.
- The person could take control again when execution finished.

I explored top-bar status, inline build steps, message queues and `SubagentBubble` components; this way active work expanded and completed work collapsed, so the preview kept every signal tied to the app.

The environment had reusable components, design tokens, dark mode, accessibility checks, motion rules and handoff notes based on states. I started to confuse the size of the repository with how easy it was for the team to use. [Direct Edit](#change-one-thing-without-regenerating-everything) exposed that gap.



## Sense of safety when building

Version history and reverting were already in the alpha. They were becoming common in AI builders, and enterprise users reasonably expected them.

I explored two ways to go back. The first stayed inside chat and tied recovery to the prompt that created each version. The second used a timeline where people could browse old versions, preview one in the builder and then revert to it. Together, these gave people two ways to find the same powerful feature.

```case-video-copy
title: Blinq version-history exploration
file: public/case-studies/media/pave/blinq-version-history.mp4

This prototype explores restore entry points in chat and a version timeline inside the builder. People could preview an older app before reverting to it.
```

```case-image-grid
title: Two ways back
columns: 1
fit: contain
/case-studies/pave-evidence/version-restore-entry.webp | Enter from chat or the timeline | Version dividers tied recovery to the prompt. The timeline gave people another way to browse.
/case-studies/pave-evidence/version-restore-commit.webp | Preview before reverting | The old app stayed visible in the builder while messages that would be removed became dimmed.
```

People needed to see which version they were choosing and what would disappear. The conversation dimmed every message after that version. The builder preview showed the older app in place.

“Go back” sounds harmless until the interface shows how much work “back” contains.

The alpha supported history and reverting. These interactions were early explorations. They did not make it into the product because priorities changed and versioning is hard to build well. I know that from working on Quickbase's core CI/CD and ALM systems.

The prototypes made one rule clear: show the effect before asking somebody to commit.

## Give email notifications an actual editor

Notifications had to carry real weight in Pave, epsecially since were building for enterprise teams with complex apps. Even then we knew a subject line and a textarea would not be enough. People needed to control what triggered a message, who received it, which app data appeared in it and who could edit it.

Back then this was probably the coolest feature I worked on in Pave. I had room to build a real editor and in just one day, I made a text editor prototype with Markdown, slash commands, schema-aware variables and a Build with AI mode. The message stayed visible while users managed the audience, triggers, schedule, permissions and rules on the right.

```case-video-copy
title: Variables inside the notification editor
file: public/case-studies/media/pave/pave-notification-variables.mp4

The prototype treated variables as part of the document instead of loose merge tags. This recording shows part of that variable flow. The full authoring model did not reach production.
```

```case-video-copy
title: Building an email notification
file: public/case-studies/media/pave/pave-notifications-builder.mp4

The prototype moves through the editor, variables, commands, AI-assisted writing and the related settings. The basic notification path shipped. Most of the richer editor and automation model did not.
```

![PARTIALLY SHIPPED / MOCK DATA - Core notification-management and template surfaces reached production. The deeper configuration did not all ship as designed.](/case-studies/screenshots/pages/notifications-light.png)

The scope grew because the problem was large. Record events and recurring schedules could both run. Changing the source table reset the recipients, trigger fields and conditions linked to it. Conditions became a nested AND/OR tree. The prototype covered light and dark themes, keyboard behavior, reduced motion and 84 end-to-end checks. For a design prototype, it was robust as hell.

We did not have the capacity to move all of that into production while other launch work was moving. The richer editor, variables, nested conditions and deeper scheduling were cut. The basic notification and template path shipped. Most of the authoring system went to scrap.

I still think that work could have become a stronger product, but we did not ship enough of it to prove that. What I can show is what I delivered. The released editor itself saw almost no adoption. Most notifications are created through chat, so credit to Pave's agents for making that path work.

## Plan before spending credits

Plan mode. Every GenAI platform of sorts had a plan mode; so we had to do it too.

When I actually started designing plan mode wanted to make it different because we had the expectation that our enterprise users would actually go in and plan something out but then potentially edit the planet itself in order to land the best output possible. So I designed Plan Mode around three steps: clarify the request, show the planned work in a sliding panel, with the option for the user to go in and edit the markdown plan themselves and once done - ask for approval before running it. A labeled Plan/Build segmented control was introduced to replace  icon-only modes. I built a `ClarifyCard` that's idea was to follow up and gather any of the missing details. The `PlanCard`  component carried the plan from creation through review and execution and `Approve & Run` made the result clear.

```case-video-copy
title: Plan Mode: clarify, review, approve, build
file: public/case-studies/media/pave/pave-plan-mode.mp4

The coded interaction shows clarification, a streamed plan, review and the move into execution. The dashboard, tasks and timings are mock content used to test the state model.
```

The PlanCard had eight states: generating, ready, generating steps, draft, executing, paused, completed and cancelled. The number only helped if copy, motion, actions and progress stayed in sync. A paused plan should not shimmer as if it is still working.

## Direct edit: Introducing granular change 
Once Pave could plan and generate, the next problem was clear. Prompting worked well for large changes, but it was clumsy for one exact edit. Initially the director was an extremely technical engineering based implementation. Dan allow uses to edit some CSS values directly, but it wasn't friendly in terms of UX. 

`Make this heading smaller` should leave the table below it alone.

```case-video-copy
title: Direct Edit and its interaction catalogue
file: public/case-studies/media/pave/pave-direct-edit.mp4

The recording moves from selecting and editing generated UI into the component-aware toolbar, state notes and motion catalogue used for implementation. The product data in the prototype is fabricated.
```

So what I did is I reviewed more than twelve AI builders and design tools and came to a conclusion - they kept using the same generic CSS controls for buttons, tables and charts, but that sort of felt insufficient.

So sat down and I came up with the idea for the selected element to become the unit of direct editing. Text got text controls. Charts got chart controls and templates. Forms, filters, detail views, badges and metrics got smaller sets of controls that matched their job.
 This way we introduce this way we remove the cognitive vote for the user to have expectations of how to edit things. That's why we remove the cognitive law of users that they need to have a preconceived idea of how the edit would look like in order to finish it up.  not all users are designers and even as designers sometimes struggle so that's why a simple prompt or a template could really take an edit a long way so that's why a simple suggestion or a template could kick-start editing process.
 
The next decision was to stage each change. Selecting an element created a clean state. Editing created a dirty state. Save and Discard stayed visible until the person saved or cancelled the change. AI-generated software already asks people to trust a black box. An immediate and irreversible local edit would have added another problem.

Johnny completed a visual and UI polish pass for Direct Edit and turned into something beautiful. Once that was done, I added the interaction timing, component-aware toolbar, motion catalogue and animated icon behavior to bring a truly delightful editing experience.

Design and Prompt shared one surface but had different controls - Save and Discard appeared only when there was a real change to resolve. Reduced motion lived in the working prototype so engineering could test it.
```case-image-grid
title: The interaction model behind Direct Edit
columns: 2
/case-studies/pave-evidence/direct-edit-toolbar.webp | Component-aware controls | The toolbar changed its controls for text, charts, forms and other selected elements.
/case-studies/pave-evidence/direct-edit-icon-motion.webp | Motion as specification | Timing and icon behavior lived in the working artifact, including reduced-motion states.
```

During handoff, one of our Principal Engineers mentioned that the Direct Edit handoff is by far the clearest and easy to navigate deliverable, and that almost all of the specifications had been built for release. Engineers stopped hunting through my filing system. That mattered more than the code-versus-Figma argument. It was a living proof that design can make a positive engineering impact.

## Explore how a workflow might become inspectable

While launch and Direct Edit were moving, we explored what might happen if Pave coordinated work across several systems instead of making one app at a time.

This workflow idea of mine never became a public product surface. On a later stage, Johnny Lee developed a much better version, but I still believe that I was able to influence the direction with this initial design. 
```case-video-copy
title: Early workflow concept: from intent to inspectable sequence
file: public/case-studies/media/pave/pave-workflow-builder.mp4

The WIP prototype moves from a workflow request through questions into a visible sequence and connected systems. It is an early product exploration that stayed outside the public launch.
```

The flow used three views: conversation, workflow definition and generated app. Chat stayed as the authoring surface. I kept the diagram short of a full visual-programming canvas. It showed what would run, in what order and against which systems.

The interaction asked questions, turned the answers into steps, showed required connections and allowed edits before a dry run and generation. If the workflow needed Snowflake and Slack, those dependencies appeared in the definition. “We will sort auth out later” is how demos become archaeological sites.

```case-image-grid
title: One explored workflow sequence
columns: 1
fit: contain
/case-studies/pave-evidence/workflow-sequence.webp | From request to runnable structure | Questions, steps and required connections stayed visible before dry run and generation.
```

Two designers tested an earlier flow. Three routes silently locked after connection errors.

The happy path made the diagram look safe. The broken path showed that it was also a promise. If the interface showed a staged workflow, it had to explain which step failed, whether earlier work was still valid and whether a retry would create duplicates.

The workflow concept stayed a prototype and WIP. It was not public. It belongs in the story because it tested how far the product model could stretch.

## Rebuild navigation around the product Pave had become

The first Blinq navigation shipped internally. Pave grew past it soon after.

Recent apps on Home could open a live app while the side navigation sent people to the builder. Content design flagged that “Builder” sounded like internal Quickbase language. Pave now included building, app use, permissions, data, publishing and governance. The shell still treated all of that like one long list.

It looked like sidebar cleanup at first. In practice, each new part of Pave needed a clear place to live.

Before shaping the redesign, I asked Kevin Rau for completion, drop-off, time-to-screen, search, support and enterprise-area usage data. Most of it was available in theory. The baseline numbers never arrived in the thread. The redesign used documented friction, Ryan's journey maps and the real permission model instead of a quantitative funnel. I am not adding a research chart to cover that gap.

Over three days, I turned five roles - Builder, End User, Admin, Realm Admin and Viewer - into task flows and storyboarded click sequences.

![RESEARCH ARTIFACT - The persona-flow board mapped five roles, storyboards and the routing question that organized the new IA.](/case-studies/pave-nav/persona-flows-board.webp)

The main routing question was simple:

- Is the question about the app's content? Stay in Build and use chat.
- Is it about access, data flows, releases or operation? Go to Manage.

Any task that did not fit showed a problem in the information architecture.

That led to a unified top bar, a Build/Manage control and a role-based Manage rail. Simona Georgieva found a problem in the first version: a new builder who went into permissions or version checks might never return to chat. We kept Manage behind first publish and protected Pave's one reliable wow moment.

![LAUNCHED CORE / FORWARD-LOOKING SURFACE - The unified header and Build/Manage model. The header and toggle shipped in Phase 1; the complete overview and role-based rail remained later-phase work.](/case-studies/pave-nav/manage-mode-builder-view.webp)

### The label fight was the design fight

Emma Townsend and Eva proposed `Chat | Settings`. That was reasonable. Chat is where people build, and Settings is familiar.

I argued for `Build | Manage`. Settings sounded like minor preferences, but this side of Pave already held data, users, permissions, versions and billing. Workflow ideas also pointed toward more operational work. Chat is a tool. Settings is a destination. Build and Manage are two actions on the same app.

The shipped label is Build/Manage. The meeting that settled it is not in the written record. I can show the reasoning and the result, but I will not invent the final speech.

Other decisions followed the same pattern:

- Manage stayed unavailable until first publish.
- Published apps kept the canvas. Pave moved to a low-priority footer chip.
- End users saw “your apps,” not “your projects,” because access was granted per app.
- Theme switching stayed reachable after Ryan supplied the number that changed the IA: one in five users changed their theme.
- Publish versus Share ended in an agreed A/B test.

![APPROVED DESIGN ARTIFACT - Seven role and task flows packaged for engineering, plus motion and annotation specifications.](/case-studies/pave-nav/approved-flows-overview.webp)

Ryan signed off on the direction. Kevin made the redesign P0, an Approved branch was cut for engineering and QA continued through release.

Phase 1 went live with the unified header, Build/Manage control, grouped header actions, overlay navigation flyout and a less cluttered sidebar.

Phase 1 did not include the Command Center, role-based Manage rail or the wider administration and governance plane. Johnny led design QA for a separate visual refresh of the same sidebar, and Swapnil Mittal planned its implementation.

My favorite unshipped artifact was the Command Center. I would cut it. It repeated the overview cards and needed a grand name to justify the repeat.

The navigation work is a useful ending because it includes the problems that came before it. Build and Manage only make sense after the builder, versions, planning and editing exist. The concept work also tested what the product might need next. The final shell caught up with what Pave had become.

## What changed

The original chat-and-iframe demo became a full-blown, revenue generating product in only 7 months. It gained planning, recovery, local editing, agents, quests, onboarding, tips and tricks, app gallery and a navigation model built around Build and Manage. We'll be introducing tons more features to Pave and I see a lot of opportunity in it's future.

[Pave is public](https://www.quickbase.com/pave). Its launched capabilities include Agents, Plan Mode, Direct Edit and email notifications. Navigation Phase 1 is live. Those are claims I can support.

Data around public adoption, retention or task-success number is still sensitive, so I'd probably share it on a later stage. One thing is clear - a really small team was able to ship something huge and complex in no time.
## Related work
[Building Pave](/case-studies/building-pave-environment/) covers the branch previews, token rules and handoff system behind this work.

[Design systems that AI can use](/case-studies/design-systems-ai-practice/) covers machine-readable components, guardrails and human review.
