import {
  AmbientLight,
  Box3,
  DirectionalLight,
  DoubleSide,
  Group,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createTurntableAsciiReveal } from "./turntable-ascii-reveal.js";

const ASCII_RAMP = [" ", "·", "•", "+", "*", "✦", "✶", "✷", "✸", "✹"];
const STAGE_ASCII_FRAME_INTERVAL = 1000 / 60;
const CARD_ASCII_FRAME_INTERVAL = 1000 / 30;
const MOBILE_ASCII_FRAME_INTERVAL = 1000 / 24;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/gltf/");
dracoLoader.setDecoderConfig({ type: "wasm" });
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

export function initializeObjTurntable(root) {
  const ascii = root.querySelector("[data-obj-ascii]");
  if (!ascii) return;
  root.classList.add("is-turntable-loading");

  const isCard = root.closest(".project-card") !== null;
  const isAboutTurntable = root.classList.contains("about-turntable");
  const isMeTurntable = (root.dataset.turntableName || "").toLowerCase() === "me";
  const useRepulsion = isAboutTurntable || root.classList.contains("pave-turntable-stage");
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const useDeviceMotion = isAboutTurntable && coarsePointer;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const controls = {
    speed: isCard ? 0.2 : 0.24,
    density: Number(root.dataset.cardDensity || (isCard ? 6 : 5)),
    renderSize: Number(root.dataset.renderSize || 0.66),
    brightness: Number(root.dataset.cardBrightness || -0.02),
    contrast: Number(root.dataset.cardContrast || 1.42),
    glyphDetail: Number(root.dataset.cardGlyphDetail || 9),
    hover: Number(root.dataset.cardHover || (isCard ? 0 : isAboutTurntable ? 0.18 : 0.28)),
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

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.18, 8.2);

  const renderer = new WebGLRenderer({
    alpha: false,
    antialias: !coarsePointer,
    preserveDrawingBuffer: false
  });
  renderer.setClearColor(0xfbfbf8, 1);
  renderer.setPixelRatio(1);
  root.append(renderer.domElement);

  const model = new Group();
  model.rotation.x = -0.2;
  model.rotation.z = -0.05;
  scene.add(model);

  const motionShaderUniforms = {
    uMotionTilt: { value: new Vector2(0, 0) },
    uMotionShake: { value: 0 },
    uMotionPhase: { value: 0 }
  };
  const surfaceMaterial = new MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0,
    roughness: 0.56,
    side: DoubleSide
  });
  if (useDeviceMotion) {
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
  }

  const key = new DirectionalLight(0xffffff, 5.4);
  key.position.set(2.4, 3.4, 4.6);
  scene.add(key);

  const rim = new DirectionalLight(0xffffff, 3.8);
  rim.position.set(-3.4, 1.4, -4.2);
  scene.add(rim);

  const fill = new DirectionalLight(0xffffff, 2.4);
  fill.position.set(-3.2, -1.2, 2.8);
  scene.add(fill);
  scene.add(new AmbientLight(0xffffff, 0.82));

  const sampleCanvas = document.createElement("canvas");
  const sampleContext = sampleCanvas.getContext("2d", { alpha: false, willReadFrequently: true });
  let cols = 120;
  let rows = 70;
  let lastAscii = 0;
  let lastTrailTime = 0;
  let trailBuffer = new Float32Array(cols * rows);
  let waveCurrent = new Float32Array(cols * rows);
  let wavePrevious = new Float32Array(cols * rows);
  let waveNext = new Float32Array(cols * rows);
  let objectMask = new Uint8Array(cols * rows);
  let sourceGlyphs = new Array(cols * rows).fill(" ");
  let outputGlyphs = new Array(cols * rows).fill(" ");
  let sourceScores = new Float32Array(cols * rows);
  let targetScores = new Float32Array(cols * rows);
  let hasTrail = false;
  let hasRipple = false;
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
  let isVisible = true;
  let pendingFrame = null;
  let pointerExitFrame = null;
  let lastPointerPoint = null;
  let lastPointerTime = 0;
  let pointerVelocity = { x: 0, y: 0 };
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
      node.geometry.deleteAttribute("uv");
      node.geometry.deleteAttribute("uv1");
      node.geometry.computeBoundingBox();
      if (!node.geometry.attributes.normal) node.geometry.computeVertexNormals();
      node.material = surfaceMaterial;
      node.castShadow = false;
      node.receiveShadow = false;
    });

    const bounds = new Box3().setFromObject(object);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const scale = 4.6 / Math.max(size.x, size.y, size.z);
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  };

  const loadModel = async () => {
    const source = root.dataset.objSrc || "/models/me.glb";
    const extension = source.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
    if (extension !== "glb" && extension !== "gltf") {
      throw new Error(`Unsupported model format: ${extension || "unknown"}`);
    }
    const object = (await gltfLoader.loadAsync(source)).scene;
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

    const minCols = isCard ? 24 : 56;
    const maxCols = isCard ? 44 : 210;
    const minRows = isCard ? 10 : 30;
    const maxRows = isCard ? 18 : 120;
    const effectiveDensity = coarsePointer ? Math.max(6, controls.density) : controls.density;
    cols = Math.max(minCols, Math.min(maxCols, Math.floor(width / effectiveDensity)));
    rows = Math.max(minRows, Math.min(maxRows, Math.floor(height / (effectiveDensity * 1.55))));

    const sourceScale = isCard ? 2 : 1.15;
    const renderWidth = Math.max(1, Math.min(width, Math.floor(cols * sourceScale)));
    const renderHeight = Math.max(1, Math.min(height, Math.floor(renderWidth * (height / width))));
    renderer.setSize(renderWidth, renderHeight, false);

    sampleCanvas.width = cols;
    sampleCanvas.height = rows;
    trailBuffer = new Float32Array(cols * rows);
    waveCurrent = new Float32Array(cols * rows);
    wavePrevious = new Float32Array(cols * rows);
    waveNext = new Float32Array(cols * rows);
    objectMask = new Uint8Array(cols * rows);
    sourceGlyphs = new Array(cols * rows).fill(" ");
    outputGlyphs = new Array(cols * rows).fill(" ");
    sourceScores = new Float32Array(cols * rows);
    targetScores = new Float32Array(cols * rows);
    hasTrail = false;
    hasRipple = false;

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
    let didAddTrail = false;
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
        didAddTrail = true;
      }
    }
    hasTrail ||= didAddTrail;
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
    if (controls.hover <= 0 || !hasTrail) return;
    let nextHasTrail = false;
    for (let i = 0; i < trailBuffer.length; i++) {
      const next = trailBuffer[i] * decay;
      if (next > 0.01) {
        trailBuffer[i] = next;
        nextHasTrail = true;
      } else {
        trailBuffer[i] = 0;
      }
    }
    hasTrail = nextHasTrail;
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
    let didInjectRipple = false;
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
        didInjectRipple = true;
      }
    }
    hasRipple ||= didInjectRipple;
  };

  const stepRipple = () => {
    if (controls.click <= 0 || controls.enableExplosion <= 0 || controls.ripple <= 0 || !hasRipple) return;
    const damping = 0.965;
    let nextHasRipple = false;

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
        if (Math.abs(next) > 0.006) {
          waveNext[index] = next;
          nextHasRipple = true;
        } else {
          waveNext[index] = 0;
        }
      }
    }

    const previous = wavePrevious;
    wavePrevious = waveCurrent;
    waveCurrent = waveNext;
    waveNext = previous;
    waveNext.fill(0);
    hasRipple = nextHasRipple;
  };

  const hasActiveDisplacement = () => {
    if (hasTrail || hasRipple) return true;
    const heat =
      controls.enableDisperse > 0 ? hoverPoint.heat * Math.max(0, controls.hover) * Math.max(0, controls.disperse) : 0;
    const explosionHeat =
      controls.enableExplosion > 0
        ? explosionPoint.heat * Math.max(0, controls.click) * Math.max(0, controls.explosion)
        : 0;
    const motionHeat = useDeviceMotion
      ? Math.abs(motion.tiltX) * 0.95 + Math.abs(motion.tiltY) * 0.72 + motion.shake * 1.45
      : 0;
    return heat > 0.01 || explosionHeat > 0.01 || motionHeat > 0.01;
  };

  const toAscii = (time = performance.now()) => {
    if (!sampleContext) return;
    sampleContext.drawImage(renderer.domElement, 0, 0, cols, rows);
    const pixels = sampleContext.getImageData(0, 0, cols, rows).data;
    updateObjectMask(pixels);
    sourceGlyphs.fill(" ");
    sourceScores.fill(0);
    const maxRampIndex = Math.min(ASCII_RAMP.length - 1, Math.max(2, Math.round(controls.glyphDetail)));

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const index = (y * cols + x) * 4;
        const luma = (pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722) / 255;
        const cellIndex = y * cols + x;
        const trail = trailBuffer[cellIndex] || 0;
        const isObjectCell = objectMask[cellIndex] === 1;
        const ripple =
          hasRipple && controls.click > 0 && controls.enableExplosion > 0 && controls.ripple > 0 && isObjectCell
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

    const output = shouldDisplace() && hasActiveDisplacement() ? displaceGlyphs(sourceGlyphs, sourceScores) : sourceGlyphs;
    const lines = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) line += output[y * cols + x];
      lines.push(line);
    }

    asciiReveal.renderInto(ascii, lines, time);
  };

  const displaceGlyphs = (sourceGlyphs, sourceScores) => {
    outputGlyphs.fill(" ");
    targetScores.fill(0);
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
          outputGlyphs[targetIndex] = glyph;
          targetScores[targetIndex] = score;
        }
      }
    }

    return outputGlyphs;
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
  const activateTab = (button) => {
      const activeTab = button.dataset.objTab;
      tabButtons.forEach((tabButton) => {
        const isActive = tabButton.dataset.objTab === activeTab;
        tabButton.classList.toggle("is-active", isActive);
        tabButton.setAttribute("aria-selected", String(isActive));
        tabButton.tabIndex = isActive ? 0 : -1;
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

  const stopPointerExit = () => {
    if (pointerExitFrame === null) return;
    cancelAnimationFrame(pointerExitFrame);
    pointerExitFrame = null;
  };

  const handlePointerMove = (event) => {
    stopPointerExit();
    const point = eventToGrid(event);
    const now = performance.now();
    if (lastPointerPoint && lastPointerTime) {
      const delta = Math.max(1, now - lastPointerTime);
      pointerVelocity = {
        x: (point.x - lastPointerPoint.x) / delta,
        y: (point.y - lastPointerPoint.y) / delta
      };
    }
    lastPointerPoint = point;
    lastPointerTime = now;
    if (!hasObjectAt(point.x, point.y)) return;
    markHoverPoint(point);
    addTrail(point.x, point.y);
  };

  const handlePointerLeave = () => {
    if (!lastPointerPoint) return;
    stopPointerExit();

    if (reduceMotion.matches) {
      hoverPoint.heat = 0;
      lastPointerPoint = null;
      return;
    }

    const start = { x: hoverPoint.x, y: hoverPoint.y };
    const speed = Math.hypot(pointerVelocity.x, pointerVelocity.y);
    const fallbackX = start.x - (cols - 1) * 0.5;
    const fallbackY = start.y - (rows - 1) * 0.5;
    const fallbackLength = Math.max(0.001, Math.hypot(fallbackX, fallbackY));
    const direction =
      speed > 0.01
        ? { x: pointerVelocity.x / speed, y: pointerVelocity.y / speed }
        : { x: fallbackX / fallbackLength, y: fallbackY / fallbackLength };
    const distance = Math.max(cols, rows) * 0.38;
    const target = {
      x: start.x + direction.x * distance,
      y: start.y + direction.y * distance
    };
    const startedAt = performance.now();
    const duration = 240;

    const moveOutside = (time) => {
      const progress = clamp((time - startedAt) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const point = {
        x: start.x + (target.x - start.x) * eased,
        y: start.y + (target.y - start.y) * eased
      };
      hoverPoint = {
        x: point.x,
        y: point.y,
        heat: Math.max(hoverPoint.heat, 1 - progress)
      };
      addTrail(point.x, point.y, 1 - progress);

      if (progress < 1) {
        pointerExitFrame = requestAnimationFrame(moveOutside);
        return;
      }

      pointerExitFrame = null;
      lastPointerPoint = null;
      lastPointerTime = 0;
      pointerVelocity = { x: 0, y: 0 };
    };

    pointerExitFrame = requestAnimationFrame(moveOutside);
  };

  const handlePointerDown = (event) => {
    requestDeviceMotion(true);
    const point = eventToGrid(event);
    if (!hasObjectAt(point.x, point.y)) return;
    markHoverPoint(point, 1.2);
    markExplosionPoint(point, 1);
    addTrail(point.x, point.y, 1.15);
    injectRipple(point.x, point.y);
  };

  root.addEventListener("pointermove", handlePointerMove, { passive: true });
  root.addEventListener("pointerleave", handlePointerLeave, { passive: true });
  root.addEventListener("pointerdown", handlePointerDown, { passive: true });

  const motionGestureTarget = useDeviceMotion ? root.closest(".about-hero") || root : root;
  motionGestureTarget.addEventListener("pointerdown", () => requestDeviceMotion(true), { passive: true });
  motionGestureTarget.addEventListener("touchstart", () => requestDeviceMotion(true), { passive: true });

  root.addEventListener("turntable-controls:update", (event) => {
    const wasVisible = isVisible;
    isVisible = true;
    if (!wasVisible) asciiReveal.start();
    const values = event.detail || {};
    Object.entries(values).forEach(([name, value]) => {
      if (Object.hasOwn(controls, name)) applyControlValue(name, Number(value));
    });
  });

  const render = (time = 0) => {
    pendingFrame = null;
    if (!isVisible || document.hidden) return;
    const frameInterval = isCard
      ? CARD_ASCII_FRAME_INTERVAL
      : coarsePointer
        ? MOBILE_ASCII_FRAME_INTERVAL
        : STAGE_ASCII_FRAME_INTERVAL;
    if (lastRenderTime && time - lastRenderTime < frameInterval - 1) {
      pendingFrame = requestAnimationFrame(render);
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

  return {
    destroy() {
      isVisible = false;
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      stopPointerExit();
      resizeObserver.disconnect();
      root.removeEventListener("turntable-eligibility", onEligibility);
      root.removeEventListener("pointermove", handlePointerMove);
      root.removeEventListener("pointerleave", handlePointerLeave);
      root.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("deviceorientation", handleDeviceOrientation);
      window.removeEventListener("devicemotion", handleDeviceMotion);
      disposeGroup(model);
      surfaceMaterial.dispose();
      dracoLoader.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
