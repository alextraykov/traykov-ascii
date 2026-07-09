import { scrambleElement } from "./motion/scramble.js";

const activeTimeouts = new WeakMap();
const activeRuns = new WeakMap();

function getTargets(card) {
  return Array.from(card.querySelectorAll(".project-index, h3, p, .construction-status"));
}

function clearQueued(card) {
  const timeouts = activeTimeouts.get(card) || [];
  timeouts.forEach((timeout) => window.clearTimeout(timeout));
  activeTimeouts.set(card, []);
}

document.querySelectorAll(".project-card--synapsis").forEach((card) => {
  const targets = getTargets(card);

  targets.forEach((target) => {
    target.dataset.scrambleLabel = target.textContent || "";
  });

  let runId = 0;

  const enter = () => {
    runId += 1;
    activeRuns.set(card, runId);
    clearQueued(card);
    card.classList.add("is-synapse-text");

    const timeouts = targets.map((target, index) =>
      window.setTimeout(() => {
        const length = (target.dataset.scrambleLabel || target.textContent || "").replaceAll(" ", "").length;
        scrambleElement(target, { duration: Math.max(220, length * 18 + 90) });
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
            const length = (target.dataset.scrambleLabel || target.textContent || "").replaceAll(" ", "").length;
            scrambleElement(target, { duration: Math.max(180, length * 16 + 70), reverse: true }).then(resolve);
          }, index * 28);

          activeTimeouts.set(card, [...(activeTimeouts.get(card) || []), timeout]);
        })
    );

    Promise.all(completions).then(() => {
      if (activeRuns.get(card) !== currentRun) return;
      targets.forEach((target) => {
        target.textContent = target.dataset.scrambleLabel || target.textContent || "";
      });
    });
  };

  card.addEventListener("pointerenter", enter);
  card.addEventListener("focusin", enter);
  card.addEventListener("pointerleave", leave);
  card.addEventListener("focusout", (event) => {
    if (card.contains(event.relatedTarget)) return;
    leave();
  });
});
