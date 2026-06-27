const STORAGE_KEY = "quest-sticky-todo-v1";

const board = document.getElementById("board");
const links = document.getElementById("links");
const lanesEl = document.getElementById("lanes");
const notesEl = document.getElementById("notes");
const ghost = document.getElementById("ghost");

const addRootBtn = document.getElementById("addRootBtn");
const autoLayoutBtn = document.getElementById("autoLayoutBtn");
const toggleLanesBtn = document.getElementById("toggleLanesBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");

const inspector = document.getElementById("inspector");
const emptyInspector = document.getElementById("emptyInspector");
const titleInput = document.getElementById("titleInput");
const createdInput = document.getElementById("createdInput");
const targetInput = document.getElementById("targetInput");
const completedInput = document.getElementById("completedInput");
const statusInput = document.getElementById("statusInput");
const memoInput = document.getElementById("memoInput");
const dateModeInput = document.getElementById("dateModeInput");
const historyEl = document.getElementById("history");

const days = [5, 12, 14, 15, 18];
const month = "2026-05";
const laneTop = 84;
const laneGap = 154;
const noteW = 220;
const noteH = 112;

let state = makeInitialState();
let selectedId = null;
let drag = null;
let connectDrag = null;
let undoStack = [];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function id() {
  return Math.random().toString(36).slice(2, 9);
}

function makeTask(title, x, y, parentId = null, targetAt = `${month}-12`) {
  return {
    id: id(),
    title,
    parentId,
    x,
    y,
    createdAt: todayISO(),
    targetAt,
    completedAt: "",
    status: "todo",
    memo: "",
    collapsed: false
  };
}

function makeInitialState() {
  const root = {
    id: "root",
    title: "数IIIテスト勉強",
    parentId: null,
    x: 560,
    y: 98,
    createdAt: "2026-05-05",
    targetAt: "2026-05-12",
    completedAt: "",
    status: "todo",
    memo: "メインクエスト",
    collapsed: false
  };
  const a = {
    id: "a",
    title: "ワーク１２ページ",
    parentId: "root",
    x: 420,
    y: 254,
    createdAt: "2026-05-05",
    targetAt: "2026-05-12",
    completedAt: "",
    status: "todo",
    memo: "",
    collapsed: false
  };
  const b = {
    id: "b",
    title: "基礎演習２ページ",
    parentId: "root",
    x: 700,
    y: 254,
    createdAt: "2026-05-05",
    targetAt: "2026-05-12",
    completedAt: "",
    status: "todo",
    memo: "",
    collapsed: false
  };
  const c = {
    id: "c",
    title: "ワーク１３ページ",
    parentId: "a",
    x: 420,
    y: 420,
    createdAt: "2026-05-05",
    targetAt: "2026-05-15",
    completedAt: "",
    status: "todo",
    memo: "",
    collapsed: false
  };
  const d = {
    id: "d",
    title: "基礎演習３ページ",
    parentId: "b",
    x: 700,
    y: 580,
    createdAt: "2026-05-05",
    targetAt: "2026-05-18",
    completedAt: "",
    status: "todo",
    memo: "",
    collapsed: false
  };
  return {
    tasks: { root, a, b, c, d },
    showLanes: true,
    dateMode: "targetAt",
    history: [
      { at: new Date().toLocaleString(), text: "サンプルプロジェクトを作成" }
    ]
  };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    state = JSON.parse(raw);
  } catch {
    state = makeInitialState();
  }
}

function snapshot() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 80) undoStack.shift();
}

function record(text) {
  state.history.unshift({ at: new Date().toLocaleString(), text });
  state.history = state.history.slice(0, 60);
}

function getChildren(parentId) {
  return Object.values(state.tasks).filter(t => t.parentId === parentId);
}

function dayToY(day) {
  const index = days.indexOf(day);
  if (index >= 0) return laneTop + index * laneGap + 24;
  const minDay = days[0];
  const maxDay = days[days.length - 1];
  const clamped = Math.max(minDay, Math.min(maxDay, day));
  const ratio = (clamped - minDay) / (maxDay - minDay);
  return laneTop + ratio * (laneGap * (days.length - 1)) + 24;
}

function yToDate(y) {
  const centerY = y + noteH / 2;
  let best = days[0];
  let bestDist = Infinity;
  for (const day of days) {
    const laneY = laneTop + days.indexOf(day) * laneGap + 24 + noteH / 2;
    const dist = Math.abs(centerY - laneY);
    if (dist < bestDist) {
      best = day;
      bestDist = dist;
    }
  }
  return `${month}-${String(best).padStart(2, "0")}`;
}

function dateToDay(dateText) {
  if (!dateText) return days[1];
  const d = Number(dateText.slice(-2));
  return Number.isFinite(d) ? d : days[1];
}

function dateYForTask(t) {
  const dateText = t[state.dateMode] || t.targetAt || t.createdAt || "";
  return dayToY(dateToDay(dateText));
}

function render() {
  save();
  toggleLanesBtn.textContent = `日付レーン: ${state.showLanes ? "ON" : "OFF"}`;
  dateModeInput.value = state.dateMode;

  renderLanes();
  renderLinks();
  renderNotes();
  renderInspector();
  renderHistory();
}

function renderLanes() {
  lanesEl.innerHTML = "";
  if (!state.showLanes) return;

  days.forEach((day, i) => {
    const y = laneTop + i * laneGap;
    if (i === 0) {
      const band = document.createElement("div");
      band.className = "lane band";
      band.style.top = `${y}px`;
      lanesEl.appendChild(band);
    }

    const line = document.createElement("div");
    line.className = "laneLine";
    line.style.top = `${y}px`;
    lanesEl.appendChild(line);

    const label = document.createElement("div");
    label.className = "laneLabel";
    label.style.top = `${y + 3}px`;
    label.textContent = day;
    lanesEl.appendChild(label);
  });
}

function renderLinks() {
  links.innerHTML = "";
  links.setAttribute("width", 1600);
  links.setAttribute("height", 1000);

  for (const task of Object.values(state.tasks)) {
    if (!task.parentId || !state.tasks[task.parentId]) continue;
    const p = state.tasks[task.parentId];
    const x1 = p.x + noteW / 2;
    const y1 = p.y + noteH;
    const x2 = task.x + noteW / 2;
    const y2 = task.y;

    const midY = y1 + Math.max(20, (y2 - y1) * 0.35);
    const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#171717");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linecap", "round");
    links.appendChild(path);
  }

  if (connectDrag) {
    const p = state.tasks[connectDrag.parentId];
    const x1 = p.x + noteW / 2;
    const y1 = p.y + noteH;
    const x2 = connectDrag.x;
    const y2 = connectDrag.y;
    const midY = y1 + Math.max(20, (y2 - y1) * 0.35);
    const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#7357ff");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-dasharray", "8 8");
    path.setAttribute("stroke-linecap", "round");
    links.appendChild(path);
  }
}

function renderNotes() {
  notesEl.innerHTML = "";
  const visible = Object.values(state.tasks);

  for (const task of visible) {
    const el = document.createElement("div");
    el.className = `note ${task.status || "todo"} ${task.id === selectedId ? "selected" : ""}`;
    el.style.left = `${task.x}px`;
    el.style.top = `${task.y}px`;
    el.dataset.id = task.id;

    const text = document.createElement("div");
    text.className = "noteText";
    text.textContent = task.title;
    el.appendChild(text);

    const handle = document.createElement("div");
    handle.className = "handle";
    handle.title = "ドラッグして子タスクを作成";
    handle.textContent = "+";
    el.appendChild(handle);

    el.addEventListener("pointerdown", onNotePointerDown);
    el.addEventListener("dblclick", () => quickEdit(task.id));
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      snapshot();
      task.status = task.status === "done" ? "todo" : "done";
      task.completedAt = task.status === "done" ? todayISO() : "";
      record(`「${task.title}」を${task.status === "done" ? "完了" : "未着手"}に変更`);
      render();
    });

    handle.addEventListener("pointerdown", onHandlePointerDown);

    notesEl.appendChild(el);
  }
}

function renderInspector() {
  const t = selectedId ? state.tasks[selectedId] : null;
  if (!t) {
    inspector.classList.add("hidden");
    emptyInspector.classList.remove("hidden");
    return;
  }
  inspector.classList.remove("hidden");
  emptyInspector.classList.add("hidden");

  titleInput.value = t.title || "";
  createdInput.value = t.createdAt || "";
  targetInput.value = t.targetAt || "";
  completedInput.value = t.completedAt || "";
  statusInput.value = t.status || "todo";
  memoInput.value = t.memo || "";
}

function renderHistory() {
  historyEl.innerHTML = "";
  for (const item of state.history) {
    const el = document.createElement("div");
    el.className = "historyItem";
    el.innerHTML = `<strong>${escapeHTML(item.text)}</strong><br>${escapeHTML(item.at)}`;
    historyEl.appendChild(el);
  }
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function boardPoint(e) {
  const rect = board.getBoundingClientRect();
  return {
    x: e.clientX - rect.left + board.scrollLeft,
    y: e.clientY - rect.top + board.scrollTop
  };
}

function onNotePointerDown(e) {
  if (e.target.classList.contains("handle")) return;
  const id = e.currentTarget.dataset.id;
  selectedId = id;
  const t = state.tasks[id];
  const p = boardPoint(e);
  drag = {
    id,
    dx: p.x - t.x,
    dy: p.y - t.y,
    moved: false
  };
  e.currentTarget.setPointerCapture(e.pointerId);
  e.currentTarget.classList.add("dragging");
  board.classList.add("grabbing");
  renderInspector();
}

function onHandlePointerDown(e) {
  e.stopPropagation();
  const noteEl = e.currentTarget.closest(".note");
  const parentId = noteEl.dataset.id;
  selectedId = parentId;
  const p = boardPoint(e);
  connectDrag = {
    parentId,
    x: p.x,
    y: p.y
  };
  ghost.classList.remove("hidden");
  ghost.style.left = `${p.x - noteW / 2}px`;
  ghost.style.top = `${p.y - 20}px`;
  noteEl.setPointerCapture(e.pointerId);
  render();
}

window.addEventListener("pointermove", (e) => {
  if (drag) {
    const t = state.tasks[drag.id];
    const p = boardPoint(e);
    t.x = Math.max(95, p.x - drag.dx);
    t.y = Math.max(28, p.y - drag.dy);
    drag.moved = true;

    if (state.showLanes && Math.abs(t.y - dateYForTask(t)) < 46) {
      t.y = dateYForTask(t);
    }

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
    const gx = Math.max(95, p.x - noteW / 2);
    let gy = Math.max(28, p.y - 20);
    if (state.showLanes) {
      const snapDate = yToDate(gy);
      gy = dayToY(dateToDay(snapDate));
    }
    ghost.style.left = `${gx}px`;
    ghost.style.top = `${gy}px`;
    renderLinks();
  }
});

window.addEventListener("pointerup", (e) => {
  if (drag) {
    const t = state.tasks[drag.id];
    if (drag.moved) {
      snapshot();
      if (state.showLanes) {
        t[state.dateMode] = yToDate(t.y);
        t.y = dateYForTask(t);
      }
      record(`「${t.title}」を移動`);
    }
    drag = null;
    board.classList.remove("grabbing");
    render();
  }

  if (connectDrag) {
    const parent = state.tasks[connectDrag.parentId];
    const gx = parseFloat(ghost.style.left);
    const gy = parseFloat(ghost.style.top);
    const child = makeTask("新しいタスク", gx, gy, parent.id, state.showLanes ? yToDate(gy) : parent.targetAt);
    child.createdAt = todayISO();
    child[state.dateMode] = state.showLanes ? yToDate(gy) : child[state.dateMode];

    snapshot();
    state.tasks[child.id] = child;
    selectedId = child.id;
    record(`「${parent.title}」から子タスクを作成`);
    connectDrag = null;
    ghost.classList.add("hidden");
    render();
    setTimeout(() => quickEdit(child.id), 40);
  }

  notesEl.querySelectorAll(".dragging").forEach(el => el.classList.remove("dragging"));
});

function quickEdit(taskId) {
  const t = state.tasks[taskId];
  if (!t) return;
  const next = prompt("タスク名を入力", t.title);
  if (next === null) return;
  const trimmed = next.trim();
  if (!trimmed) return;
  snapshot();
  const before = t.title;
  t.title = trimmed;
  record(`「${before}」を「${t.title}」に変更`);
  selectedId = taskId;
  render();
}

function updateSelectedFromInspector() {
  const t = selectedId ? state.tasks[selectedId] : null;
  if (!t) return;
  snapshot();
  const oldTitle = t.title;
  t.title = titleInput.value || "無題";
  t.createdAt = createdInput.value;
  t.targetAt = targetInput.value;
  t.completedAt = completedInput.value;
  t.status = statusInput.value;
  t.memo = memoInput.value;

  if (state.showLanes) {
    t.y = dateYForTask(t);
  }

  record(`「${oldTitle}」の詳細を更新`);
  render();
}

[titleInput, createdInput, targetInput, completedInput, statusInput, memoInput].forEach(el => {
  el.addEventListener("change", updateSelectedFromInspector);
});

dateModeInput.addEventListener("change", () => {
  snapshot();
  state.dateMode = dateModeInput.value;
  if (state.showLanes) {
    for (const t of Object.values(state.tasks)) t.y = dateYForTask(t);
  }
  record(`表示日付を変更`);
  render();
});

addRootBtn.addEventListener("click", () => {
  snapshot();
  const t = makeTask("新しいルート", 560, dayToY(12), null, `${month}-12`);
  state.tasks[t.id] = t;
  selectedId = t.id;
  record("ルート付箋を作成");
  render();
  setTimeout(() => quickEdit(t.id), 40);
});

toggleLanesBtn.addEventListener("click", () => {
  snapshot();
  state.showLanes = !state.showLanes;
  record(`日付レーンを${state.showLanes ? "ON" : "OFF"}に変更`);
  render();
});

autoLayoutBtn.addEventListener("click", () => {
  snapshot();
  autoLayout();
  record("自動整列");
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
  if (!confirm("サンプル状態に戻しますか？")) return;
  snapshot();
  state = makeInitialState();
  selectedId = null;
  save();
  render();
});

function autoLayout() {
  const roots = Object.values(state.tasks).filter(t => !t.parentId);
  let cursor = 300;
  for (const root of roots) {
    const width = layoutSubtree(root.id, cursor, 0);
    cursor += width + 140;
  }
}

function layoutSubtree(taskId, left, depth) {
  const t = state.tasks[taskId];
  const children = getChildren(taskId);
  const childWidths = children.map(c => measureSubtree(c.id));
  const totalChildrenWidth = childWidths.reduce((a,b) => a + b, 0) + Math.max(0, children.length - 1) * 60;
  const ownWidth = noteW;
  const width = Math.max(ownWidth, totalChildrenWidth);

  if (children.length === 0) {
    t.x = left + (width - noteW) / 2;
  } else {
    let childLeft = left;
    children.forEach((child, i) => {
      const w = childWidths[i];
      layoutSubtree(child.id, childLeft, depth + 1);
      childLeft += w + 60;
    });
    const first = children[0];
    const last = children[children.length - 1];
    t.x = (state.tasks[first.id].x + state.tasks[last.id].x) / 2;
  }

  if (state.showLanes) {
    t.y = dateYForTask(t);
    // 同じレーンで親子が重なる場合だけ少し下げる
    const parent = t.parentId ? state.tasks[t.parentId] : null;
    if (parent && Math.abs(parent.y - t.y) < noteH + 20) {
      t.y = parent.y + noteH + 36;
    }
  } else {
    t.y = 82 + depth * 168;
  }

  return width;
}

function measureSubtree(taskId) {
  const children = getChildren(taskId);
  if (children.length === 0) return noteW;
  return Math.max(
    noteW,
    children.map(c => measureSubtree(c.id)).reduce((a,b) => a + b, 0) + (children.length - 1) * 60
  );
}

board.addEventListener("pointerdown", (e) => {
  if (e.target === board || e.target === notesEl || e.target === lanesEl) {
    selectedId = null;
    render();
  }
});

load();
render();
