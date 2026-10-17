// Round 3 video (component specimen, Case evidence). Playback is drawn in cells: the played
// stretch is solid, the buffered stretch is a light dither, the rest is empty.
// - Overview videos keep their own toggle; they get a thin cell strip along the bottom edge.
// - Case videos lose the browser's control chrome (only when this runs) for a play cell, a cell
//   scrubber with a real range input on top, and the time in Departure Mono. No-JS keeps controls.
import { createCells, createIcon, morphIcon, setLevel } from "./cells.js";

const pad = (value) => String(Math.floor(value)).padStart(2, "0");
const clock = (seconds) => (Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${pad(seconds % 60)}` : "0:00");

function paintCells(cells, video) {
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
    else setLevel(cell, index < loaded ? 2 : 0);
  });
}

function stripFor(video) {
  if (video.dataset.videoCells === "true") return;
  const frame = video.closest(".overview-video__frame");
  if (!(frame instanceof HTMLElement)) return;
  video.dataset.videoCells = "true";
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

  bar.append(play, track, time);
  video.after(bar);

  const paint = () => {
    paintCells(cells, video);
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

  play.addEventListener("click", () => {
    if (video.paused) {
      if (!video.src && video.dataset.src) video.src = video.dataset.src;
      video.dataset.caseVideoManual = "play";
      video.play().catch(() => {});
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
  paint();
  syncPlay();
}

const start = () => {
  document.querySelectorAll("[data-overview-video-media]").forEach(stripFor);
  document.querySelectorAll(".case-video-copy > video").forEach(playerFor);
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
