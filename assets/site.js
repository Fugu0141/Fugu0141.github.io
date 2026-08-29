const NAV_ITEMS=[
  ['projects','projects.html','つくったもの','Projects'],
  ['activity','activity.html','活動','Activity'],
  ['principles','principles.html','大切にしていること','Principles'],
  ['links','links.html','リンク','Links']
];

document.addEventListener('DOMContentLoaded',()=>{
  renderChrome();
  const saved=localStorage.getItem('fugu-language');
  setLanguage(saved==='en'?'en':'ja');

  document.querySelectorAll('[data-lang-button]').forEach(button=>{
    button.addEventListener('click',()=>setLanguage(button.dataset.langButton));
  });

  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('visible')});
  },{threshold:.08});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  loadGitHubActivity();
});

function renderChrome(){
  const current=document.body.dataset.page||'';
  const header=document.querySelector('[data-site-header]');
  if(header){
    header.className='site-header';
    header.innerHTML=`<div class="shell header-inner">
      <a class="brand" href="index.html" aria-label="Fugu profile"><span class="brand-bubble"></span>Fugu</a>
      <nav class="nav-links" aria-label="Main navigation">
        ${NAV_ITEMS.map(([id,href,ja,en])=>`<a href="${href}" data-nav="${id}"${id===current?' aria-current="page"':''}><span class="lang-ja">${ja}</span><span class="lang-en">${en}</span></a>`).join('')}
      </nav>
      <div class="lang-switch" aria-label="Language"><button type="button" data-lang-button="ja">日本語</button><button type="button" data-lang-button="en">EN</button></div>
    </div>`;
  }

  const footer=document.querySelector('[data-site-footer]');
  if(footer){
    footer.className='footer';
    footer.innerHTML=`<div class="shell footer-inner"><span>© 2026 Fugu</span><span class="footer-mark"><span class="lang-ja">つくる・学ぶ・共有する</span><span class="lang-en">Create · Learn · Share</span></span></div>`;
  }
}

function setLanguage(lang){
  const value=lang==='en'?'en':'ja';
  document.documentElement.lang=value;
  document.body.dataset.lang=value;
  localStorage.setItem('fugu-language',value);
  document.querySelectorAll('[data-lang-button]').forEach(button=>{
    const active=button.dataset.langButton===value;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  if(window.__githubEvents)renderGitHubActivity(window.__githubEvents);
}

function loadGitHubActivity(){
  const target=document.querySelector('[data-github-activity]');
  if(!target)return;
  const count=document.querySelector('[data-commit-reef]')?30:10;
  fetch(`https://api.github.com/users/Fugu0141/events/public?per_page=${count}`,{headers:{Accept:'application/vnd.github+json'}})
    .then(response=>{if(!response.ok)throw new Error('GitHub API');return response.json()})
    .then(events=>{window.__githubEvents=events;renderGitHubActivity(events)})
    .catch(()=>{
      target.innerHTML=document.body.dataset.lang==='en'
        ?'<p class="loading">GitHub activity is temporarily unavailable.</p>'
        :'<p class="loading">現在、GitHubの活動を取得できません。</p>';
    });
}

function renderGitHubActivity(events){
  const target=document.querySelector('[data-github-activity]');
  if(!target)return;
  const lang=document.body.dataset.lang==='en'?'en':'ja';
  const visibleEvents=document.querySelector('[data-commit-reef]')
    ? events.filter(event=>event.type!=='PushEvent').slice(0,10)
    : events;
  if(!visibleEvents.length){target.innerHTML=`<p class="loading">${lang==='ja'?'最近の公開活動はありません。':'No recent public activity.'}</p>`;return}
  const locale=lang==='ja'?'ja-JP':'en-US';
  target.innerHTML=visibleEvents.map(event=>{
    const when=new Intl.DateTimeFormat(locale,{month:'short',day:'numeric'}).format(new Date(event.created_at));
    const repo=event.repo?.name||'GitHub';
    return `<article class="activity-item"><div class="activity-time">${escapeHtml(when)}</div><div class="activity-body"><strong>${escapeHtml(repo)}</strong><p>${escapeHtml(eventText(event,lang))}</p></div></article>`;
  }).join('');
}

function eventText(event,lang){
  const count=event.payload?.commits?.length||1;
  if(event.type==='PushEvent')return lang==='ja'?`${count}件のコミットをPush`:`Pushed ${count} commit${count===1?'':'s'}`;
  if(event.type==='PullRequestEvent')return lang==='ja'?`Pull Requestを${actionJa(event.payload?.action)}しました`:`Pull request ${event.payload?.action||'updated'}`;
  if(event.type==='IssuesEvent')return lang==='ja'?`Issueを${actionJa(event.payload?.action)}しました`:`Issue ${event.payload?.action||'updated'}`;
  if(event.type==='CreateEvent')return lang==='ja'?'リポジトリまたはブランチを作成':'Created a repository or branch';
  if(event.type==='WatchEvent')return lang==='ja'?'リポジトリをStar':'Starred a repository';
  if(event.type==='ForkEvent')return lang==='ja'?'リポジトリをFork':'Forked a repository';
  return lang==='ja'?'GitHub上で公開活動がありました':event.type.replace('Event','');
}

function actionJa(action){
  return ({opened:'作成',closed:'終了',reopened:'再開',synchronize:'更新',created:'作成',edited:'編集',deleted:'削除'})[action]||'更新';
}

function escapeHtml(value){
  return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);
}

if(window.p5&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  new p5(p=>{
    let bubbles=[];
    let accent=[93,132,234];

    function readAccent(){
      const raw=getComputedStyle(document.body).getPropertyValue('--accent-rgb').trim().split(',').map(Number);
      if(raw.length===3&&raw.every(Number.isFinite))accent=raw;
    }

    function reset(){
      readAccent();
      bubbles=[];
      const count=Math.max(12,Math.min(26,Math.floor((p.windowWidth*p.windowHeight)/52000)));
      for(let i=0;i<count;i++){
        bubbles.push({
          x:p.random(-40,p.width+40),y:p.random(-40,p.height+40),
          r:p.random(8,44),vx:p.random(-.12,.12),vy:p.random(-.16,.04),
          wobble:p.random(1000),alpha:p.random(22,58)
        });
      }
    }

    p.setup=()=>{
      const canvas=p.createCanvas(p.windowWidth,p.windowHeight);
      canvas.parent('p5-bg');
      p.pixelDensity(1);
      reset();
    };

    p.draw=()=>{
      p.clear();
      const activeMouse=p.mouseX>=0&&p.mouseY>=0&&p.mouseX<p.width&&p.mouseY<p.height;
      bubbles.forEach((b,i)=>{
        b.wobble+=.008;
        b.x+=b.vx+Math.sin(b.wobble)*.035;
        b.y+=b.vy+Math.cos(b.wobble*.7)*.02;

        if(activeMouse){
          const dx=b.x-p.mouseX,dy=b.y-p.mouseY;
          const d=Math.sqrt(dx*dx+dy*dy);
          if(d<130&&d>0){
            const force=(130-d)/130*.42;
            b.x+=dx/d*force;b.y+=dy/d*force;
          }
        }

        if(b.x<-80)b.x=p.width+80;if(b.x>p.width+80)b.x=-80;
        if(b.y<-90)b.y=p.height+90;if(b.y>p.height+90)b.y=-90;

        p.noFill();
        p.stroke(accent[0],accent[1],accent[2],b.alpha);
        p.strokeWeight(i%4===0?1.5:1);
        p.circle(b.x,b.y,b.r*2);
        if(i%3===0){
          p.noStroke();
          p.fill(accent[0],accent[1],accent[2],Math.min(24,b.alpha*.45));
          p.circle(b.x-b.r*.28,b.y-b.r*.28,Math.max(3,b.r*.28));
        }
      });
    };

    p.windowResized=()=>{p.resizeCanvas(p.windowWidth,p.windowHeight);reset()};
  });
}
