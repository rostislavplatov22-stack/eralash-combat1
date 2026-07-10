#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PATCH_ID = '31.0 PREMIUM DARK FANTASY FIGHT REDESIGN';

function fail(message){
  console.error(`\n[ERROR] ${message}`);
  process.exit(1);
}

function walk(dir, depth=0){
  if(depth>6) return [];
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['node_modules','.git','dist','.next'].includes(entry.name)) continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(full,depth+1));
    else if(entry.isFile() && entry.name.toLowerCase()==='index.html') out.push(full);
  }
  return out;
}

function pickIndex(root){
  const direct=path.join(root,'index.html');
  if(fs.existsSync(direct) && fs.statSync(direct).size>1000) return direct;
  const candidates=walk(root)
    .map(file=>({file,size:fs.statSync(file).size,text:fs.readFileSync(file,'utf8')}))
    .filter(x=>/ERALASH\s*(COMBAT|KOMBAT)/i.test(x.text) || /fighter-ghlum|CHARACTER_SELECT_META|drawPremiumFighterArt/i.test(x.text))
    .sort((a,b)=>b.size-a.size);
  return candidates[0]?.file || null;
}

function findFunctionRange(source,name){
  const start=source.indexOf(`function ${name}(`);
  if(start<0) return null;
  const open=source.indexOf('{',start);
  if(open<0) return null;
  let depth=0,state='normal',escaped=false;
  for(let i=open;i<source.length;i++){
    const ch=source[i], next=source[i+1];
    if(state==='line'){ if(ch==='\n') state='normal'; continue; }
    if(state==='block'){ if(ch==='*'&&next==='/'){state='normal';i++;} continue; }
    if(state==='single'||state==='double'||state==='template'){
      if(escaped){escaped=false;continue;}
      if(ch==='\\'){escaped=true;continue;}
      if((state==='single'&&ch==="'")||(state==='double'&&ch==='"')||(state==='template'&&ch==='`')) state='normal';
      continue;
    }
    if(ch==='/'&&next==='/'){state='line';i++;continue;}
    if(ch==='/'&&next==='*'){state='block';i++;continue;}
    if(ch==="'"){state='single';continue;}
    if(ch==='"'){state='double';continue;}
    if(ch==='`'){state='template';continue;}
    if(ch==='{') depth++;
    if(ch==='}'){
      depth--;
      if(depth===0) return {start,open,end:i+1};
    }
  }
  return null;
}

function insertBeforeFunction(source,name,block){
  if(source.includes(PATCH_ID)) return source;
  const range=findFunctionRange(source,name);
  if(!range) fail(`Не найдена точка вставки перед ${name}().`);
  return source.slice(0,range.start)+block+'\n\n'+source.slice(range.start);
}

function injectAtFunctionStart(source,name,code,marker,required=true){
  if(source.includes(marker)) return source;
  const range=findFunctionRange(source,name);
  if(!range){
    if(required) fail(`Не найдена функция ${name}().`);
    return source;
  }
  return source.slice(0,range.open+1)+'\n'+code+'\n'+source.slice(range.open+1);
}

function replaceFunction(source,name,replacement,required=true){
  const range=findFunctionRange(source,name);
  if(!range){
    if(required) fail(`Не найдена функция ${name}().`);
    return source;
  }
  return source.slice(0,range.start)+replacement.trim()+source.slice(range.end);
}

function copyDir(src,dst){
  if(!fs.existsSync(src)) fail(`Не найдена папка ассетов: ${src}`);
  fs.mkdirSync(dst,{recursive:true});
  for(const entry of fs.readdirSync(src,{withFileTypes:true})){
    const s=path.join(src,entry.name), d=path.join(dst,entry.name);
    if(entry.isDirectory()) copyDir(s,d);
    else fs.copyFileSync(s,d);
  }
}

const patchRoot=path.dirname(fileURLToPath(import.meta.url));
const root=process.argv[2]?path.resolve(process.argv[2]):process.cwd();
if(!fs.existsSync(root)) fail(`Папка не существует: ${root}`);
const indexPath=pickIndex(root);
if(!indexPath) fail('Не найден рабочий index.html проекта EraLash Combat.');
let source=fs.readFileSync(indexPath,'utf8');
if(!/drawPremiumFighterArt|drawSpriteSheetFighter|fighter-ghlum/i.test(source)) fail('Это не поддерживаемая версия EraLash Combat.');

const projectDir=path.dirname(indexPath);
const backupPath=path.join(projectDir,'index.before-premium-fight-31.0.html');
if(!fs.existsSync(backupPath)) fs.copyFileSync(indexPath,backupPath);
copyDir(path.join(patchRoot,'assets','ghlum31'), path.join(projectDir,'assets','ghlum31'));

const css=`
<style id="premiumFight31Styles">
/* ==========================================================
   31.0 PREMIUM DARK FANTASY FIGHT REDESIGN
   ========================================================== */
:root{
  --pf31-gold:#c9a85f;
  --pf31-gold-bright:#f3d88e;
  --pf31-ink:#050608;
  --pf31-green:#69c43b;
  --pf31-blue:#37a7ff;
  --pf31-red:#b91f2e;
}
body.premium-fight-31{overflow:hidden;background:#020305;}
body.premium-fight-31::before,
body.premium-fight-31::after{
  content:"";position:fixed;inset:0;pointer-events:none;z-index:30;opacity:0;transition:opacity .35s ease;
}
body.premium-fight-31.is-fighting::before{
  opacity:1;background:
    radial-gradient(circle at 16% 58%,rgba(162,8,26,.18),transparent 34%),
    radial-gradient(circle at 84% 58%,rgba(25,110,220,.15),transparent 34%),
    linear-gradient(180deg,rgba(0,0,0,.38),transparent 18%,transparent 72%,rgba(0,0,0,.55));
  mix-blend-mode:screen;
}
body.premium-fight-31.is-fighting::after{
  opacity:1;box-shadow:inset 0 0 190px 50px rgba(0,0,0,.76);z-index:31;
}

#premiumFight31{position:fixed;inset:0;z-index:1500;pointer-events:none;font-family:Georgia,'Times New Roman',serif;color:#f6f0e2;display:none;}
body.is-fighting #premiumFight31{display:block;}

.pf31-hud{position:absolute;left:16px;right:16px;top:14px;height:140px;display:grid;grid-template-columns:minmax(0,1fr) 146px minmax(0,1fr);gap:22px;align-items:start;filter:drop-shadow(0 16px 24px rgba(0,0,0,.68));}
.pf31-side{height:116px;display:grid;grid-template-columns:118px minmax(0,1fr);gap:14px;align-items:start;}
.pf31-side.enemy{grid-template-columns:minmax(0,1fr) 118px;text-align:right;}
.pf31-portrait{width:112px;height:112px;position:relative;border:2px solid rgba(225,191,112,.82);background:#07080b;overflow:hidden;clip-path:polygon(10% 0,90% 0,100% 10%,100% 90%,90% 100%,10% 100%,0 90%,0 10%);box-shadow:0 0 0 3px rgba(0,0,0,.86),0 0 30px rgba(201,168,95,.20),inset 0 0 25px rgba(0,0,0,.62);}
.pf31-portrait img{width:100%;height:100%;object-fit:cover;object-position:50% 18%;filter:contrast(1.12) saturate(.92) brightness(.91);}
.pf31-side.enemy .pf31-portrait{order:2;}
.pf31-side.enemy .pf31-meta{order:1;}
.pf31-name{font-size:clamp(22px,2vw,36px);font-weight:800;letter-spacing:.035em;text-transform:uppercase;text-shadow:0 3px 8px #000;margin:2px 0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pf31-side.enemy .pf31-name{text-align:right;}
.pf31-bar-shell{height:29px;padding:4px;border:1px solid rgba(221,188,105,.74);background:linear-gradient(#090a0c,#020304);box-shadow:inset 0 0 0 2px rgba(0,0,0,.75),0 2px 0 rgba(255,255,255,.05);clip-path:polygon(0 0,98% 0,100% 50%,98% 100%,0 100%);}
.pf31-side.enemy .pf31-bar-shell{clip-path:polygon(2% 0,100% 0,100% 100%,2% 100%,0 50%);}
.pf31-hp-track{height:100%;position:relative;overflow:hidden;background:#171a12;box-shadow:inset 0 0 10px rgba(0,0,0,.9);}
.pf31-hp-fill{height:100%;width:100%;transform-origin:left center;background:linear-gradient(180deg,#a8db56 0%,#62a92c 48%,#3d7d1d 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.28),0 0 18px rgba(103,194,53,.45);transition:width .12s linear;}
.pf31-side.enemy .pf31-hp-fill{margin-left:auto;transform-origin:right center;}
.pf31-energy{height:5px;margin-top:5px;background:rgba(0,0,0,.78);border:1px solid rgba(201,168,95,.38);overflow:hidden;}
.pf31-energy-fill{height:100%;background:linear-gradient(90deg,#654510,#e4bf62,#fff0ad);width:0%;box-shadow:0 0 12px rgba(238,194,83,.45);}
.pf31-value{font:700 16px/1.2 Georgia,serif;letter-spacing:.035em;margin-top:5px;color:#eee8d8;text-shadow:0 2px 5px #000;}
.pf31-side.enemy .pf31-value{text-align:right;}

.pf31-center{position:relative;width:136px;height:136px;margin:auto;display:grid;place-items:center;}
.pf31-center::before{content:"";position:absolute;inset:0;background:radial-gradient(circle,#1b1c1e 0 43%,#060709 44% 55%,transparent 56%),conic-gradient(from 0deg,#6f5325,#d6b668,#4a3516,#d6b668,#6f5325);clip-path:polygon(50% 0,62% 9%,76% 6%,85% 19%,98% 25%,94% 41%,100% 52%,91% 63%,93% 79%,78% 84%,68% 97%,52% 91%,38% 100%,27% 89%,11% 91%,8% 75%,0 64%,7% 50%,1% 36%,15% 27%,19% 11%,36% 10%);filter:drop-shadow(0 7px 10px #000);}
.pf31-timer{position:relative;font-size:58px;font-weight:900;line-height:1;color:#f5f0e4;text-shadow:0 4px 8px #000;z-index:1;}
.pf31-rounds{position:absolute;bottom:-6px;display:flex;gap:9px;z-index:2;}
.pf31-rounds.player{right:calc(50% + 84px);}
.pf31-rounds.enemy{left:calc(50% + 84px);}
.pf31-pip{width:20px;height:20px;border-radius:50%;border:2px solid rgba(201,168,95,.82);background:#050607;box-shadow:inset 0 0 7px #000,0 0 8px rgba(201,168,95,.15);}
.pf31-pip.won{background:radial-gradient(circle at 35% 30%,#fff1ad,#d29c2e 42%,#5f3510 75%);box-shadow:0 0 13px rgba(245,193,67,.65);}

.pf31-controls{position:absolute;left:24px;right:24px;bottom:22px;display:flex;justify-content:space-between;align-items:end;pointer-events:none;}
.pf31-move{width:188px;height:188px;position:relative;pointer-events:auto;}
.pf31-dpad-ring{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 48%,#252525 0 22%,#090a0c 23% 57%,#171719 58% 63%,#050506 64%);border:2px solid rgba(201,168,95,.62);box-shadow:0 10px 28px rgba(0,0,0,.58),inset 0 0 18px #000;}
.pf31-move button{position:absolute;width:64px;height:64px;border:0;background:transparent;color:#ded8cb;font-size:30px;pointer-events:auto;cursor:pointer;touch-action:none;text-shadow:0 2px 6px #000;}
.pf31-left{left:4px;top:62px}.pf31-right{right:4px;top:62px}.pf31-jump{left:62px;top:4px}.pf31-down{left:62px;bottom:4px;opacity:.4}
.pf31-actions{width:min(510px,46vw);height:250px;position:relative;pointer-events:auto;}
.pf31-action{position:absolute;width:104px;height:104px;border-radius:50%;border:2px solid rgba(201,168,95,.66);background:radial-gradient(circle at 42% 35%,#222428,#090a0c 55%,#020203 72%);box-shadow:0 10px 26px rgba(0,0,0,.62),inset 0 0 0 3px rgba(0,0,0,.74),inset 0 0 25px rgba(255,255,255,.025);color:#f3eee1;pointer-events:auto;cursor:pointer;touch-action:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-shadow:0 2px 6px #000;transition:transform .08s,filter .08s;}
.pf31-action:active,.pf31-action.pressed{transform:scale(.93);filter:brightness(1.45);}
.pf31-action b{font:900 29px/1 Georgia,serif}.pf31-action span{font:800 13px/1 Georgia,serif;letter-spacing:.045em}
.pf31-light{left:8px;bottom:0}.pf31-heavy{left:118px;bottom:70px}.pf31-special{right:6px;top:0;border-color:rgba(90,190,72,.78);box-shadow:0 10px 26px rgba(0,0,0,.62),0 0 18px rgba(74,201,61,.18),inset 0 0 0 3px rgba(0,0,0,.74)}
.pf31-block{right:2px;bottom:0;width:126px;height:126px}.pf31-jump-btn{left:218px;bottom:0}.pf31-ultimate{right:128px;top:104px;border-color:rgba(181,36,49,.82);background:radial-gradient(circle at 42% 35%,#4a1119,#130609 58%,#030203 74%)}
.pf31-pause{position:absolute;left:50%;bottom:17px;transform:translateX(-50%);width:58px;height:58px;border-radius:50%;pointer-events:auto;border:2px solid rgba(201,168,95,.62);background:#08090b;color:#eee7d8;font:900 21px Georgia;box-shadow:0 8px 22px rgba(0,0,0,.55),inset 0 0 0 3px #020203;}

/* Hide the legacy fight chrome; the gameplay canvas remains untouched. */
body.premium-fight-31.is-fighting #hud,
body.premium-fight-31.is-fighting #combatHud,
body.premium-fight-31.is-fighting #fightHud,
body.premium-fight-31.is-fighting .combat-hud,
body.premium-fight-31.is-fighting .fight-hud,
body.premium-fight-31.is-fighting #mobileControls,
body.premium-fight-31.is-fighting #controls,
body.premium-fight-31.is-fighting .mobile-controls,
body.premium-fight-31.is-fighting .combat-controls{opacity:0!important;pointer-events:none!important;}

#calloutBig,.callout-big{font-family:Georgia,'Times New Roman',serif!important;font-size:clamp(54px,8vw,126px)!important;font-weight:900!important;letter-spacing:.025em!important;color:#f2e7c7!important;text-transform:uppercase!important;text-shadow:0 5px 0 #15100a,0 12px 28px #000!important;}
#calloutSmall,.callout-small{font-family:Georgia,'Times New Roman',serif!important;color:#d6b86e!important;letter-spacing:.12em!important;text-transform:uppercase!important;}

@media(max-width:900px){
  .pf31-hud{left:7px;right:7px;top:7px;height:100px;grid-template-columns:minmax(0,1fr) 90px minmax(0,1fr);gap:7px}
  .pf31-side{height:82px;grid-template-columns:70px minmax(0,1fr);gap:6px}.pf31-side.enemy{grid-template-columns:minmax(0,1fr) 70px}
  .pf31-portrait{width:68px;height:68px}.pf31-name{font-size:13px;margin:1px 0 4px}.pf31-bar-shell{height:18px;padding:3px}.pf31-value{font-size:10px;margin-top:3px}.pf31-energy{height:3px;margin-top:3px}
  .pf31-center{width:84px;height:84px}.pf31-timer{font-size:36px}.pf31-rounds{display:none}
  .pf31-controls{left:9px;right:9px;bottom:8px}.pf31-move{width:124px;height:124px}.pf31-move button{width:44px;height:44px;font-size:22px}.pf31-left{top:40px}.pf31-right{top:40px}.pf31-jump{left:40px}.pf31-down{left:40px}
  .pf31-actions{width:305px;height:160px}.pf31-action{width:70px;height:70px}.pf31-action b{font-size:19px}.pf31-action span{font-size:9px}.pf31-light{left:0}.pf31-heavy{left:64px;bottom:48px}.pf31-special{right:0}.pf31-block{width:82px;height:82px;right:0}.pf31-jump-btn{left:127px}.pf31-ultimate{right:75px;top:65px}
  .pf31-pause{width:42px;height:42px;bottom:7px;font-size:15px}
}
@media(pointer:fine) and (min-width:1000px){.pf31-controls{opacity:.86}.pf31-move{transform:scale(.88);transform-origin:left bottom}.pf31-actions{transform:scale(.88);transform-origin:right bottom}}
</style>`;

if(!source.includes('premiumFight31Styles')) source=source.replace(/<\/head>/i,css+'\n</head>');
source=source.replace(/<body class="([^"]*)"/i,(all,classes)=>classes.includes('premium-fight-31')?all:`<body class="${classes} premium-fight-31"`);
source=source.replace(/<title>[^<]*<\/title>/i,'<title>EraLash Combat — Premium Fight 31.0</title>');

const helpers=String.raw`
  /* ==========================================================
     31.0 PREMIUM DARK FANTASY FIGHT REDESIGN
     Dedicated Ghlum renderer + premium HUD + circular controls.
     ========================================================== */
  const PREMIUM_FIGHT_PATCH_31 = '${PATCH_ID}';

  function pf31Norm(value){
    return String(value || '').trim().toLowerCase().replace(/[\s-]+/g,'_');
  }

  function pf31SelectedGhlum(){
    const values=[];
    try { values.push(localStorage.getItem('eralashCombatSelectedFighter29_0')); } catch(_) {}
    try { values.push(localStorage.getItem('eralashCombatSelectedFighter28')); } catch(_) {}
    try { values.push(localStorage.getItem('eralashCombatSelectedFighter')); } catch(_) {}
    values.push(
      document.body?.getAttribute('data-runtime-fighter'),
      typeof contentState !== 'undefined' ? contentState?.fighterId : '',
      typeof contentBundle !== 'undefined' ? contentBundle?.balance?.activeFighterId : ''
    );
    return values.some(v=>['ghlum','gollum','cave_devourer'].includes(pf31Norm(v)));
  }

  function pf31FighterIdentity(f){
    return [f?.contentId,f?.fighterId,f?.name,f?.archetype,f?.role,f?.specialName,f?.finisherName]
      .map(pf31Norm).filter(Boolean).join('|');
  }

  function pf31IsGhlum(f){
    const id=pf31FighterIdentity(f);
    return id.includes('ghlum') || id.includes('gollum') || id.includes('cave_devourer') || id.includes('abyss_feast') || (f?.id==='player' && pf31SelectedGhlum());
  }

  function pf31LoadSheet(file,frames=6,fps=8){
    const img=new Image();
    img.decoding='async';
    img.loading='eager';
    img.src='assets/ghlum31/'+file+'?v=310';
    return {img,frames,fps};
  }

  const pf31GhlumSheets={
    idle:pf31LoadSheet('ghlum-idle-30.png',6,5.2),
    walk:pf31LoadSheet('ghlum-idle-30.png',6,8.2),
    block:pf31LoadSheet('ghlum-block-30.png',6,9.5),
    hit:pf31LoadSheet('ghlum-block-30.png',6,12),
    light:pf31LoadSheet('ghlum-attack-30.png',6,14),
    heavy:pf31LoadSheet('ghlum-attack-30.png',6,10),
    special:pf31LoadSheet('ghlum-special-30.png',6,12),
    ultimate:pf31LoadSheet('ghlum-special-30.png',6,9),
    jump:pf31LoadSheet('ghlum-jump-30.png',6,10),
    ko:pf31LoadSheet('ghlum-ko-30.png',6,7)
  };

  function pf31GhlumAnim(f){
    if(f?.state==='attack' && f?.attack){
      const n=String(f.attack.name||f.lastAttackType||'light').toLowerCase();
      return pf31GhlumSheets[n] || pf31GhlumSheets.light;
    }
    if(f?.state==='knockdown' || f?.state==='ko') return pf31GhlumSheets.ko;
    if(f?.state==='hitstun') return pf31GhlumSheets.hit;
    if(f?.state==='block') return pf31GhlumSheets.block;
    const airborne=Math.abs(Number(f?.vy||0))>45 || (typeof groundY!=='undefined' && Number(f?.y||groundY)<groundY-16);
    if(airborne) return pf31GhlumSheets.jump;
    if(f?.state==='walk' || Math.abs(Number(f?.vx||0))>45) return pf31GhlumSheets.walk;
    return pf31GhlumSheets.idle;
  }

  function pf31GhlumFrame(f,anim){
    const frames=Math.max(1,anim?.frames||6);
    const stateT=Math.max(0,Number(f?.stateT||0));
    if(f?.state==='attack' && f?.attack){
      const total=Math.max(.001,Number(f.attack.total||((f.attack.startup||0)+(f.attack.active||0)+(f.attack.recovery||0))||.45));
      return Math.min(frames-1,Math.floor(Math.min(.999,stateT/total)*frames));
    }
    if(f?.state==='knockdown'||f?.state==='ko') return Math.min(frames-1,Math.floor(Math.min(.999,stateT/1.0)*frames));
    if(f?.state==='hitstun') return Math.min(frames-1,Math.floor(Math.min(.999,stateT/.48)*frames));
    return Math.floor(((performance.now()/1000)*(anim?.fps||8))%frames);
  }

  function drawGhlumPremium31(f){
    if(!pf31IsGhlum(f)) return false;
    const anim=pf31GhlumAnim(f);
    const img=anim?.img;
    if(!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return false;
    const frames=Math.max(1,anim.frames||6);
    const frame=pf31GhlumFrame(f,anim);
    const fw=img.naturalWidth/frames;
    const fh=img.naturalHeight;
    const coarse=!!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);
    let spriteH=coarse?Math.max(245,Math.min(h*.47,430)):Math.max(370,Math.min(h*.57,610));
    const aspect=fw/Math.max(1,fh);
    let spriteW=spriteH*aspect;
    const maxW=coarse?w*.38:w*.29;
    if(spriteW>maxW){const k=maxW/spriteW;spriteW*=k;spriteH*=k;}
    const dir=f.dir||1;
    const hurt=f.state==='hitstun'||f.state==='knockdown';
    const attacking=f.state==='attack';
    const blocking=f.state==='block';
    const p=attacking&&f.attack?Math.min(1,Math.max(0,f.stateT/Math.max(.001,f.attack.total||.45))):0;
    const punch=attacking?Math.sin(p*Math.PI):0;
    const x=f.x+dir*punch*(f.attack?.name==='ultimate'?44:f.attack?.name==='special'?34:20);
    const y=f.y+(hurt?5:0);

    ctx.save();
    const shadowW=Math.max(75,spriteW*.34);
    const sh=ctx.createRadialGradient(x,y+7,8,x,y+7,shadowW);
    sh.addColorStop(0,'rgba(0,0,0,.88)');sh.addColorStop(.48,'rgba(0,0,0,.43)');sh.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=sh;ctx.beginPath();ctx.ellipse(x,y+8,shadowW,18,0,0,Math.PI*2);ctx.fill();ctx.restore();

    if(attacking && (f.attack?.name==='special'||f.attack?.name==='ultimate')){
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.20+.28*punch;
      const aura=ctx.createRadialGradient(x,y-spriteH*.52,0,x,y-spriteH*.52,spriteW*.65);
      aura.addColorStop(0,'rgba(125,255,77,.62)');aura.addColorStop(.42,'rgba(62,210,54,.20)');aura.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=aura;ctx.beginPath();ctx.ellipse(x,y-spriteH*.50,spriteW*.54,spriteH*.42,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }

    ctx.save();ctx.translate(x,y);ctx.scale(dir,1);
    const lean=blocking?-.035:(hurt?-.07:0)+(attacking?dir*.025*punch:0);
    ctx.rotate(lean);
    ctx.filter=hurt?'brightness(1.38) contrast(1.16) saturate(.92)':'brightness(1.08) contrast(1.16) saturate(.96)';
    ctx.shadowColor=attacking?'rgba(101,255,66,.56)':'rgba(0,0,0,.88)';ctx.shadowBlur=attacking?22:13;
    ctx.drawImage(img,frame*fw,0,fw,fh,-spriteW*.5,-spriteH,spriteW,spriteH);
    ctx.restore();
    return true;
  }

  function pf31PortraitFor(f){
    const id=pf31FighterIdentity(f);
    if(id.includes('ghlum')||id.includes('gollum')||id.includes('cave_devourer')) return 'assets/fighter-portrait-ghlum-28.webp';
    if(id.includes('warden')||id.includes('iron')) return 'assets/fighter-portrait-warden-24.webp';
    return 'assets/fighter-portrait-raven-24.webp';
  }

  function installPremiumFight31(){
    if(document.getElementById('premiumFight31')) return;
    const root=document.createElement('div');root.id='premiumFight31';root.innerHTML=`
      <div class="pf31-hud">
        <div class="pf31-side player"><div class="pf31-portrait"><img id="pf31PImg"></div><div class="pf31-meta"><div id="pf31PName" class="pf31-name">FIGHTER</div><div class="pf31-bar-shell"><div class="pf31-hp-track"><div id="pf31PHP" class="pf31-hp-fill"></div></div></div><div class="pf31-energy"><div id="pf31PEnergy" class="pf31-energy-fill"></div></div><div id="pf31PValue" class="pf31-value">0 / 0</div></div></div>
        <div class="pf31-center"><div id="pf31Timer" class="pf31-timer">99</div><div id="pf31PRounds" class="pf31-rounds player"></div><div id="pf31ERounds" class="pf31-rounds enemy"></div></div>
        <div class="pf31-side enemy"><div class="pf31-meta"><div id="pf31EName" class="pf31-name">ENEMY</div><div class="pf31-bar-shell"><div class="pf31-hp-track"><div id="pf31EHP" class="pf31-hp-fill"></div></div></div><div class="pf31-energy"><div id="pf31EEnergy" class="pf31-energy-fill"></div></div><div id="pf31EValue" class="pf31-value">0 / 0</div></div><div class="pf31-portrait"><img id="pf31EImg"></div></div>
      </div>
      <div class="pf31-controls"><div class="pf31-move"><div class="pf31-dpad-ring"></div><button class="pf31-left" data-pf31-hold="left">◀</button><button class="pf31-right" data-pf31-hold="right">▶</button><button class="pf31-jump" data-pf31-tap="jump">▲</button><button class="pf31-down" tabindex="-1">▼</button></div><div class="pf31-actions"><button class="pf31-action pf31-light" data-pf31-attack="light"><b>爪</b><span>LIGHT</span></button><button class="pf31-action pf31-heavy" data-pf31-attack="heavy"><b>✦</b><span>HEAVY</span></button><button class="pf31-action pf31-special" data-pf31-attack="special"><b>☠</b><span>SPECIAL</span></button><button class="pf31-action pf31-jump-btn" data-pf31-tap="jump"><b>↥</b><span>JUMP</span></button><button class="pf31-action pf31-block" data-pf31-hold="block"><b>◈</b><span>BLOCK</span></button><button class="pf31-action pf31-ultimate" data-pf31-attack="ultimate"><b>✹</b><span>ULT</span></button></div></div>
      <button id="pf31Pause" class="pf31-pause" type="button">Ⅱ</button>`;
    document.body.appendChild(root);

    const press=(el)=>{el.classList.add('pressed');setTimeout(()=>el.classList.remove('pressed'),110)};
    root.querySelectorAll('[data-pf31-attack]').forEach(btn=>{
      const go=e=>{e.preventDefault();e.stopPropagation();press(btn);const type=btn.dataset.pf31Attack;try{if(gameState==='fight'&&player) startAttack(player,type);}catch(_){try{input.pressed[type]=true;input[type]=true;}catch(__){}}};
      btn.addEventListener('pointerdown',go,{passive:false});
    });
    root.querySelectorAll('[data-pf31-tap="jump"]').forEach(btn=>btn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();press(btn);try{input.jump=true;input.pressed.jump=true;input.buffer?.push?.('jump');}catch(_){try{player.jumpBufferT=.18;}catch(__){}}},{passive:false}));
    root.querySelectorAll('[data-pf31-hold]').forEach(btn=>{
      const key=btn.dataset.pf31Hold;
      const down=e=>{e.preventDefault();e.stopPropagation();btn.classList.add('pressed');try{input[key]=true;if(key==='block')input.pressed.block=true;}catch(_){}};
      const up=e=>{e.preventDefault();e.stopPropagation();btn.classList.remove('pressed');try{input[key]=false;}catch(_){}};
      btn.addEventListener('pointerdown',down,{passive:false});btn.addEventListener('pointerup',up,{passive:false});btn.addEventListener('pointercancel',up,{passive:false});btn.addEventListener('pointerleave',up,{passive:false});
    });
    document.getElementById('pf31Pause')?.addEventListener('click',()=>{try{setPaused(!paused);}catch(_){document.getElementById('pauseBtn')?.click();}});

    const pips=(node,count)=>{if(!node)return;node.innerHTML='';for(let i=0;i<3;i++){const d=document.createElement('i');d.className='pf31-pip'+(i<count?' won':'');node.appendChild(d);}};
    const sync=()=>{
      try{
        const fighting=(typeof gameState!=='undefined'&&gameState==='fight')||document.body.classList.contains('is-fighting');
        root.style.display=fighting?'block':'none';
        if(fighting&&player&&enemy){
          const pMax=Math.max(1,Number(player.maxHp||player.stats?.hp||100));const eMax=Math.max(1,Number(enemy.maxHp||enemy.stats?.hp||100));
          const pHp=Math.max(0,Number(player.hp||0));const eHp=Math.max(0,Number(enemy.hp||0));
          const pPct=Math.max(0,Math.min(100,pHp/pMax*100));const ePct=Math.max(0,Math.min(100,eHp/eMax*100));
          document.getElementById('pf31PHP').style.width=pPct+'%';document.getElementById('pf31EHP').style.width=ePct+'%';
          document.getElementById('pf31PEnergy').style.width=Math.max(0,Math.min(100,Number(player.energy||0)))+'%';document.getElementById('pf31EEnergy').style.width=Math.max(0,Math.min(100,Number(enemy.energy||0)))+'%';
          document.getElementById('pf31PName').textContent=String(player.name||'FIGHTER').toUpperCase();document.getElementById('pf31EName').textContent=String(enemy.name||'ENEMY').toUpperCase();
          document.getElementById('pf31PValue').textContent=Math.ceil(pHp)+' / '+Math.ceil(pMax);document.getElementById('pf31EValue').textContent=Math.ceil(eHp)+' / '+Math.ceil(eMax);
          document.getElementById('pf31Timer').textContent=String(Math.max(0,Math.ceil(Number(roundTime||0)))).padStart(2,'0');
          const pi=document.getElementById('pf31PImg'),ei=document.getElementById('pf31EImg');const ps=pf31PortraitFor(player),es=pf31PortraitFor(enemy);if(pi.getAttribute('src')!==ps)pi.src=ps;if(ei.getAttribute('src')!==es)ei.src=es;
          pips(document.getElementById('pf31PRounds'),Number(playerRounds||0));pips(document.getElementById('pf31ERounds'),Number(enemyRounds||0));
        }
      }catch(_){}
      requestAnimationFrame(sync);
    };requestAnimationFrame(sync);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(installPremiumFight31,0),{once:true});
  else setTimeout(installPremiumFight31,0);
`;

const insertTarget=findFunctionRange(source,'spriteBankKeyForFighter')?'spriteBankKeyForFighter':(findFunctionRange(source,'drawPremiumFighterArt')?'drawPremiumFighterArt':null);
if(!insertTarget) fail('Не найдена точка внедрения боевого renderer.');
source=insertBeforeFunction(source,insertTarget,helpers);

if(findFunctionRange(source,'fighterIsGhlum')){
  source=replaceFunction(source,'fighterIsGhlum',`
  function fighterIsGhlum(f){
    return pf31IsGhlum(f);
  }
  `);
}
source=injectAtFunctionStart(source,'drawSpriteSheetFighter',`    // 31.0 hard route: Ghlum is rendered by his own animation bank before any Raven fallback.\n    if (pf31IsGhlum(f)) return drawGhlumPremium31(f);`,'31.0 hard route: Ghlum',false);
source=injectAtFunctionStart(source,'drawPremiumFighterArt',`    // 31.0 final renderer guard.\n    if (pf31IsGhlum(f)) return drawGhlumPremium31(f);`,'31.0 final renderer guard',true);

const checks=[PATCH_ID,'premiumFight31Styles','drawGhlumPremium31','installPremiumFight31','assets/ghlum31/','pf31IsGhlum'];
for(const check of checks) if(!source.includes(check)) fail(`Проверка патча не пройдена: ${check}`);

fs.writeFileSync(indexPath,source,'utf8');
const report={patch:PATCH_ID,index:path.relative(root,indexPath)||'index.html',backup:path.relative(root,backupPath),assets:'assets/ghlum31',appliedAt:new Date().toISOString(),checks:checks.length};
fs.writeFileSync(path.join(projectDir,'PREMIUM_FIGHT_31_0_APPLIED.json'),JSON.stringify(report,null,2));
console.log('\n============================================================');
console.log('  PREMIUM DARK FANTASY FIGHT 31.0 УСПЕШНО ВНЕДРЁН');
console.log('============================================================');
console.log('index:',indexPath);console.log('backup:',backupPath);console.log('assets:',path.join(projectDir,'assets','ghlum31'));
console.log('\nЗагрузи весь проект заново и обнови сайт Ctrl+Shift+R.');
