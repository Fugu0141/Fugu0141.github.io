const NAV_ITEMS=[
  ['home','index.html','ホーム','Home'],
  ['projects','projects.html','制作','Projects'],
  ['activity','activity.html','活動','Activity'],
  ['principles','principles.html','理念','Principles'],
  ['about','about.html','プロフィール','About'],
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
  },{threshold:.06});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  loadGitHubActivity();
});

function renderChrome(){
  const current=document.body.dataset.page||'home';
  const header=document.querySelector('[data-site-header]');
  if(header){
    header.className='site-header';
    header.innerHTML=`<div class="shell header-inner">
      <a class="brand" href="index.html"><span class="brand-dot"></span>Fugu</a>
      <nav class="nav-links" aria-label="Main navigation">
        ${NAV_ITEMS.map(([id,href,ja,en])=>`<a href="${href}"${id===current?' aria-current="page"':''}><span class="lang-ja">${ja}</span><span class="lang-en">${en}</span></a>`).join('')}
      </nav>
      <div class="lang-switch" aria-label="Language"><button type="button" data-lang-button="ja">日本語</button><button type="button" data-lang-button="en">EN</button></div>
    </div>`;
  }

  const footer=document.querySelector('[data-site-footer]');
  if(footer){
    footer.className='footer';
    footer.innerHTML=`<div class="shell footer-inner"><span>© 2026 Fugu</span><span><span class="lang-ja">つくる・学ぶ・共有する</span><span class="lang-en">Create · Learn · Share</span></span></div>`;
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
  fetch('https://api.github.com/users/Fugu0141/events/public?per_page=8',{headers:{Accept:'application/vnd.github+json'}})
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
  if(!events.length){target.innerHTML=`<p class="loading">${lang==='ja'?'最近の公開活動はありません。':'No recent public activity.'}</p>`;return}
  const locale=lang==='ja'?'ja-JP':'en-US';
  target.innerHTML=events.map(event=>{
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

function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

if(window.p5&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  new p5(p=>{
    let dots=[];
    const reset=()=>{
      dots=[];
      const count=Math.max(12,Math.min(24,Math.floor((p.windowWidth*p.windowHeight)/65000)));
      for(let i=0;i<count;i++)dots.push({x:p.random(p.width),y:p.random(p.height*.72),vx:p.random(-.05,.05),vy:p.random(-.05,.05)});
    };
    p.setup=()=>{const canvas=p.createCanvas(p.windowWidth,p.windowHeight);canvas.parent('p5-bg');p.pixelDensity(1);reset()};
    p.draw=()=>{
      p.clear();
      dots.forEach((a,i)=>{
        a.x+=a.vx;a.y+=a.vy;
        if(a.x<0||a.x>p.width)a.vx*=-1;if(a.y<0||a.y>p.height*.74)a.vy*=-1;
        for(let j=i+1;j<dots.length;j++){
          const b=dots[j],d=p.dist(a.x,a.y,b.x,b.y);
          if(d<145){p.stroke(70,145,180,p.map(d,0,145,18,0));p.strokeWeight(.5);p.line(a.x,a.y,b.x,b.y)}
        }
        p.noStroke();p.fill(55,135,175,38);p.circle(a.x,a.y,2.6);
      });
    };
    p.windowResized=()=>{p.resizeCanvas(p.windowWidth,p.windowHeight);reset()};
  });
}
