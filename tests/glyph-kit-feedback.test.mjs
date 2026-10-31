import assert from "node:assert/strict";
import test from "node:test";
import feedbackHandler, { ERRORS, readFeedback } from "../api/glyph-kit-feedback.js";

const originalFetch = globalThis.fetch;
const keys = ["RESEND_API_KEY", "CONTACT_FROM_EMAIL", "TURNSTILE_SECRET_KEY", "VERCEL_ENV", "CONTACT_ALLOWED_ORIGINS"];
const originalEnvironment = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

function request(body, { origin = "https://glyph-kit.traykov.cc", method = "POST" } = {}) {
  return { method, headers: { accept: "application/json", "content-type": "application/json", origin }, body };
}

function response() {
  return {
    body: undefined,
    headers: new Map(),
    statusCode: 200,
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), value);
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {},
  };
}

function services({ turnstile = true, action = "glyph-kit-feedback", hostname = "glyph-kit.traykov.cc", resend = 200 } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("turnstile")) return new Response(JSON.stringify({ success: turnstile, action, hostname }));
    return new Response("{}", { status: resend });
  };
  return calls;
}

test.beforeEach(() => {
  process.env.RESEND_API_KEY = "resend-test-key";
  process.env.CONTACT_FROM_EMAIL = "site@traykov.cc";
  process.env.TURNSTILE_SECRET_KEY = "turnstile-test-key";
  process.env.VERCEL_ENV = "production";
  delete process.env.CONTACT_ALLOWED_ORIGINS;
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of keys) {
    if (originalEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnvironment[key];
  }
});

const good = { message: "The funnel labels overlap on a phone.", email: "", page: "/types/", "cf-turnstile-response": "token" };

test("feedback without an email is sent, with no reply address", async () => {
  const calls = services();
  const res = response();
  await feedbackHandler(request(good), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  const mail = JSON.parse(calls.find((c) => c.url.includes("resend")).init.body);
  assert.deepEqual(mail.to, ["hi@traykov.cc"]);
  assert.equal(mail.subject, "Glyph kit feedback");
  assert.equal("reply_to" in mail, false);
  assert.match(mail.text, /The funnel labels overlap/);
  assert.match(mail.text, /Reply to: no email given/);
  assert.match(mail.text, /Page: \/types\//);
});

test("an email, when given, becomes the reply address", async () => {
  const calls = services();
  const res = response();
  await feedbackHandler(request({ ...good, email: "pat@example.com" }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(calls.find((c) => c.url.includes("resend")).init.body).reply_to, "pat@example.com");
});

test("the kit site's origins are accepted and answer the browser's preflight", async () => {
  for (const origin of ["https://glyph-kit.traykov.cc", "https://glyph-kit-zeta.vercel.app", "https://traykov.cc"]) {
    const res = response();
    await feedbackHandler(request(undefined, { origin, method: "OPTIONS" }), res);
    assert.equal(res.statusCode, 204, origin);
    assert.equal(res.headers.get("access-control-allow-origin"), origin);
  }
  const res = response();
  await feedbackHandler(request(good, { origin: "https://example.com" }), res);
  assert.equal(res.statusCode, 403);
});

test("localhost is accepted outside production only", async () => {
  services();
  const res = response();
  await feedbackHandler(request(good, { origin: "http://localhost:4440" }), res);
  assert.equal(res.statusCode, 403);
  process.env.VERCEL_ENV = "development";
  delete process.env.TURNSTILE_SECRET_KEY;
  const local = response();
  await feedbackHandler(request(good, { origin: "http://localhost:4440" }), local);
  assert.equal(local.statusCode, 200);
});

test("empty, oversized and badly addressed feedback is refused in plain words", () => {
  assert.equal(readFeedback({ message: "  " }).error, ERRORS.message);
  assert.equal(readFeedback({ message: "x".repeat(4_001) }).error, ERRORS.message);
  assert.equal(readFeedback({ message: "Nice kit", email: "not an email" }).error, ERRORS.email);
  assert.equal(readFeedback({ message: "Nice kit", email: "pat@example" }).error, ERRORS.email);
  assert.equal(readFeedback({ message: "Nice kit", page: "/a\nBcc: x" }).page, "/aBcc: x");
});

test("the hidden field catches bots without sending anything", async () => {
  const calls = services();
  const res = response();
  await feedbackHandler(request({ ...good, website: "spam.example" }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 0);
});

test("a failed or borrowed anti-spam check is refused", async () => {
  for (const options of [{ turnstile: false }, { action: "glyph-kit" }, { action: "contact" }, { hostname: "example.com" }]) {
    const calls = services(options);
    const res = response();
    await feedbackHandler(request(good), res);
    assert.equal(res.statusCode, 400, JSON.stringify(options));
    assert.equal(res.body.error, ERRORS.check);
    assert.equal(calls.some((c) => c.url.includes("resend")), false);
  }
});

test("when email delivery fails or isn't set up, the reply says to try again", async () => {
  services({ resend: 500 });
  const res = response();
  await feedbackHandler(request(good), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, ERRORS.paused);

  delete process.env.RESEND_API_KEY;
  services();
  const unset = response();
  await feedbackHandler(request(good), unset);
  assert.equal(unset.statusCode, 503);
});
