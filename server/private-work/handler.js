import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  PRIVATE_WORK_DEFAULT_RETURN_TO,
  PRIVATE_WORK_MAX_LOGIN_BODY_BYTES,
  clearedSessionCookie,
  getPrivateWorkConfig,
  isSameOriginRequest,
  readCookie,
  sessionCookie,
  sessionCookieOptions
} from "./config.js";
import { bundleDemoFile, bundleDemoAssetFile, bundleMediaFile, bundlePageFile, readPrivateWorkBundle } from "./bundle.js";
import { collectionHtml, loginFailureHtml, pageHtml, unavailableHtml } from "./html.js";
import { createSessionValue, verifyPassword, verifySessionValue } from "./session.js";

const TEXT_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Security-Policy": "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; object-src 'none'; img-src 'self' data:; font-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
  Vary: "Cookie"
};

const PAGE_SLUG = /^[A-Za-z0-9_-]{1,96}$/;
const MEDIA_ID = /^[A-Za-z0-9_-]{1,96}$/;

function setPrivateHeaders(response, extra = {}) {
  for (const [name, value] of Object.entries({ ...TEXT_HEADERS, ...extra })) response.setHeader(name, value);
}

function send(response, status, body = "", headers = {}) {
  setPrivateHeaders(response, headers);
  response.statusCode = status;
  response.end(body);
}

function redirect(response, location, cookie) {
  const headers = { Location: location };
  if (cookie) headers["Set-Cookie"] = cookie;
  send(response, 303, "", headers);
}

function requestUrl(request) {
  const host = String(request.headers.host || "localhost");
  const forwardedProtocol = String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProtocol === "https" ? "https" : "http";
  return new URL(request.url || "/", `${protocol}://${host}`);
}

function routeAction(request) {
  return requestUrl(request).searchParams.get("action") || "";
}

function normalRoutePath(value) {
  const raw = String(value ?? "").replace(/^\/+|\/+$/g, "");
  if (!raw) return { type: "collection", path: "/private/" };

  const segments = raw.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || /[%\\]/.test(segment))) return undefined;
  if (segments.length === 1 && PAGE_SLUG.test(segments[0])) {
    return { type: "page", slug: segments[0], path: `/private/${segments[0]}/` };
  }
  if (segments.length === 2 && segments[0] === "media" && MEDIA_ID.test(segments[1])) {
    return { type: "media", id: segments[1], path: `/private/media/${segments[1]}` };
  }
  if (segments.length === 2 && ["demos", "demo-assets"].includes(segments[0]) && MEDIA_ID.test(segments[1])) {
    return { type: segments[0] === "demos" ? "demo" : "demo-asset", id: segments[1], path: `/private/${segments[0]}/${segments[1]}` };
  }
  return undefined;
}

function routeFromOriginalPathname(pathname) {
  if (pathname !== "/private" && !pathname.startsWith("/private/")) return undefined;
  return normalRoutePath(pathname.slice("/private".length));
}

function hasPrivateRouteMarker(url) {
  return url.searchParams.has("privatePath") || url.searchParams.has("path");
}

function privateRoute(request) {
  const url = requestUrl(request);
  if (url.pathname === "/private" || url.pathname.startsWith("/private/")) {
    return routeFromOriginalPathname(url.pathname);
  }

  const rewrittenPath = url.searchParams.get("privatePath");
  if (rewrittenPath !== null) return normalRoutePath(rewrittenPath);

  const explicitPath = url.searchParams.get("path");
  if (explicitPath !== null) return normalRoutePath(explicitPath);
  return undefined;
}

function allowedReturnTo(bundle, value) {
  const candidate = String(value ?? "");
  if (!candidate || candidate.length > 256 || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return PRIVATE_WORK_DEFAULT_RETURN_TO;
  }

  try {
    const url = new URL(candidate, "https://traykov.invalid");
    if (url.origin !== "https://traykov.invalid" || url.search || url.hash) return PRIVATE_WORK_DEFAULT_RETURN_TO;
    if (url.pathname !== "/private" && !url.pathname.startsWith("/private/")) {
      return PRIVATE_WORK_DEFAULT_RETURN_TO;
    }
    const route = normalRoutePath(url.pathname.slice("/private".length));
    if (!route || !["page", "collection"].includes(route.type)) return PRIVATE_WORK_DEFAULT_RETURN_TO;
    if (route.type === "collection") return route.path;
    return bundle.pages.some((page) => page.slug === route.slug) ? route.path : PRIVATE_WORK_DEFAULT_RETURN_TO;
  } catch {
    return PRIVATE_WORK_DEFAULT_RETURN_TO;
  }
}

function returnToFromReferer(request) {
  const referer = String(request.headers.referer ?? "");
  if (!referer) return "";

  try {
    const entry = new URL(referer);
    const requestOrigin = requestUrl(request).origin;
    if (entry.origin !== requestOrigin || entry.pathname !== "/private-access/") return "";
    return entry.searchParams.get("returnTo") || "";
  } catch {
    return "";
  }
}

async function readLoginBody(request) {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.includes("application/x-www-form-urlencoded")) return undefined;

  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    const keys = Object.keys(request.body);
    let serialized = "";
    try {
      serialized = JSON.stringify(request.body);
    } catch {
      return undefined;
    }
    if (keys.length > 4 || Buffer.byteLength(serialized) > PRIVATE_WORK_MAX_LOGIN_BODY_BYTES) return "too-large";
    return request.body;
  }
  if (typeof request.body === "string") {
    if (Buffer.byteLength(request.body) > PRIVATE_WORK_MAX_LOGIN_BODY_BYTES) return "too-large";
    return Object.fromEntries(new URLSearchParams(request.body));
  }

  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > PRIVATE_WORK_MAX_LOGIN_BODY_BYTES) return "too-large";
    chunks.push(chunk);
  }

  return Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString("utf8")));
}

function authenticated(request, config, cookieOptions) {
  return config.configured && verifySessionValue(config, readCookie(request, cookieOptions.name));
}

async function login(request, response, env) {
  if (request.method !== "POST") return send(response, 405, "Method not allowed");
  if (!isSameOriginRequest(request, env)) return send(response, 403, "Forbidden");

  const config = getPrivateWorkConfig(env);
  if (!config.configured || !config.releaseGateReady) return send(response, 503, "Private work is unavailable.");

  const bundle = readPrivateWorkBundle(env);
  if (bundle.availability !== "ready") return send(response, 503, "Private work is unavailable.");

  const body = await readLoginBody(request);
  if (body === "too-large") return send(response, 413, "Request too large");
  if (!body || typeof body !== "object") return send(response, 400, "Invalid request");

  const requestedReturnTo = typeof body.returnTo === "string" && body.returnTo ? body.returnTo : returnToFromReferer(request);
  const returnTo = allowedReturnTo(bundle, requestedReturnTo);
  const accepted = await verifyPassword(config, typeof body.password === "string" ? body.password : "");
  if (!accepted) {
    return send(response, 401, loginFailureHtml(bundle.styles, returnTo, bundle.shell), {
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "same-origin"
    });
  }

  return redirect(response, returnTo, sessionCookie(createSessionValue(config), config.sessionTtlSeconds, sessionCookieOptions(request, env)));
}

function logout(request, response, env) {
  if (request.method !== "POST") return send(response, 405, "Method not allowed");
  if (!isSameOriginRequest(request, env)) return send(response, 403, "Forbidden");
  return redirect(response, "/private-access/?locked=1", clearedSessionCookie(sessionCookieOptions(request, env)));
}

function serveUnavailable(response) {
  setPrivateHeaders(response, { "Content-Type": "text/html; charset=utf-8" });
  response.statusCode = 503;
  response.end(unavailableHtml());
}

function unauthorized(response, route) {
  if (["media", "demo", "demo-asset"].includes(route.type)) return send(response, 401, "Unauthorized");
  return redirect(response, `/private-access/?returnTo=${encodeURIComponent(route.path)}`);
}

function parseRange(header, size) {
  if (!header) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!match || !size) return null;
  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;

  let start;
  let end;
  if (!rawStart) {
    const suffix = Number(rawEnd);
    if (!Number.isInteger(suffix) || suffix <= 0) return null;
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : size - 1;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) return null;
    end = Math.min(end, size - 1);
  }

  return { start, end };
}

async function serveMedia(request, response, bundle, route) {
  const media = bundle.media.get(route.id);
  const file = media && bundleMediaFile(bundle, media);
  if (!media || !file) return send(response, 404, "Not found");

  let body;
  try {
    body = await readFile(file);
  } catch {
    return send(response, 404, "Not found");
  }

  const range = parseRange(request.headers.range, body.length);
  if (range === null) {
    return send(response, 416, "", {
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes */${body.length}`
    });
  }

  const payload = range ? body.subarray(range.start, range.end + 1) : body;
  const headers = {
    "Content-Type": media.contentType,
    "Content-Length": String(payload.length),
    "Accept-Ranges": "bytes",
    ...(range ? { "Content-Range": `bytes ${range.start}-${range.end}/${body.length}` } : {})
  };
  setPrivateHeaders(response, headers);
  response.statusCode = range ? 206 : 200;
  if (request.method === "HEAD") return response.end();
  return response.end(payload);
}

async function serveDemo(request, response, bundle, route) {
  const document = route.type === "demo";
  const item = (document ? bundle.demos : bundle.demoAssets).get(route.id);
  const file = item && (document ? bundleDemoFile(bundle, item) : bundleDemoAssetFile(bundle, item));
  if (!file) return send(response, 404, "Not found");
  try {
    const payload = await readFile(file);
    const headers = {
      "Content-Type": document ? "text/html; charset=utf-8" : item.contentType,
      "Content-Length": String(payload.length),
      "Content-Security-Policy": document ? "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; sandbox allow-scripts; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; object-src 'none'" : TEXT_HEADERS["Content-Security-Policy"]
    };
    return send(response, 200, request.method === "HEAD" ? "" : payload, headers);
  } catch {
    return send(response, 404, "Not found");
  }
}

async function route(request, response, env) {
  if (!["GET", "HEAD"].includes(request.method || "")) return send(response, 405, "Method not allowed");

  const route = privateRoute(request);
  if (!route) return send(response, 404, "Not found");

  const config = getPrivateWorkConfig(env);
  if (!config.configured || !config.releaseGateReady) return serveUnavailable(response);
  if (!authenticated(request, config, sessionCookieOptions(request, env))) return unauthorized(response, route);

  const bundle = readPrivateWorkBundle(env);
  if (bundle.availability !== "ready") return serveUnavailable(response);

  if (["demo", "demo-asset"].includes(route.type)) return serveDemo(request, response, bundle, route);
  if (route.type === "media") return serveMedia(request, response, bundle, route);
  if (route.type === "collection") {
    const document = collectionHtml(bundle);
    return send(response, 200, request.method === "HEAD" ? "" : document, {
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "same-origin"
    });
  }

  const page = bundle.pages.find((item) => item.slug === route.slug);
  const pageFile = page && bundlePageFile(bundle, page);
  if (!page || !pageFile) return send(response, 404, "Not found");

  try {
    const body = await readFile(pageFile, "utf8");
    const document = pageHtml(page, body, bundle.shell);
    return send(response, 200, request.method === "HEAD" ? "" : document, {
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "same-origin"
    });
  } catch {
    return send(response, 404, "Not found");
  }
}

export async function handlePrivateWork(request, response, env = process.env) {
  const url = requestUrl(request);
  const isApiEndpoint = url.pathname === "/api/private-work";
  const isOriginalPrivatePath = url.pathname === "/private" || url.pathname.startsWith("/private/");
  const hasRouteMarker = hasPrivateRouteMarker(url);
  const action = routeAction(request);
  if (action === "login" || action === "logout") {
    if (!isApiEndpoint || hasRouteMarker) return send(response, 404, "Not found");
    return action === "login" ? login(request, response, env) : logout(request, response, env);
  }
  if (action === "route" || (!action && isOriginalPrivatePath)) {
    if (!isApiEndpoint && !isOriginalPrivatePath) return send(response, 404, "Not found");
    return route(request, response, env);
  }
  return send(response, 404, "Not found");
}

export const privateWorkHandlerInternals = {
  allowedReturnTo,
  normalRoutePath,
  parseRange
};
