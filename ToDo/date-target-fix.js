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

  function tolerance() {
    return isVerticalMode()
      ? Math.max(24, noteH * 0.3)
      : Math.max(32, noteW * 0.15);
  }

  function remember(hit, start, end) {
    recentHit = hit;
    recentHitAt = Date.now();
    try {
      window[recentHitKey] = { ...hit, start, end, at: recentHitAt };
    } catch (_) {}

    const hud = document.getElementById("dateDebugHud");
    if (hud && (drag || connectDrag)) {
      hud.textContent = `date hit\nkind:${hit.kind}\ndate:${hit.date || "-"}\nmode:${hit.mode || "-"}\nstart:${Math.round(start)}\nend:${Math.round(end)}`;
      hud.style.display = "block";
    }
  }

  function lanePositions() {
    const lanes = getLaneDates();
    if (isVerticalMode()) {
      return lanes.map(date => ({ date, pos: vDateLineY(date) }));
    }
    return lanes.map(date => ({ date, pos: hDateLineX(date) }));
  }

  function endLinePosition() {
    return isVerticalMode() ? vEndLineY() : hEndLineX();
  }

  function hitFromSpan(start) {
    if (!state.showLanes) return { kind: "none", date: null, mode: "free" };

    const lanes = getLaneDates();
    if (!lanes.length) return { kind: "blank", date: todayISO(), mode: "ask" };

    const noteSize = isVerticalMode() ? noteH : noteW;
    const end = start + noteSize;
    const lead = start + Math.min(24, noteSize * 0.18);
    const center = start + noteSize / 2;
    const tol = tolerance();
    const lines = lanePositions();
    const lastLine = endLinePosition();

    // Most important: if a date boundary line is inside the ghost/note body,
    // treat it as a boundary drop. This restores the old "put it on the line" feel.
    // Ignore the first visible line unless the lead edge itself is near it, because
    // normal notes in the first lane may visually cover the first line.
    let bestInside = null;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.pos >= start - 2 && line.pos <= end + 2) {
        const dist = Math.abs(line.pos - center);
        if (!bestInside || dist < bestInside.dist) bestInside = { index: i, dist };
      }
    }
    if (bestInside) {
      return { kind: "line", date: addDaysISO(lanes[bestInside.index - 1], 1), mode: "ask" };
    }

    // End line inside the body means "after the last visible date".
    if (lastLine >= start - 2 && lastLine <= end + 2) {
      return { kind: "blank", date: addDaysISO(lanes.at(-1), 1), mode: "ask" };
    }

    // Fallback: old leading-edge style hit test.
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    lines.forEach((line, index) => {
      const dist = Math.abs(lead - line.pos);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = index;
      }
    });

    if (nearestDistance <= tol) {
      if (nearestIndex <= 0) return { kind: "line", date: lanes[0], mode: "ask" };
      return { kind: "line", date: addDaysISO(lanes[nearestIndex - 1], 1), mode: "ask" };
    }

    if (lead >= lastLine - tol) return { kind: "blank", date: addDaysISO(lanes.at(-1), 1), mode: "ask" };

    for (let i = 0; i < lanes.length; i++) {
      const left = lines[i].pos;
      const right = i + 1 < lines.length ? lines[i + 1].pos : lastLine;
      if (lead >= left && lead < right) {
        const width = right - left;
        const forwardZone = Math.min(width - 24, Math.max(56, width * 0.34));
        if (lead >= right - forwardZone) {
          return { kind: "blank", date: addDaysISO(lanes[i], 1), mode: "ask" };
        }
        return { kind: "lane", date: lanes[i], mode: "snap" };
      }
    }

    if (lead > lastLine) return { kind: "blank", date: addDaysISO(lanes.at(-1), 1), mode: "ask" };
    return { kind: "lane", date: lanes[0], mode: "snap" };
  }

  hitTestDateArea = function(noteMainStart) {
    const hit = hitFromSpan(noteMainStart);
    const size = isVerticalMode() ? noteH : noteW;
    remember(hit, noteMainStart, noteMainStart + size);
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
      const fresh = hit && hit.date && hit.mode === "ask" && Date.now() - (recentHitAt || hit.at || 0) < 1500;
      if (next.parentId && fresh && normalizeDate(next.targetAt) === todayISO()) {
        next.targetAt = hit.date;
      }
      return originalOpenCreateTaskModal(next);
    };
  }
})();
