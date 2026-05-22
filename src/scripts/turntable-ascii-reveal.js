const clamp01 = (value) => Math.max(0, Math.min(1, value));
const easeOutCubic = (value) => 1 - Math.pow(1 - clamp01(value), 3);
const easeInOutSine = (value) => -(Math.cos(Math.PI * clamp01(value)) - 1) / 2;

const makeBlankLine = (line) => " ".repeat(line.length);
const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (character) => {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    if (character === ">") return "&gt;";
    if (character === '"') return "&quot;";
    return "&#39;";
  });

const makeStrokeLine = (line, progress = 1, glyph = "-") => {
  const cutoff = Math.floor(line.length * clamp01(progress));
  let revealed = "";
  for (let x = 0; x < line.length; x++) {
    revealed += x <= cutoff && line[x] !== " " ? glyph : " ";
  }
  return revealed;
};

const revealLine = (line, progress, scatter = 0.55) => {
  if (progress >= 1) return line;
  if (progress <= 0) return makeBlankLine(line);

  const thresholdAmount = Math.max(0, Math.min(1, scatter));
  let revealed = "";
  for (let x = 0; x < line.length; x++) {
    const threshold = ((x * 17 + line.length * 3) % 29) / 29;
    const mixedThreshold = threshold * thresholdAmount;
    revealed += progress >= mixedThreshold ? line[x] : " ";
  }
  return revealed;
};

export function createTurntableAsciiReveal(root, options = {}) {
  const reducedMotion = options.reducedMotion;
  const isReduced = () => reducedMotion?.matches ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const config = {
    duration: Number(root.dataset.asciiRevealDuration || options.duration || 1100),
    mode: root.dataset.asciiRevealMode || options.mode || "characters",
    scatter: Number(root.dataset.asciiRevealScatter || options.scatter || 0.55),
    lineGlyph: root.dataset.asciiRevealLineGlyph || options.lineGlyph || "-",
    rippleRows: Number(root.dataset.asciiRevealRippleRows || options.rippleRows || 1.45),
    lineDurationRatio: Number(root.dataset.asciiRevealLineDurationRatio || options.lineDurationRatio || 0.5),
    enabled: root.dataset.asciiReveal !== "false" && options.enabled !== false
  };
  let startedAt = 0;
  let active = false;

  const setInk = (value) => {
    const ink = clamp01(value);
    root.style.setProperty("--obj-reveal-ink", ink.toFixed(3));
    root.style.setProperty("--obj-reveal-ink-percent", `${(ink * 100).toFixed(1)}%`);
  };

  const setRipple = (value) => {
    root.style.setProperty("--obj-reveal-ripple", Math.max(0, value).toFixed(3));
  };

  const resetVisualState = () => {
    root.classList.remove("is-ascii-line-revealing", "is-ascii-reloading");
    setInk(1);
    setRipple(0);
  };

  const start = (time = performance.now()) => {
    if (!config.enabled || isReduced()) {
      active = false;
      root.classList.remove("is-ascii-revealing");
      root.classList.add("is-ascii-revealed");
      resetVisualState();
      return;
    }

    startedAt = time;
    active = true;
    root.classList.add("is-ascii-revealing");
    root.classList.remove("is-ascii-revealed");
    root.classList.toggle("is-ascii-line-revealing", config.mode === "reload");
    root.classList.remove("is-ascii-reloading");
    setInk(config.mode === "reload" ? 0 : 1);
    setRipple(0);
  };

  const finish = () => {
    active = false;
    root.classList.remove("is-ascii-revealing", "is-turntable-loading");
    root.classList.add("is-ascii-revealed");
    resetVisualState();
  };

  const renderReload = (lines, elapsed) => {
    const duration = Math.max(240, config.duration);
    const lineDuration = Math.min(920, Math.max(420, duration * config.lineDurationRatio));
    const reloadDuration = Math.max(260, duration - lineDuration);

    if (elapsed < lineDuration) {
      const progress = easeOutCubic(elapsed / lineDuration);
      const revealEdge = progress * (lines.length + 1);
      root.classList.add("is-ascii-line-revealing");
      root.classList.remove("is-ascii-reloading");
      setInk(0);
      setRipple(0);

      return {
        html: true,
        value: lines
          .map((line, y) => {
            const rowProgress = revealEdge - y;
            const opacity = clamp01(rowProgress * 1.4 - 0.14);
            const stroke =
              rowProgress >= 1
                ? makeStrokeLine(line, 1, config.lineGlyph)
                : rowProgress <= 0
                  ? makeBlankLine(line)
                  : makeStrokeLine(line, easeOutCubic(rowProgress), config.lineGlyph);
            return `<span class="ascii-reveal-row" style="opacity:${opacity.toFixed(3)}">${escapeHtml(stroke)}</span>`;
          })
          .join("")
      };
    }

    const reloadProgress = easeInOutSine((elapsed - lineDuration) / reloadDuration);
    const rippleEnvelope = Math.sin(Math.PI * reloadProgress);
    const reloadEdge = reloadProgress * (lines.length + 2);
    const rippleRows = config.rippleRows * rippleEnvelope;
    root.classList.remove("is-ascii-line-revealing");
    root.classList.add("is-ascii-reloading");
    setInk(easeOutCubic((reloadProgress - 0.06) / 0.94));
    setRipple(rippleRows);

    return {
      html: false,
      value: lines
        .map((line, y) => {
          const phase = y * 0.58 - reloadProgress * 8.4;
          const sourceY = Math.max(0, Math.min(lines.length - 1, Math.round(y + Math.sin(phase) * rippleRows)));
          const sourceLine = lines[sourceY] || line;
          const rowProgress = reloadEdge - y;

          if (rowProgress <= 0) return makeStrokeLine(line, 1, config.lineGlyph);
          if (rowProgress >= 1) return sourceLine;
          return revealLine(sourceLine, easeOutCubic(rowProgress), Math.max(config.scatter, 0.74));
        })
        .join("\n")
    };
  };

  const renderFrame = (lines, time = performance.now()) => {
    if (!active || !lines.length || isReduced()) {
      finish();
      return { html: false, value: lines.join("\n") };
    }

    const elapsed = time - startedAt;
    if (config.mode === "reload") {
      const duration = Math.max(240, config.duration);
      if (elapsed >= duration) {
        finish();
        return { html: false, value: lines.join("\n") };
      }
      return renderReload(lines, elapsed);
    }

    const progress = easeOutCubic(elapsed / Math.max(120, config.duration));
    if (progress >= 0.995) {
      finish();
      return { html: false, value: lines.join("\n") };
    }

    const revealEdge = progress * (lines.length + 1);
    return {
      html: false,
      value: lines
        .map((line, y) => {
          const rowProgress = revealEdge - y;
          if (rowProgress >= 1) return line;
          if (rowProgress <= 0) return makeBlankLine(line);
          return revealLine(line, easeOutCubic(rowProgress), config.scatter);
        })
        .join("\n")
    };
  };

  const render = (lines, time = performance.now()) => renderFrame(lines, time).value;

  const renderInto = (element, lines, time = performance.now()) => {
    const frame = renderFrame(lines, time);
    if (frame.html) {
      element.innerHTML = frame.value;
    } else {
      element.textContent = frame.value;
    }
    return frame.value;
  };

  const setOptions = (next = {}) => {
    if (Object.hasOwn(next, "duration")) config.duration = Number(next.duration);
    if (Object.hasOwn(next, "mode")) config.mode = String(next.mode);
    if (Object.hasOwn(next, "scatter")) config.scatter = Number(next.scatter);
    if (Object.hasOwn(next, "rippleRows")) config.rippleRows = Number(next.rippleRows);
    if (Object.hasOwn(next, "lineDurationRatio")) config.lineDurationRatio = Number(next.lineDurationRatio);
    if (Object.hasOwn(next, "enabled")) config.enabled = Boolean(next.enabled);
  };

  return { start, render, renderInto, finish, setOptions };
}
