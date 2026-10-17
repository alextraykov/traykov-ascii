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

    links.forEach((link) => {
      if (link.dataset.homepageTimelineTarget === id) {
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

  if ("IntersectionObserver" in window) {
    const visibleTargets = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleTargets.add(entry.target);
          else visibleTargets.delete(entry.target);
        });

        const activeTarget = [...visibleTargets]
          .filter((target) => target instanceof HTMLElement)
          .sort(
            (first, second) =>
              Math.abs(first.getBoundingClientRect().top - window.innerHeight * 0.2) -
              Math.abs(second.getBoundingClientRect().top - window.innerHeight * 0.2)
          )[0];
        if (activeTarget instanceof HTMLElement) activate(activeTarget.id);
      },
      { rootMargin: "-16% 0px -72% 0px", threshold: 0 }
    );

    targets.forEach((target) => observer.observe(target));
  }

  root.dataset.homepageTimelineReady = "true";
}

export function initializeHomepageTimeline() {
  document.querySelectorAll("[data-homepage-timeline]").forEach(initializeTimeline);
}
