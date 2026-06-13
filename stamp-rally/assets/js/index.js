(function () {
  const app = window.StampRally;
  const config = app.config;

  app.setTitle();
  app.fillText('[data-logo]', config.logoText || 'STAMP RALLY');
  app.fillText('[data-title]', app.getText('homeTitle', config.appName || 'Stamp Rally'));
  app.fillText('[data-lead]', app.getText('homeLead', ''), true);

  const start = document.querySelector('[data-start]');
  if (start) {
    start.href = app.getPage('stampBook', 'stamp.html');
    start.textContent = app.getText('startButton', 'Open stamp book');
  }

  app.fillText('[data-sample-title]', app.getText('sampleLinksTitle', 'Test links'));
  app.fillText('[data-sample-description]', app.getText('sampleLinksDescription', ''), true);

  const links = document.querySelector('[data-test-links]');
  if (links) {
    app.getStampsConfig().forEach((stamp) => {
      const a = document.createElement('a');
      a.className = 'test-link';
      a.href = app.stampUrl(stamp.id);
      a.textContent = `${stamp.icon || '●'} ${stamp.title || `Stamp ${stamp.id}`}  →  ${a.getAttribute('href')}`;
      links.appendChild(a);
    });
  }
})();
