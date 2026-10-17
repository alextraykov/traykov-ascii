// Builds ../component-directions.html from the partials in this folder (plan §4.2).
// Usage: node docs/audits/2026-10-16-visual-direction/directions/build.mjs
// Order: 00-shell-head.html (style goes in at __STYLE__) → 00-primitives.html → every [1-9]*.html sorted by
// name → <script> 00-runtime.js → 00-shell-foot.html. Fails (exit 1, nothing written) on any check below.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const auditDir = path.resolve(here, "..");
const repoRoot = path.resolve(here, "../../../..");
const outFile = path.join(auditDir, "component-directions.html");
const KB = 1024;
const LIMITS = { shell: 40 * KB, partial: 48 * KB, total: 580 * KB };
const read = (name) => fs.readFileSync(path.join(here, name), "utf8");
const bytes = (text) => Buffer.byteLength(text, "utf8");
const failures = [];

// Fonts: the three @font-face rules embedded in the motion specimen.
const specimen = fs.readFileSync(path.join(auditDir, "motion-specimen.html"), "utf8");
const fontRe = /@font-face\{font-family:"(Geist|Geist Mono|Departure Mono)";src:url\("data:font\/woff2;base64,[^"]+"\)[^}]*\}/g;
const fonts = [...specimen.matchAll(fontRe)];
const families = new Set(fonts.map((match) => match[1]));
if (families.size !== 3) failures.push(`Expected three embedded fonts in motion-specimen.html, found ${[...families].join(", ") || "none"}.`);
const fontCss = [...new Map(fonts.map((match) => [match[1], match[0]])).values()].join("\n");

// Logo: public/sasi.svg, URL-encoded for a CSS mask.
const logo = `data:image/svg+xml,${encodeURIComponent(fs.readFileSync(path.join(repoRoot, "public/sasi.svg"), "utf8").replace(/\s+/g, " ").trim())}`;

// Light minification so the contract comments and indentation stay in source but not in the page.
// CSS: comments out, whitespace collapsed around braces, colons and commas.
const css = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .replace(/\s*([{};,>])\s*/g, "$1")
  .replace(/:\s+/g, ":")
  .replace(/;}/g, "}")
  .trim();
// JS: a small tokenizer that keeps strings, template literals and regular expressions intact, drops
// comments, keeps every line break (so semicolon insertion never changes) and removes other spaces
// unless two words or two identical operators would touch.
const js = (src) => {
  let out = "";
  let space = false;
  let line = false;
  const word = (c) => /[A-Za-z0-9_$]/.test(c || "");
  const emit = (text) => {
    if (line && out) out += "\n";
    else if (space && out) {
      const a = out[out.length - 1];
      if ((word(a) && word(text[0])) || (a === text[0] && "+-/".includes(a))) out += " ";
    }
    space = line = false;
    out += text;
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i += 1; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2) + 2; space = true; continue; }
    if (/\s/.test(c)) { if (c === "\n") line = true; else space = true; i += 1; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === "\\" ? 2 : 1;
      emit(src.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (c === "/") {
      const prev = out[out.length - 1];
      if (!prev || "(,=:[!&|?{};+-*%<>~^".includes(prev) || /(?:^|[^\w$])(?:return|typeof|case|in|of|new|delete|void|throw)$/.test(out)) {
        let j = i + 1;
        let inClass = false;
        while (j < src.length) {
          const d = src[j];
          if (d === "\\") { j += 2; continue; }
          if (d === "[") inClass = true;
          else if (d === "]") inClass = false;
          else if (d === "/" && !inClass) break;
          j += 1;
        }
        j += 1;
        while (j < src.length && /[a-z]/.test(src[j])) j += 1;
        emit(src.slice(i, j));
        i = j;
        continue;
      }
    }
    if (word(c)) {
      let j = i;
      while (j < src.length && word(src[j])) j += 1;
      emit(src.slice(i, j));
      i = j;
      continue;
    }
    emit(c);
    i += 1;
  }
  return out;
};

const head = read("00-shell-head.html");
const tokens = css(read("00-tokens.css"));
const shellCss = css(read("00-shell.css")).replaceAll("__LOGO__", logo);
const runtime = js(read("00-runtime.js"));
const foot = read("00-shell-foot.html");
const partialNames = ["00-primitives.html", ...fs.readdirSync(here).filter((name) => /^[1-9].*\.html$/.test(name)).sort()];
const partials = partialNames.map((name) => ({ name, text: read(name) }));

const style = `<style>\n${fontCss}\n${tokens}\n${shellCss}\n</style>`;
const top = head.includes("__STYLE__") ? head.replace("__STYLE__", style) : `${head}\n${style}`;
const page = [top, ...partials.map((part) => part.text), `<script>\n${runtime}\n</script>`, foot].join("\n");

// Checks.
const shellSize = bytes(head) + bytes(tokens) + bytes(shellCss) + bytes(runtime) + bytes(foot);
// The 40 KB shell figure is a budget, not a failure (plan §4.2 fails only on partials and the total). It is
// over because the dither tokens are copied verbatim (8 KB) and the logo mask is 3 KB; the total still fits
// with six full 48 KB partials (fonts 213 KB + shell 54 KB + 6 × 48 KB ≈ 555 KB).
const shellNote = shellSize > LIMITS.shell ? ` (over the 40 KB budget)` : "";
partials.forEach((part) => {
  if (bytes(part.text) > LIMITS.partial) failures.push(`${part.name} is ${(bytes(part.text) / KB).toFixed(1)} KB; split it into NN-a-… and NN-b-… (limit 48 KB).`);
});
const total = bytes(page);
if (total > LIMITS.total) failures.push(`The built page is ${(total / KB).toFixed(1)} KB; the limit is 580 KB.`);

const FORBIDDEN = [
  [/\bgrep\b/i, "grep"], [/localhost/i, "localhost"], [/\$ /, "a dollar prompt"], [/SOURCE \//, "SOURCE /"], [/\bERR/, "ERR"],
  [/\bnull\b/, "null"], [/\bundefined\b/, "undefined"], [/\bTODO\b/, "TODO"], [/lorem/i, "lorem"],
  [/\b[A-Z]{2,}(?:[\s·:–—-]+[A-Z]{2,}){2,}\b/, "three or more capitalised words in a row"]
];
const visibleText = (html) => {
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  const literals = scripts.flatMap((code) => [...code.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map((match) => match[2]))
    .filter((value) => /\s/.test(value.trim()) || /^[A-Z][a-z]/.test(value));
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
  const attrs = [...body.matchAll(/\b(?:aria-label|title|placeholder|alt|data-name|data-baseline|data-group)\s*=\s*"([^"]*)"/gi)].map((match) => match[1]);
  return [body.replace(/<[^>]+>/g, " "), ...attrs, ...literals].join("\n").replace(/&[a-z#0-9]+;/gi, " ");
};
const outsideStyle = (html) => html.replace(/<style[\s\S]*?<\/style>/gi, " ");
[{ name: "00-shell-head.html", text: head.replace("__STYLE__", "") }, ...partials, { name: "00-shell-foot.html", text: foot }].forEach((part) => {
  const text = visibleText(part.text);
  FORBIDDEN.forEach(([pattern, label]) => {
    const match = text.match(pattern);
    if (match) failures.push(`${part.name}: visible text uses ${label} ("${text.slice(Math.max(0, match.index - 20), match.index + 30).replace(/\s+/g, " ").trim()}").`);
  });
  if (/<img\b/i.test(part.text)) failures.push(`${part.name}: contains <img>; use Dir.placeholder.`);
  const code = part.text.replace(/xmlns(:\w+)?="http:\/\/www\.w3\.org\/[^"]*"/g, "");
  if (/https?:/i.test(code)) failures.push(`${part.name}: contains an http reference.`);
  if (/url\(/i.test(outsideStyle(part.text)) || (part.name !== "00-shell-head.html" && /url\(/i.test(part.text))) failures.push(`${part.name}: contains url(…); use the dither tokens.`);
});
if (/url\(|https?:/i.test(runtime)) failures.push("00-runtime.js: contains url(…) or an http reference.");

if (failures.length) {
  console.error(`Build failed (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
fs.writeFileSync(outFile, page);
const rel = path.relative(process.cwd(), outFile) || outFile;
console.log(`${rel} · ${total.toLocaleString("en-GB")} bytes (${(total / KB).toFixed(1)} KB of 580) · shell ${(shellSize / KB).toFixed(1)} KB${shellNote} · ${partials.length} partial${partials.length === 1 ? "" : "s"}: ${partialNames.join(", ")} · checks passed`);
