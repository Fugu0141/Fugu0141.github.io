const STORAGE_KEY = "quest-sticky-todo-v8";

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
const mobileQuery = window.matchMedia("(max-width: 980px)");

const hAxisLeft = 110;
const hAxisTop = 42;
const hDateGap = 280;
const hTrackTop = 92;
const hTrackGap = 148;

const vAxisTop = 48;
const vAxisLeft = 86;
const vDateGap = 150;
const vTaskTopOffset = 42;
const vTrackLeft = 250;
const vTrackGap = 260;

const boardMinWidth = 1700;
const boardMinHeight = 820;

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
let boardRect = null;
let contentWidth = boardMinWidth;
let contentHeight = boardMinHeight;
let maxTrack = 0;
let currentMode = getLayoutMode();

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function id() {
  return Math.random().toString(36).slice(2, 9);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value) {
  if (!value) return todayISO();
  return String(value).slice(0, 10);
}

function getLayoutMode() {
  return mobileQuery.matches ? "vertical" : "horizontal";
}

function isVerticalMode() {
  return currentMode === "vertical";
}\n
function makeTask({ title, parentId = null, targetAt = todayISO(), status = "todo", branchMode = "same" }) {
  return {
    id: id(),
    title: title || "新しいタスク",
    parentId,
    x: 0,
    y: 0,
    targetAt: normalizeDate(targetAt),
    status,
    branchMode: parentId ? branchMode : null
  };
}

function makeInitialState() {
  const root = {
    id: "root",
    title: "数IIIテスト勉強",
    parentId: null,
    x: 0,
    y: 0,
    targetAt: "2026-05-05",
    status: "todo",
    branchMode: null
  };
  const a = {
    id: "a",
    title: "ワーク１２ページ",
    parentId: "root",
    x: 0,
    y: 0,
    targetAt: "2026-05-12",
    status: "todo",
    branchMode: "same"
  };
  const b = {
    id: "b",
    title: "基礎演習２ページ",
    parentId: "root",
    x: 0,
    y: 0,
    targetAt: "2026-05-12",
    status: "todo",
    branchMode: "branch"
  };
  const c = {
    id: "c",
    title: "ワーク１３ページ",
    parentId: "a",
    x: 0,
    y: 0,
    targetAt: "2026-05-15",
    status: "todo",
    branchMode: "same"
  };
  const d = {
    id: "d",
    title: "基礎演習３ページ",
    parentId: "b",
    x: 0,
    y: 0,
    targetAt: "2026-05-18",
    status: "todo",
    branchMode: "same"
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
    || localStorage.getItem("quest-sticky-todo-v6")
    || localStorage.getItem("quest-sticky-todo-v5")
    || localStorage.getItem("quest-sticky-todo-v4")
    || localStorage.getItem("quest-sticky-todo-v3")
    || localStorage.getItem("quest-sticky-todo-v2");

  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.tasks) state = parsed;
  } catch {
    state = makeInitialState();
  }

  for (const task of getTasks()) {
    if (task.parentId && !task.branchMode) task.branchMode = "same";
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
  return getTasks().filter(task => task.parentId === parentId);
}

function getRoots() {
  return getTasks().filter(task => !task.parentId || !state.tasks[task.parentId]);
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
  const dates = new Set([todayISO()]);
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

function hDateLineX(date) {
  return hAxisLeft + dateIndex(date) * hDateGap;
}

function hDateToX(date) {
  return hDateLineX(date) + 34;
}

function hTrackToY(track) {
  return hTrackTop + track * hTrackGap;
}

function vDateLineY(date) {
  return vAxisTop + dateIndex(date) * vDateGap;
}

function vDateToY(date) {
  return vDateLineY(date) + vTaskTopOffset;
}

function vTrackToX(track) {
  return vTrackLeft + track * vTrackGap;
}

function taskX(task) {
  return isVerticalMode() ? vTrackToX(task._track ?? 0) : hDateToX(task.targetAt);
}

function taskY(task) {
  return isVerticalMode() ? vDateToY(task.targetAt) : hTrackToY(task._track ?? 0);
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

function activeTodayBandDate() {
  const lanes = getLaneDates();
  const today = todayISO();
  if (!lanes.length) return today;
  if (lanes.includes(today)) return today;

  let result = lanes[0];
  for (const date of lanes) {
    if (date <= today) result = date;
  }
  return result;
}

function ensureContentSize() {
  refreshLaneDates();
  currentMode = getLayoutMode();
  board.classList.toggle("verticalMode", isVerticalMode());
  board.classList.toggle("horizontalMode", !isVerticalMode());

  let farX = boardMinWidth;
  let farY = boardMinHeight;
  for (const task of getTasks()) {
    if (!Number.isFinite(task.x)) task.x = 0;
    if (!Number.isFinite(task.y)) task.y = 0;
    farX = Math.max(farX, task.x + noteW + 220);
    farY = Math.max(farY, task.y + noteH + 180);
  }

  if (isVerticalMode()) {
    const laneHeight = vAxisTop + Math.max(5, getLaneDates().length) * vDateGap + 230;
    contentWidth = Math.max(boardMinWidth, farX, vTrackToX(maxTrack + 2) + noteW + 240);
    contentHeight = Math.max(boardMinHeight, farY, laneHeight);
  } else {
    const laneWidth = hAxisLeft + Math.max(5, getLaneDates().length) * hDateGap + 360;
    contentWidth = Math.max(boardMinWidth, farX, laneWidth);
    contentHeight = Math.max(boardMinHeight, farY, hTrackToY(maxTrack + 2) + 180);
  }

  [links, lanesEl, notesEl].forEach(el => {
    el.style.minWidth = `${contentWidth}px`;
    el.style.minHeight = `${contentHeight}px`;
  });
}

function startPointerSession() {
  boardRect = board.getBoundingClientRect();
}

function boardPoint(e) {
  const rect = boardRect || board.getBoundingClientRect();
  return {
    x: e.clientX - rect.left + board.scrollLeft,
    y: e.clientY - rect.top + board.scrollTop
  };
}

function setObjectPos(el, x, y) {
  el.style.setProperty("--x", `${x}px`);
  el.style.setProperty("--y", `${y}px`);
}

function hitTestDateArea(noteMainStart) {
  if (!state.showLanes) return { kind: "none", date: null };

  const lanes = getLaneDates();
  if (!lanes.length) return { kind: "blank", date: todayISO() };

  if (isVerticalMode()) {
    const centerY = noteMainStart + noteH / 2;
    let nearestLine = null;
    let nearestLineDistance = Infinity;

    for (const date of lanes) {
      const dist = Math.abs(centerY - vDateLineY(date));
      if (dist < nearestLineDistance) {
        nearestLineDistance = dist;
        nearestLine = date;
      }
    }

    if (nearestLineDistance <= 18) return { kind: "line", date: nearestLine };

    for (let i = 0; i < lanes.length; i++) {
      const top = vAxisTop + i * vDateGap;
      const bottom = top + vDateGap;
      if (centerY > top + 18 && centerY < bottom - 18) return { kind: "lane", date: lanes[i] };
    }

    return { kind: "blank", date: centerY >= vAxisTop + lanes.length * vDateGap ? lanes.at(-1) : lanes[0] };
  }

  const centerX = noteMainStart + noteW / 2;
  let nearestLine = null;
  let nearestLineDistance = Infinity;

  for (const date of lanes) {
    const dist = Math.abs(centerX - hDateLineX(date));
    if (dist < nearestLineDistance) {
      nearestLineDistance = dist;
      nearestLine = date;
    }
  }

  if (nearestLineDistance <= 18) return { kind: "line", date: nearestLine };

  for (let i = 0; i < lanes.length; i++) {
    const left = hAxisLeft + i * hDateGap;
    const right = left + hDateGap;
    if (centerX > left + 18 && centerX < right - 18) return { kind: "lane", date: lanes[i] };
  }

  return { kind: "blank", date: centerX >= hAxisLeft + lanes.length * hDateGap ? lanes.at(-1) : lanes[0] };
}

function updateHotArea(mainStart) {
  const hit = hitTestDateArea(mainStart);
  const nextHotLane = hit.kind === "lane" ? hit.date : null;
  const nextHotLine = hit.kind === "line" ? hit.date : null;
  const changed = nextHotLane !== hotLaneDate || nextHotLine !== hotLineDate;

  hotLaneDate = nextHotLane;
  hotLineDate = nextHotLine;
  return changed;
}

function getDateForPointer(event) {
  const point = boardPoint(event);
  const hit = isVerticalMode()
    ? hitTestDateArea(point.y - noteH / 2)
    : hitTestDateArea(point.x - noteW / 2);
  return hit.date || todayISO();
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
  ensureContentSize();
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
  const activeDate = activeTodayBandDate();

  lanes.forEach((date, index) => {
    const isTodayBand = date === activeDate;
    const isTodayLine = date === todayISO();
    const parts = formatDateParts(date);

    const band = document.createElement("div");
    band.className = `laneBand ${isTodayBand ? "todayBand" : ""} ${hotLaneDate === date ? "highlight" : ""}`;

    const line = document.createElement("div");
    line.className = `laneLine ${isTodayLine ? "todayLine" : ""} ${hotLineDate === date ? "hot" : ""}`;

    const label = document.createElement("div");
    label.className = `laneLabel ${isTodayLine ? "todayLabel" : ""}`;
    label.innerHTML = `<div class="laneDay">${parts.day}</div><div class="laneMonth">${parts.monthName}</div>`;

    if (isVerticalMode()) {
      const y = vAxisTop + index * vDateGap;
      band.style.top = `${y}px`;
      band.style.height = `${vDateGap}px`;
      line.style.top = `${y}px`;
      label.style.top = `${y + 10}px`;
      label.style.left = "42px";
    } else {
      const x = hAxisLeft + index * hDateGap;
      band.style.left = `${x}px`;
      band.style.width = `${hDateGap}px`;
      line.style.left = `${x}px`;
      label.style.left = `${x + 16}px`;
      label.style.top = "12px";
    }

    fragment.appendChild(band);
    fragment.appendChild(line);
    fragment.appendChild(label);
  });

  lanesEl.appendChild(fragment);
}

function renderLinks() {
  previewPath = null;
  links.innerHTML = "";
  links.setAttribute("width", String(contentWidth));
  links.setAttribute("height", String(contentHeight));

  const fragment = document.createDocumentFragment();

  for (const task of getTasks()) {
    if (!task.parentId || !state.tasks[task.parentId]) continue;
    fragment.appendChild(makeBranchPath(state.tasks[task.parentId], task, "#191919", 4, ""));
  }

  links.appendChild(fragment);
}

function makeBranchPath(parent, child, color, width, dash) {
  return isVerticalMode()
    ? makeVerticalBranchPath(parent, child, color, width, dash)
    : makeHorizontalBranchPath(parent, child, color, width, dash);
}

function makeVerticalBranchPath(parent, child, color, width, dash) {
  const sameTrack = Math.abs(parent.x - child.x) < 6;
  const sameDate = Math.abs(parent.y - child.y) < 6;
  let d;

  if (sameTrack) {
    const x = parent.x + noteW / 2;
    d = `M ${x} ${parent.y + noteH} L ${x} ${child.y}`;
  } else if (sameDate) {
    d = `M ${parent.x + noteW} ${parent.y + noteH / 2} L ${child.x} ${child.y + noteH / 2}`;
  } else {
    const x1 = parent.x + noteW / 2;
    const y1 = parent.y + noteH;
    const x2 = child.x + noteW / 2;
    const y2 = child.y;
    const trunkY = Math.min(y2 - 24, y1 + 28);
    d = `M ${x1} ${y1} L ${x1} ${trunkY} L ${x2} ${trunkY} L ${x2} ${y2}`;
  }

  return makePath(d, color, width, dash);
}

function makeHorizontalBranchPath(parent, child, color, width, dash) {
  const sameTrack = Math.abs(parent.y - child.y) < 6;
  const sameDate = Math.abs(parent.x - child.x) < 6;
  let d;

  if (sameTrack) {
    d = `M ${parent.x + noteW} ${parent.y + noteH / 2} L ${child.x} ${child.y + noteH / 2}`;
  } else if (sameDate) {
    const x = parent.x + noteW / 2;
    d = `M ${x} ${parent.y + noteH} L ${x} ${child.y}`;
  } else {
    const x1 = parent.x + noteW;
    const y1 = parent.y + noteH / 2;
    const x2 = child.x;
    const y2 = child.y + noteH / 2;
    const trunkX = Math.min(x2 - 24, x1 + 28);
    d = `M ${x1} ${y1} L ${trunkX} ${y1} L ${trunkX} ${y2} L ${x2} ${y2}`;
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

function inferBranchMode(parent, point) {
  if (isVerticalMode()) {
    const parentCenter = parent.x + noteW / 2;
    return Math.abs(point.x - parentCenter) < vTrackGap * 0.42 ? "same" : "branch";
  }

  const parentCenter = parent.y + noteH / 2;
  return Math.abs(point.y - parentCenter) < hTrackGap * 0.42 ? "same" : "branch";
}

function updatePreviewBranch() {
  if (!connectDrag) return;

  const parent = state.tasks[connectDrag.parentId];
  if (!parent) return;

  const mode = inferBranchMode(parent, connectDrag);
  let d;

  if (isVerticalMode()) {
    const x1 = parent.x + noteW / 2;
    const y1 = parent.y + noteH;
    const x2 = mode === "same" ? x1 : connectDrag.x;
    const y2 = connectDrag.y;
    const trunkY = Math.min(y2 - 24, y1 + 28);
    d = mode === "same"
      ? `M ${x1} ${y1} L ${x1} ${y2}`
      : `M ${x1} ${y1} L ${x1} ${trunkY} L ${x2} ${trunkY} L ${x2} ${y2}`;
  } else {
    const x1 = parent.x + noteW;
    const y1 = parent.y + noteH / 2;
    const x2 = connectDrag.x;
    const y2 = mode === "same" ? y1 : connectDrag.y;
    const trunkX = Math.min(x2 - 24, x1 + 28);
    d = mode === "same"
      ? `M ${x1} ${y1} L ${x2} ${y1}`
      : `M ${x1} ${y1} L ${trunkX} ${y1} L ${trunkX} ${y2} L ${x2} ${y2}`;
  }

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
    done.addEventListener("pointerdown", event => event.stopPropagation());
    done.addEventListener("click", event => {
      event.stopPropagation();
      snapshot();
      task.status = task.status === "done" ? "todo" : "done";
      requestRender();
    });
    el.appendChild(done);

    const handle = document.createElement("div");
    handle.className = "handle";
    handle.textContent = "+";
    handle.title = isVerticalMode() ? "タップで同じブランチに追加" : "右へ引くと同じブランチ / 下へずらすと分岐";
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

function onNotePointerDown(event) {
  if (event.target.classList.contains("handle") || event.target.classList.contains("doneBtn")) return;

  startPointerSession();
  const taskId = event.currentTarget.dataset.id;
  const task = state.tasks[taskId];
  setSelected(taskId);

  const p = boardPoint(event);
  drag = {
    id: taskId,
    el: event.currentTarget,
    dx: p.x - task.x,
    dy: p.y - task.y,
    moved: false,
    original: { x: task.x, y: task.y, targetAt: task.targetAt }
  };

  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.classList.add("dragging");
  board.classList.add("grabbing");
}

function onHandlePointerDown(event) {
  event.stopPropagation();

  startPointerSession();
  const noteEl = event.currentTarget.closest(".note");
  const parentId = noteEl.dataset.id;
  const p = boardPoint(event);

  setSelected(parentId);
  connectDrag = { parentId, x: p.x, y: p.y };

  ghost.classList.remove("hidden");
  setObjectPos(ghost, p.x - noteW / 2, p.y - noteH / 2);

  noteEl.setPointerCapture(event.pointerId);
  updatePreviewBranch();
}

window.addEventListener("pointermove", event => {
  if (drag) {
    const task = state.tasks[drag.id];
    const p = boardPoint(event);

    task.x = Math.max(40, p.x - drag.dx);
    task.y = Math.max(30, p.y - drag.dy);
    drag.moved = true;

    setObjectPos(drag.el, task.x, task.y);

    const mainStart = isVerticalMode() ? task.y : task.x;
    if (updateHotArea(mainStart)) renderLanes();
  }

  if (connectDrag) {
    const parent = state.tasks[connectDrag.parentId];
    const p = boardPoint(event);

    connectDrag.x = p.x;
    connectDrag.y = p.y;

    const hit = isVerticalMode()
      ? hitTestDateArea(p.y - noteH / 2)
      : hitTestDateArea(p.x - noteW / 2);
    const nextHotLane = hit.kind === "lane" ? hit.date : null;
    const nextHotLine = hit.kind === "line" ? hit.date : null;
    const hotChanged = nextHotLane !== hotLaneDate || nextHotLine !== hotLineDate;

    hotLaneDate = nextHotLane;
    hotLineDate = nextHotLine;

    const mode = inferBranchMode(parent, p);
    let gx = p.x - noteW / 2;
    let gy = p.y - noteH / 2;

    if (isVerticalMode()) {
      if (hit.kind === "lane") gy = vDateToY(hit.date);
      if (mode === "same") gx = parent.x;
    } else {
      if (hit.kind === "lane") gx = hDateToX(hit.date);
      if (mode === "same") gy = parent.y;
    }

    setObjectPos(ghost, Math.max(40, gx), Math.max(30, gy));
    updatePreviewBranch();

    if (hotChanged) renderLanes();
  }
});

window.addEventListener("pointerup", () => {
  if (drag) {
    const task = state.tasks[drag.id];
    const currentDrag = drag;

    if (drag.moved) {
      const hit = isVerticalMode() ? hitTestDateArea(task.y) : hitTestDateArea(task.x);
      snapshot();

      if (state.showLanes && hit.kind === "lane") {
        task.targetAt = hit.date;
        if (isVerticalMode()) task.y = vDateToY(hit.date);
        else task.x = hDateToX(hit.date);
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
    const parent = state.tasks[connectDrag.parentId];
    const hit = isVerticalMode()
      ? hitTestDateArea(connectDrag.y - noteH / 2)
      : hitTestDateArea(connectDrag.x - noteW / 2);
    const defaultDate = hit.kind === "lane" ? hit.date : todayISO();
    const branchMode = inferBranchMode(parent, connectDrag);
    const parentId = connectDrag.parentId;

    connectDrag = null;
    ghost.classList.add("hidden");
    if (previewPath) previewPath.remove();
    previewPath = null;
    hotLaneDate = null;
    hotLineDate = null;
    renderLanes();

    openCreateTaskModal({ parentId, targetAt: defaultDate, branchMode });
  }
});

function finishDragUI(currentDrag) {
  hotLaneDate = null;
  hotLineDate = null;
  boardRect = null;
  board.classList.remove("grabbing");
  if (currentDrag && currentDrag.el) currentDrag.el.classList.remove("dragging");
  renderLanes();
}

function openCreateTaskModal({ parentId = null, targetAt = todayISO(), branchMode = "same" } = {}) {
  taskModalMode = "create";
  taskModalContext = { parentId, targetAt: normalizeDate(targetAt), branchMode };
  taskModalTitle.textContent = parentId
    ? branchMode === "same" ? "同じブランチに追加" : "分岐タスクを作成"
    : "ルートタスクを作成";
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

function getSameBranchTail(startId, targetAt) {
  let current = state.tasks[startId];
  if (!current) return startId;

  const target = normalizeDate(targetAt);
  const seen = new Set();

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const next = getChildren(current.id)
      .filter(child => child.branchMode === "same" && normalizeDate(child.targetAt) <= target)
      .sort(sortByDateThenTitle)
      .at(-1);

    if (!next) break;
    current = next;
  }

  return current ? current.id : startId;
}

function saveTaskModal() {
  const title = taskNameInput.value.trim() || "新しいタスク";
  const targetAt = normalizeDate(taskDateInput.value);

  snapshot();

  if (taskModalMode === "create") {
    const branchMode = taskModalContext.branchMode || "same";
    const parentId = branchMode === "same" && taskModalContext.parentId
      ? getSameBranchTail(taskModalContext.parentId, targetAt)
      : taskModalContext.parentId;

    const task = makeTask({ title, parentId, targetAt, branchMode });
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
  branchLayout();
  requestRender();
}

function openChangeDateModal(taskId, defaultDate, original) {
  const task = state.tasks[taskId];
  if (!task) return;

  dateModalContext = { taskId, original };

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
  if (task) task.targetAt = normalizeDate(changeDateInput.value);

  dateModal.classList.add("hidden");
  dateModalContext = null;
  hotLaneDate = null;
  hotLineDate = null;
  branchLayout();
  requestRender();
}

function sortByDateThenTitle(a, b) {
  const dateDiff = normalizeDate(a.targetAt).localeCompare(normalizeDate(b.targetAt));
  if (dateDiff !== 0) return dateDiff;
  return String(a.title).localeCompare(String(b.title), "ja");
}

function orderChildrenForLayout(taskId) {
  const children = getChildren(taskId).sort(sortByDateThenTitle);
  if (children.length <= 1) return children;

  const mainChild = children.find(child => child.branchMode === "same") || children[0];
  const branches = children.filter(child => child.id !== mainChild.id);
  return [mainChild, ...branches];
}

function branchLayout() {
  refreshLaneDates();
  currentMode = getLayoutMode();

  const roots = getRoots().sort(sortByDateThenTitle);
  let nextTrack = 0;

  for (const root of roots) {
    nextTrack = assignBranchTracks(root.id, nextTrack, nextTrack + 1);
    nextTrack += 1;
  }

  maxTrack = Math.max(0, nextTrack);
  resolveTrackCollisions();
  applyTracksToPositions();
  deleteTempTracks();
}

function assignBranchTracks(taskId, track, nextTrack) {
  const task = state.tasks[taskId];
  if (!task) return nextTrack;

  task._track = track;
  const children = orderChildrenForLayout(taskId);
  if (!children.length) return Math.max(nextTrack, track + 1);

  const mainChild = children[0];
  nextTrack = assignBranchTracks(mainChild.id, track, Math.max(nextTrack, track + 1));

  for (let i = 1; i < children.length; i++) {
    const childTrack = nextTrack;
    nextTrack = assignBranchTracks(children[i].id, childTrack, childTrack + 1);
  }

  return Math.max(nextTrack, track + 1);
}

function resolveTrackCollisions() {
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
      if (!Number.isFinite(task._track)) task._track = 0;

      let track = task._track;
      const date = normalizeDate(task.targetAt);
      while (occupied.has(`${date}:${track}`)) track += 1;

      if (track !== task._track) {
        shiftSubtreeTracks(task.id, track - task._track);
        changed = true;
      }

      occupied.add(`${date}:${task._track}`);
      maxTrack = Math.max(maxTrack, task._track);
    }

    if (!changed) break;
  }
}

function shiftSubtreeTracks(taskId, delta) {
  const task = state.tasks[taskId];
  if (!task) return;

  task._track = (task._track ?? 0) + delta;
  for (const child of getChildren(taskId)) shiftSubtreeTracks(child.id, delta);
}

function applyTracksToPositions() {
  for (const task of getTasks()) {
    const track = Number.isFinite(task._track) ? task._track : 0;
    maxTrack = Math.max(maxTrack, track);
    task.x = taskX(task);
    task.y = taskY(task);
  }
}

function deleteTempTracks() {
  for (const task of getTasks()) delete task._track;
}

function verticalLayoutBranches() {
  branchLayout();
}

function autoLayoutTree() {
  branchLayout();
}

addRootBtn.addEventListener("click", () => {
  openCreateTaskModal({ parentId: null, targetAt: todayISO(), branchMode: "same" });
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
  requestRender();
});

undoBtn.addEventListener("click", () => {
  const prev = undoStack.pop();
  if (!prev) return;

  state = JSON.parse(prev);
  selectedId = null;
  branchLayout();
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

taskNameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") saveTaskModal();
});

taskDateInput.addEventListener("keydown", event => {
  if (event.key === "Enter") saveTaskModal();
});

changeDateInput.addEventListener("keydown", event => {
  if (event.key === "Enter") saveDateModal();
});

taskModal.addEventListener("pointerdown", event => {
  if (event.target === taskModal) closeTaskModal();
});

dateModal.addEventListener("pointerdown", event => {
  if (event.target === dateModal) closeDateModal({ restore: true });
});

board.addEventListener("pointerdown", event => {
  if (event.target === board || event.target === notesEl || event.target === lanesEl) setSelected(null);
});

mobileQuery.addEventListener("change", () => {
  currentMode = getLayoutMode();
  branchLayout();
  requestRender();
});

window.addEventListener("beforeunload", saveNow);

load();
refreshLaneDates();
branchLayout();
render();