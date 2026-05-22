import * as THREE from "three";
import { createTurntableAsciiReveal } from "./turntable-ascii-reveal.js";

const LANDING_ASCII_RAMP = [" ", "·", "•", "+", "*", "✦", "✶", "✷", "✸", "✹"];

document.querySelectorAll("[data-pave-turntable]").forEach((root) => {
  const ascii = root.querySelector("[data-pave-ascii]");
  if (!ascii) return;
  root.classList.add("is-turntable-loading");

  const isCard = root.dataset.paveMode === "card";
  const ramp = LANDING_ASCII_RAMP;
  const controls = {
    speed: isCard ? 0.26 : 0.38,
    depth: isCard ? 82 : 64,
    bevel: isCard ? 4.8 : 5.8,
    density: isCard ? 6 : 10,
    brightness: isCard ? -0.03 : 0,
    contrast: isCard ? 1.72 : 1.35,
    glow: isCard ? 0 : 0.18,
    renderSize: Number(root.dataset.renderSize || 1),
    glyphDetail: isCard ? 8 : 4,
    hover: isCard ? 0 : 0.34
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(isCard ? 31 : 34, 1, 0.1, 100);
  camera.position.set(0, 0, isCard ? 8.8 : 8.2);

  const renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: false
  });
  renderer.setClearColor(0xfbfbf8, 1);
  renderer.setPixelRatio(1);
  root.append(renderer.domElement);

  const mark = new THREE.Group();
  mark.rotation.x = isCard ? -0.22 : -0.16;
  scene.add(mark);

  const frontMaterial = new THREE.MeshStandardMaterial({
    color: 0x080808,
    metalness: 0.1,
    roughness: 0.28,
    side: THREE.DoubleSide
  });
  const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0x898578,
    metalness: 0.08,
    roughness: 0.5,
    side: THREE.DoubleSide
  });

  const key = new THREE.DirectionalLight(0xffffff, isCard ? 4.9 : 4.6);
  key.position.set(2.8, 3.4, 4.2);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xffffff, isCard ? 3.8 : 3.2);
  rim.position.set(-2.4, 1.6, -4.8);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xd7d2bd, isCard ? 2.4 : 2.0);
  fill.position.set(-3.2, -0.8, 2.6);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, isCard ? 0.96 : 0.86));

  const sampleCanvas = document.createElement("canvas");
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
  let cols = isCard ? 28 : 120;
  let rows = isCard ? 11 : 70;
  let lastAscii = 0;
  let lastTrailTime = 0;
  let activeGroup = null;
  let trailBuffer = new Float32Array(cols * rows);
  let turntableAngle = 0;
  let lastRenderTime = 0;
  let isVisible = !root.hasAttribute("data-playground-turntable") && !root.hasAttribute("data-hover-turntable");
  let pendingFrame = null;
  const asciiReveal = createTurntableAsciiReveal(root, { duration: isCard ? 720 : 1200 });

  const makeRectShape = (x, y, width, height) => {
    const shape = new THREE.Shape();
    shape.moveTo(x, y);
    shape.lineTo(x + width, y);
    shape.lineTo(x + width, y + height);
    shape.lineTo(x, y + height);
    shape.closePath();
    return shape;
  };

  const makeMainShape = () => {
    const shape = new THREE.Shape();
    shape.moveTo(307.88, 156.97);
    shape.lineTo(307.88, 131.72);
    shape.bezierCurveTo(309.89, 46.64, 230.11, 49.48, 192.63, 49.48);
    shape.lineTo(49.51, 49.48);
    shape.lineTo(49.51, 124.38);
    shape.lineTo(192.62, 124.38);
    shape.bezierCurveTo(221.13, 124.38, 273.39, 126.17, 287.82, 144.35);
    shape.bezierCurveTo(273.39, 162.53, 221.12, 164.32, 192.62, 164.32);
    shape.lineTo(192.62, 239.22);
    shape.bezierCurveTo(230.11, 239.22, 309.88, 242.06, 307.87, 156.98);
    shape.closePath();
    return shape;
  };

  const disposeGroup = (group) => {
    group.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose();
    });
  };

  const rebuildGeometry = () => {
    if (activeGroup) {
      mark.remove(activeGroup);
      disposeGroup(activeGroup);
    }

    const rawGroup = new THREE.Group();
    const depth = controls.depth;
    const bevelSize = Math.min(controls.bevel, Math.max(0, depth * 0.22));
    const extrude = {
      depth,
      bevelEnabled: bevelSize > 0,
      bevelThickness: bevelSize,
      bevelSize: bevelSize * 0.66,
      bevelSegments: bevelSize > 0 ? 8 : 0,
      curveSegments: 36
    };

    for (const shape of [makeMainShape(), makeRectShape(117.66, 239.21, 74.96, 74.9)]) {
      const geometry = new THREE.ExtrudeGeometry(shape, extrude);
      rawGroup.add(new THREE.Mesh(geometry, [frontMaterial, sideMaterial]));
    }

    const bounds = new THREE.Box3().setFromObject(rawGroup);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const scale = (isCard ? 4.35 : 4.05) / Math.max(size.x, size.y);

    rawGroup.scale.set(scale, -scale, scale);
    rawGroup.position.set(-center.x * scale, center.y * scale, (-center.z - depth * 0.5) * scale);
    mark.add(rawGroup);
    activeGroup = rawGroup;
    mark.scale.setScalar(controls.renderSize);
    root.classList.add("has-webgl");
  };

  const updateRenderSize = () => {
    mark.scale.setScalar(controls.renderSize);
  };

  const applyControlValue = (name, value) => {
    if (controls[name] === value) return;
    controls[name] = value;
    if (name === "renderSize") updateRenderSize();
    if (name === "depth" || name === "bevel") rebuildGeometry();
    if (name === "density") resize();
    if (name === "glow") root.style.setProperty("--pave-ascii-glow", value);
    updateSettingsPayload();
  };

  const resize = () => {
    const rect = root.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const renderScale = Math.min(1, 960 / width, 720 / height);
    renderer.setSize(Math.max(1, Math.floor(width * renderScale)), Math.max(1, Math.floor(height * renderScale)), false);

    const minCols = isCard ? 22 : 56;
    const maxCols = isCard ? 34 : 210;
    const minRows = isCard ? 8 : 30;
    const maxRows = isCard ? 14 : 120;
    cols = Math.max(minCols, Math.min(maxCols, Math.floor(width / controls.density)));
    rows = Math.max(minRows, Math.min(maxRows, Math.floor(height / (controls.density * 1.55))));
    sampleCanvas.width = cols;
    sampleCanvas.height = rows;
    trailBuffer = new Float32Array(cols * rows);

    const size = width / (cols * 0.62);
    ascii.style.fontSize = `${isCard ? Math.max(6.5, Math.min(9, size)) : Math.max(7, size)}px`;
    ascii.style.lineHeight = `${height / rows}px`;
  };

  const eventToGrid = (event) => {
    const rect = root.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(cols - 1, ((event.clientX - rect.left) / rect.width) * (cols - 1))),
      y: Math.max(0, Math.min(rows - 1, ((event.clientY - rect.top) / rect.height) * (rows - 1)))
    };
  };

  const addTrail = (centerX, centerY, strength = 1) => {
    if (isCard || controls.hover <= 0) return;
    const radius = Math.max(4, Math.min(12, cols * 0.045));
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(cols - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(rows - 1, Math.ceil(centerY + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = (x - centerX) / radius;
        const dy = ((y - centerY) / radius) * 1.45;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 1) continue;

        const index = y * cols + x;
        trailBuffer[index] = Math.max(trailBuffer[index], Math.pow(1 - distance, 1.6) * strength);
      }
    }
  };

  const updateTrail = (time) => {
    if (isCard || controls.hover <= 0) return;
    if (!lastTrailTime) {
      lastTrailTime = time;
      return;
    }

    const delta = Math.min(140, Math.max(0, time - lastTrailTime));
    const decay = Math.exp(-delta / 520);
    lastTrailTime = time;

    for (let i = 0; i < trailBuffer.length; i++) {
      const next = trailBuffer[i] * decay;
      trailBuffer[i] = next > 0.01 ? next : 0;
    }
  };

  const toAscii = (time = performance.now()) => {
    if (!sampleContext) return;
    sampleContext.clearRect(0, 0, cols, rows);
    sampleContext.drawImage(renderer.domElement, 0, 0, cols, rows);
    const pixels = sampleContext.getImageData(0, 0, cols, rows).data;
    const lines = [];
    const maxRampIndex = isCard
      ? ramp.length - 1
      : Math.min(ramp.length - 1, Math.max(2, Math.round(controls.glyphDetail)));

    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const index = (y * cols + x) * 4;
        const luma = (pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722) / 255;
        if (luma > 0.965) {
          line += " ";
          continue;
        }

        const darkness = 1 - luma;
        const trail = trailBuffer[y * cols + x] || 0;
        const tone = Math.min(
          1,
          Math.max(0.08, (darkness + controls.brightness - 0.5) * controls.contrast + 0.5 + trail * controls.hover)
        );
        line += ramp[Math.min(maxRampIndex, Math.max(1, Math.floor(tone * maxRampIndex)))];
      }
      lines.push(line);
    }

    ascii.textContent = asciiReveal.render(lines, time);
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const render = (time = 0) => {
    if (!isVisible) {
      window.setTimeout(() => {
        pendingFrame = requestAnimationFrame(render);
      }, 160);
      return;
    }
    if (!lastRenderTime) lastRenderTime = time;
    const delta = Math.min(80, Math.max(0, time - lastRenderTime)) / 1000;
    lastRenderTime = time;

    if (!reduceMotion.matches) turntableAngle += delta * Math.PI * controls.speed;
    mark.rotation.y = reduceMotion.matches ? 0.82 : turntableAngle;
    mark.rotation.z = (isCard ? -0.04 : -0.08) + Math.sin(time * 0.00055) * (isCard ? 0.012 : 0.018);
    renderer.render(scene, camera);
    updateTrail(time);

    if (time - lastAscii > (isCard ? 64 : 42) || reduceMotion.matches) {
      lastAscii = time;
      toAscii(time);
    }

    if (!reduceMotion.matches) pendingFrame = requestAnimationFrame(render);
  };

  const settingsOutput = root.hasAttribute("data-pave-controls") ? document.querySelector("[data-pave-settings]") : null;
  const copyButton = root.hasAttribute("data-pave-controls") ? document.querySelector("[data-pave-copy-settings]") : null;
  const updateSettingsPayload = () => {
    if (!settingsOutput) return;
    settingsOutput.value = JSON.stringify(
      {
        renderer: "pave-symbol-turntable",
        version: 1,
        ramp: isCard ? "header" : "landing",
        controls: Object.fromEntries(
          Object.entries(controls).map(([key, value]) => [key, Number(Number(value).toFixed(3))])
        )
      },
      null,
      2
    );
  };

  if (root.hasAttribute("data-pave-controls")) {
    document.querySelectorAll("[data-pave-control]").forEach((control) => {
      const name = control.dataset.paveControl;
      const output = document.querySelector(`[data-pave-output="${name}"]`);
      const update = () => {
        const value = Number(control.value);
        if (output) output.textContent = Number.isInteger(value) ? String(value) : value.toFixed(2);
        applyControlValue(name, value);
      };
      control.addEventListener("input", update);
      control.addEventListener("change", update);
      update();
    });
  }

  if (copyButton && settingsOutput) {
    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(settingsOutput.value);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy settings JSON";
      }, 900);
    });
  }

  const tabButtons = root.hasAttribute("data-pave-controls") ? document.querySelectorAll("[data-pave-tab]") : [];
  const tabPanels = root.hasAttribute("data-pave-controls") ? document.querySelectorAll("[data-pave-panel]") : [];
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const activeTab = button.dataset.paveTab;
      tabButtons.forEach((tabButton) => {
        const isActive = tabButton.dataset.paveTab === activeTab;
        tabButton.classList.toggle("is-active", isActive);
        tabButton.setAttribute("aria-selected", String(isActive));
      });
      tabPanels.forEach((panel) => {
        const isActive = panel.dataset.pavePanel === activeTab;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
      });
      const controlsPanel = button.closest(".pave-turntable-controls");
      if (controlsPanel && activeTab !== "how" && controlsPanel.classList.contains("is-flipped")) {
        controlsPanel.classList.add("is-flipping-back");
        window.setTimeout(() => controlsPanel.classList.remove("is-flipping-back"), 260);
      }
      controlsPanel?.classList.toggle("is-flipped", activeTab === "how");
    });
  });

  root.addEventListener("pointermove", (event) => {
    const point = eventToGrid(event);
    addTrail(point.x, point.y);
  }, { passive: true });

  if (root.hasAttribute("data-hover-turntable")) {
    const card = root.closest(".project-card");
    card?.addEventListener("pointerenter", () => {
      isVisible = true;
      lastRenderTime = 0;
      asciiReveal.start();
    });
    card?.addEventListener("pointerleave", () => {
      isVisible = false;
    });
    card?.addEventListener("focusin", () => {
      isVisible = true;
      lastRenderTime = 0;
      asciiReveal.start();
    });
    card?.addEventListener("focusout", () => {
      isVisible = false;
    });
  }

  root.addEventListener("turntable-controls:update", (event) => {
    const wasVisible = isVisible;
    isVisible = true;
    if (!wasVisible) asciiReveal.start();
    const values = event.detail || {};
    Object.entries(values).forEach(([name, value]) => {
      if (Object.hasOwn(controls, name)) applyControlValue(name, Number(value));
    });
  });

  if (root.hasAttribute("data-playground-turntable")) {
    const observer = new MutationObserver(() => {
      const wasVisible = isVisible;
      isVisible = root.closest("[data-ascii-playground]")?.dataset.activeTurntable === root.dataset.playgroundTurntable;
      if (isVisible) {
        lastRenderTime = 0;
        if (!wasVisible) asciiReveal.start();
      }
    });
    const playgroundRoot = root.closest("[data-ascii-playground]");
    if (playgroundRoot) observer.observe(playgroundRoot, { attributes: true, attributeFilter: ["data-active-turntable"] });
    isVisible = playgroundRoot?.dataset.activeTurntable === root.dataset.playgroundTurntable;
  }

  new ResizeObserver(resize).observe(root);
  root.style.setProperty("--pave-ascii-glow", controls.glow);
  rebuildGeometry();
  resize();
  updateSettingsPayload();
  if (isVisible) asciiReveal.start();
  pendingFrame = requestAnimationFrame(render);
});
