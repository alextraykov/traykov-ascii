import { initScramble } from "./scramble.js";
import "./reveal.js";
import "./scroll-fx.js";
import "./count-up.js";

function autoDecorateNav() {
  document.querySelectorAll(".site-nav nav a, .case-toc button, .case-sibling-nav a span").forEach((element) => {
    if (element.hasAttribute("data-scramble")) return;
    element.setAttribute("data-scramble", "");
    element.setAttribute("data-scramble-label", element.textContent?.trim() || "");
  });

  initScramble();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoDecorateNav, { once: true });
} else {
  autoDecorateNav();
}
