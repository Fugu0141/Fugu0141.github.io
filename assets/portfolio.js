/* =========================================================
   Fugu Portfolio - shared behavior

   1. HEADER / FOOTER
   2. CONTRIBUTIONS
   3. IMAGE GALLERIES
   4. HELPERS

   後付けの refine / fallback スクリプトは使わず、
   共通UIの処理はこのファイルだけで完結させます。
   ========================================================= */

const REPO = 'Fugu0141/Fugu0141.github.io';
const CONTENT_REF = new URLSearchParams(location.search).get('content-ref') || 'main';

const NAV_ITEMS = [
  ['home', 'index.html', 'トップ'],
  ['projects', 'projects.html', 'つくったもの'],
  ['principles', 'principles.html', '大切にしていること'],
  ['links', 'links.html', '各種リンク']
];

document.addEventListener('DOMContentLoaded', () => {
  renderChrome();
  loadContributions();
  loadImageGalleries();
});

/* ---------------------------------------------------------
   1. HEADER / FOOTER
   --------------------------------------------------------- */

function renderChrome() {
  const current = document.body.dataset.page || 'home';
  const header = document.querySelector('[data-portfolio-header]');

  if (header) {
    header.className = 'portfolio-header';
    header.innerHTML = `
      <div class="shell header-inner">
        <a class="brand" href="index.html" aria-label="ふぐ / Fugu ホーム">
          <span class="brand-ja">ふぐ</span><span class="brand-slash" aria-hidden="true">/</span><span class="brand-en">Fugu</span>
        </a>

        <nav class="portfolio-nav" aria-label="メインナビゲーション">
          ${NAV_ITEMS.map(([id, href, label]) =>
            `<a href="${href}"${id === current ? ' aria-current="page"' : ''}>${label}</a>`
          ).join('')}
        </nav>

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
        </div>

        <button class="menu-toggle" type="button" aria-label="メニューを開く" aria-expanded="false">
          <span class="menu-toggle-lines" aria-hidden="true"></span>
        </button>
      </div>`;

    setupMobileMenu(header);
  }

  const footer = document.querySelector('[data-portfolio-footer]');
  if (footer) {
    footer.className = 'portfolio-footer';
    footer.innerHTML = `
      <div class="shell footer-inner">
        <span>© 2026 Fugu</span>
        <span class="footer-mark">Create · Learn · Share</span>
      </div>`;
  }
}

function setupMobileMenu(header) {
  const headerInner = header.querySelector('.header-inner');
  const nav = header.querySelector('.portfolio-nav');
  const support = header.querySelector('.header-support');
  const button = header.querySelector('.menu-toggle');
  if (!headerInner || !nav || !button) return;

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

/* ---------------------------------------------------------
   2. CONTRIBUTIONS
   --------------------------------------------------------- */

async function loadContributions() {
  const calendar = document.querySelector('[data-contribution-calendar]');
  if (!calendar) return;

  try {
    const data = await fetchContributionData();
    if (!data) throw new Error('Could not load contribution data');
    renderContributionCalendar(data, calendar);
  } catch (error) {
    console.warn('[Fugu Portfolio] Contribution data could not be loaded.', error);
    calendar.innerHTML = '<p class="contribution-error">GitHubのContribution情報を読み込めませんでした。</p>';
  }
}

async function fetchContributionData() {
  const sources = [
    'assets/contributions.json',
    `https://raw.githubusercontent.com/${REPO}/${CONTENT_REF}/assets/contributions.json`,
    `https://raw.githubusercontent.com/${REPO}/main/assets/contributions.json`
  ];

  for (const source of [...new Set(sources)]) {
    try {
      const response = await fetch(source, { cache: 'no-store' });
      if (!response.ok) continue;
      const data = await response.json();
      if (Array.isArray(data.days) && data.days.length) return data;
    } catch (_) {
      // 次の取得元を試す
    }
  }

  return null;
}

function renderContributionCalendar(data, root) {
  const total = document.querySelector('[data-contribution-total]');
  if (total) {
    total.textContent = Number(data.totalContributions || 0).toLocaleString('en-US');
  }

  const daysByDate = new Map((data.days || []).map(day => [day.date, day]));
  const from = parseUTCDate(data.from || data.days?.[0]?.date);
  const to = parseUTCDate(data.to || data.days?.[data.days.length - 1]?.date);
  if (!from || !to) throw new Error('Invalid contribution date range');

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

  const monthFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC'
  });

  let lastMonth = -1;
  for (let week = 0; week < weekCount; week += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + week * 7);

    const month = d.getUTCMonth();
    const next = new Date(d);
    next.setUTCDate(d.getUTCDate() + 6);

    if (
      month !== lastMonth &&
      (d.getUTCDate() <= 7 || next.getUTCMonth() !== month || week === 0)
    ) {
      const labelDate = next.getUTCMonth() !== month ? next : d;
      const label = document.createElement('span');
      label.textContent = monthFormat.format(labelDate);
      label.style.gridColumn = String(week + 1);
      months.appendChild(label);
      lastMonth = labelDate.getUTCMonth();
    }
  }

  const weekdays = document.createElement('div');
  weekdays.className = 'contribution-weekdays';
  weekdays.innerHTML = '<span>Mon</span><span>Wed</span><span>Fri</span>';

  const grid = document.createElement('div');
  grid.className = 'contribution-days';

  for (let i = 0; i < dayCount; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);

    const date = toISODate(d);
    const entry = daysByDate.get(date);
    const cell = document.createElement('span');
    cell.className = 'contribution-day';

    if (!entry) {
      cell.classList.add('is-empty');
    } else {
      const level = normalizeContributionLevel(entry.level, entry.count);
      cell.dataset.level = String(level);
      cell.title = `${date}: ${entry.count} contribution${entry.count === 1 ? '' : 's'}`;
      cell.setAttribute('aria-label', cell.title);
    }

    grid.appendChild(cell);
  }

  root.replaceChildren(months, weekdays, grid);
}

function normalizeContributionLevel(level, count) {
  if (typeof level === 'string') {
    const map = {
      NONE: 0,
      FIRST_QUARTILE: 1,
      SECOND_QUARTILE: 2,
      THIRD_QUARTILE: 3,
      FOURTH_QUARTILE: 4
    };
    if (level in map) return map[level];
  }

  const numeric = Number(level);
  if (Number.isFinite(numeric)) return Math.max(0, Math.min(4, numeric));
  if (!count) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

/* ---------------------------------------------------------
   3. IMAGE GALLERIES
   --------------------------------------------------------- */

async function loadImageGalleries() {
  const galleries = [...document.querySelectorAll('[data-image-gallery]')];
  if (!galleries.length) return;

  if (location.protocol === 'file:') {
    galleries.forEach(renderDirectFileNotice);
    return;
  }

  const localPreview = isLocalHttpPreview();
  let manifest = null;

  try {
    const response = await fetch('assets/content-manifest.json', { cache: 'no-store' });
    if (response.ok) manifest = await response.json();
  } catch (_) {
    manifest = null;
  }

  await Promise.all(galleries.map(async gallery => {
    const source = gallery.dataset.source;
    const limit = Number(gallery.dataset.limit || 0);
    let items = [];

    if (localPreview) {
      items = await fetchLocalDirectoryItems(source);
    }

    if (!items.length) {
      items = manifestItems(manifest, source);
    }

    if (!items.length && !localPreview) {
      items = await fetchDirectoryItems(source);
    }

    items.sort((a, b) =>
      (a.order ?? 9999) - (b.order ?? 9999) ||
      a.name.localeCompare(b.name, 'ja')
    );

    if (limit > 0) items = items.slice(0, limit);

    if (!items.length && localPreview) {
      renderLocalServerNotice(gallery, source);
      return;
    }

    renderImageGallery(gallery, items, source);
  }));
}

function isLocalHttpPreview() {
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return false;
  const host = location.hostname.toLowerCase();
  return host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1';
}

async function fetchLocalDirectoryItems(source) {
  try {
    const directoryUrl = new URL(`content/${source}/`, location.href);
    const response = await fetch(directoryUrl, { cache: 'no-store' });
    if (!response.ok) return [];

    const html = await response.text();
    const documentFragment = new DOMParser().parseFromString(html, 'text/html');
    const files = [];

    for (const anchor of documentFragment.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href');
      if (!href || href === '../' || href === './') continue;

      let fileUrl;
      try {
        fileUrl = new URL(href, directoryUrl);
      } catch (_) {
        continue;
      }

      let name = fileUrl.pathname.split('/').filter(Boolean).pop() || '';
      name = decodeRepeated(name);
      if (!/\.png$/i.test(name)) continue;

      files.push({
        ...parseImageFilename(name),
        name,
        src: fileUrl.href
      });
    }

    return files;
  } catch (_) {
    return [];
  }
}

function manifestItems(manifest, source) {
  if (!manifest) return [];

  const key = source === 'home-promos' ? 'homePromos' : 'projects';
  const list = Array.isArray(manifest[key]) ? manifest[key] : [];

  return list.map(item => ({
    ...item,
    src: encodeRepositoryPath(item.path)
  }));
}

async function fetchDirectoryItems(source) {
  try {
    const path = `content/${source}`;
    const api = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${encodeURIComponent(CONTENT_REF)}`;
    const response = await fetch(api, {
      headers: { Accept: 'application/vnd.github+json' }
    });

    if (!response.ok) return [];

    const files = await response.json();
    if (!Array.isArray(files)) return [];

    return files
      .filter(file => file.type === 'file' && /\.png$/i.test(file.name))
      .map(file => ({
        ...parseImageFilename(file.name),
        name: file.name,
        src: file.download_url
      }));
  } catch (_) {
    return [];
  }
}

function parseImageFilename(name) {
  const stem = decodeRepeated(String(name || '').replace(/\.png$/i, ''));
  const parts = stem.split('__');

  let order = 9999;
  let title = '';
  let url = '';

  if (/^\d+$/.test(parts[0] || '')) {
    order = Number(parts.shift());
  }

  for (let i = 0; i < parts.length; i += 1) {
    const candidate = decodeRepeated(parts.slice(i).join('__'));
    if (isHttpUrl(candidate)) {
      url = candidate;
      title = decodeRepeated(parts.slice(0, i).join('__'));
      break;
    }
  }

  if (!url && isHttpUrl(stem)) {
    url = stem;
  }

  if (!title) {
    title = titleFromUrl(url) || decodeRepeated(parts[0] || '') || 'Project';
  }

  return { order, title, url };
}

function renderImageGallery(root, items, source) {
  if (!items.length) {
    const directory = source === 'home-promos'
      ? 'content/home-promos'
      : 'content/projects';

    root.innerHTML = `
      <div class="gallery-empty">
        ${escapeHtml(directory)} にPNGを追加すると、ここへ自動で表示されます。
      </div>`;
    return;
  }

  root.innerHTML = items.map(item => {
    const image = `
      <img src="${escapeAttribute(item.src)}"
           alt="${escapeAttribute(item.title)}"
           loading="lazy">`;

    const caption = `
      <div class="image-card-caption">
        <span>${escapeHtml(item.title)}</span>
        ${item.url ? '<span class="image-card-arrow" aria-hidden="true">↗</span>' : ''}
      </div>`;

    if (item.url) {
      return `
        <a class="image-card"
           href="${escapeAttribute(item.url)}"
           target="_blank"
           rel="noopener noreferrer">
          ${image}${caption}
        </a>`;
    }

    return `<div class="image-card">${image}${caption}</div>`;
  }).join('');
}

function renderDirectFileNotice(root) {
  root.innerHTML = `
    <div class="gallery-empty local-preview-note">
      <strong>ローカル画像の自動読込にはローカルサーバーが必要です。</strong>
      <span>
        HTMLを直接ダブルクリックした file:// 表示では、ブラウザの安全制限により
        フォルダ内のPNG一覧を取得できません。
        リポジトリ直下で <code>preview-local.ps1</code> を実行してください。
      </span>
    </div>`;
}

function renderLocalServerNotice(root, source) {
  const directory = source === 'home-promos'
    ? 'content/home-promos'
    : 'content/projects';

  root.innerHTML = `
    <div class="gallery-empty local-preview-note">
      <strong>${escapeHtml(directory)} にPNGが見つかりませんでした。</strong>
      <span>
        ファイルを追加したあとページを再読み込みしてください。
        ローカルプレビューではGitHubへのPushやmanifest更新は不要です。
      </span>
    </div>`;
}

/* ---------------------------------------------------------
   4. HELPERS
   --------------------------------------------------------- */

function parseUTCDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function decodeRepeated(value) {
  let result = String(value || '');

  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(result);
      if (decoded === result) break;
      result = decoded;
    } catch (_) {
      break;
    }
  }

  return result;
}

function encodeRepositoryPath(value) {
  return String(value || '')
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function titleFromUrl(value) {
  if (!value) return '';

  try {
    const url = new URL(value);
    const path = url.pathname.split('/').filter(Boolean).pop();
    return path
      ? decodeRepeated(path).replace(/[-_]+/g, ' ')
      : url.hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
