const STORAGE_KEY = "quest-sticky-todo-v4";

const board = document.getElementById("board");
const links = document.getElementById("links");
const lanesEl = document.getElementById("lanes");
const notesEl = document.getElementById("notes");
const ghost = document.getElementById("ghost");

const addRootBtn = document.getElementById("addRootBtn");
const treeLayoutBtn = document.getElementById("treeLayoutBtn");
const verticalLayoutBtn = document.getElementById("verticalLayoutBtn");
const toggleLanesBtn = document.getElementById("toggleLanesBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");

const monthBig = document.getElementById("monthBig");
const monthName = document.getElementById("monthName");

const taskModal = document.getElementById("taskModal");
const taskModalTitle = document.getElementById("taskModalTitle");
const taskNameInput = document.getElementById("taskNameInput");
const taskDateInput = document.getElementById("taskDateInput");
const taskCancelBtn = document.getElementById("taskCancelBtn");
const taskSaveBtn = document.getElementById("taskSaveBtn");

const dateModal = document.getElementById("dateModal");
const changeDateInput = document.getElementById("changeDateInput");
const dateCancelBtn = document.getElementById("dateCancelBtn");
const dateSaveBtn = document.getElementById("dateSaveBtn");

const noteW = 220;
const noteH = 104;
const laneTop = 40;
const laneGap = 148;
const laneLabelWidth = 92;
const columnGap = 286;
const boardPaddingX = 260;

let state = makeInitialState();
let selectedId = null;
let undoStack = [];
let drag = null;
let connectDrag = null;
let hotLaneDate = null;
let hotLineDate = null;
let taskModalMode = null;
let taskModalContext = null;
let dateModalContext = null;
let cachedLaneDates = [];
let renderQueued = false;
let saveTimer = null;
let previewPath = null;

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function id() {
  return Math.random().toString(36).slice(2, 9);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value) {
  if (!value) return todayISO();
  return value.slice(0, 10);
}

function makeTask({ title, parentId = null, x = 520, targetAt = todayISO(), status = "todo" }) {
  return {
    id: id(),
    title: title || "新しいタスク",
    parentId,
    x,
    y: 0,
    targetAt: normalizeDate(targetAt),
    status
  };
}

function makeInitialState() {
  const root = {
    id: "root",
    title: "数IIIテスト勉強",
    parentId: null,
    x: 520,
    y: 0,
    targetAt: "2026-05-05",
    status: "todo"
  };
  const a = {
    id: "a",
    title: "ワーク１２ページ",
    parentId: "root",
    x: 390,
    y: 0,
    targetAt: "2026-05-12",
    status: "todo"
  };
  const b = {
    id: "b",
    title: "基礎演習２ページ",
    parentId: "root",
    x: 650,
    y: 0,
    targetAt: "2026-05-12",
    status: "todo"
  };
  const c = {
    id: "c",
    title: "ワーク１３ページ",
    parentId: "a",
    x: 390,
    y: 0,
    targetAt: "2026-05-15",
    status: "todo"
  };
  const d = {
    id: "d",
    title: "基礎演習３ページ",
    parentId: "b",
    x: 650,
    y: 0,
    targetAt: "2026-05-18",
    status: "todo"
  };
  return {
    tasks: { root, a, b, c, d },
    showLanes: true
  };
}

function saveNow() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 160);
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY)
    || localStorage.getItem("quest-sticky-todo-v3")
    || localStorage.getItem("quest-sticky-todo-v2");

  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.tasks) state = parsed;
  } catch {
    state = makeInitialState();
  }
}

function snapshot() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 80) undoStack.shift();
}

function getTasks() {
  return Object.values(state.tasks);
}

function getChildren(parentId) {
  return getTasks().filter(t => t.parentId === parentId);
}

function getRoots() {
  return getTasks().filter(t => !t.parentId || !state.tasks[t.parentId]);
}

function getTaskDepth(taskId) {
  let depth = 0;
  let task = state.tasks[taskId];
  const seen = new Set();

  while (task && task.parentId && state.tasks[task.parentId] && !seen.has(task.parentId)) {
    seen.add(task.id);
    depth += 1;
    task = state.tasks[task.parentId];
  }

  return depth;
}

function refreshLaneDates() {
  const dates = new Set();
  for (const task of getTasks()) dates.add(normalizeDate(task.targetAt));
  cachedLaneDates = [...dates].sort((a, b) => a.localeCompare(b));
}

function getLaneDates() {
  if (!cachedLaneDates.length && getTasks().length) refreshLaneDates();
  return cachedLaneDates;
}

function dateIndex(date) {
  const lanes = getLaneDates();
  const index = lanes.indexOf(normalizeDate(date));
  return index >= 0 ? index : lanes.length;
}

function dateToY(date) {
  return laneTop + dateIndex(date) * laneGap + 28;
}

function laneLineY(date) {
  return laneTop + dateIndex(date) * laneGap;
}

function formatDateParts(date) {
  const [year, month, day] = normalizeDate(date).split("-").map(Number);
  return { year, month, day, monthName: monthNames[month - 1] || "" };
}

function updateMonthCard() {
  const lanes = getLaneDates();
  const first = lanes[0] || todayISO();
  const parts = formatDateParts(first);
  monthBig.textContent = String(parts.month);
  monthName.textContent = parts.monthName;
}

function ensurePositions() {
  refreshLaneDates();

  let maxX = 1200;
  for (const task of getTasks()) {
    if (!Number.isFinite(task.x)) task.x = 520;
    if (!Number.isFinite(task.y)) task.y = state.showLanes ? dateToY(task.targetAt) : 80;
    if (!drag || drag.id !== task.id) task.y = state.showLanes ? dateToY(task.targetAt) : task.y;
    maxX = Math.max(maxX, task.x + noteW + 180);
  }

  const lanes = getLaneDates();
  const height = laneTop + Math.max(5, lanes.length) * laneGap + 240;
  const width = Math.max(1700, maxX);

  [links, lanesEl, notesEl].forEach(el => {
    el.style.minHeight = `${height}px`;
    el.style.minWidth = `${width}px`;
  });
}

function boardPoint(e) {
  const rect = board.getBoundingClientRect();
  return {
    x: e.clientX - rect.left + board.scrollLeft,
    y: e.clientY - rect.top + board.scrollTop
  };
}

function setObjectPos(el, x, y) {
  el.style.setProperty("--x", `${x}px`);
  el.style.setProperty("--y", `${y}px`);
}

function hitTestDateArea(noteTopY) {
  if (!state.showLanes) return { kind: "none", date: null };

  const lanes = getLaneDates();
  if (lanes.length === 0) return { kind: "blank", date: todayISO() };

  const centerY = noteTopY + noteH / 2;
  let nearestLine = null;
  let nearestLineDistance = Infinity;

  for (const date of lanes) {
    const dist = Math.abs(centerY - laneLineY(date));
    if (dist < nearestLineDistance) {
      nearestLineDistance = dist;
      nearestLine = date;
    }
  }

  if (nearestLineDistance <= 18) {
    return { kind: "line", date: nearestLine };
  }

  for (let i = 0; i < lanes.length; i++) {
    const top = laneTop + i * laneGap;
    const bottom = top + laneGap;
    if (centerY > top + 18 && centerY < bottom - 18) {
      return { kind: "lane", date: lanes[i] };
    }
  }

  const lastBottom = laneTop + lanes.length * laneGap;
  if (centerY >= lastBottom - 18) {
    return { kind: "blank", date: lanes[lanes.length - 1] };
  }

  return { kind: "blank", date: lanes[0] };
}

function updateHotArea(y) {
  const hit = hitTestDateArea(y);
  const nextHotLane = hit.kind === "lane" ? hit.date : null;
  const nextHotLine = hit.kind === "line" ? hit.date : null;
  const changed = nextHotLane !== hotLaneDate || nextHotLine !== hotLineDate;

  hotLaneDate = nextHotLane;
  hotLineDate = nextHotLine;
  return changed;
}

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function render() {
  ensurePositions();
  scheduleSave();
  updateMonthCard();
  toggleLanesBtn.textContent = `日付レーン ${state.showLanes ? "ON" : "OFF"}`;
  renderLanes();
  renderLinks();
  renderNotes();
}

function renderLanes() {
  lanesEl.innerHTML = "";
  if (!state.showLanes) return;

  const fragment = document.createDocumentFragment();
  const lanes = getLaneDates();

  lanes.forEach((date, index) => {
    const y = laneTop + index * laneGap;

    const band = document.createElement("div");
    band.className = `laneBand ${index === 0 ? "first" : ""} ${hotLaneDate === date ? "highlight" : ""}`;
    band.style.top = `${y}px`;
    fragment.appendChild(band);

    const line = document.createElement("div");
    line.className = `laneLine ${hotLineDate === date ? "hot" : ""}`;
    line.style.top = `${y}px`;
    fragment.appendChild(line);

    const parts = formatDateParts(date);
    const label = document.createElement("div");
    label.className = "laneLabel";
    label.style.top = `${y + 3}px`;
    label.innerHTML = `<div class="laneDay">${parts.day}</div><div class="laneMonth">${parts.monthName}</div>`;
    fragment.appendChild(label);
  });

  lanesEl.appendChild(fragment);
}

function renderLinks() {
  previewPath = null;
  links.innerHTML = "";
  links.setAttribute("width", String(Math.max(1800, notesEl.scrollWidth || 1800)));
  links.setAttribute("height", String(Math.max(1000, laneTop + getLaneDates().length * laneGap + 260)));

  const fragment = document.createDocumentFragment();

  for (const task of getTasks()) {
    if (!task.parentId || !state.tasks[task.parentId]) continue;
    fragment.appendChild(makeBranchPath(state.tasks[task.parentId], task, "#191919", 4, ""));
  }

  links.appendChild(fragment);
}

function makeBranchPath(parent, child, color, width, dash) {
  const sameColumn = Math.abs(parent.x - child.x) < 6;
  const sameLane = Math.abs(parent.y - child.y) < 20;
  let d;

  if (sameColumn) {
    d = `M ${parent.x + noteW / 2} ${parent.y + noteH} L ${child.x + noteW / 2} ${child.y}`;
  } else if (sameLane) {
    const startX = parent.x + noteW;
    const startY = parent.y + noteH / 2;
    const endX = child.x;
    const endY = child.y + noteH / 2;
    d = `M ${startX} ${startY} L ${endX} ${endY}`;
  } else {
    const x1 = parent.x + noteW / 2;
    const y1 = parent.y + noteH;
    const x2 = child.x + noteW / 2;
    const y2 = child.y;
    const midY = y2 > y1 + 40 ? y1 + Math.max(28, (y2 - y1) * 0.35) : Math.max(y1 + 24, y2 + noteH / 2);
    d = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  }

  return makePath(d, color, width, dash);
}

function makePath(d, color, width, dash) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", width);
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  if (dash) path.setAttribute("stroke-dasharray", dash);
  return path;
}

function ensurePreviewPath() {
  if (previewPath && previewPath.isConnected) return previewPath;

  previewPath = makePath("", "#7357ff", 4, "8 8");
  previewPath.dataset.preview = "1";
  links.appendChild(previewPath);
  return previewPath;
}

function updatePreviewBranch() {
  if (!connectDrag) return;

  const parent = state.tasks[connectDrag.parentId];
  if (!parent) return;

  const x1 = parent.x + noteW / 2;
  const y1 = parent.y + noteH;
  const x2 = connectDrag.x;
  const y2 = connectDrag.y;
  const midY = y2 > y1 + 40 ? y1 + Math.max(28, (y2 - y1) * 0.35) : y1 + 28;
  const d = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;

  ensurePreviewPath().setAttribute("d", d);
}

function renderNotes() {
  notesEl.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const task of getTasks()) {
    const el = document.createElement("div");
    el.className = `note ${task.status === "done" ? "done" : ""} ${task.id === selectedId ? "selected" : ""}`;
    el.dataset.id = task.id;
    setObjectPos(el, task.x, task.y);

    const text = document.createElement("div");
    text.className = "noteText";
    text.textContent = task.title;
    el.appendChild(text);

    const done = document.createElement("div");
    done.className = "doneBtn";
    done.textContent = task.status === "done" ? "✓" : "○";
    done.title = "完了切替";
    done.addEventListener("pointerdown", e => e.stopPropagation());
    done.addEventListener("click", e => {
      e.stopPropagation();
      snapshot();
      task.status = task.status === "done" ? "todo" : "done";
      requestRender();
    });
    el.appendChild(done);

    const handle = document.createElement("div");
    handle.className = "handle";
    handle.textContent = "+";
    handle.title = "引っ張って子タスクを作成";
    handle.addEventListener("pointerdown", onHandlePointerDown);
    el.appendChild(handle);

    el.addEventListener("pointerdown", onNotePointerDown);
    el.addEventListener("dblclick", () => openEditTaskModal(task.id));

    fragment.appendChild(el);
  }

  notesEl.appendChild(fragment);
}

function setSelected(id) {
  if (selectedId === id) return;

  const prev = selectedId;
  selectedId = id;

  if (prev) {
    const prevEl = notesEl.querySelector(`[data-id="${prev}"]`);
    if (prevEl) prevEl.classList.remove("selected");
  }

  if (selectedId) {
    const el = notesEl.querySelector(`[data-id="${selectedId}"]`);
    if (el) el.classList.add("selected");
  }
}

function onNotePointerDown(e) {
  if (e.target.classList.contains("handle") || e.target.classList.contains("doneBtn")) return;

  const taskId = e.currentTarget.dataset.id;
  const task = state.tasks[taskId];
  setSelected(taskId);

  const p = boardPoint(e);
  drag = {
    id: taskId,
    el: e.currentTarget,
    dx: p.x - task.x,
    dy: p.y - task.y,
    moved: false,
    original: { x: task.x, y: task.y, targetAt: task.targetAt }
  };

  e.currentTarget.setPointerCapture(e.pointerId);
  e.currentTarget.classList.add("dragging");
  board.classList.add("grabbing");
}

function onHandlePointerDown(e) {
  e.stopPropagation();

  const noteEl = e.currentTarget.closest(".note");
  const parentId = noteEl.dataset.id;
  const p = boardPoint(e);

  setSelected(parentId);
  connectDrag = {
    parentId,
    x: p.x,
    y: p.y
  };

  ghost.classList.remove("hidden");
  setObjectPos(ghost, p.x - noteW / 2, p.y - noteH / 2);

  noteEl.setPointerCapture(e.pointerId);
  updatePreviewBranch();
}

window.addEventListener("pointermove", e => {
  if (drag) {
    const task = state.tasks[drag.id];
    const p = boardPoint(e);

    task.x = Math.max(laneLabelWidth, p.x - drag.dx);
    task.y = Math.max(18, p.y - drag.dy);
    drag.moved = true;

    setObjectPos(drag.el, task.x, task.y);

    if (updateHotArea(task.y)) {
      renderLanes();
    }
  }

  if (connectDrag) {
    const p = boardPoint(e);

    connectDrag.x = p.x;
    connectDrag.y = p.y;

    const hit = hitTestDateArea(p.y - noteH / 2);
    const nextHotLane = hit.kind === "lane" ? hit.date : null;
    const nextHotLine = hit.kind === "line" ? hit.date : null;
    const hotChanged = nextHotLane !== hotLaneDate || nextHotLine !== hotLineDate;

    hotLaneDate = nextHotLane;
    hotLineDate = nextHotLine;

    let gy = p.y - noteH / 2;
    if (hit.kind === "lane") gy = dateToY(hit.date);

    setObjectPos(ghost, Math.max(laneLabelWidth, p.x - noteW / 2), Math.max(18, gy));
    updatePreviewBranch();

    if (hotChanged) {
      renderLanes();
    }
  }
});

window.addEventListener("pointerup", () => {
  if (drag) {
    const task = state.tasks[drag.id];
    const currentDrag = drag;

    if (drag.moved) {
      const hit = hitTestDateArea(task.y);
      snapshot();

      if (state.showLanes && hit.kind === "lane") {
        task.targetAt = hit.date;
        task.y = dateToY(hit.date);
        drag = null;
        finishDragUI(currentDrag);
        requestRender();
      } else if (state.showLanes && (hit.kind === "line" || hit.kind === "blank")) {
        drag = null;
        finishDragUI(currentDrag);
        openChangeDateModal(task.id, hit.date, currentDrag.original);
      } else {
        drag = null;
        finishDragUI(currentDrag);
        requestRender();
      }
    } else {
      drag = null;
      finishDragUI(currentDrag);
    }
  }

  if (connectDrag) {
    const hit = hitTestDateArea(connectDrag.y - noteH / 2);
    const defaultDate = hit.kind === "lane" ? hit.date : todayISO();
    const x = Math.max(laneLabelWidth, connectDrag.x - noteW / 2);
    const parentId = connectDrag.parentId;

    connectDrag = null;
    ghost.classList.add("hidden");
    if (previewPath) previewPath.remove();
    previewPath = null;
    hotLaneDate = null;
    hotLineDate = null;
    renderLanes();

    openCreateTaskModal({
      parentId,
      x,
      targetAt: defaultDate
    });
  }
});

function finishDragUI(currentDrag) {
  hotLaneDate = null;
  hotLineDate = null;
  board.classList.remove("grabbing");
  if (currentDrag && currentDrag.el) currentDrag.el.classList.remove("dragging");
  renderLanes();
}

function openCreateTaskModal({ parentId = null, x = 520, targetAt = todayISO() } = {}) {
  taskModalMode = "create";
  taskModalContext = { parentId, x, targetAt: normalizeDate(targetAt) };
  taskModalTitle.textContent = parentId ? "子タスクを作成" : "ルートタスクを作成";
  taskNameInput.value = "";
  taskDateInput.value = taskModalContext.targetAt;
  taskModal.classList.remove("hidden");
  requestAnimationFrame(() => taskNameInput.focus({ preventScroll: true }));
}

function openEditTaskModal(taskId) {
  const task = state.tasks[taskId];
  if (!task) return;

  taskModalMode = "edit";
  taskModalContext = { taskId };
  taskModalTitle.textContent = "タスクを編集";
  taskNameInput.value = task.title;
  taskDateInput.value = normalizeDate(task.targetAt);
  taskModal.classList.remove("hidden");
  requestAnimationFrame(() => taskNameInput.select());
}

function closeTaskModal() {
  taskModal.classList.add("hidden");
  taskModalMode = null;
  taskModalContext = null;
}

function saveTaskModal() {
  const title = taskNameInput.value.trim() || "新しいタスク";
  const targetAt = normalizeDate(taskDateInput.value);

  snapshot();

  if (taskModalMode === "create") {
    const parent = taskModalContext.parentId ? state.tasks[taskModalContext.parentId] : null;
    const task = makeTask({
      title,
      parentId: taskModalContext.parentId,
      x: taskModalContext.x ?? (parent ? parent.x : 520),
      targetAt
    });

    if (parent) {
      const siblings = getChildren(parent.id);
      task.x = siblings.length === 0 ? parent.x : parent.x + siblings.length * columnGap;
    }

    state.tasks[task.id] = task;
    selectedId = task.id;
  }

  if (taskModalMode === "edit") {
    const task = state.tasks[taskModalContext.taskId];
    if (task) {
      task.title = title;
      task.targetAt = targetAt;
      selectedId = task.id;
    }
  }

  closeTaskModal();
  refreshLaneDates();
  snapAllToDates();
  branchLayout();
  requestRender();
}

function openChangeDateModal(taskId, defaultDate, original) {
  const task = state.tasks[taskId];
  if (!task) return;

  dateModalContext = {
    taskId,
    original
  };

  changeDateInput.value = normalizeDate(defaultDate || task.targetAt || todayISO());
  dateModal.classList.remove("hidden");
  requestAnimationFrame(() => changeDateInput.focus({ preventScroll: true }));
}

function closeDateModal({ restore = false } = {}) {
  if (restore && dateModalContext) {
    const task = state.tasks[dateModalContext.taskId];
    if (task) {
      task.x = dateModalContext.original.x;
      task.y = dateModalContext.original.y;
      task.targetAt = dateModalContext.original.targetAt;
    }
  }

  dateModal.classList.add("hidden");
  dateModalContext = null;
  hotLaneDate = null;
  hotLineDate = null;
  requestRender();
}

function saveDateModal() {
  if (!dateModalContext) return;

  const task = state.tasks[dateModalContext.taskId];
  if (task) {
    task.targetAt = normalizeDate(changeDateInput.value);
    refreshLaneDates();
    task.y = dateToY(task.targetAt);
  }

  dateModal.classList.add("hidden");
  dateModalContext = null;
  hotLaneDate = null;
  hotLineDate = null;
  branchLayout();
  requestRender();
}

function snapAllToDates() {
  refreshLaneDates();
  for (const task of getTasks()) {
    task.y = state.showLanes ? dateToY(task.targetAt) : task.y;
  }
}

function sortByDateThenTitle(a, b) {
  const dateDiff = normalizeDate(a.targetAt).localeCompare(normalizeDate(b.targetAt));
  if (dateDiff !== 0) return dateDiff;
  return String(a.title).localeCompare(String(b.title), "ja");
}

function branchLayout() {
  refreshLaneDates();

  const roots = getRoots().sort(sortByDateThenTitle);
  let nextCol = 0;

  for (const root of roots) {
    nextCol = assignBranchColumns(root.id, nextCol);
    nextCol += 2;
  }

  resolveColumnCollisions();
  applyColumnsToPositions();
  deleteTempColumns();
}

function assignBranchColumns(taskId, col) {
  const task = state.tasks[taskId];
  if (!task) return col + 1;

  task._col = col;
  const children = getChildren(taskId).sort(sortByDateThenTitle);

  if (children.length === 0) return col + 1;

  let nextCol = assignBranchColumns(children[0].id, col);

  for (let i = 1; i < children.length; i++) {
    nextCol = assignBranchColumns(children[i].id, Math.max(nextCol, col + i));
  }

  return Math.max(nextCol, col + children.length);
}

function resolveColumnCollisions() {
  const tasks = getTasks()
    .slice()
    .sort((a, b) => {
      const dateDiff = normalizeDate(a.targetAt).localeCompare(normalizeDate(b.targetAt));
      if (dateDiff !== 0) return dateDiff;
      return getTaskDepth(a.id) - getTaskDepth(b.id);
    });

  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    const occupied = new Set();

    for (const task of tasks) {
      if (!Number.isFinite(task._col)) {
        task._col = Math.max(0, Math.round((task.x - boardPaddingX) / columnGap));
      }

      let col = task._col;
      const date = normalizeDate(task.targetAt);

      while (occupied.has(`${date}:${col}`)) {
        col += 1;
      }

      if (col !== task._col) {
        shiftSubtreeColumns(task.id, col - task._col);
        changed = true;
      }

      occupied.add(`${date}:${task._col}`);
    }

    if (!changed) break;
  }
}

function shiftSubtreeColumns(taskId, delta) {
  const task = state.tasks[taskId];
  if (!task) return;

  task._col = (task._col ?? 0) + delta;
  for (const child of getChildren(taskId)) {
    shiftSubtreeColumns(child.id, delta);
  }
}

function applyColumnsToPositions() {
  let maxCol = 0;
  for (const task of getTasks()) {
    const col = Number.isFinite(task._col) ? task._col : 0;
    maxCol = Math.max(maxCol, col);
    task.x = boardPaddingX + col * columnGap;
    if (state.showLanes) task.y = dateToY(task.targetAt);
  }

  const width = Math.max(1700, boardPaddingX + (maxCol + 2) * columnGap + noteW);
  [links, lanesEl, notesEl].forEach(el => {
    el.style.minWidth = `${width}px`;
  });
}

function deleteTempColumns() {
  for (const task of getTasks()) delete task._col;
}

function verticalLayoutBranches() {
  branchLayout();
}

function autoLayoutTree() {
  branchLayout();
}

addRootBtn.addEventListener("click", () => {
  openCreateTaskModal({ parentId: null, x: 520, targetAt: todayISO() });
});

treeLayoutBtn.addEventListener("click", () => {
  snapshot();
  autoLayoutTree();
  requestRender();
});

verticalLayoutBtn.addEventListener("click", () => {
  snapshot();
  verticalLayoutBranches();
  requestRender();
});

toggleLanesBtn.addEventListener("click", () => {
  snapshot();
  state.showLanes = !state.showLanes;
  if (state.showLanes) snapAllToDates();
  requestRender();
});

undoBtn.addEventListener("click", () => {
  const prev = undoStack.pop();
  if (!prev) return;

  state = JSON.parse(prev);
  selectedId = null;
  requestRender();
});

resetBtn.addEventListener("click", () => {
  if (!confirm("初期状態に戻しますか？")) return;

  snapshot();
  state = makeInitialState();
  selectedId = null;
  branchLayout();
  requestRender();
});

taskCancelBtn.addEventListener("click", closeTaskModal);
taskSaveBtn.addEventListener("click", saveTaskModal);
dateCancelBtn.addEventListener("click", () => closeDateModal({ restore: true }));
dateSaveBtn.addEventListener("click", saveDateModal);

taskNameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") saveTaskModal();
});

taskDateInput.addEventListener("keydown", e => {
  if (e.key === "Enter") saveTaskModal();
});

changeDateInput.addEventListener("keydown", e => {
  if (e.key === "Enter") saveDateModal();
});

taskModal.addEventListener("pointerdown", e => {
  if (e.target === taskModal) closeTaskModal();
});

dateModal.addEventListener("pointerdown", e => {
  if (e.target === dateModal) closeDateModal({ restore: true });
});

board.addEventListener("pointerdown", e => {
  if (e.target === board || e.target === notesEl || e.target === lanesEl) {
    setSelected(null);
  }
});

window.addEventListener("beforeunload", saveNow);

load();
refreshLaneDates();
snapAllToDates();
branchLayout();
render();
