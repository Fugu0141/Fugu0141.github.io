(function () {
  const config = window.STAMP_RALLY_CONFIG || {};

  function getTheme() {
    return config.theme || {};
  }

  function applyTheme() {
    const theme = getTheme();
    const root = document.documentElement;
    const pairs = {
      primary: theme.primary,
      secondary: theme.secondary,
      success: theme.success,
      background: theme.background,
      text: theme.text,
      muted: theme.muted
    };

    Object.entries(pairs).forEach(([key, value]) => {
      if (value) root.style.setProperty(`--${key}`, value);
    });
  }

  function getStampsConfig() {
    return Array.isArray(config.stamps) ? config.stamps : [];
  }

  function getStampIds() {
    return getStampsConfig().map((stamp) => String(stamp.id));
  }

  function getStorageKey() {
    return config.storageKey || 'stamp_rally_stamps';
  }

  function normalizeStampList(value) {
    const validIds = new Set(getStampIds());
    const unique = [];

    if (!Array.isArray(value)) return unique;

    value.forEach((item) => {
      const id = String(item);
      if (validIds.has(id) && !unique.includes(id)) unique.push(id);
    });

    return unique;
  }

  function getCollectedStamps() {
    try {
      const raw = JSON.parse(localStorage.getItem(getStorageKey())) || [];
      return normalizeStampList(raw);
    } catch (error) {
      return [];
    }
  }

  function saveCollectedStamps(stamps) {
    localStorage.setItem(getStorageKey(), JSON.stringify(normalizeStampList(stamps)));
  }

  function addStamp(id) {
    const normalizedId = String(id);
    const stampIds = getStampIds();
    const stamps = getCollectedStamps();

    if (!stampIds.includes(normalizedId)) {
      return { valid: false, already: false, stamps };
    }

    const already = stamps.includes(normalizedId);
    if (!already) {
      stamps.push(normalizedId);
      saveCollectedStamps(stamps);
    }

    return { valid: true, already, stamps };
  }

  function hasStamp(id) {
    return getCollectedStamps().includes(String(id));
  }

  function isComplete() {
    return getCollectedStamps().length >= getStampsConfig().length && getStampsConfig().length > 0;
  }

  function getStampById(id) {
    return getStampsConfig().find((stamp) => String(stamp.id) === String(id)) || null;
  }

  function getText(key, fallback = '') {
    return (config.text && config.text[key] !== undefined) ? config.text[key] : fallback;
  }

  function getPage(key, fallback = '#') {
    return (config.pages && config.pages[key]) ? config.pages[key] : fallback;
  }

  function reset() {
    localStorage.removeItem(getStorageKey());
  }

  function getProgress() {
    const total = getStampsConfig().length;
    const count = getCollectedStamps().length;
    return {
      count,
      total,
      percent: total > 0 ? Math.round((count / total) * 100) : 0
    };
  }

  function stampUrl(id) {
    const base = getPage('stampGet', 'stamp-get.html');
    return `${base}?id=${encodeURIComponent(id)}`;
  }

  function setTitle(suffix) {
    const appName = config.appName || 'Stamp Rally';
    document.title = suffix ? `${suffix} | ${appName}` : appName;
  }

  function fillText(selector, value, html = false) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (html) el.innerHTML = value;
    else el.textContent = value;
  }

  window.StampRally = {
    config,
    applyTheme,
    getStampsConfig,
    getCollectedStamps,
    addStamp,
    hasStamp,
    isComplete,
    getStampById,
    getText,
    getPage,
    reset,
    getProgress,
    stampUrl,
    setTitle,
    fillText
  };

  applyTheme();
})();
