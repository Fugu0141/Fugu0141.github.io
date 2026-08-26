document.addEventListener('DOMContentLoaded', () => {
  const supportStyles = document.createElement('link');
  supportStyles.rel = 'stylesheet';
  supportStyles.href = 'assets/header-support.css';
  supportStyles.dataset.headerSupportStyles = '';
  if (!document.querySelector('link[data-header-support-styles]')) {
    document.head.appendChild(supportStyles);
  }

  const brand = document.querySelector('.brand');
  if (brand) {
    brand.innerHTML = '<span class="brand-ja">ふぐ</span><span class="brand-slash" aria-hidden="true">/</span><span class="brand-en">Fugu</span>';
  }

  const nav = document.querySelector('.portfolio-nav');
  if (!nav) return;

  const current = document.body.dataset.page || 'home';
  const items = [
    ['home', 'index.html', 'トップ'],
    ['projects', 'projects.html', 'つくったもの'],
    ['principles', 'principles.html', '考えていること'],
    ['links', 'links.html', '各種リンク']
  ];

  nav.innerHTML = items.map(([id, href, label]) =>
    `<a href="${href}"${id === current ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('');

  const headerInner = nav.closest('.header-inner');
  if (headerInner && !headerInner.querySelector('.header-support')) {
    headerInner.insertAdjacentHTML('beforeend', `
      <div class="header-support" aria-label="サポート・メッセージ">
        <a class="header-support-link header-support-marshmallow"
           href="https://marshmallow-qa.com/rnpduurjd5fxjbe?t=aog5q5&utm_medium=twitter&utm_source=promotion"
           target="_blank" rel="noopener noreferrer" aria-label="マシュマロを送る">
          <span class="header-support-mark" aria-hidden="true">✉</span><span>マシュマロ</span>
        </a>
        <a class="header-support-link header-support-sponsors"
           href="https://github.com/sponsors/Fugu0141"
           target="_blank" rel="noopener noreferrer" aria-label="GitHub Sponsorsを開く">
          <span class="header-support-mark" aria-hidden="true">♡</span><span>Sponsors</span>
        </a>
      </div>`);
  }
});
