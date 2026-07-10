#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PATCH_ID = '31.1 HARD COMBAT REPLACEMENT';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const patchRoot = path.dirname(fileURLToPath(import.meta.url));

function fail(message){
  console.error(`\n[31.1 ERROR] ${message}`);
  process.exit(1);
}

function walk(dir, depth = 0){
  if (depth > 8 || !fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','.git','.vercel','dist','.next','coverage'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, depth + 1));
    else if (entry.isFile() && entry.name.toLowerCase() === 'index.html') out.push(full);
  }
  return out;
}

function scoreIndex(file){
  const text = fs.readFileSync(file, 'utf8');
  let score = Math.min(fs.statSync(file).size / 1000, 2000);
  if (/ERALASH\s*(COMBAT|KOMBAT)/i.test(text)) score += 5000;
  if (/drawPremiumFighterArt|drawSpriteSheetFighter|CHARACTER_SELECT_META/.test(text)) score += 10000;
  if (/fighter-ghlum|id:\s*['"]ghlum['"]/.test(text)) score += 4000;
  if (text.includes(PATCH_ID)) score -= 500;
  return { file, text, score };
}

function pickIndex(dir){
  const files = walk(dir).map(scoreIndex).sort((a,b) => b.score - a.score);
  return files.find(x => x.score > 5000) || null;
}

function findFunctionRange(source, name){
  const patterns = [`function ${name}(`, `function ${name} (`];
  let start = -1;
  for (const p of patterns) { start = source.indexOf(p); if (start >= 0) break; }
  if (start < 0) return null;
  const open = source.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0, state = 'normal', escaped = false;
  for (let i = open; i < source.length; i++) {
    const ch = source[i], next = source[i+1];
    if (state === 'line') { if (ch === '\n') state = 'normal'; continue; }
    if (state === 'block') { if (ch === '*' && next === '/') { state = 'normal'; i++; } continue; }
    if (state === 'single' || state === 'double' || state === 'template') {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if ((state === 'single' && ch === "'") || (state === 'double' && ch === '"') || (state === 'template' && ch === '`')) state = 'normal';
      continue;
    }
    if (ch === '/' && next === '/') { state = 'line'; i++; continue; }
    if (ch === '/' && next === '*') { state = 'block'; i++; continue; }
    if (ch === "'") { state = 'single'; continue; }
    if (ch === '"') { state = 'double'; continue; }
    if (ch === '`') { state = 'template'; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { start, open, end: i + 1 };
    }
  }
  return null;
}

function insertBeforeFunction(source, name, block){
  const range = findFunctionRange(source, name);
  if (!range) fail(`Не найдена функция ${name} для главной вставки.`);
  return source.slice(0, range.start) + block + '\n\n' + source.slice(range.start);
}

function injectAtStart(source, name, code, marker, required = false){
  if (source.includes(marker)) return source;
  const range = findFunctionRange(source, name);
  if (!range) {
    if (required) fail(`Не найдена обязательная функция ${name}().`);
    return source;
  }
  return source.slice(0, range.open + 1) + `\n${code}\n` + source.slice(range.open + 1);
}

function injectAtEnd(source, name, code, marker, required = false){
  if (source.includes(marker)) return source;
  const range = findFunctionRange(source, name);
  if (!range) {
    if (required) fail(`Не найдена обязательная функция ${name}().`);
    return source;
  }
  return source.slice(0, range.end - 1) + `\n${code}\n` + source.slice(range.end - 1);
}

function replaceFunction(source, name, replacement){
  const range = findFunctionRange(source, name);
  if (!range) return source;
  return source.slice(0, range.start) + replacement.trim() + source.slice(range.end);
}

function copyDir(src, dst){
  if (!fs.existsSync(src)) fail(`Нет ассетов: ${src}`);
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (path.resolve(s) !== path.resolve(d)) fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(root)) fail(`Папка проекта не существует: ${root}`);
const picked = pickIndex(root);
if (!picked) fail('Не найден рабочий большой index.html EraLash Combat.');
const indexPath = picked.file;
let source = picked.text;
const projectDir = path.dirname(indexPath);

// If an old local installer was actually run, restore its clean backup first.
if (/31\.0 PREMIUM DARK FANTASY FIGHT REDESIGN|premiumFight31Styles|drawGhlumPremium31/.test(source)) {
  const candidates = [
    'index.before-premium-fight-31.0.html',
    'index.before-ghlum-full-motion-30.0.html',
    'index.before-ghlum-art-fix-29.1.html',
    'index.before-ghlum-runtime-lock-29.0.html'
  ].map(n => path.join(projectDir,n));
  const clean = candidates.find(f => fs.existsSync(f) && fs.statSync(f).size > 100000);
  if (clean) source = fs.readFileSync(clean, 'utf8');
}
if (source.includes(PATCH_ID)) {
  console.log('[31.1] Уже внедрено:', indexPath);
  process.exit(0);
}
if (!/drawPremiumFighterArt|drawSpriteSheetFighter/.test(source)) fail('В выбранном index.html нет боевого renderer.');

const backupPath = path.join(projectDir, 'index.before-hard-combat-31.1.html');
if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, source, 'utf8');
copyDir(path.join(patchRoot,'assets','ghlum311'), path.join(projectDir,'assets','ghlum311'));

const css = String.raw`
<style id="hardCombat311Styles">
:root{--hc-gold:#d1ad61;--hc-gold2:#f2d999;--hc-black:#030406;--hc-green:#72bd37;--hc-red:#b71d31;--hc-blue:#318bd3}
body.hard-combat-31-1{overflow:hidden;background:#020305}
#hardCombat311{position:fixed;inset:0;z-index:2147481000;display:none;pointer-events:none;color:#f5efe0;font-family:Georgia,'Times New Roman',serif}
body.is-fighting #hardCombat311,body[data-game-state="fight"] #hardCombat311{display:block}
.hc311-top-mask{position:absolute;inset:0 0 auto;height:174px;background:linear-gradient(180deg,rgba(1,2,4,.98) 0%,rgba(2,3,5,.92) 54%,rgba(2,3,5,.45) 78%,transparent 100%);z-index:1}
.hc311-bottom-mask{position:absolute;inset:auto 0 0;height:222px;background:linear-gradient(0deg,rgba(1,2,4,.98) 0%,rgba(2,3,5,.88) 42%,rgba(2,3,5,.28) 76%,transparent 100%);z-index:1}
.hc311-grade{position:absolute;inset:0;z-index:2;background:radial-gradient(ellipse at 18% 56%,rgba(182,18,37,.18),transparent 37%),radial-gradient(ellipse at 82% 56%,rgba(36,123,226,.16),transparent 37%),radial-gradient(ellipse at 50% 55%,transparent 34%,rgba(0,0,0,.34) 78%,rgba(0,0,0,.72) 100%);mix-blend-mode:screen}
.hc311-top{position:absolute;z-index:5;left:18px;right:18px;top:15px;height:135px;display:grid;grid-template-columns:minmax(0,1fr) 144px minmax(0,1fr);gap:22px;align-items:start;filter:drop-shadow(0 12px 22px rgba(0,0,0,.85))}
.hc311-side{display:grid;grid-template-columns:112px minmax(0,1fr);gap:14px;align-items:start}.hc311-side.enemy{grid-template-columns:minmax(0,1fr) 112px;text-align:right}.hc311-side.enemy .hc311-portrait{order:2}.hc311-side.enemy .hc311-info{order:1}
.hc311-portrait{width:108px;height:108px;overflow:hidden;background:#06070a;border:2px solid var(--hc-gold);clip-path:polygon(9% 0,91% 0,100% 9%,100% 91%,91% 100%,9% 100%,0 91%,0 9%);box-shadow:0 0 0 3px #050506,0 0 22px rgba(209,173,97,.22),inset 0 0 20px #000}.hc311-portrait img{width:100%;height:100%;object-fit:cover;object-position:center 18%;filter:contrast(1.15) saturate(.9) brightness(.94)}
.hc311-name{font-size:clamp(22px,2.1vw,34px);font-weight:900;letter-spacing:.045em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 3px 8px #000;margin:3px 0 8px}.hc311-side.enemy .hc311-name{text-align:right}
.hc311-bar-frame{height:28px;padding:4px;border:1px solid rgba(224,190,107,.9);background:linear-gradient(#131416,#030405);box-shadow:inset 0 0 0 2px #020203,0 2px 0 rgba(255,255,255,.05);clip-path:polygon(0 0,98.4% 0,100% 50%,98.4% 100%,0 100%)}.hc311-side.enemy .hc311-bar-frame{clip-path:polygon(1.6% 0,100% 0,100% 100%,1.6% 100%,0 50%)}
.hc311-hp-track{height:100%;overflow:hidden;background:#181b12;box-shadow:inset 0 0 9px #000}.hc311-hp{height:100%;width:100%;background:linear-gradient(180deg,#b2dd62,#6daf31 52%,#3c731e);box-shadow:inset 0 2px rgba(255,255,255,.26),0 0 15px rgba(92,192,45,.38);transition:width .1s linear}.hc311-side.enemy .hc311-hp{margin-left:auto}
.hc311-energy-track{height:6px;margin-top:5px;background:#08090a;border:1px solid rgba(209,173,97,.42);overflow:hidden}.hc311-energy{height:100%;width:0;background:linear-gradient(90deg,#62430f,#d6a942,#fff1a7);box-shadow:0 0 11px rgba(234,189,75,.48)}.hc311-side.enemy .hc311-energy{margin-left:auto}
.hc311-value{margin-top:4px;font-size:15px;font-weight:700;letter-spacing:.03em;text-shadow:0 2px 5px #000}.hc311-side.enemy .hc311-value{text-align:right}
.hc311-clock{position:relative;width:136px;height:136px;display:grid;place-items:center}.hc311-clock::before{content:"";position:absolute;inset:0;background:radial-gradient(circle,#161719 0 43%,#030405 44% 55%,transparent 56%),conic-gradient(#65491f,#e3c77c,#4a3212,#d9b869,#65491f);clip-path:polygon(50% 0,62% 9%,76% 5%,85% 18%,98% 25%,94% 41%,100% 52%,91% 64%,94% 79%,79% 85%,68% 98%,52% 92%,38% 100%,27% 89%,11% 92%,7% 75%,0 64%,7% 50%,1% 36%,15% 27%,19% 11%,36% 10%);filter:drop-shadow(0 7px 10px #000)}.hc311-time{position:relative;z-index:2;font-size:58px;font-weight:900;line-height:1;text-shadow:0 4px 7px #000}
.hc311-pips{position:absolute;bottom:-2px;z-index:3;display:flex;gap:8px}.hc311-pips.p{right:calc(50% + 82px)}.hc311-pips.e{left:calc(50% + 82px)}.hc311-pip{width:18px;height:18px;border-radius:50%;border:2px solid rgba(209,173,97,.86);background:#030405;box-shadow:inset 0 0 7px #000}.hc311-pip.won{background:radial-gradient(circle at 35% 30%,#fff3b4,#d7a135 44%,#5e330d 78%);box-shadow:0 0 11px rgba(239,187,61,.66)}
.hc311-controls{position:absolute;z-index:6;left:20px;right:20px;bottom:17px;height:196px;display:flex;align-items:end;justify-content:space-between}.hc311-dpad{position:relative;width:174px;height:174px;pointer-events:auto;border-radius:50%;background:radial-gradient(circle,#26272a 0 20%,#090a0c 21% 58%,#1c1d20 59% 63%,#040506 64%);border:2px solid rgba(209,173,97,.64);box-shadow:0 10px 28px rgba(0,0,0,.7),inset 0 0 20px #000}.hc311-dpad button{position:absolute;width:62px;height:62px;border:0;background:transparent;color:#e9e2d3;font-size:29px;text-shadow:0 2px 6px #000;pointer-events:auto;touch-action:none;cursor:pointer}.hc311-left{left:3px;top:55px}.hc311-right{right:3px;top:55px}.hc311-up{left:55px;top:3px}.hc311-down{left:55px;bottom:3px;opacity:.35}
.hc311-actions{position:relative;width:min(510px,48vw);height:190px;pointer-events:auto}.hc311-btn{position:absolute;width:92px;height:92px;border-radius:50%;border:2px solid rgba(209,173,97,.7);background:radial-gradient(circle at 40% 34%,#282a2e,#090a0d 57%,#020203 75%);box-shadow:0 10px 26px rgba(0,0,0,.72),inset 0 0 0 3px #030405;color:#f4eee1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;pointer-events:auto;touch-action:none;cursor:pointer;text-shadow:0 2px 6px #000;transition:transform .07s,filter .07s}.hc311-btn:active,.hc311-btn.pressed{transform:scale(.92);filter:brightness(1.42)}.hc311-btn b{font-size:27px;line-height:1}.hc311-btn span{font-size:12px;font-weight:900;letter-spacing:.055em}.hc311-light{left:0;bottom:0}.hc311-heavy{left:96px;bottom:64px}.hc311-jump-btn{left:192px;bottom:0}.hc311-ult{right:103px;bottom:64px;border-color:rgba(190,43,58,.86);background:radial-gradient(circle at 40% 34%,#50131d,#160609 59%,#020203 76%)}.hc311-special{right:0;top:0;border-color:rgba(99,199,65,.86);box-shadow:0 10px 26px rgba(0,0,0,.72),0 0 18px rgba(81,207,55,.18),inset 0 0 0 3px #030405}.hc311-block{right:0;bottom:0;width:112px;height:112px}
.hc311-pause{position:absolute;z-index:8;left:50%;bottom:18px;transform:translateX(-50%);width:54px;height:54px;border-radius:50%;pointer-events:auto;border:2px solid rgba(209,173,97,.7);background:#07080a;color:#eee7d8;font-size:20px;font-weight:900;box-shadow:0 8px 22px rgba(0,0,0,.65),inset 0 0 0 3px #020203}
.hc311-banner{position:absolute;z-index:9;left:50%;top:44%;transform:translate(-50%,-50%) scale(.92);opacity:0;pointer-events:none;text-align:center;transition:opacity .16s,transform .22s}.hc311-banner.show{opacity:1;transform:translate(-50%,-50%) scale(1)}.hc311-banner strong{display:block;font-size:clamp(54px,7.5vw,112px);line-height:.9;letter-spacing:.025em;text-transform:uppercase;background:linear-gradient(#fff8de,#d5b76f 58%,#876329);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 5px 0 rgba(25,16,7,.7),0 15px 32px #000;filter:drop-shadow(0 0 2px #000)}.hc311-banner small{display:block;margin-top:12px;font-size:18px;letter-spacing:.16em;text-transform:uppercase;color:#e0c77f;text-shadow:0 3px 8px #000}
body.hard-combat-31-1.is-fighting #hud,body.hard-combat-31-1.is-fighting #combatHud,body.hard-combat-31-1.is-fighting #fightHud,body.hard-combat-31-1.is-fighting #mobileControls,body.hard-combat-31-1.is-fighting #controls,body.hard-combat-31-1.is-fighting .hud,body.hard-combat-31-1.is-fighting .combat-hud,body.hard-combat-31-1.is-fighting .fight-hud,body.hard-combat-31-1.is-fighting .fight5-hud,body.hard-combat-31-1.is-fighting .mobile-controls,body.hard-combat-31-1.is-fighting .combat-controls,body.hard-combat-31-1.is-fighting .touch-controls,body.hard-combat-31-1.is-fighting #arenaIntro17,body.hard-combat-31-1.is-fighting .arena-intro-17{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
body.hard-combat-31-1.is-fighting #callout,body.hard-combat-31-1.is-fighting #calloutBig,body.hard-combat-31-1.is-fighting #calloutSmall{opacity:0!important;visibility:hidden!important}
@media(max-width:900px){.hc311-top-mask{height:112px}.hc311-bottom-mask{height:154px}.hc311-top{left:6px;right:6px;top:5px;height:91px;grid-template-columns:minmax(0,1fr) 82px minmax(0,1fr);gap:6px}.hc311-side{grid-template-columns:66px minmax(0,1fr);gap:6px}.hc311-side.enemy{grid-template-columns:minmax(0,1fr) 66px}.hc311-portrait{width:64px;height:64px}.hc311-name{font-size:12px;margin:1px 0 3px}.hc311-bar-frame{height:17px;padding:3px}.hc311-energy-track{height:3px;margin-top:3px}.hc311-value{font-size:9px;margin-top:2px}.hc311-clock{width:80px;height:80px}.hc311-time{font-size:34px}.hc311-pips{display:none}.hc311-controls{left:7px;right:7px;bottom:5px;height:132px}.hc311-dpad{width:118px;height:118px}.hc311-dpad button{width:42px;height:42px;font-size:20px}.hc311-left{top:37px}.hc311-right{top:37px}.hc311-up{left:37px}.hc311-down{left:37px}.hc311-actions{width:300px;height:128px}.hc311-btn{width:66px;height:66px}.hc311-btn b{font-size:18px}.hc311-btn span{font-size:8px}.hc311-light{left:0}.hc311-heavy{left:61px;bottom:43px}.hc311-jump-btn{left:122px}.hc311-ult{right:69px;bottom:43px}.hc311-special{right:0}.hc311-block{width:76px;height:76px}.hc311-pause{width:40px;height:40px;bottom:7px;font-size:14px}.hc311-banner strong{font-size:52px}.hc311-banner small{font-size:11px}}
@media(pointer:fine) and (min-width:1000px){.hc311-controls{opacity:.92}.hc311-dpad{transform:scale(.9);transform-origin:left bottom}.hc311-actions{transform:scale(.9);transform-origin:right bottom}}
</style>`;

if (!source.includes('hardCombat311Styles')) source = source.replace(/<\/head>/i, css + '\n</head>');
source = source.replace(/<body([^>]*)>/i, (m,attrs) => {
  if (/hard-combat-31-1/.test(m)) return m;
  if (/class\s*=/.test(attrs)) return `<body${attrs.replace(/class\s*=\s*(["'])(.*?)\1/i,(x,q,c)=>`class=${q}${c} hard-combat-31-1${q}`)}>`;
  return `<body${attrs} class="hard-combat-31-1">`;
});

const helpers = String.raw`
/* ==========================================================
   31.1 HARD COMBAT REPLACEMENT
   This is the only Ghlum renderer and the only fight HUD.
   ========================================================== */
const HARD_COMBAT_PATCH_31_1 = '${PATCH_ID}';
function hc311Norm(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_')}
function hc311Identity(f){return [f?.contentId,f?.fighterId,f?.name,f?.archetype,f?.role,f?.specialName,f?.finisherName].map(hc311Norm).filter(Boolean).join('|')}
function hc311SelectedGhlum(){const a=[];try{a.push(JSON.parse(localStorage.getItem('eralashCombatContentState')||'null')?.fighterId)}catch(_){};try{a.push(localStorage.getItem('eralashCombatSelectedFighter28'))}catch(_){};try{a.push(localStorage.getItem('eralashCombatSelectedFighter29_0'))}catch(_){};a.push(typeof contentState!=='undefined'?contentState?.fighterId:'',typeof contentBundle!=='undefined'?contentBundle?.balance?.activeFighterId:'',document.body?.dataset?.runtimeFighter);return a.some(v=>['ghlum','gollum','cave_devourer'].includes(hc311Norm(v)))}
function hc311IsGhlum(f){const id=hc311Identity(f);return id.includes('ghlum')||id.includes('gollum')||id.includes('cave_devourer')||id.includes('abyss_feast')||(f?.id==='player'&&hc311SelectedGhlum())}
function hc311Sheet(file,frames=6,fps=8){const img=new Image();img.decoding='async';img.loading='eager';img.src='assets/ghlum311/'+file+'?v=311';return{img,frames,fps}}
const hc311Sheets={idle:hc311Sheet('ghlum-idle-30.png',6,5.2),walk:hc311Sheet('ghlum-idle-30.png',6,8),block:hc311Sheet('ghlum-block-30.png',6,9),hit:hc311Sheet('ghlum-block-30.png',6,12),light:hc311Sheet('ghlum-attack-30.png',6,14),heavy:hc311Sheet('ghlum-attack-30.png',6,10),special:hc311Sheet('ghlum-special-30.png',6,12),ultimate:hc311Sheet('ghlum-special-30.png',6,9),jump:hc311Sheet('ghlum-jump-30.png',6,10),ko:hc311Sheet('ghlum-ko-30.png',6,7)};
function hc311Anim(f){if(f?.state==='attack'&&f?.attack){const n=String(f.attack.name||f.lastAttackType||'light').toLowerCase();return hc311Sheets[n]||hc311Sheets.light}if(f?.state==='knockdown'||f?.state==='ko')return hc311Sheets.ko;if(f?.state==='hitstun')return hc311Sheets.hit;if(f?.state==='block')return hc311Sheets.block;const air=Math.abs(Number(f?.vy||0))>45||(typeof groundY!=='undefined'&&Number(f?.y||groundY)<groundY-18);if(air)return hc311Sheets.jump;if(f?.state==='walk'||Math.abs(Number(f?.vx||0))>45)return hc311Sheets.walk;return hc311Sheets.idle}
function hc311Frame(f,a){const n=Math.max(1,a?.frames||6),t=Math.max(0,Number(f?.stateT||0));if(f?.state==='attack'&&f?.attack){const total=Math.max(.001,Number(f.attack.total||.45));return Math.min(n-1,Math.floor(Math.min(.999,t/total)*n))}if(f?.state==='knockdown'||f?.state==='ko')return Math.min(n-1,Math.floor(Math.min(.999,t/1.05)*n));if(f?.state==='hitstun')return Math.min(n-1,Math.floor(Math.min(.999,t/.48)*n));return Math.floor(((performance.now()/1000)*(a?.fps||8))%n)}
function drawGhlumHard311(f){if(!hc311IsGhlum(f))return false;const a=hc311Anim(f),img=a?.img;if(!img||!img.complete||!img.naturalWidth||!img.naturalHeight)return true;const frames=Math.max(1,a.frames||6),frame=hc311Frame(f,a),fw=img.naturalWidth/frames,fh=img.naturalHeight,coarse=!!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);let sh=coarse?Math.max(285,Math.min(h*.54,475)):Math.max(430,Math.min(h*.64,690));let sw=sh*(fw/Math.max(1,fh));const maxW=coarse?w*.42:w*.33;if(sw>maxW){const k=maxW/sw;sw*=k;sh*=k}const dir=f.dir||1,hurt=f.state==='hitstun'||f.state==='knockdown',att=f.state==='attack',block=f.state==='block',p=att&&f.attack?Math.min(1,Math.max(0,f.stateT/Math.max(.001,f.attack.total||.45))):0,punch=att?Math.sin(p*Math.PI):0,x=f.x+dir*punch*(f.attack?.name==='ultimate'?48:f.attack?.name==='special'?38:23),y=f.y+(hurt?5:0);ctx.save();const shadowW=Math.max(88,sw*.35),g=ctx.createRadialGradient(x,y+8,8,x,y+8,shadowW);g.addColorStop(0,'rgba(0,0,0,.94)');g.addColorStop(.48,'rgba(0,0,0,.48)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y+9,shadowW,21,0,0,Math.PI*2);ctx.fill();ctx.restore();if(att&&(f.attack?.name==='special'||f.attack?.name==='ultimate')){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.18+.30*punch;const aura=ctx.createRadialGradient(x,y-sh*.52,0,x,y-sh*.52,sw*.7);aura.addColorStop(0,'rgba(134,255,83,.66)');aura.addColorStop(.42,'rgba(67,218,55,.22)');aura.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=aura;ctx.beginPath();ctx.ellipse(x,y-sh*.50,sw*.58,sh*.44,0,0,Math.PI*2);ctx.fill();ctx.restore()}ctx.save();ctx.translate(x,y);ctx.scale(dir,1);ctx.rotate((block?-.035:0)+(hurt?-.065:0)+(att?dir*.025*punch:0));ctx.filter=hurt?'brightness(1.42) contrast(1.18) saturate(.9)':'brightness(1.1) contrast(1.17) saturate(.95)';ctx.shadowColor=att?'rgba(111,255,70,.58)':'rgba(0,0,0,.9)';ctx.shadowBlur=att?24:14;ctx.drawImage(img,frame*fw,0,fw,fh,-sw*.5,-sh,sw,sh);ctx.restore();return true}
function hc311Portrait(f){const id=hc311Identity(f);if(id.includes('ghlum')||id.includes('gollum')||id.includes('cave_devourer'))return'assets/fighter-portrait-ghlum-28.webp';if(id.includes('warden')||id.includes('iron'))return'assets/fighter-portrait-warden-24.webp';return'assets/fighter-portrait-raven-24.webp'}
let hc311BannerTimer=0;
function hc311ShowCallout(big,small=''){const b=document.getElementById('hc311Banner');if(!b)return;document.getElementById('hc311BannerBig').textContent=String(big||'');document.getElementById('hc311BannerSmall').textContent=String(small||'');b.classList.add('show');clearTimeout(hc311BannerTimer);hc311BannerTimer=setTimeout(()=>b.classList.remove('show'),String(big).toUpperCase()==='FIGHT'?720:950)}
function hc311HideLegacy(){const root=document.getElementById('hardCombat311');for(const el of document.querySelectorAll('button,[role="button"],div,section,aside')){if(root?.contains(el))continue;const t=String(el.textContent||'').trim().replace(/\s+/g,' ').toUpperCase();const rect=el.getBoundingClientRect?.();if(!rect||rect.width<20||rect.height<20)continue;const control=/^(L|H|BLK|SP|ULT|DGE|LIGHT|HEAVY|BLOCK|SPECIAL|ULTIMATE|JUMP)$/.test(t);const stage=t.startsWith('TRUE STAGE')||t.includes('COMBAT STYLE')||t==='ARENA AI';if((control&&rect.top>innerHeight*.65)||(stage&&rect.top<innerHeight*.35&&rect.width<500)){el.dataset.hc311Hidden='1';el.style.setProperty('opacity','0','important');el.style.setProperty('visibility','hidden','important');el.style.setProperty('pointer-events','none','important')}}}
function installHardCombat311(){if(document.getElementById('hardCombat311'))return;const r=document.createElement('div');r.id='hardCombat311';r.innerHTML='<div class="hc311-top-mask"></div><div class="hc311-bottom-mask"></div><div class="hc311-grade"></div><div class="hc311-top"><div class="hc311-side player"><div class="hc311-portrait"><img id="hc311PImg"></div><div class="hc311-info"><div id="hc311PName" class="hc311-name">FIGHTER</div><div class="hc311-bar-frame"><div class="hc311-hp-track"><div id="hc311PHP" class="hc311-hp"></div></div></div><div class="hc311-energy-track"><div id="hc311PE" class="hc311-energy"></div></div><div id="hc311PV" class="hc311-value">0 / 0</div></div></div><div class="hc311-clock"><div id="hc311Time" class="hc311-time">99</div><div id="hc311PR" class="hc311-pips p"></div><div id="hc311ER" class="hc311-pips e"></div></div><div class="hc311-side enemy"><div class="hc311-info"><div id="hc311EName" class="hc311-name">ENEMY</div><div class="hc311-bar-frame"><div class="hc311-hp-track"><div id="hc311EHP" class="hc311-hp"></div></div></div><div class="hc311-energy-track"><div id="hc311EE" class="hc311-energy"></div></div><div id="hc311EV" class="hc311-value">0 / 0</div></div><div class="hc311-portrait"><img id="hc311EImg"></div></div></div><div class="hc311-banner" id="hc311Banner"><strong id="hc311BannerBig"></strong><small id="hc311BannerSmall"></small></div><div class="hc311-controls"><div class="hc311-dpad"><button class="hc311-left" data-hold="left">◀</button><button class="hc311-right" data-hold="right">▶</button><button class="hc311-up" data-tap="jump">▲</button><button class="hc311-down" tabindex="-1">▼</button></div><div class="hc311-actions"><button class="hc311-btn hc311-light" data-attack="light"><b>爪</b><span>LIGHT</span></button><button class="hc311-btn hc311-heavy" data-attack="heavy"><b>✦</b><span>HEAVY</span></button><button class="hc311-btn hc311-jump-btn" data-tap="jump"><b>↥</b><span>JUMP</span></button><button class="hc311-btn hc311-ult" data-attack="ultimate"><b>✹</b><span>ULT</span></button><button class="hc311-btn hc311-special" data-attack="special"><b>☠</b><span>SPECIAL</span></button><button class="hc311-btn hc311-block" data-hold="block"><b>◈</b><span>BLOCK</span></button></div></div><button id="hc311Pause" class="hc311-pause">Ⅱ</button>';document.body.appendChild(r);const pulse=b=>{b.classList.add('pressed');setTimeout(()=>b.classList.remove('pressed'),100)};r.querySelectorAll('[data-attack]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();pulse(b);const type=b.dataset.attack;try{if(gameState==='fight'&&player)startAttack(player,type)}catch(_){try{input.pressed[type]=true;input[type]=true}catch(__){}}},{passive:false}));r.querySelectorAll('[data-tap="jump"]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();pulse(b);try{input.jump=true;input.pressed.jump=true;input.buffer?.push?.('jump')}catch(_){try{player.jumpBufferT=.18}catch(__){}}},{passive:false}));r.querySelectorAll('[data-hold]').forEach(b=>{const key=b.dataset.hold;const down=e=>{e.preventDefault();e.stopPropagation();b.classList.add('pressed');try{input[key]=true;if(key==='block')input.pressed.block=true}catch(_){}};const up=e=>{e.preventDefault();e.stopPropagation();b.classList.remove('pressed');try{input[key]=false}catch(_){}};b.addEventListener('pointerdown',down,{passive:false});['pointerup','pointercancel','pointerleave'].forEach(n=>b.addEventListener(n,up,{passive:false}));window.addEventListener('pointerup',up,{passive:false})});document.getElementById('hc311Pause')?.addEventListener('click',()=>{try{setPaused(!paused)}catch(_){document.getElementById('pauseBtn')?.click()}});const pips=(node,count)=>{if(!node)return;node.innerHTML='';for(let i=0;i<3;i++){const d=document.createElement('i');d.className='hc311-pip'+(i<count?' won':'');node.appendChild(d)}};let lastHide=0;const sync=()=>{try{const fighting=(typeof gameState!=='undefined'&&gameState==='fight')||document.body.classList.contains('is-fighting');r.style.display=fighting?'block':'none';document.body.dataset.gameState=fighting?'fight':'menu';if(fighting&&performance.now()-lastHide>800){hc311HideLegacy();lastHide=performance.now()}if(fighting&&player&&enemy){const pm=Math.max(1,Number(player.maxHp||100)),em=Math.max(1,Number(enemy.maxHp||100)),ph=Math.max(0,Number(player.hp||0)),eh=Math.max(0,Number(enemy.hp||0));document.getElementById('hc311PHP').style.width=Math.max(0,Math.min(100,ph/pm*100))+'%';document.getElementById('hc311EHP').style.width=Math.max(0,Math.min(100,eh/em*100))+'%';document.getElementById('hc311PE').style.width=Math.max(0,Math.min(100,Number(player.energy||0)))+'%';document.getElementById('hc311EE').style.width=Math.max(0,Math.min(100,Number(enemy.energy||0)))+'%';document.getElementById('hc311PName').textContent=String(player.name||'FIGHTER').toUpperCase();document.getElementById('hc311EName').textContent=String(enemy.name||'ENEMY').toUpperCase();document.getElementById('hc311PV').textContent=Math.ceil(ph)+' / '+Math.ceil(pm);document.getElementById('hc311EV').textContent=Math.ceil(eh)+' / '+Math.ceil(em);document.getElementById('hc311Time').textContent=String(Math.max(0,Math.ceil(Number(roundTime||0)))).padStart(2,'0');const pi=document.getElementById('hc311PImg'),ei=document.getElementById('hc311EImg'),ps=hc311Portrait(player),es=hc311Portrait(enemy);if(pi.getAttribute('src')!==ps)pi.src=ps;if(ei.getAttribute('src')!==es)ei.src=es;pips(document.getElementById('hc311PR'),Number(playerRounds||0));pips(document.getElementById('hc311ER'),Number(enemyRounds||0))}}catch(_){}requestAnimationFrame(sync)};requestAnimationFrame(sync);try{const original=ctx.fillText.bind(ctx);ctx.fillText=function(text,...args){const t=String(text||'').trim().toUpperCase();const fighting=(typeof gameState!=='undefined'&&gameState==='fight')||document.body.classList.contains('is-fighting');if(fighting&&(t===String(player?.name||'').toUpperCase()||t===String(enemy?.name||'').toUpperCase()||t.includes('TRUE STAGE')||t==='COMBAT STYLE'||t==='ARENA AI'))return;return original(text,...args)}}catch(_){} }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installHardCombat311,0),{once:true});else setTimeout(installHardCombat311,0);
`;

const insertTarget = findFunctionRange(source,'spriteBankKeyForFighter') ? 'spriteBankKeyForFighter' : 'drawPremiumFighterArt';
source = insertBeforeFunction(source, insertTarget, helpers);
source = replaceFunction(source,'fighterIsGhlum',`function fighterIsGhlum(f){return hc311IsGhlum(f);}`);
source = injectAtStart(source,'drawSpriteSheetFighter',`    // 31.1 GHLUM HARD STOP: no Raven bank is allowed.\n    if (hc311IsGhlum(f)) return drawGhlumHard311(f);`,'31.1 GHLUM HARD STOP',false);
source = injectAtStart(source,'drawPremiumFighterArt',`    // 31.1 FINAL GHLUM RENDERER: bypass every legacy fallback.\n    if (hc311IsGhlum(f)) return drawGhlumHard311(f);`,'31.1 FINAL GHLUM RENDERER',true);
source = injectAtStart(source,'showCallout',`    // 31.1 replaces the legacy giant box with the premium center banner.\n    if (typeof hc311ShowCallout === 'function') { hc311ShowCallout(big, small); return; }`,'31.1 replaces the legacy giant box',false);
source = injectAtEnd(source,'resetRoundPositions',`    // 31.1 cinematic side spacing.\n    try { if (player && enemy && typeof w !== 'undefined') { player.x = w * .285; enemy.x = w * .715; player.dir = 1; enemy.dir = -1; } } catch (_) {}`,'31.1 cinematic side spacing',false);
source = injectAtEnd(source,'newMatch',`    // 31.1 verify fighter identity after all legacy match resets.\n    try { if (hc311SelectedGhlum() && player && !hc311IsGhlum(player)) { player.contentId='ghlum'; player.fighterId='ghlum'; player.name='Ghlum'; } } catch (_) {}`,'31.1 verify fighter identity',false);

// Enlarge the legacy Warden/Raven art so the opponent matches the approved composition.
for (const fn of ['drawPremiumFighterArt','drawSpriteSheetFighter']) {
  const range = findFunctionRange(source,fn);
  if (!range) continue;
  let body = source.slice(range.start,range.end);
  body = body.replace(/clamp\(h \* \.42, 260, 425\)/g,'clamp(h * .50, 320, 500)')
             .replace(/clamp\(h \* \.50, 372, 535\)/g,'clamp(h * .61, 440, 670)')
             .replace(/clamp\(h \* \(isWardenVisual \? \.515 : \.500\), 380, isWardenVisual \? 535 : 500\)/g,'clamp(h * (isWardenVisual ? .62 : .60), 430, isWardenVisual ? 680 : 640)');
  source = source.slice(0,range.start)+body+source.slice(range.end);
}

// Hide any dedicated canvas HUD functions, while leaving gameplay drawing intact.
for (const fn of ['drawHUD','drawHud','drawCombatHUD','drawCombatHud','drawFightHUD','drawFightHud','renderHUD','renderHud','drawFight5HUD','drawFight5Hud','drawMobileControls','drawTouchControls']) {
  source = injectAtStart(source,fn,`    // 31.1 legacy HUD disabled.\n    if (document.body.classList.contains('hard-combat-31-1')) return;`,`31.1 legacy HUD disabled`,false);
}

for (const marker of [PATCH_ID,'hardCombat311Styles','drawGhlumHard311','installHardCombat311','31.1 FINAL GHLUM RENDERER']) {
  if (!source.includes(marker)) fail(`Контрольная метка не внедрена: ${marker}`);
}
fs.writeFileSync(indexPath,source,'utf8');
fs.writeFileSync(path.join(projectDir,'HARD_COMBAT_31_1_APPLIED.json'),JSON.stringify({patch:PATCH_ID,index:path.relative(root,indexPath),backup:path.relative(root,backupPath),appliedAt:new Date().toISOString()},null,2));
console.log('\n============================================================');
console.log('  HARD COMBAT REPLACEMENT 31.1 APPLIED');
console.log('============================================================');
console.log('index:',indexPath);
console.log('backup:',backupPath);
