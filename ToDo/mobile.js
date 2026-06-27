(() => {
  const isTouchLike = event => event.pointerType === "touch" || window.matchMedia("(pointer: coarse)").matches;

  function closestDateFromPointer(event) {
    try {
      if (typeof boardPoint === "function" && typeof hitTestDateArea === "function") {
        const point = boardPoint(event);
        const hit = hitTestDateArea(point.x - 110);
        if (hit && hit.date) return hit.date;
      }
    } catch (_) {}

    try {
      if (typeof todayISO === "function") return todayISO();
    } catch (_) {}

    return new Date().toISOString().slice(0, 10);
  }

  document.addEventListener("pointerdown", event => {
    const handle = event.target.closest?.(".handle");
    if (!handle || !isTouchLike(event)) return;

    const note = handle.closest(".note");
    if (!note || !note.dataset.id) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (typeof openCreateTaskModal === "function") {
      openCreateTaskModal({
        parentId: note.dataset.id,
        targetAt: closestDateFromPointer(event),
        branchMode: "same"
      });
    }
  }, true);
})();
