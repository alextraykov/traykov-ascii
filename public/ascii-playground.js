const PLAYGROUND_RAMP = " ·•+*✦✶✷✸✹";
const SASI_FORM = 4;
const HOMEPAGE_DITHER_FORM = 5;
const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5
].map((value) => (value + 0.5) / 16);
const PLAYGROUND_DEFAULTS = {
  mode: "turntable",
  turntable: "obj",
  form: SASI_FORM,
  speed: 0.12,
  scale: 2.2,
  width: 0.52,
  height: 0.92,
  sway: 0.1,
  detail: 0.42,
  smoke: 0.1,
  flicker: 0.08,
  brightness: 0.04,
  contrast: 1.15,
  density: 10,
  glow: 0.22,
  color: 0.08,
  mouse: 0.18,
  click: 0.45,
  enableReveal: 1,
  revealDuration: 1.28,
  revealScatter: 0.55,
  enableDisperse: 1,
  disperse: 1,
  magnetism: 1,
  disperseRadius: 1,
  trailDecay: 1,
  enableExplosion: 1,
  explosion: 1,
  explosionRadius: 1,
  ripple: 1,
  enableColorClick: 0,
  colorClick: 1,
  enableColorDisperse: 0,
  colorDisperse: 1
};
const PLAYGROUND_EXAMPLES = {
  "obj-turntable": {
    ...PLAYGROUND_DEFAULTS,
    mode: "turntable",
    turntable: "obj",
    speed: 0.24,
    scale: 1.94,
    width: 0.52,
    height: 0.92,
    detail: 1,
    density: 5,
    glow: 0.18,
    brightness: -0.02,
    contrast: 1.42,
    mouse: 0.28,
    click: 0.46,
    enableReveal: 1,
    revealDuration: 1.28,
    revealScatter: 0.55,
    enableDisperse: 1,
    disperse: 1,
    magnetism: 1,
    disperseRadius: 1,
    trailDecay: 1,
    enableExplosion: 1,
    explosion: 1,
    explosionRadius: 1,
    ripple: 1,
    enableColorClick: 0,
    colorClick: 1,
    enableColorDisperse: 0,
    colorDisperse: 1
  },
  "landing-shader": {
    ...PLAYGROUND_DEFAULTS,
    form: HOMEPAGE_DITHER_FORM,
    speed: 0.18,
    scale: 2.2,
    width: 0.52,
    height: 0.92,
    sway: 0.06,
    detail: 0.38,
    smoke: 0.08,
    flicker: 0.04,
    brightness: 0.02,
    contrast: 1.18,
    density: 10,
    glow: 0.16,
    color: 0.08,
    mouse: 0.28
  },
  "pave-turntable": {
    ...PLAYGROUND_DEFAULTS,
    mode: "turntable",
    turntable: "pave",
    speed: 0.26,
    scale: 2.1,
    width: 0.64,
    height: 0.9,
    detail: 0.72,
    density: 9,
    glow: 0.12
  },
  "sasi-turntable": {
    ...PLAYGROUND_DEFAULTS,
    mode: "turntable",
    turntable: "sasi",
    speed: 0.28,
    scale: 2.05,
    width: 0.54,
    height: 0.54,
    detail: 0.42,
    density: 9,
    glow: 0.14
  },
  "synapse-turntable": {
    ...PLAYGROUND_DEFAULTS,
    mode: "turntable",
    turntable: "synapse",
    speed: 0.24,
    scale: 2.0,
    width: 0.52,
    height: 0.5,
    detail: 0.62,
    density: 8,
    glow: 0.18
  },
  "slow-flame": {
    ...PLAYGROUND_DEFAULTS,
    mode: "shader",
    turntable: "none",
    form: 0,
    speed: 0.08,
    scale: 2.7,
    width: 0.42,
    height: 1.0,
    sway: 0.16,
    detail: 0.68,
    smoke: 0.2,
    flicker: 0.13,
    brightness: 0.03,
    contrast: 1.32,
    density: 9,
    glow: 0.32,
    color: 0.03,
    mouse: 0.22
  },
  "original-ripple": {
    ...PLAYGROUND_DEFAULTS,
    mode: "shader",
    turntable: "none",
    form: 1,
    speed: 0.12,
    scale: 2.2,
    width: 0.52,
    height: 0.92,
    sway: 0.1,
    detail: 0.42,
    smoke: 0.1,
    flicker: 0.08,
    brightness: 0.04,
    contrast: 1.15,
    density: 10,
    glow: 0.22,
    color: 0.58,
    mouse: 0.18
  },
  "vertical-plume": {
    ...PLAYGROUND_DEFAULTS,
    mode: "shader",
    turntable: "none",
    form: 2,
    speed: 0.15,
    scale: 3.3,
    width: 0.24,
    height: 1.08,
    sway: 0.08,
    detail: 0.52,
    smoke: 0.24,
    flicker: 0.06,
    brightness: 0.02,
    contrast: 1.28,
    density: 9,
    glow: 0.26,
    color: 0.72,
    mouse: 0.2
  },
  "smoke-field": {
    ...PLAYGROUND_DEFAULTS,
    mode: "shader",
    turntable: "none",
    form: 3,
    speed: 0.1,
    scale: 1.55,
    width: 0.76,
    height: 1.0,
    sway: 0.02,
    detail: 0.74,
    smoke: 0.5,
    flicker: 0.02,
    brightness: -0.01,
    contrast: 1.46,
    density: 8,
    glow: 0.18,
    color: 0.42,
    mouse: 0.14
  }
};
const SAMPLING_OFFSETS = [
  [0.28, 0.2],
  [0.72, 0.2],
  [0.22, 0.5],
  [0.78, 0.5],
  [0.28, 0.8],
  [0.72, 0.8]
];

const playgroundFragment = `
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_form;
uniform float u_speed;
uniform float u_scale;
uniform float u_width;
uniform float u_height;
uniform float u_sway;
uniform float u_detail;
uniform float u_smoke;
uniform float u_flicker;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_mouse_strength;
uniform float u_color_shift;
uniform float u_click_strength;
uniform float u_click_decay;
uniform vec2 u_click_position;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.17;
    a *= 0.5;
  }
  return v;
}

float flameField(vec2 uv, vec2 p, float t) {
  float y = uv.y;
  float x = p.x;
  float baseHeat = smoothstep(0.1, 0.0, y);
  float ember = smoothstep(0.36, 0.0, y);
  float sway = sin(y * 5.4 + t * 3.6) * u_sway;
  sway += sin(y * 10.0 - t * 2.1) * u_sway * 0.35;
  vec2 flow = vec2((x + sway) * (u_scale + y * 1.2), y * 3.25 - t * 15.0);
  float slowNoise = fbm(flow);
  float detail = fbm(flow * 2.2 + vec2(4.0, -t * 8.0));
  float lick = fbm(vec2((x + sway) * 5.4, y * 7.0 - t * 20.0));
  float width = mix(u_width, 0.08, smoothstep(0.0, u_height, y));
  width += (slowNoise - 0.5) * 0.17 * u_detail;
  float plume = smoothstep(width, width * 0.18, abs(x + sway + (detail - 0.5) * 0.18));
  float verticalFade = smoothstep(1.04, 0.12, y);
  float tongue = smoothstep(0.32, 0.86, slowNoise + lick * u_detail + ember * 0.26);
  float flicker = 0.9 + sin(t * 7.8 + slowNoise * 3.14159) * u_flicker;
  float flame = plume * verticalFade * tongue * flicker + baseHeat * 0.34;
  float smoke = smoothstep(0.34, 0.98, y) * fbm(vec2(x * 1.4, y * 2.2 - t * 4.0)) * u_smoke;
  return flame + smoke + 0.035;
}

float rippleField(vec2 uv, vec2 p, float t) {
  float radius = length(p);
  float ripple = sin(radius * 18.0 - t * 15.0);
  float field = fbm(p * u_scale + vec2(t * 1.3, -t));
  float warp = fbm(p * (u_scale * 1.8) + field + vec2(sin(t), cos(t)));
  return smoothstep(0.82, 0.1, radius) + ripple * 0.08 + field * 0.28 + warp * u_detail;
}

float plumeField(vec2 uv, vec2 p, float t) {
  float y = uv.y;
  float x = p.x + sin(y * 4.0 + t * 5.0) * u_sway;
  float column = smoothstep(u_width, u_width * 0.16, abs(x));
  float flow = fbm(vec2(x * u_scale, y * 4.4 - t * 12.0));
  float cut = smoothstep(0.18, 0.9, flow + (1.0 - y) * 0.18);
  return column * cut * smoothstep(1.1, 0.08, y) + flow * u_smoke + 0.03;
}

float smokeField(vec2 uv, vec2 p, float t) {
  float field = fbm(vec2(p.x * u_scale, uv.y * u_scale - t * 5.0));
  float field2 = fbm(vec2(p.x * u_scale * 2.0 + field, uv.y * 3.0 - t * 2.5));
  return field * 0.4 + field2 * u_detail + 0.06;
}

float homepageField(vec2 p, float rawTime) {
  float t = rawTime * 0.18;
  float radius = length(p);
  float ripple = sin((radius * 18.0) - (rawTime * 1.8));
  float field = fbm((p * 2.2) + vec2(t, -t * 0.8));
  float warp = fbm((p * 4.0) + field + vec2(sin(t), cos(t)));
  float depth = smoothstep(0.82, 0.1, radius);
  float core = smoothstep(0.58, 0.96, field + warp * 0.38 + depth * 0.25);
  return clamp(0.035 + depth * 0.42 + field * 0.32 + warp * 0.24 + ripple * 0.08 + core * 0.22, 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;

  float tone = flameField(uv, p, t);
  if (u_form > 0.5 && u_form < 1.5) tone = rippleField(uv, p, t);
  if (u_form > 1.5 && u_form < 2.5) tone = plumeField(uv, p, t);
  if (u_form > 2.5) tone = smokeField(uv, p, t);
  if (u_form > 4.5 && u_form < 5.5) tone = homepageField(p, u_time);

  float mouseDist = distance(uv, u_mouse);
  float mouseGlow = smoothstep(0.22, 0.0, mouseDist) * u_mouse_strength;
  float clickDist = distance(uv, u_click_position);
  float clickGlow = smoothstep(0.28, 0.0, clickDist) * u_click_strength * u_click_decay;
  tone = clamp((tone + mouseGlow + clickGlow + u_brightness - 0.5) * u_contrast + 0.5, 0.0, 1.0);

  vec3 black = vec3(0.012);
  vec3 charcoal = vec3(0.18);
  vec3 mid = vec3(0.52);
  vec3 white = vec3(0.985);
  vec3 accent = 0.5 + 0.5 * cos(6.28318 * (u_color_shift + vec3(0.0, 0.34, 0.67)));
  vec3 color = mix(black, charcoal, smoothstep(0.02, 0.22, tone));
  color = mix(color, mid * mix(vec3(1.0), accent, 0.44), smoothstep(0.28, 0.70, tone));
  color = mix(color, white, smoothstep(0.64, 1.0, tone));
  gl_FragColor = vec4(color, 1.0);
}
`;

const playgroundVertex = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

class AsciiPlayground {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.pre = root.querySelector("pre");
    this.pre.lang = "bg";
    this.gl = this.canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false
    });
    this.controls = { ...PLAYGROUND_DEFAULTS };
    this.mouse = { x: 0.5, y: 0.5 };
    this.click = { x: 0.5, y: 0.5, heat: 0 };
    this.lastAscii = 0;
    this.lastFrame = 0;
    this.lastAsciiOutput = this.pre.textContent;
    this.pendingFrame = 0;
    this.pixelBuffer = new Uint8Array(4);
    this.sceneCanvas = document.createElement("canvas");
    this.sceneContext = this.sceneCanvas.getContext("2d", { willReadFrequently: true });
    this.shapeCanvas = document.createElement("canvas");
    this.shapeContext = this.shapeCanvas.getContext("2d", { willReadFrequently: true });
    this.shapeReady = false;
    this.shapePoints = [];
    this.scenePixels = new Uint8ClampedArray(4);
    this.lastTurntablePayload = "";
    this.sasiImage = new Image();
    this.sasiLoaded = false;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.sasiImage.onload = () => {
      this.sasiLoaded = true;
      this.buildSasiShape();
    };
    this.sasiImage.src = "/sasi.svg";

    if (!this.gl) {
      this.pre.textContent = this.fallback();
      return;
    }

    this.program = this.createProgram(playgroundVertex, playgroundFragment);
    this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
    this.uniforms = {};
    [
      "u_resolution",
      "u_mouse",
      "u_time",
      "u_form",
      "u_speed",
      "u_scale",
      "u_width",
      "u_height",
      "u_sway",
      "u_detail",
      "u_smoke",
      "u_flicker",
      "u_brightness",
      "u_contrast",
      "u_mouse_strength",
      "u_color_shift",
      "u_click_strength",
      "u_click_decay",
      "u_click_position"
    ].forEach((name) => {
      this.uniforms[name] = this.gl.getUniformLocation(this.program, name);
    });

    this.buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      this.gl.STATIC_DRAW
    );

    this.root.addEventListener("pointermove", (event) => {
      const rect = this.root.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) / rect.width;
      this.mouse.y = 1 - (event.clientY - rect.top) / rect.height;
    });
    this.root.addEventListener("pointerdown", (event) => {
      const rect = this.root.getBoundingClientRect();
      this.click.x = (event.clientX - rect.left) / rect.width;
      this.click.y = 1 - (event.clientY - rect.top) / rect.height;
      this.click.heat = 1;
    });
    this.root.addEventListener("turntable-ready", () => {
      this.lastTurntablePayload = "";
      this.syncTurntableControls();
    });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.root);
    this.resize();
    this.onVisibilityChange = () => {
      if (!document.hidden) this.scheduleRender();
    };
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("pagehide", () => this.destroy(), { once: true });
    this.scheduleRender();
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(this.gl.getShaderInfoLog(shader) || "Shader compile failed");
    }
    return shader;
  }

  createProgram(vertex, fragment) {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, this.createShader(this.gl.VERTEX_SHADER, vertex));
    this.gl.attachShader(program, this.createShader(this.gl.FRAGMENT_SHADER, fragment));
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(this.gl.getProgramInfoLog(program) || "Shader link failed");
    }
    return program;
  }

  resize() {
    const rect = this.root.getBoundingClientRect();
    this.cols = Math.max(52, Math.min(230, Math.floor(rect.width / this.controls.density)));
    this.rows = Math.max(28, Math.min(120, Math.floor(rect.height / (this.controls.density * 1.35))));
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.sceneScale = 3;
    this.sceneCanvas.width = this.cols * this.sceneScale;
    this.sceneCanvas.height = this.rows * this.sceneScale;
    this.shapeCanvas.width = 180;
    this.shapeCanvas.height = 188;
    this.shapeReady = false;
    if (this.sasiLoaded) this.buildSasiShape();
    this.pixelBuffer = new Uint8Array(this.cols * this.rows * 4);
    this.scenePixels = new Uint8ClampedArray(this.sceneCanvas.width * this.sceneCanvas.height * 4);
    this.gl.viewport(0, 0, this.cols, this.rows);
    this.pre.style.fontSize = `${Math.max(7, rect.width / (this.cols * 0.62))}px`;
    this.pre.style.lineHeight = `${rect.height / this.rows}px`;
  }

  setControl(name, value) {
    this.controls[name] = value;
    if (name === "density") this.resize();
    if (name === "glow") {
      this.root.style.setProperty("--playground-glow", value);
    }
    this.syncTurntableControls();
    this.scheduleRender();
  }

  scheduleRender() {
    if (this.pendingFrame || document.hidden || this.reducedMotion) return;
    this.pendingFrame = requestAnimationFrame((time) => this.render(time));
  }

  syncTurntableControls() {
    if (this.controls.mode !== "turntable") return;
    const active = this.root.querySelector(`[data-playground-turntable="${this.controls.turntable}"]`);
    if (!active) return;

    const detail = {
      speed: this.controls.speed,
      renderSize: Math.max(0.24, Math.min(1.4, this.controls.scale * 0.34)),
      depth: Math.max(8, Math.min(140, Math.round(this.controls.width * 100))),
      bevel: Math.max(0, Math.min(14, this.controls.height * 6)),
      density: this.controls.density,
      glyphDetail: Math.max(2, Math.min(9, Math.round(2 + this.controls.detail * 7))),
      hover: Math.max(
        0,
        Math.min(1, this.controls.turntable === "obj" ? this.controls.mouse : this.controls.mouse + this.controls.click * 0.35)
      ),
      click: Math.max(0, Math.min(1, this.controls.click)),
      brightness: this.controls.brightness,
      contrast: this.controls.contrast,
      glow: this.controls.glow,
      enableReveal: this.controls.enableReveal,
      revealDuration: this.controls.revealDuration * 1000,
      revealScatter: this.controls.revealScatter,
      enableDisperse: this.controls.enableDisperse,
      disperse: this.controls.disperse,
      magnetism: this.controls.magnetism,
      disperseRadius: this.controls.disperseRadius,
      trailDecay: this.controls.trailDecay,
      enableExplosion: this.controls.enableExplosion,
      explosion: this.controls.explosion,
      explosionRadius: this.controls.explosionRadius,
      ripple: this.controls.ripple,
      enableColorClick: this.controls.enableColorClick,
      colorClick: this.controls.colorClick,
      enableColorDisperse: this.controls.enableColorDisperse,
      colorDisperse: this.controls.colorDisperse
    };
    const payload = `${this.controls.turntable}:${JSON.stringify(detail)}`;
    if (payload === this.lastTurntablePayload) return;
    this.lastTurntablePayload = payload;

    active.dispatchEvent(
      new CustomEvent("turntable-controls:update", {
        detail
      })
    );
  }

  render(time) {
    this.pendingFrame = 0;
    if (document.hidden) return;
    const seconds = this.reducedMotion ? 4.2 : time * 0.001;
    const isTurntable = this.controls.mode === "turntable";
    this.root.classList.toggle("is-turntable-example", isTurntable);
    this.root.dataset.activeTurntable = this.controls.turntable || "none";
    this.canvas.style.opacity = isTurntable ? "0" : "";

    if (isTurntable) {
      if (this.pre.textContent) this.pre.textContent = "";
      return;
    }

    if (time - this.lastFrame < 1000 / 15) {
      this.scheduleRender();
      return;
    }
    this.lastFrame = time;

    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(this.uniforms.u_resolution, this.cols, this.rows);
    gl.uniform2f(this.uniforms.u_mouse, this.mouse.x, this.mouse.y);
    gl.uniform1f(this.uniforms.u_time, seconds);
    gl.uniform1f(this.uniforms.u_form, this.controls.form);
    gl.uniform1f(this.uniforms.u_speed, this.controls.speed);
    gl.uniform1f(this.uniforms.u_scale, this.controls.scale);
    gl.uniform1f(this.uniforms.u_width, this.controls.width);
    gl.uniform1f(this.uniforms.u_height, this.controls.height);
    gl.uniform1f(this.uniforms.u_sway, this.controls.sway);
    gl.uniform1f(this.uniforms.u_detail, this.controls.detail);
    gl.uniform1f(this.uniforms.u_smoke, this.controls.smoke);
    gl.uniform1f(this.uniforms.u_flicker, this.controls.flicker);
    gl.uniform1f(this.uniforms.u_brightness, this.controls.brightness);
    gl.uniform1f(this.uniforms.u_contrast, this.controls.contrast);
    gl.uniform1f(this.uniforms.u_mouse_strength, this.controls.mouse);
    gl.uniform1f(this.uniforms.u_color_shift, this.controls.color);
    gl.uniform1f(this.uniforms.u_click_strength, this.controls.click);
    gl.uniform1f(this.uniforms.u_click_decay, this.click.heat);
    gl.uniform2f(this.uniforms.u_click_position, this.click.x, this.click.y);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.click.heat *= 0.94;

    if (time - this.lastAscii > 1000 / 15 || this.reducedMotion) {
      this.lastAscii = time;
      const output = this.toAscii(seconds);
      if (output !== this.lastAsciiOutput) {
        this.pre.textContent = output;
        this.lastAsciiOutput = output;
      }
    }

    this.scheduleRender();
  }

  destroy() {
    if (this.pendingFrame) cancelAnimationFrame(this.pendingFrame);
    this.pendingFrame = 0;
    this.resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    if (this.gl) {
      if (this.buffer) this.gl.deleteBuffer(this.buffer);
      if (this.program) this.gl.deleteProgram(this.program);
      this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
    this.sasiImage.onload = null;
    this.sasiImage.src = "";
  }

  toAscii(seconds) {
    const gl = this.gl;
    gl.readPixels(0, 0, this.cols, this.rows, gl.RGBA, gl.UNSIGNED_BYTE, this.pixelBuffer);
    const lines = [];
    const useDither = this.controls.form === HOMEPAGE_DITHER_FORM;

    for (let y = this.rows - 1; y >= 0; y--) {
      let line = "";
      for (let x = 0; x < this.cols; x++) {
        const i = (y * this.cols + x) * 4;
        const brightness =
          (this.pixelBuffer[i] * 0.2126 +
            this.pixelBuffer[i + 1] * 0.7152 +
            this.pixelBuffer[i + 2] * 0.0722) /
          255;
        const displayY = this.rows - 1 - y;
        const dither = useDither
          ? (BAYER_4[(x % 4) + (displayY % 4) * 4] - 0.5) * 0.22 +
            Math.sin(seconds * 3.1 + x * 0.73 + y * 1.17) * 0.055
          : 0;
        const tone = Math.min(1, Math.max(0, brightness + dither));
        const rampIndex = Math.min(
          PLAYGROUND_RAMP.length - 1,
          Math.max(0, Math.floor(tone * (PLAYGROUND_RAMP.length - 1)))
        );
        line += PLAYGROUND_RAMP[rampIndex];
      }
      lines.push(line);
    }
    return lines.join("\n");
  }

  renderSasiTurntable(seconds) {
    const ctx = this.sceneContext;
    if (!ctx) return;

    const width = this.sceneCanvas.width;
    const height = this.sceneCanvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, width, height);

    if (!this.sasiLoaded) return;

    const angle = seconds * Math.max(0.04, this.controls.speed * 3.6);
    const turn = Math.cos(angle);
    const side = Math.sin(angle);
    const scaleX = 0.24 + Math.abs(turn) * 0.76;
    const baseSize = Math.min(width * 0.72, height * 0.82);
    const drawWidth = baseSize * scaleX;
    const drawHeight = baseSize;
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const depth = Math.round((0.06 + Math.abs(side) * 0.2) * baseSize);
    const offsetX = side * depth;
    const offsetY = depth * 0.16;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.sin(angle * 0.7) * 0.045);

    const frontX = -drawWidth / 2;
    const frontY = -drawHeight / 2;
    const backX = frontX + offsetX;
    const backY = frontY + offsetY;
    this.drawExtrudedSides(ctx, frontX, frontY, drawWidth, drawHeight, offsetX, offsetY, side);
    this.drawSasiFace(ctx, backX, backY, drawWidth, drawHeight, "rgba(92, 92, 88, 0.5)", 0.5);

    const frontLight = 0.82 + Math.max(0, turn) * 0.36;
    this.drawSasiFace(
      ctx,
      frontX,
      frontY,
      drawWidth,
      drawHeight,
      `rgba(${Math.round(190 * frontLight)}, ${Math.round(190 * frontLight)}, ${Math.round(182 * frontLight)}, 0.96)`,
      0.98
    );

    ctx.filter = "blur(8px)";
    this.drawSasiFace(
      ctx,
      frontX - offsetX * 0.18,
      frontY - offsetY * 0.1,
      drawWidth,
      drawHeight,
      `rgba(255, 255, 245, ${0.1 + Math.abs(side) * 0.08})`,
      0.26
    );

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.filter = "none";
  }

  buildSasiShape() {
    const ctx = this.shapeContext;
    if (!ctx || !this.sasiLoaded) return;

    const width = this.shapeCanvas.width;
    const height = this.shapeCanvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.sasiImage, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const points = [];
    const step = 4;

    for (let y = 0; y < height; y += step) {
      let left = -1;
      let right = -1;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (pixels[i + 3] > 8 && pixels[i] < 245) {
          if (left < 0) left = x;
          right = x;
        }
      }
      if (left >= 0 && right >= 0) {
        points.push({ lx: left / width, rx: right / width, y: y / height });
      }
    }

    this.shapePoints = points;
    this.shapeReady = points.length > 0;
  }

  drawExtrudedSides(ctx, x, y, width, height, offsetX, offsetY, side) {
    if (!this.shapeReady || Math.abs(offsetX) < 1) return;

    const useRight = side > 0;
    const sideX = (point) => x + (useRight ? point.rx : point.lx) * width;
    const sideY = (point) => y + point.y * height;

    ctx.save();
    ctx.fillStyle = "rgba(126, 126, 118, 0.46)";
    ctx.beginPath();
    for (const point of this.shapePoints) ctx.lineTo(sideX(point), sideY(point));
    for (let i = this.shapePoints.length - 1; i >= 0; i--) {
      const point = this.shapePoints[i];
      ctx.lineTo(sideX(point) + offsetX, sideY(point) + offsetY);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(222, 222, 210, 0.18)";
    ctx.lineWidth = Math.max(1, width * 0.004);
    ctx.stroke();
    ctx.restore();
  }

  drawSasiFace(ctx, x, y, width, height, fillStyle, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = "invert(1) brightness(0.72) contrast(1.18)";
    ctx.drawImage(this.sasiImage, x, y, width, height);
    ctx.globalCompositeOperation = "source-atop";
    ctx.filter = "none";
    ctx.fillStyle = fillStyle;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  toAsciiFromScene() {
    const ctx = this.sceneContext;
    if (!ctx) return this.fallback();

    const width = this.sceneCanvas.width;
    const height = this.sceneCanvas.height;
    this.scenePixels = ctx.getImageData(0, 0, width, height).data;
    const lines = [];
    const cellWidth = width / this.cols;
    const cellHeight = height / this.rows;

    for (let y = 0; y < this.rows; y++) {
      let line = "";
      for (let x = 0; x < this.cols; x++) {
        let sum = 0;
        let min = 1;
        let max = 0;

        for (const [offsetX, offsetY] of SAMPLING_OFFSETS) {
          const sampleX = Math.min(width - 1, Math.max(0, Math.floor((x + offsetX) * cellWidth)));
          const sampleY = Math.min(height - 1, Math.max(0, Math.floor((y + offsetY) * cellHeight)));
          const value = this.sampleLightness(sampleX, sampleY, width);
          sum += value;
          min = Math.min(min, value);
          max = Math.max(max, value);
        }

        const average = sum / SAMPLING_OFFSETS.length;
        const edge = max - min;
        const contrastBoost = Math.pow(edge, 0.72) * (0.28 + this.controls.contrast * 0.18);
        const tone = Math.min(1, Math.max(0, (average + contrastBoost + this.controls.brightness * 0.5) * 1.08));
        const rampIndex = Math.min(
          PLAYGROUND_RAMP.length - 1,
          Math.max(0, Math.floor(tone * (PLAYGROUND_RAMP.length - 1)))
        );
        line += PLAYGROUND_RAMP[rampIndex];
      }
      lines.push(line);
    }

    return lines.join("\n");
  }

  sampleLightness(x, y, width) {
    const i = (y * width + x) * 4;
    return (
      (this.scenePixels[i] * 0.2126 + this.scenePixels[i + 1] * 0.7152 + this.scenePixels[i + 2] * 0.0722) /
      255
    );
  }

  fallback() {
    return Array.from({ length: 40 }, (_, y) =>
      Array.from({ length: 100 }, (_, x) => PLAYGROUND_RAMP[(x + y) % PLAYGROUND_RAMP.length]).join("")
    ).join("\n");
  }
}

const root = document.querySelector("[data-ascii-playground]");
const playground = root ? new AsciiPlayground(root) : null;

if (playground) {
  const exampleControl = document.querySelector("[data-example]");
  const controlsPanel = document.querySelector(".playground-controls");
  const settingsOutput = document.querySelector("[data-playground-settings]");
  const copySettingsButton = document.querySelector("[data-playground-copy-settings]");
  const tabButtons = document.querySelectorAll("[data-playground-tab]");
  const howPanel = document.querySelector("[data-playground-how]");
  let applyingExample = false;

  const formatControlValue = (value) => (Number.isInteger(value) ? String(value) : value.toFixed(2));

  const updateSettingsPayload = () => {
    if (!settingsOutput) return;
    settingsOutput.value = JSON.stringify(
      {
        renderer: "playground-turntable",
        version: 1,
        preview: exampleControl?.value || "obj-turntable",
        controls: Object.fromEntries(
          Object.entries(playground.controls).map(([key, value]) => [
            key,
            typeof value === "number" ? Number(value.toFixed(3)) : value
          ])
        )
      },
      null,
      2
    );
  };

  const syncControl = (name, value) => {
    const control = document.querySelector(`[data-control="${name}"]`);
    const output = document.querySelector(`[data-output="${name}"]`);

    playground.setControl(name, value);
    if (control) {
      if (control.type === "checkbox") {
        control.checked = value > 0;
      } else {
        control.value = String(value);
      }
    }
    if (output) output.textContent = formatControlValue(value);
    updateSettingsPayload();
  };

  const applyExample = (exampleId) => {
    const example = PLAYGROUND_EXAMPLES[exampleId];
    if (!example) return;

    applyingExample = true;
    Object.entries(example).forEach(([name, value]) => syncControl(name, value));
    applyingExample = false;
    updateSettingsPayload();
  };

  if (exampleControl) {
    exampleControl.addEventListener("change", () => applyExample(exampleControl.value));
    applyExample(exampleControl.value);
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const activeTab = button.dataset.playgroundTab;
      tabButtons.forEach((tabButton) => {
        const isActive = tabButton.dataset.playgroundTab === activeTab;
        tabButton.classList.toggle("is-active", isActive);
        tabButton.setAttribute("aria-selected", String(isActive));
      });
      controlsPanel?.classList.toggle("is-flipped", activeTab === "how");
      if (howPanel) howPanel.hidden = activeTab !== "how";
    });
  });

  if (copySettingsButton && settingsOutput) {
    copySettingsButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(settingsOutput.value);
      copySettingsButton.textContent = "Copied";
      window.setTimeout(() => {
        copySettingsButton.textContent = "Copy settings JSON";
      }, 900);
    });
  }

  document.querySelectorAll("[data-control]").forEach((control) => {
    const name = control.dataset.control;
    const output = document.querySelector(`[data-output="${name}"]`);
    const update = () => {
      const value = control.type === "checkbox" ? (control.checked ? 1 : 0) : Number(control.value);
      playground.setControl(name, value);
      if (output) output.textContent = formatControlValue(value);
      updateSettingsPayload();
    };
    control.addEventListener("input", update);
    control.addEventListener("change", update);
  });

  updateSettingsPayload();
}
