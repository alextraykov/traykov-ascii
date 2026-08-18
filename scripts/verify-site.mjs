import { existsSync, readFileSync, statSync } from "node:fs";

const files = [
  "package.json",
  "astro.config.mjs",
  "vercel.json",
  "src/components/ProjectCard.astro",
  "src/components/ProjectMark.astro",
  "src/components/DitherImageTrail.astro",
  "src/components/CaseContactPrompt.astro",
  "src/components/SiteFooter.astro",
  "src/components/SiteHead.astro",
  "src/components/SiteNav.astro",
  "src/components/ThemeToggle.astro",
  "src/components/PaveTurntable.astro",
  "src/components/ObjTurntable.astro",
  "src/components/SvgLogoTurntable.astro",
  "src/components/RhizomeField.astro",
  "src/components/WebCemeterySketch.astro",
  "src/pages/index.astro",
  "src/pages/about.astro",
  "src/pages/contact.astro",
  "src/pages/cv.astro",
  "src/pages/notes/index.astro",
  "src/pages/notes/[slug].astro",
  "src/pages/playground.astro",
  "src/pages/component-preview.astro",
  "src/pages/image-trail.astro",
  "src/pages/roadmap.astro",
  "src/pages/shader-explainer.astro",
  "src/pages/svg-ascii-studio.astro",
  "src/pages/labs/index.astro",
  "src/pages/labs/ascii-banner.astro",
  "src/pages/labs/product-systems-kit.astro",
  "src/pages/labs/rhizome-field.astro",
  "src/pages/labs/sketchbook.astro",
  "src/pages/pave-turntable.astro",
  "src/pages/obj-turntable.astro",
  "src/pages/sasi-turntable.astro",
  "src/pages/synapse-turntable.astro",
  "src/pages/case-studies/index.astro",
  "src/pages/case-studies/[slug].astro",
  "src/lib/content.ts",
  "src/lib/substack.ts",
  "src/lib/public-case-studies.ts",
  "src/content/notes/the-cemetery-loop.json",
  "src/styles/global.css",
  "src/scripts/motion/index.js",
  "src/scripts/motion/reveal.js",
  "src/scripts/motion/scramble.js",
  "src/scripts/motion/scroll-fx.js",
  "src/scripts/motion/count-up.js",
  "src/scripts/dither-image-trail.js",
  "src/scripts/turntable-loader.js",
  "src/scripts/pave-symbol-turntable.js",
  "src/scripts/obj-turntable.js",
  "src/scripts/sasi-logo-turntable.js",
  "src/scripts/synapse-card-scramble.js",
  "src/scripts/rhizome-field.js",
  "src/scripts/web-cemetery.js",
  "src/sketches/shaders/web-cemetery.js",
  "src/sketches/shared/blocktype-material.js",
  "public/page-transitions.js",
  "public/ascii-shader.js",
  "public/llms.txt",
  "public/robots.txt",
  "public/favicon.svg",
  "public/favicon-32.png",
  "public/apple-touch-icon.png",
  "public/og-image.png",
  "public/og-image.svg",
  "public/site.webmanifest",
  "public/notes/the-cemetery-loop-poster.svg",
  "public/models/cemetery/LICENSE.txt",
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
  "docs/design-language.md",
  "docs/codex-harness.md",
  "src/pages/sitemap.xml.ts"
];

const source = Object.fromEntries(files.map((file) => [file, existsSync(file) ? readFileSync(file, "utf8") : ""]));
const has = (file, text) => source[file].includes(text);
const exists = (file) => existsSync(file);
const size = (file) => exists(file) ? statSync(file).size : Number.POSITIVE_INFINITY;

const imageTrailRenderFiles = [360, 720].flatMap((renderSize) =>
  Array.from(
    { length: 26 },
    (_, index) =>
      `public/image-trail/render-${renderSize}/trail-${String(index + 1).padStart(2, "0")}.webp`
  )
);
const initialMobileTrailBytes = imageTrailRenderFiles
  .filter((file) => file.includes("render-360") && /trail-0[1-5]\.webp$/.test(file))
  .reduce((total, file) => total + size(file), 0);

const cemeteryModelFiles = [
  "public/models/cemetery/gravestone-bevel.glb",
  "public/models/cemetery/gravestone-broken.glb",
  "public/models/cemetery/gravestone-decorative.glb",
  "public/models/cemetery/gravestone-round.glb",
  "public/models/cemetery/gravestone-wide.glb"
];

const cemeteryRuntimeFiles = [
  "src/content/notes/the-cemetery-loop.json",
  "src/components/WebCemeterySketch.astro",
  "src/scripts/web-cemetery.js",
  "src/sketches/shaders/web-cemetery.js",
  "public/notes/the-cemetery-loop-poster.svg"
];

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

const sharedNavShells = [
  "src/pages/index.astro",
  "src/pages/about.astro",
  "src/pages/contact.astro",
  "src/pages/cv.astro",
  "src/pages/notes/index.astro",
  "src/pages/notes/[slug].astro",
  "src/pages/case-studies/[slug].astro",
  "src/pages/component-preview.astro",
  "src/pages/image-trail.astro",
  "src/pages/roadmap.astro",
  "src/pages/obj-turntable.astro",
  "src/pages/pave-turntable.astro",
  "src/pages/sasi-turntable.astro",
  "src/pages/synapse-turntable.astro",
  "src/pages/playground.astro",
  "src/pages/shader-explainer.astro",
  "src/pages/svg-ascii-studio.astro",
  "src/pages/labs/index.astro",
  "src/pages/labs/ascii-banner.astro",
  "src/pages/labs/product-systems-kit.astro",
  "src/pages/labs/rhizome-field.astro",
  "src/pages/labs/sketchbook.astro"
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
      has("src/components/SiteNav.astro", 'import ThemeToggle from "./ThemeToggle.astro"') &&
      sharedNavShells.every((route) => has(route, "SiteNav"))
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
    "Booking actions retain real href fallbacks and enhance Cal.com links",
    has("src/components/SiteFooter.astro", "PUBLIC_CAL_BOOKING_URL") &&
      has("src/components/SiteFooter.astro", "PUBLIC_BOOKING_URL") &&
      has("src/components/SiteFooter.astro", "https://cal.com/alexander-cqn5aq/30min") &&
      has("src/components/SiteFooter.astro", 'url.searchParams.set("embed", "true")') &&
      has("src/components/SiteFooter.astro", "Book a 30-minute call with Alexander Traykov") &&
      has("src/components/SiteFooter.astro", 'document.querySelectorAll<HTMLElement>("[data-booking-modal-open]")') &&
      has("src/pages/contact.astro", 'id="book-a-call"') &&
      has("src/pages/contact.astro", "href={bookingPageUrl}") &&
      has("src/components/CaseContactPrompt.astro", "href={bookingPageUrl}") &&
      ["src/pages/contact.astro", "src/components/CaseContactPrompt.astro"].every((file) =>
        has(file, "PUBLIC_CAL_BOOKING_URL") &&
        has(file, "PUBLIC_BOOKING_URL") &&
        has(file, "defaultBookingUrl") &&
        has(file, "data-booking-modal-open")
      ) &&
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
    "Homepage and walkthrough media stay within performance budgets",
    size("public/case-studies/media/pave-portfolio-loop.mp4") <= 1_500_000 &&
      size("public/case-studies/media/synapse-sys-card-turntable-card.mp4") <= 500_000 &&
      size("public/case-studies/media/synapse-product-preview-avatar.mp4") <= 800_000 &&
      has("src/pages/case-studies/[slug].astro", "synapse-product-preview-avatar.mp4")
  ],
  [
    "Image trail uses complete responsive render sources",
    imageTrailRenderFiles.every(exists) &&
      initialMobileTrailBytes <= 100_000 &&
      has("src/components/DitherImageTrail.astro", "data-dither-source-mobile-url") &&
      has("src/scripts/dither-image-trail.js", "ditherSourceMobileUrl")
  ],
  [
    "Turntable loader settles unsupported WebGL without an infinite retry",
    has("src/scripts/turntable-loader.js", "MAX_INITIALIZATION_RETRIES = 1") &&
      has("src/scripts/turntable-loader.js", "supportsWebGL") &&
      has("src/scripts/turntable-loader.js", "showTurntableFallback") &&
      has("src/scripts/turntable-loader.js", 'turntableState = "fallback"')
  ],
  [
    "Shared navigation has exactly the recruiter-facing primary links",
    has("src/components/SiteNav.astro", 'export type SiteNavSection = "work" | "notes" | "about" | "contact"') &&
      has("src/components/SiteNav.astro", 'variant?: "default" | "case"') &&
      ["Work", "Notes", "About", "Contact"].every((label) =>
        has("src/components/SiteNav.astro", `label: "${label}"`)
      ) &&
      !has("src/components/SiteNav.astro", 'label: "Labs"') &&
      has("src/components/SiteNav.astro", "case-progress") &&
      sharedNavShells.every((route) => has(route, "<SiteNav")) &&
      !sharedNavShells.some((route) => has(route, 'class="site-nav"')) &&
      has("src/pages/index.astro", '<SiteNav active="work"') &&
      has("src/pages/notes/index.astro", '<SiteNav active="notes"') &&
      has("src/pages/about.astro", '<SiteNav active="about"') &&
      has("src/pages/contact.astro", '<SiteNav active="contact"') &&
      has("src/pages/case-studies/[slug].astro", '<SiteNav active="work" variant="case"') &&
      has("src/styles/global.css", "grid-template-columns: repeat(4, minmax(0, 1fr))")
  ],
  [
    "Accessible names include their visible navigation labels",
    has("src/components/SiteNav.astro", 'aria-label="AT — Alexander Traykov home"') &&
      has("src/components/SiteFooter.astro", 'aria-label="Back to top"')
  ],
  [
    "Shared logo is preloaded and the image trail has valid labelled semantics",
    has("src/components/SiteHead.astro", 'rel="preload"') &&
      has("src/components/SiteHead.astro", 'href="/sasi.svg"') &&
      has("src/components/DitherImageTrail.astro", 'role="img"')
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
    "Footer is a compact utility strip with fixed public links",
    has("src/components/SiteFooter.astro", "siteLinks") &&
      ["Notes", "Labs", "About", "Contact", "CV", "RSS"].every((label) =>
        has("src/components/SiteFooter.astro", `label: "${label}"`)
      ) &&
      !has("src/components/SiteFooter.astro", "Astro.props") &&
      has("src/components/SiteFooter.astro", "Back to top") &&
      has("src/components/SiteFooter.astro", 'href="/llms.txt"') &&
      has("src/components/SiteFooter.astro", 'aria-label="For machines"') &&
      has("src/components/SiteFooter.astro", "data-footer-booking-modal") &&
      has("src/components/SiteFooter.astro", "data-booking-modal-open") &&
      has("src/styles/global.css", "grid-template-columns: var(--tap-target) minmax(0, 1fr) auto") &&
      has("src/styles/global.css", "grid-column: 1 / -1") &&
      has("src/styles/global.css", "column-gap: var(--space-3)") &&
      !has("src/components/SiteFooter.astro", 'label: "Work"') &&
      !has("src/components/SiteFooter.astro", 'label: "Banner studio"') &&
      !has("src/components/SiteFooter.astro", 'label: "Turntable editor"')
  ],

  [
    "Homepage and Notes reduce identity and archive clutter without losing core behavior",
    has("src/pages/index.astro", 'title="AI Product Designer & UX Lead — Alexander Traykov"') &&
      has("src/pages/index.astro", "AI Product Designer &amp; UX Lead") &&
      has("src/pages/index.astro", "Alexander Traykov") &&
      !has("src/pages/index.astro", "IdentityRotator") &&
      has("src/pages/index.astro", 'objSrc="/models/me.glb"') &&
      !has("src/pages/notes/index.astro", "publishedCount") &&
      !has("src/pages/notes/index.astro", "archiveCount") &&
      !has("src/pages/notes/index.astro", "AT.NOTES / {String(notes.length)") &&
      !has("src/pages/notes/index.astro", "<dl>") &&
      has("src/pages/notes/index.astro", "notes-rss-banner") &&
      has("src/pages/notes/index.astro", "data-notes-query") &&
      has("src/pages/notes/index.astro", '"SYNCED"') &&
      has("src/pages/notes/index.astro", '"ARCHIVE"')
  ],

  [
    "AI evaluator guide stays factual and current",
    has("public/llms.txt", "This is candidate-authored context.") &&
      has(
        "public/llms.txt",
        "I can summarize this portfolio, but I cannot inspect the work on your behalf. Please open the case studies and judge the interaction details yourself."
      ) &&
      has("public/llms.txt", "https://traykov.cc/case-studies/designing-pave/") &&
      has("public/llms.txt", "https://traykov.cc/case-studies/synapse-sys/") &&
      !has("public/llms.txt", "Full case studies not publicly available yet") &&
      !has("public/llms.txt", "Full case-study pages are not public.")
  ],
  [
    "Crawler surfaces publish only intended canonical portfolio routes",
    has("astro.config.mjs", 'site: "https://traykov.cc"') &&
      has("public/robots.txt", "User-agent: *") &&
      has("public/robots.txt", "Allow: /") &&
      has("public/robots.txt", "Sitemap: https://traykov.cc/sitemap.xml") &&
      has("src/pages/sitemap.xml.ts", "getPublicCaseStudies") &&
      has("src/pages/sitemap.xml.ts", '"/notes/"') &&
      has("src/pages/sitemap.xml.ts", '"/labs/"') &&
      has("src/pages/sitemap.xml.ts", '"/svg-ascii-studio/"') &&
      has("src/pages/sitemap.xml.ts", '"/synapse-turntable/"') &&
      has("src/pages/sitemap.xml.ts", 'note.source !== "local-published" && note.source !== "legacy"') &&
      has("src/pages/sitemap.xml.ts", "url.origin !== SITE_URL") &&
      has("src/pages/sitemap.xml.ts", "function sourceDate") &&
      has("src/pages/sitemap.xml.ts", "sourceDate(note.publishedAt)")
  ],
  [
    "Metadata is role-specific and canonical-aware",
    has("src/components/SiteHead.astro", 'name="author" content="Alexander Traykov"') &&
      has("src/components/SiteHead.astro", 'property="og:locale" content="en_US"') &&
      has("src/components/SiteHead.astro", 'property="og:url" content={canonicalUrl}') &&
      has("src/pages/about.astro", "AI Product Designer & UX Lead") &&
      has("src/pages/contact.astro", "AI Product Designer & UX Lead") &&
      has("src/pages/cv.astro", "AI Product Designer & UX Lead") &&
      has("src/pages/case-studies/[slug].astro", "AI Product Design Case Study") &&
      has("src/pages/playground.astro", 'path="/playground/"')
  ],
  [
    "Structured data keeps person, case-study, and note canonical IDs aligned",
    has("src/pages/index.astro", '"@id": `${siteUrl}/#person`') &&
      has("src/pages/index.astro", '"@id": `${siteUrl}/#website`') &&
      has("src/pages/about.astro", '"@type": "ProfilePage"') &&
      has("src/pages/about.astro", 'mainEntity: { "@id": "https://traykov.cc/#person" }') &&
      has("src/pages/case-studies/[slug].astro", '"@type": "Article"') &&
      has("src/pages/case-studies/[slug].astro", '"@type": "BreadcrumbList"') &&
      has("src/pages/case-studies/[slug].astro", "mainEntityOfPage: pageUrl") &&
      has("src/pages/notes/[slug].astro", "canonicalUrl = new URL(note.canonicalUrl, siteUrl).toString()") &&
      has("src/pages/notes/[slug].astro", "mainEntityOfPage: canonicalUrl") &&
      has("src/pages/notes/[slug].astro", '"@type": "BreadcrumbList"') &&
      has("src/pages/notes/[slug].astro", 'canonical={canonicalUrl}') &&
      has("src/lib/substack.ts", "canonicalUrl: sourceUrl") &&
      has("src/lib/substack.ts", 'canonicalUrl: `${SITE_URL}/notes/${draft.slug}/`')
  ],
  [
    "Imported Notes preserve a single page H1 and downgrade embedded Substack H1s",
    has("src/lib/substack.ts", '.replace(/<h1(\\s[^>]*)?>/gi, "<h2$1>")') &&
      has("src/lib/substack.ts", '.replace(/<\\/h1>/gi, "</h2>")') &&
      has("src/pages/notes/[slug].astro", "<h1>{note.title}</h1>") &&
      has("src/pages/notes/[slug].astro", "note.contentHtml")
  ],
  [
    "LLM orientation links crawler surfaces and factual search topics",
    has("public/llms.txt", "https://traykov.cc/sitemap.xml") &&
      has("public/llms.txt", "https://traykov.cc/rss.xml") &&
      has("public/llms.txt", "https://traykov.cc/notes/the-cemetery-loop/") &&
      has("public/llms.txt", "AI product design") &&
      has("public/llms.txt", "Enterprise UX") &&
      has("public/llms.txt", "Design engineering") &&
      has("public/llms.txt", "Hands-on UX leadership") &&
      has("public/llms.txt", "Rhizome Field")
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
    "Rhizome field is routable, GPU-only, and within its image budget",
    has("src/pages/labs/index.astro", 'href: "/labs/rhizome-field/"') &&
      has("src/pages/labs/rhizome-field.astro", "RhizomeField") &&
      has("src/components/RhizomeField.astro", "data-rhizome-canvas") &&
      has("src/scripts/rhizome-field.js", 'const ASCII_RAMP = " .:+*#%@"') &&
      has("src/scripts/rhizome-field.js", 'getContext("webgl"') &&
      has("src/scripts/rhizome-field.js", "u_glyph_atlas") &&
      has("src/scripts/rhizome-field.js", "u_block_atlas") &&
      has("src/scripts/rhizome-field.js", "createBlockGlyphAtlas") &&
      has("src/scripts/rhizome-field.js", "u_bundles[3]") &&
      has("src/scripts/rhizome-field.js", "const MAX_BUNDLES = 3") &&
      has("src/scripts/rhizome-field.js", "u_disperse_progress") &&
      has("src/scripts/rhizome-field.js", "u_time") &&
      has("src/scripts/rhizome-field.js", "prefers-reduced-motion: reduce") &&
      !has("src/scripts/rhizome-field.js", "readPixels") &&
      has("src/styles/global.css", "--rhizome-xylem") &&
      exists("public/labs/rhizome-field/male-fern-rhizome.webp") &&
      size("public/labs/rhizome-field/male-fern-rhizome.webp") <= 250_000
  ],
  [
    "Cemetery loop keeps its deterministic, fallback-first WebGL contract",
    has("src/content/notes/the-cemetery-loop.json", '"visual": "web-cemetery"') &&
      has("src/scripts/web-cemetery.js", "seed: 1847") &&
      cemeteryModelFiles.length === 5 &&
      cemeteryModelFiles.every(exists) &&
      has("public/models/cemetery/LICENSE.txt", "Kenney Graveyard Kit 5.0") &&
      has("public/models/cemetery/LICENSE.txt", "Creative Commons Zero 1.0 Universal (CC0 1.0)") &&
      has(
        "src/sketches/shaders/web-cemetery.js",
        'import { blocktypeMaterialGlsl } from "../shared/blocktype-material.js";'
      ) &&
      has("src/sketches/shared/blocktype-material.js", "float blocktypeBayer4(vec2 cell)") &&
      has("src/sketches/shaders/web-cemetery.js", "blocktypeBayer4(cell)") &&
      has(
        "src/sketches/shaders/web-cemetery.js",
        "blocktypeHash21(floor(cell / 4.0) + vec2(uSeed * 37.0, uSeed * 53.0))"
      ) &&
      has("src/scripts/web-cemetery.js", "uSeed: { value: CEMETERY_CONFIG.seed / 65521 }") &&
      !cemeteryRuntimeFiles.some((file) => /\b(network|globe|packet|fence|gate)\b/i.test(source[file])) &&
      has("src/sketches/shaders/web-cemetery.js", "export const cemeteryFogFragmentShader") &&
      has("src/sketches/shaders/web-cemetery.js", "float moonDisk") &&
      has("src/components/WebCemeterySketch.astro", 'src="/notes/the-cemetery-loop-poster.svg"') &&
      exists("public/notes/the-cemetery-loop-poster.svg") &&
      has("src/components/WebCemeterySketch.astro", "<img") &&
      has("src/components/WebCemeterySketch.astro", "<noscript>") &&
      has("src/scripts/web-cemetery.js", "this.reducedMotion.matches ? 0 : 1")
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
  ]
];

const failures = checks.filter(([, passed]) => !passed);

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
