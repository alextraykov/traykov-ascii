import {
  AlwaysStencilFunc,
  AmbientLight,
  Box3,
  DirectionalLight,
  DoubleSide,
  EqualStencilFunc,
  ExtrudeGeometry,
  Group,
  KeepStencilOp,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  ReplaceStencilOp,
  Scene,
  Shape,
  ShapeGeometry,
  Vector3,
  WebGLRenderer
} from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { createTurntableAsciiReveal } from "./turntable-ascii-reveal.js";
import {
  createStructuralGlyphField,
  SURFACE_ASCII_RAMP
} from "./structural-glyph-field.js";

const ASCII_RAMP = SURFACE_ASCII_RAMP;
const STAGE_ASCII_FRAME_INTERVAL = 1000 / 60;
const CARD_ASCII_FRAME_INTERVAL = 1000 / 30;

export function initializeSasiLogoTurntable(root) {
  const ascii = root.querySelector("[data-sasi-ascii]");
  const skeleton = root.querySelector("[data-sasi-skeleton]");
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

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 8.4);

  const renderer = new WebGLRenderer({
    alpha: false,
    antialias: true,
    stencil: true,
    preserveDrawingBuffer: false
  });
  renderer.setClearColor(0xfbfbf8, 1);
  renderer.setPixelRatio(1);
  root.append(renderer.domElement);

  const mark = new Group();
  mark.rotation.x = -0.18;
  scene.add(mark);

  const frontMaterial = new MeshStandardMaterial({
    color: 0x080808,
    metalness: 0.08,
    roughness: 0.34
  });
  const sideMaterial = new MeshStandardMaterial({
    color: 0x747064,
    metalness: 0.06,
    roughness: 0.62
  });
  const detailMaterial = new MeshStandardMaterial({
    color: 0x080808,
    metalness: 0.03,
    roughness: 0.42
  });
  const inverseBackingMaterial = new MeshStandardMaterial({
    color: 0x080808,
    metalness: 0.03,
    roughness: 0.42,
    side: DoubleSide
  });
  const inverseDetailMaterial = new MeshStandardMaterial({
    color: 0xfbfbf8,
    metalness: 0.02,
    roughness: 0.48,
    side: DoubleSide
  });
  const sharedMaterials = new Set([
    frontMaterial,
    sideMaterial,
    detailMaterial,
    inverseBackingMaterial,
    inverseDetailMaterial
  ]);

  const key = new DirectionalLight(0xffffff, 4.8);
  key.position.set(2.7, 3.2, 4.4);
  scene.add(key);

  const rim = new DirectionalLight(0xffffff, 3.2);
  rim.position.set(-2.6, 1.5, -4.6);
  scene.add(rim);

  const fill = new DirectionalLight(0xd7d2bd, 2.1);
  fill.position.set(-3.1, -0.9, 2.6);
  scene.add(fill);
  scene.add(new AmbientLight(0xffffff, 0.88));

  const sampleCanvas = document.createElement("canvas");
  const sampleContext = sampleCanvas.getContext("2d", { alpha: false, willReadFrequently: true });
  let cols = 120;
  let rows = 70;
  let lastAscii = 0;
  let lastTrailTime = 0;
  let activeGroup = null;
  let sourceGroup = null;
  let trailBuffer = new Float32Array(cols * rows);
  let turntableAngle = 0;
  let lastRenderTime = 0;
  let isVisible = true;
  let pendingFrame = null;
  let geometryRebuildFrame = null;
  let destroyed = false;
  let lastAsciiOutput = ascii.textContent;
  let lastSkeletonOutput = "";
  let sourceDataPromise;
  const asciiReveal = createTurntableAsciiReveal(root, { duration: isCard ? 760 : 1240 });
  const glyphField = createStructuralGlyphField(root, { ramp: ASCII_RAMP });

  const disposeGroup = (group) => {
    group.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (material && !sharedMaterials.has(material)) material.dispose();
      });
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
    const material = new MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      depthTest: false
    });
    material.stencilWrite = true;
    material.stencilRef = ref;
    material.stencilFunc = AlwaysStencilFunc;
    material.stencilFail = ReplaceStencilOp;
    material.stencilZFail = ReplaceStencilOp;
    material.stencilZPass = ReplaceStencilOp;
    return material;
  };

  const cloneStencilMaterial = (material, ref) => {
    const clone = material.clone();
    clone.stencilWrite = true;
    clone.stencilRef = ref;
    clone.stencilFunc = EqualStencilFunc;
    clone.stencilFail = KeepStencilOp;
    clone.stencilZFail = KeepStencilOp;
    clone.stencilZPass = KeepStencilOp;
    return clone;
  };

  const buildSourceGroup = async () => {
    const svgSource = root.dataset.svgSrc || "/sasi2.svg";
    const isPersonalInverse = svgSource.endsWith("/sasi2.svg");

    sourceDataPromise ??= fetch(svgSource)
      .then((response) => {
        if (!response.ok) throw new Error(`SVG load failed: ${response.status}`);
        return response.text();
      })
      .then((svgText) => new SVGLoader().parse(svgText));
    const data = await sourceDataPromise;
    const group = new Group();
    const maskShapes = new Map();
    const maskedPaths = [];
    const maskRefs = new Map();
    const rearBackingZ = -controls.bevel - 0.8;
    const rearDetailZ = rearBackingZ - 0.7;

    const addRearShapes = (shapes) => {
      for (const shape of shapes) {
        const rearGeometry = new ShapeGeometry(shape, 48);
        const rearMesh = new Mesh(rearGeometry, inverseDetailMaterial);
        rearMesh.position.z = rearDetailZ;
        rearMesh.renderOrder = 4;
        group.add(rearMesh);
      }
    };

    if (isPersonalInverse) {
      const headBacking = new Shape();
      headBacking.absellipse(341.46, 365.19, 341.46, 365.19, 0, Math.PI * 2, false, 0);
      const earBacking = new Shape();
      earBacking.absellipse(709.5, 324, 112, 112, 0, Math.PI * 2, false, 0);
      for (const backingShape of [headBacking, earBacking]) {
        const backing = new Mesh(new ShapeGeometry(backingShape, 96), inverseBackingMaterial);
        backing.position.z = rearBackingZ;
        backing.renderOrder = 3;
        group.add(backing);
      }
    }

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
        const shapes = SVGLoader.createShapes(path);
        if (isPersonalInverse) addRearShapes(shapes);
        if (appliedMaskId && maskShapes.has(appliedMaskId)) {
          maskedPaths.push(path);
        } else {
          for (const shape of shapes) {
            const geometry = new ExtrudeGeometry(shape, makeExtrude());
            group.add(new Mesh(geometry, [frontMaterial, sideMaterial]));
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
          const mesh = new Mesh(geometry, detailMaterial);
          mesh.position.z = controls.depth + controls.bevel + 0.6;
          group.add(mesh);
          if (isPersonalInverse) {
            const rearMesh = new Mesh(geometry.clone(), inverseDetailMaterial);
            rearMesh.position.z = rearDetailZ;
            rearMesh.renderOrder = 5;
            group.add(rearMesh);
          }
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
        const maskMesh = new Mesh(new ShapeGeometry(shape, 36), makeStencilMaterial(stencilRef));
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
        const geometry = new ExtrudeGeometry(shape, makeExtrude());
        const mesh = new Mesh(geometry, maskedMaterials);
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
    if (destroyed) {
      disposeGroup(nextGroup);
      return;
    }

    const bounds = new Box3().setFromObject(nextGroup);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
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

  const scheduleGeometryRebuild = () => {
    if (geometryRebuildFrame !== null) return;
    geometryRebuildFrame = requestAnimationFrame(() => {
      geometryRebuildFrame = null;
      rebuildGeometry().catch((error) => {
        ascii.textContent = `sasi.logo.offline\n${String(error.message || error)}`;
      });
    });
  };

  const applyControlValue = (name, value) => {
    if (controls[name] === value) return;
    controls[name] = value;
    if (name === "renderSize") updateRenderSize();
    if ((name === "depth" || name === "bevel") && activeGroup) scheduleGeometryRebuild();
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

    const minCols = isCard ? 24 : 56;
    const maxCols = isCard ? 44 : 210;
    const minRows = isCard ? 10 : 30;
    const maxRows = isCard ? 18 : 120;
    cols = Math.max(minCols, Math.min(maxCols, Math.floor(width / controls.density)));
    rows = Math.max(minRows, Math.min(maxRows, Math.floor(height / (controls.density * 1.55))));

    const sourceScale = isCard ? 2 : 1.25;
    const renderWidth = Math.max(1, Math.min(width, Math.floor(cols * sourceScale)));
    const renderHeight = Math.max(1, Math.min(height, Math.floor(renderWidth * (height / width))));
    renderer.setSize(renderWidth, renderHeight, false);

    sampleCanvas.width = cols;
    sampleCanvas.height = rows;
    trailBuffer = new Float32Array(cols * rows);

    ascii.style.fontSize = `${isCard ? Math.max(6.5, Math.min(9, width / (cols * 0.62))) : Math.max(7, width / (cols * 0.62))}px`;
    ascii.style.lineHeight = `${height / rows}px`;
    if (skeleton) {
      skeleton.style.fontSize = ascii.style.fontSize;
      skeleton.style.lineHeight = ascii.style.lineHeight;
      skeleton.textContent = "";
      lastSkeletonOutput = "";
    }
    glyphField.resize(cols, rows);
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
    sampleContext.drawImage(renderer.domElement, 0, 0, cols, rows);
    const pixels = sampleContext.getImageData(0, 0, cols, rows).data;
    const baseGlyphs = new Array(cols * rows).fill(" ");
    const objectMask = new Uint8Array(cols * rows);
    const sourceScores = new Float32Array(cols * rows);
    const maxRampIndex = Math.min(ASCII_RAMP.length - 1, Math.max(2, Math.round(controls.glyphDetail)));

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const index = (y * cols + x) * 4;
        const luma = (pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722) / 255;
        const cellIndex = y * cols + x;
        objectMask[cellIndex] = luma < 0.94 ? 1 : 0;
        if (luma > 0.965 || !objectMask[cellIndex]) continue;
        const darkness = 1 - luma;
        const trail = trailBuffer[cellIndex] || 0;
        const tone = Math.min(
          1,
          Math.max(0.08, (darkness + controls.brightness - 0.5) * controls.contrast + 0.5 + trail * controls.hover)
        );
        baseGlyphs[cellIndex] =
          ASCII_RAMP[Math.min(maxRampIndex, Math.max(1, Math.floor(tone * maxRampIndex)))];
        sourceScores[cellIndex] = tone;
      }
    }

    glyphField.setSource(baseGlyphs, objectMask, sourceScores);
    const composed = glyphField.compose(baseGlyphs, sourceScores);
    const lines = [];
    for (let y = 0; y < rows; y += 1) {
      lines.push(composed.slice(y * cols, (y + 1) * cols).join(""));
    }
    if (skeleton) {
      const skeletonOutput = glyphField.skeletonLines().join("\n");
      if (skeletonOutput !== lastSkeletonOutput) {
        skeleton.textContent = skeletonOutput;
        lastSkeletonOutput = skeletonOutput;
      }
    }

    const output = asciiReveal.render(lines, time);
    if (output !== lastAsciiOutput) {
      ascii.textContent = output;
      lastAsciiOutput = output;
    }
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
  const activateTab = (button) => {
      const activeTab = button.dataset.sasiTab;
      tabButtons.forEach((tabButton) => {
        const isActive = tabButton.dataset.sasiTab === activeTab;
        tabButton.classList.toggle("is-active", isActive);
        tabButton.setAttribute("aria-selected", String(isActive));
        tabButton.tabIndex = isActive ? 0 : -1;
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
  };

  tabButtons.forEach((button, index) => {
    button.addEventListener("click", () => activateTab(button));
    button.addEventListener("keydown", (event) => {
      const tabs = [...tabButtons];
      let nextIndex;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      if (nextIndex === undefined) return;
      event.preventDefault();
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex]);
    });
  });

  root.addEventListener("pointermove", (event) => {
    const point = eventToGrid(event);
    addTrail(point.x, point.y);
  }, { passive: true });

  root.addEventListener("turntable-controls:update", (event) => {
    const wasVisible = isVisible;
    isVisible = true;
    if (!wasVisible) asciiReveal.start();
    const values = event.detail || {};
    Object.entries(values).forEach(([name, value]) => {
      if (Object.hasOwn(controls, name)) applyControlValue(name, Number(value));
    });
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const render = (time = 0) => {
    pendingFrame = null;
    if (!isVisible || document.hidden) return;
    const frameInterval = isCard ? CARD_ASCII_FRAME_INTERVAL : STAGE_ASCII_FRAME_INTERVAL;
    if (lastRenderTime && time - lastRenderTime < frameInterval - 1) {
      pendingFrame = requestAnimationFrame(render);
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
    glyphField.update(time);

    if (time - lastAscii > frameInterval || reduceMotion.matches) {
      lastAscii = time;
      toAscii(time);
    }

    if (!reduceMotion.matches) pendingFrame = requestAnimationFrame(render);
  };

  const onEligibility = (event) => {
    const wasVisible = isVisible;
    isVisible = Boolean(event.detail?.active);
    if (!isVisible) {
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      pendingFrame = null;
      return;
    }
    lastRenderTime = 0;
    if (!wasVisible) asciiReveal.start();
    if (!pendingFrame) pendingFrame = requestAnimationFrame(render);
  };
  root.addEventListener("turntable-eligibility", onEligibility);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);
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

  return {
    destroy() {
      destroyed = true;
      isVisible = false;
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      if (geometryRebuildFrame !== null) cancelAnimationFrame(geometryRebuildFrame);
      resizeObserver.disconnect();
      root.removeEventListener("turntable-eligibility", onEligibility);
      glyphField.destroy();
      disposeGroup(mark);
      frontMaterial.dispose();
      sideMaterial.dispose();
      detailMaterial.dispose();
      inverseBackingMaterial.dispose();
      inverseDetailMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
