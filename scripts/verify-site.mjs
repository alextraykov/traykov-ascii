import { existsSync, readFileSync } from "node:fs";

const files = [
  "package.json",
  "astro.config.mjs",
  "vercel.json",
  "src/components/ProjectCard.astro",
  "src/components/ProjectMark.astro",
  "src/components/SiteFooter.astro",
  "src/components/SiteHead.astro",
  "src/components/ThemeToggle.astro",
  "src/components/PaveTurntable.astro",
  "src/components/ObjTurntable.astro",
  "src/components/SvgLogoTurntable.astro",
  "src/pages/index.astro",
  "src/pages/about.astro",
  "src/pages/playground.astro",
  "src/pages/pave-turntable.astro",
  "src/pages/obj-turntable.astro",
  "src/pages/sasi-turntable.astro",
  "src/pages/synapse-turntable.astro",
  "src/pages/case-studies/index.astro",
  "src/pages/case-studies/[slug].astro",
  "src/lib/content.ts",
  "src/lib/public-case-studies.ts",
  "src/styles/global.css",
  "src/scripts/motion/index.js",
  "src/scripts/motion/reveal.js",
  "src/scripts/motion/scramble.js",
  "src/scripts/motion/scroll-fx.js",
  "src/scripts/motion/count-up.js",
  "src/scripts/pave-symbol-turntable.js",
  "src/scripts/obj-turntable.js",
  "src/scripts/sasi-logo-turntable.js",
  "src/scripts/synapse-card-scramble.js",
  "public/page-transitions.js",
  "public/ascii-shader.js",
  "public/favicon.svg",
  "public/favicon-32.png",
  "public/apple-touch-icon.png",
  "public/og-image.png",
  "public/og-image.svg",
  "public/site.webmanifest",
  "case-studies/_template.mdx",
  "case-studies/pages/designing-pave.mdx",
  "case-studies/pages/synapse-sys.mdx",
  "case-studies/pages/building-pave-environment.mdx",
  "case-studies/quickbase/alm-environments.mdx",
  "case-studies/quickbase/connection-central.mdx",
  "case-studies/quickbase/design-leadership-operations.mdx",
  "case-studies/quickbase/design-systems-ai-practice.mdx",
  "case-studies/quickbase/pipelines.mdx",
  "case-studies/_archive/pages/pave-building-loop.mdx",
  "case-studies/_archive/pages/pointlearn.mdx",
  "case-studies/_archive/old-work/bolt-fun.mdx",
  "AGENTS.md",
  "CLAUDE.md",
  "docs/design-language.md"
];

const source = Object.fromEntries(files.map((file) => [file, existsSync(file) ? readFileSync(file, "utf8") : ""]));
const has = (file, text) => source[file].includes(text);
const exists = (file) => existsSync(file);

const expectedRoutes = [
  "designing-pave",
  "synapse-sys"
];

const homepageCardsAreOpen =
  has("src/components/ProjectCard.astro", "href?: string") &&
  has("src/components/ProjectCard.astro", "case study preview. Coming soon.") &&
  has("src/pages/index.astro", 'action="Open case study"') &&
  has("src/pages/index.astro", "href={study.href}") &&
  !has("src/pages/index.astro", 'action="Coming soon"');

const caseIndexAnchorsHome =
  has("src/pages/case-studies/index.astro", "SiteHead") &&
  has("src/pages/case-studies/index.astro", 'noindex={true}') &&
  has("src/pages/case-studies/index.astro", 'refresh="0;url=/#work"') &&
  has("src/pages/case-studies/index.astro", 'href="/#work"') &&
  has("vercel.json", '"source": "/case-studies/"') &&
  has("vercel.json", '"destination": "/#work"');

const caseDetailSourceIsPreservedBehindRedirect =
  has("src/pages/case-studies/[slug].astro", "SiteHead") &&
  has("src/pages/case-studies/[slug].astro", 'Astro.redirect("/#work", 302)') &&
  has("src/pages/case-studies/[slug].astro", "noindex={!isPublicStudy}") &&
  has("src/pages/case-studies/[slug].astro", "isPublicCaseStudy") &&
  !has("src/pages/case-studies/[slug].astro", 'refresh="0;url=/"') &&
  has("src/pages/case-studies/[slug].astro", "renderMarkdown(study.body)") &&
  has("src/pages/case-studies/[slug].astro", "getCaseStudyHeadings") &&
  has("src/pages/case-studies/[slug].astro", "case-reader-layout--with-tools") &&
  has("src/pages/case-studies/[slug].astro", "case-reading-tools") &&
  has("src/pages/case-studies/[slug].astro", "data-case-target") &&
  has("src/pages/case-studies/[slug].astro", "case-walkthrough") &&
  has("src/pages/case-studies/[slug].astro", "case-progress") &&
  !has("src/pages/case-studies/[slug].astro", "case-gate");

const vercelPreservesConsolidatedRoutes =
  has("vercel.json", '"source": "/case-studies/designing-synapse-sys/"') &&
  has("vercel.json", '"destination": "/case-studies/synapse-sys/"') &&
  has("vercel.json", '"destination": "/case-studies/designing-pave/"') &&
  has("vercel.json", '"destination": "/case-studies/pipelines/"');

const themedRoutes = [
  "src/pages/index.astro",
  "src/pages/about.astro",
  "src/pages/case-studies/[slug].astro",
  "src/pages/playground.astro",
  "src/pages/pave-turntable.astro",
  "src/pages/obj-turntable.astro",
  "src/pages/sasi-turntable.astro",
  "src/pages/synapse-turntable.astro"
];

const checks = [
  ["Astro dependency exists", has("package.json", '"astro"')],
  ["Astro config exists", has("astro.config.mjs", "defineConfig")],
  [
    "Brand favicon and social preview metadata exist",
    has("src/components/SiteHead.astro", 'href="/favicon.svg"') &&
      has("src/components/SiteHead.astro", 'property="og:image"') &&
      has("src/components/SiteHead.astro", 'name="twitter:image"') &&
      exists("public/favicon.svg") &&
      exists("public/favicon-32.png") &&
      exists("public/apple-touch-icon.png") &&
      exists("public/og-image.png") &&
      exists("public/og-image.svg") &&
      exists("public/site.webmanifest")
  ],
  [
    "Color theme follows local time and persists explicit overrides",
    has("src/components/SiteHead.astro", '"traykov-color-theme"') &&
      has("src/components/SiteHead.astro", "dayStartsAt = 7") &&
      has("src/components/SiteHead.astro", "nightStartsAt = 19") &&
      has("src/components/SiteHead.astro", "scheduleBoundary") &&
      has("src/components/SiteHead.astro", "themePreference") &&
      has("src/components/SiteHead.astro", "themechange") &&
      has("src/components/ThemeToggle.astro", "data-theme-toggle") &&
      has("src/components/ThemeToggle.astro", 'class="hn hn-sun"') &&
      has("src/components/ThemeToggle.astro", 'class="hn hn-moon"') &&
      has("src/components/ThemeToggle.astro", 'aria-live="polite"') &&
      has("src/styles/global.css", 'html:not([data-theme])') &&
      themedRoutes.every((route) => has(route, "ThemeToggle"))
  ],
  [
    "Global CRT scanlines are removed",
    !has("src/styles/global.css", "repeating-linear-gradient") &&
      !themedRoutes.some((route) => has(route, 'class="noise"'))
  ],
  [
    "Navigation stays visible while scrolling",
    has("src/styles/global.css", "position: sticky") &&
      has("src/styles/global.css", "z-index: var(--z-nav)") &&
      has("src/components/SiteHead.astro", "viewport-fit=cover") &&
      has("src/styles/global.css", "max-width: 100svw") &&
      has("src/styles/global.css", "env(safe-area-inset-top)") &&
      has("src/styles/global.css", ".site-nav::before") &&
      has("src/styles/global.css", "height: 100svh") &&
      !has("src/styles/global.css", "body.is-nav-scrolling .site-nav") &&
      !has("public/page-transitions.js", "hideNavWhileScrolling") &&
      !has("public/page-transitions.js", '"is-nav-scrolling"')
  ],
  [
    "Footer booking uses Cal.com",
    has("src/components/SiteFooter.astro", "PUBLIC_CAL_BOOKING_URL") &&
      has("src/components/SiteFooter.astro", "https://cal.com/alexander-cqn5aq/30min") &&
      has("src/components/SiteFooter.astro", 'url.searchParams.set("embed", "true")') &&
      has("src/components/SiteFooter.astro", "Book a 30-minute call with Alexander Traykov") &&
      !has("src/components/SiteFooter.astro", "PUBLIC_GOOGLE_CALENDAR_BOOKING_URL") &&
      !has("src/components/SiteFooter.astro", "calendar.google.com")
  ],
  [
    "Dark case-study components use readable semantic surfaces",
      has("src/styles/global.css", 'html[data-theme="dark"]') &&
      has("src/styles/global.css", "--surface-raised") &&
      has("src/styles/global.css", "--card-surface") &&
      has("src/styles/global.css", "--card-media-filter") &&
      has("src/styles/global.css", "--ascii-stage-background") &&
      has("src/styles/global.css", "--ascii-stage-blend") &&
      has("src/styles/global.css", ".about-turntable__ascii") &&
      has("src/styles/global.css", "var(--turntable-ascii)") &&
      has("src/styles/global.css", "--case-hero-turntable-opacity") &&
      has("public/ascii-shader.js", 'const ASCII_RAMP = " .:+*#%@"') &&
      has("src/styles/global.css", "--text-caption") &&
      has("src/styles/global.css", ".case-toc") &&
      has("src/styles/global.css", ".case-video-copy") &&
      has("src/styles/global.css", ".case-stat p") &&
      has("src/styles/global.css", ".case-study-body .case-bluf-note")
  ],
  [
    "3D turntables expose one accessible image and theme-aware controls",
    ["src/components/PaveTurntable.astro", "src/components/ObjTurntable.astro", "src/components/SvgLogoTurntable.astro"].every(
      (component) => has(component, 'role={ariaLabel ? "img" : undefined}') && has(component, 'aria-hidden="true"')
    ) &&
      has("src/styles/global.css", "--turntable-stage-background") &&
      has("src/styles/global.css", "--turntable-ascii-faint") &&
      has("src/styles/global.css", ".pave-turntable-controls") &&
      has("src/styles/global.css", ".turntable-process rect") &&
      ["src/scripts/pave-symbol-turntable.js", "src/scripts/obj-turntable.js", "src/scripts/sasi-logo-turntable.js"].every(
        (script) => has(script, 'event.key === "ArrowRight"') && has(script, "tabButton.tabIndex")
      ) &&
      ["src/pages/pave-turntable.astro", "src/pages/obj-turntable.astro", "src/pages/sasi-turntable.astro", "src/pages/synapse-turntable.astro"].every(
        (route) => has(route, 'role="tabpanel"') && has(route, 'aria-controls=')
      )
  ],
  [
    "Homepage case studies are clickable",
    has("src/components/ProjectCard.astro", "project-card__body") &&
      homepageCardsAreOpen
  ],
  [
    "Home recent work uses two case-study cards",
    has("src/pages/index.astro", "ProjectCard") &&
      has("src/lib/public-case-studies.ts", '"designing-pave", "synapse-sys"') &&
      has("src/pages/index.astro", "getFeaturedCaseStudies(getCaseStudies())") &&
      has("src/pages/index.astro", "Two selected case studies.") &&
      has("src/pages/index.astro", "Open case study") &&
      !has("src/pages/index.astro", "View all selected work") &&
      !has("src/pages/index.astro", "work-footer") &&
      !has("src/pages/index.astro", "<details")
  ],
  [
    "Homepage turntable avoids the static ASCII fallback",
    !has("src/pages/index.astro", "aboutTurntableFallback") &&
      !has("src/pages/index.astro", "staticAscii=") &&
      has("src/pages/index.astro", 'objSrc="/models/me.glb"') &&
      has("src/styles/global.css", ".about-hero-copy") &&
      has("src/styles/global.css", "opacity: 1")
  ],
  ["Selected work index anchors home", caseIndexAnchorsHome],

  ["Case detail source is preserved behind redirects", caseDetailSourceIsPreservedBehindRedirect],

  ["Vercel preserves consolidated case-study URLs", vercelPreservesConsolidatedRoutes],
  [
    "Case-study preview media remains routable",
    has("src/components/ProjectMark.astro", 'data-src="/case-studies/media/synapse-sys-card-turntable-card.mp4"') &&
      exists("public/case-studies/media/synapse-sys-card-turntable-card.mp4") &&
      !has("vercel.json", '"source": "/case-studies/media/')
  ],
  [
    "Content helper preserves case-study source",
    has("src/lib/content.ts", 'walkFiles(caseStudyRoot, ".mdx")') &&
      has("src/lib/content.ts", "getAdjacentCaseStudies") &&
      expectedRoutes.every((route) => has("src/lib/public-case-studies.ts", `"${route}"`))
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
      has("src/components/SiteFooter.astro", 'href: "/#work"')
  ],
  [
    "Core case-study content exists",
    has("case-studies/pages/designing-pave.mdx", "Designing Pave") &&
      has("case-studies/pages/synapse-sys.mdx", "Synapse-Sys") &&
      has("case-studies/pages/building-pave-environment.mdx", "Building Pave") &&
      has("case-studies/quickbase/pipelines.mdx", "Pipelines")
  ],
  [
    "Supporting portfolio content exists",
    has("case-studies/quickbase/alm-environments.mdx", "ALM Environments") &&
      has("case-studies/quickbase/design-leadership-operations.mdx", "Design leadership") &&
      has("case-studies/quickbase/design-systems-ai-practice.mdx", "Design systems") &&
      has("case-studies/quickbase/connection-central.mdx", "Connection Central")
  ],
  [
    "Consolidated source remains in the non-routable archive",
    has("case-studies/_archive/pages/pave-building-loop.mdx", "Building Loop") &&
      has("case-studies/_archive/pages/pointlearn.mdx", "PointLearn") &&
      has("case-studies/_archive/old-work/bolt-fun.mdx", "Old work")
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
