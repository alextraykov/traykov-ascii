import { SCRAMBLE_RAMP, scrambleElement } from "./motion/scramble.js";

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const surfaceRamp = "✹✸✷✶✦*+•·";

const stateProfiles = {
  rest: ["SOURCE 100", "PRESSURE 00", "DETACHED 00", "MEMORY ON"],
  hover: ["SOURCE 92", "PRESSURE 34", "DETACHED 08", "MEMORY ON"],
  focus: ["SOURCE 100", "FOCUS LOCK", "DETACHED 00", "MEMORY ON"],
  active: ["SOURCE 78", "IMPULSE 64", "DETACHED 22", "RECOVER QUEUED"],
  pressure: ["SOURCE 94", "PRESSURE 38", "VELOCITY 07", "MEMORY ON"],
  lift: ["SOURCE 72", "PRESSURE 81", "VELOCITY 93", "DETACHED 28"],
  continue: ["SOURCE 72", "CURSOR EXIT", "MOMENTUM LOCK", "EDGE DRAG"],
  click: ["SOURCE 54", "IMPULSE 100", "RADIAL THROW", "MEMORY ON"],
  trail: ["SOURCE 84", "VELOCITY 72", "TRAIL LIVE", "MEMORY ON"],
  decay: ["SOURCE 68", "ENERGY ↓", surfaceRamp, "MOMENTUM LOCK"],
  recover: ["SOURCE 42→100", "DETACHED 18→00", "MEMORY ON", "REBUILD"],
  loading: ["SOURCE --", "SCAN ACTIVE", SCRAMBLE_RAMP, "INPUT LOCK"],
  reduced: ["SOURCE 100", "MOTION 00", "DETACHED 00", "READABLE"],
  english: ["LANG EN", "SOURCE WORD", "DECODE 00", "TIMER HOLD"],
  bulgarian: ["LANG BG", "SOURCE ДУМА", "DECODE 00", "TIMER HOLD"],
  decode: ["LANG EN↔BG", "SOURCE WORD", SCRAMBLE_RAMP, "TIMER LIVE"],
  dark: ["THEME DARK", "SOURCE TOKEN", "CONTRAST ON", "STATE SAVED"],
  light: ["THEME LIGHT", "SOURCE TOKEN", "CONTRAST ON", "STATE SAVED"],
  auto: ["THEME AUTO", "CLOCK LIVE", "CONTRAST ON", "STATE SAVED"],
  booking: ["DIALOG OPEN", "FOCUS LOCK", "SOURCE ACTION", "ESC CLOSE"]
};

const configs = {
  "theme-toggle": {
    level: "L1 / DECODE",
    states: ["rest", "hover", "focus", "active", "light", "dark", "auto", "reduced"]
  },
  "identity-rotator": {
    level: "L1 / DECODE",
    states: ["rest", "english", "bulgarian", "decode", "loading", "reduced"]
  },
  "case-contact-prompt": {
    level: "L2 / EROSION",
    states: ["rest", "hover", "focus", "active", "decay", "recover", "reduced"]
  },
  "project-card": {
    level: "L2 / EROSION",
    states: ["rest", "hover", "focus", "active", "loading", "decay", "recover", "reduced"]
  },
  "project-mark": {
    level: "L3 / TRAIL",
    states: ["rest", "hover", "trail", "decay", "recover", "reduced"]
  },
  "obj-turntable": {
    level: "L4 / STRUCTURAL",
    states: ["rest", "pressure", "lift", "continue", "click", "decay", "recover", "reduced"]
  },
  "pave-turntable": {
    level: "L4 / STRUCTURAL",
    states: ["rest", "pressure", "lift", "continue", "click", "decay", "recover", "reduced"]
  },
  "svg-logo-turntable": {
    level: "L4 / STRUCTURAL",
    states: ["rest", "pressure", "lift", "continue", "click", "decay", "recover", "reduced"]
  },
  "synapse-turntable": {
    level: "L4 / STRUCTURAL",
    states: ["rest", "pressure", "lift", "continue", "click", "decay", "recover", "reduced"]
  },
  "dither-image-trail": {
    level: "L3 / TRAIL",
    states: ["rest", "trail", "click", "decay", "recover", "reduced"]
  },
  "site-footer": {
    level: "L2 / EROSION",
    states: ["rest", "hover", "focus", "active", "booking", "decay", "recover", "reduced"]
  },
  infrastructure: {
    level: "L0 / STATIC",
    states: ["rest", "light", "dark", "auto", "loading", "reduced"]
  }
};

const sessions = new WeakMap();

function getSession(entry) {
  if (!sessions.has(entry)) {
    sessions.set(entry, {
      token: 0,
      autoTimer: 0,
      stateIndex: 0,
      energy: 1,
      rate: 1
    });
  }
  return sessions.get(entry);
}

function dispatchPointer(target, type, x, y, options = {}) {
  if (!(target instanceof Element)) return;
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: type !== "pointerleave",
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      pointerId: 73,
      pointerType: "mouse",
      isPrimary: true,
      button: type === "pointerdown" ? 0 : -1,
      buttons: type === "pointerdown" ? 1 : 0,
      ...options
    })
  );
}

function dispatchSafeClick(target) {
  if (!(target instanceof HTMLElement)) return;
  const preventNavigation = (event) => event.preventDefault();
  target.addEventListener("click", preventNavigation, { capture: true, once: true });
  target.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: target.getBoundingClientRect().right,
      clientY: target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2
    })
  );
}

function resetEntry(entry, { preserveState = false } = {}) {
  const session = getSession(entry);
  session.token += 1;
  window.clearTimeout(session.autoTimer);
  session.autoTimer = 0;
  entry.classList.remove(
    "is-preview-hover",
    "is-preview-focus",
    "is-preview-active",
    "is-preview-loading",
    "is-preview-decay",
    "is-preview-recovering",
    "is-preview-reduced"
  );
  entry.querySelectorAll(".is-preview-target").forEach((target) => {
    target.classList.remove("is-preview-target");
    dispatchPointer(target, "pointerout", 0, 0, { relatedTarget: entry });
  });
  const active = document.activeElement;
  if (active instanceof HTMLElement && entry.contains(active)) active.blur();
  entry.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close?.());
  if (!preserveState) entry.dataset.previewState = "rest";
}

function setTheme(preference) {
  const controller = window.__traykovTheme;
  if (controller?.set) {
    controller.set(preference);
    return;
  }
  document.documentElement.dataset.theme = preference === "dark" ? "dark" : "light";
}

function getPrimaryTarget(entry) {
  const selector = {
    "theme-toggle": "[data-theme-toggle]",
    "case-contact-prompt": "[data-ascii-stream]",
    "project-card": ".project-card__body",
    "project-mark": ".project-mark",
    "site-footer": "[data-footer-booking-open], .footer-links a"
  }[entry.id];
  return selector ? entry.querySelector(selector) : null;
}

async function driveHoverTarget(entry, mode, token) {
  const target = getPrimaryTarget(entry);
  if (!(target instanceof HTMLElement)) return;
  target.classList.add("is-preview-target");
  const bounds = target.getBoundingClientRect();
  dispatchPointer(target, "pointerover", bounds.left + bounds.width * 0.35, bounds.top + bounds.height * 0.5);
  if (mode === "focus") target.focus({ preventScroll: true });
  entry.classList.add(mode === "focus" ? "is-preview-focus" : "is-preview-hover");
  if (entry.id === "project-card" || entry.id === "site-footer") {
    const words = entry.querySelectorAll("[data-scramble]");
    await Promise.all(
      Array.from(words)
        .slice(0, 5)
        .map((word) => scrambleElement(word, { duration: 360 / getSession(entry).rate }))
    );
  }
  if (getSession(entry).token !== token) return;
}

async function driveActive(entry, token) {
  const target =
    entry.id === "case-contact-prompt"
      ? entry.querySelector(".case-contact-prompt__actions a:last-child")
      : entry.id === "site-footer"
        ? entry.querySelector(".footer-links a")
        : getPrimaryTarget(entry);
  if (!(target instanceof HTMLElement)) return;
  entry.classList.add("is-preview-active");
  const repeats = Math.max(1, Math.round(getSession(entry).energy * 2));
  for (let index = 0; index < repeats; index += 1) {
    dispatchSafeClick(target);
    await wait(80 / getSession(entry).rate);
    if (getSession(entry).token !== token) return;
  }
}

function getTurntable(entry) {
  return entry.querySelector(
    "[data-obj-turntable], [data-pave-turntable], [data-sasi-logo-turntable]"
  );
}

async function sweepTurntable(entry, kind, token) {
  const target = getTurntable(entry);
  if (!(target instanceof HTMLElement)) return;
  const session = getSession(entry);
  const bounds = target.getBoundingClientRect();
  const y = bounds.top + bounds.height * 0.5;
  const startX = bounds.left + bounds.width * 0.16;
  const endX = bounds.left + bounds.width * 0.84;

  if (kind === "pressure") {
    dispatchPointer(target, "pointermove", bounds.left + bounds.width * 0.49, y);
    await wait(150 / session.rate);
    dispatchPointer(target, "pointermove", bounds.left + bounds.width * 0.52, y + bounds.height * 0.015);
    return;
  }

  const steps = Math.round(5 + session.energy * 3);
  dispatchPointer(target, "pointermove", startX, y);
  await wait(90 / session.rate);
  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    dispatchPointer(
      target,
      "pointermove",
      startX + (endX - startX) * progress,
      y + Math.sin(progress * Math.PI) * bounds.height * 0.035
    );
    await wait(18 / (session.rate * clamp(session.energy, 0.5, 1.4)));
    if (session.token !== token) return;
  }

  if (kind === "continue" || kind === "decay" || kind === "recover") {
    dispatchPointer(target, "pointerleave", bounds.right + 24, y);
  }
  if (kind === "decay") await wait(360 / session.rate);
  if (kind === "recover") await wait(820 / session.rate);
}

async function clickTurntable(entry) {
  const target = getTurntable(entry);
  if (!(target instanceof HTMLElement)) return;
  const bounds = target.getBoundingClientRect();
  const x = bounds.left + bounds.width * 0.5;
  const y = bounds.top + bounds.height * 0.5;
  dispatchPointer(target, "pointermove", x, y);
  dispatchPointer(target, "pointerdown", x, y, { button: 0, buttons: 1 });
}

async function driveDither(entry, state, token) {
  const target = entry.querySelector("[data-dither-trail-field]");
  if (!(target instanceof HTMLElement)) return;
  const session = getSession(entry);
  const bounds = target.getBoundingClientRect();
  const y = bounds.top + bounds.height * 0.48;
  const steps = Math.round(6 + session.energy * 4);
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    dispatchPointer(
      target,
      "pointermove",
      bounds.left + bounds.width * (0.12 + progress * 0.76),
      y + Math.sin(progress * Math.PI * 2) * bounds.height * 0.08
    );
    await wait(30 / session.rate);
    if (session.token !== token) return;
  }
  if (state === "click") {
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: bounds.left + bounds.width * 0.62,
      clientY: y
    });
    target.dispatchEvent(clickEvent);
  }
  if (state === "decay") await wait(420 / session.rate);
  if (state === "recover") await wait(920 / session.rate);
}

async function driveIdentity(entry, state) {
  const rotator = entry.querySelector("[data-identity-rotator]");
  const prefix = entry.querySelector("[data-identity-prefix]");
  if (!(rotator instanceof HTMLElement) || !(prefix instanceof HTMLElement)) return;
  const identities = JSON.parse(rotator.dataset.identities || "[]");
  const identity =
    state === "bulgarian"
      ? identities.find((item) => item.bulgarian)
      : identities.find((item) => item.english);
  if (!identity) return;
  if (state === "bulgarian") {
    prefix.textContent = "Александър е";
    prefix.lang = "bg";
    rotator.dataset.scrambleLabel = identity.bulgarian;
    rotator.lang = "bg";
  } else {
    prefix.textContent = `Alexander is ${identity.article || "a"}`;
    prefix.lang = "en";
    rotator.dataset.scrambleLabel = identity.english;
    rotator.lang = "en";
  }
  if (state === "decode" || state === "loading") {
    await scrambleElement(rotator, {
      duration: (state === "loading" ? 820 : 520) / getSession(entry).rate
    });
  } else {
    rotator.textContent = rotator.dataset.scrambleLabel;
  }
}

function updateReadout(entry, state) {
  const panel = entry.querySelector("[data-state-readout]");
  if (!panel) return;
  const values = stateProfiles[state] || stateProfiles.rest;
  panel.replaceChildren(
    ...values.map((value, index) => {
      const span = document.createElement("span");
      span.textContent = value;
      span.dataset.readoutSlot = String(index + 1).padStart(2, "0");
      return span;
    })
  );
  const phase = entry.querySelector("[data-state-phase]");
  if (phase) phase.textContent = state.toUpperCase();
}

async function applyState(entry, state, { fromAuto = false } = {}) {
  const config = configs[entry.id];
  if (!config || !config.states.includes(state)) return;
  resetEntry(entry, { preserveState: true });
  const session = getSession(entry);
  const token = session.token;
  session.stateIndex = config.states.indexOf(state);
  entry.dataset.previewState = state;
  entry.classList.toggle("is-preview-loading", state === "loading");
  entry.classList.toggle("is-preview-decay", state === "decay");
  entry.classList.toggle("is-preview-recovering", state === "recover");
  entry.classList.toggle("is-preview-reduced", state === "reduced");
  entry.querySelectorAll("[data-preview-state-button]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.previewStateButton === state));
  });
  updateReadout(entry, state);

  if (entry.id === "identity-rotator") {
    const rotator = entry.querySelector("[data-identity-rotator]");
    if (rotator instanceof HTMLElement) {
      rotator.dataset.identityPreviewLock = String(state !== "rest");
    }
  }

  if (["light", "dark", "auto"].includes(state)) setTheme(state);

  if (
    entry.id === "identity-rotator" &&
    ["english", "bulgarian", "decode", "loading", "reduced"].includes(state)
  ) {
    await driveIdentity(entry, state);
  } else if (["hover", "focus"].includes(state)) {
    await driveHoverTarget(entry, state, token);
  } else if (state === "active") {
    await driveActive(entry, token);
  } else if (["pressure", "lift", "continue", "decay", "recover"].includes(state) && getTurntable(entry)) {
    await sweepTurntable(entry, state, token);
  } else if (state === "click" && getTurntable(entry)) {
    await clickTurntable(entry);
  } else if (
    entry.id === "project-mark" &&
    ["trail", "decay", "recover"].includes(state)
  ) {
    const targets = entry.querySelectorAll(
      "[data-obj-turntable], [data-pave-turntable], [data-sasi-logo-turntable]"
    );
    for (const target of targets) {
      const bounds = target.getBoundingClientRect();
      dispatchPointer(target, "pointermove", bounds.left + bounds.width * 0.2, bounds.top + bounds.height * 0.5);
      dispatchPointer(target, "pointermove", bounds.left + bounds.width * 0.8, bounds.top + bounds.height * 0.5);
      if (state !== "trail") dispatchPointer(target, "pointerleave", bounds.right + 12, bounds.top + bounds.height * 0.5);
    }
    if (state === "recover") await wait(760 / session.rate);
  } else if (
    entry.id === "dither-image-trail" &&
    ["trail", "click", "decay", "recover"].includes(state)
  ) {
    await driveDither(entry, state, token);
  } else if (entry.id === "site-footer" && state === "booking") {
    entry.querySelector("[data-footer-booking-open]")?.click();
  } else if (state === "decay") {
    entry.classList.add("is-preview-decay");
    await wait(420 / session.rate);
  } else if (state === "recover") {
    entry.classList.add("is-preview-recovering");
    await wait(640 / session.rate);
  }

  if (fromAuto && session.token === token) scheduleAuto(entry);
}

function scheduleAuto(entry) {
  const config = configs[entry.id];
  const session = getSession(entry);
  if (!entry.classList.contains("is-preview-auto")) return;
  session.autoTimer = window.setTimeout(() => {
    session.stateIndex = (session.stateIndex + 1) % config.states.length;
    applyState(entry, config.states[session.stateIndex], { fromAuto: true });
  }, 1180 / session.rate);
}

function createLab(entry, config) {
  const lab = document.createElement("section");
  lab.className = "component-state-lab";
  lab.setAttribute("aria-label", `${entry.querySelector("h2")?.textContent || entry.id} states`);

  const heading = document.createElement("div");
  heading.className = "component-state-lab__heading";
  heading.innerHTML = `
    <span>${config.level}</span>
    <strong data-state-phase>REST</strong>
    <span>${String(config.states.length).padStart(2, "0")} GENERATED STATES</span>
  `;

  const rail = document.createElement("div");
  rail.className = "component-state-lab__rail";
  rail.setAttribute("role", "group");
  rail.setAttribute("aria-label", "Choose component state");
  config.states.forEach((state, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.previewStateButton = state;
    button.setAttribute("aria-pressed", String(index === 0));
    button.innerHTML = `<span>${String(index).padStart(2, "0")}</span>${state}`;
    button.addEventListener("click", () => applyState(entry, state));
    rail.append(button);
  });

  const readout = document.createElement("div");
  readout.className = "component-state-lab__readout";
  readout.dataset.stateReadout = "";

  const controls = document.createElement("div");
  controls.className = "component-state-lab__controls";
  controls.innerHTML = `
    <button type="button" data-state-play>REPLAY ↻</button>
    <button type="button" data-state-auto aria-pressed="false">AUTO ▶</button>
    <button type="button" data-state-reset>RESET ×</button>
    <label><span>FORCE</span><input data-state-energy type="range" min="0.5" max="1.4" value="1" step="0.1"></label>
    <label><span>TIME</span><input data-state-rate type="range" min="0.55" max="1.6" value="1" step="0.05"></label>
  `;

  controls.querySelector("[data-state-play]").addEventListener("click", () => {
    applyState(entry, config.states[getSession(entry).stateIndex]);
  });
  controls.querySelector("[data-state-reset]").addEventListener("click", () => {
    entry.classList.remove("is-preview-auto");
    controls.querySelector("[data-state-auto]").setAttribute("aria-pressed", "false");
    applyState(entry, "rest");
  });
  controls.querySelector("[data-state-auto]").addEventListener("click", (event) => {
    const enabled = !entry.classList.contains("is-preview-auto");
    entry.classList.toggle("is-preview-auto", enabled);
    event.currentTarget.setAttribute("aria-pressed", String(enabled));
    window.clearTimeout(getSession(entry).autoTimer);
    if (enabled) scheduleAuto(entry);
  });
  controls.querySelector("[data-state-energy]").addEventListener("input", (event) => {
    getSession(entry).energy = Number(event.currentTarget.value);
  });
  controls.querySelector("[data-state-rate]").addEventListener("input", (event) => {
    getSession(entry).rate = Number(event.currentTarget.value);
  });

  lab.append(heading, rail, readout, controls);
  entry.querySelector(".component-preview__stage")?.before(lab);
  updateReadout(entry, "rest");
}

function createGlobalControls() {
  const hero = document.querySelector(".component-preview-hero");
  if (!hero) return;
  const controls = document.createElement("div");
  controls.className = "component-preview-global-controls";
  controls.innerHTML = `
    <label><span>Surface</span><select data-preview-surface><option value="paper">Paper</option><option value="panel">Panel</option><option value="inverse">Inverse</option></select></label>
    <label><span>Motion</span><select data-preview-motion><option value="full">Full</option><option value="reduced">Reduced</option></select></label>
    <label><span>Theme</span><select data-preview-theme><option value="auto">Auto</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
  `;
  hero.append(controls);
  controls.querySelector("[data-preview-surface]").addEventListener("change", (event) => {
    document.body.dataset.componentPreviewSurface = event.currentTarget.value;
  });
  controls.querySelector("[data-preview-motion]").addEventListener("change", (event) => {
    document.body.dataset.componentPreviewMotion = event.currentTarget.value;
  });
  controls.querySelector("[data-preview-theme]").addEventListener("change", (event) => {
    setTheme(event.currentTarget.value);
  });
}

createGlobalControls();
document.querySelectorAll(".component-preview-entry").forEach((entry) => {
  const config = configs[entry.id];
  if (!config) return;
  entry.dataset.previewState = "rest";
  createLab(entry, config);
});
