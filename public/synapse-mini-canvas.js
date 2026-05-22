(() => {
  const figures = document.querySelectorAll("[data-synapse-mini]");

  for (const figure of figures) {
    const buttons = figure.querySelectorAll("[data-mini-step]");
    const setStep = (step) => {
      figure.setAttribute("data-step", step);
      for (const button of buttons) {
        const active = button.getAttribute("data-mini-step") === step;
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
      }
    };

    for (const button of buttons) {
      button.addEventListener("click", () => {
        const step = button.getAttribute("data-mini-step");
        if (step) setStep(step);
      });

      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const list = Array.from(buttons);
        const index = list.indexOf(button);
        const offset = event.key === "ArrowRight" ? 1 : -1;
        const next = list[(index + offset + list.length) % list.length];
        next.focus();
        const step = next.getAttribute("data-mini-step");
        if (step) setStep(step);
      });
    }

    setStep(figure.getAttribute("data-step") || buttons[0]?.getAttribute("data-mini-step") || "");
  }
})();
