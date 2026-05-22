import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4326";
const outDir = "audit-artifacts/visual-audit";

const pages = [
  { name: "home", path: "/" },
  { name: "about", path: "/about/" },
  { name: "cases", path: "/case-studies/" },
  { name: "pave-case", path: "/case-studies/designing-pave/" }
];

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 844 }
];

function isMonochromeLike(color) {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return true;
  const [r, g, b, a = "1"] = match[1].split(/,\s*|\s+/).filter(Boolean).map(Number);
  if (Number.isFinite(a) && a === 0) return true;
  if (![r, g, b].every(Number.isFinite)) return true;
  return Math.max(r, g, b) - Math.min(r, g, b) <= 10;
}

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext();
const results = [];

for (const viewport of viewports) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);

  for (const route of pages) {
    const response = await page.goto(new URL(route.path, baseUrl).toString(), {
      waitUntil: "networkidle"
    });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(350);

    const file = `${outDir}/${route.name}-${viewport.name}.png`;
    await page.screenshot({ path: file, fullPage: true });

    const metrics = await page.evaluate(() => {
      const selectors = [
        "body",
        ".site-nav",
        ".hero-copy",
        ".section-kicker",
        ".name-reveal",
        ".project-card",
        ".case-hero-copy",
        ".case-study-body",
        ".about-copy",
        ".identity-rotator",
        ".site-footer"
      ];
      const colors = [];
      for (const selector of selectors) {
        for (const element of document.querySelectorAll(selector)) {
          const style = getComputedStyle(element);
          colors.push([selector, "color", style.color]);
          colors.push([selector, "backgroundColor", style.backgroundColor]);
          colors.push([selector, "borderColor", style.borderColor]);
        }
      }

      const overflowing = [...document.querySelectorAll("body *")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.right > window.innerWidth + 1;
        })
        .slice(0, 12)
        .map((element) => ({
          selector: element.className || element.tagName.toLowerCase(),
          right: Math.round(element.getBoundingClientRect().right),
          viewport: window.innerWidth
        }));

      const nav = document.querySelector(".site-nav nav");
      const navRect = nav?.getBoundingClientRect();
      const navLinks = nav ? [...nav.children].map((child) => child.getBoundingClientRect()) : [];
      const navWraps = navLinks.some((rect) => navRect && rect.top > navRect.top + 6);

      return {
        title: document.title,
        bodyWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        navWraps,
        overflowing,
        colors
      };
    });

    const offPalette = metrics.colors.filter(([, property, color]) => {
      if (property === "backgroundColor" && color === "rgba(0, 0, 0, 0)") return false;
      return !isMonochromeLike(color);
    });

    results.push({
      page: route.name,
      viewport: viewport.name,
      status: response?.status(),
      screenshot: file,
      horizontalOverflow: metrics.bodyWidth > metrics.viewportWidth + 1,
      navWraps: metrics.navWraps,
      overflowing: metrics.overflowing,
      offPalette: offPalette.slice(0, 16)
    });
  }

  await page.close();
}

await browser.close();

console.log(JSON.stringify(results, null, 2));
