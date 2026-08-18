const roots = document.querySelectorAll("[data-product-systems-kit]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const initializeKit = (root) => {
  if (!(root instanceof HTMLElement) || root.dataset.kitReady === "true") return;

  const openButton = root.querySelector("[data-kit-open]");
  const closeButton = root.querySelector("[data-kit-close]");
  const openState = root.querySelector("[data-kit-open-state]");
  const status = root.querySelector("[data-kit-status]");
  const itemButtons = Array.from(root.querySelectorAll("[data-kit-item]"));
  const detailName = root.querySelector("[data-kit-detail-name]");
  const detailCategory = root.querySelector("[data-kit-detail-category]");
  const detailDescription = root.querySelector("[data-kit-detail-description]");
  const detailLink = root.querySelector("[data-kit-detail-link]");
  const detailLinkLabel = root.querySelector("[data-kit-detail-link-label]");

  if (
    !(openButton instanceof HTMLButtonElement) ||
    !(closeButton instanceof HTMLButtonElement) ||
    !(openState instanceof HTMLElement) ||
    !(status instanceof HTMLElement) ||
    !(detailName instanceof HTMLElement) ||
    !(detailCategory instanceof HTMLElement) ||
    !(detailDescription instanceof HTMLElement) ||
    !(detailLink instanceof HTMLAnchorElement) ||
    !(detailLinkLabel instanceof HTMLElement) ||
    itemButtons.some((button) => !(button instanceof HTMLButtonElement))
  ) {
    return;
  }

  root.dataset.kitReady = "true";
  root.dataset.state = "closed";
  openButton.setAttribute("aria-expanded", "false");
  openState.setAttribute("aria-hidden", "true");
  let openingTimer;
  let focusTimer;
  const focusDelay = Number.parseFloat(
    getComputedStyle(root).getPropertyValue("--kit-focus-delay")
  );

  const selectItem = (button, moveFocus = false) => {
    if (!(button instanceof HTMLButtonElement)) return;
    window.clearTimeout(focusTimer);

    itemButtons.forEach((item) => {
      item.setAttribute("aria-selected", String(item === button));
      item.tabIndex = item === button ? 0 : -1;
    });

    detailName.textContent = button.dataset.kitName ?? "";
    detailCategory.textContent = `${button.dataset.kitCategory ?? ""} equipment`;
    detailDescription.textContent = button.dataset.kitDescription ?? "";

    const href = button.dataset.kitHref;
    const linkLabel = button.dataset.kitLinkLabel;
    detailLink.hidden = !href;
    if (href && linkLabel) {
      detailLink.href = href;
      detailLinkLabel.textContent = linkLabel;
    } else {
      detailLink.removeAttribute("href");
      detailLinkLabel.textContent = "";
    }

    if (moveFocus) button.focus();
  };

  const finishOpening = () => {
    root.dataset.state = "open";
    status.textContent = "Inventory open";
    window.clearTimeout(focusTimer);
    focusTimer = window.setTimeout(
      () => itemButtons[0]?.focus(),
      Number.isFinite(focusDelay) ? focusDelay : 0
    );
  };

  const openKit = () => {
    window.clearTimeout(openingTimer);
    root.dataset.state = reduceMotion.matches ? "open" : "opening";
    status.textContent = reduceMotion.matches ? "Inventory open" : "Releasing latches";
    openButton.setAttribute("aria-expanded", "true");
    openState.setAttribute("aria-hidden", "false");

    if (reduceMotion.matches) {
      finishOpening();
      return;
    }

    openingTimer = window.setTimeout(finishOpening, 720);
  };

  const closeKit = () => {
    window.clearTimeout(openingTimer);
    window.clearTimeout(focusTimer);
    root.dataset.state = "closed";
    status.textContent = "Case sealed";
    openButton.setAttribute("aria-expanded", "false");
    openState.setAttribute("aria-hidden", "true");
    openButton.focus();
  };

  openButton.addEventListener("click", openKit);
  closeButton.addEventListener("click", closeKit);

  itemButtons.forEach((button, index) => {
    button.addEventListener("click", () => selectItem(button));
    button.addEventListener("keydown", (event) => {
      const columns = 4;
      const moves = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -columns,
        ArrowDown: columns
      };
      const offset = moves[event.key];
      if (!offset) return;

      event.preventDefault();
      const nextIndex = Math.max(0, Math.min(itemButtons.length - 1, index + offset));
      selectItem(itemButtons[nextIndex], true);
    });
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.dataset.state !== "closed") {
      event.preventDefault();
      closeKit();
    }
  });

  reduceMotion.addEventListener?.("change", () => {
    if (reduceMotion.matches && root.dataset.state === "opening") finishOpening();
  });
};

roots.forEach(initializeKit);
