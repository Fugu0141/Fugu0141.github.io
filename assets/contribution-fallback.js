/* Robust contribution loader for branch previews and environments where relative fetches are blocked. */
(() => {
  const REPO = 'Fugu0141/Fugu0141.github.io';
  const BRANCH_CANDIDATES = ['redesign-playful-portfolio', 'main'];

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-contribution-calendar]');
    if (!root) return;

    // Give the primary loader a moment. If it has already rendered, do nothing.
    window.setTimeout(async () => {
      if (root.querySelector('.contribution-day')) return;
      const data = await fetchContributionData();
      if (!data) {
        root.innerHTML = '<p class="contribution-error">GitHubのContribution情報を読み込めませんでした。</p>';
        return;
      }
      renderFallbackCalendar(data, root);
    }, 450);
  });

  async function fetchContributionData() {
    const sources = ['assets/contributions.json'];
    for (const branch of BRANCH_CANDIDATES) {
      sources.push(`https://raw.githubusercontent.com/${REPO}/${branch}/assets/contributions.json`);
    }

    for (const source of sources) {
      try {
        const response = await fetch(source, { cache: 'no-store' });
        if (!response.ok) continue;
        const data = await response.json();
        if (Array.isArray(data.days) && data.days.length) return data;
      } catch (_) {}
    }
    return null;
  }

  function renderFallbackCalendar(data, root) {
    const total = document.querySelector('[data-contribution-total]');
    if (total) total.textContent = Number(data.totalContributions || 0).toLocaleString('en-US');

    const entries = new Map(data.days.map(day => [day.date, day]));
    const from = utc(data.from || data.days[0].date);
    const to = utc(data.to || data.days[data.days.length - 1].date);
    if (!from || !to) return;

    const start = new Date(from);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const end = new Date(to);
    end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));
    const dayCount = Math.round((end - start) / 86400000) + 1;
    const weekCount = Math.ceil(dayCount / 7);
    root.style.setProperty('--week-count', weekCount);

    const months = document.createElement('div');
    months.className = 'contribution-months';
    months.style.setProperty('--week-count', weekCount);
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
    let shown = -1;
    for (let week = 0; week < weekCount; week++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + week * 7);
      if (d.getUTCMonth() !== shown && (d.getUTCDate() <= 7 || week === 0)) {
        const label = document.createElement('span');
        label.textContent = fmt.format(d);
        label.style.gridColumn = String(week + 1);
        months.appendChild(label);
        shown = d.getUTCMonth();
      }
    }

    const weekdays = document.createElement('div');
    weekdays.className = 'contribution-weekdays';
    weekdays.innerHTML = '<span>Mon</span><span>Wed</span><span>Fri</span>';

    const grid = document.createElement('div');
    grid.className = 'contribution-days';
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const date = d.toISOString().slice(0, 10);
      const item = entries.get(date);
      const cell = document.createElement('span');
      cell.className = 'contribution-day';
      if (!item) {
        cell.classList.add('is-empty');
      } else {
        cell.dataset.level = String(level(item.level, item.count));
        cell.title = `${date}: ${item.count} contribution${item.count === 1 ? '' : 's'}`;
      }
      grid.appendChild(cell);
    }
    root.replaceChildren(months, weekdays, grid);
  }

  function utc(value) {
    const d = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function level(raw, count) {
    const map = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
    if (typeof raw === 'string' && raw in map) return map[raw];
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.max(0, Math.min(4, n));
    if (!count) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 9) return 3;
    return 4;
  }
})();
