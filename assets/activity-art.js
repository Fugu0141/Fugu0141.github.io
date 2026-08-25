document.addEventListener('DOMContentLoaded',()=>{
  const canvas=document.querySelector('[data-activity-art]');
  if(!canvas)return;

  const DAY_COUNT=365;
  const ctx=canvas.getContext('2d');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette=['#e5eff2','#69d7dd','#5d84ea','#9a7df2','#ff766e','#ffd65a'];
  const points=buildFishPoints(DAY_COUNT);
  let dailyLevels=new Array(points.length).fill(0);
  let cssWidth=0,cssHeight=0,dpr=1;
  let pointer={x:-9999,y:-9999,active:false};
  let pulse=0;
  const start=performance.now();

  resize();
  const ro=new ResizeObserver(()=>{resize();if(reduced)draw(performance.now())});
  ro.observe(canvas);

  canvas.addEventListener('pointermove',e=>{
    const r=canvas.getBoundingClientRect();
    pointer.x=e.clientX-r.left;
    pointer.y=e.clientY-r.top;
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

  loadContributionLevels(DAY_COUNT).then(result=>{
    dailyLevels=result.levels;
    console.info(`[Fugu Activity] source=${result.source}, activeDays=${result.activeDays}/${DAY_COUNT}`);
    if(reduced)draw(performance.now());
  }).catch(error=>{
    console.warn('[Fugu Activity] contribution data could not be loaded',error);
  });

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
    const art=layout(cssWidth,cssHeight);
    drawWater(ctx,art,t);
    drawFish(ctx,art,t);
    if(!reduced){
      pulse*=.925;
      requestAnimationFrame(draw);
    }
  }

  function drawWater(ctx,art,t){
    const bubbles=[
      [.10,.24,7,.3],[.15,.72,4,.5],[.84,.20,5,.9],[.91,.65,9,1.2],
      [.76,.82,3,1.8],[.31,.16,3,2.2],[.62,.12,5,2.8],[.23,.86,6,3.4]
    ];
    ctx.save();
    bubbles.forEach(([nx,ny,r,phase])=>{
      const x=art.x+art.w*nx+(reduced?0:Math.sin(t*.55+phase)*4);
      const y=art.y+art.h*ny+(reduced?0:Math.cos(t*.42+phase)*7);
      ctx.strokeStyle='rgba(105,215,221,.20)';
      ctx.lineWidth=1.2;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    });
    ctx.restore();
  }

  function drawFish(ctx,art,t){
    const bodyBob=reduced?0:Math.sin(t*.9)*3.1;
    const baseRadius=Math.max(3.6,Math.min(7.4,art.w/188));

    points.forEach((p,i)=>{
      const level=dailyLevels[i]||0;
      let x=art.x+p.nx*art.w;
      let y=art.y+p.ny*art.h+bodyBob;

      if(p.tail&&!reduced){
        const tailPower=Math.max(0,(.34-p.nx)/.30);
        y+=Math.sin(t*2.05+p.ny*13)*tailPower*6.5;
      }

      let scale=1+(level*.035);
      if(!reduced)scale+=Math.sin(t*1.35+i*.41)*.018;

      if(pointer.active){
        const dx=x-pointer.x,dy=y-pointer.y;
        const dist=Math.hypot(dx,dy);
        if(dist<70&&dist>0){
          const f=(70-dist)/70;
          x+=dx/dist*f*5.4;
          y+=dy/dist*f*5.4;
          scale+=f*.40;
        }
      }

      if(pulse>.002&&!reduced){
        const dx=x-(art.x+art.w*.60),dy=y-(art.y+art.h*.5);
        const phase=Math.hypot(dx,dy)*.032;
        scale+=Math.sin(t*8.5-phase)*pulse*.18;
      }

      const r=baseRadius*scale;
      ctx.save();
      ctx.shadowColor=level>0?hexAlpha(palette[level],level>=4?.32:.20):'transparent';
      ctx.shadowBlur=level>0?6+level*1.7:0;
      ctx.fillStyle=palette[level];
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();

      if(level>=3){
        ctx.fillStyle='rgba(255,255,255,.66)';
        ctx.beginPath();ctx.arc(x-r*.28,y-r*.32,Math.max(.8,r*.13),0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    });

    const eyeX=art.x+art.w*.80,eyeY=art.y+art.h*.42+bodyBob;
    ctx.fillStyle='#17191f';ctx.beginPath();ctx.arc(eyeX,eyeY,baseRadius*1.35,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(eyeX-baseRadius*.38,eyeY-baseRadius*.42,baseRadius*.36,0,Math.PI*2);ctx.fill();

    const mouthX=art.x+art.w*.923,mouthY=art.y+art.h*.54+bodyBob;
    ctx.strokeStyle='rgba(23,25,31,.58)';ctx.lineWidth=Math.max(1.3,baseRadius*.20);ctx.lineCap='round';
    ctx.beginPath();ctx.arc(mouthX,mouthY,baseRadius*1.05,-.76,.76);ctx.stroke();
  }

  if(reduced)draw(performance.now());
  else requestAnimationFrame(draw);
});

async function loadContributionLevels(dayCount){
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
        activeDays:levels.filter(level=>level>0).length
      };
    }catch(error){
      console.debug(`[Fugu Activity] ${source.name} failed`,error);
    }
  }

  const levels=await loadEventFallback(dayCount);
  return {
    levels,
    source:'public-events-fallback',
    activeDays:levels.filter(level=>level>0).length
  };
}

function isValidContributionData(data){
  if(!data||!Array.isArray(data.days)||data.days.length<300)return false;
  const validDays=data.days.filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(String(day?.date||'')));
  if(validDays.length<300)return false;
  return validDays.some(day=>(Number(day.count)||0)>0);
}

function buildCalendarLevels(dayCount,data){
  const byDate=new Map(data.days.map(day=>[day.date,day]));
  const positive=data.days
    .map(day=>Number(day.count)||0)
    .filter(count=>count>0)
    .sort((a,b)=>a-b);
  const hotThreshold=positive.length?positive[Math.floor((positive.length-1)*.90)]:Infinity;

  const end=parseDateOnly(data.to)||utcToday();
  const levels=[];
  for(let i=0;i<dayCount;i++){
    const d=new Date(end);
    d.setUTCDate(end.getUTCDate()-(dayCount-1-i));
    const day=byDate.get(dateKey(d));
    levels.push(calendarLevel(day,hotThreshold));
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
  for(let page=1;page<=3;page++){
    const response=await fetch(`https://api.github.com/users/Fugu0141/events/public?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)throw new Error('GitHub API');
    const events=await response.json();
    for(const event of events){
      const key=String(event.created_at||'').slice(0,10);
      if(!key)continue;
      counts.set(key,(counts.get(key)||0)+eventWeight(event));
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
  return levels;
}

function eventWeight(event){
  if(event.type==='PushEvent')return Math.max(1,Number(event.payload?.size)||event.payload?.commits?.length||1);
  if(event.type==='PullRequestEvent')return 3;
  if(event.type==='PullRequestReviewEvent')return 2;
  if(event.type==='IssuesEvent')return 2;
  if(event.type==='ForkEvent')return 2;
  return 1;
}

function buildFishPoints(targetCount){
  const cols=49,rows=29,candidates=[];
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      const body=Math.pow((x-32)/16.2,2)+Math.pow((y-14)/10.3,2)<=1;
      const tail=x>=2&&x<=17&&Math.abs(y-14)<=((17-x)*.48+1.25);
      const topFin=x>=22&&x<=31&&y>=1&&y<=Math.round(6-(x-22)*.48);
      const bottomFin=x>=22&&x<=31&&y<=27&&y>=Math.round(22+(x-22)*.48);
      const cheek=x>=44&&x<=47&&Math.abs(y-14)<=4;
      if(body||tail||topFin||bottomFin||cheek)candidates.push({x,y,tail:x<18});
    }
  }

  candidates.sort((a,b)=>a.x-b.x||(a.x%2===0?a.y-b.y:b.y-a.y));
  const picked=[];
  if(candidates.length<=targetCount){
    picked.push(...candidates);
  }else{
    for(let i=0;i<targetCount;i++){
      const index=Math.round(i*(candidates.length-1)/(targetCount-1));
      picked.push(candidates[index]);
    }
  }

  return picked.map(p=>({
    nx:.055+(p.x/(cols-1))*.875,
    ny:.095+(p.y/(rows-1))*.81,
    tail:p.tail
  }));
}

function layout(w,h){
  const margin=Math.min(w,h)*.055;
  return{x:margin,y:margin,w:w-margin*2,h:h-margin*2};
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

function hexAlpha(hex,a){
  const h=hex.replace('#','');
  const n=parseInt(h,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
