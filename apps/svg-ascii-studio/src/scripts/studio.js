import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
  <path fill="#070707" d="M162 38c16 0 25 11 32 28l77 190c6 16-2 26-18 26h-18c-13 0-22-6-26-18l-10-28h-79l-10 28c-4 12-13 18-26 18H66c-16 0-24-10-18-26l78-190c7-17 17-28 36-28Zm10 119c-6-16-11-33-14-49h-2c-3 17-8 33-14 49l-17 48h69l-22-48Z"/>
  <path fill="#d9d4c4" d="M83 65h53l-88 217H24L83 65Zm101 0h53l59 217h-24L184 65Z"/>
</svg>`;

const SVG_SAMPLES = {
  mark: {
    name: "sample-mark.svg",
    svg: DEFAULT_SVG
  },
  badge: {
    name: "sample-badge.svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
      <path fill="#080808" d="M160 24 285 96v128l-125 72L35 224V96L160 24Zm0 41L70 117v86l90 52 90-52v-86l-90-52Z"/>
      <path fill="#080808" d="M101 110h118v31h-39v91h-40v-91h-39v-31Z"/>
      <path fill="#d7d2bd" d="M115 178h90v25h-90v-25Z"/>
    </svg>`
  },
  spark: {
    name: "sample-spark.svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
      <path fill="#080808" d="M160 28c14 69 35 93 102 107-67 14-88 38-102 107-14-69-35-93-102-107 67-14 88-38 102-107Z"/>
      <path fill="#080808" d="M71 194c8 39 20 53 58 61-38 8-50 22-58 61-8-39-20-53-58-61 38-8 50-22 58-61Z"/>
      <path fill="#d7d2bd" d="M218 52c7 32 17 44 48 50-31 7-41 18-48 50-7-32-17-43-48-50 31-6 41-18 48-50Z"/>
    </svg>`
  }
};

const RAMP_OPTIONS = {
  classic: " .:-=+*#%@",
  dense: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/*tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  wire: " ._-/|\\=+x#",
  binary: " 01"
};

const BAYER_2 = [0, 2, 3, 1].map((value) => (value + 0.5) / 4);
const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5
].map((value) => (value + 0.5) / 16);

const GEOMETRY_CONTROLS = new Set(["depth", "bevel", "curveSegments"]);
const RESIZE_CONTROLS = new Set(["density", "rowScale"]);
const MATERIAL_CONTROLS = new Set(["frontColor", "sideColor", "metalness", "roughness"]);
const LIGHT_CONTROLS = new Set(["ambient", "key", "rim", "fill"]);
const NUMBER_PRECISION = {
  threshold: 3,
  trailDecay: 0,
  curveSegments: 0,
  density: 0,
  glyphDetail: 0,
  depth: 0,
  fov: 0
};

const MAX_SVG_BYTES = 850_000;
const MAX_SVG_NODES = 2_400;
const MAX_SVG_PATHS = 520;
const MAX_SVG_MESHES = 900;
const GEOMETRY_REBUILD_DELAY = 160;
const PORTFOLIO_SHARE_URL = "https://traykov.cc/?utm_source=ascii-studio&utm_medium=export&utm_campaign=studio-share";
const STUDIO_SHARE_PATH = "/svg-ascii-studio/?utm_source=ascii-studio&utm_medium=share&utm_campaign=ascii-export";
const STUDIO_WORKSPACE_STORAGE_KEY = "ascii-studio:workspace";
const STUDIO_WORKSPACE_STORAGE_VERSION = 1;
const ATTRIBUTION_TEXT = "Made with ASCII Studio by Alexander Traykov";
const BLOCKED_SVG_TAGS = [
  "script",
  "foreignObject",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
  "canvas",
  "image",
  "feImage",
  "animate",
  "animateMotion",
  "animateTransform",
  "set"
];
const ALLOWED_SVG_TAGS = new Set([
  "svg",
  "g",
  "defs",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "mask",
  "title",
  "desc",
  "style"
]);
const ALLOWED_SVG_ATTRS = new Set([
  "xmlns",
  "xmlns:xlink",
  "version",
  "viewbox",
  "width",
  "height",
  "id",
  "class",
  "role",
  "aria-label",
  "d",
  "points",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "fill-rule",
  "clip-rule",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "transform",
  "style",
  "clip-path",
  "mask",
  "gradienttransform",
  "gradientunits",
  "offset",
  "stop-color",
  "stop-opacity",
  "href",
  "xlink:href"
]);
const UNSAFE_SVG_VALUE = /(?:javascript:|data:text\/html|data:image\/svg|url\s*\(\s*['"]?\s*(?:https?:|data:|javascript:)|@import|expression\s*\()/i;

const PRESETS = {
  clean: {
    label: "Clean logo",
    density: 9,
    contrast: 1.35,
    ditherStrength: 0.1,
    ditherMode: "bayer2",
    ramp: "classic",
    threshold: 0.965,
    glyphDetail: 8,
    glow: 0.14,
    brightness: 0,
    rowScale: 1.55,
    frontColor: "#080808",
    sideColor: "#747064",
    backgroundColor: "#fbfbf8"
  },
  dense: {
    label: "Dense print",
    density: 7,
    contrast: 1.72,
    ditherStrength: 0.18,
    ditherMode: "noise",
    ramp: "dense",
    threshold: 0.93,
    glyphDetail: 12,
    glow: 0.08,
    brightness: -0.02,
    rowScale: 1.42,
    frontColor: "#060606",
    sideColor: "#5d5a50",
    backgroundColor: "#f6f4ed"
  },
  wire: {
    label: "Wireframe",
    density: 10,
    contrast: 1.5,
    ditherStrength: 0.05,
    ditherMode: "none",
    ramp: "wire",
    threshold: 0.955,
    glyphDetail: 9,
    glow: 0.06,
    brightness: 0.02,
    rowScale: 1.62,
    frontColor: "#080808",
    sideColor: "#8b8678",
    backgroundColor: "#fbfbf8"
  },
  crt: {
    label: "CRT dither",
    density: 8,
    contrast: 1.42,
    ditherStrength: 0.28,
    ditherMode: "bayer4",
    ramp: "classic",
    threshold: 0.948,
    glyphDetail: 9,
    glow: 0.38,
    brightness: 0.01,
    rowScale: 1.5,
    frontColor: "#10100e",
    sideColor: "#686456",
    backgroundColor: "#f8f6ef"
  },
  poster: {
    label: "Poster halftone",
    density: 12,
    contrast: 2.1,
    ditherStrength: 0.36,
    ditherMode: "bayer4",
    ramp: "classic",
    threshold: 0.91,
    glyphDetail: 6,
    glow: 0,
    brightness: -0.03,
    rowScale: 1.68,
    frontColor: "#080808",
    sideColor: "#9a9482",
    backgroundColor: "#fffdf5"
  },
  binary: {
    label: "Binary mark",
    density: 8,
    contrast: 2.6,
    ditherStrength: 0.04,
    ditherMode: "none",
    ramp: "binary",
    threshold: 0.955,
    glyphDetail: 2,
    glow: 0.02,
    brightness: 0,
    rowScale: 1.45,
    frontColor: "#050505",
    sideColor: "#7b776a",
    backgroundColor: "#fbfbf8"
  }
};

const root = document.querySelector("[data-studio]");

if (root) {
  const stage = root.querySelector("[data-stage]");
  const renderHost = root.querySelector("[data-render-host]");
  const ascii = root.querySelector("[data-ascii-output]");
  const fileInput = root.querySelector("[data-file-input]");
  const dropzone = root.querySelector("[data-dropzone]");
  const svgPreview = root.querySelector("[data-svg-preview]");
  const statusLine = root.querySelector("[data-status]");
  const sourceName = root.querySelector("[data-source-name]");
  const settingsOutput = root.querySelector("[data-settings-output]");
  const codeOutput = root.querySelector("[data-code-output]");
  const presetStatus = root.querySelector("[data-preset-status]");
  const pauseButton = root.querySelector("[data-toggle-pause]");
  const pasteInput = root.querySelector("[data-svg-paste]");
  const stageEmpty = root.querySelector("[data-stage-empty]");
  const stageBrowse = root.querySelector("[data-stage-browse]");
  const shareCopy = root.querySelector("[data-share-copy]");
  const diagnostics = {
    security: root.querySelector('[data-diagnostic="security"]'),
    geometry: root.querySelector('[data-diagnostic="geometry"]'),
    performance: root.querySelector('[data-diagnostic="performance"]')
  };

  const state = {
    depth: 60,
    bevel: 4,
    curveSegments: 32,
    objectScale: 1,
    speed: 0.28,
    rotationX: -0.18,
    rotationY: 0,
    rotationZ: -0.06,
    wobble: 0.02,
    cameraDistance: 8.4,
    fov: 34,
    density: 9,
    rowScale: 1.55,
    brightness: 0,
    contrast: 1.35,
    threshold: 0.965,
    glyphDetail: 8,
    ditherStrength: 0.16,
    ditherMode: "bayer4",
    ramp: "classic",
    glow: 0.18,
    invert: false,
    frontColor: "#080808",
    sideColor: "#747064",
    backgroundColor: "#fbfbf8",
    metalness: 0.08,
    roughness: 0.42,
    ambient: 0.88,
    key: 4.8,
    rim: 3.2,
    fill: 2.1,
    hover: 0.32,
    trailDecay: 520,
    clickBoost: 1.2,
    exportScale: 2,
    includeAttribution: true
  };

  let svgText = "";
  let currentFileName = "no-source.svg";
  let activeGroup = null;
  let sourceMetrics = { paths: 0, meshes: 0, strokes: 0 };
  let securityMetrics = { bytes: 0, nodes: 0, removedElements: 0, removedAttrs: 0, strippedStyles: 0, warnings: [] };
  let cols = 96;
  let rows = 48;
  let trailBuffer = new Float32Array(cols * rows);
  let hasTrail = false;
  let lastTrailTime = 0;
  let lastRenderTime = 0;
  let lastAsciiTime = 0;
  let lastAsciiOutput = ascii?.textContent || "";
  let turntableAngle = 0;
  let rebuildToken = 0;
  let geometryRebuildTimer = 0;
  let activePreset = "clean";
  let activePresetModified = false;
  let activeSample = null;
  let exportReady = false;
  let isPaused = false;
  let sourceState = "empty";
  let isRestoringWorkspace = false;
  let storageWarningShown = false;
  let pendingRenderFrame = 0;
  let stageVisible = true;
  let destroyed = false;
  let resizeObserver;
  let stageObserver;
  let persistStudioState = () => {};
  let clearStoredWorkspace = () => {};

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(state.fov, 1, 0.1, 100);
  camera.position.set(0, 0, state.cameraDistance);

  const renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: false,
    stencil: true
  });
  renderer.setPixelRatio(1);
  renderer.setClearColor(state.backgroundColor, 1);
  renderHost?.append(renderer.domElement);

  const mark = new THREE.Group();
  scene.add(mark);

  const frontMaterial = new THREE.MeshStandardMaterial({
    color: state.frontColor,
    metalness: state.metalness,
    roughness: state.roughness,
    side: THREE.DoubleSide
  });

  const sideMaterial = new THREE.MeshStandardMaterial({
    color: state.sideColor,
    metalness: Math.max(0, state.metalness - 0.02),
    roughness: Math.min(1, state.roughness + 0.18),
    side: THREE.DoubleSide
  });

  const detailMaterial = new THREE.MeshStandardMaterial({
    color: state.frontColor,
    metalness: state.metalness,
    roughness: state.roughness,
    side: THREE.DoubleSide
  });

  const ambientLight = new THREE.AmbientLight(0xffffff, state.ambient);
  const keyLight = new THREE.DirectionalLight(0xffffff, state.key);
  const rimLight = new THREE.DirectionalLight(0xffffff, state.rim);
  const fillLight = new THREE.DirectionalLight(0xd7d2bd, state.fill);
  keyLight.position.set(2.7, 3.2, 4.4);
  rimLight.position.set(-2.6, 1.5, -4.6);
  fillLight.position.set(-3.1, -0.9, 2.6);
  scene.add(ambientLight, keyLight, rimLight, fillLight);

  const sampleCanvas = document.createElement("canvas");
  const sampleContext = sampleCanvas.getContext("2d", { alpha: false, willReadFrequently: true });
  const loader = new SVGLoader();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const setStatus = (message, isError = false) => {
    if (!statusLine) return;
    statusLine.textContent = message;
    statusLine.classList.toggle("is-error", isError);
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const formatBytes = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(bytes > 99_000 ? 0 : 1)} KB`;
  };

  const updateStageEmpty = () => {
    if (!stageEmpty) return;
    const copy = {
      empty: ["Select or drop an SVG", "Drag a plain logo file here, browse from the source panel, paste markup, or start from a sample."],
      error: ["Cannot render this SVG", "Simplify the source or export a plain filled SVG."],
      sample: ["", ""],
      uploaded: ["", ""]
    }[sourceState] || ["", ""];
    const title = stageEmpty.querySelector("strong");
    const body = stageEmpty.querySelector("span");
    if (title) title.textContent = copy[0];
    if (body) body.textContent = copy[1];
    stageEmpty.hidden = exportReady || sourceState === "sample" || sourceState === "uploaded";
  };

  const updateDiagnostics = () => {
    if (diagnostics.security) {
      const removed = securityMetrics.removedElements + securityMetrics.removedAttrs + securityMetrics.strippedStyles;
      diagnostics.security.textContent = sourceState === "empty"
        ? "No active SVG"
        : `${formatBytes(securityMetrics.bytes)}, ${removed} stripped`;
    }
    if (diagnostics.geometry) {
      diagnostics.geometry.textContent = sourceMetrics.meshes
        ? `${sourceMetrics.meshes} meshes / ${sourceMetrics.paths} paths${sourceMetrics.strokes ? ` / ${sourceMetrics.strokes} strokes` : ""}`
        : "No mesh generated";
    }
    if (diagnostics.performance) {
      const heavy = sourceMetrics.paths > MAX_SVG_PATHS * 0.7 || sourceMetrics.meshes > MAX_SVG_MESHES * 0.7;
      const warnings = securityMetrics.warnings?.length ? securityMetrics.warnings.join(", ") : "";
      diagnostics.performance.textContent = warnings || (heavy ? "High complexity source" : "Browser-safe budget");
    }
  };

  const setSourceState = (nextState) => {
    sourceState = nextState;
    root.dataset.sourceState = nextState;
    updateStageEmpty();
    updateDiagnostics();
  };

  const sanitizeSvgText = (text) => {
    const bytes = new Blob([text]).size;
    const nextSecurityMetrics = {
      bytes,
      nodes: 0,
      removedElements: 0,
      removedAttrs: 0,
      strippedStyles: 0,
      warnings: []
    };

    if (bytes > MAX_SVG_BYTES) {
      throw new Error("SVG is too large for this studio. Try a simpler mark under 850 KB.");
    }
    if (!/<svg[\s>]/i.test(text)) {
      throw new Error("No SVG markup found.");
    }

    const documentParser = new DOMParser();
    const parsed = documentParser.parseFromString(text, "image/svg+xml");
    if (parsed.querySelector("parsererror")) {
      throw new Error("SVG could not be parsed. Export a plain SVG and try again.");
    }

    const svg = parsed.documentElement?.tagName?.toLowerCase() === "svg"
      ? parsed.documentElement
      : parsed.querySelector("svg");
    if (!svg) {
      throw new Error("No SVG root found.");
    }

    const elementNodes = [svg, ...Array.from(svg.querySelectorAll("*"))];
    nextSecurityMetrics.nodes = elementNodes.length;
    if (nextSecurityMetrics.nodes > MAX_SVG_NODES) {
      throw new Error(`SVG has ${nextSecurityMetrics.nodes} elements. Simplify it below ${MAX_SVG_NODES} elements.`);
    }

    const commentWalker = parsed.createTreeWalker(svg, window.NodeFilter?.SHOW_COMMENT ?? 128);
    const comments = [];
    while (commentWalker.nextNode()) comments.push(commentWalker.currentNode);
    comments.forEach((node) => {
      node.remove();
      nextSecurityMetrics.removedElements += 1;
    });

    svg.querySelectorAll(BLOCKED_SVG_TAGS.join(",")).forEach((node) => {
      node.remove();
      nextSecurityMetrics.removedElements += 1;
    });

    svg.querySelectorAll("style").forEach((node) => {
      if (UNSAFE_SVG_VALUE.test(node.textContent || "")) {
        node.remove();
        nextSecurityMetrics.strippedStyles += 1;
      }
    });

    elementNodes.forEach((node) => {
      const tagName = node.tagName.toLowerCase();
      if (!ALLOWED_SVG_TAGS.has(tagName)) {
        node.remove();
        nextSecurityMetrics.removedElements += 1;
        nextSecurityMetrics.warnings.push(`removed ${tagName}`);
        return;
      }

      for (const attribute of Array.from(node.attributes)) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();
        const isHref = name === "href" || name === "xlink:href";
        const hasUnsafeUrl = UNSAFE_SVG_VALUE.test(value);
        const isExternalHref = isHref && !value.startsWith("#");
        if (!ALLOWED_SVG_ATTRS.has(name) || name.startsWith("on") || hasUnsafeUrl || isExternalHref) {
          node.removeAttribute(attribute.name);
          nextSecurityMetrics.removedAttrs += 1;
        }
      }
    });

    if (!svg.getAttribute("viewBox")) {
      nextSecurityMetrics.warnings.push("missing viewBox");
    }

    securityMetrics = nextSecurityMetrics;
    return new XMLSerializer().serializeToString(svg);
  };

  const isLightPaint = (value) => {
    if (!value) return false;
    const color = String(value).trim().toLowerCase();
    return color === "white" || color === "#fff" || color === "#ffffff" || color === "rgb(255,255,255)";
  };

  const hasPaint = (value) => value && value !== "none" && value !== "transparent";

  const makeExtrudeOptions = () => {
    const bevelSize = Math.min(state.bevel, Math.max(0, state.depth * 0.22));
    return {
      depth: state.depth,
      bevelEnabled: bevelSize > 0,
      bevelThickness: bevelSize,
      bevelSize: bevelSize * 0.62,
      bevelSegments: bevelSize > 0 ? 7 : 0,
      curveSegments: state.curveSegments
    };
  };

  const disposeGroup = (group) => {
    group.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose();
    });
  };

  const buildSourceGroup = (source = svgText) => {
    const data = loader.parse(source);
    if (data.paths.length > MAX_SVG_PATHS) {
      throw new Error(`SVG has ${data.paths.length} paths. Simplify it below ${MAX_SVG_PATHS} paths.`);
    }
    const group = new THREE.Group();
    const metrics = { paths: data.paths.length, meshes: 0, strokes: 0 };
    const extrude = makeExtrudeOptions();

    for (const path of data.paths) {
      const style = path.userData?.style || {};
      const fillOpacity = Number(style.fillOpacity ?? style.opacity ?? 1);
      const fill = style.fill;

      if (hasPaint(fill) && fillOpacity > 0.01 && !isLightPaint(fill)) {
        const shapes = SVGLoader.createShapes(path);
        for (const shape of shapes) {
          const geometry = new THREE.ExtrudeGeometry(shape, extrude);
          geometry.computeVertexNormals();
          group.add(new THREE.Mesh(geometry, [frontMaterial, sideMaterial]));
          metrics.meshes += 1;
          if (metrics.meshes > MAX_SVG_MESHES) {
            disposeGroup(group);
            throw new Error(`SVG created too many shapes. Simplify it below ${MAX_SVG_MESHES} meshes.`);
          }
        }
      }

      const stroke = style.stroke;
      const strokeOpacity = Number(style.strokeOpacity ?? style.opacity ?? 1);
      const strokeWidth = Number(style.strokeWidth || 0);
      if (hasPaint(stroke) && strokeOpacity > 0.01 && strokeWidth > 0 && !isLightPaint(stroke)) {
        for (const subPath of path.subPaths) {
          const points = subPath.getPoints(Math.max(12, state.curveSegments));
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
          mesh.position.z = state.depth + state.bevel + 0.4;
          group.add(mesh);
          metrics.meshes += 1;
          metrics.strokes += 1;
          if (metrics.meshes > MAX_SVG_MESHES) {
            disposeGroup(group);
            throw new Error(`SVG created too many shapes. Simplify it below ${MAX_SVG_MESHES} meshes.`);
          }
        }
      }
    }

    if (metrics.meshes === 0) {
      throw new Error("No filled or stroked SVG geometry found.");
    }

    sourceMetrics = metrics;
    return group;
  };

  const normalizeGroup = (group) => {
    const bounds = new THREE.Box3().setFromObject(group);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxSide = Math.max(size.x, size.y, 1);
    const scale = (4.25 / maxSide) * state.objectScale;
    group.scale.set(scale, -scale, scale);
    group.position.set(-center.x * scale, center.y * scale, (-center.z - state.depth * 0.5) * scale);
  };

  const updateExportAvailability = () => {
    root.querySelectorAll("[data-export-requires-valid]").forEach((button) => {
      button.disabled = !exportReady;
      button.setAttribute("aria-disabled", String(!exportReady));
    });
  };

  const rebuildGeometry = ({ source = svgText, name = currentFileName, nextSourceState = sourceState, commitSource = false } = {}) => {
    const token = ++rebuildToken;
    setStatus("Parsing SVG");
    try {
      const nextGroup = buildSourceGroup(source);
      normalizeGroup(nextGroup);
      if (token !== rebuildToken) {
        disposeGroup(nextGroup);
        return;
      }
      const previous = activeGroup;
      mark.add(nextGroup);
      activeGroup = nextGroup;
      if (previous) {
        mark.remove(previous);
        disposeGroup(previous);
      }
      if (commitSource) {
        svgText = source;
        currentFileName = name;
        setSourceState(nextSourceState);
        updateSvgPreview();
      } else if (sourceState === "error") {
        setSourceState(currentFileName === "sample-mark.svg" ? "sample" : "uploaded");
      }
      exportReady = true;
      const strokeNote = sourceMetrics.strokes > 0 ? `, ${sourceMetrics.strokes} stroke details` : "";
      const sourcePrefix = nextSourceState === "sample" ? "Sample loaded" : "SVG loaded";
      setStatus(`${sourcePrefix}. ${sourceMetrics.meshes} meshes from ${sourceMetrics.paths} paths${strokeNote}`);
      updateExports();
      updateExportAvailability();
      updateStageEmpty();
      updateDiagnostics();
      setSampleButtonState();
      persistStudioState();
      scheduleRender();
      return true;
    } catch (error) {
      const hasPreviousRender = Boolean(activeGroup);
      exportReady = hasPreviousRender;
      if (!hasPreviousRender) {
        setSourceState("error");
        if (ascii) ascii.textContent = "svg.parse.error";
      }
      const suffix = hasPreviousRender ? " Previous render kept." : "";
      setStatus(`Rejected SVG: ${String(error.message || error)}${suffix}`, true);
      updateExportAvailability();
      updateStageEmpty();
      updateDiagnostics();
      scheduleRender();
      return false;
    }
  };

  const scheduleGeometryRebuild = () => {
    window.clearTimeout(geometryRebuildTimer);
    setStatus("Updating geometry");
    geometryRebuildTimer = window.setTimeout(() => rebuildGeometry(), GEOMETRY_REBUILD_DELAY);
  };

  const updateMaterials = () => {
    frontMaterial.color.set(state.frontColor);
    frontMaterial.metalness = state.metalness;
    frontMaterial.roughness = state.roughness;
    sideMaterial.color.set(state.sideColor);
    sideMaterial.metalness = Math.max(0, state.metalness - 0.02);
    sideMaterial.roughness = Math.min(1, state.roughness + 0.18);
    detailMaterial.color.set(state.frontColor);
    detailMaterial.metalness = state.metalness;
    detailMaterial.roughness = state.roughness;
    frontMaterial.needsUpdate = true;
    sideMaterial.needsUpdate = true;
    detailMaterial.needsUpdate = true;
  };

  const updateLights = () => {
    ambientLight.intensity = state.ambient;
    keyLight.intensity = state.key;
    rimLight.intensity = state.rim;
    fillLight.intensity = state.fill;
  };

  const updateCamera = () => {
    camera.fov = state.fov;
    camera.position.z = state.cameraDistance;
    camera.updateProjectionMatrix();
  };

  const updateBackground = () => {
    renderer.setClearColor(state.backgroundColor, 1);
    if (stage) stage.style.backgroundColor = state.backgroundColor;
    if (ascii) {
      ascii.style.textShadow = state.glow > 0 ? `0 0 ${Math.round(state.glow * 18)}px currentColor` : "none";
      ascii.style.color = state.invert ? "#fbfbf8" : "#11110f";
    }
  };

  const resize = () => {
    if (!stage || !ascii) return;
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    stage.style.setProperty("--stage-aspect", `${width} / ${height}`);

    cols = clamp(Math.floor(width / state.density), 34, 240);
    rows = clamp(Math.floor(height / (state.density * state.rowScale)), 18, 150);
    const solidVisible = root.dataset.view !== "ascii";
    const solidRect = solidVisible ? renderHost?.getBoundingClientRect() : null;
    const renderWidth = solidVisible
      ? Math.max(1, Math.floor(solidRect?.width || width))
      : Math.max(1, Math.min(width, Math.floor(cols * 1.5)));
    const renderHeight = solidVisible
      ? Math.max(1, Math.floor(solidRect?.height || height))
      : Math.max(1, Math.min(height, Math.floor(renderWidth * (height / width))));
    renderer.setSize(renderWidth, renderHeight, false);
    sampleCanvas.width = cols;
    sampleCanvas.height = rows;
    trailBuffer = new Float32Array(cols * rows);
    hasTrail = false;

    ascii.style.fontSize = `${Math.max(5.5, width / (cols * 0.62))}px`;
    ascii.style.lineHeight = `${height / rows}px`;
    scheduleRender();
  };

  const eventToGrid = (event) => {
    const rect = stage.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * (cols - 1), 0, cols - 1),
      y: clamp(((event.clientY - rect.top) / rect.height) * (rows - 1), 0, rows - 1)
    };
  };

  const addTrail = (centerX, centerY, strength = 1) => {
    if (state.hover <= 0) return;
    let added = false;
    const radius = clamp(cols * 0.046, 4, 14);
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(cols - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(rows - 1, Math.ceil(centerY + radius));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = (x - centerX) / radius;
        const dy = ((y - centerY) / radius) * 1.45;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 1) continue;
        const index = y * cols + x;
        trailBuffer[index] = Math.max(trailBuffer[index], Math.pow(1 - distance, 1.65) * strength);
        added = true;
      }
    }
    hasTrail ||= added;
    scheduleRender();
  };

  const updateTrail = (time) => {
    if (!hasTrail) return;
    if (!lastTrailTime) {
      lastTrailTime = time;
      return;
    }
    const delta = Math.min(180, Math.max(0, time - lastTrailTime));
    const decay = Math.exp(-delta / Math.max(80, state.trailDecay));
    lastTrailTime = time;
    let nextHasTrail = false;
    for (let index = 0; index < trailBuffer.length; index += 1) {
      const next = trailBuffer[index] * decay;
      if (next > 0.01) {
        trailBuffer[index] = next;
        nextHasTrail = true;
      } else {
        trailBuffer[index] = 0;
      }
    }
    hasTrail = nextHasTrail;
  };

  const noise = (x, y, time) => {
    const value = Math.sin(x * 12.9898 + y * 78.233 + Math.floor(time / 80) * 37.719) * 43758.5453;
    return value - Math.floor(value);
  };

  const ditherValue = (x, y, time) => {
    if (state.ditherMode === "bayer2") return BAYER_2[(y % 2) * 2 + (x % 2)];
    if (state.ditherMode === "bayer4") return BAYER_4[(y % 4) * 4 + (x % 4)];
    if (state.ditherMode === "noise") return noise(x, y, time);
    return 0.5;
  };

  const toAscii = (time) => {
    if (!sampleContext || !ascii) return;
    sampleContext.drawImage(renderer.domElement, 0, 0, cols, rows);
    const pixels = sampleContext.getImageData(0, 0, cols, rows).data;
    const ramp = RAMP_OPTIONS[state.ramp] || RAMP_OPTIONS.classic;
    const maxRampIndex = Math.min(ramp.length - 1, Math.max(1, Math.round(state.glyphDetail)));
    const emptyCutoff = 1 - state.threshold;
    const lines = [];

    for (let y = 0; y < rows; y += 1) {
      let line = "";
      for (let x = 0; x < cols; x += 1) {
        const index = (y * cols + x) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const luma = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
        const signal = state.invert ? luma : 1 - luma;
        if (signal < emptyCutoff) {
          line += " ";
          continue;
        }

        const trail = trailBuffer[y * cols + x] || 0;
        let tone = (signal + state.brightness - 0.5) * state.contrast + 0.5;
        tone += trail * state.hover;
        if (state.ditherMode !== "none") {
          tone += (ditherValue(x, y, time) - 0.5) * state.ditherStrength;
        }
        tone = clamp(tone, 0.04, 1);
        line += ramp[Math.min(maxRampIndex, Math.max(1, Math.floor(tone * maxRampIndex)))];
      }
      lines.push(line);
    }
    const output = lines.join("\n");
    if (output !== lastAsciiOutput) {
      ascii.textContent = output;
      lastAsciiOutput = output;
    }
  };

  const readControlValue = (control) => {
    if (control.type === "checkbox") return control.checked;
    if (control.type === "color" || control.tagName === "SELECT") return control.value;
    return Number(control.value);
  };

  const syncRangeVisual = (control) => {
    if (!control || control.type !== "range") return;
    const min = Number(control.min || 0);
    const max = Number(control.max || 100);
    const value = Number(control.value || 0);
    const stepValue = control.getAttribute("step") === "any" ? 0 : Number(control.step || 1);
    const span = Math.max(0.0001, max - min);
    const rawProgress = clamp(((value - min) / span) * 100, 0, 100);
    const stepCount = stepValue > 0 ? Math.max(1, Math.round(span / stepValue)) : 0;
    const stepIndex = stepCount > 0 ? clamp(Math.round((value - min) / stepValue), 0, stepCount) : 0;
    const snappedProgress = stepCount > 0 ? (stepIndex / stepCount) * 100 : rawProgress;
    const visibleStepCount = stepCount > 0 ? Math.min(stepCount, 96) : 24;
    const stepSize = 100 / visibleStepCount;
    const dense = stepCount > 96;

    control.style.setProperty("--range-progress", `${snappedProgress.toFixed(3)}%`);
    control.style.setProperty("--range-step-size", `${stepSize.toFixed(3)}%`);
    control.style.setProperty("--range-step-alpha", dense ? "0.12" : "0.2");
    control.dataset.rangeStep = stepCount > 0 ? `${stepIndex}/${stepCount}` : `${Math.round(rawProgress)}%`;
  };

  const bindRangeVisual = (control) => {
    if (!control || control.type !== "range") return;
    const release = () => control.classList.remove("is-range-dragging");
    syncRangeVisual(control);
    control.addEventListener("pointerdown", () => {
      control.classList.add("is-range-dragging");
      syncRangeVisual(control);
    });
    control.addEventListener("pointerup", release);
    control.addEventListener("pointercancel", release);
    control.addEventListener("blur", release);
    control.addEventListener("keydown", () => {
      control.classList.add("is-range-dragging");
    });
    control.addEventListener("keyup", release);
  };

  const formatValue = (name, value) => {
    if (typeof value === "boolean") return value ? "on" : "off";
    if (typeof value === "string") return value;
    const precision = NUMBER_PRECISION[name] ?? 2;
    return precision === 0 ? String(Math.round(value)) : value.toFixed(precision);
  };

  const syncOutput = (name) => {
    root.querySelectorAll(`[data-output="${name}"]`).forEach((output) => {
      output.textContent = formatValue(name, state[name]);
    });
  };

  const syncControlInput = (name) => {
    root.querySelectorAll(`[data-control="${name}"]`).forEach((control) => {
      if (control.type === "checkbox") {
        control.checked = Boolean(state[name]);
      } else {
        control.value = String(state[name]);
      }
      syncRangeVisual(control);
    });
  };

  const setPresetState = (presetName, modified = false) => {
    activePreset = presetName;
    activePresetModified = modified;
    root.querySelectorAll("[data-preset]").forEach((button) => {
      const active = button.dataset.preset === activePreset;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (presetStatus) {
      const label = PRESETS[activePreset]?.label || "Custom look";
      presetStatus.textContent = modified ? `${label} modified` : `${label} active`;
    }
  };

  const markPresetModified = () => {
    if (!activePreset) return;
    setPresetState(activePreset, true);
  };

  const getStudioShareUrl = () => {
    const url = new URL(STUDIO_SHARE_PATH, window.location.origin || "https://traykov.cc");
    return url.toString();
  };

  const makeAttributionText = () => `${ATTRIBUTION_TEXT} - ${getStudioShareUrl()}`;

  const makeShareText = () => {
    const sourceLabel = sourceState === "sample" ? "a sample mark" : currentFileName.replace(/\.svg$/i, "") || "an SVG mark";
    return `I made a 3D ASCII turntable from ${sourceLabel} in Alexander Traykov's ASCII Studio.`;
  };

  const getAsciiExportText = () => {
    const text = ascii?.textContent || "";
    return state.includeAttribution && text.trim() ? `${text}\n\n${makeAttributionText()}` : text;
  };

  const collectSettings = () => {
    const controls = {};
    for (const [key, value] of Object.entries(state)) {
      controls[key] = typeof value === "number" ? Number(value.toFixed(4)) : value;
    }
    return {
      renderer: "svg-ascii-studio",
      version: 1,
      source: currentFileName,
      sourceState,
      preset: activePresetModified ? `${activePreset}:modified` : activePreset,
      metrics: sourceMetrics,
      security: securityMetrics,
      share: {
        studioUrl: getStudioShareUrl(),
        portfolioUrl: PORTFOLIO_SHARE_URL,
        attribution: ATTRIBUTION_TEXT
      },
      controls
    };
  };

  const escapeTemplateLiteral = (value) => (
    String(value)
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${")
  );

  const makeExportCode = () => {
    const controls = collectSettings().controls;
    const serializedControls = JSON.stringify(controls, null, 2);
    const serializedSvg = escapeTemplateLiteral(svgText);
    return `import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

export const svgAsciiSource = \`${serializedSvg}\`;
export const svgAsciiSettings = ${serializedControls};

const hasPaint = (value) => value && value !== "none" && value !== "transparent";
const isLightPaint = (value) => {
  if (!value) return false;
  const color = String(value).trim().toLowerCase();
  return color === "white" || color === "#fff" || color === "#ffffff" || color === "rgb(255,255,255)";
};

export function createSvgAsciiObject(settings = svgAsciiSettings) {
  const loader = new SVGLoader();
  const data = loader.parse(svgAsciiSource);
  const group = new THREE.Group();
  const frontMaterial = new THREE.MeshStandardMaterial({
    color: settings.frontColor,
    metalness: settings.metalness,
    roughness: settings.roughness,
    side: THREE.DoubleSide
  });
  const sideMaterial = new THREE.MeshStandardMaterial({
    color: settings.sideColor,
    metalness: Math.max(0, settings.metalness - 0.02),
    roughness: Math.min(1, settings.roughness + 0.18),
    side: THREE.DoubleSide
  });
  const detailMaterial = frontMaterial.clone();
  const bevelSize = Math.min(settings.bevel, Math.max(0, settings.depth * 0.22));
  const extrude = {
    depth: settings.depth,
    bevelEnabled: bevelSize > 0,
    bevelThickness: bevelSize,
    bevelSize: bevelSize * 0.62,
    bevelSegments: bevelSize > 0 ? 7 : 0,
    curveSegments: settings.curveSegments
  };

  for (const path of data.paths) {
    const style = path.userData?.style || {};
    const fillOpacity = Number(style.fillOpacity ?? style.opacity ?? 1);
    if (hasPaint(style.fill) && fillOpacity > 0.01 && !isLightPaint(style.fill)) {
      for (const shape of SVGLoader.createShapes(path)) {
        const geometry = new THREE.ExtrudeGeometry(shape, extrude);
        geometry.computeVertexNormals();
        group.add(new THREE.Mesh(geometry, [frontMaterial, sideMaterial]));
      }
    }

    const strokeOpacity = Number(style.strokeOpacity ?? style.opacity ?? 1);
    const strokeWidth = Number(style.strokeWidth || 0);
    if (hasPaint(style.stroke) && strokeOpacity > 0.01 && strokeWidth > 0 && !isLightPaint(style.stroke)) {
      for (const subPath of path.subPaths) {
        const geometry = SVGLoader.pointsToStroke(subPath.getPoints(Math.max(12, settings.curveSegments)), {
          strokeWidth,
          strokeColor: style.stroke,
          strokeLineJoin: style.strokeLineJoin || "round",
          strokeLineCap: style.strokeLineCap || "round",
          strokeMiterLimit: style.strokeMiterLimit || 4
        });
        if (!geometry) continue;
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, detailMaterial);
        mesh.position.z = settings.depth + settings.bevel + 0.4;
        group.add(mesh);
      }
    }
  }

  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const scale = (4.25 / Math.max(size.x, size.y, 1)) * settings.objectScale;
  group.scale.set(scale, -scale, scale);
  group.position.set(-center.x * scale, center.y * scale, (-center.z - settings.depth * 0.5) * scale);
  group.rotation.set(settings.rotationX, settings.rotationY, settings.rotationZ);
  group.userData.svgAsciiSettings = settings;
  return group;
}
`;
  };

  const updateExports = () => {
    if (!exportReady) {
      if (settingsOutput) settingsOutput.value = "";
      if (codeOutput) codeOutput.value = "";
      if (shareCopy) shareCopy.textContent = "Load a valid SVG to create share copy.";
      return;
    }
    if (settingsOutput) settingsOutput.value = JSON.stringify(collectSettings(), null, 2);
    if (codeOutput) codeOutput.value = makeExportCode();
    if (shareCopy) shareCopy.textContent = makeShareText();
  };

  const applyControlChange = (name, value, { fromPreset = false } = {}) => {
    state[name] = value;
    syncOutput(name);
    scheduleRender();
    if (!fromPreset) markPresetModified();

    if (GEOMETRY_CONTROLS.has(name)) {
      scheduleGeometryRebuild();
      return;
    }
    if (name === "objectScale" && activeGroup) {
      normalizeGroup(activeGroup);
      updateExports();
    }
    if (RESIZE_CONTROLS.has(name)) resize();
    if (MATERIAL_CONTROLS.has(name)) updateMaterials();
    if (LIGHT_CONTROLS.has(name)) updateLights();
    if (name === "fov" || name === "cameraDistance") updateCamera();
    if (name === "backgroundColor" || name === "glow" || name === "invert") updateBackground();
    if (!GEOMETRY_CONTROLS.has(name)) updateExports();
    if (!GEOMETRY_CONTROLS.has(name)) persistStudioState();
  };

  const applyPreset = (presetName) => {
    const preset = PRESETS[presetName];
    if (!preset) return;
    for (const [name, value] of Object.entries(preset)) {
      if (!Object.hasOwn(state, name)) continue;
      state[name] = value;
      syncControlInput(name);
      syncOutput(name);
    }
    setPresetState(presetName, false);
    updateMaterials();
    updateLights();
    updateCamera();
    updateBackground();
    resize();
    updateExports();
    persistStudioState();
  };

  const updateSvgPreview = () => {
    if (svgPreview) {
      if (!svgText) {
        const empty = document.createElement("span");
        empty.className = "source-preview-empty";
        empty.textContent = "No SVG loaded";
        svgPreview.replaceChildren(empty);
      } else {
        const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
        const svg = parsed.querySelector("svg");
        svgPreview.replaceChildren(svg ? document.importNode(svg, true) : document.createTextNode("svg.preview.unavailable"));
      }
    }
    if (sourceName) {
      sourceName.textContent = sourceState === "empty"
        ? "No source loaded"
        : sourceState === "sample" ? `Sample: ${currentFileName}` : currentFileName;
    }
  };

  const loadSvgText = (rawText, name, nextSourceState = "uploaded") => {
    if (!rawText.trim()) {
      setStatus("Paste or choose an SVG first.", true);
      return;
    }
    try {
      const sanitized = sanitizeSvgText(rawText);
      activeSample = nextSourceState === "sample"
        ? Object.entries(SVG_SAMPLES).find(([, sample]) => sample.name === name)?.[0] || activeSample
        : null;
      rebuildGeometry({
        source: sanitized,
        name,
        nextSourceState,
        commitSource: true
      });
    } catch (error) {
      const hasPreviousRender = Boolean(activeGroup);
      exportReady = hasPreviousRender;
      if (!hasPreviousRender) setSourceState("error");
      const suffix = hasPreviousRender ? " Previous render kept." : "";
      setStatus(`Rejected SVG: ${String(error.message || error)}${suffix}`, true);
      updateExportAvailability();
      updateStageEmpty();
      updateDiagnostics();
    }
  };

  const loadSvgFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".svg") && file.type !== "image/svg+xml") {
      setStatus("Use an SVG file.", true);
      return;
    }
    if (file.size > MAX_SVG_BYTES) {
      setStatus("SVG is too large for this studio. Try a simpler mark under 850 KB.", true);
      return;
    }
    try {
      loadSvgText(await file.text(), file.name || "uploaded.svg", "uploaded");
    } catch (error) {
      setStatus(`Could not read SVG file: ${String(error.message || error)}`, true);
    }
  };

  const setSampleButtonState = () => {
    root.querySelectorAll("[data-load-sample]").forEach((button) => {
      const active = sourceState === "sample" && button.dataset.loadSample === activeSample;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };

  const loadSample = (sampleName = "mark") => {
    const sample = SVG_SAMPLES[sampleName] || SVG_SAMPLES.mark;
    activeSample = sampleName;
    loadSvgText(sample.svg, sample.name, "sample");
    setSampleButtonState();
  };

  const clearSource = ({ clearStorage = true } = {}) => {
    rebuildToken += 1;
    if (activeGroup) {
      mark.remove(activeGroup);
      disposeGroup(activeGroup);
    }
    activeGroup = null;
    svgText = "";
    currentFileName = "no-source.svg";
    sourceMetrics = { paths: 0, meshes: 0, strokes: 0 };
    securityMetrics = { bytes: 0, nodes: 0, removedElements: 0, removedAttrs: 0, strippedStyles: 0, warnings: [] };
    activeSample = null;
    exportReady = false;
    if (ascii) ascii.textContent = "";
    if (settingsOutput) settingsOutput.value = "";
    if (codeOutput) codeOutput.value = "";
    setSourceState("empty");
    updateSvgPreview();
    updateExportAvailability();
    setSampleButtonState();
    setStatus("No source loaded. Select, drop, paste, or choose a sample.");
    if (clearStorage) clearStoredWorkspace();
  };

  const copyText = async (text, button, label) => {
    try {
      await navigator.clipboard.writeText(text);
      const previous = button.textContent;
      button.textContent = label;
      window.setTimeout(() => {
        button.textContent = previous;
      }, 900);
    } catch (error) {
      setStatus("Clipboard access was blocked. Select the text and copy manually.", true);
    }
  };

  const makeDownloadName = (suffix) => {
    const name = currentFileName
      .replace(/\.svg$/i, "")
      .replace(/[^a-z0-9-]+/gi, "-")
      .replace(/^-|-$/g, "") || "ascii-studio";
    return `${name}.${suffix}`;
  };

  const downloadBlob = (contents, type, suffix) => {
    const blob = new Blob([contents], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = makeDownloadName(suffix);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 250);
  };

  const downloadCode = () => {
    if (!exportReady) return;
    const code = codeOutput?.value || makeExportCode();
    downloadBlob(code, "text/javascript", "turntable.mjs");
  };

  const downloadSettings = () => {
    if (!exportReady) return;
    updateExports();
    downloadBlob(settingsOutput?.value || JSON.stringify(collectSettings(), null, 2), "application/json", "settings.json");
  };

  const downloadSvg = () => {
    if (!exportReady || !svgText) return;
    downloadBlob(svgText, "image/svg+xml", "sanitized.svg");
  };

  const downloadAsciiText = () => {
    if (!exportReady) return;
    const text = getAsciiExportText();
    if (!text.trim()) {
      setStatus("No ASCII frame to export yet.", true);
      return;
    }
    downloadBlob(text, "text/plain", "ascii.txt");
  };

  const downloadAsciiPng = () => {
    if (!exportReady || !stage || !ascii) return;
    const text = ascii.textContent || "";
    if (!text.trim()) {
      setStatus("No ASCII frame to export yet.", true);
      return;
    }
    const rect = stage.getBoundingClientRect();
    const scale = Math.min(state.exportScale, 3200 / Math.max(rect.width, rect.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.width * scale));
    canvas.height = Math.max(1, Math.round(rect.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(scale, scale);
    context.fillStyle = state.backgroundColor;
    context.fillRect(0, 0, rect.width, rect.height);
    const styles = window.getComputedStyle(ascii);
    const lines = text.split("\n");
    const fontSize = Number.parseFloat(styles.fontSize) || 8;
    const lineHeight = Number.parseFloat(styles.lineHeight) || fontSize;
    context.fillStyle = styles.color || "#11110f";
    context.font = `700 ${fontSize}px ${styles.fontFamily}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const footerHeight = state.includeAttribution ? 28 : 0;
    const startY = (rect.height - footerHeight) / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      context.fillText(line, rect.width / 2, startY + index * lineHeight);
    });
    if (state.includeAttribution) {
      context.font = `700 10px ${styles.fontFamily}`;
      context.textBaseline = "bottom";
      context.fillText("Made with ASCII Studio - traykov.cc", rect.width / 2, rect.height - 10);
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus("PNG export failed.", true);
        return;
      }
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = makeDownloadName("ascii.png");
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 250);
    }, "image/png");
  };

  const shareToTwitter = () => {
    if (!exportReady) return;
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("text", makeShareText());
    url.searchParams.set("url", getStudioShareUrl());
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  const scheduleRender = () => {
    if (pendingRenderFrame || destroyed || document.hidden || !stageVisible) return;
    pendingRenderFrame = requestAnimationFrame(render);
  };

  const render = (time = 0) => {
    pendingRenderFrame = 0;
    if (destroyed || document.hidden || !stageVisible) return;
    const frameInterval = root.dataset.view === "ascii" ? 1000 / 30 : 1000 / 60;
    if (lastRenderTime && time - lastRenderTime < frameInterval - 1) {
      scheduleRender();
      return;
    }
    if (!lastRenderTime) lastRenderTime = time;
    const delta = Math.min(80, Math.max(0, time - lastRenderTime)) / 1000;
    lastRenderTime = time;

    if (!isPaused && !reduceMotion.matches) turntableAngle += delta * Math.PI * state.speed;
    mark.rotation.x = state.rotationX;
    mark.rotation.y = state.rotationY + (reduceMotion.matches ? 0.8 : turntableAngle);
    mark.rotation.z = state.rotationZ + Math.sin(time * 0.00055) * state.wobble;

    renderer.render(scene, camera);
    updateTrail(time);
    if (time - lastAsciiTime > 34) {
      lastAsciiTime = time;
      toAscii(time);
    }
    if (!reduceMotion.matches && (!isPaused || hasTrail)) scheduleRender();
  };

  const readStoredWorkspace = () => {
    try {
      const raw = window.localStorage.getItem(STUDIO_WORKSPACE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.version !== STUDIO_WORKSPACE_STORAGE_VERSION) return null;
      if (!parsed.source || typeof parsed.source.svgText !== "string") return null;
      return parsed;
    } catch {
      return null;
    }
  };

  clearStoredWorkspace = () => {
    try {
      window.localStorage.removeItem(STUDIO_WORKSPACE_STORAGE_KEY);
      storageWarningShown = false;
    } catch {
      // Clearing the source still works when localStorage is unavailable.
    }
  };

  persistStudioState = () => {
    if (isRestoringWorkspace || !svgText || sourceState === "empty" || sourceState === "error") return;
    const controls = {};
    for (const [key, value] of Object.entries(state)) {
      controls[key] = typeof value === "number" ? Number(value.toFixed(4)) : value;
    }
    try {
      window.localStorage.setItem(STUDIO_WORKSPACE_STORAGE_KEY, JSON.stringify({
        version: STUDIO_WORKSPACE_STORAGE_VERSION,
        savedAt: new Date().toISOString(),
        source: {
          name: currentFileName,
          sourceState,
          svgText
        },
        controls,
        preset: activePreset,
        presetModified: activePresetModified,
        activeSample,
        view: root.dataset.view || "ascii"
      }));
    } catch {
      if (!storageWarningShown) {
        storageWarningShown = true;
        setStatus("Browser storage is unavailable. Exports still work, but this workspace will not auto-restore.", true);
      }
    }
  };

  const applyStoredControls = (controls = {}) => {
    for (const [name, value] of Object.entries(controls)) {
      if (!Object.hasOwn(state, name)) continue;
      const currentType = typeof state[name];
      if (currentType === "number") {
        const next = Number(value);
        if (!Number.isFinite(next)) continue;
        state[name] = next;
      } else if (currentType === "boolean") {
        state[name] = Boolean(value);
      } else if (typeof value === "string") {
        state[name] = value;
      } else {
        continue;
      }
      syncControlInput(name);
      syncOutput(name);
    }
    updateMaterials();
    updateLights();
    updateCamera();
    updateBackground();
    resize();
  };

  const setViewMode = (mode = "ascii", persist = true) => {
    const nextMode = root.querySelector(`[data-view-mode="${mode}"]`) ? mode : "ascii";
    root.dataset.view = nextMode;
    root.querySelectorAll("[data-view-mode]").forEach((button) => {
      const active = button.dataset.viewMode === nextMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    resize();
    if (persist) persistStudioState();
  };

  const restoreStoredWorkspace = () => {
    const stored = readStoredWorkspace();
    if (!stored) return false;

    isRestoringWorkspace = true;
    try {
      applyStoredControls(stored.controls);
      setPresetState(stored.preset || "clean", Boolean(stored.presetModified));
      setViewMode(stored.view || "ascii", false);
      const storedSourceState = stored.source.sourceState === "sample" ? "sample" : "uploaded";
      const storedSample = storedSourceState === "sample"
        ? stored.activeSample || Object.entries(SVG_SAMPLES).find(([, sample]) => sample.name === stored.source.name)?.[0] || "mark"
        : null;
      activeSample = storedSample;
      const sanitized = sanitizeSvgText(stored.source.svgText);
      const restored = rebuildGeometry({
        source: sanitized,
        name: stored.source.name || "saved.svg",
        nextSourceState: storedSourceState,
        commitSource: true
      });
      if (!restored) {
        clearStoredWorkspace();
        clearSource({ clearStorage: false });
        setStatus("Saved SVG could not be restored. Select or drop an SVG to begin.", true);
        return false;
      }
      setStatus(`Restored ${currentFileName} from this browser.`);
      isRestoringWorkspace = false;
      persistStudioState();
      return true;
    } catch {
      clearStoredWorkspace();
      clearSource({ clearStorage: false });
      setStatus("Saved SVG could not be restored. Select or drop an SVG to begin.", true);
      return false;
    } finally {
      isRestoringWorkspace = false;
    }
  };

  const sidePanelStorageKey = "ascii-studio:side-panels";
  const sidePanels = ["source", "controls"];
  const sidePanelHideTimers = new Map();
  const sidePanelAnimationMs = reduceMotion.matches ? 1 : 280;
  const readSidePanelState = () => {
    try {
      return JSON.parse(window.localStorage.getItem(sidePanelStorageKey) || "{}");
    } catch {
      return {};
    }
  };
  const writeSidePanelState = (panel, collapsed) => {
    try {
      const next = { ...readSidePanelState(), [panel]: collapsed };
      window.localStorage.setItem(sidePanelStorageKey, JSON.stringify(next));
    } catch {
      // Collapse still works without storage.
    }
  };
  const schedulePanelResize = () => {
    requestAnimationFrame(() => {
      resize();
      requestAnimationFrame(resize);
    });
  };
  const setSidePanelCollapsed = (panel, collapsed, persist = true) => {
    const attr = panel === "controls" ? "data-controls-collapsed" : `data-${panel}-collapsed`;
    const body = root.querySelector(`[data-side-panel-body="${panel}"]`);
    const button = root.querySelector(`[data-collapse-panel="${panel}"]`);
    const label = panel === "controls" ? "controls panel" : `${panel} panel`;

    window.clearTimeout(sidePanelHideTimers.get(panel));
    if (body && !collapsed) {
      body.hidden = false;
      body.removeAttribute("inert");
      body.setAttribute("aria-hidden", "false");
      body.getBoundingClientRect();
    }
    root.setAttribute(attr, String(collapsed));
    if (body && collapsed) {
      body.setAttribute("inert", "");
      body.setAttribute("aria-hidden", "true");
      sidePanelHideTimers.set(panel, window.setTimeout(() => {
        if (root.getAttribute(attr) === "true") body.hidden = true;
      }, sidePanelAnimationMs));
    }
    if (button) {
      button.textContent = collapsed ? "Show" : "Hide";
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} ${label}`);
    }
    if (persist) writeSidePanelState(panel, collapsed);
    schedulePanelResize();
  };
  const storedSidePanels = readSidePanelState();
  sidePanels.forEach((panel) => {
    setSidePanelCollapsed(panel, Boolean(storedSidePanels[panel]), false);
  });

  root.querySelectorAll("[data-control]").forEach((control) => {
    const name = control.dataset.control;
    if (!Object.hasOwn(state, name)) return;
    bindRangeVisual(control);
    state[name] = readControlValue(control);
    syncOutput(name);
    syncRangeVisual(control);
    control.addEventListener("input", () => {
      syncRangeVisual(control);
      applyControlChange(name, readControlValue(control));
    });
    control.addEventListener("change", () => {
      syncRangeVisual(control);
      applyControlChange(name, readControlValue(control));
    });
  });

  root.querySelectorAll("[data-view-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      setViewMode(button.dataset.viewMode);
    });
  });

  root.querySelectorAll("[data-preset]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
    button.addEventListener("click", () => {
      applyPreset(button.dataset.preset);
    });
  });

  root.querySelector("[data-reset-preset]")?.addEventListener("click", () => {
    applyPreset(activePreset || "clean");
  });

  root.querySelector("[data-reset-sample]")?.addEventListener("click", () => {
    loadSample("mark");
  });

  root.querySelector("[data-load-paste]")?.addEventListener("click", () => {
    loadSvgText(pasteInput?.value || "", "pasted.svg", "uploaded");
  });

  root.querySelectorAll("[data-clear-source]").forEach((button) => button.addEventListener("click", () => {
    clearSource();
    if (pasteInput) pasteInput.value = "";
  }));

  root.querySelectorAll("[data-load-sample]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
    button.addEventListener("click", () => {
      loadSample(button.dataset.loadSample || "mark");
    });
  });

  root.querySelectorAll("[data-panel-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.panelTab;
      root.querySelectorAll("[data-panel-tab]").forEach((nextButton) => {
        const active = nextButton === button;
        nextButton.classList.toggle("is-active", active);
        nextButton.setAttribute("aria-selected", String(active));
      });
      root.querySelectorAll("[data-panel]").forEach((panel) => {
        const active = panel.dataset.panel === tab;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
      schedulePanelResize();
    });
  });

  root.querySelectorAll("[data-collapse-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.dataset.collapsePanel;
      const attr = panel === "controls" ? "data-controls-collapsed" : `data-${panel}-collapsed`;
      const collapsed = root.getAttribute(attr) === "true";
      setSidePanelCollapsed(panel, !collapsed);
    });
  });

  fileInput?.addEventListener("change", () => {
    loadSvgFile(fileInput.files?.[0]);
    fileInput.value = "";
  });

  stageBrowse?.addEventListener("click", () => {
    fileInput?.click();
  });

  const fileDropTargets = [dropzone, stageEmpty].filter(Boolean);
  fileDropTargets.forEach((target) => {
    ["dragenter", "dragover"].forEach((eventName) => {
      target.addEventListener(eventName, (event) => {
        event.preventDefault();
        target.classList.add("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      target.addEventListener(eventName, (event) => {
        event.preventDefault();
        target.classList.remove("is-dragging");
      });
    });

    target.addEventListener("drop", (event) => {
      loadSvgFile(event.dataTransfer?.files?.[0]);
    });
  });

  stage?.addEventListener("pointermove", (event) => {
    const point = eventToGrid(event);
    addTrail(point.x, point.y, 1);
  }, { passive: true });

  stage?.addEventListener("pointerdown", (event) => {
    const point = eventToGrid(event);
    addTrail(point.x, point.y, state.clickBoost);
  }, { passive: true });

  root.querySelectorAll("[data-copy-settings]").forEach((button) => button.addEventListener("click", (event) => {
    if (!exportReady) return;
    updateExports();
    copyText(settingsOutput?.value || "", event.currentTarget, "Copied");
  }));

  root.querySelectorAll("[data-copy-code]").forEach((button) => button.addEventListener("click", (event) => {
    if (!exportReady) return;
    updateExports();
    copyText(codeOutput?.value || "", event.currentTarget, "Copied");
  }));

  root.querySelectorAll("[data-download-code]").forEach((button) => button.addEventListener("click", () => {
    updateExports();
    downloadCode();
  }));

  root.querySelectorAll("[data-download-settings]").forEach((button) => button.addEventListener("click", () => {
    updateExports();
    downloadSettings();
  }));

  root.querySelectorAll("[data-download-svg]").forEach((button) => button.addEventListener("click", () => {
    downloadSvg();
  }));

  root.querySelectorAll("[data-download-ascii]").forEach((button) => button.addEventListener("click", () => {
    downloadAsciiText();
  }));

  root.querySelectorAll("[data-copy-ascii]").forEach((button) => button.addEventListener("click", (event) => {
    if (!exportReady) return;
    copyText(getAsciiExportText(), event.currentTarget, "Copied");
  }));

  root.querySelectorAll("[data-download-png]").forEach((button) => button.addEventListener("click", () => {
    downloadAsciiPng();
  }));

  root.querySelector("[data-copy-share]")?.addEventListener("click", (event) => {
    if (!exportReady) return;
    copyText(`${makeShareText()} ${getStudioShareUrl()}`, event.currentTarget, "Copied");
  });

  root.querySelector("[data-copy-share-url]")?.addEventListener("click", (event) => {
    if (!exportReady) return;
    copyText(getStudioShareUrl(), event.currentTarget, "Copied");
  });

  root.querySelector("[data-share-twitter]")?.addEventListener("click", () => {
    shareToTwitter();
  });

  root.querySelector("[data-fullscreen-stage]")?.addEventListener("click", () => {
    stage?.requestFullscreen?.();
  });

  pauseButton?.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? "Resume" : "Pause";
    pauseButton.setAttribute("aria-pressed", String(isPaused));
    scheduleRender();
  });

  const onVisibilityChange = () => scheduleRender();
  document.addEventListener("visibilitychange", onVisibilityChange);
  reduceMotion.addEventListener("change", onVisibilityChange);

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    window.clearTimeout(geometryRebuildTimer);
    if (pendingRenderFrame) cancelAnimationFrame(pendingRenderFrame);
    pendingRenderFrame = 0;
    resizeObserver?.disconnect();
    stageObserver?.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    reduceMotion.removeEventListener("change", onVisibilityChange);
    if (activeGroup) disposeGroup(activeGroup);
    frontMaterial.dispose();
    sideMaterial.dispose();
    detailMaterial.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
  window.addEventListener("pagehide", destroy, { once: true });

  setPresetState("clean", false);
  updateMaterials();
  updateLights();
  updateCamera();
  updateBackground();
  resize();
  updateExportAvailability();
  setViewMode(root.dataset.view || "ascii", false);
  if (!restoreStoredWorkspace()) {
    clearSource({ clearStorage: false });
  }
  if (stage) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    stageObserver = new IntersectionObserver(
      ([entry]) => {
        stageVisible = entry?.isIntersecting ?? false;
        if (stageVisible) {
          lastRenderTime = 0;
          scheduleRender();
        } else if (pendingRenderFrame) {
          cancelAnimationFrame(pendingRenderFrame);
          pendingRenderFrame = 0;
        }
      },
      { rootMargin: "120px 0px", threshold: 0.01 }
    );
    stageObserver.observe(stage);
  }
  scheduleRender();
}
