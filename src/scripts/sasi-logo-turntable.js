import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { createTurntableAsciiReveal } from "./turntable-ascii-reveal.js";

const ASCII_RAMP = [" ", "·", "•", "+", "*", "✦", "✶", "✷", "✸", "✹"];

document.querySelectorAll("[data-sasi-logo-turntable]").forEach((root) => {
  const ascii = root.querySelector("[data-sasi-ascii]");
  if (!ascii) return;
  root.classList.add("is-turntable-loading");

  const isCard = root.closest(".project-card") !== null;
  const controls = {
    speed: isCard ? 0.24 : 0.28,
    depth: Number(root.dataset.cardDepth || 54),
    bevel: Number(root.dataset.cardBevel || 3.2),
    density: Number(root.dataset.cardDensity || (isCard ? 6 : 9)),
    renderSize: Number(root.dataset.renderSize || 1),
    brightness: Number(root.dataset.cardBrightness || -0.03),
    contrast: Number(root.dataset.cardContrast || 1.42),
    glyphDetail: Number(root.dataset.cardGlyphDetail || 4),
    hover: isCard ? 0 : 0.3,
    glow: Number(root.dataset.cardGlow || 0.18)
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 8.4);

  const renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: true,
    stencil: true,
    preserveDrawingBuffer: false
  });
  renderer.setClearColor(0xfbfbf8, 1);
  renderer.setPixelRatio(1);
  root.append(renderer.domElement);

  const mark = new THREE.Group();
  mark.rotation.x = -0.18;
  scene.add(mark);

  const frontMaterial = new THREE.MeshStandardMaterial({
    color: 0x080808,
    metalness: 0.08,
    roughness: 0.34,
    side: THREE.DoubleSide
  });
  const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0x747064,
    metalness: 0.06,
    roughness: 0.62,
    side: THREE.DoubleSide
  });
  const detailMaterial = new THREE.MeshStandardMaterial({
    color: 0x080808,
    metalness: 0.03,
    roughness: 0.42,
    side: THREE.DoubleSide
  });

  const key = new THREE.DirectionalLight(0xffffff, 4.8);
  key.position.set(2.7, 3.2, 4.4);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xffffff, 3.2);
  rim.position.set(-2.6, 1.5, -4.6);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xd7d2bd, 2.1);
  fill.position.set(-3.1, -0.9, 2.6);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.88));

  const sampleCanvas = document.createElement("canvas");
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
  let cols = 120;
  let rows = 70;
  let lastAscii = 0;
  let lastTrailTime = 0;
  let activeGroup = null;
  let sourceGroup = null;
  let trailBuffer = new Float32Array(cols * rows);
  let turntableAngle = 0;
  let lastRenderTime = 0;
  let isVisible = !root.hasAttribute("data-playground-turntable") && !root.hasAttribute("data-hover-turntable");
  let pendingFrame = null;
  const asciiReveal = createTurntableAsciiReveal(root, { duration: isCard ? 760 : 1240 });

  const disposeGroup = (group) => {
    group.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose();
    });
  };

  const colorIsWhite = (value) => {
    if (!value) return false;
    const color = String(value).trim().toLowerCase();
    return color === "white" || color === "#fff" || color === "#ffffff" || color === "rgb(255,255,255)";
  };

  const getMaskDefinitionId = (node) => {
    const parent = node?.parentElement;
    return parent?.nodeName?.toLowerCase() === "mask" ? parent.id : null;
  };

  const getAppliedMaskId = (node) => {
    let current = node;
    while (current) {
      const mask = current.getAttribute?.("mask");
      const match = mask?.match(/#([^)]+)/);
      if (match) return match[1];
      current = current.parentElement;
    }
    return null;
  };

  const makeStencilMaterial = (ref) => {
    const material = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide
    });
    material.stencilWrite = true;
    material.stencilRef = ref;
    material.stencilFunc = THREE.AlwaysStencilFunc;
    material.stencilFail = THREE.ReplaceStencilOp;
    material.stencilZFail = THREE.ReplaceStencilOp;
    material.stencilZPass = THREE.ReplaceStencilOp;
    return material;
  };

  const cloneStencilMaterial = (material, ref) => {
    const clone = material.clone();
    clone.stencilWrite = true;
    clone.stencilRef = ref;
    clone.stencilFunc = THREE.EqualStencilFunc;
    clone.stencilFail = THREE.KeepStencilOp;
    clone.stencilZFail = THREE.KeepStencilOp;
    clone.stencilZPass = THREE.KeepStencilOp;
    return clone;
  };

  const buildSourceGroup = async () => {
    const svgText = await fetch(root.dataset.svgSrc || "/sasi2.svg").then((response) => {
      if (!response.ok) throw new Error(`SVG load failed: ${response.status}`);
      return response.text();
    });
    const loader = new SVGLoader();
    const data = loader.parse(svgText);
    const group = new THREE.Group();
    const maskShapes = new Map();
    const maskedPaths = [];
    const maskRefs = new Map();

    for (const path of data.paths) {
      const node = path.userData?.node;
      const maskDefinitionId = getMaskDefinitionId(node);
      if (!maskDefinitionId) continue;

      const shapes = SVGLoader.createShapes(path);
      if (!maskShapes.has(maskDefinitionId)) maskShapes.set(maskDefinitionId, []);
      maskShapes.get(maskDefinitionId).push(...shapes);
    }

    for (const path of data.paths) {
      const node = path.userData?.node;
      const maskDefinitionId = getMaskDefinitionId(node);
      if (maskDefinitionId) continue;

      const style = path.userData?.style || {};
      const appliedMaskId = getAppliedMaskId(node);
      const fill = style.fill;
      const fillOpacity = Number(style.fillOpacity ?? style.opacity ?? 1);

      if (fill && fill !== "none" && fillOpacity > 0.01 && !colorIsWhite(fill)) {
        if (appliedMaskId && maskShapes.has(appliedMaskId)) {
          maskedPaths.push(path);
        } else {
          const shapes = SVGLoader.createShapes(path);
          for (const shape of shapes) {
            const geometry = new THREE.ExtrudeGeometry(shape, makeExtrude());
            group.add(new THREE.Mesh(geometry, [frontMaterial, sideMaterial]));
          }
        }
      }

      const stroke = style.stroke;
      const strokeOpacity = Number(style.strokeOpacity ?? style.opacity ?? 1);
      const strokeWidth = Number(style.strokeWidth || 0);
      if (stroke && stroke !== "none" && strokeWidth > 0 && strokeOpacity > 0.01 && !colorIsWhite(stroke)) {
        for (const subPath of path.subPaths) {
          const points = subPath.getPoints(48);
          const geometry = SVGLoader.pointsToStroke(points, {
            strokeWidth,
            strokeColor: stroke,
            strokeLineJoin: style.strokeLineJoin || "round",
            strokeLineCap: style.strokeLineCap || "round",
            strokeMiterLimit: style.strokeMiterLimit || 4
          });
          if (!geometry) continue;
          geometry.computeVertexNormals();
          const mesh = new THREE.Mesh(geometry, detailMaterial);
          mesh.position.z = controls.depth + controls.bevel + 0.6;
          group.add(mesh);
        }
      }
    }

    maskedPaths.forEach((path, index) => {
      const maskId = getAppliedMaskId(path.userData?.node);
      if (!maskId || !maskShapes.has(maskId)) return;

      if (!maskRefs.has(maskId)) maskRefs.set(maskId, maskRefs.size + 1);
      const stencilRef = maskRefs.get(maskId);
      const renderOrder = 10 + index * 2;

      for (const shape of maskShapes.get(maskId)) {
        const maskMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 36), makeStencilMaterial(stencilRef));
        maskMesh.position.z = controls.depth + controls.bevel + 4;
        maskMesh.renderOrder = renderOrder;
        group.add(maskMesh);
      }

      const shapes = SVGLoader.createShapes(path);
      const maskedMaterials = [
        cloneStencilMaterial(frontMaterial, stencilRef),
        cloneStencilMaterial(sideMaterial, stencilRef)
      ];
      for (const shape of shapes) {
        const geometry = new THREE.ExtrudeGeometry(shape, makeExtrude());
        const mesh = new THREE.Mesh(geometry, maskedMaterials);
        mesh.renderOrder = renderOrder + 1;
        group.add(mesh);
      }
    });

    return group;
  };

  const makeExtrude = () => {
    const bevelSize = Math.min(controls.bevel, Math.max(0, controls.depth * 0.2));
    return {
      depth: controls.depth,
      bevelEnabled: bevelSize > 0,
      bevelThickness: bevelSize,
      bevelSize: bevelSize * 0.62,
      bevelSegments: bevelSize > 0 ? 7 : 0,
      curveSegments: 32
    };
  };

  const rebuildGeometry = async () => {
    const nextGroup = await buildSourceGroup();

    const bounds = new THREE.Box3().setFromObject(nextGroup);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 4.25 / Math.max(size.x, size.y);

    nextGroup.scale.set(scale, -scale, scale);
    nextGroup.position.set(-center.x * scale, center.y * scale, (-center.z - controls.depth * 0.5) * scale);

    const previousGroup = activeGroup;
    mark.add(nextGroup);
    activeGroup = nextGroup;
    sourceGroup = nextGroup;
    if (previousGroup) {
      mark.remove(previousGroup);
      disposeGroup(previousGroup);
    }
    mark.scale.setScalar(controls.renderSize);
    root.classList.add("has-webgl");
  };

  const updateRenderSize = () => {
    mark.scale.setScalar(controls.renderSize);
  };

  const applyControlValue = async (name, value) => {
    if (controls[name] === value) return;
    controls[name] = value;
    if (name === "renderSize") updateRenderSize();
    if ((name === "depth" || name === "bevel") && activeGroup) await rebuildGeometry();
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

    const minCols = isCard ? 24 : 56;
    const maxCols = isCard ? 44 : 210;
    const minRows = isCard ? 10 : 30;
    const maxRows = isCard ? 18 : 120;
    cols = Math.max(minCols, Math.min(maxCols, Math.floor(width / controls.density)));
    rows = Math.max(minRows, Math.min(maxRows, Math.floor(height / (controls.density * 1.55))));
    sampleCanvas.width = cols;
    sampleCanvas.height = rows;
    trailBuffer = new Float32Array(cols * rows);

    ascii.style.fontSize = `${isCard ? Math.max(6.5, Math.min(9, width / (cols * 0.62))) : Math.max(7, width / (cols * 0.62))}px`;
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
    if (controls.hover <= 0) return;
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
    if (controls.hover <= 0) return;
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
    const maxRampIndex = Math.min(ASCII_RAMP.length - 1, Math.max(2, Math.round(controls.glyphDetail)));

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
        line += ASCII_RAMP[Math.min(maxRampIndex, Math.max(1, Math.floor(tone * maxRampIndex)))];
      }
      lines.push(line);
    }

    ascii.textContent = asciiReveal.render(lines, time);
  };

  const settingsOutput = document.querySelector("[data-sasi-settings]");
  const copyButton = document.querySelector("[data-sasi-copy-settings]");
  const updateSettingsPayload = () => {
    if (!settingsOutput) return;
    settingsOutput.value = JSON.stringify(
      {
        renderer: `${root.dataset.turntableName || "sasi"}-logo-turntable`,
        version: 1,
        svg: root.dataset.svgSrc || "/sasi2.svg",
        ramp: "landing",
        controls: Object.fromEntries(
          Object.entries(controls).map(([key, value]) => [key, Number(Number(value).toFixed(3))])
        )
      },
      null,
      2
    );
  };

  document.querySelectorAll("[data-sasi-control]").forEach((control) => {
    const name = control.dataset.sasiControl;
    const output = document.querySelector(`[data-sasi-output="${name}"]`);
    const update = async () => {
      const value = Number(control.value);
      if (output) output.textContent = Number.isInteger(value) ? String(value) : value.toFixed(2);
      await applyControlValue(name, value);
    };
    control.addEventListener("input", update);
    control.addEventListener("change", update);
    update();
  });

  if (copyButton && settingsOutput) {
    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(settingsOutput.value);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy settings JSON";
      }, 900);
    });
  }

  const tabButtons = document.querySelectorAll("[data-sasi-tab]");
  const tabPanels = document.querySelectorAll("[data-sasi-panel]");
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const activeTab = button.dataset.sasiTab;
      tabButtons.forEach((tabButton) => {
        const isActive = tabButton.dataset.sasiTab === activeTab;
        tabButton.classList.toggle("is-active", isActive);
        tabButton.setAttribute("aria-selected", String(isActive));
      });
      tabPanels.forEach((panel) => {
        const isActive = panel.dataset.sasiPanel === activeTab;
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
    const playgroundRoot = root.closest("[data-ascii-playground]");
    const observer = new MutationObserver(() => {
      const wasVisible = isVisible;
      isVisible = playgroundRoot?.dataset.activeTurntable === root.dataset.playgroundTurntable;
      if (isVisible) {
        lastRenderTime = 0;
        if (!wasVisible) asciiReveal.start();
      }
    });
    if (playgroundRoot) observer.observe(playgroundRoot, { attributes: true, attributeFilter: ["data-active-turntable"] });
    isVisible = playgroundRoot?.dataset.activeTurntable === root.dataset.playgroundTurntable;
  }

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
    mark.rotation.z = -0.06 + Math.sin(time * 0.00055) * 0.016;
    renderer.render(scene, camera);
    updateTrail(time);

    if (time - lastAscii > (isCard ? 64 : 42) || reduceMotion.matches) {
      lastAscii = time;
      toAscii(time);
    }

    if (!reduceMotion.matches) pendingFrame = requestAnimationFrame(render);
  };

  new ResizeObserver(resize).observe(root);
  root.style.setProperty("--pave-ascii-glow", controls.glow);
  resize();
  rebuildGeometry()
    .then(() => {
      updateSettingsPayload();
      if (isVisible) asciiReveal.start();
      pendingFrame = requestAnimationFrame(render);
    })
    .catch((error) => {
      ascii.textContent = `sasi.logo.offline\n${String(error.message || error)}`;
    });
});
