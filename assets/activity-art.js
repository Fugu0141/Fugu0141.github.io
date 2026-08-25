document.addEventListener('DOMContentLoaded',()=>{
  const canvas=document.querySelector('[data-activity-art]');
  if(!canvas)return;

  const ctx=canvas.getContext('2d');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette=['#dcecf1','#69d7dd','#5d84ea','#9a7df2','#ff766e','#ffd65a'];
  const points=buildFishPoints();
  let dailyLevels=new Array(points.length).fill(0);
  let cssWidth=0,cssHeight=0,dpr=1;
  let pointer={x:-9999,y:-9999,active:false};
  let pulse=0;
  const start=performance.now();

  resize();
  const ro=new ResizeObserver(()=>{resize();if(reduced)draw(performance.now())});ro.observe(canvas);

  canvas.addEventListener('pointermove',e=>{
    const r=canvas.getBoundingClientRect();
    pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;pointer.active=true;
    if(reduced)draw(performance.now());
  });
  canvas.addEventListener('pointerleave',()=>{pointer.active=false;if(reduced)draw(performance.now())});
  canvas.addEventListener('pointerdown',()=>{pulse=1;if(reduced)draw(performance.now())});

  loadActivity(points.length).then(counts=>{
    dailyLevels=buildLevels(points.length,counts);
    if(reduced)draw(performance.now());
  }).catch(()=>{});

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
    const art=layout(cssWidth,cssHeight);
    drawWater(ctx,art,t);
    drawFish(ctx,art,t);
    if(!reduced){pulse*=.925;requestAnimationFrame(draw)}
  }

  function drawWater(ctx,art,t){
    const bubbles=[
      [.12,.27,7,.3],[.18,.72,4,.5],[.83,.22,5,.9],[.89,.66,9,1.2],[.76,.79,3,1.8],[.29,.18,3,2.2]
    ];
    ctx.save();
    bubbles.forEach(([nx,ny,r,phase])=>{
      const x=art.x+art.w*nx+(reduced?0:Math.sin(t*.55+phase)*4);
      const y=art.y+art.h*ny+(reduced?0:Math.cos(t*.42+phase)*7);
      ctx.strokeStyle='rgba(105,215,221,.22)';ctx.lineWidth=1.2;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    });
    ctx.restore();
  }

  function drawFish(ctx,art,t){
    const bodyBob=reduced?0:Math.sin(t*.9)*3.4;
    const baseRadius=Math.max(5.2,Math.min(10.5,art.w/105));

    points.forEach((p,i)=>{
      const level=dailyLevels[i]||0;
      let x=art.x+p.nx*art.w;
      let y=art.y+p.ny*art.h+bodyBob;

      if(p.tail&&!reduced){
        const tailPower=(.30-p.nx)/.24;
        y+=Math.sin(t*2.1+p.ny*10)*Math.max(0,tailPower)*8;
      }

      let scale=1+(level*.045);
      if(!reduced)scale+=Math.sin(t*1.45+i*.61)*.025;

      if(pointer.active){
        const dx=x-pointer.x,dy=y-pointer.y;
        const dist=Math.hypot(dx,dy);
        if(dist<78&&dist>0){
          const f=(78-dist)/78;
          x+=dx/dist*f*6;y+=dy/dist*f*6;scale+=f*.48;
        }
      }

      if(pulse>.002&&!reduced){
        const dx=x-(art.x+art.w*.58),dy=y-(art.y+art.h*.5);
        const phase=Math.hypot(dx,dy)*.028;
        scale+=Math.sin(t*8-phase)*pulse*.22;
      }

      const r=baseRadius*scale;
      ctx.save();
      ctx.shadowColor=level>0?hexAlpha(palette[level],.22):'transparent';
      ctx.shadowBlur=level>0?10+level*2:0;
      ctx.fillStyle=palette[level];
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      if(level>=3){
        ctx.fillStyle='rgba(255,255,255,.62)';
        ctx.beginPath();ctx.arc(x-r*.28,y-r*.32,Math.max(1.1,r*.14),0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    });

    const eyeX=art.x+art.w*.79,eyeY=art.y+art.h*.42+bodyBob;
    ctx.fillStyle='#17191f';ctx.beginPath();ctx.arc(eyeX,eyeY,baseRadius*1.05,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(eyeX-baseRadius*.3,eyeY-baseRadius*.34,baseRadius*.28,0,Math.PI*2);ctx.fill();

    const mouthX=art.x+art.w*.905,mouthY=art.y+art.h*.54+bodyBob;
    ctx.strokeStyle='rgba(23,25,31,.58)';ctx.lineWidth=Math.max(1.4,baseRadius*.18);ctx.lineCap='round';
    ctx.beginPath();ctx.arc(mouthX,mouthY,baseRadius*.82,-.75,.75);ctx.stroke();
  }

  if(reduced)draw(performance.now());else requestAnimationFrame(draw);
});

async function loadActivity(dayCount){
  const cutoff=new Date();cutoff.setUTCDate(cutoff.getUTCDate()-(dayCount-1));cutoff.setUTCHours(0,0,0,0);
  let all=[];
  for(let page=1;page<=3;page++){
    const response=await fetch(`https://api.github.com/users/Fugu0141/events/public?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)throw new Error('GitHub API');
    const events=await response.json();
    all=all.concat(events);
    if(events.length<100)break;
    const oldest=new Date(events[events.length-1]?.created_at||Date.now());
    if(oldest<=cutoff)break;
  }

  const counts=new Map();
  for(const event of all){
    const key=String(event.created_at||'').slice(0,10);if(!key)continue;
    counts.set(key,(counts.get(key)||0)+activityWeight(event));
  }
  return counts;
}

function activityWeight(event){
  if(event.type==='PushEvent')return Math.max(1,Number(event.payload?.size)||event.payload?.commits?.length||1);
  if(event.type==='PullRequestEvent')return 3;
  if(event.type==='PullRequestReviewEvent')return 2;
  if(event.type==='IssuesEvent')return 2;
  if(event.type==='ForkEvent')return 2;
  if(event.type==='CreateEvent')return 1;
  if(event.type==='WatchEvent')return 1;
  return 1;
}

function buildLevels(dayCount,counts){
  const levels=[];
  const now=new Date();now.setUTCHours(0,0,0,0);
  for(let i=0;i<dayCount;i++){
    const d=new Date(now);d.setUTCDate(now.getUTCDate()-(dayCount-1-i));
    const key=d.toISOString().slice(0,10);
    const n=counts.get(key)||0;
    levels.push(n===0?0:n===1?1:n<=3?2:n<=6?3:n<=10?4:5);
  }
  return levels;
}

function buildFishPoints(){
  const cols=25,rows=15,candidates=[];
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      const body=Math.pow((x-15)/8.6,2)+Math.pow((y-7)/5.45,2)<=1;
      const tail=x>=1&&x<=7&&Math.abs(y-7)<=((7-x)*.68+.35);
      const topFin=x>=10&&x<=14&&y<=3&&y>=Math.round(3-(x-10)*.55);
      const bottomFin=x>=10&&x<=14&&y>=11&&y<=Math.round(11+(x-10)*.55);
      const inside=body||tail||topFin||bottomFin;
      if(inside&&((x+y)%2===0))candidates.push({x,y,tail:x<7});
    }
  }
  candidates.sort((a,b)=>a.x-b.x||(a.x%2===0?a.y-b.y:b.y-a.y));
  return candidates.map(p=>({
    nx:.07+(p.x/(cols-1))*.86,
    ny:.12+(p.y/(rows-1))*.76,
    tail:p.tail
  }));
}

function layout(w,h){
  const margin=Math.min(w,h)*.06;
  return{x:margin,y:margin,w:w-margin*2,h:h-margin*2};
}

function hexAlpha(hex,a){
  const h=hex.replace('#','');const n=parseInt(h,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
