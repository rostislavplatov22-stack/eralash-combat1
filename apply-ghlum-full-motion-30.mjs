#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PATCH_ID = '30.0 GHLUM FULL SPRITE MOTION';

function fail(message){
  console.error(`\n[ERROR] ${message}`);
  process.exit(1);
}

function walk(dir, depth=0){
  if(depth>5) return [];
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
    .filter(x=>/ERALASH\s*(COMBAT|KOMBAT)/i.test(x.text) || /fighter-ghlum|CHARACTER_SELECT_META|spriteFighterSheets/i.test(x.text))
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

function replaceFunction(source,name,replacement){
  const range=findFunctionRange(source,name);
  if(!range) fail(`Не найдена функция ${name}().`);
  return source.slice(0,range.start)+replacement.trim()+source.slice(range.end);
}

function insertBeforeFunction(source,name,block){
  if(source.includes(PATCH_ID)) return source;
  const range=findFunctionRange(source,name);
  if(!range) fail(`Не найдена точка вставки перед ${name}().`);
  return source.slice(0,range.start)+block+'\n\n'+source.slice(range.start);
}

function injectAtFunctionStart(source,name,code,marker){
  if(source.includes(marker)) return source;
  const range=findFunctionRange(source,name);
  if(!range) fail(`Не найдена функция ${name}().`);
  return source.slice(0,range.open+1)+'\n'+code+'\n'+source.slice(range.open+1);
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

const patchRoot=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/,m=>m.slice(1)));
const root=process.argv[2]?path.resolve(process.argv[2]):process.cwd();
if(!fs.existsSync(root)) fail(`Папка не существует: ${root}`);
const indexPath=pickIndex(root);
if(!indexPath) fail('Не найден рабочий index.html проекта EraLash Combat.');
let source=fs.readFileSync(indexPath,'utf8');
if(!/fighter-ghlum|CHARACTER_SELECT_META|new-fighter-ghlum-28/i.test(source)) fail('index.html не содержит Ghlum.');

const projectDir=path.dirname(indexPath);
const backupPath=path.join(projectDir,'index.before-ghlum-full-motion-30.0.html');
if(!fs.existsSync(backupPath)) fs.copyFileSync(indexPath,backupPath);

copyDir(path.join(patchRoot,'assets','ghlum30'), path.join(projectDir,'assets','ghlum30'));

const helpers=`
  /* ==========================================================
     30.0 GHLUM FULL SPRITE MOTION
     Dedicated sprite bank: idle, block, attack, special, jump and KO.
     Ghlum no longer falls back to Raven motion or Raven combat art.
     ========================================================== */
  const GHLUM_FULL_MOTION_PATCH_30 = '${PATCH_ID}';

  function normalizeGhlumIdentity30(value){
    return String(value || '').trim().toLowerCase().replace(/[\\s-]+/g,'_');
  }

  function selectedGhlumRuntime30(){
    const values=[];
    try { values.push(localStorage.getItem('eralashCombatSelectedFighter29_0')); } catch(_) {}
    try { values.push(localStorage.getItem('eralashCombatSelectedFighter28')); } catch(_) {}
    try { values.push(localStorage.getItem('eralashCombatSelectedFighter')); } catch(_) {}
    values.push(
      document.body?.getAttribute('data-runtime-fighter'),
      typeof contentState !== 'undefined' ? contentState?.fighterId : '',
      typeof contentBundle !== 'undefined' ? contentBundle?.balance?.activeFighterId : ''
    );
    return values.some(v=>['ghlum','gollum','cave_devourer'].includes(normalizeGhlumIdentity30(v)));
  }

  function ghlumIdentityString30(f){
    return [
      f?.contentId, f?.fighterId, f?.runtimeVisualId29_1,
      f?.runtimeSelection29_0, f?.name, f?.archetype,
      f?.role, f?.specialName, f?.finisherName
    ].map(normalizeGhlumIdentity30).filter(Boolean).join('|');
  }

  function makeGhlumSheet30(file, fps, scale=1){
    const img=new Image();
    img.decoding='async';
    img.src='assets/ghlum30/'+file+'?v=300';
    return { img, frames:6, fps, scale };
  }

  const ghlumSpriteSheets30 = {
    idle: makeGhlumSheet30('ghlum-idle-30.png', 5.2, 1.03),
    walk: makeGhlumSheet30('ghlum-idle-30.png', 8.0, 1.03),
    block: makeGhlumSheet30('ghlum-block-30.png', 10.5, 1.02),
    hit: makeGhlumSheet30('ghlum-block-30.png', 12.0, 1.02),
    light: makeGhlumSheet30('ghlum-attack-30.png', 13.5, 1.04),
    heavy: makeGhlumSheet30('ghlum-attack-30.png', 10.5, 1.05),
    special: makeGhlumSheet30('ghlum-special-30.png', 12.0, 1.05),
    ultimate: makeGhlumSheet30('ghlum-special-30.png', 10.0, 1.08),
    jump: makeGhlumSheet30('ghlum-jump-30.png', 10.0, 1.02),
    ko: makeGhlumSheet30('ghlum-ko-30.png', 8.0, 1.00)
  };

  function ghlumIsAirborne30(f){
    if(!f) return false;
    if(['jump','air','airborne'].includes(String(f.state||'').toLowerCase())) return true;
    if(Math.abs(Number(f.vy||0))>55) return true;
    try { return typeof groundY!=='undefined' && Number(f.y||groundY) < groundY-18; } catch(_) { return false; }
  }

  function ghlumSpriteAnim30(f){
    if(f?.state==='attack' && f?.attack){
      const n=String(f.attack.name||f.lastAttackType||'light').toLowerCase();
      if(n==='ultimate') return ghlumSpriteSheets30.ultimate;
      if(n==='special') return ghlumSpriteSheets30.special;
      if(n==='heavy') return ghlumSpriteSheets30.heavy;
      return ghlumSpriteSheets30.light;
    }
    if(f?.state==='knockdown' || f?.state==='ko') return ghlumSpriteSheets30.ko;
    if(f?.state==='hitstun') return ghlumSpriteSheets30.hit;
    if(f?.state==='block') return ghlumSpriteSheets30.block;
    if(ghlumIsAirborne30(f)) return ghlumSpriteSheets30.jump;
    if(f?.state==='walk' || Math.abs(Number(f?.vx||0))>48) return ghlumSpriteSheets30.walk;
    return ghlumSpriteSheets30.idle;
  }

  function ghlumSpriteFrame30(f,anim){
    const frames=Math.max(1,Number(anim?.frames||6));
    const t=Math.max(0,Number(f?.stateT||0));
    if(f?.state==='attack' && f?.attack){
      const total=Math.max(.001,Number(f.attack.total || ((f.attack.startup||0)+(f.attack.active||0)+(f.attack.recovery||0)) || .5));
      return Math.min(frames-1,Math.floor(Math.min(.999,t/total)*frames));
    }
    if(f?.state==='knockdown' || f?.state==='ko'){
      return Math.min(frames-1,Math.floor(Math.min(.999,t/1.05)*frames));
    }
    if(f?.state==='hitstun') return Math.min(frames-1,Math.floor(Math.min(.999,t/.48)*frames));
    if(f?.state==='block') return Math.min(frames-1,Math.floor(((performance.now()/1000)*(anim.fps||10))%frames));
    if(ghlumIsAirborne30(f)) return Math.min(frames-1,Math.floor(((performance.now()/1000)*(anim.fps||10))%frames));
    return Math.floor(((performance.now()/1000)*(anim.fps||6))%frames);
  }
`;

source=insertBeforeFunction(source,'spriteBankKeyForFighter',helpers);

source=replaceFunction(source,'fighterIsGhlum',`
  function fighterIsGhlum(f){
    const id=ghlumIdentityString30(f);
    if(id.includes('ghlum') || id.includes('gollum') || id.includes('cave_devourer') || id.includes('abyss_feast')) return true;
    return f?.id==='player' && selectedGhlumRuntime30();
  }
`);

source=replaceFunction(source,'spriteBankKeyForFighter',`
  function spriteBankKeyForFighter(f){
    if(fighterIsGhlum(f)) return 'ghlum';
    const id=String(f?.contentId || f?.name || '').toLowerCase();
    return id.includes('warden') ? 'enemy' : 'player';
  }
`);

source=injectAtFunctionStart(source,'spriteAnimForFighter',`    // 30.0 dedicated Ghlum sprite bank\n    if (fighterIsGhlum(f)) return ghlumSpriteAnim30(f);`,'30.0 dedicated Ghlum sprite bank');
source=injectAtFunctionStart(source,'spriteFrameIndex',`    // 30.0 deterministic Ghlum frame timing\n    if (fighterIsGhlum(f)) return ghlumSpriteFrame30(f, anim);`,'30.0 deterministic Ghlum frame timing');

source=source.replace(/if\s*\(\s*!USE_SPRITE_FIGHTERS\s*\)\s*return false\s*;/g,
  'if (!USE_SPRITE_FIGHTERS && !fighterIsGhlum(f)) return false;');

source=source.replace(
  /const visualAccent = f\.colorB \|\| \(isWardenVisual \? '#3eb6ff' : '#c92832'\);/g,
  "const visualAccent = f.colorB || (fighterIsGhlum(f) ? '#79ff4d' : (isWardenVisual ? '#3eb6ff' : '#c92832'));"
);

source=source.replace(/<title>[^<]*<\/title>/i,'<title>EraLash Combat — Ghlum Full Motion 30.0</title>');
source=source.replace(/<body class="([^"]*)"/i,(all,classes)=>classes.includes('ghlum-full-motion-30')?all:`<body class="${classes} ghlum-full-motion-30"`);

const checks=[
  PATCH_ID,
  'ghlumSpriteSheets30',
  "ghlum-idle-30.png",
  "ghlum-special-30.png",
  'if (fighterIsGhlum(f)) return ghlumSpriteAnim30(f);',
  'if (fighterIsGhlum(f)) return ghlumSpriteFrame30(f, anim);',
  'if (!USE_SPRITE_FIGHTERS && !fighterIsGhlum(f)) return false;'
];
for(const check of checks) if(!source.includes(check)) fail(`Проверка патча не пройдена: ${check}`);

fs.writeFileSync(indexPath,source,'utf8');
const report={
  patch:PATCH_ID,
  index:path.relative(root,indexPath)||'index.html',
  backup:path.relative(root,backupPath),
  assets:'assets/ghlum30',
  appliedAt:new Date().toISOString(),
  checks:checks.length
};
fs.writeFileSync(path.join(projectDir,'GHLUM_FULL_MOTION_30_0_APPLIED.json'),JSON.stringify(report,null,2));

console.log('\n============================================================');
console.log('  GHLUM FULL MOTION 30.0 УСПЕШНО ВНЕДРЁН');
console.log('============================================================');
console.log('index:',indexPath);
console.log('assets:',path.join(projectDir,'assets','ghlum30'));
console.log('backup:',backupPath);
console.log('\nТеперь загрузи проект заново и обнови сайт Ctrl+Shift+R.');
