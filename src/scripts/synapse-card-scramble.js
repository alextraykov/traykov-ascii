const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_/-+*#[]{}<>";
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");
const activeAnimations = new WeakMap();
const activeTimeouts = new WeakMap();
const activeRuns = new WeakMap();

function scrambleChar(index, step) {
  return SCRAMBLE_CHARS[(index * 7 + step * 11) % SCRAMBLE_CHARS.length];
}

function frameText(source, elapsed, options = {}) {
  const chars = Array.from(source);
  const nonSpaceIndexes = chars
    .map((char, index) => (char === " " ? -1 : index))
    .filter((index) => index >= 0);
  const orderedIndexes = options.reverse ? [...nonSpaceIndexes].reverse() : nonSpaceIndexes;
  const letterDelay = options.letterDelay ?? 18;
  const scrambleWindow = options.scrambleWindow ?? 90;

  const resolved = new Set();
  orderedIndexes.forEach((index, order) => {
    if (elapsed >= order * letterDelay + scrambleWindow) resolved.add(index);
  });

  return chars.map((char, index) => {
    if (char === " ") return " ";
    if (resolved.has(index)) return char;

    const order = orderedIndexes.indexOf(index);
    const localElapsed = elapsed - order * letterDelay;
    if (localElapsed < 0) return options.blankPending ? " " : char;

    return scrambleChar(index, Math.floor(localElapsed / 34));
  }).join("");
}

function scrambleElement(element, duration = 360, options = {}) {
  const source = element.dataset.scrambleSource || element.textContent || "";
  element.dataset.scrambleSource = source;

  if (REDUCED_MOTION.matches) {
    element.textContent = source;
    return Promise.resolve();
  }

  const previous = activeAnimations.get(element);
  if (previous) cancelAnimationFrame(previous);

  const start = performance.now();

  return new Promise((resolve) => {
    const tick = (time) => {
      const elapsed = time - start;
      element.textContent = frameText(source, elapsed, options);

      if (elapsed < duration) {
        activeAnimations.set(element, requestAnimationFrame(tick));
      } else {
        element.textContent = source;
        activeAnimations.delete(element);
        resolve();
      }
    };

    activeAnimations.set(element, requestAnimationFrame(tick));
  });
}

function revertElement(element, duration = 320, options = {}) {
  const source = element.dataset.scrambleSource || element.textContent || "";
  element.dataset.scrambleSource = source;

  if (REDUCED_MOTION.matches) {
    element.textContent = source;
    return Promise.resolve();
  }

  const previous = activeAnimations.get(element);
  if (previous) cancelAnimationFrame(previous);

  const start = performance.now();
  const swapAt = Math.min(duration - 70, Math.max(80, duration * 0.46));
  let swapped = false;

  return new Promise((resolve) => {
    const tick = (time) => {
      const elapsed = time - start;

      if (!swapped && elapsed >= swapAt) {
        element.classList.add("is-reverting-font");
        swapped = true;
      }

      element.textContent = frameText(source, elapsed, {
        ...options,
        reverse: true,
      });

      if (elapsed < duration) {
        activeAnimations.set(element, requestAnimationFrame(tick));
      } else {
        element.textContent = source;
        element.classList.remove("is-reverting-font");
        activeAnimations.delete(element);
        resolve();
      }
    };

    activeAnimations.set(element, requestAnimationFrame(tick));
  });
}

function getTargets(card) {
  return Array.from(
    card.querySelectorAll(".project-index, h3, p, .construction-status")
  );
}

function clearQueued(card) {
  const timeouts = activeTimeouts.get(card) || [];
  timeouts.forEach((timeout) => window.clearTimeout(timeout));
  activeTimeouts.set(card, []);
}

document.querySelectorAll(".project-card--synapsis").forEach((card) => {
  const targets = getTargets(card);
  targets.forEach((target) => {
    target.dataset.scrambleSource = target.textContent || "";
  });
  let runId = 0;

  const enter = () => {
    runId += 1;
    activeRuns.set(card, runId);
    clearQueued(card);
    targets.forEach((target) => target.classList.remove("is-reverting-font"));
    card.classList.add("is-synapse-text");
    const timeouts = targets.map((target, index) =>
      window.setTimeout(() => {
        const length = (target.dataset.scrambleSource || target.textContent || "").replaceAll(" ", "").length;
        scrambleElement(target, Math.max(220, length * 18 + 90), { letterDelay: 18, scrambleWindow: 90 });
      }, index * 34)
    );
    activeTimeouts.set(card, timeouts);
  };

  const leave = () => {
    runId += 1;
    const currentRun = runId;
    activeRuns.set(card, currentRun);
    clearQueued(card);
    card.classList.remove("is-synapse-text");
    const reversedTargets = [...targets].reverse();
    const completions = reversedTargets.map(
      (target, index) =>
        new Promise((resolve) => {
          const timeout = window.setTimeout(() => {
            const length = (target.dataset.scrambleSource || target.textContent || "").replaceAll(" ", "").length;
            revertElement(target, Math.max(260, length * 16 + 120), {
              letterDelay: 14,
              scrambleWindow: 90,
            }).then(resolve);
          }, index * 28);
          activeTimeouts.set(card, [...(activeTimeouts.get(card) || []), timeout]);
        })
    );

    Promise.all(completions).then(() => {
      if (activeRuns.get(card) !== currentRun) return;
      targets.forEach((target) => target.classList.remove("is-reverting-font"));
      card.classList.remove("is-synapse-text");
    });
  };

  card.addEventListener("pointerenter", enter);
  card.addEventListener("pointerleave", leave);
  card.addEventListener("focusin", enter);
  card.addEventListener("focusout", leave);
});
