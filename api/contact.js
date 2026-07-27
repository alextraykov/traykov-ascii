const CONTACT_DESTINATION = "hi@traykov.cc";
const MAX_BODY_BYTES = 16_384;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 5_000;
const TURNSTILE_ACTION = "contact";

function setResponseHeaders(response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
}

function wantsJson(request) {
  return String(request.headers.accept ?? "").includes("application/json");
}

function finish(request, response, status, payload, redirectState) {
  setResponseHeaders(response);

  if (!wantsJson(request) && redirectState) {
    response.statusCode = 303;
    response.setHeader("Location", `/contact/?${redirectState}=1`);
    response.end();
    return;
  }

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
    process.env.VERCEL_ENV === "production"
      ? []
      : ["http://localhost:4321", "http://127.0.0.1:4321"];

  return new Set([
    "https://traykov.cc",
    "https://www.traykov.cc",
    ...localOrigins,
    ...configured,
    ...vercelOrigins,
  ]);
}

function parseBody(request) {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();

  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body !== "string") {
    return null;
  }

  if (contentType.includes("application/json")) {
    return JSON.parse(request.body);
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(request.body));
  }

  return null;
}

function cleanField(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateSubmission(body) {
  const name = cleanField(body?.name);
  const email = cleanField(body?.email);
  const message = cleanField(body?.message);
  const website = cleanField(body?.website);
  const turnstileToken = cleanField(body?.["cf-turnstile-response"]);

  if (website) {
    return { bot: true };
  }

  if (!name || name.length > MAX_NAME_LENGTH || /[\r\n\0]/u.test(name)) {
    return { error: "Enter a valid name." };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
  if (
    !email ||
    email.length > MAX_EMAIL_LENGTH ||
    /[\r\n\0]/u.test(email) ||
    !emailPattern.test(email)
  ) {
    return { error: "Enter a valid email address." };
  }

  if (message.length < 10 || message.length > MAX_MESSAGE_LENGTH || /\0/u.test(message)) {
    return { error: "Write a message between 10 and 5,000 characters." };
  }

  if (!turnstileToken || turnstileToken.length > 2_048) {
    return { error: "Complete the anti-spam check and try again." };
  }

  return { name, email, message, turnstileToken };
}

function getClientIp(request) {
  const forwarded = String(request.headers["x-forwarded-for"] ?? "");
  return forwarded.split(",")[0]?.trim() || undefined;
}

async function verifyTurnstile(token, request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error("TURNSTILE_SECRET_KEY is not configured");
  }

  const form = new URLSearchParams({
    secret,
    response: token,
  });
  const remoteIp = getClientIp(request);
  if (remoteIp) form.set("remoteip", remoteIp);

  const verification = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(5_000),
    },
  );

  if (!verification.ok) return false;

  const result = await verification.json();
  if (!result.success || result.action !== TURNSTILE_ACTION) return false;

  const origin = String(request.headers.origin ?? "");
  const expectedHostname = origin ? new URL(origin).hostname : "";
  return !result.hostname || result.hostname === expectedHostname;
}

function buildMessage({ name, email, message }) {
  return [
    "New message from traykov.cc",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    "Message:",
    message,
    "",
    `Received: ${new Date().toISOString()}`,
  ].join("\n");
}

async function sendEmail(submission) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Email delivery is not configured");
  }

  const delivery = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [CONTACT_DESTINATION],
      reply_to: submission.email,
      subject: "New message from traykov.cc",
      text: buildMessage(submission),
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!delivery.ok) {
    throw new Error(`Resend rejected the message with status ${delivery.status}`);
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    setResponseHeaders(response);
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const origin = String(request.headers.origin ?? "");
  if (!origin || !allowedOrigins().has(origin)) {
    finish(request, response, 403, { error: "Request origin was not accepted." }, "error");
    return;
  }

  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    finish(request, response, 413, { error: "Message is too large." }, "error");
    return;
  }

  let body;
  try {
    body = parseBody(request);
  } catch {
    finish(request, response, 400, { error: "Invalid form data." }, "error");
    return;
  }

  const submission = validateSubmission(body);
  if (submission.bot) {
    finish(request, response, 200, { ok: true }, "sent");
    return;
  }

  if (submission.error) {
    finish(request, response, 400, { error: submission.error }, "error");
    return;
  }

  try {
    const verified = await verifyTurnstile(submission.turnstileToken, request);
    if (!verified) {
      finish(
        request,
        response,
        400,
        { error: "The anti-spam check expired. Complete it again and resend." },
        "error",
      );
      return;
    }

    await sendEmail(submission);
    finish(request, response, 200, { ok: true }, "sent");
  } catch (error) {
    console.error(
      "Contact form delivery failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    finish(
      request,
      response,
      503,
      { error: "The message could not be sent. Please try again or email hi@traykov.cc." },
      "error",
    );
  }
}
