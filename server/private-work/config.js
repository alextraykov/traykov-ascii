export const PRIVATE_WORK_COOKIE_NAME = "__Host-private-work";
export const PRIVATE_WORK_PREVIEW_COOKIE_NAME = "private-work-preview";
export const PRIVATE_WORK_DEFAULT_RETURN_TO = "/private/";
export const PRIVATE_WORK_MAX_LOGIN_BODY_BYTES = 4_096;
export const PRIVATE_WORK_MAX_SESSION_SECONDS = 86_400;
export const PRIVATE_WORK_MIN_SESSION_SECONDS = 300;
export const PRIVATE_WORK_DEFAULT_SESSION_SECONDS = 28_800;
export const PRIVATE_WORK_MAX_MEDIA_BYTES = 4_500_000;

const CANONICAL_ORIGINS = ["https://traykov.cc", "https://www.traykov.cc"];

function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sessionTtlSeconds(value) {
  if (!value) return PRIVATE_WORK_DEFAULT_SESSION_SECONDS;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return PRIVATE_WORK_DEFAULT_SESSION_SECONDS;
  if (parsed < PRIVATE_WORK_MIN_SESSION_SECONDS || parsed > PRIVATE_WORK_MAX_SESSION_SECONDS) {
    return PRIVATE_WORK_DEFAULT_SESSION_SECONDS;
  }

  return parsed;
}

export function isProduction(env = process.env) {
  return env.VERCEL_ENV === "production";
}

export function isHostedDeployment(env = process.env) {
  return env.VERCEL === "1" || env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview";
}

export function getPrivateWorkConfig(env = process.env) {
  const passwordHash = asTrimmedString(env.PRIVATE_WORK_PASSWORD_HASH);
  const sessionSecret = asTrimmedString(env.PRIVATE_WORK_SESSION_SECRET);
  const sessionSecretBytes = Buffer.from(sessionSecret, "utf8");

  return {
    configured: Boolean(passwordHash && sessionSecretBytes.length >= 32),
    passwordHash,
    sessionSecret: sessionSecretBytes,
    sessionTtlSeconds: sessionTtlSeconds(env.PRIVATE_WORK_SESSION_TTL_SECONDS),
    releaseGateReady: !isHostedDeployment(env) || env.PRIVATE_WORK_WAF_CONFIGURED === "1",
    production: isProduction(env)
  };
}

function deploymentOrigins(env) {
  return [env.VERCEL_URL, env.VERCEL_BRANCH_URL]
    .map(asTrimmedString)
    .filter(Boolean)
    .map((host) => `https://${host}`);
}

function configuredOrigins(env) {
  return asTrimmedString(env.PRIVATE_WORK_ALLOWED_ORIGINS)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isLoopbackOrigin(origin, request) {
  try {
    const url = new URL(origin);
    const host = String(request.headers.host ?? "").toLowerCase();
    const requestHost = host.replace(/\.$/, "");
    const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
    return (
      url.protocol === "http:" &&
      loopback.has(url.hostname.toLowerCase()) &&
      requestHost === url.host.toLowerCase()
    );
  } catch {
    return false;
  }
}

export function isSameOriginRequest(request, env = process.env) {
  const origin = asTrimmedString(request.headers.origin);
  const allowed = new Set([...CANONICAL_ORIGINS, ...deploymentOrigins(env), ...configuredOrigins(env)]);
  const isAllowedOrigin = (candidate) => {
    if (allowed.has(candidate)) return true;
    return !isProduction(env) && isLoopbackOrigin(candidate, request);
  };
  if (origin) return isAllowedOrigin(origin);

  const referer = asTrimmedString(request.headers.referer);
  if (!referer) return false;
  try {
    return isAllowedOrigin(new URL(referer).origin);
  } catch {
    return false;
  }
}

export function sessionCookieOptions(request, env = process.env) {
  const secure = { name: PRIVATE_WORK_COOKIE_NAME, secure: true };
  if (env.PRIVATE_WORK_LOCAL_PREVIEW !== "1" || isHostedDeployment(env)) return secure;
  const socket = request.socket;
  const loopbackAddresses = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
  if (
    !socket || socket.encrypted ||
    !loopbackAddresses.has(socket.remoteAddress) || !loopbackAddresses.has(socket.localAddress) ||
    ["forwarded", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto"].some((header) => request.headers[header])
  ) return secure;
  try {
    const host = new URL(`http://${String(request.headers.host || "")}`);
    if (!new Set(["localhost", "127.0.0.1", "[::1]"]).has(host.hostname)) return secure;
    if (host.username || host.password || host.pathname !== "/" || host.search || host.hash) return secure;
  } catch {
    return secure;
  }
  return { name: PRIVATE_WORK_PREVIEW_COOKIE_NAME, secure: false };
}

export function sessionCookie(value, maxAge = PRIVATE_WORK_DEFAULT_SESSION_SECONDS, options = { name: PRIVATE_WORK_COOKIE_NAME, secure: true }) {
  return [
    `${options.name}=${value}`,
    "Path=/",
    "HttpOnly",
    ...(options.secure ? ["Secure"] : []),
    "SameSite=Lax",
    `Max-Age=${maxAge}`
  ].join("; ");
}

export function clearedSessionCookie(options) {
  return sessionCookie("", 0, options);
}

export function readCookie(request, name = PRIVATE_WORK_COOKIE_NAME) {
  const header = String(request.headers.cookie ?? "");
  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return rawValue.join("=");
  }
  return "";
}
