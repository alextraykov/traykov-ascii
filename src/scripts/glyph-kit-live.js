// Glyph kit moving diagrams on the Labs page. Each <pre data-gk-live> already holds its still frame
// (rendered at build time), so the page reads the same with no JavaScript or with motion off.
// Motion runs on the site's shared clock: it stops off screen, in hidden tabs and when motion is off.
import { live } from "../../skills/glyph-kit/scripts/live/kinds.mjs";
import * as pace from "../../skills/glyph-kit/scripts/live/pace.mjs";
import { player } from "../../skills/glyph-kit/scripts/live/play.mjs";
import { onTick } from "./motion/tick.js";
import { isMotionActive, onMotionChange } from "./motion/lifecycle.js";
import { LIVE_SPECS } from "./glyph-kit-live-specs.js";

const PACE_STILL = 200;

document.querySelectorAll("[data-gk-live]").forEach((pre) => {
  const [group, name] = pre.dataset.gkLive.split(":");
  const source = group === "pace" ? { make: pace[name], still: PACE_STILL } : live(LIVE_SPECS[name]);
  if (!source.make) return;
  const p = player(pre, source.make, source.still);
  let last = 0;
  onTick(pre, () => {
    const now = performance.now();
    p.advance(last ? now - last : 0);
    last = now;
  });
  onMotionChange((state) => {
    last = 0;
    if (!state.active) p.still();
  }, { immediate: !isMotionActive() });
});
