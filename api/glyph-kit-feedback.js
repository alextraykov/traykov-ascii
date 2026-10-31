// Feedback from the Glyph kit site: a message, and an email only if the sender wants a reply.
// It arrives as an email to hi@traykov.cc, the same way the contact form does.
const DESTINATION = "hi@traykov.cc";
const MAX_BODY_BYTES = 16_384;
const MIN_MESSAGE = 3;
const MAX_MESSAGE = 4_000;
const MAX_EMAIL = 254;
const MAX_PAGE = 300;
const TURNSTILE_ACTION = "glyph-kit-feedback";

export const ERRORS = {
  message: `Write a message, up to ${MAX_MESSAGE.toLocaleString("en")} characters.`,
  email: "Check the email address, or leave it empty.",
  check: "The anti-spam check expired. Send again.",
  paused: "Feedback couldn't be sent just now. Try again, or email hi@traykov.cc.",
};

function setResponseHeaders(response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
}

function send(response, status, payload) {
  setResponseHeaders(response);
  response.status(status).json(payload);
}

function allowedOrigins() {
  const configured = String(process.env.CONTACT_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const vercelOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter(Boolean)
    .map((host) => `https://${host}`);
  const localOrigins =
    process.env.VERCEL_ENV === "production" ? [] : ["http://localhost:4440", "http://127.0.0.1:4440"];
  // The kit site lives on its own subdomain and Vercel project, and also at traykov.cc/glyph-kit.
  const glyphKit = ["https://glyph-kit.traykov.cc", "https://glyph-kit-zeta.vercel.app"];
  return new Set(["https://traykov.cc", "https://www.traykov.cc", ...glyphKit, ...localOrigins, ...configured, ...vercelOrigins]);
}

/** Let an accepted origin read the reply. Browsers treat the subdomain as a different site. */
function allowOrigin(request, response) {
  const origin = String(request.headers.origin ?? "");
  response.setHeader("Vary", "Origin");
  if (!origin || !allowedOrigins().has(origin)) return false;
  response.setHeader("Access-Control-Allow-Origin", origin);
  return true;
}

function parseBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body !== "string") return null;
  return JSON.parse(request.body);
}

const clean = (value) => (typeof value === "string" ? value.trim() : "");

/** The message, the optional reply address and the page it came from; or what's wrong with them. */
export function readFeedback(body) {
  // A field people never see. Anything in it is a bot, which is told it worked.
  if (clean(body?.website)) return { bot: true };
  const message = clean(body?.message);
  if (message.length < MIN_MESSAGE || message.length > MAX_MESSAGE || /\0/u.test(message)) return { error: ERRORS.message };
  const email = clean(body?.email);
  if (email && (email.length > MAX_EMAIL || /[\s\0]/u.test(email) || !/^[^@]+@[^@]+\.[^@]+$/u.test(email))) return { error: ERRORS.email };
  const page = clean(body?.page).slice(0, MAX_PAGE).replace(/[\r\n\0]/gu, "");
  return { message, email, page, token: clean(body?.["cf-turnstile-response"]) };
}

function getClientIp(request) {
  const forwarded = String(request.headers["x-forwarded-for"] ?? "");
  return forwarded.split(",")[0]?.trim() || undefined;
}

async function verifyTurnstile(token, request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Local runs without Cloudflare keys still work; production never skips the check.
    if (process.env.VERCEL_ENV !== "production") return true;
    throw new Error("TURNSTILE_SECRET_KEY is not configured");
  }
  if (!token || token.length > 2_048) return false;

  const form = new URLSearchParams({ secret, response: token });
  const remoteIp = getClientIp(request);
  if (remoteIp) form.set("remoteip", remoteIp);

  const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(5_000),
  });
  if (!verification.ok) return false;

  const result = await verification.json();
  if (!result.success || result.action !== TURNSTILE_ACTION) return false;
  const origin = String(request.headers.origin ?? "");
  const expectedHostname = origin ? new URL(origin).hostname : "";
  return !result.hostname || result.hostname === expectedHostname;
}

export function buildEmail({ message, email, page }) {
  return [
    "Feedback from the Glyph kit site",
    "",
    message,
    "",
    `Reply to: ${email || "no email given"}`,
    `Page: ${page || "unknown"}`,
    `Received: ${new Date().toISOString()}`,
  ].join("\n");
}

async function sendEmail(feedback) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email delivery is not configured");

  const delivery = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [DESTINATION],
      ...(feedback.email ? { reply_to: feedback.email } : {}),
      subject: "Glyph kit feedback",
      text: buildEmail(feedback),
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!delivery.ok) throw new Error(`Resend rejected the message with status ${delivery.status}`);
}

export default async function handler(request, response) {
  // The browser asks first before a cross-site JSON post.
  if (request.method === "OPTIONS") {
    setResponseHeaders(response);
    if (!allowOrigin(request, response)) {
      response.status(403).json({ error: "Request origin was not accepted." });
      return;
    }
    response.setHeader("Access-Control-Allow-Methods", "POST");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
    response.setHeader("Access-Control-Max-Age", "600");
    response.statusCode = 204;
    response.end();
    return;
  }

  if (request.method !== "POST") {
    setResponseHeaders(response);
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (!allowOrigin(request, response)) {
    send(response, 403, { error: "Request origin was not accepted." });
    return;
  }

  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    send(response, 413, { error: ERRORS.message });
    return;
  }

  let feedback;
  try {
    feedback = readFeedback(parseBody(request));
  } catch {
    send(response, 400, { error: ERRORS.message });
    return;
  }
  if (feedback.bot) {
    send(response, 200, { ok: true });
    return;
  }
  if (feedback.error) {
    send(response, 400, { error: feedback.error });
    return;
  }

  try {
    if (!(await verifyTurnstile(feedback.token, request))) {
      send(response, 400, { error: ERRORS.check });
      return;
    }
    await sendEmail(feedback);
    send(response, 200, { ok: true });
  } catch (error) {
    console.error("Glyph kit feedback failed:", error instanceof Error ? error.message : "Unknown error");
    send(response, 503, { error: ERRORS.paused });
  }
}
