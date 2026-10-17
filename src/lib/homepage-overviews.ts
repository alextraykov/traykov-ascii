import type { CaseStudy } from "./content";
import { featuredCaseStudyIds } from "./public-case-studies";

export type HomepageVideo = {
  kind: "video";
  src: string;
  poster: string;
  width: number;
  height: number;
  title: string;
  description: string;
  label: string;
};

export type HomepageImage = {
  kind: "image";
  src: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  description: string;
  label: string;
};

export type HomepageMedia = HomepageVideo | HomepageImage;

type HomepageOverviewDefinition = {
  id: (typeof featuredCaseStudyIds)[number];
  lead: HomepageMedia;
  supporting: readonly HomepageMedia[];
  background: string;
  problem: string;
  impact: readonly {
    label: string;
    description: string;
  }[];
};

export type HomepageOverview = HomepageOverviewDefinition & {
  study: CaseStudy;
};

const homepageOverviewDefinitions = [
  {
    id: "designing-pave",
    lead: {
      kind: "video",
      src: "/case-studies/media/pave-portfolio-loop.mp4",
      poster: "/case-studies/media/homepage-posters/pave-overview.jpg",
      width: 960,
      height: 540,
      title: "Pave in 26 seconds",
      description:
        "A 26-second overview of Pave's builder, Plan Mode, versioning, Direct Edit, and an early workflow idea from the evolving product.",
      label: "Product overview · includes an early workflow prototype"
    },
    background:
      "I joined an engineer-built AI app builder as its first product designer, working across product structure, interaction design and implementation.",
    problem:
      "The prompt-to-app loop worked. Planning, precise edits, recovery and navigation still needed to feel like one product people could use with confidence.",
    impact: [
      {
        label: "Public launch",
        description: "Pave grew from an early alpha into a publicly launched product."
      },
      {
        label: "Shipped capabilities",
        description:
          "Plan Mode and Direct Edit reached the public product; navigation Phase 1 shipped to production on July 16, 2026."
      }
    ],
    supporting: [
      {
        kind: "video",
        src: "/case-studies/media/homepage-loops/pave-plan-mode-loop.mp4",
        poster: "/case-studies/media/homepage-posters/pave-plan-mode-loop.jpg",
        width: 1280,
        height: 720,
        title: "Plan Mode: clarify, review, approve, build",
        description:
          "A short coded prototype of clarification, plan review, approval and execution using mock dashboard, task and timing data.",
        label: "Coded prototype · mock product data"
      },
      {
        kind: "video",
        src: "/case-studies/media/homepage-loops/pave-direct-edit-loop.mp4",
        poster: "/case-studies/media/homepage-posters/pave-direct-edit-loop.jpg",
        width: 1280,
        height: 720,
        title: "Direct Edit: select, adjust, continue",
        description:
          "A short prototype of component-aware selection and direct changes using fabricated product data.",
        label: "Prototype recording · fabricated product data"
      }
    ]
  },
  {
    id: "pipelines",
    lead: {
      kind: "image",
      src: "/case-studies/quickbase/pipelines-oauth-connect-anatomy.webp",
      width: 1600,
      height: 1892,
      alt: "Pipelines OAuth connection design specification showing a reusable account-authorisation pattern.",
      title: "One connection pattern for different providers.",
      description:
        "A reusable OAuth design specification keeps account, permissions, and environment choices visible while allowing provider-specific detail.",
      label: "Design specification · generic sample data"
    },
    background:
      "I designed Pipelines across three years, from reusable connection patterns to AI-assisted creation and expert configuration.",
    problem:
      "Builders needed to connect systems, inspect AI proposals, and manage advanced logic without hiding choices that could affect live data.",
    impact: [
      {
        label: "Observed reach",
        description:
          "Across September 11, 2025 to September 11, 2026, 2,826 customer accounts used the all-Pipelines-AI feature set."
      },
      {
        label: "Evidence limit",
        description:
          "Product-analytics counts show reach and measured follow-through; they do not establish a successful automation or causal design impact."
      }
    ],
    supporting: [
      {
        kind: "image",
        src: "/case-studies/quickbase/pipelines-code-mode.webp",
        width: 1600,
        height: 1981,
        alt: "Pipelines code-mode design specification showing an advanced expression editor and locked visual controls.",
        title: "An escape hatch with explicit ownership rules.",
        description:
          "The specification keeps the code and visual representations from silently overwriting each other.",
        label: "Design specification · generic sample data"
      }
    ]
  },
  {
    id: "connection-central",
    lead: {
      kind: "image",
      src: "/case-studies/quickbase/cc-v2-ia-flow.webp",
      width: 1600,
      height: 1137,
      alt: "Connection Central resources-side-panel design specification showing a resource hierarchy and nested relationships.",
      title: "A resource hierarchy for understanding relationships.",
      description:
        "A broader v2 resources-side-panel design specification, not a sequence or a complete December 2024 GA screen.",
      label: "Design specification · sample data · broader than GA"
    },
    background:
      "I rebuilt Connection Central’s information architecture after an earlier version by Johnny Lee had accumulated useful but disconnected views.",
    problem:
      "Builders could see individual connections and pipelines but had trouble following what a resource touched and what depended on it.",
    impact: [
      {
        label: "Research-led structure",
        description:
          "A Structured Association study with 13 Solution Architects informed the resources-first model; they were expert proxies, not external customers."
      },
      {
        label: "Measured reach",
        description:
          "From July 20, 2025 through July 19, 2026, 3,110 accounts used Connection Central. It measures reach, not redesign lift or decision quality."
      }
    ],
    supporting: [
      {
        kind: "image",
        src: "/case-studies/quickbase/cc-resources-detail-two-pane.webp",
        width: 1440,
        height: 1024,
        alt: "Connection Central two-pane design specification with resources navigation beside a detail pane.",
        title: "Keep the map while inspecting a connection.",
        description:
          "This broader design specification shows expanded filters and field rows; the detail controls were deferred from the GA release.",
        label: "Design specification · sample data · includes deferred concepts"
      },
      {
        kind: "image",
        src: "/case-studies/quickbase/cc-pipelines-list.webp",
        width: 1600,
        height: 1137,
        alt: "Connection Central Pipelines-list design specification with sample pipeline data.",
        title: "A first-class Pipelines view in the broader v2 model.",
        description:
          "This is a broader design specification with sample data, not a labelled GA screenshot.",
        label: "Design specification · sample data · broader than GA"
      }
    ]
  },
  {
    id: "designing-synapse-sys",
    lead: {
      kind: "video",
      src: "/case-studies/media/homepage-loops/synapse-earlier-canvas.mp4",
      poster: "/case-studies/media/homepage-posters/synapse-canvas.jpg",
      width: 960,
      height: 540,
      title: "A working canvas, not a static map",
      description:
        "Open a canvas, move through the graph, select a node and keep the relationship between the material visible.",
      label: "Earlier closed-beta build"
    },
    background:
      "I designed and built Synapse-Sys as an AI-powered infinite canvas for research and synthesis, where people can connect, revise and use material in the next operation.",
    problem:
      "The graph interaction was the hook, but the product also had to keep nodes editable, edges readable and the work recoverable as the canvas grew.",
    impact: [
      {
        label: "Closed-beta product",
        description:
          "The product includes accounts, sharing, exports, AI budgets, pricing and checkout flows around the canvas."
      },
      {
        label: "Evidence limit",
        description:
          "It is nearing launch; public adoption, retention, activation, generated-node reuse and ghost-node acceptance are unmeasured."
      }
    ],
    supporting: [
      {
        kind: "video",
        src: "/case-studies/media/homepage-loops/synapse-earlier-toolbar.mp4",
        poster: "/case-studies/media/homepage-posters/synapse-toolbar.jpg",
        width: 960,
        height: 540,
        title: "Keep a growing canvas editable",
        description:
          "Pan, box-select and tidy the map without leaving it; saved canvases also carry recovery controls for finding work again, undo and redo.",
        label: "Earlier closed-beta build"
      },
      {
        kind: "image",
        src: "/case-studies/media/homepage-posters/synapse-edge-operations.jpg",
        width: 960,
        height: 540,
        alt: "Synapse-Sys canvas showing readable edge paths, operation labels and a compare action between nodes.",
        title: "Using an edge as a command",
        description:
          "Readable paths, operation affordances, labels and enough context to follow one relationship through a busy map of edges.",
        label: "Earlier closed-beta build"
      }
    ]
  }
] as const satisfies readonly HomepageOverviewDefinition[];

export function getHomepageOverviews(studies: readonly CaseStudy[]): HomepageOverview[] {
  return featuredCaseStudyIds.map((id) => {
    const definition = homepageOverviewDefinitions.find((candidate) => candidate.id === id);
    const study = studies.find((candidate) => candidate.id === id);

    if (!definition || !study) {
      throw new Error(`Homepage overview requires the featured case study: ${id}`);
    }

    return { ...definition, study };
  });
}
