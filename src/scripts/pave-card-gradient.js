const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

export function initializePaveCardGradient(root) {
  const card = root.closest(".project-card--pave");
  if (!card) return () => {};

  let frame = 0;
  let nextX = 0.5;
  let nextY = 0.5;

  const write = () => {
    frame = 0;
    root.style.setProperty("--pave-pointer-x", `${(nextX * 100).toFixed(2)}%`);
    root.style.setProperty("--pave-pointer-y", `${(nextY * 100).toFixed(2)}%`);
    root.style.setProperty("--pave-hover-hue", `${((nextX - 0.5) * 8).toFixed(2)}deg`);
  };

  const onPointerMove = (event) => {
    if (reduceMotion.matches || !finePointer.matches) return;

    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    nextX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    nextY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    if (!frame) frame = window.requestAnimationFrame(write);
  };

  const reset = () => {
    nextX = 0.5;
    nextY = 0.5;
    if (frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
    root.style.removeProperty("--pave-pointer-x");
    root.style.removeProperty("--pave-pointer-y");
    root.style.removeProperty("--pave-hover-hue");
  };

  card.addEventListener("pointermove", onPointerMove, { passive: true });
  card.addEventListener("pointerleave", reset);

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    card.removeEventListener("pointermove", onPointerMove);
    card.removeEventListener("pointerleave", reset);
  };
}

const cleanups = Array.from(document.querySelectorAll("[data-pave-card-gradient]"))
  .map(initializePaveCardGradient);

window.addEventListener(
  "pagehide",
  () => cleanups.forEach((cleanup) => cleanup()),
  { once: true }
);
