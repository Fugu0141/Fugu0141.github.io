(function () {
  const app = window.StampRally;
  const config = app.config;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const stamp = app.getStampById(id);
  const result = app.addStamp(id);
  const progress = app.getProgress();

  app.setTitle(stamp ? stamp.title : app.getText('invalidStampTitle', 'Invalid stamp'));
  app.fillText('[data-logo]', config.logoText || 'STAMP RALLY');

  const badge = document.querySelector('[data-badge]');
  const icon = document.querySelector('[data-icon]');
  const title = document.querySelector('[data-stamp-title]');
  const message = document.querySelector('[data-message]');
  const already = document.querySelector('[data-already]');
  const autoRedirect = document.querySelector('[data-auto-redirect]');

  if (!result.valid || !stamp) {
    if (badge) badge.textContent = app.getText('invalidStampTitle', 'INVALID STAMP');
    if (icon) icon.textContent = '❓';
    if (title) title.innerHTML = app.getText('invalidStampTitle', 'INVALID STAMP');
    if (message) message.textContent = app.getText('invalidStampMessage', 'This stamp is not valid.');
  } else {
    const order = app.getStampsConfig().findIndex((item) => String(item.id) === String(stamp.id)) + 1;
    if (badge) badge.textContent = `${app.getText('getBadgePrefix', '// STAMP')} #${order} / ${progress.total}`;
    if (icon) icon.textContent = stamp.icon || '✓';
    if (title) title.innerHTML = `${app.getText('stampGetTitle', 'STAMP GET!').replace('GET', '<span>GET</span>')}`;
    if (message) message.textContent = stamp.message || '';
    if (already && result.already) already.style.display = 'block';
  }

  app.fillText('[data-progress-label]', app.getText('progressLabel', 'Progress'));

  const fill = document.querySelector('[data-fill]');
  if (fill) {
    window.setTimeout(() => {
      fill.style.width = `${progress.percent}%`;
    }, 180);
  }

  const grid = document.querySelector('[data-grid]');
  if (grid) {
    app.getStampsConfig().forEach((item) => {
      const dot = document.createElement('div');
      const itemId = String(item.id);
      dot.className = 'dot';

      if (result.valid && itemId === String(id)) {
        dot.classList.add('current');
        dot.textContent = item.icon || '✓';
      } else if (app.hasStamp(itemId)) {
        dot.classList.add('got');
        dot.textContent = item.icon || '✓';
      }

      grid.appendChild(dot);
    });
  }

  if (already) {
    already.textContent = app.getText('alreadyCollected', 'Already collected');
  }

  const button = document.querySelector('[data-stamp-book-button]');
  if (button) {
    button.href = app.getPage('stampBook', 'stamp.html');
    button.textContent = app.getText('viewStampBookButton', 'View stamp book');
  }

  if (app.isComplete() && result.valid) {
    if (autoRedirect) {
      autoRedirect.style.display = 'block';
      autoRedirect.textContent = app.getText('autoRedirectMessage', 'Redirecting to the complete page...');
    }
    window.setTimeout(() => {
      window.location.href = app.getPage('goal', 'goal.html');
    }, 1800);
  }
})();
