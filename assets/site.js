document.addEventListener('DOMContentLoaded',()=>{
  const saved=localStorage.getItem('fugu-language');
  const initial=saved==='en'?'en':'ja';
  setLanguage(initial);

  document.querySelectorAll('[data-lang-button]').forEach(button=>{
    button.addEventListener('click',()=>setLanguage(button.dataset.langButton));
  });

  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('visible')});
  },{threshold:.08});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  loadGitHubActivity();
});

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
      const ja='<p class="loading">現在、GitHubの活動を取得できません。</p>';
      const en='<p class="loading">GitHub activity is temporarily unavailable.</p>';
      target.innerHTML=document.body.dataset.lang==='en'?en:ja;
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
    const text=eventText(event,lang);
    return `<article class="activity-item"><div class="activity-time">${escapeHtml(when)}</div><div class="activity-body"><strong>${escapeHtml(repo)}</strong><p>${escapeHtml(text)}</p></div></article>`;
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
      const count=Math.max(14,Math.min(30,Math.floor((p.windowWidth*p.windowHeight)/50000)));
      for(let i=0;i<count;i++)dots.push({x:p.random(p.width),y:p.random(p.height),vx:p.random(-.08,.08),vy:p.random(-.08,.08)});
    };
    p.setup=()=>{const canvas=p.createCanvas(p.windowWidth,p.windowHeight);canvas.parent('p5-bg');p.pixelDensity(1);reset()};
    p.draw=()=>{
      p.clear();
      dots.forEach((a,i)=>{
        a.x+=a.vx;a.y+=a.vy;
        if(a.x<0||a.x>p.width)a.vx*=-1;if(a.y<0||a.y>p.height)a.vy*=-1;
        for(let j=i+1;j<dots.length;j++){
          const b=dots[j],d=p.dist(a.x,a.y,b.x,b.y);
          if(d<150){p.stroke(74,154,193,p.map(d,0,150,25,0));p.strokeWeight(.55);p.line(a.x,a.y,b.x,b.y)}
        }
        p.noStroke();p.fill(55,143,188,55);p.circle(a.x,a.y,3);
      });
    };
    p.windowResized=()=>{p.resizeCanvas(p.windowWidth,p.windowHeight);reset()};
  });
}
