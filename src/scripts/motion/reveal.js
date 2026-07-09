import { initScramble, scrambleElement } from "./scramble.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let observer;

function markIn(element) {
  element.dataset.revealState = "in";

  if (element.dataset.reveal === "scramble") {
    scrambleElement(element);
  }

  element
    .querySelectorAll('[data-scramble-trigger="reveal"]')
    .forEach((target) => scrambleElement(target));
}

function decorateCaseBody() {
  document.querySelectorAll(".case-study-body").forEach((body) => {
    body.querySelectorAll(":scope > *").forEach((element, index) => {
      if (element.hasAttribute("data-reveal")) return;

      if (/^H2$/i.test(element.tagName)) {
        element.dataset.reveal = "scramble";
      } else if (element.matches("figure, .case-stats, .case-pull-quote, .case-timeline")) {
        element.dataset.reveal = "rise";
        element.dataset.revealDelay = String(Math.min(index, 6) * 40);
      } else {
        element.dataset.reveal = "rise";
      }
    });
  });
}

function decorateGroups(root = document) {
  root.querySelectorAll("[data-reveal-group]").forEach((group) => {
    Array.from(group.children).forEach((child, index) => {
      if (!child.hasAttribute("data-reveal")) {
        child.dataset.reveal = child.matches("a, article, figure") ? "rise" : "fade";
      }

      if (!child.hasAttribute("data-reveal-delay")) {
        child.dataset.revealDelay = String(Math.min(index, 6) * 60);
      }
    });
  });
}

function prepareElement(element) {
  if (element.dataset.revealPrepared === "true") return;
  element.dataset.revealPrepared = "true";

  const delay = Number(element.dataset.revealDelay || 0);
  if (delay > 0) element.style.setProperty("--reveal-delay", `${delay}ms`);

  if (reducedMotion.matches) {
    markIn(element);
    return;
  }

  if (element.getBoundingClientRect().top < window.innerHeight * 0.92) {
    markIn(element);
    return;
  }

  observer?.observe(element);
}

function applyReducedMotion() {
  document.querySelectorAll("[data-reveal]").forEach((element) => markIn(element));
  observer?.disconnect();
  document.documentElement.dataset.motion = "ready";
}

export function initReveal() {
  decorateCaseBody();
  decorateGroups();
  initScramble();

  if (reducedMotion.matches) {
    applyReducedMotion();
    return;
  }

  observer =
    observer ||
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          markIn(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
    );

  document.querySelectorAll("[data-reveal]").forEach((element) => prepareElement(element));
  document.documentElement.dataset.motion = "ready";
}

reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) applyReducedMotion();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initReveal, { once: true });
} else {
  initReveal();
}
