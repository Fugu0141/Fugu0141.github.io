(() => {
  const previousSyncStickyDateLabels = typeof syncStickyDateLabels === "function" ? syncStickyDateLabels : null;
  const originalSetSelected = typeof setSelected === "function" ? setSelected : null;

  function lineHitTolerance() {
    return isVerticalMode()
      ? Math.max(34, noteH * 0.42)
      : Math.max(50, noteW * 0.23);
  }

  function dateToneClass(date) {
    const today = todayISO();
    const normalized = normalizeDate(date);
    if (normalized === today) return "todayLane";
    return normalized < today ? "pastLane" : "futureLane";
  }

  function taskToneClass(task) {
    if (task.status === "done") return "doneTask";
    const date = normalizeDate(task.targetAt);
    const today = todayISO();
    if (date < today) return "overdueTask";
    if (date === today) return "todayTask";
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

  hitTestDateArea = function(noteMainStart) {
    if (!state.showLanes) return { kind: "none", date: null };

    const lanes = getLaneDates();
    if (!lanes.length) return { kind: "blank", date: todayISO() };

    const tolerance = lineHitTolerance();

    if (isVerticalMode()) {
      const anchorY = noteMainStart + noteH / 2;
      let nearestLine = null;
      let nearestLineDistance = Infinity;

      for (const date of lanes) {
        const dist = Math.abs(anchorY - vDateLineY(date));
        if (dist < nearestLineDistance) {
          nearestLineDistance = dist;
          nearestLine = date;
        }
      }

      if (nearestLineDistance <= tolerance) return { kind: "line", date: nearestLine };

      for (let i = 0; i < lanes.length; i++) {
        const top = vAxisTop + i * vDateGap;
        const bottom = vAxisTop + (i + 1) * vDateGap;
        if (anchorY >= top && anchorY < bottom) return { kind: "lane", date: lanes[i] };
      }

      if (anchorY >= vEndLineY()) return { kind: "blank", date: lanes.at(-1) };
      return { kind: "lane", date: lanes[0] };
    }

    const anchorX = noteMainStart + noteW / 2;
    let nearestLine = null;
    let nearestLineDistance = Infinity;

    for (const date of lanes) {
      const dist = Math.abs(anchorX - hDateLineX(date));
      if (dist < nearestLineDistance) {
        nearestLineDistance = dist;
        nearestLine = date;
      }
    }

    if (nearestLineDistance <= tolerance) return { kind: "line", date: nearestLine };

    for (let i = 0; i < lanes.length; i++) {
      const left = hAxisLeft + i * hDateGap;
      const right = hAxisLeft + (i + 1) * hDateGap;
      if (anchorX >= left && anchorX < right) return { kind: "lane", date: lanes[i] };
    }

    if (anchorX >= hEndLineX()) return { kind: "blank", date: lanes.at(-1) };
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
      const tone = dateToneClass(date);
      const parts = formatDateParts(date);

      const band = document.createElement("div");
      band.className = `laneBand ${tone} ${isTodayBand ? "todayBand" : ""} ${hotLaneDate === date ? "highlight" : ""}`;

      const line = document.createElement("div");
      line.className = `laneLine ${tone} ${isTodayLine ? "todayLine" : ""} ${hotLineDate === date ? "hot" : ""}`;

      const label = document.createElement("div");
      label.className = `laneLabel ${tone} ${isTodayLine ? "todayLabel" : ""} ${isMonthStart ? "monthStart" : ""}`;
      label.innerHTML = isMonthStart
        ? `<div class="laneMonthTitle">${parts.monthName}</div><div class="laneDay">${parts.day}</div>`
        : `<div class="laneDay">${parts.day}</div><div class="laneMonth">${parts.monthName}</div>`;

      if (isVerticalMode()) {
        const y = vAxisTop + index * vDateGap;
        band.style.top = `${y}px`;
        band.style.height = `${vDateGap}px`;
        line.style.top = `${y}px`;
        label.style.top = `${y + 8}px`;
        label.style.left = "10px";
      } else {
        const x = hAxisLeft + index * hDateGap;
        band.style.left = `${x}px`;
        band.style.width = `${hDateGap}px`;
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
      if (!task.parentId || !state.tasks[task.parentId]) continue;
      const parent = state.tasks[task.parentId];
      const path = makeBranchPath(parent, task, "#191919", 4, "");
      path.classList.add("linkPath");

      if (selectedId && related.has(parent.id) && related.has(task.id)) {
        path.classList.add("focusedLink");
      } else if (selectedId) {
        path.classList.add("mutedLink");
      } else if (task.status === "done" && parent.status === "done") {
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
      const el = document.createElement("div");
      el.className = `note ${taskToneClass(task)} ${task.status === "done" ? "done" : ""} ${task.id === selectedId ? "selected" : ""}`;
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
  };

  if (originalSetSelected) {
    setSelected = function(id) {
      originalSetSelected(id);
      renderLinks();
    };
  }

  let lastDateHudTransform = "";
  let stickyDateQueued = false;

  syncStickyDateLabels = function() {
    if (!dateHud) return;
    const next = isVerticalMode()
      ? `translate3d(${board.scrollLeft}px, 0, 0)`
      : `translate3d(0, ${board.scrollTop}px, 0)`;

    if (next !== lastDateHudTransform) {
      dateHud.style.transform = next;
      lastDateHudTransform = next;
    }
  };

  function requestStickyDateSync() {
    if (stickyDateQueued) return;
    stickyDateQueued = true;
    requestAnimationFrame(() => {
      stickyDateQueued = false;
      syncStickyDateLabels();
    });
  }

  if (previousSyncStickyDateLabels) {
    board.removeEventListener("scroll", previousSyncStickyDateLabels);
  }
  board.addEventListener("scroll", requestStickyDateSync, { passive: true });

  render();
})();
