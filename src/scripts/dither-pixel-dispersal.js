export const DITHER_DISPERSAL_DURATION = 920;

const TREMOR_ATTACK = 12;
const TREMOR_FADE_START = 0.34;
const TREMOR_FADE_END = 0.82;
const TREMOR_PHASE_X = 0.13;
const TREMOR_PHASE_Y = 0.11;
const TREMOR_FREQUENCY_X = 64;
const TREMOR_FREQUENCY_Y = 58;
const TREMOR_AMPLITUDE = 4.5;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const smoothstep = (edgeStart, edgeEnd, value) => {
  const progress = clamp((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);
  return progress * progress * (3 - 2 * progress);
};

export const sampleDitherTremor = (progress, position) => {
  const t = clamp(progress, 0, 1);
  const envelope = Math.min(1, t * TREMOR_ATTACK) * (1 - smoothstep(TREMOR_FADE_START, TREMOR_FADE_END, t));
  return {
    x: Math.sin(position.y * TREMOR_PHASE_X + t * TREMOR_FREQUENCY_X) * TREMOR_AMPLITUDE * envelope,
    y: Math.cos(position.x * TREMOR_PHASE_Y + t * TREMOR_FREQUENCY_Y) * TREMOR_AMPLITUDE * envelope
  };
};

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_uv;
  attribute vec2 a_direction;
  attribute float a_delay;
  attribute float a_size;

  uniform vec2 u_resolution;
  uniform float u_progress;
  uniform float u_dpr;
  uniform float u_spread;

  varying vec2 v_uv;
  varying float v_alpha;

  void main() {
    float t = clamp((u_progress - a_delay) / max(0.001, 1.0 - a_delay), 0.0, 1.0);
    float ease = 1.0 - pow(1.0 - t, 4.2);
    vec2 position = a_position + a_direction * u_spread * ease;
    float shakeEnvelope = min(1.0, t * ${TREMOR_ATTACK.toFixed(1)}) * (1.0 - smoothstep(${TREMOR_FADE_START.toFixed(2)}, ${TREMOR_FADE_END.toFixed(2)}, t));
    vec2 shake = vec2(
      sin(a_position.y * ${TREMOR_PHASE_X.toFixed(2)} + t * ${TREMOR_FREQUENCY_X.toFixed(1)}),
      cos(a_position.x * ${TREMOR_PHASE_Y.toFixed(2)} + t * ${TREMOR_FREQUENCY_Y.toFixed(1)})
    ) * ${TREMOR_AMPLITUDE.toFixed(1)} * shakeEnvelope;
    position += shake;
    position.y += 64.0 * t * t;

    vec2 clip = (position / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    gl_PointSize = max(1.0, a_size * mix(1.0, 0.42, t) * u_dpr);

    v_uv = a_uv;
    v_alpha = 1.0 - smoothstep(0.48, 1.0, t);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform float u_brightness;
  uniform float u_invert;
  varying vec2 v_uv;
  varying float v_alpha;

  void main() {
    vec4 color = texture2D(u_texture, v_uv);
    if (color.a < 0.08) discard;
    vec3 particle = mix(color.rgb, vec3(1.0) - color.rgb, u_invert);
    gl_FragColor = vec4(particle * u_brightness, color.a * v_alpha);
  }
`;

const hash = (x, y, seed) => {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
};

const compileShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl) => {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

const createBuffer = (gl, values) => {
  const buffer = gl.createBuffer();
  if (!buffer) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
  return buffer;
};

export const createDitherPixelDisperser = (root, field) => {
  const canvas = root.querySelector("[data-dither-disperse]");
  if (!(canvas instanceof HTMLCanvasElement)) return null;

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true
  });
  if (!gl) return null;

  const program = createProgram(gl);
  if (!program) return null;

  const attributes = {
    position: gl.getAttribLocation(program, "a_position"),
    uv: gl.getAttribLocation(program, "a_uv"),
    direction: gl.getAttribLocation(program, "a_direction"),
    delay: gl.getAttribLocation(program, "a_delay"),
    size: gl.getAttribLocation(program, "a_size")
  };
  const uniforms = {
    resolution: gl.getUniformLocation(program, "u_resolution"),
    progress: gl.getUniformLocation(program, "u_progress"),
    dpr: gl.getUniformLocation(program, "u_dpr"),
    spread: gl.getUniformLocation(program, "u_spread"),
    texture: gl.getUniformLocation(program, "u_texture"),
    brightness: gl.getUniformLocation(program, "u_brightness"),
    invert: gl.getUniformLocation(program, "u_invert")
  };

  let bursts = [];
  let frame = 0;
  let available = true;
  let surfaceDirty = true;
  let surface = { width: 0, height: 0, dpr: 1 };
  const mobileMode = window.matchMedia("(pointer: coarse), (max-width: 820px)");

  const bindAttribute = (location, buffer, size) => {
    if (location < 0 || !buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  };

  const resize = () => {
    const dpr = clamp(window.devicePixelRatio || 1, 1, mobileMode.matches ? 1.5 : 2);
    if (surfaceDirty || surface.dpr !== dpr) {
      const width = Math.max(1, field.clientWidth);
      const height = Math.max(1, field.clientHeight);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      surface = { width, height, dpr };
      surfaceDirty = false;
      gl.viewport(0, 0, pixelWidth, pixelHeight);
    }
    return surface;
  };

  const releaseBurst = (burst) => {
    gl.deleteTexture(burst.texture);
    Object.values(burst.buffers).forEach((buffer) => gl.deleteBuffer(buffer));
  };

  const buildBurst = (item, origin, seed, startedAt) => {
    const source = item.querySelector("[data-dither-canvas]");
    if (!(source instanceof HTMLCanvasElement) || source.width === 0 || source.height === 0) return null;

    const width = item.offsetWidth;
    const height = item.offsetHeight;
    const ageScale = Number.parseFloat(item.style.getPropertyValue("--trail-age-scale")) || 1;
    const ageBrightness = Number.parseFloat(item.style.getPropertyValue("--trail-age-brightness")) || 1;
    const disperseInvert = clamp(
      Number.parseFloat(getComputedStyle(root).getPropertyValue("--dither-trail-disperse-invert")) || 0,
      0,
      1
    );
    const x = Number.parseFloat(item.style.getPropertyValue("--trail-x")) || 0;
    const y = Number.parseFloat(item.style.getPropertyValue("--trail-y")) || 0;
    const angle = (Number.parseFloat(item.style.getPropertyValue("--trail-angle")) || 0) * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const cell = mobileMode.matches
      ? clamp(Math.round(Math.min(width, height) / 42), 5, 7)
      : clamp(Math.round(Math.min(width, height) / 64), 3, 4);
    const positions = [];
    const uvs = [];
    const directions = [];
    const delays = [];
    const sizes = [];

    for (let localY = cell / 2; localY < height; localY += cell) {
      for (let localX = cell / 2; localX < width; localX += cell) {
        const centeredX = localX - width / 2;
        const centeredY = localY - height / 2;
        const pointX = x + width / 2 + (centeredX * cos - centeredY * sin) * ageScale;
        const pointY = y + height / 2 + (centeredX * sin + centeredY * cos) * ageScale;
        const jitter = (hash(localX, localY, seed) - 0.5) * 1.3;
        let dx = pointX - origin.x;
        let dy = pointY - origin.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        const baseAngle = Math.atan2(dy, dx) + jitter;
        const velocity = 0.72 + hash(localY, localX, seed + 1) * 0.68;

        dx = Math.cos(baseAngle) * velocity;
        dy = Math.sin(baseAngle) * velocity;
        positions.push(pointX, pointY);
        uvs.push(localX / width, localY / height);
        directions.push(dx, dy);
        delays.push(0);
        sizes.push((cell + 0.45) * ageScale);
      }
    }

    const texture = gl.createTexture();
    if (!texture) return null;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    return {
      count: sizes.length,
      texture,
      buffers: {
        position: createBuffer(gl, positions),
        uv: createBuffer(gl, uvs),
        direction: createBuffer(gl, directions),
        delay: createBuffer(gl, delays),
        size: createBuffer(gl, sizes)
      },
      start: startedAt,
      duration: DITHER_DISPERSAL_DURATION,
      spread: clamp(root.clientWidth * 0.27, 240, 440),
      brightness: ageBrightness,
      invert: disperseInvert
    };
  };

  const render = (now) => {
    frame = 0;
    if (!available) return;

    const currentSurface = resize();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform2f(uniforms.resolution, currentSurface.width, currentSurface.height);
    gl.uniform1f(uniforms.dpr, currentSurface.dpr);
    gl.uniform1i(uniforms.texture, 0);

    bursts = bursts.filter((burst) => {
      const progress = clamp((now - burst.start) / burst.duration, 0, 1);
      if (progress >= 1) {
        releaseBurst(burst);
        return false;
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, burst.texture);
      bindAttribute(attributes.position, burst.buffers.position, 2);
      bindAttribute(attributes.uv, burst.buffers.uv, 2);
      bindAttribute(attributes.direction, burst.buffers.direction, 2);
      bindAttribute(attributes.delay, burst.buffers.delay, 1);
      bindAttribute(attributes.size, burst.buffers.size, 1);
      gl.uniform1f(uniforms.progress, progress);
      gl.uniform1f(uniforms.spread, burst.spread);
      gl.uniform1f(uniforms.brightness, burst.brightness);
      gl.uniform1f(uniforms.invert, burst.invert);
      gl.drawArrays(gl.POINTS, 0, burst.count);
      return true;
    });

    if (bursts.length > 0) frame = window.requestAnimationFrame(render);
  };

  const disperse = (items, origin, startedAt = performance.now()) => {
    if (!available || items.length === 0) return false;
    const nextBursts = items.map((item, index) => buildBurst(item, origin, index + bursts.length, startedAt)).filter(Boolean);
    if (nextBursts.length === 0) return false;
    bursts.push(...nextBursts);
    if (!frame) {
      render(startedAt + 16);
      if (bursts.length > 0 && !frame) frame = window.requestAnimationFrame(render);
    }
    return true;
  };

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    available = false;
    window.cancelAnimationFrame(frame);
    frame = 0;
    bursts = [];
  });

  window.addEventListener("resize", () => {
    surfaceDirty = true;
  }, { passive: true });

  return { disperse };
};
