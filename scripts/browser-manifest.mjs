/**
 * Shared route, viewport, and decorative-overflow inventory for browser checks.
 * Keep this list deliberately small: browser contracts should protect the public
 * surfaces that are most likely to regress, while all-route audits stay advisory.
 */

export const BROWSER_VIEWPORTS = Object.freeze([
  { name: "desktop", width: 1440, height: 1000, hasTouch: false },
  { name: "tablet-portrait", width: 820, height: 1180, hasTouch: true },
  { name: "tablet-landscape", width: 1180, height: 820, hasTouch: true },
  { name: "mobile", width: 390, height: 844, hasTouch: true },
  { name: "mobile-narrow", width: 320, height: 740, hasTouch: true }
]);

export const HARD_BROWSER_ROUTES = Object.freeze([
  {
    name: "home",
    path: "/",
    requiredSelectors: ["#hero-title", "#work [data-project-overview]"]
  },
  {
    name: "case-studies-index",
    path: "/case-studies/",
    expectedFinal: { pathname: "/", hash: "#work" },
    requiredSelectors: ["#work-title"]
  },
  {
    name: "designing-pave",
    path: "/case-studies/designing-pave/",
    requiredSelectors: ["#case-title", ".case-study-body"]
  },
  {
    name: "pave-breathing-grids",
    path: "/case-studies/pave-breathing-grids/",
    requiredSelectors: ["#case-title", ".case-study-body", "#breathing-grids-film", "#breathing-grids-blocks", "#breathing-grids-dither"]
  },
  {
    name: "pave-loading-animation",
    path: "/case-studies/pave-loading-animation/",
    requiredSelectors: ["#case-title", ".case-study-body", "#pave-process-reel", "#pave-process-states", "#pave-process-finish"]
  },
  {
    name: "designing-synapse-sys",
    path: "/case-studies/designing-synapse-sys/",
    requiredSelectors: ["#case-title", ".case-study-body"]
  },
  {
    name: "pipelines",
    path: "/case-studies/pipelines/",
    requiredSelectors: ["#case-title", ".case-study-body"]
  },
  {
    name: "connection-central",
    path: "/case-studies/connection-central/",
    requiredSelectors: ["#case-title", ".case-study-body"]
  },
  {
    name: "synapse-sys",
    path: "/case-studies/synapse-sys/",
    requiredSelectors: ["#case-title", ".case-study-body"]
  },
  {
    name: "about",
    path: "/about/",
    requiredSelectors: ["#about-title", ".about-copy"]
  },
  {
    name: "cv",
    path: "/cv/",
    requiredSelectors: ["#cv-title", ".experience-list"]
  },
  {
    name: "notes",
    path: "/notes/",
    requiredSelectors: ["#notes-title", ".notes-directory", ".notes-search"]
  },
  {
    name: "local-note",
    path: "/notes/design-outside-design/",
    requiredSelectors: [".note-header h1", ".note-body"]
  },
  {
    name: "internet-feels-dead",
    path: "/notes/the-internet-feels-dead/",
    requiredSelectors: [".note-header h1", ".note-ascii-flow-field", ".note-body"],
    visualSelectors: [
      {
        selector: ".note-ascii-flow-field",
        expectedDescendants: ["canvas", "[data-ascii-banner-fallback]"]
      }
    ]
  },
  {
    name: "labs",
    path: "/labs/",
    requiredSelectors: ["main h1", ".labs-directory", ".labs-list"]
  },
  {
    name: "playground",
    path: "/playground/",
    requiredSelectors: ["#playground-title", ".playground-stage", ".playground-controls"]
  },
  {
    name: "image-trail",
    path: "/image-trail/",
    requiredSelectors: ["#trail-title", "[data-dither-trail]"]
  },
  {
    name: "banner-studio",
    path: "/labs/ascii-banner/",
    requiredSelectors: ["main h1", "[data-ascii-banner-studio]"]
  },
  {
    name: "product-systems-kit",
    path: "/labs/product-systems-kit/",
    requiredSelectors: ["main h1", "[data-product-systems-kit]"]
  },
  {
    name: "rhizome-field",
    path: "/labs/rhizome-field/",
    requiredSelectors: ["main h1", "[data-rhizome-field]"]
  },
  {
    name: "sketchbook",
    path: "/labs/sketchbook/",
    requiredSelectors: ["main h1", "[data-creative-sketchbook]"]
  },
  {
    name: "blocktype-wave",
    path: "/notes/on-digital-art/",
    requiredSelectors: [".note-header h1", ".note-body"],
    visualSelectors: [
      {
        selector: "[data-blocktype-wave-preview]",
        expectedDescendants: ["canvas"]
      }
    ]
  },
  {
    name: "obj-turntable",
    path: "/obj-turntable/",
    requiredSelectors: [".pave-turntable-controls"],
    visualSelectors: [
      {
        selector: "[data-obj-turntable]",
        expectedDescendants: ["canvas", "[data-obj-ascii]"]
      }
    ]
  },
  {
    name: "pave-turntable",
    path: "/pave-turntable/",
    requiredSelectors: [".pave-turntable-controls"],
    visualSelectors: [
      {
        selector: "[data-pave-turntable]",
        expectedDescendants: ["canvas", "[data-pave-ascii]"]
      }
    ]
  },
  {
    name: "sasi-turntable",
    path: "/sasi-turntable/",
    requiredSelectors: [".pave-turntable-controls"],
    visualSelectors: [
      {
        selector: "[data-sasi-logo-turntable]",
        expectedDescendants: ["canvas", "[data-sasi-ascii]"]
      }
    ]
  },
  {
    name: "synapse-turntable",
    path: "/synapse-turntable/",
    requiredSelectors: [".pave-turntable-controls"],
    visualSelectors: [
      {
        selector: "[data-sasi-logo-turntable]",
        expectedDescendants: ["canvas", "[data-sasi-ascii]"]
      }
    ]
  },
  {
    name: "svg-ascii-studio",
    path: "/svg-ascii-studio/",
    requiredSelectors: ["main[data-studio]", ".s2-card [data-stage]"]
  },
  {
    name: "shader-explainer",
    path: "/shader-explainer/",
    requiredSelectors: ["main h1", ".pipeline-diagram"],
    visualSelectors: [
      {
        selector: ".interaction-diagram",
        expectedDescendants: ["rect"]
      }
    ]
  }
]);

export const AUDIT_ROUTE_SETS = Object.freeze({
  visual: Object.freeze([
    { name: "home", path: "/" },
    { name: "about", path: "/about/" },
    { name: "case-studies-index", path: "/case-studies/" },
    { name: "designing-pave", path: "/case-studies/designing-pave/" },
    { name: "pipelines", path: "/case-studies/pipelines/" },
    { name: "connection-central", path: "/case-studies/connection-central/" },
    { name: "synapse-sys", path: "/case-studies/synapse-sys/" }
  ]),
  performance: Object.freeze([
    { name: "home", path: "/" },
    { name: "about", path: "/about/" },
    { name: "case-studies-index", path: "/case-studies/" },
    { name: "designing-pave", path: "/case-studies/designing-pave/" },
    { name: "pave-breathing-grids", path: "/case-studies/pave-breathing-grids/" },
    { name: "pave-loading-animation", path: "/case-studies/pave-loading-animation/" },
    { name: "pipelines", path: "/case-studies/pipelines/" },
    { name: "connection-central", path: "/case-studies/connection-central/" },
    { name: "synapse-sys", path: "/case-studies/synapse-sys/" },
    { name: "notes", path: "/notes/" },
    { name: "local-note", path: "/notes/design-outside-design/" },
    { name: "contact", path: "/contact/" },
    { name: "labs", path: "/labs/" },
    { name: "product-systems-kit", path: "/labs/product-systems-kit/" }
  ]),
  routeAudit: "all-generated"
});

/**
 * These are visual canvases/stages that intentionally clip or overhang their
 * contents. Audits still report document-level overflow and every other element.
 */
export const DECORATIVE_OVERFLOW_CONTAINERS = Object.freeze([
  ".ascii-stage",
  ".project-turntable",
  ".project-video-turntable",
  ".about-turntable",
  ".case-hero-turntable",
  ".pave-turntable-stage",
  ".playground-turntable",
  ".dither-trail",
  ".rhizome-field__stage",
  ".component-preview__stage",
  ".creative-sketchbook__stage",
  ".product-kit__stage"
]);

export const DECORATIVE_OVERFLOW_SELECTOR = DECORATIVE_OVERFLOW_CONTAINERS.join(", ");

// Vercel provides Insights at this path in deployed environments. Astro preview
// deliberately does not emulate that platform endpoint, so it is the one local
// preview resource exception. It remains visible in contract evidence.
export const LOCAL_PREVIEW_RESOURCE_ALLOWLIST = Object.freeze(["/_vercel/insights/script.js"]);
