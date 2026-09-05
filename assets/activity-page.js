/* =========================================================
   Activity page shell
   - ヘッダー / フッター
   - URLベースの日本語 / English 切り替え
   - スクロール表示アニメーション
   - 背景のp5バブル

   世界地図そのものの描画は activity-art.js が担当します。
   ========================================================= */

const ACTIVITY_NAV_ITEMS = [
  ['projects', 'projects.html', 'つくったもの', 'Projects'],
  ['activity', 'activity.html', '活動', 'Activity'],
  ['principles', 'principles.html', '大切にしていること', 'Principles'],
  ['links', 'links.html', 'リンク', 'Links']
];

const ACTIVITY_LANGUAGE = document.body.dataset.lang === 'en' ? 'en' : 'ja';

function activityHref(file, language = ACTIVITY_LANGUAGE) {
  return language === 'en' ? `/en/${file}` : `/${file}`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderActivityChrome();
  setActivityLanguage(ACTIVITY_LANGUAGE);

  document.querySelectorAll('[data-lang-button]').forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.langButton === 'en' ? 'en' : 'ja';
      if (target === ACTIVITY_LANGUAGE) return;
      location.href = activityHref('activity.html', target);
    });
  });

  setupRevealAnimation();
});

function renderActivityChrome() {
  const current = document.body.dataset.page || 'activity';
  const header = document.querySelector('[data-site-header]');

  if (header) {
    header.className = 'site-header';
    header.innerHTML = `
      <div class="shell header-inner">
        <a class="brand" href="${ACTIVITY_LANGUAGE === 'en' ? '/en/' : '/'}" aria-label="Fugu profile">
          <span class="brand-bubble" aria-hidden="true"></span>Fugu
        </a>
        <nav class="nav-links" aria-label="Main navigation">
          ${ACTIVITY_NAV_ITEMS.map(([id, file, ja, en]) => `
            <a href="${activityHref(file)}" data-nav="${id}"${id === current ? ' aria-current="page"' : ''}>
              <span class="lang-ja">${ja}</span><span class="lang-en">${en}</span>
            </a>`).join('')}
        </nav>
        <div class="lang-switch" aria-label="Language">
          <button type="button" data-lang-button="ja">日本語</button>
          <button type="button" data-lang-button="en">EN</button>
        </div>
      </div>`;
  }

  const footer = document.querySelector('[data-site-footer]');
  if (footer) {
    footer.className = 'footer';
    footer.innerHTML = `
      <div class="shell footer-inner">
        <span>© 2026 Fugu</span>
        <span class="footer-mark">
          <span class="lang-ja">つくる・学ぶ・共有する</span>
          <span class="lang-en">Create · Learn · Share</span>
        </span>
      </div>`;
  }
}

function setActivityLanguage(language) {
  const value = language === 'en' ? 'en' : 'ja';
  document.documentElement.lang = value;
  document.body.dataset.lang = value;

  try {
    localStorage.setItem('fugu-language', value);
  } catch (_) {
    // Storage is optional; URL remains the source of truth.
  }

  document.querySelectorAll('[data-lang-button]').forEach(button => {
    const active = button.dataset.langButton === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function setupRevealAnimation() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(element => {
      element.classList.add('visible');
    });
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .08 });

  document.querySelectorAll('.reveal').forEach(element => {
    observer.observe(element);
  });
}

/* Decorative p5 background */
if (window.p5 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  new p5(p => {
    let bubbles = [];
    const accent = [255, 214, 90];

    function reset() {
      bubbles = [];
      const count = Math.max(
        12,
        Math.min(26, Math.floor((p.windowWidth * p.windowHeight) / 52000))
      );

      for (let i = 0; i < count; i += 1) {
        bubbles.push({
          x: p.random(-40, p.width + 40),
          y: p.random(-40, p.height + 40),
          r: p.random(8, 44),
          vx: p.random(-.12, .12),
          vy: p.random(-.16, .04),
          wobble: p.random(1000),
          alpha: p.random(22, 58)
        });
      }
    }

    p.setup = () => {
      const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
      canvas.parent('p5-bg');
      p.pixelDensity(1);
      reset();
    };

    p.draw = () => {
      p.clear();

      const activeMouse =
        p.mouseX >= 0 && p.mouseY >= 0 &&
        p.mouseX < p.width && p.mouseY < p.height;

      bubbles.forEach((bubble, index) => {
        bubble.wobble += .008;
        bubble.x += bubble.vx + Math.sin(bubble.wobble) * .035;
        bubble.y += bubble.vy + Math.cos(bubble.wobble * .7) * .02;

        if (activeMouse) {
          const dx = bubble.x - p.mouseX;
          const dy = bubble.y - p.mouseY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 130 && distance > 0) {
            const force = (130 - distance) / 130 * .42;
            bubble.x += dx / distance * force;
            bubble.y += dy / distance * force;
          }
        }

        if (bubble.x < -80) bubble.x = p.width + 80;
        if (bubble.x > p.width + 80) bubble.x = -80;
        if (bubble.y < -90) bubble.y = p.height + 90;
        if (bubble.y > p.height + 90) bubble.y = -90;

        p.noFill();
        p.stroke(accent[0], accent[1], accent[2], bubble.alpha);
        p.strokeWeight(index % 4 === 0 ? 1.5 : 1);
        p.circle(bubble.x, bubble.y, bubble.r * 2);

        if (index % 3 === 0) {
          p.noStroke();
          p.fill(
            accent[0],
            accent[1],
            accent[2],
            Math.min(24, bubble.alpha * .45)
          );
          p.circle(
            bubble.x - bubble.r * .28,
            bubble.y - bubble.r * .28,
            Math.max(3, bubble.r * .28)
          );
        }
      });
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      reset();
    };
  });
}
