import {
  Box3,
  CanvasTexture,
  ClampToEdgeWrapping,
  DirectionalLight,
  Group,
  HemisphereLight,
  LinearFilter,
  LoadingManager,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  createBlockGlyphAtlas,
  waitForBlockFont
} from "../sketches/shared/block-glyph-atlas.js";
import {
  cemeteryCompositeFragmentShader,
  cemeteryFogFragmentShader,
  cemeteryFogOverlayFragmentShader,
  cemeteryPlaneVertexShader,
  cemeterySceneFragmentShader
} from "../sketches/shaders/web-cemetery.js";

export const CEMETERY_CONFIG = Object.freeze({
  seed: 1847,
  targetAspect: 1672 / 941,
  mobileAspect: 4 / 3,
  dprCap: 2,
  fogScale: 0.32,
  stoneCount: 24,
  moon: Object.freeze({
    x: 0.7,
    y: 0.18,
    radius: 0.052
  }),
  headstones: Object.freeze([
    Object.freeze({
      file: "/models/cemetery/gravestone-bevel.glb",
      x: 0.32,
      y: 0.59,
      height: 0.09,
      rotationY: -0.24,
      leanZ: -0.025
    }),
    Object.freeze({
      file: "/models/cemetery/gravestone-broken.glb",
      x: 0.4,
      y: 0.68,
      height: 0.14,
      rotationY: 0.18,
      leanZ: 0.045
    }),
    Object.freeze({
      file: "/models/cemetery/gravestone-decorative.glb",
      x: 0.69,
      y: 0.66,
      height: 0.155,
      rotationY: -0.18,
      leanZ: -0.025
    }),
    Object.freeze({
      file: "/models/cemetery/gravestone-round.glb",
      x: 0.58,
      y: 0.86,
      height: 0.17,
      rotationY: 0.22,
      leanZ: 0.06
    }),
    Object.freeze({
      file: "/models/cemetery/gravestone-wide.glb",
      x: 0.77,
      y: 0.8,
      height: 0.12,
      rotationY: -0.3,
      leanZ: -0.035
    })
  ]),
  defaults: Object.freeze({
    fogAmount: 0.84,
    fogSpeed: 0.52,
    moonIntensity: 0.68,
    skyDepth: 0.94,
    terrainLight: 0.86,
    headstoneLight: 0.9,
    parallax: 0.72,
    ditherVariation: 0.16
  }),
  blocktype: Object.freeze({
    targetColumns: 209,
    minimumCssPitch: 5,
    maximumCssPitch: 8,
    minimumPhysicalPitch: 8,
    blackPoint: 0.008,
    whitePoint: 0.22,
    toneCurve: 1.06
  }),
  motion: Object.freeze({
    terrainParallax: 0.015,
    pointerSmoothing: 0.035,
    pointerInfluence: 0.36,
    velocityDecay: 0.16,
    wakeDecay: 0.22,
    wakeGain: 0.34
  }),
  fog: Object.freeze({
    density: 0.74,
    depthContrast: 0.64,
    rear: Object.freeze({ center: 0.62, width: 0.12, opacity: 0.42 }),
    middle: Object.freeze({ center: 0.75, width: 0.155, opacity: 0.56 }),
    near: Object.freeze({ center: 0.9, width: 0.205, opacity: 0.72 })
  }),
  clouds: Object.freeze({
    angle: -0.32,
    scale: 0.88,
    amplitude: 0.68,
    crest: 0.84,
    speed: 0.012,
    world: Object.freeze([5.2, 3.6]),
    layerScale: Object.freeze([0.7, 1.08, 1.7]),
    layerTime: Object.freeze([0.48, 0.72, 1.03]),
    phase: Object.freeze([0.17, 0.61, 1.13]),
  }),
  lighting: Object.freeze({
    headstoneColor: 0x000000,
    headstoneRoughness: 1,
    headstoneEmissive: 0x000000,
    headstoneEmissiveBase: 0,
    headstoneEmissiveRange: 0,
    blocktypeHeadstoneColor: 0x000000,
    blocktypeHeadstoneEmissive: 0x000000,
    blocktypeHeadstoneEmissiveBase: 0,
    blocktypeHeadstoneEmissiveRange: 0,
    moonColor: 0x9a9a9a,
    moonIntensity: 1.08,
    keyLightPosition: Object.freeze([4.5, 12, 5]),
    keyLightTarget: Object.freeze([0.2, -0.45, -0.23]),
    keyLightDirection: Object.freeze([0.325, 0.868, 0.361]),
    shadowProjection: Object.freeze({
      direction: Object.freeze([-0.18, 0.12]),
      length: 0.08,
      width: 0.004,
      softness: 0.006,
      opacity: 0.28
    }),
    bounceColor: 0x101010,
    bounceIntensity: 0.018,
    bouncePosition: Object.freeze([-4, 1.5, 3]),
    headstoneFillSky: 0x000000,
    headstoneFillGround: 0x000000,
    headstoneFillIntensity: 0
  }),
  modelLoader: Object.freeze({
    sourceTextureSuffix: "Textures/colormap.png",
    // The GLBs reference this source art even though loadHeadstones replaces
    // every material immediately; a same-origin PNG avoids five loader errors.
    missingTextureRedirect: "/favicon-16.png"
  }),
  palette: Object.freeze({
    background: 0x000000,
    sky: 0x050505,
    terrain: 0x111111,
    path: 0x1a1a1a,
    headstone: 0x000000,
    cloud: 0x4a4a4a,
    rearFog: 0x282828,
    middleFog: 0x393939,
    nearFog: 0x505050,
    moon: 0x777777,
    moonHalo: 0x242424,
    glyphDark: 0x161616,
    glyphLight: 0xa0a0a0,
    glyphHighlight: 0xc6c6c6
  })
});

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));

const colorVector = (hex) =>
  new Vector3(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255
  );

const disposeObject = (root) => {
  root?.traverse?.((node) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) {
      node.material.forEach((material) => material?.dispose?.());
    } else {
      node.material?.dispose?.();
    }
  });
};

const createCemeteryModelLoader = () => {
  const manager = new LoadingManager();
  manager.setURLModifier((url) =>
    url.endsWith(CEMETERY_CONFIG.modelLoader.sourceTextureSuffix)
      ? CEMETERY_CONFIG.modelLoader.missingTextureRedirect
      : url
  );
  return new GLTFLoader(manager);
};

class WebCemetery {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector("[data-web-cemetery-canvas]");
    this.fallback = root.querySelector("[data-web-cemetery-fallback]");
    this.debugPanel = root.querySelector("[data-web-cemetery-debug]");
    this.debugOutputs = Object.fromEntries(
      ["fps", "resolution", "seed", "headstones", "luminance", "view"].map((name) => [
        name,
        root.querySelector(`[data-web-cemetery-output="${name}"]`)
      ])
    );
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.debugEnabled = new URLSearchParams(window.location.search).get("debug") === "1";
    this.settings = { ...CEMETERY_CONFIG.defaults };
    this.viewMode = 6;
    this.pointer = new Vector2(0.5, 0.5);
    this.targetPointer = new Vector2(0.5, 0.5);
    this.pointerVelocity = new Vector2();
    this.previousPointer = new Vector2(0.5, 0.5);
    this.wake = 0;
    this.intersecting = false;
    this.started = false;
    this.failed = false;
    this.destroyed = false;
    this.contextLost = false;
    this.frameHandle = 0;
    this.lastTimestamp = 0;
    this.elapsed = 0;
    this.width = 1;
    this.height = 1;
    this.aspect = CEMETERY_CONFIG.targetAspect;
    this.dpr = 1;
    this.cropStart = 0;
    this.cropWidth = 1;
    this.headstones = [];
    this.loadedHeadstoneCount = 0;
    this.lastDebugSample = 0;
    this.frames = 0;
    this.fpsStartedAt = 0;

    if (!(this.canvas instanceof HTMLCanvasElement)) return;

    this.bindEvents();
    if (this.debugPanel instanceof HTMLElement) this.debugPanel.hidden = !this.debugEnabled;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.started) this.resize();
    });
    this.resizeObserver.observe(this.root);

    if ("IntersectionObserver" in window) {
      this.intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          this.intersecting = Boolean(entry?.isIntersecting);
          this.lastTimestamp = 0;
          if (this.intersecting) {
            this.start();
            this.requestFrame();
          }
        },
        { rootMargin: "160px 0px", threshold: 0.01 }
      );
      this.intersectionObserver.observe(this.root);
    } else {
      this.intersecting = true;
      this.start();
    }
  }

  start() {
    if (this.started || this.destroyed || this.failed) return;
    this.started = true;
    try {
      this.createRenderer();
      this.createScenes();
      this.configureDebug();
      this.resize();
      void this.loadHeadstones();
      void waitForBlockFont()
        .then(() => {
          if (this.destroyed || this.failed) return;
          this.updateGlyphAtlas(true);
          this.requestFrame();
        })
        .catch(() => {
          // The eagerly-created monospace atlas remains a readable fallback.
        });
    } catch (error) {
      this.fail(error);
    }
  }

  createRenderer() {
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: false,
      antialias: false,
      depth: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: true
    });
    this.renderer.setClearColor(CEMETERY_CONFIG.palette.background, 1);
    this.renderer.autoClear = true;
  }

  createScenes() {
    this.fogScene = new Scene();
    this.scene = new Scene();
    this.compositeScene = new Scene();
    this.fogCamera = new OrthographicCamera(-1, 1, 1, -1, -1, 1);
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
    this.camera.position.z = 5;
    this.camera.lookAt(0, 0, 0);
    this.compositeCamera = new OrthographicCamera(-1, 1, 1, -1, -1, 1);
    const quad = new PlaneGeometry(2, 2);

    this.fogMaterial = new ShaderMaterial({
      vertexShader: cemeteryPlaneVertexShader,
      fragmentShader: cemeteryFogFragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMotion: { value: 1 },
        uSeed: { value: CEMETERY_CONFIG.seed / 65521 },
        uFogAmount: { value: this.settings.fogAmount },
        uFogSpeed: { value: this.settings.fogSpeed },
        uFogDensity: { value: CEMETERY_CONFIG.fog.density },
        uFogDepthContrast: { value: CEMETERY_CONFIG.fog.depthContrast },
        uWake: { value: 0 },
        uPointer: { value: new Vector2(0.5, 0.5) },
        uPointerVelocity: { value: new Vector2() },
        uCrop: { value: new Vector2(0, 1) },
        uFogRear: {
          value: new Vector3(
            CEMETERY_CONFIG.fog.rear.center,
            CEMETERY_CONFIG.fog.rear.width,
            CEMETERY_CONFIG.fog.rear.opacity
          )
        },
        uFogMiddle: {
          value: new Vector3(
            CEMETERY_CONFIG.fog.middle.center,
            CEMETERY_CONFIG.fog.middle.width,
            CEMETERY_CONFIG.fog.middle.opacity
          )
        },
        uFogNear: {
          value: new Vector3(
            CEMETERY_CONFIG.fog.near.center,
            CEMETERY_CONFIG.fog.near.width,
            CEMETERY_CONFIG.fog.near.opacity
          )
        }
      }
    });
    this.fogScene.add(new Mesh(quad, this.fogMaterial));

    this.sceneMaterial = new ShaderMaterial({
      vertexShader: cemeteryPlaneVertexShader,
      fragmentShader: cemeterySceneFragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uFogTexture: { value: null },
        uTime: { value: 0 },
        uMotion: { value: 1 },
        uSeed: { value: CEMETERY_CONFIG.seed / 65521 },
        uTerrainLight: { value: this.settings.terrainLight },
        uMoonIntensity: { value: this.settings.moonIntensity },
        uSkyDepth: { value: this.settings.skyDepth },
        uParallax: { value: this.settings.parallax },
        uTerrainParallax: { value: CEMETERY_CONFIG.motion.terrainParallax },
        uCloudScale: { value: CEMETERY_CONFIG.clouds.scale },
        uCloudAmplitude: { value: CEMETERY_CONFIG.clouds.amplitude },
        uCloudCrest: { value: CEMETERY_CONFIG.clouds.crest },
        uCloudSpeed: { value: CEMETERY_CONFIG.clouds.speed },
        uCloudAngle: { value: CEMETERY_CONFIG.clouds.angle },
        uCloudWorld: { value: new Vector2(...CEMETERY_CONFIG.clouds.world) },
        uCloudLayerScale: { value: new Vector3(...CEMETERY_CONFIG.clouds.layerScale) },
        uCloudLayerTime: { value: new Vector3(...CEMETERY_CONFIG.clouds.layerTime) },
        uCloudPhase: { value: new Vector3(...CEMETERY_CONFIG.clouds.phase) },
        uCloudKeyLight: { value: new Vector3(...CEMETERY_CONFIG.lighting.keyLightDirection) },
        uDebugView: { value: 1 },
        uProceduralGraveMask: { value: new Vector4(1, 1, 1, 1) },
        uProceduralGraveFive: { value: 1 },
        uShadowProjection: {
          value: new Vector4(
            ...CEMETERY_CONFIG.lighting.shadowProjection.direction,
            CEMETERY_CONFIG.lighting.shadowProjection.length,
            CEMETERY_CONFIG.lighting.shadowProjection.width
          )
        },
        uShadowSoftness: { value: CEMETERY_CONFIG.lighting.shadowProjection.softness },
        uShadowOpacity: { value: CEMETERY_CONFIG.lighting.shadowProjection.opacity },
        uMoon: {
          value: new Vector3(
            CEMETERY_CONFIG.moon.x,
            CEMETERY_CONFIG.moon.y,
            CEMETERY_CONFIG.moon.radius
          )
        },
        uSceneAspect: { value: CEMETERY_CONFIG.targetAspect },
        uPointer: { value: new Vector2(0.5, 0.5) },
        uCrop: { value: new Vector2(0, 1) },
        uSkyColor: { value: colorVector(CEMETERY_CONFIG.palette.sky) },
        uCloudColor: { value: colorVector(CEMETERY_CONFIG.palette.cloud) },
        uTerrainColor: { value: colorVector(CEMETERY_CONFIG.palette.terrain) },
        uPathColor: { value: colorVector(CEMETERY_CONFIG.palette.path) },
        uHeadstoneColor: { value: colorVector(CEMETERY_CONFIG.palette.headstone) },
        uRearFogColor: { value: colorVector(CEMETERY_CONFIG.palette.rearFog) },
        uMiddleFogColor: { value: colorVector(CEMETERY_CONFIG.palette.middleFog) },
        uMoonColor: { value: colorVector(CEMETERY_CONFIG.palette.moon) },
        uMoonHaloColor: { value: colorVector(CEMETERY_CONFIG.palette.moonHalo) }
      }
    });
    this.scenePlane = new Mesh(quad.clone(), this.sceneMaterial);
    this.scenePlane.position.z = -2;
    this.scenePlane.renderOrder = -20;
    this.scene.add(this.scenePlane);

    this.headstoneLayer = new Group();
    this.headstoneLayer.renderOrder = 2;
    this.scene.add(this.headstoneLayer);
    this.headstoneMaterial = new MeshStandardMaterial({
      color: CEMETERY_CONFIG.lighting.headstoneColor,
      roughness: CEMETERY_CONFIG.lighting.headstoneRoughness,
      metalness: 0,
      emissive: CEMETERY_CONFIG.lighting.headstoneEmissive,
      emissiveIntensity:
        CEMETERY_CONFIG.lighting.headstoneEmissiveBase +
        CEMETERY_CONFIG.lighting.headstoneEmissiveRange * this.settings.headstoneLight
    });
    this.moonLight = new DirectionalLight(
      CEMETERY_CONFIG.lighting.moonColor,
      CEMETERY_CONFIG.lighting.moonIntensity
    );
    this.moonLight.position.set(...CEMETERY_CONFIG.lighting.keyLightPosition);
    this.moonLight.target.position.set(...CEMETERY_CONFIG.lighting.keyLightTarget);
    this.scene.add(this.moonLight.target);
    this.scene.add(this.moonLight);
    this.bounceLight = new DirectionalLight(
      CEMETERY_CONFIG.lighting.bounceColor,
      CEMETERY_CONFIG.lighting.bounceIntensity
    );
    this.bounceLight.position.set(...CEMETERY_CONFIG.lighting.bouncePosition);
    this.scene.add(this.bounceLight);
    this.headstoneFill = new HemisphereLight(
      CEMETERY_CONFIG.lighting.headstoneFillSky,
      CEMETERY_CONFIG.lighting.headstoneFillGround,
      CEMETERY_CONFIG.lighting.headstoneFillIntensity
    );
    this.scene.add(this.headstoneFill);

    this.fogOverlayMaterial = new ShaderMaterial({
      vertexShader: cemeteryPlaneVertexShader,
      fragmentShader: cemeteryFogOverlayFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uFogTexture: { value: null },
        uFogAmount: { value: this.settings.fogAmount },
        uFogDepthContrast: { value: CEMETERY_CONFIG.fog.depthContrast },
        uFogColor: { value: colorVector(CEMETERY_CONFIG.palette.nearFog) }
      }
    });
    this.fogOverlay = new Mesh(quad.clone(), this.fogOverlayMaterial);
    this.fogOverlay.position.z = 1;
    this.fogOverlay.renderOrder = 20;
    this.scene.add(this.fogOverlay);

    this.compositeMaterial = new ShaderMaterial({
      vertexShader: cemeteryPlaneVertexShader,
      fragmentShader: cemeteryCompositeFragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uSceneTexture: { value: null },
        uGlyphAtlas: { value: null },
        uResolution: { value: new Vector2(1, 1) },
        uGlyphLevels: { value: [0, 0.34, 0.67, 1] },
        uPitch: { value: 8 },
        uSeed: { value: CEMETERY_CONFIG.seed / 65521 },
        uVariation: { value: this.settings.ditherVariation },
        uViewMode: { value: this.viewMode },
        uBlackPoint: { value: CEMETERY_CONFIG.blocktype.blackPoint },
        uWhitePoint: { value: CEMETERY_CONFIG.blocktype.whitePoint },
        uToneCurve: { value: CEMETERY_CONFIG.blocktype.toneCurve },
        uBackground: { value: colorVector(CEMETERY_CONFIG.palette.background) },
        uGlyphDark: { value: colorVector(CEMETERY_CONFIG.palette.glyphDark) },
        uGlyphLight: { value: colorVector(CEMETERY_CONFIG.palette.glyphLight) },
        uGlyphHighlight: { value: colorVector(CEMETERY_CONFIG.palette.glyphHighlight) }
      }
    });
    this.compositeScene.add(new Mesh(quad.clone(), this.compositeMaterial));
    this.updateGlyphAtlas(true);

    this.root.dataset.webCemeterySeed = String(CEMETERY_CONFIG.seed);
    this.root.dataset.webCemeteryStones = String(CEMETERY_CONFIG.stoneCount);
    this.root.dataset.webCemeteryHeadstones = `0/${CEMETERY_CONFIG.headstones.length}`;
  }

  async loadHeadstones() {
    const loader = createCemeteryModelLoader();
    const results = await Promise.allSettled(
      CEMETERY_CONFIG.headstones.map(async (definition, index) => {
        const gltf = await loader.loadAsync(definition.file);
        if (this.destroyed) {
          disposeObject(gltf.scene);
          return null;
        }

        const source = gltf.scene;
        source.traverse((node) => {
          if (!node.isMesh) return;
          if (Array.isArray(node.material)) node.material.forEach((material) => material?.dispose?.());
          else node.material?.dispose?.();
          node.material = this.headstoneMaterial;
          node.castShadow = false;
          node.receiveShadow = false;
          node.renderOrder = 2;
        });

        const bounds = new Box3().setFromObject(source);
        const center = bounds.getCenter(new Vector3());
        const modelHeight = Math.max(0.0001, bounds.max.y - bounds.min.y);
        source.position.set(-center.x, -bounds.min.y, -center.z);
        source.scale.setScalar(1 / modelHeight);

        const pivot = new Group();
        pivot.add(source);
        pivot.userData.definition = definition;
        pivot.userData.index = index;
        this.headstoneLayer.add(pivot);
        this.headstones.push(pivot);
        return pivot;
      })
    );

    if (this.destroyed) return;
    const fallbackMask = results.map((result) =>
      result.status === "fulfilled" && result.value ? 0 : 1
    );
    this.loadedHeadstoneCount = this.headstones.length;
    this.root.dataset.webCemeteryHeadstones = `${this.loadedHeadstoneCount}/${CEMETERY_CONFIG.headstones.length}`;
    this.root.dataset.webCemeteryFallbacks = fallbackMask.join("");
    this.sceneMaterial.uniforms.uProceduralGraveMask.value.set(...fallbackMask.slice(0, 4));
    this.sceneMaterial.uniforms.uProceduralGraveFive.value = fallbackMask[4] || 0;
    this.layoutHeadstones();
    this.updateHeadstoneDebug();
    this.requestFrame();
  }

  layoutHeadstones() {
    for (const pivot of this.headstones) {
      const definition = pivot.userData.definition;
      const screenX = (definition.x - this.cropStart) / this.cropWidth;
      pivot.position.set(
        (screenX * 2 - 1) * this.aspect,
        1 - definition.y * 2,
        -0.25 + pivot.userData.index * 0.012
      );
      pivot.rotation.set(0, definition.rotationY, definition.leanZ);
      pivot.scale.setScalar(definition.height * 2);
    }
  }

  updateHeadstoneDebug() {
    this.debugOutputs.headstones && (
      this.debugOutputs.headstones.textContent = `${this.loadedHeadstoneCount}/${CEMETERY_CONFIG.headstones.length} GLB`
    );
  }

  updateGlyphAtlas(force = false) {
    if (!this.renderer || !this.compositeMaterial) return;
    const cssPitch = clamp(
      Math.round(this.width / CEMETERY_CONFIG.blocktype.targetColumns),
      CEMETERY_CONFIG.blocktype.minimumCssPitch,
      CEMETERY_CONFIG.blocktype.maximumCssPitch
    );
    const physicalPitch = Math.max(
      CEMETERY_CONFIG.blocktype.minimumPhysicalPitch,
      Math.round(cssPitch * this.dpr)
    );
    if (!force && this.atlas?.tileSize === physicalPitch) return;

    this.atlasTexture?.dispose();
    this.atlas = createBlockGlyphAtlas(physicalPitch);
    this.atlasTexture = new CanvasTexture(this.atlas.canvas);
    this.atlasTexture.minFilter = NearestFilter;
    this.atlasTexture.magFilter = NearestFilter;
    this.atlasTexture.wrapS = ClampToEdgeWrapping;
    this.atlasTexture.wrapT = ClampToEdgeWrapping;
    this.atlasTexture.flipY = true;
    this.atlasTexture.needsUpdate = true;
    this.compositeMaterial.uniforms.uGlyphAtlas.value = this.atlasTexture;
    this.compositeMaterial.uniforms.uGlyphLevels.value = this.atlas.levels;
    this.compositeMaterial.uniforms.uPitch.value = this.atlas.tileSize;
  }

  bindEvents() {
    this.onPointerMove = (event) => {
      if (this.reducedMotion.matches) return;
      const bounds = this.canvas.getBoundingClientRect();
      const x = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
      const y = clamp((event.clientY - bounds.top) / Math.max(1, bounds.height), 0, 1);
      const logicalX = this.cropStart + x * this.cropWidth;
      this.targetPointer.set(logicalX, y);
      const next = new Vector2(logicalX, y);
      this.pointerVelocity.copy(next).sub(this.previousPointer).multiplyScalar(18);
      this.previousPointer.copy(next);
      this.wake = clamp(
        this.wake + this.pointerVelocity.length() * CEMETERY_CONFIG.motion.wakeGain,
        0,
        1
      );
      this.requestFrame();
    };
    this.onPointerLeave = () => {
      this.targetPointer.set(0.5, 0.5);
    };
    this.onVisibility = () => this.requestFrame();
    this.onPageTransition = () => this.requestFrame();
    this.onMotionChange = () => {
      this.lastTimestamp = 0;
      this.elapsed = 0;
      this.pointer.set(0.5, 0.5);
      this.targetPointer.set(0.5, 0.5);
      this.requestFrame();
    };
    this.onContextLost = (event) => {
      event.preventDefault();
      this.contextLost = true;
      this.root.dataset.state = "fallback";
      this.cancelFrame();
    };
    this.onContextRestored = () => {
      if (!this.started || this.failed) return;
      this.contextLost = false;
      delete this.root.dataset.webCemeteryError;
      this.lastTimestamp = 0;
      this.resize();
      this.updateGlyphAtlas(true);
      this.requestFrame();
    };
    this.onKeyDown = (event) => {
      if (!this.debugEnabled) return;
      const view = Number(event.key);
      if (view >= 1 && view <= 6) {
        this.setView(view);
        event.preventDefault();
      }
    };

    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerleave", this.onPointerLeave);
    this.canvas.addEventListener("webglcontextlost", this.onContextLost);
    this.canvas.addEventListener("webglcontextrestored", this.onContextRestored);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("page-transition-state", this.onPageTransition);
    window.addEventListener("keydown", this.onKeyDown);
    this.reducedMotion.addEventListener?.("change", this.onMotionChange);
    window.addEventListener("pagehide", () => this.destroy(), { once: true });
  }

  configureDebug() {
    if (!(this.debugPanel instanceof HTMLElement)) return;
    this.debugPanel.hidden = !this.debugEnabled;
    if (!this.debugEnabled) return;

    this.debugOutputs.seed && (this.debugOutputs.seed.textContent = String(CEMETERY_CONFIG.seed));
    this.updateHeadstoneDebug();
    this.debugPanel.querySelectorAll("[data-web-cemetery-view]").forEach((button) => {
      button.addEventListener("click", () => this.setView(Number(button.dataset.webCemeteryView)));
    });
    this.setView(6);
  }

  setView(view) {
    this.viewMode = clamp(Math.round(view), 1, 6);
    this.root.dataset.webCemeteryView = String(this.viewMode);
    if (this.compositeMaterial) this.compositeMaterial.uniforms.uViewMode.value = this.viewMode;
    this.debugOutputs.view && (this.debugOutputs.view.textContent = `[${this.viewMode}]`);
    this.debugPanel?.querySelectorAll("[data-web-cemetery-view]").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.webCemeteryView) === this.viewMode));
    });
    this.requestFrame();
  }

  resize() {
    if (!this.renderer || this.destroyed) return;
    const bounds = this.root.getBoundingClientRect();
    this.width = Math.max(1, Math.round(bounds.width));
    this.height = Math.max(1, Math.round(bounds.height));
    this.dpr = Math.min(window.devicePixelRatio || 1, CEMETERY_CONFIG.dprCap);
    this.aspect = this.width / Math.max(1, this.height);
    this.cropWidth = this.aspect < CEMETERY_CONFIG.targetAspect
      ? clamp(this.aspect / CEMETERY_CONFIG.targetAspect, 0.72, 1)
      : 1;
    this.cropStart = 1 - this.cropWidth;

    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.left = -this.aspect;
    this.camera.right = this.aspect;
    this.camera.top = 1;
    this.camera.bottom = -1;
    this.camera.updateProjectionMatrix();
    this.scenePlane.scale.set(this.aspect, 1, 1);
    this.fogOverlay.scale.set(this.aspect, 1, 1);
    this.layoutHeadstones();

    const pixelWidth = Math.max(1, Math.round(this.width * this.dpr));
    const pixelHeight = Math.max(1, Math.round(this.height * this.dpr));
    this.sceneTarget?.dispose();
    this.fogTarget?.dispose();
    this.sceneTarget = new WebGLRenderTarget(pixelWidth, pixelHeight, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: true,
      stencilBuffer: false
    });
    this.fogTarget = new WebGLRenderTarget(
      Math.max(16, Math.round(pixelWidth * CEMETERY_CONFIG.fogScale)),
      Math.max(16, Math.round(pixelHeight * CEMETERY_CONFIG.fogScale)),
      { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false, stencilBuffer: false }
    );
    this.sceneMaterial.uniforms.uFogTexture.value = this.fogTarget.texture;
    this.fogOverlayMaterial.uniforms.uFogTexture.value = this.fogTarget.texture;
    this.compositeMaterial.uniforms.uSceneTexture.value = this.sceneTarget.texture;
    this.compositeMaterial.uniforms.uResolution.value.set(pixelWidth, pixelHeight);
    this.fogMaterial.uniforms.uCrop.value.set(this.cropStart, this.cropWidth);
    this.sceneMaterial.uniforms.uCrop.value.set(this.cropStart, this.cropWidth);
    this.updateGlyphAtlas();

    this.debugOutputs.resolution && (
      this.debugOutputs.resolution.textContent = `${pixelWidth} × ${pixelHeight}`
    );
    this.lastTimestamp = 0;
    this.requestFrame();
  }

  shouldAnimate() {
    return this.started &&
      !this.failed &&
      !this.reducedMotion.matches &&
      this.intersecting &&
      !document.hidden &&
      document.documentElement.dataset.pageTransitionActive !== "true" &&
      !this.contextLost &&
      !this.destroyed;
  }

  requestFrame() {
    if (
      !this.started ||
      this.failed ||
      this.frameHandle ||
      this.destroyed ||
      this.contextLost ||
      document.hidden
    ) return;
    this.frameHandle = window.requestAnimationFrame((timestamp) => this.tick(timestamp));
  }

  cancelFrame() {
    window.cancelAnimationFrame(this.frameHandle);
    this.frameHandle = 0;
  }

  tick(timestamp) {
    this.frameHandle = 0;
    if (!this.started || this.failed || this.destroyed || this.contextLost) return;
    const delta = this.lastTimestamp ? Math.min(0.05, (timestamp - this.lastTimestamp) / 1000) : 0;
    this.lastTimestamp = timestamp;
    if (!this.reducedMotion.matches) this.elapsed += delta;
    this.update(delta);
    this.render(timestamp);
    if (this.shouldAnimate()) this.requestFrame();
  }

  update(delta) {
    const smoothing = 1 - Math.pow(CEMETERY_CONFIG.motion.pointerSmoothing, Math.max(0.001, delta));
    this.pointer.lerp(this.targetPointer, smoothing * CEMETERY_CONFIG.motion.pointerInfluence);
    this.pointerVelocity.multiplyScalar(
      Math.pow(CEMETERY_CONFIG.motion.velocityDecay, Math.max(0.001, delta))
    );
    this.wake *= Math.pow(CEMETERY_CONFIG.motion.wakeDecay, Math.max(0.001, delta));
    if (this.reducedMotion.matches) {
      this.pointer.set(0.5, 0.5);
      this.pointerVelocity.set(0, 0);
      this.wake = 0;
    }

    const motion = this.reducedMotion.matches ? 0 : 1;
    const terrainOffsetX =
      (this.pointer.x - 0.5) * this.settings.parallax * CEMETERY_CONFIG.motion.terrainParallax * motion;
    const terrainOffsetY =
      (this.pointer.y - 0.5) * this.settings.parallax * CEMETERY_CONFIG.motion.terrainParallax * motion;
    this.headstoneLayer.position.set(
      (2 * this.aspect * terrainOffsetX) / Math.max(0.0001, this.cropWidth),
      -2 * terrainOffsetY,
      0
    );
  }

  render(timestamp) {
    if (!this.renderer || !this.sceneTarget || !this.fogTarget || !this.atlas) return;
    const motion = this.reducedMotion.matches ? 0 : 1;

    this.fogMaterial.uniforms.uTime.value = this.elapsed;
    this.fogMaterial.uniforms.uMotion.value = motion;
    this.fogMaterial.uniforms.uFogAmount.value = this.settings.fogAmount;
    this.fogMaterial.uniforms.uFogSpeed.value = this.settings.fogSpeed;
    this.fogMaterial.uniforms.uWake.value = this.wake;
    this.fogMaterial.uniforms.uPointer.value.copy(this.pointer);
    this.fogMaterial.uniforms.uPointerVelocity.value.copy(this.pointerVelocity);
    this.sceneMaterial.uniforms.uTime.value = this.elapsed;
    this.sceneMaterial.uniforms.uMotion.value = motion;
    this.sceneMaterial.uniforms.uTerrainLight.value = this.settings.terrainLight;
    this.sceneMaterial.uniforms.uMoonIntensity.value = this.settings.moonIntensity;
    this.sceneMaterial.uniforms.uSkyDepth.value = this.settings.skyDepth;
    this.sceneMaterial.uniforms.uParallax.value = this.settings.parallax;
    this.sceneMaterial.uniforms.uDebugView.value = this.viewMode;
    this.sceneMaterial.uniforms.uPointer.value.copy(this.pointer);
    this.fogOverlayMaterial.uniforms.uFogAmount.value = this.settings.fogAmount;
    this.moonLight.intensity =
      CEMETERY_CONFIG.lighting.moonIntensity * this.settings.moonIntensity * this.settings.headstoneLight;
    this.bounceLight.intensity = CEMETERY_CONFIG.lighting.bounceIntensity * this.settings.headstoneLight;
    const headstoneProfile = this.viewMode === 6
      ? {
          color: CEMETERY_CONFIG.lighting.blocktypeHeadstoneColor,
          emissive: CEMETERY_CONFIG.lighting.blocktypeHeadstoneEmissive,
          emissiveBase: CEMETERY_CONFIG.lighting.blocktypeHeadstoneEmissiveBase,
          emissiveRange: CEMETERY_CONFIG.lighting.blocktypeHeadstoneEmissiveRange
        }
      : {
          color: CEMETERY_CONFIG.lighting.headstoneColor,
          emissive: CEMETERY_CONFIG.lighting.headstoneEmissive,
          emissiveBase: CEMETERY_CONFIG.lighting.headstoneEmissiveBase,
          emissiveRange: CEMETERY_CONFIG.lighting.headstoneEmissiveRange
        };
    this.headstoneMaterial.color.setHex(headstoneProfile.color);
    this.headstoneMaterial.emissive.setHex(headstoneProfile.emissive);
    this.headstoneMaterial.emissiveIntensity =
      headstoneProfile.emissiveBase + this.settings.headstoneLight * headstoneProfile.emissiveRange;
    this.compositeMaterial.uniforms.uVariation.value = this.settings.ditherVariation;
    this.compositeMaterial.uniforms.uViewMode.value = this.viewMode;

    this.headstoneLayer.visible = [1, 2, 5, 6].includes(this.viewMode);
    this.fogOverlay.visible = this.viewMode === 1 || this.viewMode === 6;
    this.renderer.setRenderTarget(this.fogTarget);
    this.renderer.clear();
    this.renderer.render(this.fogScene, this.fogCamera);
    this.renderer.setRenderTarget(this.sceneTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.compositeScene, this.compositeCamera);

    if (this.root.dataset.state !== "ready") {
      this.root.dataset.state = "ready";
      this.fallback?.setAttribute("aria-hidden", "true");
    }
    this.updateDebug(timestamp);
  }

  updateDebug(timestamp) {
    if (!this.debugEnabled) return;
    this.frames += 1;
    if (!this.fpsStartedAt) this.fpsStartedAt = timestamp;
    const windowMs = timestamp - this.fpsStartedAt;
    if (windowMs > 800) {
      const fps = Math.round((this.frames * 1000) / windowMs);
      this.debugOutputs.fps && (this.debugOutputs.fps.textContent = `${fps} FPS`);
      this.frames = 0;
      this.fpsStartedAt = timestamp;
    }

    if (timestamp - this.lastDebugSample < 1800 || !this.sceneTarget) return;
    this.lastDebugSample = timestamp;
    const sampleWidth = Math.min(64, this.sceneTarget.width);
    const sampleHeight = Math.min(36, this.sceneTarget.height);
    const pixels = new Uint8Array(sampleWidth * sampleHeight * 4);
    try {
      this.renderer.readRenderTargetPixels(
        this.sceneTarget,
        Math.max(0, Math.floor((this.sceneTarget.width - sampleWidth) / 2)),
        Math.max(0, Math.floor((this.sceneTarget.height - sampleHeight) / 2)),
        sampleWidth,
        sampleHeight,
        pixels
      );
      const values = [];
      for (let index = 0; index < pixels.length; index += 4) {
        values.push(Math.round(pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722));
      }
      values.sort((a, b) => a - b);
      const median = values[Math.floor(values.length / 2)] || 0;
      const darkShare = Math.round((values.filter((value) => value <= 15).length / values.length) * 100);
      this.debugOutputs.luminance && (
        this.debugOutputs.luminance.textContent = `MED ${median} / ${darkShare}% ≤ 15`
      );
      this.root.dataset.webCemeteryMedian = String(median);
    } catch {
      this.debugOutputs.luminance && (this.debugOutputs.luminance.textContent = "READBACK —");
    }
  }

  fail(error) {
    this.failed = true;
    this.cancelFrame();
    this.root.dataset.state = "fallback";
    this.root.dataset.webCemeteryError = error instanceof Error ? error.message : String(error);
    this.sceneTarget?.dispose();
    this.fogTarget?.dispose();
    this.atlasTexture?.dispose();
    if (this.scene && this.moonLight?.target?.parent === this.scene) {
      this.scene.remove(this.moonLight.target);
    }
    disposeObject(this.scene);
    disposeObject(this.fogScene);
    disposeObject(this.compositeScene);
    this.renderer?.dispose();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cancelFrame();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.canvas?.removeEventListener("pointermove", this.onPointerMove);
    this.canvas?.removeEventListener("pointerleave", this.onPointerLeave);
    this.canvas?.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas?.removeEventListener("webglcontextrestored", this.onContextRestored);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("page-transition-state", this.onPageTransition);
    window.removeEventListener("keydown", this.onKeyDown);
    this.reducedMotion.removeEventListener?.("change", this.onMotionChange);
    this.sceneTarget?.dispose();
    this.fogTarget?.dispose();
    this.atlasTexture?.dispose();
    if (this.scene && this.moonLight?.target?.parent === this.scene) {
      this.scene.remove(this.moonLight.target);
    }
    disposeObject(this.scene);
    disposeObject(this.fogScene);
    disposeObject(this.compositeScene);
    this.renderer?.dispose();
  }
}

const instances = new WeakMap();

export const initializeWebCemeterySketches = () => {
  document.querySelectorAll("[data-web-cemetery]").forEach((root) => {
    if (!(root instanceof HTMLElement) || instances.has(root)) return;
    instances.set(root, new WebCemetery(root));
  });
};

initializeWebCemeterySketches();
document.addEventListener("astro:page-load", initializeWebCemeterySketches);
