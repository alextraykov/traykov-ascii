import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { once } from "node:events";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { chromium, webkit } from "@playwright/test";
import { buildPrivateWork } from "./build-private-work.mjs";
import { createPrivateWorkDevServer } from "./private-work-dev.mjs";
import { createPasswordHash } from "../server/private-work/session.js";

const fixturePassword = "fixture password for browser access checks";
const repositoryRoot = process.cwd();
const publicRoot = resolve(repositoryRoot, "dist");

function pagePath(page) {
  return new URL(page.url()).pathname;
}

async function waitForPath(page, path) {
  if (pagePath(page) === path) return;
  await page.waitForURL((url) => url.pathname === path, { timeout: 10_000 });
}

async function verifyNoJavaScriptDeepLink(browser, baseUrl, theme, retry) {
  const context = await browser.newContext({
    colorScheme: theme,
    isMobile: true,
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 }
  });

  try {
    const page = await context.newPage();
    await page.goto(`${baseUrl}/private/pave-unified-building/`, { waitUntil: "domcontentloaded" });
    assert.equal(pagePath(page), "/private-access/");
    assert.equal(new URL(page.url()).searchParams.get("returnTo"), "/private/pave-unified-building/");

    if (retry) {
      await page.locator('input[name="password"]').fill("wrong fixture password");
      await page.locator('button[type="submit"]').click();
      await page.locator('[role="alert"]').waitFor();
      assert.match(await page.locator('[role="alert"]').textContent(), /did not work/i);
    }

    await page.locator('input[name="password"]').fill(fixturePassword);
    const [loginResponse] = await Promise.all([
      page.waitForResponse((response) => {
        const request = response.request();
        return request.method() === "POST" && new URL(response.url()).pathname === "/api/private-work";
      }),
      page.locator('button[type="submit"]').click()
    ]);
    assert.equal(loginResponse.status(), 303, `The ${theme} no-JavaScript login should redirect after a valid password.`);
    await waitForPath(page, "/private/pave-unified-building/");
    assert.match(await page.locator("h1").textContent(), /Fixture study one/);
    assert.equal(await page.locator("video").count(), 1);

    const background = await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor);
    if (retry) {
      await Promise.all([
        waitForPath(page, "/private-access/"),
        page.locator('form[action*="action=logout"] button').click()
      ]);
      assert.equal(new URL(page.url()).searchParams.get("locked"), "1");
    }
    return { background, theme };
  } finally {
    await context.close();
  }
}

async function verifyAuthenticatedMedia(browser, baseUrl) {
  const context = await browser.newContext({
    colorScheme: "light",
    isMobile: true,
    viewport: { width: 390, height: 844 }
  });

  try {
    await context.addInitScript(() => localStorage.setItem("traykov-color-theme", "light"));
    const page = await context.newPage();
    await page.goto(`${baseUrl}/private/pave-redesign/`, { waitUntil: "domcontentloaded" });
    await page.locator('input[name="password"]').fill(fixturePassword);
    const [loginResponse] = await Promise.all([
      page.waitForResponse((response) => {
        const request = response.request();
        return request.method() === "POST" && new URL(response.url()).pathname === "/api/private-work";
      }),
      page.locator('button[type="submit"]').click()
    ]);
    assert.equal(loginResponse.status(), 303, "The JavaScript-enabled login should redirect after a valid password.");
    await waitForPath(page, "/private/pave-redesign/");
    assert.equal(await page.locator("html").getAttribute("data-theme"), "light");

    const video = page.locator("video");
    const state = await video.evaluate(async (element) => {
      if (element.readyState < HTMLMediaElement.HAVE_METADATA) {
        await new Promise((resolveReady, rejectReady) => {
          element.addEventListener("loadedmetadata", resolveReady, { once: true });
          element.addEventListener("error", () => rejectReady(new Error("fixture media failed to load")), { once: true });
        });
      }
      element.muted = true;
      await element.play();
      await new Promise((resolveFrame, rejectFrame) => {
        const timeout = window.setTimeout(() => rejectFrame(new Error("fixture media did not decode a frame")), 5_000);
        const poll = () => {
          if (element.currentTime > 0) {
            window.clearTimeout(timeout);
            resolveFrame();
            return;
          }
          window.requestAnimationFrame(poll);
        };
        poll();
      });
      element.pause();
      return { currentTime: element.currentTime, duration: element.duration, readyState: element.readyState };
    });

    assert.ok(state.currentTime > 0, "The authenticated fixture video should decode a frame.");
    assert.ok(state.duration > 0, "The authenticated fixture video should expose a duration.");
    assert.ok(state.readyState >= 2, "The authenticated fixture video should have current data.");
    const motion = page.locator('[data-motion-toggle]');
    await motion.waitFor({ state: 'visible' });
    await motion.click();
    assert.equal(await page.evaluate(() => localStorage.getItem('traykov-motion-preference')), 'paused');
    await motion.click();
    await motion.click();
    assert.equal(await page.locator('html').getAttribute('data-motion-state'), 'visitor');
    assert.equal(await page.locator('.case-toc').getAttribute('data-case-toc-enhanced'), 'true');
    const tocToggle = page.locator('[data-case-toc-toggle]');
    await tocToggle.click();
    assert.equal(await tocToggle.getAttribute('aria-expanded'), 'true');
    const target = page.locator('[data-case-target]').last();
    const id = await target.getAttribute('data-case-target');
    await target.click();
    assert.equal(new URL(page.url()).hash, `#${id}`);
    assert.equal(await tocToggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await target.getAttribute('aria-current'), 'location');
  } finally {
    await context.close();
  }
}

async function verifySharedPortfolioShell(browser, baseUrl) {
  for (const width of [1280, 390]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
      try {
        await context.addInitScript((value) => {
          if (!localStorage.getItem("traykov-color-theme")) localStorage.setItem("traykov-color-theme", value);
        }, theme);
        const page = await context.newPage();
        await page.goto(`${baseUrl}/private-access/`);
        await page.locator('input[name="password"]').fill(fixturePassword);
        await page.locator('button[type="submit"]').click();
        await waitForPath(page, "/private/");
        const requests = [];
        const errors = [];
        page.on("request", (request) => requests.push(request.url()));
        page.on("pageerror", (error) => errors.push(error.message));
        for (const path of ["/private/", "/private/pave-unified-building/", "/private/pave-redesign/"]) {
          await page.goto(`${baseUrl}${path}`);
          await page.locator('[data-theme-toggle]').getAttribute("aria-label");
          assert.equal(await page.locator('.site-nav nav[aria-label="Primary"] a').count(), 4);
          assert.equal(await page.locator('.site-nav .brand').getAttribute("href"), "/");
          assert.equal(await page.locator('.site-footer .footer-links a').count(), 6);
          assert.equal(await page.locator('[data-motion-toggle]').count(), 1);
          assert.equal(await page.locator('iframe').count(), 0);
          assert.equal(await page.locator('[data-pave-turntable]').count(), 1);
          assert.equal(await page.locator('body').getAttribute('data-page-type'), 'case');
          assert.equal(await page.locator('body').getAttribute('data-case-theme'), 'pave');
          assert.equal(await page.locator('.private-work__contents, .private-work__header').count(), 0);
          assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
          assert.equal(await page.locator('h1').evaluate((heading) => getComputedStyle(heading).textTransform), "none");
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          const body = page.locator('.case-study-body');
          if (await body.count()) {
            assert.equal(await body.evaluate((element) => getComputedStyle(element).opacity), "1");
            assert.ok((await body.boundingBox()).width <= 860);
          }
        }
        const next = theme === "light" ? "dark" : "auto";
        await page.locator('[data-theme-toggle]').click();
        assert.equal(await page.evaluate(() => localStorage.getItem("traykov-color-theme")), next);
        await page.goto(`${baseUrl}/private/`);
        assert.equal(await page.locator('html').getAttribute('data-theme-preference'), next);
        assert.deepEqual(errors, []);
        assert.ok(requests.every((url) => new URL(url).origin === baseUrl), "Private pages must only request first-party assets.");
        assert.ok(requests.some((url) => /page-transitions\.js/.test(url)), "Private cases use the public page-transition runtime.");
        assert.ok(requests.every((url) => !/\/_vercel\/|analytics|vercel-insights/.test(url)), "Private pages must not send analytics.");
      } finally {
        await context.close();
      }
    }
  }
}

async function main() {
  if (!existsSync(publicRoot)) throw new Error("dist/ does not exist. Run npm run build before this browser check.");

  const temporaryRoot = mkdtempSync(resolve(tmpdir(), "private-work-browser-"));
  const bundleRoot = resolve(temporaryRoot, "bundle");
  const env = {
    ...process.env,
    VERCEL: "",
    VERCEL_ENV: "development",
    PRIVATE_WORK_BUNDLE_DIR: bundleRoot,
    PRIVATE_WORK_SESSION_SECRET: "fixture-session-secret-that-is-more-than-thirty-two-bytes",
    PRIVATE_WORK_WAF_CONFIGURED: ""
  };

  let server;
  let browser;
  try {
    env.PRIVATE_WORK_PASSWORD_HASH = await createPasswordHash(fixturePassword, Buffer.alloc(16, 9));
    buildPrivateWork({ bundleRoot, publicRoot, fixture: true });
    symlinkSync(publicRoot, resolve(temporaryRoot, "dist"), "dir");

    server = createPrivateWorkDevServer({ root: temporaryRoot, env });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address === "object", "The private-work bridge did not expose a local port.");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    for (const engine of [chromium, webkit]) {
      browser = await engine.launch({ headless: true });
      const light = await verifyNoJavaScriptDeepLink(browser, baseUrl, "light", false);
      const dark = await verifyNoJavaScriptDeepLink(browser, baseUrl, "dark", true);
      assert.notEqual(light.background, dark.background, "Light and dark no-JavaScript mobile views should remain distinct.");
      await verifyAuthenticatedMedia(browser, baseUrl);
      await verifySharedPortfolioShell(browser, baseUrl);
      process.stdout.write(`private-work browser (${engine.name()}): no-JS login, desktop/mobile shared shell, theme persistence, reduced motion, first-party-only requests, and authenticated media passed\n`);
      await browser.close();
      browser = undefined;
    }
  } finally {
    await browser?.close();
    if (server?.listening) await new Promise((resolveClose, rejectClose) => server.close((error) => (error ? rejectClose(error) : resolveClose())));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
}
