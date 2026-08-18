import { sketches } from "../sketches/index.js";

const FRAME_INTERVAL = 1000 / 60;

const isEditableTarget = (target) =>
  target instanceof HTMLElement &&
  (target.matches("input, select, textarea, button") || target.isContentEditable);

const formatControlValue = (control, value) => {
  if (control.format === "percent") return `${Math.round(Number(value) * 100)}%`;
  if (control.step && Number(control.step) < 1) {
    const decimals = String(control.step).split(".")[1]?.length ?? 2;
    return Number(value).toFixed(Math.min(decimals, 2));
  }
  return String(value);
};

const createSeed = () => {
  const values = new Uint32Array(1);

  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
    return values[0] || 1;
  }

  return Math.floor(Math.random() * 0xffffffff) || 1;
};

const initializeSketchbook = (root) => {
  if (root.dataset.sketchbookReady === "true") return;
  root.dataset.sketchbookReady = "true";

  const canvas = root.querySelector("[data-sketch-canvas]");
  const stage = root.querySelector("[data-sketch-stage]");
  const list = root.querySelector("[data-sketch-list]");
  const controlsRoot = root.querySelector("[data-sketch-controls]");
  const title = root.querySelector("[data-sketch-title]");
  const description = root.querySelector("[data-sketch-description]");
  const technique = root.querySelector("[data-sketch-technique]");
  const seedOutput = root.querySelector("[data-sketch-seed]");
  const resolutionOutput = root.querySelector("[data-sketch-resolution]");
  const fpsOutput = root.querySelector("[data-sketch-fps]");
  const pauseLabel = root.querySelector("[data-sketch-pause-label]");
  const pauseButton = root.querySelector('[data-sketch-action="pause"]');
  const fullscreenLabel = root.querySelector("[data-sketch-fullscreen-label]");
  const fullscreenButton = root.querySelector('[data-sketch-action="fullscreen"]');
  const emptyState = root.querySelector("[data-sketch-empty]");
  const status = root.querySelector("[data-sketch-status]");

  if (
    !(canvas instanceof HTMLCanvasElement) ||
    !(stage instanceof HTMLElement) ||
    !(list instanceof HTMLElement) ||
    !(controlsRoot instanceof HTMLFormElement)
  ) {
    return;
  }

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return;

  root.dataset.sketchbookEnhanced = "true";
  stage.tabIndex = 0;

  const query = new URLSearchParams(window.location.search);
  const requestedId = query.get("sketch");
  const initialIndex = Math.max(0, sketches.findIndex(({ meta }) => meta.id === requestedId));
  const requestedSeed = Number.parseInt(query.get("seed") || "", 10);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = {
    x: 0.5,
    y: 0.5,
    inside: false
  };

  let activeIndex = initialIndex;
  let activeEntry = sketches[activeIndex];
  let activeSketch;
  let params = {};
  let seed = Number.isFinite(requestedSeed) && requestedSeed > 0 ? requestedSeed >>> 0 : createSeed();
  let width = 1;
  let height = 1;
  let dpr = 1;
  let elapsed = 0;
  let lastTimestamp = 0;
  let lastDrawTimestamp = 0;
  let frameHandle = 0;
  let running = !reducedMotion.matches;
  let frameCount = 0;
  let fpsWindowStart = 0;
  let lastFps = 0;

  const updateUrl = () => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("sketch", activeEntry.meta.id);
    nextUrl.searchParams.set("seed", String(seed));
    window.history.replaceState({}, "", nextUrl);
  };

  const updatePauseState = () => {
    if (pauseLabel) pauseLabel.textContent = running ? "Pause" : "Play";
    pauseButton?.setAttribute("aria-pressed", String(!running));
    root.dataset.sketchRunning = String(running);
  };

  const updateFullscreenState = () => {
    const fullscreen = document.fullscreenElement === stage;
    if (fullscreenLabel) fullscreenLabel.textContent = fullscreen ? "Exit fullscreen" : "Fullscreen";
    fullscreenButton?.setAttribute("aria-pressed", String(fullscreen));
    root.dataset.sketchFullscreen = String(fullscreen);
    lastTimestamp = 0;
    lastDrawTimestamp = 0;
    window.requestAnimationFrame(resize);
  };

  const reportError = (error) => {
    console.error("[creative-sketchbook]", error);
    if (emptyState instanceof HTMLElement) emptyState.hidden = false;
    if (status) status.textContent = `Sketch error: ${error instanceof Error ? error.message : String(error)}`;
    running = false;
    updatePauseState();
  };

  const renderFrame = (timestamp = performance.now()) => {
    if (!activeSketch) return;
    const delta = lastTimestamp ? Math.min(0.1, (timestamp - lastTimestamp) / 1000) : 0;
    lastTimestamp = timestamp;
    if (running) elapsed += delta;

    try {
      activeSketch.frame?.({
        time: elapsed,
        delta,
        width,
        height,
        dpr
      });
    } catch (error) {
      reportError(error);
      return;
    }

    frameCount += 1;
    if (!fpsWindowStart) fpsWindowStart = timestamp;
    const fpsWindow = timestamp - fpsWindowStart;

    if (fpsWindow >= 600) {
      lastFps = Math.round((frameCount * 1000) / fpsWindow);
      frameCount = 0;
      fpsWindowStart = timestamp;
      if (fpsOutput) fpsOutput.textContent = `${lastFps} FPS`;
    }
  };

  const tick = (timestamp) => {
    frameHandle = 0;

    if (
      running &&
      lastDrawTimestamp &&
      timestamp - lastDrawTimestamp < FRAME_INTERVAL - 1
    ) {
      frameHandle = window.requestAnimationFrame(tick);
      return;
    }

    lastDrawTimestamp = timestamp;
    renderFrame(timestamp);
    if (running && !document.hidden) frameHandle = window.requestAnimationFrame(tick);
  };

  const requestFrame = () => {
    if (!frameHandle && !document.hidden) frameHandle = window.requestAnimationFrame(tick);
  };

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    resolutionOutput && (resolutionOutput.textContent = `${pixelWidth} × ${pixelHeight}`);

    try {
      activeSketch?.resize?.({ width, height, dpr });
      requestFrame();
    } catch (error) {
      reportError(error);
    }
  };

  const rebuildControls = () => {
    controlsRoot.replaceChildren();

    for (const control of activeEntry.meta.controls || []) {
      const label = document.createElement("label");
      const labelRow = document.createElement("span");
      const labelText = document.createElement("span");
      labelText.textContent = control.label;
      labelRow.append(labelText);

      let input;
      if (control.type === "select") {
        input = document.createElement("select");
        for (const option of control.options || []) {
          const element = document.createElement("option");
          element.value = option.value;
          element.textContent = option.label;
          element.selected = option.value === params[control.key];
          input.append(element);
        }
      } else {
        input = document.createElement("input");
        input.type = "range";
        input.min = String(control.min);
        input.max = String(control.max);
        input.step = String(control.step);
        input.value = String(params[control.key]);

        const output = document.createElement("output");
        output.textContent = formatControlValue(control, params[control.key]);
        labelRow.append(output);

        input.addEventListener("input", () => {
          params[control.key] = Number(input.value);
          output.textContent = formatControlValue(control, params[control.key]);
          requestFrame();
        });
      }

      if (input instanceof HTMLSelectElement) {
        input.addEventListener("change", () => {
          params[control.key] = input.value;
          requestFrame();
        });
      }

      input.name = control.key;
      label.append(labelRow, input);
      controlsRoot.append(label);
    }
  };

  const rebuildDirectory = () => {
    list.replaceChildren();

    sketches.forEach((entry, index) => {
      const button = document.createElement("button");
      const number = document.createElement("span");
      const label = document.createElement("strong");
      const method = document.createElement("small");
      button.type = "button";
      button.dataset.sketchId = entry.meta.id;
      button.setAttribute("aria-pressed", String(index === activeIndex));
      number.textContent = String(index + 1).padStart(2, "0");
      label.textContent = entry.meta.title;
      method.textContent = entry.meta.technique;
      button.append(number, label, method);
      button.addEventListener("click", () => selectSketch(index));
      list.append(button);
    });
  };

  const mountSketch = () => {
    activeSketch?.destroy?.();
    activeSketch = undefined;
    emptyState instanceof HTMLElement && (emptyState.hidden = true);
    params = Object.fromEntries(
      (activeEntry.meta.controls || []).map((control) => [control.key, control.default])
    );

    if (title) title.textContent = activeEntry.meta.title;
    if (description) description.textContent = activeEntry.meta.description;
    if (technique) technique.textContent = activeEntry.meta.technique;
    if (seedOutput) seedOutput.textContent = seed.toString(16).toUpperCase().padStart(8, "0");
    if (status) {
      status.textContent =
        activeEntry.meta.hint ||
        "Move through the stage to bend the field. Changes stay in this browser.";
    }
    rebuildControls();
    rebuildDirectory();
    updateUrl();

    try {
      activeSketch = activeEntry.createSketch({
        canvas,
        context,
        params,
        seed,
        pointer,
        setStatus(message) {
          if (status) status.textContent = message;
        }
      });
      activeSketch?.resize?.({ width, height, dpr });
      elapsed = 0;
      lastTimestamp = 0;
      lastDrawTimestamp = 0;
      requestFrame();
    } catch (error) {
      reportError(error);
    }
  };

  function selectSketch(index) {
    if (!sketches[index]) return;
    activeIndex = index;
    activeEntry = sketches[activeIndex];
    mountSketch();
  }

  const setRunning = (nextRunning) => {
    running = nextRunning;
    lastTimestamp = 0;
    lastDrawTimestamp = 0;
    updatePauseState();
    requestFrame();
    if (status) status.textContent = running ? "Sketch running." : "Sketch paused on the current frame.";
  };

  const randomizeSeed = () => {
    seed = createSeed();
    mountSketch();
    if (status) status.textContent = `New seed ${seedOutput?.textContent || seed}.`;
  };

  const resetSketch = () => {
    mountSketch();
    if (status) status.textContent = "Parameters reset to this sketch's defaults.";
  };

  const saveSketch = () => {
    canvas.toBlob((blob) => {
      if (!blob) {
        if (status) status.textContent = "The browser could not encode this frame.";
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${activeEntry.meta.id}-${seed}.png`;
      anchor.hidden = true;
      root.append(anchor);
      anchor.click();
      window.setTimeout(() => {
        anchor.remove();
        URL.revokeObjectURL(url);
      }, 5000);
      if (status) status.textContent = `Saved ${anchor.download} at ${canvas.width} × ${canvas.height}.`;
    }, "image/png");
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen();
        return;
      }

      if (!stage.requestFullscreen) {
        if (status) status.textContent = "Fullscreen preview is not available in this browser.";
        return;
      }

      await stage.requestFullscreen({ navigationUI: "hide" });
    } catch (error) {
      console.error("[creative-sketchbook] fullscreen", error);
      if (status) status.textContent = "The browser could not open the fullscreen preview.";
    }
  };

  root.querySelectorAll("[data-sketch-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.sketchAction;
      if (action === "pause") setRunning(!running);
      if (action === "seed") randomizeSeed();
      if (action === "reset") resetSketch();
      if (action === "save") saveSketch();
      if (action === "fullscreen") void toggleFullscreen();
    });
  });

  const updatePointer = (event) => {
    const rect = stage.getBoundingClientRect();
    pointer.x = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)));
    pointer.y = Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(1, rect.height)));
    pointer.inside = true;
    requestFrame();
  };

  stage.addEventListener("pointermove", updatePointer);
  stage.addEventListener("pointerenter", updatePointer);
  stage.addEventListener("pointerleave", () => {
    pointer.inside = false;
    requestFrame();
  });

  window.addEventListener("keydown", (event) => {
    if (isEditableTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.code === "Space") {
      event.preventDefault();
      setRunning(!running);
    } else if (event.key.toLowerCase() === "r") {
      randomizeSeed();
    } else if (event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveSketch();
    } else if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      void toggleFullscreen();
    } else if (/^[1-9]$/.test(event.key)) {
      selectSketch(Number(event.key) - 1);
    }
  });

  document.addEventListener("fullscreenchange", updateFullscreenState);
  document.addEventListener("visibilitychange", () => {
    lastTimestamp = 0;
    lastDrawTimestamp = 0;
    if (!document.hidden && running) requestFrame();
  });
  window.addEventListener("themechange", requestFrame);
  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) setRunning(false);
  });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  updatePauseState();
  updateFullscreenState();
  resize();
  mountSketch();
};

document.querySelectorAll("[data-creative-sketchbook]").forEach(initializeSketchbook);
