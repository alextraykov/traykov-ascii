const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
    let retryTimer = 0;
    let retryCount = 0;

    const isSelected = () =>
      !playground || playground.dataset.activeTurntable === root.dataset.playgroundTurntable;
    const isActive = () =>
      intersecting &&
      !document.hidden &&
      document.documentElement.dataset.pageTransitionActive !== "true" &&
      (reducedMotion.matches || interacting) &&
      isSelected();

    const update = async () => {
      if (destroyed) return;
      let active = isActive();
      if (active && !initialized) {
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
        } catch {
          initialized = false;
          if (isActive() && !retryTimer) {
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
