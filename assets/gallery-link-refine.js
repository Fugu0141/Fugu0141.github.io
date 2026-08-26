/* Keep image-card behavior consistent after portfolio.js renders the galleries.
 * The URL is derived from the PNG file name, so this works for both the home
 * promo gallery and the projects gallery without depending on manifest fields.
 */
(() => {
  const decodeRepeated = (value) => {
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
  };

  const isHttpUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const urlFromFilename = (filename) => {
    const stem = decodeRepeated(String(filename || '').replace(/\.png$/i, ''));
    const parts = stem.split('__');
    const start = /^\d+$/.test(parts[0] || '') ? 1 : 0;

    // Supported examples:
    // 01__Cherry__https%3A%2F%2Fgithub.com%2F...png
    // Cherry__https%3A%2F%2Fgithub.com%2F...png
    // https%3A%2F%2Fgithub.com%2F...png
    for (let i = start; i < parts.length; i += 1) {
      const candidate = decodeRepeated(parts.slice(i).join('__'));
      if (isHttpUrl(candidate)) return candidate;
    }

    return isHttpUrl(stem) ? stem : '';
  };

  const filenameFromImage = (image) => {
    try {
      const url = new URL(image.currentSrc || image.src, location.href);
      return url.pathname.split('/').filter(Boolean).pop() || '';
    } catch (_) {
      return '';
    }
  };

  const refineCards = (gallery) => {
    gallery.querySelectorAll('.image-card').forEach((card) => {
      const image = card.querySelector('img');
      if (!image) return;

      const url = urlFromFilename(filenameFromImage(image));
      const arrow = card.querySelector('.image-card-arrow');

      if (!url) {
        if (arrow) arrow.remove();
        return;
      }

      if (card.tagName === 'A') {
        card.href = url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        return;
      }

      const link = document.createElement('a');
      link.className = card.className;
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `${card.textContent.trim() || '制作物'}を開く`);
      link.innerHTML = card.innerHTML;
      card.replaceWith(link);
    });
  };

  const attach = () => {
    document.querySelectorAll('[data-image-gallery]').forEach((gallery) => {
      refineCards(gallery);
      const observer = new MutationObserver(() => refineCards(gallery));
      observer.observe(gallery, { childList: true, subtree: true });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
