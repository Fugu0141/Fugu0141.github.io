/* Gallery link behavior shared by home promos and project cards.
 * - The whole card opens the URL encoded in the PNG file name.
 * - The ↗ icon is shown only when a valid URL exists.
 * - Supports both ordered and lightweight file-name formats.
 */

window.parseImageFilename = function parseImageFilenameRefined(name) {
  const stem = String(name || '').replace(/\.png$/i, '');
  const parts = stem.split('__');
  let order = 9999;
  let title = '';
  let url = '';

  if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
    // 01__Title__https%3A%2F%2Fexample.com.png
    order = Number(parts[0]);
    title = safeDecode(parts[1]);
    url = safeDecode(parts.slice(2).join('__'));
  } else if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
    // 01__https%3A%2F%2Fexample.com.png
    order = Number(parts[0]);
    url = safeDecode(parts.slice(1).join('__'));
  } else if (parts.length >= 2) {
    // Title__https%3A%2F%2Fexample.com.png
    const candidateUrl = safeDecode(parts.slice(1).join('__'));
    if (isHttpUrl(candidateUrl)) {
      title = safeDecode(parts[0]);
      url = candidateUrl;
    } else {
      url = safeDecode(stem);
    }
  } else {
    // https%3A%2F%2Fexample.com.png
    url = safeDecode(stem);
  }

  if (!isHttpUrl(url)) url = '';
  if (!title) title = titleFromUrl(url) || safeDecode(parts[0]) || 'Project';

  return { order, title, url };
};

window.renderImageGallery = function renderImageGalleryRefined(root, items, source) {
  if (!items.length) {
    const directory = source === 'home-promos' ? 'content/home-promos' : 'content/projects';
    root.innerHTML = `<div class="gallery-empty">${escapeHtml(directory)} にPNGを追加すると、ここへ自動で表示されます。</div>`;
    return;
  }

  root.innerHTML = items.map(item => {
    const hasLink = isHttpUrl(item.url);
    const image = `<img src="${escapeAttribute(item.src)}" alt="${escapeAttribute(item.title)}" loading="lazy">`;
    const arrow = hasLink ? '<span class="image-card-arrow" aria-hidden="true">↗</span>' : '';
    const caption = `<div class="image-card-caption"><span>${escapeHtml(item.title)}</span>${arrow}</div>`;

    if (hasLink) {
      return `<a class="image-card" href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttribute(item.title)}を開く">${image}${caption}</a>`;
    }

    return `<div class="image-card">${image}${caption}</div>`;
  }).join('');
};
