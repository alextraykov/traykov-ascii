import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, resolve, sep } from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
import sharp from "sharp";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4312";
const base = "/labs/presenting-in-code";
const route = new URL(`${base}/`, baseUrl).href;
const deckUrl = new URL(`${base}/deck/`, baseUrl).href;
const mobileOnly = process.argv.includes("--mobile-only");
const artifactRoot = resolve("audit-artifacts/presenting-in-code-web", mobileOnly ? "mobile-final" : ".");
const sourceRoot = resolve(`public${base}`);
const results = { route, interactions: [], errors: [], failedResponses: [] };
const shots = [];
const hashOf = (data) => createHash("sha256").update(data).digest("hex");
function watch(page) {
  page.on("pageerror", (error) => results.errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("/_vercel/insights")) results.failedResponses.push(`${response.status()} ${response.url()}`);
  });
}
async function contextFor(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "light", ...options });
  if (options.javaScriptEnabled !== false) await context.addInitScript(() => localStorage.setItem("traykov-color-theme", "light"));
  return context;
}
async function noOverflow(page) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.width + 1, `Horizontal overflow: ${JSON.stringify(dimensions)}`);
}
const art = (page, name) => page.locator(`[data-pc-artwork="${name}"]`);
const demo = (page, name) => page.locator(`[data-pc-demo="${name}"]`);
async function ready(page) {
  await expect(page.locator("[data-pc-artwork][data-ready=true]")).toHaveCount(5);
  await expect(art(page, "hero").locator(".lld-camera")).toHaveAttribute("data-measured", "1");
}
async function stage(page, value) {
  await page.locator(`[data-pc-stage="${value}"]`).click();
  await expect(page.locator(`[data-pc-stage="${value}"]`)).toHaveAttribute("aria-pressed", "true");
  if (value >= 3) await expect(art(page, "layers").locator(".lld-stage")).toHaveAttribute("data-settled", "1");
}
async function surfacePoint(page, key) {
  return art(page, "layers").locator(`[data-target="${key}"]`).evaluate((node) => {
    const points = [...node.points];
    const matrix = node.getScreenCTM();
    const point = new DOMPoint(points.reduce((sum, p) => sum + p.x, 0) / points.length, points.reduce((sum, p) => sum + p.y, 0) / points.length).matrixTransform(matrix);
    return { x: point.x, y: point.y };
  });
}
async function hitAlignment(page) {
  await expect(art(page, "layers").locator(".web-art__hit")).toHaveCount(9);
  await expect.poll(() => art(page, "layers").locator(".web-art__interaction").evaluate((node) => node.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running" && "transitionProperty" in animation).length)).toBe(0);
  await expect.poll(() => art(page, "layers").locator(".web-art__interaction").evaluate((node) => {
    const bounds = node.getBoundingClientRect();
    return Math.max(...["L0", "L2", "L3"].flatMap((layer) => {
      const hit = node.querySelector(`[data-target="level-${layer}"]`);
      return ["tl", "tr", "br", "bl"].map((corner, index) => {
        const anchor = node.querySelector(`[data-sheet="${layer}"][data-corner="${corner}"]`).getBoundingClientRect();
        return Math.hypot(hit.points[index].x - (anchor.left + anchor.width / 2 - bounds.left), hit.points[index].y - (anchor.top + anchor.height / 2 - bounds.top));
      });
    }));
  })).toBeLessThan(1);
  await expect.poll(() => art(page, "layers").locator(".web-art__interaction").evaluate((node) => {
    return Math.max(...[...node.querySelectorAll('[data-target^="part-"]')].map((hit) => {
      const region = hit.dataset.target.slice(5);
      const layer = region === "dialog" ? "L3" : ["nav", "header"].includes(region) ? "L0" : "L2";
      const component = node.querySelector(`.lld-plane[data-plane="${layer}"] [data-morph="${region === "cards" ? "card-0" : region}"]`) || node.querySelector(`.lld-plane[data-plane="${layer}"] .bp-${region === "cards" ? "card" : region}`);
      if (!component) return Infinity;
      const a = component.getBoundingClientRect(), b = hit.getBoundingClientRect();
      return Math.max(...["left", "top", "width", "height"].map((key) => Math.abs(a[key] - b[key])));
    }));
  })).toBeLessThan(1);
}
async function paintedInput(page) {
  const artwork = art(page, "layers");
  const pixels = await artwork.screenshot();
  const expected = await artwork.evaluate((node) => {
    const send = node.querySelector("[data-pc-mount]").shadowRoot.querySelector('.lld-plane[data-plane="L2"] .bp-input .bp-send');
    const rect = send.getBoundingClientRect(), frame = node.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - frame.left, y: rect.top + rect.height / 2 - frame.top, width: frame.width, color: getComputedStyle(send).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number) };
  });
  const { data, info } = await sharp(pixels).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const x = Math.round(expected.x * info.width / expected.width), y = Math.round(expected.y * info.width / expected.width);
  assert.ok(x >= 0 && x < info.width && y >= 0 && y < info.height, "The selected Input send control is visibly inside the screen.");
  const actual = [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
  assert.ok(actual.every((channel, index) => Math.abs(channel - expected.color[index]) < 25), `Painted Input must align with its live projected position: expected ${expected.color}, got ${actual} at ${x},${y}.`);
}
async function verifyDirectScreen(page, name) {
  await stage(page, 0);
  await art(page, "layers").getByRole("button", { name: "Open the screen to inspect" }).click();
  await expect(page.locator('[data-pc-stage="4"]')).toHaveAttribute("aria-pressed", "true");
  const interaction = art(page, "layers").locator(".web-art__interaction");
  await expect(art(page, "layers").locator(".web-art__hit")).toHaveCount(9);
  await hitAlignment(page);
  await expect.poll(() => art(page, "layers").locator(".lld-plane").evaluateAll((nodes) => nodes.every((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).is2D))).toBe(true);
  await paintedInput(page);
  const raised = art(page, "layers").locator('.lld-plane[data-plane="L2"]');
  const baseline = await raised.getAttribute("style");
  const baselineHeight = await raised.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m42);
  const input = await surfacePoint(page, "part-input");
  await page.mouse.move(input.x, input.y);
  await expect(interaction).toHaveAttribute("data-preview", "L2:input");
  await expect(raised).toHaveAttribute("style", baseline);
  await expect(art(page, "layers").locator(".web-art__inspection")).toContainText("Input");
  await page.waitForTimeout(450);
  await expect(interaction).toHaveAttribute("data-preview", "L2:input");
  await page.mouse.click(input.x, input.y);
  await expect(interaction).toHaveAttribute("data-selection", "L2:input");
  await expect(art(page, "layers").locator('[data-target="part-input"]')).toHaveCSS("outline-style", "none");
  await expect(art(page, "layers").locator(".web-art__inspection")).toContainText("Input");
  await expect(raised).toHaveAttribute("data-focused", "1");
  await expect(raised).not.toHaveAttribute("style", baseline);
  await expect.poll(() => raised.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m42)).toBeLessThan(baselineHeight - 1);
  await expect.poll(() => art(page, "layers").locator('.lld-plane[data-plane="L0"]').evaluate((n) => Number(getComputedStyle(n).opacity))).toBeLessThan(.3);
  await hitAlignment(page);
  await page.waitForTimeout(500);
  await expect(interaction).toHaveAttribute("data-selection", "L2:input");
  await paintedInput(page);
  await capture(page, `${name}-direct-input`, ".pc-layer-sticky");
  for (const key of ["part-panel", "part-dialog"]) {
    const point = await surfacePoint(page, key);
    await page.mouse.move(point.x, point.y);
    await page.mouse.click(point.x, point.y);
    await expect(interaction).toHaveAttribute("data-selection", key === "part-dialog" ? "L3:dialog" : `L2:${key.slice(5)}`);
    await hitAlignment(page);
  }
  await art(page, "layers").getByRole("button", { name: "Back to whole screen", exact: true }).click();
  await expect(interaction).toHaveAttribute("data-selection", ""); await hitAlignment(page);
  const again = await surfacePoint(page, "part-input"); await page.mouse.click(again.x, again.y);
  await expect(interaction).toHaveAttribute("data-selection", "L2:input"); await hitAlignment(page);
  await page.locator(".pc-layer-options").evaluate((node) => node.open = true);
  await page.locator(".pc-layers").getByRole("button", { name: "Dark screen", exact: true }).click();
  await expect(art(page, "layers").locator(".web-art")).toHaveAttribute("data-theme", "dark");
  const darkPoint = await surfacePoint(page, "part-panel"); await page.mouse.click(darkPoint.x, darkPoint.y);
  await expect(interaction).toHaveAttribute("data-selection", "L2:panel"); await hitAlignment(page);
  await capture(page, `${name}-direct-dark-panel`, ".pc-layer-sticky");
  await page.locator(".pc-layers").getByRole("button", { name: "Dark screen", exact: true }).click();
  const size = page.viewportSize();
  await page.setViewportSize({ width: 1180, height: 950 });
  await expect(art(page, "layers").locator(".web-art__hit")).toHaveCount(9);
  await hitAlignment(page);
  await page.setViewportSize({ width: 627, height: 832 });
  await art(page, "layers").scrollIntoViewIfNeeded(); await hitAlignment(page);
  const narrowInput = art(page, "layers").getByRole("button", { name: "Inspect Input", exact: true });
  await narrowInput.focus(); await page.keyboard.press("Enter"); await hitAlignment(page);
  const clipping = await art(page, "layers").evaluate((node) => {
    const shadow = node.querySelector("[data-pc-mount]").shadowRoot;
    return { scroll: shadow.querySelector(".web-art").scrollTop, artworkTop: node.getBoundingClientRect().top, labelTop: shadow.querySelector(".web-art__inspection").getBoundingClientRect().top };
  });
  assert.equal(clipping.scroll, 0, "Keyboard focus must not scroll the clipped artwork internally.");
  assert.ok(clipping.labelTop >= clipping.artworkTop, "The inspection label remains inside the artwork.");
  await page.setViewportSize(size);
  await art(page, "layers").getByRole("button", { name: "Back to whole screen", exact: true }).click();
  await expect(interaction).toHaveAttribute("data-selection", "");
  const dialog = art(page, "layers").getByRole("button", { name: "Inspect Dialog", exact: true });
  await dialog.focus(); await page.keyboard.press("Enter");
  await expect(interaction).toHaveAttribute("data-selection", "L3:dialog");
  await page.keyboard.press("Escape");
  await expect(interaction).toHaveAttribute("data-selection", "");
  await expect(art(page, "layers").locator(".lld-stage")).not.toHaveAttribute("data-focus");
  const point = await surfacePoint(page, "part-input"); await page.mouse.click(point.x, point.y);
  await hitAlignment(page);
  const empty = await art(page, "layers").locator(".web-art__hits").evaluate((node) => {
    const rect = node.getBoundingClientRect();
    for (const x of [8, rect.width - 8, rect.width / 2]) for (const y of [8, rect.height - 8]) {
      const hit = node.getRootNode().elementFromPoint(rect.left + x, rect.top + y);
      if (hit === node) return { x: rect.left + x, y: rect.top + y };
    }
    return null;
  });
  assert.ok(empty, "The zoomed screen retains empty space for reset.");
  await page.mouse.click(empty.x, empty.y);
  await expect(interaction).toHaveAttribute("data-selection", "");
}
async function verifyHoverGeometry(browser, name) {
  const context = await contextFor(browser);
  const page = await context.newPage(); watch(page);
  try {
    await page.goto(`${route}#layers`); await ready(page);
    assert.equal(await page.locator('[data-pc-layer], [data-pc-component], [data-pc-reset]').count(), 0, "Direct surfaces replace the redundant inspector controls.");
    await expect(page.locator('.pc-layer-options')).not.toHaveAttribute('open');
    await expect(page.locator('.pc-layer-options button:visible')).toHaveCount(0);
    const geometry = () => page.evaluate(() => {
      const artwork = document.querySelector('[data-pc-artwork="layers"]');
      const shadow = artwork.querySelector('[data-pc-mount]').shadowRoot;
      const rect = (node) => { const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
      return {
        scrollY, sticky: rect(document.querySelector('.pc-layer-sticky')), artwork: rect(artwork),
        world: shadow.querySelector('.web-art__layer-world').style.transform,
        planes: [...shadow.querySelectorAll('.lld-plane')].map((node) => getComputedStyle(node).transform),
        stage: document.querySelector('[data-pc-stage][aria-pressed="true"]').dataset.pcStage,
        scrollOwned: document.querySelector('[data-pc-resume]').disabled
      };
    });
    for (const width of [1440, 1180]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const cycle of ['refresh', 'reset', 'refresh-again']) {
        if (cycle.startsWith('refresh')) { await page.reload(); await ready(page); }
        await page.mouse.move(0, 0);
        // Reproduce at the sticky passage end, where a guide height change moves the screen.
        await page.locator('[data-pc-sequence]').evaluate((node) => {
          const sticky = node.querySelector('.pc-layer-sticky');
          scrollTo({ top: node.getBoundingClientRect().top + scrollY + node.offsetHeight - sticky.offsetHeight - parseFloat(getComputedStyle(sticky).top) - 10, behavior: 'instant' });
        });
        await expect(page.locator('[data-pc-stage="4"]')).toHaveAttribute('aria-pressed', 'true');
        await hitAlignment(page);
        if (cycle === 'reset') {
          const point = await surfacePoint(page, 'part-input'); await page.mouse.click(point.x, point.y); await hitAlignment(page);
          await art(page, 'layers').getByRole('button', { name: 'Back to whole screen', exact: true }).click();
          await hitAlignment(page); await page.mouse.move(0, 0);
        }
        const baseline = await geometry();
        const options = page.locator('.pc-layer-options');
        await options.evaluate((node) => node.open = true);
        assert.deepEqual(await geometry(), baseline, 'Opening display options cannot resize the sticky passage.');
        await options.evaluate((node) => node.open = false);
        for (const key of ['part-input', 'part-panel', 'part-dialog', 'part-input']) {
          const point = await surfacePoint(page, key); await page.mouse.move(point.x, point.y);
          await expect(art(page, 'layers').locator('.web-art__inspection')).toBeVisible();
          const previewChanges = await art(page, 'layers').locator('.web-art__interaction').evaluate(async (node) => {
            const changes = [];
            const observer = new MutationObserver((records) => changes.push(...records.map((record) => record.oldValue)));
            observer.observe(node, { attributes: true, attributeFilter: ['data-preview'], attributeOldValue: true });
            await new Promise((resolve) => setTimeout(resolve, 400));
            observer.disconnect();
            return changes;
          });
          assert.deepEqual(previewChanges, [], 'A stationary pointer must not start a highlight enter/leave feedback loop.');
          assert.deepEqual(await geometry(), baseline, `${name} ${width} ${cycle}: passive hover must keep page, sticky, artwork, planes, camera and scroll ownership fixed.`);
          await page.mouse.move(0, 0);
          await expect(art(page, 'layers').locator('.web-art__interaction')).toHaveAttribute('data-preview', '');
          assert.deepEqual(await geometry(), baseline);
        }
        const input = art(page, 'layers').getByRole('button', { name: 'Inspect Input', exact: true });
        await input.evaluate((node) => node.focus({ preventScroll: true }));
        assert.deepEqual(await geometry(), baseline, 'Keyboard preview preserves geometry and scroll ownership too.');
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        await expect(art(page, 'layers').locator('.web-art__interaction')).toHaveAttribute('data-preview', '');
        assert.deepEqual(await geometry(), baseline);
      }
    }
    results.interactions.push(`${name}: repeated Connect hover and keyboard preview after refresh/reset at 1440/1180 px preserve exact scroll, sticky/artwork bounds, plane/camera transforms and scroll ownership; blur clears preview; no redundant controls.`);
  } finally { await context.close(); }
}
async function capture(page, name, selector) {
  await page.mouse.move(0, 0);
  // Capture settled states, not the site theme/reveal or source camera transition.
  await page.waitForTimeout(1000);
  const path = resolve(artifactRoot, `${name}.png`);
  if (selector) await page.locator(selector).screenshot({ path });
  else await page.screenshot({ path, fullPage: false });
  shots.push({ name, path });
  return path;
}
async function contactSheets() {
  const outputs = [];
  const width = 600, height = 375, label = 32, columns = 2, batch = 8;
  for (let offset = 0; offset < shots.length; offset += batch) {
    const group = shots.slice(offset, offset + batch), layers = [];
    for (const [index, shot] of group.entries()) {
      const left = (index % columns) * width, top = Math.floor(index / columns) * (height + label);
      const text = shot.name.replace(/[&<>]/g, "");
      layers.push({ input: Buffer.from(`<svg width="${width}" height="${label}"><rect width="100%" height="100%" fill="white"/><text x="12" y="23" font-family="monospace" font-size="14">${text}</text></svg>`), left, top });
      layers.push({ input: await sharp(shot.path).resize({ width, height, fit: "contain", background: "#eee" }).png().toBuffer(), left, top: top + label });
    }
    const path = resolve(artifactRoot, `contact-${Math.floor(offset / batch) + 1}.png`);
    await sharp({ create: { width: columns * width, height: Math.ceil(group.length / columns) * (height + label), channels: 4, background: "white" } }).composite(layers).png().toFile(path);
    outputs.push(path);
  }
  return outputs;
}

async function setDesignState(page, name, before) {
  const artwork = art(page, name);
  if ((await artwork.locator('.web-art__probe').getAttribute('data-before')) !== String(before)) await artwork.locator('[data-screen-action="state"]').click();
}
async function screenPoint(page, name, target) {
  return art(page, name).locator(`[data-screen-target="${target}"]`).evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  });
}
async function screenSettled(page, name) {
  await expect.poll(() => art(page, name).locator('.web-art__probe').evaluate((node) => {
    const applied = node.querySelector('.bp')?.dataset.fix?.split(' ').includes('emphasis');
    return applied === (node.dataset.before !== 'true');
  })).toBe(true);
  await expect.poll(() => art(page, name).locator('.web-art__viewport').evaluate((node) => node.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length)).toBe(0);
}
async function cameraFraming(page, target) {
  await screenSettled(page, 'camera');
  await expect.poll(() => art(page, 'camera').locator('.web-art__viewport').evaluate((node, selected) => {
    const view = node.getBoundingClientRect(), part = node.querySelector(`.bp-${selected}`).getBoundingClientRect();
    return Math.max(Math.abs(part.left + part.width / 2 - view.left - view.width / 2), Math.abs(part.top + part.height / 2 - view.top - view.height / 2));
  }, target)).toBeLessThan(1);
  const bounds = await art(page, 'camera').locator('.web-art__viewport').evaluate((node, selected) => {
    const view = node.getBoundingClientRect(), part = node.querySelector(`.bp-${selected}`).getBoundingClientRect();
    return { inside: part.left >= view.left && part.right <= view.right && part.top >= view.top && part.bottom <= view.bottom, occupancy: Math.max(part.width / view.width, part.height / view.height), scale: new DOMMatrixReadOnly(getComputedStyle(node.querySelector('.lld-camera__world')).transform).a / Math.min(view.width / 1440, view.height / 833) };
  }, target);
  assert.ok(bounds.inside && bounds.occupancy > .75, `Camera frames the complete live ${target}: ${JSON.stringify(bounds)}`);
  await expect(art(page, 'camera').locator('.web-art__screen-status')).toContainText(`${bounds.scale.toFixed(1)}× overview`);
}
async function anchorAlignment(page, target) {
  await screenSettled(page, 'anchor');
  await expect.poll(() => art(page, 'anchor').locator('.web-art__probe').evaluate((node, selected) => {
    const ring = node.querySelector('.web-art__anchor rect');
    const part = node.querySelector(`.bp-${selected}`);
    if (!ring || !part) return Infinity;
    const a = ring.getBoundingClientRect(), b = part.getBoundingClientRect(), viewport = node.querySelector('.web-art__viewport').getBoundingClientRect();
    // Original measureAnchor provides a five-pixel safety ring, clipped to the viewport.
    const expected = { left: Math.max(viewport.left + 5, b.left - 5), top: Math.max(viewport.top + 5, b.top - 5), right: Math.min(viewport.right, b.right + 5), bottom: Math.min(viewport.bottom, b.bottom + 5) };
    return Math.max(...['left','top','right','bottom'].map((key) => Math.abs(a[key] - expected[key])));
  }, target)).toBeLessThan(1);
  await expect.poll(() => art(page, 'anchor').locator('.web-art__probe').evaluate((node) => {
    const path = node.querySelector('.web-art__anchor path'), note = node.querySelector('.web-art__annotation').getBoundingClientRect();
    const end = path.getPointAtLength(path.getTotalLength()).matrixTransform(path.getScreenCTM());
    return Math.hypot(end.x - (note.left + note.width / 2), end.y - note.top);
  })).toBeLessThan(1);
  const visible = await art(page, 'anchor').locator('.web-art__annotation').evaluate((node) => {
    const a = node.getBoundingClientRect(), b = node.closest('.web-art__probe').getBoundingClientRect();
    return a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom;
  });
  assert.ok(visible, 'The note remains wholly visible within the artwork.');
}
async function verifyAllScreens(page, name) {
  for (const section of ['hero', 'compare']) {
    const artwork = art(page, section); await artwork.scrollIntoViewIfNeeded(); await screenSettled(page, section);
    const input = artwork.locator('.bp-input'); const first = await input.boundingBox();
    const before = await artwork.locator('.web-art__probe').getAttribute('data-before');
    const point = await screenPoint(page, section, 'input'); await page.mouse.click(point.x, point.y);
    await expect(artwork.locator('.web-art__probe')).toHaveAttribute('data-before', before === 'true' ? 'false' : 'true');
    await screenSettled(page, section);
    const second = await input.boundingBox(); assert.ok(Math.abs(first.height - second.height) > 3, `${section} screen click actually changes input geometry.`);
    await artwork.locator('[data-screen-action="state"]').click(); await screenSettled(page, section);
    assert.ok(Math.abs((await input.boundingBox()).height - first.height) < 1, `${section} reverses its actual source state.`);
  }
  const camera = art(page, 'camera'); await camera.scrollIntoViewIfNeeded();
  for (const target of ['input','panel','cards']) {
    const point = await screenPoint(page, 'camera', target);
    const world = await camera.locator('.lld-camera__world').getAttribute('style');
    await page.mouse.move(point.x, point.y); await page.waitForTimeout(400);
    await expect(camera.locator('.lld-camera__world')).toHaveAttribute('style', world);
    await page.mouse.click(point.x, point.y); await cameraFraming(page, target);
    const stableHover = await camera.locator('.web-art__viewport').evaluate((node, selected) => new Promise((resolve) => {
      let frames = 0, worst = 0;
      const check = () => {
        const part = node.querySelector(`.bp-${selected}`).getBoundingClientRect();
        const ring = node.querySelector('.web-art__hover rect')?.getBoundingClientRect();
        worst = Math.max(worst, ...(ring ? ['left','top','width','height'].map((key) => Math.abs(part[key] - ring[key])) : [Infinity]));
        if (++frames < 12) requestAnimationFrame(check); else resolve(worst);
      }; check();
    }), target);
    assert.ok(stableHover < 1, 'A stationary pointer keeps the selected component highlighted after the camera flight.');
    await capture(page, `${name}-camera-direct-${target}`, '#camera');
    await camera.locator('[data-screen-action="reset"]').click(); await screenSettled(page, 'camera');
  }
  await camera.getByRole('button', { name: 'Frame Panel', exact: true }).focus(); await page.keyboard.press('Enter'); await cameraFraming(page, 'panel');
  await page.keyboard.press('Escape'); await expect(camera.locator('.web-art__probe')).toHaveAttribute('data-target', 'whole');
  const anchor = art(page, 'anchor'); await anchor.scrollIntoViewIfNeeded();
  for (const target of ['input','panel','cards']) {
    const point = await screenPoint(page, 'anchor', target); await page.mouse.click(point.x, point.y); await anchorAlignment(page, target);
    await anchor.locator('[data-screen-action="state"]').click(); await anchorAlignment(page, target);
  }
  await anchor.getByRole('button', { name: 'Annotate Input', exact: true }).focus(); await page.keyboard.press('Space'); await anchorAlignment(page, 'input');
  const dimensions = page.viewportSize();
  await page.setViewportSize({width:627,height:832}); await anchor.scrollIntoViewIfNeeded(); await anchorAlignment(page, 'input');
  await capture(page, `${name}-anchor-direct-resized`, '#anchors');
  await expect.poll(() => anchor.locator('.web-art').evaluate(n=>n.scrollTop)).toBe(0);
  await page.setViewportSize(dimensions); await anchor.scrollIntoViewIfNeeded();
  // Rapid interruption: actual source layout, measured ring and visible note must all agree.
  for (const target of ['panel','cards','input']) await anchor.locator(`[data-screen-target="${target}"]`).dispatchEvent('click');
  for (let i=0;i<5;i++) await anchor.locator('[data-screen-action="state"]').dispatchEvent('click');
  await anchorAlignment(page, 'input');
  await capture(page, `${name}-anchor-direct`, '#anchors');
  // Pause while source WAAPI and camera transitions are in flight; the destination remains functional.
  await anchor.locator('[data-screen-action="state"]').dispatchEvent('click');
  await page.getByRole('button', {name:'Motion', exact:true}).click();
  await anchorAlignment(page, 'input');
  await expect.poll(() => anchor.locator('.web-art').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
  await camera.scrollIntoViewIfNeeded(); await camera.getByRole('button',{name:'Frame Cards',exact:true}).click(); await cameraFraming(page,'cards');
  await expect.poll(() => camera.locator('.web-art').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
  await camera.locator('[data-screen-action="reset"]').click();
  await page.getByRole('button',{name:'Motion',exact:true}).click();
  const compare=art(page,'compare');await compare.scrollIntoViewIfNeeded();
  await compare.locator('[data-screen-action="sample"]').click();
  await expect(compare.locator('[data-screen-reading]')).toContainText('ms avg');
  await compare.locator('[data-screen-action="state"]').click();await screenSettled(page,'compare');
  await compare.locator('[data-screen-action="sample"]').click();
  await expect(compare.locator('[data-screen-reading]')).toContainText('sample stopped');
  results.interactions.push(`${name}: coordinate clicks and keyboard activate every live screen; measured full-component camera framing, stationary hover, accurate anchor ring+leader after source changes/rapid input/resize, native in-screen reset, real reversible geometry, visible frame readings, and zero motion with pause.`);
}

async function verifyWebsite(browser, name) {
  const context = await contextFor(browser, name === "chromium" ? { permissions: ["clipboard-read", "clipboard-write"] } : {});
  const page = await context.newPage(); watch(page);
  try {
    await page.goto(route); await ready(page); await noOverflow(page);
    assert.equal(await page.locator(".pc-shell iframe").count(), 0, "The primary tutorial must be a webpage.");
    assert.equal(await page.locator(".lld-slide__canvas").count(), 0, "No slide canvas may host webpage copy.");
    const hero = await art(page, "hero").boundingBox();
    assert.ok(hero.y < 600 && hero.height > 280, `The live hero is not prominent: ${JSON.stringify(hero)}`);
    const sourceBefore = await art(page, "hero").locator(".bp-input").boundingBox();
    await setDesignState(page, "hero", true);
    await expect(art(page, "hero").locator(".bp")).toHaveAttribute("data-fix", "");
    await setDesignState(page, "hero", false);
    await expect(art(page, "hero").locator(".bp")).toHaveAttribute("data-fix", /emphasis/);
    assert.ok(sourceBefore.width > 0);
    const lightSurface = await art(page, "hero").locator(".bp-frame").evaluate((node) => getComputedStyle(node).backgroundColor);
    await demo(page, "hero").getByRole("button", { name: "Dark screen", exact: true }).click();
    await expect(art(page, "hero").locator(".bp")).toHaveAttribute("data-theme", "dark");
    await expect.poll(() => art(page, "hero").locator(".bp-frame").evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(lightSurface);
    await demo(page, "hero").getByRole("button", { name: "Dark screen", exact: true }).click();
    await capture(page, `${name}-hero-light`);
    await page.locator('[data-theme-toggle]').click();
    await capture(page, `${name}-hero-dark`);
    await noOverflow(page);

    const world = art(page, "camera").locator(".lld-camera__world");
    const whole = await world.getAttribute("style");
    await demo(page, "camera").getByRole("button", { name: "Input", exact: true }).click();
    await expect(world).not.toHaveAttribute("style", whole);
    for (const target of ["Panel", "Cards", "Input"]) await demo(page, "camera").getByRole("button", { name: target, exact: true }).click();
    await expect(demo(page, "camera").getByRole("button", { name: "Input", exact: true })).toHaveAttribute("aria-pressed", "true");
    await capture(page, `${name}-camera`, "#camera");

    await art(page, "anchor").scrollIntoViewIfNeeded();
    const ring = art(page, "anchor").locator(".web-art__anchor rect");
    await expect(ring).toBeVisible();
    await expect(art(page, "anchor").locator(".web-art__annotation")).toContainText("InputRaised level");
    await anchorAlignment(page, "input");
    const firstHeight = await ring.getAttribute("height");
    await setDesignState(page, "anchor", true);
    await expect(ring).toBeVisible();
    await anchorAlignment(page, "input");
    await expect(ring).not.toHaveAttribute("height", firstHeight);
    await setDesignState(page, "anchor", false);
    await expect.poll(async () => Math.abs(Number(await ring.getAttribute("height")) - Number(firstHeight))).toBeLessThan(1);
    await capture(page, `${name}-anchor`, "#anchors");

    await verifyAllScreens(page, name);
    await verifyDirectScreen(page, name);

    // Native scrolling selects stage boundaries; direct controls take over until resumed.
    await page.locator("[data-pc-resume]").click();
    await page.locator("[data-pc-sequence]").evaluate((node) => {
      const y = node.getBoundingClientRect().top + scrollY;
      scrollTo({ top: y + node.offsetHeight, behavior: "instant" });
    });
    await expect(page.locator('[data-pc-stage="4"]')).toHaveAttribute("aria-pressed", "true");
    await stage(page, 1);
    await page.evaluate(() => scrollBy({ top: -200, behavior: "instant" }));
    await expect(page.locator('[data-pc-stage="1"]')).toHaveAttribute("aria-pressed", "true");
    await page.locator("[data-pc-resume]").click();
    await page.locator("[data-pc-sequence]").evaluate((node) => scrollTo({ top: node.getBoundingClientRect().top + scrollY - innerHeight / 2, behavior: "instant" }));
    await expect(page.locator('[data-pc-stage="0"]')).toHaveAttribute("aria-pressed", "true");
    for (const value of [1, 2, 3, 4, 0, 4]) await stage(page, value);
    assert.equal(await art(page, "layers").locator(".lld-plane").count(), 4);
    await page.locator(".pc-layers").getByRole("button", { name: "Show tags", exact: true }).click();
    await expect(art(page, "layers").locator(".lld-stage")).toHaveAttribute("data-view", "flat");
    assert.ok(await art(page, "layers").locator(".deck-screen--xray").count() > 0);
    await capture(page, `${name}-surface-tags`, ".pc-layer-sticky");
    await page.locator(".pc-layers").getByRole("button", { name: "Blueprint", exact: true }).click();
    await expect(art(page, "layers").locator(".lld-stage")).toHaveAttribute("data-blueprint", "1");
    const blueprintInput = art(page, "layers").getByRole("button", { name: "Inspect Input", exact: true });
    await blueprintInput.focus(); await page.keyboard.press("Enter");
    await expect(art(page, "layers").locator(".web-art__highlight")).toBeVisible();
    await expect(art(page, "layers").locator(".web-art__layer-world")).not.toHaveAttribute("style", "transform: translate(0px, 0px) scale(1);");
    await capture(page, `${name}-component-blueprint`, ".pc-layer-sticky");
    await page.getByRole("button", { name: "Motion", exact: true }).click();
    await expect(art(page, "layers").locator(".web-art")).toHaveAttribute("data-motion", "reduce");
    await expect(page.locator(".pc-layers")).toHaveAttribute("data-scroll-enabled", "false");
    await stage(page, 0); await stage(page, 4);
    await art(page, "layers").scrollIntoViewIfNeeded(); await hitAlignment(page);
    const pausedPoint = await surfacePoint(page, "part-input"); await page.mouse.click(pausedPoint.x, pausedPoint.y);
    await expect(art(page, "layers").locator(".web-art__interaction")).toHaveAttribute("data-selection", "L2:input");
    await expect(art(page, "layers").locator('.lld-plane[data-plane="L2"]')).toHaveCSS("transition-duration", "0s");
    await hitAlignment(page); await art(page, "layers").getByRole("button", { name: "Back to whole screen", exact: true }).click();
    await expect(art(page, "layers").locator(".lld-stage")).toHaveAttribute("data-view", "stack");
    await page.getByRole("button", { name: "Motion", exact: true }).click();

    await page.locator('[data-pc-probe]').click();
    await expect(page.locator('[data-pc-probe]')).toHaveAttribute("aria-pressed", "true");
    await setDesignState(page, "compare", false);
    await expect(page.locator('[data-pc-frame-reading]')).toContainText("ms avg");
    await demo(page, "compare").getByRole("button", { name: "Show bounds", exact: true }).click();
    await expect(art(page, "compare").locator(".web-art")).toHaveAttribute("data-outlines", "true");
    await capture(page, `${name}-frame-check`, ".pc-compare-layout");
    await page.locator("#skills").scrollIntoViewIfNeeded();
    await expect(page.locator('[data-pc-probe]')).toHaveAttribute("aria-pressed", "false");

    const first = page.locator("#skill-presentation-planner");
    await first.locator("summary").focus(); await page.keyboard.press("Enter");
    await expect(first.locator("pre")).toBeVisible();
    if (name === "chromium") {
      await first.getByRole("button", { name: "Copy skill", exact: true }).click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      assert.equal(copied, await readFile(resolve(sourceRoot, "skills/presentation-planner/SKILL.md"), "utf8"));
    }
    assert.equal(await page.locator(".pc-skill").count(), 10);
    assert.ok(await page.locator("[data-pc-mount]").evaluateAll((nodes) => nodes.every((node) => node.shadowRoot?.querySelector('[inert]'))));
    assert.equal(await art(page, "layers").locator(".web-art__hit").evaluateAll((nodes) => nodes.some((node) => node.closest("[inert]"))), false);
    await noOverflow(page);
    results.interactions.push(`${name}: native page, live hero, camera stops, measured note, scroll/manual handoff, direct surface coordinates, passive hover, computed plane lift/dim, projected hit alignment after zoom/resize, on-screen reset, keyboard/Escape/empty-space reset, dark/paused pointing, real planes/tags/blueprint, motion pause, explicit frame sampling and keyboard disclosures.`);
  } finally { await context.close(); }
}

async function verifyMobileAndNoJs(browser, name = "chromium") {
  const prefix = name === "webkit" ? "webkit-" : "";
  for (const width of [390, 320]) for (const javaScriptEnabled of [true, false]) {
    const context = await contextFor(browser, { viewport: { width, height: 844 }, reducedMotion: "reduce", javaScriptEnabled, hasTouch: true });
    const page = await context.newPage(); watch(page);
    try {
      await page.goto(route); await noOverflow(page);
      const stageButtons = await page.locator('[data-pc-stage]').evaluateAll((nodes) => nodes.map((node) => { const rect = node.getBoundingClientRect(); return { top: rect.top, width: rect.width, height: rect.height, overflow: node.scrollWidth > node.clientWidth }; }));
      assert.ok(stageButtons.every((button) => button.top === stageButtons[0].top && button.width >= 44 && button.height >= 44 && button.height < 100 && !button.overflow), `Mobile stages share one compact row with usable, unclipped touch targets: ${JSON.stringify(stageButtons)}`);
      if (javaScriptEnabled) {
        await ready(page);
        await expect(page.locator(".pc-layers")).toHaveAttribute("data-scroll-enabled", "false");
        await stage(page, 4);
        await expect(art(page, "layers").locator(".web-art")).toHaveAttribute("data-motion", "reduce");
        await art(page, "layers").scrollIntoViewIfNeeded();
        await hitAlignment(page);
        const touchPoint = await surfacePoint(page, "part-input");
        await page.touchscreen.tap(touchPoint.x, touchPoint.y);
        await expect(art(page, "layers").locator(".web-art__interaction")).toHaveAttribute("data-selection", "L2:input");
        await hitAlignment(page);
        await art(page, "layers").getByRole("button", { name: "Back to whole screen", exact: true }).click();
        await expect(art(page, "layers").locator(".web-art__interaction")).toHaveAttribute("data-selection", "");
        for (const screen of ['hero','camera','anchor','compare']) {
          const artwork = art(page, screen); await artwork.scrollIntoViewIfNeeded(); await screenSettled(page, screen);
          const point = await screenPoint(page, screen, 'input'); await page.touchscreen.tap(point.x, point.y);
          if (screen === 'camera') {
            await cameraFraming(page, 'input');
            await artwork.locator('[data-screen-action="reset"]').focus();
            await page.keyboard.press('Enter');
            await expect(artwork.locator('.web-art__probe')).toHaveAttribute('data-target', 'whole');
          } else if (screen === 'anchor') {
            await anchorAlignment(page, 'input');
            await artwork.locator('[data-screen-action="state"]').tap(); await anchorAlignment(page, 'input');
            await capture(page, `${prefix}mobile-${width}-anchor-direct`, '#anchors');
          } else {
            await expect(artwork.locator('.bp')).toHaveAttribute('data-fix', screen === 'hero' ? '' : /emphasis/);
          }
          await expect.poll(() => artwork.locator('.web-art').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
          assert.equal(await artwork.locator('.web-art').evaluate(n=>n.scrollTop),0);
        }
        await demo(page, "camera").getByRole("button", { name: "Panel", exact: true }).click();
        await expect(demo(page, "camera").getByRole("button", { name: "Panel", exact: true })).toHaveAttribute("aria-pressed", "true");
        await capture(page, `${prefix}mobile-${width}-camera-reduced`, "#camera");
        await capture(page, `${prefix}mobile-${width}-layers-reduced`, ".pc-layer-sticky");
        const smallest = await page.locator('.pc-controls button').evaluateAll((buttons) => Math.min(...buttons.filter((button) => button.getClientRects().length).map((button) => button.getBoundingClientRect().height)));
        assert.ok(smallest >= 44);
      } else {
        assert.equal(await page.locator('[data-pc-controls]:visible').count(), 0);
        await expect(page.locator("[data-pc-layer-caption]")).toContainText("Exploded:");
        await expect(page.locator('[data-pc-stage="4"]')).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("[data-pc-camera-readout]")).toContainText("Input");
        for (const name of Object.keys({hero:1,camera:1,anchor:1,layers:1,compare:1})) {
          const image = art(page, name).locator("img");
          await image.scrollIntoViewIfNeeded();
          await expect(image).toBeVisible();
          assert.ok(await image.evaluate((node) => node.complete && node.naturalWidth > 100));
        }
        await capture(page, `${prefix}mobile-${width}-nojs-layers`, ".pc-layer-sticky");
      }
      const skill = page.locator("#skill-live-anchors");
      await skill.locator("summary").click();
      await expect(skill.locator("pre")).toContainText("# Live anchors");
      await noOverflow(page);
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await capture(page, `${prefix}mobile-${width}-${javaScriptEnabled ? "reduced" : "nojs"}-hero`);
    } finally { await context.close(); }
  }
  results.interactions.push(`${name} 320/390 px: readable native controls, instant manual reduced states, five meaningful static deliverables and all original skill text/downloads without JavaScript; no horizontal overflow.`);
}
async function verifySamplingVisibility(browser, name) {
  const context = await contextFor(browser, { viewport: { width: 390, height: 700 } });
  const page = await context.newPage(); watch(page);
  try {
    await page.goto(route); await ready(page);
    const button = page.locator('[data-pc-probe]');
    const status = page.locator('[data-pc-probe-status]');
    const reading = page.locator('[data-pc-frame-reading]');
    await demo(page, "compare").evaluate((node) => scrollBy({ top: node.getBoundingClientRect().bottom + 32, behavior: "instant" }));
    const offscreen = await art(page, "compare").boundingBox();
    assert.ok(offscreen.y + offscreen.height < 0, "Reproduce Start being visible after the comparison has already left view.");
    await expect(button).toBeInViewport();
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(status).toHaveText("Keep the comparison in view, then start a sample.");
    await expect(reading).toHaveText("—");

    // Keep the mobile Start control and part of the live comparison visible together.
    await button.evaluate((node) => scrollBy({ top: node.getBoundingClientRect().bottom - innerHeight + 24, behavior: "instant" }));
    await expect(art(page, "compare")).toBeInViewport();
    await expect(button).toBeInViewport();
    await page.waitForTimeout(300);
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(reading).toHaveText("—");

    // Headless tabs do not consistently background; drive the document visibility signal directly.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await button.dispatchEvent("click");
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(status).toHaveText("Return to this page, then start a sample.");
    await expect(reading).toHaveText("—");
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
    await page.waitForTimeout(300);
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(reading).toHaveText("—");

    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(reading).toContainText("ms avg");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(status).toHaveText("Stopped");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(status).toHaveText("Stopped · page hidden");
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
    await page.waitForTimeout(300);
    await expect(button).toHaveAttribute("aria-pressed", "false");
    results.interactions.push(`${name}: mobile sampling refuses an already offscreen comparison or hidden page, waits for another click, works while visible, and preserves explicit/visibility stops.`);
  } finally { await context.close(); }
}
async function verifyDownloads(browser) {
  const context = await contextFor(browser);
  const page = await context.newPage(); watch(page);
  const temporary = await mkdtemp(resolve(tmpdir(), "presentations-download-"));
  let server;
  try {
    await page.goto(route);
    for (const name of ["all-skills.zip", "presentations-in-code.zip"]) {
      const [download] = await Promise.all([page.waitForEvent("download"), page.locator(`a[download][href$="/${name}"]`).click()]);
      const target = resolve(temporary, name); await download.saveAs(target);
      assert.equal(hashOf(await readFile(target)), hashOf(await readFile(resolve(sourceRoot, "downloads", name))));
    }
    execFileSync("python3", ["-m", "zipfile", "-e", resolve(temporary, "presentations-in-code.zip"), temporary]);
    const extracted = resolve(temporary, "presentations-in-code");
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2" };
    server = createServer(async (request, response) => {
      try {
        const pathname = new URL(request.url, "http://localhost").pathname;
        let file = resolve(extracted, `.${decodeURIComponent(pathname)}`);
        if (!file.startsWith(extracted + sep)) throw new Error("outside root");
        if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
        response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream"); response.end(await readFile(file));
      } catch { response.statusCode = 404; response.end(); }
    });
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    await page.goto(`http://127.0.0.1:${server.address().port}/deck/#making-of?slide=7&step=4&motion=reduce`);
    await page.waitForSelector(".lld-slide--mo-explode.lld-slide__canvas--active .deck-screen");
    assert.equal(await page.locator(".lld-slide").getAttribute("data-slide"), "7");
    assert.ok(await page.locator(".lld-plane").count() >= 3);
    results.interactions.push("Both downloads match their hosted files; the downloaded deck renders from its own local HTTP server.");
  } finally {
    await context.close();
    if (server?.listening) await new Promise((done) => server.close(done));
    await rm(temporary, { recursive: true, force: true });
  }
}

await mkdir(artifactRoot, { recursive: true });
for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch({ headless: true });
  try {
    if (!mobileOnly) {
      await verifyHoverGeometry(browser, name);
      await verifyWebsite(browser, name);
      await verifySamplingVisibility(browser, name);
    }
    await verifyMobileAndNoJs(browser, name);
    if (!mobileOnly && name === "chromium") await verifyDownloads(browser);
  } finally { await browser.close(); }
}
results.contactSheets = await contactSheets();
console.log(JSON.stringify(results, null, 2));
assert.equal(results.errors.length, 0, `Page errors: ${results.errors.join("\n")}`);
assert.equal(results.failedResponses.length, 0, `Failed responses: ${results.failedResponses.join("\n")}`);
