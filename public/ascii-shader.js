const ASCII_RAMP = " ·•+*✦✶✷✸✹";

const fragmentSource = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;

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

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * 0.18;

  float radius = length(p);
  float ripple = sin((radius * 18.0) - (u_time * 1.8));
  float field = fbm((p * 2.2) + vec2(t, -t * 0.8));
  float warp = fbm((p * 4.0) + field + vec2(sin(t), cos(t)));
  float depth = smoothstep(0.82, 0.1, radius);
  float core = smoothstep(0.58, 0.96, field + warp * 0.38 + depth * 0.25);
  float tone = clamp(0.035 + depth * 0.42 + field * 0.32 + warp * 0.24 + ripple * 0.08 + core * 0.22, 0.0, 1.0);
  vec3 black = vec3(0.012);
  vec3 charcoal = vec3(0.18);
  vec3 mid = vec3(0.52);
  vec3 white = vec3(0.985);

  vec3 color = mix(black, charcoal, smoothstep(0.02, 0.22, tone));
  color = mix(color, mid, smoothstep(0.28, 0.70, tone));
  color = mix(color, white, smoothstep(0.64, 1.0, tone));

  gl_FragColor = vec4(color, 1.0);
}
`;

const vertexSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const PAVE_MARK_MASK = [
  "     ***********     ",
  "   ***************   ",
  "  *****      ******  ",
  " ****         *****  ",
  " ****         *****  ",
  " ****      ******    ",
  " **************      ",
  " ****               ",
  " ****     ******     ",
  "  ****   ******      ",
  "   **********        ",
  "     ******          "
];

const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5
].map((value) => (value + 0.5) / 16);

class AsciiShader {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.pre = root.querySelector("pre");
    this.effectCanvas = document.createElement("canvas");
    this.effectCanvas.className = "ascii-interaction";
    this.effectCanvas.setAttribute("aria-hidden", "true");
    this.effectContext = this.effectCanvas.getContext("2d");
    this.root.append(this.effectCanvas);
    this.pre.lang = "bg";
    this.gl = this.canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true
    });
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.lastAscii = 0;
    this.lastTrailTime = 0;
    this.pixelBuffer = new Uint8Array(4);
    this.trailBuffer = new Float32Array(4);
    this.waveCurrent = new Float32Array(4);
    this.wavePrevious = new Float32Array(4);
    this.waveNext = new Float32Array(4);
    this.asciiLines = [];
    this.mouse = { x: 0.5, y: 0.5 };
    this.interactionTarget = this.root.closest(".hero") || this.root;

    if (!this.gl) {
      this.pre.textContent = this.fallback();
      return;
    }

    this.program = this.createProgram(vertexSource, fragmentSource);
    this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
    this.resolutionLocation = this.gl.getUniformLocation(this.program, "u_resolution");
    this.timeLocation = this.gl.getUniformLocation(this.program, "u_time");
    this.buffer = this.gl.createBuffer();

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      this.gl.STATIC_DRAW
    );

    this.interactionTarget.addEventListener("pointermove", (event) => this.handlePointerMove(event), {
      passive: true
    });
    this.interactionTarget.addEventListener("pointerdown", (event) => this.handlePointerDown(event), {
      passive: true
    });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.root);
    this.resize();
    requestAnimationFrame((time) => this.render(time));
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
    const compact = this.root.classList.contains("compact-stage");
    this.cols = Math.max(48, Math.min(compact ? 140 : 240, Math.ceil(rect.width / (compact ? 8 : 10)) + 8));
    this.rows = Math.max(24, Math.min(compact ? 78 : 96, Math.floor(rect.height / (compact ? 12 : 14))));
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.pixelBuffer = new Uint8Array(this.cols * this.rows * 4);
    this.trailBuffer = new Float32Array(this.cols * this.rows);
    this.waveCurrent = new Float32Array(this.cols * this.rows);
    this.wavePrevious = new Float32Array(this.cols * this.rows);
    this.waveNext = new Float32Array(this.cols * this.rows);
    this.gl.viewport(0, 0, this.cols, this.rows);
    this.fontSize = Math.max(8, rect.width / (this.cols * 0.56));
    this.lineHeight = rect.height / this.rows;
    this.pre.style.fontSize = `${this.fontSize}px`;
    this.pre.style.lineHeight = `${this.lineHeight}px`;
    this.pre.style.transform = "scaleX(1.04)";
    this.pre.style.transformOrigin = "left top";
    this.pre.style.setProperty("--ascii-scale-x", "1.04");

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.effectCanvas.width = Math.ceil(rect.width * pixelRatio);
    this.effectCanvas.height = Math.ceil(rect.height * pixelRatio);
    this.effectCanvas.style.width = `${rect.width}px`;
    this.effectCanvas.style.height = `${rect.height}px`;
    this.effectContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  eventToGrid(event) {
    const rect = this.root.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * (this.cols - 1);
    const y = ((event.clientY - rect.top) / rect.height) * (this.rows - 1);

    return {
      x: Math.max(0, Math.min(this.cols - 1, x)),
      y: Math.max(0, Math.min(this.rows - 1, y))
    };
  }

  handlePointerMove(event) {
    const point = this.eventToGrid(event);
    this.mouse = point;
    this.addTrail(point.x, point.y);
  }

  handlePointerDown(event) {
    const point = this.eventToGrid(event);
    this.mouse = point;
    this.addTrail(point.x, point.y, 1.15);
    this.injectWave(point.x, point.y);
  }

  addTrail(centerX, centerY, strength = 1) {
    const radius = Math.max(4, Math.min(9, this.cols * 0.045));
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(this.cols - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(this.rows - 1, Math.ceil(centerY + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = (x - centerX) / radius;
        const dy = ((y - centerY) / radius) * 1.45;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= 1) {
          const index = y * this.cols + x;
          const opacity = Math.pow(1 - distance, 1.7) * strength;
          this.trailBuffer[index] = Math.max(this.trailBuffer[index], opacity);
        }
      }
    }
  }

  updateTrail(time) {
    if (!this.lastTrailTime) {
      this.lastTrailTime = time;
      return;
    }

    const delta = Math.min(140, Math.max(0, time - this.lastTrailTime));
    const decay = Math.exp(-delta / 520);
    this.lastTrailTime = time;

    for (let i = 0; i < this.trailBuffer.length; i++) {
      const next = this.trailBuffer[i] * decay;
      this.trailBuffer[i] = next > 0.012 ? next : 0;
    }
  }

  injectWave(centerX, centerY) {
    const radius = Math.max(3, Math.min(7, this.cols * 0.032));
    const minX = Math.max(1, Math.floor(centerX - radius));
    const maxX = Math.min(this.cols - 2, Math.ceil(centerX + radius));
    const minY = Math.max(1, Math.floor(centerY - radius));
    const maxY = Math.min(this.rows - 2, Math.ceil(centerY + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const distance = Math.hypot(x - centerX, (y - centerY) * 1.45);
        if (distance > radius) continue;

        const index = y * this.cols + x;
        this.waveCurrent[index] += Math.cos((distance / radius) * Math.PI * 0.5) * 1.8;
      }
    }
  }

  stepWave() {
    const damping = 0.965;

    for (let y = 1; y < this.rows - 1; y++) {
      const row = y * this.cols;
      for (let x = 1; x < this.cols - 1; x++) {
        const index = row + x;
        const neighborAverage =
          (this.waveCurrent[index - 1] +
            this.waveCurrent[index + 1] +
            this.waveCurrent[index - this.cols] +
            this.waveCurrent[index + this.cols]) *
          0.5;
        const next = (neighborAverage - this.wavePrevious[index]) * damping;
        this.waveNext[index] = Math.abs(next) > 0.006 ? next : 0;
      }
    }

    const previous = this.wavePrevious;
    this.wavePrevious = this.waveCurrent;
    this.waveCurrent = this.waveNext;
    this.waveNext = previous;
    this.waveNext.fill(0);
  }

  render(time) {
    const seconds = this.reducedMotion ? 4.2 : time * 0.001;
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.resolutionLocation, this.cols, this.rows);
    gl.uniform1f(this.timeLocation, seconds);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.stepWave();

    if (time - this.lastAscii > 58 || this.reducedMotion) {
      this.lastAscii = time;
      this.updateTrail(time);
      this.pre.textContent = this.toAscii(seconds);
      this.drawAscii();
    }

    if (!this.reducedMotion) {
      requestAnimationFrame((next) => this.render(next));
    }
  }

  toAscii(seconds) {
    const gl = this.gl;
    gl.readPixels(0, 0, this.cols, this.rows, gl.RGBA, gl.UNSIGNED_BYTE, this.pixelBuffer);
    const lines = [];

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
        const wave = Math.abs(this.waveCurrent[displayY * this.cols + x] || 0);
        const trail = this.trailBuffer[displayY * this.cols + x] || 0;
        const adjustedBrightness = Math.min(1, brightness + wave * 0.22 + (trail > 0.08 ? 0.16 : 0));
        const rampIndex = Math.min(
          ASCII_RAMP.length - 1,
          Math.max(0, Math.floor(adjustedBrightness * (ASCII_RAMP.length - 1)))
        );
        line += ASCII_RAMP[rampIndex];
      }
      lines.push(line);
    }

    this.asciiLines = lines;
    return lines.join("\n");
  }

  drawAscii() {
    const ctx = this.effectContext;
    if (!ctx || !this.asciiLines.length) return;

    const rect = this.root.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    const preStyle = getComputedStyle(this.pre);
    const scaleX = Number.parseFloat(preStyle.getPropertyValue("--ascii-scale-x")) || 1;
    const charWidth = (rect.width / Math.max(1, this.cols)) * scaleX;
    ctx.font = `700 ${this.fontSize}px ${preStyle.fontFamily}`;
    ctx.textBaseline = "top";
    ctx.shadowBlur = 0;

    for (let y = 0; y < this.rows; y++) {
      const line = this.asciiLines[y] || "";
      for (let x = 0; x < this.cols; x++) {
        const char = line[x];
        if (!char || char === " ") continue;

        const index = y * this.cols + x;
        const trail = this.trailBuffer[index] || 0;
        const energy = Math.abs(this.waveCurrent[index] || 0);
        const hoverOn = trail > 0.08;
        const waveOn = energy > 0.04;

        if (waveOn) {
          ctx.fillStyle = "#f4f4f4";
          ctx.globalAlpha = Math.min(0.9, 0.45 + energy * 0.45);
        } else if (hoverOn) {
          ctx.fillStyle = "#f4f4ee";
          ctx.globalAlpha = 0.92;
        } else {
          ctx.fillStyle = "rgb(118 118 112)";
          ctx.globalAlpha = 0.38;
        }

        ctx.fillText(char, x * charWidth, y * this.lineHeight);
      }
    }

    ctx.globalAlpha = 1;
  }

  fallback() {
    return Array.from({ length: 40 }, (_, y) =>
      Array.from({ length: 100 }, (_, x) => ASCII_RAMP[(x + y) % ASCII_RAMP.length]).join("")
    ).join("\n");
  }
}

document.querySelectorAll("[data-ascii-shader]").forEach((stage) => {
  try {
    new AsciiShader(stage);
  } catch (error) {
    stage.querySelector("pre").textContent = "shader.offline\n" + String(error.message || error);
  }
});

class ProjectAsciiMark {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.pre = root.querySelector("pre");
    this.gl = this.canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true
    });
    this.lastAscii = 0;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.rows = PAVE_MARK_MASK.length;
    this.cols = Math.max(...PAVE_MARK_MASK.map((line) => line.length));
    this.pixelBuffer = new Uint8Array(this.cols * this.rows * 4);

    if (!this.gl) {
      this.pre.textContent = PAVE_MARK_MASK.join("\n");
      return;
    }

    this.program = this.createProgram(vertexSource, fragmentSource);
    this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
    this.resolutionLocation = this.gl.getUniformLocation(this.program, "u_resolution");
    this.timeLocation = this.gl.getUniformLocation(this.program, "u_time");
    this.buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      this.gl.STATIC_DRAW
    );

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.root);
    requestAnimationFrame((time) => this.render(time));
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
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.gl.viewport(0, 0, this.cols, this.rows);
    this.pre.style.fontSize = `${Math.max(7, rect.width / (this.cols * 0.58))}px`;
    this.pre.style.lineHeight = `${rect.height / this.rows}px`;
  }

  render(time) {
    const seconds = this.reducedMotion ? 3.6 : time * 0.001;
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.resolutionLocation, this.cols, this.rows);
    gl.uniform1f(this.timeLocation, seconds);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (time - this.lastAscii > 70 || this.reducedMotion) {
      this.lastAscii = time;
      this.pre.textContent = this.toAscii();
    }

    if (!this.reducedMotion) {
      requestAnimationFrame((next) => this.render(next));
    }
  }

  toAscii() {
    this.gl.readPixels(0, 0, this.cols, this.rows, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixelBuffer);
    const lines = [];

    for (let y = this.rows - 1; y >= 0; y--) {
      let line = "";
      const maskLine = PAVE_MARK_MASK[this.rows - 1 - y].padEnd(this.cols, " ");
      for (let x = 0; x < this.cols; x++) {
        if (maskLine[x] === " ") {
          line += " ";
          continue;
        }

        const i = (y * this.cols + x) * 4;
        const brightness =
          (this.pixelBuffer[i] * 0.2126 +
            this.pixelBuffer[i + 1] * 0.7152 +
            this.pixelBuffer[i + 2] * 0.0722) /
          255;
        const dither =
          (BAYER_4[(x % 4) + (this.rows - 1 - y) % 4 * 4] - 0.5) * 0.22 +
          Math.sin(seconds * 3.1 + x * 0.73 + y * 1.17) * 0.055;
        const tone = Math.min(1, Math.max(0, brightness + dither));
        const rampIndex = Math.min(
          ASCII_RAMP.length - 1,
          Math.max(2, Math.floor(tone * (ASCII_RAMP.length - 1)))
        );
        line += ASCII_RAMP[rampIndex];
      }
      lines.push(line);
    }

    return lines.join("\n");
  }
}

document.querySelectorAll("[data-project-ascii-mark]").forEach((mark) => {
  try {
    new ProjectAsciiMark(mark);
  } catch (error) {
    mark.querySelector("pre").textContent = "mark.offline\n" + String(error.message || error);
  }
});
