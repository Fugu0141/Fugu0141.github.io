/* =========================================================
   Fugu Portfolio - language routing / localized chrome

   Japanese pages live at the site root and English pages live under /en/.
   The URL is the source of truth for language selection so OGP crawlers can
   receive language-specific static metadata from each page.
   ========================================================= */

(() => {
  const language = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'ja';
  const currentPage = document.body.dataset.page || 'home';

  const PAGE_FILES = {
    home: '',
    projects: 'projects.html',
    principles: 'principles.html',
    links: 'links.html'
  };

  const copy = {
    ja: {
      nav: ['トップ', 'つくったもの', '大切にしていること', '各種リンク'],
      navLabel: 'メインナビゲーション',
      brandLabel: 'ふぐ / Fugu ホーム',
      supportLabel: 'サポート・メッセージ',
      marshmallow: 'マシュマロ',
      marshmallowLabel: 'マシュマロを送る',
      sponsorsLabel: 'GitHub Sponsorsを開く',
      menuOpen: 'メニューを開く',
      menuClose: 'メニューを閉じる',
      languageLabel: '言語を選択',
      footer: 'つくる・学ぶ・共有する'
    },
    en: {
      nav: ['Home', 'Projects', 'Principles', 'Links'],
      navLabel: 'Main navigation',
      brandLabel: 'Fugu home',
      supportLabel: 'Support and messages',
      marshmallow: 'Marshmallow',
      marshmallowLabel: 'Send a message on Marshmallow',
      sponsorsLabel: 'Open GitHub Sponsors',
      menuOpen: 'Open menu',
      menuClose: 'Close menu',
      languageLabel: 'Choose language',
      footer: 'Create · Learn · Share'
    }
  }[language];

  function localizedPath(page, targetLanguage) {
    const file = PAGE_FILES[page] ?? '';
    if (targetLanguage === 'en') return file ? `/en/${file}` : '/en/';
    return file ? `/${file}` : '/';
  }

  function syncMenuLabel(button) {
    if (!button) return;
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-label', open ? copy.menuClose : copy.menuOpen);
  }

  function localizeChrome() {
    const header = document.querySelector('[data-portfolio-header]');
    if (!header) return;

    const brand = header.querySelector('.brand');
    if (brand) {
      brand.href = localizedPath('home', language);
      brand.setAttribute('aria-label', copy.brandLabel);
    }

    const nav = header.querySelector('.portfolio-nav');
    if (nav) {
      nav.setAttribute('aria-label', copy.navLabel);
      [...nav.querySelectorAll('a')].forEach((link, index) => {
        const page = ['home', 'projects', 'principles', 'links'][index];
        if (!page) return;
        link.href = localizedPath(page, language);
        link.textContent = copy.nav[index];
      });
    }

    const support = header.querySelector('.header-support');
    if (support) support.setAttribute('aria-label', copy.supportLabel);

    const marshmallow = header.querySelector('.header-support-marshmallow');
    if (marshmallow) {
      marshmallow.setAttribute('aria-label', copy.marshmallowLabel);
      const label = marshmallow.querySelector('span:last-child');
      if (label) label.textContent = copy.marshmallow;
    }

    const sponsors = header.querySelector('.header-support-sponsors');
    if (sponsors) sponsors.setAttribute('aria-label', copy.sponsorsLabel);

    const button = header.querySelector('.menu-toggle');
    syncMenuLabel(button);
    if (button) {
      new MutationObserver(() => syncMenuLabel(button)).observe(button, {
        attributes: true,
        attributeFilter: ['aria-expanded']
      });
    }

    const headerInner = header.querySelector('.header-inner');
    if (headerInner && !headerInner.querySelector('.portfolio-language-switch')) {
      const switcher = document.createElement('nav');
      switcher.className = 'portfolio-language-switch';
      switcher.setAttribute('aria-label', copy.languageLabel);
      switcher.innerHTML = `
        <a href="${localizedPath(currentPage, 'ja')}" lang="ja" hreflang="ja"${language === 'ja' ? ' aria-current="true"' : ''}>日本語</a>
        <a href="${localizedPath(currentPage, 'en')}" lang="en" hreflang="en"${language === 'en' ? ' aria-current="true"' : ''}>EN</a>`;

      const menuToggle = headerInner.querySelector('.menu-toggle');
      headerInner.insertBefore(switcher, menuToggle || null);
    }

    const footerMark = document.querySelector('[data-portfolio-footer] .footer-mark');
    if (footerMark) footerMark.textContent = copy.footer;

    try {
      localStorage.setItem('fugu-language', language);
    } catch (_) {
      // Storage may be unavailable in privacy-restricted contexts.
    }
  }

  document.addEventListener('DOMContentLoaded', localizeChrome);
})();
