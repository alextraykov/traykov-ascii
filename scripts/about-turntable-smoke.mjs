import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4330";
const outDir = "audit-artifacts/visual-audit";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const requests = [];

page.on("request", (request) => {
  const url = request.url();
  if (url.startsWith(baseUrl)) requests.push(url.replace(baseUrl, ""));
});

await page.goto(new URL("/about/", baseUrl).toString(), { waitUntil: "load" });
await page.waitForTimeout(2600);

const state = await page.evaluate(() => {
  const root = document.querySelector(".about-turntable");
  const staticAscii = root?.querySelector(".project-turntable__static");
  return {
    hasRoot: Boolean(root),
    hasWebgl: root?.classList.contains("has-webgl") ?? false,
    canvasCount: root?.querySelectorAll("canvas").length ?? 0,
    staticOpacity: staticAscii ? getComputedStyle(staticAscii).opacity : null,
    asciiLength: root?.querySelector("[data-obj-ascii]")?.textContent?.trim().length ?? 0
  };
});

await page.screenshot({ path: `${outDir}/about-turntable-smoke.png`, fullPage: false });
await browser.close();

const result = {
  ...state,
  modelRequested: requests.some((url) => url.includes("/models/me.glb")),
  requests: requests.filter((url) => url.includes("glb") || url.includes("obj") || url.includes("three") || url.includes("about"))
};

console.log(JSON.stringify(result, null, 2));

if (!result.hasRoot || !result.hasWebgl || !result.modelRequested || result.canvasCount < 1) {
  process.exitCode = 1;
}
