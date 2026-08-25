document.addEventListener('DOMContentLoaded',()=>{
  const canvas=document.querySelector('[data-activity-art]');
  if(!canvas)return;

  const DAY_COUNT=365;
  const ctx=canvas.getContext('2d');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette=['#e8f1f3','#70d5df','#5d84ea','#9278ef','#ff7a72','#ffd65a'];
  const worldTexture=createWorldTexture();

  let cssWidth=0,cssHeight=0,dpr=1;
  let levels=new Array(DAY_COUNT).fill(0);
  let totalContributions=0;
  let activeDays=0;
  let oceanDepth=.16;
  let targetOceanDepth=.16;
  let reveal=0;
  let pulse=0;
  let manualRotation=0;
  let spinVelocity=0;
  let drag=null;
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

    if(drag){
      const dx=event.clientX-drag.lastX;
      drag.lastX=event.clientX;
      drag.distance+=Math.abs(dx);
      manualRotation+=dx*.0065;
      spinVelocity=dx*.0008;
    }
    if(reduced)draw(performance.now());
  });

  canvas.addEventListener('pointerleave',()=>{
    pointer.active=false;
    if(!drag&&reduced)draw(performance.now());
  });

  canvas.addEventListener('pointerdown',event=>{
    drag={lastX:event.clientX,distance:0};
    canvas.setPointerCapture?.(event.pointerId);
  });

  const finishPointer=event=>{
    if(drag&&drag.distance<8)pulse=1;
    drag=null;
    try{canvas.releasePointerCapture?.(event.pointerId)}catch{}
    if(reduced)draw(performance.now());
  };
  canvas.addEventListener('pointerup',finishPointer);
  canvas.addEventListener('pointercancel',finishPointer);

  loadContributionData(DAY_COUNT).then(result=>{
    levels=result.levels;
    totalContributions=result.totalContributions;
    activeDays=result.activeDays;
    targetOceanDepth=activityToOceanDepth(totalContributions,activeDays);
    console.info(`[Fugu Activity] source=${result.source}, activeDays=${activeDays}/${DAY_COUNT}, total=${totalContributions}`);
    if(reduced){oceanDepth=targetOceanDepth;reveal=1;draw(performance.now())}
  }).catch(error=>console.warn('[Fugu Activity] contribution data could not be loaded',error));

  function resize(){
    const rect=canvas.getBoundingClientRect();
    cssWidth=Math.max(1,rect.width);
    cssHeight=Math.max(1,rect.height);
    dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(cssWidth*dpr);
    canvas.height=Math.round(cssHeight*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function draw(now){
    ctx.clearRect(0,0,cssWidth,cssHeight);
    const t=(now-start)/1000;
    const scene=layout(cssWidth,cssHeight);

    if(!reduced){
      oceanDepth+=(targetOceanDepth-oceanDepth)*.025;
      reveal+=(1-reveal)*.025;
      if(!drag){
        manualRotation+=spinVelocity;
        spinVelocity*=.965;
      }
      pulse*=.92;
    }

    drawAmbient(scene,t);
    drawPlanet(scene,t);
    drawOrbitAccent(scene,t);

    if(!reduced)requestAnimationFrame(draw);
  }

  function drawAmbient(scene,t){
    const glow=ctx.createRadialGradient(scene.cx,scene.cy+scene.r*.7,10,scene.cx,scene.cy+scene.r*.7,scene.r*2.15);
    glow.addColorStop(0,'rgba(105,215,221,.15)');
    glow.addColorStop(.5,'rgba(105,215,221,.045)');
    glow.addColorStop(1,'rgba(105,215,221,0)');
    ctx.fillStyle=glow;
    ctx.beginPath();
    ctx.arc(scene.cx,scene.cy+scene.r*.65,scene.r*2.2,0,Math.PI*2);
    ctx.fill();

    const bubbles=[
      [.10,.20,15,.2],[.18,.72,6,.8],[.84,.21,8,1.4],[.90,.67,13,2.1],
      [.75,.82,4,2.7],[.31,.17,4,3.2],[.63,.12,6,3.9],[.25,.86,8,4.4]
    ];
    ctx.save();
    ctx.strokeStyle='rgba(105,215,221,.16)';
    ctx.lineWidth=1.15;
    bubbles.forEach(([nx,ny,r,phase])=>{
      const driftX=reduced?0:Math.sin(t*.36+phase)*5;
      const driftY=reduced?0:Math.cos(t*.31+phase)*7;
      ctx.beginPath();
      ctx.arc(cssWidth*nx+driftX,cssHeight*ny+driftY,r,0,Math.PI*2);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawPlanet(scene,t){
    const autoRotation=reduced?0:t*.085;
    const rotation=autoRotation+manualRotation;
    const hover=pointer.active?Math.max(0,1-Math.hypot(pointer.x-scene.cx,pointer.y-scene.cy)/(scene.r*1.35)):0;
    const bob=reduced?0:Math.sin(t*.62)*3.2;
    const cy=scene.cy+bob;
    const r=scene.r*(1+hover*.015+pulse*.018);

    ctx.save();
    ctx.fillStyle='rgba(27,47,65,.09)';
    ctx.filter='blur(9px)';
    ctx.beginPath();
    ctx.ellipse(scene.cx,cy+r*1.16,r*.78,r*.13,0,0,Math.PI*2);
    ctx.fill();
    ctx.filter='none';
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(scene.cx,cy,r,0,Math.PI*2);
    ctx.clip();

    const shallow=mixColor('#eef8f8','#7ccfdd',oceanDepth);
    const deep=mixColor('#dcecef','#195fc8',oceanDepth);
    const ocean=ctx.createLinearGradient(scene.cx-r,cy-r,scene.cx+r,cy+r);
    ocean.addColorStop(0,shallow);
    ocean.addColorStop(.52,mixColor(shallow,deep,.43));
    ocean.addColorStop(1,deep);
    ctx.fillStyle=ocean;
    ctx.fillRect(scene.cx-r,cy-r,r*2,r*2);

    drawWorldTexture(scene.cx,cy,r,rotation);
    drawSeaSheen(scene.cx,cy,r);
    drawContributionLights(scene.cx,cy,r,rotation,t);
    drawNightGlow(scene.cx,cy,r,rotation,t);
    drawLimbShade(scene.cx,cy,r);
    ctx.restore();

    const atmosphere=ctx.createRadialGradient(scene.cx-r*.28,cy-r*.34,r*.08,scene.cx,cy,r*1.08);
    atmosphere.addColorStop(0,'rgba(255,255,255,.20)');
    atmosphere.addColorStop(.72,'rgba(255,255,255,.025)');
    atmosphere.addColorStop(1,'rgba(93,132,234,.18)');
    ctx.fillStyle=atmosphere;
    ctx.beginPath();
    ctx.arc(scene.cx,cy,r*1.018,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle='rgba(23,25,31,.055)';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.arc(scene.cx,cy,r,0,Math.PI*2);
    ctx.stroke();

    const rim=ctx.createLinearGradient(scene.cx-r,cy-r,scene.cx+r,cy+r);
    rim.addColorStop(0,'rgba(255,255,255,.34)');
    rim.addColorStop(.45,'rgba(255,255,255,.02)');
    rim.addColorStop(1,'rgba(23,63,119,.14)');
    ctx.strokeStyle=rim;
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.arc(scene.cx,cy,r-1.5,0,Math.PI*2);
    ctx.stroke();

    if(pulse>.002&&!reduced){
      ctx.strokeStyle=`rgba(255,214,90,${.24*pulse})`;
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(scene.cx,cy,r+10+(1-pulse)*28,0,Math.PI*2);
      ctx.stroke();
    }
  }

  function drawWorldTexture(cx,cy,r,rotation){
    const texW=worldTexture.width;
    const texH=worldTexture.height;
    const step=Math.max(2,Math.round(r/120));
    ctx.save();
    ctx.globalAlpha=.88;
    for(let dx=-r;dx<=r;dx+=step){
      const nx=dx/r;
      if(Math.abs(nx)>1)continue;
      const meridian=Math.asin(nx);
      const half=Math.sqrt(Math.max(0,1-nx*nx));
      const lon=wrapAngle(meridian+rotation);
      const sx=Math.floor(((lon+Math.PI)/(Math.PI*2))*texW)%texW;
      const h=Math.max(1,2*r*half);
      ctx.drawImage(worldTexture,sx,0,1,texH,cx+dx,cy-h/2,step+1,h);
    }
    ctx.restore();
  }

  function drawSeaSheen(cx,cy,r){
    const sheen=ctx.createRadialGradient(cx-r*.42,cy-r*.5,0,cx-r*.25,cy-r*.35,r*.95);
    sheen.addColorStop(0,'rgba(255,255,255,.28)');
    sheen.addColorStop(.22,'rgba(255,255,255,.10)');
    sheen.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=sheen;
    ctx.fillRect(cx-r,cy-r,r*2,r*2);
  }

  function drawContributionLights(cx,cy,r,rotation,t){
    const points=activitySpherePoints(levels.length);
    for(let i=0;i<points.length;i++){
      const level=levels[i]||0;
      if(level<=0)continue;
      const p=points[i];
      const projected=projectSphere(p.lat,p.lon+rotation,cx,cy,r*.92);
      if(projected.z<=.02)continue;

      const revealGate=(i+1)/points.length;
      if(reveal<revealGate*.72)continue;

      const color=palette[level];
      const twinkle=reduced?1:.86+Math.sin(t*1.45+i*.73)*.14;
      const radius=(1.8+level*.52)*(.45+.55*projected.z)*twinkle;
      ctx.save();
      ctx.globalAlpha=.58+.30*projected.z;
      ctx.shadowColor=hexAlpha(color,.48);
      ctx.shadowBlur=7+level*2.2;
      ctx.fillStyle=color;
      ctx.beginPath();
      ctx.arc(projected.x,projected.y,radius,0,Math.PI*2);
      ctx.fill();
      if(level>=4){
        ctx.globalAlpha=.8;
        ctx.fillStyle='rgba(255,255,255,.82)';
        ctx.beginPath();
        ctx.arc(projected.x-radius*.28,projected.y-radius*.3,Math.max(.65,radius*.2),0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawNightGlow(cx,cy,r,rotation,t){
    const factor=Math.min(1,activeDays/175);
    if(factor<=.08)return;
    const cities=[
      [35.7,139.7],[37.8,-122.4],[40.7,-74.0],[51.5,-.1],[48.9,2.3],
      [1.3,103.8],[19.1,72.9],[25.2,55.3],[-33.9,151.2],[-23.6,-46.6],
      [31.2,121.5],[37.6,127.0],[52.5,13.4],[30.0,31.2],[-1.3,36.8]
    ];
    cities.forEach(([latDeg,lonDeg],index)=>{
      const p=projectSphere(toRad(latDeg),toRad(lonDeg)+rotation,cx,cy,r*.94);
      if(p.z<=.08)return;
      const flicker=reduced?1:.76+Math.sin(t*1.9+index*1.7)*.24;
      const rr=(1.3+factor*1.8)*(.5+.5*p.z);
      ctx.save();
      ctx.globalAlpha=(.12+factor*.24)*flicker;
      ctx.shadowColor='rgba(255,214,90,.75)';
      ctx.shadowBlur=10;
      ctx.fillStyle='#ffd65a';
      ctx.beginPath();
      ctx.arc(p.x,p.y,rr,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawLimbShade(cx,cy,r){
    const shade=ctx.createLinearGradient(cx-r*.25,cy-r*.2,cx+r,cy+r*.15);
    shade.addColorStop(0,'rgba(9,36,80,0)');
    shade.addColorStop(.62,'rgba(9,36,80,.03)');
    shade.addColorStop(1,'rgba(7,31,72,.20)');
    ctx.fillStyle=shade;
    ctx.fillRect(cx-r,cy-r,r*2,r*2);
  }

  function drawOrbitAccent(scene,t){
    const angle=reduced?.4:t*.48;
    ctx.save();
    ctx.translate(scene.cx,scene.cy);
    ctx.rotate(-.16);
    ctx.strokeStyle='rgba(255,214,90,.17)';
    ctx.lineWidth=1.25;
    ctx.beginPath();
    ctx.ellipse(0,0,scene.r*1.54,scene.r*.37,0,0,Math.PI*2);
    ctx.stroke();
    const ox=Math.cos(angle)*scene.r*1.54;
    const oy=Math.sin(angle)*scene.r*.37;
    ctx.fillStyle='#ffd65a';
    ctx.shadowColor='rgba(255,214,90,.45)';
    ctx.shadowBlur=12;
    ctx.beginPath();
    ctx.arc(ox,oy,4.2,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  if(reduced)draw(performance.now());
  else requestAnimationFrame(draw);
});

async function loadContributionData(dayCount){
  const sources=[
    {name:'local-json',url:'assets/contributions.json'},
    {name:'branch-raw-json',url:'https://raw.githubusercontent.com/Fugu0141/Fugu0141.github.io/redesign-game-portfolio/assets/contributions.json'}
  ];

  for(const source of sources){
    try{
      const response=await fetch(source.url,{cache:'no-store'});
      if(!response.ok)continue;
      const data=await response.json();
      if(!isValidContributionData(data))continue;
      const levels=buildCalendarLevels(dayCount,data);
      return {
        levels,
        source:source.name,
        totalContributions:Number(data.totalContributions)||0,
        activeDays:levels.filter(level=>level>0).length
      };
    }catch(error){
      console.debug(`[Fugu Activity] ${source.name} failed`,error);
    }
  }

  const fallback=await loadEventFallback(dayCount);
  return {
    levels:fallback.levels,
    source:'public-events-fallback',
    totalContributions:fallback.total,
    activeDays:fallback.levels.filter(level=>level>0).length
  };
}

function isValidContributionData(data){
  if(!data||!Array.isArray(data.days)||data.days.length<300)return false;
  const valid=data.days.filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(String(day?.date||'')));
  return valid.length>=300&&valid.some(day=>(Number(day.count)||0)>0);
}

function buildCalendarLevels(dayCount,data){
  const byDate=new Map(data.days.map(day=>[day.date,day]));
  const positive=data.days.map(day=>Number(day.count)||0).filter(count=>count>0).sort((a,b)=>a-b);
  const hotThreshold=positive.length?positive[Math.floor((positive.length-1)*.90)]:Infinity;
  const end=parseDateOnly(data.to)||utcToday();
  const levels=[];
  for(let i=0;i<dayCount;i++){
    const d=new Date(end);
    d.setUTCDate(end.getUTCDate()-(dayCount-1-i));
    levels.push(calendarLevel(byDate.get(dateKey(d)),hotThreshold));
  }
  return levels;
}

function calendarLevel(day,hotThreshold){
  if(!day||(Number(day.count)||0)<=0)return 0;
  const count=Number(day.count)||0;
  if(day.level==='FIRST_QUARTILE')return 1;
  if(day.level==='SECOND_QUARTILE')return 2;
  if(day.level==='THIRD_QUARTILE')return 3;
  if(day.level==='FOURTH_QUARTILE')return count>=hotThreshold?5:4;
  if(count===1)return 1;
  if(count<=3)return 2;
  if(count<=6)return 3;
  if(count<=10)return 4;
  return 5;
}

async function loadEventFallback(dayCount){
  const counts=new Map();
  let total=0;
  for(let page=1;page<=3;page++){
    const response=await fetch(`https://api.github.com/users/Fugu0141/events/public?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)break;
    const events=await response.json();
    for(const event of events){
      const key=String(event.created_at||'').slice(0,10);
      if(!key)continue;
      const weight=eventWeight(event);
      total+=weight;
      counts.set(key,(counts.get(key)||0)+weight);
    }
    if(events.length<100)break;
  }
  const today=utcToday();
  const levels=[];
  for(let i=0;i<dayCount;i++){
    const d=new Date(today);
    d.setUTCDate(today.getUTCDate()-(dayCount-1-i));
    const n=counts.get(dateKey(d))||0;
    levels.push(n===0?0:n===1?1:n<=3?2:n<=6?3:n<=10?4:5);
  }
  return {levels,total};
}

function eventWeight(event){
  if(event.type==='PushEvent')return Math.max(1,Number(event.payload?.size)||event.payload?.commits?.length||1);
  if(event.type==='PullRequestEvent')return 3;
  if(event.type==='PullRequestReviewEvent')return 2;
  if(event.type==='IssuesEvent')return 2;
  if(event.type==='ForkEvent')return 2;
  return 1;
}

function createWorldTexture(){
  const canvas=document.createElement('canvas');
  canvas.width=1200;
  canvas.height=600;
  const c=canvas.getContext('2d');
  c.clearRect(0,0,canvas.width,canvas.height);

  const continents=[
    [[-168,72],[-150,61],[-136,56],[-126,49],[-119,34],[-105,22],[-88,18],[-80,26],[-66,45],[-60,54],[-84,65],[-110,72],[-140,73]],
    [[-82,13],[-69,8],[-52,-4],[-40,-18],[-49,-36],[-58,-54],[-70,-48],[-78,-22]],
    [[-73,82],[-28,80],[-20,67],[-47,59],[-68,67]],
    [[-11,36],[2,45],[15,56],[33,61],[45,52],[34,42],[18,36],[5,36]],
    [[-17,35],[10,37],[35,31],[49,12],[41,-24],[22,-35],[6,-29],[-9,-2]],
    [[34,59],[58,69],[95,76],[130,71],[165,57],[171,47],[153,35],[130,20],[108,7],[84,14],[65,29],[46,41]],
    [[112,-12],[143,-11],[154,-27],[141,-40],[116,-35]],
    [[46,-13],[51,-17],[50,-25],[45,-25],[43,-18]]
  ];

  c.fillStyle='rgba(241,248,242,.82)';
  c.strokeStyle='rgba(70,120,112,.10)';
  c.lineWidth=1.1;
  continents.forEach(poly=>{
    c.beginPath();
    poly.forEach(([lon,lat],index)=>{
      const x=(lon+180)/360*canvas.width;
      const y=(90-lat)/180*canvas.height;
      if(index===0)c.moveTo(x,y);else c.lineTo(x,y);
    });
    c.closePath();
    c.fill();
    c.stroke();
  });

  c.fillStyle='rgba(255,255,255,.12)';
  [[-101,46],[14,10],[79,37],[105,42],[134,-24]].forEach(([lon,lat])=>{
    const x=(lon+180)/360*canvas.width;
    const y=(90-lat)/180*canvas.height;
    c.beginPath();c.arc(x,y,22,0,Math.PI*2);c.fill();
  });
  return canvas;
}

function activitySpherePoints(count){
  const points=[];
  const golden=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<count;i++){
    const y=1-2*((i+.5)/count);
    points.push({lat:Math.asin(y),lon:wrapAngle(i*golden)});
  }
  return points;
}

function projectSphere(lat,lon,cx,cy,r){
  const cosLat=Math.cos(lat);
  const x=Math.sin(lon)*cosLat;
  const z=Math.cos(lon)*cosLat;
  const y=Math.sin(lat);
  return {x:cx+x*r,y:cy-y*r,z};
}

function activityToOceanDepth(total,activeDays){
  const totalScore=Math.log1p(Math.max(0,total))/Math.log1p(2200);
  const dayScore=Math.min(1,activeDays/210);
  return Math.max(.18,Math.min(1,totalScore*.74+dayScore*.26));
}

function layout(w,h){
  const r=Math.min(w,h)*.285;
  return {cx:w*.5,cy:h*.49,r};
}

function utcToday(){
  const now=new Date();
  return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
}

function parseDateOnly(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return null;
  const [y,m,d]=value.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d));
}

function dateKey(date){return date.toISOString().slice(0,10)}
function toRad(deg){return deg*Math.PI/180}
function wrapAngle(value){
  const two=Math.PI*2;
  let v=value%two;
  if(v<-Math.PI)v+=two;
  if(v>Math.PI)v-=two;
  return v;
}
function hexToRgb(hex){
  const n=parseInt(hex.replace('#',''),16);
  return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}
function mixColor(a,b,t){
  const c1=hexToRgb(a),c2=hexToRgb(b),m=Math.max(0,Math.min(1,t));
  const r=Math.round(c1.r+(c2.r-c1.r)*m);
  const g=Math.round(c1.g+(c2.g-c1.g)*m);
  const bb=Math.round(c1.b+(c2.b-c1.b)*m);
  return `rgb(${r},${g},${bb})`;
}
function hexAlpha(hex,a){
  const c=hexToRgb(hex);
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}
