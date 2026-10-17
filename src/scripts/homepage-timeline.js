function initializeTimeline(root) {
  if (!(root instanceof HTMLElement) || root.dataset.homepageTimelineReady === "true") return;

  const links = [...root.querySelectorAll("[data-homepage-timeline-link]")].filter(
    (link) => link instanceof HTMLAnchorElement
  );
  const targets = links
    .map((link) => document.getElementById(link.dataset.homepageTimelineTarget || ""))
    .filter((target) => target instanceof HTMLElement);
  const tocList = root.querySelector(".homepage-timeline__toc ol");

  if (links.length === 0 || targets.length === 0) return;

  const activate = (id) => {
    let activeLink;
    const activeIndex = links.findIndex((link) => link.dataset.homepageTimelineTarget === id);

    // One cell per entry: solid for the current entry, light for the ones above it, empty below.
    links.forEach((link, index) => {
      link.dataset.railState = index < activeIndex ? "read" : index === activeIndex ? "current" : "unread";
      if (index === activeIndex) {
        link.setAttribute("aria-current", "location");
        activeLink = link;
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (!(activeLink instanceof HTMLElement) || !(tocList instanceof HTMLElement)) return;
    if (!window.matchMedia("(max-width: 900px)").matches) return;

    const scrollport = tocList.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    if (linkRect.left < scrollport.left || linkRect.right > scrollport.right) {
      tocList.scrollTo({
        left: tocList.scrollLeft + linkRect.left - scrollport.left - (scrollport.width - linkRect.width) / 2,
        behavior: "auto"
      });
    }
  };

  const activateHash = () => {
    const target = document.getElementById(window.location.hash.slice(1));
    if (!(target instanceof HTMLElement) || !targets.includes(target)) return false;
    activate(target.id);
    return true;
  };

  links.forEach((link) => {
    link.addEventListener("click", () => activate(link.dataset.homepageTimelineTarget || ""));
  });
  window.addEventListener("hashchange", activateHash);

  if (!activateHash()) activate(targets[0].id);

  // Position decides on every scroll frame: the active entry is the last one whose top has passed
  // the reading line (28% down), or the first entry above that. A fling or a jump back to the top
  // can skip an observer band entirely, so nothing here waits for an intersection.
  let frame = 0;
  const sync = () => {
    frame = 0;
    const line = window.innerHeight * 0.28;
    let active = targets[0];
    targets.forEach((target) => {
      if (target.getBoundingClientRect().top <= line) active = target;
    });
    if (active) activate(active.id);
  };
  const queueSync = () => {
    if (!frame) frame = window.requestAnimationFrame(sync);
  };
  window.addEventListener("scroll", queueSync, { passive: true });
  window.addEventListener("resize", queueSync, { passive: true });
  if (!window.location.hash) queueSync();

  root.dataset.homepageTimelineReady = "true";
}

export function initializeHomepageTimeline() {
  document.querySelectorAll("[data-homepage-timeline]").forEach(initializeTimeline);
}
