// Advisory screenshot pairs for the picks batches (site-picks-implementation.md §3): for each row it
// captures (a) the site element and (b) the matching column of the review page
// (docs/audits/2026-10-16-visual-direction/component-directions.html with html[data-one=<dir>]) at
// 1440 and 390 wide, light and dark, motion on and reduced. Not part of `npm run check`.
//
//   BASE_URL=http://127.0.0.1:4431 node scripts/picks-screens.mjs [batch-1|batch-2] [component …]
//
// Output: audit-artifacts/picks/<batch>/<component>-<viewport>-<theme>-<motion>-{site,review}.png
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4321";
const [batch = "batch-1", ...only] = process.argv.slice(2);
const reviewUrl = pathToFileURL(resolve("docs/audits/2026-10-16-visual-direction/component-directions.html")).href;
const outDir = resolve("audit-artifacts/picks", batch);
mkdirSync(outDir, { recursive: true });

const hover = (selector) => async (page) => {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  await target.hover();
  await page.waitForTimeout(260);
};
const click = (selector, wait = 520) => async (page) => {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  await target.click();
  await page.waitForTimeout(wait);
};
const settle = (ms = 700) => async (page) => page.waitForTimeout(ms);
const search = (word, wait = 520) => async (page) => {
  const details = page.locator(".notes-search").first();
  if (!(await details.evaluate((element) => element.open))) await page.locator(".notes-search > summary").click();
  await page.locator("[data-notes-query]").fill(word);
  await page.waitForTimeout(wait);
};
const tab = async (page) => {
  await page.keyboard.press("Tab");
  await page.waitForTimeout(120);
};

// [component, route, site selector, review id, review direction, site action, review action, capture]
// capture "page" takes the viewport (dialogs and the skip link), otherwise the element.
const ROWS = {
  "batch-1": [
    ["nav", "/case-studies/designing-pave/", ".site-nav", "nav", "c", async (page) => {
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight * 0.35, behavior: "instant" }));
      await page.waitForTimeout(260);
    }],
    ["nav-hover", "/", ".site-nav", "nav", "c", hover(".site-nav nav a:nth-child(3)"), hover("#cmp-nav .col.dir-c .nv-links a:nth-child(3)")],
    ["theme", "/", ".site-nav__controls", "theme", "c"],
    ["theme-footer", "/notes/", ".site-footer__settings", "theme", "c"],
    ["motion", "/notes/", ".site-footer__settings [data-motion-toggle]", "motion", "b"],
    ["back-to-top", "/notes/", ".site-footer__base", "back-to-top", "a"],
    ["footer", "/notes/", ".site-footer", "footer", "b", hover(".site-footer .footer-links a:nth-of-type(2)"), hover("#cmp-footer .col.dir-b .ft-col a:nth-of-type(2)")],
    ["dialog", "/notes/", "page", "dialog", "b", click(".site-footer [data-booking-modal-open]"), click("#cmp-dialog .col.dir-b .dg-open"), "page"],
    ["skip-link", "/", "page", "skip", "a", tab, click("#cmp-skip .col.dir-a .sk-start", 200), "page"],
    ["tooltip", "/", ".site-nav__controls", "tooltip", "a", async (page) => {
      await page.locator(".site-nav .theme-toggle").focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await page.waitForTimeout(120);
    }, async (page) => {
      await page.locator("#cmp-tooltip .col.dir-a .tt-b").focus();
      await page.waitForTimeout(160);
    }, "union"],
    ["primary", "/contact/", "main [data-ascii-action=primary]", "primary", "a", hover("main [data-ascii-action=primary]"), hover("#cmp-primary .col.dir-a [data-go]")],
    ["secondary", "/about/", "main [data-ascii-action=secondary]", "secondary", "a"],
    ["quiet", "/", ".project-overview__link", "quiet", "a", hover(".project-overview__link"), hover("#cmp-quiet .col.dir-a .as-q")],
    ["inline-link", "/case-studies/designing-pave/", ".case-study-body p:has(> a[href^='http']:not([class]))", "inline-link", "a"],
    ["arrows", "/case-studies/designing-pave/", ".case-breadcrumb", "arrows", "a", hover(".case-breadcrumb a"), hover("#cmp-arrows .col.dir-a .as-q--back")],
    ["icon-button", "/case-studies/designing-pave/", ".cell-player", "icon-button", "a", hover(".cell-player__play"), hover("#cmp-icon-button .col.dir-a .as-ib")],
    ["segmented", "/", ".breathing-grid__variants", "segmented", "a", hover(".breathing-grid__variants button:nth-child(3)"), hover("#cmp-segmented .col.dir-a [role=tab]:nth-child(3)")],
    ["select", "/playground/", ".playground-controls select", "select", "a"],
    ["listbox", "/labs/ascii-banner/", ".ascii-banner-studio__quality-picker", "select", "a", click(".ascii-banner-studio__quality-trigger", 320), click("#cmp-select .col.dir-a .as-lb-b", 320), "union-list"],
    ["checkbox", "/playground/", ".playground-controls .control-toggle", "checkbox", "a"],
    ["slider", "/playground/", ".playground-controls .cell-range", "slider", "b"],
    ["disclosure", "/labs/presenting-in-code/", ".pc-shell details.pc-disclosure", "disclosure", "a", click(".pc-shell details.pc-disclosure > summary", 320), click("#cmp-disclosure .col.dir-a summary", 320)],
    ["point-refresh", "/labs/", ".labs-item__screen", "point-refresh", "b", async (page) => {
      const target = page.locator(".labs-item__screen").first();
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      const box = await target.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(170);
    }, async (page) => {
      await page.locator("#cmp-point-refresh .col.dir-b [data-play]").click();
      await page.waitForTimeout(170);
    }]
  ],
  "batch-2": [
    ["notes-rows", "/notes/", ".notes-list", "notes-rows", "a", hover(".notes-list__item:nth-child(2) > a"), hover("#cmp-notes-rows .col.dir-a .nr-row:nth-child(2) a")],
    ["notes-search", "/notes/", ".notes-directory", "notes-rows", "a", search("design"), click("#cmp-notes-rows .col.dir-a [data-q='design']", 700)],
    ["notes-empty", "/notes/", "main", "empty", "b", search("zzzzqq", 700)],
    ["labs-rows", "/labs/", ".labs-list", "labs-rows", "a", async (page) => { await settle()(page); await hover(".labs-item:nth-child(2) .labs-item__link")(page); }, hover("#cmp-labs-rows .col.dir-a li:nth-child(2) .lr-link")],
    ["item-rows-about", "/about/", ".published-list", "item-rows", "a", hover(".published-item:nth-child(2) a[data-ascii-action]"), hover("#cmp-item-rows .col.dir-a .ir-row:nth-child(2) .l3-btn")],
    ["item-rows-cv", "/cv/", ".experience-list", "item-rows", "a"],
    ["entry-rail", "/", ".homepage-timeline__toc", "entry-rail", "b", hover(".homepage-timeline__toc li:nth-child(3) a"), hover("#cmp-entry-rail .col.dir-b li:nth-child(3) a")],
    ["work-entry", "/", ".project-overview", "work-entry", "a", settle()],
    ["work-entry-player", "/", ".project-overview__recording--lead .overview-video__frame", "work-entry", "a", settle()],
    ["hero", "/case-studies/designing-pave/", ".case-hero-copy", "hero", "a"],
    ["facts", "/case-studies/designing-pave/", "#bluf + p + ul", "facts", "a"],
    ["video", "/case-studies/designing-pave/", ".case-video-copy", "video", "b", hover(".case-video-copy .cell-player__play"), null],
    ["grid", "/case-studies/designing-pave/", ".case-image-grid:not(.case-gallery)", "grid", "a", settle()],
    ["tag-chips", "/case-studies/designing-pave/", ".case-compare__caption:has(.case-tag)", "live", "a"],
    ["stat-count", "/case-studies/pave-new-look/", ".case-stats", "stat", "b", async (page) => {
      await page.locator(".case-stats").first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(1400);
    }],
    ["cover", "/case-studies/pipelines/", ".case-cover", "cover", "a", settle()]
  ]
};

const rows = (ROWS[batch] || []).filter(([name]) => !only.length || only.includes(name));
const viewports = [
  { name: "1440", width: 1440, height: 900, view: "desktop" },
  { name: "390", width: 390, height: 844, view: "phone" }
];
const themes = ["light", "dark"];
const motions = ["on", "reduced"];

async function captureElement(page, selector, mode, path) {
  if (mode === "page") {
    await page.screenshot({ path });
    return;
  }
  const target = page.locator(selector).first();
  if (mode === "union" || mode === "union-list") {
    const extra = mode === "union" ? ".pick-tooltip:not([hidden]), #cmp-tooltip .col.dir-a .tt.is-on" : "[role=listbox]:not([hidden])";
    const boxes = [await target.boundingBox()];
    const more = page.locator(extra).first();
    if (await more.count()) boxes.push(await more.boundingBox());
    const valid = boxes.filter(Boolean);
    const x = Math.max(0, Math.min(...valid.map((b) => b.x)) - 8);
    const y = Math.max(0, Math.min(...valid.map((b) => b.y)) - 8);
    const right = Math.max(...valid.map((b) => b.x + b.width)) + 8;
    const bottom = Math.max(...valid.map((b) => b.y + b.height)) + 8;
    await page.screenshot({ path, clip: { x, y, width: right - x, height: bottom - y } });
    return;
  }
  await target.screenshot({ path });
}

const browser = await chromium.launch();
const failures = [];
try {
  for (const viewport of viewports) {
    for (const theme of themes) {
      for (const motion of motions) {
        const options = {
          viewport: { width: viewport.width, height: viewport.height },
          colorScheme: theme,
          reducedMotion: motion === "reduced" ? "reduce" : "no-preference"
        };
        const site = await browser.newContext(options);
        await site.addInitScript((value) => {
          try { localStorage.setItem("traykov-color-theme", value); } catch {}
        }, theme);
        const review = await browser.newContext(options);
        const suffix = `${viewport.name}-${theme}-${motion}`;
        for (const [name, route, selector, reviewId, direction, siteAction, reviewAction, mode] of rows) {
          const page = await site.newPage();
          try {
            await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "networkidle" });
            await page.waitForTimeout(400);
            if (selector !== "page") {
              await page.locator(selector).first().scrollIntoViewIfNeeded();
              await page.waitForTimeout(240);
            }
            if (siteAction) await siteAction(page);
            await captureElement(page, selector, mode, resolve(outDir, `${name}-${suffix}-site.png`));
          } catch (error) {
            failures.push(`${name} ${suffix} site: ${error.message.split("\n")[0]}`);
          } finally {
            await page.close();
          }

          const ref = await review.newPage();
          try {
            await ref.addInitScript((prefs) => {
              localStorage.setItem("traykov-directions-review", JSON.stringify(prefs));
            }, { one: direction, theme, view: viewport.view, motion: motion === "reduced" ? "off" : "on" });
            await ref.goto(reviewUrl, { waitUntil: "load" });
            const column = `#cmp-${reviewId} .col.dir-${direction} .col-body`;
            await ref.locator(column).first().scrollIntoViewIfNeeded();
            await ref.waitForTimeout(700);
            if (reviewAction) await reviewAction(ref);
            await captureElement(ref, column, mode, resolve(outDir, `${name}-${suffix}-review.png`));
          } catch (error) {
            failures.push(`${name} ${suffix} review: ${error.message.split("\n")[0]}`);
          } finally {
            await ref.close();
          }
        }
        await site.close();
        await review.close();
      }
    }
  }
} finally {
  await browser.close();
}

console.log(`picks-screens: ${rows.length} components × ${viewports.length * themes.length * motions.length} states → ${outDir}`);
if (failures.length) {
  console.log(failures.join("\n"));
  process.exitCode = 1;
}
