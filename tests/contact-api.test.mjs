import assert from "node:assert/strict";
import test from "node:test";
import contactHandler from "../api/contact.js";

const originalFetch = globalThis.fetch;
const originalEnvironment = {
  CONTACT_ALLOWED_ORIGINS: process.env.CONTACT_ALLOWED_ORIGINS,
  CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
};

function request(body, origin = "https://traykov.cc") {
  return {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin,
    },
    body,
  };
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

function validSubmission(overrides = {}) {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    message: "I would like to discuss a product design project.",
    website: "",
    "cf-turnstile-response": "verified-token",
    ...overrides,
  };
}

function configureEnvironment() {
  process.env.CONTACT_FROM_EMAIL = "Traykov website <contact@traykov.cc>";
  process.env.RESEND_API_KEY = "resend-test-key";
  process.env.TURNSTILE_SECRET_KEY = "turnstile-test-key";
  delete process.env.CONTACT_ALLOWED_ORIGINS;
}

test.beforeEach(() => {
  configureEnvironment();
});

test.after(() => {
  globalThis.fetch = originalFetch;

  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

test("verifies Turnstile and sends only to the fixed inbox", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });

    if (String(url).includes("turnstile")) {
      return new Response(
        JSON.stringify({
          action: "contact",
          hostname: "traykov.cc",
          success: true,
        }),
        { status: 200 },
      );
    }

    return new Response(JSON.stringify({ id: "email-id" }), { status: 200 });
  };

  const result = response();
  await contactHandler(request(validSubmission()), result);

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { ok: true });
  assert.equal(calls.length, 2);

  const emailPayload = JSON.parse(calls[1].options.body);
  assert.deepEqual(emailPayload.to, ["hi@traykov.cc"]);
  assert.equal(emailPayload.reply_to, "ada@example.com");
  assert.equal(emailPayload.subject, "New message from traykov.cc");
  assert.equal("html" in emailPayload, false);
});

test("silently accepts a filled honeypot without calling providers", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("Provider should not be called");
  };

  const result = response();
  await contactHandler(request(validSubmission({ website: "https://spam.example" })), result);

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { ok: true });
  assert.equal(fetchCalled, false);
});

test("rejects an untrusted origin before processing the message", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("Provider should not be called");
  };

  const result = response();
  await contactHandler(request(validSubmission(), "https://attacker.example"), result);

  assert.equal(result.statusCode, 403);
  assert.equal(fetchCalled, false);
});

test("rejects invalid user-controlled email headers", async () => {
  const result = response();
  await contactHandler(
    request(validSubmission({ email: "ada@example.com\r\nBcc: victim@example.com" })),
    result,
  );

  assert.equal(result.statusCode, 400);
  assert.match(result.body.error, /valid email/i);
});

test("fails closed when Turnstile does not verify the request", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        action: "contact",
        hostname: "traykov.cc",
        success: false,
      }),
      { status: 200 },
    );

  const result = response();
  await contactHandler(request(validSubmission()), result);

  assert.equal(result.statusCode, 400);
  assert.match(result.body.error, /anti-spam/i);
});
