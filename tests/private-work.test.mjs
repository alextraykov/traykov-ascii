import assert from "node:assert/strict";
import fs, { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { Agent, get } from "node:http";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { once } from "node:events";
import { buildPrivateWork, assertPublicOutputExcludesPrivate, extractPrivateShell } from "../scripts/build-private-work.mjs";
import { createPrivateWorkDevServer } from "../scripts/private-work-dev.mjs";
import { getPrivateWorkConfig, PRIVATE_WORK_COOKIE_NAME, PRIVATE_WORK_PREVIEW_COOKIE_NAME, sessionCookieOptions } from "../server/private-work/config.js";
import { readPrivateWorkBundle } from "../server/private-work/bundle.js";
import { pageHtml } from "../server/private-work/html.js";
import { handlePrivateWork } from "../server/private-work/handler.js";
import { createPasswordHash, createSessionValue } from "../server/private-work/session.js";

const fixturePassword = "fixture password for private-work tests";
const testRoot = mkdtempSync(resolve(tmpdir(), "private-work-test-"));
const bundleRoot = resolve(testRoot, "bundle");
const publicRoot = resolve(testRoot, "dist");
mkdirSync(publicRoot, { recursive: true });
writeFileSync(resolve(publicRoot, "index.html"), "<main>Public fixture</main>");

function writePublicShell(root) {
  const header = '<header class="site-nav"><a class="brand" href="/">AT</a><nav aria-label="Primary"><a href="/#work">Work</a></nav><button data-motion-toggle hidden>Motion</button><button data-theme-toggle>Theme</button></header>';
  const footer = '<footer class="site-footer"><nav aria-label="Footer"><a href="/about/">About</a></nav><form action="/api/private-work?action=logout" method="post"><button type="submit">Lock private work</button></form></footer>';
  const page = (toc) => `<!doctype html><html><head><title>__PRIVATE_TITLE__</title><meta name="robots" content="noindex, nofollow"><link rel="canonical" href="https://traykov.cc/__PRIVATE_PATH__/"/></head><body data-page-type="case" data-case-id="__PRIVATE_CASE_ID__" data-case-theme="pave">${header}<main class="case-page"><section class="case-hero case-hero--turntable"><div data-pave-turntable></div><h1>__PRIVATE_TITLE__</h1><p>__PRIVATE_SUMMARY__</p><p>__PRIVATE_META__</p></section><article class="case-reader-layout--with-tools">${toc}<div class="case-study-body">__PRIVATE_BODY__</div></article></main>${footer}</body></html>`;
  const toc = '<nav class="case-toc"><strong data-case-toc-current>__PRIVATE_HEADING_TEXT__</strong><ol><!--PRIVATE_TOC_START--><li class="case-toc__item case-toc__item--depth-2"><a href="#__PRIVATE_HEADING_ID__" data-case-target="__PRIVATE_HEADING_ID__">__PRIVATE_HEADING_TEXT__</a></li><!--PRIVATE_TOC_END--></ol></nav>';
  const card = '<template data-private-card-template><article id="__PRIVATE_CARD_ID__" class="project-card"><a href="/__PRIVATE_CARD_PATH__/"><h3>__PRIVATE_CARD_TITLE__</h3><p>__PRIVATE_CARD_SUMMARY__</p><span>__PRIVATE_CARD_STATUS__ / __PRIVATE_CARD_READ_TIME__</span></a></article></template>';
  const pages = {
    "private-case-template": page(toc),
    "private-collection-template": page("").replace("</main>", `</main>${card}`),
    "private-access": `<!doctype html><html><body>${header}<h1>Password required</h1><p data-private-access-message>Enter the shared password.</p><form action="/api/private-work?action=login" method="post"><input name="returnTo" value=""><input name="password" type="password"><button type="submit">Continue</button></form>${footer}</body></html>`
  };
  for (const [name, html] of Object.entries(pages)) {
    mkdirSync(resolve(root, name), { recursive: true });
    writeFileSync(resolve(root, name, "index.html"), html);
  }
}
writePublicShell(publicRoot);

const env = {
  ...process.env,
  VERCEL_ENV: "development",
  VERCEL: "",
  PRIVATE_WORK_BUNDLE_DIR: bundleRoot,
  PRIVATE_WORK_SESSION_SECRET: "fixture-session-secret-that-is-more-than-thirty-two-bytes",
  PRIVATE_WORK_WAF_CONFIGURED: ""
};

let baseUrl;
let server;

function sameOriginHeaders(extra = {}) {
  return { origin: baseUrl, ...extra };
}

async function request(path, init = {}) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual", ...init });
}

async function login({ password = fixturePassword, returnTo = "/private/", origin = baseUrl } = {}) {
  const body = new URLSearchParams({ password, returnTo }).toString();
  return request("/api/private-work?action=login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin },
    body
  });
}

function cookieFrom(response) {
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie, "A successful login must set a session cookie.");
  return cookie.split(";")[0];
}

function mockResponse() {
  return {
    body: undefined,
    headers: new Map(),
    statusCode: 200,
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), value);
    },
    end(body = "") {
      this.body = body;
    }
  };
}

test.before(async () => {
  env.PRIVATE_WORK_PASSWORD_HASH = await createPasswordHash(fixturePassword, Buffer.alloc(16, 7));
  buildPrivateWork({ bundleRoot, publicRoot, fixture: true });
  const demoDirectory = resolve(bundleRoot, "demos");
  const assetDirectory = resolve(bundleRoot, "demo-assets");
  mkdirSync(demoDirectory, { recursive: true });
  mkdirSync(assetDirectory, { recursive: true });
  writeFileSync(resolve(demoDirectory, "fixture-demo.html"), '<!doctype html><html><body><button>Neutral interactive fixture</button><script>document.body.dataset.ready="true"</script></body></html>');
  writeFileSync(resolve(assetDirectory, "fixture-font.woff2"), 'neutral-font-bytes');
  writeFileSync(resolve(assetDirectory, "fixture-module.js"), 'export const neutralModule = true;');
  const fixtureManifestFile = resolve(bundleRoot, "manifest.json");
  const demoManifest = JSON.parse(readFileSync(fixtureManifestFile, "utf8"));
  demoManifest.demos = [{ id: "fixture-demo", htmlFile: "demos/fixture-demo.html" }];
  demoManifest.demoAssets = [{ id: "fixture-font", file: "demo-assets/fixture-font.woff2", contentType: "font/woff2" }, { id: "fixture-module", file: "demo-assets/fixture-module.js", contentType: "text/javascript; charset=utf-8" }];
  writeFileSync(fixtureManifestFile, JSON.stringify(demoManifest));
  // Most handler tests deliberately exercise the hosted cookie contract.
  server = createPrivateWorkDevServer({ root: testRoot, env, localPreview: false });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolveClose, rejectClose) => server.close((error) => (error ? rejectClose(error) : resolveClose())));
  rmSync(testRoot, { recursive: true, force: true });
});

test("local public media serves bounded closed, open, suffix, and HEAD ranges", async () => {
  writeFileSync(resolve(publicRoot, "range-fixture.mp4"), "0123456789");
  for (const [range, expected, contentRange] of [
    ["bytes=0-1", "01", "bytes 0-1/10"],
    ["bytes=4-", "456789", "bytes 4-9/10"],
    ["bytes=-3", "789", "bytes 7-9/10"],
    ["bytes=-99", "0123456789", "bytes 0-9/10"],
    ["bytes=8-99", "89", "bytes 8-9/10"]
  ]) {
    for (const method of ["GET", "HEAD"]) {
      const response = await request("/range-fixture.mp4", { method, headers: { range } });
      assert.equal(response.status, 206);
      assert.equal(response.headers.get("accept-ranges"), "bytes");
      assert.equal(response.headers.get("content-range"), contentRange);
      assert.equal(response.headers.get("content-length"), String(expected.length));
      assert.equal(response.headers.get("content-type"), "video/mp4");
      assert.equal(await response.text(), method === "HEAD" ? "" : expected);
    }
  }
  const full = await request("/range-fixture.mp4");
  assert.equal(full.status, 200);
  assert.equal(full.headers.get("content-range"), null);
  assert.equal(await full.text(), "0123456789");
});

test("local public ranges reject malformed, multiple, unsafe, and unsatisfiable requests", async () => {
  writeFileSync(resolve(publicRoot, "invalid-range.mp4"), "0123456789");
  writeFileSync(resolve(publicRoot, "empty.mp4"), "");
  for (const range of ["bytes=", "bytes=-", "bytes=-0", "bytes=10-", "bytes=5-4", "bytes=0-1,4-5", "items=0-1", "bytes=0-9007199254740992", "bytes=9007199254740992-", "bytes=-9007199254740992", "bytes=1.5-2"]) {
    const response = await request("/invalid-range.mp4", { headers: { range } });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get("content-range"), "bytes */10");
    assert.equal(response.headers.get("content-length"), "0");
    assert.equal(await response.text(), "");
  }
  for (const method of ["GET", "HEAD"]) {
    const empty = await request("/empty.mp4", { method });
    assert.equal(empty.status, 200);
    assert.equal(empty.headers.get("content-length"), "0");
    assert.equal(await empty.text(), "");
    const ranged = await request("/empty.mp4", { method, headers: { range: "bytes=0-" } });
    assert.equal(ranged.status, 416);
    assert.equal(ranged.headers.get("content-range"), "bytes */0");
    assert.equal(await ranged.text(), "");
  }
});

test("abandoning a public video response closes its file stream", async (t) => {
  const file = resolve(publicRoot, "aborted-video.mp4");
  writeFileSync(file, "");
  truncateSync(file, 32 * 1024 * 1024);
  const original = fs.createReadStream;
  let observed;
  const mocked = t.mock.method(fs, "createReadStream", (...args) => {
    const stream = original(...args);
    if (args[0] === file) observed = stream;
    return stream;
  });
  syncBuiltinESMExports();
  let timer;
  try {
    await new Promise((resolveDone, reject) => {
      timer = setTimeout(() => reject(new Error("Abandoned media stream stayed open")), 2000);
      const client = get(`${baseUrl}/aborted-video.mp4`, (response) => {
        response.pause();
        assert.ok(observed, "The public response must have opened its file stream");
        observed.once("close", resolveDone);
        response.destroy();
      });
      client.on("error", reject);
    });
    assert.equal(observed.destroyed, true);
    assert.equal(observed.closed, true);
    assert.ok(observed.bytesRead < 32 * 1024 * 1024, "Stop reading the file when its client leaves");
  } finally {
    clearTimeout(timer);
    observed?.destroy();
    mocked.mock.restore();
    syncBuiltinESMExports();
  }
});

test("six paused video probes transfer only their requested bytes before a queued page", async () => {
  const file = resolve(publicRoot, "pooled-video.mp4");
  writeFileSync(file, "");
  truncateSync(file, 32 * 1024 * 1024);
  const agent = new Agent({ keepAlive: true, maxSockets: 6 });
  const read = (path, range) => new Promise((resolveDone, reject) => {
    const client = get(`${baseUrl}${path}`, { agent, headers: range ? { range } : {} }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolveDone({ status: response.statusCode, body: Buffer.concat(chunks), headers: response.headers }));
      response.on("error", reject);
      if (range) {
        response.pause();
        setTimeout(() => response.resume(), 50);
      }
    });
    client.setTimeout(2000, () => client.destroy(new Error("Public page stalled behind video probes")));
    client.on("error", reject);
  });
  try {
    const results = await Promise.all([
      ...Array.from({ length: 6 }, () => read("/pooled-video.mp4", "bytes=0-1")),
      read("/")
    ]);
    for (const media of results.slice(0, 6)) {
      assert.equal(media.status, 206);
      assert.equal(media.headers["content-length"], "2");
      assert.equal(media.body.length, 2);
    }
    assert.equal(results[6].status, 200);
    assert.match(results[6].body.toString(), /Public fixture/);
  } finally {
    agent.destroy();
  }
});

test("denies unauthenticated private HTML, media, and direct handler routes without bytes", async () => {
  const collection = await request("/private/");
  assert.equal(collection.status, 303);
  assert.equal(collection.headers.get("location"), "/private-access/?returnTo=%2Fprivate%2F");
  assert.equal(await collection.text(), "");

  const page = await request("/private/pave-unified-building/");
  assert.equal(page.status, 303);
  assert.equal(page.headers.get("location"), "/private-access/?returnTo=%2Fprivate%2Fpave-unified-building%2F");
  assert.equal(await page.text(), "");

  const media = await request("/private/media/fixture-image");
  assert.equal(media.status, 401);
  assert.doesNotMatch(await media.text(), /Sample private project|dummy private narrative/i);

  const direct = await request("/api/private-work?action=route&privatePath=pave-unified-building");
  assert.equal(direct.status, 303);
  assert.doesNotMatch(await direct.text(), /Sample private project|dummy private narrative/i);
});

test("derives routes from original and rewritten URL forms while rejecting auth-route ambiguity", async () => {
  const cookie = cookieFrom(await login());
  const headers = { host: new URL(baseUrl).host, cookie };

  const routes = [
    { label: "bare original collection", url: "/private/", expected: /Fixture study one/ },
    { label: "bare original study", url: "/private/pave-unified-building/", expected: /Fixture study one/ },
    { label: "original route action", url: "/private/pave-unified-building/?action=route", expected: /Fixture study one/ },
    { label: "bare original media", url: "/private/media/fixture-image", media: true },
    { label: "rewritten collection", url: "/api/private-work?action=route&privatePath=", expected: /Fixture study one/ },
    { label: "rewritten study", url: "/api/private-work?action=route&privatePath=pave-unified-building", expected: /Fixture study one/ },
    { label: "rewritten media", url: "/api/private-work?action=route&privatePath=media%2Ffixture-image", media: true }
  ];

  for (const route of routes) {
    const response = mockResponse();
    await handlePrivateWork({ method: "GET", url: route.url, headers }, response, env);
    assert.equal(response.statusCode, 200, `Expected ${route.label} to resolve.`);
    if (route.media) {
      assert.ok(Buffer.isBuffer(response.body), `Expected ${route.label} to return media bytes.`);
      assert.ok(response.body.length > 0, `Expected ${route.label} to return non-empty media bytes.`);
    } else {
      assert.match(String(response.body), route.expected, `Expected ${route.label} to return private HTML.`);
    }
  }

  for (const url of [
    "/api/private-work?action=login&privatePath=pave-unified-building",
    "/api/private-work?action=logout&path=pave-unified-building",
    "/private/pave-unified-building/?action=login"
  ]) {
    const response = mockResponse();
    await handlePrivateWork(
      {
        method: "POST",
        url,
        headers: {
          ...headers,
          origin: baseUrl,
          "content-type": "application/x-www-form-urlencoded"
        },
        body: { password: fixturePassword }
      },
      response,
      env
    );
    assert.equal(response.statusCode, 404, `Expected ambiguous auth route to be rejected: ${url}`);
  }
});

test("rejects cross-origin, missing-origin, oversized, and open-redirect login attempts", async () => {
  const crossOrigin = await login({ origin: "https://attacker.example" });
  assert.equal(crossOrigin.status, 403);

  const missingOrigin = await request("/api/private-work?action=login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: fixturePassword }).toString()
  });
  assert.equal(missingOrigin.status, 403);

  const sameOriginReferer = await request("/api/private-work?action=login", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: `${baseUrl}/private-access/?returnTo=%2Fprivate%2Fpave-unified-building%2F`
    },
    body: new URLSearchParams({ password: fixturePassword }).toString()
  });
  assert.equal(sameOriginReferer.status, 303);
  assert.equal(sameOriginReferer.headers.get("location"), "/private/pave-unified-building/");

  const sameOriginLogout = await request("/api/private-work?action=logout", {
    method: "POST",
    headers: { referer: `${baseUrl}/private/pave-unified-building/` }
  });
  assert.equal(sameOriginLogout.status, 303);
  assert.equal(sameOriginLogout.headers.get("location"), "/private-access/?locked=1");
  assert.match(sameOriginLogout.headers.get("set-cookie"), /Max-Age=0/);

  const tooLarge = await request("/api/private-work?action=login", {
    method: "POST",
    headers: sameOriginHeaders({ "content-type": "application/x-www-form-urlencoded" }),
    body: `password=${"x".repeat(4_500)}`
  });
  assert.equal(tooLarge.status, 413);

  const redirected = await login({ returnTo: "https://attacker.example/private/" });
  assert.equal(redirected.status, 303);
  assert.equal(redirected.headers.get("location"), "/private/");

  const parsedBodyResponse = mockResponse();
  await handlePrivateWork(
    {
      method: "POST",
      url: "/api/private-work?action=login",
      headers: {
        host: new URL(baseUrl).host,
        origin: baseUrl,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: { password: "x".repeat(4_500) }
    },
    parsedBodyResponse,
    env
  );
  assert.equal(parsedBodyResponse.statusCode, 413);

  const rewrittenLoginResponse = mockResponse();
  await handlePrivateWork(
    {
      method: "POST",
      url: "/private?action=login",
      headers: {
        host: new URL(baseUrl).host,
        origin: baseUrl,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: { password: fixturePassword }
    },
    rewrittenLoginResponse,
    env
  );
  assert.equal(rewrittenLoginResponse.statusCode, 404);
});

test("returns a visible generic retry form for a wrong password", async () => {
  const response = await login({ password: "wrong fixture password" });
  assert.equal(response.status, 401);
  const html = await response.text();
  assert.match(html, /That password did not work\. Try again\./);
  assert.match(html, /name="returnTo" value="\/private\/"/);
  assert.doesNotMatch(html, /Sample private project|dummy private narrative/i);
});

test("authenticates a direct deep-link return and emits an expiring secure cookie", async () => {
  const response = await login({ returnTo: "/private/pave-unified-building/" });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/private/pave-unified-building/");
  const cookie = cookieFrom(response);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  assert.match(response.headers.get("set-cookie"), /Secure/);
  assert.match(response.headers.get("set-cookie"), /SameSite=Lax/);

  const page = await request("/private/pave-unified-building/", { headers: { cookie } });
  assert.equal(page.status, 200);
  assert.match(page.headers.get("cache-control"), /no-store/);
  assert.match(await page.text(), /Fixture study one/);
});

test("uses a separate HTTP preview cookie only for explicit, direct loopback requests", async () => {
  const socket = { remoteAddress: "127.0.0.1", localAddress: "127.0.0.1" };
  const localEnv = { ...env, PRIVATE_WORK_LOCAL_PREVIEW: "1" };
  const localRequest = { headers: { host: "127.0.0.1:4312" }, socket };
  assert.deepEqual(sessionCookieOptions(localRequest, localEnv), { name: PRIVATE_WORK_PREVIEW_COOKIE_NAME, secure: false });
  assert.deepEqual(sessionCookieOptions({ ...localRequest, headers: { host: "localhost:4312" } }, localEnv), { name: PRIVATE_WORK_PREVIEW_COOKIE_NAME, secure: false });

  const rejected = [
    [localRequest, { ...localEnv, PRIVATE_WORK_LOCAL_PREVIEW: "" }],
    [localRequest, { ...localEnv, VERCEL: "1" }],
    [localRequest, { ...localEnv, VERCEL_ENV: "production" }],
    [localRequest, { ...localEnv, VERCEL_ENV: "preview" }],
    [{ ...localRequest, socket: undefined }, localEnv],
    [{ ...localRequest, socket: { ...socket, remoteAddress: "192.0.2.1" } }, localEnv],
    [{ ...localRequest, socket: { ...socket, localAddress: "192.0.2.2" } }, localEnv],
    [{ ...localRequest, socket: { ...socket, encrypted: true } }, localEnv],
    [{ ...localRequest, headers: { host: "example.com" } }, localEnv],
    ...["forwarded", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto"].map((header) => [
      { ...localRequest, headers: { ...localRequest.headers, [header]: "127.0.0.1" } }, localEnv
    ])
  ];
  for (const [request, candidateEnv] of rejected) {
    assert.deepEqual(sessionCookieOptions(request, candidateEnv), { name: PRIVATE_WORK_COOKIE_NAME, secure: true });
  }
});

test("local preview login, authenticated access, and logout use the same preview cookie", async () => {
  const preview = createPrivateWorkDevServer({ root: testRoot, env });
  preview.listen(0, "127.0.0.1");
  await once(preview, "listening");
  const origin = `http://127.0.0.1:${preview.address().port}`;
  try {
    const response = await fetch(`${origin}/api/private-work?action=login`, {
      method: "POST", redirect: "manual",
      headers: { origin, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ password: fixturePassword, returnTo: "/private/pave-unified-building/" })
    });
    assert.equal(response.status, 303);
    const cookie = cookieFrom(response);
    assert.ok(cookie.startsWith(`${PRIVATE_WORK_PREVIEW_COOKIE_NAME}=`));
    assert.match(response.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
    assert.doesNotMatch(response.headers.get("set-cookie"), /(?:^|; )Secure(?:;|$)/);
    const page = await fetch(`${origin}/private/pave-unified-building/`, { headers: { cookie }, redirect: "manual" });
    assert.equal(page.status, 200);
    const media = await fetch(`${origin}/private/media/fixture-image`, { headers: { cookie }, redirect: "manual" });
    assert.equal(media.status, 200);
    const hosted = await request("/private/", { headers: { cookie } });
    assert.equal(hosted.status, 303, "The hosted-cookie handler must ignore a preview cookie.");
    const logout = await fetch(`${origin}/api/private-work?action=logout`, { method: "POST", headers: { origin, cookie }, redirect: "manual" });
    assert.match(logout.headers.get("set-cookie"), new RegExp(`^${PRIVATE_WORK_PREVIEW_COOKIE_NAME}=;`));
    assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
    assert.doesNotMatch(logout.headers.get("set-cookie"), /(?:^|; )Secure(?:;|$)/);
  } finally {
    await new Promise((resolveClose, rejectClose) => preview.close((error) => error ? rejectClose(error) : resolveClose()));
  }
});

test("hosted production and preview keep the Host-prefixed Secure cookie even with a local override", async () => {
  for (const deployment of ["production", "preview"]) {
    const response = mockResponse();
    await handlePrivateWork({
      method: "POST", url: "/api/private-work?action=login",
      headers: { host: "traykov.cc", origin: "https://traykov.cc", "content-type": "application/x-www-form-urlencoded" },
      socket: { remoteAddress: "127.0.0.1", localAddress: "127.0.0.1" },
      body: { password: fixturePassword }
    }, response, { ...env, VERCEL_ENV: deployment, PRIVATE_WORK_WAF_CONFIGURED: "1", PRIVATE_WORK_LOCAL_PREVIEW: "1" });
    assert.equal(response.statusCode, 303);
    assert.match(response.headers.get("set-cookie"), /^__Host-private-work=/);
    assert.match(response.headers.get("set-cookie"), /; Secure;/);
  }
});

test("rejects tampered, expired, password-rotated, and key-rotated sessions", async () => {
  const response = await login();
  const cookie = cookieFrom(response);

  const tampered = await request("/private/", { headers: { cookie: `${cookie}x` } });
  assert.equal(tampered.status, 303);

  const expiredValue = createSessionValue(getPrivateWorkConfig(env), Math.floor(Date.now() / 1_000) - 40_000);
  const expired = await request("/private/", { headers: { cookie: `${PRIVATE_WORK_COOKIE_NAME}=${expiredValue}` } });
  assert.equal(expired.status, 303);

  const previousHash = env.PRIVATE_WORK_PASSWORD_HASH;
  env.PRIVATE_WORK_PASSWORD_HASH = await createPasswordHash("rotated fixture password that is long", Buffer.alloc(16, 8));
  const passwordRotated = await request("/private/", { headers: { cookie } });
  assert.equal(passwordRotated.status, 303);
  env.PRIVATE_WORK_PASSWORD_HASH = previousHash;

  const previousSecret = env.PRIVATE_WORK_SESSION_SECRET;
  env.PRIVATE_WORK_SESSION_SECRET = "rotated-fixture-secret-that-is-more-than-thirty-two-bytes";
  const keyRotated = await request("/private/", { headers: { cookie } });
  assert.equal(keyRotated.status, 303);
  env.PRIVATE_WORK_SESSION_SECRET = previousSecret;
});

test("authorizes only allowlisted media and implements HEAD and single byte ranges", async () => {
  const cookie = cookieFrom(await login());
  const media = await request("/private/media/fixture-video", {
    headers: { cookie, range: "bytes=0-3" }
  });
  assert.equal(media.status, 206);
  assert.equal(media.headers.get("content-range"), "bytes 0-3/1935");
  assert.equal((await media.arrayBuffer()).byteLength, 4);
  assert.match(media.headers.get("cache-control"), /no-store/);

  const suffix = await request("/private/media/fixture-video", {
    headers: { cookie, range: "bytes=-5" }
  });
  assert.equal(suffix.status, 206);
  assert.equal((await suffix.arrayBuffer()).byteLength, 5);

  const head = await request("/private/media/fixture-video", { method: "HEAD", headers: { cookie } });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "1935");
  assert.equal(await head.text(), "");

  const invalidRange = await request("/private/media/fixture-video", {
    headers: { cookie, range: "bytes=0-1,3-4" }
  });
  assert.equal(invalidRange.status, 416);

  const traversal = await request("/api/private-work?action=route&privatePath=media%2F..%2Fmanifest", {
    headers: { cookie }
  });
  assert.equal(traversal.status, 404);
});

test("requires the hosted WAF activation assertion before accepting login", async () => {
  const originalVercel = env.VERCEL;
  const originalWaf = env.PRIVATE_WORK_WAF_CONFIGURED;
  env.VERCEL = "1";
  env.PRIVATE_WORK_WAF_CONFIGURED = "";
  const blocked = await login();
  assert.equal(blocked.status, 503);

  const blockedRoute = await request("/private/");
  assert.equal(blockedRoute.status, 503);
  assert.doesNotMatch(await blockedRoute.text(), /Fixture study|dummy private narrative/i);

  env.PRIVATE_WORK_WAF_CONFIGURED = "1";
  const allowed = await login();
  assert.equal(allowed.status, 303);
  env.VERCEL = originalVercel;
  env.PRIVATE_WORK_WAF_CONFIGURED = originalWaf;
});

test("builds only the allowlisted source bundle and catches public-output leakage", () => {
  const source = resolve(testRoot, "source");
  const generated = resolve(testRoot, "generated");
  const output = resolve(testRoot, "public-scan");
  mkdirSync(resolve(source, "pages"), { recursive: true });
  mkdirSync(resolve(source, "media"), { recursive: true });
  mkdirSync(output, { recursive: true });
  writePublicShell(output);

  const longHtml = `<p>${"A private fixture sentence. ".repeat(30)}</p><img src="{{private-media:hero}}" alt="Fixture">`;
  writeFileSync(resolve(source, "pages", "pave-unified-building.html"), longHtml);
  writeFileSync(resolve(source, "pages", "pave-redesign.html"), longHtml);
  writeFileSync(resolve(source, "media", "hero.png"), Buffer.from("fixture-image"));
  writeFileSync(
    resolve(source, "manifest.json"),
    JSON.stringify({
      version: 1,
      collection: { intro: "Fixture collection" },
      pages: [
        { slug: "pave-unified-building", title: "Sensitive marker study one", summary: "Private fixture summary one", status: "Private", readTime: "8 min", htmlFile: "pages/pave-unified-building.html" },
        { slug: "pave-redesign", title: "Sensitive marker study two", summary: "Private fixture summary two", status: "Private", readTime: "7 min", htmlFile: "pages/pave-redesign.html" }
      ],
      media: [{ id: "hero", file: "media/hero.png", contentType: "image/png" }]
    })
  );

  const result = buildPrivateWork({ inputRoot: source, bundleRoot: generated, publicRoot: output });
  assert.equal(result.availability, "ready");
  const generatedManifest = JSON.parse(readFileSync(resolve(generated, "manifest.json"), "utf8"));
  assert.doesNotThrow(() => assertPublicOutputExcludesPrivate(generatedManifest, generated, output));

  writeFileSync(resolve(output, "index.html"), "Sensitive marker study one");
  assert.throws(
    () => assertPublicOutputExcludesPrivate(generatedManifest, generated, output),
    /Private bundle content appeared/
  );
});

test("preserves a valid supplied prebuilt bundle when source input is absent", () => {
  const prebuiltRoot = resolve(testRoot, "prebuilt");
  const prebuiltPublicRoot = resolve(testRoot, "prebuilt-public");
  mkdirSync(prebuiltPublicRoot, { recursive: true });
  writePublicShell(prebuiltPublicRoot);
  writeFileSync(resolve(prebuiltPublicRoot, "index.html"), "Public fixture");

  buildPrivateWork({ bundleRoot: prebuiltRoot, publicRoot: prebuiltPublicRoot, fixture: true });
  const before = readFileSync(resolve(prebuiltRoot, "manifest.json"), "utf8");
  writePublicShell(prebuiltPublicRoot);
  const result = buildPrivateWork({
    inputRoot: resolve(testRoot, "missing-private-source"),
    bundleRoot: prebuiltRoot,
    publicRoot: prebuiltPublicRoot,
    prebuilt: true
  });

  assert.equal(result.mode, "prebuilt");
  assert.match(readFileSync(resolve(prebuiltRoot, "manifest.json"), "utf8"), /Fixture study one/);
  assert.match(before, /Fixture study one/);
});


test("serves the shared public case template and removes build-only routes", async () => {
  const shell = readPrivateWorkBundle(env).shell;
  assert.equal(shell.version, 2);
  assert.match(shell.casePage, /data-motion-toggle/);
  assert.match(shell.casePage, /data-pave-turntable/);
  assert.match(shell.casePage, /case-toc/);
  assert.ok(!existsSync(resolve(publicRoot, "private-case-template")));
  assert.ok(!existsSync(resolve(publicRoot, "private-collection-template")));
  const cookie = cookieFrom(await login());
  for (const path of ["/private/", "/private/pave-unified-building/", "/private/pave-redesign/"]) {
    const response = await request(path, { headers: { cookie } });
    const html = await response.text();
    assert.match(html, /data-page-type="case"/);
    assert.match(html, /case-hero--turntable/);
    assert.match(html, /data-motion-toggle/);
    assert.match(html, /data-theme-toggle/);
    assert.match(html, /Lock private work/);
    assert.doesNotMatch(html, /iframe|__PRIVATE_|private-case-template|private-collection-template/);
  }
  const retry = await login({ password: "wrong" });
  const html = await retry.text();
  assert.match(html, /class="site-nav"/);
  assert.match(html, /class="site-footer"/);
});

test("rejects missing templates and embedded third-party content in the server bundle", () => {
  assert.throws(() => extractPrivateShell(resolve(testRoot, "no-public-build")), /Build the shared/);
  const original = readFileSync(resolve(bundleRoot, "manifest.json"), "utf8");
  const manifest = JSON.parse(original);
  try {
    manifest.shell.casePage += '<iframe src="https://example.com/"></iframe>';
    writeFileSync(resolve(bundleRoot, "manifest.json"), JSON.stringify(manifest));
    assert.equal(readPrivateWorkBundle(env).availability, "unavailable");
  } finally {
    writeFileSync(resolve(bundleRoot, "manifest.json"), original);
  }
});

test("fills shared template fields safely and preserves reviewed narrative and native media", () => {
  const body = '<figure><video controls preload="none" poster="/private/media/poster"><source src="/private/media/movie" type="video/mp4"></video><figcaption>Reviewed caption.</figcaption></figure><p>Reviewed narrative.</p><details><summary>Contents</summary><nav aria-label="On this page"><ol><li><a href="#finding">Reviewed finding</a></li></ol></nav></details><h2 id="finding">Reviewed finding</h2>';
  const html = pageHtml({ slug: "pave-redesign", title: 'Study <title> & "quote"', summary: "Summary", status: "Exploration", readTime: "8 min" }, body, readPrivateWorkBundle(env).shell);
  assert.match(html, /case-reader-layout--with-tools/);
  assert.match(html, /class="case-study-body"/);
  assert.match(html, /<figure class="case-video-copy">/);
  assert.match(html, /<video controls preload="none" poster="\/private\/media\/poster">/);
  assert.match(html, /<figcaption>Reviewed caption\.<\/figcaption>/);
  assert.match(html, /<p>Reviewed narrative\.<\/p>/);
  assert.match(html, /Study &lt;title&gt; &amp; &quot;quote&quot;/);
  assert.match(html, /data-case-id="pave-redesign"/);
  assert.match(html, /https:\/\/traykov\.cc\/private\/pave-redesign\//);
  assert.equal((html.match(/href="#finding"/g) || []).length, 1);
  assert.match(html, /data-case-target="finding"/);
  assert.doesNotMatch(html, /__PRIVATE_|<details>/);
});


test("private demo HTML and assets authenticate GET and HEAD before returning bytes", async () => {
  const cookie = cookieFrom(await login());
  for (const [path, type, marker] of [
    ["/private/demos/fixture-demo", "text/html; charset=utf-8", "Neutral interactive fixture"],
    ["/private/demo-assets/fixture-font", "font/woff2", "neutral-font-bytes"],
    ["/private/demo-assets/fixture-module", "text/javascript; charset=utf-8", "neutralModule"]
  ]) {
    for (const method of ["GET", "HEAD"]) {
      const denied = await request(path, { method });
      assert.equal(denied.status, 401);
      assert.doesNotMatch(await denied.text(), new RegExp(marker));
      const allowed = await request(path, { method, headers: { cookie } });
      assert.equal(allowed.status, 200);
      assert.equal(allowed.headers.get("content-type"), type);
      assert.match(allowed.headers.get("cache-control"), /private, no-store/);
      assert.equal(allowed.headers.get("vary"), "Cookie");
      assert.equal(allowed.headers.get("x-content-type-options"), "nosniff");
      if (path.includes("/demos/")) {
        assert.match(allowed.headers.get("content-security-policy"), /sandbox allow-scripts/);
        assert.match(allowed.headers.get("content-security-policy"), /connect-src 'none'/);
      }
      assert.match(allowed.headers.get("content-security-policy"), /frame-ancestors 'none'/);
      assert.doesNotMatch(allowed.headers.get("content-security-policy"), /unsafe-eval/);
      assert.doesNotMatch(allowed.headers.get("content-security-policy"), /allow-same-origin/);
      const body = await allowed.text();
      assert.equal(method === "HEAD" ? body : body.includes(marker), method === "HEAD" ? "" : true);
    }
    const direct = await request(`/api/private-work?action=route&privatePath=${encodeURIComponent(path.slice('/private/'.length))}`);
    assert.equal(direct.status, 401);
  }
});

test("demo routes reject traversal, unknown identifiers, and raw file extensions", async () => {
  const cookie = cookieFrom(await login());
  for (const path of ["demos/missing", "demo-assets/missing", "demos/fixture-demo.html", "demo-assets/fixture-font.woff2", "demos/../pages/pave-redesign", "demo-assets/%2e%2e/fixture-font", "demos/a/b"]) {
    const response = await request(`/api/private-work?action=route&privatePath=${encodeURIComponent(path)}`, { headers: { cookie } });
    assert.equal(response.status, 404, path);
  }
});

test("reviewed demo placeholders expand without allowing arbitrary executable page HTML", () => {
  const source = resolve(testRoot, "demo-source");
  const output = resolve(testRoot, "demo-public");
  const generated = resolve(testRoot, "demo-generated");
  for (const dir of ["pages", "media", "demos", "demos/assets"]) mkdirSync(resolve(source, dir), { recursive: true });
  mkdirSync(output, { recursive: true });
  const narrative = `<p>${"Neutral substantial fixture narrative. ".repeat(30)}</p>`;
  for (const slug of ["pave-unified-building", "pave-redesign"]) writeFileSync(resolve(source, `pages/${slug}.html`), narrative + '{{private-demo:example}}');
  writeFileSync(resolve(source, 'demos/example.html'), '<!doctype html><html><body>Protected runnable fixture<script>window.fixture=true;</script></body></html>');
  writeFileSync(resolve(source, 'media/poster.png'), 'poster');
  const manifest = {
    version: 1, collection: { intro: 'Neutral collection' },
    pages: ['pave-unified-building', 'pave-redesign'].map(slug => ({ slug, title: slug, summary: 'Neutral fixture', status: 'Fixture', readTime: '1 min', htmlFile: `pages/${slug}.html` })),
    media: [{ id: 'poster', file: 'media/poster.png', contentType: 'image/png' }],
    demos: [{ id: 'example', htmlFile: 'demos/example.html', title: 'Protected runnable fixture', caption: 'Original reviewed reference.', poster: 'poster', scenarios: [{ label: 'Default', query: 'state=default', note: 'Neutral scenario.' }] }]
  };
  const build = () => { writePublicShell(output); writeFileSync(resolve(source, 'manifest.json'), JSON.stringify(manifest)); return buildPrivateWork({ inputRoot: source, bundleRoot: generated, publicRoot: output }); };
  assert.equal(build().availability, 'ready');
  const html = readFileSync(resolve(generated, 'pages/pave-redesign.html'), 'utf8');
  assert.match(html, /data-private-demo/);
  assert.match(html, /data-demo-url="\/private\/demos\/example"/);
  assert.doesNotMatch(html, /<iframe|<script/);
  assert.ok(existsSync(resolve(generated, 'demos/example.html')));
  assert.equal(readPrivateWorkBundle({ PRIVATE_WORK_BUNDLE_DIR: generated }).demos.size, 1);
  writeFileSync(resolve(source, 'pages/pave-redesign.html'), narrative + '<iframe src="/private/demos/example"></iframe>');
  assert.throws(build, /executable or embedded/);
  writeFileSync(resolve(source, 'pages/pave-redesign.html'), narrative + '{{private-demo:missing}}');
  assert.throws(build, /outside the allowlist/);
  writeFileSync(resolve(source, 'pages/pave-redesign.html'), narrative + '{{private-demo:example}}');
  manifest.demos[0].htmlFile = '../example.html';
  assert.throws(build, /Invalid private demo path/);
  manifest.demos[0].htmlFile = 'demos/example.html';
  writeFileSync(resolve(source, 'demos/example.html'), '<!doctype html><script src="https://example.com/external.js"></script>');
  assert.throws(build, /self contained/);
});
