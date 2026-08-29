/* =========================================================
   404 page only
   表示するキャラクターとアクセントカラーをランダムに選びます。
   ========================================================= */

const SITE_HOME = '/';

const CHARACTERS = [
  {
    image: 'image/torafugu-404.png',
    alt: 'はてなマークに囲まれて考え込むとらふぐちゃん',
    main: '#5b83ff',
    sub: '#8fb7ff'
  },
  {
    image: 'image/kurage-404.png',
    alt: 'はてなマークに囲まれて不思議そうにしているくらげちゃん',
    main: '#9b8cff',
    sub: '#8edfff'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  const picked = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
  const image = document.getElementById('characterImage');
  const homeButton = document.getElementById('homeButton');

  document.documentElement.style.setProperty('--main', picked.main);
  document.documentElement.style.setProperty('--sub', picked.sub);

  if (image) {
    image.src = picked.image;
    image.alt = picked.alt;
  }

  if (homeButton) {
    homeButton.href = SITE_HOME;
  }
});
