/* Portfolio host adapter. The recovered tutorial owns slides, controls and motion. */
(() => {
  const steps = [2, 1, 4, 4, 4, 4, 8, 4, 4, 4, 4, 1, 1];
  let imposedReduction = false;
  let hostPaused = false;

  function readState() {
    const [, query = ""] = location.hash.split("?");
    const params = new URLSearchParams(query);
    const slide = Math.min(steps.length, Math.max(1, Number(params.get("slide")) || 1));
    const step = Math.min(steps[slide - 1] - 1, Math.max(0, Number(params.get("step")) || 0));
    return { params, slide, step, count: steps.length, steps: steps[slide - 1] };
  }

  function setReduction(paused, initial = false) {
    hostPaused = paused;
    const state = readState();
    if (paused && state.params.get("motion") !== "reduce") {
      imposedReduction = true;
      state.params.set("motion", "reduce");
    } else if (!paused && imposedReduction) {
      imposedReduction = false;
      state.params.delete("motion");
    } else return;
    const hash = `#making-of?${state.params}`;
    if (initial) history.replaceState(null, "", hash);
    else location.replace(hash);
  }

  try {
    setReduction(localStorage.getItem("traykov-motion-preference") === "paused", true);
  } catch {
    // System motion still works when storage is unavailable.
  }

  function publish() {
    if (window.parent === window) return;
    const { slide, step, count, steps: countSteps } = readState();
    parent.postMessage({ type: "presenting-in-code-state", slide, step, count, steps: countSteps, hash: location.hash }, location.origin);
  }

  window.addEventListener("hashchange", () => {
    if (hostPaused) setReduction(true);
    publish();
  });
  window.addEventListener("DOMContentLoaded", publish);
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.source !== parent || !event.data) return;
    if (event.data.type === "presenting-in-code-motion") {
      setReduction(Boolean(event.data.paused || event.data.reduced));
    } else if (event.data.type === "presenting-in-code-navigate") {
      const key = event.data.direction === "previous" ? "ArrowLeft" : event.data.direction === "next" ? "ArrowRight" : null;
      if (key) document.body.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    }
  });
})();
