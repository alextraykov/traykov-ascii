import assert from "node:assert/strict";
import { rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { addLocalImageDimensions, getLocalImageDimensions } from "../src/lib/local-image-dimensions.ts";

const publicDirectory = join(process.cwd(), "public");

function fixtureName(suffix) {
  return `__local-image-dimensions-${process.pid}-${suffix}.svg`;
}

function fixturePath(suffix) {
  return join(publicDirectory, fixtureName(suffix));
}

function fixtureSource(suffix) {
  return `/${fixtureName(suffix)}`;
}

function svg(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>`;
}

test("adds intrinsic dimensions while preserving authored image attributes", async () => {
  const path = fixturePath("authored");
  const source = fixtureSource("authored");
  await writeFile(path, svg(37, 19));

  try {
    const input = `<img src="${source}" alt="A retained caption" loading="lazy" decoding="async" data-evidence="kept">`;
    const output = await addLocalImageDimensions(input);

    assert.match(output, new RegExp(`src="${source}"`));
    assert.match(output, /alt="A retained caption"/);
    assert.match(output, /loading="lazy"/);
    assert.match(output, /decoding="async"/);
    assert.match(output, /data-evidence="kept"/);
    assert.match(output, /width="37"/);
    assert.match(output, /height="19"/);

    const authoredWidth = `<img src="${source}" width="320" alt="Keep the authored width">`;
    assert.equal(await addLocalImageDimensions(authoredWidth), authoredWidth);
  } finally {
    await rm(path, { force: true });
  }
});

test("refreshes cached local dimensions when the image file changes", async () => {
  const path = fixturePath("cache");
  const source = fixtureSource("cache");
  await writeFile(path, svg(4, 5));

  try {
    assert.deepEqual(await getLocalImageDimensions(source), { width: 4, height: 5 });

    await writeFile(path, svg(41, 59));
    assert.deepEqual(await getLocalImageDimensions(source), { width: 41, height: 59 });
  } finally {
    await rm(path, { force: true });
  }
});

test("leaves remote, invalid, and escaped public image sources unchanged", async () => {
  const outsidePath = join(tmpdir(), `local-image-dimensions-${process.pid}.svg`);
  const linkPath = fixturePath("outside-link");
  const linkSource = fixtureSource("outside-link");
  const localPath = fixturePath("origin");
  const localSource = fixtureSource("origin");
  const backslashRemoteSource = `/\\evil.example${localSource}`;
  await writeFile(outsidePath, svg(7, 11));
  await symlink(outsidePath, linkPath);
  await writeFile(localPath, svg(13, 17));

  try {
    const input = [
      '<img src="https://example.com/remote.svg" alt="Remote">',
      '<img src="//cdn.example.com/protocol-relative.svg" alt="CDN">',
      '<img src="data:image/svg+xml,ignored" alt="Inline">',
      '<img src="/../outside.svg" alt="Escaped">',
      '<img src="/not-present.svg" alt="Missing">',
      '<img src="/unsupported.tiff" alt="Unsupported">',
      `<img src="${backslashRemoteSource}" alt="Backslash remote">`,
      `<img src="${linkSource}" alt="Symlink">`
    ].join("");

    assert.equal(await addLocalImageDimensions(input), input);
    assert.equal(await getLocalImageDimensions(linkSource), undefined);
    assert.equal(await getLocalImageDimensions(backslashRemoteSource), undefined);
  } finally {
    await Promise.all([rm(linkPath, { force: true }), rm(localPath, { force: true }), rm(outsidePath, { force: true })]);
  }
});

test("does not emit non-positive metadata dimensions", async () => {
  const path = fixturePath("non-positive");
  const source = fixtureSource("non-positive");
  await writeFile(path, svg(0, 12));

  try {
    assert.equal(await getLocalImageDimensions(source), undefined);
  } finally {
    await rm(path, { force: true });
  }
});
