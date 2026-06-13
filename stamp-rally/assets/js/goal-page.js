(function () {
  const app = window.StampRally;
  const config = app.config;
  const complete = app.isComplete();

  app.setTitle(complete ? app.getText('goalTitle', 'Complete') : app.getText('incompleteTitle', 'Incomplete'));
  app.fillText('[data-logo]', config.logoText || 'STAMP RALLY');

  const trophy = document.querySelector('[data-trophy]');
  const title = document.querySelector('[data-title]');
  const lead = document.querySelector('[data-lead]');
  const prize = document.querySelector('[data-prize]');
  const row = document.querySelector('[data-stamp-row]');
  const confetti = document.querySelector('[data-confetti]');
  const button = document.querySelector('[data-button]');

  if (!complete) {
    if (trophy) trophy.textContent = '🔒';
    if (title) title.textContent = app.getText('incompleteTitle', 'Not complete yet');
    if (lead) lead.textContent = app.getText('incompleteMessage', 'Collect all stamps to unlock this page.');
    if (prize) prize.style.display = 'none';
    if (button) {
      button.href = app.getPage('stampBook', 'stamp.html');
      button.textContent = app.getText('backToStampBookButton', 'Back to stamp book');
    }
    return;
  }

  if (trophy) trophy.textContent = '🏆';
  if (title) title.textContent = app.getText('goalTitle', 'COMPLETE!');
  if (lead) lead.textContent = app.getText('goalLead', 'Congratulations!');

  app.fillText('[data-prize-title]', app.getText('prizeTitle', 'PRIZE'));
  app.fillText('[data-prize-content]', app.getText('prizeContent', 'Show this page at the reception.'), true);
  app.fillText('[data-prize-note]', app.getText('prizeNote', ''), true);

  if (button) {
    button.href = app.getPage('home', 'index.html');
    button.textContent = app.getText('homeButton', 'Home');
  }

  if (row) {
    app.getStampsConfig().forEach((stamp, index) => {
      const dot = document.createElement('div');
      dot.className = 'stamp-dot';
      dot.textContent = stamp.icon || '✓';
      dot.style.animationDelay = `${index * 0.05}s`;
      row.appendChild(dot);
    });
  }

  if (confetti) {
    const colors = [
      getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#0284c7',
      getComputedStyle(document.documentElement).getPropertyValue('--secondary') || '#7c3aed',
      '#f59e0b', '#22c55e', '#ef4444', '#ec4899'
    ];

    for (let i = 0; i < 60; i += 1) {
      const el = document.createElement('span');
      el.style.left = `${Math.random() * 100}vw`;
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDuration = `${Math.random() * 3 + 2}s`;
      el.style.animationDelay = `${Math.random() * 3}s`;
      el.style.width = `${Math.random() * 8 + 6}px`;
      el.style.height = `${Math.random() * 10 + 8}px`;
      confetti.appendChild(el);
    }
  }
})();
