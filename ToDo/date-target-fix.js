(() => {
  const recentHitKey = "questStickyRecentDateHit";
  const originalOpenCreateTaskModal = typeof openCreateTaskModal === "function" ? openCreateTaskModal : null;

  let recentHit = null;
  let recentHitAt = 0;

  function addDaysISO(date, days = 1) {
    const d = new Date(`${normalizeDate(date)}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function lineTolerance() {
    return isVerticalMode()
      ? Math.max(16, noteH * 0.18)
      : Math.max(28, noteW * 0.13);
  }

  function remember(hit, anchor) {
    recentHit = hit;
    recentHitAt = Date.now();
    try {
      window[recentHitKey] = { ...hit, anchor, at: recentHitAt };
    } catch (_) {}

    const hud = document.getElementById("dateDebugHud");
    if (hud && (drag || connectDrag)) {
      hud.textContent = `date hit\nkind:${hit.kind}\ndate:${hit.date || "-"}\nmode:${hit.mode || "-"}\nanchor:${Math.round(anchor)}`;
      hud.style.display = "block";
    }
  }

  function linePos(date) {
    return isVerticalMode() ? vDateLineY(date) : hDateLineX(date);
  }

  function endLinePos() {
    return isVerticalMode() ? vEndLineY() : hEndLineX();
  }

  function buildIntervals() {
    const lanes = getLaneDates();
    const lines = lanes.map(date => linePos(date));
    const endLine = endLinePos();
    return { lanes, lines, endLine };
  }

  function dateForBoundary(lanes, boundaryIndex) {
    if (boundaryIndex <= 0) return lanes[0] || todayISO();
    return addDaysISO(lanes[boundaryIndex - 1], 1);
  }

  function hitFromAnchor(anchor) {
    if (!state.showLanes) return { kind: "none", date: null, mode: "free" };

    const { lanes, lines, endLine } = buildIntervals();
    if (!lanes.length) return { kind: "blank", date: todayISO(), mode: "ask" };

    const tol = lineTolerance();

    // 1. Exact boundary zone. Only a narrow zone around the actual divider is line mode.
    // This prevents the mobile area between two dividers from becoming line/blank accidentally.
    for (let i = 0; i < lines.length; i++) {
      if (Math.abs(anchor - lines[i]) <= tol) {
        return { kind: "line", date: dateForBoundary(lanes, i), mode: "ask" };
      }
    }

    // 2. Last boundary / outside the final lane.
    if (Math.abs(anchor - endLine) <= tol || anchor > endLine) {
      return { kind: "blank", date: addDaysISO(lanes.at(-1), 1), mode: "ask" };
    }

    // 3. Area between two date dividers is always that lane's date.
    // Do not create an inner forward/blank zone inside the lane.
    for (let i = 0; i < lanes.length; i++) {
      const start = lines[i];
      const end = i + 1 < lines.length ? lines[i + 1] : endLine;
      if (anchor > start + tol && anchor < end - tol) {
        return { kind: "lane", date: lanes[i], mode: "snap" };
      }
    }

    // 4. Gap just before a boundary that was not caught by tolerance still belongs to the lane.
    for (let i = 0; i < lanes.length; i++) {
      const start = lines[i];
      const end = i + 1 < lines.length ? lines[i + 1] : endLine;
      if (anchor >= start && anchor < end) {
        return { kind: "lane", date: lanes[i], mode: "snap" };
      }
    }

    if (anchor <= lines[0]) return { kind: "lane", date: lanes[0], mode: "snap" };
    return { kind: "blank", date: addDaysISO(lanes.at(-1), 1), mode: "ask" };
  }

  hitTestDateArea = function(noteMainStart) {
    const size = isVerticalMode() ? noteH : noteW;
    const anchor = noteMainStart + size / 2;
    const hit = hitFromAnchor(anchor);
    remember(hit, anchor);
    return hit;
  };

  getDateForPointer = function(event) {
    const point = boardPoint(event);
    const start = isVerticalMode() ? point.y - noteH / 2 : point.x - noteW / 2;
    const hit = hitTestDateArea(start);
    return hit.date || todayISO();
  };

  if (originalOpenCreateTaskModal) {
    openCreateTaskModal = function(options = {}) {
      const next = { ...options };
      const hit = recentHit || window[recentHitKey];
      const at = recentHitAt || hit?.at || 0;
      const fresh = hit && hit.date && hit.mode === "ask" && Date.now() - at < 1500;
      if (next.parentId && fresh && normalizeDate(next.targetAt) === todayISO()) {
        next.targetAt = hit.date;
      }
      return originalOpenCreateTaskModal(next);
    };
  }
})();
