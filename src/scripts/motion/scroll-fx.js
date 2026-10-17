export function initScrollFx() {
  const root = document.documentElement;
  const readout = document.querySelector("[data-case-progress-readout]");
  let ticking = false;

  const renderReadout = (progress) => {
    if (!readout) return;
    const percent = Math.round(progress * 100);
    const filled = Math.round(progress * 10);
    readout.textContent = `READ [${"#".repeat(filled)}${".".repeat(10 - filled)}] ${String(percent).padStart(
      3,
      "0"
    )}%`;
  };

  const update = () => {
    ticking = false;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    root.style.setProperty("--scroll-progress", progress.toFixed(4));
    renderReadout(progress);

  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initScrollFx, { once: true });
} else {
  initScrollFx();
}
