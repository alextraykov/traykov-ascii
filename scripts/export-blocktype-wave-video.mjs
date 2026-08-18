import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SIZE = 1080;
const FPS = 30;
const CAPTURE_SECONDS = 9;
const LOOP_FADE_SECONDS = 1;
const SOURCE_URL =
  process.env.BLOCKTYPE_EXPORT_URL ??
  "http://127.0.0.1:4321/notes/on-digital-art/";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const outputPath = resolve(
  repositoryRoot,
  process.argv[2] ??
    "exports/blocktype-wave-on-digital-art-1080-square-loop.mp4"
);

const findFfmpeg = async () => {
  const candidates = [
    process.env.FFMPEG_PATH,
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "ffmpeg"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!candidate.includes("/")) return candidate;

    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next known location.
    }
  }

  throw new Error(
    "FFmpeg was not found. Set FFMPEG_PATH to an executable FFmpeg binary."
  );
};

const run = (command, args) =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      stdio: "inherit"
    });

    child.once("error", rejectRun);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(
        new Error(
          `${command} failed with ${
            signal ? `signal ${signal}` : `exit code ${code}`
          }.`
        )
      );
    });
  });

const renderFrames = async (framesDirectory) => {
  const frameCount = FPS * CAPTURE_SECONDS;
  const browser = await chromium.launch({ headless: true });

  try {
    const browserContext = await browser.newContext({
      viewport: { width: SIZE, height: SIZE },
      deviceScaleFactor: 1,
      colorScheme: "dark",
      reducedMotion: "no-preference"
    });
    const page = await browserContext.newPage();

    await page.goto(SOURCE_URL, { waitUntil: "networkidle" });

    await page.evaluate(async ({ fps, size }) => {
      await document.fonts.load('16px "Departure Mono Local"', "░▒▓");
      await document.fonts.ready;

      const { createSketch } = await import(
        "/src/sketches/blocktype-dither.js"
      );

      document.documentElement.style.margin = "0";
      document.documentElement.style.background = "#000";
      document.body.innerHTML =
        '<canvas id="blocktype-export-canvas" role="img" aria-label="Blocktype wave loop"></canvas>';
      document.body.style.margin = "0";
      document.body.style.width = `${size}px`;
      document.body.style.height = `${size}px`;
      document.body.style.overflow = "hidden";
      document.body.style.background = "#000";

      const canvas = document.querySelector("#blocktype-export-canvas");

      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Unable to create the export canvas.");
      }

      const context = canvas.getContext("2d", { alpha: false });

      if (!context) {
        throw new Error("Unable to create the export canvas context.");
      }

      canvas.width = size;
      canvas.height = size;
      canvas.style.display = "block";
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.style.background = "#000";

      const params = {
        pitch: 8,
        waveScale: 1.15,
        amplitude: 1.25,
        steepness: 0.59,
        speed: 0.45,
        contrast: 0.85
      };
      const pointer = { x: 0.5, y: 0.5, inside: false };
      const sketch = createSketch({
        canvas,
        context,
        params,
        pointer,
        seed: 25502,
        setStatus() {}
      });

      sketch.resize?.({ width: size, height: size, dpr: 1 });

      window.__blocktypeVideoExport = {
        render(time) {
          sketch.frame?.({
            time,
            delta: 1 / fps,
            width: size,
            height: size,
            dpr: 1
          });
        },
        destroy() {
          sketch.destroy?.();
        }
      };
    }, { fps: FPS, size: SIZE });

    const canvas = page.locator("#blocktype-export-canvas");

    for (let frame = 0; frame < frameCount; frame += 1) {
      await page.evaluate((time) => {
        window.__blocktypeVideoExport.render(time);
      }, frame / FPS);

      await canvas.screenshot({
        path: join(
          framesDirectory,
          `frame-${String(frame).padStart(5, "0")}.png`
        ),
        animations: "disabled"
      });

      if ((frame + 1) % FPS === 0) {
        console.log(
          `Rendered ${(frame + 1) / FPS}s / ${CAPTURE_SECONDS}s`
        );
      }
    }

    await page.evaluate(() => window.__blocktypeVideoExport.destroy());
    await browserContext.close();
  } finally {
    await browser.close();
  }
};

const encodeVideo = async (ffmpeg, framesDirectory) => {
  const frameCount = FPS * CAPTURE_SECONDS;
  const fadeFrameCount = FPS * LOOP_FADE_SECONDS;
  const middleStartFrame = fadeFrameCount;
  const middleEndFrame = frameCount - fadeFrameCount;
  const transitionDuration = (fadeFrameCount - 1) / FPS;
  const filter = [
    "[0:v]split=3[mid_source][tail_source][head_source]",
    `[mid_source]trim=start_frame=${middleStartFrame}:end_frame=${middleEndFrame},setpts=PTS-STARTPTS[mid]`,
    `[tail_source]trim=start_frame=${middleEndFrame}:end_frame=${frameCount},setpts=PTS-STARTPTS[tail]`,
    `[head_source]trim=start_frame=1:end_frame=${fadeFrameCount + 1},setpts=PTS-STARTPTS[head]`,
    `[tail][head]xfade=transition=fade:duration=${transitionDuration}:offset=0[wrap]`,
    "[mid][wrap]concat=n=2:v=1:a=0,format=yuv420p[out]"
  ].join(";");

  await run(ffmpeg, [
    "-hide_banner",
    "-loglevel",
    "warning",
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    join(framesDirectory, "frame-%05d.png"),
    "-filter_complex",
    filter,
    "-map",
    "[out]",
    "-r",
    String(FPS),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "18",
    "-profile:v",
    "high",
    "-level:v",
    "4.1",
    "-tag:v",
    "avc1",
    "-movflags",
    "+faststart",
    "-colorspace",
    "bt709",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    outputPath
  ]);
};

const inspectVideo = async (ffmpeg) => {
  const ffprobe = join(dirname(ffmpeg), "ffprobe");

  await run(ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=filename,duration,size,bit_rate:stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,avg_frame_rate,nb_frames",
    "-of",
    "default=noprint_wrappers=1",
    outputPath
  ]);
};

const main = async () => {
  const ffmpeg = await findFfmpeg();
  const framesDirectory = await mkdtemp(
    join(tmpdir(), "blocktype-wave-export-")
  );

  await mkdir(dirname(outputPath), { recursive: true });

  try {
    await renderFrames(framesDirectory);
    await encodeVideo(ffmpeg, framesDirectory);
    await inspectVideo(ffmpeg);
    console.log(`Exported ${outputPath}`);
  } finally {
    const expectedPrefix = join(tmpdir(), "blocktype-wave-export-");

    if (framesDirectory.startsWith(expectedPrefix)) {
      await rm(framesDirectory, { recursive: true, force: true });
    }
  }
};

await main();
