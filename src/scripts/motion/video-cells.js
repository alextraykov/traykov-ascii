// Video in cells (picks: player B, Home work entry A). Playback is drawn in cells: the played
// stretch is solid, the buffered stretch is a light dither (breathing 2 ↔ 3 on the tick while it
// plays), the leading cell is dithered to the fraction, the rest is empty.
// - Overview videos keep their own toggle. On case pages they get the B strip of 48 cells along the
//   frame's bottom edge; on Home (the A work entry) one 4 × 16 progress cell beside the toggle.
// - Case videos lose the browser's control chrome (only when this runs) for a 48 px play button, a
//   cell scrubber with a real range input on top, and the time in Departure Mono. While a requested
//   play waits for data, a 12-cell sweep replaces the track and "Loading video" is said once.
//   No-JS keeps the native controls.
import { createCells, createIcon, morphIcon, setLevel } from "./cells.js";
import { loader } from "./loader.js";
import { onTick } from "./tick.js";

const pad = (value) => String(Math.floor(value)).padStart(2, "0");
const clock = (seconds) => (Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${pad(seconds % 60)}` : "0:00");

function paintCells(cells, video, bufferedLevel = 2) {
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) {
    cells.forEach((cell) => setLevel(cell, 0));
    return;
  }
  let buffered = 0;
  for (let index = 0; index < video.buffered.length; index += 1) {
    if (video.buffered.start(index) <= video.currentTime) buffered = Math.max(buffered, video.buffered.end(index));
  }
  const played = (video.currentTime / duration) * cells.length;
  const loaded = (buffered / duration) * cells.length;
  cells.forEach((cell, index) => {
    const fill = played - index;
    if (fill >= 1) setLevel(cell, 8);
    else if (fill > 0) setLevel(cell, Math.max(2, Math.ceil(fill * 8)));
    else setLevel(cell, index < loaded ? bufferedLevel : 0);
  });
}

function stripFor(video) {
  if (video.dataset.videoCells === "true") return;
  const frame = video.closest(".overview-video__frame");
  if (!(frame instanceof HTMLElement)) return;
  video.dataset.videoCells = "true";
  if (!video.closest(".case-page")) {
    // Home work entry (A): one progress cell whose level is the played share.
    const plate = document.createElement("span");
    plate.className = "overview-video__progress";
    plate.setAttribute("aria-hidden", "true");
    const cell = document.createElement("i");
    cell.className = "cell overview-video__cell";
    cell.dataset.level = "0";
    plate.append(cell);
    frame.append(plate);
    const paint = () => {
      const duration = video.duration;
      setLevel(cell, Number.isFinite(duration) && duration > 0 ? (video.currentTime / duration) * 8 : 0);
    };
    ["timeupdate", "loadedmetadata", "seeked", "emptied"].forEach((name) => video.addEventListener(name, paint));
    paint();
    return;
  }
  const strip = document.createElement("span");
  strip.className = "video-cells video-cells--strip";
  strip.setAttribute("aria-hidden", "true");
  const cells = createCells(strip, 48, { clear: true });
  frame.append(strip);
  const paint = () => paintCells(cells, video);
  ["timeupdate", "progress", "loadedmetadata", "seeked", "emptied"].forEach((name) => video.addEventListener(name, paint));
  paint();
}

function playerFor(video) {
  if (video.dataset.videoCells === "true") return;
  video.dataset.videoCells = "true";
  video.removeAttribute("controls");
  video.controls = false;

  const bar = document.createElement("div");
  bar.className = "cell-player";

  const play = document.createElement("button");
  play.type = "button";
  play.className = "cell-player__play";
  play.setAttribute("aria-label", "Play video");
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  play.append(icon);
  createIcon(icon, "play");

  const track = document.createElement("span");
  track.className = "cell-player__track";
  const cells = createCells(track, 48, { clear: true });
  const seek = document.createElement("input");
  seek.type = "range";
  seek.min = "0";
  seek.max = "1000";
  seek.step = "1";
  seek.value = "0";
  seek.setAttribute("aria-label", "Seek");
  track.append(seek);

  const time = document.createElement("span");
  time.className = "cell-player__time";
  time.textContent = "0:00 / 0:00";

  const loading = document.createElement("span");
  loading.className = "cell-player__loading";
  loading.hidden = true;
  const sweep = document.createElement("span");
  const word = document.createElement("span");
  word.textContent = "Loading video";
  loading.append(sweep, word);

  const status = document.createElement("span");
  status.className = "visually-hidden";
  status.setAttribute("aria-live", "polite");

  bar.append(play, track, loading, time, status);
  video.after(bar);

  let breath = 2;
  const paint = () => {
    paintCells(cells, video, breath);
    if (Number.isFinite(video.duration) && video.duration > 0 && document.activeElement !== seek) {
      seek.value = String(Math.round((video.currentTime / video.duration) * 1000));
    }
    seek.setAttribute("aria-valuetext", `${clock(video.currentTime)} of ${clock(video.duration)}`);
    time.textContent = `${clock(video.currentTime)} / ${clock(video.duration)}`;
  };
  const syncPlay = () => {
    const playing = !video.paused;
    play.setAttribute("aria-label", playing ? "Pause video" : "Play video");
    play.setAttribute("aria-pressed", String(playing));
    morphIcon(icon, playing ? "pause" : "play");
  };

  // Playing: the buffered cells breathe 2 ↔ 3, one change every 10 ticks. Paused or motion off: 2.
  let stopBreath = () => {};
  const syncBreath = () => {
    stopBreath();
    stopBreath = () => {};
    if (!video.paused) {
      stopBreath = onTick(track, (tick) => {
        const next = Math.floor(tick / 10) % 2 ? 3 : 2;
        if (next === breath) return;
        breath = next;
        paint();
      });
    }
    if (breath !== 2) {
      breath = 2;
      paint();
    }
  };

  // Loading: after play is requested and there is not enough data yet.
  let stopSweep = null;
  let announced = false;
  const showLoading = () => {
    if (stopSweep || video.readyState >= 3) return;
    bar.classList.add("is-loading");
    loading.hidden = false;
    stopSweep = loader(sweep, "sweep", { n: 12 });
    if (!announced) {
      announced = true;
      status.textContent = "Loading video";
    }
  };
  const hideLoading = () => {
    if (!stopSweep) return;
    stopSweep();
    stopSweep = null;
    bar.classList.remove("is-loading");
    loading.hidden = true;
  };
  video.addEventListener("waiting", () => {
    if (!video.paused) showLoading();
  });
  ["canplay", "playing", "pause", "error"].forEach((name) => video.addEventListener(name, hideLoading));

  play.addEventListener("click", () => {
    if (video.paused) {
      if (!video.src && video.dataset.src) video.src = video.dataset.src;
      video.dataset.caseVideoManual = "play";
      const attempt = video.play();
      if (video.readyState < 3) showLoading();
      Promise.resolve(attempt).catch(hideLoading);
    } else {
      video.dataset.caseVideoManual = "pause";
      video.pause();
    }
  });
  video.addEventListener("click", () => play.click());
  seek.addEventListener("input", () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = (Number(seek.value) / 1000) * video.duration;
    paint();
  });
  ["timeupdate", "progress", "loadedmetadata", "seeked", "emptied", "durationchange"].forEach((name) => video.addEventListener(name, paint));
  ["play", "pause", "ended"].forEach((name) => video.addEventListener(name, syncPlay));
  ["play", "pause", "ended"].forEach((name) => video.addEventListener(name, syncBreath));
  paint();
  syncPlay();
}

const start = () => {
  document.querySelectorAll("[data-overview-video-media]").forEach(stripFor);
  document.querySelectorAll(".case-video-copy > video").forEach(playerFor);
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
