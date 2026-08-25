document.addEventListener('DOMContentLoaded',()=>{
  const root=document.querySelector('[data-commit-reef]');
  if(!root)return;

  let tries=0;
  const waitForEvents=()=>{
    if(Array.isArray(window.__githubEvents)){
      renderCommitReef(window.__githubEvents);
      return;
    }
    if(tries++<120){setTimeout(waitForEvents,100);return}
    showReefFallback();
  };
  waitForEvents();
});

function renderCommitReef(events){
  const root=document.querySelector('[data-commit-reef]');
  const svg=document.querySelector('[data-reef-svg]');
  if(!root||!svg)return;

  const commits=[];
  for(const event of events){
    if(event.type!=='PushEvent')continue;
    const repo=event.repo?.name||'GitHub';
    const ref=String(event.payload?.ref||'').replace('refs/heads/','')||'unknown';
    const list=Array.isArray(event.payload?.commits)?event.payload.commits:[];
    for(const commit of list){
      commits.push({
        repo,
        branch:ref,
        sha:commit.sha||'',
        message:(commit.message||'Commit').split('\n')[0],
        date:event.created_at
      });
    }
  }

  commits.sort((a,b)=>new Date(b.date)-new Date(a.date));
  const limited=commits.slice(0,48);
  if(!limited.length){showReefFallback();return}

  const repoMap=new Map();
  for(const commit of limited){
    if(!repoMap.has(commit.repo))repoMap.set(commit.repo,{name:commit.repo,branches:new Map(),latest:commit.date,count:0});
    const repo=repoMap.get(commit.repo);
    repo.count++;
    if(new Date(commit.date)>new Date(repo.latest))repo.latest=commit.date;
    if(!repo.branches.has(commit.branch))repo.branches.set(commit.branch,[]);
    repo.branches.get(commit.branch).push(commit);
  }

  const maxRepos=window.innerWidth<720?4:6;
  const repos=[...repoMap.values()]
    .sort((a,b)=>new Date(b.latest)-new Date(a.latest)||b.count-a.count)
    .slice(0,maxRepos);

  const colors=['#69d7dd','#5d84ea','#ff766e','#ffd65a','#a98af4','#7ed9a8'];
  const nodeLookup=new Map();
  let nodeId=0;
  const W=1000,H=560,baseY=500;
  const left=95,right=905;
  const step=repos.length===1?0:(right-left)/(repos.length-1);

  let markup=`
    <path class="reef-water-line" d="M20 110 C180 90 290 138 450 112 S760 86 980 118"/>
    <path class="reef-water-line" d="M10 170 C180 145 350 188 535 160 S820 146 990 174"/>
    <path class="reef-ground-glow" d="M0 476 C120 451 208 486 328 470 S560 448 684 472 S884 452 1000 478 L1000 560 L0 560 Z"/>
    <path class="reef-ground" d="M0 504 C112 482 210 522 330 501 S558 486 690 506 S880 482 1000 510 L1000 560 L0 560 Z"/>
    ${decorativeBubbles()}
  `;

  repos.forEach((repo,repoIndex)=>{
    const baseX=repos.length===1?500:left+step*repoIndex;
    const color=colors[repoIndex%colors.length];
    const branchEntries=[...repo.branches.entries()]
      .sort((a,b)=>new Date(b[1][0]?.date)-new Date(a[1][0]?.date))
      .slice(0,3);
    const total=Math.min(repo.count,10);
    const colonyHeight=190+Math.min(total*15,150);

    markup+=`<g class="reef-colony">`;
    markup+=`<ellipse class="reef-root" cx="${baseX}" cy="${baseY+8}" rx="39" ry="12" fill="${color}"/>`;

    branchEntries.forEach(([branch,branchCommits],branchIndex)=>{
      const branchCount=branchEntries.length;
      const branchSpread=(branchIndex-(branchCount-1)/2)*56;
      const topX=baseX+branchSpread+(repoIndex%2===0?-8:8);
      const topY=baseY-colonyHeight+branchIndex*16;
      const sway=(repoIndex%2===0?1:-1)*(22+branchIndex*8);
      const d=`M ${baseX} ${baseY} C ${baseX+sway} ${baseY-colonyHeight*.32}, ${topX-sway*.45} ${topY+colonyHeight*.34}, ${topX} ${topY}`;
      markup+=`<path class="reef-stem" stroke="${color}" d="${d}"/>`;

      const branchList=branchCommits.slice(0,8);
      branchList.forEach((commit,j)=>{
        const t=(j+1)/(branchList.length+1);
        const y=baseY-t*colonyHeight;
        const curveX=baseX+(topX-baseX)*t+Math.sin((t*Math.PI)+(repoIndex*.8)+(branchIndex*.9))*16;
        const dir=(j+branchIndex)%2===0?-1:1;
        const twig=27+((j+repoIndex)%3)*9;
        const nodeX=curveX+dir*twig;
        const nodeY=y+Math.cos(j*1.3+repoIndex)*7;
        markup+=`<path class="reef-twig" stroke="${color}" d="M ${curveX.toFixed(1)} ${y.toFixed(1)} Q ${(curveX+nodeX)/2} ${(y+nodeY)/2-5} ${nodeX.toFixed(1)} ${nodeY.toFixed(1)}"/>`;

        const id=String(nodeId++);
        nodeLookup.set(id,commit);
        const rot=((j*7+repoIndex*5)%19)-9;
        const href=commit.sha?`https://github.com/${commit.repo}/commit/${commit.sha}`:`https://github.com/${commit.repo}`;
        const aria=`${repoShort(commit.repo)}: ${commit.message}`;
        markup+=`<a class="reef-node-link" href="${escAttr(href)}" target="_blank" rel="noopener" data-node-id="${id}" aria-label="${escAttr(aria)}">
          <rect x="${(nodeX-7).toFixed(1)}" y="${(nodeY-7).toFixed(1)}" width="14" height="14" rx="3.5" fill="${color}" color="${color}" opacity="${Math.max(.56,1-j*.045).toFixed(2)}" transform="rotate(${rot} ${nodeX.toFixed(1)} ${nodeY.toFixed(1)})"/>
          <circle class="reef-node-glint" cx="${(nodeX-2.7).toFixed(1)}" cy="${(nodeY-3).toFixed(1)}" r="1.35"/>
          <title>${escXml(commit.message)}</title>
        </a>`;
      });

      const pillW=Math.min(98,28+branch.length*6.3);
      const pillX=topX-pillW/2;
      markup+=`<g transform="translate(${pillX.toFixed(1)} ${(topY-30).toFixed(1)})">
        <rect class="reef-branch-pill" width="${pillW.toFixed(1)}" height="20" rx="10"/>
        <text class="reef-branch-label" x="${(pillW/2).toFixed(1)}" y="13.5" text-anchor="middle">${escXml(shorten(branch,13))}</text>
      </g>`;
    });

    markup+=`<text class="reef-repo-label" x="${baseX}" y="${baseY+38}" text-anchor="middle">${escXml(shorten(repoShort(repo.name),18))}</text>`;
    markup+=`</g>`;
  });

  svg.innerHTML=markup;
  root.querySelector('[data-reef-commits]').textContent=String(limited.length);
  root.querySelector('[data-reef-repos]').textContent=String(repos.length);
  const branchCount=repos.reduce((n,r)=>n+Math.min(r.branches.size,3),0);
  root.querySelector('[data-reef-branches]').textContent=String(branchCount);
  root.querySelector('[data-reef-loading]')?.classList.add('is-hidden');
  bindReefTooltips(nodeLookup);
}

function bindReefTooltips(nodeLookup){
  const root=document.querySelector('[data-commit-reef]');
  const tooltip=root?.querySelector('[data-reef-tooltip]');
  if(!root||!tooltip)return;

  const show=(el,event)=>{
    const commit=nodeLookup.get(el.dataset.nodeId);
    if(!commit)return;
    tooltip.innerHTML=`<strong>${escHtml(repoShort(commit.repo))} · ${escHtml(commit.branch)}</strong><span>${escHtml(commit.message)}</span><small>${formatCommitDate(commit.date)} · ${escHtml((commit.sha||'').slice(0,7))}</small>`;
    tooltip.hidden=false;
    if(event&&'clientX' in event)move(event);
    else{
      const box=el.getBoundingClientRect(),rootBox=root.getBoundingClientRect();
      tooltip.style.left=`${Math.min(root.clientWidth-315,Math.max(8,box.left-rootBox.left+18))}px`;
      tooltip.style.top=`${Math.max(70,box.top-rootBox.top-20)}px`;
    }
  };
  const move=event=>{
    const box=root.getBoundingClientRect();
    let x=event.clientX-box.left+14;
    let y=event.clientY-box.top+14;
    x=Math.min(root.clientWidth-315,Math.max(8,x));
    y=Math.min(root.clientHeight-110,Math.max(60,y));
    tooltip.style.left=`${x}px`;tooltip.style.top=`${y}px`;
  };
  const hide=()=>{tooltip.hidden=true};

  root.querySelectorAll('.reef-node-link').forEach(el=>{
    el.addEventListener('mouseenter',e=>show(el,e));
    el.addEventListener('mousemove',move);
    el.addEventListener('mouseleave',hide);
    el.addEventListener('focus',()=>show(el));
    el.addEventListener('blur',hide);
  });
}

function decorativeBubbles(){
  const bubbles=[[74,126,14],[146,204,7],[244,88,9],[353,146,5],[607,104,12],[716,190,6],[842,102,8],[936,226,15],[540,224,5],[890,324,6]];
  return bubbles.map(([x,y,r],i)=>`<g><circle class="reef-bubble" cx="${x}" cy="${y}" r="${r}"/><circle class="reef-bubble-dot" cx="${x-r*.28}" cy="${y-r*.3}" r="${Math.max(1.2,r*.13)}"/></g>`).join('');
}

function showReefFallback(){
  const root=document.querySelector('[data-commit-reef]');
  if(!root)return;
  const loading=root.querySelector('[data-reef-loading]');
  if(loading){
    loading.innerHTML='<span class="lang-ja">最近のCommitを取得できませんでした。</span><span class="lang-en">Recent commits could not be loaded.</span>';
  }
}

function repoShort(repo){return String(repo).split('/').pop()||repo}
function shorten(value,max){value=String(value);return value.length>max?value.slice(0,max-1)+'…':value}
function formatCommitDate(value){try{return new Intl.DateTimeFormat(document.body.dataset.lang==='en'?'en-US':'ja-JP',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch{return value}}
function escHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c])}
function escXml(value){return escHtml(value)}
function escAttr(value){return escHtml(value)}
