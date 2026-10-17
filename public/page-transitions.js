(() => {
  // Pages swap instantly (no view transition). This script only marks the page ready and tracks
  // whether the bar sits at the top of the page.
  const body = document.body;
  if (!body) return;

  const nav = document.querySelector(".site-nav");
  const topThreshold = 4;

  try {
    window.sessionStorage.removeItem("traykov-page-transition");
  } catch {
    // Nothing is stored when storage is unavailable.
  }

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

  finishEntry();
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) finishEntry();
  });
})();
