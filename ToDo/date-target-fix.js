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
      ? Math.max(30, noteH * 0.34)
      : Math.max(44, noteW * 0.20);
  }

  function remember(hit, center) {
    recentHit = hit;
    recentHitAt = Date.now();
    try {
      window[recentHitKey] = { ...hit, center, at: recentHitAt };
    } catch (_) {}

    const hud = document.getElementById("dateDebugHud");
    if (hud && (drag || connectDrag)) {
      hud.textContent = `date hit\nkind:${hit.kind}\ndate:${hit.date || "-"}\nmode:${hit.mode || "-"}\ncenter:${Math.round(center)}`;
      hud.style.display = "block";
    }
  }

  function linePos(date) {
    return isVerticalMode() ? vDateLineY(date) : hDateLineX(date);
  }

  function endLinePos() {
    return isVerticalMode() ? vEndLineY() : hEndLineX();
  }

  function spanFor(date, index, lanes) {
    const left = linePos(date);
    const right = index + 1 < lanes.length ? linePos(lanes[index + 1]) : endLinePos();
    return { left, right };
  }

  function hitFromCenter(center) {
    if (!state.showLanes) return { kind: "none", date: null, mode: "free" };

    const lanes = getLaneDates();
    if (!lanes.length) return { kind: "blank", date: todayISO(), mode: "ask" };

    const tol = lineTolerance();
    const endLine = endLinePos();

    if (Math.abs(center - endLine) <= tol || center > endLine) {
      return { kind: "blank", date: addDaysISO(lanes.at(-1), 1), mode: "ask" };
    }

    let nearestIndex = 0;
    let nearestDistance = Infinity;
    lanes.forEach((date, index) => {
      const dist = Math.abs(center - linePos(date));
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = index;
      }
    });

    // Restore the old feel: putting the block roughly ON the date divider means boundary mode.
    // But do not treat any overlap as a line; that was too aggressive and caused false positives.
    if (nearestDistance <= tol) {
      if (nearestIndex <= 0) return { kind: "line", date: lanes[0], mode: "ask" };
      return { kind: "line", date: addDaysISO(lanes[nearestIndex - 1], 1), mode: "ask" };
    }

    for (let i = 0; i < lanes.length; i++) {
      const { left, right } = spanFor(lanes[i], i, lanes);
      if (center >= left && center < right) {
        const width = right - left;
        const forwardZone = Math.min(width - 36, Math.max(72, width * 0.34));
        if (center >= right - forwardZone) {
          return { kind: "blank", date: addDaysISO(lanes[i], 1), mode: "ask" };
        }
        return { kind: "lane", date: lanes[i], mode: "snap" };
      }
    }

    if (center > endLine) return { kind: "blank", date: addDaysISO(lanes.at(-1), 1), mode: "ask" };
    return { kind: "lane", date: lanes[0], mode: "snap" };
  }

  hitTestDateArea = function(noteMainStart) {
    const size = isVerticalMode() ? noteH : noteW;
    const center = noteMainStart + size / 2;
    const hit = hitFromCenter(center);
    remember(hit, center);
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
