// Publishes the glyph-kit skill for the Labs page.
// Usage: node scripts/package-glyph-kit.mjs
// skills/glyph-kit is the source. This copies it to public/labs/glyph-kit/skill/ (served as
// readable files) and writes public/labs/glyph-kit/glyph-kit.zip with a glyph-kit/ root folder.
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "skills/glyph-kit");
const out = join(root, "public/labs/glyph-kit");
const zip = join(out, "glyph-kit.zip");

rmSync(join(out, "skill"), { recursive: true, force: true });
cpSync(source, join(out, "skill"), { recursive: true });

const stage = mkdtempSync(join(tmpdir(), "glyph-kit-"));
cpSync(source, join(stage, "glyph-kit"), { recursive: true });
rmSync(zip, { force: true });
execFileSync("zip", ["-qrX", zip, "glyph-kit", "-x", "*.DS_Store"], { cwd: stage });
rmSync(stage, { recursive: true, force: true });
console.log(`glyph-kit: copied to public/labs/glyph-kit/skill and zipped to ${zip.replace(root + "/", "")}`);
