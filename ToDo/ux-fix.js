(() => {
  const previousSyncStickyDateLabels = typeof syncStickyDateLabels === "function" ? syncStickyDateLabels : null;

  function lineHitTolerance() {
    return isVerticalMode()
      ? Math.max(44, noteH * 0.55)
      : Math.max(66, noteW * 0.30);
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
      const parts = formatDateParts(date);

      const band = document.createElement("div");
      band.className = `laneBand ${isTodayBand ? "todayBand" : ""} ${hotLaneDate === date ? "highlight" : ""}`;

      const line = document.createElement("div");
      line.className = `laneLine ${isTodayLine ? "todayLine" : ""} ${hotLineDate === date ? "hot" : ""}`;

      const label = document.createElement("div");
      label.className = `laneLabel ${isTodayLine ? "todayLabel" : ""} ${isMonthStart ? "monthStart" : ""}`;
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
