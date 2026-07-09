import { existsSync, readFileSync } from "node:fs";

const files = [
  "package.json",
  "astro.config.mjs",
  "vercel.json",
  "src/components/ProjectCard.astro",
  "src/components/ProjectMark.astro",
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
const has = (file, text) => source[file].includes(text);
const exists = (file) => existsSync(file);

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

const publicUiFiles = [
  "src/components/ProjectCard.astro",
  "src/components/SiteFooter.astro",
  "src/pages/index.astro",
  "src/pages/about.astro"
];

const caseRouteFiles = ["src/pages/case-studies/index.astro", "src/pages/case-studies/[slug].astro"];

const noPublicCaseStudyLinks = publicUiFiles.every(
  (file) =>
    !has(file, 'href="/case-studies/"') &&
    !has(file, "href={study.href}") &&
    !has(file, "/case-studies/#") &&
    !has(file, 'label: "Work"')
);

const caseRoutesAreHidden = caseRouteFiles.every(
  (file) =>
    has(file, 'meta name="robots" content="noindex, nofollow"') &&
    has(file, 'meta http-equiv="refresh" content="0;url=/"') &&
    has(file, 'href="/">Return home</a>') &&
    !has(file, "work-directory") &&
    !has(file, "case-sibling-nav") &&
    !has(file, "case-reading-tools") &&
    !has(file, "All work") &&
    !has(file, "Back to WIP previews")
);

const vercelHidesCaseRoutes =
  has("vercel.json", '"source": "/case-studies"') &&
  has("vercel.json", '"source": "/case-studies/"') &&
  has("vercel.json", '"source": "/case-studies/:path((?!media/).*)"') &&
  !has("vercel.json", '"source": "/case-studies/:path*"') &&
  has("vercel.json", '"destination": "/"');

const checks = [
  ["Astro dependency exists", has("package.json", '"astro"')],
  ["Astro config exists", has("astro.config.mjs", "defineConfig")],
  ["Shared project card is preview-only", has("src/components/ProjectCard.astro", "project-card__body") && noPublicCaseStudyLinks],
  [
    "Home recent work uses three preview cards",
    has("src/pages/index.astro", "ProjectCard") &&
      has("src/pages/index.astro", 'const featuredIds = ["designing-pave", "synapse-sys", "pointlearn"]') &&
      has("src/pages/index.astro", "Recent case studies.") &&
      has("src/pages/index.astro", "WIP / preview only") &&
      !has("src/pages/index.astro", "View older work") &&
      !has("src/pages/index.astro", "work-footer") &&
      !has("src/pages/index.astro", "<details")
  ],
  [
    "Homepage turntable has resilient fallback",
    has("src/pages/index.astro", "aboutTurntableFallback") &&
      has("src/pages/index.astro", "staticAscii={aboutTurntableFallback}") &&
      has("src/styles/global.css", ".about-hero-copy") &&
      has("src/styles/global.css", "opacity: 1")
  ],
  ["Work and case-study routes are hidden", caseRoutesAreHidden && vercelHidesCaseRoutes],
  [
    "Case-study preview media remains routable",
    has("src/components/ProjectMark.astro", 'src="/case-studies/media/synapse-sys-card-turntable.mp4"') &&
      has("vercel.json", "(?!media/)")
  ],
  [
    "Content helper preserves case-study source",
    has("src/lib/content.ts", 'walkFiles(caseStudyRoot, ".mdx")') &&
      has("src/lib/content.ts", "getAdjacentCaseStudies") &&
      expectedRoutes.every((route) => has("src/lib/content.ts", `"${route}"`))
  ],
  [
    "Markdown renderer keeps visual evidence readable",
    has("src/lib/content.ts", "renderStructuredDiagram") &&
      has("src/lib/content.ts", 'normalized === "mermaid"') &&
      has("src/lib/content.ts", "case-image-grid") &&
      has("src/lib/content.ts", "case-video-copy")
  ],
  [
    "IA styles remain available for future unlock",
    has("src/styles/global.css", ".work-directory") &&
      has("src/styles/global.css", ".case-sibling-nav") &&
      has("src/styles/global.css", ".case-breadcrumb") &&
      has("src/styles/global.css", ".case-preview-placeholder")
  ],
  [
    "Footer exposes public routes only",
    has("src/components/SiteFooter.astro", "siteLinks") &&
      has("src/components/SiteFooter.astro", "links.length > 0") &&
      has("src/components/SiteFooter.astro", "Back to top") &&
      !has("src/components/SiteFooter.astro", 'href: "/case-studies/"')
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
    "Legacy work source remains preserved",
    has("case-studies/quickbase/connection-central.mdx", "Connection Central") &&
      has("case-studies/old-work/bolt-fun.mdx", "Old work")
  ],
  [
    "Responsive CSS exists",
    has("src/styles/global.css", "@media (max-width: 700px)") &&
      has("src/styles/global.css", "prefers-reduced-motion")
  ],
  ["Shader asset remains available", has("public/ascii-shader.js", 'getContext("webgl"')],
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
  ]
];

const failures = checks.filter(([, passed]) => !passed);

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
