/* ERALASH COMBAT 33.0 — TRUE MOTION ANIMATION CORE
   Real sprite animation state machine. No global canvas interception. */
(() => {
  'use strict';
  if (globalThis.__TRUE_MOTION_33__) return;
  globalThis.__TRUE_MOTION_33__ = true;

  const VERSION = '33.0';
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const lerp = (a,b,t) => a + (b-a)*t;
  const easeOut = t => 1-Math.pow(1-clamp(t,0,1),3);
  const easeInOut = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  const now = () => performance.now()/1000;
  const safe = (fn, fallback) => { try { const v=fn(); return v==null?fallback:v; } catch { return fallback; } };

  function gameCtx(){ return safe(()=>ctx, document.querySelector('canvas#game,canvas')?.getContext('2d')||null); }
  function gameW(c){ return safe(()=>w, c?.canvas?.width||innerWidth); }
  function gameH(c){ return safe(()=>h, c?.canvas?.height||innerHeight); }
  function fightActive(){ return safe(()=>gameState==='fight', false) || document.body.classList.contains('is-fighting') || document.body.dataset.gameState==='fight'; }

  const motion = new WeakMap();
  const imageCache = new Map();

  function loadFirst(paths){
    const key=paths.join('|');
    if(imageCache.has(key)) return imageCache.get(key);
    const rec={img:new Image(),ready:false,index:0,paths};
    rec.img.decoding='async'; rec.img.loading='eager';
    const tryNext=()=>{
      if(rec.index>=paths.length) return;
      rec.img.src=paths[rec.index++] + (paths[rec.index-1].includes('?')?'&':'?') + 'v=330';
    };
    rec.img.onload=()=>{rec.ready=!!(rec.img.naturalWidth&&rec.img.naturalHeight);};
    rec.img.onerror=()=>{rec.ready=false;tryNext();};
    tryNext(); imageCache.set(key,rec); return rec;
  }

  const bankDefs={
    ghlum:{
      idle:{paths:['assets/ghlum33/ghlum-idle-30.png'],frames:6,fps:6.5,loop:true},
      walk:{paths:['assets/ghlum33/ghlum-idle-30.png'],frames:6,fps:9,loop:true,step:48},
      light:{paths:['assets/ghlum33/ghlum-attack-30.png'],frames:6,fps:14,loop:false},
      heavy:{paths:['assets/ghlum33/ghlum-attack-30.png'],frames:6,fps:11,loop:false},
      special:{paths:['assets/ghlum33/ghlum-special-30.png'],frames:6,fps:11,loop:false},
      ultimate:{paths:['assets/ghlum33/ghlum-special-30.png'],frames:6,fps:9,loop:false},
      block:{paths:['assets/ghlum33/ghlum-block-30.png'],frames:6,fps:7,loop:true},
      hit:{paths:['assets/ghlum33/ghlum-block-30.png'],frames:6,fps:12,loop:false},
      jump:{paths:['assets/ghlum33/ghlum-jump-30.png'],frames:6,fps:9,loop:false},
      ko:{paths:['assets/ghlum33/ghlum-ko-30.png'],frames:6,fps:7,loop:false},
      scale:1.05, maxWidth:.29
    },
    warden:{
      idle:{paths:['assets/sprites/warden_idle.png','assets/sprites/iron_warden_idle.png'],frames:6,fps:5.4,loop:true},
      walk:{paths:['assets/sprites/warden_walk.png','assets/sprites/iron_warden_walk.png'],frames:5,fps:8,loop:true,step:58},
      light:{paths:['assets/sprites/warden_light.png','assets/sprites/iron_warden_light.png'],frames:4,fps:10,loop:false},
      heavy:{paths:['assets/sprites/warden_light.png','assets/sprites/iron_warden_heavy.png'],frames:4,fps:8.5,loop:false},
      special:{paths:['assets/sprites/warden_light.png','assets/sprites/iron_warden_special.png'],frames:4,fps:7.5,loop:false},
      ultimate:{paths:['assets/sprites/warden_light.png','assets/sprites/iron_warden_ultimate.png'],frames:4,fps:6.5,loop:false},
      block:{paths:['assets/sprites/warden_block.png','assets/sprites/iron_warden_block.png'],frames:6,fps:6,loop:true},
      hit:{paths:['assets/sprites/warden_idle.png','assets/sprites/warden_hit.png'],frames:6,fps:9,loop:false},
      jump:{paths:['assets/sprites/warden_walk.png','assets/sprites/warden_idle.png'],frames:5,fps:7,loop:false},
      ko:{paths:['assets/sprites/warden_idle.png'],frames:6,fps:5,loop:false},
      scale:1.10, maxWidth:.31
    },
    raven:{
      idle:{paths:['assets/sprites/raven_idle.png'],frames:6,fps:6.5,loop:true},
      walk:{paths:['assets/sprites/raven_walk.png'],frames:8,fps:11,loop:true,step:46},
      light:{paths:['assets/sprites/raven_light.png'],frames:6,fps:15,loop:false},
      heavy:{paths:['assets/sprites/raven_heavy.png','assets/sprites/raven_light.png'],frames:6,fps:11,loop:false},
      special:{paths:['assets/sprites/raven_heavy.png'],frames:6,fps:10,loop:false},
      ultimate:{paths:['assets/sprites/raven_heavy.png'],frames:6,fps:8,loop:false},
      block:{paths:['assets/sprites/raven_block.png'],frames:6,fps:7,loop:true},
      hit:{paths:['assets/sprites/raven_idle.png'],frames:6,fps:10,loop:false},
      jump:{paths:['assets/sprites/raven_walk.png'],frames:8,fps:9,loop:false},
      ko:{paths:['assets/sprites/raven_idle.png'],frames:6,fps:5,loop:false},
      scale:1.00, maxWidth:.27
    }
  };

  for(const bank of Object.values(bankDefs)){
    for(const [k,v] of Object.entries(bank)){
      if(v&&v.paths) v.resource=loadFirst(v.paths);
    }
  }

  function identity(f){
    const s=[f?.contentId,f?.fighterId,f?.characterId,f?.selectedId,f?.name,f?.archetype].filter(Boolean).join('|').toLowerCase();
    if(/ghlum|gollum|cave[ _-]?devourer/.test(s)) return 'ghlum';
    if(/warden|iron/.test(s)) return 'warden';
    return 'raven';
  }

  function controller(f){
    let c=motion.get(f);
    if(!c){
      c={state:'idle',prevState:'idle',stateStart:now(),lastX:Number(f.x||0),distance:0,lastHp:Number(f.hp||0),damageT:0,recoil:0,recoilDir:0,attackKey:'',attackStart:0,contactHold:0,landT:0,prevFrame:0,transition:0,lastGrounded:true};
      motion.set(f,c);
    }
    return c;
  }

  function coreState(f,c){
    const t=now();
    const hp=Number(f?.hp||0);
    if(hp<c.lastHp-.01){
      c.damageT=t+.30;
      c.recoil=Math.min(30,8+(c.lastHp-hp)*1.1);
      c.recoilDir=-(Number(f?.dir)||1);
      c.contactHold=t+.075;
    }
    c.lastHp=hp;
    if(hp<=0 || /knockdown|ko|dead/.test(String(f?.state||'').toLowerCase())) return 'ko';
    if(t<c.damageT || /hitstun|hurt|stagger|recoil/.test(String(f?.state||'').toLowerCase())) return 'hit';
    if(f?.blocking || /block|guard/.test(String(f?.state||'').toLowerCase())) return 'block';

    const grounded=Math.abs(Number(f?.vy||0))<25 && Math.abs(Number(f?.y||0)-safe(()=>groundY,Number(f?.y||0)))<18;
    if(!grounded || /jump|air/.test(String(f?.state||'').toLowerCase())) return 'jump';

    if(f?.attack || String(f?.state||'').toLowerCase()==='attack'){
      const n=String(f?.attack?.name||f?.lastAttackType||'light').toLowerCase();
      if(/ultimate|finisher/.test(n)) return 'ultimate';
      if(/special/.test(n)) return 'special';
      if(/heavy/.test(n)) return 'heavy';
      return 'light';
    }

    const dx=Math.abs(Number(f?.x||0)-c.lastX);
    const moving=Math.abs(Number(f?.vx||0))>30 || dx>1.3 || /walk|run|dash/.test(String(f?.state||'').toLowerCase());
    return moving?'walk':'idle';
  }

  function enterState(f,c,state){
    if(c.state===state) return;
    c.prevState=c.state;
    c.prevFrame=c.frame||0;
    c.state=state;
    c.stateStart=now();
    c.transition=.085;
    if(/light|heavy|special|ultimate/.test(state)){
      c.attackStart=now();
      c.attackKey=state;
      c.distance=0;
    }
    if(state==='jump') c.jumpStart=now();
    if(state==='hit') c.contactHold=now()+.065;
  }

  function attackProgress(f,c){
    const a=f?.attack||{};
    const total=Math.max(.18,Number(a.total||(Number(a.startup||.1)+Number(a.active||.1)+Number(a.recovery||.2))));
    const stateT=Number(f?.stateT);
    if(Number.isFinite(stateT)&&stateT>=0&&stateT<=total*1.5) return clamp(stateT/total,0,.999);
    return clamp((now()-c.attackStart)/total,0,.999);
  }

  function nonLinearAttackFrame(p,frames,state){
    if(frames<=1) return 0;
    const last=frames-1;
    const startupEnd=state==='light'?.28:state==='heavy'?.36:state==='special'?.38:.44;
    const activeEnd=state==='light'?.58:state==='heavy'?.64:state==='special'?.68:.72;
    if(p<startupEnd){
      const q=easeInOut(p/startupEnd);
      return Math.min(last,Math.floor(q*Math.max(1,Math.ceil(frames*.34))));
    }
    if(p<activeEnd){
      const start=Math.max(1,Math.floor(frames*.34));
      const span=Math.max(1,Math.ceil(frames*.42));
      return Math.min(last,start+Math.floor(((p-startupEnd)/(activeEnd-startupEnd))*span));
    }
    const start=Math.max(1,Math.floor(frames*.76));
    return Math.min(last,start+Math.floor(((p-activeEnd)/(1-activeEnd))*Math.max(1,last-start+1)));
  }

  function frameFor(f,c,anim){
    const frames=Math.max(1,anim.frames||1);
    const t=now();
    if(t<c.contactHold) return c.frame??Math.min(frames-1,Math.floor(frames*.58));

    if(/light|heavy|special|ultimate/.test(c.state)) return nonLinearAttackFrame(attackProgress(f,c),frames,c.state);
    if(c.state==='hit') return Math.min(frames-1,Math.floor(clamp((t-c.stateStart)/.28,0,.999)*frames));
    if(c.state==='ko') return Math.min(frames-1,Math.floor(clamp((t-c.stateStart)/.72,0,.999)*frames));
    if(c.state==='jump'){
      const vy=Number(f?.vy||0);
      const ground=safe(()=>groundY,Number(f?.y||0));
      const height=Math.max(0,ground-Number(f?.y||ground));
      if(vy<-80) return Math.min(frames-1,1);
      if(height>80&&Math.abs(vy)<120) return Math.min(frames-1,Math.floor(frames*.55));
      if(vy>80) return Math.min(frames-1,Math.floor(frames*.75));
      return frames-1;
    }
    if(c.state==='block') return Math.min(frames-1,1+Math.floor(((t-c.stateStart)*(anim.fps||6))%Math.max(1,frames-1)));
    if(c.state==='walk'){
      const step=Math.max(20,Number(anim.step||48));
      return Math.floor((c.distance/step)*frames)%frames;
    }
    // idle with a slower hold around the neutral pose, avoiding machine-gun frame changes
    const cycle=((t-c.stateStart)*(anim.fps||6))%frames;
    return Math.floor(cycle);
  }

  function visualPose(f,c,state,p){
    const dir=Number(f?.dir)||1;
    const vx=Number(f?.vx||0);
    let rootX=0,rootY=0,lean=clamp(vx/3100,-.075,.075),sx=1,sy=1;
    if(state==='walk'){
      const phase=(c.distance/54)*Math.PI*2;
      rootY=Math.sin(phase)*2.6;
      lean+=clamp(vx/1800,-.07,.07);
      sx=1+Math.abs(Math.sin(phase))*.012; sy=1-Math.abs(Math.sin(phase))*.008;
    } else if(/light|heavy|special|ultimate/.test(state)){
      const attackP=attackProgress(f,c);
      const reach=state==='light'?18:state==='heavy'?32:state==='special'?46:62;
      if(attackP<.58) rootX=dir*reach*easeOut(attackP/.58);
      else rootX=dir*reach*(1-easeInOut((attackP-.58)/.42));
      const punch=Math.sin(clamp(attackP,0,1)*Math.PI);
      lean+=dir*punch*(state==='light'?.045:state==='heavy'?.075:.10);
      sx=1+punch*.025; sy=1-punch*.018;
    } else if(state==='block'){
      rootX=-dir*8; lean=-dir*.035; sx=1.015; sy=.992;
    } else if(state==='hit'){
      const q=1-clamp((now()-c.stateStart)/.30,0,1);
      rootX=c.recoilDir*c.recoil*q;
      lean+=c.recoilDir*.10*q;
      sx=1-q*.025; sy=1+q*.018;
    } else if(state==='jump'){
      lean+=clamp(vx/2200,-.08,.08);
      if(Number(f?.vy||0)<0){sx=.97;sy=1.035;} else {sx=1.025;sy=.98;}
    } else {
      const breath=Math.sin((now()+Number(f?.breathSeed20||0))*Math.PI*1.55);
      rootY=breath*1.5; sx=1+breath*.004; sy=1-breath*.004;
    }
    return {rootX,rootY,lean,sx,sy};
  }

  function drawShadow(c,x,y,wid,identityKey,state){
    c.save();
    const airborne=state==='jump';
    const alpha=airborne?.16:.34;
    const rx=wid*(identityKey==='warden'?.30:.27)*(airborne?.72:1);
    const grad=c.createRadialGradient(x,y,0,x,y,Math.max(20,rx));
    grad.addColorStop(0,`rgba(0,0,0,${alpha})`); grad.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=grad; c.beginPath(); c.ellipse(x,y,Math.max(24,rx),Math.max(7,rx*.18),0,0,Math.PI*2); c.fill(); c.restore();
  }

  function drawTrail(c,x,y,dir,size,state,p){
    if(!/light|heavy|special|ultimate/.test(state)||p<.28||p>.78) return;
    c.save();
    c.globalCompositeOperation='screen';
    c.lineCap='round';
    c.strokeStyle=state==='special'||state==='ultimate'?'rgba(91,255,61,.45)':'rgba(230,205,142,.22)';
    c.lineWidth=state==='ultimate'?12:state==='special'?9:5;
    c.beginPath();
    const r=size*(state==='light'?.22:state==='heavy'?.31:.38);
    c.arc(x+dir*r*.18,y-size*.58,r,dir>0?-1.25:-1.9,dir>0?.65:3.8,dir<0);
    c.stroke(); c.restore();
  }

  function trueMotion33DrawFighter(f){
    try{
      if(!fightActive()||!f) return false;
      const c=controller(f);
      const xNow=Number(f.x||0);
      const delta=Math.abs(xNow-c.lastX);
      if(delta<180) c.distance+=delta;
      c.lastX=xNow;

      const state=coreState(f,c);
      enterState(f,c,state);
      const key=identity(f);
      const bank=bankDefs[key]||bankDefs.raven;
      const anim=bank[state]||bank.idle;
      const res=anim?.resource;
      if(!res?.ready||!res.img?.naturalWidth||!res.img?.naturalHeight) return false;

      const context=gameCtx();
      if(!context) return false;
      const W=gameW(context),H=gameH(context);
      const frames=Math.max(1,anim.frames||1);
      let frame=frameFor(f,c,anim);
      frame=clamp(frame,0,frames-1)|0;
      c.frame=frame;

      const fw=res.img.naturalWidth/frames, fh=res.img.naturalHeight;
      const coarse=matchMedia?.('(pointer:coarse)')?.matches;
      let spriteH=coarse?clamp(H*.42,270,390):clamp(H*(key==='warden'?.54:.50),330,key==='warden'?520:480);
      spriteH*=bank.scale||1;
      let spriteW=spriteH*(fw/Math.max(1,fh));
      const maxW=W*(bank.maxWidth||.29);
      if(spriteW>maxW){const k=maxW/spriteW;spriteW*=k;spriteH*=k;}

      const pose=visualPose(f,c,state);
      const dir=Number(f.dir)||1;
      const baseX=Number(f.x||0)+pose.rootX;
      const baseY=Number(f.y||0)+pose.rootY;
      const p=/light|heavy|special|ultimate/.test(state)?attackProgress(f,c):0;

      drawShadow(context,baseX,Number(f.y||0)+3,spriteW,key,state);
      drawTrail(context,baseX,baseY,dir,spriteH,state,p);

      context.save();
      context.translate(baseX,baseY);
      context.scale(dir*pose.sx,pose.sy);
      context.rotate(pose.lean);
      if(state==='hit') context.filter='brightness(1.48) contrast(1.12) saturate(.72)';
      else if(state==='special'||state==='ultimate') context.filter='brightness(1.12) contrast(1.12) saturate(1.08)';
      else context.filter='brightness(1.04) contrast(1.10)';
      context.shadowColor=key==='warden'?'rgba(45,135,255,.30)':key==='ghlum'?'rgba(79,211,56,.20)':'rgba(192,26,43,.25)';
      context.shadowBlur=state==='special'||state==='ultimate'?24:12;

      // 80 ms crossfade between states makes the pose change read as motion, not teleporting cut-outs.
      if(c.transition>0){
        c.transition=Math.max(0,c.transition-1/60);
        context.globalAlpha=.72+(.28*(1-c.transition/.085));
      }
      context.drawImage(res.img,frame*fw,0,fw,fh,-spriteW*.5,-spriteH,spriteW,spriteH);
      context.restore();
      return true;
    }catch(err){
      console.warn('[TRUE MOTION 33] fallback',err);
      return false;
    }
  }

  globalThis.trueMotion33DrawFighter=trueMotion33DrawFighter;

  // Replace the global renderer binding as a second safety layer. The installer also injects
  // a bridge inside the original function, so this works with both current duplicate game blocks.
  function installBinding(){
    try{
      if(typeof drawSpriteSheetFighter==='function' && !drawSpriteSheetFighter.__tm33){
        const legacy=drawSpriteSheetFighter;
        const wrapped=function(f){ return trueMotion33DrawFighter(f) || legacy(f); };
        wrapped.__tm33=true;
        drawSpriteSheetFighter=wrapped;
        try{globalThis.drawSpriteSheetFighter=wrapped;}catch{}
      }
    }catch{}
  }
  installBinding();
  setTimeout(installBinding,250);
  setTimeout(installBinding,1200);
  console.info('[ERALASH] TRUE MOTION',VERSION,'animation state machine active');
})();
