// Glyph kit "Ask for one": send the ask, get a spec back, draw it here with the kit's own renderers.
// Moving kinds play on the site's shared clock and fall back to their still frame when motion is off.
import { body, label } from "../../skills/glyph-kit/scripts/render/text.mjs";
import { paint } from "../../skills/glyph-kit/scripts/render/paint.mjs";
import { live } from "../../skills/glyph-kit/scripts/live/kinds.mjs";
import { player } from "../../skills/glyph-kit/scripts/live/play.mjs";
import { onTick } from "./motion/tick.js";
import { onMotionChange } from "./motion/lifecycle.js";

const form = document.querySelector("[data-gk-try]");
const out = document.querySelector("[data-gk-try-out]");

if (form instanceof HTMLFormElement && out instanceof HTMLElement) {
  const field = form.querySelector("textarea[name='ask']");
  const submit = form.querySelector("[data-gk-try-submit]");
  const status = form.querySelector("[data-gk-try-status]");
  const figure = out.querySelector("[data-gk-try-figure]");
  const title = out.querySelector("[data-gk-try-title]");
  const stamp = out.querySelector("[data-gk-try-stamp]");
  const specOut = out.querySelector("[data-gk-try-spec]");
  const turnstileElement = form.querySelector(".cf-turnstile");

  status.textContent = "";

  // One clock subscription for the figure; each new drawing swaps the player it drives.
  let current = null;
  let last = 0;
  onTick(figure, () => {
    if (!current) return;
    const now = performance.now();
    current.advance(last ? now - last : 0);
    last = now;
  });
  onMotionChange((state) => {
    last = 0;
    if (!state.active) current?.still();
  }, { immediate: false });

  const setStatus = (text, state = "idle") => {
    status.textContent = text;
    status.dataset.state = state;
  };

  const flash = () => {
    field.removeAttribute("data-invalid");
    void field.offsetWidth; // restart the two flashes
    field.setAttribute("data-invalid", "");
  };
  field.addEventListener("input", () => field.removeAttribute("data-invalid"));

  form.querySelectorAll("[data-gk-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      field.value = button.dataset.gkPreset;
      field.removeAttribute("data-invalid");
      field.focus();
    });
  });

  const draw = ({ spec, mode }) => {
    current = null;
    last = 0;
    if (mode === "moving") {
      const { make, still, summary } = live(spec);
      current = player(figure, make, still);
      current.still(); // the still frame now; the clock moves it when motion is on
      figure.setAttribute("aria-label", summary);
    } else {
      figure.innerHTML = paint(body(spec));
      figure.setAttribute("aria-label", label(spec));
    }
    title.textContent = spec.title ?? "Your figure";
    stamp.textContent = /^(illustrative|sample)/i.test(spec.source ?? "") ? "Sample data" : "";
    specOut.textContent = JSON.stringify(spec, null, 2);
    out.hidden = false;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      flash();
      return;
    }

    const data = new FormData(form);
    submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    setStatus("Drawing…");

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ ask: field.value, "cf-turnstile-response": String(data.get("cf-turnstile-response") ?? "") }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.spec) throw new Error(result?.error || "Drawing is paused right now. Try again later.");
      draw(result);
      setStatus("");
      out.scrollIntoView({ block: "nearest" });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Drawing is paused right now. Try again later.", "error");
      flash();
    } finally {
      submit.disabled = false;
      form.removeAttribute("aria-busy");
      const turnstile = Reflect.get(window, "turnstile");
      if (turnstileElement && turnstile?.reset) turnstile.reset(turnstileElement);
    }
  });
}
