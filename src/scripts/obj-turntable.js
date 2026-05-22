import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { createTurntableAsciiReveal } from "./turntable-ascii-reveal.js";

const ASCII_RAMP = [" ", "·", "•", "+", "*", "✦", "✶", "✷", "✸", "✹"];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/gltf/");
dracoLoader.setDecoderConfig({ type: "wasm" });
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
const objLoader = new OBJLoader();

document.querySelectorAll("[data-obj-turntable]").forEach((root) => {
  const ascii = root.querySelector("[data-obj-ascii]");
  if (!ascii) return;
  root.classList.add("is-turntable-loading");

  const isCard = root.closest(".project-card") !== null;
  const isAboutTurntable = root.classList.contains("about-turntable");
  const isMeTurntable = (root.dataset.turntableName || "").toLowerCase() === "me";
  const useRepulsion = isAboutTurntable || root.classList.contains("pave-turntable-stage");
  const useDeviceMotion = isAboutTurntable;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const controls = {
    speed: isCard ? 0.2 : 0.24,
    density: Number(root.dataset.cardDensity || (isCard ? 6 : 5)),
    renderSize: Number(root.dataset.renderSize || 0.66),
    brightness: Number(root.dataset.cardBrightness || -0.02),
    contrast: Number(root.dataset.cardContrast || 1.42),
    glyphDetail: Number(root.dataset.cardGlyphDetail || 9),
    hover: isCard ? 0 : isAboutTurntable ? 0.18 : 0.28,
    click: Number(root.dataset.cardClick || (isCard ? 0 : 0.46)),
    glow: Number(root.dataset.cardGlow || 0.18),
    enableReveal: Number(root.dataset.cardEnableReveal || 1),
    revealDuration: Number(root.dataset.cardRevealDuration || (isMeTurntable ? 1780 : isCard ? 760 : 1280)),
    revealScatter: Number(root.dataset.cardRevealScatter || 0.55),
    enableDisperse: Number(root.dataset.cardEnableDisperse || (isAboutTurntable ? 0 : 1)),
    disperse: Number(root.dataset.cardDisperse || (isAboutTurntable ? 0.22 : 1)),
    magnetism: Number(root.dataset.cardMagnetism || 1),
    disperseRadius: Number(root.dataset.cardDisperseRadius || (isAboutTurntable ? 0.42 : 1)),
    trailDecay: Number(root.dataset.cardTrailDecay || (isAboutTurntable ? 0.62 : 1)),
    enableExplosion: Number(root.dataset.cardEnableExplosion || 1),
    explosion: Number(root.dataset.cardExplosion || 1),
    explosionRadius: Number(root.dataset.cardExplosionRadius || 1),
    ripple: Number(root.dataset.cardRipple || 1),
    enableColorClick: Number(root.dataset.cardEnableColorClick || 0),
    colorClick: Number(root.dataset.cardColorClick || 1),
    enableColorDisperse: Number(root.dataset.cardEnableColorDisperse || 0),
    colorDisperse: Number(root.dataset.cardColorDisperse || 1)
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.18, 8.2);

  const renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: false
  });
  renderer.setClearColor(0xfbfbf8, 1);
  renderer.setPixelRatio(1);
  root.append(renderer.domElement);

  const model = new THREE.Group();
  model.rotation.x = -0.2;
  model.rotation.z = -0.05;
  scene.add(model);

  const motionShaderUniforms = {
    uMotionTilt: { value: new THREE.Vector2(0, 0) },
    uMotionShake: { value: 0 },
    uMotionPhase: { value: 0 }
  };
  const surfaceMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0,
    roughness: 0.56,
    side: THREE.DoubleSide
  });
  surfaceMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uMotionTilt = motionShaderUniforms.uMotionTilt;
    shader.uniforms.uMotionShake = motionShaderUniforms.uMotionShake;
    shader.uniforms.uMotionPhase = motionShaderUniforms.uMotionPhase;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `
#include <common>
uniform vec2 uMotionTilt;
uniform float uMotionShake;
uniform float uMotionPhase;
`
      )
      .replace(
        "#include <begin_vertex>",
        `
#include <begin_vertex>
float objMotionWave = sin(position.x * 3.4 + position.y * 1.7 + uMotionPhase * 3.1) *
  cos(position.z * 2.9 - uMotionPhase * 2.2);
float objMotionEdge = length(position.xy) * 0.18;
transformed += normal * objMotionWave * uMotionShake * (0.34 + objMotionEdge);
transformed.x += uMotionTilt.x * (0.28 + abs(position.y) * 0.055) + objMotionWave * uMotionShake * 0.085;
transformed.y -= uMotionTilt.y * (0.22 + abs(position.x) * 0.042);
`
      );
  };

  const key = new THREE.DirectionalLight(0xffffff, 5.4);
  key.position.set(2.4, 3.4, 4.6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xffffff, 3.8);
  rim.position.set(-3.4, 1.4, -4.2);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffffff, 2.4);
  fill.position.set(-3.2, -1.2, 2.8);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.82));

  const sampleCanvas = document.createElement("canvas");
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
  let cols = 120;
  let rows = 70;
  let lastAscii = 0;
  let lastTrailTime = 0;
  let trailBuffer = new Float32Array(cols * rows);
  let waveCurrent = new Float32Array(cols * rows);
  let wavePrevious = new Float32Array(cols * rows);
  let waveNext = new Float32Array(cols * rows);
  let objectMask = new Uint8Array(cols * rows);
  let turntableAngle = 0;
  let lastRenderTime = 0;
  let hoverPoint = { x: 0, y: 0, heat: 0 };
  let explosionPoint = { x: 0, y: 0, heat: 0 };
  const motion = {
    baselineBeta: null,
    baselineGamma: null,
    targetTiltX: 0,
    targetTiltY: 0,
    tiltX: 0,
    tiltY: 0,
    shake: 0,
    impulse: 0,
    spin: 0,
    phase: 0,
    impactX: 0.5,
    impactY: 0.5,
    lastAcceleration: null,
    permissionRequested: false,
    listening: false
  };
  let isVisible = !root.hasAttribute("data-playground-turntable") && !root.hasAttribute("data-hover-turntable");
  let pendingFrame = null;
  const asciiReveal = createTurntableAsciiReveal(root, {
    duration: controls.revealDuration,
    mode: isMeTurntable ? "reload" : "characters",
    scatter: controls.revealScatter,
    rippleRows: root.classList.contains("about-turntable") ? 2.6 : 2.2,
    lineDurationRatio: isMeTurntable ? 0.56 : 0.5,
    enabled: controls.enableReveal > 0
  });

  const disposeGroup = (group) => {
    group.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose();
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => material?.dispose?.());
      } else if (node.material && node.material !== surfaceMaterial) {
        node.material.dispose?.();
      }
    });
  };

  const normalizeObject = (object) => {
    object.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry.computeBoundingBox();
      if (!node.geometry.attributes.normal) node.geometry.computeVertexNormals();
      node.material = surfaceMaterial;
      node.castShadow = false;
      node.receiveShadow = false;
    });

    const bounds = new THREE.Box3().setFromObject(object);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 4.6 / Math.max(size.x, size.y, size.z);
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  };

  const loadModel = async () => {
    const source = root.dataset.objSrc || "/models/me.glb";
    const extension = source.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
    const object =
      extension === "glb" || extension === "gltf"
        ? (await gltfLoader.loadAsync(source)).scene
        : await objLoader.loadAsync(source);
    normalizeObject(object);
    model.clear();
    model.add(object);
    model.scale.setScalar(controls.renderSize);
    root.classList.add("has-webgl");
  };

  const updateRenderSize = () => {
    model.scale.setScalar(controls.renderSize);
  };

  const shouldDisplace = () =>
    useRepulsion || controls.enableDisperse > 0 || controls.enableExplosion > 0 || controls.enableColorDisperse > 0;

  const applyControlValue = (name, value) => {
    if (controls[name] === value) return;
    controls[name] = value;
    if (name === "renderSize") updateRenderSize();
    if (name === "density") resize();
    if (name === "glow") root.style.setProperty("--pave-ascii-glow", value);
    if (name === "revealDuration" || name === "revealScatter" || name === "enableReveal") {
      asciiReveal.setOptions({
        duration: controls.revealDuration,
        mode: isMeTurntable ? "reload" : "characters",
        scatter: controls.revealScatter,
        rippleRows: root.classList.contains("about-turntable") ? 2.6 : 2.2,
        lineDurationRatio: isMeTurntable ? 0.56 : 0.5,
        enabled: controls.enableReveal > 0
      });
      if (isVisible) asciiReveal.start();
    }
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
    waveCurrent = new Float32Array(cols * rows);
    wavePrevious = new Float32Array(cols * rows);
    waveNext = new Float32Array(cols * rows);
    objectMask = new Uint8Array(cols * rows);

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

  const hasObjectAt = (centerX, centerY, radius = 2) => {
    if (!sampleContext || !renderer.domElement.width || !renderer.domElement.height) return false;
    sampleContext.clearRect(0, 0, cols, rows);
    sampleContext.drawImage(renderer.domElement, 0, 0, cols, rows);
    const framePixels = sampleContext.getImageData(0, 0, cols, rows).data;
    updateObjectMask(framePixels);

    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(cols - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(rows - 1, Math.ceil(centerY + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (objectMask[y * cols + x]) return true;
      }
    }

    return false;
  };

  const updateObjectMask = (pixels) => {
    objectMask.fill(0);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const index = (y * cols + x) * 4;
        const luma = (pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722) / 255;
        objectMask[y * cols + x] = luma < 0.94 ? 1 : 0;
      }
    }
  };

  const addTrail = (centerX, centerY, strength = 1) => {
    if (controls.hover <= 0) return;
    const radiusBase = useRepulsion ? Math.max(6, Math.min(18, cols * 0.068)) : Math.max(4, Math.min(12, cols * 0.045));
    const radius = radiusBase * Math.max(0.2, controls.disperseRadius);
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
        trailBuffer[index] = Math.max(
          trailBuffer[index],
          Math.pow(1 - distance, useRepulsion ? 1.35 : 1.6) * strength * Math.max(0, controls.disperse)
        );
      }
    }
  };

  const updateTrail = (time) => {
    if (!lastTrailTime) {
      lastTrailTime = time;
      return;
    }
    const delta = Math.min(140, Math.max(0, time - lastTrailTime));
    const decay = Math.exp(-delta / ((useRepulsion ? 980 : 520) * Math.max(0.18, controls.trailDecay)));
    lastTrailTime = time;
    hoverPoint.heat = hoverPoint.heat * decay > 0.01 ? hoverPoint.heat * decay : 0;
    const explosionDecay = Math.exp(-delta / 420);
    explosionPoint.heat = explosionPoint.heat * explosionDecay > 0.012 ? explosionPoint.heat * explosionDecay : 0;
    const clickTint =
      controls.enableColorClick > 0
        ? Math.min(1, explosionPoint.heat * Math.max(0, controls.click) * Math.max(0, controls.colorClick))
        : 0;
    const disperseTint =
      controls.enableColorDisperse > 0
        ? Math.min(1, hoverPoint.heat * Math.max(0, controls.hover) * Math.max(0, controls.colorDisperse))
        : 0;
    root.style.setProperty("--obj-click-tint", clickTint.toFixed(3));
    root.style.setProperty("--obj-disperse-tint", disperseTint.toFixed(3));
    if (controls.hover <= 0) return;
    for (let i = 0; i < trailBuffer.length; i++) {
      const next = trailBuffer[i] * decay;
      trailBuffer[i] = next > 0.01 ? next : 0;
    }
  };

  const markHoverPoint = (point, strength = 1) => {
    hoverPoint = {
      x: point.x,
      y: point.y,
      heat: Math.max(hoverPoint.heat, strength)
    };
  };

  const markExplosionPoint = (point, strength = 1) => {
    explosionPoint = {
      x: point.x,
      y: point.y,
      heat: Math.max(explosionPoint.heat, strength)
    };
  };

  const handleDeviceOrientation = (event) => {
    if (!useDeviceMotion || reduceMotion.matches) return;
    const beta = Number(event.beta);
    const gamma = Number(event.gamma);
    if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return;

    motion.baselineBeta ??= beta;
    motion.baselineGamma ??= gamma;
    motion.targetTiltX = clamp((gamma - motion.baselineGamma) / 20, -1.6, 1.6);
    motion.targetTiltY = clamp((beta - motion.baselineBeta) / 26, -1.6, 1.6);
  };

  const handleDeviceMotion = (event) => {
    if (!useDeviceMotion || reduceMotion.matches) return;
    const source = event.acceleration || event.accelerationIncludingGravity;
    if (!source) return;

    const acceleration = {
      x: Number(source.x) || 0,
      y: Number(source.y) || 0,
      z: Number(source.z) || 0
    };
    const previous = motion.lastAcceleration;
    motion.lastAcceleration = acceleration;
    if (!previous) return;

    const delta = Math.hypot(
      acceleration.x - previous.x,
      acceleration.y - previous.y,
      acceleration.z - previous.z
    );
    const shake = clamp((delta - 0.9) / 7.5, 0, 2.2);
    if (shake <= 0) return;

    motion.shake = Math.max(motion.shake, shake);
    motion.impulse = Math.max(motion.impulse, shake);
    motion.impactX = clamp(0.5 + acceleration.x / 24 + motion.targetTiltX * 0.18, 0.12, 0.88);
    motion.impactY = clamp(0.5 - acceleration.y / 24 + motion.targetTiltY * 0.14, 0.16, 0.84);

    const rotationRate = event.rotationRate;
    if (rotationRate) {
      const betaRate = Number(rotationRate.beta) || 0;
      const gammaRate = Number(rotationRate.gamma) || 0;
      motion.spin += clamp((betaRate + gammaRate) / 560, -0.68, 0.68);
    }
  };

  const startDeviceMotion = () => {
    if (!useDeviceMotion || motion.listening || reduceMotion.matches) return;
    motion.listening = true;
    root.classList.add("has-device-motion");
    window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });
    window.addEventListener("devicemotion", handleDeviceMotion, { passive: true });
  };

  const requestDeviceMotion = async (requiresGesture = false) => {
    if (!useDeviceMotion || motion.listening || reduceMotion.matches) return;
    const orientationRequest = globalThis.DeviceOrientationEvent?.requestPermission;
    const motionRequest = globalThis.DeviceMotionEvent?.requestPermission;

    if ((typeof orientationRequest === "function" || typeof motionRequest === "function") && !requiresGesture) {
      return;
    }

    if (motion.permissionRequested) return;
    motion.permissionRequested = true;

    try {
      const orientationPermission =
        typeof orientationRequest === "function" ? await orientationRequest.call(globalThis.DeviceOrientationEvent) : "granted";
      const motionPermission =
        typeof motionRequest === "function" ? await motionRequest.call(globalThis.DeviceMotionEvent) : "granted";

      if (orientationPermission === "granted" || motionPermission === "granted") startDeviceMotion();
    } catch {
      motion.permissionRequested = false;
    }
  };

  const updateDeviceMotionPhysics = (delta) => {
    if (!useDeviceMotion || reduceMotion.matches) return;
    const smoothing = 1 - Math.exp(-delta * 9.5);
    motion.tiltX += (motion.targetTiltX - motion.tiltX) * smoothing;
    motion.tiltY += (motion.targetTiltY - motion.tiltY) * smoothing;
    motion.shake *= Math.exp(-delta * 3.8);
    motion.spin *= Math.exp(-delta * 2.4);
    motion.phase += delta * (2.2 + motion.shake * 8);
    motionShaderUniforms.uMotionTilt.value.set(motion.tiltX, motion.tiltY);
    motionShaderUniforms.uMotionShake.value = Math.min(1.8, motion.shake);
    motionShaderUniforms.uMotionPhase.value = motion.phase;

    if (motion.impulse > 0.18) {
      const impact = {
        x: clamp(motion.impactX * (cols - 1), 1, cols - 2),
        y: clamp(motion.impactY * (rows - 1), 1, rows - 2)
      };
      markHoverPoint(impact, 0.82 + motion.impulse * 0.45);
      markExplosionPoint(impact, 0.56 + motion.impulse * 0.72);
      addTrail(impact.x, impact.y, 0.7 + motion.impulse * 0.82);
      injectRipple(impact.x, impact.y);
      motion.impulse *= 0.45;
    } else {
      motion.impulse = 0;
    }
  };

  const injectRipple = (centerX, centerY) => {
    if (controls.click <= 0 || controls.enableExplosion <= 0 || controls.ripple <= 0) return;
    const radius = Math.max(3, Math.min(8, cols * 0.036));
    const minX = Math.max(1, Math.floor(centerX - radius));
    const maxX = Math.min(cols - 2, Math.ceil(centerX + radius));
    const minY = Math.max(1, Math.floor(centerY - radius));
    const maxY = Math.min(rows - 2, Math.ceil(centerY + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const distance = Math.hypot(x - centerX, (y - centerY) * 1.45);
        if (distance > radius) continue;
        const index = y * cols + x;
        if (!objectMask[index]) continue;
        waveCurrent[index] += Math.cos((distance / radius) * Math.PI * 0.5) * 1.85 * Math.max(0, controls.ripple);
      }
    }
  };

  const stepRipple = () => {
    if (controls.click <= 0 || controls.enableExplosion <= 0 || controls.ripple <= 0) return;
    const damping = 0.965;

    for (let y = 1; y < rows - 1; y++) {
      const row = y * cols;
      for (let x = 1; x < cols - 1; x++) {
        const index = row + x;
        if (!objectMask[index]) {
          waveNext[index] = 0;
          continue;
        }
        const neighborAverage =
          ((objectMask[index - 1] ? waveCurrent[index - 1] : 0) +
            (objectMask[index + 1] ? waveCurrent[index + 1] : 0) +
            (objectMask[index - cols] ? waveCurrent[index - cols] : 0) +
            (objectMask[index + cols] ? waveCurrent[index + cols] : 0)) *
          0.5;
        const next = (neighborAverage - wavePrevious[index]) * damping;
        waveNext[index] = Math.abs(next) > 0.006 ? next : 0;
      }
    }

    const previous = wavePrevious;
    wavePrevious = waveCurrent;
    waveCurrent = waveNext;
    waveNext = previous;
    waveNext.fill(0);
  };

  const toAscii = (time = performance.now()) => {
    if (!sampleContext) return;
    sampleContext.clearRect(0, 0, cols, rows);
    sampleContext.drawImage(renderer.domElement, 0, 0, cols, rows);
    const pixels = sampleContext.getImageData(0, 0, cols, rows).data;
    updateObjectMask(pixels);
    const totalCells = cols * rows;
    const sourceGlyphs = new Array(totalCells).fill(" ");
    const sourceScores = new Float32Array(totalCells);
    const maxRampIndex = Math.min(ASCII_RAMP.length - 1, Math.max(2, Math.round(controls.glyphDetail)));

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const index = (y * cols + x) * 4;
        const luma = (pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722) / 255;
        const cellIndex = y * cols + x;
        const trail = trailBuffer[cellIndex] || 0;
        const isObjectCell = objectMask[cellIndex] === 1;
        const ripple =
          controls.click > 0 && controls.enableExplosion > 0 && controls.ripple > 0 && isObjectCell
            ? Math.abs(waveCurrent[cellIndex] || 0)
            : 0;
        const motionTone = useDeviceMotion && isObjectCell ? Math.min(0.18, motion.shake * 0.16) : 0;
        if (useRepulsion && !isObjectCell) continue;
        if (luma > 0.965 && trail < 0.025 && ripple < 0.025) continue;

        const darkness = 1 - luma;
        const tone = Math.min(
          1,
          Math.max(
            0.08,
            (darkness + controls.brightness - 0.5) * controls.contrast +
              0.5 +
              trail * controls.hover +
              ripple * controls.click * 0.24 +
              motionTone
          )
        );
        sourceGlyphs[cellIndex] = ASCII_RAMP[Math.min(maxRampIndex, Math.max(1, Math.floor(tone * maxRampIndex)))];
        sourceScores[cellIndex] = tone + trail * 0.2 + ripple * 0.08;
      }
    }

    const outputGlyphs = shouldDisplace() ? displaceGlyphs(sourceGlyphs, sourceScores) : sourceGlyphs;
    const lines = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) line += outputGlyphs[y * cols + x];
      lines.push(line);
    }

    asciiReveal.renderInto(ascii, lines, time);
  };

  const displaceGlyphs = (sourceGlyphs, sourceScores) => {
    const targetGlyphs = new Array(sourceGlyphs.length).fill(" ");
    const targetScores = new Float32Array(sourceGlyphs.length);
    const heat =
      controls.enableDisperse > 0 ? hoverPoint.heat * Math.max(0, controls.hover) * Math.max(0, controls.disperse) : 0;
    const radius = Math.max(10, Math.min(28, cols * 0.14)) * Math.max(0.2, controls.disperseRadius);
    const explosionHeat =
      controls.enableExplosion > 0
        ? explosionPoint.heat * Math.max(0, controls.click) * Math.max(0, controls.explosion)
        : 0;
    const explosionRadius = Math.max(8, Math.min(24, cols * 0.13)) * Math.max(0.2, controls.explosionRadius);
    const motionHeat = useDeviceMotion
      ? Math.min(1.8, Math.abs(motion.tiltX) * 0.95 + Math.abs(motion.tiltY) * 0.72 + motion.shake * 1.45)
      : 0;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const sourceIndex = y * cols + x;
        const glyph = sourceGlyphs[sourceIndex];
        if (glyph === " " || !objectMask[sourceIndex]) continue;

        let targetX = x;
        let targetY = y;

        const trail = controls.enableDisperse > 0 ? trailBuffer[sourceIndex] || 0 : 0;
        const effectiveHeat = Math.max(heat, trail * 0.86);

        if (effectiveHeat > 0.01) {
          const dx = x - hoverPoint.x;
          const dy = (y - hoverPoint.y) * 1.35;
          const distance = Math.hypot(dx, dy);

          if (distance > 0.001 && distance < radius && effectiveHeat > 0.01) {
            const pressure = Math.pow(1 - distance / radius, 1.7) * effectiveHeat * 22 * Math.max(0, controls.magnetism);
            const directionX = dx / distance;
            const directionY = (y - hoverPoint.y) / distance;

            for (let step = pressure; step > 0; step -= 0.5) {
              const candidateX = Math.max(0, Math.min(cols - 1, Math.round(x + directionX * step)));
              const candidateY = Math.max(0, Math.min(rows - 1, Math.round(y + directionY * step)));
              const candidateIndex = candidateY * cols + candidateX;
              if (objectMask[candidateIndex]) {
                targetX = candidateX;
                targetY = candidateY;
                break;
              }
            }
          }
        }

        if (explosionHeat > 0.01) {
          const dx = targetX - explosionPoint.x;
          const dy = (targetY - explosionPoint.y) * 1.18;
          const distance = Math.hypot(dx, dy);

          if (distance > 0.001 && distance < explosionRadius) {
            const pressure = Math.pow(1 - distance / explosionRadius, 1.28) * explosionHeat * 18;
            const directionX = dx / distance;
            const directionY = (targetY - explosionPoint.y) / distance;
            targetX = Math.max(0, Math.min(cols - 1, Math.round(targetX + directionX * pressure)));
            targetY = Math.max(0, Math.min(rows - 1, Math.round(targetY + directionY * pressure)));
          }
        }

        if (motionHeat > 0.01) {
          const wobble =
            Math.sin(x * 0.18 + motion.phase * 2.1) * Math.cos(y * 0.21 - motion.phase) * motion.shake * 6.5;
          targetX = clamp(
            Math.round(targetX + motion.tiltX * (2.4 + motionHeat * 8.6) + wobble),
            0,
            cols - 1
          );
          targetY = clamp(
            Math.round(
              targetY +
                motion.tiltY * (1.5 + motionHeat * 4.8) +
                Math.sin(y * 0.16 + motion.phase * 1.8) * motion.shake * 3.8
            ),
            0,
            rows - 1
          );
        }

        const targetIndex = targetY * cols + targetX;
        const score = sourceScores[sourceIndex] + explosionHeat * 0.06 + motionHeat * 0.04;
        if (score >= targetScores[targetIndex]) {
          targetGlyphs[targetIndex] = glyph;
          targetScores[targetIndex] = score;
        }
      }
    }

    return targetGlyphs;
  };

  const settingsOutput = document.querySelector("[data-obj-settings]");
  const copyButton = document.querySelector("[data-obj-copy-settings]");
  const updateSettingsPayload = () => {
    if (!settingsOutput) return;
    settingsOutput.value = JSON.stringify(
      {
        renderer: `${root.dataset.turntableName || "obj"}-turntable`,
        version: 1,
        model: root.dataset.objSrc || "/models/me.glb",
        ramp: "landing",
        controls: Object.fromEntries(
          Object.entries(controls).map(([key, value]) => [key, Number(Number(value).toFixed(3))])
        )
      },
      null,
      2
    );
  };

  document.querySelectorAll("[data-obj-control]").forEach((control) => {
    const name = control.dataset.objControl;
    const output = document.querySelector(`[data-obj-output="${name}"]`);
    const update = () => {
      const value = Number(control.value);
      if (output) output.textContent = Number.isInteger(value) ? String(value) : value.toFixed(2);
      applyControlValue(name, value);
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

  const tabButtons = document.querySelectorAll("[data-obj-tab]");
  const tabPanels = document.querySelectorAll("[data-obj-panel]");
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const activeTab = button.dataset.objTab;
      tabButtons.forEach((tabButton) => {
        const isActive = tabButton.dataset.objTab === activeTab;
        tabButton.classList.toggle("is-active", isActive);
        tabButton.setAttribute("aria-selected", String(isActive));
      });
      tabPanels.forEach((panel) => {
        const isActive = panel.dataset.objPanel === activeTab;
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
    if (!hasObjectAt(point.x, point.y)) return;
    markHoverPoint(point);
    addTrail(point.x, point.y);
  }, { passive: true });

  root.addEventListener("pointerdown", (event) => {
    requestDeviceMotion(true);
    const point = eventToGrid(event);
    if (!hasObjectAt(point.x, point.y)) return;
    markHoverPoint(point, 1.2);
    markExplosionPoint(point, 1);
    addTrail(point.x, point.y, 1.15);
    injectRipple(point.x, point.y);
  }, { passive: true });

  const motionGestureTarget = useDeviceMotion ? root.closest(".about-hero") || root : root;
  motionGestureTarget.addEventListener("pointerdown", () => requestDeviceMotion(true), { passive: true });
  motionGestureTarget.addEventListener("touchstart", () => requestDeviceMotion(true), { passive: true });

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
    const isActivePlaygroundTurntable = () => playgroundRoot?.dataset.activeTurntable === root.dataset.playgroundTurntable;
    const observer = new MutationObserver(() => {
      const wasVisible = isVisible;
      isVisible = isActivePlaygroundTurntable();
      if (isVisible) {
        lastRenderTime = 0;
        if (!wasVisible) asciiReveal.start();
      }
    });
    if (playgroundRoot) observer.observe(playgroundRoot, { attributes: true, attributeFilter: ["data-active-turntable"] });
    isVisible = isActivePlaygroundTurntable();
    playgroundRoot?.addEventListener("pointermove", (event) => {
      if (!isActivePlaygroundTurntable()) return;
      requestDeviceMotion(true);
      const point = eventToGrid(event);
      if (!hasObjectAt(point.x, point.y)) return;
      markHoverPoint(point);
      addTrail(point.x, point.y);
    }, { passive: true });
    playgroundRoot?.addEventListener("pointerdown", (event) => {
      if (!isActivePlaygroundTurntable()) return;
      const point = eventToGrid(event);
      if (!hasObjectAt(point.x, point.y)) return;
      markHoverPoint(point, 1.2);
      addTrail(point.x, point.y, 1.15);
      injectRipple(point.x, point.y);
    }, { passive: true });
  }

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

    const isStaticReveal = root.classList.contains("is-ascii-line-revealing") && !root.classList.contains("about-turntable");
    if (!isStaticReveal) updateDeviceMotionPhysics(delta);
    if (!reduceMotion.matches && !isStaticReveal) {
      turntableAngle += delta * Math.PI * (controls.speed + Math.abs(motion.spin) * 0.34);
    }
    model.rotation.x = reduceMotion.matches || isStaticReveal ? -0.2 : -0.2 + motion.tiltY * 0.26 + motion.shake * 0.06;
    model.rotation.y = reduceMotion.matches || isStaticReveal ? 0.82 : turntableAngle + motion.tiltX * 0.62 + motion.spin;
    model.rotation.z =
      reduceMotion.matches || isStaticReveal
        ? -0.05
        : -0.05 + Math.sin(time * 0.00055) * 0.018 - motion.tiltX * 0.16 + motion.tiltY * 0.045;
    renderer.render(scene, camera);
    stepRipple();
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
  loadModel()
    .then(() => {
      updateSettingsPayload();
      requestDeviceMotion(false);
      if (isVisible) asciiReveal.start();
      pendingFrame = requestAnimationFrame(render);
    })
    .catch((error) => {
      asciiReveal.finish();
      ascii.textContent = `obj.turntable.offline\n${String(error.message || error)}`;
    });

  window.addEventListener("pagehide", () => {
    if (pendingFrame) cancelAnimationFrame(pendingFrame);
    window.removeEventListener("deviceorientation", handleDeviceOrientation);
    window.removeEventListener("devicemotion", handleDeviceMotion);
    disposeGroup(model);
    surfaceMaterial.dispose();
    renderer.dispose();
  }, { once: true });
});
