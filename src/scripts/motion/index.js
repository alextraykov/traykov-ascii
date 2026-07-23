import { SCRAMBLE_RAMP, initScramble } from "./scramble.js";
import "./reveal.js";
import "./scroll-fx.js";
import "./count-up.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const rotatorObservers = new Map();
const rotatorTimers = new Map();
const motionMedia = new Set();
const caseVideos = new Set();
let mediaObserver;
let caseVideoObserver;

function stopIdentityRotator(rotator) {
  const state = rotatorTimers.get(rotator);
  if (!state) return;
  window.clearInterval(state.interval);
  window.clearTimeout(state.reverseTimer);
  window.cancelAnimationFrame(state.frame);
  rotatorTimers.delete(rotator);
}

function getMotionDuration(token, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token);
  return Number.parseFloat(value) || fallback;
}

function identityScrambleGlyph(index, progress) {
  const frame = Math.floor(progress * 12);
  return SCRAMBLE_RAMP[1 + ((index * 3 + frame) % (SCRAMBLE_RAMP.length - 1))];
}

function renderIdentityPhase(label, progress, reveal) {
  const characters = Array.from(label);
  const resolved = Math.floor(characters.length * progress);
  return characters
    .map((character, index) => {
      if (character === " ") return " ";
      if (reveal ? index < resolved : index >= resolved) return character;
      return identityScrambleGlyph(index, progress);
    })
    .join("");
}

function getIdentityPrefix(rotator) {
  return rotator.closest("[data-identity-phrase]")?.querySelector("[data-identity-prefix]");
}

function englishIdentityPrefix(entry) {
  return entry.article ? `Alexander is ${entry.article}` : "Alexander is";
}

function setIdentityLanguage(rotator, entry, language) {
  const prefix = getIdentityPrefix(rotator);
  const isBulgarian = language === "bg";
  rotator.lang = language;
  if (!prefix) return;
  const label = isBulgarian ? "Александър е" : englishIdentityPrefix(entry);
  prefix.lang = language;
  if (prefix.textContent !== label) prefix.textContent = label;
}

function animateIdentitySwap(rotator, state, outgoing, incoming) {
  const reverseDuration = getMotionDuration("--dur-2", 180);
  const translationDuration = getMotionDuration("--dur-3", 260);
  const translationHold = translationDuration * 0.72;
  const revealDuration = getMotionDuration("--dur-4", 340);
  const translationReverseDuration = reverseDuration;
  const totalDuration =
    reverseDuration +
    translationDuration +
    translationHold +
    translationReverseDuration +
    revealDuration;
  state.animating = true;
  rotator.classList.add("is-scanning");
  const startedAt = performance.now();

  const render = (time) => {
    const elapsed = Math.min(totalDuration, time - startedAt);
    const translationStart = reverseDuration;
    const translationHoldStart = translationStart + translationDuration;
    const translationReverseStart = translationHoldStart + translationHold;
    const revealStart = translationReverseStart + translationReverseDuration;

    if (elapsed < translationStart) {
      setIdentityLanguage(rotator, outgoing, "en");
      rotator.textContent = renderIdentityPhase(outgoing.english, elapsed / reverseDuration, false);
    } else if (elapsed < translationHoldStart) {
      setIdentityLanguage(rotator, incoming, "bg");
      rotator.textContent = renderIdentityPhase(
        incoming.bulgarian,
        (elapsed - translationStart) / translationDuration,
        true
      );
    } else if (elapsed < translationReverseStart) {
      setIdentityLanguage(rotator, incoming, "bg");
      rotator.textContent = incoming.bulgarian;
    } else if (elapsed < revealStart) {
      setIdentityLanguage(rotator, incoming, "bg");
      rotator.textContent = renderIdentityPhase(
        incoming.bulgarian,
        (elapsed - translationReverseStart) / translationReverseDuration,
        false
      );
    } else {
      setIdentityLanguage(rotator, incoming, "en");
      rotator.textContent = renderIdentityPhase(
        incoming.english,
        (elapsed - revealStart) / revealDuration,
        true
      );
    }

    if (elapsed < totalDuration) {
      state.frame = window.requestAnimationFrame(render);
      return;
    }
    setIdentityLanguage(rotator, incoming, "en");
    rotator.textContent = incoming.english;
    rotator.classList.remove("is-scanning");
    state.animating = false;
  };

  state.frame = window.requestAnimationFrame(render);
}

function startIdentityRotator(rotator) {
  if (rotatorTimers.has(rotator) || reducedMotion.matches) return;

  const identities = JSON.parse(rotator.getAttribute("data-identities") || "[]");
  if (identities.length < 2) return;

  const initialLabel = rotator.textContent?.trim() || identities[0].english;
  rotator.dataset.motionStaticLabel = initialLabel;
  let index = Math.max(0, identities.findIndex(({ english }) => english === initialLabel));
  const state = { interval: 0, reverseTimer: 0, frame: 0, revealStartedAt: 0, animating: false };

  const rotate = () => {
    if (state.animating || rotator.dataset.identityPreviewLock === "true") return;
    const outgoing = identities[index];
    index = (index + 1) % identities.length;
    const incoming = identities[index];
    animateIdentitySwap(rotator, state, outgoing, incoming);
  };

  state.interval = window.setInterval(rotate, 1900);
  rotatorTimers.set(rotator, state);
}

function freezeIdentityRotator(rotator) {
  stopIdentityRotator(rotator);
  const label = rotator.dataset.motionStaticLabel || rotator.textContent?.trim() || "";
  const identities = JSON.parse(rotator.getAttribute("data-identities") || "[]");
  const entry = identities.find(({ english }) => english === label) || identities[0];
  rotator.dataset.motionStaticLabel = label;
  if (entry) setIdentityLanguage(rotator, entry, "en");
  rotator.classList.remove("is-revealing", "is-reversing", "is-scanning");
  if (rotator.textContent !== label) rotator.textContent = label;

  if (rotatorObservers.has(rotator)) return;
  const observer = new MutationObserver(() => {
    if (reducedMotion.matches && rotator.textContent !== label) rotator.textContent = label;
  });
  observer.observe(rotator, { childList: true, characterData: true, subtree: true });
  rotatorObservers.set(rotator, observer);
}

function syncMotionMedia(media) {
  if (!(media instanceof HTMLMediaElement)) return;

  const canPlay =
    !reducedMotion.matches &&
    !document.hidden &&
    document.documentElement.dataset.pageTransitionActive !== "true" &&
    media.dataset.motionVisible === "true";

  if (!canPlay) {
    media.pause();
    return;
  }

  if (!media.src && media.dataset.src) media.src = media.dataset.src;
  media.play().catch(() => {});
}

function initMotionMedia() {
  mediaObserver =
    mediaObserver ||
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const media = entry.target;
          media.dataset.motionVisible = entry.isIntersecting ? "true" : "false";
          syncMotionMedia(media);
        });
      },
      { rootMargin: "80px 0px", threshold: 0.05 }
    );

  document.querySelectorAll("[data-motion-media]").forEach((media) => {
    if (motionMedia.has(media)) return;
    motionMedia.add(media);
    mediaObserver.observe(media);
  });
}

function syncCaseVideo(media) {
  if (!(media instanceof HTMLMediaElement)) return;

  const isHovered = media.dataset.caseVideoHovered === "true";
  const canPlay =
    !reducedMotion.matches &&
    !document.hidden &&
    document.documentElement.dataset.pageTransitionActive !== "true" &&
    (media.dataset.caseVideoVisible === "true" || isHovered);

  if (!canPlay) {
    media.pause();
    return;
  }

  if (media.ended) media.currentTime = 0;
  media.play().catch(() => {});
}

function initCaseVideos() {
  caseVideoObserver =
    caseVideoObserver ||
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const media = entry.target;
          media.dataset.caseVideoVisible = entry.intersectionRatio >= 0.6 ? "true" : "false";
          syncCaseVideo(media);
        });
      },
      { threshold: [0, 0.6, 1] }
    );

  document.querySelectorAll("[data-case-video-autoplay]").forEach((media) => {
    if (caseVideos.has(media)) return;
    caseVideos.add(media);
    media.addEventListener("pointerenter", () => {
      media.dataset.caseVideoHovered = "true";
      syncCaseVideo(media);
    });
    media.addEventListener("pointerleave", () => {
      media.dataset.caseVideoHovered = "false";
      syncCaseVideo(media);
    });
    caseVideoObserver.observe(media);
  });
}

function syncReducedMotion() {
  document.querySelectorAll("[data-identity-rotator]").forEach((rotator) => {
    if (reducedMotion.matches) {
      freezeIdentityRotator(rotator);
      return;
    }

    rotatorObservers.get(rotator)?.disconnect();
    rotatorObservers.delete(rotator);
    startIdentityRotator(rotator);
  });

  motionMedia.forEach(syncMotionMedia);
  caseVideos.forEach(syncCaseVideo);
}

function autoDecorateNav() {
  document.querySelectorAll(".site-nav nav a, .case-toc button, .case-sibling-nav a span").forEach((element) => {
    if (element.hasAttribute("data-scramble")) return;
    element.setAttribute("data-scramble", "");
    element.setAttribute("data-scramble-label", element.textContent?.trim() || "");
  });

  initScramble();
  initMotionMedia();
  initCaseVideos();
  syncReducedMotion();
}

reducedMotion.addEventListener("change", syncReducedMotion);
document.addEventListener("visibilitychange", syncReducedMotion);
window.addEventListener("page-transition-state", syncReducedMotion);
window.addEventListener("pagehide", () => {
  document.querySelectorAll("[data-identity-rotator]").forEach(stopIdentityRotator);
  mediaObserver?.disconnect();
  caseVideoObserver?.disconnect();
  window.removeEventListener("page-transition-state", syncReducedMotion);
}, { once: true });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoDecorateNav, { once: true });
} else {
  autoDecorateNav();
}
