document.querySelectorAll("[data-turntable-preview-select]").forEach((select) => {
  select.addEventListener("change", () => {
    if (!select.value || select.value === window.location.pathname) return;
    window.location.href = select.value;
  });
});
