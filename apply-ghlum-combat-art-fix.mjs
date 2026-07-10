#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PATCH_ID = '29.1 GHLUM COMBAT ART IDENTITY FIX';

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
  if(fs.existsSync(direct)) return direct;
  const candidates=walk(root)
    .map(file=>({file,size:fs.statSync(file).size,text:fs.readFileSync(file,'utf8')}))
    .filter(x=>/ERALASH\s*(COMBAT|KOMBAT)/i.test(x.text) || /fighter-ghlum|CHARACTER_SELECT_META/i.test(x.text))
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
      if(depth===0) return {start,end:i+1};
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
  if(source.includes("29.1 GHLUM COMBAT ART IDENTITY FIX")) return source;
  const range=findFunctionRange(source,name);
  if(!range) fail(`Не найдена точка вставки перед ${name}().`);
  return source.slice(0,range.start)+block+'\n\n'+source.slice(range.start);
}

function insertAfterPairInFunction(source,functionName,code){
  const range=findFunctionRange(source,functionName);
  if(!range) fail(`Не найдена функция ${functionName}().`);
  let body=source.slice(range.start,range.end);
  if(body.includes('repairGhlumCombatIdentity29_1(player')) return source;
  const pair=/player\s*=\s*makeFighter\(['"]player['"]\);\s*\n\s*enemy\s*=\s*makeFighter\(['"]enemy['"]\);/;
  const m=body.match(pair);
  if(!m) fail(`Не найдена точка создания player/enemy в ${functionName}().`);
  body=body.replace(pair, m[0]+'\n'+code);
  return source.slice(0,range.start)+body+source.slice(range.end);
}

const root=process.argv[2]?path.resolve(process.argv[2]):process.cwd();
if(!fs.existsSync(root)) fail(`Папка не существует: ${root}`);
const indexPath=pickIndex(root);
if(!indexPath) fail('Не найден index.html проекта EraLash Combat.');
let source=fs.readFileSync(indexPath,'utf8');
if(!/fighter-ghlum|CHARACTER_SELECT_META|new-fighter-ghlum-28/i.test(source)) fail('index.html не содержит Ghlum.');

const backupPath=path.join(path.dirname(indexPath),'index.before-ghlum-combat-art-fix-29.1.html');
if(!fs.existsSync(backupPath)) fs.copyFileSync(indexPath,backupPath);

const helpers=`
  /* ==========================================================
     29.1 GHLUM COMBAT ART IDENTITY FIX
     The selected fighter and HUD were already Ghlum, but the combat
     renderer could still identify the player as Raven because one stale
     field won over the valid name/runtime selection.
     ========================================================== */
  const GHLUM_COMBAT_ART_PATCH_29_1 = '${PATCH_ID}';

  function normalizeCombatIdentity29_1(value){
    return String(value || '').trim().toLowerCase().replace(/[\\s-]+/g,'_');
  }

  function selectedRuntimeFighter29_1(){
    const values=[];
    try { values.push(localStorage.getItem('eralashCombatSelectedFighter29_0')); } catch(_) {}
    try { values.push(localStorage.getItem('eralashCombatSelectedFighter28')); } catch(_) {}
    values.push(
      document.body?.getAttribute('data-runtime-fighter'),
      typeof contentState !== 'undefined' ? contentState?.fighterId : '',
      typeof contentBundle !== 'undefined' ? contentBundle?.balance?.activeFighterId : ''
    );
    for(const value of values){
      const id=normalizeCombatIdentity29_1(value);
      if(id==='ghlum'||id==='gollum'||id==='cave_devourer') return 'ghlum';
      if(id==='iron_warden'||id==='warden'||id==='ironwarden') return 'iron_warden';
      if(id==='raven'||id==='shadow_raven') return 'raven';
    }
    return 'raven';
  }

  function ownFighterIdentity29_1(f){
    return [
      f?.contentId,
      f?.fighterId,
      f?.runtimeVisualId29_1,
      f?.runtimeSelection29_0,
      f?.name,
      f?.archetype,
      f?.role,
      f?.specialName,
      f?.finisherName
    ].map(normalizeCombatIdentity29_1).filter(Boolean).join('|');
  }

  function repairGhlumCombatIdentity29_1(f, source='combat_repair_29_1'){
    if(!f || f.id!=='player') return f;
    const selected=selectedRuntimeFighter29_1();
    if(selected!=='ghlum') return f;
    f.contentId='ghlum';
    f.fighterId='ghlum';
    f.runtimeVisualId29_1='ghlum';
    f.runtimeSelection29_0='ghlum';
    f.name='Ghlum';
    f.archetype=f.archetype || 'Cave Devourer';
    f.role=f.role || 'Poison Rushdown Predator';
    f.specialName=f.specialName || 'Venom Leap';
    f.finisherName='ABYSS FEAST';
    try { document.body?.setAttribute('data-combat-art-fighter','ghlum'); } catch(_) {}
    try { localStorage.setItem('eralashCombatArtRepair29_1', JSON.stringify({fighter:'ghlum',source,ts:Date.now()})); } catch(_) {}
    return f;
  }
`;

source=insertBeforeFunction(source,'spriteBankKeyForFighter',helpers);

source=replaceFunction(source,'fighterIsWarden',`
  function fighterIsWarden(f){
    const own=ownFighterIdentity29_1(f);
    return own.includes('iron_warden') || own.includes('ironwarden') || own.includes('warden') || own.includes('iron');
  }
`);

source=replaceFunction(source,'fighterIsGhlum',`
  function fighterIsGhlum(f){
    const own=ownFighterIdentity29_1(f);
    if(own.includes('ghlum') || own.includes('gollum') || own.includes('cave_devourer') || own.includes('abyss_feast')) return true;
    return f?.id==='player' && selectedRuntimeFighter29_1()==='ghlum';
  }
`);

source=replaceFunction(source,'premiumArtForFighter',`
  function premiumArtForFighter(f){
    repairGhlumCombatIdentity29_1(f, 'premium_art_resolve_29_1');
    if (fighterIsGhlum(f)) return premiumFighterArt.ghlum;
    if (fighterIsWarden(f)) return premiumFighterArt.enemy;
    return premiumFighterArt.player;
  }
`);

source=replaceFunction(source,'spriteBankKeyForFighter',`
  function spriteBankKeyForFighter(f){
    repairGhlumCombatIdentity29_1(f, 'sprite_bank_resolve_29_1');
    if (fighterIsGhlum(f)) return 'ghlum';
    return fighterIsWarden(f) ? 'enemy' : 'player';
  }
`);

source=insertAfterPairInFunction(source,'resetRoundPositions',`    repairGhlumCombatIdentity29_1(player, 'round_object_created_29_1');`);

// Cache-bust the dedicated Ghlum combat image. This does not change the asset,
// but prevents the browser/CDN from reusing an old cached Raven response.
source=source.replace(/premiumFighterArt\.ghlum\.src\s*=\s*['"]assets\/fighter-ghlum-28\.webp(?:\?[^'"]*)?['"]\s*;/,
  "premiumFighterArt.ghlum.src = 'assets/fighter-ghlum-28.webp?v=291-combat-art-fix';");

source=source.replace(/<title>[^<]*<\/title>/i,'<title>EraLash Combat — Ghlum Combat Art Fix 29.1</title>');
source=source.replace(/<body class="([^"]*)"/i,(all,classes)=>classes.includes('ghlum-combat-art-fix-29-1')?all:`<body class="${classes} ghlum-combat-art-fix-29-1"`);

const checks=[
  '29.1 GHLUM COMBAT ART IDENTITY FIX',
  'repairGhlumCombatIdentity29_1',
  "return f?.id==='player' && selectedRuntimeFighter29_1()==='ghlum'",
  "premiumFighterArt.ghlum.src = 'assets/fighter-ghlum-28.webp?v=291-combat-art-fix'",
  "repairGhlumCombatIdentity29_1(player, 'round_object_created_29_1')"
];
for(const check of checks) if(!source.includes(check)) fail(`Проверка патча не пройдена: ${check}`);

fs.writeFileSync(indexPath,source,'utf8');
const report={patch:PATCH_ID,index:path.relative(root,indexPath)||'index.html',backup:path.relative(root,backupPath),appliedAt:new Date().toISOString(),checks:checks.length};
fs.writeFileSync(path.join(path.dirname(indexPath),'GHLUM_COMBAT_ART_FIX_29_1_APPLIED.json'),JSON.stringify(report,null,2));
console.log('\n============================================================');
console.log('  GHLUM COMBAT ART FIX 29.1 УСПЕШНО ПРИМЕНЁН');
console.log('============================================================');
console.log(`Файл: ${indexPath}`);
console.log(`Резервная копия: ${backupPath}`);
console.log(`Проверок: ${checks.length}/${checks.length}`);
console.log('\nТеперь собери/загрузи проект заново и обнови страницу Ctrl+Shift+R.');
