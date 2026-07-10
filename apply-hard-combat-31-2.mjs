#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PATCH_ID = '31.2 GHLUM RENDERER TAKEOVER';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const patchRoot = path.dirname(fileURLToPath(import.meta.url));

function fail(msg){ console.error('[31.2 ERROR]',msg); process.exit(1); }
function walk(dir, depth=0){
  if(depth>9 || !fs.existsSync(dir)) return [];
  const out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(['node_modules','.git','.vercel','dist','.next','coverage'].includes(e.name)) continue;
    const f=path.join(dir,e.name);
    if(e.isDirectory()) out.push(...walk(f,depth+1));
    else if(e.isFile() && e.name.toLowerCase()==='index.html') out.push(f);
  }
  return out;
}
function pickIndex(){
  const candidates=walk(root).map(file=>{
    const text=fs.readFileSync(file,'utf8');
    let score=Math.min(fs.statSync(file).size/1000,3000);
    if(/ERALASH\s*(COMBAT|KOMBAT)/i.test(text)) score+=5000;
    if(/drawPremiumFighterArt|drawSpriteSheetFighter|hardCombat311|CHARACTER_SELECT_META/.test(text)) score+=12000;
    if(/fighter-ghlum|id:\s*['"]ghlum['"]|GHLUM/i.test(text)) score+=3000;
    return {file,text,score};
  }).sort((a,b)=>b.score-a.score);
  return candidates.find(x=>x.score>5000)||null;
}
function copyDir(src,dst){
  if(!fs.existsSync(src)) fail('Нет ассетов: '+src);
  fs.mkdirSync(dst,{recursive:true});
  for(const e of fs.readdirSync(src,{withFileTypes:true})){
    const s=path.join(src,e.name),d=path.join(dst,e.name);
    if(e.isDirectory()) copyDir(s,d); else if(path.resolve(s)!==path.resolve(d)) fs.copyFileSync(s,d);
  }
}
if(!fs.existsSync(root)) fail('Папка проекта не существует: '+root);
const picked=pickIndex();
if(!picked) fail('Не найден игровой index.html EraLash Combat.');
const indexPath=picked.file, projectDir=path.dirname(indexPath);
let source=picked.text;
const backup=path.join(projectDir,'index.before-ghlum-renderer-31.2.html');
if(!fs.existsSync(backup)) fs.writeFileSync(backup,source,'utf8');
copyDir(path.join(patchRoot,'assets','ghlum312'),path.join(projectDir,'assets','ghlum312'));
fs.copyFileSync(path.join(patchRoot,'hard-combat-31-2-runtime.js'),path.join(projectDir,'hard-combat-31-2-runtime.js'));
if(!source.includes(PATCH_ID)){
  const tag=`\n<!-- ${PATCH_ID} -->\n<script src="./hard-combat-31-2-runtime.js?v=312"></script>\n`;
  if(/<\/body>/i.test(source)) source=source.replace(/<\/body>/i,tag+'</body>');
  else source+=tag;
  fs.writeFileSync(indexPath,source,'utf8');
}
fs.writeFileSync(path.join(projectDir,'GHLUM_RENDERER_31_2_APPLIED.json'),JSON.stringify({patch:PATCH_ID,index:path.relative(root,indexPath),appliedAt:new Date().toISOString()},null,2));
console.log('GHLUM RENDERER TAKEOVER 31.2 APPLIED');
console.log('index:',indexPath);
