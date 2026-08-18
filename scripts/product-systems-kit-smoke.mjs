import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.BASE_URL || process.argv[2] || "http://127.0.0.1:4323";
const target = new URL("/labs/product-systems-kit/", baseUrl).toString();
const outputDir = new URL("../audit-artifacts/product-systems-kit/", import.meta.url);

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = {};

const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
const failedResponses = [];

page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (
    message.type() === "error" &&
    !message.text().includes("_vercel/insights") &&
    !message.text().includes("Failed to load resource")
  ) {
    errors.push(message.text());
  }
});
page.on("response", (response) => {
  if (response.status() >= 400 && !response.url().includes("/_vercel/insights/")) {
    failedResponses.push(`${response.status()} ${response.url()}`);
  }
});

await page.goto(target, { waitUntil: "networkidle" });
const root = page.locator("[data-product-systems-kit]");
const openButton = page.locator("[data-kit-open]");

results.initial = {
  title: await page.title(),
  path: new URL(page.url()).pathname,
  state: await root.getAttribute("data-state"),
  itemCount: await page.locator("[data-kit-item]").count()
};

await openButton.click();
await page.waitForFunction(
  () => document.querySelector("[data-product-systems-kit]")?.getAttribute("data-state") === "open"
);

const codex = page.locator('[data-kit-id="codex"]');
await codex.click();
results.selection = {
  state: await root.getAttribute("data-state"),
  name: await page.locator("[data-kit-detail-name]").textContent(),
  description: await page.locator("[data-kit-detail-description]").textContent()
};

await codex.press("ArrowRight");
results.arrowNavigation = {
  focusedId: await page.evaluate(() => document.activeElement?.getAttribute("data-kit-id")),
  name: await page.locator("[data-kit-detail-name]").textContent()
};

await page.keyboard.press("Escape");
results.close = {
  state: await root.getAttribute("data-state"),
  focusedTrigger: await openButton.evaluate((element) => document.activeElement === element)
};

await page.screenshot({
  path: fileURLToPath(new URL("desktop.png", outputDir)),
  fullPage: true
});
await context.close();

const noJsContext = await browser.newContext({
  viewport: { width: 900, height: 1000 },
  javaScriptEnabled: false
});
const noJsPage = await noJsContext.newPage();
await noJsPage.goto(target, { waitUntil: "load" });
results.noJavaScript = {
  fallbackCount: await noJsPage.locator(".product-kit__fallback-details li").count(),
  fallbackVisible: await noJsPage.locator(".product-kit__fallback-details").isVisible(),
  openInventoryVisible: await noJsPage.locator("[data-kit-open-state]").isVisible()
};
await noJsContext.close();

const reducedContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce"
});
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(target, { waitUntil: "networkidle" });
await reducedPage.locator("[data-kit-open]").click();
await reducedPage.waitForFunction(
  () => document.activeElement?.getAttribute("data-kit-id") === "figma"
);
results.reducedMotion = {
  state: await reducedPage.locator("[data-product-systems-kit]").getAttribute("data-state"),
  firstItemFocused: await reducedPage
    .locator('[data-kit-id="figma"]')
    .evaluate((element) => document.activeElement === element),
  minimumItemHeight: await reducedPage
    .locator("[data-kit-item]")
    .first()
    .evaluate((element) => Math.round(element.getBoundingClientRect().height))
};
await reducedPage.screenshot({
  path: fileURLToPath(new URL("mobile-reduced-motion.png", outputDir)),
  fullPage: true
});
await reducedContext.close();

await browser.close();

results.errors = errors;
results.failedResponses = failedResponses;
console.log(JSON.stringify(results, null, 2));

const passed =
  results.initial.title.includes("Product Systems Kit") &&
  results.initial.path === "/labs/product-systems-kit/" &&
  results.initial.state === "closed" &&
  results.initial.itemCount === 8 &&
  results.selection.state === "open" &&
  results.selection.name?.trim() === "Codex" &&
  results.arrowNavigation.focusedId === "vscode" &&
  results.arrowNavigation.name?.trim() === "VS Code" &&
  results.close.state === "closed" &&
  results.close.focusedTrigger &&
  results.noJavaScript.fallbackCount === 8 &&
  results.noJavaScript.fallbackVisible &&
  results.noJavaScript.openInventoryVisible &&
  results.reducedMotion.state === "open" &&
  results.reducedMotion.firstItemFocused &&
  results.reducedMotion.minimumItemHeight >= 44 &&
  errors.length === 0 &&
  failedResponses.length === 0;

if (!passed) process.exitCode = 1;
