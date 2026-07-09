import { existsSync, readFileSync } from "node:fs";

const files = [
  "package.json",
  "astro.config.mjs",
  "src/components/ProjectCard.astro",
  "src/components/SiteFooter.astro",
  "src/pages/index.astro",
  "src/pages/about.astro",
  "src/pages/case-studies/index.astro",
  "src/pages/case-studies/[slug].astro",
  "src/lib/content.ts",
  "src/styles/global.css",
  "src/scripts/motion/index.js",
  "src/scripts/motion/reveal.js",
  "src/scripts/motion/scramble.js",
  "src/scripts/motion/scroll-fx.js",
  "src/scripts/motion/count-up.js",
  "src/scripts/synapse-card-scramble.js",
  "public/ascii-shader.js",
  "case-studies/_template.mdx",
  "case-studies/pages/designing-pave.mdx",
  "case-studies/pages/synapse-sys.mdx",
  "case-studies/pages/designing-synapse-sys.mdx",
  "case-studies/pages/pointlearn.mdx",
  "case-studies/pages/pave-building-loop.mdx",
  "case-studies/pages/pave-planning.mdx",
  "case-studies/pages/pave-direct-edit.mdx",
  "case-studies/pages/pave-credits.mdx",
  "case-studies/pages/pave-marketplace.mdx",
  "case-studies/quickbase/connection-central.mdx",
  "case-studies/old-work/bolt-fun.mdx",
  "AGENTS.md",
  "CLAUDE.md",
  "docs/design-language.md"
];

const source = Object.fromEntries(files.map((file) => [file, existsSync(file) ? readFileSync(file, "utf8") : ""]));

const expectedRoutes = [
  "designing-pave",
  "synapse-sys",
  "designing-synapse-sys",
  "pointlearn",
  "pave-building-loop",
  "pave-planning",
  "pave-direct-edit",
  "pave-credits",
  "pave-marketplace",
  "connection-central",
  "bolt-fun"
];

const has = (file, text) => source[file].includes(text);
const exists = (file) => existsSync(file);
const workIndexIsGatedPreviewMap =
  has("src/pages/case-studies/index.astro", "Portfolio map") &&
  has("src/pages/case-studies/index.astro", "work-directory") &&
  has("src/pages/case-studies/index.astro", "Pave case studies") &&
  has("src/pages/case-studies/index.astro", "AI product studies") &&
  has("src/pages/case-studies/index.astro", "Product systems leadership") &&
  has("src/pages/case-studies/index.astro", "Archive") &&
  has("src/pages/case-studies/index.astro", "WIP previews") &&
  has("src/pages/case-studies/index.astro", "WIP / preview only") &&
  has("src/pages/case-studies/index.astro", "Deep evidence stays inside case studies") &&
  !has("src/pages/case-studies/index.astro", "Supporting routes") &&
  !has("src/pages/case-studies/index.astro", "<details");
const caseDetailsAreGated =
  has("src/pages/case-studies/[slug].astro", "case-gate") &&
  has("src/pages/case-studies/[slug].astro", "noindex, nofollow") &&
  has("src/pages/case-studies/[slug].astro", "WIP / preview only") &&
  !has("src/pages/case-studies/[slug].astro", "set:html={renderMarkdown(study.body)}");

const checks = [
  ["Astro dependency exists", has("package.json", "\"astro\"")],
  ["Astro config exists", has("astro.config.mjs", "defineConfig")],
  ["Shared direct project card exists", has("src/components/ProjectCard.astro", "href={study.href}")],
  [
    "Home recent work uses three direct cards",
    has("src/pages/index.astro", "ProjectCard") &&
      has("src/pages/index.astro", 'const featuredIds = ["designing-pave", "synapse-sys", "pointlearn"]') &&
      has("src/pages/index.astro", "Recent case studies.") &&
      has("src/pages/index.astro", "View older work") &&
      has("src/pages/index.astro", "work-footer") &&
      !has("src/pages/index.astro", "<details")
  ],
  [
    "Homepage turntable has resilient fallback",
    has("src/pages/index.astro", "aboutTurntableFallback") &&
      has("src/pages/index.astro", "staticAscii={aboutTurntableFallback}") &&
      has("src/styles/global.css", ".about-hero-copy") &&
      has("src/styles/global.css", "opacity: 1")
  ],
  [
    "Work index is a route map",
    has("src/pages/case-studies/index.astro", "Portfolio map") &&
      has("src/pages/case-studies/index.astro", "work-directory") &&
      has("src/pages/case-studies/index.astro", "Pave case studies") &&
      has("src/pages/case-studies/index.astro", "AI product studies") &&
      has("src/pages/case-studies/index.astro", "Product systems leadership") &&
      has("src/pages/case-studies/index.astro", "Archive") &&
      has("src/pages/case-studies/index.astro", "Deep evidence stays inside the case studies") &&
      !has("src/pages/case-studies/index.astro", "Supporting routes") &&
      !has("src/pages/case-studies/index.astro", "<details")
  ],
  [
    "Detail pages have piece-to-piece routing",
    has("src/pages/case-studies/[slug].astro", "previousStudy") &&
      has("src/pages/case-studies/[slug].astro", "nextStudy") &&
      has("src/pages/case-studies/[slug].astro", "case-sibling-nav") &&
      has("src/pages/case-studies/[slug].astro", "All work")
  ],
  [
    "Detail pages have readable long-case navigation",
    has("src/pages/case-studies/[slug].astro", "getCaseStudyHeadings") &&
      has("src/pages/case-studies/[slug].astro", "case-reading-tools") &&
      has("src/pages/case-studies/[slug].astro", "data-case-target")
  ],
  [
    "Content helper loads routable case studies",
    has("src/lib/content.ts", "walkFiles(caseStudyRoot, \".mdx\")") &&
      has("src/lib/content.ts", "getAdjacentCaseStudies") &&
      expectedRoutes.every((route) => has("src/lib/content.ts", `"${route}"`))
  ],
  [
    "Markdown renderer keeps visual evidence readable",
    has("src/lib/content.ts", "renderStructuredDiagram") &&
      has("src/lib/content.ts", "normalized === \"mermaid\"") &&
      has("src/lib/content.ts", "case-image-grid") &&
      has("src/lib/content.ts", "case-video-copy")
  ],
  [
    "IA styles exist",
    has("src/styles/global.css", ".work-directory") &&
      has("src/styles/global.css", ".case-sibling-nav") &&
      has("src/styles/global.css", ".case-breadcrumb") &&
      has("src/styles/global.css", ".case-preview-placeholder")
  ],
  [
    "Footer exposes global and contextual routes",
    has("src/components/SiteFooter.astro", "siteLinks") &&
      has("src/components/SiteFooter.astro", "links.length > 0") &&
      has("src/components/SiteFooter.astro", "Back to top")
  ],
  [
    "Core case-study content exists",
    has("case-studies/pages/designing-pave.mdx", "Designing Pave") &&
      has("case-studies/pages/synapse-sys.mdx", "Synapse-Sys") &&
      has("case-studies/pages/designing-synapse-sys.mdx", "Designing SynapseSys") &&
      has("case-studies/pages/pointlearn.mdx", "PointLearn")
  ],
  [
    "Pave arc content exists",
    has("case-studies/pages/pave-building-loop.mdx", "Building Loop") &&
      has("case-studies/pages/pave-planning.mdx", "Planning") &&
      has("case-studies/pages/pave-direct-edit.mdx", "Direct Edit") &&
      has("case-studies/pages/pave-credits.mdx", "Credits") &&
      has("case-studies/pages/pave-marketplace.mdx", "Marketplace")
  ],
  [
    "Legacy work remains routeable",
    has("case-studies/quickbase/connection-central.mdx", "Connection Central") &&
      has("case-studies/old-work/bolt-fun.mdx", "Old work")
  ],
  [
    "Responsive CSS exists",
    has("src/styles/global.css", "@media (max-width: 700px)") &&
      has("src/styles/global.css", "prefers-reduced-motion")
  ],
  [
    "Shader asset remains wired",
    has("public/ascii-shader.js", "getContext(\"webgl\"") &&
      has("src/pages/case-studies/index.astro", "/ascii-shader.js")
  ],
  [
    "Motion tokens exist",
    has("src/styles/global.css", "--ease-out-expo") &&
      has("src/styles/global.css", "--dur-5") &&
      has("src/styles/global.css", "--stagger-1")
  ],
  [
    "Motion runtime is wired",
    exists("src/scripts/motion/reveal.js") &&
      has("src/components/SiteFooter.astro", "scripts/motion/index.js") &&
      has("src/styles/global.css", "data-reveal")
  ],
  [
    "Case markdown fences are extended",
    has("src/lib/content.ts", "case-stat") &&
      has("src/lib/content.ts", "case-quote") &&
      has("case-studies/_template.mdx", "case-stat") &&
      has("case-studies/_template.mdx", "case-quote")
  ],
  [
    "Agent docs exist",
    has("AGENTS.md", "DO NOT TOUCH") &&
      has("CLAUDE.md", "AGENTS.md") &&
      exists("docs/design-language.md")
  ],
  [
    "Case page has progress and sibling previews",
    has("src/pages/case-studies/[slug].astro", "case-progress") &&
      has("src/pages/case-studies/[slug].astro", "case-sibling-nav__preview")
  ]
];

const normalizedChecks = checks
  .filter(([label]) => label !== "Work index is a route map")
  .concat([
    ["Work index is a gated preview map", workIndexIsGatedPreviewMap],
    ["Detail pages are WIP gated", caseDetailsAreGated]
  ]);
const failures = normalizedChecks.filter(([, passed]) => !passed);

for (const [label, passed] of normalizedChecks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
