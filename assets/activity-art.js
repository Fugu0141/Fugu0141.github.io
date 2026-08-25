document.addEventListener('DOMContentLoaded',()=>{
  const canvas=document.querySelector('[data-activity-art]');
  if(!canvas)return;

  const DAY_COUNT=365;
  const ctx=canvas.getContext('2d');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette=['#eee5e8','#f8dce6','#f4bfd1','#ee9cba','#e873a2','#d64f8d'];
  const blossomPoints=buildBlossomPoints();
  const fallingPetals=buildFallingPetals(16);

  let cssWidth=0,cssHeight=0,dpr=1;
  let levels=new Array(DAY_COUNT).fill(0);
  let activeDays=0;
  let totalContributions=0;
  let reveal=0;
  let dataReady=false;
  let pulse=0;
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
  canvas.addEventListener('pointerleave',()=>{
    pointer.active=false;
    if(reduced)draw(performance.now());
  });
  canvas.addEventListener('pointerdown',()=>{
    pulse=1;
    if(reduced)draw(performance.now());
  });

  loadContributionData(DAY_COUNT).then(result=>{
    levels=result.levels;
    activeDays=result.activeDays;
    totalContributions=result.totalContributions;
    dataReady=true;
    if(reduced)reveal=1;
    console.info(`[Fugu Activity] source=${result.source}, activeDays=${activeDays}/${DAY_COUNT}, total=${totalContributions}`);
    if(reduced)draw(performance.now());
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
      if(dataReady)reveal+=(1-reveal)*.026;
      pulse*=.91;
    }

    drawAmbient(scene,t);
    drawGround(scene);
    drawTree(scene,t);
    drawBlossoms(scene,t);
    drawFallingPetals(scene,t);

    if(!reduced)requestAnimationFrame(draw);
  }

  function drawAmbient(scene,t){
    const glow=ctx.createRadialGradient(scene.cx-scene.treeW*.18,scene.baseY-scene.treeH*.16,10,scene.cx-scene.treeW*.18,scene.baseY-scene.treeH*.16,scene.treeW*.72);
    glow.addColorStop(0,'rgba(244,191,209,.15)');
    glow.addColorStop(.55,'rgba(244,191,209,.035)');
    glow.addColorStop(1,'rgba(244,191,209,0)');
    ctx.fillStyle=glow;
    ctx.beginPath();
    ctx.arc(scene.cx-scene.treeW*.14,scene.baseY-scene.treeH*.28,scene.treeW*.64,0,Math.PI*2);
    ctx.fill();

    const circles=[[.10,.19,12,.2],[.17,.73,5,.8],[.86,.20,7,1.5],[.91,.66,10,2.1],[.76,.82,4,2.8]];
    ctx.save();
    ctx.strokeStyle='rgba(232,115,162,.075)';
    ctx.lineWidth=1.05;
    circles.forEach(([nx,ny,r,phase])=>{
      const dx=reduced?0:Math.sin(t*.31+phase)*4;
      const dy=reduced?0:Math.cos(t*.27+phase)*5;
      ctx.beginPath();
      ctx.arc(cssWidth*nx+dx,cssHeight*ny+dy,r,0,Math.PI*2);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawGround(scene){
    ctx.save();
    const shadow=ctx.createRadialGradient(scene.cx,scene.baseY+9,5,scene.cx,scene.baseY+9,scene.treeW*.26);
    shadow.addColorStop(0,'rgba(72,50,57,.095)');
    shadow.addColorStop(1,'rgba(72,50,57,0)');
    ctx.fillStyle=shadow;
    ctx.beginPath();
    ctx.ellipse(scene.cx,scene.baseY+12,scene.treeW*.27,scene.treeH*.035,0,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle='rgba(84,67,74,.08)';
    ctx.lineWidth=1.1;
    ctx.beginPath();
    ctx.moveTo(scene.cx-scene.treeW*.31,scene.baseY+4);
    ctx.quadraticCurveTo(scene.cx,scene.baseY-8,scene.cx+scene.treeW*.31,scene.baseY+3);
    ctx.stroke();
    ctx.restore();
  }

  function drawTree(scene,t){
    const wind=reduced?0:Math.sin(t*.63)*.0028;
    ctx.save();
    ctx.lineCap='round';
    ctx.lineJoin='round';

    const trunkWidth=Math.max(13,scene.treeW*.024);
    ctx.strokeStyle='#58454b';
    ctx.lineWidth=trunkWidth;
    ctx.beginPath();
    ctx.moveTo(px(scene,0),py(scene,0));
    ctx.bezierCurveTo(px(scene,-.018),py(scene,-.16),px(scene,.012),py(scene,-.36),px(scene,-.012),py(scene,-.515));
    ctx.stroke();

    ctx.strokeStyle='rgba(255,255,255,.13)';
    ctx.lineWidth=Math.max(1.5,trunkWidth*.12);
    ctx.beginPath();
    ctx.moveTo(px(scene,-.009),py(scene,-.02));
    ctx.bezierCurveTo(px(scene,-.022),py(scene,-.18),px(scene,-.002),py(scene,-.34),px(scene,-.018),py(scene,-.49));
    ctx.stroke();

    BRANCHES.forEach(branch=>{
      const flex=(Math.abs(branch.to[0])+.25)*wind;
      ctx.strokeStyle=branch.tone||'#58454b';
      ctx.lineWidth=Math.max(1.7,branch.width*scene.treeW/720);
      ctx.beginPath();
      ctx.moveTo(px(scene,branch.from[0]),py(scene,branch.from[1]));
      ctx.quadraticCurveTo(px(scene,branch.control[0]+flex*.45),py(scene,branch.control[1]),px(scene,branch.to[0]+flex),py(scene,branch.to[1]));
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawBlossoms(scene,t){
    const baseRadius=Math.max(4.6,Math.min(8.2,scene.treeW/108));
    const wind=reduced?0:Math.sin(t*.68)*scene.treeW*.0032;

    blossomPoints.forEach((point,index)=>{
      const level=levels[index]||0;
      const wave=clamp(reveal*1.42-index/blossomPoints.length*.42,0,1);
      const flex=.28+(-point.y)*.95;
      let x=px(scene,point.x)+wind*flex+Math.sin(t*.95+point.seed)*(.45+flex*.55);
      let y=py(scene,point.y)+Math.cos(t*.82+point.seed*.77)*(.35+flex*.45);
      let hover=0;

      if(pointer.active){
        const dx=x-pointer.x,dy=y-pointer.y;
        const dist=Math.hypot(dx,dy);
        if(dist<64&&dist>0){
          hover=(64-dist)/64;
          x+=dx/dist*hover*3.8;
          y+=dy/dist*hover*3.8;
        }
      }

      if(level===0||wave<.06){
        drawBud(x,y,baseRadius*(.32+hover*.12),point.seed);
        return;
      }

      const size=baseRadius*(.68+level*.095)*(easeOutBack(wave)+hover*.18+pulse*.05);
      drawSakura(x,y,size,palette[level],point.seed,t,level);
    });
  }

  function drawSakura(x,y,r,color,seed,t,level){
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(seed*.17+(reduced?0:Math.sin(t*.47+seed)*.045));
    ctx.shadowColor=hexAlpha(color,.18+level*.018);
    ctx.shadowBlur=6+level*1.1;
    ctx.fillStyle=color;

    for(let petal=0;petal<5;petal++){
      ctx.save();
      ctx.rotate(Math.PI*2*petal/5);
      ctx.beginPath();
      ctx.moveTo(0,-r*.04);
      ctx.bezierCurveTo(r*.12,-r*.52,r*.47,-r*.58,r*.61,-r*.24);
      ctx.bezierCurveTo(r*.73,r*.05,r*.40,r*.38,0,r*.19);
      ctx.bezierCurveTo(-r*.40,r*.38,-r*.73,r*.05,-r*.61,-r*.24);
      ctx.bezierCurveTo(-r*.47,-r*.58,-r*.12,-r*.52,0,-r*.04);
      ctx.fill();
      ctx.restore();
    }

    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,244,195,.88)';
    ctx.beginPath();
    ctx.arc(0,0,Math.max(1.2,r*.14),0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawBud(x,y,r,seed){
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(seed*.31);
    ctx.fillStyle='#eee5e8';
    ctx.strokeStyle='rgba(88,69,75,.24)';
    ctx.lineWidth=.8;
    ctx.beginPath();
    ctx.moveTo(0,-r);
    ctx.quadraticCurveTo(r*.9,-r*.15,0,r*.88);
    ctx.quadraticCurveTo(-r*.9,-r*.15,0,-r);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawFallingPetals(scene,t){
    const strength=.12+Math.min(1,activeDays/180)*.20;
    fallingPetals.forEach((petal,index)=>{
      const cycle=cssHeight+130;
      const y=((petal.y+t*petal.fall)%cycle)-65;
      const x=((petal.x+t*petal.drift+Math.sin(t*petal.wave+petal.phase)*17)%(cssWidth+120))-60;
      const rr=2.6+petal.size*1.8;
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(petal.rotation+(reduced?0:t*petal.spin));
      ctx.globalAlpha=strength*(.72+.28*Math.sin(t*.7+index));
      ctx.fillStyle=index%3===0?'#e873a2':'#f4bfd1';
      ctx.beginPath();
      ctx.moveTo(0,-rr);
      ctx.bezierCurveTo(rr*.95,-rr*.72,rr*.85,rr*.45,0,rr);
      ctx.bezierCurveTo(-rr*.82,rr*.35,-rr*.88,-rr*.58,0,-rr);
      ctx.fill();
      ctx.restore();
    });
  }

  if(reduced)draw(performance.now());
  else requestAnimationFrame(draw);
});

const BRANCHES=[
  {from:[-.006,-.23],control:[-.15,-.32],to:[-.31,-.43],width:9},
  {from:[-.004,-.29],control:[.15,-.36],to:[.34,-.45],width:9},
  {from:[-.012,-.39],control:[-.12,-.49],to:[-.26,-.60],width:7.5},
  {from:[-.008,-.42],control:[.11,-.51],to:[.27,-.62],width:7.5},
  {from:[-.014,-.49],control:[-.045,-.62],to:[-.025,-.74],width:6.3},
  {from:[-.18,-.35],control:[-.30,-.38],to:[-.42,-.40],width:4.4,tone:'rgba(88,69,75,.90)'},
  {from:[-.22,-.47],control:[-.32,-.54],to:[-.40,-.58],width:4.1,tone:'rgba(88,69,75,.90)'},
  {from:[-.15,-.52],control:[-.20,-.64],to:[-.28,-.69],width:3.6,tone:'rgba(88,69,75,.88)'},
  {from:[-.08,-.57],control:[-.10,-.68],to:[-.11,-.76],width:3.4,tone:'rgba(88,69,75,.86)'},
  {from:[.18,-.37],control:[.30,-.39],to:[.43,-.42],width:4.4,tone:'rgba(88,69,75,.90)'},
  {from:[.22,-.49],control:[.33,-.54],to:[.41,-.59],width:4.1,tone:'rgba(88,69,75,.90)'},
  {from:[.15,-.54],control:[.20,-.66],to:[.28,-.70],width:3.7,tone:'rgba(88,69,75,.88)'},
  {from:[.07,-.58],control:[.08,-.70],to:[.13,-.77],width:3.3,tone:'rgba(88,69,75,.86)'},
  {from:[-.25,-.42],control:[-.29,-.48],to:[-.33,-.52],width:2.8,tone:'rgba(88,69,75,.82)'},
  {from:[.28,-.44],control:[.31,-.50],to:[.35,-.53],width:2.8,tone:'rgba(88,69,75,.82)'},
  {from:[-.035,-.65],control:[.02,-.71],to:[.05,-.79],width:2.7,tone:'rgba(88,69,75,.82)'}
];

const BLOSSOM_PATHS=[
  {from:[-.08,-.47],control:[-.22,-.54],to:[-.39,-.59],spread:.045,count:40},
  {from:[-.15,-.43],control:[-.29,-.45],to:[-.43,-.46],spread:.042,count:34},
  {from:[-.10,-.55],control:[-.18,-.65],to:[-.29,-.70],spread:.041,count:34},
  {from:[-.04,-.57],control:[-.08,-.68],to:[-.04,-.78],spread:.038,count:36},
  {from:[.04,-.56],control:[.10,-.67],to:[.18,-.75],spread:.039,count:36},
  {from:[.09,-.49],control:[.24,-.56],to:[.40,-.60],spread:.045,count:40},
  {from:[.16,-.42],control:[.30,-.45],to:[.44,-.46],spread:.042,count:34},
  {from:[-.06,-.39],control:[-.20,-.39],to:[-.34,-.37],spread:.040,count:29},
  {from:[.05,-.37],control:[.19,-.37],to:[.34,-.34],spread:.040,count:28},
  {from:[-.03,-.31],control:[-.14,-.31],to:[-.25,-.29],spread:.034,count:20},
  {from:[.03,-.30],control:[.13,-.31],to:[.25,-.28],spread:.034,count:20},
  {from:[-.01,-.62],control:[.00,-.72],to:[.03,-.81],spread:.030,count:14}
];

function buildBlossomPoints(){
  const points=[];
  let serial=1;
  BLOSSOM_PATHS.forEach(path=>{
    for(let i=0;i<path.count;i++){
      const base=(i+.45)/path.count;
      const u=clamp(base+(seeded(serial*7)-.5)/path.count*.72,.01,.99);
      const q=quadraticPoint(path.from,path.control,path.to,u);
      const tangent=quadraticTangent(path.from,path.control,path.to,u);
      const len=Math.hypot(tangent[0],tangent[1])||1;
      const normal=[-tangent[1]/len,tangent[0]/len];
      const spread=(seeded(serial*13)-.5)*2*path.spread*(.58+u*.65);
      const along=(seeded(serial*19)-.5)*path.spread*.45;
      points.push({
        x:q[0]+normal[0]*spread+tangent[0]/len*along,
        y:q[1]+normal[1]*spread+tangent[1]/len*along,
        seed:seeded(serial*29)*20+serial*.07
      });
      serial++;
    }
  });

  for(let i=points.length-1;i>0;i--){
    const j=Math.floor(seeded(i*97+11)*(i+1));
    [points[i],points[j]]=[points[j],points[i]];
  }
  return points.slice(0,365);
}

function buildFallingPetals(count){
  const petals=[];
  for(let i=0;i<count;i++){
    petals.push({
      x:seeded(i*31+3)*1400,
      y:seeded(i*47+5)*760,
      fall:12+seeded(i*59+7)*15,
      drift:5+seeded(i*71+9)*10,
      wave:.52+seeded(i*83+13)*.55,
      phase:seeded(i*89+17)*Math.PI*2,
      rotation:seeded(i*101+19)*Math.PI*2,
      spin:.18+seeded(i*107+23)*.40,
      size:seeded(i*113+29)
    });
  }
  return petals;
}

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
      const result=buildCalendarLevels(dayCount,data);
      return {levels:result.levels,source:source.name,totalContributions:Number(data.totalContributions)||result.total,activeDays:result.activeDays};
    }catch(error){
      console.debug(`[Fugu Activity] ${source.name} failed`,error);
    }
  }

  const fallback=await loadEventFallback(dayCount);
  return {levels:fallback.levels,source:'public-events-fallback',totalContributions:fallback.totalContributions,activeDays:fallback.levels.filter(level=>level>0).length};
}

function isValidContributionData(data){
  if(!data||!Array.isArray(data.days)||data.days.length<300)return false;
  const validDays=data.days.filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(String(day?.date||'')));
  return validDays.length>=300&&validDays.some(day=>(Number(day.count)||0)>0);
}

function buildCalendarLevels(dayCount,data){
  const byDate=new Map(data.days.map(day=>[day.date,day]));
  const positive=data.days.map(day=>Number(day.count)||0).filter(count=>count>0).sort((a,b)=>a-b);
  const hotThreshold=positive.length?positive[Math.floor((positive.length-1)*.90)]:Infinity;
  const end=parseDateOnly(data.to)||utcToday();
  const levels=[];
  let total=0,activeDays=0;

  for(let i=0;i<dayCount;i++){
    const date=new Date(end);
    date.setUTCDate(end.getUTCDate()-(dayCount-1-i));
    const day=byDate.get(dateKey(date));
    const count=Number(day?.count)||0;
    if(count>0){total+=count;activeDays++}
    levels.push(calendarLevel(day,hotThreshold));
  }
  return {levels,total,activeDays};
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
  for(let page=1;page<=3;page++){
    const response=await fetch(`https://api.github.com/users/Fugu0141/events/public?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)break;
    const events=await response.json();
    if(!Array.isArray(events)||events.length===0)break;
    for(const event of events){
      const key=String(event.created_at||'').slice(0,10);
      if(!key)continue;
      counts.set(key,(counts.get(key)||0)+eventWeight(event));
    }
    if(events.length<100)break;
  }

  const now=utcToday();
  const levels=[];
  let totalContributions=0;
  for(let i=0;i<dayCount;i++){
    const date=new Date(now);
    date.setUTCDate(now.getUTCDate()-(dayCount-1-i));
    const n=counts.get(dateKey(date))||0;
    totalContributions+=n;
    levels.push(n===0?0:n===1?1:n<=3?2:n<=6?3:n<=10?4:5);
  }
  return {levels,totalContributions};
}

function eventWeight(event){
  if(event.type==='PushEvent')return Math.max(1,Number(event.payload?.size)||event.payload?.commits?.length||1);
  if(event.type==='PullRequestEvent')return 3;
  if(event.type==='PullRequestReviewEvent')return 2;
  if(event.type==='IssuesEvent')return 2;
  if(event.type==='ForkEvent')return 2;
  return 1;
}

function layout(w,h){
  return {cx:w*.5,baseY:h*.875,treeW:Math.min(w*.91,h*1.22),treeH:h*.80};
}
function px(scene,x){return scene.cx+x*scene.treeW}
function py(scene,y){return scene.baseY+y*scene.treeH}
function quadraticPoint(a,c,b,t){const m=1-t;return [m*m*a[0]+2*m*t*c[0]+t*t*b[0],m*m*a[1]+2*m*t*c[1]+t*t*b[1]]}
function quadraticTangent(a,c,b,t){return [2*(1-t)*(c[0]-a[0])+2*t*(b[0]-c[0]),2*(1-t)*(c[1]-a[1])+2*t*(b[1]-c[1])]}
function seeded(n){const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x)}
function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)}
function utcToday(){const now=new Date();return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()))}
function parseDateOnly(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return null;const [y,m,d]=value.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))}
function dateKey(date){return date.toISOString().slice(0,10)}
function hexAlpha(hex,a){const n=parseInt(hex.replace('#',''),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`}
