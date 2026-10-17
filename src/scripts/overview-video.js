import { getMotionState, onMotionChange } from "./motion/lifecycle.js";

const players = new Set();
let initialized = false;
let initialLoadComplete = document.readyState === "complete";
let autoplayReady = false;
let autoplayIdleHandle;
let autoplayIdleDelay = 0;
let headerClearance = 0;
let viewportVisibilityInitialized = false;

function getAutoplayIdleDelay() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--dur-2").trim();
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(value);
  if (!match) return 0;

  const amount = Number.parseFloat(match[1]);
  return Number.isFinite(amount) ? amount * (match[2] === "s" ? 1_000 : 1) : 0;
}

function clearAutoplayIdle() {
  if (autoplayIdleHandle === undefined) return;
  window.clearTimeout(autoplayIdleHandle);
  autoplayIdleHandle = undefined;
}

function scheduleAutoplayReadiness() {
  autoplayReady = false;
  clearAutoplayIdle();
  if (!initialLoadComplete) return;

  autoplayIdleHandle = window.setTimeout(() => {
    autoplayIdleHandle = undefined;
    autoplayReady = true;
    syncPlayers();
  }, autoplayIdleDelay);
}

function initializeAutoplayReadiness() {
  autoplayIdleDelay = getAutoplayIdleDelay();
  const settleInitialNavigation = () => {
    initialLoadComplete = true;
    scheduleAutoplayReadiness();
  };

  if (initialLoadComplete) settleInitialNavigation();
  else window.addEventListener("load", settleInitialNavigation, { once: true });

  window.addEventListener("scroll", scheduleAutoplayReadiness, { passive: true });
}

function isPageAvailable() {
  const state = getMotionState();
  return !state.hidden && !state.transitionActive;
}

function setToggleState(player) {
  const isPlaying = !player.video.paused && !player.video.ended;
  const label = isPlaying ? player.pauseLabel : player.playLabel;

  player.button.setAttribute("aria-label", label);
  player.button.setAttribute("aria-pressed", String(isPlaying));
  player.label.textContent = isPlaying ? "Pause" : "Play";
  player.root.dataset.overviewVideoState = isPlaying ? "playing" : "paused";
}

function pausePlayer(player) {
  player.playAttempt += 1;
  player.video.pause();
  setToggleState(player);
}

function canPlay(player, explicit = false) {
  const inView = explicit ? player.intersecting : player.visible;
  const state = getMotionState();

  if (!inView || !isPageAvailable() || player.manuallyPaused) return false;
  if (state.reduced || state.paused) return Boolean(explicit && player.explicitPlayback);
  return !player.autoplayBlocked || player.explicitPlayback;
}

function canStartAutoplay(player) {
  return autoplayReady && canPlay(player);
}

function startPlayer(player, explicit = false) {
  if (explicit) {
    player.manuallyPaused = false;
    player.explicitPlayback = true;
    player.autoplayBlocked = false;
  }

  const eligible = explicit ? canPlay(player, true) : canStartAutoplay(player);
  if (!eligible || !player.video.paused) {
    setToggleState(player);
    return;
  }

  const attempt = ++player.playAttempt;
  let started;

  try {
    started = player.video.play();
  } catch {
    if (!explicit) player.autoplayBlocked = true;
    setToggleState(player);
    return;
  }

  Promise.resolve(started)
    .then(() => {
      if (attempt !== player.playAttempt) return;
      if (!canPlay(player, explicit)) {
        pausePlayer(player);
        return;
      }
      setToggleState(player);
    })
    .catch(() => {
      if (attempt !== player.playAttempt) return;
      if (!explicit) player.autoplayBlocked = true;
      setToggleState(player);
    });
}

function syncPlayer(player) {
  const explicit = player.explicitPlayback;
  const eligible = canPlay(player, explicit);

  if (!eligible) {
    if (!player.video.paused) pausePlayer(player);
    else setToggleState(player);
    return;
  }

  if (!player.video.paused) {
    setToggleState(player);
    return;
  }

  if (explicit || autoplayReady) startPlayer(player, explicit);
  else setToggleState(player);
}

function syncPlayers() {
  players.forEach(syncPlayer);
}

function pausePlayers() {
  players.forEach(pausePlayer);
}

function getHeaderClearance() {
  const header = document.querySelector(".site-nav");
  if (!(header instanceof HTMLElement)) return 0;
  return Math.max(0, Math.ceil(header.getBoundingClientRect().height));
}

function observePlayer(player) {
  player.observer?.disconnect();
  player.observer = new IntersectionObserver(
    ([entry]) => {
      player.intersecting = Boolean(entry?.isIntersecting);
      player.visible = Boolean(player.intersecting && entry?.intersectionRatio >= 0.5);
      if (!player.intersecting) player.autoplayBlocked = false;
      syncPlayer(player);
    },
    { rootMargin: `-${headerClearance}px 0px 0px`, threshold: [0, 0.5, 1] }
  );
  player.observer.observe(player.visibilityTarget);
}

function updateHeaderClearance() {
  const nextClearance = getHeaderClearance();
  if (Math.abs(nextClearance - headerClearance) < 1) return;

  headerClearance = nextClearance;
  players.forEach(observePlayer);
}

function initializeViewportVisibility() {
  updateHeaderClearance();
  if (viewportVisibilityInitialized) return;

  viewportVisibilityInitialized = true;
  window.addEventListener("resize", updateHeaderClearance, { passive: true });
}

function createPlayer(root) {
  if (!(root instanceof HTMLElement) || root.dataset.overviewVideoReady === "true") return;
  if (!("IntersectionObserver" in window)) return;

  const video = root.querySelector("[data-overview-video-media]");
  const button = root.querySelector("[data-overview-video-toggle]");
  const label = root.querySelector("[data-overview-video-label]");
  const frame = root.querySelector(".overview-video__frame");

  if (
    !(video instanceof HTMLVideoElement) ||
    !(button instanceof HTMLButtonElement) ||
    !(label instanceof HTMLElement)
  ) {
    return;
  }

  const player = {
    root,
    video,
    button,
    label,
    playLabel: button.dataset.playLabel || "Play video",
    pauseLabel: button.dataset.pauseLabel || "Pause video",
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
    intersecting: false,
    visible: false,
    manuallyPaused: false,
    explicitPlayback: false,
    autoplayBlocked: false,
    playAttempt: 0,
    visibilityTarget: frame instanceof HTMLElement ? frame : video,
    observer: undefined
  };

  root.dataset.overviewVideoReady = "true";
  video.muted = true;
  video.controls = false;
  video.tabIndex = -1;
  button.hidden = false;

  observePlayer(player);

  button.addEventListener("click", () => {
    if (video.paused) {
      startPlayer(player, true);
      return;
    }

    player.manuallyPaused = true;
    player.explicitPlayback = false;
    pausePlayer(player);
  });

  video.addEventListener("play", () => setToggleState(player));
  video.addEventListener("pause", () => setToggleState(player));
  video.addEventListener("error", () => setToggleState(player));
  player.reducedMotion.addEventListener?.("change", () => {
    if (player.reducedMotion.matches) {
      player.explicitPlayback = false;
      player.autoplayBlocked = false;
      pausePlayer(player);
    }
    syncPlayer(player);
  });

  players.add(player);
  setToggleState(player);
}

export function initializeOverviewVideos() {
  initializeViewportVisibility();
  document.querySelectorAll("[data-overview-video]").forEach(createPlayer);

  if (initialized) {
    syncPlayers();
    return;
  }

  initialized = true;
  initializeAutoplayReadiness();
  document.addEventListener("visibilitychange", syncPlayers);
  window.addEventListener("page-transition-state", syncPlayers);
  window.addEventListener("pagehide", pausePlayers);
  window.addEventListener("pageshow", () => window.requestAnimationFrame(syncPlayers));
  onMotionChange((state) => {
    if (state.reduced || state.paused) {
      players.forEach((player) => {
        player.explicitPlayback = false;
        pausePlayer(player);
      });
      return;
    }
    syncPlayers();
  });
}
