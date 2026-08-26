document.addEventListener('DOMContentLoaded',()=>{
  const canvas=document.querySelector('[data-activity-art]');
  if(!canvas)return;

  const DAY_COUNT=365;
  const ctx=canvas.getContext('2d');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette=['#e8edef','#8ed9df','#5d84ea','#8575e8','#ef7fa7','#ffd65a'];
  const worldPoints=buildWorldPoints(DAY_COUNT);

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
    console.info(`[Fugu Activity] source=${result.source}, dots=${worldPoints.length}, activeDays=${activeDays}/${DAY_COUNT}, total=${totalContributions}`);
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
    if(!reduced){reveal+=(1-reveal)*.026;pulse*=.91}
    drawAmbient(scene);
    drawWorld(scene);
    drawDots(scene,t);
    if(!reduced)requestAnimationFrame(draw);
  }

  function drawAmbient(scene){
    const glow=ctx.createRadialGradient(scene.x+scene.w*.2,scene.y+scene.h*.78,8,scene.x+scene.w*.2,scene.y+scene.h*.78,scene.w*.48);
    glow.addColorStop(0,'rgba(142,217,223,.11)');
    glow.addColorStop(1,'rgba(142,217,223,0)');
    ctx.fillStyle=glow;
    ctx.beginPath();ctx.arc(scene.x+scene.w*.2,scene.y+scene.h*.78,scene.w*.42,0,Math.PI*2);ctx.fill();
  }

  function drawWorld(scene){
    ctx.save();
    WORLD_REGIONS.forEach(region=>{
      const poly=region.poly.map(([lon,lat])=>project(lon,lat,scene));
      ctx.beginPath();
      ctx.moveTo(poly[0].x,poly[0].y);
      for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i].x,poly[i].y);
      ctx.closePath();
      ctx.fillStyle='rgba(70,78,88,.042)';
      ctx.strokeStyle='rgba(70,78,88,.105)';
      ctx.lineWidth=1.15;
      ctx.fill();ctx.stroke();
    });

    ctx.strokeStyle='rgba(93,132,234,.045)';
    ctx.lineWidth=1;
    [-30,0,30].forEach(lat=>{
      const y=project(0,lat,scene).y;
      ctx.beginPath();ctx.moveTo(scene.x,y);ctx.lineTo(scene.x+scene.w,y);ctx.stroke();
    });
    ctx.restore();
  }

  function drawDots(scene,t){
    const recentStart=DAY_COUNT-21;
    const dotScale=Math.max(.75,Math.min(1.15,scene.w/980));

    worldPoints.forEach((point,index)=>{
      const level=levels[index]||0;
      const gate=Math.min(1,reveal*1.24-index/worldPoints.length*.18);
      if(gate<=.02)return;

      const pos=project(point.lon,point.lat,scene);
      let x=pos.x,y=pos.y;
      const recent=index>=recentStart&&level>0;
      const twinkle=recent&&!reduced?.95+Math.sin(t*2.1+point.seed)*.08:1;
      if(!reduced&&level>0)y+=Math.sin(t*.8+point.seed)*.45;

      let hover=0;
      if(pointer.active){
        const dx=x-pointer.x,dy=y-pointer.y,dist=Math.hypot(dx,dy);
        if(dist<70&&dist>0){hover=(70-dist)/70;x+=dx/dist*hover*4.2;y+=dy/dist*hover*4.2}
      }

      const base=level===0?2.25:2.85+level*.58;
      const r=(base*(.72+.28*easeOut(gate))*twinkle+hover*.65+pulse*.18)*dotScale;
      const color=palette[level];

      ctx.save();
      ctx.globalAlpha=level===0?.34:.96;
      if(level>=2){ctx.shadowColor=hexAlpha(color,.20+level*.025);ctx.shadowBlur=5+level*1.8}
      ctx.fillStyle=color;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      if(level>=4){
        ctx.shadowBlur=0;ctx.globalAlpha=.75;ctx.fillStyle='rgba(255,255,255,.88)';
        ctx.beginPath();ctx.arc(x-r*.28,y-r*.30,Math.max(.7,r*.18),0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    });
  }

  if(reduced)draw(performance.now());else requestAnimationFrame(draw);
});

const WORLD_REGIONS=[
  {count:60,poly:[[-168,72],[-145,70],[-128,61],[-118,52],[-112,43],[-102,31],[-88,24],[-82,10],[-92,14],[-105,22],[-117,32],[-126,46],[-145,58],[-160,61]]},
  {count:8,poly:[[-56,82],[-35,79],[-20,70],[-33,60],[-52,59],[-66,68]]},
  {count:42,poly:[[-80,12],[-67,9],[-51,2],[-44,-10],[-40,-23],[-53,-39],[-68,-55],[-76,-38],[-79,-17]]},
  {count:35,poly:[[-10,71],[8,72],[28,68],[41,61],[36,53],[24,45],[12,43],[1,50],[-8,58]]},
  {count:52,poly:[[-17,36],[4,37],[23,32],[40,17],[43,2],[35,-19],[21,-35],[6,-31],[-7,-13],[-15,8]]},
  {count:118,poly:[[31,70],[58,72],[90,69],[121,62],[154,51],[166,43],[150,31],[124,22],[107,8],[82,8],[67,23],[49,30],[37,45]]},
  {count:20,poly:[[93,23],[112,22],[129,17],[142,7],[137,-7],[119,-10],[104,0]]},
  {count:25,poly:[[112,-11],[130,-10],[151,-22],[153,-35],[135,-44],[116,-35]]},
  {count:5,poly:[[129,31],[136,34],[143,44],[146,39],[141,32],[134,29]]}
];

function layout(w,h){
  const maxW=Math.min(w*.88,1020);
  const mapRatio=.50;
  const maxH=h*.72;
  const mapW=Math.min(maxW,maxH/mapRatio);
  const mapH=mapW*mapRatio;
  return{x:(w-mapW)/2,y:(h-mapH)/2,w:mapW,h:mapH};
}

function project(lon,lat,scene){
  return{x:scene.x+(lon+180)/360*scene.w,y:scene.y+(90-lat)/180*scene.h};
}

function buildWorldPoints(target){
  let points=[];
  WORLD_REGIONS.forEach((region,regionIndex)=>{
    points.push(...sampleRegion(region,regionIndex));
  });
  points=reorderPoints(points);
  if(points.length>target)points=points.slice(0,target);
  while(points.length<target){
    const i=points.length+1;
    points.push({lon:-165+seed(i*17)*330,lat:-55+seed(i*29)*125,seed:i*.43});
  }
  return points;
}

function sampleRegion(region,regionIndex){
  const bounds=polygonBounds(region.poly);
  const points=[];
  let tries=0;
  while(points.length<region.count&&tries<region.count*800){
    tries++;
    const lon=lerp(bounds.minLon,bounds.maxLon,seed((regionIndex+1)*1009+tries*17));
    const lat=lerp(bounds.minLat,bounds.maxLat,seed((regionIndex+1)*2027+tries*31));
    if(pointInPolygon(lon,lat,region.poly))points.push({lon,lat,seed:(regionIndex+1)*3.7+tries*.41});
  }
  if(points.length<region.count){
    const center=polygonCenter(region.poly);
    while(points.length<region.count){
      const i=points.length+1;
      points.push({lon:center.lon+(seed(i*37+regionIndex)-.5)*5,lat:center.lat+(seed(i*53+regionIndex)-.5)*4,seed:i*.47});
    }
  }
  return points;
}

function polygonBounds(poly){
  let minLon=Infinity,maxLon=-Infinity,minLat=Infinity,maxLat=-Infinity;
  poly.forEach(([lon,lat])=>{minLon=Math.min(minLon,lon);maxLon=Math.max(maxLon,lon);minLat=Math.min(minLat,lat);maxLat=Math.max(maxLat,lat)});
  return{minLon,maxLon,minLat,maxLat};
}

function polygonCenter(poly){
  const sum=poly.reduce((acc,[lon,lat])=>({lon:acc.lon+lon,lat:acc.lat+lat}),{lon:0,lat:0});
  return{lon:sum.lon/poly.length,lat:sum.lat/poly.length};
}

function pointInPolygon(lon,lat,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
    const intersect=((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/((yj-yi)||1e-9)+xi);
    if(intersect)inside=!inside;
  }
  return inside;
}

function reorderPoints(points){
  const out=[],used=new Array(points.length).fill(false);
  let index=11;
  const step=137;
  for(let i=0;i<points.length;i++){
    while(used[index%points.length])index++;
    const real=index%points.length;
    out.push(points[real]);used[real]=true;index+=step;
  }
  return out;
}

async function loadContributionData(dayCount){
  const sources=[
    {name:'local-json',url:'assets/contributions.json'},
    {name:'branch-raw-json',url:'https://raw.githubusercontent.com/Fugu0141/Fugu0141.github.io/redesign-game-portfolio/assets/contributions.json'}
  ];
  for(const source of sources){
    try{
      const response=await fetch(source.url,{cache:'no-store'});if(!response.ok)continue;
      const data=await response.json();if(!isValidContributionData(data))continue;
      const levels=buildCalendarLevels(dayCount,data);
      return{levels,source:source.name,totalContributions:Number(data.totalContributions)||0,activeDays:levels.filter(v=>v>0).length};
    }catch(error){console.debug(`[Fugu Activity] ${source.name} failed`,error)}
  }
  const fallback=await loadEventFallback(dayCount);
  return{levels:fallback.levels,source:'public-events-fallback',totalContributions:fallback.totalContributions,activeDays:fallback.levels.filter(v=>v>0).length};
}

function isValidContributionData(data){return !!(data&&Array.isArray(data.days)&&data.days.length>=300&&data.days.some(day=>(Number(day.count)||0)>0))}

function buildCalendarLevels(dayCount,data){
  const byDate=new Map(data.days.map(day=>[day.date,day]));
  const positive=data.days.map(day=>Number(day.count)||0).filter(n=>n>0).sort((a,b)=>a-b);
  const hot=positive.length?positive[Math.floor((positive.length-1)*.9)]:Infinity;
  const end=parseDateOnly(data.to)||utcToday(),levels=[];
  for(let i=0;i<dayCount;i++){
    const d=new Date(end);d.setUTCDate(end.getUTCDate()-(dayCount-1-i));
    levels.push(calendarLevel(byDate.get(dateKey(d)),hot));
  }
  return levels;
}

function calendarLevel(day,hot){
  if(!day||(Number(day.count)||0)<=0)return 0;
  const n=Number(day.count)||0;
  if(day.level==='FIRST_QUARTILE')return 1;
  if(day.level==='SECOND_QUARTILE')return 2;
  if(day.level==='THIRD_QUARTILE')return 3;
  if(day.level==='FOURTH_QUARTILE')return n>=hot?5:4;
  return n===1?1:n<=3?2:n<=6?3:n<=10?4:5;
}

async function loadEventFallback(dayCount){
  const counts=new Map();
  for(let page=1;page<=3;page++){
    const response=await fetch(`https://api.github.com/users/Fugu0141/events/public?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)break;
    const events=await response.json();if(!Array.isArray(events)||!events.length)break;
    for(const event of events){const key=String(event.created_at||'').slice(0,10);if(key)counts.set(key,(counts.get(key)||0)+eventWeight(event))}
    if(events.length<100)break;
  }
  const now=utcToday(),levels=[];
  for(let i=0;i<dayCount;i++){
    const d=new Date(now);d.setUTCDate(now.getUTCDate()-(dayCount-1-i));
    const n=counts.get(dateKey(d))||0;
    levels.push(n===0?0:n===1?1:n<=3?2:n<=6?3:n<=10?4:5);
  }
  return{levels,totalContributions:[...counts.values()].reduce((a,b)=>a+b,0)};
}

function eventWeight(event){if(event.type==='PushEvent')return Math.max(1,Number(event.payload?.size)||event.payload?.commits?.length||1);if(event.type==='PullRequestEvent')return 3;if(event.type==='PullRequestReviewEvent')return 2;if(event.type==='IssuesEvent'||event.type==='ForkEvent')return 2;return 1}
function utcToday(){const n=new Date();return new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate()))}
function parseDateOnly(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return null;const[y,m,d]=v.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))}
function dateKey(d){return d.toISOString().slice(0,10)}
function hexAlpha(hex,a){const n=parseInt(hex.replace('#',''),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`}
function easeOut(t){return 1-Math.pow(1-Math.max(0,Math.min(1,t)),3)}
function lerp(a,b,t){return a+(b-a)*t}
function seed(n){const x=Math.sin(n*12.9898)*43758.5453;return x-Math.floor(x)}
