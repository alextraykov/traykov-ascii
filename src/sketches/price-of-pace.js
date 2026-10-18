import {
  createBlockGlyphAtlas,
  waitForBlockFont
} from "./shared/block-glyph-atlas.js";
import {
  paceGlyphFragmentShader,
  paceToneFragmentShader,
  paceVertexShader
} from "./shaders/price-of-pace.js";

const BACKGROUND = [0, 0, 0];
const INK_DARK = [38 / 255, 44 / 255, 41 / 255];
const INK_LIGHT = [150 / 255, 164 / 255, 154 / 255];
const HIGHLIGHT = [246 / 255, 249 / 255, 246 / 255];
const OLD_DARK = [24 / 255, 26 / 255, 25 / 255];
const OLD_LIGHT = [74 / 255, 80 / 255, 77 / 255];

// How far behind an old copy is, in seconds of turning.
const OLD_COPY_LAG = 0.45;

export const meta = {
  id: "price-of-pace",
  title: "The price of pace",
  technique: "Raymarched loop / Departure Mono dither / row slip",
  description:
    "A loop turns at the pace you set. Slow, every row lines up and nothing moves. Fast, it moves, and rows slip out of line or show an older copy.",
  hint: "Move left for slow, right for fast."
};

const compileShader = (gl, type, source) => {
  const shader = gl.createShader(type);

  if (!shader) throw new Error("Unable to allocate the pace shader.");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown pace shader error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
};

const createProgram = (gl, fragmentSource, uniformNames) => {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, paceVertexShader);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (!program) throw new Error("Unable to allocate the pace program.");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Unknown pace link error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return {
    program,
    position: gl.getAttribLocation(program, "a_position"),
    uniforms: Object.fromEntries(
      uniformNames.map((name) => [name, gl.getUniformLocation(program, name)])
    )
  };
};

const createTexture = (gl) => {
  const texture = gl.createTexture();

  if (!texture) throw new Error("Unable to allocate a pace texture.");

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
};

const createRandom = (seed) => {
  let state = (Math.abs(Math.floor(seed)) % 2147483646) + 1;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

export const createSketch = ({
  canvas,
  context,
  pointer,
  seed,
  setStatus
}) => {
  const surface = document.createElement("canvas");
  const gl = surface.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: true,
    stencil: false
  });

  if (!gl) throw new Error("WebGL is required for the price of pace.");

  const tonePass = createProgram(gl, paceToneFragmentShader, [
    "u_grid",
    "u_phase",
    "u_old_phase",
    "u_wobble"
  ]);
  const glyphPass = createProgram(gl, paceGlyphFragmentShader, [
    "u_glyph_atlas",
    "u_tone",
    "u_rows",
    "u_resolution",
    "u_grid",
    "u_glyph_levels",
    "u_pitch",
    "u_seed",
    "u_background",
    "u_ink_dark",
    "u_ink_light",
    "u_highlight",
    "u_old_dark",
    "u_old_light"
  ]);

  const quad = gl.createBuffer();
  const framebuffer = gl.createFramebuffer();
  const atlasTexture = createTexture(gl);
  const toneTexture = createTexture(gl);
  const rowTexture = createTexture(gl);

  if (!quad || !framebuffer) {
    throw new Error("Unable to allocate pace resources.");
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const random = createRandom(seed || 2026);
  const normalizedSeed = (Math.abs(Number(seed) || 0) % 65521) / 65521;
  let pitch = 16;
  let columns = 1;
  let rows = 1;
  let atlas;
  let atlasPitch = 0;
  let rowData = new Uint8Array(4);
  let destroyed = false;

  // Pace is 0–1. It sets how fast the loop turns and how much it costs.
  let pace = 0.72;
  let phase = 0;
  let lastTime = 0;
  let nextReroll = 0;
  let slipped = 0;
  let oldCopies = 0;

  const turnRate = (value) => 0.04 + value * value * 2.6;

  const rerollRows = () => {
    rowData = new Uint8Array(rows * 4);
    slipped = 0;
    oldCopies = 0;

    const tearChance = Math.pow(Math.max(0, pace - 0.12) / 0.88, 1.4) * 0.5;
    const oldChance = Math.pow(Math.max(0, pace - 0.3) / 0.7, 2) * 0.45;
    const maxSlip = Math.max(1, Math.round(columns * 0.14 * pace));
    let row = 0;

    while (row < rows) {
      const bandHeight = 1 + Math.floor(random() * 4);
      const torn = random() < tearChance;
      const slip = torn
        ? Math.round((random() * 2 - 1) * maxSlip) || 1
        : 0;
      const old = torn && random() < oldChance / Math.max(0.01, tearChance);

      for (let offset = 0; offset < bandHeight && row < rows; offset += 1, row += 1) {
        rowData[row * 4] = 128 + Math.max(-127, Math.min(127, slip));
        rowData[row * 4 + 1] = old ? 255 : 0;
        if (slip) slipped += 1;
        if (old) oldCopies += 1;
      }
    }

    gl.bindTexture(gl.TEXTURE_2D, rowTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, rowData);

    setStatus?.({ pace, slipped, oldCopies, rows });
  };

  const uploadAtlas = () => {
    if (atlas && atlasPitch === pitch) return;

    atlasPitch = pitch;
    atlas = createBlockGlyphAtlas(pitch);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  };

  const bindQuad = (pass) => {
    gl.useProgram(pass.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(pass.position);
    gl.vertexAttribPointer(pass.position, 2, gl.FLOAT, false, 0, 0);
  };

  const draw = (time) => {
    if (destroyed) return;

    uploadAtlas();

    const wobble = time * 0.35;
    const oldPhase = phase - turnRate(pace) * OLD_COPY_LAG;

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, columns, rows);
    bindQuad(tonePass);
    gl.uniform2f(tonePass.uniforms.u_grid, columns, rows);
    gl.uniform1f(tonePass.uniforms.u_phase, phase);
    gl.uniform1f(tonePass.uniforms.u_old_phase, oldPhase);
    gl.uniform1f(tonePass.uniforms.u_wobble, wobble);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, surface.width, surface.height);
    bindQuad(glyphPass);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, toneTexture);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, rowTexture);

    const u = glyphPass.uniforms;
    gl.uniform1i(u.u_glyph_atlas, 0);
    gl.uniform1i(u.u_tone, 1);
    gl.uniform1i(u.u_rows, 2);
    gl.uniform2f(u.u_resolution, surface.width, surface.height);
    gl.uniform2f(u.u_grid, columns, rows);
    gl.uniform4fv(u.u_glyph_levels, atlas.levels);
    gl.uniform1f(u.u_pitch, atlas.tileSize);
    gl.uniform1f(u.u_seed, normalizedSeed);
    gl.uniform3fv(u.u_background, BACKGROUND);
    gl.uniform3fv(u.u_ink_dark, INK_DARK);
    gl.uniform3fv(u.u_ink_light, INK_LIGHT);
    gl.uniform3fv(u.u_highlight, HIGHLIGHT);
    gl.uniform3fv(u.u_old_dark, OLD_DARK);
    gl.uniform3fv(u.u_old_light, OLD_LIGHT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.activeTexture(gl.TEXTURE0);

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(surface, 0, 0, canvas.width, canvas.height);
  };

  waitForBlockFont()
    .then(() => {
      if (destroyed) return;
      atlas = undefined;
      draw(lastTime);
    })
    .catch(() => {});

  return {
    resize({ width, height, dpr }) {
      pitch = Math.max(8, Math.round(8 * dpr));
      surface.width = Math.max(1, Math.round(width * dpr));
      surface.height = Math.max(1, Math.round(height * dpr));
      columns = Math.max(1, Math.ceil(surface.width / pitch));
      rows = Math.max(1, Math.ceil(surface.height / pitch));

      gl.bindTexture(gl.TEXTURE_2D, toneTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, columns, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, toneTexture, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      rerollRows();
    },

    frame({ time, delta }) {
      // Your hand sets the pace; without it, pace settles back to fast.
      const target = pointer.inside ? 0.02 + pointer.x * 0.98 : 0.72;
      pace = delta === 0 ? target : pace + (target - pace) * Math.min(1, delta * 4);
      phase += delta * turnRate(pace);
      lastTime = time;

      // Rows re-slip in steps: rarely when slow, constantly when fast.
      if (time >= nextReroll || delta === 0) {
        rerollRows();
        nextReroll = time + 1.1 - pace * 0.95;
      }

      draw(time);
    },

    destroy() {
      destroyed = true;
      gl.deleteTexture(atlasTexture);
      gl.deleteTexture(toneTexture);
      gl.deleteTexture(rowTexture);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteBuffer(quad);
      gl.deleteProgram(tonePass.program);
      gl.deleteProgram(glyphPass.program);
    }
  };
};
