(() => {
  const storageKey = "traykov-page-transition";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactViewport = window.matchMedia("(max-width: 700px)");
  const root = document.documentElement;
  const body = document.body;
  if (!body) return;

  const nav = document.querySelector(".site-nav");
  const publicCases = ["designing-pave", "synapse-sys"];
  const supportsNativeTransitions =
    "onpageswap" in window &&
    "onpagereveal" in window &&
    typeof document.startViewTransition === "function";
  let pendingContext;
  let entryCleanupTimer = 0;
  let navigationLocked = false;
  const topThreshold = 4;

  const normalizePath = (value) => {
    const url = value instanceof URL ? value : new URL(value, window.location.href);
    const path = url.pathname.replace(/\/index\.html$/, "/") || "/";
    return path.endsWith("/") ? path : `${path}/`;
  };

  const classify = (value) => {
    const url = value instanceof URL ? value : new URL(value, window.location.href);
    const path = normalizePath(url);
    const caseMatch = path.match(/^\/case-studies\/(designing-pave|synapse-sys)\/$/);

    if (path === "/") return { type: "home", path, hash: url.hash, scoped: true };
    if (path === "/about/") return { type: "about", path, hash: url.hash, scoped: true };
    if (caseMatch) {
      return { type: "case", path, hash: url.hash, caseId: caseMatch[1], scoped: true };
    }

    return { type: "other", path, hash: url.hash, scoped: false };
  };

  const currentRoute = classify(window.location.href);
  const incomingContext = window.__traykovTransitionContext;

  if (incomingContext?.kind === "home-case" && incomingContext.caseId) {
    try {
      window.history.replaceState(
        {
          ...window.history.state,
          traykovCaseOrigin: {
            caseId: incomingContext.caseId,
            createdAt: incomingContext.createdAt
          }
        },
        ""
      );
    } catch {
      // History metadata only improves the optional reverse shared-element path.
    }
  }

  const tokenMilliseconds = (name, fallback) => {
    const value = window.getComputedStyle(root).getPropertyValue(name).trim();
    if (!value) return fallback;
    if (value.endsWith("ms")) return Number.parseFloat(value);
    if (value.endsWith("s")) return Number.parseFloat(value) * 1000;
    return fallback;
  };

  const getTransitionKind = (from, to) => {
    if (from.type === "home" && to.type === "case") return "home-case";
    if (from.type === "case" && to.type === "home") return "case-home";
    if (from.type === "case" && to.type === "case") return "case-case";
    return "editorial";
  };

  const getDirection = (from, to) => {
    if (from.type === "case" && to.type === "case") {
      return publicCases.indexOf(to.caseId) < publicCases.indexOf(from.caseId) ? "back" : "forward";
    }
    if (to.type === "home" || (from.type === "about" && to.type !== "case")) return "back";
    return "forward";
  };

  const getCaseId = (from, to) => to.caseId || from.caseId;

  const createContext = (from, to, transport) => {
    const kind = getTransitionKind(from, to);
    const caseId = getCaseId(from, to);
    return {
      kind,
      direction: getDirection(from, to),
      transport,
      fromPath: from.path,
      toPath: to.path,
      fromType: from.type,
      toType: to.type,
      fromHash: from.hash || "",
      toHash: to.hash || "",
      caseId,
      sharedMedia: false,
      createdAt: Date.now()
    };
  };

  const storeContext = (context) => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(context));
    } catch {
      // A normal page navigation remains available without storage.
    }
  };

  const setContextAttributes = (context) => {
    root.dataset.transitionKind = context.kind;
    root.dataset.transitionDirection = context.direction;
    root.dataset.transitionTransport = context.transport;
    root.dataset.pageTransitionActive = "true";
    if (context.caseId) root.dataset.transitionCase = context.caseId;
    body.dataset.navDirection = context.direction;
  };

  const getSharedMedia = (context) => {
    if (!context.caseId) return null;
    if (body.dataset.pageType === "home") {
      return document.querySelector(`.project-card[data-case-id="${context.caseId}"] .project-mark`);
    }
    if (body.dataset.pageType === "case") {
      return context.kind === "home-case"
        ? document.querySelector("[data-case-transition-media]")
        : document.querySelector(".case-hero-turntable");
    }
    return null;
  };

  const prepareSharedElements = (context) => {
    if (context.caseId && body.dataset.pageType === "home") {
      const selectedCard = document.querySelector(`.project-card[data-case-id="${context.caseId}"]`);
      selectedCard?.setAttribute("data-transition-selected", "true");
    }

    if (context.sharedMedia) {
      const media = getSharedMedia(context);
      if (media instanceof HTMLElement) {
        media.dataset.transitionShared = "true";
        media.style.viewTransitionName = "project-media";
      }
    }
  };

  const broadcastTransitionState = (active, phase) => {
    if (active) {
      root.dataset.pageTransitionActive = "true";
    } else {
      delete root.dataset.pageTransitionActive;
    }
    window.dispatchEvent(new CustomEvent("page-transition-state", { detail: { active, phase } }));
  };

  const pauseTransitionMedia = () => {
    document.querySelectorAll("video").forEach((video) => video.pause());
    document
      .querySelectorAll("[data-obj-turntable], [data-pave-turntable], [data-sasi-logo-turntable]")
      .forEach((turntable) => {
        turntable.dispatchEvent(new CustomEvent("turntable-eligibility", { detail: { active: false } }));
      });
  };

  const prepareOutgoing = (context) => {
    setContextAttributes(context);
    prepareSharedElements(context);
    body.classList.add("is-page-transitioning");
    pauseTransitionMedia();
    broadcastTransitionState(true, "outgoing");
  };

  const prepareIncoming = (context) => {
    setContextAttributes(context);
    prepareSharedElements(context);
    body.classList.add("is-page-arriving");
    broadcastTransitionState(true, "incoming");
  };

  const clearTransitionState = () => {
    window.clearTimeout(entryCleanupTimer);
    body.classList.remove("is-page-transitioning", "is-page-arriving", "is-page-leaving");
    document.querySelectorAll("[data-transition-selected]").forEach((element) => {
      element.removeAttribute("data-transition-selected");
    });
    document.querySelectorAll("[data-transition-shared]").forEach((element) => {
      element.removeAttribute("data-transition-shared");
      element.style.removeProperty("view-transition-name");
    });
    [
      "transitionIncoming",
      "transitionKind",
      "transitionDirection",
      "transitionTransport",
      "transitionCase"
    ].forEach((name) => delete root.dataset[name]);
    broadcastTransitionState(false, "settled");
    navigationLocked = false;
  };

  const finishEntry = () => {
    body.dataset.pageReady = "true";
  };

  const syncNavPosition = () => {
    body.classList.toggle("is-nav-at-top", window.scrollY <= topThreshold);
  };

  if (nav) {
    syncNavPosition();
    window.addEventListener("scroll", syncNavPosition, { passive: true });
    window.addEventListener("resize", syncNavPosition);
  }

  if (incomingContext?.transport === "native" && !reducedMotion.matches) {
    prepareIncoming(incomingContext);
    finishEntry();
    entryCleanupTimer = window.setTimeout(
      clearTransitionState,
      tokenMilliseconds("--dur-6", 720) + tokenMilliseconds("--dur-3", 260)
    );
  } else {
    if (incomingContext) prepareIncoming(incomingContext);
    if (incomingContext?.direction) body.dataset.navDirection = incomingContext.direction;
    if (reducedMotion.matches) {
      finishEntry();
    } else {
      requestAnimationFrame(() => requestAnimationFrame(finishEntry));
    }
    if (incomingContext) {
      entryCleanupTimer = window.setTimeout(clearTransitionState, tokenMilliseconds("--dur-6", 720));
    }
  }

  window.addEventListener("pagereveal", (event) => {
    if (!event.viewTransition || !incomingContext || reducedMotion.matches) return;
    event.viewTransition.finished.finally(clearTransitionState);
  });

  window.addEventListener("pageswap", (event) => {
    if (!supportsNativeTransitions || !event.viewTransition) return;
    const destinationUrl = event.activation?.entry?.url;
    if (!destinationUrl) return;
    const nextRoute = classify(destinationUrl);

    if (reducedMotion.matches || !currentRoute.scoped || !nextRoute.scoped) {
      event.viewTransition?.skipTransition();
      return;
    }

    const nextKind = getTransitionKind(currentRoute, nextRoute);
    if (nextKind === "editorial") {
      const context =
        pendingContext && pendingContext.toPath === nextRoute.path
          ? pendingContext
          : createContext(currentRoute, nextRoute, "fallback");
      context.transport = "fallback";
      context.createdAt = Date.now();
      storeContext(context);
      event.viewTransition.skipTransition();
      return;
    }

    const context =
      pendingContext && pendingContext.toPath === nextRoute.path
        ? pendingContext
        : createContext(currentRoute, nextRoute, "native");
    context.transport = "native";
    context.createdAt = Date.now();
    pendingContext = context;
    storeContext(context);
    prepareOutgoing(context);
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || navigationLocked) return;
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    const target = new URL(link.href, window.location.href);
    if (target.origin !== window.location.origin) return;
    if (!/^https?:$/.test(target.protocol)) return;

    const nextRoute = classify(target);
    if (!currentRoute.scoped || !nextRoute.scoped) return;
    if (nextRoute.path === currentRoute.path) return;

    const transitionKind = getTransitionKind(currentRoute, nextRoute);
    const transport =
      supportsNativeTransitions && !reducedMotion.matches && transitionKind !== "editorial"
        ? "native"
        : "fallback";
    const context = createContext(currentRoute, nextRoute, transport);
    pendingContext = context;
    storeContext(context);

    if (context.kind === "home-case" && context.caseId) {
      try {
        window.history.replaceState(
          {
            ...window.history.state,
            traykovReturnTransition: {
              caseId: context.caseId,
              fromCasePath: nextRoute.path,
              createdAt: context.createdAt
            }
          },
          ""
        );
      } catch {
        // Scroll restoration still provides a normal Back experience.
      }
    }

    if (reducedMotion.matches) return;

    navigationLocked = true;
    prepareOutgoing(context);

    if (transport === "native") return;

    event.preventDefault();
    body.classList.add("is-page-leaving");
    const navigationDelay =
      compactViewport.matches && context.kind === "home-case"
        ? 0
        : tokenMilliseconds("--dur-3", 260);
    window.setTimeout(() => {
      window.location.assign(target.href);
    }, navigationDelay);
  });
})();
