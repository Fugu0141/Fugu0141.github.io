/* =========================================================
   Portfolio content manifest generator

   content/home-promos と content/projects のPNGを読み取り、
   assets/content-manifest.json を生成します。

   ファイル名の形式:
   - URL.png
   - 01__URL.png
   - 01__表示名__URL.png
   ========================================================= */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function decodeRepeated(value) {
  let result = String(value || '');

  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(result);
      if (decoded === result) break;
      result = decoded;
    } catch {
      break;
    }
  }

  return result;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function titleFromUrl(value) {
  if (!value) return '';

  try {
    const url = new URL(value);
    const last = url.pathname.split('/').filter(Boolean).pop();
    return last
      ? decodeRepeated(last).replace(/[-_]+/g, ' ')
      : url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function parseName(name) {
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
    if (!isHttpUrl(candidate)) continue;

    url = candidate;
    title = decodeRepeated(parts.slice(0, i).join('__'));
    break;
  }

  if (!url && isHttpUrl(stem)) {
    url = stem;
  }

  if (!title) {
    title = titleFromUrl(url) || decodeRepeated(parts[0] || '') || 'Project';
  }

  return { order, title, url };
}

function scan(relativeDir) {
  const absolute = path.join(root, relativeDir);
  if (!fs.existsSync(absolute)) return [];

  return fs.readdirSync(absolute, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.png$/i.test(entry.name))
    .map(entry => ({
      ...parseName(entry.name),
      name: entry.name,
      path: `${relativeDir}/${entry.name}`.replace(/\\/g, '/')
    }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ja'));
}

const output = {
  generatedAt: new Date().toISOString(),
  homePromos: scan('content/home-promos'),
  projects: scan('content/projects')
};

const outputPath = path.join(root, 'assets', 'content-manifest.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

console.log(`Updated ${path.relative(root, outputPath)}`);
