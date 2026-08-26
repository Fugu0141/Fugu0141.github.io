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
    let name = String(filename || '').replace(/\.png$/i, '');
    name = decodeRepeated(name);
    const parts = name.split('__');
    const start = /^\d+$/.test(parts[0] || '') ? 1 : 0;

    for (let i = start; i < parts.length; i += 1) {
      const candidate = decodeRepeated(parts.slice(i).join('__'));
      if (isHttpUrl(candidate)) return candidate;
    }

    const whole = decodeRepeated(name);
    return isHttpUrl(whole) ? whole : '';
  };

  const filenameFromImage = (image) => {
    try {
      const url = new URL(image.currentSrc || image.src, location.href);
      return url.pathname.split('/').filter(Boolean).pop() || '';
    } catch (_) {
      return '';
    }
  };

  const makeCardsConsistent = (root) => {
    root.querySelectorAll('.image-card').forEach((card) => {
      const image = card.querySelector('img');
      if (!image) return;

      const filename = filenameFromImage(image);
      const url = urlFromFilename(filename);
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
      link.innerHTML = card.innerHTML;
      card.replaceWith(link);
    });
  };

  const attach = () => {
    const galleries = document.querySelectorAll('[data-image-gallery]');
    galleries.forEach((gallery) => {
      makeCardsConsistent(gallery);
      const observer = new MutationObserver(() => makeCardsConsistent(gallery));
      observer.observe(gallery, { childList: true, subtree: true });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
