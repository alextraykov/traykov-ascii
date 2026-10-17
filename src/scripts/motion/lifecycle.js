const STORAGE_KEY = "traykov-motion-preference";
const MOTION_EVENT = "traykov-motion-change";
const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const subscribers = new Set();

let preference = "running";
let transitionActive = root.dataset.pageTransitionActive === "true";
let lastSignature = "";
let historyRestore = window.performance.getEntriesByType("navigation")[0]?.type === "back_forward";

export function isHistoryRestore() {
  return historyRestore;
}

try {
  preference = window.localStorage.getItem(STORAGE_KEY) === "paused" ? "paused" : "running";
} catch {
  // Motion remains a progressive enhancement when storage is unavailable.
}

function getState() {
  const reduced = reducedMotion.matches;
  const paused = preference === "paused";
  const hidden = document.hidden;
  const active = !reduced && !paused && !hidden && !transitionActive;
  const reason = reduced
    ? "system"
    : paused
      ? "visitor"
      : hidden
        ? "hidden"
        : transitionActive
          ? "transition"
          : "active";

  return { active, reduced, paused, hidden, transitionActive, historyRestore, reason };
}

function updateControls(state) {
  root.dataset.motionPreference = preference;
  root.dataset.motionState = state.reason;

  document.querySelectorAll("[data-motion-toggle]").forEach((control) => {
    if (!(control instanceof HTMLButtonElement)) return;
    const description = control.querySelector("[data-motion-toggle-description]");
    const stateLabel = control.querySelector("[data-motion-toggle-state]");
    const motionOn = !state.reduced && !state.paused;
    const descriptionText = state.reduced
      ? "Reduced by system setting"
      : state.paused
        ? "Motion is off"
        : "Motion is on";
    const stateText = state.reduced ? "REDUCED" : state.paused ? "OFF" : "ON";

    control.hidden = false;
    control.disabled = state.reduced;
    control.setAttribute("aria-pressed", String(motionOn));
    control.setAttribute("aria-label", "Motion");
    if (description) description.textContent = descriptionText;
    if (stateLabel) stateLabel.textContent = stateText;
  });
}

function broadcast(force = false) {
  const state = getState();
  const signature = [state.active, state.reduced, state.paused, state.hidden, state.transitionActive].join(":");
  updateControls(state);

  if (!force && signature === lastSignature) return state;
  lastSignature = signature;
  const event = new CustomEvent(MOTION_EVENT, { detail: state });
  window.dispatchEvent(event);
  subscribers.forEach((subscriber) => subscriber(state));
  return state;
}

function setPreference(next) {
  if (reducedMotion.matches) return;
  preference = next === "paused" ? "paused" : "running";

  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // The current page still respects the visitor's choice.
  }

  broadcast(true);
}

export function getMotionState() {
  return getState();
}

export function isMotionActive() {
  return getState().active;
}

export function onMotionChange(callback, { immediate = true } = {}) {
  subscribers.add(callback);
  if (immediate) callback(getState());
  return () => subscribers.delete(callback);
}

export function createMotionEligibility(element, callback, options = {}) {
  if (!(element instanceof Element)) return () => {};

  const { rootMargin = "0px", threshold = 0.01 } = options;
  let visible = false;
  let destroyed = false;
  let observer;

  const sync = (state = getState()) => {
    if (destroyed) return;
    callback(Boolean(visible && state.active), { ...state, visible });
  };

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        element.setAttribute("data-motion-visible", String(visible));
        sync();
      },
      { rootMargin, threshold }
    );
    observer.observe(element);
  } else {
    visible = true;
    element.setAttribute("data-motion-visible", "true");
  }

  const unsubscribe = onMotionChange(sync, { immediate: false });
  sync();

  return () => {
    destroyed = true;
    observer?.disconnect();
    unsubscribe();
  };
}

function initializeControls() {
  document.querySelectorAll("[data-motion-toggle]").forEach((control) => {
    if (!(control instanceof HTMLButtonElement) || control.dataset.motionToggleReady === "true") return;
    control.dataset.motionToggleReady = "true";
    control.addEventListener("click", () => setPreference(preference === "paused" ? "running" : "paused"));
  });
  broadcast(true);
}

window.__traykovMotion = {
  event: MOTION_EVENT,
  getState: getMotionState,
  isActive: isMotionActive,
  isHistoryRestore,
  subscribe: onMotionChange,
  setPreference,
  createEligibility: createMotionEligibility
};

reducedMotion.addEventListener?.("change", () => broadcast(true));
document.addEventListener("visibilitychange", () => broadcast());
window.addEventListener("page-transition-state", (event) => {
  transitionActive = Boolean(event.detail?.active);
  broadcast();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) historyRestore = true;
  broadcast(true);
});
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  preference = event.newValue === "paused" ? "paused" : "running";
  broadcast(true);
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeControls, { once: true });
} else {
  initializeControls();
}
