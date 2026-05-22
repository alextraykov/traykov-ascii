import { readFileSync } from "node:fs";

const files = [
  "package.json",
  "astro.config.mjs",
  "src/pages/index.astro",
  "src/pages/case-studies/index.astro",
  "src/pages/case-studies/[slug].astro",
  "src/lib/content.ts",
  "src/pages/playground.astro",
  "src/styles/global.css",
  "public/ascii-shader.js",
  "public/ascii-playground.js",
  "case-studies/README.mdx",
  "case-studies/_template.mdx",
  "case-studies/quickbase/connection-central.mdx",
  "case-studies/pages/01-home.mdx",
  "case-studies/pages/projects.mdx",
  "case-studies/old-work/bolt-fun.mdx",
  "case-studies/old-work/alby-browser.mdx",
  "case-studies/old-work/brewculator.mdx",
  "case-studies/old-work/the-improved-mind.mdx",
  "case-studies/old-work/we-are-design.mdx",
  "src/content/writing/radio-check.mdx"
];
const source = Object.fromEntries(files.map((file) => [file, readFileSync(file, "utf8")]));
const oldWorkFiles = [
  "case-studies/old-work/bolt-fun.mdx",
  "case-studies/old-work/alby-browser.mdx",
  "case-studies/old-work/brewculator.mdx",
  "case-studies/old-work/the-improved-mind.mdx",
  "case-studies/old-work/we-are-design.mdx"
];

const checks = [
  ["Astro dependency exists", source["package.json"].includes("\"astro\"")],
  ["Astro scripts exist", source["package.json"].includes("\"dev\": \"astro dev\"") && source["package.json"].includes("\"build\": \"astro build\"")],
  ["Astro config exists", source["astro.config.mjs"].includes("defineConfig")],
  ["Astro page exists", source["src/pages/index.astro"].includes("import \"../styles/global.css\"")],
  ["Playground page exists", source["src/pages/playground.astro"].includes("data-ascii-playground") && source["src/pages/playground.astro"].includes("data-control=\"speed\"")],
  ["hero contains Alexander name", source["src/pages/index.astro"].includes("Alexander") && source["src/pages/index.astro"].includes("Traykov")],
  ["role is present", source["src/pages/index.astro"].includes("UX design lead / Product systems / AI-native tools")],
  ["homepage has brief WIP summary", source["src/pages/index.astro"].includes("This site is an early portfolio pass") && source["src/pages/index.astro"].includes("about, playground, and a small grid of case studies")],
  ["homepage exposes about and playground", source["src/pages/index.astro"].includes("href=\"/about/\"") && source["src/pages/index.astro"].includes("href=\"/playground\"")],
  ["no old Romain content remains", !source["src/pages/index.astro"].includes("Romain") && !source["src/pages/index.astro"].includes("Avalle")],
  ["Traykov source case studies copied", source["case-studies/quickbase/connection-central.mdx"].includes("Connection Central") && source["case-studies/pages/01-home.mdx"].includes("prompt-first authenticated landing")],
  ["Traykov source writing copied", source["src/content/writing/radio-check.mdx"].includes("Radio Check")],
  ["work grid exists", source["src/pages/index.astro"].includes("project-grid")],
  ["selected projects exist", ["designing-pave", "synapse-sys", "pointlearn"].every((id) => source["src/pages/index.astro"].includes(`\"${id}\"`))],
  ["old work projects exist", oldWorkFiles.every((file) => source[file].includes("group: \"Old work\""))],
  ["case studies load from source files", source["src/lib/content.ts"].includes("walkFiles(\"./case-studies\", \".mdx\")")],
  ["case studies have separate detail route", source["src/pages/case-studies/[slug].astro"].includes("getStaticPaths") && source["src/pages/case-studies/[slug].astro"].includes("renderMarkdown(study.body)")],
  ["case studies have separate index page", source["src/pages/case-studies/index.astro"].includes("project-grid") && source["src/pages/case-studies/index.astro"].includes("oldWorkCards") && source["src/pages/case-studies/index.astro"].includes("Archived projects from the old projects page.")],
  ["homepage has no extra route-card section", !source["src/pages/index.astro"].includes("landing-routes") && !source["src/pages/index.astro"].includes("route-card")],
  ["homepage construction cards are not case-study links", source["src/pages/index.astro"].includes("project-card__body") && !source["src/pages/index.astro"].includes("href={study.href}") && !source["src/pages/index.astro"].includes("<a href={study.href}")],
  ["case-study index cards are not clickable", source["src/pages/case-studies/index.astro"].includes("project-card__body") && !source["src/pages/case-studies/index.astro"].includes("href={study.href}") && !source["src/pages/case-studies/index.astro"].includes("<a href={study.href}")],
  ["Pave Projects case study exists", source["case-studies/pages/projects.mdx"].includes("Projects — command center") && source["case-studies/pages/projects.mdx"].includes("group: \"Pave\"")],
  ["ASCII diagram renderer exists", source["src/lib/content.ts"].includes("renderStructuredDiagram") && source["src/lib/content.ts"].includes("class=\"ascii-diagram") && source["src/styles/global.css"].includes(".rfc-node")],
  ["Mermaid diagrams are transformed before rendering", source["src/lib/content.ts"].includes("normalized === \"mermaid\"") && source["src/lib/content.ts"].includes("stateDiagram-v2") && source["src/lib/content.ts"].includes("sequenceDiagram")],
  ["Diagram style matches RFC paper reference", source["src/styles/global.css"].includes("border: 3px dashed #0a0a08") && source["src/styles/global.css"].includes("background-size: 3px 3px") && source["src/styles/global.css"].includes("#f8f7f1") && source["src/styles/global.css"].includes("10px 10px 0")],
  ["Diagram pipeline documented", source["case-studies/README.mdx"].includes("Diagram Rendering Pipeline") && source["case-studies/README.mdx"].includes("dot-matrix offset shadows") && source["case-studies/_template.mdx"].includes("RFC-style ASCII diagrams")],
  ["Geist fonts are configured", source["package.json"].includes("@fontsource/geist-sans") && source["package.json"].includes("@fontsource/geist-mono") && source["src/styles/global.css"].includes("@fontsource/geist-sans/400.css") && source["src/styles/global.css"].includes("@fontsource/geist-mono/400.css") && source["src/styles/global.css"].includes("--sans: \"Geist Sans\"") && source["src/styles/global.css"].includes("--mono: \"Geist Mono\"")],
  ["Geist font decision documented", source["case-studies/README.mdx"].includes("Geist") && source["case-studies/README.mdx"].includes("Geist Mono")],
  ["shader ASCII ramp exists", source["public/ascii-shader.js"].includes("const ASCII_RAMP") && source["public/ascii-shader.js"].includes("✹")],
  ["playground ASCII ramp exists", source["public/ascii-playground.js"].includes("const PLAYGROUND_RAMP") && source["public/ascii-playground.js"].includes("✹")],
  ["Bulgarian localized glyph CSS exists", source["src/styles/global.css"].includes("font-language-override: \"BGR\"") && source["src/styles/global.css"].includes("font-feature-settings: \"locl\" 1")],
  ["shader palette is monochrome", source["public/ascii-shader.js"].includes("vec3 black") && !source["public/ascii-shader.js"].includes("vec3 acid")],
  ["main shader uses original ripple field", source["public/ascii-shader.js"].includes("float ripple") && source["public/ascii-shader.js"].includes("float radius") && source["public/ascii-shader.js"].includes("float warp")],
  ["ripple core is brightest", source["public/ascii-shader.js"].includes("float core") && source["public/ascii-shader.js"].includes("vec3 white = vec3(0.985)")],
  ["CSS accents are monochrome", !source["src/styles/global.css"].includes("#b9ff3c") && !source["src/styles/global.css"].includes("#4fe6ff") && !source["src/styles/global.css"].includes("#ff715b")],
  ["WebGL shader code exists", source["public/ascii-shader.js"].includes("getContext(\"webgl\"") && source["public/ascii-shader.js"].includes("fragmentSource")],
  ["Playground shader has controls", source["public/ascii-playground.js"].includes("u_width") && source["public/ascii-playground.js"].includes("rippleField") && source["public/ascii-playground.js"].includes("setControl")],
  ["shader is converted to ASCII", source["public/ascii-shader.js"].includes("readPixels") && source["public/ascii-shader.js"].includes("toAscii")],
  ["responsive CSS exists", source["src/styles/global.css"].includes("@media (max-width: 640px)")],
  ["reduced motion path exists", source["src/styles/global.css"].includes("prefers-reduced-motion") && source["public/ascii-shader.js"].includes("prefers-reduced-motion")]
];

const failures = checks.filter(([, passed]) => !passed);

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
