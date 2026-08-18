/**
 * Shared route, viewport, and decorative-overflow inventory for browser checks.
 * Keep this list deliberately small: browser contracts should protect the public
 * surfaces that are most likely to regress, while all-route audits stay advisory.
 */

export const BROWSER_VIEWPORTS = Object.freeze([
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 }
]);

export const HARD_BROWSER_ROUTES = Object.freeze([
  {
    name: "home",
    path: "/",
    requiredSelectors: ["#hero-title", "#work .project-grid"]
  },
  {
    name: "case-studies-index",
    path: "/case-studies/",
    expectedFinal: { pathname: "/", hash: "#work" },
    requiredSelectors: ["#work .project-grid"]
  },
  {
    name: "synapse-sys",
    path: "/case-studies/synapse-sys/",
    requiredSelectors: ["#case-title", ".case-study-body"]
  },
  {
    name: "designing-pave",
    path: "/case-studies/designing-pave/",
    requiredSelectors: ["#case-title", ".case-study-body"]
  },
  {
    name: "about",
    path: "/about/",
    requiredSelectors: ["#about-title", ".about-copy"]
  }
]);

export const AUDIT_ROUTE_SETS = Object.freeze({
  visual: Object.freeze([
    { name: "home", path: "/" },
    { name: "about", path: "/about/" },
    { name: "case-studies-index", path: "/case-studies/" },
    { name: "designing-pave", path: "/case-studies/designing-pave/" },
    { name: "synapse-sys", path: "/case-studies/synapse-sys/" }
  ]),
  performance: Object.freeze([
    { name: "home", path: "/" },
    { name: "about", path: "/about/" },
    { name: "case-studies-index", path: "/case-studies/" },
    { name: "designing-pave", path: "/case-studies/designing-pave/" },
    { name: "synapse-sys", path: "/case-studies/synapse-sys/" }
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
