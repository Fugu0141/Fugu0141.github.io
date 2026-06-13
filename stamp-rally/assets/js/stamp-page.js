(function () {
  const app = window.StampRally;
  const config = app.config;
  const stampsConfig = app.getStampsConfig();
  const collected = app.getCollectedStamps();
  const progress = app.getProgress();

  app.setTitle(app.getText('stampBookTitle', 'Stamp Book'));
  app.fillText('[data-logo]', config.logoText || 'STAMP RALLY');
  app.fillText('[data-title]', app.getText('stampBookTitle', 'Stamp Book'));
  app.fillText('[data-lead]', app.getText('stampBookLead', ''), true);
  app.fillText('[data-count-label]', app.getText('currentCountLabel', 'Current stamps'));
  app.fillText('[data-grid-title]', app.getText('collectionTitle', '// STAMP COLLECTION'));

  const count = document.querySelector('[data-count]');
  if (count) count.innerHTML = `${progress.count}<span>/${progress.total}</span>`;

  const fill = document.querySelector('[data-fill]');
  if (fill) {
    window.setTimeout(() => {
      fill.style.width = `${progress.percent}%`;
    }, 180);
  }

  const messages = app.getText('progressMessages', []);
  const message = Array.isArray(messages)
    ? messages[Math.min(progress.count, messages.length - 1)]
    : app.getText('emptyMessage', '');
  app.fillText('[data-count-text]', message, true);

  const grid = document.querySelector('[data-grid]');
  if (grid) {
    stampsConfig.forEach((stamp, index) => {
      const got = collected.includes(String(stamp.id));
      const item = document.createElement('div');
      item.className = 'stamp-item';

      const circle = document.createElement('div');
      circle.className = `stamp-circle${got ? ' got' : ''}`;
      circle.textContent = got ? (stamp.icon || '✓') : '';

      const label = document.createElement('div');
      label.className = `stamp-label${got ? ' got' : ''}`;
      label.textContent = `#${index + 1}`;

      item.append(circle, label);
      grid.appendChild(item);
    });
  }

  const msgCard = document.querySelector('[data-message-card]');
  const msgEmoji = document.querySelector('[data-message-emoji]');
  const msgText = document.querySelector('[data-message-text]');
  const goalButton = document.querySelector('[data-goal-button]');
  const homeButton = document.querySelector('[data-home-button]');
  const resetButton = document.querySelector('[data-reset-button]');

  if (app.isComplete()) {
    msgCard?.classList.add('complete');
    if (msgEmoji) msgEmoji.textContent = app.getText('completeStatusEmoji', '🎊');
    if (msgText) msgText.innerHTML = app.getText('completeStatusText', 'Complete!');
    if (goalButton) goalButton.style.display = 'block';
  } else {
    if (msgEmoji) msgEmoji.textContent = app.getText('statusEmoji', '🗺️');
    if (msgText) msgText.innerHTML = app.getText('statusText', 'Collect stamps!');
  }

  if (homeButton) {
    homeButton.href = app.getPage('home', 'index.html');
    homeButton.textContent = app.getText('homeButton', 'Home');
  }

  if (goalButton) {
    goalButton.href = app.getPage('goal', 'goal.html');
    goalButton.textContent = app.getText('goalButton', 'Complete page');
  }

  if (resetButton) {
    resetButton.textContent = app.getText('resetButton', 'Reset progress');
    resetButton.addEventListener('click', () => {
      if (window.confirm(app.getText('resetConfirm', 'Reset progress?'))) {
        app.reset();
        window.location.reload();
      }
    });
  }
})();
