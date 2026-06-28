(() => {
  const collapsedDoneDatesKey = "quest-sticky-collapsed-done-dates-v2";
  const compactHGap = 132;
  const compactVGap = 92;
  const originalSetSelected = typeof setSelected === "function" ? setSelected : null;

  let lastBoardPoint = null;

  function updateLastBoardPoint(event) {
    if (!event || typeof event.clientX !== "number") return;
    const rect = board.getBoundingClientRect();
    lastBoardPoint = {
      x: event.clientX - rect.left + board.scrollLeft,
      y: event.clientY - rect.top + board.scrollTop
    };
  }

  window.addEventListener("pointermove", updateLastBoardPoint, true);
  window.addEventListener("pointerup", updateLastBoardPoint, true);

  function readCollapsedDates() {
    try {
      return new Set(JSON.parse(localStorage.getItem(collapsedDoneDatesKey) || "[]"));
    } catch {
      return new Set();
    }
  }

  function writeCollapsedDates(dates) {
    localStorage.setItem(collapsedDoneDatesKey, JSON.stringify([...dates]));
  }

  function addDaysISO(date, days = 1) {
    const d = new Date(`${normalizeDate(date)}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function tasksOnDate(date) {
    const normalized = normalizeDate(date);
    return getTasks().filter(task => normalizeDate(task.targetAt) === normalized);
  }

  function isDateComplete(date) {
    const tasks = tasksOnDate(date);
    return tasks.length > 0 && tasks.every(task => task.status === "done");
  }

  function isDateCollapsed(date) {
    const normalized = normalizeDate(date);
    if (normalized === todayISO()) return false;
    return isDateComplete(normalized) && readCollapsedDates().has(normalized);
  }

  function isTaskCollapsed(task) {
    return !!task && isDateCollapsed(task.targetAt);
  }

  function setDateCollapsed(date, collapsed) {
    const normalized = normalizeDate(date);
    const dates = readCollapsedDates();
    if (collapsed) dates.add(normalized);
    else dates.delete(normalized);
    writeCollapsedDates(dates);
  }

  function autoFoldCompleteDate(date) {
    const normalized = normalizeDate(date);
    if (isDateComplete(normalized)) setDateCollapsed(normalized, true);
    else setDateCollapsed(normalized, false);
  }

  function toggleDoneDate(date) {
    const normalized = normalizeDate(date);
    if (!isDateComplete(normalized)) return;
    setDateCollapsed(normalized, !isDateCollapsed(normalized));
    snapshot();
    branchLayout();
    requestRender();
  }

  function dateSpan(date) {
    if (isVerticalMode()) return isDateCollapsed(date) ? compactVGap : vDateGap;
    return isDateCollapsed(date) ? compactHGap : hDateGap;
  }

  function dateToneClass(date) {
    const normalized = normalizeDate(date);
    if (isDateCollapsed(normalized)) return "collapsedDoneLane";
    if (normalized === todayISO()) return "todayLane";
    return normalized < todayISO() ? "pastLane" : "futureLane";
  }

  function taskToneClass(task) {
    if (task.status === "done") return "doneTask";
    const date = normalizeDate(task.targetAt);
    if (date < todayISO()) return "overdueTask";
    if (date === todayISO()) return "todayTask";
    return "futureTask";
  }

  function collectRelatedIds(taskId) {
    const related = new Set();
    if (!taskId || !state.tasks[taskId]) return related;

    let current = state.tasks[taskId];
    while (current) {
      related.add(current.id);
      current = current.parentId ? state.tasks[current.parentId] : null;
    }

    const walk = id => {
      for (const child of getChildren(id)) {
        related.add(child.id);
        walk(child.id);
      }
    };
    walk(taskId);
    return related;
  }

  function findVisibleParent(task) {
    let parent = task?.parentId ? state.tasks[task.parentId] : null;
    while (parent && isTaskCollapsed(parent)) {
      parent = parent.parentId ? state.tasks[parent.parentId] : null;
    }
    return parent;
  }

  function lineHitTolerance() {
    return isVerticalMode()
      ? Math.max(32, noteH * 0.38)
      : Math.max(44, noteW * 0.20);
  }

  function nextDateAfterLine(lanes, index) {
    if (index <= 0) return lanes[0] || todayISO();
    return addDaysISO(lanes[index - 1], 1);
  }

  function shouldUsePointerAnchor() {
    return !!lastBoardPoint && (typeof drag !== "undefined" && drag || typeof connectDrag !== "undefined" && connectDrag);
  }

  function getAnchorMain(noteMainStart) {
    if (shouldUsePointerAnchor()) return isVerticalMode() ? lastBoardPoint.y : lastBoardPoint.x;
    return noteMainStart + (isVerticalMode() ? noteH / 2 : noteW / 2);
  }

  hDateLineX = function(date) {
    const target = normalizeDate(date);
    let x = hAxisLeft;
    for (const laneDate of getLaneDates()) {
      if (laneDate === target) return x;
      x += dateSpan(laneDate);
    }
    return x;
  };

  hDateToX = function(date) {
    return hDateLineX(date) + (isDateCollapsed(date) ? 24 : 34);
  };

  hEndLineX = function() {
    let x = hAxisLeft;
    for (const laneDate of getLaneDates()) x += dateSpan(laneDate);
    return x;
  };

  vDateLineY = function(date) {
    const target = normalizeDate(date);
    let y = vAxisTop;
    for (const laneDate of getLaneDates()) {
      if (laneDate === target) return y;
      y += dateSpan(laneDate);
    }
    return y;
  };

  vDateToY = function(date) {
    return vDateLineY(date) + (isDateCollapsed(date) ? 20 : vTaskTopOffset);
  };

  vEndLineY = function() {
    let y = vAxisTop;
    for (const laneDate of getLaneDates()) y += dateSpan(laneDate);
    return y;
  };

  hitTestDateArea = function(noteMainStart) {
    if (!state.showLanes) return { kind: "none", date: null };

    const lanes = getLaneDates();
    if (!lanes.length) return { kind: "blank", date: todayISO() };

    const tolerance = lineHitTolerance();
    const anchor = getAnchorMain(noteMainStart);

    if (isVerticalMode()) {
      let nearestLineIndex = 0;
      let nearestLineDistance = Infinity;

      lanes.forEach((date, index) => {
        const dist = Math.abs(anchor - vDateLineY(date));
        if (dist < nearestLineDistance) {
          nearestLineDistance = dist;
          nearestLineIndex = index;
        }
      });

      if (nearestLineDistance <= tolerance) {
        return { kind: "line", date: nextDateAfterLine(lanes, nearestLineIndex) };
      }

      for (const date of lanes) {
        const top = vDateLineY(date);
        const bottom = top + dateSpan(date);
        if (anchor >= top && anchor < bottom) {
          const span = dateSpan(date);
          const forwardZone = isDateCollapsed(date)
            ? Math.max(38, span * 0.72)
            : Math.min(span - 34, Math.max(56, span * 0.58));
          if (anchor >= bottom - forwardZone) {
            return { kind: "blank", date: addDaysISO(date, 1) };
          }
          return { kind: "lane", date };
        }
      }

      if (anchor >= vEndLineY()) return { kind: "blank", date: addDaysISO(lanes.at(-1), 1) };
      return { kind: "lane", date: lanes[0] };
    }

    let nearestLineIndex = 0;
    let nearestLineDistance = Infinity;

    lanes.forEach((date, index) => {
      const dist = Math.abs(anchor - hDateLineX(date));
      if (dist < nearestLineDistance) {
        nearestLineDistance = dist;
        nearestLineIndex = index;
      }
    });

    if (nearestLineDistance <= tolerance) {
      return { kind: "line", date: nextDateAfterLine(lanes, nearestLineIndex) };
    }

    for (const date of lanes) {
      const left = hDateLineX(date);
      const right = left + dateSpan(date);
      if (anchor >= left && anchor < right) {
        const span = dateSpan(date);
        const forwardZone = isDateCollapsed(date)
          ? Math.max(58, span * 0.74)
          : Math.min(span - 46, Math.max(110, span * 0.60));
        if (anchor >= right - forwardZone) {
          return { kind: "blank", date: addDaysISO(date, 1) };
        }
        return { kind: "lane", date };
      }
    }

    if (anchor >= hEndLineX()) return { kind: "blank", date: addDaysISO(lanes.at(-1), 1) };
    return { kind: "lane", date: lanes[0] };
  };

  renderLanes = function() {
    lanesEl.innerHTML = "";
    if (dateHud) dateHud.innerHTML = "";
    if (!state.showLanes) return;

    const laneFragment = document.createDocumentFragment();
    const labelFragment = document.createDocumentFragment();
    const lanes = getLaneDates();
    const activeDate = activeTodayBandDate();

    lanes.forEach((date, index) => {
      const prev = lanes[index - 1];
      const isMonthStart = index === 0 || !sameMonth(prev, date);
      const isTodayBand = date === activeDate;
      const isTodayLine = date === todayISO();
      const collapsed = isDateCollapsed(date);
      const complete = isDateComplete(date);
      const count = tasksOnDate(date).length;
      const tone = dateToneClass(date);
      const parts = formatDateParts(date);
      const span = dateSpan(date);

      const band = document.createElement("div");
      band.className = `laneBand ${tone} ${collapsed ? "collapsedLane" : ""} ${isTodayBand ? "todayBand" : ""} ${hotLaneDate === date ? "highlight" : ""}`;

      const line = document.createElement("div");
      line.className = `laneLine ${tone} ${collapsed ? "collapsedLane" : ""} ${isTodayLine ? "todayLine" : ""} ${hotLineDate === date ? "hot" : ""}`;

      const label = document.createElement("div");
      label.className = `laneLabel ${tone} ${complete ? "completeDate" : ""} ${collapsed ? "collapsedDate" : ""} ${isTodayLine ? "todayLabel" : ""} ${isMonthStart ? "monthStart" : ""}`;
      label.innerHTML = collapsed
        ? `<div class="laneMonthTitle">${parts.monthName}</div><div class="laneDay">${parts.day}</div><div class="laneStatus">完了 ${count}</div>`
        : isMonthStart
          ? `<div class="laneMonthTitle">${parts.monthName}</div><div class="laneDay">${parts.day}</div>`
          : `<div class="laneDay">${parts.day}</div><div class="laneMonth">${parts.monthName}</div>`;

      if (complete) {
        label.title = collapsed ? "クリックで完了タスクを展開" : "クリックで完了タスクを折り畳み";
        label.addEventListener("click", event => {
          event.stopPropagation();
          toggleDoneDate(date);
        });
      }

      if (isVerticalMode()) {
        const y = vDateLineY(date);
        band.style.top = `${y}px`;
        band.style.height = `${span}px`;
        line.style.top = `${y}px`;
        label.style.top = `${y + 8}px`;
        label.style.left = "10px";
      } else {
        const x = hDateLineX(date);
        band.style.left = `${x}px`;
        band.style.width = `${span}px`;
        line.style.left = `${x}px`;
        label.style.left = `${x + 12}px`;
        label.style.top = "12px";
      }

      laneFragment.appendChild(band);
      laneFragment.appendChild(line);
      labelFragment.appendChild(label);
    });

    const endLine = document.createElement("div");
    endLine.className = "laneLine laneEndLine";
    if (isVerticalMode()) endLine.style.top = `${vEndLineY()}px`;
    else endLine.style.left = `${hEndLineX()}px`;
    laneFragment.appendChild(endLine);

    lanesEl.appendChild(laneFragment);
    if (dateHud) dateHud.appendChild(labelFragment);
    syncStickyDateLabels();
  };

  renderLinks = function() {
    previewPath = null;
    links.innerHTML = "";
    links.setAttribute("width", String(contentWidth));
    links.setAttribute("height", String(contentHeight));

    const fragment = document.createDocumentFragment();
    const related = collectRelatedIds(selectedId);

    for (const task of getTasks()) {
      if (isTaskCollapsed(task)) continue;

      const visibleParent = findVisibleParent(task);
      if (!visibleParent) continue;

      const path = makeBranchPath(visibleParent, task, "#191919", 4, "");
      path.classList.add("linkPath");

      const compressed = visibleParent.id !== task.parentId;
      if (compressed) path.classList.add("compressedLink");

      if (selectedId && related.has(visibleParent.id) && related.has(task.id)) {
        path.classList.add("focusedLink");
      } else if (compressed || isDateCollapsed(visibleParent.targetAt) || isDateCollapsed(task.targetAt)) {
        path.classList.add("collapsedLink");
      } else if (selectedId) {
        path.classList.add("mutedLink");
      } else if (task.status === "done" && visibleParent.status === "done") {
        path.classList.add("doneLink");
      } else {
        path.classList.add("defaultLink");
      }

      fragment.appendChild(path);
    }

    links.appendChild(fragment);
  };

  renderNotes = function() {
    notesEl.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (const task of getTasks()) {
      const collapsed = isDateCollapsed(task.targetAt);
      const el = document.createElement("div");
      el.className = `note ${taskToneClass(task)} ${collapsed ? "collapsedTask" : ""} ${task.status === "done" ? "done" : ""} ${task.id === selectedId ? "selected" : ""}`;
      el.dataset.id = task.id;
      setObjectPos(el, task.x, task.y);

      const text = document.createElement("div");
      text.className = "noteText";
      text.textContent = task.title;
      el.appendChild(text);

      const deleteControl = document.createElement("div");
      deleteControl.className = "deleteBtn";
      deleteControl.textContent = "×";
      deleteControl.title = "削除";
      deleteControl.addEventListener("pointerdown", event => event.stopPropagation());
      deleteControl.addEventListener("click", event => {
        event.stopPropagation();
        deleteTask(task.id);
      });
      el.appendChild(deleteControl);

      const done = document.createElement("div");
      done.className = "doneBtn";
      done.textContent = task.status === "done" ? "✓" : "○";
      done.title = "完了切替";
      done.addEventListener("pointerdown", event => event.stopPropagation());
      done.addEventListener("click", event => {
        event.stopPropagation();
        snapshot();
        const oldDate = normalizeDate(task.targetAt);
        task.status = task.status === "done" ? "todo" : "done";
        autoFoldCompleteDate(oldDate);
        branchLayout();
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
  };

  if (originalSetSelected) {
    setSelected = function(id) {
      originalSetSelected(id);
      renderLinks();
    };
  }

  branchLayout();
  render();
})();
