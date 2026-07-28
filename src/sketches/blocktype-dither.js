import {
  createBlockGlyphAtlas,
  waitForBlockFont
} from "./shared/block-glyph-atlas.js";
import {
  blocktypeFragmentShader,
  blocktypeVertexShader
} from "./shaders/blocktype-composite.js";

const BACKGROUND = [0, 0, 0];
const WAVE_DARK = [38 / 255, 44 / 255, 41 / 255];
const WAVE_LIGHT = [150 / 255, 164 / 255, 154 / 255];
const FOAM = [246 / 255, 249 / 255, 246 / 255];

export const meta = {
  id: "blocktype-dither",
  title: "Blocktype wave field",
  technique: "Trochoidal Gerstner waves / Departure Mono dither",
  description:
    "Six wind-aligned trochoidal swells cross a reflective perspective LCD plane. Height, normals, specular crests, and restrained foam quantize into blank, ░, ▒, and ▓.",
  hint: "Move through the surface to disturb the blocktype wave field.",
  controls: [
    {
      key: "pitch",
      label: "Character pitch",
      type: "range",
      min: 8,
      max: 22,
      step: 1,
      default: 9
    },
    {
      key: "waveScale",
      label: "Wave density",
      type: "range",
      min: 0.5,
      max: 2.4,
      step: 0.05,
      default: 1
    },
    {
      key: "amplitude",
      label: "Wave height",
      type: "range",
      min: 0.2,
      max: 1.25,
      step: 0.05,
      default: 0.72
    },
    {
      key: "steepness",
      label: "Crest steepness",
      type: "range",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.82,
      format: "percent"
    },
    {
      key: "speed",
      label: "Flow speed",
      type: "range",
      min: 0.15,
      max: 1.6,
      step: 0.05,
      default: 0.72
    },
    {
      key: "contrast",
      label: "Dither contrast",
      type: "range",
      min: 0.55,
      max: 1.8,
      step: 0.05,
      default: 1.05
    }
  ]
};

const compileShader = (gl, type, source) => {
  const shader = gl.createShader(type);

  if (!shader) throw new Error("Unable to allocate blocktype wave shader.");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message =
      gl.getShaderInfoLog(shader) || "Unknown blocktype wave shader error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
};

const createProgram = (gl) => {
  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    blocktypeVertexShader
  );
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    blocktypeFragmentShader
  );
  const program = gl.createProgram();

  if (!program) throw new Error("Unable to allocate blocktype wave program.");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message =
      gl.getProgramInfoLog(program) || "Unknown blocktype wave link error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
};

const getUniforms = (gl, program) => {
  const uniforms = Object.fromEntries(
    [
      "u_glyph_atlas",
      "u_resolution",
      "u_pointer_uv",
      "u_glyph_levels",
      "u_pitch",
      "u_time",
      "u_motion",
      "u_pointer_inside",
      "u_wave_scale",
      "u_amplitude",
      "u_steepness",
      "u_speed",
      "u_contrast",
      "u_seed",
      "u_background",
      "u_wave_dark",
      "u_wave_light",
      "u_foam"
    ].map((name) => [name, gl.getUniformLocation(program, name)])
  );

  return uniforms;
};

const formatCoverage = (coverage) =>
  coverage
    .slice(1)
    .map(
      (value, index) =>
        `${["░", "▒", "▓"][index]} ${Math.round(value * 100)}%`
    )
    .join(" / ");

export const createSketch = ({
  canvas,
  context,
  params,
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

  if (!gl) {
    throw new Error("WebGL is required for the blocktype wave field.");
  }

  const program = createProgram(gl);
  const uniforms = getUniforms(gl, program);
  const position = gl.getAttribLocation(program, "a_position");
  const quad = gl.createBuffer();
  const atlasTexture = gl.createTexture();

  if (!quad || !atlasTexture) {
    throw new Error("Unable to allocate blocktype wave resources.");
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1
    ]),
    gl.STATIC_DRAW
  );

  gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const normalizedSeed = (Math.abs(Number(seed) || 0) % 65521) / 65521;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let atlas;
  let atlasKey = "";
  let destroyed = false;
  let statusInitialized = false;
  let lastTime = 0;

  const setIdleStatus = () => {
    const calibration = atlas ? ` / ${formatCoverage(atlas.coverage)}` : "";
    const motionLabel = reducedMotion.matches ? "STATIC" : "LIVE";
    setStatus?.(`${motionLabel} GERSTNER 06 / POINTER WAKE${calibration}`);
  };

  const uploadAtlas = () => {
    const physicalPitch = Math.max(8, Math.round(params.pitch * dpr));
    const nextAtlasKey = `${physicalPitch}`;

    if (nextAtlasKey === atlasKey && atlas) return;

    atlasKey = nextAtlasKey;
    atlas = createBlockGlyphAtlas(physicalPitch);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      atlas.canvas
    );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    if (!statusInitialized) {
      statusInitialized = true;
      setIdleStatus();
    }
  };

  const draw = (time) => {
    if (destroyed) return;

    uploadAtlas();
    if (!atlas) return;

    gl.viewport(0, 0, surface.width, surface.height);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.uniform1i(uniforms.u_glyph_atlas, 0);
    gl.uniform2f(uniforms.u_resolution, surface.width, surface.height);
    gl.uniform2f(uniforms.u_pointer_uv, pointer.x, 1 - pointer.y);
    gl.uniform4fv(uniforms.u_glyph_levels, atlas.levels);
    gl.uniform1f(uniforms.u_pitch, atlas.tileSize);
    gl.uniform1f(uniforms.u_time, time);
    gl.uniform1f(uniforms.u_motion, reducedMotion.matches ? 0 : 1);
    gl.uniform1f(uniforms.u_pointer_inside, pointer.inside ? 1 : 0);
    gl.uniform1f(uniforms.u_wave_scale, params.waveScale);
    gl.uniform1f(uniforms.u_amplitude, params.amplitude);
    gl.uniform1f(uniforms.u_steepness, params.steepness);
    gl.uniform1f(uniforms.u_speed, params.speed);
    gl.uniform1f(uniforms.u_contrast, params.contrast);
    gl.uniform1f(uniforms.u_seed, normalizedSeed);
    gl.uniform3fv(uniforms.u_background, BACKGROUND);
    gl.uniform3fv(uniforms.u_wave_dark, WAVE_DARK);
    gl.uniform3fv(uniforms.u_wave_light, WAVE_LIGHT);
    gl.uniform3fv(uniforms.u_foam, FOAM);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(surface, 0, 0, canvas.width, canvas.height);
  };

  waitForBlockFont()
    .then(() => {
      if (destroyed) return;
      atlasKey = "";
      draw(lastTime);
      setIdleStatus();
    })
    .catch(() => {
      setStatus?.("Departure Mono did not load; using the monospace fallback.");
    });

  return {
    resize(nextSize) {
      ({ width, height, dpr } = nextSize);
      surface.width = Math.max(1, Math.round(width * dpr));
      surface.height = Math.max(1, Math.round(height * dpr));
      atlasKey = "";
    },

    frame({ time }) {
      lastTime = time;
      draw(time);
    },

    destroy() {
      destroyed = true;
      gl.deleteTexture(atlasTexture);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
    }
  };
};
