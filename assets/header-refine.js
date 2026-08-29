document.addEventListener('DOMContentLoaded', () => {
  const ensureStylesheet = (href, marker) => {
    if (document.querySelector(`link[${marker}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(marker, '');
    document.head.appendChild(link);
  };

  ensureStylesheet('assets/header-support.css', 'data-header-support-styles');
  ensureStylesheet('assets/mobile-refine.css', 'data-mobile-refine-styles');

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
    ['principles', 'principles.html', '大切にしていること'],
    ['links', 'links.html', '各種リンク']
  ];

  nav.innerHTML = items.map(([id, href, label]) =>
    `<a href="${href}"${id === current ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('');

  const headerInner = nav.closest('.header-inner');
  if (!headerInner) return;

  if (!headerInner.querySelector('.header-support')) {
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

  if (!headerInner.querySelector('.menu-toggle')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-toggle';
    button.setAttribute('aria-label', 'メニューを開く');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span class="menu-toggle-lines" aria-hidden="true"></span>';
    headerInner.appendChild(button);

    const closeMenu = () => {
      headerInner.classList.remove('is-menu-open');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'メニューを開く');
    };

    button.addEventListener('click', () => {
      const open = !headerInner.classList.contains('is-menu-open');
      headerInner.classList.toggle('is-menu-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    });

    nav.addEventListener('click', event => {
      if (event.target.closest('a')) closeMenu();
    });

    const support = headerInner.querySelector('.header-support');
    support?.addEventListener('click', event => {
      if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }
});
