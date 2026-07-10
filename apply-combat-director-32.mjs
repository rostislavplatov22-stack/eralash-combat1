#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PATCH_ID = '32.0 PREMIUM COMBAT DIRECTOR';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const patchRoot = path.dirname(fileURLToPath(import.meta.url));

function fail(message){ console.error('[32.0 ERROR]', message); process.exit(1); }
function walk(dir, depth=0){
  if(depth>9 || !fs.existsSync(dir)) return [];
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['node_modules','.git','.vercel','dist','.next','coverage'].includes(entry.name)) continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(full,depth+1));
    else if(entry.isFile() && entry.name.toLowerCase()==='index.html') out.push(full);
  }
  return out;
}
function pickIndex(){
  return walk(root).map(file=>{
    const text=fs.readFileSync(file,'utf8');
    let score=Math.min(fs.statSync(file).size/1000,3000);
    if(/ERALASH\s*(COMBAT|KOMBAT)/i.test(text)) score+=5000;
    if(/hardCombat311|drawPremiumFighterArt|CHARACTER_SELECT_META/.test(text)) score+=12000;
    if(/fighter-ghlum|id:\s*['"]ghlum['"]|GHLUM/i.test(text)) score+=3000;
    return {file,text,score};
  }).sort((a,b)=>b.score-a.score).find(x=>x.score>5000)||null;
}
function copyDir(src,dst){
  if(!fs.existsSync(src)) fail('Не найдены ассеты: '+src);
  fs.mkdirSync(dst,{recursive:true});
  for(const entry of fs.readdirSync(src,{withFileTypes:true})){
    const from=path.join(src,entry.name),to=path.join(dst,entry.name);
    if(entry.isDirectory()) copyDir(from,to);
    else if(path.resolve(from)!==path.resolve(to)) fs.copyFileSync(from,to);
  }
}

if(!fs.existsSync(root)) fail('Папка проекта не существует: '+root);
const picked=pickIndex();
if(!picked) fail('Не найден игровой index.html EraLash Combat.');
const indexPath=picked.file;
const projectDir=path.dirname(indexPath);
let source=picked.text;
const backup=path.join(projectDir,'index.before-combat-director-32.0.html');
if(!fs.existsSync(backup)) fs.writeFileSync(backup,source,'utf8');

copyDir(path.join(patchRoot,'assets','ghlum312'),path.join(projectDir,'assets','ghlum312'));
fs.copyFileSync(path.join(patchRoot,'hard-combat-31-3-runtime.js'),path.join(projectDir,'hard-combat-31-3-runtime.js'));
fs.copyFileSync(path.join(patchRoot,'premium-combat-director-32.js'),path.join(projectDir,'premium-combat-director-32.js'));

source=source
  .replace(/\s*<!--\s*31\.4 FINAL COMBAT POLISH\s*-->\s*<script[^>]*hard-combat-31-4-runtime\.js[^>]*><\/script>\s*/gi,'\n')
  .replace(/\s*<script[^>]*hard-combat-31-4-runtime\.js[^>]*><\/script>\s*/gi,'\n')
  .replace(/\s*<!--\s*31\.5 SAFE RENDERER RECOVERY\s*-->\s*<script[^>]*hard-combat-31-5-safe-ui\.js[^>]*><\/script>\s*/gi,'\n')
  .replace(/\s*<script[^>]*hard-combat-31-5-safe-ui\.js[^>]*><\/script>\s*/gi,'\n')
  .replace(/\s*<!--\s*32\.0 PREMIUM COMBAT DIRECTOR\s*-->\s*<script[^>]*premium-combat-director-32\.js[^>]*><\/script>\s*/gi,'\n')
  .replace(/\s*<script[^>]*premium-combat-director-32\.js[^>]*><\/script>\s*/gi,'\n');

if(!/hard-combat-31-3-runtime\.js/i.test(source)){
  const renderer='\n<!-- 31.3 RENDERER RECOVERY -->\n<script src="./hard-combat-31-3-runtime.js?v=320"></script>\n';
  source=/<\/body>/i.test(source)?source.replace(/<\/body>/i,renderer+'</body>'):source+renderer;
}
const director='\n<!-- '+PATCH_ID+' -->\n<script src="./premium-combat-director-32.js?v=320"></script>\n';
source=/<\/body>/i.test(source)?source.replace(/<\/body>/i,director+'</body>'):source+director;
fs.writeFileSync(indexPath,source,'utf8');
fs.writeFileSync(path.join(projectDir,'PREMIUM_COMBAT_DIRECTOR_32_APPLIED.json'),JSON.stringify({patch:PATCH_ID,index:path.relative(root,indexPath),appliedAt:new Date().toISOString()},null,2));
console.log('PREMIUM COMBAT DIRECTOR 32.0 APPLIED');
console.log('index:',indexPath);
