document.addEventListener('DOMContentLoaded',()=>{
  const canvas=document.querySelector('[data-activity-art]');
  if(!canvas)return;

  const DAY_COUNT=365;
  const ctx=canvas.getContext('2d');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette=['#e8f1f3','#70d5df','#5d84ea','#9278ef','#ff7a72','#ffd65a'];
  const landDots=buildLandDots();
  const activityPoints=buildActivitySphere(DAY_COUNT);

  let cssWidth=0,cssHeight=0,dpr=1;
  let levels=new Array(DAY_COUNT).fill(0);
  let totalContributions=0;
  let activeDays=0;
  let oceanDepth=.28;
  let targetOceanDepth=.28;
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
      reveal+=(1-reveal)*.028;
      if(!drag){
        manualRotation+=spinVelocity;
        spinVelocity*=.965;
      }
      pulse*=.92;
    }

    drawAmbient(scene,t);
    drawOrbitBack(scene,t);
    drawPlanet(scene,t);
    drawOrbitFront(scene,t);

    if(!reduced)requestAnimationFrame(draw);
  }

  function drawAmbient(scene,t){
    const glow=ctx.createRadialGradient(scene.cx,scene.cy+scene.r*.72,10,scene.cx,scene.cy+scene.r*.72,scene.r*2.15);
    glow.addColorStop(0,'rgba(105,215,221,.15)');
    glow.addColorStop(.48,'rgba(105,215,221,.045)');
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
    ctx.strokeStyle='rgba(105,215,221,.14)';
    ctx.lineWidth=1.1;
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
    const autoRotation=reduced?0:t*.075;
    const rotation=autoRotation+manualRotation;
    const hover=pointer.active?Math.max(0,1-Math.hypot(pointer.x-scene.cx,pointer.y-scene.cy)/(scene.r*1.35)):0;
    const bob=reduced?0:Math.sin(t*.62)*3;
    const cy=scene.cy+bob;
    const r=scene.r*(1+hover*.012+pulse*.014);

    ctx.save();
    ctx.fillStyle='rgba(22,70,106,.10)';
    ctx.filter='blur(10px)';
    ctx.beginPath();
    ctx.ellipse(scene.cx,cy+r*1.16,r*.76,r*.12,0,0,Math.PI*2);
    ctx.fill();
    ctx.filter='none';
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(scene.cx,cy,r,0,Math.PI*2);
    ctx.clip();

    drawOcean(scene.cx,cy,r);
    drawSeaCurrents(scene.cx,cy,r,t);
    drawLand(scene.cx,cy,r,rotation);
    drawContributionLights(scene.cx,cy,r,rotation,t);
    drawSphereLight(scene.cx,cy,r);
    ctx.restore();

    const atmosphere=ctx.createRadialGradient(scene.cx-r*.3,cy-r*.35,r*.08,scene.cx,cy,r*1.08);
    atmosphere.addColorStop(0,'rgba(255,255,255,.12)');
    atmosphere.addColorStop(.73,'rgba(255,255,255,.015)');
    atmosphere.addColorStop(1,'rgba(83,151,229,.16)');
    ctx.fillStyle=atmosphere;
    ctx.beginPath();
    ctx.arc(scene.cx,cy,r*1.018,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle='rgba(38,105,170,.14)';
    ctx.lineWidth=2.2;
    ctx.beginPath();
    ctx.arc(scene.cx,cy,r-1,0,Math.PI*2);
    ctx.stroke();

    if(pulse>.002&&!reduced){
      ctx.strokeStyle=`rgba(255,214,90,${.20*pulse})`;
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(scene.cx,cy,r+10+(1-pulse)*28,0,Math.PI*2);
      ctx.stroke();
    }
  }

  function drawOcean(cx,cy,r){
    const light=mixColor('#eaf9fb','#63cae7',oceanDepth);
    const middle=mixColor('#dcf3f7','#348fdf',oceanDepth);
    const deep=mixColor('#cceaf2','#205fc4',oceanDepth);
    const ocean=ctx.createLinearGradient(cx-r*.9,cy-r*.9,cx+r*.8,cy+r*.85);
    ocean.addColorStop(0,light);
    ocean.addColorStop(.48,middle);
    ocean.addColorStop(1,deep);
    ctx.fillStyle=ocean;
    ctx.fillRect(cx-r,cy-r,r*2,r*2);
  }

  function drawSeaCurrents(cx,cy,r,t){
    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,.065)';
    ctx.lineWidth=Math.max(1,r*.006);
    ctx.lineCap='round';
    const drift=reduced?0:Math.sin(t*.32)*r*.02;
    const curves=[
      [-.88,-.24,-.28,-.38,.32,-.08,.86,-.18],
      [-.82,.18,-.30,.02,.30,.32,.82,.15],
      [-.58,.52,-.18,.38,.26,.58,.62,.46]
    ];
    curves.forEach(c=>{
      ctx.beginPath();
      ctx.moveTo(cx+c[0]*r+drift,cy+c[1]*r);
      ctx.bezierCurveTo(cx+c[2]*r,cy+c[3]*r,cx+c[4]*r,cy+c[5]*r,cx+c[6]*r-drift,cy+c[7]*r);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawLand(cx,cy,r,rotation){
    for(const dot of landDots){
      const p=projectSphere(dot.lat,dot.lon+rotation,cx,cy,r*.965);
      if(p.z<=.035)continue;
      const edge=Math.min(1,(p.z-.035)/.20);
      const rr=(1.6+dot.size*.75)*(.56+.44*p.z);
      ctx.save();
      ctx.globalAlpha=(.34+.42*p.z)*edge;
      ctx.fillStyle='#eef5df';
      ctx.beginPath();
      ctx.arc(p.x,p.y,rr,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawContributionLights(cx,cy,r,rotation,t){
    for(let i=0;i<activityPoints.length;i++){
      const level=levels[i]||0;
      if(level<=0)continue;
      const point=activityPoints[i];
      const p=projectSphere(point.lat,point.lon+rotation,cx,cy,r*.93);
      if(p.z<=.10)continue;

      const revealGate=(i+1)/activityPoints.length;
      if(reveal<revealGate*.72)continue;

      const color=palette[level];
      const twinkle=reduced?1:.90+Math.sin(t*1.45+i*.73)*.10;
      const radius=(1.55+level*.48)*(.50+.50*p.z)*twinkle;
      ctx.save();
      ctx.globalAlpha=(.48+.34*p.z)*Math.min(1,(p.z-.10)/.22);
      ctx.shadowColor=hexAlpha(color,.38);
      ctx.shadowBlur=6+level*1.8;
      ctx.fillStyle=color;
      ctx.beginPath();
      ctx.arc(p.x,p.y,radius,0,Math.PI*2);
      ctx.fill();
      if(level>=4){
        ctx.globalAlpha=.70;
        ctx.fillStyle='rgba(255,255,255,.82)';
        ctx.beginPath();
        ctx.arc(p.x-radius*.28,p.y-radius*.3,Math.max(.6,radius*.18),0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawSphereLight(cx,cy,r){
    const highlight=ctx.createRadialGradient(cx-r*.42,cy-r*.48,0,cx-r*.28,cy-r*.36,r*.94);
    highlight.addColorStop(0,'rgba(255,255,255,.25)');
    highlight.addColorStop(.25,'rgba(255,255,255,.09)');
    highlight.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=highlight;
    ctx.fillRect(cx-r,cy-r,r*2,r*2);

    const shade=ctx.createLinearGradient(cx-r*.1,cy-r*.15,cx+r,cy+r*.1);
    shade.addColorStop(0,'rgba(13,62,121,0)');
    shade.addColorStop(.72,'rgba(13,62,121,.025)');
    shade.addColorStop(1,'rgba(13,62,121,.13)');
    ctx.fillStyle=shade;
    ctx.fillRect(cx-r,cy-r,r*2,r*2);
  }

  function drawOrbitBack(scene,t){
    ctx.save();
    ctx.translate(scene.cx,scene.cy);
    ctx.rotate(-.14);
    ctx.strokeStyle='rgba(255,214,90,.075)';
    ctx.lineWidth=1.05;
    ctx.beginPath();
    ctx.ellipse(0,0,scene.r*1.48,scene.r*.34,0,Math.PI,Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  function drawOrbitFront(scene,t){
    const angle=reduced?.45:t*.42;
    ctx.save();
    ctx.translate(scene.cx,scene.cy);
    ctx.rotate(-.14);
    ctx.strokeStyle='rgba(255,214,90,.12)';
    ctx.lineWidth=1.05;
    ctx.beginPath();
    ctx.ellipse(0,0,scene.r*1.48,scene.r*.34,0,0,Math.PI);
    ctx.stroke();

    const ox=Math.cos(angle)*scene.r*1.48;
    const oy=Math.sin(angle)*scene.r*.34;
    if(Math.sin(angle)>=0){
      ctx.fillStyle='#ffd65a';
      ctx.shadowColor='rgba(255,214,90,.38)';
      ctx.shadowBlur=9;
      ctx.beginPath();
      ctx.arc(ox,oy,3.4,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  if(reduced)draw(performance.now());
  else requestAnimationFrame(draw);
});

const LAND_POLYGONS=[
  [[-168,72],[-145,70],[-132,60],[-124,52],[-118,43],[-105,31],[-96,20],[-83,10],[-78,23],[-88,32],[-101,38],[-112,50],[-128,58],[-150,61]],
  [[-81,13],[-68,9],[-55,2],[-48,-10],[-43,-23],[-54,-39],[-68,-55],[-77,-37],[-79,-18]],
  [[-10,70],[18,72],[45,68],[72,61],[102,67],[135,58],[160,47],[148,34],[122,23],[105,8],[80,8],[66,22],[48,29],[31,42],[12,45],[-4,55]],
  [[-17,35],[4,37],[24,32],[41,16],[43,2],[34,-20],[20,-35],[5,-31],[-8,-12],[-15,8]],
  [[112,-11],[130,-10],[151,-22],[153,-34],[135,-44],[116,-35]],
  [[-52,83],[-30,78],[-20,68],[-42,60],[-58,67]],
  [[129,31],[143,44],[146,35],[137,30]],
  [[47,-13],[51,-16],[50,-25],[45,-23]]
];

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
  return !!data&&Array.isArray(data.days)&&data.days.length>=300&&data.days.some(day=>(Number(day.count)||0)>0);
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
      counts.set(key,(counts.get(key)||0)+weight);
      total+=weight;
    }
    if(events.length<100)break;
  }
  const now=utcToday();
  const levels=[];
  for(let i=0;i<dayCount;i++){
    const d=new Date(now);
    d.setUTCDate(now.getUTCDate()-(dayCount-1-i));
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

function activityToOceanDepth(total,active){
  const totalFactor=Math.min(1,Math.log1p(Math.max(0,total))/Math.log(1501));
  const activeFactor=Math.min(1,Math.max(0,active)/220);
  return clamp(.27+totalFactor*.46+activeFactor*.17,.27,.90);
}

function buildActivitySphere(count){
  const points=[];
  const golden=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<count;i++){
    const y=1-(i/(Math.max(1,count-1)))*2;
    const lat=Math.asin(clamp(y,-1,1));
    const lon=wrapAngle(i*golden-Math.PI);
    points.push({lat,lon});
  }
  return points;
}

function buildLandDots(){
  const dots=[];
  for(let lat=-58;lat<=78;lat+=5){
    for(let lon=-175;lon<=175;lon+=5){
      if(!LAND_POLYGONS.some(poly=>pointInPolygon(lon,lat,poly)))continue;
      const jitterLon=(hash01(lon*13+lat*7)-.5)*2.2;
      const jitterLat=(hash01(lon*5-lat*11+17)-.5)*1.8;
      dots.push({
        lon:toRad(lon+jitterLon),
        lat:toRad(lat+jitterLat),
        size:.35+hash01(lon*19+lat*23)*.85
      });
    }
  }
  return dots;
}

function pointInPolygon(lon,lat,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i][0],yi=poly[i][1];
    const xj=poly[j][0],yj=poly[j][1];
    const intersect=((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/((yj-yi)||1e-9)+xi);
    if(intersect)inside=!inside;
  }
  return inside;
}

function projectSphere(lat,lon,cx,cy,r){
  const tilt=toRad(-9);
  const cosLat=Math.cos(lat),sinLat=Math.sin(lat);
  const sinLon=Math.sin(lon),cosLon=Math.cos(lon);
  const x=cosLat*sinLon;
  const y=sinLat*Math.cos(tilt)-cosLat*cosLon*Math.sin(tilt);
  const z=sinLat*Math.sin(tilt)+cosLat*cosLon*Math.cos(tilt);
  return {x:cx+x*r,y:cy-y*r,z};
}

function layout(w,h){
  const r=Math.min(w,h)*.305;
  return {cx:w*.5,cy:h*.49,r};
}

function parseDateOnly(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return null;
  const [y,m,d]=value.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d));
}

function utcToday(){
  const now=new Date();
  return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
}

function dateKey(date){return date.toISOString().slice(0,10)}
function toRad(value){return value*Math.PI/180}
function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
function wrapAngle(value){
  const two=Math.PI*2;
  return ((value+Math.PI)%two+two)%two-Math.PI;
}
function hash01(value){
  const x=Math.sin(value*12.9898+78.233)*43758.5453;
  return x-Math.floor(x);
}
function mixColor(a,b,t){
  const c1=hexToRgb(a),c2=hexToRgb(b),p=clamp(t,0,1);
  return `rgb(${Math.round(c1.r+(c2.r-c1.r)*p)},${Math.round(c1.g+(c2.g-c1.g)*p)},${Math.round(c1.b+(c2.b-c1.b)*p)})`;
}
function hexToRgb(hex){
  const n=parseInt(hex.replace('#',''),16);
  return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}
function hexAlpha(hex,a){
  const c=hexToRgb(hex);
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}
