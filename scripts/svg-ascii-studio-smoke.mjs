import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.BASE_URL || process.argv[2] || "http://127.0.0.1:4323";
const target = new URL("/svg-ascii-studio/", baseUrl).toString();
const outputDir = new URL("../audit-artifacts/svg-ascii-studio/", import.meta.url);

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 }
]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  const failedResponses = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(target, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.localStorage.removeItem("ascii-studio:workspace");
    window.localStorage.removeItem("ascii-studio:side-panels");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const firstRun = await page.evaluate(() => ({
    title: document.title,
    path: location.pathname,
    sourceState: document.querySelector("[data-studio]")?.dataset.sourceState,
    asciiLength: document.querySelector("[data-ascii-output]")?.textContent?.trim().length || 0,
    hasCanvas: document.querySelectorAll("canvas").length > 0,
    emptyVisible: !document.querySelector("[data-stage-empty]")?.hidden,
    sourceName: document.querySelector("[data-source-name]")?.textContent || "",
    exportDisabled: Array.from(document.querySelectorAll("[data-export-requires-valid]")).every((button) => button.disabled),
    settingsLength: document.querySelector("[data-settings-output]")?.value?.length || 0,
    codeHasFactory: document.querySelector("[data-code-output]")?.value?.includes("createSvgAsciiObject") || false,
    status: document.querySelector("[data-status]")?.textContent || "",
    navStudio: Boolean(document.querySelector('a[href="/svg-ascii-studio/"]'))
  }));

  await page.locator("[data-load-sample=mark]").click();
  await page.waitForTimeout(1400);

  const loaded = await page.evaluate(() => ({
    sourceState: document.querySelector("[data-studio]")?.dataset.sourceState,
    asciiLength: document.querySelector("[data-ascii-output]")?.textContent?.trim().length || 0,
    emptyVisible: !document.querySelector("[data-stage-empty]")?.hidden,
    settingsLength: document.querySelector("[data-settings-output]")?.value?.length || 0,
    codeHasFactory: document.querySelector("[data-code-output]")?.value?.includes("createSvgAsciiObject") || false,
    status: document.querySelector("[data-status]")?.textContent || "",
    storageSaved: Boolean(window.localStorage.getItem("ascii-studio:workspace"))
  }));

  await page.locator("[data-control=depth]").fill("88");
  await page.locator("[data-control=depth]").dispatchEvent("input");
  await page.waitForTimeout(350);
  await page.locator("[data-panel-tab=export]").click();
  await page.waitForTimeout(150);

  const after = await page.evaluate(() => {
    const stage = document.querySelector("[data-stage]");
    const rect = stage.getBoundingClientRect();
    const settings = document.querySelector("[data-settings-output]")?.value || "";
    const code = document.querySelector("[data-code-output]")?.value || "";
    return {
      stageWidth: Math.round(rect.width),
      stageHeight: Math.round(rect.height),
      depthOutput: document.querySelector("[data-output=depth]")?.textContent || "",
      settingsHasDepth: settings.includes('"depth": 88'),
      codeLength: code.length,
      exportVisible: !document.querySelector("[data-panel=export]")?.hidden
    };
  });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const restored = await page.evaluate(() => ({
    sourceState: document.querySelector("[data-studio]")?.dataset.sourceState,
    asciiLength: document.querySelector("[data-ascii-output]")?.textContent?.trim().length || 0,
    emptyVisible: !document.querySelector("[data-stage-empty]")?.hidden,
    depthOutput: document.querySelector("[data-output=depth]")?.textContent || "",
    settingsHasDepth: (document.querySelector("[data-settings-output]")?.value || "").includes('"depth": 88'),
    status: document.querySelector("[data-status]")?.textContent || "",
    storageSaved: Boolean(window.localStorage.getItem("ascii-studio:workspace"))
  }));

  await page.screenshot({
    path: fileURLToPath(new URL(`${viewport.name}.png`, outputDir)),
    fullPage: true
  });

  let edgeCases = null;
  if (viewport.name === "desktop") {
    await page.locator(".source-actions [data-clear-source]").click();
    await page.waitForTimeout(100);
    const emptyState = await page.evaluate(() => ({
      sourceState: document.querySelector("[data-studio]")?.dataset.sourceState,
      emptyVisible: !document.querySelector("[data-stage-empty]")?.hidden,
      exportDisabled: Array.from(document.querySelectorAll("[data-export-requires-valid]")).every((button) => button.disabled),
      storageCleared: !window.localStorage.getItem("ascii-studio:workspace"),
      status: document.querySelector("[data-status]")?.textContent || ""
    }));

    await page.locator(".import-tools summary").click();
    await page.locator("[data-svg-paste]").fill(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" onload="window.__svgPwned=1">
      <script>window.__svgPwned=1</script>
      <image href="https://example.com/bad.png" width="64" height="64" />
      <path onclick="window.__svgPwned=1" fill="#080808" d="M8 8h48v48H8z"/>
    </svg>`);
    await page.locator("[data-load-paste]").click();
    await page.waitForTimeout(600);
    const sanitization = await page.evaluate(() => ({
      pwned: window.__svgPwned === 1,
      sourceState: document.querySelector("[data-studio]")?.dataset.sourceState,
      asciiLength: document.querySelector("[data-ascii-output]")?.textContent?.trim().length || 0,
      previewHasScript: Boolean(document.querySelector("[data-svg-preview] script")),
      previewHasImage: Boolean(document.querySelector("[data-svg-preview] image")),
      previewHasOnload: document.querySelector("[data-svg-preview] svg")?.hasAttribute("onload") || false,
      previewHasOnclick: document.querySelector("[data-svg-preview] path")?.hasAttribute("onclick") || false,
      securityText: document.querySelector('[data-diagnostic="security"]')?.textContent || "",
      storageSaved: Boolean(window.localStorage.getItem("ascii-studio:workspace")),
      status: document.querySelector("[data-status]")?.textContent || ""
    }));

    edgeCases = { emptyState, sanitization };
  }

  results.push({ viewport: viewport.name, firstRun, loaded, after, restored, edgeCases, errors, failedResponses });
  await context.close();
}

await browser.close();

console.log(JSON.stringify({ target, results }, null, 2));
