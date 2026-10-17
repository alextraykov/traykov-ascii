import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handlePrivateWork } from "../server/private-work/handler.js";

const mimeTypes = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8"
};

function staticFile(publicRoot, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  if (decoded.includes("\0")) return undefined;

  const normalized = decoded.replace(/^\/+/, "");
  const direct = resolve(publicRoot, normalized);
  if (!direct.startsWith(`${publicRoot}${sep}`) && direct !== publicRoot) return undefined;
  const target = pathname.endsWith("/") || !extname(pathname) ? resolve(direct, "index.html") : direct;
  if (!target.startsWith(`${publicRoot}${sep}`) || !existsSync(target)) return undefined;
  try {
    return statSync(target).isFile() ? target : undefined;
  } catch {
    return undefined;
  }
}

function staticRange(header, size) {
  if (header === undefined) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!match || size === 0 || (!match[1] && !match[2])) return null;

  const [, first, last] = match;
  const start = first ? Number(first) : undefined;
  const end = last ? Number(last) : undefined;
  if ((start !== undefined && !Number.isSafeInteger(start)) ||
      (end !== undefined && !Number.isSafeInteger(end))) return null;

  if (start === undefined) {
    if (end === 0) return null;
    return { start: Math.max(0, size - end), end: size - 1 };
  }
  if (start >= size || (end !== undefined && end < start)) return null;
  return { start, end: Math.min(end ?? size - 1, size - 1) };
}

function serveStatic(request, response, publicRoot, pathname) {
  if (!["GET", "HEAD"].includes(request.method || "")) {
    response.statusCode = 405;
    response.end("Method not allowed");
    return;
  }

  const file = staticFile(publicRoot, pathname);
  if (!file) {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }

  const size = statSync(file).size;
  const range = staticRange(request.headers.range, size);
  response.setHeader("Accept-Ranges", "bytes");
  if (range === null) {
    response.statusCode = 416;
    response.setHeader("Content-Range", `bytes */${size}`);
    response.setHeader("Content-Length", "0");
    response.end();
    return;
  }

  response.statusCode = range ? 206 : 200;
  response.setHeader("Content-Type", mimeTypes[extname(file).toLowerCase()] || "application/octet-stream");
  response.setHeader("Content-Length", String(range ? range.end - range.start + 1 : size));
  if (range) response.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  if (request.method === "HEAD" || size === 0) {
    response.end();
    return;
  }

  const stream = createReadStream(file, range || undefined);
  const stopReading = () => stream.destroy();
  request.once("aborted", stopReading);
  response.once("close", stopReading);
  stream.once("close", () => {
    request.removeListener("aborted", stopReading);
    response.removeListener("close", stopReading);
  });
  stream.once("error", () => {
    if (response.headersSent) {
      response.destroy();
      return;
    }
    response.statusCode = 500;
    response.removeHeader("Content-Range");
    response.setHeader("Content-Length", "0");
    response.end();
  });
  if (request.aborted || response.destroyed) stopReading();
  else stream.pipe(response);
}

function privateRewrite(request, pathname) {
  const privatePath = pathname === "/private" ? "" : pathname.slice("/private/".length);
  const query = new URLSearchParams({ action: "route", privatePath });
  request.url = `/api/private-work?${query}`;
}

export function createPrivateWorkDevServer({
  root = process.cwd(),
  env = process.env,
  localPreview = true
} = {}) {
  const publicRoot = resolve(root, "dist");
  return createServer(async (request, response) => {
    const host = String(request.headers.host || "127.0.0.1");
    let url;
    try {
      url = new URL(request.url || "/", `http://${host}`);
    } catch {
      response.statusCode = 400;
      response.end("Bad request");
      return;
    }

    if (url.pathname === "/api/private-work") {
      await handlePrivateWork(request, response, { ...env, PRIVATE_WORK_LOCAL_PREVIEW: localPreview ? "1" : "" });
      return;
    }
    if (url.pathname === "/private" || url.pathname.startsWith("/private/")) {
      privateRewrite(request, url.pathname);
      await handlePrivateWork(request, response, { ...env, PRIVATE_WORK_LOCAL_PREVIEW: localPreview ? "1" : "" });
      return;
    }
    serveStatic(request, response, publicRoot, url.pathname);
  });
}

function parsePort(argv) {
  const index = argv.indexOf("--port");
  const value = index >= 0 ? argv[index + 1] : process.env.PORT || "4321";
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("Use a valid --port value.");
  return port;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const port = parsePort(process.argv.slice(2));
    const server = createPrivateWorkDevServer();
    server.listen(port, "127.0.0.1", () => {
      process.stdout.write(`private-work preview: http://127.0.0.1:${port}\n`);
    });
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
