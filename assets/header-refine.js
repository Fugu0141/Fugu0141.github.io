document.addEventListener('DOMContentLoaded', () => {
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
});
