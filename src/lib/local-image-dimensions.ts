import { imageMetadata } from "astro/assets/utils";
import { readFile, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

type LocalImageDimensions = Readonly<{
  width: number;
  height: number;
}>;

type CachedMetadata = Readonly<{
  signature: string;
  dimensions: Promise<LocalImageDimensions | undefined>;
}>;

const publicDirectory = resolve(process.cwd(), "public");
const supportedExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const metadataCache = new Map<string, CachedMetadata>();
const publicDirectoryRealpath = realpath(publicDirectory);
const localOrigin = "https://traykov.cc";

function isWithinDirectory(directory: string, candidate: string) {
  const fromDirectory = relative(directory, candidate);
  return fromDirectory !== "" && fromDirectory !== ".." && !fromDirectory.startsWith(`..${sep}`) && !isAbsolute(fromDirectory);
}

async function resolveLocalPublicImage(source: string) {
  if (!source.startsWith("/") || source.startsWith("//")) return undefined;

  let url: URL;
  try {
    url = new URL(source, localOrigin);
  } catch {
    return undefined;
  }
  if (url.origin !== localOrigin) return undefined;

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return undefined;
  }
  if (!supportedExtensions.has(extname(pathname).toLowerCase())) return undefined;

  try {
    const [directory, candidate] = await Promise.all([
      publicDirectoryRealpath,
      realpath(resolve(publicDirectory, `.${pathname}`))
    ]);
    return isWithinDirectory(directory, candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

export async function getLocalImageDimensions(source: string): Promise<LocalImageDimensions | undefined> {
  const file = await resolveLocalPublicImage(source);
  if (!file) return undefined;

  let fileStat;
  try {
    fileStat = await stat(file);
  } catch {
    return undefined;
  }
  const signature = `${fileStat.mtimeMs}:${fileStat.size}`;
  let metadata = metadataCache.get(file);
  if (!metadata || metadata.signature !== signature) {
    const dimensions = readFile(file)
      .then(async (contents) => {
        const { width, height } = await imageMetadata(contents, file);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined;
        return { width, height };
      })
      .catch(() => undefined);
    metadata = { signature, dimensions };
    metadataCache.set(file, metadata);
  }
  return metadata.dimensions;
}

function hasAttribute(tag: string, name: string) {
  return new RegExp(`\\s${name}\\s*=`, "i").test(tag);
}

function sourceFromImageTag(tag: string) {
  const match = tag.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function withDimensions(tag: string, dimensions: LocalImageDimensions) {
  if (hasAttribute(tag, "width") || hasAttribute(tag, "height")) return tag;

  const closingIndex = tag.endsWith("/>") ? tag.length - 2 : tag.length - 1;
  return `${tag.slice(0, closingIndex)} width="${dimensions.width}" height="${dimensions.height}"${tag.slice(closingIndex)}`;
}

export async function addLocalImageDimensions(html: string): Promise<string> {
  const imageTagPattern = /<img\b[^>]*>/gi;
  const output: string[] = [];
  let cursor = 0;

  for (const match of html.matchAll(imageTagPattern)) {
    const tag = match[0];
    const source = sourceFromImageTag(tag);
    output.push(html.slice(cursor, match.index), tag);
    cursor = (match.index || 0) + tag.length;

    if (!source || hasAttribute(tag, "width") || hasAttribute(tag, "height")) continue;
    const dimensions = await getLocalImageDimensions(source);
    if (dimensions) output[output.length - 1] = withDimensions(tag, dimensions);
  }

  output.push(html.slice(cursor));
  return output.join("");
}
