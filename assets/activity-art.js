document.addEventListener('DOMContentLoaded',()=>{
  const canvas=document.querySelector('[data-activity-art]');
  if(!canvas)return;

  const DAY_COUNT=365;
  const ctx=canvas.getContext('2d');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette=['#e8ebee','#9adbe4','#6e8ced','#7d73e9','#ef8fb1','#d95f96'];
  const points=buildIllustrationPoints(DAY_COUNT);

  let cssWidth=0,cssHeight=0,dpr=1;
  let levels=new Array(DAY_COUNT).fill(0);
  let activeDays=0,totalContributions=0;
  let reveal=0,pulse=0;
  let pointer={x:-9999,y:-9999,active:false};
  const start=performance.now();

  resize();
  const ro=new ResizeObserver(()=>{resize();if(reduced)draw(performance.now())});
  ro.observe(canvas);

  canvas.addEventListener('pointermove',event=>{
    const rect=canvas.getBoundingClientRect();
    pointer.x=event.clientX-rect.left;
    pointer.y=event.clientY-rect.top;
    pointer.active=true;
    if(reduced)draw(performance.now());
  });
  canvas.addEventListener('pointerleave',()=>{pointer.active=false;if(reduced)draw(performance.now())});
  canvas.addEventListener('pointerdown',()=>{pulse=1;if(reduced)draw(performance.now())});

  loadContributionData(DAY_COUNT).then(result=>{
    levels=result.levels;
    activeDays=result.activeDays;
    totalContributions=result.totalContributions;
    if(reduced)reveal=1;
    console.info(`[Fugu Activity] source=${result.source}, dots=${points.length}, activeDays=${activeDays}/${DAY_COUNT}, total=${totalContributions}`);
    if(reduced)draw(performance.now());
  }).catch(error=>console.warn('[Fugu Activity] contribution data could not be loaded',error));

  function resize(){
    const rect=canvas.getBoundingClientRect();
    cssWidth=Math.max(1,rect.width);cssHeight=Math.max(1,rect.height);
    dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(cssWidth*dpr);canvas.height=Math.round(cssHeight*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function draw(now){
    ctx.clearRect(0,0,cssWidth,cssHeight);
    const t=(now-start)/1000;
    const scene=layout(cssWidth,cssHeight);
    if(!reduced){reveal+=(1-reveal)*.025;pulse*=.91}
    drawAmbient(scene,t);
    drawGuide(scene);
    drawDots(scene,t);
    if(!reduced)requestAnimationFrame(draw);
  }

  function drawAmbient(scene,t){
    const g=ctx.createRadialGradient(scene.x+scene.w*.25,scene.y+scene.h*.75,5,scene.x+scene.w*.25,scene.y+scene.h*.75,scene.w*.46);
    g.addColorStop(0,'rgba(154,219,228,.10)');g.addColorStop(1,'rgba(154,219,228,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(scene.x+scene.w*.25,scene.y+scene.h*.75,scene.w*.42,0,Math.PI*2);ctx.fill();
    const rings=[[.11,.20,9,.2],[.86,.20,7,1.2],[.91,.72,11,2.1],[.18,.80,5,2.8]];
    ctx.save();ctx.strokeStyle='rgba(125,115,233,.055)';ctx.lineWidth=1;
    rings.forEach(([nx,ny,r,p])=>{const dx=reduced?0:Math.sin(t*.28+p)*4,dy=reduced?0:Math.cos(t*.24+p)*4;ctx.beginPath();ctx.arc(cssWidth*nx+dx,cssHeight*ny+dy,r,0,Math.PI*2);ctx.stroke()});ctx.restore();
  }

  function drawGuide(scene){
    ctx.save();ctx.translate(scene.x,scene.y);ctx.scale(scene.scale,scene.scale);
    drawMascot(ctx,false);ctx.restore();
  }

  function drawDots(scene,t){
    const dotScale=Math.max(.72,Math.min(1.12,scene.scale));
    points.forEach((p,i)=>{
      const level=levels[i]||0;
      const gate=Math.min(1,reveal*1.25-i/points.length*.20);
      if(gate<=.02)return;
      let x=scene.x+p.x*scene.scale,y=scene.y+p.y*scene.scale;
      if(!reduced)y+=Math.sin(t*.9+p.seed)*.55;
      let hover=0;
      if(pointer.active){const dx=x-pointer.x,dy=y-pointer.y,dist=Math.hypot(dx,dy);if(dist<66&&dist>0){hover=(66-dist)/66;x+=dx/dist*hover*4;y+=dy/dist*hover*4}}
      const base=level===0?2.45:3.0+level*.58;
      const r=(base*(.72+.28*easeOut(gate))+hover*.7+pulse*.22)*dotScale;
      const color=palette[level];
      ctx.save();ctx.globalAlpha=level===0?.43:.95;
      if(level>=3){ctx.shadowColor=hexAlpha(color,.22);ctx.shadowBlur=7+level*1.6}
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      if(level>=4){ctx.shadowBlur=0;ctx.globalAlpha=.72;ctx.fillStyle='rgba(255,255,255,.86)';ctx.beginPath();ctx.arc(x-r*.28,y-r*.3,Math.max(.7,r*.18),0,Math.PI*2);ctx.fill()}
      ctx.restore();
    });
  }

  if(reduced)draw(performance.now());else requestAnimationFrame(draw);
});

function layout(w,h){
  const baseW=1000,baseH=760;
  const scale=Math.min(w*.86/baseW,h*.86/baseH);
  return{x:(w-baseW*scale)/2,y:(h-baseH*scale)/2,w:baseW*scale,h:baseH*scale,scale};
}

function drawMascot(c,mask){
  c.save();c.lineCap='round';c.lineJoin='round';
  c.strokeStyle=mask?'#000':'rgba(44,46,54,.12)';
  c.fillStyle='transparent';
  c.lineWidth=mask?18:3.2;

  // hood silhouette
  c.beginPath();c.moveTo(235,300);c.bezierCurveTo(245,145,380,72,535,78);c.bezierCurveTo(705,82,825,170,838,327);c.bezierCurveTo(851,477,780,624,640,680);c.stroke();
  // left and right fins
  c.beginPath();c.moveTo(240,285);c.bezierCurveTo(158,270,120,320,132,388);c.bezierCurveTo(145,451,196,465,252,426);c.stroke();
  c.beginPath();c.moveTo(833,337);c.bezierCurveTo(905,310,944,342,942,402);c.bezierCurveTo(940,462,902,493,838,474);c.stroke();
  // face
  c.beginPath();c.moveTo(330,309);c.bezierCurveTo(388,242,494,226,586,262);c.bezierCurveTo(678,298,716,388,699,486);c.bezierCurveTo(682,584,595,636,493,627);c.bezierCurveTo(391,618,319,549,301,461);c.bezierCurveTo(285,386,292,352,330,309);c.stroke();
  // hair frame
  c.beginPath();c.moveTo(319,334);c.bezierCurveTo(274,417,282,516,351,580);c.bezierCurveTo(420,646,540,671,635,620);c.stroke();
  // bangs
  [[375,275,355,382],[433,255,420,397],[491,248,488,404],[546,253,552,405],[600,270,610,392],[646,293,657,374]].forEach(([x1,y1,x2,y2])=>{c.beginPath();c.moveTo(x1,y1);c.quadraticCurveTo((x1+x2)/2+14,(y1+y2)/2,x2,y2);c.stroke()});
  // eyes
  c.beginPath();c.ellipse(407,445,35,49,-.12,0,Math.PI*2);c.stroke();
  c.beginPath();c.ellipse(574,434,34,47,.13,0,Math.PI*2);c.stroke();
  c.beginPath();c.arc(416,445,9,0,Math.PI*2);c.stroke();
  c.beginPath();c.arc(582,434,9,0,Math.PI*2);c.stroke();
  // lashes and mouth
  c.beginPath();c.moveTo(548,405);c.quadraticCurveTo(580,390,616,407);c.stroke();
  c.beginPath();c.moveTo(476,557);c.quadraticCurveTo(487,552,498,557);c.stroke();
  // hood wave
  c.beginPath();c.moveTo(345,158);c.bezierCurveTo(430,125,505,135,565,167);c.bezierCurveTo(628,201,697,194,758,224);c.stroke();
  // hood spots
  [[492,108,22],[677,145,29],[752,260,18],[782,336,22],[723,530,16],[806,420,13],[597,125,10]].forEach(([x,y,r])=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke()});
  // neck / cloak
  c.beginPath();c.moveTo(370,616);c.bezierCurveTo(453,671,563,683,676,644);c.stroke();
  c.beginPath();c.moveTo(389,635);c.bezierCurveTo(436,689,453,715,455,742);c.stroke();
  c.beginPath();c.moveTo(646,640);c.bezierCurveTo(594,687,574,716,568,742);c.stroke();
  c.restore();
}

function buildIllustrationPoints(target){
  const w=1000,h=760,off=document.createElement('canvas');off.width=w;off.height=h;
  const c=off.getContext('2d');c.clearRect(0,0,w,h);drawMascot(c,true);
  const img=c.getImageData(0,0,w,h).data,candidates=[];
  for(let y=0;y<h;y+=3){for(let x=0;x<w;x+=3){if(img[(y*w+x)*4+3]>20)candidates.push({x,y})}}
  const shuffled=candidates.slice().sort((a,b)=>seed(a.x*17+a.y*31)-seed(b.x*19+b.y*23));
  const chosen=[];let minDist=28;
  while(chosen.length<target&&minDist>=7){
    for(const p of shuffled){if(chosen.length>=target)break;let ok=true;for(const q of chosen){const dx=p.x-q.x,dy=p.y-q.y;if(dx*dx+dy*dy<minDist*minDist){ok=false;break}}if(ok)chosen.push(p)}
    minDist-=3;
  }
  if(chosen.length<target){for(const p of shuffled){if(chosen.length>=target)break;if(!chosen.some(q=>q.x===p.x&&q.y===p.y))chosen.push(p)}}
  chosen.sort((a,b)=>a.y-b.y||a.x-b.x);
  return chosen.slice(0,target).map((p,i)=>({x:p.x,y:p.y,seed:i*.41}));
}

async function loadContributionData(dayCount){
  const sources=[
    {name:'local-json',url:'assets/contributions.json'},
    {name:'branch-raw-json',url:'https://raw.githubusercontent.com/Fugu0141/Fugu0141.github.io/redesign-game-portfolio/assets/contributions.json'}
  ];
  for(const source of sources){
    try{const response=await fetch(source.url,{cache:'no-store'});if(!response.ok)continue;const data=await response.json();if(!isValidContributionData(data))continue;const levels=buildCalendarLevels(dayCount,data);return{levels,source:source.name,totalContributions:Number(data.totalContributions)||0,activeDays:levels.filter(v=>v>0).length}}catch(error){console.debug(`[Fugu Activity] ${source.name} failed`,error)}
  }
  const fallback=await loadEventFallback(dayCount);return{levels:fallback.levels,source:'public-events-fallback',totalContributions:fallback.totalContributions,activeDays:fallback.levels.filter(v=>v>0).length};
}
function isValidContributionData(data){return !!(data&&Array.isArray(data.days)&&data.days.length>=300&&data.days.some(day=>(Number(day.count)||0)>0))}
function buildCalendarLevels(dayCount,data){
  const byDate=new Map(data.days.map(day=>[day.date,day]));
  const positive=data.days.map(day=>Number(day.count)||0).filter(n=>n>0).sort((a,b)=>a-b);
  const hot=positive.length?positive[Math.floor((positive.length-1)*.9)]:Infinity;
  const end=parseDateOnly(data.to)||utcToday(),levels=[];
  for(let i=0;i<dayCount;i++){const d=new Date(end);d.setUTCDate(end.getUTCDate()-(dayCount-1-i));levels.push(calendarLevel(byDate.get(dateKey(d)),hot))}return levels;
}
function calendarLevel(day,hot){if(!day||(Number(day.count)||0)<=0)return 0;const n=Number(day.count)||0;if(day.level==='FIRST_QUARTILE')return 1;if(day.level==='SECOND_QUARTILE')return 2;if(day.level==='THIRD_QUARTILE')return 3;if(day.level==='FOURTH_QUARTILE')return n>=hot?5:4;return n===1?1:n<=3?2:n<=6?3:n<=10?4:5}
async function loadEventFallback(dayCount){
  const counts=new Map();
  for(let page=1;page<=3;page++){const response=await fetch(`https://api.github.com/users/Fugu0141/events/public?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json'}});if(!response.ok)break;const events=await response.json();if(!Array.isArray(events)||!events.length)break;for(const event of events){const key=String(event.created_at||'').slice(0,10);if(key)counts.set(key,(counts.get(key)||0)+eventWeight(event))}if(events.length<100)break}
  const now=utcToday(),levels=[];for(let i=0;i<dayCount;i++){const d=new Date(now);d.setUTCDate(now.getUTCDate()-(dayCount-1-i));const n=counts.get(dateKey(d))||0;levels.push(n===0?0:n===1?1:n<=3?2:n<=6?3:n<=10?4:5)}return{levels,totalContributions:[...counts.values()].reduce((a,b)=>a+b,0)};
}
function eventWeight(event){if(event.type==='PushEvent')return Math.max(1,Number(event.payload?.size)||event.payload?.commits?.length||1);if(event.type==='PullRequestEvent')return 3;if(event.type==='PullRequestReviewEvent')return 2;if(event.type==='IssuesEvent'||event.type==='ForkEvent')return 2;return 1}
function utcToday(){const n=new Date();return new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate()))}
function parseDateOnly(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return null;const[y,m,d]=v.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))}
function dateKey(d){return d.toISOString().slice(0,10)}
function hexAlpha(hex,a){const n=parseInt(hex.replace('#',''),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`}
function easeOut(t){return 1-Math.pow(1-Math.max(0,Math.min(1,t)),3)}
function seed(n){const x=Math.sin(n*12.9898)*43758.5453;return x-Math.floor(x)}
