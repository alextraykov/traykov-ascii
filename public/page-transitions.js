(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const body = document.body;
  if (!body) return;
  const nav = document.querySelector(".site-nav");
  let navRevealTimer = 0;

  const revealNav = () => {
    window.clearTimeout(navRevealTimer);
    body.classList.remove("is-nav-scrolling");
  };

  const hideNavWhileScrolling = () => {
    if (!nav) return;
    window.clearTimeout(navRevealTimer);

    if (window.scrollY <= 0 || nav.matches(":focus-within")) {
      revealNav();
      return;
    }

    body.classList.add("is-nav-scrolling");
    navRevealTimer = window.setTimeout(revealNav, 160);
  };

  if (nav) {
    window.addEventListener("scroll", hideNavWhileScrolling, { passive: true });
    nav.addEventListener("focusin", revealNav);
    nav.addEventListener("pointerenter", revealNav);
  }

  const finishEntry = () => {
    body.dataset.pageReady = "true";
  };

  if (reducedMotion.matches) {
    finishEntry();
    return;
  }

  const normalizePath = (url) => {
    const path = url.pathname.replace(/\/index\.html$/, "/");
    if (path === "") return "/";
    return path.endsWith("/") ? path : `${path}/`;
  };

  const navOrder = ["/", "/about/", "/playground/"];
  const currentPath = normalizePath(window.location);
  const storedDirection = sessionStorage.getItem("page-transition-direction");
  if (storedDirection) {
    body.dataset.navDirection = storedDirection;
    sessionStorage.removeItem("page-transition-direction");
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(finishEntry);
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !link.closest(".site-nav")) return;
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target && link.target !== "_self") return;

    const target = new URL(link.href, window.location.href);
    if (target.origin !== window.location.origin) return;
    if (target.pathname === window.location.pathname && target.hash) return;

    const nextPath = normalizePath(target);
    if (nextPath === currentPath && target.hash === window.location.hash) return;

    const currentIndex = navOrder.indexOf(currentPath);
    const nextIndex = navOrder.indexOf(nextPath);
    const direction = currentIndex >= 0 && nextIndex >= 0 && nextIndex < currentIndex ? "back" : "forward";

    event.preventDefault();
    sessionStorage.setItem("page-transition-direction", direction);
    body.dataset.navDirection = direction;
    body.classList.add("is-page-leaving");

    window.setTimeout(() => {
      window.location.href = target.href;
    }, 220);
  });
})();
