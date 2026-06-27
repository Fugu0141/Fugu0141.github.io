const STORAGE_KEY = "quest-sticky-todo-v2";

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
  const date = normalizeDate(targetAt);
  return {
    id: id(),
    title: title || "新しいタスク",
    parentId,
    x,
    y: 0,
    targetAt: date,
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

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
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

function getLaneDates() {
  const dates = new Set();
  for (const t of getTasks()) dates.add(normalizeDate(t.targetAt));
  return [...dates].sort((a, b) => a.localeCompare(b));
}

function dateIndex(date) {
  const lanes = getLaneDates();
  const i = lanes.indexOf(normalizeDate(date));
  return i >= 0 ? i : lanes.length;
}

function dateToY(date) {
  return laneTop + dateIndex(date) * laneGap + 28;
}

function laneLineY(date) {
  return laneTop + dateIndex(date) * laneGap;
}

function formatDateParts(date) {
  const [y, m, d] = normalizeDate(date).split("-").map(Number);
  return { year: y, month: m, day: d, monthName: monthNames[m - 1] || "" };
}

function updateMonthCard() {
  const lanes = getLaneDates();
  const first = lanes[0] || todayISO();
  const parts = formatDateParts(first);
  monthBig.textContent = String(parts.month);
  monthName.textContent = parts.monthName;
}

function ensurePositions() {
  for (const t of getTasks()) {
    if (!Number.isFinite(t.x)) t.x = 520;
    if (!drag || drag.id !== t.id) {
      t.y = state.showLanes ? dateToY(t.targetAt) : t.y || 80;
    }
  }

  const lanes = getLaneDates();
  const height = laneTop + Math.max(5, lanes.length) * laneGap + 240;
  const width = 1700;
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

function hitTestDateArea(noteTopY) {
  if (!state.showLanes) return { kind: "none", date: null };

  const lanes = getLaneDates();
  if (lanes.length === 0) return { kind: "blank", date: todayISO() };

  const centerY = noteTopY + noteH / 2;
  let nearestLine = null;
  let nearestLineDistance = Infinity;

  for (const date of lanes) {
    const lineY = laneLineY(date);
    const dist = Math.abs(centerY - lineY);
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
  hotLaneDate = hit.kind === "lane" ? hit.date : null;
  hotLineDate = hit.kind === "line" ? hit.date : null;
}

function render() {
  ensurePositions();
  save();
  updateMonthCard();
  toggleLanesBtn.textContent = `日付レーン ${state.showLanes ? "ON" : "OFF"}`;
  renderLanes();
  renderLinks();
  renderNotes();
}

function renderLanes() {
  lanesEl.innerHTML = "";
  if (!state.showLanes) return;

  const lanes = getLaneDates();

  lanes.forEach((date, i) => {
    const y = laneTop + i * laneGap;
    const band = document.createElement("div");
    band.className = `laneBand ${i === 0 ? "first" : ""} ${hotLaneDate === date ? "highlight" : ""}`;
    band.style.top = `${y}px`;
    lanesEl.appendChild(band);

    const line = document.createElement("div");
    line.className = `laneLine ${hotLineDate === date ? "hot" : ""}`;
    line.style.top = `${y}px`;
    lanesEl.appendChild(line);

    const parts = formatDateParts(date);
    const label = document.createElement("div");
    label.className = "laneLabel";
    label.style.top = `${y + 3}px`;
    label.innerHTML = `<div class="laneDay">${parts.day}</div><div class="laneMonth">${parts.monthName}</div>`;
    lanesEl.appendChild(label);
  });
}

function renderLinks() {
  links.innerHTML = "";
  links.setAttribute("width", "1800");
  links.setAttribute("height", Math.max(1000, laneTop + getLaneDates().length * laneGap + 260));

  for (const task of getTasks()) {
    if (!task.parentId || !state.tasks[task.parentId]) continue;
    drawBranch(state.tasks[task.parentId], task, "#191919", 4, "");
  }

  if (connectDrag) {
    const parent = state.tasks[connectDrag.parentId];
    if (parent) {
      drawBranchFromPoint(
        parent.x + noteW / 2,
        parent.y + noteH,
        connectDrag.x,
        connectDrag.y,
        "#7357ff",
        4,
        "8 8"
      );
    }
  }
}

function drawBranch(parent, child, color, width, dash) {
  const x1 = parent.x + noteW / 2;
  const y1 = parent.y + noteH;
  const x2 = child.x + noteW / 2;
  const y2 = child.y;
  drawBranchFromPoint(x1, y1, x2, y2, color, width, dash);
}

function drawBranchFromPoint(x1, y1, x2, y2, color, width, dash) {
  const midY = Math.min(y2 - 18, y1 + Math.max(26, (y2 - y1) * 0.35));
  const d = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", width);
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  if (dash) path.setAttribute("stroke-dasharray", dash);
  links.appendChild(path);
}

function renderNotes() {
  notesEl.innerHTML = "";

  for (const task of getTasks()) {
    const el = document.createElement("div");
    el.className = `note ${task.status === "done" ? "done" : ""} ${task.id === selectedId ? "selected" : ""}`;
    el.style.left = `${task.x}px`;
    el.style.top = `${task.y}px`;
    el.dataset.id = task.id;

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
      render();
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

    notesEl.appendChild(el);
  }
}

function onNotePointerDown(e) {
  if (e.target.classList.contains("handle") || e.target.classList.contains("doneBtn")) return;

  const id = e.currentTarget.dataset.id;
  const t = state.tasks[id];
  selectedId = id;

  const p = boardPoint(e);
  drag = {
    id,
    dx: p.x - t.x,
    dy: p.y - t.y,
    moved: false,
    original: { x: t.x, y: t.y, targetAt: t.targetAt }
  };

  e.currentTarget.setPointerCapture(e.pointerId);
  e.currentTarget.classList.add("dragging");
  board.classList.add("grabbing");
  renderNotes();
}

function onHandlePointerDown(e) {
  e.stopPropagation();

  const noteEl = e.currentTarget.closest(".note");
  const parentId = noteEl.dataset.id;
  const p = boardPoint(e);

  selectedId = parentId;
  connectDrag = {
    parentId,
    x: p.x,
    y: p.y
  };

  ghost.classList.remove("hidden");
  ghost.style.left = `${p.x - noteW / 2}px`;
  ghost.style.top = `${p.y - noteH / 2}px`;

  noteEl.setPointerCapture(e.pointerId);
  renderLinks();
}

window.addEventListener("pointermove", e => {
  if (drag) {
    const t = state.tasks[drag.id];
    const p = boardPoint(e);
    t.x = Math.max(laneLabelWidth, p.x - drag.dx);
    t.y = Math.max(18, p.y - drag.dy);
    drag.moved = true;

    updateHotArea(t.y);
    renderLanes();
    renderLinks();

    const el = notesEl.querySelector(`[data-id="${drag.id}"]`);
    if (el) {
      el.style.left = `${t.x}px`;
      el.style.top = `${t.y}px`;
    }
  }

  if (connectDrag) {
    const p = boardPoint(e);
    connectDrag.x = p.x;
    connectDrag.y = p.y;

    const hit = hitTestDateArea(p.y - noteH / 2);
    hotLaneDate = hit.kind === "lane" ? hit.date : null;
    hotLineDate = hit.kind === "line" ? hit.date : null;

    let gy = p.y - noteH / 2;
    if (hit.kind === "lane") gy = dateToY(hit.date);

    ghost.style.left = `${Math.max(laneLabelWidth, p.x - noteW / 2)}px`;
    ghost.style.top = `${Math.max(18, gy)}px`;

    renderLanes();
    renderLinks();
  }
});

window.addEventListener("pointerup", () => {
  if (drag) {
    const t = state.tasks[drag.id];

    if (drag.moved) {
      const hit = hitTestDateArea(t.y);
      snapshot();

      if (state.showLanes && hit.kind === "lane") {
        t.targetAt = hit.date;
        t.y = dateToY(hit.date);
        render();
      } else if (state.showLanes && (hit.kind === "line" || hit.kind === "blank")) {
        openChangeDateModal(t.id, hit.date, drag.original);
      } else {
        render();
      }
    }

    drag = null;
    hotLaneDate = null;
    hotLineDate = null;
    board.classList.remove("grabbing");
    notesEl.querySelectorAll(".dragging").forEach(el => el.classList.remove("dragging"));
  }

  if (connectDrag) {
    const hit = hitTestDateArea(connectDrag.y - noteH / 2);
    const defaultDate = hit.kind === "lane" ? hit.date : todayISO();
    const x = Math.max(laneLabelWidth, connectDrag.x - noteW / 2);

    const parentId = connectDrag.parentId;
    connectDrag = null;
    ghost.classList.add("hidden");
    hotLaneDate = null;
    hotLineDate = null;
    renderLanes();
    renderLinks();

    openCreateTaskModal({
      parentId,
      x,
      targetAt: defaultDate
    });
  }
});

function openCreateTaskModal({ parentId = null, x = 520, targetAt = todayISO() } = {}) {
  taskModalMode = "create";
  taskModalContext = { parentId, x, targetAt: normalizeDate(targetAt) };
  taskModalTitle.textContent = parentId ? "子タスクを作成" : "ルートタスクを作成";
  taskNameInput.value = "";
  taskDateInput.value = taskModalContext.targetAt;
  taskModal.classList.remove("hidden");
  setTimeout(() => taskNameInput.focus(), 30);
}

function openEditTaskModal(taskId) {
  const t = state.tasks[taskId];
  if (!t) return;

  taskModalMode = "edit";
  taskModalContext = { taskId };
  taskModalTitle.textContent = "タスクを編集";
  taskNameInput.value = t.title;
  taskDateInput.value = normalizeDate(t.targetAt);
  taskModal.classList.remove("hidden");
  setTimeout(() => taskNameInput.select(), 30);
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

    if (parent && Math.abs(task.x - parent.x) < 12) {
      const siblings = getChildren(parent.id);
      task.x = parent.x + (siblings.length - (siblings.length ? 0.5 : 0)) * 260;
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
  snapAllToDates();
  render();
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
  setTimeout(() => changeDateInput.focus(), 30);
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
  render();
}

function saveDateModal() {
  if (!dateModalContext) return;

  const task = state.tasks[dateModalContext.taskId];
  if (task) {
    task.targetAt = normalizeDate(changeDateInput.value);
    task.y = dateToY(task.targetAt);
  }

  dateModal.classList.add("hidden");
  dateModalContext = null;
  hotLaneDate = null;
  hotLineDate = null;
  render();
}

function snapAllToDates() {
  for (const task of getTasks()) {
    task.y = state.showLanes ? dateToY(task.targetAt) : task.y;
  }
}

function measureSubtree(taskId) {
  const children = getChildren(taskId);
  if (!children.length) return noteW;
  const total = children.map(c => measureSubtree(c.id)).reduce((a, b) => a + b, 0) + (children.length - 1) * 64;
  return Math.max(noteW, total);
}

function autoLayoutTree() {
  const roots = getTasks().filter(t => !t.parentId);
  roots.sort((a, b) => normalizeDate(a.targetAt).localeCompare(normalizeDate(b.targetAt)));

  let cursor = 260;
  for (const root of roots) {
    const width = layoutTreeNode(root.id, cursor);
    cursor += width + 150;
  }

  resolveCollisions();
}

function layoutTreeNode(taskId, left) {
  const task = state.tasks[taskId];
  const children = getChildren(taskId);
  children.sort((a, b) => normalizeDate(a.targetAt).localeCompare(normalizeDate(b.targetAt)));

  const width = measureSubtree(taskId);

  if (!children.length) {
    task.x = left + (width - noteW) / 2;
  } else {
    let childLeft = left;
    for (const child of children) {
      const childWidth = measureSubtree(child.id);
      layoutTreeNode(child.id, childLeft);
      childLeft += childWidth + 64;
    }
    const first = children[0];
    const last = children[children.length - 1];
    task.x = (first.x + last.x) / 2;
  }

  task.y = state.showLanes ? dateToY(task.targetAt) : task.y;
  return width;
}

function verticalLayoutBranches() {
  const roots = getTasks().filter(t => !t.parentId);
  roots.sort((a, b) => normalizeDate(a.targetAt).localeCompare(normalizeDate(b.targetAt)));

  let rootX = 500;
  for (const root of roots) {
    root.x = rootX;
    layoutVerticalChildren(root.id, root.x);
    rootX += Math.max(360, countLeafs(root.id) * 280 + 160);
  }

  for (const task of getTasks()) {
    task.y = state.showLanes ? dateToY(task.targetAt) : task.y;
  }

  resolveCollisions();
}

function layoutVerticalChildren(parentId, centerX) {
  const children = getChildren(parentId);
  if (!children.length) return;

  children.sort((a, b) => normalizeDate(a.targetAt).localeCompare(normalizeDate(b.targetAt)));

  if (children.length === 1) {
    children[0].x = centerX;
    layoutVerticalChildren(children[0].id, centerX);
    return;
  }

  const gap = 270;
  const start = centerX - ((children.length - 1) * gap) / 2;

  children.forEach((child, i) => {
    child.x = start + i * gap;
    layoutVerticalChildren(child.id, child.x);
  });
}

function countLeafs(taskId) {
  const children = getChildren(taskId);
  if (!children.length) return 1;
  return children.map(c => countLeafs(c.id)).reduce((a, b) => a + b, 0);
}

function resolveCollisions() {
  const byLane = new Map();

  for (const task of getTasks()) {
    const key = normalizeDate(task.targetAt);
    if (!byLane.has(key)) byLane.set(key, []);
    byLane.get(key).push(task);
  }

  for (const tasks of byLane.values()) {
    tasks.sort((a, b) => a.x - b.x);
    for (let i = 1; i < tasks.length; i++) {
      const prev = tasks[i - 1];
      const cur = tasks[i];
      const minX = prev.x + noteW + 36;
      if (cur.x < minX) cur.x = minX;
    }
  }
}

addRootBtn.addEventListener("click", () => {
  openCreateTaskModal({ parentId: null, x: 520, targetAt: todayISO() });
});

treeLayoutBtn.addEventListener("click", () => {
  snapshot();
  autoLayoutTree();
  render();
});

verticalLayoutBtn.addEventListener("click", () => {
  snapshot();
  verticalLayoutBranches();
  render();
});

toggleLanesBtn.addEventListener("click", () => {
  snapshot();
  state.showLanes = !state.showLanes;
  if (state.showLanes) snapAllToDates();
  render();
});

undoBtn.addEventListener("click", () => {
  const prev = undoStack.pop();
  if (!prev) return;
  state = JSON.parse(prev);
  selectedId = null;
  render();
});

resetBtn.addEventListener("click", () => {
  if (!confirm("初期状態に戻しますか？")) return;
  snapshot();
  state = makeInitialState();
  selectedId = null;
  render();
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
    selectedId = null;
    renderNotes();
  }
});

load();
snapAllToDates();
render();
