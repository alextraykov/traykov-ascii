const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const MAX_INITIALIZATION_RETRIES = 1;
let webglSupport;

function supportsWebGL() {
  if (webglSupport !== undefined) return webglSupport;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    failIfMajorPerformanceCaveat: true
  });

  const rendererInfo = context?.getExtension("WEBGL_debug_renderer_info");
  const renderer = rendererInfo
    ? context.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)
    : "";
  const usesSoftwareRenderer = /swiftshader|llvmpipe|software/i.test(String(renderer));

  webglSupport = Boolean(context) && !usesSoftwareRenderer;
  context?.getExtension("WEBGL_lose_context")?.loseContext();
  return webglSupport;
}

function showTurntableFallback(root) {
  root.classList.remove("is-turntable-loading", "has-webgl");
  root.classList.add("is-turntable-fallback");
  root.dataset.turntableState = "fallback";

  root.dispatchEvent(new CustomEvent("turntable-fallback", { bubbles: true }));
}

export function registerTurntables(selector, load, initialize) {
  const roots = Array.from(document.querySelectorAll(selector));
  if (!roots.length) return;

  roots.forEach((root) => {
    const hoverTarget = root.hasAttribute("data-hover-turntable") ? root.closest(".project-card") : null;
    const playground = root.hasAttribute("data-playground-turntable")
      ? root.closest("[data-ascii-playground]")
      : null;
    let intersecting = false;
    let interacting = reducedMotion.matches || !hoverTarget;
    let initialized = false;
    let instance;
    let destroyed = false;
    let failed = false;
    let retryTimer = 0;
    let retryCount = 0;

    const isSelected = () =>
      !playground || playground.dataset.activeTurntable === root.dataset.playgroundTurntable;
    const isActive = () =>
      !failed &&
      intersecting &&
      !document.hidden &&
      document.documentElement.dataset.pageTransitionActive !== "true" &&
      (reducedMotion.matches || interacting) &&
      isSelected();

    const update = async () => {
      if (destroyed) return;
      let active = isActive();
      if (active && !initialized) {
        if (!supportsWebGL()) {
          failed = true;
          showTurntableFallback(root);
          root.dispatchEvent(new CustomEvent("turntable-eligibility", { detail: { active: false } }));
          return;
        }

        initialized = true;
        try {
          const module = await load();
          active = !destroyed && isActive();
          if (active) {
            instance = initialize(module, root);
            retryCount = 0;
            window.clearTimeout(retryTimer);
            retryTimer = 0;
            root.dispatchEvent(new CustomEvent("turntable-ready", { bubbles: true }));
          } else {
            initialized = false;
          }
        } catch (error) {
          initialized = false;
          const permanentRendererFailure =
            error instanceof Error &&
            /webgl context|error creating webgl/i.test(error.message);

          if (permanentRendererFailure || retryCount >= MAX_INITIALIZATION_RETRIES) {
            failed = true;
            showTurntableFallback(root);
          } else if (isActive() && !retryTimer) {
            const retryDelay = Math.min(400 * (2 ** retryCount), 3200);
            retryCount += 1;
            retryTimer = window.setTimeout(() => {
              retryTimer = 0;
              update();
            }, retryDelay);
          }
        }
      }
      active = isActive();
      root.dispatchEvent(new CustomEvent("turntable-eligibility", { detail: { active } }));
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry?.isIntersecting ?? false;
        update();
      },
      { rootMargin: "120px 0px", threshold: 0.01 }
    );
    observer.observe(root);

    const onVisibility = () => update();
    document.addEventListener("visibilitychange", onVisibility);
    const onPageTransition = () => update();
    window.addEventListener("page-transition-state", onPageTransition);

    const onEnter = () => {
      interacting = true;
      update();
    };
    const onLeave = (event) => {
      const focusTarget = event.type === "focusout" ? event.relatedTarget : document.activeElement;
      interacting = hoverTarget?.contains(focusTarget) ?? false;
      update();
    };
    hoverTarget?.addEventListener("pointerenter", onEnter);
    hoverTarget?.addEventListener("pointerleave", onLeave);
    hoverTarget?.addEventListener("focusin", onEnter);
    hoverTarget?.addEventListener("focusout", onLeave);
    reducedMotion.addEventListener?.("change", update);

    const selectionObserver = playground
      ? new MutationObserver(() => update())
      : null;
    selectionObserver?.observe(playground, { attributes: true, attributeFilter: ["data-active-turntable"] });

    window.addEventListener(
      "pagehide",
      () => {
        destroyed = true;
        window.clearTimeout(retryTimer);
        observer.disconnect();
        selectionObserver?.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("page-transition-state", onPageTransition);
        hoverTarget?.removeEventListener("pointerenter", onEnter);
        hoverTarget?.removeEventListener("pointerleave", onLeave);
        hoverTarget?.removeEventListener("focusin", onEnter);
        hoverTarget?.removeEventListener("focusout", onLeave);
        reducedMotion.removeEventListener?.("change", update);
        instance?.destroy?.();
      },
      { once: true }
    );
  });
}
