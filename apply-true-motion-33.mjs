#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PATCH_ID='33.0 TRUE MOTION ANIMATION CORE';
const root=process.argv[2]?path.resolve(process.argv[2]):process.cwd();
const patchRoot=path.dirname(fileURLToPath(import.meta.url));
function fail(m){console.error('[33.0 ERROR]',m);process.exit(1)}
function walk(d,depth=0){if(depth>9||!fs.existsSync(d))return[];const o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','.git','.vercel','dist','.next','coverage'].includes(e.name))continue;const f=path.join(d,e.name);if(e.isDirectory())o.push(...walk(f,depth+1));else if(e.isFile()&&e.name.toLowerCase()==='index.html')o.push(f)}return o}
function pick(){return walk(root).map(file=>{const text=fs.readFileSync(file,'utf8');let score=Math.min(fs.statSync(file).size/1000,3000);if(/ERALASH\s*(COMBAT|KOMBAT)/i.test(text))score+=5000;if(/drawSpriteSheetFighter|drawPremiumFighterArt|CHARACTER_SELECT_META/.test(text))score+=14000;if(/fighter-ghlum|GHLUM/i.test(text))score+=3000;return{file,text,score}}).sort((a,b)=>b.score-a.score).find(x=>x.score>5000)||null}
function copyDir(s,d){if(!fs.existsSync(s))fail('Нет ассетов: '+s);fs.mkdirSync(d,{recursive:true});for(const e of fs.readdirSync(s,{withFileTypes:true})){const a=path.join(s,e.name),b=path.join(d,e.name);if(e.isDirectory())copyDir(a,b);else if(path.resolve(a)!==path.resolve(b))fs.copyFileSync(a,b)}}

function functionRanges(source,name){
  const ranges=[];let cursor=0;
  while(true){const start=source.indexOf(`function ${name}(`,cursor);if(start<0)break;const open=source.indexOf('{',start);if(open<0)break;let depth=0,state='normal',esc=false,end=-1;for(let i=open;i<source.length;i++){const ch=source[i],nx=source[i+1];if(state==='line'){if(ch==='\n')state='normal';continue}if(state==='block'){if(ch==='*'&&nx==='/'){state='normal';i++}continue}if(state==='single'||state==='double'||state==='template'){if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if((state==='single'&&ch==="'")||(state==='double'&&ch==='"')||(state==='template'&&ch==='`'))state='normal';continue}if(ch==='/'&&nx==='/'){state='line';i++;continue}if(ch==='/'&&nx==='*'){state='block';i++;continue}if(ch==="'"){state='single';continue}if(ch==='"'){state='double';continue}if(ch==='`'){state='template';continue}if(ch==='{')depth++;if(ch==='}'){depth--;if(depth===0){end=i+1;break}}}if(end<0)break;ranges.push({start,open,end});cursor=end}
  return ranges;
}
function injectBridge(source,name){
  const marker='33.0 TRUE MOTION BRIDGE';
  if(source.includes(marker))return source;
  const ranges=functionRanges(source,name);
  for(let i=ranges.length-1;i>=0;i--){const r=ranges[i];const code=`\n    // ${marker}\n    if (typeof trueMotion33DrawFighter === 'function') { const __tm33 = trueMotion33DrawFighter(f); if (__tm33) return true; }\n`;source=source.slice(0,r.open+1)+code+source.slice(r.open+1)}
  return source;
}

if(!fs.existsSync(root))fail('Папка проекта не существует: '+root);
const p=pick();if(!p)fail('Не найден игровой index.html');
const indexPath=p.file,projectDir=path.dirname(indexPath);let source=p.text;
const backup=path.join(projectDir,'index.before-true-motion-33.0.html');if(!fs.existsSync(backup))fs.writeFileSync(backup,source,'utf8');
copyDir(path.join(patchRoot,'assets','ghlum33'),path.join(projectDir,'assets','ghlum33'));
fs.copyFileSync(path.join(patchRoot,'true-motion-33.js'),path.join(projectDir,'true-motion-33.js'));
if(fs.existsSync(path.join(patchRoot,'premium-combat-director-32.js')))fs.copyFileSync(path.join(patchRoot,'premium-combat-director-32.js'),path.join(projectDir,'premium-combat-director-32.js'));

// The exact historical cause: 26.7 turned the actual sheet renderer off.
source=source.replace(/const\s+USE_SPRITE_FIGHTERS\s*=\s*false[^;]*;/g,"const USE_SPRITE_FIGHTERS = true; // 33.0 TRUE MOTION: real state-driven sprite animation restored");
source=injectBridge(source,'drawSpriteSheetFighter');

// Remove renderer hacks that replace canvas images globally. True Motion draws through the game's own fighter renderer.
source=source
 .replace(/\s*<!--\s*31\.2[^>]*-->\s*<script[^>]*hard-combat-31-2-runtime\.js[^>]*><\/script>\s*/gi,'\n')
 .replace(/\s*<script[^>]*hard-combat-31-2-runtime\.js[^>]*><\/script>\s*/gi,'\n')
 .replace(/\s*<!--\s*31\.3[^>]*-->\s*<script[^>]*hard-combat-31-3-runtime\.js[^>]*><\/script>\s*/gi,'\n')
 .replace(/\s*<script[^>]*hard-combat-31-3-runtime\.js[^>]*><\/script>\s*/gi,'\n')
 .replace(/\s*<!--\s*33\.0 TRUE MOTION ANIMATION CORE\s*-->\s*<script[^>]*true-motion-33\.js[^>]*><\/script>\s*/gi,'\n')
 .replace(/\s*<script[^>]*true-motion-33\.js[^>]*><\/script>\s*/gi,'\n');

const tag=`\n<!-- ${PATCH_ID} -->\n<script src="./true-motion-33.js?v=330"></script>\n`;
source=/<\/body>/i.test(source)?source.replace(/<\/body>/i,tag+'</body>'):source+tag;
fs.writeFileSync(indexPath,source,'utf8');
fs.writeFileSync(path.join(projectDir,'TRUE_MOTION_33_APPLIED.json'),JSON.stringify({patch:PATCH_ID,index:path.relative(root,indexPath),spriteRendererRestored:true,appliedAt:new Date().toISOString()},null,2));
console.log('TRUE MOTION 33.0 APPLIED');console.log('index:',indexPath);
