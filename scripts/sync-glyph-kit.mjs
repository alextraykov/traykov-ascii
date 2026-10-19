#!/usr/bin/env node
// Refreshes this site's copy of the Glyph kit from a checkout of the glyph-kit repository.
// Usage: node scripts/sync-glyph-kit.mjs            (reads ../glyph-kit, or GLYPH_KIT_DIR)
//
// The site keeps only what it uses:
// - skills/glyph-kit/: the shipped skill as the kit publishes it (no tests), plus four things the
//   Labs page needs that the skill no longer ships: docs.mjs, live/pace.mjs, the eight area example
//   files and the measurements.
// - public/labs/glyph-kit/: the three example pages the Labs page links to.
// The drawing function (api/glyph-kit-draw.js) reads SKILL.md and reference/ from the same copy.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.env.GLYPH_KIT_DIR ?? join(root, "../glyph-kit");
const skillSource = join(source, "skills/glyph-kit");
if (!existsSync(join(skillSource, "SKILL.md"))) {
  console.error(`No Glyph kit checkout at ${source}. Clone github.com/alextraykov/glyph-kit next to this folder, or set GLYPH_KIT_DIR.`);
  process.exit(1);
}

const skill = join(root, "skills/glyph-kit");
const served = join(root, "public/labs/glyph-kit");
const copied = [];
const copy = (from, to, options = {}) => {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true, ...options });
  copied.push(relative(root, to));
};

// The skill, as published: everything but the DS_Store litter and any test that sneaks in.
rmSync(skill, { recursive: true, force: true });
copy(skillSource, skill, { filter: (p) => !p.endsWith(".DS_Store") && !p.endsWith(".test.mjs") });

// What the Labs page imports beyond the published skill.
copy(join(source, "tools/docs.mjs"), join(skill, "scripts/docs.mjs"));
copy(join(source, "docs/measurements.json"), join(skill, "reference/measurements.json"));
for (const f of readdirSync(join(source, "tools/examples")).filter((f) => f.endsWith(".json"))) {
  copy(join(source, "tools/examples", f), join(skill, "examples", f));
}
// pace.mjs lives in the kit's tools/ and imports the grid by its repository path; here it sits beside the grid.
const pace = readFileSync(join(source, "tools/pace.mjs"), "utf8").replace(/from "\.\.\/skills\/glyph-kit\/scripts\/live\//g, 'from "./');
writeFileSync(join(skill, "scripts/live/pace.mjs"), pace);
copied.push("skills/glyph-kit/scripts/live/pace.mjs");

// The example pages the Labs page links to: the deck, the prototype and the printed report.
rmSync(served, { recursive: true, force: true });
copy(join(source, "site/public/examples/decks/motion-audit.html"), join(served, "motion-audit-deck.html"));
copy(join(source, "site/public/examples/product/settings.html"), join(served, "settings.html"));
copy(join(source, "site/public/examples/motion-audit/motion-audit.pdf"), join(served, "motion-audit.pdf"));

const size = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).reduce((n, e) => n + statSync(join(e.parentPath ?? e.path, e.name)).size, 0);
console.log(copied.map((p) => `  ${p}`).join("\n"));
console.log(`skills/glyph-kit: ${Math.round(size(skill) / 1024)} KB · public/labs/glyph-kit: ${Math.round(size(served) / 1024)} KB`);
