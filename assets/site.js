document.addEventListener('DOMContentLoaded',()=>{
  const observer=new IntersectionObserver((entries)=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  if(window.matchMedia('(max-width: 900px)').matches){
    const links=[['HOME','index.html'],['PROJECTS','projects.html'],['ACTIVITY','activity.html'],['LAB','lab.html'],['PRINCIPLES','principles.html'],['ABOUT','about.html'],['LINKS','links.html']];
    const dock=document.createElement('nav');dock.setAttribute('aria-label','Mobile navigation');
    Object.assign(dock.style,{position:'fixed',left:'12px',right:'12px',bottom:'12px',zIndex:'50',display:'flex',gap:'6px',overflowX:'auto',padding:'8px',border:'1px solid rgba(255,255,255,.9)',borderRadius:'18px',background:'rgba(246,252,255,.9)',backdropFilter:'blur(18px)',boxShadow:'0 16px 42px rgba(44,112,147,.18)'});
    links.forEach(([label,href])=>{const a=document.createElement('a');a.href=href;a.textContent=label;Object.assign(a.style,{flex:'0 0 auto',padding:'9px 10px',borderRadius:'11px',textDecoration:'none',fontSize:'11px',fontWeight:'800',letterSpacing:'.05em',color:location.pathname.endsWith(href)||(!location.pathname.split('/').pop()&&href==='index.html')?'#fff':'#4c6d80',background:location.pathname.endsWith(href)||(!location.pathname.split('/').pop()&&href==='index.html')?'linear-gradient(135deg,#168ed0,#7758e8)':'rgba(255,255,255,.72)'});dock.appendChild(a)});
    document.body.appendChild(dock);document.body.style.paddingBottom='78px';
  }

  const target=document.querySelector('[data-github-activity]');
  if(target){
    fetch('https://api.github.com/users/Fugu0141/events/public?per_page=8',{headers:{Accept:'application/vnd.github+json'}})
      .then(r=>{if(!r.ok)throw new Error('GitHub API');return r.json()})
      .then(events=>{
        if(!events.length){target.innerHTML='<p class="loading">No recent public activity.</p>';return}
        target.innerHTML=events.map(event=>{
          const when=new Intl.DateTimeFormat('ja-JP',{month:'short',day:'numeric'}).format(new Date(event.created_at));
          const repo=event.repo?.name||'GitHub';let text=event.type.replace('Event','');
          if(event.type==='PushEvent') text=`${event.payload?.commits?.length||1} commit(s) pushed`;
          if(event.type==='PullRequestEvent') text=`Pull request ${event.payload?.action||''}`;
          if(event.type==='IssuesEvent') text=`Issue ${event.payload?.action||''}`;
          return `<article class="activity-item"><div class="activity-time">${when}</div><div class="activity-node"></div><div class="activity-body"><strong>${escapeHtml(repo)}</strong><p>${escapeHtml(text)}</p></div></article>`
        }).join('')
      }).catch(()=>{target.innerHTML='<p class="loading">GitHub activity is temporarily unavailable.</p>'});
  }
});
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
if(window.p5&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){new p5(p=>{let points=[];const reset=()=>{points=[];const count=Math.max(28,Math.min(72,Math.floor((p.windowWidth*p.windowHeight)/26000)));for(let i=0;i<count;i++)points.push({x:p.random(p.width),y:p.random(p.height),vx:p.random(-.18,.18),vy:p.random(-.18,.18),r:p.random(1.3,3.2)})};p.setup=()=>{const c=p.createCanvas(p.windowWidth,p.windowHeight);c.parent('p5-bg');p.pixelDensity(Math.min(window.devicePixelRatio||1,1.5));reset()};p.draw=()=>{p.clear();for(let i=0;i<points.length;i++){const a=points[i];a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>p.width)a.vx*=-1;if(a.y<0||a.y>p.height)a.vy*=-1;for(let j=i+1;j<points.length;j++){const b=points[j],d=p.dist(a.x,a.y,b.x,b.y);if(d<125){p.stroke(42,147,196,p.map(d,0,125,34,0));p.strokeWeight(.7);p.line(a.x,a.y,b.x,b.y)}}p.noStroke();p.fill(72,170,214,85);p.circle(a.x,a.y,a.r*2)}if(p.mouseX>=0&&p.mouseY>=0&&p.mouseX<p.width&&p.mouseY<p.height){for(const a of points){const d=p.dist(a.x,a.y,p.mouseX,p.mouseY);if(d<170){p.stroke(119,88,232,p.map(d,0,170,52,0));p.line(a.x,a.y,p.mouseX,p.mouseY)}}}};p.windowResized=()=>{p.resizeCanvas(p.windowWidth,p.windowHeight);reset()}})}
