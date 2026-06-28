(() => {
  const STORAGE_KEYS = [
    "quest-sticky-todo-v10",
    "quest-sticky-todo-v9",
    "quest-sticky-todo-v8",
    "quest-sticky-todo-v6",
    "quest-sticky-todo-v5",
    "quest-sticky-todo-v4",
    "quest-sticky-todo-v3",
    "quest-sticky-todo-v2"
  ];

  const originalDeleteTask = typeof deleteTask === "function" ? deleteTask : null;
  const originalEnsureContentSize = typeof ensureContentSize === "function" ? ensureContentSize : null;

  function emptyInitialState() {
    return { tasks: {}, showLanes: true };
  }

  function hasSavedData() {
    return STORAGE_KEYS.some(key => localStorage.getItem(key));
  }

  function looksLikeSampleState() {
    const ids = Object.keys(state?.tasks || {}).sort().join(",");
    return ids === "a,b,c,d,root" && state.tasks.root?.title === "数IIIテスト勉強";
  }

  function clampBoardScroll() {
    const maxLeft = Math.max(0, contentWidth - board.clientWidth);
    const maxTop = Math.max(0, contentHeight - board.clientHeight);
    if (board.scrollLeft > maxLeft) board.scrollLeft = maxLeft;
    if (board.scrollTop > maxTop) board.scrollTop = maxTop;
  }

  makeInitialState = emptyInitialState;

  if (!hasSavedData() && looksLikeSampleState()) {
    state = makeInitialState();
    selectedId = null;
    refreshLaneDates();
    branchLayout();
    render();
    saveNow();
  }

  if (originalDeleteTask) {
    deleteTask = function(taskId = selectedId) {
      const task = state.tasks?.[taskId];
      if (!task) return;
      const ok = confirm(`「${task.title}」を削除しますか？\n\n子タスクは親側につなぎ直されます。`);
      if (!ok) return;
      originalDeleteTask(taskId);
      clampBoardScroll();
    };
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const ok = confirm("すべてのタスクを削除して、空の状態に戻しますか？");
      if (!ok) return;

      snapshot();
      state = makeInitialState();
      selectedId = null;
      undoStack = [];
      STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
      refreshLaneDates();
      branchLayout();
      render();
      saveNow();
      board.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    }, true);
  }

  ensureContentSize = function() {
    refreshLaneDates();
    currentMode = getLayoutMode();
    board.classList.toggle("verticalMode", isVerticalMode());
    board.classList.toggle("horizontalMode", !isVerticalMode());
    syncMetrics();

    const viewW = Math.max(1, board.clientWidth || window.innerWidth || 360);
    const viewH = Math.max(1, board.clientHeight || window.innerHeight || 520);
    let farX = viewW;
    let farY = viewH;

    for (const task of getTasks()) {
      if (!Number.isFinite(task.x)) task.x = 0;
      if (!Number.isFinite(task.y)) task.y = 0;
      farX = Math.max(farX, task.x + noteW + 96);
      farY = Math.max(farY, task.y + noteH + 96);
    }

    if (isVerticalMode()) {
      contentWidth = Math.max(viewW + 1, farX, vTrackToX(maxTrack) + noteW + 96);
      contentHeight = Math.max(viewH + 1, farY, vEndLineY() + noteH + 110);
    } else {
      contentWidth = Math.max(viewW + 1, farX, hEndLineX() + 160);
      contentHeight = Math.max(viewH + 1, farY, hTrackToY(maxTrack) + noteH + 120);
    }

    [links, lanesEl, dateHud, notesEl].forEach(el => {
      if (!el) return;
      el.style.minWidth = `${contentWidth}px`;
      el.style.width = `${contentWidth}px`;
      el.style.minHeight = `${contentHeight}px`;
      el.style.height = `${contentHeight}px`;
    });

    requestAnimationFrame(clampBoardScroll);
  };

  window.addEventListener("resize", () => {
    requestAnimationFrame(() => {
      if (originalEnsureContentSize) ensureContentSize();
      clampBoardScroll();
    });
  }, { passive: true });

  branchLayout();
  render();
})();
